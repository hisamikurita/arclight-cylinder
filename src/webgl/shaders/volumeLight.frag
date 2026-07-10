precision highp float;

varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform vec3 uLightColor;
uniform vec3 uSpotPosition;
uniform float uAttenuation;
uniform float uAnglePower;
uniform float uAlpha;
uniform float uWave;
uniform float uTime;

#include "./lib/cnoise.glsl";

void main() {
	// 距離減衰: 光源からの距離を attenuation で正規化
	float spot = distance(vWorldPosition, uSpotPosition) / uAttenuation;
	float intensity = 1.0 - clamp(spot, 0.0, 1.0);

	// 角度減衰: 円錐側面ほど強く、中央（見通し方向）ほど弱い
	// backface に対応するため abs をとる
	vec3 normal = vec3(vNormal.x, vNormal.y, abs(vNormal.z));
	float angleIntensity = pow(max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), uAnglePower);
	intensity *= angleIntensity;

	// 光源から遠い部分をふわっと出す
	float spotAlphaStart = clamp(spot * 3.0 - 0.5, 0.0, 1.0);

	// 揺らぎ: Perlin ノイズで時間変化
	float c = cnoise(vec3(normal.x * uWave * 0.5, normal.y * uWave, uTime)) + 1.0;

	intensity = c * intensity * uAlpha * spotAlphaStart;
	gl_FragColor = vec4(uLightColor, clamp(intensity, 0.0, 1.0));
}
