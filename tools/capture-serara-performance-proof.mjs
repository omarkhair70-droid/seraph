import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const outputRoot = join(
  process.cwd(),
  "artifacts",
  "serara-performance-proof",
);
const url =
  "http://127.0.0.1:3000/the-body?performanceProof=1";

const checkpoints = [
  {
    label: "01-attune",
    test: (state) =>
      state.performancePhase === "attune" &&
      (state.recognition ?? 0) >= 0.28 &&
      (state.performanceFracture ?? 1) <= 0.08,
  },
  {
    label: "02-strain",
    test: (state) =>
      state.performancePhase === "strain" &&
      (state.performanceTension ?? 0) >= 0.2 &&
      (state.performanceFracture ?? 1) <= 0.18,
  },
  {
    label: "03-fracture",
    test: (state) =>
      state.performancePhase === "fracture" &&
      (state.performanceFracture ?? 0) >= 0.45 &&
      (state.performanceTension ?? 0) >= 0.5,
  },
  {
    label: "04-aftermath",
    test: (state) =>
      state.performancePhase === "aftermath" &&
      (state.performanceFall ?? 0) >= 0.42 &&
      (state.performanceResidue ?? 0) >= 0.3,
  },
  {
    label: "05-reform",
    test: (state) =>
      state.performancePhase === "reform" &&
      (state.performanceGrace ?? 0) >= 0.55 &&
      (state.performanceFall ?? 1) <= 0.32,
  },
  {
    label: "06-residue",
    test: (state) =>
      (state.proofTime ?? 0) >= 18 &&
      (state.performanceFracture ?? 1) <= 0.05 &&
      (state.performanceGrace ?? 0) >= 0.72,
  },
];

await mkdir(outputRoot, { recursive: true });

async function captureEncounter(name, viewport) {
  const browser = await chromium.launch({ headless: true });
  const videoDir = join(outputRoot, `${name}-video-tmp`);
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: videoDir,
      size: viewport,
    },
  });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => Boolean(globalThis.__SERARA_PRESENCE__),
    undefined,
    { timeout: 25000 },
  );

  const telemetry = {};

  for (const checkpoint of checkpoints) {
    await page.waitForFunction(
      ({ label }) => {
        const state = globalThis.__SERARA_PRESENCE__ ?? {};

        switch (label) {
          case "01-attune":
            return (
              state.performancePhase === "attune" &&
              (state.recognition ?? 0) >= 0.28 &&
              (state.performanceFracture ?? 1) <= 0.08
            );
          case "02-strain":
            return (
              state.performancePhase === "strain" &&
              (state.performanceTension ?? 0) >= 0.2 &&
              (state.performanceFracture ?? 1) <= 0.18
            );
          case "03-fracture":
            return (
              state.performancePhase === "fracture" &&
              (state.performanceFracture ?? 0) >= 0.45 &&
              (state.performanceTension ?? 0) >= 0.5
            );
          case "04-aftermath":
            return (
              state.performancePhase === "aftermath" &&
              (state.performanceFall ?? 0) >= 0.42 &&
              (state.performanceResidue ?? 0) >= 0.3
            );
          case "05-reform":
            return (
              state.performancePhase === "reform" &&
              (state.performanceGrace ?? 0) >= 0.55 &&
              (state.performanceFall ?? 1) <= 0.32
            );
          case "06-residue":
            return (
              (state.proofTime ?? 0) >= 18 &&
              (state.performanceFracture ?? 1) <= 0.05 &&
              (state.performanceGrace ?? 0) >= 0.72
            );
          default:
            return false;
        }
      },
      { label: checkpoint.label },
      { timeout: 35000, polling: 25 },
    );

    telemetry[checkpoint.label] = await page.evaluate(() => ({
      ...(globalThis.__SERARA_PRESENCE__ ?? {}),
      capturedAt: performance.now(),
    }));
  }

  await page.screenshot({
    path: join(outputRoot, `${name}-final-poster.png`),
  });

  const video = page.video();
  await context.close();

  if (video) {
    await video.saveAs(join(outputRoot, `${name}-performance.webm`));
  }

  await browser.close();
  return telemetry;
}

