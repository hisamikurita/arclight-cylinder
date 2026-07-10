precision highp float;

uniform vec3 uBaseColor;
uniform vec3 uLightPos;
uniform vec3 uLightDir;
uniform float uLightConeAngle;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uCameraPos;

uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogStrength;

// 床全体の alpha 係数 (ロードフェード用)
uniform float uFloorAlpha;

uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform vec3 uNoiseColor;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include "./lib/cnoise.glsl";

void main() {
	vec3 N = normalize(vWorldNormal);
	vec3 toSurface = vWorldPos - uLightPos;
	vec3 L = normalize(-toSurface);
	vec3 V = normalize(uCameraPos - vWorldPos);
	vec3 H = normalize(L + V);

	// Spotlight cone falloff
	float cosAngle = dot(normalize(toSurface), normalize(uLightDir));
	float cosCone = cos(radians(uLightConeAngle));
	float cosOuter = cos(radians(uLightConeAngle * 1.3));
	float spotFactor = smoothstep(cosOuter, cosCone, cosAngle);

	// Diffuse
	float NdotL = max(dot(N, L), 0.0);
	vec3 diffuse = uLightColor * NdotL;

	// Specular (Blinn-Phong) - 床面は控えめに
	float NdotH = max(dot(N, H), 0.0);
	float spec = pow(NdotH, 16.0);
	vec3 specular = uLightColor * spec * 0.2;

	// Distance attenuation
	float dist = length(toSurface);
	float attenuation = 1.0 / (1.0 + 0.02 * dist * dist);

	vec3 lighting = (diffuse + specular) * uLightIntensity * attenuation * spotFactor;

	// Perlin ノイズによる表面のムラ（ワールド座標＋時間で緩やかにドリフト）
	float n = cnoise(vec3(vWorldPos.xz * uNoiseScale * 0.1, uTime));
	float noiseTerm = n * uNoiseStrength;

	vec3 color = uBaseColor + lighting + uNoiseColor * noiseTerm;

	// 距離減衰の Fog（カメラからの距離）
	float camDist = length(uCameraPos - vWorldPos);
	float fogFactor = smoothstep(uFogNear, uFogFar, camDist) * uFogStrength;
	color = mix(color, uFogColor, fogFactor);

	// alpha は fog だけで駆動 (奥ほど不透明) 。
	// ノイズを alpha に効かせるとピクセル単位のちらつき (エイリアス) が出るので RGB 側だけに載せる。
	float alpha = clamp(fogFactor, 0.0, 1.0) * uFloorAlpha;

	gl_FragColor = vec4(color, alpha);
}
