import {SceneControlPhasedArray, SceneControlGeometry, SceneControlFarfield} from "./scene-controls.js";
import {SceneParent} from "./abc.js"
import {StateMachineQueue} from "./scene-enum.js";

/**	 *
 * Create scene for Phased Array simulator.
 *
 * @param {string} prepend - Prepend used on HTML IDs.
 * */
export class Scene extends SceneParent{
    constructor(prepend){
        super(prepend, ['refresh'])
        this.queue = new StateMachineQueue(this.find_element('progress'), this.find_element('status'));
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
