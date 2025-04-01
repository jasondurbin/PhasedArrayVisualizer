import {linspace} from "./util.js";

export const Geometry_Selectors = [
    'geometry',
    'dx',
    'dy',
    'x-count',
    'y-count',
    'geo-offset',
    'max-ring',
    'min-ring',
]

export function initialize_geometry_scene(scene){
    Geometry_Selectors.forEach((x) => scene.selectors[x] = scene.html_element(x));
    const geoSelector = scene.selectors['geometry'];
    const _reset = () => {scene.reset_phased_array();};
    Geometry_Selectors.forEach((x) => scene.selectors[x].addEventListener('change', _reset));
    for (let i = 0; i < Geometries.length; i++){
        const ele = document.createElement('option');
        ele.value = Geometries[i].title;
        ele.innerHTML = Geometries[i].title;
        geoSelector.appendChild(ele);
    }
    const _selected_geometry = () => {
        for (let i = 0; i < Geometries.length; i++){
            if (geoSelector[i].selected) return Geometries[i];
        }
    }
    const _activate = () => {_selected_geometry().activate(scene);};
    geoSelector.addEventListener('change', _activate);
    _activate();
    scene.selected_geometry = _selected_geometry;
}

export class Geometry {
    constructor() {
        this.updateWaiting = true;
    }
    generate() {
        this.updateWaiting = false;
    }
    set_xy(x, y){
        this.length = x.length;
        this.x = x;
        this.y = y;
    }
    draw(canvas, data, colormap, strokeColor){
        if (strokeColor === undefined) strokeColor = 'black';
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        ctx.reset();

        let maxX = Math.max(...this.x) + this.dx/2;
        let minX = Math.min(...this.x) - this.dx/2;
        let maxY = Math.max(...this.y) + this.dy/2;
        let minY = Math.min(...this.y) - this.dy/2;

        let wx = (maxX - minX);
        let wy = (maxY - minY);
        let sc = Math.min(canvas.width/wx, canvas.height/wy);
        let ox = (canvas.width - wx*sc)/2 - minX * sc;
        let oy = (canvas.height - wy*sc)/2 - minY * sc;
        let dx = this.dx*0.98*sc/2;
        let dy = this.dy*0.98*sc/2;
        for (let i = 0; i < this.length; i++){
            ctx.beginPath();
            ctx.ellipse(this.x[i]*sc+ox, this.y[i]*sc+oy, dx, dy, 0.0, 0.0, 2*Math.PI);
            ctx.fillStyle = colormap(data[i]);
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        }
    }
    static activate(scene){
        Geometry_Selectors.forEach((x) => {
            if (x != 'geometry' && x != 'dx' && x != 'dy') {
                let eid = scene.selectors[x].id;
                let ele = document.querySelector("#" + eid + "-div");
                ele.style.display = "none";
            }
        });
    };
    static show_element(scene, selector, label){
        let eid = scene.selectors[selector].id;
        let ele = document.querySelector("#" + eid + "-div");
        ele.style.display = "flex";
        if (label !== undefined){
            let lbl = ele.querySelector("label");
            if (lbl !== null) lbl.innerHTML = label;
        }
    }
}

export class RectangularGeometry extends Geometry {
    static title = 'Rectangular';
    constructor(dx, dy, xCount, yCount){
        super();
        if (dx <= 0) dx = 0.5
        if (dy <= 0) dx = 0.5
        this.dx = Number(dx);
        this.dy = Number(dy)
        this.xCount = Math.max(1, Number(xCount));
        this.yCount = Math.max(1, Number(yCount));
    }
    generate() {
        super.generate()
        let tc = this.xCount * this.yCount;
        let x = new Float32Array(tc);
        let y = new Float32Array(tc);
        let index = 0;
        for (let ix = 0; ix < this.xCount; ix++) {
            for (let iy = 0; iy < this.yCount; iy++) {
                x[index] = this.dx*ix;
                y[index] = this.dy*iy;
                index += 1;
            }
        }
        this.set_xy(x, y);
        this.adjust_xy();
    }
    adjust_xy() {return;}
    static from_scene(scene){
        return new RectangularGeometry(
            scene.selectors['dx'].value,
            scene.selectors['dy'].value,
            scene.selectors['x-count'].value,
            scene.selectors['y-count'].value
        );
    }
    static activate(scene) {
        super.activate(scene);
        super.show_element(scene, 'x-count', 'X Count');
        super.show_element(scene, 'y-count', 'Y Count');
    };
}

