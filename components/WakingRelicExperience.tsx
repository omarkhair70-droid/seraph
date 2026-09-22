"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./WakingRelicExperience.module.css";

type RelicState = "dormant" | "sensing" | "watching" | "awakening" | "calling" | "fading";
type VoiceKey = "wake" | "close" | "silence" | "opens" | "seam" | "remain";

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

function Relic({ state, onSense, onActivate }: {
  state: RelicState;
  onSense: (hovered: boolean) => void;
  onActivate: () => void;
}) {
  const { scene } = useGLTF("/assets/waking-relic/SERARA_RELIC.glb");
  const relic = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const activation = useRef(0);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#d8d0c5"),
        roughness: 0.72,
        metalness: 0.06,
        clearcoat: 0.16,
        clearcoatRoughness: 0.55,
        emissive: new THREE.Color("#8b421f"),
        emissiveIntensity: 0.018,
      }),
    [],
  );

  useEffect(() => {
    relic.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material = material;
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [material, relic]);

  useEffect(() => {
    if (state === "awakening") activation.current = performance.now();
  }, [state]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const aware = state === "sensing" || state === "watching" || state === "calling";
    const energy = state === "awakening" ? 1 : aware ? 0.55 : state === "fading" ? 0.15 : 0.08;
    const elapsed = performance.now() - activation.current;
    const jolt = state === "awakening" && elapsed < 760 ? Math.sin(elapsed * 0.12) * (1 - elapsed / 760) : 0;

    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      pointer.x * 0.085 + Math.sin(t * 0.12) * 0.016,
      3.2,
      delta,
    );
    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      -pointer.x * 0.012 + jolt * 0.006,
      4,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      pointer.y * 0.018 + Math.sin(t * 0.17) * 0.007,
      3,
      delta,
    );

    const breathe = 1 + Math.sin(t * 0.62) * 0.003 + jolt * 0.006;
    group.current.scale.setScalar(1.22 * breathe);
    group.current.position.y = -0.08 + Math.sin(t * 0.33) * 0.012 + jolt * 0.016;
    group.current.position.x = jolt * 0.006;

    material.emissiveIntensity = THREE.MathUtils.damp(
      material.emissiveIntensity,
      0.012 + energy * 0.12 + Math.max(jolt, 0) * 0.26,
      4.2,
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
      <primitive object={relic} />
    </group>
  );
}

function RelicStage({ state, onSense, onActivate }: {
  state: RelicState;
  onSense: (hovered: boolean) => void;
  onActivate: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.65]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.2, 3.55], fov: 31, near: 0.1, far: 50 }}
      shadows
    >
      <fog attach="fog" args={["#080706", 3.1, 6.1]} />
      <ambientLight intensity={0.32} color="#b8c0c5" />
      <directionalLight
        castShadow
        position={[-3.2, 3.8, 3.4]}
        intensity={2.4}
        color="#c6d0da"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[1.7, 1.2, 2.1]} intensity={1.35} color="#b15b2f" distance={5} />
      <pointLight position={[-1.6, -0.4, -0.8]} intensity={0.75} color="#7b92ad" distance={4} />
      <Suspense fallback={null}>
        <Relic state={state} onSense={onSense} onActivate={onActivate} />
        <ContactShadows position={[0, -1.12, 0]} opacity={0.46} scale={4.5} blur={2.6} far={3} resolution={512} />
      </Suspense>
    </Canvas>
  );
}

