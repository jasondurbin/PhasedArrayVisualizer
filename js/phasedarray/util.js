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
 * @param {int} start
 * @param {int} stop
 * @param {int} step
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

export function factorial_log(value){
    if (value == 0) return 0.0;
    if (value < 0) throw Error("Factorial of a negative number is unknown.");
    const a = arange(1, parseInt(value) + 1);
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.log10(a[i]);
    return s;
}

/**
* Normalizes input dimensions to be between [-m, m].
*
* @param {Float32Array} x
* @param {float} m (option, default=0.5)
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
