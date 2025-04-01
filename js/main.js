import {PhasedArray} from "./phasedarray.js";
import {initialize_geometry_scene} from "./geometry.js";
import {Farfield} from "./farfield.js";
import {Colormaps, find_colormap} from "./cmap.js";

export const Required_Selectors = [
    'theta',
    'phi',
    'refresh',
    'theta-points',
    'phi-points',
    'log-scale',
    'farfield-colormap',
    'geometry-phase-colormap',
    'geometry-magnitude-colormap',
    'farfield-canvas',
    'geometry-phase-canvas',
    'geometry-magnitude-canvas',
    'progress',
    'status',
]

/**	 *
 * Create scene for Phased Array simulator.
 *
 * @param {string} prepend - Prepend used on HTML IDs.
 * */
export class Scene {
    constructor(prepend) {
        this.prepend = prepend;
        this.selectors = {};
        this._cmChanged = {};
        Required_Selectors.forEach((x) => this.selectors[x] = this.html_element(x));
        initialize_geometry_scene(this);
        this.selectors['directivity-max'] = this.html_element('directivity-max', false);
        ['geometry-phase-colormap', 'geometry-magnitude-colormap', 'farfield-colormap'].forEach((x) => {
            for (var i = 0; i < Colormaps.length; i++){
                var ele = document.createElement('option');
                let cm = Colormaps[i];
                ele.value = cm;
                ele.innerHTML = cm;
                this.selectors[x].appendChild(ele);
                if (x == 'geometry-phase-colormap' && cm == 'rainbow') ele.selected = true;
                if (x == 'geometry-magnitude-colormap' && cm == 'inferno_r') ele.selected = true;
                if (x == 'farfield-colormap' && cm == 'viridis') ele.selected = true;
            }
            this._cmChanged[x] = true;
            this.selectors[x].addEventListener('change', () => {
                this._cmChanged[x] = true;
            });
        });
        this.selectors['refresh'].addEventListener('click', () => {
            this.start_state_machine();
        });
        this.reset_phased_array();
        this.ff = Farfield.from_scene(this);
        this.channel = new MessageChannel();
        this.state = null;
        this.channel.port1.onmessage = () => {this.state_machine()};
    }
    reset_phased_array(){
        this.pa = PhasedArray.from_scene(this);
    }
    html_element(id, errorOut){
        let eid = this.prepend + "-" + id;
        let ele = document.querySelector("#" + eid);
        if (ele == null && (errorOut === undefined || errorOut === true)){
            throw Error(`Missing HTML element with id: ${eid}`)
        }
        return ele;
    }
    selected_colormap(key){
        for (var i = 0; i < Colormaps.length; i++){
            if (this.selectors[key][i].selected){
                return find_colormap(Colormaps[i]);
            }
        }
    }
    log(string){
        if (string !== undefined) {
            console.log(string)
            this.selectors['status'].innerHTML = string;
        }
    }
    start_state_machine() {
        let os = this.state;
        if (os !== null) console.log("Stopping...");
        let find_entry = () => {
            if (this.pa.geometry.updateWaiting) return 0;
            if (this.pa.updateWaiting) return 0;
            if (this.ff.updateWaiting) return 6;
            if (this._cmChanged['geometry-phase-colormap']) return 24;
            if (this._cmChanged['geometry-magnitude-colormap']) return 25;
            if (this._cmChanged['farfield-colormap']) return 10;
        }
        let ns = find_entry();
        if (ns === undefined) this.state = os;
        else this.state = ns;
        this._queue = null;
        console.log("Entry:", this.state, ns, os);
        if (os === null && ns !== undefined){
            console.log("Entry:", this.state);
            this.state_machine();
            this.selectors['progress'].value = 0;
        }
    }
    append_queue(text, func){
        this.log(text);
        this._queue = func;
    }
    state_machine() {
        let updateProgress = true;
        if (this._queue !== null){
            this._queue();
            this.state++;
            this._queue = null;
        }
        else if (this.state == 0) {
            this.log("Resetting...");
            this.selectors['progress'].value = 0;
            this.state++;
        }
        else if (this.state == 1){
            if (this.pa.geometry.updateWaiting){
                this.append_queue("Regenerating array...", () => {
                    this.pa.geometry.generate()
                });
            }
            else this.state++;
        }
        else if (this.state == 2){
            this.append_queue("Creating coefficients...", () => {
                this.pa.generate()
            });
        }
        else if (this.state == 3){
            this.append_queue("Scaling coefficients...", () => {
                this.pa.rescale_coefficients()
            });
        }
        else if (this.state == 4 || this.state == 24){
            this.append_queue("Drawing phase...", () => {
                this.pa.geometry.draw(
                    this.selectors['geometry-phase-canvas'],
                    this.pa.vectorPhaseScale,
                    this.selected_colormap('geometry-phase-colormap'),
                )
                this._cmChanged['geometry-phase-colormap'] = false;
            });
        }
        else if (this.state == 5 || this.state == 25){
            this.append_queue("Drawing attenuation...", () => {
                this.pa.geometry.draw(
                    this.selectors['geometry-magnitude-canvas'],
                    this.pa.vectorAttenScaled,
                    this.selected_colormap('geometry-magnitude-colormap'),
                )
                this._cmChanged['geometry-magnitude-colormap'] = false;
            });
        }
        else if (this.state == 6){
            if (this.ff.updateWaiting){
                this.append_queue("Resetting farfield mesh...", () => {
                    this.ff.generate();
                });
            }
            else this.state++;
        }
        else if (this.state == 7){
            this.append_queue("Calculating farfield...", () => {
                this._looper = this.ff.create_calculator_loop(
                    this,
                    this.selectors['progress'],
                    this.selectors['status']
                );
            });
        }
        else if (this.state == 8){
            const v = this._looper();
            if (v === true){
                this._looper = null;
                this.state++;
            }
            else updateProgress = false;
        }
        else if (this.state == 9){
            const ele = this.selectors['directivity-max'];
            if (ele !== null){
                this.append_queue("Calculating directivity...", () => {
                    let d = this.ff.compute_directivity();
                    this.selectors['directivity-max'].innerHTML = `Directivity: ${(10*Math.log10(d)).toFixed(2)} dB`;
                });
            }
            else this.state++;
        }
        else if (this.state == 10){
            this.append_queue("Building colormap...", () => {
                this.ff.create_colormap(this.selected_colormap('farfield-colormap'));
                this._cmChanged['farfield-colormap'] = false;
            });
        }
        else if (this.state == 11){
            this.append_queue("Drawing farfield...", () => {
                this.ff.draw_polar(this.selectors['farfield-canvas']);
            });
        }
        else if (this.state == 12 || this.state == 26){
            this.log("Complete");
            this.state++;
        }
        else this.state = null;
        if (this.state !== null) {
            if (updateProgress) this.selectors['progress'].value = this.state/11*100;
            this.channel.port2.postMessage("");
        }
    }
}
