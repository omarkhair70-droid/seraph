import * as THREE from "three";
import type { SeraraState } from "./serara-state";

type AudioContextConstructor = typeof AudioContext;

type VoiceKey =
  | "wake"
  | "close"
  | "silence"
  | "opens"
  | "seam"
  | "remain";

const CINEMATIC_AUDIO_ROOT = "/assets/serara-cinematic/audio";
const VOICE_FILES: Record<VoiceKey, string> = {
  wake: "voice_wake.mp3",
  close: "voice_close.mp3",
  silence: "voice_silence.mp3",
  opens: "voice_opens.mp3",
  seam: "voice_seam.mp3",
  remain: "voice_remain.mp3",
};

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

function createNoiseBuffer(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(
    1,
    Math.floor(context.sampleRate * seconds),
    context.sampleRate,
  );
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createReverbImpulse(context: AudioContext, seconds: number) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
    const channel = impulse.getChannelData(channelIndex);

    for (let index = 0; index < length; index += 1) {
      const time = index / context.sampleRate;
      const decay = Math.pow(1 - time / seconds, 3.15);
      channel[index] =
        (Math.random() * 2 - 1) *
        decay *
        (0.72 + channelIndex * 0.08);
    }
  }

  return impulse;
}

export function createSeraraSonic(): SeraraSonic {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let dryBus: GainNode | null = null;
  let wetBus: GainNode | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let convolver: ConvolverNode | null = null;
  let panner: StereoPannerNode | null = null;

  let bodyGain: GainNode | null = null;
  let harmonicGain: GainNode | null = null;
  let breathGain: GainNode | null = null;
  let whisperAGain: GainNode | null = null;
  let whisperBGain: GainNode | null = null;
  let crackleGain: GainNode | null = null;

  let bodyOscillator: OscillatorNode | null = null;
  let harmonicOscillator: OscillatorNode | null = null;
  let breathSource: AudioBufferSourceNode | null = null;
  let whisperASource: AudioBufferSourceNode | null = null;
  let whisperBSource: AudioBufferSourceNode | null = null;
  let crackleSource: AudioBufferSourceNode | null = null;

  let bodyFilter: BiquadFilterNode | null = null;
  let breathFilter: BiquadFilterNode | null = null;
  let whisperAFilter: BiquadFilterNode | null = null;
  let whisperBFilter: BiquadFilterNode | null = null;
  let crackleFilter: BiquadFilterNode | null = null;

  let ambientElement: HTMLAudioElement | null = null;
  let voiceElements: Partial<Record<VoiceKey, HTMLAudioElement>> = {};
  let currentVoice: HTMLAudioElement | null = null;
  let wakeVoicePlayed = false;
  let firstBurstVoicePlayed = false;
  let previousPresence = 0;
  let presenceEnteredAt = -Infinity;
  let previousFall = 0;
  let lastVoiceAt = -Infinity;
  let lastInteractionAt = 0;
  let remainPlayedForIdle = false;

  const buildMedia = () => {
    if (typeof window === "undefined" || ambientElement) return;

    ambientElement = new Audio(
      `${CINEMATIC_AUDIO_ROOT}/serara_ritual_ambient.mp3`,
    );
    ambientElement.loop = true;
    ambientElement.preload = "auto";
    ambientElement.volume = 0;

    voiceElements = Object.fromEntries(
      (Object.keys(VOICE_FILES) as VoiceKey[]).map((key) => {
        const element = new Audio(
          `${CINEMATIC_AUDIO_ROOT}/${VOICE_FILES[key]}`,
        );
        element.preload = "auto";
        element.volume = 0.08;
        return [key, element];
      }),
    ) as Partial<Record<VoiceKey, HTMLAudioElement>>;
  };

  const playVoice = (key: VoiceKey, volume: number) => {
    if (!context) return;

    const element = voiceElements[key];
    if (!element) return;

    if (currentVoice && currentVoice !== element) {
      currentVoice.pause();
      currentVoice.currentTime = 0;
    }

    element.pause();
    element.currentTime = 0;
    element.volume = THREE.MathUtils.clamp(volume, 0, 0.22);
    currentVoice = element;
    lastVoiceAt = context.currentTime;

    void element.play().catch(() => undefined);
  };

  const build = () => {
    buildMedia();
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
    dryBus = context.createGain();
    wetBus = context.createGain();
    compressor = context.createDynamicsCompressor();
    convolver = context.createConvolver();
    panner = context.createStereoPanner();

    master.gain.value = 0.0001;
    dryBus.gain.value = 0.9;
    wetBus.gain.value = 0.46;

    compressor.threshold.value = -20;
    compressor.knee.value = 16;
    compressor.ratio.value = 4.2;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.24;

    convolver.buffer = createReverbImpulse(context, 3.4);

    bodyGain = context.createGain();
    harmonicGain = context.createGain();
    breathGain = context.createGain();
    whisperAGain = context.createGain();
    whisperBGain = context.createGain();
    crackleGain = context.createGain();

    bodyGain.gain.value = 0.035;
    harmonicGain.gain.value = 0.012;
    breathGain.gain.value = 0.008;
    whisperAGain.gain.value = 0.0001;
    whisperBGain.gain.value = 0.0001;
    crackleGain.gain.value = 0.001;

    bodyOscillator = context.createOscillator();
    bodyOscillator.type = "sine";
    bodyOscillator.frequency.value = 92;

    harmonicOscillator = context.createOscillator();
    harmonicOscillator.type = "triangle";
    harmonicOscillator.frequency.value = 185;

    bodyFilter = context.createBiquadFilter();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = 760;
    bodyFilter.Q.value = 0.9;

    breathFilter = context.createBiquadFilter();
    breathFilter.type = "bandpass";
    breathFilter.frequency.value = 460;
    breathFilter.Q.value = 0.72;

    whisperAFilter = context.createBiquadFilter();
    whisperAFilter.type = "bandpass";
    whisperAFilter.frequency.value = 980;
    whisperAFilter.Q.value = 3.8;

    whisperBFilter = context.createBiquadFilter();
    whisperBFilter.type = "bandpass";
    whisperBFilter.frequency.value = 1540;
    whisperBFilter.Q.value = 4.6;

    crackleFilter = context.createBiquadFilter();
    crackleFilter.type = "highpass";
    crackleFilter.frequency.value = 2300;
    crackleFilter.Q.value = 0.4;

    const noise = createNoiseBuffer(context, 4);

    breathSource = context.createBufferSource();
    whisperASource = context.createBufferSource();
    whisperBSource = context.createBufferSource();
    crackleSource = context.createBufferSource();

    for (const source of [
      breathSource,
      whisperASource,
      whisperBSource,
      crackleSource,
    ]) {
      source.buffer = noise;
      source.loop = true;
    }

    bodyOscillator.connect(bodyGain);
    harmonicOscillator.connect(harmonicGain);

    breathSource.connect(breathFilter);
    breathFilter.connect(breathGain);

    whisperASource.connect(whisperAFilter);
    whisperAFilter.connect(whisperAGain);

    whisperBSource.connect(whisperBFilter);
    whisperBFilter.connect(whisperBGain);

    crackleSource.connect(crackleFilter);
    crackleFilter.connect(crackleGain);

    bodyGain.connect(bodyFilter);
    harmonicGain.connect(bodyFilter);

    for (const source of [
      bodyFilter,
      breathGain,
      whisperAGain,
      whisperBGain,
      crackleGain,
    ]) {
      source.connect(dryBus);
      source.connect(convolver);
    }

    dryBus.connect(panner);
    convolver.connect(wetBus);
    wetBus.connect(panner);
    panner.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);

    bodyOscillator.start();
    harmonicOscillator.start();
    breathSource.start();
    whisperASource.start(context.currentTime + 0.17);
    whisperBSource.start(context.currentTime + 0.43);
    crackleSource.start(context.currentTime + 0.08);
  };

  const wake = async () => {
    build();
    if (!context || !master) return;

    if (context.state !== "running") {
      await context.resume();
    }

    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.115, now + 1.4);

    if (ambientElement) {
      ambientElement.volume = 0.055;
      void ambientElement.play().catch(() => undefined);
    }

    if (!wakeVoicePlayed) {
      wakeVoicePlayed = true;
      playVoice("wake", 0.115);
    }

    lastInteractionAt = now;
  };

  const burst = () => {
    build();
    if (!context || !master || !convolver) return;

    const now = context.currentTime;
    lastInteractionAt = now;
    remainPlayedForIdle = false;

    if (!firstBurstVoicePlayed) {
      firstBurstVoicePlayed = true;
      playVoice("opens", 0.145);
    } else if (now - lastVoiceAt > 18) {
      playVoice("seam", 0.085);
    }

    const hitGain = context.createGain();
    const hitOsc = context.createOscillator();
    const upperGain = context.createGain();
    const upperOsc = context.createOscillator();
    const noiseGain = context.createGain();
    const noiseFilter = context.createBiquadFilter();
    const noiseSource = context.createBufferSource();

    hitOsc.type = "sine";
    hitOsc.frequency.setValueAtTime(238, now);
    hitOsc.frequency.exponentialRampToValueAtTime(76, now + 1.05);

    upperOsc.type = "triangle";
    upperOsc.frequency.setValueAtTime(476, now);
    upperOsc.frequency.exponentialRampToValueAtTime(176, now + 0.82);

    hitGain.gain.setValueAtTime(0.0001, now);
    hitGain.gain.exponentialRampToValueAtTime(0.11, now + 0.018);
    hitGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

    upperGain.gain.setValueAtTime(0.0001, now);
    upperGain.gain.exponentialRampToValueAtTime(0.032, now + 0.026);
    upperGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    noiseSource.buffer = createNoiseBuffer(context, 0.8);
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1280;
    noiseFilter.Q.value = 1.2;

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);

    hitOsc.connect(hitGain);
    upperOsc.connect(upperGain);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    for (const transient of [hitGain, upperGain, noiseGain]) {
      transient.connect(master);
      transient.connect(convolver);
    }

    hitOsc.start(now);
    upperOsc.start(now);
    noiseSource.start(now);

    hitOsc.stop(now + 1.18);
    upperOsc.stop(now + 0.84);
    noiseSource.stop(now + 0.82);
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
      !whisperAGain ||
      !whisperBGain ||
      !crackleGain ||
      !bodyOscillator ||
      !harmonicOscillator ||
      !bodyFilter ||
      !breathFilter ||
      !whisperAFilter ||
      !whisperBFilter ||
      !crackleFilter ||
      !panner ||
      !wetBus
    ) {
      return;
    }

    const now = context.currentTime;
    const heat = THREE.MathUtils.clamp(
      state.tension * 0.62 + state.fall,
      0,
      1,
    );

    if (ambientElement) {
      const ambientTarget =
        0.05 +
        state.grace * 0.018 +
        state.tension * 0.028 +
        state.fall * 0.016 +
        presence * 0.018;
      ambientElement.volume = THREE.MathUtils.lerp(
        ambientElement.volume,
        THREE.MathUtils.clamp(ambientTarget, 0.045, 0.12),
        0.035,
      );
    }

    if (presence > 0.54 && previousPresence <= 0.54) {
      presenceEnteredAt = now;
      lastInteractionAt = now;
      remainPlayedForIdle = false;

      if (now - lastVoiceAt > 8.5) {
        playVoice("close", 0.075);
      }
    }

    if (
      presence > 0.62 &&
      Number.isFinite(presenceEnteredAt) &&
      now - presenceEnteredAt > 6.5 &&
      now - lastVoiceAt > 10
    ) {
      playVoice("silence", 0.065);
      presenceEnteredAt = Infinity;
    }

    if (state.fall > 0.72 && previousFall <= 0.72 && now - lastVoiceAt > 9) {
      playVoice("seam", 0.075);
    }

    if (
      presence < 0.18 &&
      now - lastInteractionAt > 18 &&
      !remainPlayedForIdle &&
      now - lastVoiceAt > 12
    ) {
      remainPlayedForIdle = true;
      playVoice("remain", 0.06);
    }

    if (presence > 0.22) {
      lastInteractionAt = now;
      remainPlayedForIdle = false;
    }

    previousPresence = presence;
    previousFall = state.fall;

    const voiceGateA = Math.pow(
      Math.max(0, Math.sin(now * 0.43 + 0.7)),
      9,
    );
    const voiceGateB = Math.pow(
      Math.max(0, Math.sin(now * 0.31 + 2.4)),
      11,
    );

    const crackleGate = Math.pow(
      Math.max(
        0,
        Math.sin(now * 17.3) * 0.54 +
          Math.sin(now * 29.7 + 1.8) * 0.46,
      ),
      8,
    );

    master.gain.setTargetAtTime(
      0.105 + presence * 0.025 + heat * 0.018,
      now,
      0.22,
    );

    bodyGain.gain.setTargetAtTime(
      0.032 + presence * 0.014 + pulse * presence * 0.012 + heat * 0.008,
      now,
      0.14,
    );

    harmonicGain.gain.setTargetAtTime(
      0.01 +
        state.tension * 0.014 +
        state.fall * 0.009 +
        presence * pulse * 0.008,
      now,
      0.16,
    );

    breathGain.gain.setTargetAtTime(
      0.005 +
        state.grace * 0.004 +
        state.tension * 0.009 +
        state.fall * 0.006 +
        presence * 0.003,
      now,
      0.25,
    );

    whisperAGain.gain.setTargetAtTime(
      0.0015 +
        voiceGateA *
          (0.006 + state.tension * 0.012 + state.fall * 0.009 + presence * 0.005),
      now,
      0.12,
    );

    whisperBGain.gain.setTargetAtTime(
      0.0012 +
        voiceGateB *
          (0.005 + state.tension * 0.008 + state.fall * 0.014 + presence * 0.004),
      now,
      0.14,
    );

    crackleGain.gain.setTargetAtTime(
      0.0007 +
        crackleGate *
          (0.002 + state.tension * 0.009 + state.fall * 0.018),
      now,
      0.03,
    );

    const fundamental =
      92 +
      state.tension * 11 -
      state.fall * 13 +
      pulse * presence * 2.6;

    bodyOscillator.frequency.setTargetAtTime(fundamental, now, 0.16);
    harmonicOscillator.frequency.setTargetAtTime(
      fundamental * (2.012 + state.tension * 0.018),
      now,
      0.18,
    );

    bodyFilter.frequency.setTargetAtTime(
      520 +
        state.grace * 170 +
        state.tension * 330 +
        state.fall * 110 +
        presence * 720 +
        pulse * presence * 220,
      now,
      0.13,
    );

    breathFilter.frequency.setTargetAtTime(
      390 + state.tension * 170 + state.fall * 80 + presence * 120,
      now,
      0.2,
    );

    whisperAFilter.frequency.setTargetAtTime(
      920 + state.tension * 250 - state.fall * 80 + presence * 110,
      now,
      0.3,
    );

    whisperBFilter.frequency.setTargetAtTime(
      1480 + state.tension * 320 - state.fall * 120,
      now,
      0.34,
    );

    crackleFilter.frequency.setTargetAtTime(
      2100 + state.tension * 900 + state.fall * 1300,
      now,
      0.11,
    );

    wetBus.gain.setTargetAtTime(
      0.4 + state.grace * 0.08 + state.fall * 0.14,
      now,
      0.4,
    );

    panner.pan.setTargetAtTime(
      THREE.MathUtils.clamp(pointerX * 0.48, -0.48, 0.48),
      now,
      0.1,
    );
  };

  const dispose = () => {
    ambientElement?.pause();
    if (ambientElement) {
      ambientElement.currentTime = 0;
    }

    currentVoice?.pause();
    for (const element of Object.values(voiceElements)) {
      element?.pause();
      if (element) element.currentTime = 0;
    }

    ambientElement = null;
    voiceElements = {};
    currentVoice = null;

    if (!context) return;

    for (const source of [
      bodyOscillator,
      harmonicOscillator,
      breathSource,
      whisperASource,
      whisperBSource,
      crackleSource,
    ]) {
      try {
        source?.stop();
      } catch {
        // The source may already be stopped during hot reload.
      }
    }

    void context.close();

    context = null;
    master = null;
    dryBus = null;
    wetBus = null;
    compressor = null;
    convolver = null;
    panner = null;

    bodyGain = null;
    harmonicGain = null;
    breathGain = null;
    whisperAGain = null;
    whisperBGain = null;
    crackleGain = null;

    bodyOscillator = null;
    harmonicOscillator = null;
    breathSource = null;
    whisperASource = null;
    whisperBSource = null;
    crackleSource = null;

    bodyFilter = null;
    breathFilter = null;
    whisperAFilter = null;
    whisperBFilter = null;
    crackleFilter = null;
  };

  return {
    wake,
    burst,
    update,
    dispose,
  };
}
