import fs from "node:fs";
import path from "node:path";

const SR = 48000;
const OUT = path.resolve("public/assets/waking-relic/audio/cinematic");
fs.mkdirSync(OUT, { recursive: true });

function rngFactory(seed = 20260922) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 0xffffffff) * 2 - 1;
  };
}

function normalizeStereo(left, right, peak = 0.9) {
  let m = 1e-9;
  for (let i = 0; i < left.length; i++) {
    m = Math.max(m, Math.abs(left[i]), Math.abs(right[i]));
  }
  const k = peak / m;
  for (let i = 0; i < left.length; i++) {
    left[i] *= k;
    right[i] *= k;
  }
}

function writeWav(file, left, right) {
  normalizeStereo(left, right);
  const frames = left.length;
  const dataBytes = frames * 4;
  const b = Buffer.alloc(44 + dataBytes);
  let o = 0;
  b.write("RIFF", o); o += 4;
  b.writeUInt32LE(36 + dataBytes, o); o += 4;
  b.write("WAVE", o); o += 4;
  b.write("fmt ", o); o += 4;
  b.writeUInt32LE(16, o); o += 4;
  b.writeUInt16LE(1, o); o += 2;
  b.writeUInt16LE(2, o); o += 2;
  b.writeUInt32LE(SR, o); o += 4;
  b.writeUInt32LE(SR * 4, o); o += 4;
  b.writeUInt16LE(4, o); o += 2;
  b.writeUInt16LE(16, o); o += 2;
  b.write("data", o); o += 4;
  b.writeUInt32LE(dataBytes, o); o += 4;
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    b.writeInt16LE(Math.round(l * 32767), o); o += 2;
    b.writeInt16LE(Math.round(r * 32767), o); o += 2;
  }
  fs.writeFileSync(path.join(OUT, file), b);
}

function smoothNoise(n, windowSize, random) {
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = random();
  const out = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += raw[i];
    if (i >= windowSize) sum -= raw[i - windowSize];
    out[i] = sum / Math.min(i + 1, windowSize);
  }
  return out;
}

function makeAwakening() {
  const dur = 5.2, n = Math.floor(SR * dur), rand = rngFactory(17);
  const l = new Float32Array(n), r = new Float32Array(n);
  const noise = smoothNoise(n, 700, rand);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const subEnv = Math.exp(-t * 1.1);
    const f = 31 + 8 * Math.exp(-t * 3);
    const sub = 0.72 * Math.sin(2 * Math.PI * f * t) * subEnv;
    const click = Math.exp(-Math.pow((t - 0.13) / 0.045, 2));
    const metal = 0.15 * click * (
      Math.sin(2 * Math.PI * 610 * t) +
      0.7 * Math.sin(2 * Math.PI * 997 * t) +
      0.45 * Math.sin(2 * Math.PI * 1511 * t)
    );
    const air = 0.19 * noise[i] * Math.pow(Math.max(0, (0.9 - t) / 0.9), 2);
    const tailEnv = t > 0.7 ? Math.exp(-(t - 0.7) / 2.2) : 0;
    const tail = tailEnv * (0.08 * Math.sin(2 * Math.PI * 173 * t) + 0.05 * Math.sin(2 * Math.PI * 263.5 * t));
    const mono = sub + metal + air + tail;
    l[i] = mono + 0.025 * Math.sin(2 * Math.PI * 57.2 * t);
    r[i] = mono + 0.025 * Math.sin(2 * Math.PI * 56.6 * t + 0.6);
  }
  writeWav("awakening_impact.wav", l, r);
}

function makeRiser() {
  const dur = 8.5, n = Math.floor(SR * dur), rand = rngFactory(29);
  const l = new Float32Array(n), r = new Float32Array(n);
  const noise = smoothNoise(n, 260, rand);
  const freqs = [110, 165, 220, 330, 495, 742];
  const phases = new Float64Array(freqs.length);
  for (let i = 0; i < n; i++) {
    const t = i / SR, p = t / dur;
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, p)), 1.5);
    let sig = 0;
    for (let j = 0; j < freqs.length; j++) {
      const sweep = freqs[j] * (1 + 1.8 * Math.pow(p, 1.7));
      phases[j] += 2 * Math.PI * sweep / SR;
      sig += (0.07 / (1 + j * 0.2)) * Math.sin(phases[j] + j * 0.5);
    }
    sig *= env;
    const air = 0.16 * noise[i] * env * p;
    const pulse = Math.exp(-Math.pow((t - (dur - 0.8)) / 0.15, 2)) * 0.30 * Math.sin(2 * Math.PI * 42 * t);
    const mono = sig + air + pulse;
    l[i] = mono * (0.98 + 0.04 * Math.sin(2 * Math.PI * 0.12 * t));
    r[i] = mono * (0.98 + 0.04 * Math.sin(2 * Math.PI * 0.11 * t + 1.4));
  }
  writeWav("threshold_riser.wav", l, r);
}

