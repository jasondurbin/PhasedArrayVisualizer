
export function linspace(start, stop, num) {
    return Float32Array.from({length: num}, (_, i) => start + (stop - start)/(num - 1) * i);
}
