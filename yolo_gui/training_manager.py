from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, TextIO

from .config import DEFAULT_OUTPUT_DIR, DEFAULT_PREDICT_DIR, DEFAULT_VAL_DIR, JOB_ROOT, LOG_DIR, PROJECT_ROOT, ensure_runtime_dirs


RUNNER_MODULE = "yolo_gui.workflow_runner"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}
JOB_DEFAULT_NAMES = {
    "train": "gui-train",
    "val": "gui-val",
    "predict": "gui-predict",
}
JOB_DEFAULT_PROJECTS = {
    "train": DEFAULT_OUTPUT_DIR,
    "val": DEFAULT_VAL_DIR,
    "predict": DEFAULT_PREDICT_DIR,
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def model_to_dict(model: Any) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


@dataclass
class TrainingJob:
    id: str
    job_type: str
    status: str
    created_at: str
    config_path: Path
    log_path: Path
    job_dir: Path
    process: subprocess.Popen[str] | None = None
    started_at: str | None = None
    ended_at: str | None = None
    returncode: int | None = None
    error: str | None = None
    command: list[str] = field(default_factory=list)
    stop_requested: bool = False

    def public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "job_type": self.job_type,
            "status": self.status,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "returncode": self.returncode,
            "error": self.error,
            "config_path": str(self.config_path),
            "log_path": str(self.log_path),
            "job_dir": str(self.job_dir),
            "command": self.command,
        }


