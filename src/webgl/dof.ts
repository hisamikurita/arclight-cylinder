import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Pass } from "three/addons/postprocessing/Pass.js";
import { camera, renderer, scene } from "./core";
import { renderWithReflection } from "./reflection";

let composer: EffectComposer;
let bokehPass: BokehPass;

export const DOF_PARAMS = {
	focus: 7.5,
	aperture: 0.002,
	maxblur: 0.01,
};

// カスタムレンダーパス：反射レンダリングを使用
class ReflectionRenderPass extends Pass {
	constructor() {
		super();
		this.needsSwap = false;
	}

	render(
		_renderer: THREE.WebGLRenderer,
		writeBuffer: THREE.WebGLRenderTarget,
	): void {
		if (this.renderToScreen) {
			renderWithReflection(null);
		} else {
			renderWithReflection(writeBuffer);
		}
	}
}

export const setupDOF = (): void => {
	// ステンシルバッファ付きのレンダーターゲットを作成
	const renderTarget = new THREE.WebGLRenderTarget(
		window.innerWidth,
		window.innerHeight,
		{
			stencilBuffer: true,
			depthBuffer: true,
		},
	);

	composer = new EffectComposer(renderer, renderTarget);

	// カスタム反射レンダーパスを使用
	const reflectionPass = new ReflectionRenderPass();
	composer.addPass(reflectionPass);

	bokehPass = new BokehPass(scene, camera, {
		focus: DOF_PARAMS.focus,
		aperture: DOF_PARAMS.aperture,
		maxblur: DOF_PARAMS.maxblur,
	});
	composer.addPass(bokehPass);

	const outputPass = new OutputPass();
	composer.addPass(outputPass);
};

export const updateDOFParams = (params: Partial<typeof DOF_PARAMS>): void => {
	if (!bokehPass) return;

	if (params.focus !== undefined) {
		bokehPass.uniforms["focus"].value = params.focus;
		DOF_PARAMS.focus = params.focus;
	}
	if (params.aperture !== undefined) {
		bokehPass.uniforms["aperture"].value = params.aperture;
		DOF_PARAMS.aperture = params.aperture;
	}
	if (params.maxblur !== undefined) {
		bokehPass.uniforms["maxblur"].value = params.maxblur;
		DOF_PARAMS.maxblur = params.maxblur;
	}
};

export const renderWithDOF = (): void => {
	if (composer) {
		composer.render();
	}
};

export const resizeDOF = (): void => {
	if (composer) {
		composer.setSize(window.innerWidth, window.innerHeight);
	}
};

export const getComposer = (): EffectComposer | undefined => composer;
export const getBokehPass = (): BokehPass | undefined => bokehPass;
