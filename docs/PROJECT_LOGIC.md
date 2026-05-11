# Project Logic

## Mục tiêu logic

Người dùng không phải nhớ lệnh CLI như `yolo train ...`. UI gom setting thành form, backend chuyển form thành dict tham số, rồi runner gọi Python API của Ultralytics.

## Luồng chính

1. Người dùng mở `http://127.0.0.1:8765`.
2. Frontend gọi:
   - `GET /api/health` để biết dependency có sẵn chưa.
   - `GET /api/system` để kiểm tra Torch/CUDA/GPU.
   - `GET /api/models` để nạp model preset.
3. Người dùng nhập hoặc duyệt tới `data.yaml`.
4. Frontend gọi `POST /api/datasets/inspect`.
5. Người dùng chỉnh setting train.
6. Frontend gom form thành JSON và gọi `POST /api/train/start`.
7. `TrainingManager` tạo job:
   - Ghi `runs/gui_jobs/<job_id>/train_config.json`.
   - Spawn subprocess `python -m yolo_gui.train_runner --config ...`.
   - Pipe stdout/stderr vào `logs/train_jobs/<job_id>.log`.
8. Frontend poll:
   - `GET /api/train/jobs`.
   - `GET /api/train/jobs/{job_id}/logs`.
9. Nếu cần dừng, frontend gọi `POST /api/train/jobs/{job_id}/stop`.

## Vì sao dùng subprocess

Train YOLO có thể chạy lâu, chiếm GPU và in log liên tục. Nếu chạy trực tiếp trong FastAPI thread thì khó stop và dễ làm server treo. Subprocess giúp:

- Stop job bằng `terminate()` hoặc `kill()`.
- Tách crash của Ultralytics khỏi web server.
- Log stdout/stderr đầy đủ để debug.
- Dễ mở rộng thành queue nhiều job sau này.

## Quy tắc mapping setting

- Setting phổ biến có field riêng trong `TrainRequest`.
- Setting chưa có field riêng truyền qua `extra_args`.
- Nếu key trùng nhau, `extra_args` ghi đè field form.
- Không truyền `None` hoặc chuỗi rỗng vào runner.

## Các điểm nóng cần cẩn thận

- `schemas.py`: field type phải khớp kiểu Ultralytics nhận.
- `training_manager.py`: không làm mất log khi subprocess lỗi.
- `train_runner.py`: luôn in full traceback.
- `frontend/app.js`: không start job nếu thiếu `data` hoặc JSON nâng cao sai.
- `frontend/index.html`: thêm setting mới phải có `name` đúng với schema.
