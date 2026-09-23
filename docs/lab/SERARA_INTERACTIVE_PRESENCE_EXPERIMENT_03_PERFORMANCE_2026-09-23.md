# SERARA Interactive Presence Lab — Experiment 03

Date: 2026-09-23  
Branch: `lab/serara-interactive-presence-20260923`  
Experience: `SERAPH / Experience 01 — THE BODY`  
Status: RENDERED PERFORMANCE PROOF PASS / REAL-CAMERA ARTISTIC REVIEW OPEN

## Why this experiment exists

THE BODY already had:
- a full rigged 3D body;
- posture states;
- face morphs;
- reactive material;
- chamber lighting and VFX;
- procedural sound;
- attention memory;
- camera perception.

But those systems did not yet behave as one authored character.

The body could be calm while the chamber entered an unrelated timed fall.
Fire could appear because a 30-second loop reached a number.
Camera perception could react to a visitor while the cinematic environment still followed the raw mouse.

That creates a technology demo rather than a living performance.

Experiment 03 introduces one **Embodied Performance Conductor**.

## Core artistic law

SERARA does not perform a fixed animation playlist.

The encounter accumulates meaning.

`visitor signal -> interpretation -> relationship pressure -> embodied phase -> whole-world consequence`

The same interpreted state now drives:
- posture;
- face;
- gaze;
- body motion;
- material;
- chamber camera;
- lighting;
- fire / particles / hostile fragments;
- floor response;
- sound.

The 30-second state cycle remains only as a pre-runtime engineering fallback.

Once SERARA's performance runtime is active, the encounter becomes the source of state.

## Performance grammar

### DORMANT

SERARA is present before she is reactive.

This is not an idle animation.
Movement should be sparse enough that stillness itself reads as intentional.

No automatic dramatic event should occur merely because time passed.

### NOTICE

A visitor has become present, but SERARA has not accepted the encounter yet.

Expected language:
- gaze begins to orient;
- chamber acknowledges direction very subtly;
- body remains resistant;
- no theatrical reward.

### ATTUNE

Stillness and recognition accumulate.

Expected language:
- incidental motion reduces;
- posture becomes more coherent;
- gaze settles;
- sound clears / warms;
- the room feels quieter rather than busier.

A smile may contribute warmth only after recognition.
It is not mirrored.

### STRAIN

Movement energy / avoidance / repeated disturbance build pressure.

Expected language:
- asymmetry increases;
- fingers and shoulders tighten;
- sound becomes less stable;
- internal heat rises;
- room response and body response remain one event.

Strain is accumulation, not a button press.

### FRACTURE

Fracture is an earned threshold event.

It may happen after sustained disturbance.
It must not happen because a timer hit second 18.

Expected language:
- tension peaks;
- body loses coherence;
- fall begins;
- heat / fire / light / fragments become one readable rupture.

A click/touch may contribute pressure but is not allowed to equal instant fracture by itself.

### AFTERMATH

The rupture has consequence.

SERARA must not snap back to neutral.

Expected language:
- fall remains;
- heat decays unevenly;
- attention residue survives;
- sound thins;
- motion should feel spent rather than simply slowed.

### REFORM

The same being rebuilds herself.

Stillness can help re-formation.

Expected language:
- grace returns progressively;
- fall releases;
- residue remains faintly visible/audible;
- the encounter has changed the present state even after the peak event.

## Branching rather than one movie

This is not a linear cutscene.

A calm visitor can move:

`DORMANT -> NOTICE -> ATTUNE -> NOTICE / DORMANT`

without ever causing fracture.

A disturbing encounter can move:

`DORMANT -> NOTICE -> STRAIN -> FRACTURE -> AFTERMATH -> REFORM`

A mixed encounter can move between ATTUNE and STRAIN before either resolving or rupturing.

The performance therefore has a comprehensible dramatic grammar while remaining responsive.

## Implementation

New conductor:
`components/seraph/serara-performance.ts`

The conductor receives interpreted values only:
- direct presence;
- movement energy;
- touch impulse;
- recognition;
- stillness;
- avoidance;
- afterimage;
- accepted attention.

It does not read camera landmarks or pointer coordinates directly.

This preserves the rule established in Experiments 01–02:
SERARA responds to interpreted encounter meaning, not raw input.

## World unification

`serara-state.ts` now exposes encounter-driven state to the existing body/world systems once the conductor is active.

