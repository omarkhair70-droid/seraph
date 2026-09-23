let lastBurstAt = -Infinity;

export function triggerSeraraBurst() {
  if (typeof performance === "undefined") return;
  lastBurstAt = performance.now();
}

export function getSeraraBurst() {
  if (typeof performance === "undefined" || !Number.isFinite(lastBurstAt)) {
    return 0;
  }

  const age = Math.max(0, (performance.now() - lastBurstAt) / 1000);
  return Math.exp(-age * 3.4);
}
