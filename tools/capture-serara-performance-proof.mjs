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
  ["01-attune", 7000],
  ["02-strain", 8800],
  ["03-fracture", 10200],
  ["04-aftermath", 12000],
  ["05-reform", 15500],
  ["06-residue", 18800],
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

  for (const [label, targetMs] of checkpoints) {
    const targetSeconds = targetMs / 1000;

    await page.waitForFunction(
      (target) => {
        const value = globalThis.__SERARA_PRESENCE__?.proofTime;
        return typeof value === "number" && value >= target;
      },
      targetSeconds,
      { timeout: 30000, polling: 25 },
    );

    telemetry[label] = await page.evaluate(() => ({
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
  checkpoints: Object.fromEntries(checkpoints),
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
    "sequence=attune@7.0s strain@8.8s fracture@10.2s aftermath@12.0s reform@15.5s residue@18.8s",
    "proof=checkpoint telemetry + continuous WebM + final poster",
    "real-camera-artistic-review=OPEN",
    "",
  ].join("\n"),
);
