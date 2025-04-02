
import {ColormapControl} from "./cmap.js";

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
        this.activityWaiting = true;
        parent.find_elements(controls);
        controls.forEach((k) => {
            this.changed[k] = true;
            this.find_element(k).addEventListener('change', () => {this.control_changed(k)});
        });
        this.controls = controls;
    }
    control_changed(key){
        this.activityWaiting = true;
        this.changed[key] = true;
    }
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
        })
        this.primarySelector.addEventListener('change', () => {this.show_controls();});
        this.show_controls();
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
            let def = kls.controls[x];
            let v = this.find_element(x).value;
            if (def !== undefined && def['type'] !== undefined) v = def['type'](v);
            args.push(v);
        })
        return new kls(...args);
    }
    show_controls(){
        const kls = this.selected_class();
        const visible = Object.keys(kls.controls);
        this.controls.forEach((k) => {
            const eid = this.find_element(k).id;
            const ele = document.querySelector("#" + eid + "-div");
            if (visible.includes(k)){
                const def = kls.controls[k];
                if (ele === null) return;
                const title = def['title'];
                ele.style.display = "flex";
                if (title !== undefined && title !== null){
                    const lbl = ele.querySelector("label");
                    if (lbl !== null) lbl.innerHTML = title;
                }
            }
            else ele.style.display = "none";
        });
    };
}
