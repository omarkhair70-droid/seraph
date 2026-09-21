"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useEffect, useMemo, useRef, useState } from "react";
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
  leftUpLeg?: THREE.Bone;
  rightUpLeg?: THREE.Bone;
  leftLeg?: THREE.Bone;
  rightLeg?: THREE.Bone;
};

type PostureOffsets = {
  [K in keyof RigBones]?: [number, number, number];
};

const POSTURES: Record<SeraraPosture, PostureOffsets> = {
  grace: {
    hips: [-0.015, 0, 0],
    spine: [-0.035, 0, 0],
    spine1: [-0.045, 0, 0],
    spine2: [-0.055, 0, 0],
    neck: [0.025, 0, 0],
    head: [0.018, 0, 0],
    leftShoulder: [0, 0.02, -0.055],
    rightShoulder: [0, -0.02, 0.055],
    leftArm: [0, 0, -0.045],
    rightArm: [0, 0, 0.045],
  },
  tension: {
    hips: [0.015, 0, -0.035],
    spine: [0.035, 0.005, -0.05],
    spine1: [0.055, -0.01, -0.07],
    spine2: [0.035, 0.015, -0.085],
    neck: [-0.015, 0.03, 0.045],
    head: [0.02, -0.025, 0.06],
    leftShoulder: [0.035, 0.03, 0.11],
    rightShoulder: [-0.015, -0.02, -0.075],
    leftArm: [0.04, 0.01, 0.065],
    rightArm: [-0.025, 0, -0.045],
    leftForeArm: [0.04, 0, 0.035],
    rightForeArm: [0.015, 0, -0.025],
    leftUpLeg: [0.015, 0, 0.02],
    rightUpLeg: [-0.01, 0, -0.025],
  },
  fall: {
    hips: [0.13, 0.025, -0.07],
    spine: [0.14, 0, -0.045],
    spine1: [0.17, 0.015, -0.06],
    spine2: [0.19, -0.02, -0.085],
    neck: [0.15, 0.035, 0.045],
    head: [0.17, -0.035, 0.075],
    leftShoulder: [0.07, 0.035, 0.14],
    rightShoulder: [0.055, -0.025, -0.12],
    leftArm: [0.055, 0.015, 0.08],
    rightArm: [0.04, -0.01, -0.07],
    leftForeArm: [0.1, 0, 0.055],
    rightForeArm: [0.08, 0, -0.045],
    leftUpLeg: [0.11, 0, 0.025],
    rightUpLeg: [0.08, 0, -0.02],
    leftLeg: [-0.12, 0, 0],
    rightLeg: [-0.09, 0, 0],
  },
};

const BONE_NAMES: Record<keyof RigBones, string> = {
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
  leftUpLeg: "LeftUpLeg",
  rightUpLeg: "RightUpLeg",
  leftLeg: "LeftLeg",
  rightLeg: "RightLeg",
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
    return { label: "grace" as const, grace: 1, tension: 0, fall: 0 };
  }

  if (cycle < 12) {
    const x = smoothStep(8, 12, cycle);
    return {
      label: "tension" as const,
      grace: 1 - x,
      tension: x,
      fall: 0,
    };
  }

  if (cycle < 18) {
    return { label: "tension" as const, grace: 0, tension: 1, fall: 0 };
  }

  if (cycle < 23) {
    const x = smoothStep(18, 23, cycle);
    return {
      label: "fall" as const,
      grace: 0,
      tension: 1 - x,
      fall: x,
    };
  }

  if (cycle < 27) {
    return { label: "fall" as const, grace: 0, tension: 0, fall: 1 };
  }

  const x = smoothStep(27, 30, cycle);
  return {
    label: "grace" as const,
    grace: x,
    tension: 0,
    fall: 1 - x,
  };
}

