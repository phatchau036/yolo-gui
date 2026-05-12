# Logging And Debugging

## Log nằm ở đâu

- Workflow job log: `logs/workflow_jobs/<job_id>.log`
- Dependency install logs:
  - `logs/dependency_installs/ultralytics-install.log`
  - `logs/dependency_installs/torch-cuda-install.log`
  - `logs/dependency_installs/torch-cpu-install.log`
- System report:
  - `logs/system_reports/system-report-*.md`
  - `logs/system_reports/system-report-*.json`
- Colab launcher:
  - `logs/colab/uvicorn.log`
  - `logs/colab/cloudflared.log`
- Job config: `runs/gui_jobs/<job_id>/<job_type>_config.json`
- Output mặc định:
  - Train: `runs/train/<name>/`
  - Validate: `runs/val/<name>/`
  - Predict: `runs/predict/<name>/`
  - Export: cạnh file model hoặc theo behavior của Ultralytics format tương ứng.

Khi debug một job, đọc theo thứ tự:

1. `runs/gui_jobs/<job_id>/<job_type>_config.json`
2. `logs/workflow_jobs/<job_id>.log`
3. Output trong `runs/train`, `runs/val`, `runs/predict` hoặc nơi Ultralytics báo trong log.

## Log cần chứa gì

Mỗi job phải có:

- Job id.
- Job type.
- Lệnh runner.
- Phiên bản Ultralytics nếu import được.
- Model path.
- Arguments thực tế.
- Full traceback nếu lỗi.
- Return code khi kết thúc.

## API debug nhanh

```powershell
Invoke-RestMethod http://127.0.0.1:8765/api/health
Invoke-RestMethod http://127.0.0.1:8765/api/system
Invoke-RestMethod http://127.0.0.1:8765/api/dependencies/status
Invoke-RestMethod http://127.0.0.1:8765/api/models
Invoke-RestMethod http://127.0.0.1:8765/api/jobs
```

Dataset/report:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/api/system/report -Method Post
Invoke-RestMethod http://127.0.0.1:8765/api/datasets/audit -Method Post -ContentType 'application/json' -Body '{"path":"C:\\datasets\\project\\data.yaml"}'
```

## Lỗi thường thấy

- `Ultralytics chưa được cài`: bấm `Cài Ultralytics` trên GUI.
- `PyTorch chưa được cài`: bấm `Cài PyTorch CUDA` hoặc `Cài PyTorch CPU`.
- `PyTorch installed nhưng CUDA unavailable`: bấm `Cài PyTorch CUDA`, sau đó kiểm tra driver NVIDIA.
- `nvidia-smi not found`: máy không có NVIDIA driver trong PATH hoặc chưa cài driver GPU.
- `Dataset YAML does not exist`: đường dẫn `data.yaml` sai.
- `Cannot inspect/audit dataset`: YAML sai format, path split sai hoặc app không có quyền đọc folder.
- Runner exit code `1`: mở job log để xem traceback đầy đủ.
- Export TensorRT fail: thường do thiếu CUDA/TensorRT hoặc format không hợp với máy hiện tại; xem log workflow.
- Colab không hiện link `trycloudflare.com`: đọc `logs/colab/cloudflared.log`, chạy lại cell nếu tunnel đã hết hạn hoặc Colab sleep.
- Colab mở link nhưng GUI không tải: đọc `logs/colab/uvicorn.log` và kiểm tra cell `start_colab.py` còn đang chạy không.

## Nguyên tắc debug

- Không đoán lỗi từ popup. Luôn mở log job.
- Không bắt người dùng tự mở CLI để cài Ultralytics/PyTorch; dùng nút cài trong GUI và đọc log dependency nếu lỗi.
- Nếu lỗi chỉ hiện popup ngắn, bổ sung log chi tiết trước.
- Nếu sửa backend workflow, chạy `python -m compileall -q yolo_gui`.
- Nếu sửa UI, chạy `node --check frontend/app.js` và kiểm tra desktop/mobile bằng browser.
