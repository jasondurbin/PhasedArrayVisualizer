import {linspace} from "./util.js";

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
        this.maxValue = -Infinity;

        for (let i = 0; i < this.phiPoints; i++){
            this.farfield_total[i] = new Float32Array(this.thetaPoints);
            this.farfield_log[i] = new Float32Array(this.thetaPoints);
        }
    }
    *calculator_loop(pa){
        let arrayX = pa.geometry.x;
        let arrayY = pa.geometry.y;
        let vPha = pa.vectorPhase;
        let vMag = pa.vectorMag;
        let ac = 0;
        const maxProgress = arrayX.length + 3;
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
    }
    rescale_magnitude(logMin){
        logMin = -Math.max(Math.abs(Number(logMin)), 5);
        for (let ip = 0; ip < this.phiPoints; ip++){
            for (let it = 0; it < this.thetaPoints; it++){
                const c = 10*Math.log10(this.farfield_total[ip][it]/this.maxValue);
                this.farfield_log[ip][it] = (c-logMin)/-logMin;
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
                this.colormap_vals[ip][it] = colormap(this.farfield_log[ip][it]);
            }
        }
    }
    draw_polar(canvas){
        const ctx = canvas.getContext('2d');
        ctx.reset();
        canvas.width = 7000;
        canvas.height = 7000;
        const thetaStep = Math.PI/(this.thetaPoints - 1);
        const phiStep = Math.PI/(this.phiPoints - 1);
        const r = Math.min(canvas.width/2, canvas.height/2);
        const ts = Math.PI + thetaStep;
        const smoothing = thetaStep*0.5;
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.scale(1.0, -1.0);
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
                if (this.theta[it] == 0 && this.phi[it] == 0){
                    ctx.arc(0.0, 0.0, r2, 0, 2*Math.PI);
                }
                else {
                    ctx.arc(0.0, 0.0, r2, a1, a2);
                    ctx.lineTo(r1*Math.cos(a2), r1*Math.sin(a2));
                    ctx.arc(0.0, 0.0, r1, a2, a1, true);
                }
                ctx.closePath();
                ctx.lineWidth = 0.0;
                ctx.fill();
            }
        }
        // delete the colormap values to clear memory.
        delete this.colormap_vals;
    }
}