export class RectangularOffsetXGeometry extends RectangularGeometry {
    static title = 'Rectangular Offset X';
    constructor(dx, dy, xCount, yCount, offset){
        super(dx, dy, xCount, yCount);
        this.offset = Number(offset);
    }
    adjust_xy() {
        super.adjust_xy();
        for (let i = 0; i < this.x.length; i++) {
            if (i % 2 == 0) continue;
            this.x[i] += this.offset;
        }
    }
    static from_scene(scene){
        return new RectangularOffsetXGeometry(
            scene.selectors['dx'].value,
            scene.selectors['dy'].value,
            scene.selectors['x-count'].value,
            scene.selectors['y-count'].value,
            scene.selectors['geo-offset'].value
        );
    }
    static activate(scene) {
        super.activate(scene);
        super.show_element(scene, 'geo-offset', 'Offset');
    };
}

export class RectangularOffsetYGeometry extends RectangularGeometry {
    static title = 'Rectangular Offset Y';
    constructor(dx, dy, xCount, yCount, offset){
        super(dx, dy, xCount, yCount);
        this.offset = Number(offset);
    }
    adjust_xy() {
        super.adjust_xy();
        let cc = 0;
        for (let i = 0; i < this.y.length; i++) {
            if (i % this.yCount == 0) cc++;
            if (cc % 2 == 0) continue;
            this.y[i] += this.offset;
        }
    }
    static from_scene(scene){
        return new RectangularOffsetYGeometry(
            scene.selectors['dx'].value,
            scene.selectors['dy'].value,
            scene.selectors['x-count'].value,
            scene.selectors['y-count'].value,
            scene.selectors['geo-offset'].value
        );
    }
    static activate(scene) {
        super.activate(scene);
        super.show_element(scene, 'geo-offset', 'Offset');
    };
}

export class Hexagonal extends Geometry {
    static title = 'Hexagonal';
    constructor(dx, dy, xCount, yCount, axis){
        super();

        if (dx <= 0) dx = 0.5
        if (dy <= 0) dx = 0.5
        this.dx = Number(dx);
        this.dy = Number(dy)
        this.xCount = Math.max(1, Number(xCount));
        this.yCount = Math.max(1, Number(yCount));
        this.axis = axis;
    }
    generate() {
        super.generate()
        let cc, counter;
        if (this.axis == 'x') {
            cc = this.yCount;
            counter = this.xCount
        }
        else {
            cc = this.xCount;
            counter = this.yCount

        }
        if (cc % 2 == 0) cc++;
        let a1 = [];
        let a2 = [];
        let h = (cc - 1)/2.0;
        let d = 0

        for (let i = 0; i <= h; i++){
            for (let j = 0; j < counter; j++){
                a1.push(h + i);
                a2.push(j + d);
            }
            if (i > 0){
                for (let j = 0; j < counter; j++){
                    a1.push(h - i);
                    a2.push(j + d);
                }
            }
            counter -= 1
            d += 0.5
        }
        let x, y;
        if (this.axis == 'x') {
            x = a1;
            y = a2;
        }
        else {
            x = a2;
            y = a1;
        }
        this.set_xy(
            new Float32Array(x.map((v) => {return v*this.dx})),
            new Float32Array(y.map((v) => {return v*this.dy}))
        )
    }
    static activate(scene) {
        super.activate(scene);
        super.show_element(scene, 'x-count', 'X Count');
        super.show_element(scene, 'y-count', 'Y Count');
    };
}

export class HexagonalX extends Hexagonal {
    static title = 'Hexagonal-X';
    static from_scene(scene){
        return new HexagonalX(
            scene.selectors['dx'].value,
            scene.selectors['dy'].value,
            scene.selectors['x-count'].value,
            scene.selectors['y-count'].value,
            'x'
        );
    }
}

