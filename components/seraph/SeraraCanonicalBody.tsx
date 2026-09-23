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
import {
  createSeraraPresenceMind,
  updateSeraraPresenceMind,
  type SeraraPresenceMind,
} from "./serara-presence-memory";
import {
  getSeraraPerceptionSnapshot,
  isSeraraCameraPerceptionLive,
  type SeraraPerceptionSnapshot,
} from "./serara-perception";
import { updateSeraraPerformance } from "./serara-performance";

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

type CanonicalMutableRuntime = {
  bones: RigBones;
  bind: Partial<Record<BoneKey, BoneBind>>;
  materialSignals: ReturnType<typeof createSeraraMaterialSignals>;
  buckets: MaterialBuckets;
  morphMeshes: THREE.Mesh[];
  fingerBones: FingerBone[];
};

const runtimeByScene = new WeakMap<THREE.Object3D, CanonicalMutableRuntime>();

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
      color: "#120807",
      roughness: 0.13,
      metalness: 0.04,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
      emissive: "#c86f43",
      emissiveIntensity: 0.48,
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
  mind: SeraraPresenceMind,
  perception: SeraraPerceptionSnapshot,
  cameraLive: boolean,
  delta: number,
) {
  const socialWarmth = cameraLive
    ? perception.smile * mind.recognition
    : 0;

  const targets: Record<(typeof MORPH_TARGETS)[number], number> = {
    FACE_RELAXED: THREE.MathUtils.clamp(
      state.grace * 0.28 +
        mind.recognition * 0.11 +
        socialWarmth * 0.085,
      0,
      0.46,
    ),
    FACE_TENSION: THREE.MathUtils.clamp(
      state.tension * 0.72 + mind.avoidance * 0.1,
      0,
      0.82,
    ),
    FACE_FALL: state.fall * 0.78,
    EYES_NARROW: THREE.MathUtils.clamp(
      state.tension * 0.34 +
        state.fall * 0.64 +
        presence * state.grace * 0.055 +
        mind.avoidance * 0.2 -
        mind.recognition * 0.06 -
        socialWarmth * 0.045,
      0,
      0.88,
    ),
    MOUTH_SEAM_OPEN: THREE.MathUtils.clamp(
      state.tension * 0.035 +
        state.fall * 0.13 +
        presence * state.grace * 0.012 +
        mind.avoidance * 0.025 -
        mind.recognition * 0.01,
      0,
      0.18,
    ),
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

function buildCanonicalRuntime(scene: THREE.Object3D) {
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

    runtimeByScene.set(cloned, {
      bones,
      bind,
      materialSignals,
      buckets,
      morphMeshes,
      fingerBones,
    });

    return {
      scene: cloned,
      scale,
      offset: new THREE.Vector3(-center.x, -center.y, -center.z),
    };

}

export default function SeraraCanonicalBody() {
  const motionRef = useRef<THREE.Group>(null);
  const attentionRef = useRef(new THREE.Vector2());
  const attentionTargetRef = useRef(new THREE.Vector2());
  const presenceRef = useRef(0);
  const impulseRef = useRef(0);
  const lastPointerRef = useRef(new THREE.Vector2());
  const gestureEnergyRef = useRef(0);
  const presenceMindRef = useRef(createSeraraPresenceMind());
  const proofModeRef = useRef<boolean | null>(null);
  const proofClockModeRef = useRef<boolean | null>(null);
  const proofStartedAtRef = useRef<number | null>(null);
  const proofPointerRef = useRef(new THREE.Vector2());
  const cameraPointerRef = useRef(new THREE.Vector2());
  const sonic = useMemo(() => createSeraraSonic(), []);
  const { scene } = useGLTF(MODEL_URL);

  const fitted = useMemo(() => buildCanonicalRuntime(scene), [scene]);

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



  useFrame(({ clock, pointer }, delta) => {
    const motion = motionRef.current;
    const current = runtimeByScene.get(fitted.scene);
    if (!motion || !current) return;

    const t = clock.elapsedTime;
    let state = getSeraraState(t);

    if (proofModeRef.current === null || proofClockModeRef.current === null) {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;

      proofModeRef.current = params?.has("presenceProof") ?? false;
      proofClockModeRef.current =
        proofModeRef.current ||
        (params?.has("perceptionProof") ?? false) ||
        (params?.has("performanceProof") ?? false);
    }

    if (proofClockModeRef.current && proofStartedAtRef.current === null) {
      proofStartedAtRef.current = t;
    }

    const proofTime =
      proofClockModeRef.current && proofStartedAtRef.current !== null
        ? Math.max(0, t - proofStartedAtRef.current)
        : t;

    let effectivePointer = proofModeRef.current
      ? proofPointerRef.current
      : pointer;

    if (proofModeRef.current) {
      if (proofTime < 1.4) {
        const x = THREE.MathUtils.smoothstep(proofTime, 0.08, 1.32);
        effectivePointer.set(
          THREE.MathUtils.lerp(-0.88, 0.12, x),
          Math.sin(proofTime * 10) * 0.16,
        );
      } else if (proofTime < 9) {
        effectivePointer.set(0.12, 0.06);
      } else {
        const departure = THREE.MathUtils.smoothstep(
          proofTime,
          9,
          10,
        );
        effectivePointer.set(
          THREE.MathUtils.lerp(0.12, 0.94, departure),
          THREE.MathUtils.lerp(0.06, 0.72, departure),
        );
      }
    }

    const perception = getSeraraPerceptionSnapshot();
    const cameraSensorActive =
      !proofModeRef.current && perception.status === "active";
    const cameraLive =
      cameraSensorActive &&
      isSeraraCameraPerceptionLive(perception);

    if (cameraSensorActive) {
      cameraPointerRef.current.set(
        perception.focusX,
        perception.focusY,
      );
      effectivePointer = cameraPointerRef.current;
    }

    const pointerDelta = Math.hypot(
      effectivePointer.x - lastPointerRef.current.x,
      effectivePointer.y - lastPointerRef.current.y,
    );
    lastPointerRef.current.copy(effectivePointer);
    gestureEnergyRef.current = THREE.MathUtils.lerp(
      gestureEnergyRef.current,
      THREE.MathUtils.clamp(pointerDelta * 22, 0, 1),
      Math.min(1, delta * 8.5),
    );

    impulseRef.current = THREE.MathUtils.lerp(
      impulseRef.current,
      0,
      Math.min(1, delta * 3.2),
    );

    const interactionEnergy = cameraSensorActive
      ? cameraLive
        ? perception.motionEnergy
        : 0
      : gestureEnergyRef.current;

    const sensedPresence = cameraSensorActive
      ? cameraLive
        ? perception.confidence * 0.18 + perception.proximity * 0.82
        : 0
      : getSeraraPresence(effectivePointer);

    const rawPresence = THREE.MathUtils.clamp(
      sensedPresence + impulseRef.current * 0.34,
      0,
      1,
    );

    presenceRef.current = THREE.MathUtils.lerp(
      presenceRef.current,
      rawPresence,
      Math.min(1, delta * 2.8),
    );

    const presence = presenceRef.current;

    const presenceMind = updateSeraraPresenceMind(
      presenceMindRef.current,
      effectivePointer,
      presence,
      interactionEnergy,
      delta,
    );

    const performance = updateSeraraPerformance(
      {
        presence,
        movementEnergy: interactionEnergy,
        touchImpulse: impulseRef.current,
        recognition: presenceMind.recognition,
        stillness: presenceMind.stillness,
        avoidance: presenceMind.avoidance,
        afterimage: presenceMind.afterimage,
        attentionX: presenceMind.attention.x,
        attentionY: presenceMind.attention.y,
      },
      delta,
      t,
    );

    state = getSeraraState(t);

    const pulse = Math.max(
      getSeraraPulse(t, state),
      impulseRef.current * 0.92,
    );

    sonic.update(
      state,
      presence,
      pulse,
      effectivePointer.x,
      presenceMind,
      perception,
      cameraLive,
    );

    if (
      typeof window !== "undefined" &&
      (
        new URLSearchParams(window.location.search).has("presenceProof") ||
        new URLSearchParams(window.location.search).has("perceptionProof") ||
        new URLSearchParams(window.location.search).has("performanceProof")
      )
    ) {
      (
        window as typeof window & {
          __SERARA_PRESENCE__?: Record<string, number | string>;
        }
      ).__SERARA_PRESENCE__ = {
        proofTime,
        stillness: presenceMind.stillness,
        recognition: presenceMind.recognition,
        avoidance: presenceMind.avoidance,
        afterimage: presenceMind.afterimage,
        attentionX: presenceMind.attention.x,
        attentionY: presenceMind.attention.y,
        cameraLive: cameraLive ? 1 : 0,
        sensorConfidence: perception.confidence,
        sensorProximity: perception.proximity,
        sensorMotion: perception.motionEnergy,
        sensorSmile: perception.smile,
        sensorOpenness: perception.openness,
        sensorHand: perception.handSalience,
        performanceHeat: performance.heat,
        performanceFracture: performance.fracture,
        performanceResidue: performance.residue,
        performanceWorldPresence: performance.worldPresence,
        performancePhase: performance.phase,
        performanceGrace: performance.grace,
        performanceTension: performance.tension,
        performanceFall: performance.fall,
      };
    }

    current.materialSignals.time.value = t;
    current.materialSignals.grace.value = state.grace;
    current.materialSignals.tension.value = state.tension;
    current.materialSignals.fall.value = state.fall;
    current.materialSignals.presence.value = presence;
    current.materialSignals.pulse.value = pulse;

    const stress = THREE.MathUtils.clamp(
      state.tension * 0.55 + state.fall,
      0,
      1,
    );

    for (const material of current.buckets.porcelain) {
      material.roughness = THREE.MathUtils.lerp(0.3, 0.61, stress);
      material.emissiveIntensity =
        0.018 + state.grace * 0.02 + state.tension * 0.035 + state.fall * 0.055;
    }

    for (const material of current.buckets.inner) {
      material.color.set("#281817").lerp(new THREE.Color("#16090a"), state.fall);
      material.emissive.set("#6f3427").lerp(
        new THREE.Color("#d9552d"),
        state.tension * 0.38 + state.fall * 0.78,
      );
      material.emissiveIntensity =
        0.045 + state.tension * 0.12 + state.fall * 0.24;
    }

    for (const material of current.buckets.eyes) {
      const eyeAwake = THREE.MathUtils.clamp(
        0.34 +
          state.grace * 0.12 +
          state.tension * 0.28 +
          state.fall * 0.22 +
          presence * 0.5 +
          pulse * presence * 0.26 +
          presenceMind.recognition * 0.16 +
          presenceMind.afterimage * 0.1 -
          presenceMind.avoidance * 0.06 +
          (cameraLive ? perception.handSalience * 0.09 : 0) +
          (cameraLive
            ? perception.smile * presenceMind.recognition * 0.08
            : 0) +
          impulseRef.current * 0.72,
        0,
        1.8,
      );

      material.color
        .set("#120807")
        .lerp(new THREE.Color("#2b1510"), Math.min(1, eyeAwake * 0.42));
      material.emissive
        .set("#a95335")
        .lerp(new THREE.Color("#f0a06a"), Math.min(1, eyeAwake * 0.72));
      material.emissiveIntensity = 0.44 + eyeAwake * 0.82;
      material.roughness = THREE.MathUtils.lerp(
        0.11,
        0.23,
        state.fall * 0.75,
      );
      material.clearcoat = THREE.MathUtils.lerp(
        0.76,
        0.58,
        state.fall,
      );
    }

    for (const material of current.buckets.cavity) {
      material.emissiveIntensity =
        0.02 + state.tension * 0.07 + state.fall * 0.16;
    }

    for (const material of current.buckets.signal) {
      material.emissiveIntensity =
        0.3 +
        state.grace * 0.18 +
        state.tension * 0.56 +
        state.fall * 1.1 +
        presence * (0.22 + pulse * 0.42) +
        (cameraLive
          ? perception.openness * presenceMind.recognition * 0.16
          : 0);
      material.opacity =
        0.54 +
        state.grace * 0.1 +
        state.tension * 0.08 +
        state.fall * 0.16 +
        presence * 0.08;
    }

    updateMorphs(
      current.morphMeshes,
      state,
      presence,
      presenceMind,
      perception,
      cameraLive,
      delta,
    );

    attentionTargetRef.current.copy(presenceMind.attention);
    attentionRef.current.lerp(
      attentionTargetRef.current,
      Math.min(
        1,
        delta *
          (0.38 +
            presenceMind.recognition * 0.62 +
            state.tension * 0.18),
      ),
    );

    const awareness = THREE.MathUtils.clamp(
      0.24 +
        presence * 0.42 +
        presenceMind.afterimage * 0.26 +
        presenceMind.recognition * 0.16,
      0,
      1.08,
    );
    const microSaccade =
      Math.sin(t * 1.73) *
      Math.sin(t * 0.41 + 0.8) *
      0.0075 *
      awareness *
      (1 - presenceMind.stillness * 0.88);
    const attentionYaw =
      attentionRef.current.x *
        (0.118 - state.fall * 0.026) *
        awareness +
      Math.sin(t * 0.17) * 0.011 * (1 - presenceMind.stillness * 0.7) +
      microSaccade -
      effectivePointer.x * presenceMind.avoidance * 0.038;
    const attentionPitch =
      -attentionRef.current.y * 0.064 * awareness +
      Math.sin(t * 0.13 + 0.6) *
        0.007 *
        (1 - presenceMind.stillness * 0.72) +
      Math.cos(t * 1.31) *
        0.0035 *
        awareness *
        (1 - presenceMind.stillness * 0.82) +
      effectivePointer.y * presenceMind.avoidance * 0.016;

    const targetYaw =
      presenceMind.attention.x *
        (0.026 + presenceMind.afterimage * 0.026) +
      Math.sin(t * 0.11) *
        0.006 *
        (1 - presenceMind.stillness * 0.78) -
      effectivePointer.x * presenceMind.avoidance * 0.018 -
      state.fall * 0.04;

    motion.rotation.y = THREE.MathUtils.lerp(
      motion.rotation.y,
      targetYaw,
      Math.min(1, delta * 1.02),
    );

    motion.position.x = THREE.MathUtils.lerp(
      motion.position.x,
      presenceMind.attention.x *
          (presence * 0.018 + presenceMind.afterimage * 0.014) +
        Math.sin(t * 0.23) *
          0.006 *
          (1 - presenceMind.stillness * 0.82),
      Math.min(1, delta * 1.6),
    );

    motion.position.y = THREE.MathUtils.lerp(
      motion.position.y,
      -presenceMind.attention.y *
          (presence * 0.007 + presenceMind.afterimage * 0.006) +
        Math.sin(t * 0.39 + 0.8) *
          0.004 *
          (1 - presenceMind.stillness * 0.8),
      Math.min(1, delta * 1.25),
    );

    motion.position.z = THREE.MathUtils.lerp(
      motion.position.z,
      -impulseRef.current * 0.072 -
        interactionEnergy * presence * 0.008 +
        presenceMind.recognition * 0.012 -
        presenceMind.avoidance * 0.018,
      Math.min(1, delta * 7),
    );

    motion.rotation.x = THREE.MathUtils.lerp(
      motion.rotation.x,
      -presenceMind.attention.y *
          (presence * 0.007 + presenceMind.afterimage * 0.008) +
        state.fall * 0.012 +
        presenceMind.avoidance * 0.006,
      Math.min(1, delta * 1.2),
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
      -presenceMind.attention.x * 0.003 +
        Math.sin(t * 0.17) *
          0.0015 *
          (1 - presenceMind.stillness * 0.76) +
        state.tension * 0.012 +
        state.fall * 0.04 +
        (cameraLive
          ? perception.headRoll * presenceMind.recognition * 0.012
          : 0),
      Math.min(1, delta * 0.78),
    );

    const breathing =
      Math.sin(t * (0.86 + state.tension * 0.62)) *
      (0.007 + state.grace * 0.0045) *
      (1 - presenceMind.stillness * 0.38) *
      (1 +
        (cameraLive
          ? perception.smile * presenceMind.recognition * 0.12
          : 0));

    const semanticOpenness = cameraLive
      ? perception.openness * presenceMind.recognition
      : 0;
    const semanticAsymmetry = cameraLive
      ? perception.shoulderAsymmetry *
        (0.35 + presenceMind.recognition * 0.65)
      : 0;
    const semanticHand = cameraLive
      ? perception.handSalience * presenceMind.recognition
      : 0;

    const keys = Object.keys(BONE_NAMES) as BoneKey[];

    for (const key of keys) {
      const bone = current.bones[key];
      const base = current.bind[key];
      if (!bone || !base) continue;

      const grace = POSTURES.grace[key] ?? [0, 0, 0];
      const tension = POSTURES.tension[key] ?? [0, 0, 0];
      const fall = POSTURES.fall[key] ?? [0, 0, 0];

      let x =
        grace[0] * state.grace +
        tension[0] * state.tension +
        fall[0] * state.fall;
      let y =
        grace[1] * state.grace +
        tension[1] * state.tension +
        fall[1] * state.fall;
      let z =
        grace[2] * state.grace +
        tension[2] * state.tension +
        fall[2] * state.fall;

      const interactiveWeight =
        Math.max(
          presence * 0.42,
          presenceMind.afterimage * 0.28,
        ) *
        (0.56 + interactionEnergy * 0.3) *
        (1 - presenceMind.stillness * 0.18);
      const side = attentionRef.current.x;
      const vertical = attentionRef.current.y;
      const softWave =
        Math.sin(t * 0.46) *
        (0.004 + state.grace * 0.003) *
        (1 - presenceMind.stillness * 0.86);

      if (key === "hips") {
        y += side * interactiveWeight * 0.014 + softWave * 0.45;
        z += -side * interactiveWeight * 0.009;
      } else if (key === "spine") {
        x += -vertical * interactiveWeight * 0.008;
        y += side * interactiveWeight * 0.014 + softWave * 0.55;
      } else if (key === "spine1") {
        x += -vertical * interactiveWeight * 0.014;
        y += side * interactiveWeight * 0.022 - softWave * 0.5;
        z += side * interactiveWeight * 0.006;
      } else if (key === "spine2") {
        x +=
          -vertical * interactiveWeight * 0.022 -
          semanticOpenness * 0.014;
        y +=
          side * interactiveWeight * 0.028 +
          softWave +
          semanticAsymmetry * 0.008;
        z += side * interactiveWeight * 0.009;
      } else if (key === "leftShoulder") {
        x +=
          -vertical * interactiveWeight * 0.012 +
          semanticAsymmetry * 0.012;
        z +=
          side * interactiveWeight * 0.018 +
          interactionEnergy * 0.008 -
          semanticOpenness * 0.018;
      } else if (key === "rightShoulder") {
        x +=
          -vertical * interactiveWeight * 0.012 -
          semanticAsymmetry * 0.012;
        z +=
          side * interactiveWeight * 0.018 -
          interactionEnergy * 0.008 +
          semanticOpenness * 0.018;
      } else if (key === "leftArm") {
        x +=
          Math.sin(t * 0.58 + 0.4) *
          0.006 *
          (1 - presenceMind.stillness * 0.84);
        z += side * interactiveWeight * 0.012;
      } else if (key === "rightArm") {
        x +=
          Math.sin(t * 0.58 + 1.2) *
          0.006 *
          (1 - presenceMind.stillness * 0.84);
        z += side * interactiveWeight * 0.012;
      } else if (key === "leftForeArm" || key === "rightForeArm") {
        x +=
          Math.sin(t * 0.72 + (key === "leftForeArm" ? 0.2 : 1.7)) *
          0.005 *
          (1 - presenceMind.stillness * 0.86);
        y +=
          side * interactiveWeight * 0.006 +
          (key === "leftForeArm"
            ? perception.leftHandRaised
            : -perception.rightHandRaised) *
            semanticHand *
            0.008;
      } else if (key === "leftHand" || key === "rightHand") {
        y += side * interactiveWeight * 0.008;
        z +=
          Math.sin(t * 0.83 + (key === "leftHand" ? 0.5 : 2.1)) *
          0.006 *
          (1 - presenceMind.stillness * 0.88);
      } else if (key === "leftUpLeg") {
        y += side * interactiveWeight * 0.006;
        z += -side * interactiveWeight * 0.008;
      } else if (key === "rightUpLeg") {
        y += side * interactiveWeight * 0.006;
        z += side * interactiveWeight * 0.008;
      }

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

    for (const fingerBone of current.fingerBones) {
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
        (0.006 + state.grace * 0.009 + presence * 0.012) *
        (1 - presenceMind.stillness * 0.9);

      const curl =
        idleSearch +
        segmentWeight *
          fingerBias *
          (
            state.tension * 0.16 +
            state.fall * 0.29 +
            presence * 0.018 +
            impulseRef.current * 0.11 -
            presenceMind.recognition * 0.016 -
            semanticHand * 0.018
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
