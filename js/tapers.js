
import {SceneGroup} from "./abc.js";

export const Taper_Selectors = [
    'taper-x',
    'taper-x-par-1',
]

export class UniformTaper extends SceneGroup {
    static selectors = Taper_Selectors;
    static alwaysVisible = ['taper-x'];
    constructor() {
        super();
        this.updateWaiting = true;
    }
}

export class TaylorNBar extends UniformTaper {
    static title = 'Taylor N-Bar';
}

export const Tapers = [
    TaylorNBar
]
