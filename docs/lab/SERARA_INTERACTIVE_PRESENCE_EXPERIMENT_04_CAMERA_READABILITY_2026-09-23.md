# SERARA Interactive Presence Lab — Experiment 04

Date: 2026-09-23  
Branch: `lab/serara-interactive-presence-20260923`  
Experience: `SERAPH / Experience 01 — THE BODY`  
Status: EXPERIMENTAL / REAL-CAMERA READABILITY PASS IN PROGRESS

## Trigger

A real-device screen recording showed that camera perception was technically active but visually under-expressed.

Observed in the recording:
- camera status repeatedly reported `ACTIVE`;
- confidence reached `1.00`;
- proximity moved roughly between `0.20` and `0.77`;
- motion reached roughly `0.92`;
- a raised-hand signal reached roughly `0.98`;
- focus reached the edge of the semantic range near `-1.00`;
- smile reached roughly `0.40`.

Despite that, SERARA's body remained visually too close to neutral through much of the encounter.

The later high-motion segment did contribute to the eventual rupture, proving that camera semantics were reaching the performance system.

Therefore the problem was not primarily camera detection.

The problem was **embodied readability**.

## Hypothesis

SERARA should not mirror a visitor, but a strong interpreted camera signal must be legible in her body before the dramatic rupture.

The viewer should be able to feel:

`she noticed me -> she oriented -> she negotiated distance -> she braced / resisted -> pressure accumulated`

without needing debug telemetry.

## Camera authority law

Once real camera perception has successfully entered `active`, raw pointer movement must no longer be the authority for the encounter.

Pointer remains:
- an activation gesture;
- a fallback only when camera perception never becomes available.

The camera proof now deliberately moves the raw pointer against the synthetic camera signal and asserts:
- `inputMode = camera`;
- camera authority remains latched;
- semantic camera response still reaches THE BODY.

## Embodied readability changes

### Gaze / head / neck

Camera-driven attention now has a wider but still bounded readable range.

The head remains the primary orientation surface.
The neck joins more visibly so the result reads as embodied attention rather than eye-tracking.

### Torso

Camera attention receives more weight through:
- spine;
- upper spine;
- shoulders;
- root yaw;
- lateral root drift.

This remains delayed and damped.

It is not one-to-one pose copying.

### Proximity negotiation

Near camera presence now creates a subtle physical negotiation.

Fast approach can produce:
- small recoil;
- chest/upper-spine brace;
- root depth response.

Recognized calm presence can soften that resistance.

### Raised hand

A raised hand remains an attention event, not a mirrored gesture.

It may influence:
- gaze destination;
- torso asymmetry;
- shoulder response;
- internal signal.

SERARA does not raise the same arm back.

### Social warmth

Smile remains conditional on recognition.

When recognition exists, smile may now create a more readable:
- relaxed face morph;
- eye release;
- internal warm signal.

No NPC smile-back behavior is introduced.

### Motion pressure

High camera motion now creates a visible brace before the performance reaches fracture.

This is intended to make STRAIN readable as a process rather than making the first obvious response be the final rupture.

## Diagnostics

`?sensorDebug=1` now shows:
- camera status;
- active input source;
- current performance phase;
- confidence;
- proximity;
- motion;
- stillness;
- smile;
- hand salience;
- semantic focus.

This diagnostic mode is lab-only and remains absent from the normal public route.

## Acceptance criteria

Experiment 04 passes only if real-device video shows:

1. Camera status reaches ACTIVE reliably.
2. Moving the mouse while camera is active does not visibly retake authority.
3. Strong lateral focus creates readable head/neck orientation.
4. Raised hand produces readable attention without copied arm motion.
5. Approach / near presence creates subtle distance negotiation.
6. High movement creates readable brace/strain before fracture.
7. Calm stillness reduces incidental motion and permits attunement.
8. Smile after recognition creates visible warmth without a direct smile imitation.
9. The result feels like one character responding, not a set of CV features.
10. Existing performance / camera / presence regression proofs remain green.

## Still forbidden

- raw skeleton puppeteering;
- one-to-one mirroring;
- visible CV landmarks;
- gesture command vocabulary;
- instant dramatic reward for a single gesture;
- changing WAKING RELIC;
- merging PR #4 before real-camera artistic review.