export default function SeraraRiggedBody() {
  const motionRef = useRef<THREE.Group>(null);
  const [postureLabel, setPostureLabel] = useState<SeraraPosture>("grace");
  const { scene, animations } = useGLTF(MODEL_URL);

  const fitted = useMemo(() => {
    const cloned = clone(scene);

    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = true;
      object.receiveShadow = true;

      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#d8d0c5"),
        roughness: 0.54,
        metalness: 0.015,
        clearcoat: 0.1,
        clearcoatRoughness: 0.78,
        emissive: new THREE.Color("#7f543d"),
        emissiveIntensity: 0.035,
      });

      if (Array.isArray(object.material)) {
        object.material = object.material.map(() => material.clone());
      } else {
        object.material = material;
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
    (Object.keys(BONE_NAMES) as Array<keyof RigBones>).forEach((key) => {
      const object = cloned.getObjectByName(BONE_NAMES[key]);
      if (object instanceof THREE.Bone) bones[key] = object;
    });

    return {
      scene: cloned,
      scale,
      offset: new THREE.Vector3(-center.x, -center.y, -center.z),
      bones,
    };
  }, [scene]);

  const { actions } = useAnimations(animations, motionRef);

  useEffect(() => {
    const entries = Object.entries(actions);
    const idle =
      entries.find(([name]) => name.toLowerCase().includes("idle")) ??
      entries.find(([name]) => name.toLowerCase().includes("stand"));

    if (!idle) return;

    const action = idle[1];
    if (!action) return;

    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.fadeIn(0.6);
    action.setEffectiveTimeScale(0.56);
    action.setEffectiveWeight(1);
    action.play();

    return () => {
      action.fadeOut(0.25);
      action.stop();
    };
  }, [actions]);

  useFrame(({ clock, pointer }, delta) => {
    const motion = motionRef.current;
    if (!motion) return;

    const t = clock.elapsedTime;
    const state = stateFromCycle(t);

    if (state.label !== postureLabel) {
      setPostureLabel(state.label);
    }

    const targetYaw =
      pointer.x * 0.035 +
      Math.sin(t * 0.11) * 0.006 -
      state.fall * 0.055;

    motion.rotation.y = THREE.MathUtils.lerp(
      motion.rotation.y,
      targetYaw,
      Math.min(1, delta * 1.15),
    );

    motion.rotation.z = THREE.MathUtils.lerp(
      motion.rotation.z,
      -pointer.x * 0.003 +
        Math.sin(t * 0.17) * 0.002 +
        state.tension * 0.018 +
        state.fall * 0.055,
      Math.min(1, delta * 0.85),
    );

    const breathing =
      Math.sin(t * (1.05 + state.tension * 0.55)) *
      (0.006 + state.grace * 0.004);

    const keys = Object.keys(BONE_NAMES) as Array<keyof RigBones>;

    for (const key of keys) {
      const bone = fitted.bones[key];
      if (!bone) continue;

      const g = POSTURES.grace[key] ?? [0, 0, 0];
      const n = POSTURES.tension[key] ?? [0, 0, 0];
      const f = POSTURES.fall[key] ?? [0, 0, 0];

      const x = g[0] * state.grace + n[0] * state.tension + f[0] * state.fall;
      const y = g[1] * state.grace + n[1] * state.tension + f[1] * state.fall;
      const z = g[2] * state.grace + n[2] * state.tension + f[2] * state.fall;

      const breathOffset =
        key === "spine2"
          ? breathing
          : key === "spine1"
            ? breathing * 0.55
            : 0;

      const offset = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(x + breathOffset, y, z, "XYZ"),
      );

      bone.quaternion.multiply(offset);
    }
  });

  return (
    <>
      <group ref={motionRef}>
        <group scale={fitted.scale}>
          <primitive object={fitted.scene} position={fitted.offset} />
        </group>
      </group>

      <group position={[0, 2.03, 0]}>
        <mesh visible={false}>
          <planeGeometry args={[0.01, 0.01]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      <div data-serara-posture={postureLabel} style={{ display: "none" }} />
    </>
  );
}

useGLTF.preload(MODEL_URL);
