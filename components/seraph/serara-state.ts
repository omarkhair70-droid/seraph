import * as THREE from "three";
import { getSeraraPerformanceSnapshot } from "./serara-performance";

export type SeraraState = {
  grace: number;
  tension: number;
  fall: number;
};

function smoothStep(edge0: number, edge1: number, value: number) {
  const x = THREE.MathUtils.clamp(
    (value - edge0) / Math.max(0.0001, edge1 - edge0),
    0,
    1,
  );

  return x * x * (3 - 2 * x);
}

export function getSeraraState(time: number): SeraraState {
  if (typeof window !== "undefined") {
    const forced = new URLSearchParams(window.location.search).get("pose");

    if (forced === "grace") {
      return { grace: 1, tension: 0, fall: 0 };
    }

    if (forced === "tension") {
      return { grace: 0, tension: 1, fall: 0 };
    }

    if (forced === "fall") {
      return { grace: 0, tension: 0, fall: 1 };
    }
  }

  const performance = getSeraraPerformanceSnapshot();

  if (performance.active) {
    return {
      grace: performance.grace,
      tension: performance.tension,
      fall: performance.fall,
    };
  }

  const cycle = time % 30;

  if (cycle < 8) {
    return { grace: 1, tension: 0, fall: 0 };
  }

  if (cycle < 12) {
    const x = smoothStep(8, 12, cycle);
    return { grace: 1 - x, tension: x, fall: 0 };
  }

  if (cycle < 18) {
    return { grace: 0, tension: 1, fall: 0 };
  }

  if (cycle < 23) {
    const x = smoothStep(18, 23, cycle);
    return { grace: 0, tension: 1 - x, fall: x };
  }

  if (cycle < 27) {
    return { grace: 0, tension: 0, fall: 1 };
  }

  const x = smoothStep(27, 30, cycle);
  return { grace: x, tension: 0, fall: 1 - x };
}

export function getSeraraPresence(pointer: THREE.Vector2) {
  const distance = THREE.MathUtils.clamp(pointer.length(), 0, 1.5);
  return 1 - smoothStep(0.18, 1.18, distance);
}

export function getSeraraPulse(time: number, state: SeraraState) {
  const frequency =
    0.68 * state.grace +
    1.55 * state.tension +
    0.92 * state.fall;

  const raw = Math.sin(time * frequency * Math.PI * 2) * 0.5 + 0.5;
  return Math.pow(raw, 2.2);
}


export function getSeraraWorldPresence(pointer: THREE.Vector2) {
  const performance = getSeraraPerformanceSnapshot();

  if (performance.active) {
    return performance.worldPresence;
  }

  return getSeraraPresence(pointer);
}

export function getSeraraWorldAttention(pointer: THREE.Vector2) {
  const performance = getSeraraPerformanceSnapshot();

  if (performance.active) {
    return {
      x: performance.attentionX,
      y: performance.attentionY,
    };
  }

  return {
    x: pointer.x,
    y: pointer.y,
  };
}
