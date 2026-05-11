# Logging And Debugging

## Log nằm ở đâu

- Job log: `logs/train_jobs/<job_id>.log`
- Dependency install logs:
  - `logs/dependency_installs/ultralytics-install.log`
  - `logs/dependency_installs/torch-cuda-install.log`
  - `logs/dependency_installs/torch-cpu-install.log`
- Job config: `runs/gui_jobs/<job_id>/train_config.json`
- Output train mặc định: `runs/train/<name>/`

Khi debug một job, đọc theo thứ tự:

1. `runs/gui_jobs/<job_id>/train_config.json`
2. `logs/train_jobs/<job_id>.log`
3. Output trong `runs/train/` hoặc thư mục `project` người dùng chọn.

## Log cần chứa gì

Mỗi job phải có:

- Job id.
- Lệnh runner.
- Phiên bản Ultralytics nếu import được.
- Model path.
- Data path.
- Training arguments.
- Full traceback nếu lỗi.
- Return code khi kết thúc.

## API debug nhanh

```powershell
Invoke-RestMethod http://127.0.0.1:8765/api/health
Invoke-RestMethod http://127.0.0.1:8765/api/system
Invoke-RestMethod http://127.0.0.1:8765/api/dependencies/status
Invoke-RestMethod http://127.0.0.1:8765/api/dependencies/torch
Invoke-RestMethod http://127.0.0.1:8765/api/dependencies/ultralytics
Invoke-RestMethod http://127.0.0.1:8765/api/models
Invoke-RestMethod http://127.0.0.1:8765/api/train/jobs
```

## Lỗi thường thấy

- `ultralytics_installed=false`: chưa cài dependency hoặc đang dùng sai venv.
- `Cài Ultralytics` fail trên GUI: mở `logs/dependency_installs/ultralytics-install.log`.
- `torch_installed=false`: chưa cài PyTorch.
- `PyTorch installed nhưng CUDA unavailable`: bấm `Cài PyTorch CUDA`, sau đó kiểm tra driver bằng card NVIDIA/CUDA.
- `nvidia-smi not found`: máy không có NVIDIA driver trong PATH hoặc chưa cài driver GPU.
- `CUDA unavailable`: Torch không thấy GPU, sai bản CUDA hoặc driver.
- `Dataset YAML does not exist`: đường dẫn data.yaml sai.
- `Cannot parse dataset YAML`: YAML sai format hoặc encoding.
- Runner exit code `1`: mở job log để xem traceback đầy đủ.

## Nguyên tắc debug

- Không đoán lỗi train từ UI. Luôn mở log job.
- Không bắt người dùng tự mở CLI để cài Ultralytics/PyTorch; dùng nút cài trong GUI và đọc log dependency nếu lỗi.
- Nếu lỗi chỉ hiện popup ngắn, bổ sung log chi tiết trước.
- Nếu sửa backend train, chạy `python -m compileall -q yolo_gui`.
- Nếu sửa UI, mở lại browser và kiểm tra desktop/mobile.
