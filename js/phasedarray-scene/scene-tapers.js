import {SceneControl, SceneControlWithSelectorAutoBuild, SceneParent} from "../scene/scene-abc.js";
import {ScenePlot1D} from "../scene/plot-1d/scene-plot-1d.js";
import {Tapers} from "../phasedarray/tapers.js"
import {linspace, ones} from "../util.js";

/**
 * Create a taper scene from the input config.
 *
 * @param {Object} config
 */
export function CreateTaperScene(parent, config){
	if (config['taper']) return new SceneControlAllTapers(parent);
	return new SceneControlBlankTapers(parent);
}

/**
 * @import {SceneQueue} from "../scene/scene-queue.js"
 * @import {TaperAny} from "../phasedarray/tapers.js"
 * @import {SceneControlPhasedArray} from "../index-scenes.js"
 * */

/**
 * Create a taper.
 */
export class SceneControlTaper extends SceneControlWithSelectorAutoBuild{
	static autoUpdateURL = false;
	constructor(parent, key, htmlElement){
		super(parent, 'taper', Tapers, htmlElement, key);
		/** @type {TaperAny | null} */
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

export class SceneControlBlankTapers extends SceneControl{
	constructor(parent){
		super(parent, []);
		this.calculationWaiting = false;
		this.add_event_types('taper-changed');
	}
	add_to_queue(queue){}
	add_calculator_queue(queue, src){
		queue.add("Multiplying tapers...", () => {
			const geo = src.pa.geometry;
			src.pa.set_magnitude_weight(ones(geo.x.length));
		});
	}
	create_samples(points, axis){
		return [linspace(-1, 1, points), ones(points)];
	}
}

export class SceneControlAllTapers extends SceneControl{
	static autoUpdateURL = false;
	constructor(parent){
		super(parent, ['taper-sampling']);
		this.xControl = new SceneControlTaper(parent, 'x', parent.find_element('taper-x-group'));
		this.yControl = new SceneControlTaper(parent, 'y', parent.find_element('taper-y-group'));
		this.add_event_types('taper-changed');
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
			eleY.style.display = 'block';
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
				const geo = src.pa.geometry;
				taperX = t.calculate_from_geometry(geo.x, geo.dx);
			});
			queue.add("Calculating Y taper...", () => {
				const t = this.yControl.activeTaper;
				const geo = src.pa.geometry;
				taperY = t.calculate_from_geometry(geo.y, geo.dy);
			});
			queue.add("Multiplying tapers...", () => {
				this.trigger_event('taper-changed');
				src.pa.set_magnitude_weight(Float32Array.from(taperX, (x, i) => x * taperY[i]));
			});
		}
		else{
			// we're doing r sampling.
			queue.add("Calculating taper...", () => {
				const t = this.xControl.activeTaper;
				const geo = src.pa.geometry;
				src.pa.set_magnitude_weight(t.calculate_from_radial_geometry(geo.x, geo.y, geo.dx, geo.dy));
				this.trigger_event('taper-changed');
			});
		}
	}
	create_samples(points, axis){
		const x = linspace(-1, 1, points);
		const dx = x[1] - x[0];
		let y;
		if (this.find_element('taper-sampling')[0].selected){
			if (axis == 'x') y = this.xControl.activeTaper.calculate_from_geometry(x, dx);
			else y = this.yControl.activeTaper.calculate_from_geometry(x, dx);
		}
		else y = this.xControl.activeTaper.calculate_from_geometry(x, dx);
		return [x, y];
	}
}

export class SceneTaperCuts extends ScenePlot1D{
	draw(){
		this.reset();
		this.set_xlabel('Window');
		this.set_ylabel('Magnitude');
		this.set_xgrid(-0.5, 0.5, 11);
		this.set_xgrid_points(1);

		const pa = this.arrayScene;
		if (pa === undefined || pa == null) return;
		const taper = pa.taperControl;
		if (taper === undefined || taper === null) return;

		let belowZero = false;
		this.legend_items().forEach((e) => {
			const v = e.getAttribute('data-axis');
			if (v !== null){
				const [x, y] = taper.create_samples(101, v);
				const maxV = Math.max(...Float32Array.from(y, (i) => Math.abs(i)));
				const minV = Math.min(...y);
				if (minV < 0) belowZero = true;
				if (x !== null) this.add_data(x, Float32Array.from(y, (i) => i/maxV), e);
			}
		});
		if (belowZero) this.set_ygrid(-1, 1, 11);
		else this.set_ygrid(0, 1, 11);
		super.draw();
	}
	/**
	* Bind a Phased Array Scene.
	*
	* @param {SceneControlPhasedArray} scene
	*
	* @return {null}
	* */
	bind_phased_array_scene(scene){
		this.arrayScene = scene;
		scene.taperControl.addEventListener('taper-changed', () => {
			this.draw();
		});
	}
}
