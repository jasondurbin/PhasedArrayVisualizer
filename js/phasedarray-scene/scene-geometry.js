import {SceneControlWithSelectorAutoBuild} from "../scene/scene-abc.js";
import {Geometries} from "../phasedarray/geometry.js";

export class SceneControlGeometry extends SceneControlWithSelectorAutoBuild{
	static autoUpdateURL = false;
	constructor(parent, config){
		let _hide = false;
		let _geos = Geometries;
		if (config !== undefined) _hide = config['geometry-pars'] === false;
		if (_hide || config !== undefined && config['geometry'] != 'user' && config['geometry'] !== undefined){
			const c = String(config['geometry']).toLowerCase();
			_geos = [Geometries[0]];

			for (let i = 0; i < Geometries.length; i++){
				const g = Geometries[i];
				if (g.title.toLowerCase() != c) continue;
				_geos[0] = g;
				break;
			}
		}
		let p = parent.find_element('geometry-controls', !_hide)
		if (p === null){
			p = document.createElement('div');
			p.style.display = 'none';
			document.body.appendChild(p);
		}
		super(parent, 'geometry', _geos, p, undefined, undefined, (k) => {
			if (config === undefined) return true;
			if (_hide) return false;
			const s = config['geometry-' + k];
			if (s == 'user' || s === undefined) return true;
			return false;
		}, (k) => {
			if (config === undefined) return undefined;
			const s = config['geometry-' + k];
			if (s == 'user' || s === undefined) return undefined;
			return s;
		});
		this.activeGeometry = null;
		if (_hide) this.primarySelector.style.display = 'none';
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
