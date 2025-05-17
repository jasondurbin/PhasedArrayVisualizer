import {PhasedArrayScene} from "./index-scenes.js";

document.addEventListener('DOMContentLoaded', () => {
	new PhasedArrayScene('pa', {
		'url-save': false,
		'plot-1d': true,
		'plot-2d': true,
		'plot-taper': false,
		'plot-geo-phase': true,
		'plot-geo-attenuation': false,
		'phase-bits': 0,
		'atten-bits': 0,
		'atten-lsb': 0,
		'manual-phase': false,
		'manual-attenuation': false,
		'taper': false,
		'attenuation-quantization': false,
		'farfield-domain': 'spherical',
		'farfield-points': 257,
		'steering-domain': 'spherical',

		'geometry-pars': false, // this hides all the geometry parameters.
		'geometry': 'rectangular',
		'geometry-x-count': 8, // set specific geometry controls.
		'geometry-y-count': 8,
	});
});
