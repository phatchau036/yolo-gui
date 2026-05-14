from __future__ import annotations

import argparse
import os
import platform
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path
from typing import Any
from urllib.request import urlopen

from yolo_gui.colab_runtime import (
    COLAB_LOG_DIR,
    RESTART_REQUEST_PATH,
    RESTART_STATE_PATH,
    read_json_file,
    timestamp,
    write_json_file,
)


PROJECT_ROOT = Path(__file__).resolve().parent
LOG_DIR = COLAB_LOG_DIR
CLOUDFLARED_DIR = PROJECT_ROOT / ".colab"
CLOUDFLARED_BIN = CLOUDFLARED_DIR / "cloudflared"
CLOUDFLARED_LINUX_AMD64_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
TUNNEL_URL_PATTERN = re.compile(r"https://[-a-zA-Z0-9.]+\.trycloudflare\.com")


def configure_console_output() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:  # noqa: BLE001 - output should still work with default encoding.
                pass


configure_console_output()


def is_colab_runtime() -> bool:
    if "COLAB_RELEASE_TAG" in os.environ:
        return True
    try:
        import google.colab  # type: ignore  # noqa: F401
    except Exception:  # noqa: BLE001 - Colab detection must be best-effort.
        return False
    return True


def run_command(command: list[str], *, cwd: Path = PROJECT_ROOT) -> None:
    print(f"\n[Colab] Chạy: {' '.join(command)}")
    subprocess.run(command, cwd=str(cwd), check=True)


def install_requirements(skip_install: bool) -> None:
    if skip_install:
        print("[Colab] Bỏ qua bước cài requirements theo yêu cầu.")
        return
    requirements = PROJECT_ROOT / "requirements.txt"
    if not requirements.exists():
        raise FileNotFoundError(f"Không tìm thấy {requirements}")
    run_command([sys.executable, "-m", "pip", "install", "-r", str(requirements)])


def ensure_cloudflared() -> Path:
    existing = shutil.which("cloudflared")
    if existing:
        return Path(existing)

    if CLOUDFLARED_BIN.exists():
        CLOUDFLARED_BIN.chmod(0o755)
        return CLOUDFLARED_BIN

    system = platform.system().lower()
    machine = platform.machine().lower()
    if system != "linux" or machine not in {"x86_64", "amd64"}:
        raise RuntimeError(
            "Auto tunnel hiện chỉ tự tải cloudflared cho Linux x86_64 như Google Colab. "
            "Trên Windows hãy dùng start.ps1."
        )

    CLOUDFLARED_DIR.mkdir(parents=True, exist_ok=True)
    print("[Colab] Đang tải cloudflared để mở Cloudflare Tunnel...")
    urllib.request.urlretrieve(CLOUDFLARED_LINUX_AMD64_URL, CLOUDFLARED_BIN)
    CLOUDFLARED_BIN.chmod(0o755)
    return CLOUDFLARED_BIN


def tail_file(path: Path, limit: int = 4000) -> str:
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace")
    return text[-limit:]


def wait_for_server(port: int, server: subprocess.Popen[bytes], log_path: Path) -> None:
    deadline = time.time() + 90
    health_url = f"http://127.0.0.1:{port}/api/health"
    while time.time() < deadline:
        if server.poll() is not None:
            raise RuntimeError(
                "Server YOLO GUI đã dừng khi khởi động.\n"
                f"Log gần nhất:\n{tail_file(log_path)}"
            )
        try:
            with urlopen(health_url, timeout=2) as response:
                if response.status == 200:
                    print(f"[Colab] Server sẵn sàng tại {health_url}")
                    return
        except Exception:  # noqa: BLE001 - retry until server is ready.
            time.sleep(1)
    raise TimeoutError(f"Server chưa sẵn sàng sau 90 giây. Log gần nhất:\n{tail_file(log_path)}")


def start_server(port: int) -> tuple[subprocess.Popen[bytes], Path]:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_path = LOG_DIR / f"uvicorn-{port}.log"
    log_file = log_path.open("wb")
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "yolo_gui.app:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
    ]
    print(f"[Colab] Mở YOLO GUI server trên port {port}...")
    server = subprocess.Popen(command, cwd=str(PROJECT_ROOT), stdout=log_file, stderr=subprocess.STDOUT)
    wait_for_server(port, server, log_path)
    return server, log_path


