from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR, PROJECT_ROOT, ensure_runtime_dirs
from .dependency_manager import DependencyManager
from .schemas import DatasetInspectRequest, PathListRequest, StopJobRequest, TrainRequest
from .training_manager import TrainingManager


ensure_runtime_dirs()

app = FastAPI(title="YOLO GUI", version="0.1.0")
manager = TrainingManager()
dependency_manager = DependencyManager()

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR)), name="assets")


MODEL_PRESETS: list[dict[str, str]] = [
    {"label": "YOLO26 nano", "value": "yolo26n.pt", "family": "YOLO26"},
    {"label": "YOLO26 small", "value": "yolo26s.pt", "family": "YOLO26"},
    {"label": "YOLO26 medium", "value": "yolo26m.pt", "family": "YOLO26"},
    {"label": "YOLO26 large", "value": "yolo26l.pt", "family": "YOLO26"},
    {"label": "YOLO26 xlarge", "value": "yolo26x.pt", "family": "YOLO26"},
    {"label": "YOLO11 nano", "value": "yolo11n.pt", "family": "YOLO11"},
    {"label": "YOLO11 small", "value": "yolo11s.pt", "family": "YOLO11"},
    {"label": "YOLO11 medium", "value": "yolo11m.pt", "family": "YOLO11"},
    {"label": "YOLO11 large", "value": "yolo11l.pt", "family": "YOLO11"},
    {"label": "YOLO11 xlarge", "value": "yolo11x.pt", "family": "YOLO11"},
    {"label": "YOLOv8 nano", "value": "yolov8n.pt", "family": "YOLOv8"},
    {"label": "YOLOv8 small", "value": "yolov8s.pt", "family": "YOLOv8"},
    {"label": "YOLOv8 medium", "value": "yolov8m.pt", "family": "YOLOv8"},
    {"label": "YOLOv8 large", "value": "yolov8l.pt", "family": "YOLOv8"},
    {"label": "YOLOv8 xlarge", "value": "yolov8x.pt", "family": "YOLOv8"},
]


@app.get("/")
def index() -> FileResponse:
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="frontend/index.html is missing")
    return FileResponse(index_path)


@app.get("/favicon.ico")
def favicon() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "favicon.svg", media_type="image/svg+xml")


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "project_root": str(PROJECT_ROOT),
        "ultralytics_installed": dependency_manager.is_ultralytics_installed(),
        "torch_installed": importlib.util.find_spec("torch") is not None,
    }


@app.get("/api/system")
def system_info() -> dict[str, Any]:
    info: dict[str, Any] = {
        "python": os.sys.version,
        "cuda_available": False,
        "devices": [],
    }
    try:
        import torch

        info["torch"] = getattr(torch, "__version__", "unknown")
        info["cuda_available"] = bool(torch.cuda.is_available())
        if torch.cuda.is_available():
            info["devices"] = [
                {
                    "id": idx,
                    "name": torch.cuda.get_device_name(idx),
                    "memory_gb": round(torch.cuda.get_device_properties(idx).total_memory / (1024**3), 2),
                }
                for idx in range(torch.cuda.device_count())
            ]
    except Exception as exc:  # noqa: BLE001 - diagnostics endpoint should not crash.
        info["torch_error"] = repr(exc)
    return info


@app.get("/api/models")
def models() -> dict[str, Any]:
    return {"models": MODEL_PRESETS}


@app.get("/api/dependencies/ultralytics")
def ultralytics_dependency_status() -> dict[str, Any]:
    return dependency_manager.ultralytics_status()


@app.post("/api/dependencies/ultralytics/install")
def install_ultralytics_dependency() -> dict[str, Any]:
    return dependency_manager.start_ultralytics_install()


@app.get("/api/dependencies/ultralytics/logs")
def ultralytics_dependency_logs(tail: int = 12000) -> dict[str, Any]:
    return {
        "package": "ultralytics",
        "log": dependency_manager.read_ultralytics_log(tail=tail),
        "status": dependency_manager.ultralytics_status(),
    }


@app.post("/api/paths/list")
def list_path(request: PathListRequest) -> dict[str, Any]:
    target = Path(request.path).expanduser() if request.path else Path.home()
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Path does not exist: {target}")
    if target.is_file():
        target = target.parent

    entries = []
    try:
        for item in sorted(target.iterdir(), key=lambda path: (path.is_file(), path.name.lower())):
            if item.name.startswith("."):
                continue
            if item.is_dir() or request.include_files:
                entries.append(
                    {
                        "name": item.name,
                        "path": str(item),
                        "type": "dir" if item.is_dir() else "file",
                        "is_data_yaml": item.is_file() and item.name.lower() in {"data.yaml", "dataset.yaml"},
                    }
                )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=f"Permission denied: {target}") from exc

    return {
        "path": str(target),
        "parent": str(target.parent) if target.parent != target else None,
        "entries": entries,
    }


@app.post("/api/datasets/inspect")
def inspect_dataset(request: DatasetInspectRequest) -> dict[str, Any]:
    path = Path(request.path).expanduser()
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset YAML does not exist: {path}")
    if path.is_dir():
        path = path / "data.yaml"
    if path.suffix.lower() not in {".yaml", ".yml"}:
        raise HTTPException(status_code=400, detail="Dataset path must be a YAML file")

    try:
        payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception as exc:  # noqa: BLE001 - return readable YAML parse error to UI.
        raise HTTPException(status_code=400, detail=f"Cannot parse dataset YAML: {exc}") from exc

    names = payload.get("names", [])
    if isinstance(names, dict):
        class_count = len(names)
    elif isinstance(names, list):
        class_count = len(names)
    else:
        class_count = 0

    return {
        "path": str(path),
        "root": payload.get("path"),
        "train": payload.get("train"),
        "val": payload.get("val"),
        "test": payload.get("test"),
        "class_count": class_count,
        "names": names,
        "raw": payload,
    }


@app.post("/api/train/start")
def start_train(request: TrainRequest) -> dict[str, Any]:
    if not dependency_manager.is_ultralytics_installed():
        raise HTTPException(
            status_code=409,
            detail="Ultralytics chưa được cài. Hãy bấm Cài Ultralytics trên GUI trước khi train.",
        )
    if not request.model.strip():
        raise HTTPException(status_code=400, detail="Model is required")
    if not request.data.strip():
        raise HTTPException(status_code=400, detail="Dataset data.yaml is required")
    job = manager.start_job(request)
    return {"job": job.public_dict()}


@app.get("/api/train/jobs")
def list_jobs() -> dict[str, Any]:
    return {"jobs": manager.list_jobs()}


@app.get("/api/train/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    job = manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": job.public_dict()}


@app.get("/api/train/jobs/{job_id}/logs")
def get_logs(job_id: str, tail: int = 12000) -> dict[str, Any]:
    log = manager.read_log(job_id, tail=tail)
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"job_id": job_id, "log": log}


@app.post("/api/train/jobs/{job_id}/stop")
def stop_train(job_id: str, request: StopJobRequest) -> dict[str, Any]:
    job = manager.stop_job(job_id, force=request.force)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": job.public_dict()}
