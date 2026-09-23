import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const outputRoot = join(process.cwd(), "artifacts", "serara-presence-proof");
const videoTempRoot = join(tmpdir(), "serara-presence-proof-video");
const url = "http://127.0.0.1:3000/the-body?presenceProof=1&pose=grace";
const checkpoints = [
  ["01-arrival", 900],
  ["02-recognition", 3600],
  ["03-afterimage", 6800],
];

await mkdir(outputRoot, { recursive: true });
await mkdir(videoTempRoot, { recursive: true });

async function waitForBody(page) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => Boolean(globalThis.__SERARA_PRESENCE__),
    undefined,
    { timeout: 20000 },
  );
}

async function waitForProofTime(page, targetMs) {
  await page.waitForFunction(
    (target) =>
      (globalThis.__SERARA_PRESENCE__?.proofTime ?? -1) >= target,
    targetMs / 1000,
    { timeout: 20000, polling: 25 },
  );
}

async function readTelemetry(page) {
  return page.evaluate(() => ({
    ...(globalThis.__SERARA_PRESENCE__ ?? {}),
    capturedAt: performance.now(),
  }));
}

async function captureContinuousEncounter(name, viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: videoTempRoot,
      size: viewport,
    },
  });
  const page = await context.newPage();
  await waitForBody(page);

  const video = page.video();
  const telemetry = {};

  for (const [label, targetMs] of checkpoints) {
    await waitForProofTime(page, targetMs);
    telemetry[label] = await readTelemetry(page);
  }

  await waitForProofTime(page, 7400);
  await context.close();

  if (video) {
    await video.saveAs(join(outputRoot, `${name}-encounter.webm`));
  }

  await browser.close();
  return telemetry;
}

async function captureCheckpointStills(name, viewport, closeClip) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });

  for (const [label, targetMs] of checkpoints) {
    const page = await context.newPage();
    await waitForBody(page);
    await waitForProofTime(page, targetMs);

    await page.screenshot({
      path: join(outputRoot, `${name}-${label}.png`),
    });

    await page.screenshot({
      path: join(outputRoot, `${name}-${label}-close.png`),
      clip: closeClip,
    });

    await page.close();
  }

  await context.close();
  await browser.close();
}

const desktop = await captureContinuousEncounter(
  "desktop",
  { width: 1440, height: 1000 },
);

const mobile = await captureContinuousEncounter(
  "mobile",
  { width: 390, height: 844 },
);

await captureCheckpointStills(
  "desktop",
  { width: 1440, height: 1000 },
  { x: 520, y: 55, width: 400, height: 620 },
);

await captureCheckpointStills(
  "mobile",
  { width: 390, height: 844 },
  { x: 35, y: 38, width: 320, height: 405 },
);

const manifest = {
  head: process.env.GITHUB_SHA ?? "local",
  route: "/the-body?presenceProof=1&pose=grace",
  method: "clean continuous video/telemetry plus isolated checkpoint stills",
  checkpoints: Object.fromEntries(checkpoints),
  desktop,
  mobile,
};

await writeFile(
  join(outputRoot, "proof-telemetry.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

await writeFile(
  join(outputRoot, "proof-manifest.txt"),
  [
    `commit=${manifest.head}`,
    `route=${manifest.route}`,
    "method=clean-continuous-video-plus-isolated-stills",
    "sequence=arrival@0.9s recognition@3.6s afterimage@6.8s",
    "proof=uninterrupted WebM + exact checkpoint telemetry + isolated full/close frames",
    "",
  ].join("\n"),
);
