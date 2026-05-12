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
- Trên Google Colab, trạng thái CPU/GPU phải dùng ngôn ngữ notebook: nói rõ CPU vẫn chạy được nhưng chậm, và hướng dẫn bật GPU bằng `Runtime > Change runtime type > GPU` rồi chạy lại cell YOLO GUI. Không chỉ ghi `CUDA chưa sẵn sàng` như máy local.
- Nguyên tắc mới: workflow chính phải 100% GUI, không bắt người dùng hiểu `data.yaml`, JSON, `device=0`, CLI args, split name hoặc tham số YOLO thô.
- Dataset wizard không được là một form ngang quá rộng. Luồng chuẩn là bố cục có bước rõ ràng: cột chính nhập thư mục/cấu trúc/class, cột hành động bên phải tạo và gán `data.yaml`.
- Gán nhãn ảnh cũng thuộc tab `Dữ liệu`: công cụ `Vẽ bounding box như LabelImg` phải cho người dùng chọn folder ảnh, vẽ box, chọn class và lưu nhãn YOLO `.txt` ngay trong web GUI, không bắt mở tool desktop riêng.
- Automation là một lớp riêng trên GUI: người dùng bấm kịch bản, backend chạy nhiều bước tuần tự và ghi timeline/log riêng thay vì bắt người dùng tự chuyển tab và tự chạy từng lệnh.
- Mọi nhãn/tùy chọn chính trong GUI phải có giải thích ngắn bằng tooltip. Không nhồi đoạn giải thích dài vào form; dùng dấu hỏi cạnh nhãn và tab `Hướng dẫn` cho nội dung dài.
- Luôn giữ một tài liệu người dùng cuối tại `docs/USER_GUIDE.md` song song với tab `Hướng dẫn` trong app.
- Tab `Phiên bản` là đường update GUI cho người không biết git. Update chỉ được chạy bằng `git pull --ff-only` khi repo sạch, không dùng reset/checkout để tránh mất chỉnh sửa.
- Nếu repo có file đã sửa khi cập nhật, GUI dùng nút `Sao lưu rồi cập nhật` để chạy Git stash trước rồi pull; không bắt người dùng tự mở CLI.
- Tab `Dự đoán` phải giữ người dùng tại chỗ, có progress và preview ảnh/video output; log đầy đủ vẫn nằm ở tab `Tiến trình`.
- Hướng giao diện hiện tại là `Pro AI Lab`: shell/sidebar/header tối, workspace sáng dễ thao tác, dùng `Be Vietnam Pro` và giữ cảm giác tool AI/GPU chuyên nghiệp thay vì dashboard mặc định.
- Bài học QA v0.4.18: đường dẫn dài trong annotator, dependency card nhiều nút và quick workflow nhiều card phải được thiết kế bằng grid/wrap/ellipsis ngay từ đầu; không dùng `overflow-wrap:anywhere` cho vùng chứa path quan trọng vì dễ bẻ chữ thành từng ký tự.
- Dependency/status endpoint không được crash chỉ vì cache import của Python lỗi; mọi check môi trường phải trả trạng thái/log đọc được để console GUI luôn sạch.

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
