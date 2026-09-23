# SERARA — FULL CANONICAL SCULPT PRODUCTION BRIEF
Date: 2026-09-21
Status: READY FOR 3D AUTHORING WHEN REQUESTED

## Purpose

This document defines the actual authored 3D body that will replace the current CC0 low-poly engineering carrier.

The target is not "a better human model."

The target is a body that already reads as SERARA in flat clay with no shader, no sound and no effects.

## Deliverables

Required source:
- Blender .blend
- neutral material clay viewport
- clean named armature
- sculpt / retopo history retained where practical

Required runtime:
- .glb
- one skinned body mesh preferred
- separate eyes only if structurally necessary
- no external texture dependency for the first runtime export

## Neutral pose

Use a relaxed A-pose.

Do not use:
- rigid T-pose presentation
- heroic chest
- fashion contrapposto baked into bind pose

The neutral bind should allow:
- Grace
- Tension
- Fall
without topology fighting the rig.

## Proportion

Target overall:
- 8.4–8.8 heads tall
- narrow ribcage
- narrow pelvis
- long neck
- slightly elongated forearms
- slightly elongated tibia/lower leg
- hands 5–9% longer than realistic average
- fingers long and narrow
- head 4–7% narrower than realistic average
- cranium subtly elongated vertically

Avoid:
- superhero V-shape
- bodybuilder anatomy
- exaggerated thin horror-monster anatomy
- fashion-model glamour anatomy

## Torso

Ribcage:
- clear sternum plane
- clavicle structure readable
- shoulder transition elegant, not ball-joint-like
- scapular region should deform cleanly

Abdomen:
- no six-pack sculpt
- long quiet transition from ribcage to pelvis
- enough volume for breathing deformation

Pelvis:
- structurally readable
- narrow
- neutral gender coding

## Neck

The neck is a major identity feature.

Target:
- long
- continuous with sternum / clavicle
- not cylindrical
- clear front and side tendon planes
- enough topology for compression in Fall

## Head

The head should feel sculpted from the same matter as the body.

Target:
- elongated cranium
- restrained jaw width
- cheek planes readable
- minimal nose ridge
- narrow eye region
- no eyelashes / brows / realistic cosmetic detail
- mouth as seam / subtle opening

The face must remain compelling with blank clay material.

## Eyes

Two acceptable routes:

A. Deep recessed eye cavities with small internal geometry.
B. Narrow ocular slits with internal depth.

Avoid:
- ordinary game-character eyeballs
- anime eye proportions
- glowing sci-fi goggles

## Mouth / jaw

- mouth line restrained
- lips not cosmetic
- jaw supports expression through subtle shape keys
- chin not heroic

## Hands

Hands must be authored carefully.

Required:
- five fingers
- long phalanges
- narrow palm
- clean webbing
- topology that supports curl / spread
- neutral pose soft, not rigid

No mitten hands.
No claws.

## Feet

- anatomically readable
- quiet sculpt
- stable planted footprint
- enough toe indication to read as body, without over-detail

## Topology

Preferred runtime target:
- 30k–70k triangles after optimization
- quad source topology before export
- deformation loops around shoulders, elbows, wrists, hips, knees, neck
- facial loops sufficient for subtle morphing
- no unnecessary micro-detail in geometry

## Rig compatibility

Preferred bone map:

- Hips
- Spine
- Spine1
- Spine2
- Neck
- Head
- LeftShoulder / RightShoulder
- LeftArm / RightArm
- LeftForeArm / RightForeArm
- LeftHand / RightHand
- finger chains
- LeftUpLeg / RightUpLeg
- LeftLeg / RightLeg
- LeftFoot / RightFoot

Exact names may change if a retarget map is delivered.

## Facial deformation

Minimum desired shape keys / morph targets:

- FACE_RELAXED
- FACE_TENSION
- FACE_FALL
- EYES_NARROW
- MOUTH_SEAM_OPEN

These are deformation capabilities, not creative document versions.

## Surface authoring

Do not sculpt cracks permanently into the base mesh.

Base sculpt should be coherent.

Cracks / erosion / heat are runtime state.

Permanent sculpt detail may include:
- subtle mineral irregularity
- non-perfect symmetry
- shallow surface memory

## Export

- glTF 2.0 / GLB
- transforms applied where safe
- +Y up / Blender export standard
- armature deform bones only
- no hidden junk collections in runtime
- animation clips optional in first delivery
- verify skinning in a clean viewer

## Acceptance gate

The sculpt is accepted only if:

- silhouette reads as SERARA in black silhouette
- clay render reads as SERARA without shader
- head/neck relationship is unique
- hands feel authored
- shoulders do not read as game-rig joints
- Grace can look beautiful
- Fall can compress without breaking topology
- face avoids generic human-avatar read
- runtime GLB deforms cleanly
