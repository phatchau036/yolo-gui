from __future__ import annotations

import importlib
import importlib.metadata
import importlib.util
import re
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
        self._installs: dict[str, DependencyInstall] = {
            "ultralytics": DependencyInstall(package="ultralytics", requirement="ultralytics>=8.3.0"),
            "torch-cuda": DependencyInstall(
                package="torch-cuda",
                requirement="torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121",
            ),
            "torch-cpu": DependencyInstall(
                package="torch-cpu",
                requirement="torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu",
            ),
        }

    def environment_status(self) -> dict[str, Any]:
        return {
            "python": sys.executable,
            "pip": self._pip_status(),
            "nvidia": self._nvidia_status(),
            "torch": self.torch_status(),
            "ultralytics": self.ultralytics_status(),
            "installing": any(install.status == "running" for install in self._installs.values()),
        }

    def is_ultralytics_installed(self) -> bool:
        importlib.invalidate_caches()
        return importlib.util.find_spec("ultralytics") is not None

    def is_torch_installed(self) -> bool:
        importlib.invalidate_caches()
        return importlib.util.find_spec("torch") is not None

    def ultralytics_status(self) -> dict[str, Any]:
        return {
            "installed": self.is_ultralytics_installed(),
            "version": self._package_version("ultralytics"),
            "python": sys.executable,
            "install": self._installs["ultralytics"].public_dict(),
        }

    def torch_status(self) -> dict[str, Any]:
        status: dict[str, Any] = {
            "installed": self.is_torch_installed(),
            "version": self._package_version("torch"),
            "torchvision_version": self._package_version("torchvision"),
            "torchaudio_version": self._package_version("torchaudio"),
            "cuda_available": False,
            "cuda_version": None,
            "device_count": 0,
            "devices": [],
            "error": None,
            "cuda_install": self._installs["torch-cuda"].public_dict(),
            "cpu_install": self._installs["torch-cpu"].public_dict(),
        }
        try:
            import torch

            status["version"] = getattr(torch, "__version__", status["version"])
            status["cuda_available"] = bool(torch.cuda.is_available())
            status["cuda_version"] = getattr(torch.version, "cuda", None)
            status["device_count"] = int(torch.cuda.device_count()) if status["cuda_available"] else 0
            if status["cuda_available"]:
                status["devices"] = [
                    {
                        "id": idx,
                        "name": torch.cuda.get_device_name(idx),
                        "memory_gb": round(torch.cuda.get_device_properties(idx).total_memory / (1024**3), 2),
                    }
                    for idx in range(torch.cuda.device_count())
                ]
        except Exception as exc:  # noqa: BLE001 - status endpoint must report diagnostics, not crash.
            status["error"] = repr(exc)
        return status

    def start_ultralytics_install(self) -> dict[str, Any]:
        self._start_install(
            key="ultralytics",
            command=[sys.executable, "-m", "pip", "install", "ultralytics>=8.3.0"],
            log_name="ultralytics-install.log",
        )
        return self.ultralytics_status()

    def start_torch_cuda_install(self) -> dict[str, Any]:
        self._start_install(
            key="torch-cuda",
            command=[
                sys.executable,
                "-m",
                "pip",
                "install",
                "--upgrade",
                "torch",
                "torchvision",
                "torchaudio",
                "--index-url",
                "https://download.pytorch.org/whl/cu121",
            ],
            log_name="torch-cuda-install.log",
        )
        return self.torch_status()

    def start_torch_cpu_install(self) -> dict[str, Any]:
        self._start_install(
            key="torch-cpu",
            command=[
                sys.executable,
                "-m",
                "pip",
                "install",
                "--upgrade",
                "torch",
                "torchvision",
                "torchaudio",
                "--index-url",
                "https://download.pytorch.org/whl/cpu",
            ],
            log_name="torch-cpu-install.log",
        )
        return self.torch_status()

    def read_ultralytics_log(self, tail: int = 12000) -> str:
        return self.read_install_log("ultralytics", tail=tail)

    def read_install_log(self, key: str, tail: int = 12000) -> str:
        if key not in self._installs:
            raise KeyError(key)
        default_name = f"{key}-install.log"
        log_path = self._installs[key].log_path or (DEPENDENCY_LOG_DIR / default_name)
        if not log_path.exists():
            return ""
        text = log_path.read_text(encoding="utf-8", errors="replace")
        if tail > 0 and len(text) > tail:
            return text[-tail:]
        return text

    def _start_install(self, key: str, command: list[str], log_name: str) -> None:
        with self._lock:
            install = self._installs[key]
            if install.status == "running":
                return

            self._installs[key] = DependencyInstall(
                package=install.package,
                requirement=install.requirement,
                status="running",
                started_at=utc_now(),
                log_path=DEPENDENCY_LOG_DIR / log_name,
                command=command,
            )

        thread = threading.Thread(target=self._run_install, args=(key,), daemon=True)
        thread.start()

    def _run_install(self, key: str) -> None:
        install = self._installs[key]
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
                installed = self.is_ultralytics_installed() if key == "ultralytics" else self.is_torch_installed()
                with self._lock:
                    install.returncode = returncode
                    install.ended_at = utc_now()
                    install.status = "completed" if returncode == 0 and installed else "failed"
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

    def _pip_status(self) -> dict[str, Any]:
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "--version"],
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=20,
                check=False,
            )
            return {
                "available": result.returncode == 0,
                "version": result.stdout.strip() or result.stderr.strip(),
                "returncode": result.returncode,
            }
        except Exception as exc:  # noqa: BLE001 - show exact pip probe failure in GUI.
            return {"available": False, "version": None, "returncode": None, "error": repr(exc)}

    def _nvidia_status(self) -> dict[str, Any]:
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"],
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=20,
                check=False,
            )
            if result.returncode != 0:
                return {
                    "available": False,
                    "driver_version": None,
                    "cuda_version": self._extract_cuda_version(result.stdout + result.stderr),
                    "gpus": [],
                    "error": (result.stderr or result.stdout).strip(),
                }

            gpus = []
            driver_version = None
            for line in result.stdout.splitlines():
                parts = [part.strip() for part in line.split(",")]
                if len(parts) >= 3:
                    name, memory_mb, driver_version = parts[:3]
                    gpus.append(
                        {
                            "name": name,
                            "memory_mb": int(memory_mb) if memory_mb.isdigit() else memory_mb,
                            "driver_version": driver_version,
                        }
                    )

            cuda_result = subprocess.run(
                ["nvidia-smi"],
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=20,
                check=False,
            )
            return {
                "available": bool(gpus),
                "driver_version": driver_version,
                "cuda_version": self._extract_cuda_version(cuda_result.stdout + cuda_result.stderr),
                "gpus": gpus,
            }
        except FileNotFoundError:
            return {
                "available": False,
                "driver_version": None,
                "cuda_version": None,
                "gpus": [],
                "error": "nvidia-smi not found",
            }
        except Exception as exc:  # noqa: BLE001 - show exact NVIDIA probe failure in GUI.
            return {"available": False, "driver_version": None, "cuda_version": None, "gpus": [], "error": repr(exc)}

    def _extract_cuda_version(self, text: str) -> str | None:
        match = re.search(r"CUDA Version:\s*([0-9.]+)", text)
        return match.group(1) if match else None
