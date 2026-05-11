from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path
from typing import Any


def normalize_device(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        if "," in stripped:
            return [int(part.strip()) if part.strip().lstrip("-").isdigit() else part.strip() for part in stripped.split(",")]
        if stripped.lstrip("-").isdigit():
            return int(stripped)
        return stripped
    return value


def normalize_common_args(cfg: dict[str, Any]) -> dict[str, Any]:
    if "device" in cfg:
        cfg["device"] = normalize_device(cfg.get("device"))
    if isinstance(cfg.get("source"), str) and cfg["source"].strip().lstrip("-").isdigit():
        cfg["source"] = int(cfg["source"].strip())
    return {key: value for key, value in cfg.items() if value not in (None, "")}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one Ultralytics YOLO workflow job.")
    parser.add_argument("--config", required=True, help="Path to job config JSON")
    args = parser.parse_args()

    config_path = Path(args.config)
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    job_id = cfg.pop("job_id", "unknown")
    job_type = cfg.pop("job_type", "train")
    cfg.pop("job_dir", None)
    model_path = cfg.pop("model", None)
    cfg = normalize_common_args(cfg)

    try:
        from ultralytics import YOLO
        import ultralytics

        print(f"Job: {job_id}", flush=True)
        print(f"Workflow: {job_type}", flush=True)
        print(f"Ultralytics: {getattr(ultralytics, '__version__', 'unknown')}", flush=True)
        print(f"Model: {model_path}", flush=True)
        print("Arguments:", flush=True)
        print(json.dumps(cfg, indent=2, ensure_ascii=False), flush=True)

        if job_type in {"train", "val", "predict", "export"}:
            if not model_path:
                raise ValueError("model is required")
            model = YOLO(model_path, task=cfg.pop("task", None))
            if job_type == "train":
                results = model.train(**cfg)
            elif job_type == "val":
                results = model.val(**cfg)
            elif job_type == "predict":
                results = model.predict(**cfg)
            else:
                results = model.export(**cfg)
        else:
            raise ValueError(f"Unsupported workflow: {job_type}")

        print(f"{job_type} finished.", flush=True)
        print(f"Results: {results}", flush=True)
        return 0
    except Exception:  # noqa: BLE001 - runner must print full traceback to the job log.
        print(f"{job_type} failed with traceback:", flush=True)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
