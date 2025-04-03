import {arange, factorial_log} from "./util.js";

export class UniformTaper{
    static title = 'Uniform';
    static args = [];
    static controls = {
        'taper-x': {'title': null},
    };
    calculate_weights(x){
        let v = new Float32Array(x.length);
        for (let i = 0; i < x.length; i++) v[i] = 1.0;
        return v;
    }
}

export class TrianglePedestal extends UniformTaper{
    static title = 'Triangle on a Pedestal';
    static args = ['taper-x-par-1'];
    constructor(pedestal){
        super();
        this.pedestal = Math.min(1, Math.max(0, Math.abs(pedestal)));
    }
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "Pedestal", 'type': "float", 'default': 0.0},
    };
    calculate_weights(x){
        const v = super.calculate_weights(x);
        const maxX = Math.max(...x);
        const minX = Math.min(...x);
        const den = (maxX - minX)/2.0;
        const sc = 1 - this.pedestal;
        for (let i = 0; i < v.length; i++){
            v[i] = 1 - sc*Math.abs((x[i] - minX)/den - 1.0);
        }
        return v;
    }
}

export class TaylorNBar extends UniformTaper{
    static title = 'Taylor N-Bar';
    static args = ['taper-x-par-1', 'taper-x-par-2'];
    constructor(nbar, sll){
        super();
        this.nbar = nbar;
        this.sll = Math.max(13, Math.abs(sll));
    }
    static controls = {
        ...UniformTaper.controls,
        'taper-x-par-1': {'title': "N Bar", 'type': "int", 'default': 5},
        'taper-x-par-2': {'title': "SLL", 'type': "float", 'default': 25.0}
    };
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

export const Tapers = [
    UniformTaper,
    TrianglePedestal,
    TaylorNBar,
]
