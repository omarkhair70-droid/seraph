"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const MODEL_URL = "/assets/serara-human.glb";

export default function SeraraRiggedBody() {
  const rootRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);

  const body = useMemo(() => {
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

    return cloned;
  }, [scene]);

  const { actions } = useAnimations(animations, rootRef);

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
    action.setEffectiveTimeScale(0.72);
    action.play();

    return () => {
      action.fadeOut(0.25);
      action.stop();
    };
  }, [actions]);

  useFrame(({ clock, pointer }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    const t = clock.elapsedTime;

    const targetYaw = pointer.x * 0.055 + Math.sin(t * 0.11) * 0.009;
    root.rotation.y = THREE.MathUtils.lerp(
      root.rotation.y,
      targetYaw,
      Math.min(1, delta * 1.25),
    );

    root.rotation.z = THREE.MathUtils.lerp(
      root.rotation.z,
      -pointer.x * 0.006 + Math.sin(t * 0.17) * 0.003,
      Math.min(1, delta * 0.8),
    );

    const breath = 1 + Math.sin(t * 1.08) * 0.0025;
    root.scale.setScalar(0.64 * breath);
  });

  return (
    <group ref={rootRef} position={[0, 0.55, 0]} scale={0.64}>
      <primitive object={body} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
