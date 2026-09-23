# SERARA Interactive Presence Lab — Experiment 02

Date: 2026-09-23  
Branch: `lab/serara-interactive-presence-20260923`  
Experience: `SERAPH / Experience 01 — THE BODY`  
Status: EXPERIMENTAL / REAL-CAMERA QA OPEN

## Hypothesis

THE BODY should not be controlled by a camera skeleton.

The camera should act as a sensory organ. Raw landmarks are interpreted into semantic human signals, then passed through the same hesitation / recognition / memory system created in Experiment 01.

The intended chain is:

`camera -> body/face perception -> semantic signals -> SERARA mind -> body / face / sound consequence`

Not:

`camera joint -> SERARA joint`

## Sensor layer

`components/seraph/SeraraPerceptionSensor.tsx`

The hidden sensor starts after the visitor's first pointer/key interaction.

It requests the user-facing camera and performs MediaPipe inference locally in the browser.

No camera image is rendered into the experience.

Current perception tasks:
- Face Landmarker
- Pose Landmarker

Current semantic signals:
- visitor confidence / visibility
- face or salient-hand focus position
- proximity
- movement energy
- stillness
- smile strength
- body openness
- shoulder asymmetry
- left/right raised-hand strength
- hand salience
- approximate head yaw / roll

## Runtime bridge

`components/seraph/serara-perception.ts`

The body does not import MediaPipe results directly.

It reads one normalized semantic snapshot. This keeps the character independent from a specific tracking library and allows later inputs such as hand tracking, WebXR, depth cameras or physical sensors to feed the same interpretation layer.

## THE BODY response law

When camera perception is live, it replaces pointer position as the primary presence source.

### Proximity
Closer body/face presence increases interpreted presence.

It does not automatically trigger a fixed animation.

### Movement energy
Fast body movement feeds agitation / avoidance.

SERARA may resist or delay attention rather than mirror the motion.

### Stillness
Low movement allows recognition to accumulate.

Stillness should reduce incidental body noise and make attention feel intentional.

### Smile
Smile is not mirrored.

Only after recognition does smile contribute restrained social warmth:
- slightly more composed face;
- warmer eyes/internal signal;
- small harmonic shift.

No cartoon smile is added.

### Raised hand
A raised hand becomes an attention candidate.

SERARA may redirect attention toward the hand after interpretation delay.

The character does not raise its own hand one-to-one.

### Openness
Open arms can release chest / shoulder tension slightly after recognition.

### Shoulder asymmetry
Asymmetry may enter the posture at low amplitude.

It must not become motion capture puppeteering.

## Sound relationship

Sound receives the same semantic layer:
- recognized smile can warm harmonic relation;
- openness can slightly open breath/body resonance;
- salient hand gesture can alter harmonic attention;
- sudden movement can increase instability;
- stillness still suppresses unnecessary sonic activity.

No humming or singing is accepted in this experiment.

## Fallback

If camera access is:
- denied;
- unavailable;
- unsupported;
- temporarily unable to detect a person;

Experiment 01 pointer interpretation remains available.

The experience must not become unusable because the visitor rejects camera permission.

## Synthetic proof mode

`?perceptionProof=1&pose=grace`

A deterministic synthetic perception sequence is available only for visual/CI proof.

It simulates:
1. fast arrival;
2. held stillness + gradual smile;
3. raised-hand/open-body gesture;
4. departure.

Synthetic proof validates the **response mapping**, not the real camera detector.

## Real-camera acceptance gate

Experiment 02 remains OPEN until real camera proof confirms:

1. camera permission and startup work on desktop browser;
2. face + pose detection remain stable under ordinary room lighting;
3. moving closer changes presence without obvious jitter;
4. fast hand/body movement produces resistance, not mirroring;
5. holding still allows recognition;
6. smiling produces a subtle but perceivable warmth only after recognition;
7. raising a hand redirects attention without puppet behavior;
8. losing tracking decays gracefully into memory/fallback;
9. mobile browser startup and performance remain acceptable;
10. no camera preview, debug skeleton or tracking UI leaks into the artistic experience.

## Reject conditions

Reject or tune if:
- the visitor can clearly reverse-engineer a one-input/one-animation mapping;
- head motion looks like webcam avatar tracking;
- smile response reads as an NPC smiling back;
- hand response reads like motion-capture mirroring;
- tracking noise makes SERARA twitch;
- model loading damages first encounter pacing;
- mobile performance materially collapses;
- permission denial breaks the experience.

## Privacy / storage boundary

This experiment processes camera frames for live perception only.

It does not create biometric identity, face recognition, or a persistent person profile.

A future per-visitor encounter history should be designed as a separate bounded experiment, preferably around an anonymous local encounter identity before considering any stronger identity mechanism.

## Acceptance rule

Compile success and synthetic proof are necessary engineering checks, not artistic acceptance.

Do not merge Experiment 02 into canonical Experience 01 until real-camera desktop/mobile proof is reviewed.
