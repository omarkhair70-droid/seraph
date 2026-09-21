# SERAPH TECHNICAL ARCHITECTURE
Date: 2026-09-21

## Runtime

Target:
- modern mobile and desktop browsers
- HTTPS
- progressive enhancement

Primary:
- Next.js / React
- Three.js / React Three Fiber
- TypeScript

## System layers

### 1. Render
Responsible for:
- character
- chamber
- lights
- post effects
- shader materials
- performance budgets

### 2. Character
Responsible for:
- glTF loading
- skeleton
- animation mixer
- procedural pose offsets
- facial state
- body state blending

### 3. Perception
Responsible for:
- camera permission
- pose / hands / later segmentation
- semantic signals
- smoothing
- confidence
- fallback to motion-only mode

### 4. World State
Responsible for:
- Grace
- tension
- corruption
- memory
- calm
- transitions
- hysteresis
- persistence later

### 5. Sound
Responsible for:
- Web Audio graph
- procedural layers
- state-linked harmony / distortion
- spatial placement

### 6. Network
Later:
- realtime presence
- shared state
- multiplayer signals
- persistence

### 7. Physical / Spatial
Later:
- NFC
- hardware sensors
- Web Serial / Bluetooth
- projection
- XR

## Performance law

Rendering and perception run at different cadences.

The visual world should remain smooth even when ML inference is throttled.

We will prefer:
- bounded DPR
- adaptive vision cadence
- LOD / reduced effects on weaker devices
- async asset loading
- compressed glTF/KTX2/meshopt where appropriate

## Privacy law

Camera/microphone access is explicit.

Raw camera frames should remain on-device unless a future experience explicitly requires another architecture and tells the participant clearly.

## Asset law

The canonical humanoid asset must have:
- documented source
- documented license
- legal redistribution/use status
- rig compatibility
- known scale/orientation
- optimization plan

No mystery models copied into the repo.
