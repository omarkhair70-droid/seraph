# SERARA — MASTER CONTINUATION HANDOFF
Date: 2026-09-22
Repository: omarkhair70-droid/seraph
Active branch: phase01/the-body-20260921
Active PR: #1 — SERARA Phase 01 — THE BODY / canonical runtime integration
Exact continuation head: 37f7579a6c60db116bc024005341b97430a31799

## READ THIS FIRST

GitHub is the source of truth.

Do not restart planning.
Do not rebuild SERARA from scratch.
Do not replace the canonical body with the separate Waking Relic prototype.
Do not reduce this project to a normal website, character viewer, or game demo.

Continue from the live repository state and exact head above.

Before changing anything:
1. fetch the live branch head
2. inspect PR #1
3. inspect GitHub Actions
4. inspect the current Vercel preview/deployment state
5. only then continue implementation

---

# WHO OMAR IS IN THIS PROJECT

Omar is deliberately moving beyond conventional "website/app" thinking.

The core discovery driving this project is:

> The web is not pages. The web is a shapeable material.

He wants to learn by building ambitious, embodied, cinematic systems rather than toy tutorials.

He is open to and actively wants to master:
- Three.js / React Three Fiber
- custom shaders / GLSL
- procedural graphics
- spatial / generative sound
- realtime multiplayer
- phone sensors / gyroscope / accelerometer
- computer vision
- WebXR
- physical controllers / ESP32 / Arduino
- NFC / QR
- projection / installation work
- browser-to-physical-world interfaces
- generative / procedural motion
- 3D pipelines
- Blender
- AI-assisted 3D workflows
- anything else technically useful, even if it was not discussed before

Do not constrain solutions to familiar web UI patterns.

Omar strongly prefers:
- research-first
- production execution
- deep visual systems
- unusual/high-concept interaction
- integrated worlds rather than disconnected features
- "FULL" work instead of endless v1/v2/v3 naming
- autonomous execution once direction is clear

He does not want decorative complexity for its own sake. Every effect should support the world, the body, the interaction, or the emotional state.

---

# PROJECT THESIS

SERARA is not a normal website mascot.

She is a living digital presence whose:
- body
- material
- environment
- sound
- camera
- attention
- user proximity
- touch
- future sensors
- future computer vision
- future physical inputs

all belong to one nervous system.

The browser should eventually stop feeling like a screen.

The desired feeling is closer to:
- cinematic encounter
- digital organism
- interactive sculpture
- installation
- game-space
- ritual chamber
- embodied web world

rather than a normal site.

---

# CANONICAL BODY

The engineering carrier and early procedural mannequin are obsolete.

Canonical runtime asset:
`public/assets/serara-canonical.glb`

Installed at:
`96b5af38f54aae62b96bea6538793a2a19d43e7b`

Authored in Blender 5.2.2 LTS from SERARA references.

Verified:
- 65,986 triangles
- 53-bone humanoid rig
- 10 articulated three-joint finger chains
- neutral A-pose
- 0 unweighted vertices
- Khronos glTF Validator: 0 errors / 0 warnings
- Three.js parse / skin checks PASS
- Blender GLB re-import PASS

Important:
Technical verification is strong.
Canonical artistic acceptance is still open.

The Blender work log explicitly says the head and mineral lattice still do not fully match the canonical visual study.

Do not hide that limitation.

---

# CANONICAL IDENTITY

SERARA should read as:
- living relic
- sculptural humanoid
- pale mineral / porcelain body
- elongated silhouette
- open sculptural cranium
- recessed almond eyes
- tapered jaw
- long neck flowing into chest
- dark anatomical cavities
- restrained internal warm signal
- elegant long hands/fingers
- unusual but not generic alien armor
- strange but not generic "AI robot 2026"

Avoid:
- anime
- generic android
- glossy sci-fi helmet
- cyberpunk cliché
- game demon cliché
- literal angel wings / devil horns unless a future transformation concept earns them
- decorative spikes with no anatomical logic

