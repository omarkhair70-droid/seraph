"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import * as THREE from "three";

function SeraphMaterial({
  emissive = 0.04,
  roughness = 0.5,
}: {
  emissive?: number;
  roughness?: number;
}) {
  return (
    <meshPhysicalMaterial
      color="#d8d0c5"
      roughness={roughness}
      metalness={0.03}
      clearcoat={0.12}
      clearcoatRoughness={0.75}
      emissive="#d3a56d"
      emissiveIntensity={emissive}
    />
  );
}

function Joint({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[0.13, 24, 18]} />
      <SeraphMaterial roughness={0.58} />
    </mesh>
  );
}

function Arm({
  side,
  shoulderRef,
  forearmRef,
}: {
  side: -1 | 1;
  shoulderRef: MutableRefObject<THREE.Group | null>;
  forearmRef: MutableRefObject<THREE.Group | null>;
}) {
  const sign = side;

  return (
    <group
      ref={shoulderRef}
      position={[0.55 * sign, 1.08, 0]}
      rotation={[0.03, 0, sign * 0.13]}
    >
      <Joint position={[0, 0, 0]} scale={1.05} />

      <mesh position={[0.02 * sign, -0.37, 0]} rotation={[0, 0, sign * 0.02]}>
        <capsuleGeometry args={[0.115, 0.5, 10, 22]} />
        <SeraphMaterial />
      </mesh>

      <group ref={forearmRef} position={[0.045 * sign, -0.72, 0]}>
        <Joint position={[0, 0, 0]} scale={0.8} />

        <mesh position={[0.015 * sign, -0.32, 0.01]} rotation={[0, 0, sign * 0.015]}>
          <capsuleGeometry args={[0.095, 0.43, 10, 22]} />
          <SeraphMaterial roughness={0.54} />
        </mesh>

        <mesh
          position={[0.02 * sign, -0.68, 0.025]}
          scale={[0.78, 1.16, 0.62]}
        >
          <sphereGeometry args={[0.13, 20, 16]} />
          <SeraphMaterial roughness={0.56} />
        </mesh>

        <group position={[0.02 * sign, -0.79, 0.035]}>
          {[0, 1, 2, 3].map((finger) => (
            <mesh
              key={finger}
              position={[
                sign * (-0.055 + finger * 0.036),
                -0.09 - Math.abs(1.5 - finger) * 0.008,
                0.012,
              ]}
              scale={[0.18, 0.72 - finger * 0.025, 0.16]}
            >
              <capsuleGeometry args={[0.035, 0.12, 5, 10]} />
              <SeraphMaterial roughness={0.58} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function Leg({ side }: { side: -1 | 1 }) {
  const sign = side;

  return (
    <group position={[0.23 * sign, -0.43, 0]}>
      <mesh position={[0, -0.45, 0.01]} rotation={[0, 0, -sign * 0.015]}>
        <capsuleGeometry args={[0.16, 0.62, 10, 24]} />
        <SeraphMaterial />
      </mesh>

      <Joint position={[0, -0.89, 0]} scale={0.95} />

      <mesh position={[0, -1.29, 0.015]} rotation={[0, 0, sign * 0.01]}>
        <capsuleGeometry args={[0.13, 0.58, 10, 22]} />
        <SeraphMaterial roughness={0.54} />
      </mesh>

      <mesh
        position={[0, -1.69, 0.12]}
        rotation={[0.08, 0, 0]}
        scale={[0.9, 0.48, 1.45]}
      >
        <sphereGeometry args={[0.17, 22, 16]} />
        <SeraphMaterial roughness={0.62} />
      </mesh>
    </group>
  );
}

function Face() {
  return (
    <group position={[0, 0.02, 0.01]}>
      <mesh position={[-0.17, 0.11, 0.435]} scale={[1.35, 0.58, 0.42]}>
        <sphereGeometry args={[0.105, 24, 16]} />
        <meshPhysicalMaterial
          color="#1a1716"
          roughness={0.28}
          metalness={0.02}
          emissive="#6c392c"
          emissiveIntensity={0.12}
        />
      </mesh>

      <mesh position={[0.17, 0.11, 0.435]} scale={[1.35, 0.58, 0.42]}>
        <sphereGeometry args={[0.105, 24, 16]} />
        <meshPhysicalMaterial
          color="#1a1716"
          roughness={0.28}
          metalness={0.02}
          emissive="#6c392c"
          emissiveIntensity={0.12}
        />
      </mesh>

      <mesh
        position={[-0.17, 0.205, 0.425]}
        rotation={[0.02, 0, -0.11]}
        scale={[1.4, 0.16, 0.16]}
      >
        <boxGeometry args={[0.16, 0.06, 0.055]} />
        <meshStandardMaterial color="#8f877d" roughness={0.7} />
      </mesh>

      <mesh
        position={[0.17, 0.205, 0.425]}
        rotation={[0.02, 0, 0.11]}
        scale={[1.4, 0.16, 0.16]}
      >
        <boxGeometry args={[0.16, 0.06, 0.055]} />
        <meshStandardMaterial color="#8f877d" roughness={0.7} />
      </mesh>

      <mesh position={[0, -0.005, 0.49]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.075, 0.28, 18]} />
        <SeraphMaterial roughness={0.62} />
      </mesh>

      <mesh position={[0, -0.18, 0.45]} scale={[1, 0.18, 0.18]}>
        <capsuleGeometry args={[0.055, 0.18, 6, 18]} />
        <meshStandardMaterial
          color="#42302f"
          roughness={0.55}
          emissive="#6d3028"
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh position={[0, -0.29, 0.37]} scale={[0.9, 0.4, 0.68]}>
        <sphereGeometry args={[0.16, 22, 16]} />
        <SeraphMaterial roughness={0.58} />
      </mesh>
    </group>
  );
}

export default function SeraphBody() {
  const rootRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Group>(null);
  const pelvisRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const breath = Math.sin(t * 1.15) * 0.5 + 0.5;
    const slow = Math.sin(t * 0.23) * 0.5 + 0.5;

    const leftShoulder = leftShoulderRef.current;
    const rightShoulder = rightShoulderRef.current;
    const leftForearm = leftForearmRef.current;
    const rightForearm = rightForearmRef.current;
    const chest = chestRef.current;
    const pelvis = pelvisRef.current;
    const neck = neckRef.current;
    const head = headRef.current;

    if (chest) {
      const chestScale = 1 + breath * 0.018;
      chest.scale.y = THREE.MathUtils.lerp(
        chest.scale.y,
        chestScale,
        Math.min(1, delta * 4),
      );
      chest.rotation.z = Math.sin(t * 0.19) * 0.008;
    }

    if (pelvis) {
      pelvis.rotation.z = Math.sin(t * 0.17 + 0.8) * 0.006;
    }

    if (neck) {
      neck.rotation.y = Math.sin(t * 0.13) * 0.035;
      neck.rotation.x = Math.sin(t * 0.21 + 0.4) * 0.012;
    }

    if (head) {
      head.rotation.y = Math.sin(t * 0.13) * 0.025;
      head.rotation.z = Math.sin(t * 0.1 + 1.2) * 0.012;
      head.position.y = 1.91 + breath * 0.008;
    }

    const graceOpen = 0.15 + slow * 0.035;

    if (leftShoulder) {
      leftShoulder.rotation.z = THREE.MathUtils.lerp(
        leftShoulder.rotation.z,
        graceOpen,
        Math.min(1, delta * 1.2),
      );
    }

    if (rightShoulder) {
      rightShoulder.rotation.z = THREE.MathUtils.lerp(
        rightShoulder.rotation.z,
        -graceOpen,
        Math.min(1, delta * 1.2),
      );
    }

    if (leftForearm) {
      leftForearm.rotation.z = 0.025 + Math.sin(t * 0.31) * 0.012;
    }

    if (rightForearm) {
      rightForearm.rotation.z = -0.025 - Math.sin(t * 0.31) * 0.012;
    }

    if (rootRef.current) {
      rootRef.current.position.y = -0.12 + Math.sin(t * 0.44) * 0.004;
      rootRef.current.rotation.y = Math.sin(t * 0.08) * 0.02;
    }
  });

  return (
    <group ref={rootRef} scale={0.94}>
      <group ref={pelvisRef} position={[0, 0.12, 0]}>
        <mesh scale={[0.82, 0.5, 0.66]}>
          <sphereGeometry args={[0.48, 34, 24]} />
          <SeraphMaterial roughness={0.56} />
        </mesh>
      </group>

      <group ref={chestRef} position={[0, 0.91, 0]}>
        <mesh scale={[0.82, 1.08, 0.52]}>
          <sphereGeometry args={[0.56, 38, 28]} />
          <SeraphMaterial emissive={0.065} roughness={0.48} />
        </mesh>

        <mesh position={[0, 0.28, 0.39]} scale={[0.62, 0.52, 0.18]}>
          <sphereGeometry args={[0.48, 30, 22]} />
          <meshPhysicalMaterial
            color="#e5dbcb"
            roughness={0.38}
            clearcoat={0.2}
            emissive="#d0a36d"
            emissiveIntensity={0.07}
          />
        </mesh>

        <mesh position={[0, -0.48, 0]} scale={[0.66, 0.9, 0.48]}>
          <capsuleGeometry args={[0.28, 0.42, 12, 30]} />
          <SeraphMaterial roughness={0.55} />
        </mesh>
      </group>

      <Arm
        side={-1}
        shoulderRef={leftShoulderRef}
        forearmRef={leftForearmRef}
      />
      <Arm
        side={1}
        shoulderRef={rightShoulderRef}
        forearmRef={rightForearmRef}
      />

      <Leg side={-1} />
      <Leg side={1} />

      <group ref={neckRef} position={[0, 1.53, 0]}>
        <mesh position={[0, 0.18, 0]} scale={[0.88, 1.1, 0.85]}>
          <capsuleGeometry args={[0.16, 0.27, 10, 24]} />
          <SeraphMaterial roughness={0.54} />
        </mesh>
      </group>

      <group ref={headRef} position={[0, 1.91, 0]}>
        <mesh scale={[0.78, 1.02, 0.72]}>
          <sphereGeometry args={[0.48, 42, 32]} />
          <SeraphMaterial emissive={0.055} roughness={0.46} />
        </mesh>

        <Face />
      </group>
    </group>
  );
}
