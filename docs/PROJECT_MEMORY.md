# Project Memory

## Quyết định đã chốt

- Đây là web GUI local cho Ultralytics YOLO, không phải SaaS cloud.
- Ưu tiên chạy được trên Windows bằng PowerShell.
- Backend dùng FastAPI vì nhẹ và phù hợp API local.
- Frontend static để tránh build phức tạp trong giai đoạn đầu.
- Train chạy trong subprocess, không chạy trực tiếp trong request thread.
- Full setting được xử lý bằng hai lớp:
  - Form cho setting phổ biến.
  - `extra_args` JSON cho toàn bộ tham số còn lại.
- Log phải đầy đủ, đặc biệt traceback từ runner.
- Người dùng không phải tự mở CLI để cài dependency. GUI phải kiểm tra và cài được PyTorch CUDA/CPU và Ultralytics, đồng thời hiển thị log cài đặt ngay trong app.

## Quy tắc duy trì docs

Khi thay đổi code, cập nhật docs cùng lúc:

- Đổi cấu trúc file: cập nhật `REPO_MAP.md`.
- Đổi luồng train/API: cập nhật `PROJECT_LOGIC.md`.
- Đổi style hoặc pattern: cập nhật `CODE_STYLE.md`.
- Đổi log/debug: cập nhật `LOGGING_AND_DEBUGGING.md`.
- Fix bug có bài học mới: cập nhật `BUG_FIX_PLAYBOOK.md`.
- Hoàn thành/tạo todo: cập nhật `TODO_AND_STATUS.md`.
- Quyết định dài hạn: cập nhật file này.

## Hướng sản phẩm

Người dùng mục tiêu là người muốn train YOLO nhưng không muốn nhớ CLI. UI cần rõ, nhiều setting nhưng vẫn chia nhóm dễ hiểu. Không biến trang đầu thành landing page; màn hình đầu tiên phải là công cụ train.
