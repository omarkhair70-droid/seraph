"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  getSeraraPulse,
  getSeraraState,
  getSeraraWorldAttention,
  getSeraraWorldPresence,
} from "./serara-state";
import { getSeraraBurst } from "./serara-runtime-signal";

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}


const RITUAL_VERTEX_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uHeat;
  uniform float uPhase;

  void main() {
    vUv = uv;
    vec3 p = position;

    float taper = sin(uv.y * 3.14159265);
    float waveA = sin(uv.y * 10.0 + uTime * (1.2 + uHeat * 2.0) + uPhase);
    float waveB = sin(uv.y * 21.0 - uTime * 0.72 + uPhase * 1.7);

    p.x += (waveA * 0.12 + waveB * 0.035) * taper * (0.55 + uHeat);
    p.z += cos(uv.y * 8.0 + uTime * 0.8 + uPhase) * 0.045 * taper;
    p.y += sin(uv.x * 4.0 + uTime * 0.3 + uPhase) * 0.02 * taper;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const RITUAL_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uHeat;
  uniform float uGrace;
  uniform float uPresence;
  uniform float uPhase;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    float edge = smoothstep(0.0, 0.18, vUv.x) *
      smoothstep(0.0, 0.18, 1.0 - vUv.x);

    float body = sin(vUv.y * 3.14159265);
    float flicker =
      0.72 +
      sin(uTime * 4.0 + vUv.y * 18.0 + uPhase) * 0.12 +
      hash(floor(vUv * 28.0 + uTime * 0.7)) * 0.16;

    float alpha =
      edge *
      body *
      flicker *
      (0.075 + uGrace * 0.045 + uHeat * 0.2 + uPresence * 0.06);

    vec3 cold = vec3(0.35, 0.23, 0.18);
    vec3 ember = vec3(1.0, 0.19, 0.045);
    vec3 color = mix(cold, ember, clamp(uHeat * 0.86 + vUv.y * 0.18, 0.0, 1.0));

    gl_FragColor = vec4(color, alpha);
  }
`;

const FLOOR_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FLOOR_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uHeat;
  uniform float uPulse;
  uniform float uPresence;

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);

    float spokes = abs(sin(a * 7.0 + sin(a * 3.0) * 1.8));
    float cracks = smoothstep(0.965 - uHeat * 0.035, 0.998, spokes);

    float rings = smoothstep(
      0.93,
      1.0,
      abs(sin(r * 18.0 - uTime * (0.32 + uHeat * 0.45)))
    );

    float mask =
      smoothstep(1.02, 0.18, r) *
      smoothstep(0.02, 0.16, r);

    float flare =
      (cracks * 0.78 + rings * 0.22) *
      mask *
      (0.07 + uHeat * 0.48 + uPulse * uPresence * 0.2);

    vec3 ember = mix(
      vec3(0.35, 0.08, 0.035),
      vec3(1.0, 0.22, 0.055),
      uHeat
    );

    gl_FragColor = vec4(ember, flare);
  }
`;

function EmberField() {
  const count = 190;
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { geometry, base, speed, drift } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const baseValues = new Float32Array(count * 3);
    const speedValues = new Float32Array(count);
    const driftValues = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const radius = 0.7 + seeded(index, 1) * 2.25;
      const angle = seeded(index, 2) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.62;
      const y = -1.62 + seeded(index, 3) * 3.7;

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;

      baseValues[index * 3] = x;
      baseValues[index * 3 + 1] = y;
      baseValues[index * 3 + 2] = z;

      speedValues[index] = 0.11 + seeded(index, 4) * 0.34;
      driftValues[index] = seeded(index, 5) * Math.PI * 2;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );

    return {
      geometry: bufferGeometry,
      base: baseValues,
      speed: speedValues,
      drift: driftValues,
    };
  }, []);

  useFrame(({ clock, pointer }, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;

    const t = clock.elapsedTime;
    const state = getSeraraState(t);
    const presence = getSeraraWorldPresence(pointer);
    const attention = getSeraraWorldAttention(pointer);
    const pulse = getSeraraPulse(t, state);
    const burst = getSeraraBurst();
    const attribute = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;

    for (let index = 0; index < count; index += 1) {
      const baseX = base[index * 3];
      const baseY = base[index * 3 + 1];
      const baseZ = base[index * 3 + 2];
      const phase = drift[index];

      const lift =
        (t * speed[index] * (0.55 + state.tension * 0.72 + state.fall)) % 4.15;

      array[index * 3] =
        baseX +
        Math.sin(t * 0.34 + phase) * (0.035 + state.fall * 0.065) +
        attention.x * presence * 0.025;

      array[index * 3 + 1] = -1.68 + ((baseY + 1.68 + lift) % 4.15);

      array[index * 3 + 2] =
        baseZ +
        Math.cos(t * 0.27 + phase) * (0.035 + state.tension * 0.05);
    }

    attribute.needsUpdate = true;

    const targetOpacity =
      0.22 +
      state.grace * 0.11 +
      state.tension * 0.42 +
      state.fall * 0.66 +
      presence * pulse * 0.22 +
      burst * 0.58;

    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      targetOpacity,
      Math.min(1, delta * 2.5),
    );

    material.size = THREE.MathUtils.lerp(
      material.size,
      0.022 + state.tension * 0.013 + state.fall * 0.021 + burst * 0.018,
      Math.min(1, delta * 2.2),
    );

    material.color.set("#d88758").lerp(
      new THREE.Color("#f14f24"),
      state.tension * 0.42 + state.fall * 0.82,
    );

    points.rotation.y +=
      delta * (0.015 + state.tension * 0.025 + state.fall * 0.04);
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        color="#d88758"
        size={0.024}
        sizeAttenuation
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}


