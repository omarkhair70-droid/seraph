export type SeraraPerceptionStatus =
  | "idle"
  | "requesting"
  | "loading"
  | "active"
  | "denied"
  | "unsupported"
  | "error";

export type SeraraPerceptionSnapshot = {
  status: SeraraPerceptionStatus;
  confidence: number;
  focusX: number;
  focusY: number;
  proximity: number;
  motionEnergy: number;
  stillness: number;
  smile: number;
  openness: number;
  shoulderAsymmetry: number;
  leftHandRaised: number;
  rightHandRaised: number;
  handSalience: number;
  headYaw: number;
  headRoll: number;
  lastSeenAt: number;
};

type SeraraPerceptionStore = {
  snapshot: SeraraPerceptionSnapshot;
};

const DEFAULT_SNAPSHOT: SeraraPerceptionSnapshot = {
  status: "idle",
  confidence: 0,
  focusX: 0,
  focusY: 0,
  proximity: 0,
  motionEnergy: 0,
  stillness: 0,
  smile: 0,
  openness: 0,
  shoulderAsymmetry: 0,
  leftHandRaised: 0,
  rightHandRaised: 0,
  handSalience: 0,
  headYaw: 0,
  headRoll: 0,
  lastSeenAt: -Infinity,
};

type SeraraPerceptionGlobal = typeof globalThis & {
  __SERARA_PERCEPTION_STORE__?: SeraraPerceptionStore;
};

function getStore(): SeraraPerceptionStore {
  const root = globalThis as SeraraPerceptionGlobal;

  if (!root.__SERARA_PERCEPTION_STORE__) {
    root.__SERARA_PERCEPTION_STORE__ = {
      snapshot: { ...DEFAULT_SNAPSHOT },
    };
  }

  return root.__SERARA_PERCEPTION_STORE__;
}

export function getSeraraPerceptionSnapshot(): SeraraPerceptionSnapshot {
  return getStore().snapshot;
}

export function publishSeraraPerception(
  next: Partial<SeraraPerceptionSnapshot>,
) {
  const store = getStore();

  store.snapshot = {
    ...store.snapshot,
    ...next,
  };
}

export function resetSeraraPerception(
  status: SeraraPerceptionStatus = "idle",
) {
  getStore().snapshot = {
    ...DEFAULT_SNAPSHOT,
    status,
  };
}

export function isSeraraCameraPerceptionLive(
  current: SeraraPerceptionSnapshot,
  now = typeof performance === "undefined" ? 0 : performance.now(),
) {
  return (
    current.status === "active" &&
    current.confidence >= 0.28 &&
    now - current.lastSeenAt < 900
  );
}
