// https://www.researchgate.net/publication/316281181_Catalog_of_Window_Taper_Functions_for_Sidelobe_Control
import {arange, factorial_log, normalize_input} from "./util.js";

export class UniformTaper{
    static title = 'Uniform';
    static args = [];
    static controls = {
        'taper-x': {'title': null},
    };
    calculate_weights(x){
        const v = new Float32Array(x.length);
        for (let i = 0; i < x.length; i++) v[i] = 1.0;
        return v;
    }
}

export class TrianglePedestal extends UniformTaper{
    static title = 'Triangle on a Pedestal';
    static args = ['taper-x-par-1'];
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "Pedestal", 'type': "float", 'default': 0.0, 'min': 0.0, 'max': 1.0},
    };
    constructor(pedestal){
        super();
        this.pedestal = Math.min(1, Math.max(0, Math.abs(pedestal)));
    }
    calculate_weights(x){
        const maxX = Math.max(...x);
        const minX = Math.min(...x);
        const den = (maxX - minX)/2.0;
        const sc = 1 - this.pedestal;
        return Float32Array.from(x, (e) => 1 - sc*Math.abs((e - minX)/den - 1.0));
    }
}

export class TaylorNBar extends UniformTaper{
    static title = 'Taylor N-Bar';
    static args = ['taper-x-par-1', 'taper-x-par-2'];
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "N Bar", 'type': "int", 'default': 5, 'min': 1},
        'taper-x-par-2': {'title': "SLL", 'type': "float", 'default': 25.0, 'min': 13.0}
    };
    constructor(nbar, sll){
        super();
        this.nbar = nbar;
        this.sll = Math.max(13, Math.abs(sll));
    }
    calculate_weights(x){
        let v = super.calculate_weights(x);
        if (this.nbar == 1 && this.sll == 13) return v;
        const nbar = this.nbar;
        let r = 10**(this.sll/20);
        let a = Math.acosh(r)/Math.PI;
        let sigma = nbar**2/(a**2 + (this.nbar - 0.5)**2);
        let m = arange(1, nbar);
        let f = Float32Array.from({length: m.length}, () => 0);

        let f1 = 2*factorial_log(nbar - 1)
        for (let i = 0; i < m.length; i++){
            let f2 = factorial_log(nbar + 1 + m[i]);
            let f3 = factorial_log(nbar - 1 + m[i]);
            f[i] = f1 - (f2 + f3);
        }

        console.log(r, a);
        for (let i = 0; i < x.length; i++) v[i] = 1.0;
        return v;
    }
}

export class Parzen extends UniformTaper{
    static title = 'Parzen';
    static args = [];
    calculate_weights(x){
        const s = 8/3;
        return Float32Array.from(normalize_input(x), (e) => {
            const t = Math.abs(e);
            if (t <= 0.25) return s*(1 - 24*t**2 + 48*t**3);
            else if (t <= 0.5) return s*(2 - 12*t + 24*t**2 - 16*t**3);
            else return 0.0;
        });
    }
}

export class ParzenAlgebraic extends UniformTaper{
    static title = 'Parzen Algebraic';
    static args = ['taper-x-par-1', 'taper-x-par-1'];
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "Gamma", 'type': "float", 'default': 1.0, 'min': 0.001, 'max': 1.0},
        'taper-x-par-2': {'title': "u", 'type': "float", 'default': 2.0, 'min': 0.001},
    };
    constructor(gamma, u){
        super();
        this.gamma = Math.max(0.001, Math.min(1, Math.abs(gamma)));
        this.u = Math.max(0.001, u);
    }
    calculate_weights(x){
        const g = this.gamma;
        const u = this.u;
        // ignore scale because it's normalized out.
        //const A = 1/(1 - g/(1 + u))
        return Float32Array.from(normalize_input(x), (e) => 1 - g*Math.abs(2*e)**u);
    }
}

export class Welch extends UniformTaper{
    static title = 'Welch';
    static args = [];
    calculate_weights(x){
        return Float32Array.from(normalize_input(x), (e) => 3/2*(1 - 4*e**2));
    }
}

