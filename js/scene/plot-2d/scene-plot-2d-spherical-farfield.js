import {FarfieldSpherical} from "../../phasedarray/farfield.js"
import {ScenePlotABC} from "../scene-plot-abc.js"
import {adjust_theta_phi} from "../../util.js";

export class ScenePlotFarfield2D extends ScenePlotABC{
    constructor(parent, canvas, cmapKey, thetaSteps, phiSteps){
        let cmap = parent.create_mesh_colormap_selector(cmapKey, 'viridis');
        super(parent, canvas, cmap);
        if (thetaSteps === undefined) thetaSteps = 7;
        if (phiSteps === undefined) phiSteps = 13;
        this.phiSteps = phiSteps;
        this.thetaSteps = thetaSteps;
        this.create_hover_items();
        canvas.addEventListener('mousemove', (e) => { this.show_farfield_hover(e); });
        this.ff = undefined;
        this._needsRedraw = false
    }
    get redrawWaiting(){
        if (this.ff === undefined) return false;
        return this._needsRedraw || this.cmap.changed;
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
        this._needsRedraw = true;
    }
    create_colormap(){
        const ff = this.ff
        if (ff === undefined) return;
        const cmap = this.cmap.cmap();
        this.colormap_vals = new Array(ff.phiPoints);
        for (let ip = 0; ip < ff.phiPoints; ip++){
            this.colormap_vals[ip] = new Array(ff.thetaPoints);
            for (let it = 0; it < ff.thetaPoints; it++){
                this.colormap_vals[ip][it] = cmap(ff.farfield_log_scale[ip][it]);
            }
        }
    }
    add_to_queue(queue){
        queue.add('Creating farfield colormap...', () => {
            if (this.ff === undefined) return;
            this.create_colormap();
            this.cmap.changed = false;
        });
        queue.add('Drawing 2D farfield...', () => {
            if (this.ff === undefined) return;
            this.draw_polar();
            this._needsRedraw = false;
        });
    }
    create_hover_items(){
        const canvas = this.canvas;
        const p = canvas.parentElement.parentElement;
        const h = p.querySelector(".canvas-header");
        const ele = document.createElement("div");
        ele.classList = "canvas-hover-div";
        ele.innerHTML = "&nbsp;";
        canvas.hover_container = ele;
        h.appendChild(ele);

        canvas.addEventListener('mouseleave', () => {
            canvas.hover_container.innerHTML = "&nbsp";
        });
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
        const canvas = this.canvas;
        const ctx = canvas.getContext('2d');
        const ff = this.ff;
        if (ff == undefined) return;
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
