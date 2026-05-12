# Code Style

## Ngôn ngữ và style chung

- Backend dùng Python 3.11+.
- Frontend là HTML/CSS/JS static để chạy nhanh, không cần build.
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
  - DOM id: mô tả rõ nghĩa, ví dụ `trainDataPath`, `predictSourcePath`, `createReportButton`.
- Job/runtime:
  - Job id: `YYYYMMDD-HHMMSS-<job_type>-xxxxxxxx`.
  - Log file: `logs/workflow_jobs/<job_id>.log`.
  - Config file: `runs/gui_jobs/<job_id>/<job_type>_config.json`.

## Phong cách xử lý logic

- Validate sớm ở API nếu thiếu `model`, `data` hoặc `source`.
- Không import `ultralytics` ở server startup; chỉ import trong runner để UI vẫn mở được dù máy chưa cài đủ dependency GPU.
- Workflow dài chạy trong subprocess, không chạy trực tiếp trong request thread.
- Lỗi runtime phải đi vào log đầy đủ, không rút gọn còn một dòng.
- UI phải có trạng thái rõ: chưa kiểm tra, running, completed, failed, stopped.
- UI dạng workflow dài phải chia theo cụm thao tác và thứ tự người dùng làm thật. Không để một `settings-grid` quá rộng khiến field bị rải ngang toàn màn hình.
- Với wizard chính, dùng pattern cột trái nhập liệu + cột phải hành động/tóm tắt. CTA chính nằm ở cột hành động để người dùng thấy bước cuối rõ ràng.
- Sidebar desktop cố định theo viewport phải có scroll nội bộ (`overflow-y: auto`) nếu có thêm nav/card mới. Không để phần tử con tràn ra ngoài nền sidebar; với màn hình thấp cần breakpoint riêng để giảm padding/gap thay vì để card bị cắt hoặc tràn khỏi layout.
- Tooltip giải thích dùng `helpCatalog` trong `frontend/app.js`. Khi thêm label/option mới, thêm mô tả vào catalog hoặc bảo đảm fallback vẫn dễ hiểu.
- Không viết đoạn giải thích dài trực tiếp trong form. Dùng tooltip cho giải thích ngắn và tab `Hướng dẫn`/`docs/USER_GUIDE.md` cho hướng dẫn dài.
- Setting mới nên đi theo thứ tự:
  1. Thêm field vào schema tương ứng trong `schemas.py`.
  2. Thêm input có `name` trùng field vào frontend.
  3. Nếu là số, thêm key vào `numberFields` trong `frontend/app.js`.
  4. Nếu là workflow mới, thêm mapping trong `workflowForms`.
  5. Cập nhật docs nếu đổi hành vi.

## Comment

Chỉ thêm comment khi đoạn code có lý do kỹ thuật không hiển nhiên. Không comment kiểu mô tả lại từng dòng.