export default function WakingRelicExperience() {
  const [entered, setEntered] = useState(false);
  const [state, setState] = useState<RelicState>("dormant");
  const [caption, setCaption] = useState("");
  const [muted, setMuted] = useState(false);
  const ambient = useRef<HTMLAudioElement | null>(null);
  const voice = useRef<HTMLAudioElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spoken = useRef<Set<string>>(new Set());

  const playVoice = useCallback((key: VoiceKey, once = false) => {
    if (!entered || muted) return;
    if (once && spoken.current.has(key)) return;
    spoken.current.add(key);

    voice.current?.pause();
    const next = new Audio(VOICES[key]);
    next.volume = 0.82;
    voice.current = next;
    setCaption(VOICE_TEXT[key]);
    void next.play().catch(() => undefined);
    next.onended = () => window.setTimeout(() => setCaption(""), 700);
  }, [entered, muted]);

  const armIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setState("fading");
      playVoice("remain");
      setTimeout(() => setState("dormant"), 2400);
    }, 14000);
  }, [playVoice]);

  useEffect(() => {
    if (!entered) return;
    const onInput = () => armIdle();
    window.addEventListener("pointermove", onInput, { passive: true });
    window.addEventListener("scroll", onInput, { passive: true });
    armIdle();
    return () => {
      window.removeEventListener("pointermove", onInput);
      window.removeEventListener("scroll", onInput);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [armIdle, entered]);

  useEffect(() => {
    if (!entered) return;
    let seamSpoken = false;
    const onScroll = () => {
      const p = window.scrollY / Math.max(window.innerHeight, 1);
      if (p > 0.55 && !seamSpoken) {
        seamSpoken = true;
        setState("calling");
        playVoice("seam", true);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [entered, playVoice]);

  const enter = async () => {
    setEntered(true);
    setState("sensing");
    const bed = new Audio("/assets/waking-relic/audio/serara_ritual_ambient.mp3");
    bed.loop = true;
    bed.volume = 0.36;
    ambient.current = bed;
    try {
      await bed.play();
    } catch {}
    window.setTimeout(() => playVoice("wake", true), 850);
    window.setTimeout(() => setState("dormant"), 4200);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (ambient.current) ambient.current.muted = next;
    if (voice.current) voice.current.muted = next;
  };

  const onSense = (hovered: boolean) => {
    if (!entered) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!hovered) {
      setState("dormant");
      return;
    }
    setState("sensing");
    playVoice("close", true);
    hoverTimer.current = setTimeout(() => {
      setState("watching");
      playVoice("silence", true);
    }, 2200);
  };

  const onActivate = () => {
    if (!entered) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setState("awakening");
    playVoice("opens");
    setTimeout(() => setState("calling"), 820);
    setTimeout(() => setState("watching"), 3600);
  };

  return (
    <main className={styles.experience} data-state={state}>
      <div className={styles.canvasShell} aria-hidden={!entered}>
        <RelicStage state={state} onSense={onSense} onActivate={onActivate} />
      </div>

      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.halo} />
        <div className={styles.scan} />
        <div className={styles.grain} />
      </div>

      {!entered && (
        <button className={styles.gate} type="button" onClick={enter}>
          <span className={styles.gateIndex}>SERAPH://RELIC-01</span>
          <span className={styles.gateTitle}>ENTER / LISTEN</span>
          <span className={styles.gateHint}>sound required · presence reacts to you</span>
        </button>
      )}

      <header className={styles.chrome}>
        <div>
          <strong>SERARA</strong>
          <span>THE WAKING RELIC</span>
        </div>
        <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>
          {muted ? "SOUND OFF" : "SOUND ON"}
        </button>
      </header>

      <div className={styles.caption} aria-live="polite">
        {caption && <span>{caption}</span>}
      </div>

      <section className={[styles.chapter, styles.hero].join(" ")}>
        <div className={styles.chapterCopy}>
          <span>01 / AWAKENING</span>
          <h1>NOT A FIGURE.<br />A PRESENCE.</h1>
          <p>She does not wake when the page loads. She wakes when you stay.</p>
        </div>
      </section>

      <section className={styles.chapter}>
        <div className={styles.chapterCopy}>
          <span>02 / FORM</span>
          <h2>STILLNESS<br />HAS WEIGHT.</h2>
          <p>A mineral body, held between sculpture and organism. Motion is scarce on purpose.</p>
        </div>
      </section>

      <section className={styles.chapter}>
        <div className={styles.chapterCopy}>
          <span>03 / MEMORY</span>
          <h2>THE SURFACE<br />REMEMBERS.</h2>
          <p>Sound, light and attention collect around the relic. The interface becomes ritual.</p>
        </div>
      </section>

      <section className={[styles.chapter, styles.threshold].join(" ")}>
        <div className={styles.chapterCopy}>
          <span>04 / THRESHOLD</span>
          <h2>FOLLOW<br />THE SEAM.</h2>
          <p>Nothing explains itself immediately. The encounter is the navigation.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>SERAPH://01</span>
        <span>THE RELIC REMAINS</span>
      </footer>
    </main>
  );
}

useGLTF.preload("/assets/waking-relic/SERARA_RELIC.glb");