export class HexagonalY extends Hexagonal {
    static title = 'Hexagonal-Y';
    static from_scene(scene){
        return new HexagonalX(
            scene.selectors['dx'].value,
            scene.selectors['dy'].value,
            scene.selectors['x-count'].value,
            scene.selectors['y-count'].value,
            'y'
        );
    }
}

export class CircularGeometry extends Geometry {
    static title = 'Circular';
    constructor(dx, dy, minRing, maxRing){
        super();

        if (dx <= 0) dx = 0.5
        if (dy <= 0) dx = 0.5

        this.dx = Number(dx);
        this.dy = Number(dy);

        if (maxRing < minRing){
            let a = maxRing;
            maxRing = minRing;
            minRing = a;
        }
        if (minRing == maxRing) minRing = maxRing-1;
        if (maxRing <= 0) maxRing = 1;

        this.minRing = Math.max(0, Number(minRing));
        this.maxRing = Number(maxRing);
    }
    generate() {
        super.generate()
        let dr = Math.sqrt(this.dx**2 + this.dy**2)/Math.max(this.dx, this.dy)*0.707

        let x = [];
        let y = [];
        for (let i = this.minRing; i < this.maxRing; i++){
            if (i == 0) {
                x.push(0);
                y.push(0);
                continue
            }
            let xf = i*this.dx;
            let yf = i*this.dy;
            let ang = linspace(0, 2*Math.PI, i*6 + 1)
            for (let j = 0; j < ang.length - 1; j++){
                x.push(Math.cos(ang[j])*xf)
                y.push(Math.sin(ang[j])*yf)
            }
        }
        this.set_xy(Float32Array.from(x), Float32Array.from(y));
    }
    static from_scene(scene){
        return new CircularGeometry(
            scene.selectors['dx'].value,
            scene.selectors['dy'].value,
            scene.selectors['min-ring'].value,
            scene.selectors['max-ring'].value
        );
    }
    static activate(scene) {
        super.activate(scene);
        super.show_element(scene, 'min-ring', 'Start Ring');
        super.show_element(scene, 'max-ring', 'Stop Ring');
    };
}

export class SunflowerGeometry extends Geometry {
    static title = 'Sunflower';
    constructor(dx, dy, minRing, maxRing){
        super();

        if (dx <= 0) dx = 0.5
        if (dy <= 0) dx = 0.5

        this.dx = Number(dx);
        this.dy = Number(dy);

        if (maxRing < minRing){
            let a = maxRing;
            maxRing = minRing;
            minRing = a;
        }
        if (minRing == maxRing) minRing = maxRing-1;
        if (maxRing <= 0) maxRing = 1;

        this.minRing = Math.max(0, Number(minRing));
        this.maxRing = Number(maxRing);
    }
    generate() {
        super.generate()

        let scaler = 0.22
        let dr = Math.sqrt(this.dx**2 + this.dy**2)

        // Golden ratio
        let gd = (Math.sqrt(5) - 1)/2.0

        let sc = dr/Math.max(this.dx, this.dy)/2.0;
        let scx = this.dx/0.707;
        let scy = this.dy/0.707;
        let x = []
        let y = []
        let i = 0

        let startR = this.minRing*sc;
        let stopR = this.maxRing*sc;
        while (1) {
            i += 1
            let t = 2*Math.PI*gd*i
            let r = Math.sqrt(t)*scaler
            if (r < startR) continue;
            if (r > stopR) break;

            x.push(r*Math.cos(t)*scx);
            y.push(r*Math.sin(t)*scy);
        }

        this.set_xy(Float32Array.from(x), Float32Array.from(y));
    }
    static from_scene(scene){
        return new SunflowerGeometry(
            scene.selectors['dx'].value,
            scene.selectors['dy'].value,
            scene.selectors['min-ring'].value,
            scene.selectors['max-ring'].value
        );
    }
    static activate(scene) {
        super.activate(scene);
        super.show_element(scene, 'min-ring', 'Start Ring');
        super.show_element(scene, 'max-ring', 'Stop Ring');
    };
}
export const Geometries = [
    RectangularGeometry,
    RectangularOffsetYGeometry,
    RectangularOffsetXGeometry,
    HexagonalX,
    HexagonalY,
    CircularGeometry,
    SunflowerGeometry,
]
