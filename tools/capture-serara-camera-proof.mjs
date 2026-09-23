import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const outputRoot = join(
  process.cwd(),
  "artifacts",
  "serara-camera-perception-proof",
);
const url =
  "http://127.0.0.1:3000/the-body?perceptionProof=1&pose=grace";

const checkpoints = [
  ["01-arrival", 900],
  ["02-recognition-smile", 3600],
  ["03-raised-hand", 5500],
  ["04-afterimage", 7600],
];

await mkdir(outputRoot, { recursive: true });

async function captureEncounter(name, viewport, closeClip) {
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
    { timeout: 20000 },
  );

  const telemetry = {};

  for (const [label, targetMs] of checkpoints) {
    const targetSeconds = targetMs / 1000;

    await page.waitForFunction(
      (target) =>
        (globalThis.__SERARA_PRESENCE__?.proofTime ?? -1) >= target,
      targetSeconds,
      { timeout: 20000, polling: 25 },
    );

    await page.screenshot({
      path: join(outputRoot, `${name}-${label}.png`),
    });

    await page.screenshot({
      path: join(outputRoot, `${name}-${label}-close.png`),
      clip: closeClip,
    });

    telemetry[label] = await page.evaluate(() => ({
      ...(globalThis.__SERARA_PRESENCE__ ?? {}),
      capturedAt: performance.now(),
    }));
  }

  const video = page.video();
  await context.close();

  if (video) {
    await video.saveAs(join(outputRoot, `${name}-encounter.webm`));
  }

  await browser.close();
  return telemetry;
}

const desktop = await captureEncounter(
  "desktop",
  { width: 1440, height: 1000 },
  { x: 520, y: 55, width: 400, height: 620 },
);

const mobile = await captureEncounter(
  "mobile",
  { width: 390, height: 844 },
  { x: 35, y: 38, width: 320, height: 405 },
);

function assertSemanticProof(label, telemetry) {
  const arrival = telemetry["01-arrival"] ?? {};
  const recognition = telemetry["02-recognition-smile"] ?? {};
  const hand = telemetry["03-raised-hand"] ?? {};
  const afterimage = telemetry["04-afterimage"] ?? {};

  const failures = [];

  if ((arrival.cameraLive ?? 0) < 0.5) {
    failures.push("synthetic camera source never became authoritative");
  }

  if ((arrival.sensorMotion ?? 0) < 0.35) {
    failures.push("arrival did not contain high movement energy");
  }

  if ((recognition.sensorSmile ?? 0) < 0.35) {
    failures.push("smile semantic signal did not reach THE BODY");
  }

  if ((recognition.recognition ?? 0) < 0.12) {
    failures.push("held stillness did not accumulate recognition");
  }

  if ((hand.sensorHand ?? 0) < 0.35) {
    failures.push("raised-hand salience did not reach THE BODY");
  }

  if ((hand.sensorOpenness ?? 0) < 0.35) {
    failures.push("open-body semantic signal did not reach THE BODY");
  }

  if ((afterimage.afterimage ?? 0) < 0.16) {
    failures.push("encounter afterimage decayed before departure proof");
  }

  if ((afterimage.sensorConfidence ?? 1) > 0.2) {
    failures.push("synthetic departure did not remove current tracking");
  }

  if (failures.length > 0) {
    throw new Error(
      `${label} camera semantic proof failed:\n- ${failures.join("\n- ")}`,
    );
  }
}

assertSemanticProof("desktop", desktop);
assertSemanticProof("mobile", mobile);

const manifest = {
  head: process.env.GITHUB_SHA ?? "local",
  route: "/the-body?perceptionProof=1&pose=grace",
  method: "synthetic semantic perception / continuous session",
  limitation:
    "Validates response mapping only; real MediaPipe camera detection remains a real-device gate.",
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
    "method=synthetic-semantic-continuous-session",
    "sequence=arrival@0.9s recognition+smile@3.6s raised-hand@5.5s afterimage@7.6s",
    "proof=full-frame + close-frame + telemetry + WebM motion capture",
    "real-camera-qa=OPEN",
    "",
  ].join("\n"),
);
