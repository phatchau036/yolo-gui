# Session Log

## 2026-05-12

- Nhận mục tiêu dự án: làm web GUI local để train YOLO thay cho CLI/code.
- Chọn kiến trúc FastAPI + frontend static + subprocess runner.
- Tạo scaffold backend/frontend/docs.
- Kết nối repo local với GitHub `phatchau036/yolo-gui`.
- Chạy server local ở `http://127.0.0.1:8765`.
- API smoke ban đầu:
  - `GET /api/health` pass.
  - `GET /api/models` pass.
  - `POST /api/datasets/inspect` với YAML tạm trả về `class_count=1`.
  - `POST /api/train/start` tạo job, ghi log, fail đúng kỳ vọng lúc đầu vì thiếu `ultralytics`.
- Cài `ultralytics 8.4.48` vào Python global đang chạy server.
- Xác minh môi trường có Torch `2.5.1+cu121`, CUDA available và GPU `NVIDIA GeForce RTX 3050 Laptop GPU` 4GB.
- Thêm luồng cài dependency ngay trên GUI:
  - `DependencyManager` chạy pip install và ghi `logs/dependency_installs/`.
  - Card trạng thái môi trường có Python/pip, NVIDIA/CUDA, PyTorch, Ultralytics.
  - Nút `Cài Ultralytics`, `Cài PyTorch CUDA`, `Cài PyTorch CPU`.
  - Train button chặn train nếu thiếu PyTorch/Ultralytics hoặc dependency đang cài.
- Playwright QA ban đầu:
  - Desktop layout pass sau khi đổi custom class từ `panel-block` sang `work-panel`.
  - Mobile không còn horizontal overflow.
  - Console sạch sau khi thêm favicon route.
  - Job list/log hiển thị traceback đầy đủ.

## 2026-05-12 - mở rộng thay CLI

- Đối chiếu repo tham khảo `SpreadKnowledge/YOLOX_train_detection_GUI`.
- Chọn các nhóm chức năng cần đưa vào bản web:
  - Train.
  - Validate.
  - Predict ảnh/folder/video/camera.
  - Export model.
  - Dataset audit.
  - VOC XML -> YOLO txt.
  - Metrics từ label YOLO.
  - System report.
- Thêm `workflow_runner.py` và chuyển job manager sang runner chung cho `train/val/predict/export`.
- Thêm schema:
  - `ValidateRequest`
  - `PredictRequest`
  - `ExportRequest`
  - `DatasetAuditRequest`
  - `DatasetYamlCreateRequest`
  - `VocConvertRequest`
  - `MetricsRequest`
- Thêm `dataset_tools.py`:
  - Inspect/audit `data.yaml`.
  - Tạo `data.yaml`.
  - Convert VOC XML sang YOLO txt.
  - Tính precision/recall/F1 từ label YOLO.
- Thêm `system_report.py` tạo report `.md` và `.json`.
- Thêm API:
  - `POST /api/val/start`
  - `POST /api/predict/start`
  - `POST /api/export/start`
  - `GET /api/jobs`
  - `GET /api/jobs/{job_id}/logs`
  - `POST /api/jobs/{job_id}/stop`
  - `POST /api/datasets/audit`
  - `POST /api/datasets/create-yaml`
  - `POST /api/datasets/voc-to-yolo`
  - `POST /api/datasets/metrics`
  - `POST /api/system/report`
- Refactor frontend thành dashboard nhiều tab: Train, Validate, Predict, Export, Dataset, System, Jobs.
- Cập nhật docs handoff sau khi mở rộng.

### Ghi chú kỹ thuật

- `python -m compileall -q yolo_gui` đã pass sau backend mới.
- `node --check frontend/app.js` đã pass sau frontend mới.
- API smoke trên `127.0.0.1:8766` đã pass cho dataset inspect/audit, tạo YAML, VOC convert, metrics, system report và export job lỗi có chủ ý với full traceback.
- Browser QA desktop/mobile đã pass: console sạch và không có horizontal overflow.
- Chưa chạy train/val/predict/export thật với dataset/model hợp lệ vì chưa có dataset/model thật được user chọn.

