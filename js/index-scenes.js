import {SceneParent} from "./scene/scene-abc.js";
import {SceneControlFarfield} from "./phasedarray-scene/scene-farfield.js"
import {SceneControlPhasedArray} from "./phasedarray-scene/scene-phased-array.js"
import {SceneTaperCuts} from "./phasedarray-scene/scene-tapers.js";
import {ScenePlotFarfieldCuts} from "./scene/plot-1d/scene-plot-farfield-cuts.js";
import {ScenePlotFarfield2D} from "./scene/plot-2d/scene-plot-2d-farfield.js";
import {ScenePlot2DGeometryPhase, ScenePlot2DGeometryAtten} from "./scene/plot-2d/scene-plot-2d-geometry.js";
import {FindSceneURL} from "./scene/scene-util.js";

/**	 *
 * Create scene for Phased Array simulator.
 *
 * @param {string} prepend - Prepend used on HTML IDs.
 * */
export class PhasedArrayScene extends SceneParent{
	constructor(prepend, config){
		super(prepend, ['refresh', 'reset']);
		const sconfig = this.merge_config(config, {
			'url-save': true,
			'plot-1d': true,
			'plot-2d': true,
			'plot-taper': true,
			'plot-geo-phase': true,
			'plot-geo-attenuation': true,
			'manual-phase': true,
			'manual-attenuation': true,
		})
		if (!sconfig['url-save']) FindSceneURL().disabled = true;
		this.create_queue(this.find_element('progress'), this.find_element('status'));
		this.arrayControl = new SceneControlPhasedArray(this, config);
		this.farfieldControl = new SceneControlFarfield(this, config);

		if (sconfig['plot-2d']){
			this.plotFF = new ScenePlotFarfield2D(this, this.find_element('farfield-canvas-2d'), 'farfield-2d-colormap');
			this.plotFF.bind_farfield_scene(this.farfieldControl);
			if (this.find_element('farfield-2d-scale', false)) this.plotFF.install_scale_control('farfield-2d-scale');
			this.farfieldControl.add_max_monitor('directivity', (v) => {
				this.find_element('directivity-max').innerHTML = `Directivity: ${(10*Math.log10(v)).toFixed(2)} dB`
			});
		}
		if (sconfig['plot-1d']){
			this.plot1D = new ScenePlotFarfieldCuts(this, this.find_element('farfield-canvas-1d'), 'farfield-1d-colormap');
			this.plot1D.bind_farfield_scene(this.farfieldControl);
			if (this.find_element('farfield-1d-scale', false)) this.plot1D.install_scale_control('farfield-1d-scale');
		}
		if (sconfig['plot-taper']){
			this.plotTaper = new SceneTaperCuts(this, this.find_element('taper-canvas-1d'), 'taper-1d-colormap');
			this.plotTaper.bind_phased_array_scene(this.arrayControl);
		}
		if (sconfig['plot-geo-phase']){
			this.geoPhase = new ScenePlot2DGeometryPhase(this, this.find_element('geometry-phase-canvas'), 'geometry-phase-colormap');
			this.geoPhase.bind_phased_array_scene(this.arrayControl);
			if (sconfig['manual-phase']) this.geoPhase.install_manual_control();
		}
		if (sconfig['plot-geo-attenuation']){
			this.geoAtten = new ScenePlot2DGeometryAtten(this, this.find_element('geometry-magnitude-canvas'), 'geometry-magnitude-colormap');
			this.geoAtten.bind_phased_array_scene(this.arrayControl);
			if (this.find_element('atten-scale', false)) this.geoAtten.install_scale_control('atten-scale');
			if (sconfig['manual-attenuation']) this.geoAtten.install_manual_control();
		}

		this.find_element('refresh').addEventListener('click', () => {
			this.update_url_parameters();
			this.build_queue();
		});
		this.find_element('reset').addEventListener('click', () => {
			this.reset_url_parameters();
			this.build_queue();
		});
		this.create_popup_overlay();
		this.bind_url_elements();
		this.build_queue();
	}
	build_queue(){
		this.queue.reset();
		this.arrayControl.add_to_queue(this.queue);
		this.farfieldControl.add_to_queue(this.queue);
		this.queue.start();
	}
}
