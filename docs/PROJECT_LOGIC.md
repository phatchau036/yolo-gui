# Project Logic

## Mục tiêu logic

Người dùng không phải nhớ lệnh CLI như `yolo train ...`, `yolo predict ...`, `yolo export ...`, không phải tự viết `data.yaml`, không phải hiểu `device=0`, `epochs`, `batch`, `conf`, `iou` trước khi dùng. UI gom thao tác thành lựa chọn GUI thân thiện, frontend map lựa chọn đó thành dict tham số, job runner gọi Python API của Ultralytics trong subprocess.

## Nguyên tắc 100% GUI

- Workflow chính chỉ dùng nhãn nghiệp vụ: Huấn luyện, Đánh giá, Dự đoán, Đóng gói, Dữ liệu.
- Trường bắt buộc của người dùng là chọn thư mục/file, chọn loại bài toán, chọn preset, bấm chạy.
- Tham số kỹ thuật vẫn được giữ trong schema/backend nhưng không được biến thành điều kiện bắt người dùng cuối phải biết.
- Nếu cần thêm setting mới, ưu tiên thêm preset/card/toggle có tiếng Việt dễ hiểu rồi map sang field YOLO trong `frontend/app.js`.
- Chỉ để thông số thô trong `details` nâng cao và phải bảo đảm workflow chạy được khi người dùng không mở phần đó.

## Luồng chung

1. Người dùng mở `http://127.0.0.1:8765`.
2. Frontend gọi:
   - `GET /api/dependencies/status` để hiện Python, pip, NVIDIA/CUDA, PyTorch và Ultralytics.
   - `GET /api/models` để nạp model preset.
   - `GET /api/jobs` để nạp job/log hiện có trong phiên server.
3. Nếu thiếu dependency, người dùng bấm nút cài trên GUI:
   - `Cài Ultralytics`: `python -m pip install ultralytics>=8.3.0`
   - `Cài PyTorch CUDA`: `python -m pip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121`
   - `Cài PyTorch CPU`: `python -m pip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu`
4. `DependencyManager` spawn pip install và ghi log vào `logs/dependency_installs/`.
5. Người dùng chọn workflow: Huấn luyện, Đánh giá, Dự đoán hoặc Đóng gói.
6. Frontend gom form thành payload nội bộ và gọi endpoint tương ứng:
   - `POST /api/train/start`
   - `POST /api/val/start`
   - `POST /api/predict/start`
   - `POST /api/export/start`
7. `TrainingManager` tạo job:
   - Job id dạng `YYYYMMDD-HHMMSS-<job_type>-xxxxxxxx`.
   - Ghi config vào `runs/gui_jobs/<job_id>/<job_type>_config.json`.
   - Spawn `python -m yolo_gui.workflow_runner --config ...`.
   - Pipe stdout/stderr vào `logs/workflow_jobs/<job_id>.log`.
8. Frontend poll:
   - `GET /api/jobs`
   - `GET /api/jobs/{job_id}/logs`
9. Nếu cần dừng, frontend gọi `POST /api/jobs/{job_id}/stop`.

## Automation GUI

Automation dùng `AutomationManager` để chạy các kịch bản nhiều bước từ cấu hình GUI hiện tại:

- `prepare_dataset`: tạo/gán dataset config và audit dữ liệu.
- `train_ready`: chuẩn bị dataset nếu có thông tin wizard, audit, rồi chạy train.
- `evaluate_export`: validate model đang chọn rồi export.
- `full_pipeline`: dataset -> audit -> train -> validate -> export.

Frontend gọi:

- `GET /api/automations` để nạp danh sách automation.
- `POST /api/automations/start` để tạo automation mới.
- `GET /api/automations/{automation_id}/logs` để đọc timeline/log.

Không chạy automation trong request thread. Manager spawn background thread, ghi log vào `logs/automations/` và cập nhật trạng thái từng step để GUI hiển thị timeline.

## Mapping workflow

- `train`: `YOLO(model, task=task).train(**args)`
- `val`: `YOLO(model, task=task).val(**args)`
- `predict`: `YOLO(model, task=task).predict(**args)`
- `export`: `YOLO(model).export(**args)`

`workflow_runner.py` normalize `device` dạng `"0,1"` thành list GPU và normalize `source="0"` thành camera index `0`.

## Dataset tools

- `POST /api/datasets/inspect`: đọc nhanh `data.yaml`.
- `POST /api/datasets/audit`: đếm ảnh/label theo split, phát hiện thiếu label, label rỗng, dòng label sai, class id vượt `names`.
- `POST /api/datasets/create-yaml`: tạo file cấu hình dataset từ thư mục gốc, thư mục ảnh học/kiểm tra/test và danh sách nhãn. Frontend Dataset Wizard gọi API này, rồi tự gán file vừa tạo vào Huấn luyện, Đánh giá, Kiểm tra và Đóng gói tối ưu.
- `POST /api/datasets/voc-to-yolo`: convert VOC XML sang YOLO txt.
- `POST /api/datasets/metrics`: tính precision/recall/F1 từ folder label prediction và ground truth.

## System report

`POST /api/system/report` tạo:

- `logs/system_reports/system-report-<timestamp>.md`
- `logs/system_reports/system-report-<timestamp>.json`

Report chứa Python executable, platform, dependency status, GPU/CUDA, package version và mẫu `pip freeze`.

## Vì sao dùng subprocess

Workflow YOLO có thể chạy lâu, chiếm GPU và in log liên tục. Subprocess giúp:

- Stop job bằng `terminate()` hoặc `kill()`.
- Tách crash của Ultralytics khỏi web server.
- Log stdout/stderr đầy đủ để debug.
- Mở rộng thành queue nhiều job sau này.

## Quy tắc mapping setting

- Setting phổ biến có field riêng trong schema để backend rõ ràng.
- UI chính không gọi các field này bằng tên kỹ thuật. Ví dụ `ui_train_preset=balanced` map thành `epochs=100`, `imgsz=640`, `batch=16`, `patience=40`.
- Device dùng radio `Tự động`, `Ưu tiên GPU`, `Chạy CPU`; frontend map sang bỏ trống, `0`, hoặc `cpu`.
- Camera dùng lựa chọn `Camera mặc định`; frontend map sang source phù hợp cho runner.
- `extra_args` chỉ còn là hook nội bộ, không hiển thị cho người dùng cuối.
- Không truyền `None` hoặc chuỗi rỗng vào runner.

## Các điểm nóng cần cẩn thận

- `schemas.py`: field type phải khớp kiểu Ultralytics nhận.
- `workflow_runner.py`: luôn in full traceback.
- `training_manager.py`: không làm mất log khi subprocess lỗi.
- `dataset_tools.py`: không xóa hoặc sửa dataset gốc trừ endpoint tạo YAML/convert được người dùng bấm rõ ràng.
- `dependency_manager.py`: log cài đặt và trạng thái CUDA phải hiện trên GUI.
- `frontend/app.js`: workflow mới phải có endpoint, form id, number field, handler start và mapping GUI -> tham số YOLO. Không thêm ô JSON/CLI thô vào workflow chính.
- `frontend/index.html` + `frontend/styles.css`: wizard hoặc form dài phải chia theo cụm thao tác, có cột hành động rõ, không rải field ngang toàn màn hình.
