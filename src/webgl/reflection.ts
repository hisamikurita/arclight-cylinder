import * as THREE from "three";
import { camera, renderer, scene } from "./core";
import { galleryGroup } from "./Gallery";

// 床面（ミラー）
let floorMesh: THREE.Mesh;
const FLOOR_Y = -0.8; // 床のY座標
const FLOOR_SIZE = 20;

export const setupReflection = (): void => {
	// 床面のジオメトリとマテリアル
	const floorGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
	const floorMaterial = new THREE.MeshBasicMaterial({
		color: 0x000000,
		transparent: true,
		opacity: 0.55,
	});

	floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
	floorMesh.rotation.x = -Math.PI / 2;
	floorMesh.position.y = FLOOR_Y;
	scene.add(floorMesh);
};

export const renderWithReflection = (): void => {
	const gl = renderer.getContext();
	renderer.autoClear = false;

	const originalY = galleryGroup.position.y;
	const originalScaleY = galleryGroup.scale.y;
	const originalBackground = scene.background;

	// === 1. 床面をステンシルバッファに描画 ===
	if (originalBackground instanceof THREE.Color) {
		renderer.setClearColor(originalBackground);
	}
	renderer.clear(true, true, true);
	gl.enable(gl.STENCIL_TEST);
	gl.stencilFunc(gl.ALWAYS, 1, 0xff);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
	gl.colorMask(false, false, false, false);
	gl.depthMask(false);

	floorMesh.visible = true;
	galleryGroup.visible = false;
	renderer.render(scene, camera);

	// === 2. 反射をステンシル領域内に描画 ===
	gl.colorMask(true, true, true, true);
	gl.depthMask(true);
	gl.stencilFunc(gl.EQUAL, 1, 0xff);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

	galleryGroup.position.y = FLOOR_Y * 2 - originalY;
	galleryGroup.scale.y = -1;
	floorMesh.visible = false;
	galleryGroup.visible = true;
	scene.background = null;
	renderer.render(scene, camera);

	// === 3. ステンシル無効化して通常シーンを描画 ===
	gl.disable(gl.STENCIL_TEST);
	galleryGroup.position.y = originalY;
	galleryGroup.scale.y = originalScaleY;
	floorMesh.visible = true;
	renderer.clearDepth();
	renderer.render(scene, camera);

	// 元に戻す
	scene.background = originalBackground;
	renderer.autoClear = true;
};