class TrainingManager:
    def __init__(self, on_job_finished: Callable[[dict[str, Any]], Any] | None = None) -> None:
        ensure_runtime_dirs()
        self._jobs: dict[str, TrainingJob] = {}
        self._lock = threading.Lock()
        self._on_job_finished = on_job_finished

    def list_jobs(self, job_type: str | None = None) -> list[dict[str, Any]]:
        with self._lock:
            jobs = self._jobs.values()
            if job_type:
                jobs = [job for job in jobs if job.job_type == job_type]
            return [job.public_dict() for job in sorted(jobs, key=lambda item: item.created_at, reverse=True)]

    def get_job(self, job_id: str) -> TrainingJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def start_job(self, request: Any, job_type: str = "train") -> TrainingJob:
        ensure_runtime_dirs()
        cfg = self._build_config(request, job_type=job_type)
        job_id = time.strftime("%Y%m%d-%H%M%S") + f"-{job_type}-" + uuid.uuid4().hex[:8]
        job_dir = JOB_ROOT / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        config_path = job_dir / f"{job_type}_config.json"
        log_path = LOG_DIR / f"{job_id}.log"

        cfg["job_id"] = job_id
        cfg["job_type"] = job_type
        cfg["job_dir"] = str(job_dir)
        config_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")

        command = [sys.executable, "-m", RUNNER_MODULE, "--config", str(config_path)]
        job = TrainingJob(
            id=job_id,
            job_type=job_type,
            status="starting",
            created_at=utc_now(),
            config_path=config_path,
            log_path=log_path,
            job_dir=job_dir,
            command=command,
        )

        with self._lock:
            self._jobs[job_id] = job

        thread = threading.Thread(target=self._run_process, args=(job,), daemon=True)
        thread.start()
        return job

    def stop_job(self, job_id: str, force: bool = False) -> TrainingJob | None:
        job = self.get_job(job_id)
        if job is None:
            return None

        with self._lock:
            job.stop_requested = True
            if job.status in {"starting", "running"}:
                job.status = "stopping"

        process = job.process
        if process and process.poll() is None:
            if force:
                process.kill()
            else:
                process.terminate()
        return job

    def read_log(self, job_id: str, tail: int = 4000) -> str | None:
        job = self.get_job(job_id)
        if job is None or not job.log_path.exists():
            return None
        text = job.log_path.read_text(encoding="utf-8", errors="replace")
        if tail > 0 and len(text) > tail:
            return text[-tail:]
        return text

    def list_artifacts(self, job_id: str, limit: int = 60) -> list[dict[str, Any]] | None:
        job = self.get_job(job_id)
        if job is None:
            return None
        artifacts: list[dict[str, Any]] = []
        seen_paths: set[Path] = set()
        for root in self._artifact_roots(job):
            if not root.exists():
                continue
            files = [path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS]
            for path in sorted(files, key=lambda item: item.stat().st_mtime, reverse=True):
                resolved_path = path.resolve()
                if resolved_path in seen_paths:
                    continue
                seen_paths.add(resolved_path)
                artifact_id = self.encode_artifact_path(path)
                artifacts.append(
                    {
                        "id": artifact_id,
                        "name": path.name,
                        "path": str(path),
                        "type": "video" if path.suffix.lower() in VIDEO_EXTENSIONS else "image",
                        "url": f"/api/jobs/{job.id}/artifacts/{artifact_id}",
                    }
                )
                if len(artifacts) >= limit:
                    return artifacts
        return artifacts

    def resolve_artifact(self, job_id: str, artifact_id: str) -> Path | None:
        job = self.get_job(job_id)
        if job is None:
            return None
        try:
            raw = base64.urlsafe_b64decode(artifact_id.encode("ascii")).decode("utf-8")
        except Exception:
            return None
        path = Path(raw)
        if not path.exists() or not path.is_file():
            return None
        if path.suffix.lower() not in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS:
            return None
        resolved = path.resolve()
        for root in self._artifact_roots(job):
            try:
                resolved.relative_to(root.resolve())
                return resolved
            except ValueError:
                continue
        return None

    def _build_config(self, request: Any, job_type: str) -> dict[str, Any]:
        raw = model_to_dict(request)
        extra = raw.pop("extra_args", {}) or {}

        if job_type in JOB_DEFAULT_PROJECTS and not raw.get("project"):
            raw["project"] = str(JOB_DEFAULT_PROJECTS[job_type])
        if job_type in JOB_DEFAULT_NAMES and not raw.get("name"):
            raw["name"] = JOB_DEFAULT_NAMES[job_type]

        raw.update(extra)
        return {key: value for key, value in raw.items() if value not in (None, "")}

    def _artifact_roots(self, job: TrainingJob) -> list[Path]:
        roots: list[Path] = [job.job_dir]
        config = self._read_job_config(job)
        if not config:
            return roots
        project_value = config.get("project")
        name = str(config.get("name") or "").strip()
        if project_value:
            project = Path(str(project_value)).expanduser()
            if not project.is_absolute():
                project = PROJECT_ROOT / project
            if project.exists():
                if name:
                    roots.extend(path for path in project.glob(f"{name}*") if path.is_dir())
                roots.append(project)
        return list(dict.fromkeys(roots))

    def _read_job_config(self, job: TrainingJob) -> dict[str, Any]:
        try:
            return json.loads(job.config_path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    @staticmethod
    def encode_artifact_path(path: Path) -> str:
        return base64.urlsafe_b64encode(str(path.resolve()).encode("utf-8")).decode("ascii")

    def _run_process(self, job: TrainingJob) -> None:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"

        with self._lock:
            job.status = "running"
            job.started_at = utc_now()

        with job.log_path.open("a", encoding="utf-8", errors="replace") as log:
            log.write(f"[{utc_now()}] Starting YOLO {job.job_type} job {job.id}\n")
            log.write("Command: " + " ".join(job.command) + "\n\n")
            log.flush()

            try:
                process = subprocess.Popen(
                    job.command,
                    cwd=str(PROJECT_ROOT),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    env=env,
                )
                with self._lock:
                    job.process = process

                assert process.stdout is not None
                for line in process.stdout:
                    log.write(line)
                    log.flush()

                returncode = process.wait()
                with self._lock:
                    job.returncode = returncode
                    job.ended_at = utc_now()
                    if job.stop_requested:
                        job.status = "stopped"
                    elif returncode == 0:
                        job.status = "completed"
                    else:
                        job.status = "failed"
                        job.error = f"Runner exited with code {returncode}"
                log.write(f"\n[{utc_now()}] Job ended with code {returncode}\n")
            except Exception as exc:  # noqa: BLE001 - must surface full runtime failure.
                with self._lock:
                    job.status = "failed"
                    job.ended_at = utc_now()
                    job.error = repr(exc)
                log.write(f"\n[{utc_now()}] Manager failure: {exc!r}\n")
                log.flush()
            self._notify_job_finished(job, log)

    def _notify_job_finished(self, job: TrainingJob, log: TextIO) -> None:
        if self._on_job_finished is None:
            return
        try:
            log.write(f"\n[{utc_now()}] Cloud storage capture started\n")
            log.flush()
            result = self._on_job_finished(job.public_dict())
            if result:
                log.write(f"[{utc_now()}] Cloud storage snapshot: {result.get('snapshot_dir')}\n")
            else:
                log.write(f"[{utc_now()}] Cloud storage skipped\n")
        except Exception as exc:  # noqa: BLE001 - cloud backup must not break the finished job.
            log.write(f"[{utc_now()}] Cloud storage capture failed: {exc!r}\n")
        finally:
            log.flush()
