import {SceneControl, SceneControlWithSelector} from "./scene/scene-abc.js";
import {Geometries} from "./phasedarray/geometry.js";
import {PhasedArray} from "./phasedarray/phasedarray.js";
import {FarfieldSpherical} from "./phasedarray/farfield.js"
import {Tapers} from "./phasedarray/tapers.js"

export class SceneControlGeometry extends SceneControlWithSelector{
    constructor(parent){
        super(parent, 'geometry', Geometries);
        this.activeGeometry = null;
    }
    control_changed(key){
        super.control_changed(key);
        this.activeGeometry = null;
    }
    get calculationWaiting(){
        return this.activeGeometry === null;
    }
    add_to_queue(queue){
        if (this.calculationWaiting){
            queue.add('Building geometry...', () => {
                    this.activeGeometry = this.build_active_object();
                    this.activeGeometry.build();
                }
            )
        }
    }
}

const CMKEYPHASE = 'geometry-phase-colormap';
const CMKEYATTEN = 'geometry-magnitude-colormap';

export class SceneControlPhasedArray extends SceneControl{
    constructor(parent){
        super(parent, ['theta', 'phi', 'atten-scale']);
        this.pa = null;
        this.create_colormap_selector(CMKEYPHASE, 'rainbow');
        this.create_colormap_selector(CMKEYATTEN, 'inferno_r');
        this.canvasPhase = this.find_element('geometry-phase-canvas');
        this.canvasAtten = this.find_element('geometry-magnitude-canvas');
    }
    add_to_queue(queue){
        const geo = this.parent.geometryControl;
        const taperX = this.parent.taperXControl;
        const cmPhase = this.colormap[CMKEYPHASE];
        const cmAtten = this.colormap[CMKEYATTEN];
        let needsPhase = this.changed['theta'] || this.changed['phi'];
        let needsAttenX = taperX.calculationWaiting;
        let needsAttenY = false;
        let needsAtten = false;
        let phaseRescale = false;
        let phaseCMChanged = cmPhase.changed;
        let attenCMChanged = cmAtten.changed;
        let attenRescale = this.changed['atten-scale'];
        this.farfieldNeedsCalculation = false
        if (geo.calculationWaiting || this.pa === null || taperX.calculationWaiting){
            queue.add('Updating array...', () => {
                    this.pa = new PhasedArray(geo.activeGeometry, taperX.activeTaper);
                }
            )
            needsPhase = true;
            needsAttenX = true;
            needsAttenY = true;
            this.farfieldNeedsCalculation = true;
        }
        if (needsPhase){
            queue.add('Calculating phase...', () => {
                this.pa.set_theta_phi(
                    this.find_element('theta').value,
                    this.find_element('phi').value
                )
                this.pa.compute_phase();
                this.clear_changed('theta', 'phi');
            });
            phaseRescale = true;
            this.farfieldNeedsCalculation = true;
        }
        if (needsAttenX){
            queue.add('Calculating X taper...', () => {
                this.pa.calculate_x_taper();
            });
            needsAtten = true;
        }
        if (needsAttenY){
            queue.add('Calculating Y taper...', () => {
                this.pa.calculate_y_taper();
            });
            needsAtten = true;
        }
        if (needsAtten){
            queue.add('Multiplying tapers...', () => {
                this.pa.calculate_final_taper();
            });
            queue.add('Rescaling tapers...', () => {
                this.pa.rescale_final_taper();
            });
            attenRescale = true;
            this.farfieldNeedsCalculation = true;
        }
        if (phaseRescale){
            queue.add('Scaling phase...', () => {
                this.pa.rescale_phase()
            });
            phaseCMChanged = true;
        }
        if (attenRescale){
            queue.add('Scaling attenuation...', () => {
                const scale = Math.abs(this.find_element('atten-scale').value)
                this.pa.rescale_attenuation(-Math.max(5, scale));
            });
            this.clear_changed('atten-scale');
            attenCMChanged = true;
        }
        if (phaseCMChanged){
            queue.add('Drawing phase...', () => {
                this.pa.draw_phase(
                    this.canvasPhase,
                    cmPhase.cmap(),
                )
                cmPhase.changed = false;
            });
        }
        if (attenCMChanged){
            queue.add('Drawing attenuation...', () => {
                this.pa.draw_attenuation(
                    this.canvasAtten,
                    cmAtten.cmap(),
                )
                cmAtten.changed = false;
            });
        }
    }
}

const CMKEYFARFIELD = 'farfield-colormap';

export class SceneControlFarfield extends SceneControl{
    constructor(parent){
        super(parent, [
            'theta-points',
            'phi-points',
            'farfield-scale',
        ]);
        this.ff = null;
        this.dirMax = this.find_element('directivity-max', false);
        this.create_colormap_selector(CMKEYFARFIELD, 'viridis');
        this.canvas = this.find_element('farfield-canvas');
    }
    add_to_queue(queue){
        const arrayControl = this.parent.arrayControl;
        const cm = this.colormap[CMKEYFARFIELD];
        let needsRecalc = arrayControl.farfieldNeedsCalculation;
        let needsRescale = this.changed['farfield-scale'];
        let needsRedraw = cm.changed;

        if (this.changed['theta-points'] || this.changed['phi-points'] || this.ff === null){
            queue.add('Creating farfield mesh...', () => {
                this.ff = new FarfieldSpherical(
                    this.find_element('theta-points').value,
                    this.find_element('phi-points').value
                )
                this.clear_changed('theta-points', 'phi-points');
            });
            needsRecalc = true;
        }
        if (needsRecalc){
            queue.add_iterator('Calculating farfield...', () => {
                return this.ff.calculator_loop(arrayControl.pa)
            });
            if (this.dirMax !== null){
                queue.add("Calculating directivity...", () => {
                    let d = this.ff.compute_directivity();
                    this.dirMax.innerHTML = `Directivity: ${(10*Math.log10(d)).toFixed(2)} dB`;
                });
            }
            needsRescale = true;
        }
        if (needsRescale){
            queue.add('Rescaling farfield...', () => {
                this.ff.rescale_magnitude(this.find_element('farfield-scale').value)
                this.clear_changed('farfield-scale');
            });
            needsRedraw = true;
        }
        if (needsRedraw){
            queue.add('Creating farfield colormap...', () => {
                this.ff.create_colormap(cm.cmap());
                cm.changed = false;
            });
            queue.add('Drawing farfield...', () => {
                this.ff.draw_polar(this.canvas);
            });
        }
    }
}

export class SceneControlTaper extends SceneControlWithSelector{
    constructor(parent){
        super(parent, 'taper-x', Tapers);
        this.activeTaper = null;
    }
    control_changed(key){
        super.control_changed(key);
        this.activeTaper = null;
    }
    get calculationWaiting(){
        return this.activeTaper === null;
    }
    add_to_queue(queue){
        if (this.calculationWaiting){
            queue.add('Building Taper...', () => {
                    this.activeTaper = this.build_active_object();
                }
            )
        }
    }
}