function makePresenceBed() {
  const dur = 28, n = Math.floor(SR * dur), rand = rngFactory(71);
  const l = new Float32Array(n), r = new Float32Array(n);
  const dust = smoothNoise(n, 1300, rand);
  const tones = [36.71, 55, 73.42, 109.12];
  const phases = new Float64Array(tones.length);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let mono = 0;
    for (let j = 0; j < tones.length; j++) {
      const detune = 0.004 * Math.sin(2 * Math.PI * (0.013 + j * 0.004) * t + j);
      phases[j] += 2 * Math.PI * tones[j] * (1 + detune) / SR;
      mono += (0.12 / (1 + j * 0.45)) * Math.sin(phases[j]);
    }
    mono *= 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.021 * t + 0.7);
    mono += dust[i] * 0.20;
    for (const c of [4.2, 11.8, 18.6, 24.3]) {
      const e = Math.exp(-Math.pow((t - c) / 0.7, 2));
      mono += 0.06 * e * Math.sin(2 * Math.PI * (301 + 13 * Math.sin(c)) * t);
    }
    l[i] = mono + 0.023 * Math.sin(2 * Math.PI * 121.1 * t);
    r[i] = mono + 0.023 * Math.sin(2 * Math.PI * 120.4 * t + 1.2);
  }
  writeWav("presence_bed.wav", l, r);
}

function makeRoomGlitch() {
  const dur = 3.2, n = Math.floor(SR * dur), rand = rngFactory(113);
  const mono = new Float32Array(n), l = new Float32Array(n), r = new Float32Array(n);
  const noise = smoothNoise(n, 100, rand);
  const events = [
    [0.35, 0.035, 611], [0.82, 0.043, 943], [1.31, 0.038, 1271],
    [2.05, 0.05, 421], [2.42, 0.04, 1117],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0.14 * noise[i] * Math.exp(-t / 2.3);
    for (const [c, w, f] of events) {
      const e = Math.exp(-Math.pow((t - c) / w, 2));
      s += e * (0.21 * Math.sin(2 * Math.PI * f * t) + 0.11 * Math.sin(2 * Math.PI * f * 1.414 * t));
    }
    mono[i] = s;
  }
  const delay = Math.floor(0.013 * SR);
  for (let i = 0; i < n; i++) {
    l[i] = mono[i];
    r[i] = mono[Math.max(0, i - delay)];
  }
  writeWav("room_glitch.wav", l, r);
}


function makeScream() {
  const dur = 4.8;
  const n = Math.floor(SR * dur);
  const rand = rngFactory(911);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const breath = smoothNoise(n, 34, rand);
  let phaseL = 0;
  let phaseR = 0;

  const smoothstep = (a, b, x) => {
    const p = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return p * p * (3 - 2 * p);
  };

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / dur;
    const attack = smoothstep(0, 0.08, p);
    const release = 1 - smoothstep(0.78, 1, p);
    const env = attack * release;

    const climb = smoothstep(0.02, 0.58, p);
    const collapse = smoothstep(0.66, 0.98, p);
    const fundamental =
      245 +
      430 * climb -
      150 * collapse +
      18 * Math.sin(2 * Math.PI * 5.7 * t) +
      7 * Math.sin(2 * Math.PI * 11.3 * t);

    phaseL += (2 * Math.PI * fundamental) / SR;
    phaseR += (2 * Math.PI * fundamental * 1.0021) / SR;

    let voiceL = 0;
    let voiceR = 0;
    const formants = [
      [860, 0.95, 500],
      [2250, 0.72, 800],
      [3350, 0.38, 1000],
    ];

    for (let h = 1; h <= 22; h++) {
      const hf = fundamental * h;
      let weight = 0.025 / Math.pow(h, 0.58);
      for (const [center, gain, width] of formants) {
        const d = (hf - center) / width;
        weight += (gain * Math.exp(-d * d)) / (h + 1.5);
      }
      voiceL += weight * Math.sin(phaseL * h + h * 0.17);
      voiceR += weight * Math.sin(phaseR * h + h * 0.21);
    }

    const raspGate =
      0.35 +
      0.65 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * (27 + 8 * p) * t)), 2);
    const air = breath[i] * (0.34 + 0.28 * climb) * raspGate;

    const sub =
      0.12 *
      Math.sin(2 * Math.PI * (46 + 7 * Math.sin(2 * Math.PI * 0.4 * t)) * t) *
      Math.exp(-Math.pow((p - 0.55) / 0.34, 2));

    const crack =
      0.2 *
      Math.exp(-Math.pow((t - 3.05) / 0.08, 2)) *
      (Math.sin(2 * Math.PI * 1400 * t) + 0.45 * Math.sin(2 * Math.PI * 1980 * t));

    const driveL = Math.tanh((voiceL + air + sub + crack) * 2.3) * env;
    const driveR = Math.tanh((voiceR + air * 0.96 + sub + crack * 0.92) * 2.3) * env;

    const spectralTail =
      (0.035 * Math.sin(2 * Math.PI * 612 * t) +
        0.026 * Math.sin(2 * Math.PI * 1009 * t + 0.4)) *
      Math.exp(-Math.max(0, t - 3.4) * 1.7);

    l[i] = 0.78 * driveL + spectralTail;
    r[i] = 0.78 * driveR + spectralTail * 0.94;
  }

  writeWav("serara_scream.wav", l, r);
}

makeAwakening();
makeRiser();
makePresenceBed();
makeRoomGlitch();
makeScream();

fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify({
    generated: true,
    source: "SERAPH deterministic procedural sound generator",
    sampleRate: SR,
    assets: [
      "awakening_impact.wav",
      "threshold_riser.wav",
      "presence_bed.wav",
      "room_glitch.wav",
      "serara_scream.wav"
    ]
  }, null, 2)
);

console.log("SERARA cinematic sound assets generated:", OUT);
