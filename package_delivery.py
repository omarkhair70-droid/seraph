from pathlib import Path
import json,hashlib,shutil,datetime
R=Path(__file__).resolve().parents[1];O=R/'outputs';V=O/'verification';V.mkdir(exist_ok=True)
stats=json.loads((O/'BUILD_STATS.json').read_text());three=json.loads((O/'THREEJS_VERIFICATION.json').read_text());blender=json.loads((O/'BLENDER_REIMPORT_VERIFICATION.json').read_text());audit=json.loads((O/'SOURCE_AUDIT.json').read_text())
assert three['pass'] and blender['pass'] and audit['source_pose_neutral']
assert next(x for x in audit['objects'] if x['name']=='SERARA_Body')['components']==1
for name in ['GLTF_VALIDATION.json','THREEJS_VERIFICATION.json','BLENDER_REIMPORT_VERIFICATION.json','BUILD_STATS.json','SOURCE_AUDIT.json']:
 shutil.copy2(O/name,V/name)
for src,dest in [('review_front.png','FRONT.png'),('review_side.png','SIDE.png'),('review_back.png','BACK.png'),('review_head.png','HEAD.png'),('review_hand.png','HAND.png'),('pose_compressed.png','COMPRESSION.png'),('pose_shoulders.png','SHOULDERS.png'),('pose_hand.png','FINGER_CURL.png'),('reimport_three_quarter.png','REIMPORTED_GLB.png')]:
 shutil.copy2(R/'work'/src,V/dest)
