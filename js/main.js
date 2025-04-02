import {create_phased_array_scene} from "./phasedarray.js";
import {create_geometry_scene} from "./geometry.js";
import {create_farfield_scene} from "./farfield.js";
import {Colormaps, find_colormap} from "./cmap.js";
import {EntryPoints} from "./scene-enum.js";

export const Required_Selectors = [
    'theta',
    'phi',
    'refresh',
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
        create_geometry_scene(this);
        this.selectors['directivity-max'] = this.html_element('directivity-max', false);
        ['geometry-phase-colormap', 'geometry-magnitude-colormap'].forEach((x) => {
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
        this.pa = create_phased_array_scene(this);
        this.ff = create_farfield_scene(this);
        this.channel = new MessageChannel();
        this.state = new EntryPoints();
        this.channel.port1.onmessage = () => {this.state_machine()};
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
        let os = this.state.value;
        const find_entry = () => {
            if (this.pa.geometry.updateWaiting) return EntryPoints.Regen_Geometry;
            if (this.pa.updateWaiting) return EntryPoints.Reset;
            if (this.ff.updateWaiting) return EntryPoints.Reset_Farfield;
            if (this._cmChanged['geometry-phase-colormap']) return EntryPoints.Draw_Phase_2;
            if (this._cmChanged['geometry-magnitude-colormap']) return EntryPoints.Draw_Atten_2;
            if (this._cmChanged['farfield-colormap']) return EntryPoints.Farfield_Colormap;
        }
        let start = false;
        if (os != EntryPoints.Initialization) {
            let ns = find_entry();
            if (ns === undefined) this.state.set(os);
            else this.state.set(ns);
            start = os === EntryPoints.Waiting && ns !== undefined;
            this._queue = null;
        }
        else start = true;
        console.log("Entry:", this.state.value, os);
        if (start) {
            this._queue = null;
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
            this.state.next();
            this._queue = null;
        }
        else if (this.state.is(EntryPoints.Initialization)) {
            this.log("Initializing...");
            this.state.next();
        }
        else if (this.state.is(EntryPoints.Reset)) {
            this.log("Resetting...");
            this.state.next();
        }
        else if (this.state.is(EntryPoints.Regen_Geometry)){
            if (this.pa.geometry.updateWaiting){
                this.append_queue("Regenerating array...", () => {
                    this.pa.geometry.generate()
                });
            }
            else this.state.next();
        }
        else if (this.state.is(EntryPoints.Create_Coefficients)){
            this.append_queue("Creating coefficients...", () => {
                this.pa.generate()
            });
        }
        else if (this.state.is(EntryPoints.Scale_Coefficients)){
            this.append_queue("Scaling coefficients...", () => {
                this.pa.rescale_coefficients()
            });
        }
        else if (this.state.is(EntryPoints.Draw_Phase) || this.state == 24){
            this.append_queue("Drawing phase...", () => {
                this.pa.geometry.draw(
                    this.selectors['geometry-phase-canvas'],
                    this.pa.vectorPhaseScale,
                    this.selected_colormap('geometry-phase-colormap'),
                )
                this._cmChanged['geometry-phase-colormap'] = false;
            });
        }
        else if (this.state.is(EntryPoints.Draw_Atten) || this.state == 25){
            this.append_queue("Drawing attenuation...", () => {
                this.pa.geometry.draw(
                    this.selectors['geometry-magnitude-canvas'],
                    this.pa.vectorAttenScaled,
                    this.selected_colormap('geometry-magnitude-colormap'),
                )
                this._cmChanged['geometry-magnitude-colormap'] = false;
            });
        }
        else if (this.state.is(EntryPoints.Reset_Farfield)){
            if (this.ff.updateWaiting){
                this.append_queue("Resetting farfield mesh...", () => {
                    this.ff.generate();
                });
            }
            else this.state.next();
        }
        else if (this.state.is(EntryPoints.Calculate_Farfield)){
            this.append_queue("Calculating farfield...", () => {
                this._looper = this.ff.create_calculator_loop(
                    this,
                    this.selectors['progress'],
                    this.selectors['status']
                );
            });
        }
        else if (this.state.is(EntryPoints.Calculate_Farfield_Loop)){
            const v = this._looper();
            if (v === true){
                this._looper = null;
                this.state.next();
            }
            else updateProgress = false;
        }
        else if (this.state.is(EntryPoints.Calculate_Directivity)){
            const ele = this.selectors['directivity-max'];
            if (ele !== null){
                this.append_queue("Calculating directivity...", () => {
                    let d = this.ff.compute_directivity();
                    this.selectors['directivity-max'].innerHTML = `Directivity: ${(10*Math.log10(d)).toFixed(2)} dB`;
                });
            }
            else this.state.next();
        }
        else if (this.state.is(EntryPoints.Farfield_Colormap)){
            this.append_queue("Building colormap...", () => {
                this.ff.create_colormap(this.selected_colormap('farfield-colormap'));
                this._cmChanged['farfield-colormap'] = false;
            });
        }
        else if (this.state.is(EntryPoints.Draw_Farfield)){
            this.append_queue("Drawing farfield...", () => {
                this.ff.draw_polar(this.selectors['farfield-canvas']);
            });
        }
        else if (this.state.is(EntryPoints.Complete) || this.state == 26){
            this.log("Complete");
            this.state.next();
        }
        if (!this.state.is(EntryPoints.Waiting)) {
            if (updateProgress) this.selectors['progress'].value = this.state.value/11*100;
            this.channel.port2.postMessage("");
        }
    }
    build_colormap_selection(key, defaultSelection) {
        if (defaultSelection === undefined) defaultSelection = 'viridis';
        const selector = this.selectors[key];
        Colormaps.forEach((cm) => {
            const ele = document.createElement('option');
            ele.value = cm;
            ele.innerHTML = cm;
            selector.appendChild(ele);
            if (defaultSelection == cm) ele.selected = true;
        });
        this._cmChanged[key] = true;
        selector.addEventListener('change', () => {
            this._cmChanged[key] = true;
        });
    }
}
