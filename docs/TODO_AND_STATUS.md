# Todo And Status

## Đã hoàn thành

- Kết nối repo local với GitHub `https://github.com/phatchau036/yolo-gui.git`.
- Tạo backend FastAPI và frontend static.
- Tạo GUI kiểm tra/cài môi trường:
  - Python/pip.
  - NVIDIA/CUDA qua `nvidia-smi`.
  - PyTorch/Torch CUDA/GPU.
  - Ultralytics.
  - Nút `Cài Ultralytics`, `Cài PyTorch CUDA`, `Cài PyTorch CPU`.
- Tạo job manager chung cho các workflow YOLO:
  - `train`
  - `val`
  - `predict`
  - `export`
- Tạo `workflow_runner.py` gọi Ultralytics Python API thay CLI.
- Tạo API workflow:
  - `POST /api/train/start`
  - `POST /api/val/start`
  - `POST /api/predict/start`
  - `POST /api/export/start`
  - `GET /api/jobs`
  - `GET /api/jobs/{job_id}/logs`
  - `POST /api/jobs/{job_id}/stop`
- Tạo Dataset tools:
  - Inspect `data.yaml`.
  - Audit split train/val/test.
  - Tạo `data.yaml`.
  - Convert VOC XML sang YOLO txt.
  - Tính precision/recall/F1 từ label YOLO.
- Tạo System report:
  - `POST /api/system/report`
  - Xuất `.md` và `.json` vào `logs/system_reports/`.
- Refactor UI thành dashboard nhiều tab:
  - Train.
  - Validate.
  - Predict.
  - Export.
  - Dataset.
  - System.
  - Jobs/log.
- Duy trì path browser local để gán đường dẫn vào các form.
- Cập nhật docs handoff nền.

## Đã verify trong phiên này

- `python -m compileall -q yolo_gui` pass sau khi thêm backend mới.
- `node --check frontend/app.js` pass sau khi refactor UI.
- API smoke trên server `127.0.0.1:8766` pass:
  - `GET /api/jobs`.
  - Dataset inspect/audit với dataset tạm.
  - Tạo `data.yaml` tạm.
  - VOC XML -> YOLO txt.
  - Metrics label YOLO trả F1 `1.0` cho mẫu khớp tuyệt đối.
  - System report tạo file `.md`.
  - Export job với model không tồn tại fail đúng kỳ vọng và log có full traceback.
- Browser QA desktop/mobile pass:
  - Không có console warning/error.
  - Không có horizontal overflow ở desktop và mobile.
  - Tab Dataset chuyển đúng trạng thái.

## Cần làm tiếp

- Thêm queue nhiều job và giới hạn số job chạy song song.
- Thêm profile cấu hình lưu lại để dùng lại.
- Thêm gợi ý batch/imgsz theo VRAM.
- Thêm biểu đồ metric từ `results.csv`.
- Thêm preview ảnh/video predict ngay trong GUI.
- Thêm ONNX Runtime smoke check riêng sau export ONNX.
- Thêm downloader/checker cho pretrained weight nếu model chưa có local.
- Thêm auth/local password nếu app mở ra LAN.
- Thêm test tự động cho API và JS form mapping.

## Rủi ro hiện tại

- Chưa chạy train thật vì cần dataset thật.
- Preset YOLO26 phụ thuộc version Ultralytics hiện tại; nếu version không hỗ trợ thì chọn YOLO11/YOLOv8 hoặc nhập custom model.
- Browser không có quyền mở file picker native, nên app dùng backend path browser thay thế.
- TensorRT/OpenVINO/CoreML export phụ thuộc package và môi trường máy; GUI tạo job/log, còn backend chưa tự cài riêng các runtime export này.
