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

## UI mở nhưng workflow không chạy

1. Kiểm tra `GET /api/health`.
2. Kiểm tra card môi trường trên GUI.
3. Nếu thiếu PyTorch/Ultralytics, bấm nút cài tương ứng.
4. Nếu cài dependency lỗi, đọc `logs/dependency_installs/`.
5. Kiểm tra input bắt buộc:
   - Train/Val: `model` và `data.yaml`.
   - Predict: `model` và `source`.
   - Export: `model`.
6. Đọc `logs/workflow_jobs/<job_id>.log`.
7. Đọc `runs/gui_jobs/<job_id>/<job_type>_config.json`.

## Dataset audit báo sai

1. Mở `data.yaml`.
2. Kiểm tra `path`, `train`, `val`, `test`, `names`.
3. Nếu dùng Windows path, ưu tiên `/` hoặc escape `\\`.
4. Kiểm tra cấu trúc `images/...` và `labels/...`; audit đang suy label path bằng cách thay segment `images` thành `labels`.
5. Nếu dataset không theo layout YOLO chuẩn, chỉnh `_label_path_for_image()` trong `dataset_tools.py`.

## Export model lỗi

1. Mở log workflow export.
2. Kiểm tra format:
   - ONNX thường cần `onnx`/`onnxruntime` nếu muốn smoke ngoài Ultralytics.
   - TensorRT cần GPU/CUDA/TensorRT phù hợp.
   - INT8 thường cần `data.yaml` calibration.
3. Thử `format=onnx`, `device=cpu`, `half=false`, `int8=false` để tách lỗi môi trường khỏi lỗi model.

## Nút cài dependency không chạy

1. Gọi `GET /api/dependencies/status`.
2. Gọi API install tương ứng:
   - `POST /api/dependencies/ultralytics/install`
   - `POST /api/dependencies/torch/install-cuda`
   - `POST /api/dependencies/torch/install-cpu`
3. Đọc log tương ứng trong `logs/dependency_installs/`.
4. Kiểm tra Python server đang dùng trong field `python` của API status.
5. Nếu pip lỗi network/quyền ghi, hiển thị nguyên lỗi đó trên GUI, không rút gọn.

## Nút dependency bấm được khi đang kiểm tra

1. Kiểm tra `renderDependencyCheckingState()` có gọi `setDependencyActionsDisabled(true)` trước khi gọi API chưa.
2. Kiểm tra `loadDependencyStatus()` có tăng `dependencyStatusRequestSeq` và bỏ qua response cũ không; response cũ không được mở khóa card khi request mới hơn đang pending.
3. Kiểm tra card `#dependencyNotice` có class `is-action-locked` trong lúc `is-checking` hoặc `is-running`.
4. Browser QA bằng cách delay `/api/dependencies/status`, sau đó xác nhận 4 nút dependency đều `disabled=true`, `aria-disabled=true` và click không tạo request install.
5. Khi endpoint lỗi, chỉ nút `Kiểm tra lại` được mở để người dùng thử lại; các nút cài vẫn khóa cho tới khi status đọc được môi trường.

## CUDA không sẵn sàng

1. Kiểm tra card `NVIDIA/CUDA` trong GUI.
2. Nếu runtime là Google Colab và chưa thấy GPU, bật GPU bằng `Runtime > Change runtime type > GPU`, lưu lại, chạy lại cell YOLO GUI và mở link tunnel mới.
3. Nếu là Windows/local và `nvidia-smi not found`, cài hoặc sửa NVIDIA driver trước.
4. Nếu có NVIDIA GPU nhưng PyTorch báo CPU only, bấm `Cài PyTorch CUDA`.
5. Sau khi cài xong, restart server nếu Python vẫn giữ module cũ.
6. Kiểm tra lại `GET /api/dependencies/status`; payload phải có field `runtime` để frontend render đúng câu hướng dẫn.

## Colab cập nhật xong nhưng GUI chưa tải lại

1. Kiểm tra tab `Phiên bản`, panel `Colab tunnel` phải hiện trạng thái `Đang restart server` hoặc `Đã nạp xong bản mới`.
2. Gọi `GET /api/version/restart-status`; payload phải có `request.request_id` và `state.status`.
3. Nếu `state.status=ready`, link `trycloudflare.com` vẫn là link cũ; tải lại tab hiện tại để lấy frontend mới.
4. Nếu `state.status=failed`, đọc `state.message` và `state.server_log`.
5. Trong notebook Colab, xem `logs/colab/uvicorn-<port>.log`; tunnel log chỉ cần xem nếu link public bị mất.
6. Nếu cập nhật từ bản quá cũ chưa có restart sau tunnel, dừng cell và chạy lại cell một lần để nạp `start_colab.py` mới; các lần cập nhật sau sẽ restart server sau link hiện tại.

## Tooltip dấu hỏi bị lệch trong card

1. Kiểm tra selector nào đang gắn tooltip trong `enhanceInlineHelp()` của `frontend/app.js`.
2. Nếu icon được append vào `strong`, `h3` hoặc `h4`, tránh style cha kiểu `.block span` áp nhầm vào `.help-term`.
3. Với card dạng lưới như `.term-grid` hoặc `.yaml-route-preview`, đặt card `position: relative`, chừa padding bên phải và neo `.help-term` bằng `position: absolute` thay vì dùng `float`.
4. Với icon chính của card, dùng selector trực tiếp như `.yaml-route-preview > .yaml-route-card > svg`; không dùng selector rộng `.yaml-route-preview svg` vì sẽ ăn nhầm SVG của tooltip.
5. Với text trong card, ưu tiên `.choice-card > span`, `.check-tile > span`, `.wizard-step-strip > span`; không dùng selector rộng nếu trong card có tooltip được JS append.
6. QA bằng desktop và mobile viewport, kiểm tra tất cả dấu `?` cùng kích thước, cùng mép phải, không chồng chữ và tooltip không tràn khỏi card.

## Stop job không dừng

1. Kiểm tra status job trong `GET /api/jobs`.
2. Nếu process vẫn chạy, thêm option force stop ở UI.
3. Không kill toàn bộ Python nếu chưa biết PID; job process được giữ trong `TrainingJob.process`.

## Thêm setting YOLO bị không nhận

1. Xác nhận tên tham số đúng theo Ultralytics.
2. Thêm vào schema workflow tương ứng trong `schemas.py`.
3. Thêm input frontend với `name` trùng.
4. Nếu là number, thêm vào `numberFields`.
5. Test bằng job config JSON, chưa cần chạy train thật.