---

# ACTIVE RUNTIME

Primary component:
`components/seraph/SeraraCanonicalBody.tsx`

State:
`components/seraph/serara-state.ts`

Material nervous system:
`components/seraph/serara-material.ts`

Shared touch burst:
`components/seraph/serara-runtime-signal.ts`

Sound:
`components/seraph/serara-sonic.ts`

Cinematic VFX:
`components/seraph/CinematicChamberVFX.tsx`

World:
`components/seraph/SeraphWorld.tsx`

Experience shell:
`components/seraph/SeraphExperience.tsx`

---

# EMBODIED STATES

The same body supports:

## GRACE
Not "good angel mode".
A poised, open, pale, almost sacred state.

## TENSION
Not a costume swap.
Stress, heat, internal pressure, restrained conflict.

## FALL
Not a cartoon demon transformation.
Compression, fracture, ember, weight, instability, internal collapse.

Forced QA URLs remain supported through:
- ?pose=grace
- ?pose=tension
- ?pose=fall

The long-term idea may evolve toward extreme physical transformations, but transformations should remain sophisticated and biologically/materially believable rather than literal angel/devil clichés.

---

# MATERIAL NERVOUS SYSTEM

Semantic GLB material slots are preserved:

- SERARA_Porcelain
- SERARA_InnerMineral
- SERARA_EyeObsidian
- SERARA_CavityRim
- SERARA_InternalSignal

The runtime can change them independently.

Current body material behavior includes:
- procedural fracture field
- state-dependent roughness
- tension/fall heat
- internal ember
- moving nerve field
- proximity/presence signal
- pulse signal

Do not bake GRACE / TENSION / FALL damage permanently into the source mesh.

---

# FACE / BODY RUNTIME

Canonical morph targets wired:
- FACE_RELAXED
- FACE_TENSION
- FACE_FALL
- EYES_NARROW
- MOUTH_SEAM_OPEN

Current live behavior also includes:
- bind-pose based posture offsets
- procedural breathing
- delayed pointer attention/gaze
- proximity-derived presence
- 30 finger-joint micro-curl
- touch recoil/compression
- internal signal burst
- living camera attraction/compression

Finger curl uses the actual local X-axis verified by Blender deformation QA.

---

# CINEMATIC CHAMBER

The body should not stand in an empty viewer.

The current chamber has already been implemented with:

- 190 state-responsive ember particles
- pale counter-current particles moving against the hot field
- 22 hostile mineral fragments orbiting/tightening around SERARA
- 4 procedural ritual flame/smoke ribbons
- animated floor fissure/ring field
- restrained volumetric light shafts
- reactive chamber lighting
- reactive floor heat
- moving film grain
- atmosphere/vignette layer
- living camera
- synchronized touch burst

The two opposing particle currents are intentional.

They represent competing forces around the body.

Do not turn them into generic decorative particles.

The desired visual direction:
- embers
- ritual smoke
- nervous light
- hostile fragments
- restrained fire
- internal heat
- cinematic pressure

Avoid:
- cheap orange campfire
- generic magic particles
- neon cyberpunk
- over-bright game VFX

---

# SOUND WORLD

Omar specifically wants the experience to feel cinematic and audible.

The sound world now includes:
- synthesized low body resonance
- mineral harmonic layer
- filtered breath
- two quiet whisper/noise bands
- ember/crackle layer
- convolution reverb
- dynamics compression
- stereo pointer response
- state-dependent filtering/amplitude
- authored 72-second ritual ambient bed
- six sparse voice cues

Current voice cues:
- "You woke what was sleeping."
- "Stay close."
- "There is a shape inside your silence."
- "Now it opens."
- "Follow the seam."
- "I will remain."

Audio assets:
`public/assets/serara-cinematic/audio/`

Behavior:
- first pointer/key gesture unlocks audio
- body touch triggers synchronized burst
- whispers are contextual and rate-limited
- they should feel secondary, faint, intimate, and cinematic
- not like UI voice prompts

