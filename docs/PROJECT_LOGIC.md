# Project Logic

## Mục tiêu logic

Người dùng không phải nhớ lệnh CLI như `yolo train ...`, `yolo predict ...`, `yolo export ...`. UI gom setting thành form, backend chuyển form thành dict tham số, job runner gọi Python API của Ultralytics trong subprocess.

## Luồng chung

1. Người dùng mở `http://127.0.0.1:8765`.
2. Frontend gọi:
   - `GET /api/dependencies/status` để hiện Python, pip, NVIDIA/CUDA, PyTorch và Ultralytics.
   - `GET /api/models` để nạp model preset.
   - `GET /api/jobs` để nạp job/log hiện có trong phiên server.
3. Nếu thiếu dependency, người dùng bấm nút cài trên GUI:
   - `Cài Ultralytics`: `python -m pip install ultralytics>=8.3.0`
   - `Cài PyTorch CUDA`: `python -m pip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121`
   - `Cài PyTorch CPU`: `python -m pip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu`
4. `DependencyManager` spawn pip install và ghi log vào `logs/dependency_installs/`.
5. Người dùng chọn workflow: Train, Validate, Predict hoặc Export.
6. Frontend gom form thành JSON và gọi endpoint tương ứng:
   - `POST /api/train/start`
   - `POST /api/val/start`
   - `POST /api/predict/start`
   - `POST /api/export/start`
7. `TrainingManager` tạo job:
   - Job id dạng `YYYYMMDD-HHMMSS-<job_type>-xxxxxxxx`.
   - Ghi config vào `runs/gui_jobs/<job_id>/<job_type>_config.json`.
   - Spawn `python -m yolo_gui.workflow_runner --config ...`.
   - Pipe stdout/stderr vào `logs/workflow_jobs/<job_id>.log`.
8. Frontend poll:
   - `GET /api/jobs`
   - `GET /api/jobs/{job_id}/logs`
9. Nếu cần dừng, frontend gọi `POST /api/jobs/{job_id}/stop`.

## Mapping workflow

- `train`: `YOLO(model, task=task).train(**args)`
- `val`: `YOLO(model, task=task).val(**args)`
- `predict`: `YOLO(model, task=task).predict(**args)`
- `export`: `YOLO(model).export(**args)`

`workflow_runner.py` normalize `device` dạng `"0,1"` thành list GPU và normalize `source="0"` thành camera index `0`.

## Dataset tools

- `POST /api/datasets/inspect`: đọc nhanh `data.yaml`.
- `POST /api/datasets/audit`: đếm ảnh/label theo split, phát hiện thiếu label, label rỗng, dòng label sai, class id vượt `names`.
- `POST /api/datasets/create-yaml`: tạo file `data.yaml` từ root/split/classes.
- `POST /api/datasets/voc-to-yolo`: convert VOC XML sang YOLO txt.
- `POST /api/datasets/metrics`: tính precision/recall/F1 từ folder label prediction và ground truth.

## System report

`POST /api/system/report` tạo:

- `logs/system_reports/system-report-<timestamp>.md`
- `logs/system_reports/system-report-<timestamp>.json`

Report chứa Python executable, platform, dependency status, GPU/CUDA, package version và mẫu `pip freeze`.

## Vì sao dùng subprocess

Workflow YOLO có thể chạy lâu, chiếm GPU và in log liên tục. Subprocess giúp:

- Stop job bằng `terminate()` hoặc `kill()`.
- Tách crash của Ultralytics khỏi web server.
- Log stdout/stderr đầy đủ để debug.
- Mở rộng thành queue nhiều job sau này.

## Quy tắc mapping setting

- Setting phổ biến có field riêng trong schema.
- Setting chưa có field riêng truyền qua `extra_args`.
- Nếu key trùng nhau, `extra_args` ghi đè field form.
- Không truyền `None` hoặc chuỗi rỗng vào runner.

## Các điểm nóng cần cẩn thận

- `schemas.py`: field type phải khớp kiểu Ultralytics nhận.
- `workflow_runner.py`: luôn in full traceback.
- `training_manager.py`: không làm mất log khi subprocess lỗi.
- `dataset_tools.py`: không xóa hoặc sửa dataset gốc trừ endpoint tạo YAML/convert được người dùng bấm rõ ràng.
- `dependency_manager.py`: log cài đặt và trạng thái CUDA phải hiện trên GUI.
- `frontend/app.js`: workflow mới phải có endpoint, form id, number field và handler start.
