from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import LOG_ROOT, ensure_runtime_dirs
from .dataset_tools import audit_dataset, create_dataset_yaml
from .schemas import DatasetYamlCreateRequest, ExportRequest, TrainRequest, ValidateRequest
from .training_manager import TrainingJob, TrainingManager


AUTOMATION_LOG_DIR = LOG_ROOT / "automations"
TERMINAL_JOB_STATUSES = {"completed", "failed", "stopped"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class AutomationStep:
    id: str
    label: str
    status: str = "pending"
    message: str | None = None
    job_id: str | None = None
    started_at: str | None = None
    ended_at: str | None = None

    def public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "status": self.status,
            "message": self.message,
            "job_id": self.job_id,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
        }


@dataclass
class AutomationRun:
    id: str
    automation_type: str
    name: str
    status: str
    created_at: str
    log_path: Path
    payload: dict[str, Any]
    steps: list[AutomationStep]
    started_at: str | None = None
    ended_at: str | None = None
    current_job_id: str | None = None
    error: str | None = None

    def public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "automation_type": self.automation_type,
            "name": self.name,
            "status": self.status,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "current_job_id": self.current_job_id,
            "error": self.error,
            "log_path": str(self.log_path),
            "steps": [step.public_dict() for step in self.steps],
        }


class AutomationManager:
    def __init__(self, training_manager: TrainingManager) -> None:
        ensure_runtime_dirs()
        AUTOMATION_LOG_DIR.mkdir(parents=True, exist_ok=True)
        self.training_manager = training_manager
        self._runs: dict[str, AutomationRun] = {}
        self._lock = threading.Lock()

    def templates(self) -> list[dict[str, str]]:
        return [
            {
                "type": "prepare_dataset",
                "name": "Chuẩn bị dataset",
                "description": "Tạo cấu hình dataset rồi quét lỗi nhãn/ảnh.",
            },
            {
                "type": "train_ready",
                "name": "Chuẩn bị rồi huấn luyện",
                "description": "Tạo dataset nếu cần, kiểm tra dữ liệu, sau đó bắt đầu huấn luyện.",
            },
            {
                "type": "evaluate_export",
                "name": "Đánh giá rồi đóng gói",
                "description": "Đánh giá model đang chọn, sau đó đóng gói model cùng cấu hình.",
            },
            {
                "type": "full_pipeline",
                "name": "Pipeline đầy đủ",
                "description": "Dataset, kiểm tra, huấn luyện, đánh giá và đóng gói trong một chuỗi.",
            },
        ]

    def list_runs(self) -> list[dict[str, Any]]:
        with self._lock:
            return [run.public_dict() for run in sorted(self._runs.values(), key=lambda item: item.created_at, reverse=True)]

    def get_run(self, run_id: str) -> AutomationRun | None:
        with self._lock:
            return self._runs.get(run_id)

    def read_log(self, run_id: str, tail: int = 12000) -> str | None:
        run = self.get_run(run_id)
        if run is None or not run.log_path.exists():
            return None
        text = run.log_path.read_text(encoding="utf-8", errors="replace")
        if tail > 0 and len(text) > tail:
            return text[-tail:]
        return text

    def start_run(self, automation_type: str, payload: dict[str, Any]) -> AutomationRun:
        template = next((item for item in self.templates() if item["type"] == automation_type), None)
        if template is None:
            raise ValueError(f"Unknown automation type: {automation_type}")

        run_id = time.strftime("%Y%m%d-%H%M%S") + "-auto-" + uuid.uuid4().hex[:8]
        steps = self._build_steps(automation_type)
        run = AutomationRun(
            id=run_id,
            automation_type=automation_type,
            name=template["name"],
            status="starting",
            created_at=utc_now(),
            log_path=AUTOMATION_LOG_DIR / f"{run_id}.log",
            payload=payload,
            steps=steps,
        )
        with self._lock:
            self._runs[run.id] = run
        threading.Thread(target=self._run_automation, args=(run,), daemon=True).start()
        return run

    def _build_steps(self, automation_type: str) -> list[AutomationStep]:
        if automation_type == "prepare_dataset":
            return [
                AutomationStep("dataset", "Tạo cấu hình dataset"),
                AutomationStep("audit", "Kiểm tra dữ liệu"),
            ]
        if automation_type == "train_ready":
            return [
                AutomationStep("dataset", "Chuẩn bị dataset"),
                AutomationStep("audit", "Kiểm tra dữ liệu"),
                AutomationStep("train", "Huấn luyện model"),
            ]
        if automation_type == "evaluate_export":
            return [
                AutomationStep("val", "Đánh giá model"),
                AutomationStep("export", "Đóng gói model"),
            ]
        return [
            AutomationStep("dataset", "Chuẩn bị dataset"),
            AutomationStep("audit", "Kiểm tra dữ liệu"),
            AutomationStep("train", "Huấn luyện model"),
            AutomationStep("val", "Đánh giá model"),
            AutomationStep("export", "Đóng gói model"),
        ]

    def _run_automation(self, run: AutomationRun) -> None:
        with self._lock:
            run.status = "running"
            run.started_at = utc_now()

        with run.log_path.open("a", encoding="utf-8", errors="replace") as log:
            self._log(log, run, f"Bắt đầu automation: {run.name}")
            self._log(log, run, json.dumps(run.payload, indent=2, ensure_ascii=False))
            try:
                dataset_path = self._dataset_path_from_payload(run.payload)
                trained_model_path: str | None = None

                if run.automation_type in {"prepare_dataset", "train_ready", "full_pipeline"}:
                    dataset_path = self._maybe_create_dataset(run, log, dataset_path)
                    self._audit_dataset(run, log, dataset_path)

                if run.automation_type in {"train_ready", "full_pipeline"}:
                    train_payload = dict(run.payload.get("train", {}))
                    if dataset_path and not train_payload.get("data"):
                        train_payload["data"] = dataset_path
                    train_job = self._start_workflow_step(run, log, "train", TrainRequest, train_payload)
                    self._wait_for_job(run, log, train_job)
                    trained_model_path = self._expected_best_model(train_job)
                    self._log(log, run, f"Model dự kiến sau huấn luyện: {trained_model_path}")

                if run.automation_type in {"evaluate_export", "full_pipeline"}:
                    val_payload = dict(run.payload.get("validate", {}))
                    if dataset_path and not val_payload.get("data"):
                        val_payload["data"] = dataset_path
                    if trained_model_path:
                        val_payload["model"] = trained_model_path
                    self._wait_for_job(run, log, self._start_workflow_step(run, log, "val", ValidateRequest, val_payload))

                    export_payload = dict(run.payload.get("export", {}))
                    if trained_model_path:
                        export_payload["model"] = trained_model_path
                    elif not export_payload.get("model") and val_payload.get("model"):
                        export_payload["model"] = val_payload["model"]
                    if dataset_path and not export_payload.get("data"):
                        export_payload["data"] = dataset_path
                    self._wait_for_job(run, log, self._start_workflow_step(run, log, "export", ExportRequest, export_payload))

                with self._lock:
                    run.status = "completed"
                    run.ended_at = utc_now()
                self._log(log, run, "Automation hoàn tất.")
            except Exception as exc:  # noqa: BLE001 - automation logs must show exact failure.
                with self._lock:
                    run.status = "failed"
                    run.ended_at = utc_now()
                    run.error = repr(exc)
                    if run.steps:
                        active = next((step for step in run.steps if step.status == "running"), None)
                        if active:
                            active.status = "failed"
                            active.message = repr(exc)
                            active.ended_at = utc_now()
                self._log(log, run, f"Automation lỗi: {exc!r}")

    def _maybe_create_dataset(self, run: AutomationRun, log: Any, current_path: str | None) -> str:
        dataset_payload = run.payload.get("dataset") or {}
        if not dataset_payload.get("root") or not dataset_payload.get("names"):
            if not current_path:
                raise ValueError("Automation cần dataset đã chọn hoặc thông tin tạo dataset.")
            self._skip_step(run, "dataset", "Đã có dataset, bỏ qua bước tạo.")
            return current_path
        step = self._start_step(run, "dataset")
        request = DatasetYamlCreateRequest(**dataset_payload)
        result = create_dataset_yaml(request)
        step.message = f"Đã tạo: {result['path']}"
        self._finish_step(step, "completed")
        self._log(log, run, step.message)
        return str(result["path"])

    def _audit_dataset(self, run: AutomationRun, log: Any, dataset_path: str | None) -> None:
        if not dataset_path:
            raise ValueError("Không có dataset để kiểm tra.")
        step = self._start_step(run, "audit")
        result = audit_dataset(dataset_path)
        warning_count = len(result.get("warnings", []))
        step.message = "Không thấy lỗi lớn." if not warning_count else f"Có {warning_count} cảnh báo cần xem."
        self._finish_step(step, "completed")
        self._log(log, run, step.message)

    def _start_workflow_step(
        self,
        run: AutomationRun,
        log: Any,
        step_id: str,
        schema: type[Any],
        payload: dict[str, Any],
    ) -> TrainingJob:
        step = self._start_step(run, step_id)
        if step_id == "train":
            payload = self._prepare_train_payload(run, payload)
        request = schema(**payload)
        job_type = "val" if step_id == "val" else step_id
        job = self.training_manager.start_job(request, job_type=job_type)
        with self._lock:
            run.current_job_id = job.id
        step.job_id = job.id
        step.message = f"Đã tạo tiến trình {job.id}"
        self._log(log, run, f"{step.label}: {job.id}")
        return job

    def _wait_for_job(self, run: AutomationRun, log: Any, job: TrainingJob) -> None:
        while True:
            current = self.training_manager.get_job(job.id)
            if current and current.status in TERMINAL_JOB_STATUSES:
                step = next((item for item in run.steps if item.job_id == job.id), None)
                if current.status == "completed":
                    if step:
                        step.message = "Hoàn tất."
                        self._finish_step(step, "completed")
                    self._log(log, run, f"Tiến trình {job.id} hoàn tất.")
                    return
                if step:
                    step.message = current.error or f"Tiến trình kết thúc với trạng thái {current.status}."
                    self._finish_step(step, "failed")
                raise RuntimeError(current.error or f"Job {job.id} ended with status {current.status}")
            time.sleep(2)

    def _prepare_train_payload(self, run: AutomationRun, payload: dict[str, Any]) -> dict[str, Any]:
        prepared = dict(payload)
        if not prepared.get("name"):
            prepared["name"] = f"auto-{run.id[-8:]}"
        prepared["exist_ok"] = True
        return prepared

    def _expected_best_model(self, job: TrainingJob) -> str:
        cfg = json.loads(job.config_path.read_text(encoding="utf-8"))
        project = Path(str(cfg.get("project", ""))).expanduser()
        name = str(cfg.get("name", "gui-train"))
        return str(project / name / "weights" / "best.pt")

    def _dataset_path_from_payload(self, payload: dict[str, Any]) -> str | None:
        for key in ("train", "validate", "export"):
            item = payload.get(key) or {}
            if item.get("data"):
                return str(item["data"])
        if payload.get("audit_path"):
            return str(payload["audit_path"])
        return None

    def _start_step(self, run: AutomationRun, step_id: str) -> AutomationStep:
        step = next(item for item in run.steps if item.id == step_id)
        with self._lock:
            step.status = "running"
            step.started_at = utc_now()
        return step

    def _skip_step(self, run: AutomationRun, step_id: str, message: str) -> None:
        step = next(item for item in run.steps if item.id == step_id)
        with self._lock:
            step.status = "skipped"
            step.message = message
            step.started_at = utc_now()
            step.ended_at = utc_now()

    def _finish_step(self, step: AutomationStep, status: str) -> None:
        with self._lock:
            step.status = status
            step.ended_at = utc_now()

    def _log(self, log: Any, run: AutomationRun, message: str) -> None:
        log.write(f"[{utc_now()}] {message}\n")
        log.flush()
