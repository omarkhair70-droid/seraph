import * as THREE from "three";
import type { SeraraState } from "./serara-state";

type AudioContextConstructor = typeof AudioContext;

export type SeraraSonic = {
  wake: () => Promise<void>;
  burst: () => void;
  update: (
    state: SeraraState,
    presence: number,
    pulse: number,
    pointerX: number,
  ) => void;
  dispose: () => void;
};

export function createSeraraSonic(): SeraraSonic {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let bodyGain: GainNode | null = null;
  let harmonicGain: GainNode | null = null;
  let breathGain: GainNode | null = null;
  let bodyOscillator: OscillatorNode | null = null;
  let harmonicOscillator: OscillatorNode | null = null;
  let breathSource: AudioBufferSourceNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let panner: StereoPannerNode | null = null;

  const build = () => {
    if (context || typeof window === "undefined") return;

    const AudioCtor = (
      window.AudioContext ??
      (window as typeof window & {
        webkitAudioContext?: AudioContextConstructor;
      }).webkitAudioContext
    );

    if (!AudioCtor) return;

    context = new AudioCtor();

    master = context.createGain();
    master.gain.value = 0.0001;

    bodyGain = context.createGain();
    harmonicGain = context.createGain();
    breathGain = context.createGain();

    bodyGain.gain.value = 0.012;
    harmonicGain.gain.value = 0.004;
    breathGain.gain.value = 0.002;

    bodyOscillator = context.createOscillator();
    bodyOscillator.type = "sine";
    bodyOscillator.frequency.value = 96;

    harmonicOscillator = context.createOscillator();
    harmonicOscillator.type = "triangle";
    harmonicOscillator.frequency.value = 192;

    filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.7;

    panner = context.createStereoPanner();

    const noiseBuffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const noise = noiseBuffer.getChannelData(0);

    for (let index = 0; index < noise.length; index += 1) {
      noise[index] = Math.random() * 2 - 1;
    }

    breathSource = context.createBufferSource();
    breathSource.buffer = noiseBuffer;
    breathSource.loop = true;

    bodyOscillator.connect(bodyGain);
    harmonicOscillator.connect(harmonicGain);
    breathSource.connect(breathGain);

    bodyGain.connect(filter);
    harmonicGain.connect(filter);
    breathGain.connect(filter);
    filter.connect(panner);
    panner.connect(master);
    master.connect(context.destination);

    bodyOscillator.start();
    harmonicOscillator.start();
    breathSource.start();
  };

  const wake = async () => {
    build();
    if (!context) return;

    if (context.state !== "running") {
      await context.resume();
    }
  };

  const burst = () => {
    build();
    if (!context || !master) return;

    const now = context.currentTime;
    const transient = context.createGain();
    const oscillator = context.createOscillator();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(284, now);
    oscillator.frequency.exponentialRampToValueAtTime(118, now + 0.72);

    transient.gain.setValueAtTime(0.0001, now);
    transient.gain.exponentialRampToValueAtTime(0.035, now + 0.018);
    transient.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    oscillator.connect(transient);
    transient.connect(master);

    oscillator.start(now);
    oscillator.stop(now + 0.92);
  };

  const update = (
    state: SeraraState,
    presence: number,
    pulse: number,
    pointerX: number,
  ) => {
    if (
      !context ||
      context.state !== "running" ||
      !master ||
      !bodyGain ||
      !harmonicGain ||
      !breathGain ||
      !bodyOscillator ||
      !harmonicOscillator ||
      !filter ||
      !panner
    ) {
      return;
    }

    const now = context.currentTime;
    const stateHeat = state.tension * 0.7 + state.fall;

    master.gain.setTargetAtTime(
      0.026 + presence * 0.018 + stateHeat * 0.008,
      now,
      0.18,
    );

    bodyGain.gain.setTargetAtTime(
      0.012 + presence * 0.006 + pulse * presence * 0.006,
      now,
      0.12,
    );

    harmonicGain.gain.setTargetAtTime(
      0.0035 +
        state.tension * 0.004 +
        state.fall * 0.002 +
        presence * pulse * 0.003,
      now,
      0.14,
    );

    breathGain.gain.setTargetAtTime(
      0.001 +
        state.grace * 0.0015 +
        state.tension * 0.003 +
        presence * 0.001,
      now,
      0.22,
    );

    const fundamental =
      96 +
      state.tension * 8 -
      state.fall * 11 +
      pulse * presence * 1.8;

    bodyOscillator.frequency.setTargetAtTime(fundamental, now, 0.14);
    harmonicOscillator.frequency.setTargetAtTime(
      fundamental * (2.01 + state.tension * 0.014),
      now,
      0.16,
    );

    filter.frequency.setTargetAtTime(
      480 +
        state.grace * 160 +
        state.tension * 240 +
        state.fall * 90 +
        presence * 620 +
        pulse * presence * 180,
      now,
      0.12,
    );

    panner.pan.setTargetAtTime(
      THREE.MathUtils.clamp(pointerX * 0.38, -0.38, 0.38),
      now,
      0.1,
    );
  };

  const dispose = () => {
    if (!context) return;

    bodyOscillator?.stop();
    harmonicOscillator?.stop();
    breathSource?.stop();
    void context.close();

    context = null;
    master = null;
    bodyGain = null;
    harmonicGain = null;
    breathGain = null;
    bodyOscillator = null;
    harmonicOscillator = null;
    breathSource = null;
    filter = null;
    panner = null;
  };

  return {
    wake,
    burst,
    update,
    dispose,
  };
}
