
import {MeshColormapControl} from "../cmap/cmap-mesh.js";
import {ListedColormapControl} from "../cmap/cmap-listed.js";
import {SceneQueue} from "./scene-queue.js";

export class SceneObjectABC{
    constructor(prepend, controls){
        this.prepend = prepend;
        this.colormap = {};
        this.changed = {};
        this.elements = {};
        this.find_elements(controls);
        this.listeners = {};
        controls.forEach((k) => {
            this.changed[k] = true;
            this.find_element(k).addEventListener('change', () => {this.control_changed(k)});
        });
        this.controls = controls;
        this.eventTypes = new Set(['control-changed']);
        this.queue = null;
    }
    /**
    * Install an event listener similar to pure Javascript.
    *
    * Example events:
    *       `control-changed`: (controlname) => {}
    *
    * Classes that inherit this may add their own event types.
    * These can be viewed using calling `list_event_types()`
    * which return all valid event types.
    *
    * @param {String} event
    * @param {function(...):null} callback
    *
    * @return {null}
    * */
    addEventListener(event, callback){
        if (!(this.eventTypes.has(event))){
            throw Error(`'${event} is not a valid event. Expected: ${Array.from(this.eventTypes).join(', ')}`)
        }
        if (!(event in this.listeners)) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    async trigger_event(event, ...args){
        if (!(this.eventTypes.has(event))){
            throw Error(`'${event} is not a valid event to trigger.`)
        }
        if (!(event in this.listeners)) return;
        for (const func of this.listeners[event]){ await func(...args); }
    }
    list_event_types(){ return this.eventTypes; }
    add_event_types(...args){ this.eventTypes = this.eventTypes.union(new Set(args)); }
    find_element(id, allowError){
        if (this.elements[id] !== undefined) return this.elements[id];
        let eid = this.prepend + "-" + id;
        let ele = document.querySelector("#" + eid);
        if (ele == null && (allowError === undefined || allowError === true)){
            throw Error(`Missing HTML element with id: ${eid}`)
        }
        return ele;
    }
    find_elements(elements){ elements.forEach((x) => {this.elements[x] = this.find_element(x)}); }
    create_mesh_colormap_selector(key, defaultSelection){
        const cm = new MeshColormapControl(this.find_element(key), defaultSelection);
        this.colormap[key] = cm;
        return cm;
    }
    create_listed_colormap_selector(key, defaultSelection){
        const cm = new ListedColormapControl(this.find_element(key), defaultSelection);
        this.colormap[key] = cm;
        return cm;
    }
    /**
    * A control with name `key` has changed.
    *
    * @param {String} key
    *
    * @return {null}
    * */
    control_changed(key){
        this.trigger_event('control-changed', key);
        this.changed[key] = true;
    }
    clear_changed(...keys){
        keys.forEach((k) => {
            if (k in this.changed) this.changed[k] = false;
            if (k in this.colormap) this.colormap[k].changed = false;
        });
    }
    create_queue(progressElement, statusElement){
        this.queue = new SceneQueue(progressElement, statusElement);
    }
    create_popup_overlay(){
        let ele = document.querySelector("#popup-overlay");
        if (ele !== undefined && ele !== null) return ele;
        ele = document.createElement("div")
        ele.id = "popup-overlay";
        document.body.appendChild(ele);

        ele.addEventListener('click', () => {
            ele.style.display = 'none';
        });
        return ele;
    }
    create_popup(title, controls, callback){
        return new ScenePopup(this, title, controls, callback);
    }
}
export class ScenePopup{
    constructor(parent, title, controls, callback){
        this._elements = {};
        const overlay = parent.create_popup_overlay();
        this.parent = parent;
        const ele = document.createElement("div");
        const form = document.createElement("form");
        ele.classList = "popup";
        let h = document.createElement("h3");
        h.innerHTML = title;
        ele.appendChild(h);
        ele.appendChild(form);
        document.body.appendChild(ele);

        this.container = ele;
        this.overlay = overlay;
        this.form = form;
        this.add_controls(controls);

        const div = document.createElement("div");
        const b1 = document.createElement("button");
        const b2 = document.createElement("button");
        b1.innerHTML = 'OK';
        b2.innerHTML = 'Cancel';
        b2.type = 'button'
        div.classList = 'popup-buttons';
        div.appendChild(b1);
        div.appendChild(b2);
        form.appendChild(div);
        this._focus = null;

        const _hide = () => {
            ele.style.display = 'none';
            overlay.style.display = 'none';
            ele.remove();
        }
        const _notify_cancel = () => {
            _hide();
            if (callback !== undefined) callback(null);
        }
        const _notify_complete = () => {
            _hide();
            if (callback !== undefined) callback(this.build_results());
        }
        overlay.addEventListener('click', _notify_cancel);
        b2.addEventListener('click', _notify_cancel);
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            _notify_complete();
        });
        this.add_action = (text) => {
            const b = document.createElement("button");
            const d = document.createElement("div");
            b.addEventListener('click', _notify_cancel);
            b.type = 'button';
            b.innerHTML = text;
            form.insertBefore(d, div);
            d.appendChild(b);
            d.classList = "popup-buttons";
            return b;
        }
    }
    element(key){
        return this._elements[key]['element'];
    }
    set_element_value(key, value){
        const config = this._elements[key];
        const dtype = config['type'];
        if (dtype == "number") config['element'].value = value;
        else if (dtype == "checkbox") config['element'].checked = value;
        else if (dtype == "span") config['element'].innerHTML = value;
    }
    build_results(){
        const results = {};
        for (const [key, entry] of Object.entries(this._elements)){
            let value;
            const etype = entry['type'];
            const ele = entry['element'];
            if (etype == 'number'){
                value = ele.value;
                if ('max' in entry) value = Math.min(entry['max'], value);
                if ('min' in entry) value = Math.max(entry['min'], value);
            }
            else if (etype == 'checkbox') value = ele.checked;
            else if (etype == 'span') value = ele.innerHTML;
            results[key] = value;
        }
        return results;
    }
    add_controls(config){
        if (config === undefined) return;
        config.forEach((e) => {
            const div = document.createElement('div');
            const lbl = document.createElement('label');
            if (!('type' in e)) throw Error("Control config must contain 'type'.");
            if (!('id' in e)) throw Error("Control config must contain 'id'.");
            const etype = e['type'];
            const eid = e['id'];
            const nid = "popup-item-" + eid;
            if (eid in this._elements) throw Error(`Control id '${eid}' is not unique.`);
            let reverse = false;
            let ele;
            if ('label' in e) lbl.innerHTML = e['label'];
            lbl.setAttribute('for', nid);
            if (etype == 'number'){
                ele = document.createElement('input');
                ele.type = 'number';
            }
            else if (etype == 'checkbox'){
                ele = document.createElement('input');
                ele.type = 'checkbox';
            }
            else if (etype == 'span'){
                ele = document.createElement('span');
            }
            else throw Error(`Unknown element type ${etype}`);

            if ('value' in e) ele.value = e['value'];
            if ('min' in e) ele.min = e['min'];
            if ('max' in e) ele.max = e['max'];
            if ('step' in e) ele.step = e['step'];
            ele.id = nid;
            if (reverse){
                lbl.style.textAlign = 'left';
                div.appendChild(ele);
                div.appendChild(lbl);
            }
            else{
                div.appendChild(lbl);
                div.appendChild(ele);
            }
            this.form.appendChild(div);
            e['element'] = ele;
            this._elements[eid] = e;
            if ('focus' in e && e['focus']) this._focus = ele;
        })
    }
    show_from_event(e){
        let ex, ey;
        if (e.type == 'touchstart'){
            ex = e.touches[0].clientX;
            ey = e.touches[0].clientY;
        }
        else{
            ex = e.clientX;
            ey = e.clientY;
        }
        this.show(ex, ey);
    }
    show(cursorX, cursorY){
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        const popupWidth = this.container.offsetWidth || 200;
        const popupHeight = this.container.offsetHeight || 100;
        const screenWidth = window.innerWidth + scrollX;
        const screenHeight = window.innerHeight + scrollY;

        let popupX = cursorX + scrollX - popupWidth / 2;
        let popupY = cursorY + scrollY - popupHeight / 2;

        if (popupX < scrollX) popupX = scrollX + 10;
        if (popupY < scrollY) popupY = scrollY + 10;
        if (popupX + popupWidth > screenWidth) popupX = screenWidth - popupWidth - 10;
        if (popupY + popupHeight > screenHeight) popupY = screenHeight - popupHeight - 10;

        this.container.style.left = `${popupX}px`;
        this.container.style.top = `${popupY}px`;
        this.container.style.display = 'flex';
        this.overlay.style.display = 'block';
        if (this._focus !== null){
            this._focus.focus();
            this._focus.select()
        }
    }
}
export class SceneParent extends SceneObjectABC{}