const desktop = await captureEncounter(
  "desktop",
  { width: 1440, height: 1000 },
);

const mobile = await captureEncounter(
  "mobile",
  { width: 390, height: 844 },
);

function assertPerformanceArc(label, telemetry) {
  const attune = telemetry["01-attune"] ?? {};
  const strain = telemetry["02-strain"] ?? {};
  const fracture = telemetry["03-fracture"] ?? {};
  const aftermath = telemetry["04-aftermath"] ?? {};
  const reform = telemetry["05-reform"] ?? {};
  const residue = telemetry["06-residue"] ?? {};

  const failures = [];

  if (attune.performancePhase !== "attune") {
    failures.push(
      `calm presence did not reach ATTUNE (got ${attune.performancePhase})`,
    );
  }

  if ((attune.recognition ?? 0) < 0.28) {
    failures.push("ATTUNE did not contain meaningful recognition");
  }

  if ((attune.performanceFracture ?? 1) > 0.08) {
    failures.push("calm presence triggered fracture");
  }

  if ((attune.performanceHeat ?? 1) > 0.38) {
    failures.push("calm attunement remained too hot");
  }

  if (strain.performancePhase !== "strain") {
    failures.push(
      `disturbance did not spend time in STRAIN (got ${strain.performancePhase})`,
    );
  }

  if ((strain.performanceTension ?? 0) < 0.2) {
    failures.push("STRAIN did not create readable tension");
  }

  if ((strain.performanceFracture ?? 1) > 0.18) {
    failures.push("STRAIN skipped too quickly into fracture");
  }

  if (fracture.performancePhase !== "fracture") {
    failures.push(
      `rupture checkpoint was not FRACTURE (got ${fracture.performancePhase})`,
    );
  }

  if ((fracture.performanceFracture ?? 0) < 0.45) {
    failures.push("FRACTURE envelope was too weak");
  }

  if ((fracture.performanceTension ?? 0) < 0.5) {
    failures.push("FRACTURE did not peak tension");
  }

  if (aftermath.performancePhase !== "aftermath") {
    failures.push(
      `rupture did not leave AFTERMATH (got ${aftermath.performancePhase})`,
    );
  }

  if ((aftermath.performanceFall ?? 0) < 0.42) {
    failures.push("AFTERMATH did not preserve bodily fall");
  }

  if ((aftermath.performanceResidue ?? 0) < 0.3) {
    failures.push("AFTERMATH lost encounter residue too quickly");
  }

  if (reform.performancePhase !== "reform") {
    failures.push(
      `AFTERMATH did not progress into REFORM (got ${reform.performancePhase})`,
    );
  }

  if ((reform.performanceGrace ?? 0) < 0.55) {
    failures.push("REFORM did not restore grace progressively");
  }

  if ((reform.performanceFall ?? 1) > 0.32) {
    failures.push("REFORM remained trapped in fall");
  }

  if ((residue.performanceFracture ?? 1) > 0.05) {
    failures.push("late encounter still carried active fracture");
  }

  if ((residue.performanceGrace ?? 0) < 0.72) {
    failures.push("late encounter did not return toward coherent grace");
  }

  if (failures.length > 0) {
    throw new Error(
      `${label} performance proof failed:\n- ${failures.join("\n- ")}`,
    );
  }
}

const manifest = {
  head: process.env.GITHUB_SHA ?? "local",
  route: "/the-body?performanceProof=1",
  method: "deterministic interpreted encounter / continuous performance",
  checkpoints: checkpoints.map(({ label }) => label),
  desktop,
  mobile,
};

await writeFile(
  join(outputRoot, "proof-telemetry.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(JSON.stringify(manifest, null, 2));

assertPerformanceArc("desktop", desktop);
assertPerformanceArc("mobile", mobile);

await writeFile(
  join(outputRoot, "proof-manifest.txt"),
  [
    `commit=${manifest.head}`,
    `route=${manifest.route}`,
    "method=deterministic-embodied-performance",
    "sequence=condition-gated attune -> strain -> fracture -> aftermath -> reform -> residue",
    "proof=checkpoint telemetry + continuous WebM + final poster",
    "real-camera-artistic-review=OPEN",
    "",
  ].join("\n"),
);