function CounterCurrent() {
  const count = 120;
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const radius = 0.9 + seeded(index, 31) * 2.15;
      const angle = seeded(index, 32) * Math.PI * 2;

      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = -1.45 + seeded(index, 33) * 3.45;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.58;
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return result;
  }, []);

  useFrame(({ clock, pointer }, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;

    const t = clock.elapsedTime;
    const state = getSeraraState(t);
    const presence = getSeraraWorldPresence(pointer);
    const attention = getSeraraWorldAttention(pointer);
    const conflict = Math.min(1, state.tension * 0.8 + state.fall * 0.7);

    points.rotation.y -= delta * (0.022 + state.tension * 0.035);
    points.rotation.z =
      Math.sin(t * 0.09) * 0.035 - presence * attention.x * 0.01;

    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      0.16 + state.grace * 0.26 + state.tension * 0.2 - state.fall * 0.05,
      Math.min(1, delta * 1.8),
    );

    material.size = THREE.MathUtils.lerp(
      material.size,
      0.016 + state.grace * 0.008 + conflict * 0.004,
      Math.min(1, delta * 2),
    );

    material.color
      .set("#d8d2c7")
      .lerp(new THREE.Color("#a8b1ae"), state.fall * 0.42);
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        color="#d8d2c7"
        size={0.019}
        sizeAttenuation
        transparent
        opacity={0.24}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function HostileFragments() {
  const count = 22;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const fragments = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        radius: 1.15 + seeded(index, 10) * 1.65,
        y: -1.1 + seeded(index, 11) * 3.1,
        phase: seeded(index, 12) * Math.PI * 2,
        speed: 0.08 + seeded(index, 13) * 0.18,
        scale: 0.32 + seeded(index, 14) * 0.88,
        tilt: (seeded(index, 15) - 0.5) * 2.2,
      })),
    [],
  );

  useFrame(({ clock, pointer }, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    const t = clock.elapsedTime;
    const state = getSeraraState(t);
    const presence = getSeraraWorldPresence(pointer);
    const pulse = getSeraraPulse(t, state);
    const burst = getSeraraBurst();
    const conflict = state.tension * 0.64 + state.fall + burst * 0.7;

    fragments.forEach((fragment, index) => {
      const angle =
        fragment.phase +
        t * fragment.speed * (0.45 + conflict * 1.4) +
        Math.sin(t * 0.13 + fragment.phase) * 0.12;

      const radius =
        fragment.radius -
        state.fall * 0.22 +
        Math.sin(t * 0.31 + fragment.phase) * 0.08;

      dummy.position.set(
        Math.cos(angle) * radius,
        fragment.y + Math.sin(t * 0.43 + fragment.phase) * 0.13,
        Math.sin(angle) * radius * 0.68,
      );

      dummy.rotation.set(
        fragment.tilt + t * 0.18,
        angle * 0.7 + t * 0.12,
        -fragment.tilt * 0.4 + t * 0.09,
      );

      const reactive =
        fragment.scale *
        (0.085 +
          state.grace * 0.018 +
          conflict * 0.055 +
          presence * pulse * 0.018);

      dummy.scale.set(
        reactive * 0.75,
        reactive * 1.9,
        reactive * 0.46,
      );

      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;

    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      0.24 + state.tension * 0.24 + state.fall * 0.42 + burst * 0.28,
      Math.min(1, delta * 2),
    );

    material.emissiveIntensity = THREE.MathUtils.lerp(
      material.emissiveIntensity,
      0.06 + state.tension * 0.22 + state.fall * 0.42 + pulse * presence * 0.1 + burst * 0.5,
      Math.min(1, delta * 2.4),
    );
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#332722"
        emissive="#8b3427"
        emissiveIntensity={0.12}
        roughness={0.68}
        metalness={0.08}
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function RitualRibbon({
  position,
  rotation,
  phase,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  phase: number;
  scale: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0 },
      uGrace: { value: 1 },
      uPresence: { value: 0 },
      uPhase: { value: phase },
    }),
    [phase],
  );

  useFrame(({ clock, pointer }) => {
    const current = materialRef.current;
    if (!current) return;

    const t = clock.elapsedTime;
    const state = getSeraraState(t);
    const presence = getSeraraWorldPresence(pointer);
    const heat = state.tension * 0.56 + state.fall + getSeraraBurst() * 0.7;

    current.uniforms.uTime.value = t;
    current.uniforms.uHeat.value = heat;
    current.uniforms.uGrace.value = state.grace;
    current.uniforms.uPresence.value = presence;

    if (meshRef.current) {
      meshRef.current.rotation.z =
        rotation[2] +
        Math.sin(t * 0.16 + phase) * 0.04 +
        state.fall * 0.02;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <planeGeometry args={[0.5, 3.2, 10, 56]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={RITUAL_VERTEX_SHADER}
        fragmentShader={RITUAL_FRAGMENT_SHADER}
      />
    </mesh>
  );
}

function FloorFissureField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0 },
      uPulse: { value: 0 },
      uPresence: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock, pointer }) => {
    const current = materialRef.current;
    if (!current) return;

    const t = clock.elapsedTime;
    const state = getSeraraState(t);
    const presence = getSeraraWorldPresence(pointer);

    current.uniforms.uTime.value = t;
    current.uniforms.uHeat.value =
      state.tension * 0.58 + state.fall + getSeraraBurst() * 0.78;
    current.uniforms.uPulse.value = getSeraraPulse(t, state);
    current.uniforms.uPresence.value = presence;
  });

  return (
    <mesh position={[0, -1.825, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5.4, 5.4]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={FLOOR_VERTEX_SHADER}
        fragmentShader={FLOOR_FRAGMENT_SHADER}
      />
    </mesh>
  );
}

