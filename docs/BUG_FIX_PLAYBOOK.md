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
2. Kiểm tra `data.yaml` bằng nút `Kiểm tra`.
3. Start job lại.
4. Đọc `logs/train_jobs/<job_id>.log`.
5. Đọc `runs/gui_jobs/<job_id>/train_config.json` để xem tham số thực tế đã gửi.

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
