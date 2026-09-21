# ASSET PROVENANCE POLICY
Date: 2026-09-21

SERAPH treats character assets as product source, not disposable decoration.

For every external 3D asset we must record:
- source URL / repository
- creator
- license
- attribution requirement
- redistribution constraints
- whether the asset is temporary reference or canonical runtime content
- modifications made
- final runtime filename / hash when applicable

## Current position

No external humanoid GLB is canonical in SERAPH.

The active Phase 01 body is generated from project code.

## Research notes

Khronos glTF Sample Assets:
- useful for skinning / animation engineering references
- individual models carry explicit license metadata
- Rigged Figure / Rigged Simple are CC BY 4.0 Cesium samples

MakeHuman:
- bundled core assets are CC0
- official exported characters are treated by the project as CC0 output
- potentially suitable as a permissive base for a custom SERAPH body pipeline

Mixamo-derived example models:
- may be useful as workflow references
- must not be assumed freely redistributable just because they are found inside an MIT code repository
- will not become canonical SERAPH identity without a clear asset-license basis
