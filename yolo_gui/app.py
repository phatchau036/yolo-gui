from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .automation_manager import AutomationManager
from .config import FRONTEND_DIR, PROJECT_ROOT, ensure_runtime_dirs
from .dataset_tools import audit_dataset as audit_dataset_file
from .dataset_tools import calculate_yolo_metrics, convert_voc_to_yolo, create_dataset_yaml, inspect_dataset as inspect_dataset_file
from .dependency_manager import DependencyManager
from .schemas import (
    AutomationStartRequest,
    DatasetAuditRequest,
    DatasetInspectRequest,
    DatasetYamlCreateRequest,
    ExportRequest,
    MetricsRequest,
    PathListRequest,
    PredictRequest,
    StopJobRequest,
    TrainRequest,
    ValidateRequest,
    VocConvertRequest,
)
from .system_report import create_system_report
from .training_manager import TrainingManager
from .version_manager import VersionManager


ensure_runtime_dirs()

app = FastAPI(title="YOLO GUI", version=__version__)
manager = TrainingManager()
automation_manager = AutomationManager(manager)
dependency_manager = DependencyManager()
version_manager = VersionManager()

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
        "torch_installed": dependency_manager.is_torch_installed(),
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


@app.post("/api/system/report")
def system_report() -> dict[str, Any]:
    return create_system_report(dependency_manager.environment_status())


@app.get("/api/models")
def models() -> dict[str, Any]:
    return {"models": MODEL_PRESETS}


@app.get("/api/version")
def version_info() -> dict[str, Any]:
    return version_manager.version_info()


@app.post("/api/version/update")
def update_version() -> dict[str, Any]:
    try:
        return version_manager.update_from_remote()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/version/save-and-update")
def save_changes_and_update_version() -> dict[str, Any]:
    try:
        return version_manager.save_changes_and_update()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/api/version/restart-status")
def version_restart_status() -> dict[str, Any]:
    return version_manager.restart_status_payload()


@app.get("/api/automations/templates")
def automation_templates() -> dict[str, Any]:
    return {"templates": automation_manager.templates()}


@app.get("/api/automations")
def list_automations() -> dict[str, Any]:
    return {"automations": automation_manager.list_runs()}


@app.post("/api/automations/start")
def start_automation(request: AutomationStartRequest) -> dict[str, Any]:
    if request.automation_type != "prepare_dataset":
        ensure_yolo_runtime()
    try:
        run = automation_manager.start_run(request.automation_type, request.payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"automation": run.public_dict()}


@app.get("/api/automations/{run_id}")
def get_automation(run_id: str) -> dict[str, Any]:
    run = automation_manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Automation not found")
    return {"automation": run.public_dict()}


@app.get("/api/automations/{run_id}/logs")
def get_automation_logs(run_id: str, tail: int = 12000) -> dict[str, Any]:
    log = automation_manager.read_log(run_id, tail=tail)
    if log is None:
        raise HTTPException(status_code=404, detail="Automation log not found")
    return {"automation_id": run_id, "log": log}


def ensure_yolo_runtime() -> None:
    if not dependency_manager.is_ultralytics_installed():
        raise HTTPException(
            status_code=409,
            detail="Ultralytics chưa được cài. Hãy bấm Cài Ultralytics trên GUI trước khi chạy YOLO.",
        )
    if not dependency_manager.is_torch_installed():
        raise HTTPException(
            status_code=409,
            detail="PyTorch chưa được cài. Hãy bấm Cài PyTorch CUDA hoặc Cài PyTorch CPU trên GUI trước khi chạy YOLO.",
        )


def is_camera_source(source: object) -> bool:
    return str(source).strip().isdigit()


@app.get("/api/dependencies/status")
def dependency_status() -> dict[str, Any]:
    status = dependency_manager.environment_status()
    status["runtime"] = "Google Colab" if version_manager.is_colab_runtime() else "Local"
    return status


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


@app.get("/api/dependencies/torch")
def torch_dependency_status() -> dict[str, Any]:
    return dependency_manager.torch_status()


@app.post("/api/dependencies/torch/install-cuda")
def install_torch_cuda_dependency() -> dict[str, Any]:
    return dependency_manager.start_torch_cuda_install()


@app.post("/api/dependencies/torch/install-cpu")
def install_torch_cpu_dependency() -> dict[str, Any]:
    return dependency_manager.start_torch_cpu_install()


