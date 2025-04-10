import {SceneControlPhasedArray, SceneControlFarfield} from "./index-scenes.js";
import {ScenePlotFarfieldCuts} from "./scene/plot-1d/scene-plot-farfield-cuts.js";
import {ScenePlotFarfield2D} from "./scene/plot-2d/scene-plot-2d-spherical-farfield.js";
import {ScenePlot2DGeometryPhase, ScenePlot2DGeometryAtten} from "./scene/plot-2d/scene-plot-2d-geometry.js";
import {SceneParent} from "./scene/scene-abc.js"
import {SceneQueue} from "./scene/scene-queue.js";
import {SceneTheme} from "./scene/scene-theme.js";

document.addEventListener('DOMContentLoaded', () => {
    new SceneTheme();
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
        super(prepend, ['refresh', 'atten-scale'])
        this.queue = new SceneQueue(this.find_element('progress'), this.find_element('status'));
        this.arrayControl = new SceneControlPhasedArray(this);
        this.farfieldControl = new SceneControlFarfield(this);

        this.plotFF = new ScenePlotFarfield2D(this, this.find_element('farfield-canvas-2d'), 'farfield-2d-colormap');
        this.plot1D = new ScenePlotFarfieldCuts(this, this.find_element('farfield-canvas-1d'), 'farfield-1d-colormap');
        this.geoPhase = new ScenePlot2DGeometryPhase(this, this.find_element('geometry-phase-canvas'), 'geometry-phase-colormap');
        this.geoAtten = new ScenePlot2DGeometryAtten(this, this.find_element('geometry-magnitude-canvas'), 'geometry-magnitude-colormap');

        this.elements['refresh'].addEventListener('click', () => {
            this.build_state_machine();
        });
    }
    build_state_machine(){
        this.queue.reset();
        this.arrayControl.add_to_queue(this.queue);

        if (this.arrayControl.phaseChanged || this.geoPhase.redrawWaiting){
            this.queue.add('Drawing phase...', () => {
                this.geoPhase.load_phased_array(this.arrayControl.pa);
            });
            this.geoPhase.add_to_queue(this.queue);
        }
        if (this.arrayControl.attenChanged || this.geoAtten.redrawWaiting || this.changed['atten-scale']){
            this.queue.add('Drawing attenuation...', () => {
                this.geoAtten.load_phased_array(this.arrayControl.pa);
                this.geoAtten.min = -Math.max(5, Math.abs(this.find_element('atten-scale').value))
            });
            this.geoAtten.add_to_queue(this.queue);
        }

        this.farfieldControl.add_to_queue(this.queue);
        if (this.farfieldControl.needsRedraw || this.plot1D.redrawWaiting){
            this.queue.add('Drawing 1D farfield...', () => {
                this.plot1D.load_farfield(this.farfieldControl.ff);
                this.plot1D.draw_cuts();
            });
        }
        if (this.farfieldControl.needsRedraw || this.plotFF.redrawWaiting){
            this.queue.add('Loading 2D farfield...', () => {
                this.plotFF.load_farfield(this.farfieldControl.ff);
            });
            this.plotFF.add_to_queue(this.queue);
        }
        this.queue.start();
    }
}
