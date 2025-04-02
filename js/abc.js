export class SceneGroup {
    static selectors = []
    static alwaysVisible = []
    constructor() {}
    static show_element(scene, selector, label) {
        const eid = scene.selectors[selector].id;
        const ele = document.querySelector("#" + eid + "-div");
        ele.style.display = "flex";
        if (label !== undefined){
            const lbl = ele.querySelector("label");
            if (lbl !== null) lbl.innerHTML = label;
        }
    }
    static activate(scene) {
        this.selectors.forEach((x) => {
            if (this.alwaysVisible.includes(x)) return;
            const eid = scene.selectors[x].id;
            const ele = document.querySelector("#" + eid + "-div");
            ele.style.display = "none";
        });
    }
}