shutil.copy2(R/'work'/'reimport_three_quarter.png',O/'SERARA_REVIEW.png')
hashes={n:hashlib.sha256((O/n).read_bytes()).hexdigest() for n in ['SERARA_CANONICAL.blend','SERARA_CANONICAL.glb']}
(V/'SHA256.json').write_text(json.dumps(hashes,indent=2))
notes=f'''SERARA — RUNTIME / HANDOFF NOTES

STATUS
Editable, rigged procedural asset delivered. File-format, skin-data, re-import,
and bounded deformation checks pass. Visual canonical acceptance is NOT claimed:
the face, woven cranial mineral structure, and body surface anatomy remain less
intricate and less faithful than the supplied concept study. This is an original
procedural interpretation, not a scanned or manually finished reproduction.

ASSET
- {stats['triangles']:,} triangles, {stats['vertices']:,} Blender vertices.
- {stats['bones']} bones including Root; {stats['mesh_count']} source mesh objects.
- Nine material/mesh primitives become nine SkinnedMesh objects in Three.js.
- Approximately {stats['height_m']:.3f} metres tall. Blender Z-up / forward -Y.
  GLB is Y-up / forward +Z. Units are metres. No additional scale is required.
- GLB size: {(O/'SERARA_CANONICAL.glb').stat().st_size:,} bytes.
- Neutral relaxed A-pose, no animation clips. All facial morph values default to 0.
- The body itself is one connected mesh. Eyes, small signals, anatomical surface
  laminae, and cavities are separate skinned objects; these are not floating props.
- Maximum four normalized bone weights per vertex, compatible with standard LBS.
- No Draco/Meshopt requirement, external textures, remote asset dependencies, or
  baked Grace/Tension/Fall damage. PBR material placeholders are deliberately plain.

RIG
Root -> Hips -> Spine -> Spine1 -> Spine2 -> Neck -> Head
Left/RightShoulder -> Left/RightArm -> Left/RightForeArm -> Left/RightHand
Left/RightUpLeg -> Left/RightLeg -> Left/RightFoot -> Left/RightToeBase
Each hand has Thumb, Index, Middle, Ring, Little, with three bones each, e.g.
LeftHandIndex1 -> LeftHandIndex2 -> LeftHandIndex3.
Use the actual rest transforms for retargeting; bone naming alone is not proof of
Mixamo, VRM, or a particular animation library's rest-axis compatibility.
SOURCE_AUDIT.json records the complete hierarchy.

MATERIAL OWNERS
SERARA_Porcelain: neutral outer mineral surface.
SERARA_InnerMineral: recessed anatomical substrate.
SERARA_CavityRim: restrained mineral lattice tone.
SERARA_EyeObsidian: dark eyes.
SERARA_InternalSignal: small, warm eye signal.
Runtime may replace or augment these by material name. Traverse all SkinnedMesh
objects, not only the first mesh. Move the complete gltf.scene as the character
container. Meshes and skeleton are exported as scene roots to avoid parent-skin
transform warnings. No state-specific geometry destruction has been authored.

FACE TARGETS
FACE_RELAXED, FACE_TENSION, FACE_FALL, EYES_NARROW, MOUTH_SEAM_OPEN.
These are modest draft deformations of the head mesh, not a production facial rig.
FACE_FALL does not introduce fractures. Mouth seam is a separate detail and is
not a fully rigged mouth interior; extreme mouth morph values need art review.

VERIFICATION
- Khronos glTF Validator: 0 errors, 0 warnings. Informational unused UV attributes
  remain because UVs are supplied for future material work while textures are absent.
- Export re-imported into a new Blender scene; 53 bones, 6 meshes, no unweighted
  vertices, no invalid weight sums, no vertices with more than four influences.
- Four sampled pose tests: neutral, neck/shoulder/elbow motion, 90-degree hip /
  120-degree knee compression, and all ten three-joint finger chains curling.
- No non-finite coordinates or tested edges stretching beyond 4x. This is a bounded
  numerical sanity check, not certification of all poses or collision-free anatomy.
- Three.js r186 GLTFLoader parsed and skinned the actual GLB. A local WebGL viewer
  displayed the asset and interactive compression/finger poses. Browser console
  inspection showed no warnings or errors during the check.
- The original SERARA application was not supplied or modified; actual application
  state shaders, animation clips, mobile performance, and production integration
  have not been verified.

LIMITATIONS / REMAINING ART WORK
The procedural sculpt still requires reference-led refinement of facial planes,
cranial porosity, organic transitions, and hand details before final visual signoff.
Topology is primarily optimized triangles, not hand-retopologized deformation loops.
No corrective pose shapes or self-collision system are included; extreme poses may
pinch or intersect thin surface laminae. UVs are simple procedural coordinates, not
a non-overlapping hand-painted texture atlas. The neutral base has no fracture maps.

SOURCE / LICENSE NOTES
All model geometry, rig, and materials were authored here with Blender Python.
No external base mesh, purchased model, stock hands, or external textures were used.
The six supplied images and FULL_BUILD_BRIEF.txt were read. The two canonical images
are packed in the .blend as reference images. Rights to those supplied references
remain with their respective owner; no independent redistribution license was given.
Downloads/SERARA.blend was inspected only and was not incorporated into this asset.
Blender 5.2.2 LTS and the installed Three.js / Khronos validator were production and
verification tools, not source assets.

REPRODUCTION
Project work/build_serara.py creates the model; work/remove_remesh_debris.py removes
five isolated remeshing triangles and writes the final delivery. Verification scripts
are work/verify_blender.py, work/verification/verify.mjs, work/final_audit.py.
Original user files in Downloads were left unchanged.
'''
(O/'RUNTIME_NOTES.txt').write_text(notes,encoding='utf-8')
log=f'''SERARA CANONICAL — WORK LOG
Date: 2026-09-22
Project folder: {R}

DELIVERY STATUS
Requested .blend and .glb files created and technically verified.
Canonical visual acceptance remains incomplete; see limitations below.

ACTIONS COMPLETED
1. Located Downloads/SERARA_BLENDER_WORK_PACK.zip and extracted into work/source_pack.
2. Read FULL_BUILD_BRIEF.txt and inspected all six reference images individually.
3. Used SERARA_HEAD_STUDY.png and SERARA_CANONICAL_TURNAROUND.png as primary guidance.
4. Inspected existing Downloads/SERARA.blend without changing it. Found disconnected
   blockout forms, incomplete finger articulation and poor reference fidelity; did
   not reuse its geometry or rig.
5. Authored new body profiles, a continuous body union, long five-finger hands,
   recessed eyes, tapered jaw, long integrated neck, open cranial laminae, and
   anatomical mineral recesses. No destructive state damage was modeled.
6. Built a 53-bone humanoid hierarchy, including ten three-bone finger chains.
7. Authored and normalized skin weights to a maximum of four bone influences.
   Corrected pelvis/inner-thigh discontinuities and wrist region assignment after
   visual and numerical deformation tests. Conformed body laminae to body surface.
8. Added five subtle draft facial morphs, all zero in the delivered rest pose.
9. Optimized to {stats['triangles']:,} triangles, saved neutral A-pose, packed canonical
   reference images in the .blend, and exported a self-contained GLB.
10. Removed five isolated remeshing triangles; the main body is one connected mesh.
11. Validated final GLB: Khronos 0 errors / 0 warnings; Three.js parsing and skin tests
    pass; fresh Blender GLB re-import and sampled deformation checks pass.
12. Visually inspected front, side, back, head, hands, shoulder and compressed poses.
    Opened GLB with a local Three.js WebGL viewer and checked live rendering.
13. Saved diagnostic images, machine-readable verification reports, and SHA256 hashes.

FINAL MEASUREMENTS
Height: {stats['height_m']:.6f} m
Triangle count: {stats['triangles']}
Bone count: {stats['bones']}
GLB bytes: {(O/'SERARA_CANONICAL.glb').stat().st_size}
Unweighted vertices: {blender['unweighted']}
Invalid weight sums: {blender['weight_sum_errors']}
Vertices over four influences: {blender['over_four_weights']}
Maximum tested edge stretch by pose:
'''+''.join(f"- {t['name']}: {t['max_edge_stretch']:.4f}x; {t['edges_stretched_over_4x']} edges over 4x\n" for t in blender['tests'])+f'''
BLOCKERS / LIMITATIONS
- No permission, sign-in, or manual-action blocker occurred.
- The model is an original procedural interpretation. Its head and organic lattice
  do not yet reproduce the full detail or exact identity of the head study. Do not
  treat format validation as final artistic/canonical acceptance.
- No production SERARA runtime was provided. Actual app shaders, animation library,
  mobile-device performance, and all possible poses have not been tested.
- Draft facial targets and thin surface laminae need further artistic review.
- See RUNTIME_NOTES.txt for technical scope and limitations.

SOURCE / LICENSE NOTES
- User-supplied brief and six reference images; reference ownership retained by
  original rights holder. No additional license was supplied for redistribution.
- All delivered geometry, materials, and rig authored procedurally in this project.
- No external mesh or texture asset used; no external asset license dependency.
- Existing Downloads/SERARA.blend inspected only, not copied into the deliverable.
- Tools: Blender 5.2.2 LTS, Three.js r186, Khronos glTF Validator.

EXACT PRIMARY OUTPUT PATHS
{O/'SERARA_CANONICAL.blend'}
{O/'SERARA_CANONICAL.glb'}
{O/'SERARA_REVIEW.png'}
{O/'RUNTIME_NOTES.txt'}
{R/'WORK_LOG.txt'}
{O/'WORK_LOG.txt'}

EXACT EVIDENCE PATHS
'''+''.join(str(p)+'\n' for p in sorted(V.iterdir()))+f'''
FINAL ASSET SHA256
SERARA_CANONICAL.blend: {hashes['SERARA_CANONICAL.blend']}
SERARA_CANONICAL.glb: {hashes['SERARA_CANONICAL.glb']}
'''
(R/'WORK_LOG.txt').write_text(log,encoding='utf-8');(O/'WORK_LOG.txt').write_text(log,encoding='utf-8')
# Move only this task's single Blender backup out of user-facing deliverables.
backup=O/'SERARA_CANONICAL.blend1'
if backup.exists():
 dest=R/'work'/'SERARA_before_final_cleanup.blend'
 shutil.move(str(backup),str(dest))
print(json.dumps({'files':[str(p) for p in O.iterdir() if p.is_file()],'hashes':hashes,'technical_checks_pass':True,'canonical_visual_acceptance':False},indent=2))
