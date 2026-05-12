# YOLO GUI

Web GUI local để chạy Ultralytics YOLO mà không cần nhớ CLI. Dự án hướng tới một màn hình thao tác đầy đủ cho train, validate, predict, export, kiểm tra dataset, tạo report môi trường và cài dependency trực tiếp trong trình duyệt.

## Mục tiêu

- Chọn nhanh model YOLO26, YOLO11, YOLOv8 hoặc model `.pt/.yaml` tùy chỉnh.
- Train model với dataset `data.yaml`, setting chính, hyperparameter, augmentation và `extra_args` JSON.
- Validate model theo split `val/test/train`, lưu JSON, plots và log.
- Predict ảnh, folder, video, camera hoặc source URL, có tùy chọn save media/txt/conf/crop.
- Export model sang ONNX, TensorRT, OpenVINO, TorchScript, CoreML, TFLite, NCNN và các format Ultralytics hỗ trợ.
- Kiểm tra dataset sâu hơn: đếm ảnh/label, thiếu label, label rỗng, dòng label sai, class id ngoài danh sách.
- Tạo và gán `data.yaml` trực tiếp trong GUI, convert VOC XML sang YOLO txt, tính precision/recall/F1 từ thư mục label prediction và ground truth.
- Tự kiểm tra Python, pip, NVIDIA/CUDA, PyTorch và Ultralytics ngay trên GUI.
- Có nút cài Ultralytics, PyTorch CUDA và PyTorch CPU ngay trên GUI, kèm log cài đặt.
- Lưu config, log và kết quả theo từng job để debug/handoff dễ hơn.

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
- `yolo_gui/training_manager.py`: quản lý job chung cho `train`, `val`, `predict`, `export`.
- `yolo_gui/workflow_runner.py`: tiến trình con gọi Ultralytics Python API theo từng workflow.
- `yolo_gui/dataset_tools.py`: inspect/audit dataset, tạo YAML, VOC XML -> YOLO txt, metrics label.
- `yolo_gui/system_report.py`: tạo report môi trường `.md` và `.json`.
- `yolo_gui/dependency_manager.py`: kiểm tra/cài Ultralytics, PyTorch CUDA/CPU qua GUI.
- `yolo_gui/schemas.py`: request/response schema.
- `frontend/`: giao diện web static.
- `logs/workflow_jobs/`: log stdout/stderr theo job.
- `logs/dependency_installs/`: log cài Ultralytics, PyTorch CUDA/CPU.
- `logs/system_reports/`: report môi trường.
- `runs/gui_jobs/`: config JSON theo job.
- `runs/train`, `runs/val`, `runs/predict`: output mặc định.
- `docs/`: tài liệu handoff cho dev tiếp theo.

## Dataset

Người dùng không cần tự viết `data.yaml` bằng CLI hoặc editor. Vào tab `Dataset`, chọn root dataset, train/val/test split, nhập danh sách class rồi bấm `Tạo và gán YAML`. GUI sẽ tạo file YAML và tự điền vào Train, Validate, Audit.

Layout YOLO chuẩn:

```text
dataset-root/
  images/train/
  images/val/
  labels/train/
  labels/val/
```

Nội dung YAML do GUI tạo có dạng:

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
