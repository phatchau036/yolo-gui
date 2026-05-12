# Changelog

## v0.4.5 - 2026-05-12

- Thẻ sidebar `Máy hiện tại` đổi thành `Colab hiện tại` khi GUI chạy trên Google Colab.
- Trạng thái Colab không còn chỉ ghi `CUDA: chưa sẵn sàng`; GUI giải thích đang chạy CPU, vẫn chạy được nhưng chậm, và chỉ rõ cách bật GPU trong `Runtime > Change runtime type > GPU`.
- API `/api/dependencies/status` trả thêm `runtime` để frontend không bị render nhầm kiểu local khi kiểm tra dependency chạy trước kiểm tra version.
- Tab `Cài đặt` cũng dùng câu hướng dẫn riêng cho Colab CPU runtime thay vì chỉ báo không thấy `nvidia-smi`.

## v0.4.4 - 2026-05-12

- Làm lại cụm duyệt đường dẫn để nút mở/gán là icon button gọn, không còn vỡ chữ.
- Khi GUI đang kiểm tra môi trường YOLO, toàn bộ nút cài/kiểm tra lại được khóa để tránh bấm lung tung.
- Trên Google Colab, GUI tự ẩn/chặn lựa chọn Camera vì Ultralytics không hỗ trợ webcam `source=0` trong notebook.
- Backend cũng chặn predict webcam trên Colab và trả lỗi tiếng Việt dễ hiểu trước khi tạo job.

## v0.4.3 - 2026-05-12

- Thêm JS health check gọi `/api/health` ngay khi mở GUI và tự lặp lại mỗi 30 giây.
- Sidebar card `Máy hiện tại` có badge `Online` hoặc `Mất kết nối` để người dùng biết backend còn sống.

## v0.4.2 - 2026-05-12

- Hiển thị phiên bản hiện tại ngay dưới header `YOLO GUI` trong sidebar.
- Dòng phiên bản dùng chung dữ liệu `/api/version`, nên Windows và Google Colab đều thấy đúng bản đang chạy.

## v0.4.1 - 2026-05-12

- Tab `Phiên bản` hiển thị môi trường đang chạy: Local hoặc Google Colab.
- Luồng update trên Colab có hướng dẫn riêng: dừng cell, chạy lại cell `Chạy YOLO GUI`, rồi mở link tunnel mới.
- Bổ sung hướng dẫn Colab cho mục changelog/update trong GUI.
- Chỉnh responsive mobile để thanh điều hướng và quick action không tạo cuộn ngang ngoài ý muốn.

## v0.4.0 - 2026-05-12

- Thêm tab `Phiên bản` trong GUI.
- Hiển thị phiên bản hiện tại, commit local, commit mới trên GitHub và trạng thái cập nhật.
- Thêm changelog trong GUI để người dùng đọc các thay đổi chính.
- Thêm nút `Cập nhật ngay` chạy `git pull --ff-only` khi repo sạch.
- Ghi log cập nhật vào `logs/updates/`.

## v0.3.0 - 2026-05-12

- Thêm launcher Google Colab bằng `start_colab.py`.
- Thêm notebook `YOLO_GUI_Colab.ipynb` để clone/chạy GUI bằng một cell.
- Tự mở Cloudflare Quick Tunnel để dùng GUI trên Colab qua link `trycloudflare.com`.
- Thêm tài liệu `docs/COLAB_GUIDE.md`.

## v0.2.0 - 2026-05-12

- Chuyển UI sang định hướng 100% GUI, giảm thuật ngữ CLI/YOLO thô.
- Thêm Dataset Wizard tạo và gán `data.yaml` bằng giao diện.
- Thêm Automation chạy nhiều bước YOLO theo kịch bản.
- Thêm tooltip giải thích và tab `Hướng dẫn`.
- Thêm ảnh demo vào README.

## v0.1.0 - 2026-05-12

- Tạo nền FastAPI + frontend static cho YOLO GUI.
- Chạy train, validate, predict và export qua Ultralytics Python API.
- Thêm kiểm tra/cài PyTorch, CUDA và Ultralytics trong GUI.
- Ghi log workflow theo từng job.
