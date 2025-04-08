
import {linspace} from "../util.js";

export class ScenePlot1D{
    constructor(canvas, cmap){
        this.canvas = canvas;
        this.reset();
        canvas.width = canvas.width*this.scale;
        canvas.height = canvas.height*this.scale;
        this.cmap = cmap;
    }
    reset(){
        this.scale = 5;
        this.padding = 10;
        this.axesFontSize = 5;
        this.textPadding = 5;

        this.xLabel = undefined;
        this.yLabel = undefined;
        this.xGrid = undefined;

        this._data = []
    }
    get cPadding(){ return this.padding*this.scale; }
    get cAxesFontSize(){ return this.axesFontSize*this.scale; }
    get cTextPadding(){ return this.textPadding*this.scale; }
    get cGridLineWidth(){ return Math.max(1, parseInt(0.25*this.scale)); }
    get cDataLineWidth(){ return Math.max(1, parseInt(0.75*this.scale)); }
    set_ylabel(label){ this.yLabel = label; }
    set_xlabel(label){ this.xLabel = label; }
    set_xgrid(start, stop, count){ this.xGrid = linspace(start, stop, count); }
    set_ygrid(start, stop, count){ this.yGrid = linspace(start, stop, count); }
    create_farfield_cartesian(){
        const canvas = this.canvas;
        const ctx = canvas.getContext('2d');

        this.reset();
        ctx.reset();
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.set_xlabel('Theta (deg)');
        this.set_ylabel('Relative Directivity (dB)');
        this.set_xgrid(-90, 90, 13);
        this.set_ygrid(-40, 0, 11);
    }
    add_data(x, y, label){
        this._data.push({
            'x': x,
            'y': y,
            'label': label,
        })
    }
    _clip(xs, ys) {
        return [xs, ys];
        const rx = Float32Array.from(xs);
        const ry = Float32Array.from(ys);
        const xMin = this.xGrid[0];
        const xMax = this.xGrid[this.xGrid.length - 1];
        const yMin = this.yGrid[0];
        const yMax = this.yGrid[this.yGrid.length - 1];

        const _within_bounds = (x, y) => (x >= xMin && x <= xMax && y >= yMin && y <= yMax)

        for (let i = 0; i < xs.length; i++) {
            const x = xs[i];
            const y = ys[i];
            if (!_within_bounds(x, y)){
                rx[i] = Math.min(xMax, Math.max(xMin, x));
                ry[i] = Math.min(yMax, Math.max(yMin, y));
            }
        }
        return [rx, ry];
    }
    draw(){
        this.compute_grid_bounds();
        this.draw_xgrid();
        this.draw_ygrid();
        this.draw_data();
        this.draw_outline();
    }
    compute_grid_bounds(){
        const textPadding = this.cTextPadding;
        let minY = this.canvas.height - this.cAxesFontSize - this.cPadding - textPadding;
        let minX = this.cPadding;

        this.config = {}
        if (this.yGrid !== undefined){
            const ctx = this._create_context();
            let mx = 0.0
            for (let i = 0; i < this.yGrid.length; i++){
                let mt = ctx.measureText(this.yGrid[i].toString());
                mx = Math.max(mt.width, mx);
            }
            this.config['y-grid-text-width'] = mx;
            minX += mx + textPadding;
        }
        else{ this.config['y-grid-text-width'] = 0.0; }
        if (this.xLabel !== undefined){
            minY -= this.cAxesFontSize + textPadding;
        }
        if (this.yLabel !== undefined){
            minX += this.cAxesFontSize + textPadding;
        }
        this._ycBounds = [minY, this.cPadding]
        this._xcBounds = [minX, this.canvas.width - this.cPadding]
    }
    draw_data(){
        const sc = 180/Math.PI;
        const ctx = this._create_context();
        const minX = this.xGrid[0];
        const maxX = this.xGrid[this.xGrid.length - 1];
        const minY = this.yGrid[0];
        const maxY = this.yGrid[this.yGrid.length - 1];
        const cm = this.cmap.cmap();
        ctx.lineWidth = this.cDataLineWidth;

        ctx.beginPath();
        ctx.rect(
            this._xcBounds[0],
            this._ycBounds[0],
            (this._xcBounds[1] - this._xcBounds[0]),
            (this._ycBounds[1] - this._ycBounds[0])
        );
        ctx.clip();

        const _x = (x) => {
            return this._xcBounds[0] + (x - minX)/(maxX - minX)*(this._xcBounds[1] - this._xcBounds[0])
        }
        const _y = (y) => {
            return this._ycBounds[0] + (y - minY)/(maxY - minY)*(this._ycBounds[1] - this._ycBounds[0])
        }
        for (let i = 0; i < this._data.length; i++){
            ctx.strokeStyle = cm(i);
            const e = this._data[i];
            const x = Float32Array.from(e['x'], (x) => x*sc);
            const y = e['y'];
            ctx.beginPath();
            for (let j = 0; j < x.length; j++){
                let ix = _x(x[j]);
                let iy = _y(y[j]);
                if (j == 0) ctx.moveTo(ix, iy);
                else ctx.lineTo(ix, iy)
            }
            ctx.stroke();
        }
    }
    _create_context(){
        const style = window.getComputedStyle(document.body);
        const ctx = this.canvas.getContext('2d');
        ctx.strokeStyle = style.getPropertyValue('--grid-color');
        ctx.lineWidth = this.cGridLineWidth;
        ctx.fillStyle = style.getPropertyValue('--text-color');
        ctx.font = this.cAxesFontSize.toString() + 'px Arial';
        return ctx;
    }
    draw_outline(){
        const ctx = this._create_context();
        ctx.beginPath();
        ctx.moveTo(this._xcBounds[0], this._ycBounds[0]);
        ctx.lineTo(this._xcBounds[0], this._ycBounds[1]);
        ctx.lineTo(this._xcBounds[1], this._ycBounds[1]);
        ctx.lineTo(this._xcBounds[1], this._ycBounds[0]);
        ctx.lineTo(this._xcBounds[0], this._ycBounds[0]);
        ctx.stroke();
    }
    draw_ygrid(){
        const ctx = this._create_context();
        const count = this.yGrid.length;
        const sect = linspace(this._ycBounds[0], this._ycBounds[1], count);
        const maxX = this._xcBounds[1];
        const textPadding = this.cTextPadding;
        const minX = this._xcBounds[0];

        if (this.yLabel !== undefined){
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.beginPath();
            ctx.translate(minX-textPadding*2-this.config['y-grid-text-width'], (this._ycBounds[0] + this._ycBounds[1])/2.0);
            ctx.rotate(Math.PI/2);
            ctx.fillText(this.yLabel, 0, 0);
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.beginPath();
        for (let i = 0; i < count; i++){
            if (i > 0 && i < count - 1){
                ctx.moveTo(minX, parseInt(sect[i]));
                ctx.lineTo(maxX, parseInt(sect[i]));
            }
            ctx.fillText(this.yGrid[i].toString(), minX-textPadding, sect[i]);
        }
        ctx.stroke();
        ctx.restore();
    }
    draw_xgrid(){
        const ctx = this._create_context();
        const count = this.xGrid.length;
        const sect = linspace(this._xcBounds[0], this._xcBounds[1], count);
        const maxY = this._ycBounds[1];
        const textPadding = this.cTextPadding;
        const minY = this._ycBounds[0];
        const fontSize = this.cAxesFontSize;

        ctx.save();
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';

        if (this.xLabel !== undefined){
            ctx.beginPath();
            ctx.fillText(this.xLabel.toString(), (this._xcBounds[0] + this._xcBounds[1])/2, minY+textPadding*2+fontSize);
            ctx.stroke();
        }
        ctx.beginPath();
        for (let i = 0; i < count; i++){
            if (i > 0 && i < count - 1){
                ctx.moveTo(parseInt(sect[i]), minY);
                ctx.lineTo(parseInt(sect[i]), maxY);
            }
            ctx.fillText(this.xGrid[i].toString(), sect[i], minY+textPadding);
        }
        ctx.stroke();
        ctx.restore();
    }
}
