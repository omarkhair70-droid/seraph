# PHASE 01 — THE BODY
Date: 2026-09-21
Status: ACTIVE
Branch: `phase01/the-body-20260921`

## Objective

SERAPH must become a presence before it becomes an effect.

The first slice is therefore judged by one question:

> If all transformation effects are disabled, does a recognizably humanoid being still feel present in the chamber?

## Current slice

The first body is built in-repo as a procedural sculptural humanoid rather than as a sphere/blob placeholder.

It currently includes:
- head
- readable eye sockets
- brow planes
- nose bridge/projection
- mouth line
- jaw/chin volume
- neck
- chest / ribcage volume
- abdomen
- pelvis
- shoulders
- articulated upper/lower arms
- hands and fingers
- upper/lower legs
- feet
- hierarchical pose groups
- idle breathing
- micro head/neck drift
- subtle shoulder opening
- grounded chamber lighting and contact shadow

## Why procedural first

We do not want SERAPH architecture to depend on a third-party avatar.

This procedural body establishes:
- scale
- camera framing
- silhouette
- body hierarchy
- motion language
- material hooks
- lighting language

A later canonical sculpt / glTF can replace the visible mesh while preserving those systems.

## Not final

The current body is not the final character sculpt.

Before Phase 01 closes, we still need:
- visual proportion review on real phone and desktop
- face readability review
- stronger hand silhouette
- a real canonical rig/skinning path or clearly defined articulated-body contract
- Grace posture
- Tension posture
- Fall posture preview
- stable idle life
- frame/performance measurement
- mobile clipping/framing check

## Asset strategy

Third-party sample humans may be used only as engineering references when license and provenance are explicit.

We will not make a Mixamo sample or mystery GLB the identity of SERAPH.

Preferred long-term path:
- custom SERAPH sculpt
- documented rig
- documented facial topology / morph strategy
- glTF export optimized for web
- source asset retained outside runtime export as appropriate

MakeHuman core/export is being considered as a permissive CC0 starting point for later custom body work, not as the finished visual identity.

## Phase 01 closure gate

Do not merge as complete until:
- the humanoid reads immediately as a being, not assembled primitives
- face/head silhouette reads at phone scale
- feet are grounded
- idle motion feels alive, not looping mechanically
- Grace/Tension/Fall posture differences are perceptible without text labels
- build/lint validation exists
- real-device visual QA exists
