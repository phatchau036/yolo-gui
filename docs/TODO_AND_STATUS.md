# Todo And Status

## Đã hoàn thành

- Kết nối repo local với GitHub `https://github.com/phatchau036/yolo-gui.git`.
- Tạo backend FastAPI.
- Tạo subprocess runner cho Ultralytics train.
- Tạo job manager có start, stop, status, log.
- Tạo API:
  - `/api/health`
  - `/api/system`
  - `/api/models`
  - `/api/paths/list`
  - `/api/datasets/inspect`
  - `/api/train/start`
  - `/api/train/jobs`
  - `/api/train/jobs/{job_id}/logs`
  - `/api/train/jobs/{job_id}/stop`
- Tạo web GUI:
  - Chọn dataset YAML.
  - Duyệt folder local qua backend.
  - Chọn model preset hoặc custom model.
  - Chọn task detect/segment/classify/pose/obb.
  - Form setting train chính.
  - Form hyperparameter/augmentation.
  - Extra args JSON để phủ hết setting chưa có UI riêng.
  - Job list, log polling, stop job.
- Tạo docs handoff nền.
- Chạy API smoke với `data.yaml` tạm:
  - Dataset inspect trả về `class_count=1`.
  - Job được tạo và log được ghi.
  - Runner fail đúng kỳ vọng trước khi cài `ultralytics`, log có traceback đầy đủ.
- Cài `ultralytics 8.4.48` vào Python global đang chạy server.
- Restart server, `GET /api/health` báo `ultralytics_installed=true`.
- `GET /api/system` thấy Torch `2.5.1+cu121`, CUDA available và GPU `NVIDIA GeForce RTX 3050 Laptop GPU` 4GB.
- `GET /api/dependencies/status` thấy pip, NVIDIA driver `528.92`, `nvidia-smi` CUDA `12.0`, PyTorch CUDA `12.1`, GPU RTX 3050 4GB.
- Thêm GUI dependency notice:
  - `GET /api/dependencies/status`
  - `GET /api/dependencies/torch`
  - `GET /api/dependencies/ultralytics`
  - `POST /api/dependencies/ultralytics/install`
  - `POST /api/dependencies/torch/install-cuda`
  - `POST /api/dependencies/torch/install-cpu`
  - `GET /api/dependencies/ultralytics/logs`
  - `GET /api/dependencies/torch/logs`
  - Card kiểm tra Python/pip, NVIDIA/CUDA, PyTorch, Ultralytics.
  - Nút `Cài Ultralytics`, `Cài PyTorch CUDA`, `Cài PyTorch CPU` và log cài đặt ngay trong giao diện.
  - Train button chặn train nếu PyTorch/Ultralytics thiếu hoặc dependency đang cài.
- Chạy Playwright QA desktop/mobile:
  - Sửa xung đột class `panel-block` với Bulma.
  - Sửa mobile horizontal overflow.
  - Sửa thiếu favicon để console sạch.
  - Kiểm tra job failed tự hiển thị log sau reload.

## Cần làm tiếp

- Thêm chế độ export model sau train: ONNX, TensorRT, OpenVINO, CoreML.
- Thêm tab predict/val/export riêng, không chỉ train.
- Thêm queue nhiều job và giới hạn số job chạy song song.
- Thêm profile cấu hình lưu lại để dùng lại.
- Thêm detect GPU/VRAM để gợi ý batch/imgsz.
- Thêm validation dataset sâu hơn: đếm ảnh/label, phát hiện label sai class.
- Thêm upload hoặc copy dataset vào workspace nếu người dùng muốn.
- Thêm biểu đồ metric từ `results.csv`.
- Thêm auth/local password nếu app mở ra LAN.
- Thêm test tự động cho API và JS form mapping.
- Thêm test mô phỏng môi trường thiếu Ultralytics để kiểm tra UI cài dependency.

## Rủi ro hiện tại

- Chưa chạy train thật vì cần dataset thật. Môi trường hiện đã có `ultralytics`, Torch CUDA và GPU.
- Preset YOLO26 phụ thuộc version Ultralytics hiện tại; nếu version cũ không hỗ trợ thì người dùng chọn YOLO11/YOLOv8 hoặc nhập custom model.
- Browser không có quyền mở file picker native, nên app dùng backend path browser thay thế.
