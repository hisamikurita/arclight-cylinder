uniform float uCurvePower;
uniform float uCurveHeight;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
	vUv = uv;

	// 端の湾曲: uv 中心からの正規化距離を power 乗し、height 分下方向にオフセット
	// uv は 0..1、中心 (0.5,0.5) からの距離を [0..1] に正規化
	vec2 centered = uv - vec2(0.5);
	float d = clamp(length(centered) * 2.0, 0.0, 1.0);
	float curve = pow(d, uCurvePower) * uCurveHeight;

	vec3 displaced = position;
	// PlaneGeometry を -PI/2 X 回転して床にしているため local +Z が world +Y。
	// 端を下 (お椀状) に落としたいので -= で下方向にオフセット
	displaced.z -= curve;

	vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
	vWorldPos = worldPosition.xyz;
	vWorldNormal = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