## 2026-05-12 - polish giao diện

- Nhận feedback giao diện còn xấu.
- Giữ nguyên backend, chỉ polish frontend:
  - Thêm quick workflow cards phía trên để chuyển nhanh Train/Predict/Export/Dataset.
  - Đồng bộ active state giữa sidebar và quick cards.
  - Thu gọn path browser vào `details` để dashboard chính đỡ nặng.
  - Làm lại visual system trong `styles.css`: nền, sidebar, card, spacing, focus state, button, form density, status cards.
  - Mobile sidebar chuyển sang thanh nav ngang, quick workflow cũng cuộn ngang để không chiếm quá nhiều chiều cao.
- Verify lại trên browser ở `127.0.0.1:8766`: desktop/mobile không horizontal overflow, quick card chuyển tab đúng, console sạch.

## 2026-05-12 - Dataset YAML wizard

- Nhận feedback: không nên bắt người dùng tự tạo `C:\datasets\my-dataset\data.yaml`.
- Nâng Dataset tab thành wizard tạo YAML:
  - Chọn root dataset, output YAML, train/val/test split và class list trong GUI.
  - Nút `Layout YOLO` điền nhanh `images/train`, `images/val`, `images/test`.
  - Nút `Tạo YAML` trong Train chuyển thẳng sang Dataset wizard.
  - Sau khi tạo, GUI tự gán YAML vào Train, Validate, Audit và Export calibration.
  - Path browser có thêm target cho YAML output/root/train/val/test.
- Backend `create_dataset_yaml` đổi `path` sang dấu `/` để YAML Windows dễ dùng hơn.
- Verify:
  - `node --check frontend/app.js` pass.
  - `python -m compileall -q yolo_gui` pass.
  - API tạo YAML trên `127.0.0.1:8766` pass.
  - Browser xác nhận wizard tồn tại, tự gán form đúng, desktop/mobile không horizontal overflow, console sạch.

## 2026-05-12 - 100% GUI cho người dùng cuối

- Nhận feedback: dự án phải thuần GUI, không có điểm nào bắt người dùng hiểu kỹ thuật.
- Chuyển wording workflow sang tiếng Việt nghiệp vụ:
  - Huấn luyện.
  - Đánh giá.
  - Dự đoán.
  - Đóng gói.
  - Dữ liệu.
  - Cài đặt.
  - Tiến trình.
- Refactor form chính:
  - Train dùng card preset `Test nhanh`, `Cân bằng`, `Train kỹ`, `Tự tinh chỉnh`.
  - Validate dùng card `Nhanh`, `Chuẩn`, `Kỹ`, `Tự tinh chỉnh`.
  - Predict dùng card nguồn `Ảnh hoặc video`, `Thư mục ảnh`, `Camera`; camera map nội bộ sang source phù hợp.
  - Export dùng mục đích sử dụng thay cho danh sách format thô.
  - Device dùng `Tự động`, `Ưu tiên GPU`, `Chạy CPU`.
- Dataset wizard ẩn output `data.yaml` khỏi luồng chính; người dùng chỉ chọn thư mục dataset, thư mục ảnh và tên nhãn.
- Xóa textarea `Extra args JSON` khỏi UI, chỉ còn hook ẩn trong DOM để backend contract không đổi.
- `frontend/app.js` thêm mapping GUI preset sang tham số YOLO, validate lỗi bằng câu dễ hiểu, và format kết quả dataset/report thành text thân thiện thay vì JSON thô.
- Verify tĩnh:
  - `node --check frontend/app.js` pass.
  - `python -m compileall -q yolo_gui` pass.
- Browser QA trên `127.0.0.1:8766`:
  - Desktop và mobile không có horizontal overflow.
  - Console không có warning/error.
  - Dataset wizard tạo cấu hình tự động và gán lại vào Train/Audit đúng.
  - Predict camera card map thành source nội bộ đúng, không lộ yêu cầu nhập `0`.
  - Kiểm tra text hiển thị không còn `Extra args JSON`, `data.yaml`, `YAML output`, `Device`, `Epochs`, `Batch`, `Conf`, `IoU` ở workflow chính.
