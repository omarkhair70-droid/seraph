"use client";

import { useEffect, useRef } from "react";
import {
  publishSeraraPerception,
  resetSeraraPerception,
  type SeraraPerceptionSnapshot,
} from "./serara-perception";

type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

type Category = {
  categoryName?: string;
  displayName?: string;
  score?: number;
};

type FaceResultLike = {
  faceLandmarks?: Landmark[][];
  faceBlendshapes?: Array<{
    categories?: Category[];
  }>;
};

type PoseResultLike = {
  landmarks?: Landmark[][];
};

const VISION_WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function signedClamp(value: number) {
  return Math.min(1, Math.max(-1, value));
}

function normalizeRange(value: number, low: number, high: number) {
  return clamp01((value - low) / Math.max(0.0001, high - low));
}

function damp(
  current: number,
  target: number,
  speed: number,
  deltaSeconds: number,
) {
  return (
    current +
    (target - current) *
      (1 - Math.exp(-Math.max(0, speed) * Math.max(0, deltaSeconds)))
  );
}

function distance(a?: Landmark, b?: Landmark) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mirroredX(value: number) {
  return signedClamp((0.5 - value) * 2);
}

function normalizedY(value: number) {
  return signedClamp((0.5 - value) * 2);
}

function categoryScore(categories: Category[] | undefined, key: string) {
  const item = categories?.find(
    (category) =>
      category.categoryName === key || category.displayName === key,
  );
  return clamp01(item?.score ?? 0);
}

function readSmile(result: FaceResultLike) {
  const categories = result.faceBlendshapes?.[0]?.categories;
  return clamp01(
    (categoryScore(categories, "mouthSmileLeft") +
      categoryScore(categories, "mouthSmileRight")) *
      0.5,
  );
}

function extractFeatures(
  faceResult: FaceResultLike,
  poseResult: PoseResultLike,
) {
  const face = faceResult.faceLandmarks?.[0];
  const pose = poseResult.landmarks?.[0];

  const noseFace = face?.[1];
  const leftEye = face?.[33];
  const rightEye = face?.[263];

  const nosePose = pose?.[0];
  const leftShoulder = pose?.[11];
  const rightShoulder = pose?.[12];
  const leftWrist = pose?.[15];
  const rightWrist = pose?.[16];
  const leftHip = pose?.[23];
  const rightHip = pose?.[24];

  const shoulderSpan = distance(leftShoulder, rightShoulder);
  const eyeSpan = distance(leftEye, rightEye);

  const leftRaised =
    leftShoulder && leftWrist
      ? normalizeRange(leftShoulder.y - leftWrist.y, 0.015, 0.22)
      : 0;
  const rightRaised =
    rightShoulder && rightWrist
      ? normalizeRange(rightShoulder.y - rightWrist.y, 0.015, 0.22)
      : 0;

  const handSalience = Math.max(leftRaised, rightRaised);
  const wristSpan = distance(leftWrist, rightWrist);
  const openness =
    shoulderSpan > 0.04
      ? normalizeRange(wristSpan / shoulderSpan, 1.15, 2.75)
      : 0;

  const shoulderAsymmetry =
    leftShoulder && rightShoulder
      ? signedClamp((rightShoulder.y - leftShoulder.y) * 5.2)
      : 0;

  let focusX = noseFace
    ? mirroredX(noseFace.x)
    : nosePose
      ? mirroredX(nosePose.x)
      : 0;
  let focusY = noseFace
    ? normalizedY(noseFace.y)
    : nosePose
      ? normalizedY(nosePose.y)
      : 0;

  if (handSalience > 0.36) {
    const useLeft = leftRaised >= rightRaised;
    const hand = useLeft ? leftWrist : rightWrist;
    if (hand) {
      focusX = mirroredX(hand.x);
      focusY = normalizedY(hand.y);
    }
  }

  let headYaw = 0;
  let headRoll = 0;

  if (noseFace && leftEye && rightEye && eyeSpan > 0.015) {
    const eyeMidX = (leftEye.x + rightEye.x) * 0.5;
    headYaw = signedClamp(((noseFace.x - eyeMidX) / eyeSpan) * 2.8);

    const rollRadians = Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x,
    );
    headRoll = signedClamp(rollRadians / 0.34);
  }

  const shoulderProximity = normalizeRange(shoulderSpan, 0.15, 0.46);
  const faceProximity = normalizeRange(eyeSpan, 0.075, 0.255);
  const proximity =
    face && pose
      ? faceProximity * 0.58 + shoulderProximity * 0.42
      : face
        ? faceProximity
        : pose
          ? shoulderProximity
          : 0;

  const visiblePoints = [
    noseFace,
    leftEye,
    rightEye,
    nosePose,
    leftShoulder,
    rightShoulder,
    leftWrist,
    rightWrist,
    leftHip,
    rightHip,
  ].filter((point): point is Landmark => Boolean(point));

  const confidence =
    face && pose ? 1 : face ? 0.68 : pose ? 0.74 : 0;

  return {
    confidence,
    focusX,
    focusY,
    proximity,
    smile: readSmile(faceResult),
    openness,
    shoulderAsymmetry,
    leftHandRaised: leftRaised,
    rightHandRaised: rightRaised,
    handSalience,
    headYaw,
    headRoll,
    visiblePoints,
  };
}

