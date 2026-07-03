uniform sampler2D uTexture;
uniform vec2 uPlaneSize;
uniform vec2 uImageSize;
uniform float uParallaxOffset; // -1.0 ~ 1.0
uniform float uParallaxScale; // 1.0 ~ 1.25+
uniform float uBorderWidth;
uniform vec3 uBorderColor;
uniform float uBrightness;

// Fog uniforms
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

varying vec2 vUv;
varying float vFogDepth;

// リニアからsRGBへの変換
vec3 linearToSRGB(vec3 color) {
	return pow(color, vec3(1.0 / 2.2));
}

void main() {
	vec4 color;

	// 裏面は白色
	if (!gl_FrontFacing) {
		color = vec4(1.0, 1.0, 1.0, 1.0);
	} else {
		// ボーダー判定（UV空間での幅）
		vec2 borderUV = vec2(uBorderWidth / uPlaneSize.x, uBorderWidth / uPlaneSize.y);
		if (vUv.x < borderUV.x || vUv.x > 1.0 - borderUV.x ||
			vUv.y < borderUV.y || vUv.y > 1.0 - borderUV.y) {
			color = vec4(linearToSRGB(uBorderColor), 1.0);
		} else {
			vec2 planeAspect = vec2(uPlaneSize.x / uPlaneSize.y, 1.0);
			vec2 imageAspect = vec2(uImageSize.x / uImageSize.y, 1.0);

			vec2 scale;
			if (planeAspect.x > imageAspect.x) {
				// プレーンが横長 → 幅に合わせる
				scale = vec2(1.0, imageAspect.x / planeAspect.x);
			} else {
				// プレーンが縦長 → 高さに合わせる
				scale = vec2(planeAspect.x / imageAspect.x, 1.0);
			}

			// パララックススケールで拡大（scaleを小さくする）
			scale /= uParallaxScale;

			// パララックスオフセット（余白の範囲内で移動）
			float maxOffset = (uParallaxScale - 1.0) / uParallaxScale * 0.5;
			float offsetX = uParallaxOffset * maxOffset * 2.0;

			vec2 uv = (vUv - 0.5) * scale + 0.5 + vec2(offsetX, 0.0);
			color = texture2D(uTexture, uv);
		}
	}

	// Apply fog (brightnessはフォグミックス前に掛ける：フォグに沈んだ部分は背景色と一致させる)
	float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
	vec3 rgb = mix(color.rgb * uBrightness, fogColor, fogFactor);
	gl_FragColor = vec4(rgb, color.a);
}
