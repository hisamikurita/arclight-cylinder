import gsap from "gsap";
import * as THREE from "three";
import { DURATION, EASING, GALLERY, PARALLAX, PLANE } from "./constants";
import { camera, orbitControls, renderer } from "./core";
import { galleryGroup } from "./Gallery";
import {
	getIsDragging,
	getWasDragged,
	resetTiltAndSway,
	restoreTiltAndSway,
	setAutoRotating,
	setDragEnabled,
	setMouseMoveEnabled,
	setRotationPaused,
	setTargetRotation,
} from "./galleryRotation";
import type { CurvedPlaneData } from "./geometry";
import { volumeLightAlphaFade } from "./lights";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let targetPlanes: THREE.Mesh[] = [];
let isZoomed = false;
let activePlane: THREE.Mesh | null = null;
// zoomOut で position.z を戻すために保存する元の値
// (rotation.y は zoomOut で戻さず、current の位置を保持する)
let originalGalleryPositionZ = 0;

export const setupInteractions = (planes: THREE.Mesh[]): void => {
	targetPlanes = planes;
	renderer.domElement.addEventListener("click", onClick);
	renderer.domElement.addEventListener("mousemove", onHoverMove);
	window.addEventListener("resize", onResize);
};

// 円筒の背面側 (カメラから遠いプレーン) はインタラクション対象外にするための判定
// (背面のプレーンは front 側の隙間から raycaster に拾われることがあるため)
const hitWorldPos = new THREE.Vector3();
const isFrontHalfPlane = (plane: THREE.Object3D): boolean => {
	plane.getWorldPosition(hitWorldPos);
	return hitWorldPos.z > galleryGroup.position.z;
};

// プレーン hover 時のカーソル切り替え。ドラッグ中は galleryRotation 側で
// "grabbing" が設定されているので触らない
const onHoverMove = (event: MouseEvent): void => {
	if (getIsDragging()) return;

	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObjects(targetPlanes);
	const front = intersects.find((i) => isFrontHalfPlane(i.object));
	renderer.domElement.style.cursor = front ? "pointer" : "";
};

const onResize = (): void => {
	if (!isZoomed || !activePlane) return;

	// camera.aspectを先に更新
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	// 新しいビューポートサイズで必要な距離を再計算し、ギャラリーを z 方向に移動
	const geometry = activePlane.geometry as THREE.BoxGeometry;
	const params = geometry.parameters;
	const distance = calculateCameraDistance(params.width, params.height);
	galleryGroup.position.z = camera.position.z - distance - GALLERY.RADIUS;
};

const onClick = (event: MouseEvent): void => {
	// ドラッグ操作後はzoomInを無効にする
	if (getWasDragged()) return;

	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);

	if (isZoomed) {
		zoomOut();
		return;
	}

	const intersects = raycaster.intersectObjects(targetPlanes);
	// 背面側のプレーンは無視する
	const front = intersects.find((i) => isFrontHalfPlane(i.object));
	if (front) {
		zoomIn(front.object as THREE.Mesh);
	}
};

// プレーンがビューポートにぴったり収まるカメラ距離を計算
const calculateCameraDistance = (
	planeWidth: number,
	planeHeight: number,
): number => {
	const fov = camera.fov * (Math.PI / 180);
	const aspect = camera.aspect; // camera.aspectを直接使用
	const planeAspect = planeWidth / planeHeight;

	let distance: number;
	if (aspect > planeAspect) {
		// ウィンドウが横長 → 幅基準（プレーンの幅をビューポートに合わせる）
		distance = planeWidth / 2 / Math.tan(fov / 2) / aspect;
	} else {
		// ウィンドウが縦長 → 高さ基準（プレーンの高さをビューポートに合わせる）
		distance = planeHeight / 2 / Math.tan(fov / 2);
	}

	return distance;
};

const zoomIn = (plane: THREE.Mesh): void => {
	activePlane = plane;
	// zoomOut で復元するために position.z を保存
	originalGalleryPositionZ = galleryGroup.position.z;

	// 先にtilt/swayをリセット（座標計算前に必要）
	setMouseMoveEnabled(false);
	resetTiltAndSway();

	// プレーンの円筒内角度 α (ローカル座標から)
	// カメラ正面 (world x=0, world z=+R) に持ってくる回転は β = α - π/2
	const planeAngle = Math.atan2(plane.position.z, plane.position.x);
	const rawTargetY = planeAngle - Math.PI / 2;
	// 最短角度差で回す
	const currentY = galleryGroup.rotation.y;
	const twoPi = Math.PI * 2;
	let diff = (((rawTargetY - currentY) % twoPi) + twoPi) % twoPi;
	if (diff > Math.PI) diff -= twoPi;
	const targetRotationY = currentY + diff;

	// プレーンをビューポートに収めるための距離を計算し、
	// galleryGroup を z 方向に前後させて距離を合わせる (カメラは動かさない)
	const geometry = plane.geometry as THREE.BoxGeometry;
	const params = geometry.parameters;
	const distance = calculateCameraDistance(params.width, params.height);
	const targetPositionZ = camera.position.z - distance - GALLERY.RADIUS;

	orbitControls.enabled = false;

	const materials = plane.material as THREE.Material[];
	const coverMaterial = materials[4] as THREE.ShaderMaterial;

	// フェーズ 1 (t=0): ライトを落として円筒を正面に回す
	// フェーズ 2 (t=EXPANSION_DELAY): 少し遅らせて拡大 (z 移動 + morph + border/parallax 解除)
	const EXPANSION_DELAY = 0.2;
	const tl = gsap.timeline();
	tl.to(
		volumeLightAlphaFade,
		{ value: 0, duration: DURATION.LONG, ease: EASING.TRANSFORM },
		0,
	);
	tl.to(
		galleryGroup.rotation,
		{ y: targetRotationY, duration: DURATION.BASE, ease: EASING.TRANSFORM },
		0,
	);
	tl.to(
		galleryGroup.position,
		{ z: targetPositionZ, duration: DURATION.BASE, ease: EASING.TRANSFORM },
		EXPANSION_DELAY,
	);
	tl.to(
		coverMaterial.uniforms.uParallaxIntensity,
		{ value: 0, duration: DURATION.BASE, ease: EASING.TRANSFORM },
		EXPANSION_DELAY,
	);
	tl.to(
		coverMaterial.uniforms.uBorderWidth,
		{ value: 0, duration: DURATION.BASE, ease: EASING.TRANSFORM },
		EXPANSION_DELAY,
	);
	morphToFlat(plane, EXPANSION_DELAY);

	setAutoRotating(false);
	setDragEnabled(false);
	setRotationPaused(true);
	isZoomed = true;
};