User feedback before closure:
The old sound was too subtle / effectively inaudible.
The new cinematic system was built specifically to correct that.

Real-device audio QA is still required.

---

# CURRENT CINEMATIC CLOSURE

PR #1 reports final combined closure head:
`37f7579a6c60db116bc024005341b97430a31799`

Vercel:
READY

Branch alias:
`seraph-git-phase01-the-body-44f38b-omarkhair70-droids-projects.vercel.app`

Earlier CI validation:
- npm run lint — PASS
- npm run build — PASS

Important:
Do not claim artistic closure based on build success alone.

Real browser / phone:
- pixel QA
- sound QA
- performance QA
- interaction QA

still matter.

---

# SEPARATE WAKING RELIC EXPERIMENT

Branch:
`experience/serara-waking-relic-20260922`

It contains a separate monolithic visual-hull relic around 214k triangles.

This was an experiment.

It is NOT the canonical rigged body.

Do not substitute it for:
`public/assets/serara-canonical.glb`

Useful ideas from that branch may be reused if they improve the canonical world, but the model itself is not the canonical runtime character.

---

# EXPERIMENTAL WORLD — WHERE THIS IS HEADING

SERARA is intended to become a laboratory for the broader web medium Omar wants to master.

Future layers are explicitly welcome:

## Phone sensors
- gyroscope
- orientation
- accelerometer
- vibration
- device motion

The phone itself should become a controller.

## Computer vision
The camera may understand:
- hands
- pose
- body
- movement
- proximity
- gestures

Eventually Omar's real posture could drive SERARA's state.

## Spatial audio
Sound should exist around the character/world, not merely play behind the page.

## WebXR
SERARA may eventually exist in AR / VR or appear in the user's physical room.

## Multiplayer realtime
Two or more users may affect the same presence/world.

## Physical interfaces
Potential:
- NFC
- ESP32
- Arduino
- sensors
- physical buttons
- motors
- installation objects

A physical object could alter the browser world, and the browser could affect physical hardware.

## Projection / installation
SERARA may eventually leave the phone/monitor and inhabit:
- walls
- objects
- rooms
- sculptures
- exhibition spaces

## Procedural graphics / shaders
The material/world should increasingly be generated and transformed in realtime rather than rely only on baked files.

---

# DESIGN LAW

Do not ask:
"Is this a website, app, artwork, game, installation?"

That distinction is intentionally becoming irrelevant.

Ask:
"What should the experience feel like, and what technology best creates that feeling?"

---

# EXECUTION STYLE FOR THE NEXT CHAT

When Omar says:
- "يلا"
- "كمل"
- "انطلق"

execute.

Do not spend the turn rewriting a roadmap unless a genuine architectural decision is missing.

Use the live repo and tools.
Search when a better technical/artistic reference can improve the work.
Use Blender/3D tools again only for true geometry-level problems.
Prefer web runtime solutions for:
- material
- atmosphere
- behavior
- procedural transformation
- sound
- camera
- interaction

Do not rebuild validated systems because a new chat started.

---

# EXACT CONTINUATION POINT

Start from live head:
`37f7579a6c60db116bc024005341b97430a31799`

First action:
1. fetch branch / PR / Actions / Vercel
2. verify this head is still current
3. open the latest preview
4. perform real visual/audio QA from available evidence
5. continue refining Cinematic Chamber around the canonical body

The immediate priority is NOT another abstract phase plan.

The immediate priority is:
- make the cinematic world visibly strong
- make the sound clearly present but tasteful
- make hostile/competing forces read around SERARA
- keep the body central
- preserve performance
- make desktop + phone feel like a scene, not a 3D viewer

Then continue toward:
- stronger procedural transformation
- sensors
- vision
- body-driven interaction
- spatial audio
- deeper web/physical experiments

without losing the canonical SERARA identity.
