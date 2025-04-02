
export class PhasedArray{
    constructor(geometry){
        this.geometry = geometry;
        this.set_theta_phi(0, 0);
        this.size = geometry.length;
        this.vectorPhase = new Float32Array(this.size);
        this.vectorMag = new Float32Array(this.size);
        this.vectorAtten = new Float32Array(this.size);
        this.vectorPhaseScale = new Float32Array(this.size);
        this.vectorAttenScaled = new Float32Array(this.size);
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
            this.vectorPhase[i] = -2*Math.PI*((x[i]*xf + y[i]*yf) % 1.0)
            this.vectorMag[i] = 1.0;
            this.vectorAtten[i] = 20*Math.log10(Math.abs(this.vectorMag[i]));
        }
    }
    rescale_phase(phaseMin, phaseMax){
        if (phaseMin === undefined) phaseMin = -180;
        if (phaseMax === undefined) phaseMax = 180;
        let pd = phaseMax - phaseMin;
        for (let i = 0; i < this.geometry.length; i++){
            let pha = this.vectorPhase[i]*180/Math.PI;
            if (pha > 180) pha -= 360;
            if (pha < -180) pha += 360;
            this.vectorPhaseScale[i] = (pha - phaseMin)/pd;
        }
    }
    rescale_attenuation(attenMin, attenMax){
        if (attenMin === undefined) attenMin = -40;
        if (attenMax === undefined) attenMax = 0;
        let am = attenMax - attenMin;
        let ma = Math.max(...this.vectorAtten);
        for (let i = 0; i < this.geometry.length; i++){
            this.vectorAttenScaled[i] = (this.vectorAtten[i] - ma - attenMax)/am;
        }
    }
    compute_magnitude(){
        for (let i = 0; i < this.geometry.length; i++){
            this.vectorMag[i] = 1.0;
            this.vectorAtten[i] = 20*Math.log10(Math.abs(this.vectorMag[i]));
        }
    }
    draw_phase(canvas, cmap){
        return this.geometry.draw(canvas, this.vectorPhaseScale, cmap)
    }
    draw_attenuation(canvas, cmap){
        return this.geometry.draw(canvas, this.vectorAttenScaled, cmap)
    }
}
