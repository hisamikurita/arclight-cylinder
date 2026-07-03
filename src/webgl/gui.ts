import GUI from "lil-gui";
import { scene } from "./core";
import * as THREE from "three";
import { FOG, PLANE, SCENE } from "./constants";
import { DOF_PARAMS, updateDOFParams } from "./dof";
import { updateGallerySideColor } from "./Gallery";

export const setupGUI = (): GUI => {
	const gui = new GUI();

	// Scene folder
	const sceneFolder = gui.addFolder("Scene");

	const sceneParams = {
		backgroundColor: SCENE.BACKGROUND_COLOR,
	};

	sceneFolder.addColor(sceneParams, "backgroundColor").name("Background").onChange((value: number) => {
		if (scene.background instanceof THREE.Color) {
			scene.background.set(value);
		}
	});

	sceneFolder.open();

	// Fog folder
	const fogFolder = gui.addFolder("Fog");

	const fogParams = {
		color: FOG.COLOR,
		near: FOG.NEAR,
		far: FOG.FAR,
	};

	fogFolder.addColor(fogParams, "color").onChange((value: number) => {
		if (scene.fog instanceof THREE.Fog) {
			scene.fog.color.setHex(value);
		}
	});

	fogFolder.add(fogParams, "near", 0, 20, 0.1).onChange((value: number) => {
		if (scene.fog instanceof THREE.Fog) {
			scene.fog.near = value;
		}
	});

	fogFolder.add(fogParams, "far", 0, 30, 0.1).onChange((value: number) => {
		if (scene.fog instanceof THREE.Fog) {
			scene.fog.far = value;
		}
	});

	fogFolder.open();

	// Plane folder
	const planeFolder = gui.addFolder("Plane");

	const planeParams = {
		frameColor: PLANE.SIDE_COLOR,
	};

	planeFolder.addColor(planeParams, "frameColor").name("Frame Color").onChange((value: number) => {
		updateGallerySideColor(value);
	});

	planeFolder.open();

	// DOF folder
	const dofFolder = gui.addFolder("DOF");

	const dofParams = {
		focus: DOF_PARAMS.focus,
		aperture: DOF_PARAMS.aperture,
		maxblur: DOF_PARAMS.maxblur,
	};

	dofFolder.add(dofParams, "focus", 0, 20, 0.1).onChange((value: number) => {
		updateDOFParams({ focus: value });
	});

	dofFolder.add(dofParams, "aperture", 0, 0.01, 0.0001).onChange((value: number) => {
		updateDOFParams({ aperture: value });
	});

	dofFolder.add(dofParams, "maxblur", 0, 0.05, 0.001).onChange((value: number) => {
		updateDOFParams({ maxblur: value });
	});

	dofFolder.open();

	return gui;
};
