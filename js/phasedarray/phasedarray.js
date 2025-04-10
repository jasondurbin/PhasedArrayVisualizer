import {ones, normalize} from "../util.js";
import {Geometry} from "./geometry.js";

export class PhasedArray{
    /**
    * Create a Phased Array object.
    *
    * @param {Geometry} geometry
    * */
    constructor(geometry){
        this.geometry = geometry;
        this.set_theta_phi(0, 0);
        this.size = geometry.length;
        this.vectorPhaseRaw = new Float32Array(this.size);
        this.vectorPhase = new Float32Array(this.size);
        this.vectorMagRaw = new Float32Array(this.size);
        this.vectorMag = new Float32Array(this.size);
        this.vectorAtten = new Float32Array(this.size);
    }
    set_theta_phi(theta, phi){
        this.theta = Number(theta);
        this.phi = Number(phi);
    }
    compute_phase(){
        const xf = Math.sin(this.theta*Math.PI/180)*Math.cos(this.phi*Math.PI/180);
        const yf = Math.sin(this.theta*Math.PI/180)*Math.sin(this.phi*Math.PI/180);

        const x = this.geometry.x;
        const y = this.geometry.y;
        for (let i = 0; i < this.geometry.length; i++){
            this.vectorPhaseRaw[i] = -2*Math.PI*((x[i]*xf + y[i]*yf) % 1.0)
        }
    }
    calculate_r_taper(){
        const x = normalize(this.geometry.x);
        const y = normalize(this.geometry.y);
        const r = Float32Array.from(x, (ix, i) => Math.sqrt(ix**2 + y[i]**2));
        const maxR = Math.max(...r);
        this.vectorMagX = this.taperX.calculate_weights(Float32Array.from(r, (v) => v/maxR*0.5));
        this.vectorMagY = ones(this.vectorMagX.length);
    }
    set_magnitude_weight(vector){ this.vectorMagRaw = vector; }
    calculate_final_vector(){
        for (let i = 0; i < this.geometry.length; i++){
            let m = this.vectorMagRaw[i];
            let p = this.vectorPhaseRaw[i];
            if (m < 0) {
                m = Math.abs(m)
                p += Math.PI;
            }
            this.vectorPhase[i] = p;
            this.vectorMag[i] = m;
        }
    }
    calculate_attenuation(){
        const maxV = Math.max(...this.vectorMag);
        for (let i = 0; i < this.geometry.length; i++){
            let m = this.vectorMag[i]/maxV;
            this.vectorMag[i] = m;
            this.vectorAtten[i] = 20*Math.log10(Math.abs(m));
        }
    }
}
