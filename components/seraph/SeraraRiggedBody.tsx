"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const MODEL_URL = "/assets/serara-human.glb";
const TARGET_HEIGHT = 3.65;

export default function SeraraRiggedBody() {
  const motionRef = useRef<THREE.Group>(null);
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

    return {
      scene: cloned,
      scale,
      offset: new THREE.Vector3(-center.x, -center.y, -center.z),
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
    action.setEffectiveTimeScale(0.72);
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
    const targetYaw = pointer.x * 0.05 + Math.sin(t * 0.11) * 0.008;

    motion.rotation.y = THREE.MathUtils.lerp(
      motion.rotation.y,
      targetYaw,
      Math.min(1, delta * 1.2),
    );

    motion.rotation.z = THREE.MathUtils.lerp(
      motion.rotation.z,
      -pointer.x * 0.004 + Math.sin(t * 0.17) * 0.0025,
      Math.min(1, delta * 0.8),
    );
  });

  return (
    <group ref={motionRef}>
      <group scale={fitted.scale}>
        <primitive object={fitted.scene} position={fitted.offset} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
