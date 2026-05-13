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
from .schemas import CloudProfileSaveRequest, CloudSettingsRequest


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
MODEL_EXTENSIONS = {".pt", ".onnx", ".engine", ".tflite", ".mlpackage", ".torchscript", ".pb", ".bin"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
CONFIG_EXTENSIONS = {".json", ".yaml", ".yml", ".toml", ".txt"}
MAX_MANAGER_ITEMS = 80


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


def safe_profile_id(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip(".-")
    return cleaned or "yolo-profile"


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

    def manager(self) -> dict[str, Any]:
        status = self.status()
        local_root = Path(status["local_root"])
        self._ensure_standard_dirs(status.get("google_drive_folder_id"), status["root_name"])
        return {
            **status,
            "profiles": self._list_profiles(local_root),
            "assets": {
                "models": self._scan_files([local_root / "models", local_root / "runs", local_root / "exports"], MODEL_EXTENSIONS),
                "configs": self._scan_files([local_root / "configs"], CONFIG_EXTENSIONS),
                "images": self._scan_files([local_root / "datasets", local_root / "annotations", local_root / "runs"], IMAGE_EXTENSIONS),
                "datasets": self._scan_dirs(local_root / "datasets"),
                "runs": self._scan_dirs(local_root / "runs"),
                "exports": self._scan_files([local_root / "exports"], MODEL_EXTENSIONS | CONFIG_EXTENSIONS),
            },
        }

    def save_profile(self, request: CloudProfileSaveRequest) -> dict[str, Any]:
        status = self.status()
        local_root = self._ensure_standard_dirs(status.get("google_drive_folder_id"), status["root_name"])
        profile_dir = self._profile_dir(local_root)
        profile_dir.mkdir(parents=True, exist_ok=True)
        profile_id = f"{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{safe_profile_id(request.name)[:48]}"
        payload = self._sanitize_profile_payload(request.payload)
        profile = {
            "id": profile_id,
            "name": request.name.strip(),
            "notes": (request.notes or "").strip(),
            "saved_at": utc_now(),
            "summary": self._profile_summary(payload),
            "payload": payload,
        }
        (profile_dir / f"{profile_id}.json").write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
        return self.manager()

    def delete_profile(self, profile_id: str) -> dict[str, Any]:
        status = self.status()
        local_root = Path(status["local_root"])
        target = self._profile_dir(local_root) / f"{safe_profile_id(profile_id)}.json"
        if not target.exists():
            raise RuntimeError("Không tìm thấy profile Cloud này.")
        target.unlink()
        return self.manager()

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

    def _profile_dir(self, local_root: Path) -> Path:
        return local_root / "configs" / "gui-settings"

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

    def _list_profiles(self, local_root: Path) -> list[dict[str, Any]]:
        profile_dir = self._profile_dir(local_root)
        if not profile_dir.exists():
            return []
        profiles: list[dict[str, Any]] = []
        for path in sorted(profile_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True):
            try:
                profile = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                profile = {
                    "id": path.stem,
                    "name": path.stem,
                    "notes": "",
                    "saved_at": self._modified_at(path),
                    "summary": ["Profile không đọc được, hãy xóa hoặc lưu lại."],
                    "payload": {},
                }
            profile["path"] = str(path)
            profiles.append(profile)
            if len(profiles) >= MAX_MANAGER_ITEMS:
                break
        return profiles

    def _scan_files(self, roots: list[Path], extensions: set[str]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen: set[Path] = set()
        for root in roots:
            if not root.exists():
                continue
            for path in root.rglob("*"):
                if len(items) >= MAX_MANAGER_ITEMS:
                    return items
                if not path.is_file() or path.suffix.lower() not in extensions:
                    continue
                resolved = path.resolve()
                if resolved in seen:
                    continue
                seen.add(resolved)
                items.append(self._asset_payload(path, root))
        return sorted(items, key=lambda item: item.get("modified_at") or "", reverse=True)

    def _scan_dirs(self, root: Path) -> list[dict[str, Any]]:
        if not root.exists():
            return []
        items: list[dict[str, Any]] = []
        for path in sorted((item for item in root.iterdir() if item.is_dir()), key=lambda item: item.stat().st_mtime, reverse=True):
            items.append(
                {
                    "name": path.name,
                    "path": str(path),
                    "relative_path": path.name,
                    "kind": "folder",
                    "modified_at": self._modified_at(path),
                }
            )
            if len(items) >= MAX_MANAGER_ITEMS:
                break
        return items

    def _asset_payload(self, path: Path, root: Path) -> dict[str, Any]:
        try:
            relative = str(path.relative_to(root))
        except ValueError:
            relative = path.name
        return {
            "name": path.name,
            "path": str(path),
            "relative_path": relative,
            "kind": path.suffix.lower().lstrip(".") or "file",
            "size": path.stat().st_size,
            "modified_at": self._modified_at(path),
        }

    def _modified_at(self, path: Path) -> str | None:
        try:
            return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()
        except OSError:
            return None

    def _sanitize_profile_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        forbidden = {"google_api_key", "api_key", "secret", "token", "password"}

        def clean(value: Any) -> Any:
            if isinstance(value, dict):
                return {key: clean(item) for key, item in value.items() if key.lower() not in forbidden}
            if isinstance(value, list):
                return [clean(item) for item in value]
            return value

        cleaned = clean(payload)
        return cleaned if isinstance(cleaned, dict) else {}

    def _profile_summary(self, payload: dict[str, Any]) -> list[str]:
        summary: list[str] = []
        train = payload.get("train") or {}
        dataset = payload.get("dataset") or {}
        predict = payload.get("predict") or {}
        annotator = payload.get("annotator") or {}
        if train.get("model"):
            summary.append(f"Train model: {train['model']}")
        if train.get("data") or dataset.get("yaml_output_path"):
            summary.append(f"Dataset: {train.get('data') or dataset.get('yaml_output_path')}")
        if predict.get("source"):
            summary.append(f"Dự đoán: {predict['source']}")
        if annotator.get("image_dir"):
            summary.append(f"Ảnh gán nhãn: {annotator['image_dir']}")
        return summary[:6] or ["Đã lưu cấu hình GUI hiện tại."]

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
