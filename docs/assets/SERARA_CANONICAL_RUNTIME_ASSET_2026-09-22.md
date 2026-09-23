# SERARA CANONICAL RUNTIME ASSET
Date: 2026-09-22
Status: TECHNICALLY VERIFIED / VISUAL ACCEPTANCE STILL OPEN

## Canonical runtime target

`public/assets/serara-canonical.glb`

The asset was authored procedurally in Blender 5.2.2 LTS from the project references and contains no external mesh or texture dependency.

## Verified measurements

- Height: 2.394419 m
- Triangles: 65,986
- Bones: 53
- GLB bytes: 2,772,856
- Unweighted vertices: 0
- Invalid weight sums: 0
- Vertices over four influences: 0
- Khronos glTF validation: 0 errors / 0 warnings
- Three.js parse / skin checks: PASS
- Blender GLB re-import: PASS

## Skeleton

The canonical GLB provides the semantic bones required by the SERARA runtime, including:
- Hips
- Spine / Spine1 / Spine2
- Neck / Head
- bilateral shoulders / arms / forearms / hands
- bilateral upper legs / legs / feet
- ten articulated three-joint finger chains

## Mesh / material contract

Runtime mesh groups include:
- SERARA_Body
- SERARA_Cavities
- SERARA_Eyes
- SERARA_Head
- SERARA_MineralLaminae
- SERARA_Signal

Runtime material slots include:
- SERARA_Porcelain
- SERARA_InnerMineral
- SERARA_EyeObsidian
- SERARA_CavityRim
- SERARA_InternalSignal

The web runtime must preserve these semantic slots so Grace / Tension / Fall can drive them independently.

## Facial morph contract

The canonical head exposes:
- FACE_RELAXED
- FACE_TENSION
- FACE_FALL
- EYES_NARROW
- MOUTH_SEAM_OPEN

They are intentionally subtle and remain zero in the delivered rest pose.

## Runtime integration law

The Blender asset supplies:
- body geometry
- skeleton
- skin weights
- fingers
- facial deformation hooks
- material regions

The web runtime supplies:
- Grace / Tension / Fall posture
- delayed gaze / attention
- procedural material nervous system
- fracture / ember state
- sound
- perception
- device / body interaction

No fake face shell is added in the web runtime.

## SHA256

Canonical GLB:
`72c57656309556598a3edea8b09cf43efd3cbd90c883f41337e0700f549f3411`

## Open visual limitation

Technical validation is not artistic closure.

The authored head and organic mineral lattice still fall short of the full detail and exact identity of the canonical head study. Runtime integration may deepen material and lighting identity, but geometry-level refinements remain a separate canonical-sculpt decision.
