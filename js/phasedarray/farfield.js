import {linspace} from "../util.js";

export class FarfieldABC{
	constructor(ax1Points, ax2Points){
		ax1Points = Number(ax1Points)
		ax2Points = Number(ax2Points)
		// ensure samples are even
		if (ax1Points % 2 == 0) ax1Points++;
		if (ax2Points % 2 == 0) ax2Points++;

		this.farfield_total = new Array(ax2Points);
		this.farfield_log = new Array(ax2Points);
		this.maxValue = -Infinity;
		this.dirMax = null;

		for (let i = 0; i < ax2Points; i++){
			this.farfield_total[i] = new Float32Array(ax1Points);
			this.farfield_log[i] = new Float32Array(ax1Points);
		}
		this.meshPoints = [ax1Points, ax1Points];
	}
	get domain(){ return this.constructor.domain; };

	_yield(text){
		this.ac++;
		return {
			text: text,
			progress: this.ac,
			max: this.maxProgress
		};
	}

	reset_parameters(){
		this.maxValue = -Infinity;
		const [p1, p2] = this.meshPoints;

		this.farfield_im = new Array(p2);
		this.farfield_re = new Array(p2);

		for (let i = 0; i < p2; i++){
			this.farfield_im[i] = new Float32Array(p1);
			this.farfield_re[i] = new Float32Array(p1);
		}
	}
	clear_parameters(){
		const [p1, p2] = this.meshPoints;
		for (let i2 = 0; i2 < p2; i2++){
			for (let i1 = 0; i1 < p1; i1++){
				this.farfield_im[i2][i1] = 0;
				this.farfield_re[i2][i1] = 0;
			}
		}
	}
	calculate_total(total){
		const [p1, p2] = this.meshPoints;
		for (let i2 = 0; i2 < p2; i2++){
			for (let i1 = 0; i1 < p1; i1++){
				const c = Math.abs(this.farfield_re[i2][i1]**2 + this.farfield_im[i2][i1]**2)/total;
				this.farfield_total[i2][i1] = c;
			}
			this.maxValue = Math.max(this.maxValue, ...this.farfield_total[i2]);
		}
		delete this.farfield_im;
		delete this.farfield_re;
	}
	calculate_log(){
		const [p1, p2] = this.meshPoints;
		for (let i2 = 0; i2 < p2; i2++){
			for (let i1 = 0; i1 < p1; i1++){
				this.farfield_log[i2][i1] = 10*Math.log10(this.farfield_total[i2][i1]/this.maxValue);
			}
		}
	}
	create_parameters(pa){
		let ac = 0;
		const maxProgress = pa.geometry.x.length + 4;
		return {
			yield: (text) => {
				ac++;
				return {
					text: text,
					progress: ac,
					max: maxProgress
				}
			},
			x: pa.geometry.x,
			y: pa.geometry.y,
			pha: pa.vectorPhase,
			mag: pa.vectorMag,
		}
	}
}

export class FarfieldSpherical extends FarfieldABC{
	static domain = 'spherical';
	constructor(thetaPoints, phiPoints){
		super(thetaPoints, phiPoints);
		[thetaPoints, phiPoints] = this.meshPoints;
		this.thetaPoints = thetaPoints;
		this.phiPoints = phiPoints;

		this.theta = linspace(-Math.PI/2, Math.PI/2, this.thetaPoints);
		this.phi = linspace(-Math.PI/2, Math.PI/2, this.phiPoints);
	}
	*calculator_loop(pa){
		const pars = this.create_parameters(pa);
		yield pars.yield('Resetting farfield...');
		this.reset_parameters();
		let sinThetaPi = Float32Array.from({length: this.thetaPoints}, (_, i) => 2*Math.PI*Math.sin(this.theta[i]));
		yield pars.yield('Clearing farfield...');
		this.clear_parameters();
		for (let i = 0; i < pars.x.length; i++){
			yield pars.yield('Calculating farfield re/im...');
			for (let ip = 0; ip < this.phiPoints; ip++){
				const xxv = pars.x[i]*Math.cos(this.phi[ip]);
				const yyv = pars.y[i]*Math.sin(this.phi[ip]);
				for (let it = 0; it < this.thetaPoints; it++){
					const jk = sinThetaPi[it];
					const v = xxv*jk + yyv*jk + pars.pha[i];
					this.farfield_re[ip][it] += pars.mag[i]*Math.cos(v);
					this.farfield_im[ip][it] += pars.mag[i]*Math.sin(v);
				}
			}
		}
		yield pars.yield('Calculating farfield total...');
		this.calculate_total(pars.x.length);
		yield pars.yield('Calculating Directivity...');
		this.dirMax = this.compute_directivity();
		yield pars.yield('Calculating Log...');
		this.calculate_log();
	}
	compute_directivity(){
		let bsa = 0;
		const step = Math.PI/(this.thetaPoints - 1)*Math.PI/(this.phiPoints - 1);
		for (let it = 0; it < this.thetaPoints; it++) {
			let st = Math.abs(Math.sin(this.theta[it]))*step;
			for (let ip = 0; ip < this.phiPoints; ip++) {
				bsa += this.farfield_total[ip][it]*st;
			}
		}
		return 4*Math.PI*this.maxValue/bsa;
	}
}

export class FarfieldUV extends FarfieldABC{
	static domain = 'uv';
	constructor(uPoints, vPoints, uMax, vMax){
		super(uPoints, vPoints);
		[uPoints, vPoints] = this.meshPoints;
		if (uMax === undefined) uMax = 1;
		if (vMax === undefined) vMax = 1;
		this.uPoints = uPoints;
		this.vPoints = vPoints;
		this.u = linspace(-uMax, uMax, this.uPoints);
		this.v = linspace(-vMax, vMax, this.vPoints);
	}
	*calculator_loop(pa){
		const pars = this.create_parameters(pa);
		yield pars.yield('Resetting farfield...');
		this.reset_parameters();
		yield pars.yield('Clearing farfield...');
		this.clear_parameters();

		const pi2 = 2*Math.PI;
		for (let i = 0; i < pars.x.length; i++){
			yield pars.yield('Calculating farfield re/im...');
			for (let iv = 0; iv < this.vPoints; iv++){
				const xxv = pars.x[i];
				const yyv = pars.y[i]*this.v[iv];
				for (let iu = 0; iu < this.uPoints; iu++){
					const v = (xxv*this.u[iu] + yyv)*pi2 + pars.pha[i];
					this.farfield_re[iv][iu] += pars.mag[i]*Math.cos(v);
					this.farfield_im[iv][iu] += pars.mag[i]*Math.sin(v);
				}
			}
		}
		yield pars.yield('Calculating farfield total...');
		this.calculate_total(pars.x.length);
		yield pars.yield('Calculating Directivity...');
		this.dirMax = this.compute_directivity();
		yield pars.yield('Calculating Log...');
		this.calculate_log();
	}
	compute_directivity(){
		let bsa = 0;
		const step = (this.u[1] - this.u[0])*(this.v[1] - this.v[0]);
		for (let iu = 0; iu < this.uPoints; iu++) {
			let st = step;
			const u = this.u[iu];
			for (let iv = 0; iv < this.vPoints; iv++) {
				const v = this.v[iv];
				if (Math.sqrt(u**2 + v**2) > 1) continue;
				bsa += this.farfield_total[iv][iu]*st;
			}
		}
		return 4*Math.PI*this.maxValue/bsa;
	}
}
