# SERARA Interactive Presence Lab — Experiment 03

Date: 2026-09-23  
Branch: `lab/serara-interactive-presence-20260923`  
Experience: `SERAPH / Experience 01 — THE BODY`  
Status: EXPERIMENTAL / PERFORMANCE ARC PROOF OPEN

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

## Proof gate

Experiment 03 requires:
- CI PASS;
- existing presence regression PASS;
- existing camera semantic regression PASS;
- deterministic performance-arc proof;
- rendered video review;
- then real-camera artistic review.

Do not merge PR #4 merely because the conductor compiles.
