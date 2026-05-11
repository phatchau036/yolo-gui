# Bug Fix Playbook

## App không mở

1. Chạy lại:

```powershell
.\start.ps1
```

2. Nếu dependency lỗi, kiểm tra `.venv`:

```powershell
.\.venv\Scripts\python.exe -m pip list
```

3. Nếu port bận:

```powershell
python -m uvicorn yolo_gui.app:app --host 127.0.0.1 --port 8766
```

## UI mở nhưng không train được

1. Kiểm tra `GET /api/health`.
2. Kiểm tra card môi trường trên GUI. Nếu thiếu PyTorch/Ultralytics, bấm nút cài tương ứng.
3. Nếu cài dependency lỗi, đọc log trong `logs/dependency_installs/`.
4. Kiểm tra `data.yaml` bằng nút `Kiểm tra`.
5. Start job lại.
6. Đọc `logs/train_jobs/<job_id>.log`.
7. Đọc `runs/gui_jobs/<job_id>/train_config.json` để xem tham số thực tế đã gửi.

## Nút cài dependency không chạy

1. Gọi `GET /api/dependencies/status` để xem trạng thái backend.
2. Gọi API install tương ứng để xác nhận API còn hoạt động:
   - `POST /api/dependencies/ultralytics/install`
   - `POST /api/dependencies/torch/install-cuda`
   - `POST /api/dependencies/torch/install-cpu`
3. Đọc log tương ứng trong `logs/dependency_installs/`.
4. Kiểm tra Python server đang dùng trong field `python` của API status.
5. Nếu pip bị lỗi network hoặc quyền ghi, hiển thị nguyên lỗi đó trên GUI, không rút gọn.

## CUDA không sẵn sàng

1. Kiểm tra card `NVIDIA/CUDA` trong GUI.
2. Nếu `nvidia-smi not found`, cài hoặc sửa NVIDIA driver trước.
3. Nếu có NVIDIA GPU nhưng PyTorch báo CPU only, bấm `Cài PyTorch CUDA`.
4. Sau khi cài xong, restart server nếu Python vẫn giữ module cũ.
5. Kiểm tra lại `GET /api/dependencies/status`.

## Stop job không dừng

1. Kiểm tra status job trong `GET /api/train/jobs`.
2. Nếu process vẫn chạy, thêm option force stop ở UI.
3. Không kill toàn bộ Python nếu chưa biết PID; job process được giữ trong `TrainingJob.process`.

## Thêm setting YOLO bị không nhận

1. Xác nhận tên tham số đúng theo Ultralytics.
2. Thêm vào `TrainRequest`.
3. Thêm input frontend với `name` trùng.
4. Nếu là number, thêm vào `numberFields`.
5. Test bằng job config JSON, chưa cần train thật.

## Lỗi GPU/CUDA

1. Mở `GET /api/system`.
2. Kiểm tra `torch.cuda.is_available()`.
3. Nếu không có CUDA, chạy `device=cpu` để xác định dataset/model có ổn không.
4. Cài đúng PyTorch CUDA theo driver máy trước khi nghi app.

## Dataset lỗi

1. Mở `data.yaml`.
2. Kiểm tra `path`, `train`, `val`, `names`.
3. Đảm bảo path dùng `/` hoặc escape đúng nếu copy từ Windows.
4. Chạy inspect trong UI để xem app parse ra gì.