const zoomOut = (): void => {
	// rotation.y は元に戻さず、current の位置 (クリックしたプレーンが正面) を保持する
	if (activePlane) {
		// パララックスとボーダーを元に戻す
		const materials = activePlane.material as THREE.Material[];
		const coverMaterial = materials[4] as THREE.ShaderMaterial;
		gsap.to(coverMaterial.uniforms.uParallaxIntensity, {
			value: PARALLAX.INTENSITY,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
		});
		gsap.to(coverMaterial.uniforms.uBorderWidth, {
			value: PLANE.DEPTH,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
		});
		gsap.to(volumeLightAlphaFade, {
			value: 1,
			duration: DURATION.EXTRA_LONG,
			ease: EASING.TRANSFORM,
		});

		morphToCurved(activePlane);
		activePlane = null;
	}

	setMouseMoveEnabled(true);
	// restoreTiltAndSway は galleryGroup.position を overwrite:true で書き換えるので、
	// 先に呼んでから z を戻す (順序を逆にすると z tween が kill される)
	restoreTiltAndSway();
	gsap.to(galleryGroup.position, {
		z: originalGalleryPositionZ,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	// 他の tween 完了後にオート回転を再開する。この時点で targetRotation を現在の
	// rotation.y に合わせておかないと、内挿が過去の targetRotation に向かって
	// 引っ張り、せっかく中央に持ってきたプレーンがズレてしまう
	gsap.delayedCall(DURATION.BASE, () => {
		setTargetRotation(galleryGroup.rotation.y);
		setAutoRotating(true);
		setDragEnabled(true);
		setRotationPaused(false);
	});

	isZoomed = false;
};

const morphToFlat = (plane: THREE.Mesh, delay = 0): void => {
	const geometry = plane.geometry as THREE.BoxGeometry;
	const data = geometry.userData as CurvedPlaneData;
	const position = geometry.attributes.position;

	const currentPositions = { value: 0 };

	gsap.to(currentPositions, {
		value: 1,
		delay,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		onUpdate: () => {
			const t = currentPositions.value;
			for (let i = 0; i < position.count; i++) {
				const curvedX = data.curvedPositions[i * 3];
				const curvedY = data.curvedPositions[i * 3 + 1];
				const curvedZ = data.curvedPositions[i * 3 + 2];

				const flatX = data.flatPositions[i * 3];
				const flatY = data.flatPositions[i * 3 + 1];
				const flatZ = data.flatPositions[i * 3 + 2];

				position.setXYZ(
					i,
					curvedX + (flatX - curvedX) * t,
					curvedY + (flatY - curvedY) * t,
					curvedZ + (flatZ - curvedZ) * t,
				);
			}
			position.needsUpdate = true;
			geometry.computeVertexNormals();
		},
	});
};

const morphToCurved = (plane: THREE.Mesh): void => {
	const geometry = plane.geometry as THREE.BoxGeometry;
	const data = geometry.userData as CurvedPlaneData;
	const position = geometry.attributes.position;

	const currentPositions = { value: 0 };

	gsap.to(currentPositions, {
		value: 1,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		onUpdate: () => {
			const t = currentPositions.value;
			for (let i = 0; i < position.count; i++) {
				const flatX = data.flatPositions[i * 3];
				const flatY = data.flatPositions[i * 3 + 1];
				const flatZ = data.flatPositions[i * 3 + 2];

				const curvedX = data.curvedPositions[i * 3];
				const curvedY = data.curvedPositions[i * 3 + 1];
				const curvedZ = data.curvedPositions[i * 3 + 2];

				position.setXYZ(
					i,
					flatX + (curvedX - flatX) * t,
					flatY + (curvedY - flatY) * t,
					flatZ + (curvedZ - flatZ) * t,
				);
			}
			position.needsUpdate = true;
			geometry.computeVertexNormals();
		},
	});
};
