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
  "01-arrival",
  "02-recognition-smile",
  "03-raised-hand",
  "04-afterimage",
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
    { timeout: 20000 },
  );

  const telemetry = {};

  for (const label of checkpoints) {
    // Intentionally move the raw pointer against the synthetic camera signal.
    // Camera authority must keep SERARA driven by semantic perception.
    if (label === "01-arrival") {
      await page.mouse.move(viewport.width - 8, 8);
    } else if (label === "02-recognition-smile") {
      await page.mouse.move(8, viewport.height - 8);
    } else if (label === "03-raised-hand") {
      await page.mouse.move(8, 8);
    } else {
      await page.mouse.move(viewport.width - 8, viewport.height - 8);
    }
    await page.waitForFunction(
      (checkpoint) => {
        const state = globalThis.__SERARA_PRESENCE__ ?? {};

        switch (checkpoint) {
          case "01-arrival":
            return (
              (state.cameraLive ?? 0) >= 0.5 &&
              (state.sensorMotion ?? 0) >= 0.6
            );
          case "02-recognition-smile":
            return (
              (state.cameraLive ?? 0) >= 0.5 &&
              (state.sensorSmile ?? 0) >= 0.5 &&
              (state.recognition ?? 0) >= 0.12
            );
          case "03-raised-hand":
            return (
              (state.cameraLive ?? 0) >= 0.5 &&
              (state.sensorHand ?? 0) >= 0.5 &&
              (state.sensorOpenness ?? 0) >= 0.5
            );
          case "04-afterimage":
            return (
              (state.proofTime ?? 0) >= 10 &&
              (state.cameraLive ?? 1) < 0.5 &&
              (state.sensorConfidence ?? 1) <= 0.2 &&
              (state.afterimage ?? 0) >= 0.16
            );
          default:
            return false;
        }
      },
      label,
      { timeout: 25000, polling: 25 },
    );

    telemetry[label] = await page.evaluate(() => ({
      ...(globalThis.__SERARA_PRESENCE__ ?? {}),
      capturedAt: performance.now(),
    }));
  }

  await page.screenshot({
    path: join(outputRoot, `${name}-afterimage-poster.png`),
  });

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
);

const mobile = await captureEncounter(
  "mobile",
  { width: 390, height: 844 },
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

  if (arrival.inputMode !== "camera" || (arrival.cameraAuthority ?? 0) < 0.5) {
    failures.push("raw pointer retained authority after camera activation");
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

  if ((hand.cameraEmbodiment ?? 0) < 0.42) {
    failures.push("camera semantics remained too weak to enter embodied response");
  }

  if (hand.inputMode !== "camera") {
    failures.push("raised-hand phase fell back to pointer authority");
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

const manifest = {
  head: process.env.GITHUB_SHA ?? "local",
  route: "/the-body?perceptionProof=1&pose=grace",
  method: "synthetic semantic perception / continuous session",
  limitation:
    "Validates response mapping only; real MediaPipe camera detection remains a real-device gate.",
  checkpoints,
  desktop,
  mobile,
};

await writeFile(
  join(outputRoot, "proof-telemetry.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(JSON.stringify(manifest, null, 2));

assertSemanticProof("desktop", desktop);
assertSemanticProof("mobile", mobile);

await writeFile(
  join(outputRoot, "proof-manifest.txt"),
  [
    `commit=${manifest.head}`,
    `route=${manifest.route}`,
    "method=synthetic-semantic-continuous-session",
    "sequence=condition-gated arrival -> recognition+smile -> raised-hand -> afterimage",
    "proof=checkpoint telemetry + adversarial raw-pointer movement + continuous WebM motion capture + afterimage poster",
    "real-camera-qa=OPEN",
    "",
  ].join("\n"),
);
