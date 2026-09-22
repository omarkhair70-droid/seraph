import * as THREE from "three";

export type SeraraMaterialSignals = {
  time: { value: number };
  grace: { value: number };
  tension: { value: number };
  fall: { value: number };
  presence: { value: number };
  pulse: { value: number };
};

export function createSeraraMaterialSignals(): SeraraMaterialSignals {
  return {
    time: { value: 0 },
    grace: { value: 1 },
    tension: { value: 0 },
    fall: { value: 0 },
    presence: { value: 0 },
    pulse: { value: 0 },
  };
}

export function createSeraraBodyMaterial(
  signals: SeraraMaterialSignals,
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#e5ddd1"),
    roughness: 0.32,
    metalness: 0.006,
    clearcoat: 0.16,
    clearcoatRoughness: 0.68,
    emissive: new THREE.Color("#6e4638"),
    emissiveIntensity: 0.038,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeraraTime = signals.time;
    shader.uniforms.uSeraraGrace = signals.grace;
    shader.uniforms.uSeraraTension = signals.tension;
    shader.uniforms.uSeraraFall = signals.fall;
    shader.uniforms.uSeraraPresence = signals.presence;
    shader.uniforms.uSeraraPulse = signals.pulse;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vSeraraLocal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vSeraraLocal = position;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uSeraraTime;
uniform float uSeraraGrace;
uniform float uSeraraTension;
uniform float uSeraraFall;
uniform float uSeraraPresence;
uniform float uSeraraPulse;
varying vec3 vSeraraLocal;

float seraraRidge(vec3 p) {
  float a = sin(p.y * 17.0 + sin(p.x * 13.0 + p.z * 7.0) * 1.7);
  float b = sin(p.x * 29.0 - p.y * 9.0 + p.z * 19.0);
  return abs(a * 0.68 + b * 0.32);
}

float seraraNerve(vec3 p) {
  float trunk = abs(sin(
    p.y * 10.5 +
    sin(p.x * 18.0 + p.z * 14.0) * 1.35
  ));
  float branch = abs(sin(
    p.x * 33.0 -
    p.y * 8.0 +
    p.z * 24.0
  ));
  return smoothstep(0.91, 0.985, trunk * 0.72 + branch * 0.28);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>

float seraraStress = clamp(uSeraraTension * 0.58 + uSeraraFall, 0.0, 1.0);

float seraraField = seraraRidge(
  vSeraraLocal +
  vec3(0.0, uSeraraTime * 0.006, 0.0)
);

float seraraFracture = smoothstep(
  0.91 - uSeraraFall * 0.08,
  0.985,
  seraraField
) * seraraStress;

float seraraWave =
  sin(vSeraraLocal.y * 8.0 - uSeraraTime * 2.15) * 0.5 + 0.5;

float seraraPulseBand = pow(
  clamp(seraraWave, 0.0, 1.0),
  9.0
);

float seraraNerveField =
  seraraNerve(vSeraraLocal) *
  (0.18 + seraraPulseBand * 0.82) *
  uSeraraPresence;

vec3 seraraGraceTone = vec3(0.91, 0.875, 0.82);
vec3 seraraTensionTone = vec3(0.57, 0.31, 0.24);
vec3 seraraFallTone = vec3(0.18, 0.055, 0.06);
vec3 seraraEmber = vec3(0.92, 0.26, 0.08);
vec3 seraraNerveGlow = vec3(0.84, 0.31, 0.12);

diffuseColor.rgb = mix(
  diffuseColor.rgb,
  seraraGraceTone,
  uSeraraGrace * 0.12
);

diffuseColor.rgb = mix(
  diffuseColor.rgb,
  seraraTensionTone,
  uSeraraTension * 0.24
);

diffuseColor.rgb = mix(
  diffuseColor.rgb,
  seraraFallTone,
  uSeraraFall * 0.56
);

diffuseColor.rgb = mix(
  diffuseColor.rgb,
  vec3(0.055, 0.027, 0.026),
  seraraFracture * (0.22 + uSeraraFall * 0.58)
);

diffuseColor.rgb +=
  seraraEmber *
  seraraFracture *
  (uSeraraTension * 0.08 + uSeraraFall * 0.38);

diffuseColor.rgb +=
  seraraNerveGlow *
  seraraNerveField *
  (0.025 + uSeraraPulse * 0.085) *
  (0.35 + uSeraraGrace * 0.2 + uSeraraTension * 0.55 + uSeraraFall * 0.9);`,
      );
  };

  material.customProgramCacheKey = () => "serara-material-living-nervous-body-v2";

  return material;
}
