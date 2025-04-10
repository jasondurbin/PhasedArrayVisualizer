import {linspace} from "../util.js";

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
        this.dirMax = null;

        for (let i = 0; i < this.phiPoints; i++){
            this.farfield_total[i] = new Float32Array(this.thetaPoints);
            this.farfield_log[i] = new Float32Array(this.thetaPoints);
        }
    }
    *calculator_loop(pa){
        const arrayX = pa.geometry.x;
        const arrayY = pa.geometry.y;
        const vPha = pa.vectorPhase;
        const vMag = pa.vectorMag;
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
    compute_directivity(){
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
}
