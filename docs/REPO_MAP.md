# Repo Map

## Root

- `README.md`: mô tả sản phẩm, cách chạy, cấu trúc nhanh.
- `AGENTS.md`: quy tắc làm việc cho agent/dev.
- `requirements.txt`: dependency runtime Python.
- `start.ps1`: entrypoint Windows, tạo `.venv`, cài dependency và chạy server.
- `.gitignore`: bỏ qua virtualenv, cache, log, output train, weight/model artifact.

## Backend: `yolo_gui/`

- `app.py`: FastAPI app, serve frontend, API health/system/models/path/dependency/dataset/workflow.
- `schemas.py`: Pydantic schema cho request. Khi thêm setting YOLO mới thì thêm ở đây trước.
- `dependency_manager.py`: kiểm tra Python/pip/NVIDIA/CUDA/Torch/Ultralytics, chạy cài dependency từ GUI, ghi log cài đặt.
- `training_manager.py`: job manager chung cho `train`, `val`, `predict`, `export`; tạo job id, ghi config, spawn subprocess, capture log, stop job.
- `workflow_runner.py`: tiến trình con import `ultralytics`, gọi `YOLO(...).train/val/predict/export(...)`, in traceback đầy đủ khi lỗi.
- `train_runner.py`: runner train cũ, giữ lại để tham khảo/tương thích nội bộ nhưng luồng mới dùng `workflow_runner.py`.
- `dataset_tools.py`: inspect/audit dataset YOLO, tạo `data.yaml`, convert VOC XML sang YOLO txt, tính metrics từ label YOLO.
- `system_report.py`: tạo report môi trường `.md` và `.json` trong `logs/system_reports/`.
- `config.py`: đường dẫn chuẩn cho frontend, log, job, output.
- `__init__.py`: version package.

## Frontend: `frontend/`

- `index.html`: layout dashboard nhiều tab: Train, Validate, Predict, Export, Dataset, System, Jobs.
- `styles.css`: layout/dashboard style, responsive, status/log UI.
- `app.js`: gọi API, duyệt thư mục, start/stop job, poll log, chạy dataset tools/report.
- `favicon.svg`: icon local để console browser sạch.

## Runtime folders

- `logs/workflow_jobs/`: log từng job, ví dụ `20260512-...-train-....log`.
- `logs/dependency_installs/`:
  - `ultralytics-install.log`
  - `torch-cuda-install.log`
  - `torch-cpu-install.log`
- `logs/system_reports/`: `system-report-*.md` và `system-report-*.json`.
- `runs/gui_jobs/`: config JSON theo job, ví dụ `train_config.json`, `predict_config.json`.
- `runs/train/`: output train mặc định.
- `runs/val/`: output validate mặc định.
- `runs/predict/`: output predict mặc định.

Các thư mục runtime bị `.gitignore` để không đẩy log/weight/dataset lên GitHub.
