precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform vec2 uDirection;
uniform float uRadius;

varying vec2 vUv;

void main() {
	vec2 texel = (uDirection / uResolution) * uRadius;
	vec4 c = vec4(0.0);
	c += texture2D(tDiffuse, vUv - texel * 4.0) * 0.051;
	c += texture2D(tDiffuse, vUv - texel * 3.0) * 0.0918;
	c += texture2D(tDiffuse, vUv - texel * 2.0) * 0.12245;
	c += texture2D(tDiffuse, vUv - texel * 1.0) * 0.1531;
	c += texture2D(tDiffuse, vUv) * 0.1633;
	c += texture2D(tDiffuse, vUv + texel * 1.0) * 0.1531;
	c += texture2D(tDiffuse, vUv + texel * 2.0) * 0.12245;
	c += texture2D(tDiffuse, vUv + texel * 3.0) * 0.0918;
	c += texture2D(tDiffuse, vUv + texel * 4.0) * 0.051;
	gl_FragColor = c;
}
