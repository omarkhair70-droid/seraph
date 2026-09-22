"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  createSeraraBodyMaterial,
  createSeraraMaterialSignals,
} from "./serara-material";
import {
  getSeraraPresence,
  getSeraraPulse,
  getSeraraState,
} from "./serara-state";
import { createSeraraSonic } from "./serara-sonic";
import { triggerSeraraBurst } from "./serara-runtime-signal";

const MODEL_URL = "/assets/serara-canonical.glb";
const TARGET_HEIGHT = 3.65;

type SeraraPosture = "grace" | "tension" | "fall";

type RigBones = {
  hips?: THREE.Bone;
  spine?: THREE.Bone;
  spine1?: THREE.Bone;
  spine2?: THREE.Bone;
  neck?: THREE.Bone;
  head?: THREE.Bone;
  leftShoulder?: THREE.Bone;
  rightShoulder?: THREE.Bone;
  leftArm?: THREE.Bone;
  rightArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
  leftHand?: THREE.Bone;
  rightHand?: THREE.Bone;
  leftUpLeg?: THREE.Bone;
  rightUpLeg?: THREE.Bone;
  leftLeg?: THREE.Bone;
  rightLeg?: THREE.Bone;
};

type BoneKey = keyof RigBones;

type BoneBind = {
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

type PostureOffsets = {
  [K in BoneKey]?: [number, number, number];
};

type MaterialBuckets = {
  porcelain: THREE.MeshPhysicalMaterial[];
  inner: THREE.MeshPhysicalMaterial[];
  eyes: THREE.MeshPhysicalMaterial[];
  cavity: THREE.MeshPhysicalMaterial[];
  signal: THREE.MeshPhysicalMaterial[];
};

type FingerBone = {
  bone: THREE.Bone;
  bind: THREE.Quaternion;
  finger: "Thumb" | "Index" | "Middle" | "Ring" | "Little";
  segment: 1 | 2 | 3;
  phase: number;
};

const POSTURES: Record<SeraraPosture, PostureOffsets> = {
  grace: {
    hips: [-0.012, 0, 0],
    spine: [-0.03, 0, 0],
    spine1: [-0.04, 0, 0],
    spine2: [-0.06, 0, 0],
    neck: [0.026, 0, 0],
    head: [0.015, 0, 0],
    leftShoulder: [0, 0.018, -0.055],
    rightShoulder: [0, -0.018, 0.055],
    leftArm: [0, 0, -0.045],
    rightArm: [0, 0, 0.045],
  },
  tension: {
    hips: [0.018, 0, -0.032],
    spine: [0.038, 0.004, -0.045],
    spine1: [0.058, -0.008, -0.06],
    spine2: [0.046, 0.014, -0.075],
    neck: [-0.014, 0.028, 0.042],
    head: [0.02, -0.024, 0.052],
    leftShoulder: [0.036, 0.028, 0.1],
    rightShoulder: [-0.016, -0.02, -0.068],
    leftArm: [0.036, 0.01, 0.06],
    rightArm: [-0.024, 0, -0.044],
    leftForeArm: [0.04, 0, 0.032],
    rightForeArm: [0.016, 0, -0.024],
    leftHand: [0.02, 0.01, 0.018],
    rightHand: [0.012, -0.008, -0.014],
    leftUpLeg: [0.016, 0, 0.02],
    rightUpLeg: [-0.01, 0, -0.024],
  },
  fall: {
    hips: [0.12, 0.024, -0.068],
    spine: [0.14, 0, -0.045],
    spine1: [0.17, 0.014, -0.06],
    spine2: [0.19, -0.02, -0.084],
    neck: [0.15, 0.032, 0.044],
    head: [0.17, -0.032, 0.072],
    leftShoulder: [0.068, 0.032, 0.128],
    rightShoulder: [0.052, -0.024, -0.108],
    leftArm: [0.056, 0.014, 0.076],
    rightArm: [0.042, -0.01, -0.064],
    leftForeArm: [0.096, 0, 0.052],
    rightForeArm: [0.076, 0, -0.042],
    leftHand: [0.055, 0.018, 0.04],
    rightHand: [0.045, -0.012, -0.032],
    leftUpLeg: [0.105, 0, 0.024],
    rightUpLeg: [0.076, 0, -0.02],
    leftLeg: [-0.112, 0, 0],
    rightLeg: [-0.084, 0, 0],
  },
};

const BONE_NAMES: Record<BoneKey, string> = {
  hips: "Hips",
  spine: "Spine",
  spine1: "Spine1",
  spine2: "Spine2",
  neck: "Neck",
  head: "Head",
  leftShoulder: "LeftShoulder",
  rightShoulder: "RightShoulder",
  leftArm: "LeftArm",
  rightArm: "RightArm",
  leftForeArm: "LeftForeArm",
  rightForeArm: "RightForeArm",
  leftHand: "LeftHand",
  rightHand: "RightHand",
  leftUpLeg: "LeftUpLeg",
  rightUpLeg: "RightUpLeg",
  leftLeg: "LeftLeg",
  rightLeg: "RightLeg",
};

const MORPH_TARGETS = [
  "FACE_RELAXED",
  "FACE_TENSION",
  "FACE_FALL",
  "EYES_NARROW",
  "MOUTH_SEAM_OPEN",
] as const;

function createCanonicalMaterial(
  source: THREE.Material,
  buckets: MaterialBuckets,
  signals: ReturnType<typeof createSeraraMaterialSignals>,
) {
  if (source.name === "SERARA_Porcelain") {
    const material = createSeraraBodyMaterial(signals);
    material.name = source.name;
    buckets.porcelain.push(material);
    return material;
  }

  if (source.name === "SERARA_InnerMineral") {
    const material = new THREE.MeshPhysicalMaterial({
      name: source.name,
      color: "#281817",
      roughness: 0.7,
      metalness: 0.02,
      emissive: "#6f3427",
      emissiveIntensity: 0.06,
    });
    buckets.inner.push(material);
    return material;
  }

  if (source.name === "SERARA_EyeObsidian") {
    const material = new THREE.MeshPhysicalMaterial({
      name: source.name,
      color: "#090706",
      roughness: 0.19,
      metalness: 0.05,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28,
      emissive: "#9f5735",
      emissiveIntensity: 0.24,
    });
    buckets.eyes.push(material);
    return material;
  }

  if (source.name === "SERARA_CavityRim") {
    const material = new THREE.MeshPhysicalMaterial({
      name: source.name,
      color: "#3a2420",
      roughness: 0.58,
      metalness: 0.01,
      emissive: "#5d3027",
      emissiveIntensity: 0.035,
    });
    buckets.cavity.push(material);
    return material;
  }

  if (source.name === "SERARA_InternalSignal") {
    const material = new THREE.MeshPhysicalMaterial({
      name: source.name,
      color: "#7a3d27",
      roughness: 0.28,
      metalness: 0,
      emissive: "#ef8d4c",
      emissiveIntensity: 0.72,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    buckets.signal.push(material);
    return material;
  }

  return source.clone();
}

function updateMorphs(
  meshes: THREE.Mesh[],
  state: { grace: number; tension: number; fall: number },
  presence: number,
  delta: number,
) {
  const targets: Record<(typeof MORPH_TARGETS)[number], number> = {
    FACE_RELAXED: state.grace * 0.28,
    FACE_TENSION: state.tension * 0.72,
    FACE_FALL: state.fall * 0.78,
    EYES_NARROW:
      state.tension * 0.34 +
      state.fall * 0.64 +
      presence * state.grace * 0.055,
    MOUTH_SEAM_OPEN:
      state.tension * 0.035 +
      state.fall * 0.13 +
      presence * state.grace * 0.012,
  };

  const alpha = Math.min(1, delta * 2.4);

  for (const mesh of meshes) {
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) continue;

    for (const target of MORPH_TARGETS) {
      const index = mesh.morphTargetDictionary[target];
      if (index === undefined) continue;

      mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
        mesh.morphTargetInfluences[index] ?? 0,
        targets[target],
        alpha,
      );
    }
  }
}

export default function SeraraCanonicalBody() {
  const motionRef = useRef<THREE.Group>(null);
  const attentionRef = useRef(new THREE.Vector2());
  const attentionTargetRef = useRef(new THREE.Vector2());
  const presenceRef = useRef(0);
  const impulseRef = useRef(0);
  const sonic = useMemo(() => createSeraraSonic(), []);
  const { scene } = useGLTF(MODEL_URL);

  useEffect(() => {
    const unlock = () => {
      void sonic.wake();
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      sonic.dispose();
    };
  }, [sonic]);

  const fitted = useMemo(() => {
    const cloned = clone(scene);
    const materialSignals = createSeraraMaterialSignals();
    const buckets: MaterialBuckets = {
      porcelain: [],
      inner: [],
      eyes: [],
      cavity: [],
      signal: [],
    };
    const morphMeshes: THREE.Mesh[] = [];

    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = true;
      object.receiveShadow = true;

      if (object.morphTargetDictionary && object.morphTargetInfluences) {
        morphMeshes.push(object);
      }

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) =>
          createCanonicalMaterial(material, buckets, materialSignals),
        );
      } else {
        object.material = createCanonicalMaterial(
          object.material,
          buckets,
          materialSignals,
        );
      }
    });

    cloned.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const scale = TARGET_HEIGHT / Math.max(size.y, 0.001);
    const bones: RigBones = {};
    const bind = {} as Partial<Record<BoneKey, BoneBind>>;
    const fingerBones: FingerBone[] = [];

    (Object.keys(BONE_NAMES) as BoneKey[]).forEach((key) => {
      const object = cloned.getObjectByName(BONE_NAMES[key]);
      if (!(object instanceof THREE.Bone)) return;

      bones[key] = object;
      bind[key] = {
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
      };
    });

    cloned.traverse((object) => {
      if (!(object instanceof THREE.Bone)) return;

      const match = object.name.match(
        /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Little)([123])$/,
      );
      if (!match) return;

      const finger = match[2] as FingerBone["finger"];
      const segment = Number(match[3]) as FingerBone["segment"];
      const sidePhase = match[1] === "Left" ? 0 : Math.PI * 0.73;
      const fingerPhase =
        ["Thumb", "Index", "Middle", "Ring", "Little"].indexOf(finger) * 0.41;

      fingerBones.push({
        bone: object,
        bind: object.quaternion.clone(),
        finger,
        segment,
        phase: sidePhase + fingerPhase,
      });
    });

    return {
      scene: cloned,
      scale,
      offset: new THREE.Vector3(-center.x, -center.y, -center.z),
      bones,
      bind,
      materialSignals,
      buckets,
      morphMeshes,
      fingerBones,
    };
  }, [scene]);

  useFrame(({ clock, pointer }, delta) => {
    const motion = motionRef.current;
    if (!motion) return;

    const t = clock.elapsedTime;
    const state = getSeraraState(t);

    impulseRef.current = THREE.MathUtils.lerp(
      impulseRef.current,
      0,
      Math.min(1, delta * 3.2),
    );

    const rawPresence = THREE.MathUtils.clamp(
      getSeraraPresence(pointer) + impulseRef.current * 0.34,
      0,
      1,
    );

    presenceRef.current = THREE.MathUtils.lerp(
      presenceRef.current,
      rawPresence,
      Math.min(1, delta * 2.8),
    );

    const presence = presenceRef.current;
    const pulse = Math.max(
      getSeraraPulse(t, state),
      impulseRef.current * 0.92,
    );

    sonic.update(state, presence, pulse, pointer.x);

    fitted.materialSignals.time.value = t;
    fitted.materialSignals.grace.value = state.grace;
    fitted.materialSignals.tension.value = state.tension;
    fitted.materialSignals.fall.value = state.fall;
    fitted.materialSignals.presence.value = presence;
    fitted.materialSignals.pulse.value = pulse;

    const stress = THREE.MathUtils.clamp(
      state.tension * 0.55 + state.fall,
      0,
      1,
    );

    for (const material of fitted.buckets.porcelain) {
      material.roughness = THREE.MathUtils.lerp(0.3, 0.61, stress);
      material.emissiveIntensity =
        0.018 + state.grace * 0.02 + state.tension * 0.035 + state.fall * 0.055;
    }

    for (const material of fitted.buckets.inner) {
      material.color.set("#281817").lerp(new THREE.Color("#16090a"), state.fall);
      material.emissive.set("#6f3427").lerp(
        new THREE.Color("#d9552d"),
        state.tension * 0.38 + state.fall * 0.78,
      );
      material.emissiveIntensity =
        0.045 + state.tension * 0.12 + state.fall * 0.24;
    }

    for (const material of fitted.buckets.eyes) {
      material.emissiveIntensity =
        0.13 +
        state.grace * 0.07 +
        state.tension * 0.18 +
        state.fall * 0.08 +
        presence * (0.16 + pulse * 0.14);
      material.roughness = THREE.MathUtils.lerp(
        0.23,
        0.34,
        state.fall,
      );
    }

    for (const material of fitted.buckets.cavity) {
      material.emissiveIntensity =
        0.02 + state.tension * 0.07 + state.fall * 0.16;
    }

    for (const material of fitted.buckets.signal) {
      material.emissiveIntensity =
        0.3 +
        state.grace * 0.18 +
        state.tension * 0.56 +
        state.fall * 1.1 +
        presence * (0.22 + pulse * 0.42);
      material.opacity =
        0.54 +
        state.grace * 0.1 +
        state.tension * 0.08 +
        state.fall * 0.16 +
        presence * 0.08;
    }

    updateMorphs(fitted.morphMeshes, state, presence, delta);

    attentionTargetRef.current.set(pointer.x, pointer.y);
    attentionRef.current.lerp(
      attentionTargetRef.current,
      Math.min(1, delta * (0.66 + state.tension * 0.34)),
    );

    const awareness = 0.28 + presence * 0.72;
    const attentionYaw =
      attentionRef.current.x *
        (0.052 - state.fall * 0.016) *
        awareness +
      Math.sin(t * 0.17) * 0.007;
    const attentionPitch =
      -attentionRef.current.y * 0.026 * awareness +
      Math.sin(t * 0.13 + 0.6) * 0.0045;

    const targetYaw =
      pointer.x * 0.026 +
      Math.sin(t * 0.11) * 0.004 -
      state.fall * 0.04;

    motion.rotation.y = THREE.MathUtils.lerp(
      motion.rotation.y,
      targetYaw,
      Math.min(1, delta * 1.02),
    );

    motion.position.z = THREE.MathUtils.lerp(
      motion.position.z,
      -impulseRef.current * 0.055,
      Math.min(1, delta * 7),
    );

    const compression = impulseRef.current * 0.008;
    motion.scale.x = THREE.MathUtils.lerp(
      motion.scale.x,
      1 + compression * 0.42,
      Math.min(1, delta * 7),
    );
    motion.scale.y = THREE.MathUtils.lerp(
      motion.scale.y,
      1 - compression,
      Math.min(1, delta * 7),
    );
    motion.scale.z = THREE.MathUtils.lerp(
      motion.scale.z,
      1 + compression * 0.72,
      Math.min(1, delta * 7),
    );

    motion.rotation.z = THREE.MathUtils.lerp(
      motion.rotation.z,
      -pointer.x * 0.002 +
        Math.sin(t * 0.17) * 0.0015 +
        state.tension * 0.012 +
        state.fall * 0.04,
      Math.min(1, delta * 0.78),
    );

    const breathing =
      Math.sin(t * (0.86 + state.tension * 0.62)) *
      (0.007 + state.grace * 0.0045);

    const keys = Object.keys(BONE_NAMES) as BoneKey[];

    for (const key of keys) {
      const bone = fitted.bones[key];
      const base = fitted.bind[key];
      if (!bone || !base) continue;

      const grace = POSTURES.grace[key] ?? [0, 0, 0];
      const tension = POSTURES.tension[key] ?? [0, 0, 0];
      const fall = POSTURES.fall[key] ?? [0, 0, 0];

      const x =
        grace[0] * state.grace +
        tension[0] * state.tension +
        fall[0] * state.fall;
      const y =
        grace[1] * state.grace +
        tension[1] * state.tension +
        fall[1] * state.fall;
      const z =
        grace[2] * state.grace +
        tension[2] * state.tension +
        fall[2] * state.fall;

      const breathOffset =
        key === "spine2"
          ? breathing
          : key === "spine1"
            ? breathing * 0.48
            : key === "neck"
              ? -breathing * 0.14
              : 0;

      const gazeX =
        key === "head"
          ? attentionPitch
          : key === "neck"
            ? attentionPitch * 0.3
            : 0;
      const gazeY =
        key === "head"
          ? attentionYaw
          : key === "neck"
            ? attentionYaw * 0.24
            : 0;

      const posture = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(x + breathOffset + gazeX, y + gazeY, z, "XYZ"),
      );

      bone.quaternion.copy(base.quaternion).multiply(posture);
      bone.scale.copy(base.scale);
    }

    for (const fingerBone of fitted.fingerBones) {
      const segmentWeight =
        fingerBone.segment === 1 ? 0.52 : fingerBone.segment === 2 ? 0.82 : 1;

      const fingerBias =
        fingerBone.finger === "Thumb"
          ? 0.58
          : fingerBone.finger === "Index"
            ? 0.82
            : fingerBone.finger === "Middle"
              ? 1
              : fingerBone.finger === "Ring"
                ? 0.94
                : 0.86;

      const idleSearch =
        Math.sin(t * 0.74 + fingerBone.phase) *
        state.grace *
        presence *
        0.022;

      const curl =
        idleSearch +
        segmentWeight *
          fingerBias *
          (
            state.tension * 0.16 +
            state.fall * 0.29 +
            presence * 0.018 +
            impulseRef.current * 0.11
          );

      const curlQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(curl, 0, 0, "XYZ"),
      );

      fingerBone.bone.quaternion
        .copy(fingerBone.bind)
        .multiply(curlQuaternion);
    }
  });

  return (
    <group
      ref={motionRef}
      onPointerDown={(event) => {
        event.stopPropagation();
        impulseRef.current = 1;
        triggerSeraraBurst();
        void sonic.wake();
        sonic.burst();
      }}
    >
      <group scale={fitted.scale}>
        <primitive object={fitted.scene} position={fitted.offset} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
