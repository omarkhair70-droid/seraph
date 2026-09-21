"use client";

import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import SeraphBody from "./SeraphBody";

function Chamber() {
  return (
    <>
      <color attach="background" args={["#080706"]} />
      <fog attach="fog" args={["#080706", 4.8, 11]} />

      <PerspectiveCamera makeDefault position={[0, 0.62, 6.35]} fov={35} />

      <ambientLight intensity={0.42} color="#8e8278" />

      <spotLight
        position={[0, 5.4, 2.4]}
        angle={0.42}
        penumbra={1}
        intensity={38}
        distance={10}
        color="#f2dec2"
        castShadow
      />

      <pointLight
        position={[-2.4, 1.2, 2.2]}
        intensity={9}
        distance={6}
        color="#7f3d38"
      />

      <pointLight
        position={[2.2, 0.2, 1.4]}
        intensity={5}
        distance={5}
        color="#d8a06c"
      />

      <group position={[0, 0.9, 0]}>
        <SeraphBody />
      </group>

      <mesh position={[0, -1.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.8, 96]} />
        <meshStandardMaterial
          color="#0d0b0a"
          roughness={0.98}
          metalness={0}
          transparent
          opacity={0.62}
        />
      </mesh>

      <ContactShadows
        position={[0, -1.7, 0]}
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
