# Session Log

## 2026-05-12

- Nhận mục tiêu dự án: làm web GUI local để train YOLO thay cho CLI/code.
- Chọn kiến trúc FastAPI + frontend static + subprocess train runner.
- Tạo scaffold backend/frontend/docs.
- Kết nối repo local với GitHub `phatchau036/yolo-gui` trước đó và xác minh push dry-run thành công.
- Chạy server local ở `http://127.0.0.1:8765`.
- API smoke:
  - `GET /api/health` pass.
  - `GET /api/models` pass.
  - `POST /api/datasets/inspect` với YAML tạm trả về `class_count=1`.
  - `POST /api/train/start` tạo job, ghi log, fail đúng kỳ vọng lúc đầu vì thiếu `ultralytics`.
- Cài `ultralytics 8.4.48` vào Python global đang chạy server.
- Restart server, `GET /api/health` báo `ultralytics_installed=true`.
- `GET /api/system` báo CUDA available, Torch `2.5.1+cu121`, GPU `NVIDIA GeForce RTX 3050 Laptop GPU` 4GB.
- Theo yêu cầu mới, thêm luồng cài Ultralytics ngay trên GUI:
  - Backend `DependencyManager` chạy pip install và ghi `logs/dependency_installs/ultralytics-install.log`.
  - Frontend có card trạng thái môi trường, nút `Cài Ultralytics`, nút kiểm tra lại và vùng log.
  - `Bắt đầu train` tự kiểm tra dependency, nếu thiếu thì cuộn tới card cài đặt thay vì để runner fail.
- Mở rộng card môi trường theo yêu cầu tiếp theo:
  - Check Python/pip, NVIDIA/CUDA qua `nvidia-smi`, PyTorch CUDA, GPU list và Ultralytics.
  - Thêm nút `Cài PyTorch CUDA` và `Cài PyTorch CPU`.
  - Thêm log `torch-cuda-install.log` và `torch-cpu-install.log`.
  - API status xác nhận máy hiện có RTX 3050 Laptop GPU, driver `528.92`, `nvidia-smi` CUDA `12.0`, PyTorch `2.5.1+cu121`, Torch CUDA `12.1`, `cuda_available=true`.
  - QA không chạy nút cài lại PyTorch vì có thể tải/cài lại gói CUDA lớn; đã kiểm tra API/status/UI và giữ nút cho người dùng bấm khi cần repair.
- Playwright QA:
  - Desktop layout pass sau khi đổi custom class từ `panel-block` sang `work-panel`.
  - Mobile không còn horizontal overflow sau khi thêm `min-width:0` và width constraints.
  - Console sạch sau khi thêm favicon route.
  - Job list/log hiển thị được traceback đầy đủ.

### Ghi chú kỹ thuật

- App chưa chạy train thật trong phiên này vì chưa có dataset thật.
- Kiểm tra cú pháp Python bằng `python -m compileall -q yolo_gui` đã pass.
- Môi trường server hiện có `ultralytics`, `torch` global và thấy GPU `NVIDIA GeForce RTX 3050 Laptop GPU (4GB)`.
