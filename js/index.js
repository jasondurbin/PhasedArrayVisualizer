import {SceneControlPhasedArray, SceneControlGeometry, SceneControlFarfield, SceneControlTaper} from "./index-scenes.js";
import {SceneParent} from "./scene/scene-abc.js"
import {SceneQueue} from "./scene/scene-queue.js";
import {SceneTheme} from "./scene/scene-theme.js";

window.addEventListener('load', () => {
    const theme = new SceneTheme();
    const scene = new PhasedArrayScene('pa');
    scene.build_state_machine();
});

/**	 *
 * Create scene for Phased Array simulator.
 *
 * @param {string} prepend - Prepend used on HTML IDs.
 * */

export class PhasedArrayScene extends SceneParent{
    constructor(prepend){
        super(prepend, ['refresh'])
        this.queue = new SceneQueue(this.find_element('progress'), this.find_element('status'));
        this.geometryControl = new SceneControlGeometry(this);
        this.arrayControl = new SceneControlPhasedArray(this);
        this.farfieldControl = new SceneControlFarfield(this);
        this.taperXControl = new SceneControlTaper(this);

        this.elements['refresh'].addEventListener('click', () => {
            this.build_state_machine();
        });
    }
    build_state_machine(){
        this.queue.reset();
        this.geometryControl.add_to_queue(this.queue);
        this.taperXControl.add_to_queue(this.queue);
        this.arrayControl.add_to_queue(this.queue);
        this.farfieldControl.add_to_queue(this.queue);
        this.queue.start();
    }
    create_canvas_hover(canvas){
        const p = canvas.parentElement.parentElement;
        const h = p.querySelector(".canvas-header");
        const ele = document.createElement("div");
        ele.classList = "canvas-hover-div";
        ele.innerHTML = "&nbsp;";
        canvas.hover_container = ele;
        h.appendChild(ele);

        canvas.addEventListener('mouseleave', () => {
            canvas.hover_container.innerHTML = "&nbsp";
        });
    }
}
