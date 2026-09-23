# SERARA — FULL 3D PRODUCTION PIPELINE
Date: 2026-09-21
Status: CANONICAL / ACTIVE

## Goal

Turn the canonical SERARA visual identity into the actual runtime character without losing the body-state, material, perception or sound architecture already built in the repository.

This pipeline is the only canonical path. Do not create v1/v2 model pipelines.

## 1. Canonical character reference

Required:
- front
- three-quarter
- side
- back
- head
- hands
- Grace / Tension / Fall / Re-formation

The same character must remain consistent across every view.

## 2. Clean 3D-generation turnaround

Generate:
- FRONT neutral A-pose
- LEFT 3/4 neutral A-pose
- SIDE neutral A-pose
- BACK neutral A-pose

Rules:
- same character and proportions
- full body visible
- feet visible
- hands separated from torso
- fingers readable
- neutral studio background
- no text
- no typography
- no dramatic pose
- no floating fragments
- no wings/horns
- no cinematic perspective distortion

These are the image-to-3D inputs.

## 3. Image-to-3D candidates

Candidate providers:
- Rodin / Hyper3D
- Meshy
- Tripo

Generate more than one candidate if credits allow.

Judge geometry before texture.

Priority:
1. head / face structure
2. hands / fingers
3. neck / shoulder topology
4. silhouette
5. clean symmetry where intended
6. no fused limbs
7. no floating geometry
8. rig readiness

## 4. Reject conditions

Reject severe:
- fused arms
- missing or webbed fingers
- asymmetrical generation damage
- hollow/open body where not intended
- collapsed pelvis/back
- unusable neck
- extreme shoulder/hip topology damage
- baked cracks that belong to runtime state
- costume geometry dominating the anatomy

Prefer a neutral continuous body mesh.

## 5. Cleanup

Blender is optional.

Use only when actually needed for:
- deleting fragments
- fixing fused geometry
- proportion correction
- retopology
- weights
- shape keys
- export cleanup

Skip Blender if the generated mesh passes.

## 6. Rig

Preferred:
- provider auto-rig
- external humanoid auto-rig fallback
- Blender manual rig only if automation fails

Required semantic bones:
- Hips
- Spine
- Spine1
- Spine2
- Neck
- Head
- shoulders
- upper/lower arms
- hands
- upper/lower legs
- feet

Preferred:
- fingers
- jaw/eyes
- facial morphs

## 7. Face deformation

Desired:
- relaxed
- tension
- fall
- eyes narrow
- mouth seam open

Do not block first body integration if morphs are not yet available but face topology is usable.

## 8. Runtime export

Format:
- GLB / glTF 2.0

Preferred target:
- 30k–70k triangles after optimization
- one primary skinned body mesh
- no giant baked texture dependency
- no unused clips
- clean scale and rest pose

Canonical runtime path:
`public/assets/serara-canonical.glb`

Engineering carrier remains:
`public/assets/serara-human.glb`

Do not delete the engineering carrier until the canonical body is verified.

## 9. Repository integration

Record:
- provider/source
- license/terms status
- generation settings
- modifications
- asset hash
- rig map
- export settings

Switch runtime loader behind one reversible commit.

## 10. Body QA

Before effects:
- silhouette reads as SERARA
- head-to-feet framing
- Grace readable
- Tension readable
- Fall readable
- hands survive
- shoulders deform
- neck compresses cleanly
- pelvis/knees survive Fall
- desktop and phone pass

## 11. Material nervous system

Apply the existing runtime state system:
- Grace: porcelain/mineral
- Tension: stress / heat
- Fall: dark mineral / fracture / ember

No baked fake cracks.

## 12. Perception

Reattach:
- openness
- ascent
- shoulder asymmetry
- proximity
- stillness
- movement energy
- later hands

The participant influences SERARA; they do not puppet it one-to-one.

## 13. Sound

Connect:
- breath
- harmonic stability
- ceramic/mineral friction
- detuning
- low resonance
- silence

## 14. Full acceptance

SERARA closes this pipeline only when:
- body identity
- posture
- material
- attention
- sound
- perception
- mobile performance
- chamber composition

read as one organism.

## Current continuation point

Engineering carrier:
- rigged and skinned
- posture engine active
- material nervous system started
- delayed attention/gaze started

Immediate next action:
- create clean canonical multi-view turnaround
- submit to image-to-3D
- select strongest mesh
- rig/export
- replace engineering carrier
