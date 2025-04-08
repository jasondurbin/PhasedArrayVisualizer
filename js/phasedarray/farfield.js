import {linspace, adjust_theta_phi} from "../util.js";

export class FarfieldSpherical{
    constructor(thetaPoints, phiPoints){
        thetaPoints = Number(thetaPoints)
        phiPoints = Number(phiPoints)
        // ensure samples are even
        if (thetaPoints % 2 == 0) thetaPoints++;
        if (phiPoints % 2 == 0) phiPoints++;
        this.thetaPoints = thetaPoints;
        this.phiPoints = phiPoints;

        this.theta = linspace(-Math.PI/2, Math.PI/2, this.thetaPoints);
        this.phi = linspace(-Math.PI/2, Math.PI/2, this.phiPoints);

        this.farfield_total = new Array(this.phiPoints);
        this.farfield_log = new Array(this.phiPoints);
        this.farfield_log_scale = new Array(this.phiPoints);
        this.maxValue = -Infinity;
        this.dirMax = null;

        for (let i = 0; i < this.phiPoints; i++){
            this.farfield_total[i] = new Float32Array(this.thetaPoints);
            this.farfield_log[i] = new Float32Array(this.thetaPoints);
            this.farfield_log_scale[i] = new Float32Array(this.thetaPoints);
        }
    }
    *calculator_loop(pa){
        let arrayX = pa.geometry.x;
        let arrayY = pa.geometry.y;
        let vPha = pa.vectorPhase;
        let vMag = pa.vectorMag;
        let ac = 0;
        const maxProgress = arrayX.length + 4;
        const _yield = (text) => {
            ac++;
            return {
                text: text,
                progress: ac,
                max: maxProgress
            };
        }
        this.maxValue = -Infinity;

        yield _yield('Resetting farfield...');

        let sinThetaPi = Float32Array.from({length: this.thetaPoints}, (_, i) => 2*Math.PI*Math.sin(this.theta[i]));

        let farfield_im = new Array(this.phiPoints);
        let farfield_re = new Array(this.phiPoints);

        for (let i = 0; i < this.phiPoints; i++){
            farfield_im[i] = new Float32Array(this.thetaPoints);
            farfield_re[i] = new Float32Array(this.thetaPoints);
        }
        yield _yield('Clearing farfield...');
        for (let ip = 0; ip < this.phiPoints; ip++){
            for (let it = 0; it < this.thetaPoints; it++){
                farfield_im[ip][it] = 0;
                farfield_re[ip][it] = 0;
            }
        }
        for (let i = 0; i < arrayX.length; i++){
            yield _yield('Calculating farfield...');
            for (let ip = 0; ip < this.phiPoints; ip++){
                const xxv = arrayX[i]*Math.cos(this.phi[ip]);
                const yyv = arrayY[i]*Math.sin(this.phi[ip]);
                for (let it = 0; it < this.thetaPoints; it++){
                    const jk = sinThetaPi[it];
                    const v = xxv*jk + yyv*jk + vPha[i];
                    farfield_re[ip][it] += vMag[i]*Math.cos(v);
                    farfield_im[ip][it] += vMag[i]*Math.sin(v);
                }
            }
        }
        yield _yield('Calculating farfield...');
        const sc = arrayX.length;
        for (let ip = 0; ip < this.phiPoints; ip++){
            for (let it = 0; it < this.thetaPoints; it++){
                const c = Math.abs(farfield_re[ip][it]**2 + farfield_im[ip][it]**2)/sc;
                this.farfield_total[ip][it] = c;
            }
            this.maxValue = Math.max(this.maxValue, ...this.farfield_total[ip]);
        }
        yield _yield('Calculating Directivity...');
        this.dirMax = this.compute_directivity();
        yield _yield('Calculating Log...');
        for (let ip = 0; ip < this.phiPoints; ip++){
            for (let it = 0; it < this.thetaPoints; it++){
                this.farfield_log[ip][it] = 10*Math.log10(this.farfield_total[ip][it]/this.maxValue);
            }
        }
    }
    rescale_magnitude(logMin){
        logMin = Math.max(Math.abs(Number(logMin)), 5);
        for (let ip = 0; ip < this.phiPoints; ip++){
            for (let it = 0; it < this.thetaPoints; it++){
                this.farfield_log_scale[ip][it] = (this.farfield_log[ip][it] + logMin)/logMin;
            }
        }
    }
    compute_directivity() {
        let bsa = 0;
        const step = Math.PI/(this.thetaPoints - 1)*Math.PI/(this.phiPoints - 1);
        for (let it = 0; it < this.thetaPoints; it++) {
            let st = Math.abs(Math.sin(this.theta[it]))*step;
            for (let ip = 0; ip < this.phiPoints; ip++) {
                bsa += this.farfield_total[ip][it]*st;
            }
        }
        return 4*Math.PI*this.maxValue/bsa;
    }
    create_colormap(colormap){
        this.colormap_vals = new Array(this.phiPoints);
        for (let ip = 0; ip < this.phiPoints; ip++){
            this.colormap_vals[ip] = new Array(this.thetaPoints);
            for (let it = 0; it < this.thetaPoints; it++){
                this.colormap_vals[ip][it] = colormap(this.farfield_log_scale[ip][it]);
            }
        }
    }
    create_1d_plot(plot1D){
        plot1D.create_farfield_cartesian();
        plot1D.legend_items().forEach((e) => {
            let p = e.getAttribute('data-cut');
            const phi = this.phi;
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
                plot1D.add_data(
                    this.theta,
                    this.farfield_log[mi],
                    e,
                );
            }
        });
    }
    draw_polar(canvas){
        const ctx = canvas.getContext('2d');
        ctx.reset();
        const scale = 7000;
        canvas.width = scale;
        canvas.height = scale;
        const thetaStep = Math.PI/(this.thetaPoints - 1);
        const phiStep = Math.PI/(this.phiPoints - 1);
        const r = Math.min(canvas.width/2, canvas.height/2);
        const ts = Math.PI + thetaStep;
        const smoothing = Math.min(0.01, thetaStep*0.5);
        const pci = (this.phiPoints - 1)/2;
        const tci = (this.thetaPoints - 1)/2;
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
            if (it >= this.thetaPoints) it = this.thetaPoints - 1;
            if (ip >= this.phiPoints) ip = this.phiPoints - 1;
            return [it, ip];
        };

        for (let it = 0; it < this.thetaPoints; it++) {
            const r1 = Math.abs((this.theta[it]-thetaStep/2)/ts*r)*2+smoothing;
            const r2 = Math.abs((this.theta[it]+thetaStep/2)/ts*r)*2-smoothing;
            for (let ip = 0; ip < this.phiPoints; ip++) {
                let a1 = this.phi[ip] - phiStep/2-smoothing;
                let a2 = this.phi[ip] + phiStep/2+smoothing;

                if (this.theta[it] < 0){
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
        const thetaSteps = 7;
        const phiSteps = 13;
        this.add_phi_grid(canvas, phiSteps, 1/(thetaSteps-1));
        this.add_theta_grid(canvas, thetaSteps);

        // delete the colormap values to clear memory.
        delete this.colormap_vals;
    }
    draw_phi_cut(canvas){
        const ctx = canvas.getContext('2d');
        ctx.reset();
        const scale = 5;
        canvas.width = canvas.width*scale;
        canvas.height = canvas.height*scale;
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.scale(1.0, -1.0);
    }
    add_theta_grid(canvas, steps){
        if (steps === undefined) steps = 7;
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
    add_phi_grid(canvas, steps, startFraction){
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
}
