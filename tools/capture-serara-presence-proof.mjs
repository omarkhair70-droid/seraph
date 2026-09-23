import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const outputRoot = join(process.cwd(), "artifacts", "serara-presence-proof");
const videoTempRoot = join(tmpdir(), "serara-presence-proof-video");
const url = "http://127.0.0.1:3000/the-body?presenceProof=1&pose=grace";
const milestones = [
  {
    label: "01-arrival",
    description:
      "fast approach has been noticed; avoidance is present while recognition is still withheld",
  },
  {
    label: "02-recognition",
    description:
      "held presence has quieted the body and recognition has materially emerged",
  },
  {
    label: "03-afterimage",
    description:
      "the visitor has departed; recognition has released while encounter memory remains",
  },
];

await mkdir(outputRoot, { recursive: true });
await mkdir(videoTempRoot, { recursive: true });

async function waitForBody(page) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => Boolean(globalThis.__SERARA_PRESENCE__),
    undefined,
    { timeout: 30000 },
  );
}

async function waitForMilestone(page, label) {
  await page.waitForFunction(
    (milestone) => {
      const state = globalThis.__SERARA_PRESENCE__;
      if (!state) return false;

      if (milestone === "01-arrival") {
        return (
          state.proofTime >= 1.4 &&
          state.avoidance >= 0.2 &&
          state.recognition <= 0.12
        );
      }

      if (milestone === "02-recognition") {
        return (
          state.proofTime >= 4 &&
          state.proofTime < 9 &&
          state.stillness >= 0.5 &&
          state.recognition >= 0.35
        );
      }

      return (
        state.proofTime >= 10 &&
        state.recognition <= 0.2 &&
        state.afterimage >= 0.35
      );
    },
    label,
    { timeout: 30000, polling: 25 },
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

  for (const milestone of milestones) {
    await waitForMilestone(page, milestone.label);
    telemetry[milestone.label] = await readTelemetry(page);
  }

  await page.waitForFunction(
    () => (globalThis.__SERARA_PRESENCE__?.proofTime ?? -1) >= 12,
    undefined,
    { timeout: 30000, polling: 25 },
  );

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

  for (const milestone of milestones) {
    const page = await context.newPage();
    await waitForBody(page);
    await waitForMilestone(page, milestone.label);

    await page.screenshot({
      path: join(outputRoot, `${name}-${milestone.label}.png`),
    });

    await page.screenshot({
      path: join(outputRoot, `${name}-${milestone.label}-close.png`),
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
  method:
    "clean continuous video/telemetry plus isolated semantic checkpoint stills",
  milestones,
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
    "method=semantic-milestones",
    "sequence=avoidance -> recognition/stillness -> afterimage",
    "proof=uninterrupted WebM + semantic telemetry + isolated full/close frames",
    "",
  ].join("\n"),
);
