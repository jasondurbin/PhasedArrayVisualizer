
export class PhasedArray{
    constructor(geometry, taperX){
        this.geometry = geometry;
        this.taperX = taperX;
        this.set_theta_phi(0, 0);
        this.size = geometry.length;
        this.vectorPhase = new Float32Array(this.size);
        this.vectorMag = new Float32Array(this.size);
        this.vectorMagY = new Float32Array(this.size);
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
        }
    }
    rescale_phase(phaseMin, phaseMax){
        if (phaseMin === undefined) phaseMin = -180;
        if (phaseMax === undefined) phaseMax = 180;
        let pd = phaseMax - phaseMin;
        for (let i = 0; i < this.geometry.length; i++){
            let pha = this.vectorPhase[i]*180/Math.PI;
            while (pha > 180) pha -= 360;
            while (pha < -180) pha += 360;
            this.vectorPhaseScale[i] = (pha - phaseMin)/pd;
        }
    }
    rescale_attenuation(attenMin, attenMax){
        if (attenMin === undefined) attenMin = -40;
        if (attenMax === undefined) attenMax = 0;
        let am = attenMax - attenMin;
        let ma = Math.max(...this.vectorAtten);
        for (let i = 0; i < this.geometry.length; i++){
            this.vectorAttenScaled[i] = -(this.vectorAtten[i] - ma - attenMax)/am;
        }
    }
    calculate_x_taper(){
        this.vectorMagX = this.taperX.calculate_weights(this.geometry.x);
    }
    calculate_y_taper(){
        for (let i = 0; i < this.geometry.length; i++){
            this.vectorMagY[i] = 1.0;
        }
    }
    rescale_final_taper(){
        const maxV = Math.max(...this.vectorMag);
        for (let i = 0; i < this.geometry.length; i++){
            let v = this.vectorMag[i]/maxV;
            this.vectorMag[i] = v;
            this.vectorAtten[i] = 20*Math.log10(Math.abs(v));
        }
    }
    calculate_final_taper(){
        for (let i = 0; i < this.geometry.length; i++){
            let m = this.vectorMagX[i] * this.vectorMagY[i];
            if (m < 0) {
                m = Math.abs(m)
                this.vectorPhase[i] += Math.PI;
            }
            this.vectorMag[i] = m;
        }
    }
    draw_phase(canvas, cmap){
        return this.geometry.draw(canvas, this.vectorPhaseScale, cmap)
    }
    draw_attenuation(canvas, cmap){
        return this.geometry.draw(canvas, this.vectorAttenScaled, cmap)
    }
}
