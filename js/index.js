import {PhasedArrayScene} from "./index-scenes.js";
import {SceneTheme} from "./scene/scene-util.js";

document.addEventListener('DOMContentLoaded', () => {
	new SceneTheme();
	new PhasedArrayScene('pa');
});
