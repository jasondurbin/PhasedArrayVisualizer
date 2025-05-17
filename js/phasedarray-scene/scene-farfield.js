
import {FarfieldDomains} from "../phasedarray/farfield.js"
import {SceneControlWithSelector, SceneControl} from "../scene/scene-abc.js";
/**
 * @import {SceneQueue} from "../scene/scene-queue.js"
 * */

export class SceneControlFarfieldDomain extends SceneControlWithSelector{
	static autoUpdateURL = false;
	constructor(parent){ super(parent, 'farfield-domain', FarfieldDomains); }
}

export class FarfieldDomainBlank{
	constructor(config){
		const domain = config['farfield-domain'];
		let d = FarfieldDomains[0];
		for (let i = 0; i < FarfieldDomains.length; i++){
			const f = FarfieldDomains[i];
			if (f.domain == domain) d = f;
		}
		this.domain = d;

		const p = config['farfield-points'];
		if (p === undefined){
			this._p1 = 257;
			this._p2 = 257;
		}
		else if (typeof(p) == 'number'){
			this._p1 = p;
			this._p2 = p;
		}
		else{
			this._p1 = Number(p[0]);
			this._p2 = Number(p[1]);
		}
	}
	build_active_object(){ return new this.domain(this._p1, this._p2); }
}

export class SceneControlFarfield extends SceneControl{
	static autoUpdateURL = false;
	constructor(parent, config){
		super(parent, []);
		const sconfig = this.merge_config(config, {
			'farfield-domain': 'user',
			'farfield-points': 'user',
		})
		if (sconfig['farfield-domain'] == 'user') this.cdomain = new SceneControlFarfieldDomain(this);
		else this.cdomain = new FarfieldDomainBlank(sconfig);
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

		if (this.changed['farfield-ax1-points'] || this.changed['farfield-ax2-points'] || this.ff === null){
			queue.add('Creating farfield mesh...', () => {
				this.ff = this.cdomain.build_active_object();
				this.trigger_event('farfield-changed', this.ff);
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
