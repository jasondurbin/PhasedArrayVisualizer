import {ScenePlot1D} from "./scene-plot-1d.js";
import {SceneControlFarfield} from "../../index-scenes.js"

export class ScenePlotFarfieldCuts extends ScenePlot1D{
	constructor(parent, canvas, cmapKey){
		super(parent, canvas, cmapKey);
		this.add_event_types('data-min-changed');
		this.addEventListener('data-min-changed',() => {
			this.create_farfield_cuts();
		})
		this.min = -40;
	}
	create_farfield_cartesian(){
		this.reset();
		this.set_xlabel('Theta (deg)');
		this.set_ylabel('Relative Directivity (dB)');
		this.set_xgrid(-90, 90, 13);
		this.set_ygrid(this.min, 0, 11);
	}
	/**
	* Load farfield object.
	*
	* @param {FarfieldSpherical} ff
	*
	* @return {null}
	* */
	load_farfield(ff){ this.ff = ff; }
	/**
	* Bind a Farfield Scene.
	*
	* @param {SceneControlFarfield} scene
	*
	* @return {null}
	* */
	bind_farfield_scene(scene){
		scene.addEventListener('farfield-calculation-complete', (ff) => {
			this.load_farfield(ff);
			this.create_farfield_cuts();
		});
	}
	create_farfield_cuts(){
		const ff = this.ff;
		this.create_farfield_cartesian();
		if (ff === undefined || ff == null) return;
		this.legend_items().forEach((e) => {
			let p = e.getAttribute('data-cut');
			const phi = ff.phi;
			if (p === undefined) return;
			p = Number(p)*Math.PI/180;

			const mp = Float32Array.from(phi, (x) => Math.abs(x - p));
			let mv = Infinity;
			let mi = -1;

			for (let i = 0; i < mp.length; i++){
				if (mp[i] < mv){
					mv = mp[i];
					mi = i;
				}
			}
			if (mi >= 0) {
				this.add_data(
					ff.theta,
					ff.farfield_log[mi],
					e,
				);
			}
		});
	}
}
