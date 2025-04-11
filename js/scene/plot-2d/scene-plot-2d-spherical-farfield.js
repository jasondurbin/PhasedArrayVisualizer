import {FarfieldSpherical} from "../../phasedarray/farfield.js"
import {ScenePlotABC} from "../scene-plot-abc.js"
import {adjust_theta_phi} from "../../util.js";
import {SceneControlFarfield} from "../../index-scenes.js"

export class ScenePlotFarfield2D extends ScenePlotABC{
	constructor(parent, canvas, cmapKey, thetaSteps, phiSteps){
		let cmap = parent.create_mesh_colormap_selector(cmapKey, 'viridis');
		super(parent, canvas, cmap);
		if (thetaSteps === undefined) thetaSteps = 7;
		if (phiSteps === undefined) phiSteps = 13;
		this.add_event_types('data-min-changed');
		this.phiSteps = phiSteps;
		this.thetaSteps = thetaSteps;
		canvas.addEventListener('mousemove', (e) => {
			if (this.queue.running) return;
			this.show_farfield_hover(e);
		});
		this.cmap.addEventListener('change', () => {this.build_queue();})
		this.ff = undefined;
		this._needsRescale = false
		this.addEventListener('data-min-changed',() => {
			this._needsRescale = true
			this.build_queue();
		})
		this.create_hover_items();
		this.create_progress_bar();
		this.create_queue();
	}
	/**
	* Load farfield object.
	*
	* @param {FarfieldSpherical} ff
	*
	* @return {null}
	* */
	load_farfield(ff){
		this.ff = ff;
		this._needsRescale = true;
	}
	get isValid(){return !(this.ff === undefined || this.ff === null); }
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
			this.build_queue();
		});
	}
	rescale(){
		if (!this.isValid) return;
		const logMin = -this.min;
		const ff = this.ff
		this.farfield_log_scale = new Array(ff.phiPoints);
		for (let ip = 0; ip < ff.phiPoints; ip++){
			const pc = ff.farfield_log[ip];
			this.farfield_log_scale[ip] = Float32Array.from({length: ff.thetaPoints}, (_, it) => ((pc[it] + logMin)/logMin));
		}
		this._needsRescale = false;
	}
	create_colormap(){
		if (!this.isValid) return;
		const ff = this.ff
		const cmap = this.cmap.cmap();
		this.colormap_vals = new Array(ff.phiPoints);
		for (let ip = 0; ip < ff.phiPoints; ip++){
			const arr = new Array(ff.thetaPoints);
			this.colormap_vals[ip] = arr;
			for (let it = 0; it < ff.thetaPoints; it++){
				arr[it] = cmap(this.farfield_log_scale[ip][it]);
			}
		}
		cmap.changed = false;
	}
	build_queue(){
		this.queue.reset();
		if (this._needsRescale){
			this.queue.add('Rescaling farfield...', () => {
				this.rescale();
			});
		}
		this.queue.add('Creating farfield colormap...', () => {
			this.create_colormap();
		});
		this.queue.add('Drawing 2D farfield...', () => {
			this.draw_polar();
		});
		this.queue.start("&nbsp;");
	}
	show_farfield_hover(e){
		const canvas = this.canvas;
		const f = canvas.index_from_event;
		const ff = this.ff
		let text = "&nbsp;";
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
	}
	draw_polar(){
		if (!this.isValid) return;
		const canvas = this.canvas;
		const ctx = canvas.getContext('2d');
		const ff = this.ff;
		ctx.reset();
		const scale = 7000;
		canvas.width = scale;
		canvas.height = scale;
		const thetaStep = Math.PI/(ff.thetaPoints - 1);
		const phiStep = Math.PI/(ff.phiPoints - 1);
		const r = Math.min(canvas.width/2, canvas.height/2);
		const ts = Math.PI + thetaStep;
		const smoothing = Math.min(0.01, thetaStep*0.5);
		const pci = (ff.phiPoints - 1)/2;
		const tci = (ff.thetaPoints - 1)/2;
		ctx.translate(canvas.width/2, canvas.height/2);
		ctx.scale(1.0, -1.0);

		canvas.index_from_event = (e) => {
			const rect = canvas.getBoundingClientRect();
			const u = 2*(e.clientX - rect.left)/rect.width - 1.0;
			const v = 1-2*(e.clientY - rect.top)/rect.height;

			const r = Math.sqrt(u**2 + v**2);
			if (r > 1) return [null, null];
			const [th, ph] = adjust_theta_phi(r*Math.PI/2, Math.atan2(v, u), false);
			let it = Math.round((Math.PI/2 + th)/thetaStep);
			let ip = Math.round((Math.PI/2 + ph)/phiStep);
			if (it >= ff.thetaPoints) it = ff.thetaPoints - 1;
			if (ip >= ff.phiPoints) ip = ff.phiPoints - 1;
			return [it, ip];
		};

		for (let it = 0; it < ff.thetaPoints; it++) {
			const r1 = Math.abs((ff.theta[it]-thetaStep/2)/ts*r)*2+smoothing;
			const r2 = Math.abs((ff.theta[it]+thetaStep/2)/ts*r)*2-smoothing;
			for (let ip = 0; ip < ff.phiPoints; ip++) {
				let a1 = ff.phi[ip] - phiStep/2-smoothing;
				let a2 = ff.phi[ip] + phiStep/2+smoothing;

				if (ff.theta[it] < 0){
					a1 += Math.PI;
					a2 += Math.PI;
				}
				ctx.fillStyle = this.colormap_vals[ip][it];
				ctx.beginPath();
				if (it == tci && ip == pci){
					ctx.arc(0.0, 0.0, r2, 0, 2*Math.PI);
				}
				else{
					ctx.arc(0.0, 0.0, r2, a1, a2);
					ctx.lineTo(r1*Math.cos(a2), r1*Math.sin(a2));
					ctx.arc(0.0, 0.0, r1, a2, a1, true);
				}
				ctx.closePath();
				ctx.lineWidth = 0.0;
				ctx.fill();
			}
		}
		this.add_phi_grid(this.phiSteps, 1/(this.thetaSteps-1));
		this.add_theta_grid(this.thetaSteps);

		// delete the colormap values to clear memory.
		delete this.colormap_vals;
		this._needsRedraw = false;
	}
	add_phi_grid(steps, startFraction){
		const canvas = this.canvas;
		if (steps === undefined) steps = 13;
		if (startFraction === undefined) startFraction = 0.0;
		const ctx = canvas.getContext('2d');
		const scale = canvas.width*0.5;
		const c = 2*Math.PI/(steps - 1);
		const start = startFraction*scale;
		for (let i = 0; i < (steps-1); i++){
			const ph = i*c
			ctx.beginPath();
			ctx.moveTo(Math.cos(ph)*start, Math.sin(ph)*start);
			ctx.lineTo(Math.cos(ph)*scale, Math.sin(ph)*scale);
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
			ctx.lineWidth = 20.0;
			ctx.setLineDash([100, 100]);
			ctx.stroke();
			ctx.closePath();
		}
	}
	add_theta_grid(steps){
		if (steps === undefined) steps = 7;
		const canvas = this.canvas;
		const ctx = canvas.getContext('2d');
		const scale = canvas.width*0.5;
		const c = 1/(steps - 1);
		for (let i = 1; i < (steps-1); i++){
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
			ctx.lineWidth = 20.0;
			ctx.setLineDash([100, 100]);
			ctx.arc(0.0, 0.0, scale*(i*c), 0, 2*Math.PI);
			ctx.stroke();
			ctx.closePath();
		}
	}
}