def start_tunnel(cloudflared: Path, port: int, verbose: bool) -> tuple[subprocess.Popen[str], str, Path]:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_path = LOG_DIR / f"cloudflared-{port}.log"
    log_file = log_path.open("w", encoding="utf-8", errors="replace")
    tunnel_url: dict[str, str] = {}
    ready = threading.Event()

    command = [
        str(cloudflared),
        "tunnel",
        "--no-autoupdate",
        "--url",
        f"http://127.0.0.1:{port}",
    ]
    print("[Colab] Mở Cloudflare Tunnel tạm thời...")
    tunnel = subprocess.Popen(
        command,
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    def drain_output() -> None:
        assert tunnel.stdout is not None
        for line in tunnel.stdout:
            log_file.write(line)
            log_file.flush()
            if verbose:
                print(line, end="")
            match = TUNNEL_URL_PATTERN.search(line)
            if match and "url" not in tunnel_url:
                tunnel_url["url"] = match.group(0)
                ready.set()
        ready.set()

    threading.Thread(target=drain_output, daemon=True).start()

    if not ready.wait(timeout=90) or "url" not in tunnel_url:
        if tunnel.poll() is not None:
            raise RuntimeError(f"Cloudflare Tunnel đã dừng. Log gần nhất:\n{tail_file(log_path)}")
        raise TimeoutError(f"Chưa lấy được link Cloudflare Tunnel sau 90 giây. Log gần nhất:\n{tail_file(log_path)}")

    return tunnel, tunnel_url["url"], log_path


def display_colab_link(url: str, title: str = "YOLO GUI đã sẵn sàng") -> None:
    print("\n" + "=" * 72)
    print(title)
    print(f"Mở link này để dùng GUI: {url}")
    print("Giữ cell này chạy. Khi dừng cell, link Cloudflare Tunnel cũng tắt.")
    print("Không chia sẻ link nếu notebook đang chứa dataset hoặc model riêng tư.")
    print("=" * 72 + "\n")

    if not is_colab_runtime():
        return
    try:
        from IPython.display import HTML, display

        display(
            HTML(
                f"""
                <div style="font-family:Arial,sans-serif;padding:16px;border:1px solid #9de7dc;border-radius:8px;background:#eefcf8">
                  <h2 style="margin:0 0 8px">{title}</h2>
                  <p style="margin:0 0 12px">Bấm nút bên dưới để mở giao diện web qua Cloudflare Tunnel.</p>
                  <a href="{url}" target="_blank" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#0f766e;color:white;text-decoration:none;font-weight:700">Mở YOLO GUI</a>
                  <p style="margin:12px 0 0;color:#475569">Giữ cell này chạy trong lúc sử dụng GUI.</p>
                </div>
                """
            )
        )
    except Exception:  # noqa: BLE001 - printed URL is enough if rich display fails.
        return


def stop_process(process: subprocess.Popen[Any] | None, name: str) -> None:
    if process is None or process.poll() is not None:
        return
    print(f"[Colab] Dừng {name}...")
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def write_restart_state(request: dict[str, Any], status: str, **extra: Any) -> None:
    payload = {
        "request_id": request.get("request_id"),
        "status": status,
        "updated_at": timestamp(),
        **extra,
    }
    write_json_file(RESTART_STATE_PATH, payload)


def next_restart_request(handled_request_ids: set[str], script_started_epoch: float) -> dict[str, Any] | None:
    request = read_json_file(RESTART_REQUEST_PATH)
    if not request:
        return None
    request_id = str(request.get("request_id") or "")
    if not request_id or request_id in handled_request_ids:
        return None
    created_epoch = float(request.get("created_epoch") or 0)
    if created_epoch and created_epoch < script_started_epoch - 5:
        handled_request_ids.add(request_id)
        return None
    state = read_json_file(RESTART_STATE_PATH) or {}
    if state.get("request_id") == request_id and state.get("status") in {"ready", "failed"}:
        handled_request_ids.add(request_id)
        return None
    return request


def perform_same_tunnel_restart(
    *,
    request: dict[str, Any],
    current_port: int,
    current_server: subprocess.Popen[bytes],
    tunnel_url: str,
) -> tuple[subprocess.Popen[bytes], Path]:
    request_id = request.get("request_id")
    server_log: Path | None = None
    try:
        print(f"[Colab] Nhận yêu cầu cập nhật {request_id}. Giữ tunnel hiện tại và restart server trên port {current_port}...")
        write_restart_state(
            request,
            "restarting",
            message="Đang giữ nguyên Cloudflare Tunnel và restart server YOLO GUI trên cùng port.",
            port=current_port,
            tunnel_url=tunnel_url,
            same_tunnel=True,
        )

        stop_process(current_server, "YOLO GUI server cũ")
        time.sleep(1)
        server, server_log = start_server(current_port)
        write_restart_state(
            request,
            "ready",
            message="Đã restart server xong. Link Cloudflare hiện tại vẫn giữ nguyên, hãy tải lại GUI nếu trang chưa tự tải.",
            tunnel_url=tunnel_url,
            port=current_port,
            same_tunnel=True,
            server_log=str(server_log),
        )
        print("[Colab] Đã nạp bản mới sau tunnel hiện tại.")
        print(f"[Colab] Link không đổi: {tunnel_url}")
        return server, server_log
    except Exception as exc:  # noqa: BLE001 - write exact failure for GUI and cell.
        write_restart_state(
            request,
            "failed",
            message=f"Không restart được server sau tunnel hiện tại: {exc}",
            tunnel_url=tunnel_url,
            port=current_port,
            same_tunnel=True,
            server_log=str(server_log) if server_log else None,
        )
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Chạy YOLO GUI trên Google Colab bằng Cloudflare Tunnel.")
    parser.add_argument("--port", type=int, default=8765, help="Port nội bộ cho YOLO GUI server.")
    parser.add_argument("--skip-install", action="store_true", help="Bỏ qua pip install -r requirements.txt.")
    parser.add_argument("--verbose-tunnel", action="store_true", help="In log cloudflared trực tiếp ra cell.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    os.chdir(PROJECT_ROOT)
    script_started_epoch = time.time()

    if not is_colab_runtime():
        print("[Colab] Không phát hiện Google Colab. Script vẫn có thể chạy trên Linux, nhưng Windows nên dùng start.ps1.")

    server: subprocess.Popen[bytes] | None = None
    tunnel: subprocess.Popen[str] | None = None
    server_log: Path | None = None
    tunnel_log: Path | None = None
    port = args.port
    handled_request_ids: set[str] = set()
    try:
        install_requirements(args.skip_install)
        cloudflared = ensure_cloudflared()
        server, server_log = start_server(port)
        tunnel, tunnel_url, tunnel_log = start_tunnel(cloudflared, port, args.verbose_tunnel)
        display_colab_link(tunnel_url)
        print(f"[Colab] Log server: {server_log}")
        print(f"[Colab] Log tunnel: {tunnel_log}")

        while True:
            if server.poll() is not None:
                print(f"[Colab] Server đã dừng. Log gần nhất:\n{tail_file(server_log)}")
                return int(server.returncode or 1)
            if tunnel.poll() is not None:
                print(f"[Colab] Tunnel đã dừng. Log gần nhất:\n{tail_file(tunnel_log)}")
                return int(tunnel.returncode or 1)
            request = next_restart_request(handled_request_ids, script_started_epoch)
            if request:
                request_id = str(request.get("request_id"))
                try:
                    server, server_log = perform_same_tunnel_restart(
                        request=request,
                        current_port=port,
                        current_server=server,
                        tunnel_url=tunnel_url,
                    )
                    handled_request_ids.add(request_id)
                    print(f"[Colab] Đang chạy bản mới trên port {port}, tunnel giữ nguyên.")
                    print(f"[Colab] Log server: {server_log}")
                    print(f"[Colab] Log tunnel: {tunnel_log}")
                except Exception as exc:  # noqa: BLE001 - do not kill the current working session.
                    handled_request_ids.add(request_id)
                    print(f"[Colab] Không thể tự chuyển phiên sau cập nhật: {exc}")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n[Colab] Người dùng đã dừng cell.")
        return 0
    finally:
        stop_process(tunnel, "Cloudflare Tunnel")
        stop_process(server, "YOLO GUI server")


if __name__ == "__main__":
    raise SystemExit(main())
