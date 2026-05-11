from __future__ import annotations

import importlib
import importlib.metadata
import importlib.util
import subprocess
import sys
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import DEPENDENCY_LOG_DIR, PROJECT_ROOT, ensure_runtime_dirs


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class DependencyInstall:
    package: str
    requirement: str
    status: str = "idle"
    started_at: str | None = None
    ended_at: str | None = None
    returncode: int | None = None
    error: str | None = None
    log_path: Path | None = None
    command: list[str] = field(default_factory=list)

    def public_dict(self) -> dict[str, Any]:
        return {
            "package": self.package,
            "requirement": self.requirement,
            "status": self.status,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "returncode": self.returncode,
            "error": self.error,
            "log_path": str(self.log_path) if self.log_path else None,
            "command": self.command,
        }


class DependencyManager:
    def __init__(self) -> None:
        ensure_runtime_dirs()
        self._lock = threading.Lock()
        self._ultralytics = DependencyInstall(package="ultralytics", requirement="ultralytics>=8.3.0")

    def is_ultralytics_installed(self) -> bool:
        importlib.invalidate_caches()
        return importlib.util.find_spec("ultralytics") is not None

    def ultralytics_status(self) -> dict[str, Any]:
        return {
            "installed": self.is_ultralytics_installed(),
            "version": self._package_version("ultralytics"),
            "python": sys.executable,
            "install": self._ultralytics.public_dict(),
        }

    def start_ultralytics_install(self) -> dict[str, Any]:
        with self._lock:
            if self._ultralytics.status == "running":
                return self.ultralytics_status()

            log_path = DEPENDENCY_LOG_DIR / "ultralytics-install.log"
            command = [sys.executable, "-m", "pip", "install", self._ultralytics.requirement]
            self._ultralytics = DependencyInstall(
                package="ultralytics",
                requirement="ultralytics>=8.3.0",
                status="running",
                started_at=utc_now(),
                log_path=log_path,
                command=command,
            )

        thread = threading.Thread(target=self._run_install, daemon=True)
        thread.start()
        return self.ultralytics_status()

    def read_ultralytics_log(self, tail: int = 12000) -> str:
        log_path = self._ultralytics.log_path or (DEPENDENCY_LOG_DIR / "ultralytics-install.log")
        if not log_path.exists():
            return ""
        text = log_path.read_text(encoding="utf-8", errors="replace")
        if tail > 0 and len(text) > tail:
            return text[-tail:]
        return text

    def _run_install(self) -> None:
        install = self._ultralytics
        assert install.log_path is not None

        with install.log_path.open("a", encoding="utf-8", errors="replace") as log:
            log.write(f"[{utc_now()}] Installing {install.requirement}\n")
            log.write("Command: " + " ".join(install.command) + "\n\n")
            log.flush()

            try:
                process = subprocess.Popen(
                    install.command,
                    cwd=str(PROJECT_ROOT),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                )
                assert process.stdout is not None
                for line in process.stdout:
                    log.write(line)
                    log.flush()

                returncode = process.wait()
                importlib.invalidate_caches()
                with self._lock:
                    install.returncode = returncode
                    install.ended_at = utc_now()
                    install.status = "completed" if returncode == 0 and self.is_ultralytics_installed() else "failed"
                    if install.status == "failed":
                        install.error = f"pip exited with code {returncode}"
                log.write(f"\n[{utc_now()}] Install ended with code {returncode}\n")
            except Exception as exc:  # noqa: BLE001 - dependency install errors must be visible in GUI logs.
                with self._lock:
                    install.status = "failed"
                    install.ended_at = utc_now()
                    install.error = repr(exc)
                log.write(f"\n[{utc_now()}] Install manager failure: {exc!r}\n")
                log.flush()

    def _package_version(self, package: str) -> str | None:
        try:
            return importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            return None