export class Connes extends UniformTaper{
    static title = 'Connes';
    static args = ['taper-x-par-1'];
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "Alpha", 'type': "float", 'default': 1.0, 'min': 0.001},
    };
    constructor(alpha){
        super();
        this.alpha = Math.max(0.001, Math.abs(alpha));
    }
    calculate_weights(x){
        const a2 = this.alpha**2;
        // ignoring scale factors because they get normalized out.
        //const a4 = this.alpha**4;
        //const A = 15*a4/(3 - 10*a2 + 15*a4);
        return Float32Array.from(normalize_input(x), (e) => (a2 - 4*(e**2))**2);
    }
}

export class SinglaSingh extends UniformTaper{
    static title = 'Singla-Singh (order 1)';
    static args = [];
    calculate_weights(x){
        return Float32Array.from(normalize_input(x), (e) => 1-4*e**2*(3 - 4*Math.abs(e)));
    }
}

export class Lanczos extends UniformTaper{
    static title = 'Lanczos';
    static args = ['taper-x-par-1'];
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "L", 'type': "float", 'default': 2.0, 'min': 0.001},
    };
    constructor(l){
        super();
        this.l = Math.max(0.001, Math.abs(l));
    }
    calculate_weights(x){
        return Float32Array.from(normalize_input(x), (e) => {
            if (e == 0) return 1.0;
            const v = 2*Math.PI*e;
            return (Math.sin(v)/v)**this.l;
        });
    }
}

export class SincLobe extends Lanczos{
    static title = 'Sinc Lobe';
    static args = [];
    static controls = UniformTaper.controls;
    constructor(){ super(1.0); }
}

export class Fejer extends Lanczos{
    static title = 'Fejér';
    static args = [];
    static controls = UniformTaper.controls;
    constructor(){ super(2.0); }
}

export class delaVallePoussin extends Lanczos{
    static title = 'de la Vallée Poussin';
    static args = [];
    static controls = UniformTaper.controls;
    constructor(){ super(4.0); }
}

export class RaisedCosine extends UniformTaper{
    static title = 'Raised Cosine';
    static args = ['taper-x-par-1'];
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "Alpha", 'type': "float", 'default': 0.75, 'min': 0.5, 'max': 1.0},
    };
    constructor(alpha){
        super();
        this.alpha = Math.max(0.5, Math.min(1.0, Math.abs(alpha)));
    }
    calculate_weights(x){
        const alpha = this.alpha;
        const s = (1 - alpha)/alpha;
        const pi2 = 2*Math.PI
        return Float32Array.from(normalize_input(x), (e) => 1 + s*Math.cos(pi2*e));
    }
}

export class Hamming extends RaisedCosine{
    static title = 'Hamming';
    static args = [];
    static controls = UniformTaper.controls;
    constructor(){ super(25/46); }
}

export class Hann extends RaisedCosine{
    static title = 'Hann';
    static args = [];
    static controls = UniformTaper.controls;
    constructor(){ super(0.5); }
}

export class GeneralizedHamming extends UniformTaper{
    static title = 'Generalized Hamming';
    static args = ['taper-x-par-1'];
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "v", 'type': "float", 'default': 0.0, 'min': -0.5},
    };
    constructor(v){
        super();
        this.v = Math.max(-0.5, v);
    }
    calculate_weights(x){
        const v = this.v;
        const alpha = (2 + 3*v + v**2)/(23 + 9*v + v**2);
        return Float32Array.from(normalize_input(x), (e) => {
            const ep = e*Math.PI;
            return alpha*Math.cos(ep)**v + (1 - alpha)*Math.cos(ep)**(v + 2);
        });
    }
}

export const Tapers = [
    UniformTaper,
    TrianglePedestal,
    TaylorNBar,
    RaisedCosine,
    Hamming,
    GeneralizedHamming,
    Hann,
    Parzen,
    Connes,
    Welch,
    ParzenAlgebraic,
    SinglaSingh,
    Lanczos,
    SincLobe,
    Fejer,
    delaVallePoussin,
]
