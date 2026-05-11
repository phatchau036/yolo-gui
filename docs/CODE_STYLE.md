# Code Style

## Ngôn ngữ và style chung

- Backend dùng Python 3.11+.
- Frontend hiện là HTML/CSS/JS static để chạy nhanh, không cần build.
- Ưu tiên code rõ ràng, ít abstraction khi chưa có nhu cầu thật.
- Tên biến dùng tiếng Anh trong code, UI/docs dùng tiếng Việt có dấu.

## Đặt tên

- Python:
  - Module/file: `snake_case.py`.
  - Function/variable: `snake_case`.
  - Class: `PascalCase`.
  - Constant path/config: `UPPER_SNAKE_CASE`.
- JavaScript:
  - State/function/variable: `camelCase`.
  - DOM id: mô tả rõ ý nghĩa, ví dụ `startTrainButton`, `datasetPreview`.
- Job/runtime:
  - Job id: `YYYYMMDD-HHMMSS-xxxxxxxx`.
  - Log file: `logs/train_jobs/<job_id>.log`.
  - Config file: `runs/gui_jobs/<job_id>/train_config.json`.

## Phong cách xử lý logic

- Validate sớm ở API nếu thiếu `model` hoặc `data`.
- Không import `ultralytics` ở server startup; chỉ import trong `train_runner.py` để UI vẫn mở được dù máy chưa cài đủ dependency GPU.
- Lỗi runtime phải đi vào log đầy đủ, không rút gọn còn một dòng.
- UI phải có trạng thái rõ: chưa kiểm tra, running, completed, failed, stopped.
- Setting mới nên đi theo thứ tự:
  1. Thêm field vào `TrainRequest`.
  2. Thêm input có `name` trùng field vào frontend.
  3. Nếu là số, thêm key vào `numberFields` trong `frontend/app.js`.
  4. Cập nhật docs nếu đổi hành vi.

## Comment

Chỉ thêm comment khi đoạn code có lý do kỹ thuật không hiển nhiên. Không comment kiểu mô tả lại từng dòng.
