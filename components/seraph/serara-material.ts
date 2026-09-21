import * as THREE from "three";

export type SeraraMaterialSignals = {
  time: { value: number };
  grace: { value: number };
  tension: { value: number };
  fall: { value: number };
};

export function createSeraraMaterialSignals(): SeraraMaterialSignals {
  return {
    time: { value: 0 },
    grace: { value: 1 },
    tension: { value: 0 },
    fall: { value: 0 },
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
varying vec3 vSeraraLocal;

float seraraRidge(vec3 p) {
  float a = sin(p.y * 17.0 + sin(p.x * 13.0 + p.z * 7.0) * 1.7);
  float b = sin(p.x * 29.0 - p.y * 9.0 + p.z * 19.0);
  return abs(a * 0.68 + b * 0.32);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>

float seraraStress = clamp(uSeraraTension * 0.58 + uSeraraFall, 0.0, 1.0);
float seraraField = seraraRidge(vSeraraLocal + vec3(0.0, uSeraraTime * 0.006, 0.0));
float seraraFracture = smoothstep(
  0.91 - uSeraraFall * 0.08,
  0.985,
  seraraField
) * seraraStress;

vec3 seraraGraceTone = vec3(0.91, 0.875, 0.82);
vec3 seraraTensionTone = vec3(0.57, 0.31, 0.24);
vec3 seraraFallTone = vec3(0.18, 0.055, 0.06);
vec3 seraraEmber = vec3(0.92, 0.26, 0.08);

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
  (uSeraraTension * 0.08 + uSeraraFall * 0.38);`,
      );
  };

  material.customProgramCacheKey = () => "serara-material-full";

  return material;
}
