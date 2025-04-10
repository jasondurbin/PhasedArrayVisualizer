import {ScenePlot1D} from "./scene-plot-1d.js";

export class ScenePlotFarfieldCuts extends ScenePlot1D{
    create_farfield_cartesian(){
        this.reset();
        this.set_xlabel('Theta (deg)');
        this.set_ylabel('Relative Directivity (dB)');
        this.set_xgrid(-90, 90, 13);
        this.set_ygrid(-40, 0, 11);
    }
    /**
    * Load farfield object.
    *
    * @param {FarfieldSpherical} ff
    *
    * @return {null}
    * */
    load_farfield(ff){ this.ff = ff; }
    draw_cuts(plot1D){
        const ff = this.ff;
        this.create_farfield_cartesian();
        if (ff === undefined) return;
        this.legend_items().forEach((e) => {
            let p = e.getAttribute('data-cut');
            const phi = ff.phi;
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
                this.add_data(
                    ff.theta,
                    ff.farfield_log[mi],
                    e,
                );
            }
        });
    }
}
