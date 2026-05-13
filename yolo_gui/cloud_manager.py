from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import CLOUD_SETTINGS_PATH, DEFAULT_CLOUD_DIR, ensure_runtime_dirs
from .schemas import CloudSettingsRequest


GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder"
GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3"
STANDARD_FOLDERS: tuple[dict[str, Any], ...] = (
    {"key": "datasets", "label": "Datasets", "description": "Bộ dữ liệu YOLO dùng chung giữa máy local và Colab."},
    {"key": "models", "label": "Models", "description": "Checkpoint, weight pretrained hoặc model đã train."},
    {"key": "runs", "label": "Runs", "description": "Kết quả train, predict, val và export."},
    {"key": "annotations", "label": "Annotations", "description": "Nhãn YOLO .txt và dữ liệu gán nhãn."},
    {"key": "configs", "label": "Configs", "description": "data.yaml, preset và cấu hình GUI có thể dùng lại."},
    {"key": "exports", "label": "Exports", "description": "Model đã đóng gói sang ONNX, TensorRT, TFLite hoặc runtime khác."},
    {"key": "logs", "label": "Logs", "description": "Nhật ký chạy job và báo cáo môi trường."},
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 10:
        return "***"
    return f"{value[:6]}...{value[-4:]}"


def safe_folder_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_. -]+", "-", value).strip(" .-")
    return cleaned or "YOLO-GUI-Cloud"


