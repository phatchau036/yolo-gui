# Changelog

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
