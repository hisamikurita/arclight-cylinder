uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uWaveSeed;
uniform float uHoverCircle;
uniform float uHoverAlpha;
uniform float uZoomBurst;
uniform vec2 uPlaneSize;

varying vec2 vUv;
varying float vFogDepth;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include "./lib/snoise.glsl";

void main() {
	vUv = uv;
	vec3 pos = position;
	vec3 nrm = normal;

	// uWaveStrength > 0 のときのみ変位（反射描画時に有効化）
	if (uWaveStrength > 0.0) {
		float t = uTime * uWaveSpeed + uWaveSeed * 100.0;
		float nx = snoise(vec3(uv * uWaveFrequency, t));
		float ny = snoise(vec3(uv * uWaveFrequency + vec2(31.7, 47.3), t + 47.0));
		pos.x += nx * uWaveStrength;
		pos.y += ny * uWaveStrength;
	}

	// Hover ripple: 前面のみ、法線方向に波打たせて実際に凹凸を作る
	// (色でなく頂点位置と法線を動かし、既存のスポットライトが立体的に反応する)
	// 振幅は uHoverAlpha 側に連動させ、"見えていない時" は凹凸も作らない
	if (uHoverAlpha > 0.0 && uHoverCircle > 0.0) {
		float frontMask = smoothstep(0.3, 0.7, nrm.z);
		if (frontMask > 0.0) {
			float aspect = uPlaneSize.x / uPlaneSize.y;
			vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
			float r = length(centered);
			// プレーンの端に近づくと振幅を 0 にして側面との段差を防ぐ
			float edgeMask = 1.0 - smoothstep(0.6, 1.05, r);
			float freq = 8.0;
			float speed = 2.3;
			float phase = r * freq - uTime * speed;
			// サイズゲート: 円が小さい間は凹凸も出さない (frag 側と同じ 0.2 閾値)
			float sizeGate = smoothstep(0.0, 0.2, uHoverCircle);
			float amp = 0.01 * uHoverAlpha * sizeGate * edgeMask * frontMask;

			// 頂点変位 (法線方向に押し出し)
			pos += nrm * sin(phase) * amp;

			// analytical bump normal: 波の傾き分だけ法線を tangent 面上で傾ける
			if (r > 1e-4) {
				float slopeMag = amp * freq * cos(phase) / uPlaneSize.y;
				vec3 tX = normalize(cross(vec3(0.0, 1.0, 0.0), nrm));
				vec3 tY = cross(nrm, tX);
				vec2 radial = centered / r;
				vec3 delta = -(radial.x * tX + radial.y * tY) * slopeMag;
				nrm = normalize(nrm + delta);
			}
		}
	}

	// zoomIn burst ripple: uZoomBurst に同期して中央から 1 回広がるリング状の波紋
	// 前面のみに凹凸を作り、リング上でだけ振幅が乗るシャクウェーブ状の変位
	if (uZoomBurst > 0.0) {
		float frontMask = smoothstep(0.3, 0.7, nrm.z);
		if (frontMask > 0.0) {
			float aspect = uPlaneSize.x / uPlaneSize.y;
			vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
			float r = length(centered);

			const float MAX_RADIUS = 1.3;
			const float RING_WIDTH = 0.4;
			float edge = uZoomBurst * MAX_RADIUS;
			float ringMask = smoothstep(edge - RING_WIDTH, edge, r)
				- smoothstep(edge, edge + RING_WIDTH * 0.6, r);
			ringMask = clamp(ringMask, 0.0, 1.0);

			// 開始 (radius=0) と終了 (radius=1) で 0、中間でピーク
			float envelope = sin(uZoomBurst * 3.14159265);

			float freq = 10.0;
			float phase = r * freq - uZoomBurst * 22.0;
			float amp = 0.010 * envelope * ringMask * frontMask;

			pos += nrm * sin(phase) * amp;

			// 波の傾きに応じて法線も僅かに傾け、ライティングにも波紋を反映
			if (r > 1e-4) {
				float slopeMag = amp * freq * cos(phase) / uPlaneSize.y;
				vec3 tX = normalize(cross(vec3(0.0, 1.0, 0.0), nrm));
				vec3 tY = cross(nrm, tX);
				vec2 radial = centered / r;
				vec3 delta = -(radial.x * tX + radial.y * tY) * slopeMag;
				nrm = normalize(nrm + delta);
			}
		}
	}

	vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
	vWorldPos = worldPosition.xyz;
	vWorldNormal = normalize(mat3(modelMatrix) * nrm);

	vec4 mvPosition = viewMatrix * worldPosition;
	vFogDepth = -mvPosition.z;
	gl_Position = projectionMatrix * mvPosition;
}
