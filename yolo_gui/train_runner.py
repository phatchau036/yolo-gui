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


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one Ultralytics YOLO training job.")
    parser.add_argument("--config", required=True, help="Path to train_config.json")
    args = parser.parse_args()

    config_path = Path(args.config)
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    job_id = cfg.pop("job_id", "unknown")
    cfg.pop("job_dir", None)
    model_path = cfg.pop("model")
    cfg["device"] = normalize_device(cfg.get("device"))

    try:
        from ultralytics import YOLO
        import ultralytics

        print(f"Job: {job_id}", flush=True)
        print(f"Ultralytics: {getattr(ultralytics, '__version__', 'unknown')}", flush=True)
        print(f"Model: {model_path}", flush=True)
        print(f"Data: {cfg.get('data')}", flush=True)
        print("Training arguments:", flush=True)
        print(json.dumps(cfg, indent=2, ensure_ascii=False), flush=True)

        model = YOLO(model_path)
        results = model.train(**cfg)
        print("Training finished.", flush=True)
        print(f"Results: {results}", flush=True)
        return 0
    except Exception:  # noqa: BLE001 - runner must print full traceback to the job log.
        print("Training failed with traceback:", flush=True)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
