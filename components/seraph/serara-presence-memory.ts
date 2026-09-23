import * as THREE from "three";

export type SeraraPresenceMind = {
  attention: THREE.Vector2;
  candidate: THREE.Vector2;
  memory: THREE.Vector2;
  candidateAge: number;
  heldStillFor: number;
  stillness: number;
  recognition: number;
  avoidance: number;
  afterimage: number;
  acceptedAttention: number;
};

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = THREE.MathUtils.clamp(
    (value - edge0) / Math.max(0.0001, edge1 - edge0),
    0,
    1,
  );
  return x * x * (3 - 2 * x);
}

function damp(current: number, target: number, speed: number, delta: number) {
  return THREE.MathUtils.lerp(
    current,
    target,
    1 - Math.exp(-Math.max(0, speed) * Math.max(0, delta)),
  );
}

export function createSeraraPresenceMind(): SeraraPresenceMind {
  return {
    attention: new THREE.Vector2(),
    candidate: new THREE.Vector2(),
    memory: new THREE.Vector2(),
    candidateAge: 0,
    heldStillFor: 0,
    stillness: 0,
    recognition: 0,
    avoidance: 0,
    afterimage: 0,
    acceptedAttention: 0,
  };
}

/**
 * Interprets pointer presence as something SERARA notices rather than mirrors.
 *
 * The important behavior is temporal:
 * - fast motion delays recognition;
 * - stillness lets attention settle;
 * - accepted attention becomes a memory;
 * - leaving does not instantly reset the body.
 */
export function updateSeraraPresenceMind(
  mind: SeraraPresenceMind,
  pointer: THREE.Vector2,
  presence: number,
  movementEnergy: number,
  delta: number,
) {
  const candidateDistance = mind.candidate.distanceTo(pointer);

  if (candidateDistance > 0.14) {
    mind.candidate.copy(pointer);
    mind.candidateAge = 0;
  } else {
    mind.candidateAge += delta;
  }

  const stillTarget =
    presence *
    (1 - smoothstep(0.08, 0.46, movementEnergy));

  mind.stillness = damp(
    mind.stillness,
    stillTarget,
    stillTarget > mind.stillness ? 1.35 : 3.2,
    delta,
  );

  if (presence > 0.42 && movementEnergy < 0.2) {
    mind.heldStillFor = Math.min(8, mind.heldStillFor + delta);
  } else {
    mind.heldStillFor = Math.max(
      0,
      mind.heldStillFor - delta * (0.85 + movementEnergy * 1.8),
    );
  }

  const hesitation =
    0.32 +
    movementEnergy * 0.82 +
    (1 - presence) * 0.18;

  const canAccept =
    presence > 0.12 &&
    movementEnergy < 0.52 &&
    mind.candidateAge >= hesitation;

  if (canAccept) {
    const acceptance = THREE.MathUtils.clamp(
      0.7 + mind.stillness * 1.1,
      0.7,
      1.8,
    );

    mind.memory.lerp(
      mind.candidate,
      1 - Math.exp(-delta * acceptance),
    );
    mind.afterimage = Math.max(
      mind.afterimage,
      0.38 + presence * 0.42 + mind.stillness * 0.2,
    );
    mind.acceptedAttention = damp(
      mind.acceptedAttention,
      1,
      2.2,
      delta,
    );
  } else {
    mind.acceptedAttention = damp(
      mind.acceptedAttention,
      0,
      2.8,
      delta,
    );
  }

  const recognitionTarget =
    presence *
    smoothstep(0.72, 2.55, mind.heldStillFor) *
    (0.55 + mind.stillness * 0.45);

  mind.recognition = damp(
    mind.recognition,
    recognitionTarget,
    recognitionTarget > mind.recognition ? 0.82 : 1.65,
    delta,
  );

  const avoidanceTarget =
    presence *
    movementEnergy *
    (1 - mind.recognition * 0.72) *
    (0.45 + (1 - mind.stillness) * 0.55);

  mind.avoidance = damp(
    mind.avoidance,
    avoidanceTarget,
    avoidanceTarget > mind.avoidance ? 4.8 : 1.25,
    delta,
  );

  const afterimageTarget =
    presence > 0.16
      ? Math.max(
          mind.afterimage,
          presence * 0.48 + mind.recognition * 0.52,
        )
      : 0;

  mind.afterimage = damp(
    mind.afterimage,
    afterimageTarget,
    afterimageTarget > mind.afterimage ? 1.5 : 0.11,
    delta,
  );

  const attentionSpeed =
    0.34 +
    mind.acceptedAttention * 0.62 +
    mind.recognition * 0.26;

  mind.attention.lerp(
    mind.memory,
    1 - Math.exp(-delta * attentionSpeed),
  );

  return mind;
}
