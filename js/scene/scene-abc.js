
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
        controls.forEach((k) => {
            this.changed[k] = true;
            this.find_element(k).addEventListener('change', () => {this.control_changed(k)});
        });
        this.controls = controls;
    }
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
    control_changed(key){ this.changed[key] = true; }
    clear_changed(...keys){
        keys.forEach((k) => {
            if (k in this.changed) this.changed[k] = false;
            if (k in this.colormap) this.colormap[k].changed = false;
        });
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
