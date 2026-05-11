# Repo Map

## Root

- `README.md`: mô tả sản phẩm, cách chạy, cấu trúc nhanh.
- `AGENTS.md`: quy tắc làm việc cho agent/dev.
- `requirements.txt`: dependency runtime Python.
- `start.ps1`: entrypoint Windows, tạo `.venv`, cài dependency và chạy server.
- `.gitignore`: bỏ qua virtualenv, cache, log, output train, weight/model artifact.

## Backend: `yolo_gui/`

- `app.py`: FastAPI app, serve frontend, API health/system/models/path/dataset/train.
- `schemas.py`: Pydantic schema cho request. Khi thêm setting YOLO mới thì thêm ở đây trước.
- `dependency_manager.py`: kiểm tra Python/pip/NVIDIA/CUDA/Torch/Ultralytics, chạy cài dependency từ GUI, ghi log cài đặt.
- `training_manager.py`: tạo job id, ghi config, spawn subprocess, capture log, stop job.
- `train_runner.py`: tiến trình con import `ultralytics`, gọi `YOLO(model).train(**args)`, in traceback đầy đủ khi lỗi.
- `config.py`: đường dẫn chuẩn cho frontend, log, job, output.
- `__init__.py`: version package.

## Frontend: `frontend/`

- `index.html`: layout chính của web GUI.
- `styles.css`: layout/dashboard style, responsive, status/log UI.
- `app.js`: gọi API, duyệt thư mục, inspect dataset, start/stop job, poll log.

## Runtime folders

- `logs/train_jobs/`: log từng job, ví dụ `20260512-...log`.
- `logs/dependency_installs/`: log cài dependency từ GUI:
  - `ultralytics-install.log`
  - `torch-cuda-install.log`
  - `torch-cpu-install.log`
- `runs/gui_jobs/`: config JSON theo job.
- `runs/train/`: output train mặc định khi người dùng không chọn project.

Các thư mục runtime bị `.gitignore` để không đẩy log/weight/dataset lên GitHub.
