from __future__ import annotations

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
from typing import Any

from .config import DEFAULT_OUTPUT_DIR, DEFAULT_PREDICT_DIR, DEFAULT_VAL_DIR, JOB_ROOT, LOG_DIR, PROJECT_ROOT, ensure_runtime_dirs


RUNNER_MODULE = "yolo_gui.workflow_runner"
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
    def __init__(self) -> None:
        ensure_runtime_dirs()
        self._jobs: dict[str, TrainingJob] = {}
        self._lock = threading.Lock()

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

    def _build_config(self, request: Any, job_type: str) -> dict[str, Any]:
        raw = model_to_dict(request)
        extra = raw.pop("extra_args", {}) or {}

        if job_type in JOB_DEFAULT_PROJECTS and not raw.get("project"):
            raw["project"] = str(JOB_DEFAULT_PROJECTS[job_type])
        if job_type in JOB_DEFAULT_NAMES and not raw.get("name"):
            raw["name"] = JOB_DEFAULT_NAMES[job_type]

        raw.update(extra)
        return {key: value for key, value in raw.items() if value not in (None, "")}

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
