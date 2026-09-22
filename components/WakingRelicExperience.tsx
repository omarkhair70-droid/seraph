"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import styles from "./WakingRelicExperience.module.css";

type RelicState =
  | "dormant"
  | "sensing"
  | "watching"
  | "awakening"
  | "calling"
  | "fading";

type CinematicPhase =
  | "bound"
  | "notice"
  | "release"
  | "rise"
  | "melt"
  | "scream"
  | "aftermath";

type VoiceKey = "wake" | "close" | "silence" | "opens" | "seam" | "remain";

type AudioEnergy = {
  low: number;
  mid: number;
  high: number;
  overall: number;
};

type AudioRuntime = {
  context: AudioContext;
  analyser: AnalyserNode;
  filter: BiquadFilterNode;
  master: GainNode;
  panner: StereoPannerNode;
  ambient: HTMLAudioElement;
  presence: HTMLAudioElement;
  animationFrame: number;
};

const VOICES: Record<VoiceKey, string> = {
  wake: "/assets/waking-relic/audio/voice_wake.mp3",
  close: "/assets/waking-relic/audio/voice_close.mp3",
  silence: "/assets/waking-relic/audio/voice_silence.mp3",
  opens: "/assets/waking-relic/audio/voice_opens.mp3",
  seam: "/assets/waking-relic/audio/voice_seam.mp3",
  remain: "/assets/waking-relic/audio/voice_remain.mp3",
};

const VOICE_TEXT: Record<VoiceKey, string> = {
  wake: "You woke what was sleeping.",
  close: "Stay close.",
  silence: "There is a shape inside your silence.",
  opens: "Now it opens.",
  seam: "Follow the seam.",
  remain: "I will remain.",
};

const SFX = {
  awakening: "/assets/waking-relic/audio/cinematic/awakening_impact.wav",
  threshold: "/assets/waking-relic/audio/cinematic/threshold_riser.wav",
  presence: "/assets/waking-relic/audio/cinematic/presence_bed.wav",
  glitch: "/assets/waking-relic/audio/cinematic/room_glitch.wav",
  scream: "/assets/waking-relic/audio/cinematic/serara_scream.wav",
} as const;

const CINEMATIC_TIMELINE: Array<{
  at: number;
  phase: CinematicPhase;
}> = [
  { at: 0, phase: "notice" },
  { at: 1900, phase: "release" },
  { at: 3800, phase: "rise" },
  { at: 5900, phase: "melt" },
  { at: 7900, phase: "scream" },
  { at: 9200, phase: "aftermath" },
];

function attachWireframeTreatment(
  root: THREE.Object3D,
  baseMaterial: THREE.MeshStandardMaterial,
  wireMaterial: THREE.MeshBasicMaterial,
  ghostMaterial: THREE.MeshBasicMaterial,
) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });

  for (const mesh of meshes) {
    mesh.material = baseMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const wire = new THREE.Mesh(mesh.geometry, wireMaterial);
    wire.name = "SERARA_WIREFRAME";
    wire.scale.setScalar(1.0015);
    wire.renderOrder = 12;
    wire.frustumCulled = mesh.frustumCulled;

    const ghost = new THREE.Mesh(mesh.geometry, ghostMaterial);
    ghost.name = "SERARA_WIREFRAME_GHOST";
    ghost.scale.setScalar(1.004);
    ghost.renderOrder = 13;
    ghost.frustumCulled = mesh.frustumCulled;

    mesh.add(wire);
    mesh.add(ghost);
  }
}


type RelicDeformationUniforms = {
  time: { value: number };
  melt: { value: number };
  scream: { value: number };
  meltStart: { value: number };
  meltEnd: { value: number };
};

type RelicHooks = {
  head: THREE.Object3D | null;
  eyes: THREE.Object3D[];
  pedestalChunks: THREE.Object3D[];
  morphMeshes: THREE.Mesh[];
};

