# Project Memory

## Quyết định đã chốt

- Đây là web GUI local cho Ultralytics YOLO, không phải SaaS cloud.
- Ưu tiên chạy được trên Windows bằng PowerShell.
- Backend dùng FastAPI vì nhẹ và phù hợp API local.
- Frontend static để tránh build phức tạp trong giai đoạn đầu.
- Workflow YOLO chạy trong subprocess, không chạy trực tiếp trong request thread.
- `TrainingManager` hiện là job manager chung cho `train`, `val`, `predict`, `export`; tên class giữ lại để tránh refactor rộng.
- `workflow_runner.py` là runner chính mới; `train_runner.py` là runner cũ, chưa xóa để giữ lịch sử và fallback.
- Full setting được xử lý bằng hai lớp:
  - GUI chính dùng preset/card/toggle tiếng Việt dễ hiểu.
  - Mapping nội bộ trong `frontend/app.js` chuyển preset sang tham số Ultralytics.
- Không hiển thị `extra_args` JSON cho người dùng cuối. Hook này chỉ giữ nội bộ để backend contract không phải refactor rộng.
- Log phải đầy đủ, đặc biệt traceback từ runner.
- Người dùng không phải tự mở CLI để cài dependency. GUI phải kiểm tra và cài được PyTorch CUDA/CPU và Ultralytics, đồng thời hiển thị log cài đặt ngay trong app.
- Nguyên tắc mới: workflow chính phải 100% GUI, không bắt người dùng hiểu `data.yaml`, JSON, `device=0`, CLI args, split name hoặc tham số YOLO thô.
- Dataset wizard không được là một form ngang quá rộng. Luồng chuẩn là bố cục có bước rõ ràng: cột chính nhập thư mục/cấu trúc/class, cột hành động bên phải tạo và gán `data.yaml`.
- Automation là một lớp riêng trên GUI: người dùng bấm kịch bản, backend chạy nhiều bước tuần tự và ghi timeline/log riêng thay vì bắt người dùng tự chuyển tab và tự chạy từng lệnh.
- Mọi nhãn/tùy chọn chính trong GUI phải có giải thích ngắn bằng tooltip. Không nhồi đoạn giải thích dài vào form; dùng dấu hỏi cạnh nhãn và tab `Hướng dẫn` cho nội dung dài.
- Luôn giữ một tài liệu người dùng cuối tại `docs/USER_GUIDE.md` song song với tab `Hướng dẫn` trong app.
- Tab `Phiên bản` là đường update GUI cho người không biết git. Update chỉ được chạy bằng `git pull --ff-only` khi repo sạch, không dùng reset/checkout để tránh mất chỉnh sửa.

## Quy tắc duy trì docs

Khi thay đổi code, cập nhật docs cùng lúc:

- Đổi cấu trúc file: cập nhật `REPO_MAP.md`.
- Đổi luồng workflow/API: cập nhật `PROJECT_LOGIC.md`.
- Đổi style hoặc pattern: cập nhật `CODE_STYLE.md`.
- Đổi log/debug: cập nhật `LOGGING_AND_DEBUGGING.md`.
- Đổi version hoặc release note: cập nhật `CHANGELOG.md` và docs liên quan.
- Fix bug có bài học mới: cập nhật `BUG_FIX_PLAYBOOK.md`.
- Hoàn thành/tạo todo: cập nhật `TODO_AND_STATUS.md`.
- Quyết định dài hạn: cập nhật file này.

## Hướng sản phẩm

Người dùng mục tiêu là người muốn train và dùng YOLO nhưng không muốn nhớ CLI hoặc thuật ngữ YOLO kỹ thuật. UI cần rõ, nhiều setting nhưng phải chia thành lựa chọn theo mục tiêu/tác động: mức huấn luyện, máy chạy, nguồn dự đoán, mục đích đóng gói. Màn hình đầu tiên phải là công cụ thao tác thật, không phải landing page.

## Học từ repo tham khảo YOLOX GUI

Repo tham khảo có các nhóm chức năng hữu ích: train, infer ảnh/folder/video/camera, export ONNX, kiểm tra dataset, convert VOC XML, tính metrics và system report. Bản này chuyển các ý đó sang web local, dùng Ultralytics YOLO thay YOLOX CLI, và mở rộng thêm dependency installer trong GUI.