export class SceneControl extends SceneObjectABC{
    /**
    * Build a SceneControl object.
    *
    * @param {SceneParent} parent
    * @param {Array.<String>} controls List of control names required.
    *
    * @return {SceneControlTaper}
    * */
    constructor(parent, controls){
        super(parent.prepend, controls);
        this.parent = parent;
    }
    /**
    * Add callable objects to queue.
    *
    * @param {SceneQueue} queue
    *
    * @return {null}
    * */
    add_to_queue(queue){}
}

export class SceneControlWithSelector extends SceneControl{
    constructor(parent, primaryKey, classes, prepend){
        let keys = new Set([primaryKey]);
        classes.forEach((kls) => {
            let newKeys = new Set(Object.keys(kls.controls));
            keys = keys.union(newKeys);
        });
        let wrap_prepend = (vals) => vals;
        let unwrap_prepend = (vals) => vals;
        let wrap_prepend_s = (vals) => vals;
        let unwrap_prepend_s = (vals) => vals;
        if (prepend !== undefined){
            const ks = prepend + "-";
            const ki = ks.length;
            wrap_prepend = (vals) => Array.from(vals, (k) => ks + k);
            unwrap_prepend = (vals) => Array.from(vals, (k) => k.substring(ki));
            wrap_prepend_s = (k) => ks + k;
            unwrap_prepend_s = (k) => k.substring(ki);
            keys = wrap_prepend(keys);
            primaryKey = prepend + "-" + primaryKey;
        }
        super(parent, keys);
        this.wrap_prepend = wrap_prepend;
        this.unwrap_prepend = unwrap_prepend;
        this.wrap_prepend_s = wrap_prepend_s;
        this.unwrap_prepend_s = unwrap_prepend_s;
        this.classes = classes;
        this.primarySelector = this.find_element(primaryKey);
        classes.forEach((x) => {
            const ele = document.createElement('option');
            ele.value = x.title;
            ele.innerHTML = x.title;
            this.primarySelector.appendChild(ele);
            x.controls = JSON.parse(JSON.stringify(x.controls));
        })
        this.primarySelector.addEventListener('change', () => {this.show_controls();});
        this.show_controls();
    }
    control_changed(key){
        super.control_changed(key);
        const kk = this.unwrap_prepend_s(key);
        this.selected_class().controls[kk]['last'] = this.find_element(key).value;
    }
    selected_class(){
        for (let i = 0; i < this.classes.length; i++){
            if (this.primarySelector[i].selected) return this.classes[i];
        }
        return this.classes[0];
    }
    build_active_object(){
        const kls = this.selected_class();
        let args = [];
        kls.args.forEach((x) => {
            const kk = this.wrap_prepend_s(x);
            const def = kls.controls[x];
            const ele = this.find_element(kk);
            let v = ele.value;
            if (def !== undefined){
                const dtype = def['type'];
                if (dtype == 'float') v = Number(v);
                else if (dtype == 'int') v = parseInt(v);
                else if (dtype === undefined);
                else throw Error(`Unknown data type ${dtype}`);

                const min = def['min'];
                if (min === undefined);
                else if (v < min){
                    v = min;
                    ele.value = v;
                }
                const max = def['max'];
                if (max === undefined);
                else if (v > max){
                    v = max;
                    ele.value = v;
                }
            }
            args.push(v);
        })
        return new kls(...args);
    }
    show_controls(){
        const kls = this.selected_class();
        const visible = Object.keys(kls.controls);
        this.controls.forEach((k) => {
            const kk = this.unwrap_prepend_s(k);
            const ele = this.find_element(k);
            const eid = ele.id;
            const div = document.querySelector("#" + eid + "-div");
            if (visible.includes(kk)){
                const def = kls.controls[kk];
                const ovalue = def['default'];
                let nvalue = def['last'];
                if (nvalue === undefined) nvalue = ovalue;
                if (nvalue !== undefined) ele.value = nvalue;
                if (div === null) return;
                const title = def['title'];
                div.style.display = "flex";
                if (title !== undefined && title !== null){
                    const lbl = div.querySelector("label");
                    if (lbl !== null) lbl.innerHTML = title;
                }
            }
            else {
                if (div === null) throw Error(`Missing <div> wrapper on input "${k}".`);
                div.style.display = "none";
            }
        });
    };
}
