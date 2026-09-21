"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const MODEL_URL = "/assets/serara-human.glb";
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

const POSTURES: Record<SeraraPosture, PostureOffsets> = {
  grace: {
    hips: [-0.015, 0, 0],
    spine: [-0.035, 0, 0],
    spine1: [-0.045, 0, 0],
    spine2: [-0.07, 0, 0],
    neck: [0.03, 0, 0],
    head: [0.018, 0, 0],
    leftShoulder: [0, 0.02, -0.07],
    rightShoulder: [0, -0.02, 0.07],
    leftArm: [0, 0, -0.055],
    rightArm: [0, 0, 0.055],
  },
  tension: {
    hips: [0.02, 0, -0.04],
    spine: [0.045, 0.005, -0.055],
    spine1: [0.07, -0.01, -0.075],
    spine2: [0.055, 0.018, -0.095],
    neck: [-0.018, 0.035, 0.052],
    head: [0.025, -0.03, 0.065],
    leftShoulder: [0.045, 0.035, 0.125],
    rightShoulder: [-0.02, -0.025, -0.085],
    leftArm: [0.045, 0.012, 0.075],
    rightArm: [-0.03, 0, -0.055],
    leftForeArm: [0.05, 0, 0.04],
    rightForeArm: [0.02, 0, -0.03],
    leftUpLeg: [0.02, 0, 0.025],
    rightUpLeg: [-0.012, 0, -0.03],
  },
  fall: {
    hips: [0.15, 0.03, -0.085],
    spine: [0.17, 0, -0.055],
    spine1: [0.21, 0.018, -0.075],
    spine2: [0.23, -0.025, -0.105],
    neck: [0.18, 0.04, 0.055],
    head: [0.2, -0.04, 0.09],
    leftShoulder: [0.085, 0.04, 0.16],
    rightShoulder: [0.065, -0.03, -0.135],
    leftArm: [0.07, 0.018, 0.095],
    rightArm: [0.052, -0.012, -0.08],
    leftForeArm: [0.12, 0, 0.065],
    rightForeArm: [0.095, 0, -0.052],
    leftUpLeg: [0.13, 0, 0.03],
    rightUpLeg: [0.095, 0, -0.025],
    leftLeg: [-0.14, 0, 0],
    rightLeg: [-0.105, 0, 0],
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

const IDENTITY_SCALE: Partial<Record<BoneKey, [number, number, number]>> = {
  hips: [0.9, 1, 0.94],
  spine: [0.9, 1.03, 0.94],
  spine1: [0.88, 1.04, 0.93],
  spine2: [0.9, 1.04, 0.93],
  neck: [0.88, 1.18, 0.88],
  head: [0.88, 1.09, 0.9],
  leftShoulder: [0.94, 1.04, 0.94],
  rightShoulder: [0.94, 1.04, 0.94],
  leftArm: [0.9, 1.08, 0.9],
  rightArm: [0.9, 1.08, 0.9],
  leftForeArm: [0.88, 1.1, 0.88],
  rightForeArm: [0.88, 1.1, 0.88],
  leftHand: [0.86, 1.1, 0.86],
  rightHand: [0.86, 1.1, 0.86],
  leftUpLeg: [0.92, 1.05, 0.92],
  rightUpLeg: [0.92, 1.05, 0.92],
  leftLeg: [0.9, 1.07, 0.9],
  rightLeg: [0.9, 1.07, 0.9],
};

function smoothStep(edge0: number, edge1: number, value: number) {
  const x = THREE.MathUtils.clamp(
    (value - edge0) / Math.max(0.0001, edge1 - edge0),
    0,
    1,
  );
  return x * x * (3 - 2 * x);
}

function stateFromCycle(time: number) {
  const cycle = time % 30;

  if (cycle < 8) {
    return { grace: 1, tension: 0, fall: 0 };
  }

  if (cycle < 12) {
    const x = smoothStep(8, 12, cycle);
    return { grace: 1 - x, tension: x, fall: 0 };
  }

  if (cycle < 18) {
    return { grace: 0, tension: 1, fall: 0 };
  }

  if (cycle < 23) {
    const x = smoothStep(18, 23, cycle);
    return { grace: 0, tension: 1 - x, fall: x };
  }

  if (cycle < 27) {
    return { grace: 0, tension: 0, fall: 1 };
  }

  const x = smoothStep(27, 30, cycle);
  return { grace: x, tension: 0, fall: 1 - x };
}

export default function SeraraRiggedBody() {
  const motionRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);

  const fitted = useMemo(() => {
    const cloned = clone(scene);

    const porcelain = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#e4ddd2"),
      roughness: 0.38,
      metalness: 0.008,
      clearcoat: 0.2,
      clearcoatRoughness: 0.7,
      emissive: new THREE.Color("#8d5f44"),
      emissiveIntensity: 0.028,
    });

    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = true;
      object.receiveShadow = true;

      if (Array.isArray(object.material)) {
        object.material = object.material.map(() => porcelain.clone());
      } else {
        object.material = porcelain.clone();
      }
    });

    cloned.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const safeHeight = Math.max(size.y, 0.001);
    const scale = TARGET_HEIGHT / safeHeight;

    const bones: RigBones = {};
    const bind = {} as Record<BoneKey, BoneBind>;

    (Object.keys(BONE_NAMES) as BoneKey[]).forEach((key) => {
      const object = cloned.getObjectByName(BONE_NAMES[key]);
      if (!(object instanceof THREE.Bone)) return;

      bones[key] = object;
      bind[key] = {
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
      };
    });

    return {
      scene: cloned,
      scale,
      offset: new THREE.Vector3(-center.x, -center.y, -center.z),
      bones,
      bind,
    };
  }, [scene]);

  useFrame(({ clock, pointer }, delta) => {
    const motion = motionRef.current;
    if (!motion) return;

    const t = clock.elapsedTime;
    const state = stateFromCycle(t);

    const targetYaw =
      pointer.x * 0.032 +
      Math.sin(t * 0.11) * 0.005 -
      state.fall * 0.05;

    motion.rotation.y = THREE.MathUtils.lerp(
      motion.rotation.y,
      targetYaw,
      Math.min(1, delta * 1.05),
    );

    motion.rotation.z = THREE.MathUtils.lerp(
      motion.rotation.z,
      -pointer.x * 0.0025 +
        Math.sin(t * 0.17) * 0.0018 +
        state.tension * 0.015 +
        state.fall * 0.05,
      Math.min(1, delta * 0.8),
    );

    const breathing =
      Math.sin(t * (0.9 + state.tension * 0.65)) *
      (0.008 + state.grace * 0.005);

    const keys = Object.keys(BONE_NAMES) as BoneKey[];

    for (const key of keys) {
      const bone = fitted.bones[key];
      const base = fitted.bind[key];
      if (!bone || !base) continue;

      const g = POSTURES.grace[key] ?? [0, 0, 0];
      const n = POSTURES.tension[key] ?? [0, 0, 0];
      const f = POSTURES.fall[key] ?? [0, 0, 0];

      const x =
        g[0] * state.grace +
        n[0] * state.tension +
        f[0] * state.fall;
      const y =
        g[1] * state.grace +
        n[1] * state.tension +
        f[1] * state.fall;
      const z =
        g[2] * state.grace +
        n[2] * state.tension +
        f[2] * state.fall;

      const breathOffset =
        key === "spine2"
          ? breathing
          : key === "spine1"
            ? breathing * 0.5
            : key === "neck"
              ? -breathing * 0.15
              : 0;

      const posture = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(x + breathOffset, y, z, "XYZ"),
      );

      bone.quaternion.copy(base.quaternion).multiply(posture);

      const identity = IDENTITY_SCALE[key] ?? [1, 1, 1];
      bone.scale.set(
        base.scale.x * identity[0],
        base.scale.y * identity[1],
        base.scale.z * identity[2],
      );
    }
  });

  return (
    <group ref={motionRef}>
      <group scale={[fitted.scale * 0.88, fitted.scale, fitted.scale * 0.9]}>
        <primitive object={fitted.scene} position={fitted.offset} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