function featureMotion(
  previous: Landmark[] | null,
  current: Landmark[],
  deltaSeconds: number,
) {
  if (
    !previous ||
    previous.length !== current.length ||
    current.length === 0 ||
    deltaSeconds <= 0
  ) {
    return 0;
  }

  let total = 0;

  for (let index = 0; index < current.length; index += 1) {
    total += distance(previous[index], current[index]);
  }

  const averageDistance = total / current.length;
  const speed = averageDistance / Math.max(0.016, deltaSeconds);

  return clamp01(speed * 2.35);
}

function syntheticProofSnapshot(time: number): Partial<SeraraPerceptionSnapshot> {
  if (time < 1.2) {
    return {
      status: "active",
      confidence: 1,
      focusX: -0.62 + time * 0.56,
      focusY: 0.18,
      proximity: 0.5,
      motionEnergy: 0.84,
      stillness: 0.08,
      smile: 0.02,
      openness: 0.18,
      shoulderAsymmetry: -0.18,
      leftHandRaised: 0,
      rightHandRaised: 0,
      handSalience: 0,
      headYaw: -0.18,
      headRoll: 0.08,
      lastSeenAt: performance.now(),
    };
  }

  if (time < 4.4) {
    const held = clamp01((time - 1.2) / 2.4);
    return {
      status: "active",
      confidence: 1,
      focusX: 0.08,
      focusY: 0.14,
      proximity: 0.68,
      motionEnergy: 0.04,
      stillness: 0.96,
      smile: held * 0.82,
      openness: 0.3,
      shoulderAsymmetry: 0.03,
      leftHandRaised: 0,
      rightHandRaised: 0,
      handSalience: 0,
      headYaw: 0.04,
      headRoll: -0.04,
      lastSeenAt: performance.now(),
    };
  }

  if (time < 6.6) {
    const gesture = clamp01((time - 4.4) / 0.65);
    return {
      status: "active",
      confidence: 1,
      focusX: 0.58,
      focusY: 0.52,
      proximity: 0.7,
      motionEnergy: 0.16 + gesture * 0.16,
      stillness: 0.5,
      smile: 0.66,
      openness: 0.76,
      shoulderAsymmetry: 0.1,
      leftHandRaised: 0,
      rightHandRaised: gesture,
      handSalience: gesture,
      headYaw: 0.08,
      headRoll: -0.06,
      lastSeenAt: performance.now(),
    };
  }

  return {
    status: "active",
    confidence: 0,
    focusX: 0.58,
    focusY: 0.52,
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
    lastSeenAt: performance.now() - 2000,
  };
}