@app.get("/api/dependencies/torch/logs")
def torch_dependency_logs(kind: str = "cuda", tail: int = 12000) -> dict[str, Any]:
    if kind not in {"cuda", "cpu"}:
        raise HTTPException(status_code=400, detail="kind must be cuda or cpu")
    key = "torch-cuda" if kind == "cuda" else "torch-cpu"
    return {
        "package": key,
        "log": dependency_manager.read_install_log(key, tail=tail),
        "status": dependency_manager.torch_status(),
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
    try:
        return inspect_dataset_file(request.path)
    except Exception as exc:  # noqa: BLE001 - return readable YAML parse error to UI.
        raise HTTPException(status_code=400, detail=f"Cannot inspect dataset YAML: {exc}") from exc


@app.post("/api/datasets/audit")
def audit_dataset(request: DatasetAuditRequest) -> dict[str, Any]:
    try:
        return audit_dataset_file(request.path, max_examples=request.max_examples)
    except Exception as exc:  # noqa: BLE001 - show exact audit failure in GUI.
        raise HTTPException(status_code=400, detail=f"Cannot audit dataset: {exc}") from exc


@app.post("/api/datasets/create-yaml")
def create_yaml(request: DatasetYamlCreateRequest) -> dict[str, Any]:
    try:
        return create_dataset_yaml(request)
    except Exception as exc:  # noqa: BLE001 - show exact file creation failure in GUI.
        raise HTTPException(status_code=400, detail=f"Cannot create dataset YAML: {exc}") from exc


@app.post("/api/datasets/voc-to-yolo")
def voc_to_yolo(request: VocConvertRequest) -> dict[str, Any]:
    try:
        return convert_voc_to_yolo(
            annotations_dir=request.annotations_dir,
            output_dir=request.output_dir,
            classes=request.classes,
            overwrite=request.overwrite,
        )
    except Exception as exc:  # noqa: BLE001 - show exact conversion failure in GUI.
        raise HTTPException(status_code=400, detail=f"Cannot convert VOC XML: {exc}") from exc


@app.post("/api/datasets/metrics")
def dataset_metrics(request: MetricsRequest) -> dict[str, Any]:
    try:
        return calculate_yolo_metrics(
            prediction_dir=request.prediction_dir,
            ground_truth_dir=request.ground_truth_dir,
            iou_threshold=request.iou_threshold,
            class_count=request.class_count,
        )
    except Exception as exc:  # noqa: BLE001 - show exact metrics failure in GUI.
        raise HTTPException(status_code=400, detail=f"Cannot calculate metrics: {exc}") from exc


@app.post("/api/train/start")
def start_train(request: TrainRequest) -> dict[str, Any]:
    ensure_yolo_runtime()
    if not request.model.strip():
        raise HTTPException(status_code=400, detail="Model is required")
    if not request.data.strip():
        raise HTTPException(status_code=400, detail="Dataset data.yaml is required")
    job = manager.start_job(request, job_type="train")
    return {"job": job.public_dict()}


@app.post("/api/val/start")
def start_val(request: ValidateRequest) -> dict[str, Any]:
    ensure_yolo_runtime()
    if not request.model.strip():
        raise HTTPException(status_code=400, detail="Model is required")
    if not request.data.strip():
        raise HTTPException(status_code=400, detail="Dataset data.yaml is required")
    job = manager.start_job(request, job_type="val")
    return {"job": job.public_dict()}


@app.post("/api/predict/start")
def start_predict(request: PredictRequest) -> dict[str, Any]:
    ensure_yolo_runtime()
    if not request.model.strip():
        raise HTTPException(status_code=400, detail="Model is required")
    if not request.source.strip():
        raise HTTPException(status_code=400, detail="Source path/camera/url is required")
    if version_manager.is_colab_runtime() and is_camera_source(request.source):
        raise HTTPException(
            status_code=400,
            detail=(
                "Google Colab không hỗ trợ webcam trực tiếp (`source=0`). "
                "Hãy chọn ảnh, video hoặc thư mục ảnh trong GUI; nếu cần camera, hãy chạy GUI trên Windows/local."
            ),
        )
    job = manager.start_job(request, job_type="predict")
    return {"job": job.public_dict()}


@app.post("/api/export/start")
def start_export(request: ExportRequest) -> dict[str, Any]:
    ensure_yolo_runtime()
    if not request.model.strip():
        raise HTTPException(status_code=400, detail="Model is required")
    job = manager.start_job(request, job_type="export")
    return {"job": job.public_dict()}


@app.get("/api/jobs")
def list_all_jobs(job_type: str | None = None) -> dict[str, Any]:
    return {"jobs": manager.list_jobs(job_type=job_type)}


@app.get("/api/jobs/{job_id}")
def get_any_job(job_id: str) -> dict[str, Any]:
    job = manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": job.public_dict()}


@app.get("/api/jobs/{job_id}/logs")
def get_any_logs(job_id: str, tail: int = 12000) -> dict[str, Any]:
    log = manager.read_log(job_id, tail=tail)
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"job_id": job_id, "log": log}


@app.get("/api/jobs/{job_id}/artifacts")
def get_job_artifacts(job_id: str) -> dict[str, Any]:
    artifacts = manager.list_artifacts(job_id)
    if artifacts is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, "artifacts": artifacts}


@app.get("/api/jobs/{job_id}/artifacts/{artifact_id}")
def get_job_artifact_file(job_id: str, artifact_id: str) -> FileResponse:
    path = manager.resolve_artifact(job_id, artifact_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return FileResponse(path)


@app.post("/api/jobs/{job_id}/stop")
def stop_any_job(job_id: str, request: StopJobRequest) -> dict[str, Any]:
    job = manager.stop_job(job_id, force=request.force)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": job.public_dict()}


@app.get("/api/train/jobs")
def list_jobs() -> dict[str, Any]:
    return {"jobs": manager.list_jobs(job_type="train")}


@app.get("/api/train/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    job = manager.get_job(job_id)
    if job is None or job.job_type != "train":
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": job.public_dict()}


@app.get("/api/train/jobs/{job_id}/logs")
def get_logs(job_id: str, tail: int = 12000) -> dict[str, Any]:
    job = manager.get_job(job_id)
    if job is None or job.job_type != "train":
        raise HTTPException(status_code=404, detail="Job not found")
    log = manager.read_log(job_id, tail=tail)
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"job_id": job_id, "log": log}


@app.post("/api/train/jobs/{job_id}/stop")
def stop_train(job_id: str, request: StopJobRequest) -> dict[str, Any]:
    job = manager.get_job(job_id)
    if job is None or job.job_type != "train":
        raise HTTPException(status_code=404, detail="Job not found")
    stopped = manager.stop_job(job_id, force=request.force)
    return {"job": stopped.public_dict() if stopped else None}
