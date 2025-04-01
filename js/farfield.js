import {linspace} from "./util.js";

export class Farfield {
    constructor() {
        this.updateWaiting = true;
    }
    get maxLoop(){return self.phiPoints;}

    set_points(thetaPoints, phiPoints) {
        thetaPoints = Number(thetaPoints)
        phiPoints = Number(phiPoints)
        // ensure samples are even
        if (thetaPoints % 2 == 0) thetaPoints++;
        if (phiPoints % 2 == 0) phiPoints++;
        this.thetaPoints = thetaPoints;
        this.phiPoints = phiPoints;
        this.updateWaiting = true;
    }
    generate() {
        this.theta = linspace(-Math.PI/2, Math.PI/2, this.thetaPoints);
        this.phi = linspace(-Math.PI/2, Math.PI/2, this.phiPoints);

        this.farfield_total = new Array(this.phiPoints);
        this.farfield_log = new Array(this.phiPoints);
        this.maxValue = -Infinity;

        for (let i = 0; i < this.phiPoints; i++){
            this.farfield_total[i] = new Float32Array(this.thetaPoints);
            this.farfield_log[i] = new Float32Array(this.thetaPoints);
        }
        this.updateWaiting = false;
    }
    static from_scene(scene){
        let ff = new Farfield();
        let _set_points = () => {ff.set_points(
            scene.selectors['theta-points'].value,
            scene.selectors['phi-points'].value
        );};
        scene.selectors['theta-points'].addEventListener('change', _set_points);
        scene.selectors['phi-points'].addEventListener('change', _set_points);
        _set_points();
        return ff;
    }
    create_calculator_loop(scene, progress, status){
        let loopI = 0;
        let state = 0;
        let arrayX = scene.pa.geometry.x;
        let arrayY = scene.pa.geometry.y;
        let vPha = scene.pa.vectorPhase;
        let vMag = scene.pa.vectorMag;
        const logMin = -Math.abs(scene.selectors['log-scale'].value);

        let sinThetaPi = Float32Array.from({length: this.thetaPoints}, (_, i) => 2*Math.PI*Math.sin(this.theta[i]));

        let farfield_im = new Array(this.phiPoints);
        let farfield_re = new Array(this.phiPoints);
        this.maxValue = -Infinity;

        let log = console.log;
        let set_progress = (v) => {};
        let pvalue = 0.0;
        if (status !== undefined){
            log = (text) => {
                status.innerHTML = text;
                console.log(text);
            };
        }
        if (progress !== undefined){
            set_progress = (v) => { progress.value = v*100; };
            pvalue = progress.value/100;
        }

        for (let i = 0; i < this.phiPoints; i++){
            farfield_im[i] = new Float32Array(this.thetaPoints);
            farfield_re[i] = new Float32Array(this.thetaPoints);
        }

        let _clear = () => {
            log("Farfield: clearing...");
            for (let ip = 0; ip < this.phiPoints; ip++){
                for (let it = 0; it < this.thetaPoints; it++){
                    farfield_im[ip][it] = 0;
                    farfield_re[ip][it] = 0;
                }
            }
        }

        let _calculate = () => {
            set_progress(loopI/arrayX.length);
            for (let ip = 0; ip < this.phiPoints; ip++){
                const xxv = arrayX[loopI]*Math.cos(this.phi[ip]);
                const yyv = arrayY[loopI]*Math.sin(this.phi[ip]);
                for (let it = 0; it < this.thetaPoints; it++){
                    const jk = sinThetaPi[it];
                    const v = xxv*jk + yyv*jk + vPha[loopI];
                    farfield_re[ip][it] += vMag[loopI]*Math.cos(v);
                    farfield_im[ip][it] += vMag[loopI]*Math.sin(v);
                }
            }
            loopI += 1;
            if (loopI >= arrayX.length) state += 1;
        }

        let _compute_magnitude = () => {
            log("Farfield: creating magnitude...");
            this.maxValue = -Infinity;
            const sc = arrayX.length;
            for (let ip = 0; ip < this.phiPoints; ip++){
                for (let it = 0; it < this.thetaPoints; it++){
                    const c = Math.abs(farfield_re[ip][it]**2 + farfield_im[ip][it]**2)/sc;
                    this.maxValue = Math.max(c, this.maxValue);
                    this.farfield_total[ip][it] = c;
                }
            }
        }

        let _scale = () => {
            log("Farfield: scaling...");
            for (let ip = 0; ip < this.phiPoints; ip++){
                for (let it = 0; it < this.thetaPoints; it++){
                    const c = 10*Math.log10(this.farfield_total[ip][it]/this.maxValue);
                    this.farfield_log[ip][it] = (c-logMin)/-logMin;
                }
            }
        }

        let _loop = () => {
            if (state == 0) {
                _clear();
                state += 1;
                log("Farfield: calculating...");
                return false;
            }
            else if (state == 1) {
                _calculate();
                return false;
            }
            else if (state == 2) {
                set_progress(pvalue);
                _compute_magnitude();
                state += 1;
                return false;
            }
            else if (state == 3) {
                _scale();
                state += 1;
                return false;
            }
            else {
                // release large variables
                farfield_im = null;
                farfield_re = null;
                sinThetaPi = null;

                arrayX = null;
                arrayY = null;
                vPha = null;
                vMag = null;
                return true;
            }
        }
        return _loop
    }
    compute_directivity() {
        console.log("Farfield: computing directivity...");
        let bsa = 0;
        let step = Math.PI/(this.thetaPoints - 1)*Math.PI/(this.phiPoints - 1);
        for (let it = 0; it < this.thetaPoints; it++) {
            let st = Math.abs(Math.sin(this.theta[it]))*step;
            for (let ip = 0; ip < this.phiPoints; ip++) {
                bsa += this.farfield_total[ip][it]*st;
            }
        }
        return 4*Math.PI*this.maxValue/bsa;
    }
    create_colormap(colormap){
        console.log("Farfield: creating colormap...");
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
        console.log("Drawing...");
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
