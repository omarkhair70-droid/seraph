#!/usr/bin/env python3
import json, os, sys, time, urllib.request, urllib.error, pathlib

API = "https://api.meshy.ai/openapi/v1"
OUT = pathlib.Path(os.environ.get("SERARA_MESHY_OUT", "SERARA_MESHY_FINAL"))
OUT.mkdir(parents=True, exist_ok=True)

KEY = os.environ.get("MESHY_API_KEY", "").strip()
if not KEY:
    print("MESHY_API_KEY is missing", file=sys.stderr)
    sys.exit(20)

views = [
    os.environ["SERARA_FRONT_URL"],
    os.environ["SERARA_THREE_QUARTER_URL"],
    os.environ["SERARA_SIDE_URL"],
    os.environ["SERARA_BACK_URL"],
]

def req(method, url, payload=None, timeout=90):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Authorization": f"Bearer {KEY}"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as r:
            raw = r.read()
            ctype = (r.headers.get("content-type") or "").lower()
            if "json" in ctype or raw[:1] in (b"{", b"["):
                return json.loads(raw.decode("utf-8"))
            return raw
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {e.code} {url}: {body[:2000]}") from e

def poll(kind, task_id, timeout_s=1800):
    endpoint = f"{API}/{kind}/{task_id}"
    start = time.time()
    while True:
        obj = req("GET", endpoint)
        status = obj.get("status")
        progress = obj.get("progress")
        print(f"{kind} {task_id}: {status} {progress}%")
        (OUT / f"{kind.replace('/','_')}_{task_id}.json").write_text(json.dumps(obj, indent=2), encoding="utf-8")
        if status == "SUCCEEDED":
            return obj
        if status in {"FAILED", "CANCELED"}:
            raise RuntimeError(f"{kind} task {task_id} ended {status}: {obj.get('task_error')}")
        if time.time() - start > timeout_s:
            raise TimeoutError(f"{kind} task {task_id} timed out")
        time.sleep(15)

def download(url, path):
    print("download", path.name)
    request = urllib.request.Request(url, headers={"User-Agent":"SERARA-pipeline/1.0"})
    with urllib.request.urlopen(request, timeout=180) as r, path.open("wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
    if path.stat().st_size == 0:
        raise RuntimeError(f"empty download: {path}")

def preflight_image(url, label):
    request = urllib.request.Request(url, headers={"User-Agent":"SERARA-pipeline/1.0"})
    with urllib.request.urlopen(request, timeout=60) as r:
        ctype = (r.headers.get("content-type") or "").lower()
        final = r.geturl()
        print(f"{label}: {r.status} {ctype} -> {final[:180]}")
        if "image/" not in ctype:
            head = r.read(128)
            raise RuntimeError(f"{label} URL is not serving an image; content-type={ctype}, head={head!r}")

for label, url in zip(["front","three_quarter","side","back"], views):
    preflight_image(url, label)

multi_payload = {
    "image_urls": views,
    "texture_image_urls": views,
    "ai_model": "meshy-7.1",
    "geometry_resolution": "2k",
    "should_texture": True,
    "enable_pbr": True,
    "texture_resolution": "4k",
    "should_remesh": False,
    "pose_mode": "a-pose",
    "image_enhancement": False,
    "remove_lighting": True,
    "target_formats": ["glb"],
    "auto_size": True,
    "origin_at": "bottom",
    "alpha_thumbnail": True,
    "multi_view_thumbnails": True
}
created = req("POST", f"{API}/multi-image-to-3d", multi_payload)
multi_id = created["result"]
(OUT/"01_multi_create.json").write_text(json.dumps(created, indent=2), encoding="utf-8")
multi = poll("multi-image-to-3d", multi_id)
raw_glb_url = multi["model_urls"]["glb"]
download(raw_glb_url, OUT/"SERARA_GENERATED_RAW.glb")

thumb = multi.get("thumbnail_url")
if thumb:
    download(thumb, OUT/"SERARA_GENERATED_FRONT.png")
for name, url in (multi.get("thumbnail_urls") or {}).items():
    if url:
        download(url, OUT/f"SERARA_GENERATED_{name.upper()}.png")
if multi.get("alpha_thumbnail_url"):
    download(multi["alpha_thumbnail_url"], OUT/"SERARA_GENERATED_ALPHA.png")

remesh_payload = {
    "model_url": raw_glb_url,
    "target_formats": ["glb"],
    "topology": "quad",
    "target_polycount": 60000
}
remesh_created = req("POST", f"{API}/remesh", remesh_payload)
remesh_id = remesh_created["result"]
(OUT/"02_remesh_create.json").write_text(json.dumps(remesh_created, indent=2), encoding="utf-8")
remesh = poll("remesh", remesh_id)
remesh_url = remesh["model_urls"]["glb"]
download(remesh_url, OUT/"SERARA_REMESH_60K.glb")

rig_payload = {
    "model_url": remesh_url,
    "height_meters": 1.8
}
rig_created = req("POST", f"{API}/rigging", rig_payload)
rig_id = rig_created["result"]
(OUT/"03_rig_create.json").write_text(json.dumps(rig_created, indent=2), encoding="utf-8")
rig = poll("rigging", rig_id)
rig_url = rig["result"]["rigged_character_glb_url"]
download(rig_url, OUT/"SERARA_CANONICAL_RIGGED.glb")

for key, url in (rig.get("result", {}).get("basic_animations") or {}).items():
    if key.endswith("_glb_url") and url:
        download(url, OUT/f"SERARA_{key.replace('_glb_url','').upper()}.glb")

summary = {
    "multi_task_id": multi_id,
    "remesh_task_id": remesh_id,
    "rig_task_id": rig_id,
    "ai_model": "meshy-7.1",
    "geometry_resolution": "2k",
    "texture_resolution": "4k",
    "target_polycount": 60000,
    "pose_mode": "a-pose",
    "image_enhancement": False,
    "outputs": sorted(p.name for p in OUT.iterdir())
}
(OUT/"SERARA_MESHY_RUN_SUMMARY.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(json.dumps(summary, indent=2))
