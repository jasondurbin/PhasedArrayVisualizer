import {SceneControl} from "../scene/scene-abc.js";
import {FindSceneURL} from "../scene/scene-util.js";
import {PhasedArray} from "../phasedarray/phasedarray.js";
import {SceneControlSteering} from "./scene-steering.js";
import {CreateTaperScene} from "./scene-tapers.js";
import {SceneControlGeometry} from "./scene-geometry.js";
/**
 * @import {SceneQueue} from "./scene/scene-queue.js"
 * */

export class SceneControlPhasedArray extends SceneControl{
	static autoUpdateURL = false;
	constructor(parent, config){
		super(parent, ['atten-manual', 'phase-manual']);
		const sconfig = this.merge_config(config, {
			'taper': true,
			'phase-bits': 'user',
			'atten-bits': 'user',
			'atten-lsb': 'user',
		});
		this.pa = null;
		this.geometryControl = new SceneControlGeometry(this, config);

		this.taperControl = CreateTaperScene(this, sconfig);

		this.qphase = new PhaseQuantizer(this, sconfig);
		this.qatten = new AttenQuantizer(this, sconfig);

		this.steerControl = new SceneControlSteering(this, config);
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
		let needsPhase = this.steerControl.calculationWaiting;
		let needsAtten = this.taperControl.calculationWaiting;
		let needsRecalc = false;
		let needsPhaseQ = this.qphase.hasChanged();
		let needsAttenQ = this.qatten.hasChanged();
		this.farfieldNeedsCalculation = false
		this.geometryControl.add_to_queue(queue);
		this.taperControl.add_to_queue(queue);

		if (this.geometryControl.calculationWaiting || this.pa === null){
			queue.add('Updating array...', () => {
					let first = this.pa === null;
					this.pa = new PhasedArray(this.geometryControl.activeGeometry);
					this.trigger_event('phased-array-changed', this.pa);
					if (first) this.load_hidden_controls();
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
				const [theta, phi] = this.steerControl.get_theta_phi();
				this.pa.set_theta_phi(theta, phi);
				this.pa.compute_phase();
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
				this.update_hidden_controls();
			});
			needsPhaseQ = true;
			needsAttenQ = true;
		}
		if (needsPhaseQ){
			queue.add('Quantizing phase...', () => {
				this.pa.quantize_phase(this.qphase.bits);
				this.trigger_event('phased-array-phase-changed', this.pa);
			});
			this.farfieldNeedsCalculation = true;
		}
		if (needsAttenQ){
			queue.add('Quantizing attenuation...', () => {
				this.pa.quantize_attenuation(this.qatten.bits, this.qatten.lsb);
				this.trigger_event('phased-array-attenuation-changed', this.pa);
			});
			this.farfieldNeedsCalculation = true;
		}
		this.phaseChanged = needsPhase;
		this.attenChanged = needsAtten;
	}
	update_hidden_controls(){
		const mconfig = {};
		const pconfig = {};
		const mele = this.find_element('atten-manual');
		const pele = this.find_element('phase-manual');
		const pa = this.pa;
		for (let i = 0; i < pa.size; i++){
			if (!pa.vectorMagIsManual[i]) continue;
			mconfig[i] = [pa.vectorMagManual[i], pa.elementDisabled[i]];
		}
		if (Object.keys(mconfig).length === 0) mele.value = "";
		else mele.value = JSON.stringify(mconfig);
		mele.dispatchEvent(new Event('change'))
		for (let i = 0; i < pa.size; i++){
			if (!pa.vectorPhaseIsManual[i]) continue;
			pconfig[i] = pa.vectorPhaseManual[i];
		}
		if (Object.keys(pconfig).length === 0) pele.value = "";
		else pele.value = JSON.stringify(pconfig);
		pele.dispatchEvent(new Event('change'))
		const url = FindSceneURL();
		url.check_element('atten-manual', mele);
		url.check_element('phase-manual', pele);
	}
	load_hidden_controls(){
		const pa = this.pa;
		const mele = this.find_element('atten-manual');
		const pele = this.find_element('phase-manual');
		try{
			if (mele.value != ""){
				const mconfig = JSON.parse(mele.value);
				for (let i = 0; i < pa.size; i++){
					if (mconfig[i] === undefined) continue;
					const [v, d] = mconfig[i];
					pa.set_manual_magnitude(i, true, v, d);
				}
			}
		}
		catch(error){ console.log(error); }
		try{
			if (pele.value != ""){
				const pconfig = JSON.parse(pele.value);
				for (let i = 0; i < pa.size; i++){
					if (pconfig[i] === undefined) continue;
					pa.set_manual_phase(i, true, pconfig[i]);
				}
			}
		}
		catch(error){ console.log(error); }
	}
}

export class PhaseQuantizer extends SceneControl{
	static autoUpdateURL = false;
	constructor(parent, config){
		const bits = config['phase-bits'];
		let cons, _bits;
		if (bits == 'user'){
			cons = ['phase-bits'];
			_bits = null;
		}
		else {
			cons = [];
			_bits = Math.max(0, Math.min(10, bits));
		}
		super(parent, cons);
		this._bits = _bits;
	}
	get bits(){
		if (this._bits === null) {
			this.clear_changed('phase-bits');
			return Math.max(0, Math.min(10, this.find_element('phase-bits').value));
		}
		return this._bits
	}
	hasChanged(){
		if (this._bits !== null) return false;
		return this.changed['phase-bits'];
	}
}

export class AttenQuantizer extends SceneControl{
	static autoUpdateURL = false;
	constructor(parent, config){
		const bits = config['atten-bits'];
		const lsb = config['atten-lsb'];
		let cons = [], _bits, _lsb;
		if (bits == 'user'){
			cons.push('atten-bits');
			_bits = null;
		}
		else {
			_bits = Math.max(0, Math.min(10, bits));
		}

		if (lsb == 'user'){
			cons.push('atten-lsb');
			_lsb = null;
		}
		else {
			_lsb = Math.max(0, Math.min(5, lsb));
		}
		super(parent, cons);
		this._bits = _bits;
		this._lsb = _lsb;
	}
	get bits(){
		if (this._bits === null) {
			this.clear_changed('atten-bits');
			return Math.max(0, Math.min(10, this.find_element('atten-bits').value));
		}
		return this._bits
	}
	get lsb(){
		if (this._lsb === null) {
			this.clear_changed('atten-lsb');
			return Math.max(0, Math.min(5, this.find_element('atten-lsb').value));
		}
		return this._lsb

	}
	hasChanged(){
		let c = false;
		if (this._bits !== null) c ||= this.changed['atten-bits'];
		if (this._lsb !== null) c ||= this.changed['atten-lsb'];
		return c;
	}
}
