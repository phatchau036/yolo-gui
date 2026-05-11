from __future__ import annotations

import importlib.metadata
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import PROJECT_ROOT, SYSTEM_REPORT_DIR, ensure_runtime_dirs


IMPORTANT_PACKAGES = [
    "ultralytics",
    "torch",
    "torchvision",
    "torchaudio",
    "opencv-python",
    "numpy",
    "pillow",
    "onnx",
    "onnxruntime",
    "fastapi",
    "uvicorn",
]


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def create_system_report(environment_status: dict[str, Any]) -> dict[str, Any]:
    ensure_runtime_dirs()
    report_id = utc_stamp()
    payload = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "project_root": str(PROJECT_ROOT),
        "python": {
            "executable": sys.executable,
            "version": sys.version,
            "platform": platform.platform(),
        },
        "environment_status": environment_status,
        "packages": package_versions(),
        "pip_freeze_sample": pip_freeze_sample(),
    }
    json_path = SYSTEM_REPORT_DIR / f"system-report-{report_id}.json"
    md_path = SYSTEM_REPORT_DIR / f"system-report-{report_id}.md"
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    md_path.write_text(render_markdown(payload), encoding="utf-8")
    return {"report_id": report_id, "json_path": str(json_path), "markdown_path": str(md_path), "report": payload}


def package_versions() -> dict[str, str | None]:
    versions = {}
    for package in IMPORTANT_PACKAGES:
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = None
    return versions


def pip_freeze_sample() -> list[str]:
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "freeze"],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=30,
            check=False,
        )
        if result.returncode != 0:
            return [result.stderr.strip() or result.stdout.strip()]
        lines = [line for line in result.stdout.splitlines() if line.strip()]
        return lines[:200]
    except Exception as exc:  # noqa: BLE001 - report generation should survive pip issues.
        return [repr(exc)]


def render_markdown(payload: dict[str, Any]) -> str:
    env = payload["environment_status"]
    torch = env.get("torch", {})
    nvidia = env.get("nvidia", {})
    ultralytics = env.get("ultralytics", {})
    packages = payload["packages"]
    lines = [
        "# YOLO GUI System Report",
        "",
        f"- Created at: `{payload['created_at']}`",
        f"- Project root: `{payload['project_root']}`",
        f"- Python: `{payload['python']['executable']}`",
        f"- Platform: `{payload['python']['platform']}`",
        "",
        "## Runtime",
        "",
        f"- Ultralytics: `{ultralytics.get('version') or 'not installed'}`",
        f"- Torch: `{torch.get('version') or 'not installed'}`",
        f"- Torch CUDA available: `{torch.get('cuda_available')}`",
        f"- Torch CUDA version: `{torch.get('cuda_version')}`",
        f"- NVIDIA available: `{nvidia.get('available')}`",
        f"- NVIDIA driver: `{nvidia.get('driver_version')}`",
        f"- nvidia-smi CUDA: `{nvidia.get('cuda_version')}`",
        "",
        "## GPUs",
        "",
    ]
    gpus = torch.get("devices") or nvidia.get("gpus") or []
    if gpus:
        for gpu in gpus:
            lines.append(f"- `{gpu}`")
    else:
        lines.append("- No GPU detected by current probes.")
    lines.extend(["", "## Important Packages", ""])
    for package, version in packages.items():
        lines.append(f"- `{package}`: `{version or 'not installed'}`")
    lines.extend(["", "## pip freeze sample", "", "```text"])
    lines.extend(payload["pip_freeze_sample"])
    lines.extend(["```", ""])
    return "\n".join(lines)
