import {SceneControl, SceneControlWithSelector, SceneParent} from "./scene/scene-abc.js";
import {SceneQueue} from "./scene/scene-queue.js";
import {Geometries} from "./phasedarray/geometry.js";
import {PhasedArray} from "./phasedarray/phasedarray.js";
import {FarfieldSpherical} from "./phasedarray/farfield.js"
import {Tapers} from "./phasedarray/tapers.js"
import {normalize} from "./util.js";

export class SceneControlGeometry extends SceneControlWithSelector{
    constructor(parent){
        super(parent, 'geometry', Geometries);
        this.activeGeometry = null;
    }
    control_changed(key){
        super.control_changed(key);
        this.activeGeometry = null;
    }
    get calculationWaiting(){ return this.activeGeometry === null; }
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

export class SceneControlPhasedArray extends SceneControl{
    constructor(parent){
        super(parent, ['theta', 'phi']);
        this.pa = null;
        this.geometryControl = new SceneControlGeometry(this);
        this.taperControl = new SceneControlAllTapers(this);
        this.add_event_types(
            'phased-array-changed',
            'phased-array-phase-changed',
            'phased-array-attenuation-changed',
        );
    }
    /**
    * Add callable objects to queue.
    *
    * @param {SceneQueue} queue
    *
    * @return {null}
    * */
    add_to_queue(queue){
        let needsPhase = this.changed['theta'] || this.changed['phi'];
        let needsAtten = this.taperControl.calculationWaiting;
        let needsRecalc = false;
        this.farfieldNeedsCalculation = false
        this.geometryControl.add_to_queue(queue);
        this.taperControl.add_to_queue(queue);

        if (this.geometryControl.calculationWaiting || this.pa === null){
            queue.add('Updating array...', () => {
                    this.pa = new PhasedArray(this.geometryControl.activeGeometry);
                    this.trigger_event('phased-array-changed', this.pa);
                }
            )
            needsPhase = true;
            needsAtten = true;
            this.farfieldNeedsCalculation = true;
        }
        if (this.pa !== null){
            needsRecalc = needsRecalc || this.pa.requestUpdate;
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
            needsRecalc = true;
        }
        if (needsAtten){
            this.taperControl.add_calculator_queue(queue, this);
            needsRecalc = true;
        }
        if (needsRecalc){
            queue.add('Calculating vector...', () => {
                this.pa.calculate_final_vector();
            });
            queue.add('Calculating attenuation...', () => {
                this.pa.calculate_attenuation();
                this.trigger_event('phased-array-phase-changed', this.pa);
                this.trigger_event('phased-array-attenuation-changed', this.pa);
            });
            this.farfieldNeedsCalculation = true;
        }
        this.phaseChanged = needsPhase;
        this.attenChanged = needsAtten;
    }
}

export class SceneControlFarfield extends SceneControl{
    constructor(parent){
        super(parent, ['theta-points', 'phi-points']);
        this.ff = null;
        this.validMaxMonitors = new Set(['directivity']);
        this.maxMonitors = {};
        this.add_event_types('farfield-changed', 'farfield-calculation-complete');
    }
    /**
    * Add callable functions to monitor values.
    *
    * @param {string} key Examples: directivity
    * @param {function(Number):null} callback
    *
    * @return {null}
    * */
    add_max_monitor(key, callback){
        if (!(this.validMaxMonitors.has(key))){
            throw Error(`Invalid monitor ${key}. Expected: ${Array.from(this.validMaxMonitors).join(', ')}`)
        }
        if (!(key in this.maxMonitors)) this.maxMonitors[key] = [];
        this.maxMonitors[key].push(callback);
    }
    /**
    * Add callable objects to queue.
    *
    * @param {SceneQueue} queue
    *
    * @return {null}
    * */
    add_to_queue(queue){
        const arrayControl = this.parent.arrayControl;
        let needsRecalc = arrayControl.farfieldNeedsCalculation;

        if (this.changed['theta-points'] || this.changed['phi-points'] || this.ff === null){
            queue.add('Creating farfield mesh...', () => {
                this.ff = new FarfieldSpherical(
                    this.find_element('theta-points').value,
                    this.find_element('phi-points').value
                )
                this.trigger_event('farfield-changed', this.ff);
                this.clear_changed('theta-points', 'phi-points');
            });
            needsRecalc = true;
        }
        if (needsRecalc){
            queue.add_iterator('Calculating farfield...', () => {
                return this.ff.calculator_loop(arrayControl.pa)
            });
            queue.add("Notifying farfield change...", () => {
                this.trigger_event('farfield-calculation-complete', this.ff);
                for (const [key, value] of Object.entries(this.maxMonitors)){
                    let val;
                    if (key == 'directivity') val = this.ff.dirMax;
                    else throw Error(`Unknown max key ${key}.`)
                    value.forEach((e) => e(val));
                }
            })
        }
        this.needsRedraw = needsRecalc;
    }
}

export class SceneControlTaper extends SceneControlWithSelector{
    constructor(parent, key){
        super(parent, 'taper', Tapers, key);
        this.activeTaper = null;
    }
    control_changed(key){
        super.control_changed(key);
        this.activeTaper = null;
    }
    get calculationWaiting(){
        return this.activeTaper === null;
    }
    /**
    * Add callable objects to queue.
    *
    * @param {SceneQueue} queue
    *
    * @return {null}
    * */
    add_to_queue(queue){
        if (this.calculationWaiting){
            queue.add('Building Taper...', () => {
                    this.activeTaper = this.build_active_object();
                }
            )
        }
    }
    /**
    * Build a taper control object.
    *
    * @param {SceneParent} parent
    * @param {String} key "x" or "y"
    *
    * @return {SceneControlTaper}
    * */
    static build(parent, key){
        const element = parent.find_element('taper-' + key + '-group')
        const k = parent.prepend + "-" + key + "-taper";
        const _create_group = (p) => {
            let kk = k;
            if (p !== undefined) kk += "-" + p;
            kk += "-div";
            var div = document.createElement('div');
            div.className = 'form-group';
            div.id = kk;
            element.appendChild(div);
            return div;
        }
        const _create_lbl = (div, p) => {
            let kk = k;
            if (p !== undefined) kk += "-" + p;
            const lbl = document.createElement("label");
            lbl.setAttribute("for", kk);
            div.appendChild(lbl);
            return lbl;
        }
        const _create_input = (div, p) => {
            let kk = k;
            if (p !== undefined) kk += "-" + p;
            const inp = document.createElement("input");
            inp.id = kk;
            inp.setAttribute('type', 'Number');
            inp.setAttribute('min', "0");
            inp.setAttribute('max', "100");
            inp.setAttribute('name', kk);
            inp.setAttribute('value', "0");
            div.appendChild(inp);
            return inp;
        }

        const div0 = _create_group();
        const div1 = _create_group('par-1');
        const div2 = _create_group('par-2');

        const lbl0 = _create_lbl(div0);
        lbl0.innerHTML = key.toUpperCase() + "-Taper";

        const sel0 = document.createElement("select");
        sel0.id = k;
        div0.appendChild(sel0);

        _create_lbl(div1, 'par-1');
        _create_input(div1, 'par-1');
        _create_lbl(div2, 'par-2');
        _create_input(div2, 'par-2');
        return new SceneControlTaper(parent, key);
    }
}

export class SceneControlAllTapers extends SceneControl{
    constructor(parent){
        super(parent, ['taper-sampling']);
        this.xControl = SceneControlTaper.build(parent, 'x');
        this.yControl = SceneControlTaper.build(parent, 'y');
    }
    get calculationWaiting(){
        return (
            this.xControl.calculationWaiting
            || this.yControl.calculationWaiting
            || this.changed['taper-sampling']
        );
    }
    control_changed(key){
        super.control_changed(key);
        const eleX = this.parent.find_element('taper-x-group');
        const eleY = this.parent.find_element('taper-y-group');
        if (this.find_element('taper-sampling')[1].selected){
            eleY.style.display = 'none';
            eleX.querySelector("label").innerHTML = "R-Taper";
        }
        else{
            eleY.style.display = 'block'
            eleX.querySelector("label").innerHTML = "X-Taper";
        }
    }
    /**
    * Add callable objects to queue.
    *
    * @param {SceneQueue} queue
    *
    * @return {null}
    * */
    add_to_queue(queue){
        this.xControl.add_to_queue(queue);
        this.yControl.add_to_queue(queue);
    }
    /**
    * Add callable objects to queue AFTER phased array
    * is created.
    *
    * @param {SceneQueue} queue
    * @param {SceneControlPhasedArray} src
    *
    * @return {null}
    * */
    add_calculator_queue(queue, src){
        if (this.find_element('taper-sampling')[0].selected){
            let taperX, taperY;
            // we're doing x/y sampling.
            queue.add("Calculating X taper...", () => {
                this.clear_changed('taper-sampling');
                const t = this.xControl.activeTaper;
                taperX = t.calculate_weights(normalize(src.pa.geometry.x));
            });
            queue.add("Calculating Y taper...", () => {
                const t = this.yControl.activeTaper;
                taperY = t.calculate_weights(normalize(src.pa.geometry.y));
            });
            queue.add("Multiplying tapers...", () => {
                src.pa.set_magnitude_weight(Float32Array.from(taperX, (x, i) => x * taperY[i]));
            });
        }
        else{
            let geor;
            // we're doing r sampling.
            queue.add("Calculating radial information...", () => {
                this.clear_changed('taper-sampling');
                const x = normalize(src.pa.geometry.x);
                const y = normalize(src.pa.geometry.y);
                const r = Float32Array.from(x, (ix, i) => Math.sqrt(ix**2 + y[i]**2));
                const maxR = Math.max(...r);
                geor = Float32Array.from(r, (v) => v/maxR*0.5);
            });
            queue.add("Calculating taper...", () => {
                const t = this.xControl.activeTaper;
                src.pa.set_magnitude_weight(t.calculate_weights(geor))
            });
        }
    }
}