function installRelicDeformation(
  material: THREE.Material,
  uniforms: RelicDeformationUniforms,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRelicTime = uniforms.time;
    shader.uniforms.uRelicMelt = uniforms.melt;
    shader.uniforms.uRelicScream = uniforms.scream;
    shader.uniforms.uRelicMeltStart = uniforms.meltStart;
    shader.uniforms.uRelicMeltEnd = uniforms.meltEnd;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
uniform float uRelicTime;
uniform float uRelicMelt;
uniform float uRelicScream;
uniform float uRelicMeltStart;
uniform float uRelicMeltEnd;`,
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `vec3 transformed = vec3(position);
float relicHeadMask = smoothstep(uRelicMeltStart, uRelicMeltEnd, position.y);
float relicWaveA = sin(position.y * 13.0 + position.z * 8.0 + uRelicTime * 4.2);
float relicWaveB = cos(position.x * 11.0 - position.y * 6.0 + uRelicTime * 3.1);
float relicShear = relicHeadMask * uRelicMelt;
transformed.x += relicWaveA * 0.036 * relicShear;
transformed.z += relicWaveB * 0.045 * relicShear;
transformed.y -= abs(relicWaveA * relicWaveB) * 0.022 * relicShear;
float relicScreamMask = smoothstep(uRelicMeltStart - 0.12, uRelicMeltEnd, position.y);
transformed.x += sin(uRelicTime * 42.0 + position.y * 24.0) * 0.012 * uRelicScream * relicScreamMask;
transformed.z += cos(uRelicTime * 37.0 + position.x * 18.0) * 0.014 * uRelicScream * relicScreamMask;`,
    );
  };

  material.customProgramCacheKey = () => "serara-awakening-deformation-v2";
  material.needsUpdate = true;
}

function resolveRelicHooks(root: THREE.Object3D): RelicHooks {
  const hooks: RelicHooks = {
    head: null,
    eyes: [],
    pedestalChunks: [],
    morphMeshes: [],
  };

  root.traverse((object) => {
    const name = object.name.toUpperCase();

    if (!hooks.head && (name === "SERARA_HEAD" || name.endsWith("_HEAD"))) {
      hooks.head = object;
    }

    if (
      name === "SERARA_EYE_L" ||
      name === "SERARA_EYE_R" ||
      name.endsWith("_EYE_L") ||
      name.endsWith("_EYE_R")
    ) {
      hooks.eyes.push(object);
    }

    if (
      name.startsWith("SERARA_PEDESTAL_CHUNK_") ||
      name.startsWith("PEDESTAL_CHUNK_")
    ) {
      hooks.pedestalChunks.push(object);
    }

    if (
      object instanceof THREE.Mesh &&
      object.morphTargetDictionary &&
      object.morphTargetInfluences
    ) {
      hooks.morphMeshes.push(object);
    }
  });

  return hooks;
}

function setMorphValue(
  meshes: THREE.Mesh[],
  name: string,
  value: number,
) {
  for (const mesh of meshes) {
    const dictionary = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (!dictionary || !influences) continue;
    const index = dictionary[name];
    if (index == null) continue;
    influences[index] = THREE.MathUtils.clamp(value, 0, 1);
  }
}

function FallbackGaze({
  phase,
  bounds,
}: {
  phase: CinematicPhase;
  bounds: THREE.Box3;
}) {
  const eye = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.PointLight>(null);
  const { pointer } = useThree();

  const anchor = useMemo(() => {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);
    return new THREE.Vector3(
      bounds.max.x - size.x * 0.1,
      bounds.min.y + size.y * 0.865,
      center.z + size.z * 0.02,
    );
  }, [bounds]);

  useFrame((_, delta) => {
    if (!eye.current) return;
    const visible =
      phase === "notice" ||
      phase === "release" ||
      phase === "rise" ||
      phase === "melt" ||
      phase === "scream" ||
      phase === "aftermath";
    const intensity =
      phase === "scream" ? 1 : phase === "melt" ? 0.82 : visible ? 0.62 : 0;

    eye.current.position.x = THREE.MathUtils.damp(
      eye.current.position.x,
      anchor.x + pointer.x * 0.008,
      7,
      delta,
    );
    eye.current.position.y = THREE.MathUtils.damp(
      eye.current.position.y,
      anchor.y + pointer.y * 0.004,
      7,
      delta,
    );
    eye.current.position.z = anchor.z;

    const material = eye.current.material as THREE.MeshBasicMaterial;
    material.opacity = THREE.MathUtils.damp(
      material.opacity,
      intensity,
      8,
      delta,
    );
    eye.current.scale.setScalar(
      THREE.MathUtils.damp(
        eye.current.scale.x,
        phase === "scream" ? 1.8 : visible ? 1 : 0.2,
        8,
        delta,
      ),
    );

    if (glow.current) {
      glow.current.intensity = THREE.MathUtils.damp(
        glow.current.intensity,
        phase === "scream" ? 1.3 : visible ? 0.28 : 0,
        8,
        delta,
      );
    }
  });

  return (
    <group>
      <mesh ref={eye} position={anchor} renderOrder={40}>
        <sphereGeometry args={[0.018, 14, 14]} />
        <meshBasicMaterial
          color="#f2eee8"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight
        ref={glow}
        position={anchor}
        color="#d8dfe5"
        intensity={0}
        distance={0.65}
      />
    </group>
  );
}

function PedestalFragments({
  phase,
  bounds,
}: {
  phase: CinematicPhase;
  bounds: THREE.Box3;
}) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const releasedAt = useRef(0);

  const fragments = useMemo(() => {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    return Array.from({ length: 14 }, (_, index) => {
      const angle = (index / 14) * Math.PI * 2 + (index % 3) * 0.31;
      const radial = size.x * (0.12 + (index % 4) * 0.035);
      const base = new THREE.Vector3(
        center.x + Math.cos(angle) * radial,
        bounds.min.y + size.y * (0.025 + (index % 3) * 0.012),
        center.z + Math.sin(angle) * Math.max(size.z * 0.18, 0.03),
      );
      const velocity = new THREE.Vector3(
        Math.cos(angle) * (0.08 + (index % 5) * 0.016),
        0.12 + (index % 4) * 0.035,
        Math.sin(angle) * (0.07 + (index % 3) * 0.018),
      );
      return {
        base,
        velocity,
        scale: Math.max(size.x * (0.025 + (index % 4) * 0.006), 0.012),
        rotation: new THREE.Euler(index * 0.31, index * 0.47, index * 0.19),
      };
    });
  }, [bounds]);

  useEffect(() => {
    if (phase === "release") releasedAt.current = performance.now();
    if (phase === "bound" || phase === "notice") releasedAt.current = 0;
  }, [phase]);

  useFrame(({ clock }) => {
    const active =
      phase === "release" ||
      phase === "rise" ||
      phase === "melt" ||
      phase === "scream" ||
      phase === "aftermath";
    const age = releasedAt.current
      ? Math.max(0, (performance.now() - releasedAt.current) / 1000)
      : 0;

    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const fragment = fragments[index];
      const material = mesh.material as THREE.MeshBasicMaterial;

      if (!active) {
        mesh.position.copy(fragment.base);
        mesh.scale.setScalar(0.001);
        material.opacity = 0;
        return;
      }

      const t = Math.min(age, 4.4);
      mesh.position.copy(fragment.base);
      mesh.position.addScaledVector(fragment.velocity, t);
      mesh.position.y -= 0.075 * t * t;
      mesh.rotation.x = fragment.rotation.x + t * (0.9 + index * 0.025);
      mesh.rotation.y = fragment.rotation.y + t * (0.65 + index * 0.018);
      mesh.rotation.z = fragment.rotation.z + t * 0.52;
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 8 + index) * 0.08;
      mesh.scale.setScalar(fragment.scale * pulse);
      material.opacity = Math.max(0, Math.min(0.52, 0.64 - Math.max(0, t - 2.6) * 0.22));
    });
  });

  return (
    <group>
      {fragments.map((fragment, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            refs.current[index] = mesh;
          }}
          position={fragment.base}
          rotation={fragment.rotation}
          renderOrder={22}
        >
          <tetrahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color="#c9d0d4"
            wireframe
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Relic({
  state,
  phase,
  scroll,
  audioEnergy,
  onSense,
  onActivate,
}: {
  state: RelicState;
  phase: CinematicPhase;
  scroll: MutableRefObject<number>;
  audioEnergy: MutableRefObject<AudioEnergy>;
  onSense: (hovered: boolean) => void;
  onActivate: () => void;
}) {
  const { scene } = useGLTF("/assets/waking-relic/SERARA_RELIC.glb");
  const relic = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<THREE.Group>(null);
  const activation = useRef(0);
  const phaseStarted = useRef(0);
  const releaseStarted = useRef(0);
  const hooksRef = useRef<RelicHooks>({
    head: null,
    eyes: [],
    pedestalChunks: [],
    morphMeshes: [],
  });
  const { pointer } = useThree();
  const bounds = useMemo(() => new THREE.Box3().setFromObject(relic), [relic]);
  const hookPresence = useMemo(() => {
    let hasEyes = false;
    let hasPedestalChunks = false;
    relic.traverse((object) => {
      const name = object.name.toUpperCase();
      if (
        name === "SERARA_EYE_L" ||
        name === "SERARA_EYE_R" ||
        name.endsWith("_EYE_L") ||
        name.endsWith("_EYE_R")
      ) {
        hasEyes = true;
      }
      if (
        name.startsWith("SERARA_PEDESTAL_CHUNK_") ||
        name.startsWith("PEDESTAL_CHUNK_")
      ) {
        hasPedestalChunks = true;
      }
    });
    return { hasEyes, hasPedestalChunks };
  }, [relic]);
  const deformation = useRef<RelicDeformationUniforms>({
    time: { value: 0 },
    melt: { value: 0 },
    scream: { value: 0 },
    meltStart: { value: 0 },
    meltEnd: { value: 1 },
  });
  const hookDefaults = useRef<{
    headRotation: THREE.Euler | null;
    chunkPositions: Map<string, THREE.Vector3>;
  }>({
    headRotation: null,
    chunkPositions: new Map(),
  });

  const materials = useRef<{
    base: THREE.MeshStandardMaterial;
    wire: THREE.MeshBasicMaterial;
    ghost: THREE.MeshBasicMaterial;
  } | null>(null);

  if (materials.current == null) {
    materials.current = {
      base: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#101113"),
        roughness: 0.92,
        metalness: 0.04,
        emissive: new THREE.Color("#0a0b0d"),
        emissiveIntensity: 0.08,
      }),
      wire: new THREE.MeshBasicMaterial({
        color: new THREE.Color("#f2f2f0"),
        wireframe: true,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
      ghost: new THREE.MeshBasicMaterial({
        color: new THREE.Color("#8a9096"),
        wireframe: true,
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    };
  }

  useEffect(() => {
    const current = materials.current;
    if (!current) return;

    const size = new THREE.Vector3();
    bounds.getSize(size);
    deformation.current.meltStart.value = bounds.min.y + size.y * 0.68;
    deformation.current.meltEnd.value = bounds.min.y + size.y * 0.98;

    installRelicDeformation(current.base, deformation.current);
    installRelicDeformation(current.wire, deformation.current);
    installRelicDeformation(current.ghost, deformation.current);
    attachWireframeTreatment(relic, current.base, current.wire, current.ghost);

    const resolvedHooks = resolveRelicHooks(relic);
    hooksRef.current = resolvedHooks;

    if (resolvedHooks.head) {
      hookDefaults.current.headRotation = resolvedHooks.head.rotation.clone();
    }
    hookDefaults.current.chunkPositions = new Map(
      resolvedHooks.pedestalChunks.map((chunk) => [
        chunk.uuid,
        chunk.position.clone(),
      ]),
    );

    return () => {
      current.base.dispose();
      current.wire.dispose();
      current.ghost.dispose();
    };
  }, [bounds, relic]);

  useEffect(() => {
    if (state === "awakening") activation.current = performance.now();
  }, [state]);

  useEffect(() => {
    const now = performance.now();
    phaseStarted.current = now;
    if (phase === "release") releaseStarted.current = now;
    if (phase === "bound" || phase === "notice") releaseStarted.current = 0;
  }, [phase]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;

    const t = clock.getElapsedTime();
    const currentMaterials = materials.current;
    if (!currentMaterials) return;
    const hooks = hooksRef.current;
    const { base: baseMaterial, wire: wireMaterial, ghost: ghostMaterial } = currentMaterials;
    const energy = audioEnergy.current;
    const progress = scroll.current;
    const phaseAge = Math.max(0, (performance.now() - phaseStarted.current) / 1000);
    const releaseAge = releaseStarted.current
      ? Math.max(0, (performance.now() - releaseStarted.current) / 1000)
      : 0;
    const aware =
      state === "sensing" ||
      state === "watching" ||
      state === "calling" ||
      state === "awakening";

    const elapsed = performance.now() - activation.current;
    const jolt =
      state === "awakening" && elapsed < 920
        ? Math.sin(elapsed * 0.115) * (1 - elapsed / 920)
        : 0;

    const targetMelt =
      phase === "melt" ? 0.82 : phase === "scream" ? 1 : phase === "aftermath" ? 0.18 : 0;
    const targetScream = phase === "scream" ? 1 : 0;
    deformation.current.time.value = t;
    deformation.current.melt.value = THREE.MathUtils.damp(
      deformation.current.melt.value,
      targetMelt,
      phase === "scream" ? 12 : 4.2,
      delta,
    );
    deformation.current.scream.value = THREE.MathUtils.damp(
      deformation.current.scream.value,
      targetScream,
      14,
      delta,
    );

    const meltMorph = deformation.current.melt.value;
    setMorphValue(hooks.morphMeshes, "face_melt", meltMorph);
    setMorphValue(hooks.morphMeshes, "jaw_open", phase === "scream" ? 0.94 : phase === "melt" ? 0.22 : 0);
    setMorphValue(hooks.morphMeshes, "eye_widen", phase === "notice" ? 0.48 : phase === "scream" ? 1 : 0.12);
    setMorphValue(hooks.morphMeshes, "brow_tension", phase === "melt" || phase === "scream" ? 0.78 : 0.08);

    const headDefault = hookDefaults.current.headRotation;
    if (hooks.head && headDefault) {
      hooks.head.rotation.x = THREE.MathUtils.damp(
        hooks.head.rotation.x,
        headDefault.x + pointer.y * 0.055 + (phase === "scream" ? -0.06 : 0),
        4.6,
        delta,
      );
      hooks.head.rotation.y = THREE.MathUtils.damp(
        hooks.head.rotation.y,
        headDefault.y - pointer.x * 0.11 + (phase === "notice" ? -0.08 : 0),
        4.6,
        delta,
      );
      hooks.head.rotation.z = THREE.MathUtils.damp(
        hooks.head.rotation.z,
        headDefault.z + (phase === "melt" ? Math.sin(t * 3.2) * 0.018 : 0),
        4,
        delta,
      );
    }

    hooks.pedestalChunks.forEach((chunk, index) => {
      const base = hookDefaults.current.chunkPositions.get(chunk.uuid);
      if (!base) return;
      const released =
        phase === "release" ||
        phase === "rise" ||
        phase === "melt" ||
        phase === "scream" ||
        phase === "aftermath";
      if (!released) {
        chunk.position.lerp(base, Math.min(1, delta * 8));
        return;
      }
      const angle = index * 2.399963;
      const drift = Math.min(releaseAge, 4);
      chunk.position.x = base.x + Math.cos(angle) * drift * (0.035 + index * 0.002);
      chunk.position.z = base.z + Math.sin(angle) * drift * (0.035 + index * 0.002);
      chunk.position.y = base.y + drift * 0.035 - drift * drift * 0.018;
      chunk.rotation.x += delta * (0.35 + index * 0.03);
      chunk.rotation.z += delta * (0.28 + index * 0.02);
    });

    const phaseEnergy =
      phase === "notice"
        ? 0.12
        : phase === "release"
          ? 0.28
          : phase === "rise"
            ? 0.42
            : phase === "melt"
              ? 0.66
              : phase === "scream"
                ? 1
                : phase === "aftermath"
                  ? 0.22
                  : 0;

    const scrollYaw = THREE.MathUtils.lerp(1.48, 1.62, Math.min(progress * 1.2, 1));
    const targetYaw =
      scrollYaw +
      pointer.x * (phase === "notice" || phase === "aftermath" ? 0.06 : 0.035) +
      Math.sin(t * 0.11) * 0.012 +
      jolt * 0.012 +
      (phase === "notice" ? -0.08 : 0) +
      (phase === "scream" ? Math.sin(t * 22) * 0.016 : 0);

    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      targetYaw,
      2.4,
      delta,
    );

    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      pointer.y * 0.006 + Math.sin(t * 0.16) * 0.004,
      2.1,
      delta,
    );

    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      -pointer.x * 0.004 + jolt * 0.004,
      3.6,
      delta,
    );

    const audioBreath = energy.low * 0.005 + energy.mid * 0.0025;
    const breathe =
      1 +
      Math.sin(t * 0.46) * 0.0018 +
      audioBreath +
      Math.abs(jolt) * 0.004;

    const scrollScale = THREE.MathUtils.lerp(0.76, 0.82, Math.min(progress, 0.8));
    const phaseScale =
      phase === "release"
        ? 0.996
        : phase === "rise"
          ? 1.015
          : phase === "melt"
            ? 1.006 + Math.sin(t * 3.1) * 0.008
            : phase === "scream"
              ? 1.022 + Math.sin(t * 28) * 0.008
              : 1;
    group.current.scale.setScalar(scrollScale * breathe * phaseScale);

    const releaseLift =
      phase === "release"
        ? 0.012
        : phase === "rise"
          ? 0.045
          : phase === "melt" || phase === "scream" || phase === "aftermath"
            ? 0.065
            : 0;

    group.current.position.y =
      -0.1 +
      Math.sin(t * 0.27) * 0.007 +
      progress * 0.025 +
      releaseLift +
      jolt * 0.012;

    group.current.position.x = pointer.x * 0.01 + jolt * 0.004;

    const stateBoost =
      state === "awakening"
        ? 0.34
        : aware
          ? 0.13
          : state === "fading"
            ? -0.04
            : 0;

    const targetOpacity = THREE.MathUtils.clamp(
      0.18 +
        stateBoost +
        phaseEnergy * 0.3 +
        energy.mid * 0.22 +
        energy.high * 0.11 +
        Math.max(0, jolt) * 0.22,
      0.1,
      0.72,
    );

    wireMaterial.opacity = THREE.MathUtils.damp(
      wireMaterial.opacity,
      targetOpacity,
      4.8,
      delta,
    );

    ghostMaterial.opacity = THREE.MathUtils.damp(
      ghostMaterial.opacity,
      0.035 +
        energy.low * 0.12 +
        phaseEnergy * 0.11 +
        (state === "awakening" ? 0.11 : 0),
      3.5,
      delta,
    );

    const cold = new THREE.Color("#d9dde0");
    const warm = new THREE.Color("#d2a26e");
    const warmth =
      state === "awakening"
        ? THREE.MathUtils.clamp(0.4 + Math.max(0, jolt), 0, 1)
        : state === "calling"
          ? 0.12
          : 0;

    wireMaterial.color.lerpColors(cold, warm, warmth);

    baseMaterial.emissiveIntensity = THREE.MathUtils.damp(
      baseMaterial.emissiveIntensity,
      0.025 +
        energy.low * 0.16 +
        phaseEnergy * 0.17 +
        (state === "awakening" ? 0.13 : 0),
      3.5,
      delta,
    );
  });

  return (
    <group
      ref={group}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onSense(true);
      }}
      onPointerLeave={() => onSense(false)}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
    >
      {!hookPresence.hasEyes && <FallbackGaze phase={phase} bounds={bounds} />}
      {!hookPresence.hasPedestalChunks && (
        <PedestalFragments phase={phase} bounds={bounds} />
      )}
      <primitive object={relic} />
    </group>
  );
}

function CameraRig({
  scroll,
  audioEnergy,
  state,
  phase,
}: {
  scroll: MutableRefObject<number>;
  audioEnergy: MutableRefObject<AudioEnergy>;
  state: RelicState;
  phase: CinematicPhase;
}) {
  const { camera, pointer } = useThree();
  const cameraRef = useRef(camera);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const p = scroll.current;
    const t = clock.getElapsedTime();
    const low = audioEnergy.current.low;

    const statePush = state === "awakening" ? -0.08 : state === "watching" ? -0.035 : 0;
    const phasePush =
      phase === "notice"
        ? -0.035
        : phase === "melt"
          ? -0.08
          : phase === "scream"
            ? -0.14
            : phase === "aftermath"
              ? 0.035
              : 0;
    const shake =
      phase === "scream"
        ? Math.sin(t * 46) * 0.018
        : phase === "release"
          ? Math.sin(t * 24) * 0.006
          : 0;
    const targetZ = 4.65 - p * 0.34 + statePush + phasePush - low * 0.02;
    const targetX = -0.02 + p * 0.06 + pointer.x * 0.012 + shake;
    const targetY =
      0.04 +
      p * 0.025 +
      Math.sin(t * 0.09) * 0.005 +
      (phase === "scream" ? Math.cos(t * 41) * 0.009 : 0);

    const activeCamera = cameraRef.current;
    activeCamera.position.x = THREE.MathUtils.damp(activeCamera.position.x, targetX, 2.1, delta);
    activeCamera.position.y = THREE.MathUtils.damp(activeCamera.position.y, targetY, 2.1, delta);
    activeCamera.position.z = THREE.MathUtils.damp(activeCamera.position.z, targetZ, 2.1, delta);

    activeCamera.lookAt(
      THREE.MathUtils.lerp(0, 0.06, p),
      THREE.MathUtils.lerp(0.02, 0.15, p),
      0,
    );
  });

  return null;
}

function RelicStage({
  state,
  phase,
  scroll,
  audioEnergy,
  onSense,
  onActivate,
}: {
  state: RelicState;
  phase: CinematicPhase;
  scroll: MutableRefObject<number>;
  audioEnergy: MutableRefObject<AudioEnergy>;
  onSense: (hovered: boolean) => void;
  onActivate: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.86;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      camera={{ position: [-0.02, 0.04, 4.65], fov: 24, near: 0.1, far: 40 }}
      shadows
    >
      <fog attach="fog" args={["#050607", 3.0, 5.7]} />
      <ambientLight intensity={0.13} color="#8f99a3" />
      <directionalLight
        castShadow
        position={[-3.8, 4.7, 3.2]}
        intensity={1.55}
        color="#d9e0e6"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[3.4, 1.2, -1.4]}
        intensity={0.72}
        color="#788ba1"
      />
      <pointLight
        position={[1.35, -0.2, 1.75]}
        intensity={0.46}
        color="#b37143"
        distance={4}
      />

      <Suspense fallback={null}>
        <Relic
          state={state}
          phase={phase}
          scroll={scroll}
          audioEnergy={audioEnergy}
          onSense={onSense}
          onActivate={onActivate}
        />
        <ContactShadows
          position={[0, -1.12, 0]}
          opacity={0.6}
          scale={4.2}
          blur={2.3}
          far={2.8}
          resolution={512}
        />
      </Suspense>

      <CameraRig
        scroll={scroll}
        audioEnergy={audioEnergy}
        state={state}
        phase={phase}
      />
    </Canvas>
  );
}

export default function WakingRelicExperience() {
  const [entered, setEntered] = useState(false);
  const [state, setState] = useState<RelicState>("dormant");
  const [phase, setPhase] = useState<CinematicPhase>("bound");
  const [caption, setCaption] = useState("");
  const [muted, setMuted] = useState(false);

  const voice = useRef<HTMLAudioElement | null>(null);
  const audioRuntime = useRef<AudioRuntime | null>(null);
  const activeSfx = useRef<Set<HTMLAudioElement>>(new Set());
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverAwakenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spoken = useRef<Set<string>>(new Set());
  const thresholdPlayed = useRef(false);
  const glitchPlayed = useRef(false);
  const cinematicTimers = useRef<number[]>([]);
  const cinematicStarted = useRef(false);
  const scroll = useRef(0);
  const energy = useRef<AudioEnergy>({ low: 0, mid: 0, high: 0, overall: 0 });

  const setAudioFilterForState = useCallback((nextState: RelicState) => {
    const runtime = audioRuntime.current;
    if (!runtime) return;
    const now = runtime.context.currentTime;
    const targets: Record<RelicState, number> = {
      dormant: 1450,
      sensing: 2200,
      watching: 3400,
      awakening: 8200,
      calling: 4300,
      fading: 900,
    };
    runtime.filter.frequency.cancelScheduledValues(now);
    runtime.filter.frequency.setTargetAtTime(targets[nextState], now, 0.24);
  }, []);

  useEffect(() => {
    setAudioFilterForState(state);
  }, [setAudioFilterForState, state]);

  const playVoice = useCallback(
    (key: VoiceKey, once = false) => {
      if (muted) return;
      if (once && spoken.current.has(key)) return;
      spoken.current.add(key);

      voice.current?.pause();
      const next = new Audio(VOICES[key]);
      next.volume = 0.74;
      voice.current = next;
      setCaption(VOICE_TEXT[key]);
      void next.play().catch(() => undefined);
      next.onended = () => window.setTimeout(() => setCaption(""), 780);
    },
    [muted],
  );

  const playSfx = useCallback(
    (src: string, volume = 0.65) => {
      if (muted) return;
      const clip = new Audio(src);
      clip.volume = volume;
      activeSfx.current.add(clip);
      clip.onended = () => activeSfx.current.delete(clip);
      void clip.play().catch(() => activeSfx.current.delete(clip));
    },
    [muted],
  );

  const armIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setState("fading");
      playVoice("remain");
      window.setTimeout(() => setState("dormant"), 2800);
    }, 16000);
  }, [playVoice]);

  const initAudio = useCallback(async () => {
    if (audioRuntime.current) {
      await audioRuntime.current.context.resume();
      return;
    }

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.84;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.75;

    const panner = context.createStereoPanner();
    const master = context.createGain();
    master.gain.value = muted ? 0 : 0.72;

    const ambient = new Audio("/assets/waking-relic/audio/serara_ritual_ambient.mp3");
    ambient.loop = true;
    ambient.crossOrigin = "anonymous";

    const presence = new Audio(SFX.presence);
    presence.loop = true;
    presence.crossOrigin = "anonymous";

    const ambientSource = context.createMediaElementSource(ambient);
    const presenceSource = context.createMediaElementSource(presence);

    const ambientGain = context.createGain();
    ambientGain.gain.value = 0.56;
    const presenceGain = context.createGain();
    presenceGain.gain.value = 0.2;

    ambientSource.connect(ambientGain);
    presenceSource.connect(presenceGain);
    ambientGain.connect(filter);
    presenceGain.connect(filter);
    filter.connect(panner);
    panner.connect(analyser);
    analyser.connect(master);
    master.connect(context.destination);

    const bins = new Uint8Array(analyser.frequencyBinCount);

    const analyse = () => {
      analyser.getByteFrequencyData(bins);
      const lowEnd = Math.max(2, Math.floor(bins.length * 0.11));
      const midEnd = Math.max(lowEnd + 1, Math.floor(bins.length * 0.42));

      let low = 0;
      let mid = 0;
      let high = 0;

      for (let i = 0; i < lowEnd; i++) low += bins[i];
      for (let i = lowEnd; i < midEnd; i++) mid += bins[i];
      for (let i = midEnd; i < bins.length; i++) high += bins[i];

      low /= lowEnd * 255;
      mid /= (midEnd - lowEnd) * 255;
      high /= (bins.length - midEnd) * 255;

      const targetOverall = low * 0.5 + mid * 0.34 + high * 0.16;
      energy.current.low += (low - energy.current.low) * 0.16;
      energy.current.mid += (mid - energy.current.mid) * 0.14;
      energy.current.high += (high - energy.current.high) * 0.12;
      energy.current.overall += (targetOverall - energy.current.overall) * 0.12;

      if (audioRuntime.current) {
        audioRuntime.current.animationFrame = requestAnimationFrame(analyse);
      }
    };

    audioRuntime.current = {
      context,
      analyser,
      filter,
      master,
      panner,
      ambient,
      presence,
      animationFrame: requestAnimationFrame(analyse),
    };

    await context.resume();
    await Promise.allSettled([ambient.play(), presence.play()]);
  }, [muted]);

  useEffect(() => {
    if (!entered) return;

    const onInput = () => armIdle();
    const onScroll = () => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const p = THREE.MathUtils.clamp(window.scrollY / max, 0, 1);
      scroll.current = p;

      if (p > 0.22 && !thresholdPlayed.current) {
        thresholdPlayed.current = true;
        setState("calling");
        playSfx(SFX.threshold, 0.45);
        playVoice("seam", true);
      }

      if (p > 0.52 && !glitchPlayed.current) {
        glitchPlayed.current = true;
        playSfx(SFX.glitch, 0.36);
      }
    };

    window.addEventListener("pointermove", onInput, { passive: true });
    window.addEventListener("scroll", onInput, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    onScroll();
    armIdle();

    return () => {
      window.removeEventListener("pointermove", onInput);
      window.removeEventListener("scroll", onInput);
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [armIdle, entered, playSfx, playVoice]);

  useEffect(() => {
    const sfxSet = activeSfx.current;
    return () => {
      voice.current?.pause();
      for (const clip of sfxSet) clip.pause();

      if (hoverAwakenTimer.current) clearTimeout(hoverAwakenTimer.current);
      for (const timer of cinematicTimers.current) clearTimeout(timer);
      cinematicTimers.current = [];

      const runtime = audioRuntime.current;
      if (runtime) {
        cancelAnimationFrame(runtime.animationFrame);
        runtime.ambient.pause();
        runtime.presence.pause();
        void runtime.context.close();
      }
    };
  }, []);

  const enter = async () => {
    setEntered(true);
    setState("sensing");
    try {
      await initAudio();
    } catch {
      // The visual experience remains valid if a browser rejects audio startup.
    }
    window.setTimeout(() => playVoice("wake", true), 820);
    window.setTimeout(() => setState("dormant"), 4600);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);

    const runtime = audioRuntime.current;
    if (runtime) {
      const now = runtime.context.currentTime;
      runtime.master.gain.cancelScheduledValues(now);
      runtime.master.gain.setTargetAtTime(next ? 0 : 0.72, now, 0.08);
    }

    if (voice.current) {
      if (next) voice.current.pause();
      else voice.current.muted = false;
    }
    if (next) {
      for (const clip of activeSfx.current) clip.pause();
      activeSfx.current.clear();
    }
  };

  const runCinematic = useCallback(() => {
    if (!entered || cinematicStarted.current) return;
    cinematicStarted.current = true;
    thresholdPlayed.current = true;
    glitchPlayed.current = true;

    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (hoverAwakenTimer.current) clearTimeout(hoverAwakenTimer.current);
    for (const timer of cinematicTimers.current) clearTimeout(timer);
    cinematicTimers.current = [];

    setState("awakening");
    setPhase("notice");
    playSfx(SFX.awakening, 0.82);
    playVoice("opens");

    for (const cue of CINEMATIC_TIMELINE.slice(1)) {
      const timer = window.setTimeout(() => {
        setPhase(cue.phase);

        if (cue.phase === "release") {
          playSfx(SFX.glitch, 0.28);
        }

        if (cue.phase === "melt") {
          playSfx(SFX.threshold, 0.24);
        }

        if (cue.phase === "scream") {
          playSfx(SFX.scream, 0.78);
        }

        if (cue.phase === "aftermath") {
          setState("watching");
        }
      }, cue.at);
      cinematicTimers.current.push(timer);
    }
  }, [entered, playSfx, playVoice]);

  const onSense = (hovered: boolean) => {
    if (!entered) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (hoverAwakenTimer.current) clearTimeout(hoverAwakenTimer.current);

    if (!hovered) {
      if (!cinematicStarted.current) setState("dormant");
      return;
    }

    if (cinematicStarted.current) return;

    setState("sensing");
    playVoice("close", true);

    hoverTimer.current = setTimeout(() => {
      setState("watching");
      playVoice("silence", true);
    }, 1700);

    hoverAwakenTimer.current = setTimeout(() => {
      runCinematic();
    }, 4400);
  };

  const onActivate = () => {
    runCinematic();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const x = event.clientX / Math.max(window.innerWidth, 1);
    const y = event.clientY / Math.max(window.innerHeight, 1);
    event.currentTarget.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
    event.currentTarget.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);

    if (audioRuntime.current) {
      audioRuntime.current.panner.pan.setTargetAtTime(
        THREE.MathUtils.clamp((x - 0.5) * 0.52, -0.28, 0.28),
        audioRuntime.current.context.currentTime,
        0.12,
      );
    }
  };

  return (
    <main
      className={styles.experience}
      data-state={state}
      data-phase={phase}
      data-entered={entered ? "true" : "false"}
      onPointerMove={onPointerMove}
    >
      <div className={styles.canvasShell} aria-hidden={!entered}>
        <RelicStage
          state={state}
          phase={phase}
          scroll={scroll}
          audioEnergy={energy}
          onSense={onSense}
          onActivate={onActivate}
        />
      </div>

      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.pointerField} />
        <div className={styles.halo} />
        <div className={styles.scan} />
        <div className={styles.grain} />
        <div className={styles.vignette} />
        <div className={styles.apertureTop} />
        <div className={styles.apertureBottom} />
      </div>

      {!entered && (
        <button className={styles.gate} type="button" onClick={enter}>
          <span className={styles.gateIndex}>SERAPH // RELIC 01</span>
          <span className={styles.gateTitle}>ENTER WITHOUT A NAME</span>
          <span className={styles.gateHint}>sound is part of the room</span>
        </button>
      )}

      <header className={styles.chrome}>
        <div>
          <strong>SERARA</strong>
          <span>UNRESOLVED OBJECT // 01</span>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
        >
          {muted ? "SOUND / ABSENT" : "SOUND / PRESENT"}
        </button>
      </header>

      <div className={styles.caption} aria-live="polite">
        {caption && <span>{caption}</span>}
      </div>

      <section className={[styles.chapter, styles.hero].join(" ")}>
        <div className={styles.chapterCopy}>
          <span>00 / CONTACT</span>
          <h1>THE ROOM<br />NOTICED YOU.</h1>
          <p>Your shadow arrived first.</p>
        </div>
      </section>

      <section className={styles.chapter}>
        <div className={styles.chapterCopy}>
          <span>01 / MEASUREMENT</span>
          <h2>FORM<br />WITHOUT NAME.</h2>
          <p>Do not translate the silence.</p>
        </div>
      </section>

      <section className={[styles.chapter, styles.centerChapter].join(" ")}>
        <div className={styles.chapterCopy}>
          <span>02 / DISTANCE</span>
          <h2>IT IS LEARNING<br />WHERE YOU STAND.</h2>
          <p>Stay long enough and the surface changes first.</p>
        </div>
      </section>

      <section className={styles.chapter}>
        <div className={styles.chapterCopy}>
          <span>03 / THRESHOLD</span>
          <h2>THIS ROOM<br />HAS NO OUTSIDE.</h2>
          <p>Nothing here needs to introduce itself.</p>
        </div>
      </section>

      <section className={[styles.chapter, styles.afterimage].join(" ")}>
        <div className={styles.chapterCopy}>
          <span>04 / AFTERIMAGE</span>
          <h2>LEAVE THE SHAPE.<br />KEEP THE NOISE.</h2>
          <p>The relic remains after the interface is gone.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>SERAPH://RELIC-01</span>
        <span>NO EXPLANATION FOLLOWS</span>
      </footer>
    </main>
  );
}

useGLTF.preload("/assets/waking-relic/SERARA_RELIC.glb");