export default function SeraraPerceptionSensor() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | null = null;
    let frameRequest = 0;
    let faceLandmarker:
      | import("@mediapipe/tasks-vision").FaceLandmarker
      | null = null;
    let poseLandmarker:
      | import("@mediapipe/tasks-vision").PoseLandmarker
      | null = null;
    let previousPoints: Landmark[] | null = null;
    let previousFeatureAt = 0;
    let previousInferenceAt = -Infinity;
    let previousSnapshot: SeraraPerceptionSnapshot = {
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

    const proofMode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("perceptionProof");

    if (proofMode) {
      const runProof = () => {
        if (disposed) return;

        const root = globalThis as typeof globalThis & {
          __SERARA_PRESENCE__?: Record<string, number>;
        };
        const time = root.__SERARA_PRESENCE__?.proofTime ?? 0;

        publishSeraraPerception(syntheticProofSnapshot(time));
        frameRequest = requestAnimationFrame(runProof);
      };

      resetSeraraPerception("active");
      frameRequest = requestAnimationFrame(runProof);

      return () => {
        disposed = true;
        cancelAnimationFrame(frameRequest);
        resetSeraraPerception();
      };
    }

    const stop = () => {
      disposed = true;
      cancelAnimationFrame(frameRequest);

      stream?.getTracks().forEach((track) => track.stop());
      stream = null;

      try {
        faceLandmarker?.close();
      } catch {
        // Hot reload or browser teardown may close it first.
      }

      try {
        poseLandmarker?.close();
      } catch {
        // Hot reload or browser teardown may close it first.
      }

      resetSeraraPerception();
    };

    const smoothAndPublish = (
      raw: ReturnType<typeof extractFeatures>,
      motionEnergy: number,
      deltaSeconds: number,
      now: number,
    ) => {
      const seen = raw.confidence > 0;
      const targetStillness = seen ? 1 - motionEnergy : 0;
      const fast = 5.8;
      const medium = 3.8;
      const slow = 2.2;

      previousSnapshot = {
        status: "active",
        confidence: damp(
          previousSnapshot.confidence,
          raw.confidence,
          seen ? fast : 6.5,
          deltaSeconds,
        ),
        focusX: damp(
          previousSnapshot.focusX,
          seen ? raw.focusX : previousSnapshot.focusX,
          raw.handSalience > 0.36 ? medium : slow,
          deltaSeconds,
        ),
        focusY: damp(
          previousSnapshot.focusY,
          seen ? raw.focusY : previousSnapshot.focusY,
          raw.handSalience > 0.36 ? medium : slow,
          deltaSeconds,
        ),
        proximity: damp(
          previousSnapshot.proximity,
          raw.proximity,
          3.2,
          deltaSeconds,
        ),
        motionEnergy: damp(
          previousSnapshot.motionEnergy,
          motionEnergy,
          motionEnergy > previousSnapshot.motionEnergy ? 6.8 : 2.8,
          deltaSeconds,
        ),
        stillness: damp(
          previousSnapshot.stillness,
          targetStillness,
          targetStillness > previousSnapshot.stillness ? 1.8 : 6.4,
          deltaSeconds,
        ),
        smile: damp(previousSnapshot.smile, raw.smile, 2.6, deltaSeconds),
        openness: damp(
          previousSnapshot.openness,
          raw.openness,
          2.4,
          deltaSeconds,
        ),
        shoulderAsymmetry: damp(
          previousSnapshot.shoulderAsymmetry,
          raw.shoulderAsymmetry,
          3,
          deltaSeconds,
        ),
        leftHandRaised: damp(
          previousSnapshot.leftHandRaised,
          raw.leftHandRaised,
          4.2,
          deltaSeconds,
        ),
        rightHandRaised: damp(
          previousSnapshot.rightHandRaised,
          raw.rightHandRaised,
          4.2,
          deltaSeconds,
        ),
        handSalience: damp(
          previousSnapshot.handSalience,
          raw.handSalience,
          raw.handSalience > previousSnapshot.handSalience ? 5.2 : 2.6,
          deltaSeconds,
        ),
        headYaw: damp(
          previousSnapshot.headYaw,
          seen ? raw.headYaw : previousSnapshot.headYaw,
          3.2,
          deltaSeconds,
        ),
        headRoll: damp(
          previousSnapshot.headRoll,
          seen ? raw.headRoll : previousSnapshot.headRoll,
          3.2,
          deltaSeconds,
        ),
        lastSeenAt: seen ? now : previousSnapshot.lastSeenAt,
      };

      publishSeraraPerception(previousSnapshot);
    };

    const runInference = () => {
      if (disposed) return;

      const video = videoRef.current;
      const now = performance.now();

      if (
        video &&
        faceLandmarker &&
        poseLandmarker &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        now - previousInferenceAt >= 72
      ) {
        const deltaSeconds =
          previousFeatureAt > 0
            ? Math.min(0.2, (now - previousFeatureAt) / 1000)
            : 1 / 14;

        previousInferenceAt = now;

        try {
          const faceResult = faceLandmarker.detectForVideo(
            video,
            now,
          ) as FaceResultLike;
          const poseResult = poseLandmarker.detectForVideo(
            video,
            now,
          ) as PoseResultLike;

          const raw = extractFeatures(faceResult, poseResult);
          const motionEnergy = featureMotion(
            previousPoints,
            raw.visiblePoints,
            deltaSeconds,
          );

          previousPoints = raw.visiblePoints;
          previousFeatureAt = now;

          smoothAndPublish(raw, motionEnergy, deltaSeconds, now);
        } catch {
          publishSeraraPerception({
            status: "active",
            confidence: 0,
          });
        }
      }

      frameRequest = requestAnimationFrame(runInference);
    };

    const activate = async () => {
      if (disposed) return;

      if (
        !navigator.mediaDevices?.getUserMedia ||
        !videoRef.current
      ) {
        resetSeraraPerception("unsupported");
        return;
      }

      publishSeraraPerception({ status: "requesting" });

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24, max: 30 },
          },
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        publishSeraraPerception({ status: "loading" });

        const {
          FilesetResolver,
          FaceLandmarker,
          PoseLandmarker,
        } = await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks(VISION_WASM_ROOT);

        [faceLandmarker, poseLandmarker] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_MODEL,
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: POSE_MODEL,
            },
            runningMode: "VIDEO",
            numPoses: 1,
          }),
        ]);

        if (disposed) return;

        resetSeraraPerception("active");
        frameRequest = requestAnimationFrame(runInference);
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;

        const denied =
          error instanceof DOMException &&
          (error.name === "NotAllowedError" ||
            error.name === "PermissionDeniedError");

        resetSeraraPerception(denied ? "denied" : "error");
      }
    };

    const start = () => {
      window.removeEventListener("pointerdown", start, true);
      window.removeEventListener("keydown", start, true);
      void activate();
    };

    window.addEventListener("pointerdown", start, {
      once: true,
      capture: true,
    });
    window.addEventListener("keydown", start, {
      once: true,
      capture: true,
    });

    return () => {
      window.removeEventListener("pointerdown", start, true);
      window.removeEventListener("keydown", start, true);
      stop();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: "fixed",
        width: 1,
        height: 1,
        left: -9999,
        top: -9999,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
