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

## Dependency/log endpoint trả 500 trên Windows

1. Xem `server-<port>.err.log`; nếu traceback nằm ở `importlib.invalidate_caches()` với `KeyError: ...python311.zip`, không phải lỗi PyTorch/Ultralytics.
2. `DependencyManager._invalidate_import_caches()` phải bắt lỗi cache import và không để status/log endpoint crash.
3. Gọi lại `GET /api/dependencies/status` và `GET /api/dependencies/torch/logs?kind=cpu&tail=5000`.
4. Browser QA lại nút `Kiểm tra lại`; console phải sạch warning/error và card vẫn khóa các nút trong lúc kiểm tra.

## Annotator bị vỡ khi đường dẫn nhãn dài

1. Kiểm tra `.annotation-current` trong toolbar stage; đường dẫn dài phải dùng `text-overflow: ellipsis`, không dùng `overflow-wrap:anywhere`.
2. Giữ `.annotation-current` chiếm nguyên hàng đầu của toolbar, các nút prev/delete/clear/next và select class nằm hàng dưới.
3. QA bằng path Windows dài như `C:\Users\...\runs\annotator-smoke\labels\train\sample-annotator.txt`.
4. Canvas vẫn phải có width/height đúng, box list không đè stage, và lưu nhãn trả toast `Đã lưu ... box`.

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

## Colab mở link xong rồi cell tự dừng

1. Nếu log cell có `NameError: name 'RESTART_REQUEST_PATH' is not defined`, kiểm tra import đầu file `start_colab.py`.
2. `start_colab.py` phải import cả `RESTART_REQUEST_PATH` và `RESTART_STATE_PATH` từ `yolo_gui.colab_runtime`.
3. Chạy smoke trực tiếp:

```powershell
@'
import time
import start_colab
print(start_colab.next_restart_request(set(), time.time()))
'@ | python -
```

4. Kết quả phải là `None` khi chưa có request mới, không được crash sau khi Cloudflare Tunnel đã mở.
5. Nếu cần test request thật, tạo file `logs/colab/restart-request.json` qua helper `create_restart_request()` rồi xóa lại runtime log sau khi kiểm tra; không stage `logs/`.

## Tooltip dấu hỏi bị lệch trong card

1. Kiểm tra selector nào đang gắn tooltip trong `enhanceInlineHelp()` của `frontend/app.js`.
2. Nếu icon được append vào `strong`, `h3` hoặc `h4`, tránh style cha kiểu `.block span` áp nhầm vào `.help-term`.
3. Với card dạng lưới như `.term-grid` hoặc `.yaml-route-preview`, đặt card `position: relative`, chừa padding bên phải và neo `.help-term` bằng `position: absolute` thay vì dùng `float`.
4. Với icon chính của card, dùng selector trực tiếp như `.yaml-route-preview > .yaml-route-card > svg`; không dùng selector rộng `.yaml-route-preview svg` vì sẽ ăn nhầm SVG của tooltip.
5. Với text trong card, ưu tiên `.choice-card > span`, `.check-tile > span`, `.wizard-step-strip > span`; không dùng selector rộng nếu trong card có tooltip được JS append.
6. QA bằng desktop và mobile viewport, kiểm tra tất cả dấu `?` cùng kích thước, cùng mép phải, không chồng chữ và tooltip không tràn khỏi card.

## Cloud không kết nối được Google Drive

1. Gọi `GET /api/cloud/status` để xem `enabled`, `has_api_key`, `cloud_key_valid`, `has_drive_auth`, `google_drive_folder_id`, `last_error` và `local_root`.
2. Nếu `has_api_key=false`, nhập Cloud API key trên GUI hoặc đặt env `YOLO_GUI_GOOGLE_API_KEY`.
3. Nếu `cloud_key_valid=false`, bấm `Kiểm tra Cloud key`; endpoint `POST /api/cloud/key/check` phải trả key hợp lệ trước khi hiện phần Drive Auth.
4. Nếu `has_drive_auth=false`, dán Google Drive OAuth access token hoặc đặt env `YOLO_GUI_DRIVE_ACCESS_TOKEN`.
5. Nếu Google trả `401/403`, kiểm tra token còn hạn và có quyền Drive. API key không thay thế được Drive Auth.
6. Kiểm tra `logs/cloud/cloud-settings.local.json` chỉ nằm local và không được stage. Không đưa key/token vào docs, README, changelog hoặc commit.
7. Kiểm tra `runs/cloud/google-drive/<folder-id>/<root_name>/cloud-manifest.json` sau khi connect thành công. Manifest chỉ được chứa metadata, không chứa API key hoặc Drive token.
8. Frontend phải khóa bước Google Drive cho tới khi `cloud_key_valid=true`; nếu vẫn bấm được, kiểm tra `updateCloudStepLocks()` và class `#cloudDriveAuthBlock.is-hidden`.

## Cloud Manager không áp dụng lại cấu hình đúng

1. Mở profile trong `runs/cloud/.../projects/<project_name>/configs/gui-settings/<profile_id>.json`.
2. Kiểm tra có đủ `train_ui`, `validate_ui`, `predict_ui`, `export_ui` và `fields` không.
3. Nếu radio/checkbox không đúng, kiểm tra `collectFormUiState()` và `applyFormUiState()`.
4. Nếu dataset hiển thị sai, kiểm tra `assignDatasetYaml()` có được gọi sau khi apply profile không.
5. Nếu model custom không điền, kiểm tra field `[data-custom-model]` của form tương ứng.
6. Nếu profile chứa secret, sửa `CloudManager._sanitize_profile_payload()` trước khi lưu profile mới.

## Cloud Storage không lưu log/config/output theo project

1. Gọi `GET /api/cloud/status` và kiểm tra `enabled=true`, `storage_enabled=true`, `project_name` đúng và `project_root` nằm dưới `runs/cloud/.../projects/<project_name>/`.
2. Nếu UI đã bật nhưng API trả `storage_enabled=false`, kiểm tra `cloudPayloadFromForm()` có gửi `storage_enabled` và `project_name` không.
3. Chạy một job nhỏ rồi mở `logs/workflow_jobs/<job_id>.log`; cuối log phải có `Cloud storage capture started` và sau đó là `Cloud storage snapshot` hoặc `Cloud storage capture failed`.
4. Nếu không có dòng Cloud Storage trong log, kiểm tra `TrainingManager(on_job_finished=cloud_manager.capture_job)` trong `app.py` và `_notify_job_finished()` trong `training_manager.py`.
5. Kiểm tra snapshot tại `runs/cloud/.../projects/<project_name>/jobs/<job_type>/<job_id>/`. Tối thiểu phải có `config/`, `logs/`, `job_dir/` và `cloud-job-manifest.json`.
6. Nếu output không được copy, mở config job và kiểm tra `project`/`name`; `CloudManager._job_output_roots()` tìm output theo `project/name*` tương tự artifact preview.
7. Nếu model/data/source không được copy, kiểm tra đường dẫn đó có tồn tại local không. URL, camera `0` và path không tồn tại sẽ bị bỏ qua.
8. Đảm bảo `runs/` và `logs/` vẫn bị `.gitignore`; không stage snapshot, log hoặc API key.

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
