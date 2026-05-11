# YOLO GUI

Web GUI local để train Ultralytics YOLO mà không cần nhớ CLI. Dự án này hướng tới người dùng muốn chọn model, dataset, thư mục output, setting train và theo dõi log ngay trong trình duyệt.

## Mục tiêu

- Chọn nhanh model YOLO26, YOLO11, YOLOv8 hoặc model `.pt/.yaml` tùy chỉnh.
- Chọn dataset bằng đường dẫn tới `data.yaml`.
- Cấu hình các tham số train phổ biến: epochs, image size, batch, device, optimizer, learning rate, augmentation, resume, cache, AMP, validation, plots.
- Gửi thêm mọi tham số Ultralytics chưa có nút riêng qua ô JSON nâng cao.
- Tự kiểm tra và cài Ultralytics ngay trên GUI nếu môi trường chưa có, không bắt người dùng mở CLI.
- Chạy job train trong tiến trình riêng để có log rõ ràng và có thể stop job.
- Lưu log, config và kết quả theo từng job để debug/handoff dễ.

## Chạy nhanh trên Windows

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start.ps1
```

Sau đó mở:

```text
http://127.0.0.1:8765
```

## Cài thủ công

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn yolo_gui.app:app --host 127.0.0.1 --port 8765
```

## Cấu trúc chính

- `yolo_gui/app.py`: FastAPI app, API cho frontend, static UI.
- `yolo_gui/training_manager.py`: quản lý job train, subprocess, log, stop job.
- `yolo_gui/dependency_manager.py`: kiểm tra/cài Ultralytics qua GUI và ghi log cài đặt.
- `yolo_gui/train_runner.py`: tiến trình con import `ultralytics` và gọi `YOLO(...).train(...)`.
- `yolo_gui/schemas.py`: request/response schema.
- `frontend/`: giao diện web static.
- `logs/train_jobs/`: log stdout/stderr theo job.
- `logs/dependency_installs/`: log cài Ultralytics từ GUI.
- `runs/gui_jobs/`: config job và output train mặc định.
- `docs/`: tài liệu handoff cho dev tiếp theo.

## Dataset kỳ vọng

Đường dẫn dataset nên trỏ tới file YAML của Ultralytics, ví dụ:

```text
C:\datasets\my-dataset\data.yaml
```

Ví dụ nội dung:

```yaml
path: C:/datasets/my-dataset
train: images/train
val: images/val
names:
  0: person
  1: car
```

## Ghi chú license

Ultralytics YOLO có lựa chọn AGPL-3.0 và Enterprise. Nếu dùng dự án này cho sản phẩm thương mại/closed-source, cần kiểm tra điều kiện license của Ultralytics trước khi phân phối.

## Đọc tiếp

Xem [docs/INDEX.md](docs/INDEX.md) để đọc theo thứ tự dành cho dev mới tiếp quản.
