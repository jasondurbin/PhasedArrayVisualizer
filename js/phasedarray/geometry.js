import {linspace} from "../util.js";

export class Geometry{
	static args = [];
	static controls = {
		'geometry': {'title': null},
		'dx': {'title': "X-Spacing (λ)", 'type': "float", 'min': 0.0, 'default': 0.5, 'step': 0.1},
		'dy': {'title': "Y-Spacing (λ)", 'type': "float", 'min': 0.0, 'default': 0.5, 'step': 0.1}
	};
	set_xy(x, y){
		this.length = x.length;
		this.x = x;
		this.y = y;
	}
	auto_compute_dx_dy(index){
		let dr = Infinity;
		if (index === undefined) index = 0;
		const x1 = this.x[index];
		const y1 = this.y[index];
		for (let i = 0; i < this.x.length; i++){
			if (i == index) continue;
			const x2 = this.x[i];
			const y2 = this.y[i];
			dr = Math.min(dr, Math.sqrt((x1 - x2)**2 + (y1 - y2)**2));
		}
		this.dx = dr;
		this.dy = dr;
	}
}

export class RectangularGeometry extends Geometry{
	static title = 'Rectangular';
	static args = ['dx', 'dy', 'x-count', 'y-count'];
	static controls = {
		...Geometry.controls,
		'x-count': {'title': "X Count", 'type': "int", 'default': 8, 'min': 1},
		'y-count': {'title': "Y Count", 'type': "int", 'default': 8, 'min': 1},
	};
	constructor(dx, dy, xCount, yCount){
		super();
		if (dx <= 0) dx = 0.5
		if (dy <= 0) dx = 0.5
		this.dx = Number(dx);
		this.dy = Number(dy);
		this.xCount = Math.max(1, Number(xCount));
		this.yCount = Math.max(1, Number(yCount));
	}
	build(){
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
		'geo-offset': {'title': "Offset", 'type': "float", 'default': 0.25},
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
	static controls = RectangularGeometry.controls;
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
	build(){
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
		'min-ring': {'title': 'Start Ring', 'type': "int", 'default': 0, 'min': 0},
		'max-ring': {'title': 'Stop Ring', 'type': "int", 'default': 8, 'min': 1},
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
	}
	build(){
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
	static controls = CircularGeometry.controls;
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
	build(){
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

export class ArchimedianSpiral extends Geometry{
	static title = 'Archimedian Spiral';
	static args = ['r0', 'r-max', 'spirals', 'count-per-spiral', 'total-rotation'];
	static controls = {
		'geometry': {'title': null},
		'r0': {'title': "R-Start (λ)", 'type': "float", 'min': 0.0, 'default': 0.5},
		'r-max': {'title': "R-Max (λ)", 'type': "float", 'min': 0.0, 'default': 2.5},
		'spirals': {'title': 'Spirals', 'type': "int", 'default': 1, 'min': 1},
		'count-per-spiral': {'title': 'Elements per Spiral', 'type': "int", 'default': 31, 'min': 1},
		'total-rotation': {'title': 'Total Rotations (deg)', 'type': "float", 'default': 990, 'min': 0},
	};
	constructor(r0, rmax, spirals, count, rotations){
		super();

		if (r0 <= 0) r0 = 0.0
		if (rmax <= 0) rmax = 0.5

		this.r0 = Number(r0);
		this.rmax = Number(rmax);
		if (spirals <= 0) spirals = 1;
		this.spirals = Number(spirals);

		this.rotations = Math.max(0, Number(rotations))*Math.PI/180;
		this.count = Number(count);
	}
	build(){
		let x = []
		let y = []
		let sc = (this.rmax - this.r0)/this.rotations;
		let rc = this.rotations/(this.count - 1);

		let index = 0;
		if (this.spirals > 1){
			x.push(0.0);
			y.push(0.0);
			index = 1;
		}

		for (let j = 0; j < this.spirals; j++){
			const io = 2*Math.PI/this.spirals*j;
			for (let i = 0; i < this.count; i++){
				const phi = i*rc;
				const r = this.r0 + sc*phi;
				x.push(r*Math.cos(phi + io));
				y.push(r*Math.sin(phi + io));
			}
		}
		this.set_xy(Float32Array.from(x), Float32Array.from(y));
		this.auto_compute_dx_dy(index);
	}
}

export class DoughertyLogSpiral extends Geometry{
	static title = 'Dougherty Log-Spiral';
	static args = ['r0', 'r-max', 'spirals', 'count-per-spiral', 'offset-rotation'];
	static controls = {
		'geometry': {'title': null},
		'r0': {'title': "R-Start (λ)", 'type': "float", 'min': 0.01, 'default': 0.5},
		'r-max': {'title': "R-Max (λ)", 'type': "float", 'min': 0.0, 'default': 2.5},
		'spirals': {'title': 'Spirals', 'type': "int", 'default': 1, 'min': 1},
		'count-per-spiral': {'title': 'Elements per Spiral', 'type': "int", 'default': 31, 'min': 1},
		'offset-rotation': {'title': 'Angle (deg)', 'type': "float", 'default': 84, 'min': 0},
	};
	constructor(r0, rmax, spirals, count, rotations){
		super();

		if (r0 <= 0) r0 = 0.5
		if (rmax <= 0) rmax = 2.0

		this.r0 = Number(r0);
		this.rmax = Number(rmax);

		if (spirals <= 0) spirals = 1;
		this.spirals = Number(spirals);

		this.rotations = Math.max(0, Number(rotations))*Math.PI/180;
		this.count = Number(count);
	}
	build(){
		const cov = 1/Math.tan(this.rotations);
		const sc = 1/(this.count-1)*(this.rmax/this.r0 - 1);

		let x = []
		let y = []
		let index = 0;
		if (this.spirals > 1){
			x.push(0.0);
			y.push(0.0);
			index = 1;
		}

		let phi, r;
		for (let j = 0; j < this.spirals; j++){
			const io = 2*Math.PI/this.spirals*j;
			for (let i = 0; i < this.count; i++){
				if (this.rotations == 0){
					phi = 0;
					r = this.r0 + i*(this.rmax-this.r0)/(this.count-1);
				}
				else{
					phi = 1/cov*Math.log(1 + i*sc);
					r = this.r0*Math.exp(cov*phi);
				}

				console.log(r, phi, Math.exp(cov*phi), phi, cov);
				x.push(r*Math.cos(phi + io));
				y.push(r*Math.sin(phi + io));
			}
		}
		this.set_xy(Float32Array.from(x), Float32Array.from(y));
		this.auto_compute_dx_dy(index);
	}
}

export class ArcondoulisSpiral extends Geometry{
	static title = 'Arcondoulis Spiral';
	static args = ['r0', 'r-max', 'spirals', 'count-per-spiral', 'total-rotation', 'eta-x', 'eta-y'];
	static controls = {
		'geometry': {'title': null},
		'r0': {'title': "R-Start (λ)", 'type': "float", 'min': 0.01, 'default': 0.5, 'step': 0.1},
		'r-max': {'title': "R-Max (λ)", 'type': "float", 'min': 0.0, 'default': 2.5, 'step': 0.1},
		'spirals': {'title': 'Spirals', 'type': "int", 'default': 1, 'min': 1},
		'count-per-spiral': {'title': 'Elements per Spiral', 'type': "int", 'default': 31, 'min': 1},
		'total-rotation': {'title': 'Total Rotations (deg)', 'type': "float", 'default': 990, 'min': 0},
		'eta-x': {'title': 'Squashing-X', 'type': "float", 'default': 0.9, 'min': 0, 'step': 0.1},
		'eta-y': {'title': 'Squashing-X', 'type': "float", 'default': 0.9, 'min': 0, 'step': 0.1},
	};
	constructor(r0, rmax, spirals, count, rotations, ex, ey){
		super();

		if (r0 <= 0) r0 = 0.5
		if (rmax <= 0) rmax = 2.0
		if (ex <= 0) ex = 0.9
		if (ey <= 0) ey = 0.9
		if (spirals <= 0) spirals = 1;
		this.spirals = Number(spirals);

		this.r0 = Number(r0);
		this.rmax = Number(rmax);
		this.ex = Number(ex);
		this.ey = Number(ey);

		this.rotations = Math.max(0, Number(rotations))*Math.PI/180;
		this.count = Number(count);
	}
	build(){
		const a = this.r0*(this.count/(this.ex*this.count + 1));
		const b = 1/this.rotations*Math.log(this.rmax/(a*Math.sqrt((1 + this.ex)**2*Math.cos(this.rotations)**2+(1 + this.ey)**2*Math.sin(this.rotations)**2)));

		let x = []
		let y = []
		const sc = this.rotations/(this.count - 1);
		let index = 0;
		if (this.spirals > 1){
			x.push(0.0);
			y.push(0.0);
			index = 1;
		}
		for (let j = 0; j < this.spirals; j++){
			const io = 2*Math.PI/this.spirals*j;
			for (let i = 0; i < this.count; i++){
				const phi = i*sc;
				const m = a*Math.exp(b*phi);
				x.push((i + 1 + this.ex*this.count)/this.count*Math.cos(phi + io)*m);
				y.push((i + 1 + this.ey*this.count)/this.count*Math.sin(phi + io)*m);
			}
		}
		this.set_xy(Float32Array.from(x), Float32Array.from(y));
		this.auto_compute_dx_dy(index);
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
	ArchimedianSpiral,
	DoughertyLogSpiral,
	ArcondoulisSpiral,
]
