#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess
import wave

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_opening, gaussian_filter
from skimage import measure
import trimesh
from trimesh.smoothing import filter_humphrey

ROOT = Path(__file__).resolve().parents[2]
REFS = ROOT / "tools" / "serara3d" / "relic_refs"
OUT = ROOT / "public" / "assets" / "waking-relic"
AUDIO = OUT / "audio"
OUT.mkdir(parents=True, exist_ok=True)
AUDIO.mkdir(parents=True, exist_ok=True)

CROP = (80, 40, 688, 1498)

def load_crop(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGB").crop(CROP))

def segment(img: np.ndarray) -> np.ndarray:
    border = np.concatenate(
        [
            img[:20].reshape(-1, 3),
            img[-20:].reshape(-1, 3),
            img[:, :20].reshape(-1, 3),
            img[:, -20:].reshape(-1, 3),
        ],
        axis=0,
    )
    bg = border.mean(axis=0)
    dist = np.linalg.norm(img.astype(np.float32) - bg.astype(np.float32), axis=2)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    mask = np.logical_or(dist > 20, gray > np.percentile(gray, 62)).astype(np.uint8)
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count > 1:
        keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        mask = (labels == keep).astype(np.uint8)
    return mask

def bottom_align(mask: np.ndarray) -> np.ndarray:
    ys = np.where(mask > 0)[0]
    top, bottom = ys.min(), ys.max()
    canvas = np.zeros_like(mask)
    height = bottom - top + 1
    new_top = mask.shape[0] - height - 2
    canvas[new_top : new_top + height] = mask[top : bottom + 1]
    return canvas

def row_bounds(mask: np.ndarray):
    mins = np.full(mask.shape[0], np.nan)
    maxs = np.full(mask.shape[0], np.nan)
    for z in range(mask.shape[0]):
        xs = np.where(mask[z] > 0)[0]
        if xs.size:
            mins[z], maxs[z] = xs.min(), xs.max()
    return mins, maxs

def build_mesh():
    inputs = {
        "front": REFS / "front.png",
        "side": REFS / "side.png",
        "back": REFS / "back.png",
        "three_quarter": REFS / "three_quarter.png",
    }

    masks = {name: segment(load_crop(path)) for name, path in inputs.items()}

    height = 240
    width = 120
    front = bottom_align(cv2.resize(masks["front"], (width, height), interpolation=cv2.INTER_NEAREST))
    back = bottom_align(cv2.resize(masks["back"], (width, height), interpolation=cv2.INTER_NEAREST))
    side = bottom_align(cv2.resize(masks["side"], (width, height), interpolation=cv2.INTER_NEAREST))
    qtr = bottom_align(cv2.resize(masks["three_quarter"], (width, height), interpolation=cv2.INTER_NEAREST))

    fmin, fmax = row_bounds(front)
    bmin, bmax = row_bounds(back)
    smin, smax = row_bounds(side)
    qmin, qmax = row_bounds(qtr)

    xmin = np.where(np.isnan(fmin), bmin, np.where(np.isnan(bmin), fmin, np.minimum(fmin, bmin)))
    xmax = np.where(np.isnan(fmax), bmax, np.where(np.isnan(bmax), fmax, np.maximum(fmax, bmax)))

    x = np.broadcast_to(np.arange(width)[None, :], (width, width)).astype(float)
    y = np.broadcast_to(np.arange(width)[:, None], (width, width)).astype(float)
    xn = x / (width - 1)
    yn = y / (width - 1)
    u1 = ((xn + yn) / 2.0) * (width - 1)
    u2 = ((xn + (1.0 - yn)) / 2.0) * (width - 1)

    volume = np.zeros((height, width, width), dtype=np.uint8)

    for z in range(height):
        if np.isnan(xmin[z]) or np.isnan(smin[z]) or np.isnan(qmin[z]):
            continue
        slab = np.repeat(
            (((np.arange(width) >= xmin[z]) & (np.arange(width) <= xmax[z]))[None, :]),
            width,
            axis=0,
        )
        slab &= (np.arange(width)[:, None] >= smin[z]) & (np.arange(width)[:, None] <= smax[z])

        qmask1 = (u1 >= qmin[z]) & (u1 <= qmax[z])
        qmask2 = (u2 >= qmin[z]) & (u2 <= qmax[z])
        slab &= qmask1 if np.count_nonzero(slab & qmask1) >= np.count_nonzero(slab & qmask2) else qmask2
        volume[z] = slab.astype(np.uint8)

    solid = gaussian_filter(volume.astype(float), sigma=1.0) > 0.22
    solid = binary_closing(solid, iterations=2)
    solid = binary_opening(solid, iterations=1)

    labels = measure.label(solid, connectivity=1)
    props = measure.regionprops(labels)
    if props:
        solid = labels == max(props, key=lambda p: p.area).label

    verts, faces, _, _ = measure.marching_cubes(solid.astype(np.float32), level=0.5)
    xyz = np.column_stack([verts[:, 2], verts[:, 1], height - verts[:, 0]])
    mins = xyz.min(axis=0)
    maxs = xyz.max(axis=0)
    xyz -= (mins + maxs) / 2
    xyz *= 1.8 / (maxs[2] - mins[2])

    mesh = trimesh.Trimesh(vertices=xyz, faces=faces, process=True)
    filter_humphrey(mesh, alpha=0.08, beta=0.45, iterations=10)

    # Convert our Z-up reconstruction to WebGL/Three.js Y-up.
    vertices = mesh.vertices.copy()
    mesh.vertices = np.column_stack([vertices[:, 0], vertices[:, 2], -vertices[:, 1]])
    mesh.apply_translation(-mesh.bounds.mean(axis=0))

    glb_path = OUT / "SERARA_RELIC.glb"
    mesh.export(glb_path)

    report = {
        "identity": "SERARA // THE WAKING RELIC",
        "method": "intentional multiview silhouette relic reconstruction",
        "vertices": int(len(mesh.vertices)),
        "triangles": int(len(mesh.faces)),
        "watertight": bool(mesh.is_watertight),
        "extents_m": mesh.extents.tolist(),
        "source_views": list(inputs),
    }
    (OUT / "SERARA_RELIC_REPORT.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report

def write_wav(path: Path, stereo: np.ndarray, sr: int = 44100):
    stereo = np.clip(stereo, -1, 1)
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(sr)
        handle.writeframes(pcm.tobytes())

def build_audio():
    sr = 44100
    duration = 72.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    rng = np.random.default_rng(7)

    def osc(freq, amp=1.0, phase=0.0):
        return amp * np.sin(2 * np.pi * freq * t + phase)

    drone = (
        osc(43.65, 0.22)
        + osc(65.41, 0.11, 0.7)
        + osc(87.31, 0.07, 1.2)
        + 0.06 * np.sin(2 * np.pi * (43.65 + 0.35 * np.sin(2 * np.pi * 0.008 * t)) * t)
    )
    noise = rng.normal(0, 1, t.size)
    air = np.convolve(noise, np.ones(800) / 800, mode="same") * 0.045

    pulse = np.zeros_like(t)
    for center in [7.5, 19.0, 33.0, 49.5, 63.0]:
        env = np.exp(-((t - center) / 0.9) ** 2)
        pulse += 0.18 * env * np.sin(2 * np.pi * 32.7 * t)

    glass = np.zeros_like(t)
    for center, freq, amp in [(12, 392, 0.08), (25, 523.25, 0.07), (41, 329.63, 0.07), (57, 659.25, 0.05)]:
        env = np.where(t >= center, np.exp(-(t - center) / 4.5), 0.0)
        glass += amp * env * (
            np.sin(2 * np.pi * freq * t)
            + 0.45 * np.sin(2 * np.pi * (freq * 1.501) * t)
        )

    breathe = 0.80 + 0.20 * np.sin(2 * np.pi * 0.018 * t + 0.4)
    mono = drone * breathe + air + pulse + glass
    left = mono + 0.018 * np.sin(2 * np.pi * 131.0 * t + 0.2)
    right = mono + 0.018 * np.sin(2 * np.pi * 131.8 * t + 1.0)
    stereo = np.stack([left, right], axis=1)
    stereo /= max(np.max(np.abs(stereo)), 1e-9)
    stereo *= 0.82

    ambient_wav = AUDIO / "serara_ritual_ambient.wav"
    ambient_mp3 = AUDIO / "serara_ritual_ambient.mp3"
    write_wav(ambient_wav, stereo, sr)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(ambient_wav), "-codec:a", "libmp3lame", "-q:a", "3", str(ambient_mp3)],
        check=True,
    )
    ambient_wav.unlink(missing_ok=True)

    lines = {
        "wake": "You woke what was sleeping.",
        "close": "Stay close.",
        "silence": "There is a shape inside your silence.",
        "opens": "Now it opens.",
        "seam": "Follow the seam.",
        "remain": "I will remain.",
    }

    for key, text in lines.items():
        raw = AUDIO / f"{key}_raw.wav"
        shaped = AUDIO / f"voice_{key}.wav"
        mp3 = AUDIO / f"voice_{key}.mp3"

        subprocess.run(
            ["espeak", "-v", "en+f3", "-s", "108", "-p", "38", "-a", "110", "-w", str(raw), text],
            check=True,
        )
        subprocess.run(
            [
                "sox", str(raw), str(shaped),
                "highpass", "160",
                "lowpass", "6200",
                "pitch", "-140",
                "tempo", "0.94",
                "reverb", "72", "55", "100", "90", "0", "-4",
                "gain", "-3",
            ],
            check=True,
        )
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(shaped), "-codec:a", "libmp3lame", "-q:a", "2", str(mp3)],
            check=True,
        )
        raw.unlink(missing_ok=True)
        shaped.unlink(missing_ok=True)

    cues = {
        "ambient": "serara_ritual_ambient.mp3",
        "voice": {key: f"voice_{key}.mp3" for key in lines},
        "lines": lines,
    }
    (AUDIO / "audio_cues.json").write_text(json.dumps(cues, indent=2), encoding="utf-8")

if __name__ == "__main__":
    model = build_mesh()
    build_audio()
    print(json.dumps(model, indent=2))
