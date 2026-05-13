# Repo Map

## Root

- `README.md`: mô tả sản phẩm, cách chạy, cấu trúc nhanh.
- `CHANGELOG.md`: ghi chú thay đổi theo phiên bản, được tab `Phiên bản` đọc để hiển thị trong GUI.
- `AGENTS.md`: quy tắc làm việc cho agent/dev.
- `requirements.txt`: dependency runtime Python.
- `start.ps1`: entrypoint Windows, tạo `.venv`, cài dependency và chạy server.
- `start_colab.py`: entrypoint Google Colab/Linux, cài requirements, chạy uvicorn và mở Cloudflare Tunnel tạm thời.
- `YOLO_GUI_Colab.ipynb`: notebook Colab cho người dùng bấm chạy một cell để clone/chạy GUI.
- `.gitignore`: bỏ qua virtualenv, cache, log, output train, weight/model artifact.
- `docs/USER_GUIDE.md`: hướng dẫn người dùng cuối bằng tiếng Việt, không yêu cầu biết CLI.
- `docs/COLAB_GUIDE.md`: hướng dẫn chạy GUI trên Colab, tunnel và log khi lỗi.

## Backend: `yolo_gui/`

- `app.py`: FastAPI app, serve frontend, API health/system/models/path/dependency/dataset/workflow.
- `schemas.py`: Pydantic schema cho request. Khi thêm setting YOLO mới thì thêm ở đây trước.
- `dependency_manager.py`: kiểm tra Python/pip/NVIDIA/CUDA/Torch/Ultralytics, chạy cài dependency từ GUI, ghi log cài đặt.
- `automation_manager.py`: chạy kịch bản nhiều bước từ GUI, quản lý trạng thái từng step và log automation riêng.
- `training_manager.py`: job manager chung cho `train`, `val`, `predict`, `export`; tạo job id, ghi config, spawn subprocess, capture log, stop job và liệt kê artifact ảnh/video predict.
- `workflow_runner.py`: tiến trình con import `ultralytics`, gọi `YOLO(...).train/val/predict/export(...)`, in traceback đầy đủ khi lỗi.
- `train_runner.py`: runner train cũ, giữ lại để tham khảo/tương thích nội bộ nhưng luồng mới dùng `workflow_runner.py`.
- `dataset_tools.py`: inspect/audit dataset YOLO, tạo `data.yaml`, convert VOC XML sang YOLO txt, tính metrics từ label YOLO.
- `annotation_tools.py`: helper cho công cụ gán nhãn ảnh kiểu LabelImg trong GUI; liệt kê ảnh, suy ra path label, đọc/lưu file YOLO `.txt`.
- `cloud_manager.py`: quản lý Cloud workspace; lưu setting local trong `logs/cloud/`, đọc metadata Google Drive public/shared bằng API key, tạo mirror/manifest, scan asset và lưu/xóa profile Cloud Manager.
- `system_report.py`: tạo report môi trường `.md` và `.json` trong `logs/system_reports/`.
- `version_manager.py`: đọc version/changelog, kiểm tra commit mới trên GitHub, chạy `git pull --ff-only` khi người dùng bấm cập nhật; có luồng stash thay đổi local rồi cập nhật khi repo dirty.
- `config.py`: đường dẫn chuẩn cho frontend, log, job, output và Cloud workspace local.
- `__init__.py`: version package.

## Frontend: `frontend/`

- `index.html`: layout dashboard nhiều tab: Train, Validate, Predict, Export, Dataset, Automation, Hướng dẫn, System, Jobs.
- `styles.css`: layout/dashboard style, responsive, tooltip giải thích, docs page, status/log UI, Dataset Wizard chia cột trái/phải.
- `app.js`: gọi API, duyệt thư mục, start/stop job, poll log, preview kết quả predict, chạy dataset tools/report/automation, điều khiển canvas gán nhãn ảnh và tự gắn tooltip giải thích vào các mục UI.
- `favicon.svg`: icon local để console browser sạch.

## Runtime folders

- `logs/workflow_jobs/`: log từng job, ví dụ `20260512-...-train-....log`.
- `logs/dependency_installs/`:
  - `ultralytics-install.log`
  - `torch-cuda-install.log`
  - `torch-cpu-install.log`
- `logs/system_reports/`: `system-report-*.md` và `system-report-*.json`.
- `logs/automations/`: log timeline cho từng automation.
- `logs/colab/`:
  - `uvicorn.log`: log server khi chạy bằng `start_colab.py`.
  - `cloudflared.log`: log Cloudflare Tunnel và link `trycloudflare.com`.
- `logs/cloud/`:
  - `cloud-settings.local.json`: setting Cloud local, có thể chứa Google API key dạng raw nếu người dùng nhập từ GUI. Thư mục này bị `.gitignore`, không được stage/commit.
- `logs/updates/`: log mỗi lần người dùng bấm cập nhật phiên bản trong GUI.
- `runs/gui_jobs/`: config JSON theo job, ví dụ `train_config.json`, `predict_config.json`.
- `runs/cloud/`: mirror local của Cloud workspace. Cấu trúc hiện tại là `runs/cloud/google-drive/<folder-id-or-not-connected>/<root_name>/`.
  - `configs/gui-settings/`: profile cấu hình GUI do Cloud Manager lưu để bấm áp dụng lại.
- `runs/train/`: output train mặc định.
- `runs/val/`: output validate mặc định.
- `runs/predict/`: output predict mặc định.

Các thư mục runtime bị `.gitignore` để không đẩy log/weight/dataset lên GitHub.
