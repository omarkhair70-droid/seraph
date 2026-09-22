# SERAPH / SERARA — CINEMATIC EXPERIENCE MASTER
Date: 2026-09-22
Status: ACTIVE / PRODUCTION DIRECTION

## Thesis

SERAPH is not a portfolio site with a 3D object inside it.

The site is a cinematic encounter with a presence.

The interface should feel foreign, authored, ritualistic and slightly difficult to explain after leaving it. The visitor must remember a sequence of sensations before they remember a feature list.

SERARA is the anchor of that encounter.

## Current visual lock

The current relic silhouette remains intentional.

Rendering direction:
- dark shaded body
- dense triangulated wireframe overlay
- high-poly scan / model-inspector language
- cold-white mesh edges
- almost-black body
- limited warm energy only during state transitions
- no point-cloud look
- no generic robot material
- no glossy sci-fi armor
- no decorative gold unless a later scene earns it

Working name:
**Dense Triangulated Wireframe Relic**

## Why this direction

The wireframe does three jobs at once:
1. it makes the object feel scanned / measured / reconstructed rather than simply modeled;
2. it keeps the shape readable while making the surface difficult to parse;
3. it creates an image that changes with distance: mass from far away, topology from close up.

The result should sit between sculpture, scan data, organism, archaeological evidence and machine vision.

## Reference research translated into rules

Contemporary immersive web work repeatedly combines:
- WebGL / Three.js
- sound as a first-class layer
- scroll-driven narrative structure
- unusual navigation
- sparse copy
- scene transitions instead of page transitions
- deliberate full-screen pacing

We are not copying layouts or art direction. We are adopting the underlying grammar:
**interaction changes the world, not just the UI.**

## Experience law

### The page never explains SERARA before SERARA is felt.

Copy must never say:
- "interactive 3D experience"
- "meet SERARA"
- "explore the model"
- "click to activate"

The experience can hint, invite or warn.

### Movement must be scarce

Motion hierarchy:
1. almost invisible continuous drift
2. awareness / orientation
3. one violent-but-short awakening event
4. recovery into stillness

If everything moves, nothing feels alive.

### Sound must behave like architecture

Sound is not background music.

It has zones and functions:
- room tone establishes scale
- low-frequency energy establishes bodily presence
- high mineral partials imply material / fracture
- voice establishes intelligence
- transition sounds signal scene boundaries
- silence is an authored state

## Sound system

Three layers run independently:

### BED
Continuous ambient composition.
Low volume.
Never asks for attention.

### PRESENCE
Procedural room tone generated in-repo.
Can react to pointer, scroll and SERARA state.

### EVENTS
Awakening hit, threshold riser, room glitch and voice fragments.

The runtime should route long-form audio through Web Audio so visual energy can follow actual frequency data instead of fake sine-wave animation.

## Voice system

Voice is feminine, close, calm and difficult to classify.

It must not sound like:
- an assistant
- a narrator
- a horror villain
- a game NPC
- a trailer announcer

Language direction:
- grammatically plausible but slightly displaced
- short
- no lore dumps
- no direct exposition
- phrases can contradict the interface

Approved examples:
- "Your shadow arrived first."
- "Do not translate the silence."
- "This room has no outside."
- "You woke what was sleeping."
- "The shape is learning your distance."
- "I was quiet, not empty."
- "Follow the seam."

## Cinematic camera law

The camera is a participant.

It can:
- breathe by millimeters
- drift laterally with pointer intent
- push in during attention
- recoil after awakening
- change focal relationship over scroll
- refuse a perfect product-view orbit

It must not:
- orbit like a model viewer
- spin continuously
- expose the object like e-commerce
- react 1:1 to pointer movement

## Scene structure

### PROLOGUE — BLACK / LISTEN
No conventional hero.
A gate that exists mainly to unlock audio.

### CHAPTER 01 — PRESENCE
SERARA is mostly side-on.
Wireframe density dominates.
The first voice line acknowledges the visitor.

### CHAPTER 02 — MEASUREMENT
Camera moves closer.
Wireframe becomes more legible.
Subtle audio energy modulates topology brightness.

### CHAPTER 03 — AWAKENING
One deliberate impact.
Short scale / position shock.
Wireframe flares.
Room sound temporarily collapses.

### CHAPTER 04 — THRESHOLD
Scroll stops behaving like a normal document.
The scene changes before the copy does.
Voice becomes less explanatory.

### CHAPTER 05 — AFTERIMAGE
The visitor leaves with less information than expected but more memory.

## Rendering architecture

Current stack remains valid:
- Next.js
- React
- React Three Fiber
- Three.js
- TypeScript

Near-term rendering plan:
- base mesh = dark physically based material
- overlay mesh = additive wireframe material
- state-driven wire opacity
- audio-reactive edge energy
- ACES tone mapping
- bounded DPR
- fog / atmosphere
- selective DOM grain / scan texture
- no heavy post-processing dependency until the look proves it needs one

## Performance law

Desktop:
- full dense wireframe
- high quality lighting
- DPR capped
- richer audio analysis

Mobile:
- same identity, not a different design
- reduced wire opacity / density if necessary
- fewer secondary effects
- same state machine and sound logic

## Public-release standard

A scene does not pass because it "works".

It passes only if:
- still frame is memorable
- motion remains legible at 10 fps screen recording
- sound makes sense with eyes closed
- mute mode still feels intentional
- mobile still looks authored
- no debug/model-viewer feeling survives
- no explanatory copy is carrying weak art direction

## Immediate production slice

1. Replace porcelain relic treatment with dense triangulated wireframe treatment.
2. Add Web Audio analyser and state-linked frequency response.
3. Add deterministic cinematic SFX generated during build.
4. Rewrite copy away from explanatory portfolio language.
5. Make camera movement cinematic rather than interactive-viewer-like.
6. Keep the current relic silhouette until the experience proves exactly what geometry needs refinement.

## Non-goal

We are not trying to make the visitor understand everything.

We are trying to make the visitor feel that something understood them.
