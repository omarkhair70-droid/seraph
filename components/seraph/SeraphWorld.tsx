"use client";

import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import SeraraCanonicalBody from "./SeraraCanonicalBody";
import {
  getSeraraPresence,
  getSeraraPulse,
  getSeraraState,
} from "./serara-state";

function LivingCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(({ clock, pointer }, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const state = getSeraraState(clock.elapsedTime);
    const presence = getSeraraPresence(pointer);
    const alpha = Math.min(1, delta * 1.35);

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      pointer.x * 0.075 * presence,
      alpha,
    );

    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      0.05 + pointer.y * 0.028 * presence - state.fall * 0.055,
      alpha,
    );

    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      7.45 - state.tension * 0.1 - state.fall * 0.2 - presence * 0.055,
      alpha,
    );

    const targetFov =
      34 -
      state.tension * 0.65 -
      state.fall * 0.9 -
      presence * 0.25;

    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, alpha);
    camera.updateProjectionMatrix();
    camera.lookAt(0, -0.015 - state.fall * 0.035, 0);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 0.05, 7.45]}
      fov={34}
    />
  );
}

function ReactiveChamberField() {
  const crownRef = useRef<THREE.SpotLight>(null);
  const bloodRimRef = useRef<THREE.PointLight>(null);
  const innerRef = useRef<THREE.PointLight>(null);
  const floorMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    const state = getSeraraState(t);
    const presence = getSeraraPresence(pointer);
    const pulse = getSeraraPulse(t, state);
    const alpha = Math.min(1, delta * 2.1);

    if (crownRef.current) {
      const target =
        42 -
        state.tension * 7 -
        state.fall * 14 +
        presence * (2 + pulse * 3);

      crownRef.current.intensity = THREE.MathUtils.lerp(
        crownRef.current.intensity,
        target,
        alpha,
      );

      crownRef.current.position.x =
        Math.sin(t * 0.11) * 0.12 +
        pointer.x * presence * 0.08;
    }

    if (bloodRimRef.current) {
      const target =
        7 +
        state.tension * 4 +
        state.fall * 7 +
        presence * pulse * 2.5;

      bloodRimRef.current.intensity = THREE.MathUtils.lerp(
        bloodRimRef.current.intensity,
        target,
        alpha,
      );
    }

    if (innerRef.current) {
      const target =
        2.4 +
        state.grace * 1.2 +
        state.tension * 4.8 +
        state.fall * 8.5 +
        presence * (2.4 + pulse * 5.2);

      innerRef.current.intensity = THREE.MathUtils.lerp(
        innerRef.current.intensity,
        target,
        Math.min(1, delta * 3.6),
      );

      innerRef.current.position.y =
        0.45 + Math.sin(t * 0.73) * 0.08;
    }

    if (floorMaterialRef.current) {
      const heat =
        state.tension * 0.12 +
        state.fall * 0.28 +
        presence * pulse * 0.08;

      floorMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        floorMaterialRef.current.emissiveIntensity,
        heat,
        alpha,
      );

      floorMaterialRef.current.opacity = THREE.MathUtils.lerp(
        floorMaterialRef.current.opacity,
        0.58 + presence * 0.08 + state.fall * 0.08,
        alpha,
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.54} color="#978a80" />

      <spotLight
        ref={crownRef}
        position={[0, 5.4, 2.4]}
        angle={0.42}
        penumbra={1}
        intensity={42}
        distance={10}
        color="#f2dec2"
        castShadow
      />

      <pointLight
        ref={bloodRimRef}
        position={[-2.4, 1.2, 2.2]}
        intensity={7}
        distance={6}
        color="#7f3d38"
      />

      <spotLight
        position={[0.15, 2.35, 3.6]}
        angle={0.5}
        penumbra={0.9}
        intensity={16}
        distance={7}
        color="#efe3d4"
      />

      <pointLight
        position={[2.2, 0.2, 1.4]}
        intensity={4.5}
        distance={5}
        color="#d8a06c"
      />

      <pointLight
        ref={innerRef}
        position={[0, 0.45, 1.2]}
        intensity={2.4}
        distance={4.2}
        decay={2}
        color="#d85d38"
      />

      <mesh position={[0, -1.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.8, 96]} />
        <meshStandardMaterial
          ref={floorMaterialRef}
          color="#0d0b0a"
          emissive="#6c241c"
          emissiveIntensity={0}
          roughness={0.98}
          metalness={0}
          transparent
          opacity={0.58}
        />
      </mesh>
    </>
  );
}

function Chamber() {
  return (
    <>
      <color attach="background" args={["#080706"]} />
      <fog attach="fog" args={["#080706", 4.8, 11]} />

      <LivingCamera />

      <ReactiveChamberField />

      <SeraraCanonicalBody />

      <ContactShadows
        position={[0, -1.82, 0]}
        opacity={0.5}
        scale={6}
        blur={2.4}
        far={3}
      />
    </>
  );
}

export default function SeraphWorld() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      shadows
    >
      <Suspense fallback={null}>
        <Chamber />
      </Suspense>
    </Canvas>
  );
}
