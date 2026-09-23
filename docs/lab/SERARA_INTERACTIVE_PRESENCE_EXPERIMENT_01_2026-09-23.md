# SERARA Interactive Presence Lab — Experiment 01

Date: 2026-09-23  
Branch: `lab/serara-interactive-presence-20260923`  
Experience: `SERAPH / Experience 01 — THE BODY`  
Status: EXPERIMENTAL / NOT ARTISTICALLY ACCEPTED

## Hypothesis

SERARA will feel more alive if attention behaves as recognition rather than cursor tracking.

The encounter should contain:
- hesitation before attention settles;
- stillness as an event;
- delayed gaze acquisition;
- resistance to fast movement;
- memory of the last accepted position;
- afterimage after the visitor moves away;
- body and sound responding to the same interpreted state.

## What changed

### Presence mind

`components/seraph/serara-presence-memory.ts`

A temporal interpreter sits between raw pointer/presence data and the body.

Signals:
- `stillness`
- `recognition`
- `avoidance`
- `afterimage`
- delayed `attention`

Fast movement delays recognition. Held stillness lets attention settle. Accepted attention becomes memory and decays slowly instead of resetting immediately.

### THE BODY

`components/seraph/SeraraCanonicalBody.tsx`

The canonical body remains unchanged as an asset.

Changes are runtime-only:
- gaze follows interpreted attention instead of direct pointer position;
- rapid motion can produce a restrained avoidance response;
- micro-saccades, limb drift and finger searching reduce during deep stillness;
- recognition slightly composes the face instead of adding a smile;
- remembered attention survives after direct presence fades;
- no visible controls were added.

### Sound

`components/seraph/serara-sonic.ts`

Sound now shares the same interpreted encounter:
- stillness suppresses crackle and whisper activity;
- recognition deepens body resonance;
- afterimage keeps spatial wetness alive after departure;
- pan follows interpreted attention more than raw cursor location.

No humming or singing was introduced in this experiment.

## Non-goals

This experiment does NOT:
- redesign SERARA;
- alter the canonical GLB;
- create a new identity;
- modify WAKING RELIC;
- add visible controls;
- add game-state UI;
- add one-to-one puppeteering;
- add a smile morph that the current asset cannot support honestly;
- add singing/humming before attention and silence prove themselves.

## Visual-proof gate

This experiment is not accepted until real rendered proof exists.

Required proof sequence:

1. **Arrival**
   - move pointer quickly across the body;
   - head must not snap 1:1;
   - avoidance/hesitation should be readable but restrained.

2. **Recognition**
   - hold near the face/upper torso for approximately 2–3 seconds;
   - motion should quiet;
   - gaze should settle;
   - face should compose slightly without becoming an avatar expression;
   - sound should become calmer and more embodied.

3. **Afterimage**
   - move away after recognition;
   - head/body attention must release slowly rather than reset instantly;
   - spatial sound should retain a short memory.

4. **Repeat encounter**
   - re-enter from another side;
   - response should feel temporally related to the previous encounter, not like a fresh hover state.

Capture requirements:
- desktop rendered capture;
- mobile rendered capture;
- sound-on screen recording for at least one full arrival -> recognition -> departure cycle;
- no debug overlay in the artistic capture.

Optional QA telemetry is exposed only when the URL contains `?presenceProof=1` through `window.__SERARA_PRESENCE__`.

## Reject conditions

Reject or revise the experiment if any of these are true:
- gaze still reads as cursor tracking;
- hesitation reads as input lag rather than intention;
- stillness makes the body look frozen/dead;
- afterimage feels like a stuck animation;
- face starts reading as NPC/avatar acting;
- sound becomes obviously parameter-driven;
- mobile response becomes jittery or delayed for technical reasons;
- the encounter is less memorable with the interpretation layer than without it.

## Acceptance rule

Passing lint/build is necessary but not sufficient.

Do not merge this experiment into canonical Experience 01 until visual and sonic proof on real rendered desktop/mobile output is accepted.
