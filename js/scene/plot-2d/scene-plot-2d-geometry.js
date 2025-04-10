
import {ScenePlotABC} from "../scene-plot-abc.js"
import {PhasedArray} from "../../phasedarray/phasedarray.js";

export class ScenePlot2DGeometryABC extends ScenePlotABC{
    constructor(parent, canvas, cmapKey, defaultCMAP, strokeColor){
        if (defaultCMAP === undefined) defaultCMAP = 'viridis';
        if (strokeColor === undefined) strokeColor = 'black'
        let cmap = parent.create_mesh_colormap_selector(cmapKey, defaultCMAP);
        super(parent, canvas, cmap);
        this.strokeColor = strokeColor;
        this._redrawWaiting = false;
    }
    install_hover_item(callback){
        const canvas = this.canvas;
        this.create_hover_items();
        canvas.addEventListener('mousemove', (e) => {
            let i = null;
            let text = "&nbsp;";
            if (e.isTrusted && this.pa !== undefined){
                const f = canvas.index_from_event;
                if (f !== undefined) i = f(e);
            }
            if (i !== null){
                const geo = this.pa.geometry;
                const t = callback(i);
                text = `Element[${i}] (${geo.x[i].toFixed(2)}, ${geo.y[i].toFixed(2)}): ${t}`
            }
            canvas.hover_container.innerHTML = text;
        });
    }
    get redrawWaiting(){ return (this._redrawWaiting || this.cmap.changed); }
    /**
    * Load Phased array object.
    *
    * @param {PhasedArray} pa
    *
    * @return {null}
    * */
    load_phased_array(pa){ this.pa = pa; }
    create_hover_items(){
        const canvas = this.canvas;
        const p = canvas.parentElement.parentElement;
        const h = p.querySelector(".canvas-header");
        const ele = document.createElement("div");
        ele.classList = "canvas-hover-div";
        ele.innerHTML = "&nbsp;";
        canvas.hover_container = ele;
        h.appendChild(ele);

        canvas.addEventListener('mouseleave', () => {
            canvas.hover_container.innerHTML = "&nbsp";
        });
    }
    draw(data){
        if (this.pa === undefined) return;
        const canvas = this.canvas;
        const colormap = this.cmap.cmap();
        const scale = 600;
        const geo = this.pa.geometry;
        canvas.width = scale;
        canvas.height = scale;
        const ctx = canvas.getContext('2d');
        this.cmap.changed = false;
        ctx.reset();

        const maxX = Math.max(...geo.x) + geo.dx/2;
        const minX = Math.min(...geo.x) - geo.dx/2;
        const maxY = Math.max(...geo.y) + geo.dy/2;
        const minY = Math.min(...geo.y) - geo.dy/2;

        const wx = (maxX - minX);
        const wy = (maxY - minY);
        const sc = Math.min(canvas.width/wx, canvas.height/wy);
        const ox = (canvas.width - wx*sc)/2 - minX*sc;
        const oy = (canvas.height - wy*sc)/2 - minY*sc;
        const dx = geo.dx*0.98*sc/2;
        const dy = geo.dy*0.98*sc/2;

        const _xy_to_wh = (x, y) => [x*sc+ox, scale-(y*sc+oy)];
        const _wh_to_xy = (w, h) => [(w-ox)/sc, (scale-h-oy)/sc];

        canvas.transform_to_xy = _wh_to_xy;
        canvas.transform_to_wh = _xy_to_wh;
        canvas.index_from_event = (e) => {
            const rect = canvas.getBoundingClientRect();
            const wx = (e.clientX - rect.left)/rect.width*canvas.width;
            const wy = (e.clientY - rect.top)/rect.height*canvas.height;
            const [x, y] = _wh_to_xy(wx, wy);
            const dx = geo.dx/2;
            const dy = geo.dy/2;
            let eleI = null;
            for (let i = 0; i < geo.length; i++){
                if (((x - geo.x[i])/dx)**2 + ((y - geo.y[i])/dy)**2 <= 1) {
                    eleI = i;
                    break;
                }
            }
            return eleI;
        };
        for (let i = 0; i < geo.length; i++){
            let [x, y] = _xy_to_wh(geo.x[i], geo.y[i]);
            ctx.beginPath();
            ctx.ellipse(x, y, dx, dy, 0.0, 0.0, 2*Math.PI);
            ctx.closePath();
            ctx.fillStyle = colormap(data[i]);
            ctx.fill();
            ctx.strokeStyle = this.strokeColor;
            ctx.stroke();
        }
    }
}

export class ScenePlot2DGeometryPhase extends ScenePlot2DGeometryABC{
    constructor(parent, canvas, cmapKey, min, max){
        super(parent, canvas, cmapKey, 'hsv');
        if (min === undefined) min = -180;
        if (max === undefined) max = 180;
        this.min = min;
        this.max = max;
        this.install_hover_item((i) => `${(this.pa.vectorPhase[i]*180/Math.PI).toFixed(2)} deg`);
    }
    rescale_phase(){
        const pa = this.pa;
        const phaseMin = this.min;
        const phaseMax = this.max;
        const pd = phaseMax - phaseMin;
        this.vectorPhaseScale = new Float32Array(pa.geometry.length);
        for (let i = 0; i < pa.geometry.length; i++){
            let pha = pa.vectorPhase[i]*180/Math.PI;
            while (pha > 180) pha -= 360;
            while (pha < -180) pha += 360;
            this.vectorPhaseScale[i] = (pha - phaseMin)/pd;
        }
    }
    draw(){
        return super.draw(this.vectorPhaseScale)
    }
    add_to_queue(queue){
        queue.add('Scaling phase...', () => {
            this.rescale_phase();
        });
        queue.add('Drawing phase...', () => {
            this.draw();
        });
    }
}

export class ScenePlot2DGeometryAtten extends ScenePlot2DGeometryABC{
    constructor(parent, canvas, cmapKey, min, max){
        super(parent, canvas, cmapKey, 'inferno_r');
        if (min === undefined) min = -40;
        if (max === undefined) max = 0;
        this.min = min;
        this.max = max;
        this.install_hover_item((i) => `${this.pa.vectorAtten[i].toFixed(2)} dB`);
    }
    rescale_atten(){
        const pa = this.pa;
        const attenMin = this.min;
        const attenMax = this.max;
        const am = attenMax - attenMin;
        const ma = Math.max(...pa.vectorAtten);
        this.vectorAttenScaled = new Float32Array(pa.geometry.length);
        for (let i = 0; i < pa.geometry.length; i++){
            this.vectorAttenScaled[i] = -(pa.vectorAtten[i] - ma - attenMax)/am;
        }
    }
    draw(){
        return super.draw(this.vectorAttenScaled)
    }
    add_to_queue(queue){
        queue.add('Rescaling attenuation...', () => {
            this.rescale_atten();
        });
        queue.add('Drawing attenuation...', () => {
            this.draw();
        });
    }
}
