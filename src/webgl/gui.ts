import GUI from "lil-gui";
import { scene } from "./core";
import * as THREE from "three";
import { FOG, PLANE, REFLECTION_PARAMS, SCENE } from "./constants";
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

	// Reflection folder
	const reflectionFolder = gui.addFolder("Reflection");

	reflectionFolder
		.add(REFLECTION_PARAMS, "brightness", 0, 1, 0.01)
		.name("Brightness");

	reflectionFolder
		.add(REFLECTION_PARAMS, "blurRadius", 0, 10, 0.1)
		.name("Blur");

	reflectionFolder
		.add(REFLECTION_PARAMS, "waveStrength", 0, 0.3, 0.005)
		.name("Wave Strength");

	reflectionFolder
		.add(REFLECTION_PARAMS, "waveFrequency", 0, 20, 0.1)
		.name("Wave Frequency");

	reflectionFolder
		.add(REFLECTION_PARAMS, "waveSpeed", 0, 2, 0.02)
		.name("Wave Speed");

	reflectionFolder.open();

	return gui;
};
