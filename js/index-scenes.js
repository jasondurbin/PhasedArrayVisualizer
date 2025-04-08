import {SceneControl, SceneControlWithSelector} from "./scene/scene-abc.js";
import {ScenePlot1D} from "./scene/scene-plot-1d.js";
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
        this.create_mesh_colormap_selector(CMKEYPHASE, 'hsv');
        this.create_mesh_colormap_selector(CMKEYATTEN, 'inferno_r');
        this.canvasPhase = this.find_element('geometry-phase-canvas');
        this.canvasAtten = this.find_element('geometry-magnitude-canvas');
        this.install_hover_item(this.canvasAtten, (i) => `${this.pa.vectorAtten[i].toFixed(2)} dB`);
        this.install_hover_item(this.canvasPhase, (i) => `${(this.pa.vectorPhase[i]*180/Math.PI).toFixed(2)} deg`);
    }
    install_hover_item(canvas, callback){
        this.parent.create_canvas_hover(canvas);
        canvas.addEventListener('mousemove', (e) => {
            let i = null;
            let text = "&nbsp;";
            if (e.isTrusted && this.pa !== null){
                const f = canvas.index_from_event;
                if (f !== undefined) i = f(e);
            }
            if (i !== null){
                const geo = this.pa.geometry;
                const t = callback(i);
                text = `Element[${i}] (${geo.x[i].toFixed(2)}, ${geo.y[i].toFixed(2)}): ${t}`
            }
            canvas.hover_container.innerHTML = text;
        });
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
        let phaseChanged = false;
        let attenChanged = false;
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
            phaseChanged = true;
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
                this.pa.calculate_taper();
            });
            attenChanged = true;
            this.farfieldNeedsCalculation = true;
        }
        if (attenChanged || phaseChanged){
            queue.add('Calculating vector...', () => {
                this.pa.calculate_final_vector();
            });
            queue.add('Calculating attenuation...', () => {
                this.pa.calculate_attenuation();
            });
            attenRescale = true;
            phaseRescale = true;
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

const CMKEYFARFIELD2D = 'farfield-2d-colormap';
const CMKEYFARFIELD1D = 'farfield-1d-colormap';

export class SceneControlFarfield extends SceneControl{
    constructor(parent){
        super(parent, [
            'theta-points',
            'phi-points',
            'farfield-scale',
        ]);
        this.ff = null;
        this.dirMax = null;
        this.eleMax = this.find_element('directivity-max', false);
        this.create_mesh_colormap_selector(CMKEYFARFIELD2D, 'viridis');
        this.create_listed_colormap_selector(CMKEYFARFIELD1D);
        this.canvas2D = this.find_element('farfield-canvas-2d');
        this.canvas1D = this.find_element('farfield-canvas-1d');
        this.plot1D = new ScenePlot1D(this.canvas1D, this.colormap[CMKEYFARFIELD1D]);
        this.parent.create_canvas_hover(this.canvas2D);

        this.canvas2D.addEventListener('mousemove', (e) => {
            const canvas = this.canvas2D;
            const f = canvas.index_from_event;
            const ff = this.ff
            let text = "HI";
            if (f !== undefined && ff !== null && ff.dirMax != null){
                const [it, ip] = f(e);
                if (ip != null){
                    const theta = ff.theta[it]*180/Math.PI;
                    const phi = ff.phi[ip]*180/Math.PI;
                    const ff1 = 10*Math.log10(ff.farfield_total[ip][it]/ff.maxValue);
                    const ff2 = ff1 + 10*Math.log10(ff.dirMax);
                    text = `(${theta.toFixed(2)}, ${phi.toFixed(2)}): ${ff2.toFixed(2)} dBi (${ff1.toFixed(2)} dB)`;
                }
            }
            canvas.hover_container.innerHTML = text;
        });
    }
    add_to_queue(queue){
        const arrayControl = this.parent.arrayControl;
        const cm = this.colormap[CMKEYFARFIELD2D];
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
                this.dirMax = null;
                return this.ff.calculator_loop(arrayControl.pa)
            });
            needsRescale = true;
        }
        if (needsRescale){
            queue.add('Rescaling farfield...', () => {
                if (this.eleMax !== null) this.eleMax.innerHTML = `Directivity: ${(10*Math.log10(this.ff.dirMax)).toFixed(2)} dB`;
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
            queue.add('Drawing 2D farfield...', () => {
                this.ff.draw_polar(this.canvas2D);
            });
        }
        if (needsRedraw || this.plot1D.redrawWaiting){
            queue.add('Drawing 1D farfield...', () => {
                this.ff.create_1d_plot(this.plot1D);
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
