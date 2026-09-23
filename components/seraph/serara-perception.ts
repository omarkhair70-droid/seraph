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

let snapshot: SeraraPerceptionSnapshot = { ...DEFAULT_SNAPSHOT };

export function getSeraraPerceptionSnapshot(): SeraraPerceptionSnapshot {
  return snapshot;
}

export function publishSeraraPerception(
  next: Partial<SeraraPerceptionSnapshot>,
) {
  snapshot = {
    ...snapshot,
    ...next,
  };
}

export function resetSeraraPerception(
  status: SeraraPerceptionStatus = "idle",
) {
  snapshot = {
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
