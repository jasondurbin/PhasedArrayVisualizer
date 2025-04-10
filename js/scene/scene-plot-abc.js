import {ColormapControl} from "../cmap/cmap-util.js"
import {SceneParent} from "./scene-abc.js"

export class ScenePlotABC{
    /**
    * Create a new plot on a canvas.
    *
    * @param {SceneParent} parent
    * @param {HTMLCanvasElement} canvas
    * @param {ColormapControl} cmap
    * */
    constructor(parent, canvas, cmap){
        this.parent = parent;
        this.canvas = canvas;
        this.cmap = cmap;
    }
}
