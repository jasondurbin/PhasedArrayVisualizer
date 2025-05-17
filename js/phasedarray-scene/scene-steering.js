import {SteeringDomains} from "../phasedarray/steering.js"
import {SceneControlWithSelector, SceneControl} from "../scene/scene-abc.js";

export class SceneControlSteeringDomain extends SceneControlWithSelector{
	static autoUpdateURL = false;
	constructor(parent){
		super(parent, 'steering-domain', SteeringDomains);
		this._last = this.selected_class();
	}
	control_changed(key){
		if (key == this.primaryKey){
			if (this._last === undefined) return;
			const c1 = this.find_object_map('theta');
			const c2 = this.find_object_map('phi');
			const p1 = Number(c1.ele.value);
			const p2 = Number(c2.ele.value);
			const obj = this.build_active_object();
			let [n1, n2] = obj.from(this._last.title, p1, p2);
			if (isNaN(n1) || isNaN(n2)){
				n1 = 0.0;
				n2 = 0.0;
			}
			c1.set_value(n1);
			c2.set_value(n2);
			this._last = this.selected_class();
		}
		super.control_changed(key);
	}
	hasChanged(){
		return this.changed['theta'] || this.changed['phi'] || this.changed['steering-domain'];
	}
	build_active_object(){
		this.clear_changed('theta', 'phi', 'steering-domain');
		return super.build_active_object();
	}
}

export class SteeringDomainBlank extends SceneControl{
	static autoUpdateURL = false;
	constructor(parent, config){
		const domain = config['steering-domain'];
		const spars = config['steering-parameters'];
		let cons = [];
		if (spars == 'user') cons = ['theta', 'phi'];
		super(parent, cons);
		let d = SteeringDomains[0];
		for (let i = 0; i < SteeringDomains.length; i++){
			const f = SteeringDomains[i];
			if (f.domain == domain) d = f;
		}
		this.domain = d;
		if (spars === 'user'){
			this._p1 = null;
		}
		else if (spars === undefined){
			this._p1 = 0;
			this._p2 = 0;
		}
		else if (typeof(spars) == 'number'){
			this._p1 = spars;
			this._p2 = spars;
		}
		else{
			this._p1 = Number(spars[0]);
			this._p2 = Number(spars[1]);
		}
	}
	hasChanged(){
		if (this._p1 !== null) return false;
		return this.changed['theta'] || this.changed['phi'];
	}
	build_active_object(){
		let p1, p2;
		if (this._p1 === null){
			p1 = Number(this.find_element('theta').value);
			p2 = Number(this.find_element('phi').value);
		}
		else{
			p1 = this._p1;
			p2 = this._p2;
		}
		return new this.domain(p1, p2);
	}
}

export class SceneControlSteering extends SceneControl{
	static autoUpdateURL = false;
	constructor(parent, config){
		super(parent, []);
		const sconfig = this.merge_config(config, {
			'steering-domain': 'user',
			'steering-parameters': 'user',
		})
		if (sconfig['steering-domain'] == 'user') this.cdomain = new SceneControlSteeringDomain(this);
		else this.cdomain = new SteeringDomainBlank(this, sconfig);
	}
	get calculationWaiting(){ return this.cdomain.hasChanged(); }
	get_theta_phi(){
		const obj = this.cdomain.build_active_object();
		return [obj.theta_deg, obj.phi_deg];
	}
}
