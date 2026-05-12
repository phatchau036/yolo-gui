from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
LOG_ROOT = PROJECT_ROOT / "logs"
LOG_DIR = LOG_ROOT / "workflow_jobs"
DEPENDENCY_LOG_DIR = PROJECT_ROOT / "logs" / "dependency_installs"
SYSTEM_REPORT_DIR = PROJECT_ROOT / "logs" / "system_reports"
UPDATE_LOG_DIR = PROJECT_ROOT / "logs" / "updates"
JOB_ROOT = PROJECT_ROOT / "runs" / "gui_jobs"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "runs" / "train"
DEFAULT_PREDICT_DIR = PROJECT_ROOT / "runs" / "predict"
DEFAULT_VAL_DIR = PROJECT_ROOT / "runs" / "val"


def ensure_runtime_dirs() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    DEPENDENCY_LOG_DIR.mkdir(parents=True, exist_ok=True)
    SYSTEM_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    UPDATE_LOG_DIR.mkdir(parents=True, exist_ok=True)
    JOB_ROOT.mkdir(parents=True, exist_ok=True)
    DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_PREDICT_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_VAL_DIR.mkdir(parents=True, exist_ok=True)