def extract_drive_folder_id(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    patterns = [
        r"/folders/([A-Za-z0-9_-]+)",
        r"[?&]id=([A-Za-z0-9_-]+)",
        r"^([A-Za-z0-9_-]{12,})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, raw)
        if match:
            return match.group(1)
    return raw


class CloudManager:
    def __init__(self) -> None:
        ensure_runtime_dirs()

    def status(self) -> dict[str, Any]:
        settings = self._read_settings()
        api_key = self._api_key(settings)
        folder_id = extract_drive_folder_id(settings.get("google_drive_folder"))
        root_name = safe_folder_name(str(settings.get("root_name") or "YOLO-GUI-Cloud"))
        local_root = self._local_root(folder_id, root_name)
        return {
            "enabled": bool(settings.get("enabled")),
            "provider": settings.get("provider") or "google_drive",
            "has_api_key": bool(api_key),
            "api_key_masked": mask_secret(api_key),
            "api_key_source": "env" if os.environ.get("YOLO_GUI_GOOGLE_API_KEY") else ("local" if settings.get("google_api_key") else None),
            "google_drive_folder": settings.get("google_drive_folder") or "",
            "google_drive_folder_id": folder_id,
            "root_name": root_name,
            "local_root": str(local_root),
            "standard_folders": self._standard_folder_payload(local_root, settings.get("drive_children") or []),
            "connected": bool(settings.get("connected")),
            "last_connected_at": settings.get("last_connected_at"),
            "last_error": settings.get("last_error"),
            "root_drive": settings.get("root_drive"),
            "manifest_path": str(self._manifest_path(folder_id, root_name)),
        }

    def configure(self, request: CloudSettingsRequest) -> dict[str, Any]:
        settings = self._read_settings()
        previous_folder_id = extract_drive_folder_id(settings.get("google_drive_folder"))
        previous_root_name = safe_folder_name(str(settings.get("root_name") or "YOLO-GUI-Cloud"))
        next_folder_id = extract_drive_folder_id(request.google_drive_folder)
        next_root_name = safe_folder_name(request.root_name)
        settings["enabled"] = request.enabled
        settings["provider"] = request.provider
        settings["google_drive_folder"] = request.google_drive_folder or ""
        settings["root_name"] = next_root_name
        settings["last_error"] = None
        if not request.enabled:
            settings["connected"] = False
        if previous_folder_id != next_folder_id or previous_root_name != next_root_name:
            settings["connected"] = False
            settings.pop("root_drive", None)
            settings.pop("drive_children", None)
        if request.clear_api_key:
            settings.pop("google_api_key", None)
        elif request.google_api_key and request.google_api_key.strip():
            settings["google_api_key"] = request.google_api_key.strip()
        settings["updated_at"] = utc_now()
        settings.setdefault("connected", False)
        self._write_settings(settings)
        self._ensure_standard_dirs(next_folder_id, settings["root_name"])
        return self.status()

    def connect_google_drive(self) -> dict[str, Any]:
        settings = self._read_settings()
        if not settings.get("enabled"):
            settings["last_error"] = "Cloud chưa được bật."
            self._write_settings(settings)
            raise RuntimeError(settings["last_error"])
        api_key = self._api_key(settings)
        if not api_key:
            settings["last_error"] = "Chưa có Google API key. Nhập key trong GUI hoặc đặt YOLO_GUI_GOOGLE_API_KEY."
            self._write_settings(settings)
            raise RuntimeError(settings["last_error"])
        folder_id = extract_drive_folder_id(settings.get("google_drive_folder"))
        if not folder_id:
            settings["last_error"] = "Chưa có Google Drive folder ID hoặc link folder."
            self._write_settings(settings)
            raise RuntimeError(settings["last_error"])

        try:
            root_meta = self._drive_get_file(api_key, folder_id)
            if root_meta.get("mimeType") != GOOGLE_DRIVE_FOLDER_MIME:
                raise RuntimeError("Google Drive ID này không phải thư mục.")
            children = self._drive_list_children(api_key, folder_id)
        except RuntimeError as exc:
            settings["connected"] = False
            settings["last_error"] = str(exc)
            self._write_settings(settings)
            raise

        root_name = safe_folder_name(str(settings.get("root_name") or "YOLO-GUI-Cloud"))
        local_root = self._ensure_standard_dirs(folder_id, root_name)
        manifest = {
            "connected_at": utc_now(),
            "provider": "google_drive",
            "root_drive": root_meta,
            "children": children,
            "standard_folders": self._standard_folder_payload(local_root, children),
            "note": "Manifest chỉ lưu metadata Drive. API key không được ghi vào manifest.",
        }
        manifest_path = self._manifest_path(folder_id, root_name)
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

        settings["connected"] = True
        settings["last_connected_at"] = manifest["connected_at"]
        settings["last_error"] = None
        settings["root_drive"] = root_meta
        settings["drive_children"] = children
        self._write_settings(settings)
        return self.status()

    def _api_key(self, settings: dict[str, Any]) -> str | None:
        return os.environ.get("YOLO_GUI_GOOGLE_API_KEY") or settings.get("google_api_key")

    def _read_settings(self) -> dict[str, Any]:
        if not CLOUD_SETTINGS_PATH.exists():
            return {"enabled": False, "provider": "google_drive", "root_name": "YOLO-GUI-Cloud"}
        try:
            return json.loads(CLOUD_SETTINGS_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {"enabled": False, "provider": "google_drive", "root_name": "YOLO-GUI-Cloud", "last_error": "Không đọc được cloud settings local."}

    def _write_settings(self, settings: dict[str, Any]) -> None:
        CLOUD_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        CLOUD_SETTINGS_PATH.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")

    def _safe_folder_key(self, folder_id: str | None) -> str:
        if not folder_id:
            return "not-connected"
        return re.sub(r"[^A-Za-z0-9_-]+", "-", folder_id)

    def _local_root(self, folder_id: str | None, root_name: str) -> Path:
        return DEFAULT_CLOUD_DIR / "google-drive" / self._safe_folder_key(folder_id) / root_name

    def _manifest_path(self, folder_id: str | None, root_name: str) -> Path:
        return self._local_root(folder_id, root_name) / "cloud-manifest.json"

    def _ensure_standard_dirs(self, folder_id: str | None, root_name: str) -> Path:
        local_root = self._local_root(folder_id, root_name)
        for folder in STANDARD_FOLDERS:
            (local_root / str(folder["key"])).mkdir(parents=True, exist_ok=True)
        return local_root

    def _standard_folder_payload(self, local_root: Path, drive_children: list[dict[str, Any]]) -> list[dict[str, Any]]:
        drive_map = {
            str(child.get("name", "")).strip().lower(): child
            for child in drive_children
            if child.get("mimeType") == GOOGLE_DRIVE_FOLDER_MIME
        }
        payload = []
        for folder in STANDARD_FOLDERS:
            key = str(folder["key"])
            payload.append(
                {
                    **folder,
                    "local_path": str(local_root / key),
                    "drive_folder": drive_map.get(key),
                    "drive_ready": key in drive_map,
                }
            )
        return payload

    def _drive_get_file(self, api_key: str, file_id: str) -> dict[str, Any]:
        params = urllib.parse.urlencode(
            {
                "key": api_key,
                "fields": "id,name,mimeType,webViewLink,modifiedTime",
                "supportsAllDrives": "true",
            }
        )
        return self._drive_request(f"{GOOGLE_DRIVE_API}/files/{urllib.parse.quote(file_id)}?{params}")

    def _drive_list_children(self, api_key: str, folder_id: str) -> list[dict[str, Any]]:
        params = {
            "key": api_key,
            "q": f"'{folder_id}' in parents and trashed=false",
            "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)",
            "pageSize": "200",
            "orderBy": "folder,name",
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
        }
        children: list[dict[str, Any]] = []
        page_token: str | None = None
        while True:
            query = dict(params)
            if page_token:
                query["pageToken"] = page_token
            payload = self._drive_request(f"{GOOGLE_DRIVE_API}/files?{urllib.parse.urlencode(query)}")
            children.extend(payload.get("files") or [])
            page_token = payload.get("nextPageToken")
            if not page_token:
                return children

    def _drive_request(self, url: str) -> dict[str, Any]:
        request = urllib.request.Request(url, headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=25) as response:  # noqa: S310 - user-configured Google API endpoint.
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            message = self._drive_error_message(body) or body or exc.reason
            if exc.code in {401, 403}:
                message = f"{message} API key chỉ đọc được Google Drive folder public/shared; folder private cần OAuth."
            raise RuntimeError(f"Google Drive API lỗi {exc.code}: {message}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Không kết nối được Google Drive API: {exc.reason}") from exc

    def _drive_error_message(self, body: str) -> str | None:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return None
        error = payload.get("error") or {}
        return error.get("message")
