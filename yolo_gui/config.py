from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
LOG_DIR = PROJECT_ROOT / "logs" / "train_jobs"
JOB_ROOT = PROJECT_ROOT / "runs" / "gui_jobs"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "runs" / "train"


def ensure_runtime_dirs() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    JOB_ROOT.mkdir(parents=True, exist_ok=True)
    DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
