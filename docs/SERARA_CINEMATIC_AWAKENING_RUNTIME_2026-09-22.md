# SERARA Cinematic Awakening Runtime — Implementation Contract
Date: 2026-09-22
Status: ACTIVE

## Important
The current `SERARA_RELIC.glb` is a temporary stand-in only.

The awakening runtime must remain independent from the final character mesh so the final SERARA asset can replace the placeholder without rewriting the experience logic.

## Runtime phases

1. `bound`
   - inert
   - pedestal / restraint intact
   - no overt response

2. `notice`
   - viewer has been noticed
   - head / gaze response hook
   - subtle wireframe lift

3. `release`
   - restraint / pedestal release hook
   - base fracture audio cue
   - no assumption about final pedestal topology yet

4. `rise`
   - body leaves bound posture
   - upward displacement and controlled tension

5. `melt`
   - face deformation hook
   - future implementation: morph targets or vertex shader displacement
   - current placeholder receives only generic runtime distortion

6. `scream`
   - peak audio / visual energy
   - camera and wireframe pulse
   - future final character receives facial / jaw / eye-specific action

7. `aftermath`
   - energy collapses
   - entity remains awake
   - no reset to pre-contact innocence

## Model interface expected from final SERARA asset

Preferred node names:
- `SERARA_ROOT`
- `SERARA_HEAD`
- `SERARA_FACE`
- `SERARA_EYE_L`
- `SERARA_EYE_R`
- `SERARA_BODY`
- `SERARA_PEDESTAL`
- `SERARA_PEDESTAL_CHUNK_*`

Preferred morph targets:
- `face_melt`
- `jaw_open`
- `brow_tension`
- `eye_widen`

The runtime must fall back safely if any named node or morph target is absent.

## Audio hooks

Current reusable cues:
- awakening impact
- room glitch
- threshold riser
- presence bed

The final scream vocal is intentionally not locked yet. It should be produced after the final face / motion timing is fixed so the performance can be cut to picture.

## Current implementation

The experience code now exposes the phase on the root DOM node via:
`data-phase="<phase>"`

React Three Fiber receives the same phase and drives generic:
- body lift
- rotation tension
- scale resonance
- wireframe intensity
- ghost wireframe intensity
- emissive energy

CSS drives phase-specific:
- halo
- scan
- grain
- vignette

This is deliberate scaffolding, not final character animation.
