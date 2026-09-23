import * as THREE from "three";

export type SeraraPerformancePhase =
  | "dormant"
  | "notice"
  | "attune"
  | "strain"
  | "fracture"
  | "aftermath"
  | "reform";

export type SeraraPerformanceSnapshot = {
  active: boolean;
  phase: SeraraPerformancePhase;
  phaseAge: number;
  encounterAge: number;
  grace: number;
  tension: number;
  fall: number;
  worldPresence: number;
  heat: number;
  fracture: number;
  residue: number;
  recognition: number;
  stillness: number;
  avoidance: number;
  afterimage: number;
  attentionX: number;
  attentionY: number;
};

type SeraraPerformanceStore = {
  snapshot: SeraraPerformanceSnapshot;
  phaseStartedAt: number;
  encounterStartedAt: number | null;
  fractureStartedAt: number | null;
  strainCharge: number;
  residue: number;
};

type SeraraPerformanceInput = {
  presence: number;
  movementEnergy: number;
  touchImpulse: number;
  recognition: number;
  stillness: number;
  avoidance: number;
  afterimage: number;
  attentionX: number;
  attentionY: number;
};

type SeraraPerformanceGlobal = typeof globalThis & {
  __SERARA_PERFORMANCE_STORE__?: SeraraPerformanceStore;
};

const INITIAL_SNAPSHOT: SeraraPerformanceSnapshot = {
  active: false,
  phase: "dormant",
  phaseAge: 0,
  encounterAge: 0,
  grace: 1,
  tension: 0,
  fall: 0,
  worldPresence: 0,
  heat: 0,
  fracture: 0,
  residue: 0,
  recognition: 0,
  stillness: 0,
  avoidance: 0,
  afterimage: 0,
  attentionX: 0,
  attentionY: 0,
};

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function damp(
  current: number,
  target: number,
  speed: number,
  delta: number,
) {
  return THREE.MathUtils.damp(current, target, speed, delta);
}

function getStore(): SeraraPerformanceStore {
  const root = globalThis as SeraraPerformanceGlobal;

  if (!root.__SERARA_PERFORMANCE_STORE__) {
    root.__SERARA_PERFORMANCE_STORE__ = {
      snapshot: { ...INITIAL_SNAPSHOT },
      phaseStartedAt: 0,
      encounterStartedAt: null,
      fractureStartedAt: null,
      strainCharge: 0,
      residue: 0,
    };
  }

  return root.__SERARA_PERFORMANCE_STORE__;
}

function setPhase(
  store: SeraraPerformanceStore,
  phase: SeraraPerformancePhase,
  now: number,
) {
  if (store.snapshot.phase === phase) return;

  store.snapshot.phase = phase;
  store.phaseStartedAt = now;
}

export function getSeraraPerformanceSnapshot(): SeraraPerformanceSnapshot {
  return getStore().snapshot;
}

export function resetSeraraPerformance() {
  const root = globalThis as SeraraPerformanceGlobal;
  root.__SERARA_PERFORMANCE_STORE__ = undefined;
}