function VolumetricShafts() {
  const leftRef = useRef<THREE.MeshBasicMaterial>(null);
  const rightRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    const state = getSeraraState(t);
    const presence = getSeraraWorldPresence(pointer);
    const burst = getSeraraBurst();
    const target =
      0.026 +
      state.grace * 0.018 +
      state.tension * 0.034 +
      presence * 0.016 -
      state.fall * 0.006 +
      burst * 0.05;

    for (const material of [leftRef.current, rightRef.current]) {
      if (!material) continue;
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        Math.max(0.012, target),
        Math.min(1, delta * 1.4),
      );
    }
  });

  return (
    <>
      <mesh position={[-1.35, 1.65, -0.7]} rotation={[0.08, 0, -0.2]}>
        <coneGeometry args={[0.95, 5.6, 32, 1, true]} />
        <meshBasicMaterial
          ref={leftRef}
          color="#f4d5b0"
          transparent
          opacity={0.034}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[1.6, 1.25, -1]} rotation={[-0.04, 0, 0.24]}>
        <coneGeometry args={[0.8, 5.2, 32, 1, true]} />
        <meshBasicMaterial
          ref={rightRef}
          color="#9f5145"
          transparent
          opacity={0.026}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

export default function CinematicChamberVFX() {
  return (
    <group>
      <VolumetricShafts />
      <FloorFissureField />
      <CounterCurrent />
      <HostileFragments />
      <EmberField />

      <RitualRibbon
        position={[-1.35, -0.05, -0.45]}
        rotation={[0, -0.28, -0.08]}
        phase={0.1}
        scale={1.05}
      />
      <RitualRibbon
        position={[1.25, 0.08, -0.62]}
        rotation={[0, 0.32, 0.1]}
        phase={2.2}
        scale={0.92}
      />
      <RitualRibbon
        position={[-0.62, 0.24, 0.42]}
        rotation={[0, 0.52, 0.16]}
        phase={4.1}
        scale={0.72}
      />
      <RitualRibbon
        position={[0.72, -0.16, 0.34]}
        rotation={[0, -0.5, -0.14]}
        phase={5.5}
        scale={0.66}
      />
    </group>
  );
}
