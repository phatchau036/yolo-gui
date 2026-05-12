from __future__ import annotations

import os
import re
import subprocess
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from . import __version__
from .colab_runtime import RESTART_REQUEST_PATH, RESTART_STATE_PATH, create_restart_request, read_json_file
from .config import PROJECT_ROOT, UPDATE_LOG_DIR


CHANGELOG_PATH = PROJECT_ROOT / "CHANGELOG.md"
VERSION_PATTERN = re.compile(r'__version__\s*=\s*["\']([^"\']+)["\']')
GITHUB_REMOTE_PATTERN = re.compile(r"github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/.]+)(?:\.git)?$")


@dataclass
class GitResult:
    ok: bool
    stdout: str
    stderr: str
    returncode: int

    @property
    def text(self) -> str:
        return "\n".join(part for part in [self.stdout.strip(), self.stderr.strip()] if part)


class VersionManager:
    def __init__(self, project_root: Path = PROJECT_ROOT) -> None:
        self.project_root = project_root

    def version_info(self) -> dict[str, Any]:
        git = self.git_status()
        source_version = self.source_version() or __version__
        update_available = bool(git["remote_commit"] and git["local_commit"] and git["remote_commit"] != git["local_commit"])
        latest_version = self.remote_version(git["remote_url"], git["remote_branch"]) if update_available else None
        latest_version = latest_version or source_version or __version__
        restart_required = bool(source_version and source_version != __version__)
        can_save_and_update = bool(update_available and git["is_git_repo"] and git["dirty"] and not restart_required)
        status_message = git["status_message"]
        if restart_required:
            if self.is_colab_runtime():
                status_message = (
                    f"Source đã cập nhật lên v{source_version}, nhưng server hiện tại vẫn đang chạy v{__version__}. "
                    "Hãy giữ tab này mở; Colab sẽ mở tunnel mới rồi báo link mới."
                )
            else:
                status_message = (
                    f"Source đã cập nhật lên v{source_version}, nhưng backend hiện tại vẫn đang chạy v{__version__}. "
                    "Hãy restart app để nạp backend mới."
                )
        return {
            **git,
            "app_name": "YOLO GUI",
            "runtime": "Google Colab" if self.is_colab_runtime() else "Local",
            "current_version": __version__,
            "running_version": __version__,
            "source_version": source_version,
            "latest_version": latest_version,
            "update_available": update_available,
            "restart_required": restart_required,
            "can_update": bool(update_available and git["is_git_repo"] and not git["dirty"] and not restart_required),
            "can_save_and_update": can_save_and_update,
            "checked_at": datetime.now().isoformat(timespec="seconds"),
            "changelog": self.changelog_sections(),
            "restart_status": self.restart_status_payload(include_version=False),
            "status_message": status_message,
        }

    def git_status(self) -> dict[str, Any]:
        is_git_repo = self.git(["rev-parse", "--is-inside-work-tree"]).stdout.strip() == "true"
        if not is_git_repo:
            return {
                "is_git_repo": False,
                "local_commit": None,
                "local_commit_short": None,
                "local_branch": None,
                "remote_name": None,
                "remote_branch": "main",
                "remote_url": None,
                "remote_commit": None,
                "remote_commit_short": None,
                "dirty": False,
                "dirty_files": [],
                "status_message": "Thư mục hiện tại không phải git repo nên không thể tự cập nhật.",
            }

        branch = self.git(["branch", "--show-current"]).stdout.strip() or "main"
        remote_name = self.git(["config", "--get", f"branch.{branch}.remote"]).stdout.strip() or "origin"
        merge_ref = self.git(["config", "--get", f"branch.{branch}.merge"]).stdout.strip()
        remote_branch = merge_ref.removeprefix("refs/heads/") if merge_ref else branch
        remote_url = self.git(["remote", "get-url", remote_name]).stdout.strip() or None
        local_commit = self.git(["rev-parse", "HEAD"]).stdout.strip() or None
        local_commit_short = self.git(["rev-parse", "--short", "HEAD"]).stdout.strip() or None
        status_lines = [line for line in self.git(["status", "--porcelain"]).stdout.splitlines() if line.strip()]
        remote_commit = self.remote_commit(remote_name, remote_branch)
        if remote_commit is None:
            status_message = "Chưa kiểm tra được phiên bản mới trên GitHub. Hãy kiểm tra mạng hoặc remote git."
        elif remote_commit != local_commit:
            status_message = "Có bản mới trên GitHub. Bạn có thể bấm Cập nhật ngay."
        else:
            status_message = "Bạn đang dùng phiên bản mới nhất từ GitHub."
        if status_lines and remote_commit != local_commit:
            status_message = "Có bản mới nhưng repo đang có file đã sửa. Hãy commit hoặc lưu thay đổi trước khi cập nhật."

        return {
            "is_git_repo": True,
            "local_commit": local_commit,
            "local_commit_short": local_commit_short,
            "local_branch": branch,
            "remote_name": remote_name,
            "remote_branch": remote_branch,
            "remote_url": remote_url,
            "remote_commit": remote_commit,
            "remote_commit_short": remote_commit[:7] if remote_commit else None,
            "dirty": bool(status_lines),
            "dirty_files": status_lines[:40],
            "status_message": status_message,
        }

    def update_from_remote(self) -> dict[str, Any]:
        before = self.version_info()
        if not before["is_git_repo"]:
            raise RuntimeError("Thư mục hiện tại không phải git repo nên không thể tự cập nhật.")
        if before["dirty"]:
            raise RuntimeError("Repo đang có file đã sửa. Hãy bấm Sao lưu rồi cập nhật để GUI cất tạm thay đổi trước.")

        remote_name = before["remote_name"] or "origin"
        remote_branch = before["remote_branch"] or "main"
        result = self.git(["pull", "--ff-only", remote_name, remote_branch], timeout=180)
        log_path = self.write_update_log(result)
        if not result.ok:
            raise RuntimeError(f"Cập nhật từ GitHub lỗi. Xem log: {log_path}")
        after = self.version_info()
        restart = self.schedule_restart_after_update(before, after, saved_changes=False)
        return {
            "ok": result.ok,
            "returncode": result.returncode,
            "log": result.text or "Không có output từ git pull.",
            "log_path": str(log_path),
            "before": before,
            "after": after,
            "restart": restart,
            "restart_recommended": True,
            "message": self.update_message(restart=restart),
        }

    def save_changes_and_update(self) -> dict[str, Any]:
        before = self.version_info()
        if not before["is_git_repo"]:
            raise RuntimeError("Thư mục hiện tại không phải git repo nên không thể tự cập nhật.")
        if not before["update_available"]:
            raise RuntimeError("Chưa thấy bản mới để cập nhật.")
        if not before["dirty"]:
            return self.update_from_remote()

        remote_name = before["remote_name"] or "origin"
        remote_branch = before["remote_branch"] or "main"
        stash_message = f"YOLO GUI auto-save before update {datetime.now().isoformat(timespec='seconds')}"
        stash_result = self.git(["stash", "push", "--include-untracked", "-m", stash_message], timeout=180)
        if not stash_result.ok:
            log_path = self.write_update_text("===== Save local changes =====\n" + (stash_result.text or "No git output."))
            raise RuntimeError(f"Không sao lưu được thay đổi. Xem log: {log_path}")

        pull_result = self.git(["pull", "--ff-only", remote_name, remote_branch], timeout=180)
        log_text = "\n\n".join(
            [
                "===== Save local changes =====",
                stash_result.text or "Git đã cất tạm thay đổi.",
                "===== Update from GitHub =====",
                pull_result.text or "Không có output từ git pull.",
            ]
        )
        log_path = self.write_update_text(log_text)
        if not pull_result.ok:
            raise RuntimeError(f"Đã sao lưu thay đổi local nhưng cập nhật từ GitHub lỗi. Xem log: {log_path}")
        after = self.version_info()
        restart = self.schedule_restart_after_update(before, after, saved_changes=True)
        return {
            "ok": pull_result.ok,
            "returncode": pull_result.returncode,
            "log": log_text,
            "log_path": str(log_path),
            "before": before,
            "after": after,
            "saved_changes": True,
            "stash_message": stash_message,
            "restart": restart,
            "restart_recommended": True,
            "message": self.update_message(saved_changes=True, restart=restart),
        }

    def source_version(self) -> str | None:
        init_path = self.project_root / "yolo_gui" / "__init__.py"
        if not init_path.exists():
            return None
        match = VERSION_PATTERN.search(init_path.read_text(encoding="utf-8", errors="replace"))
        return match.group(1) if match else None

    def git(self, args: list[str], timeout: int = 15) -> GitResult:
        try:
            completed = subprocess.run(
                ["git", *args],
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
                check=False,
            )
        except Exception as exc:  # noqa: BLE001 - show git failure in GUI.
            return GitResult(False, "", repr(exc), 1)
        return GitResult(completed.returncode == 0, completed.stdout, completed.stderr, completed.returncode)

    def remote_commit(self, remote_name: str, remote_branch: str) -> str | None:
        result = self.git(["ls-remote", remote_name, f"refs/heads/{remote_branch}"], timeout=20)
        if not result.ok:
            return None
        first = result.stdout.strip().split()
        return first[0] if first else None

    def remote_version(self, remote_url: str | None, remote_branch: str | None) -> str | None:
        if not remote_url:
            return None
        raw_base = self.github_raw_base(remote_url, remote_branch or "main")
        if not raw_base:
            return None
        try:
            with urllib.request.urlopen(f"{raw_base}/yolo_gui/__init__.py", timeout=8) as response:
                text = response.read().decode("utf-8", errors="replace")
        except Exception:  # noqa: BLE001 - version check should still work without raw GitHub.
            return None
        match = VERSION_PATTERN.search(text)
        return match.group(1) if match else None

    def github_raw_base(self, remote_url: str, branch: str) -> str | None:
        normalized = remote_url.strip()
        match = GITHUB_REMOTE_PATTERN.search(normalized)
        if not match:
            return None
        return f"https://raw.githubusercontent.com/{match.group('owner')}/{match.group('repo')}/{branch}"

    def changelog_sections(self) -> list[dict[str, Any]]:
        if not CHANGELOG_PATH.exists():
            return []
        sections: list[dict[str, Any]] = []
        current: dict[str, Any] | None = None
        for raw_line in CHANGELOG_PATH.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw_line.strip()
            if line.startswith("## "):
                if current:
                    sections.append(current)
                title = line.removeprefix("## ").strip()
                version, _, date = title.partition(" - ")
                current = {"version": version, "date": date, "items": []}
                continue
            if current and line.startswith("- "):
                current["items"].append(line.removeprefix("- ").strip())
        if current:
            sections.append(current)
        return sections[:12]

    def write_update_log(self, result: GitResult) -> Path:
        return self.write_update_text(result.text or "No git output.")

    def write_update_text(self, text: str) -> Path:
        UPDATE_LOG_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = UPDATE_LOG_DIR / f"update-{timestamp}.log"
        path.write_text(text, encoding="utf-8")
        return path

    def schedule_restart_after_update(
        self,
        before: dict[str, Any],
        after: dict[str, Any],
        *,
        saved_changes: bool,
    ) -> dict[str, Any]:
        if self.is_colab_runtime():
            request = create_restart_request(
                "save-and-update" if saved_changes else "update",
                before,
                after,
            )
            return {
                "required": True,
                "mode": "colab_handoff",
                "request_id": request["request_id"],
                "status_url": "/api/version/restart-status",
                "message": (
                    "Colab sẽ mở server và Cloudflare Tunnel mới trước, báo link mới trong GUI/cell, "
                    "rồi mới dừng phiên cũ."
                ),
            }
        return {
            "required": True,
            "mode": "manual_restart",
            "message": "Hãy restart app để backend nạp source mới.",
        }

    def restart_status_payload(self, include_version: bool = True) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "supported": self.is_colab_runtime(),
            "request": read_json_file(RESTART_REQUEST_PATH),
            "state": read_json_file(RESTART_STATE_PATH),
        }
        if include_version:
            payload["running_version"] = __version__
            payload["source_version"] = self.source_version() or __version__
            payload["restart_required"] = payload["source_version"] != __version__
        return payload

    def update_message(self, saved_changes: bool = False, restart: dict[str, Any] | None = None) -> str:
        saved_note = " GUI đã cất tạm thay đổi local trước khi cập nhật." if saved_changes else ""
        if restart and restart.get("mode") == "colab_handoff":
            return (
                "Đã cập nhật source."
                + saved_note
                + " Colab đang mở server/tunnel mới. Giữ tab này mở; khi link mới hiện ra hãy bấm mở GUI mới."
            )
        return "Đã cập nhật." + saved_note + " Hãy tải lại trang; nếu backend thay đổi, hãy restart app."

    def is_colab_runtime(self) -> bool:
        if "COLAB_RELEASE_TAG" in os.environ:
            return True
        try:
            import google.colab  # type: ignore  # noqa: F401
        except Exception:  # noqa: BLE001 - runtime detection is best-effort.
            return False
        return True
