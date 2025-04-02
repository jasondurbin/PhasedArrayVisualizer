import {SceneControlPhasedArray, SceneControlGeometry, SceneControlFarfield} from "./index-scenes.js";
import {SceneParent} from "./scene/scene-abc.js"
import {SceneQueue} from "./scene/scene-queue.js";

window.addEventListener('load', () => {
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

        this.elements['refresh'].addEventListener('click', () => {
            this.build_state_machine();
        });
    }
    build_state_machine(){
        this.queue.reset();
        this.geometryControl.add_to_queue(this.queue);
        this.arrayControl.add_to_queue(this.queue);
        this.farfieldControl.add_to_queue(this.queue);
        this.queue.start();
    }
}
