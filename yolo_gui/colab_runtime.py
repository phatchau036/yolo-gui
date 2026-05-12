from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import PROJECT_ROOT


COLAB_LOG_DIR = PROJECT_ROOT / "logs" / "colab"
RESTART_REQUEST_PATH = COLAB_LOG_DIR / "restart-request.json"
RESTART_STATE_PATH = COLAB_LOG_DIR / "restart-state.json"


def timestamp() -> str:
    return datetime.now().isoformat(timespec="seconds")


def read_json_file(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 - corrupted control files should not crash the app.
        return None
    return payload if isinstance(payload, dict) else None


def write_json_file(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(f"{path.suffix}.tmp")
    temp_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    temp_path.replace(path)


def create_restart_request(reason: str, before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    request = {
        "request_id": uuid.uuid4().hex[:12],
        "status": "requested",
        "reason": reason,
        "created_at": timestamp(),
        "created_epoch": time.time(),
        "process_id": os.getpid(),
        "before_version": before.get("current_version"),
        "after_source_version": after.get("source_version") or after.get("current_version"),
        "before_commit": before.get("local_commit_short"),
        "after_commit": after.get("local_commit_short"),
    }
    state = {
        "request_id": request["request_id"],
        "status": "requested",
        "message": "Đã cập nhật source. Colab đang chờ cell mở server và Cloudflare Tunnel mới.",
        "updated_at": timestamp(),
    }
    write_json_file(RESTART_REQUEST_PATH, request)
    write_json_file(RESTART_STATE_PATH, state)
    return request
