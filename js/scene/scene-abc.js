
import {ColormapControl} from "../cmap/cmap.js";

export class SceneParent{
    constructor(prepend, controls){
        this.elements = {};
        this.prepend = prepend;
        this.find_elements(controls);
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
    find_elements(elements){
        elements.forEach((x) => this.elements[x] = this.find_element(x));
    }
}

export class SceneControl{
    constructor(parent, controls){
        this.parent = parent;
        this.changed = {};
        this.colormap = {};
        parent.find_elements(controls);
        controls.forEach((k) => {
            this.changed[k] = true;
            this.find_element(k).addEventListener('change', () => {this.control_changed(k)});
        });
        this.controls = controls;
    }
    control_changed(key){ this.changed[key] = true; }
    clear_changed(...keys){
        keys.forEach((k) => {
            if (k in this.changed) this.changed[k] = false;
            if (k in this.colormap) this.colormap[k].changed = false;
        });
    }
    find_element(id, allowError){ return this.parent.find_element(id, allowError); }
    find_elements(elements){ return this.parent.find_elements(elements); }
    create_colormap_selector(key, defaultSelection){
        const cm = new ColormapControl(this.find_element(key), defaultSelection);
        this.colormap[key] = cm;
        return cm;
    }
}

export class SceneControlWithSelector extends SceneControl{
    constructor(parent, primaryKey, classes){
        let keys = new Set([primaryKey]);
        classes.forEach((kls) => {
            let newKeys = new Set(Object.keys(kls.controls));
            keys = keys.union(newKeys);
        });
        super(parent, keys);
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
        this.selected_class().controls[key]['last'] = this.find_element(key).value;
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
            const def = kls.controls[x];
            const ele = this.find_element(x);
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
            }
            args.push(v);
        })
        return new kls(...args);
    }
    show_controls(){
        const kls = this.selected_class();
        const visible = Object.keys(kls.controls);
        this.controls.forEach((k) => {
            const ele = this.find_element(k);
            const eid = ele.id;
            const div = document.querySelector("#" + eid + "-div");
            if (visible.includes(k)){
                const def = kls.controls[k];
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