`SeraphWorld.tsx` uses the same interpreted presence and attention for:
- living camera;
- chamber lights;
- floor response.

`CinematicChamberVFX.tsx` uses the same world presence/state for:
- embers;
- counter-current;
- fragments;
- ritual field;
- floor effects.

The chamber is no longer intended to tell a different story from the body.

## Event authorship correction

The previous runtime treated a direct click on SERARA as an immediate cinematic burst.

That behavior has been removed.

Current law:
- pointer / touch contact may wake audio and contribute pressure;
- contact may influence strain through the interpreted encounter;
- contact does not directly fire the rupture;
- the cinematic burst is emitted once, on the actual transition into `FRACTURE`.

This keeps the rupture authored by accumulated encounter pressure rather than by a hidden button.

The public instructional sentence telling the visitor to move close / touch / wait has also been removed from THE BODY.

The remaining presentation does not explain the interaction grammar.
The visitor is expected to discover the relationship through presence.

## Existing systems preserved

This experiment does not:
- redesign the SERARA model;
- replace the rig;
- modify WAKING RELIC;
- add a game HUD;
- add gesture commands;
- add biometric identity;
- add humming/singing;
- turn SERARA into motion capture.

## Acceptance questions

A successful proof must answer YES to all of these:

1. Can SERARA remain calm indefinitely without an automatic timed fracture?
2. Does stillness visibly move the encounter toward attunement?
3. Does disturbance accumulate before strain becomes dramatic?
4. Is fracture a threshold event rather than a single-input animation?
5. Do body, chamber, fire and sound agree about the same phase?
6. Does aftermath remain long enough to feel consequential?
7. Does reform feel like the same being returning rather than an animation reset?
8. Can two different visitor behaviors plausibly create two different encounter arcs?
9. Does the whole experience still feel like an artwork/performance rather than a webcam or game demo?

## Reject conditions

Reject or tune if:
- fire still appears periodically with no encounter cause;
- a single hand wave always produces the same dramatic event;
- a click instantly creates the full rupture;
- camera motion and chamber motion disagree;
- calm presence cannot prevent escalation;
- fracture loops repeatedly during one encounter;
- recovery snaps to neutral;
- state transitions are readable as UI/game states rather than embodied behavior;
- interaction latency feels like dropped frames rather than character hesitation.

## Proof result — 2026-09-23

Automated and rendered gates passed on the Experiment 03 conductor line.

Verified:
- CI: PASS;
- presence regression: PASS;
- camera semantic regression: PASS;
- deterministic embodied performance proof: PASS;
- desktop rendered video review: PASS;
- mobile rendered video review: PASS.

Performance proof run:
- workflow: `SERARA Performance Proof`;
- run: `#11`;
- artifact: `serara-performance-proof`;
- artifact id: `10735285420`;
- proof head: `961b144b34923e3c01e781cfea85fe32f4f968f7`.

Representative desktop telemetry:
- ATTUNE: recognition ~0.39, heat ~0.045, fracture 0;
- STRAIN: tension ~0.77, heat ~0.71, fracture 0;
- FRACTURE: fracture 1.0, tension 1.0, heat 1.0;
- AFTERMATH: fall ~0.99, residue ~0.94;
- REFORM: grace ~0.70 while residue remains ~0.53;
- late residue: grace ~0.88, fracture 0, afterimage still present.

Representative mobile telemetry follows the same dramatic order with device-dependent timing.

Rendered review confirms:
- calm presence does not automatically ignite the chamber;
- STRAIN precedes the rupture;
- FRACTURE and AFTERMATH read as one extended rupture rather than a one-frame effect;
- AFTERMATH carries the strongest visible collapse / fire consequence;
- REFORM restores the same body progressively;
- residue remains after the peak instead of snapping to a neutral reset.

The exact wall-clock timing differs between desktop and mobile.
That is accepted: the conductor is phase-driven, not a fixed cutscene.

## Gate still open

Experiment 03 is **not canonical / merged yet**.

Still required:
- real webcam desktop review;
- real webcam mobile review;
- sound heard on an actual device, not only telemetry/render capture;
- artistic judgment that hesitation reads as intention rather than performance lag;
- confirmation that visitors can discover the encounter without an explicit tutorial.

Do not merge PR #4 until those real-device artistic checks are complete.
