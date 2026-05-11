# Session Log

## 2026-05-12

- Nhận mục tiêu dự án: làm web GUI local để train YOLO thay cho CLI/code.
- Chọn kiến trúc FastAPI + frontend static + subprocess runner.
- Tạo scaffold backend/frontend/docs.
- Kết nối repo local với GitHub `phatchau036/yolo-gui`.
- Chạy server local ở `http://127.0.0.1:8765`.
- API smoke ban đầu:
  - `GET /api/health` pass.
  - `GET /api/models` pass.
  - `POST /api/datasets/inspect` với YAML tạm trả về `class_count=1`.
  - `POST /api/train/start` tạo job, ghi log, fail đúng kỳ vọng lúc đầu vì thiếu `ultralytics`.
- Cài `ultralytics 8.4.48` vào Python global đang chạy server.
- Xác minh môi trường có Torch `2.5.1+cu121`, CUDA available và GPU `NVIDIA GeForce RTX 3050 Laptop GPU` 4GB.
- Thêm luồng cài dependency ngay trên GUI:
  - `DependencyManager` chạy pip install và ghi `logs/dependency_installs/`.
  - Card trạng thái môi trường có Python/pip, NVIDIA/CUDA, PyTorch, Ultralytics.
  - Nút `Cài Ultralytics`, `Cài PyTorch CUDA`, `Cài PyTorch CPU`.
  - Train button chặn train nếu thiếu PyTorch/Ultralytics hoặc dependency đang cài.
- Playwright QA ban đầu:
  - Desktop layout pass sau khi đổi custom class từ `panel-block` sang `work-panel`.
  - Mobile không còn horizontal overflow.
  - Console sạch sau khi thêm favicon route.
  - Job list/log hiển thị traceback đầy đủ.

## 2026-05-12 - mở rộng thay CLI

- Đối chiếu repo tham khảo `SpreadKnowledge/YOLOX_train_detection_GUI`.
- Chọn các nhóm chức năng cần đưa vào bản web:
  - Train.
  - Validate.
  - Predict ảnh/folder/video/camera.
  - Export model.
  - Dataset audit.
  - VOC XML -> YOLO txt.
  - Metrics từ label YOLO.
  - System report.
- Thêm `workflow_runner.py` và chuyển job manager sang runner chung cho `train/val/predict/export`.
- Thêm schema:
  - `ValidateRequest`
  - `PredictRequest`
  - `ExportRequest`
  - `DatasetAuditRequest`
  - `DatasetYamlCreateRequest`
  - `VocConvertRequest`
  - `MetricsRequest`
- Thêm `dataset_tools.py`:
  - Inspect/audit `data.yaml`.
  - Tạo `data.yaml`.
  - Convert VOC XML sang YOLO txt.
  - Tính precision/recall/F1 từ label YOLO.
- Thêm `system_report.py` tạo report `.md` và `.json`.
- Thêm API:
  - `POST /api/val/start`
  - `POST /api/predict/start`
  - `POST /api/export/start`
  - `GET /api/jobs`
  - `GET /api/jobs/{job_id}/logs`
  - `POST /api/jobs/{job_id}/stop`
  - `POST /api/datasets/audit`
  - `POST /api/datasets/create-yaml`
  - `POST /api/datasets/voc-to-yolo`
  - `POST /api/datasets/metrics`
  - `POST /api/system/report`
- Refactor frontend thành dashboard nhiều tab: Train, Validate, Predict, Export, Dataset, System, Jobs.
- Cập nhật docs handoff sau khi mở rộng.

### Ghi chú kỹ thuật

- `python -m compileall -q yolo_gui` đã pass sau backend mới.
- `node --check frontend/app.js` đã pass sau frontend mới.
- API smoke trên `127.0.0.1:8766` đã pass cho dataset inspect/audit, tạo YAML, VOC convert, metrics, system report và export job lỗi có chủ ý với full traceback.
- Browser QA desktop/mobile đã pass: console sạch và không có horizontal overflow.
- Chưa chạy train/val/predict/export thật với dataset/model hợp lệ vì chưa có dataset/model thật được user chọn.
