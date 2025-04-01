export class PhasedArray {
    constructor(geometry) {
        this.geometry = geometry;
        this.theta = 0;
        this.phi = 0;
        this._updateWaiting = true;
        this.size = 0;
    }
    set_theta_phi(theta, phi){
        this.theta = theta;
        this.phi = phi;
        this._updateWaiting = true;
    }
    get updateWaiting() {
        if (this.geometry.updateWaiting) return true;
        return this._updateWaiting;
    }
    generate () {
        if (this.geometry.updateWaiting) {
            this.geometry.generate();
            this._updateWaiting = true;
        }
        if (this.geometry.length != this.size){
            this.size = this.geometry.length;
            this.vectorPhase = new Float32Array(this.size);
            this.vectorMag = new Float32Array(this.size);
            this.vectorAtten = new Float32Array(this.size);
            this.vectorPhaseScale = new Float32Array(this.size);
            this.vectorAttenScaled = new Float32Array(this.size);
            this._updateWaiting = true;
        }
        if (!this._updateWaiting) return;

        let xf = Math.sin(this.theta*Math.PI/180)*Math.cos(this.phi*Math.PI/180);
        let yf = Math.sin(this.theta*Math.PI/180)*Math.sin(this.phi*Math.PI/180);

        let x = this.geometry.x;
        let y = this.geometry.y;
        for (let i = 0; i < this.geometry.length; i++){
            this.vectorPhase[i] = -2*Math.PI*((x[i]*xf + y[i]*yf) % 1.0)
            this.vectorMag[i] = 1.0;
            this.vectorAtten[i] = 20*Math.log10(Math.abs(this.vectorMag[i]));
        }
        this._updateWaiting = false;
    }
    rescale_coefficients(attenMin, attenMax, phaseMin, phaseMax){
        if (attenMin === undefined) attenMin = -40;
        if (attenMax === undefined) attenMax = 0;
        if (phaseMin === undefined) phaseMin = -180;
        if (phaseMax === undefined) phaseMax = 180;
        let pd = phaseMax - phaseMin;
        let am = attenMax - attenMin;
        let ma = Math.max(...this.vectorAtten);
        for (let i = 0; i < this.geometry.length; i++){
            let pha = this.vectorPhase[i]*180/Math.PI;
            if (pha > 180) pha -= 360;
            if (pha < -180) pha += 360;
            this.vectorPhaseScale[i] = (pha - phaseMin)/pd;
            this.vectorAttenScaled[i] = (this.vectorAtten[i] - ma - attenMax)/am;
        }
    }
    static from_scene(scene){
        let geo = scene.selected_geometry().from_scene(scene);
        scene.geometry = geo;
        let pa = new PhasedArray(geo);

        let _set_theta_phi = () => {pa.set_theta_phi(
            scene.selectors['theta'].value,
            scene.selectors['phi'].value
        );};
        scene.selectors['theta'].addEventListener('change', _set_theta_phi);
        scene.selectors['phi'].addEventListener('change', _set_theta_phi);
        _set_theta_phi();
        return pa;
    }
}
