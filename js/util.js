/**
 * Create a uniformly spaced Float32Array with `num` steps.
 *
 * @param {float} start
 * @param {float} stop
 * @param {int} num
 *
 * @return {Float32Array}
 * */
export function linspace(start, stop, num) {
    return Float32Array.from({length: num}, (_, i) => start + (stop - start)/(num - 1) * i);
}
