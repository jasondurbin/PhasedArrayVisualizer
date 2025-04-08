/**
 * Create a uniformly spaced Float32Array with `num` steps.
 *
 * @param {float} start
 * @param {float} stop
 * @param {int} num
 *
 * @return {Float32Array}
 * */
export function linspace(start, stop, num){
    return Float32Array.from({length: num}, (_, i) => start + (stop - start)/(num - 1) * i);
}

/**
 * Create a range Float32Array.
 *
 * @param {int} [start=0] (optional)
 * @param {int} stop
 * @param {int} [step=1] (optional)
 *
 * @return {Float32Array}
 * */
export function arange(start, stop, step){
    if (stop === undefined){
        stop = start;
        start = 0;
    }
    if (step === undefined) step = 1;
    else step = parseInt(step);
    let a = []
    for (let i=start; i < stop; i += step) a.push(i);
    return Float32Array.from(a);
}

/**
* Calculate factorial of a number in log form.
*
* @param {float} v
*
* @return {float}
* */
export function factorial_log(v){
    if (v == 0) return 0.0;
    if (v < 0) throw Error("Factorial of a negative number is unknown.");
    const a = arange(1, parseInt(value) + 1);
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.log10(a[i]);
    return s;
}

/**
* Calculate factorial of a number.
*
* @param {float} v
*
* @return {float}
* */
function factorial(v) {
    if (v === 0) return 1;
    let s = 1.0;
    for (let i = 1; i <= v; i++) s *= i;
    return s;
}

/**
* Normalizes input dimensions to be between [-m, m].
*
* @param {Float32Array} x
* @param {float} [m=0.5] (optional) Normalization bounds.
*
* @return {Float32Array}
* */
export function normalize_input(x, m){
    if (m === undefined) m = 0.5;
    const maxX = Math.max(...x);
    const minX = Math.min(...x);
    const den = (maxX - minX)/(m*2);
    return Float32Array.from({'length': x.length}, (_, i) => (x[i] - minX)/den - m);
}
/**
* Gamma function.
*
* @param {float} z
*
* @return {float}
* */
export function gamma(z){
    const g = 7;
    const p = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI*z)*gamma(1 - z));
    else {
        z -= 1;
        let x = p[0];
        for (let i = 1; i < g + 2; i++) x += p[i] / (z + i);
        const t = z + g + 0.5;
        return Math.sqrt(2*Math.PI)*Math.pow(t, z + 0.5)*Math.exp(-t)*x;
    }
  }

/**
* Create an array of ones.
*
* @param {int} len
*
* @return {Float32Array}
* */
export function ones(len){ return Float32Array.from({length: len}, () => 1); }

/**
* Calculate the zero-order Modified Bessel function.
*
* @param {float} x
* @param {int} [maxIter=60] (optional) Max iteration
* @param {float} [tolerance=1e-9] (optional) Calculation tolerance
*
* @return {float}
* */
export function bessel_modified_0(x, maxIter, tolerance){
    if (maxIter === undefined) maxIter = 50;
    if (tolerance === undefined) tolerance = 1e-9;
    let s = 0;
    for (let i = 0; i <= maxIter; i++){
        let t = (1/(factorial(i))*(x/2)**i)**2;
        s += t;
        if (Math.abs(t) <= tolerance) break;
    }
    return 1 + s;
}

/**
* Adjust theta/phi such that each are [-90, 90] (or [-PI/2, PI/2]).
*
* @param {float} theta Theta
* @param {float} phi Phi
* @param {boolean} [deg=true] (optional) Input/Output in deg?
*
* @return {[float, float]} theta, phi
* */
export function adjust_theta_phi(theta, phi, deg){
    let o1 = 180;
    if (deg !== undefined && !deg) o1 = Math.PI;
    let o2 = o1/2.0;
    if (phi > o2){
        phi -= o1;
        theta = -theta;
    }
    if (phi < -o2){
        phi += o1;
        theta = -theta;
    }
    return [theta, phi]
}