export function updateSeraraPerformance(
  input: SeraraPerformanceInput,
  delta: number,
  now: number,
): SeraraPerformanceSnapshot {
  const store = getStore();
  const snapshot = store.snapshot;

  snapshot.active = true;

  const directPresence = clamp01(input.presence);
  const rememberedPresence = clamp01(
    Math.max(directPresence, input.afterimage * 0.42),
  );
  const agitation = clamp01(
    Math.max(
      input.avoidance,
      input.movementEnergy * 0.86,
      input.touchImpulse * 0.72,
    ),
  );
  const attunement = clamp01(
    input.recognition * (0.58 + input.stillness * 0.42),
  );

  if (directPresence > 0.16 && store.encounterStartedAt === null) {
    store.encounterStartedAt = now;
  }

  if (
    directPresence < 0.08 &&
    input.afterimage < 0.08 &&
    snapshot.phase === "dormant"
  ) {
    store.encounterStartedAt = null;
  }

  const encounterAge =
    store.encounterStartedAt === null
      ? 0
      : Math.max(0, now - store.encounterStartedAt);

  const strainTarget = clamp01(
    directPresence *
      (agitation * 0.78 + input.movementEnergy * 0.34) *
      (1 - attunement * 0.5),
  );

  const strainSpeed =
    strainTarget > store.strainCharge
      ? 0.72 + agitation * 0.95
      : 0.2 + input.stillness * 0.62;

  store.strainCharge = damp(
    store.strainCharge,
    strainTarget,
    strainSpeed,
    delta,
  );

  const mayFracture =
    store.fractureStartedAt === null &&
    encounterAge > 1.8 &&
    directPresence > 0.34 &&
    store.strainCharge > 0.58 &&
    agitation > 0.5;

  if (mayFracture) {
    store.fractureStartedAt = now;
    store.residue = Math.max(store.residue, 0.92);
    setPhase(store, "fracture", now);
  }

  let grace = 1;
  let tension = 0;
  let fall = 0;
  let fracture = 0;

  if (store.fractureStartedAt !== null) {
    const fractureAge = Math.max(0, now - store.fractureStartedAt);

    if (fractureAge < 1.55) {
      setPhase(store, "fracture", now);
      const rise = THREE.MathUtils.smoothstep(fractureAge, 0, 0.82);
      fracture = rise;
      tension = clamp01(0.5 + rise * 0.5);
      fall = THREE.MathUtils.smoothstep(fractureAge, 0.48, 1.55);
      grace = clamp01(1 - tension * 0.88 - fall * 0.55);
      store.residue = Math.max(store.residue, 0.94);
    } else if (fractureAge < 4.9) {
      setPhase(store, "aftermath", now);
      const aftermath = 1 - THREE.MathUtils.smoothstep(
        fractureAge,
        1.55,
        4.9,
      );
      fracture = aftermath * 0.34;
      fall = clamp01(0.3 + aftermath * 0.7);
      tension = aftermath * 0.24;
      grace = clamp01(0.14 + (1 - aftermath) * 0.36);
      store.residue = Math.max(store.residue, aftermath * 0.82);
    } else if (fractureAge < 8.6) {
      setPhase(store, "reform", now);
      const reform = THREE.MathUtils.smoothstep(fractureAge, 4.9, 8.6);
      const stillnessHelp = input.stillness * rememberedPresence * 0.18;
      grace = clamp01(0.42 + reform * 0.58 + stillnessHelp);
      fall = clamp01((1 - reform) * 0.34);
      tension = clamp01((1 - reform) * 0.08);
      fracture = 0;
      store.residue = damp(
        store.residue,
        0.14 + input.afterimage * 0.16,
        0.38 + input.stillness * 0.55,
        delta,
      );
    } else {
      store.fractureStartedAt = null;
      store.strainCharge *= 0.3;
      store.residue = Math.max(store.residue, input.afterimage * 0.18);
    }
  }

  if (store.fractureStartedAt === null) {
    if (directPresence < 0.1 && rememberedPresence < 0.12) {
      setPhase(store, store.residue > 0.18 ? "reform" : "dormant", now);
      grace = 0.9;
      tension = store.residue * 0.08;
      fall = store.residue * 0.06;
    } else if (attunement > 0.2 && input.stillness > 0.32) {
      setPhase(store, "attune", now);
      grace = clamp01(0.9 + attunement * 0.1);
      tension = clamp01(store.strainCharge * 0.16);
      fall = 0;
    } else if (store.strainCharge > 0.18 || agitation > 0.34) {
      setPhase(store, "strain", now);
      tension = clamp01(
        0.16 +
          store.strainCharge * 0.78 +
          agitation * directPresence * 0.24,
      );
      grace = clamp01(1 - tension * 0.7);
      fall = 0;
    } else {
      setPhase(store, directPresence > 0.12 ? "notice" : "dormant", now);
      const notice = clamp01(directPresence * 0.42 + attunement * 0.24);
      grace = clamp01(0.82 + notice * 0.18);
      tension = clamp01(agitation * directPresence * 0.16);
      fall = 0;
    }

    store.residue = damp(
      store.residue,
      input.afterimage * 0.2,
      input.stillness > 0.55 ? 0.5 : 0.2,
      delta,
    );
  }

  const heat = clamp01(
    tension * 0.58 +
      fall * 0.76 +
      fracture * 0.9 +
      store.strainCharge * 0.44 +
      store.residue * 0.18,
  );

  snapshot.phaseAge = Math.max(0, now - store.phaseStartedAt);
  snapshot.encounterAge = encounterAge;
  snapshot.grace = grace;
  snapshot.tension = tension;
  snapshot.fall = fall;
  snapshot.worldPresence = rememberedPresence;
  snapshot.heat = heat;
  snapshot.fracture = fracture;
  snapshot.residue = clamp01(store.residue);
  snapshot.recognition = clamp01(input.recognition);
  snapshot.stillness = clamp01(input.stillness);
  snapshot.avoidance = clamp01(input.avoidance);
  snapshot.afterimage = clamp01(input.afterimage);
  snapshot.attentionX = THREE.MathUtils.clamp(input.attentionX, -1, 1);
  snapshot.attentionY = THREE.MathUtils.clamp(input.attentionY, -1, 1);

  return snapshot;
}
