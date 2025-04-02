import {linspace} from "./util.js";

export class Geometry{
    static args = [];
    static controls = {
        'geometry': {'title': null},
        'dx': {'title': "X-Spacing (λ)", 'type': Number},
        'dy': {'title': "Y-Spacing (λ)", 'type': Number}
    };
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
}

export class RectangularGeometry extends Geometry{
    static title = 'Rectangular';
    static args = ['dx', 'dy', 'x-count', 'y-count'];
    static controls = {
        ...Geometry.controls,
        'x-count': {'title': "X Count", 'type': parseInt},
        'y-count': {'title': "Y Count", 'type': parseInt}
    };
    constructor(dx, dy, xCount, yCount){
        super();
        if (dx <= 0) dx = 0.5
        if (dy <= 0) dx = 0.5
        this.dx = Number(dx);
        this.dy = Number(dy)
        this.xCount = Math.max(1, Number(xCount));
        this.yCount = Math.max(1, Number(yCount));

        let tc = this.xCount * this.yCount;
        let x = new Float32Array(tc);
        let y = new Float32Array(tc);
        let index = 0;
        for (let ix = 0; ix < this.xCount; ix++){
            for (let iy = 0; iy < this.yCount; iy++){
                x[index] = this.dx*ix;
                y[index] = this.dy*iy;
                index += 1;
            }
        }
        this.set_xy(x, y);
        this.adjust_xy();
    }
    adjust_xy(){ return; }
}

export class RectangularOffsetXGeometry extends RectangularGeometry{
    static title = 'Rectangular Offset X';
    static args = RectangularGeometry.args.concat(['geo-offset']);
    static controls = {
        ...RectangularGeometry.controls,
        'geo-offset': {'title': "Offset", 'type': Number},
    };
    constructor(dx, dy, xCount, yCount, offset){
        super(dx, dy, xCount, yCount);
        this.offset = Number(offset);
    }
    adjust_xy(){
        super.adjust_xy();
        for (let i = 0; i < this.x.length; i++){
            if (i % 2 == 0) continue;
            this.x[i] += this.offset;
        }
    }
}

export class RectangularOffsetYGeometry extends RectangularGeometry{
    static title = 'Rectangular Offset Y';
    static args = RectangularOffsetXGeometry.args;
    static controls = RectangularOffsetXGeometry.controls;
    constructor(dx, dy, xCount, yCount, offset){
        super(dx, dy, xCount, yCount);
        this.offset = Number(offset);
    }
    adjust_xy(){
        super.adjust_xy();
        let cc = 0;
        for (let i = 0; i < this.y.length; i++){
            if (i % this.yCount == 0) cc++;
            if (cc % 2 == 0) continue;
            this.y[i] += this.offset;
        }
    }
}

export class Hexagonal extends Geometry{
    static title = 'Hexagonal';
    static args = ['dx', 'dy', 'x-count', 'y-count'];
    static controls = {
        ...Geometry.controls,
        'x-count': {'title': "X Count", 'type': parseInt},
        'y-count': {'title': "Y Count", 'type': parseInt}
    };
    constructor(dx, dy, xCount, yCount, axis){
        super();

        if (dx <= 0) dx = 0.5
        if (dy <= 0) dx = 0.5
        this.dx = Number(dx);
        this.dy = Number(dy)
        this.xCount = Math.max(1, Number(xCount));
        this.yCount = Math.max(1, Number(yCount));
        this.axis = axis;

        let cc, counter;
        if (this.axis == 'x'){
            cc = this.yCount;
            counter = this.xCount
        }
        else{
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
        if (this.axis == 'x'){
            x = a1;
            y = a2;
        }
        else{
            x = a2;
            y = a1;
        }
        this.set_xy(
            new Float32Array(x.map((v) => {return v*this.dx})),
            new Float32Array(y.map((v) => {return v*this.dy}))
        )
    }
}

export class HexagonalX extends Hexagonal{
    static title = 'Hexagonal-X';
    constructor(...args){ super(...args, 'x'); }
}

export class HexagonalY extends Hexagonal{
    static title = 'Hexagonal-Y';
    constructor(...args){ super(...args, 'y'); }
}

export class CircularGeometry extends Geometry{
    static title = 'Circular';
    static args = ['dx', 'dy', 'min-ring', 'max-ring'];
    static controls = {
        ...Geometry.controls,
        'min-ring': {'title': 'Start Ring', 'type': parseInt},
        'max-ring': {'title': 'Stop Ring', 'type': parseInt}
    };
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
}

export class SunflowerGeometry extends Geometry{
    static title = 'Sunflower';
    static args = ['dx', 'dy', 'min-ring', 'max-ring'];
    static controls = {
        ...Geometry.controls,
        'min-ring': {'title': 'Start Ring', 'type': parseInt},
        'max-ring': {'title': 'Stop Ring', 'type': parseInt}
    };
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
}
export const Geometries = [
    RectangularGeometry,
    RectangularOffsetXGeometry,
    RectangularOffsetYGeometry,
    HexagonalX,
    HexagonalY,
    CircularGeometry,
    SunflowerGeometry,
]
