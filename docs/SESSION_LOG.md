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

## 2026-05-12 - Automation và sửa bố cục Dataset Wizard

- Thêm `AutomationManager` và tab Automation:
  - `prepare_dataset`
  - `train_ready`
  - `evaluate_export`
  - `full_pipeline`
- Thêm API automation:
  - `GET /api/automations`
  - `GET /api/automations/templates`
  - `POST /api/automations/start`
  - `GET /api/automations/{automation_id}`
  - `GET /api/automations/{automation_id}/logs`
- Nhận feedback layout Dataset Wizard còn xấu vì form bị rải ngang.
- Sửa lại Dataset Wizard:
  - Header có 3 bước.
  - Cột trái là các cụm nhập liệu: nguồn dữ liệu, cấu trúc ảnh, nhãn nhận diện.
  - Cột phải là hành động tạo/gán `data.yaml` và tóm tắt luồng.
  - Preview output path đồng bộ theo thư mục dataset.
- Verify:
  - `python -m compileall -q .` pass.
  - Browser desktop `1920x900` không horizontal overflow, layout dataset cân bằng hơn.
  - Browser mobile `390x844` không horizontal overflow, wizard/action panel stack đúng.
  - Console browser không có warning/error.

## 2026-05-12 - Tooltip giải thích và trang hướng dẫn

- Nhận feedback: từng mục phải giải thích cho người dùng để làm gì, giảm thuật ngữ và có trang docs.
- Thêm tab `Hướng dẫn` trong app:
  - Luồng 4 bước từ chuẩn bị dữ liệu tới xem nhật ký.
  - Giải thích các khái niệm hay gặp như dataset, model, GPU, CUDA, huấn luyện, đánh giá, dự đoán, đóng gói, automation.
  - Khuyến nghị lựa chọn cho người mới.
- Thêm hệ thống tooltip tự động trong `frontend/app.js`:
  - `helpCatalog` chứa giải thích tiếng Việt cho label/option/checkbox.
  - `enhanceInlineHelp()` tự gắn dấu hỏi cạnh các mục UI.
  - Các nút/tab có `title` để hover vẫn có mô tả mà không làm rối bố cục.
- Thêm `docs/USER_GUIDE.md` cho người dùng cuối.

## 2026-05-12 - Sửa sidebar bị vỡ form trên màn hình thấp

- Nhận feedback: form bị vỡ sau khi thêm nhiều mục điều hướng và thẻ `Máy hiện tại`.
- Nguyên nhân: desktop sidebar đang `height: 100vh`; khi nội dung cao hơn viewport, thẻ hệ thống bị tràn xuống dưới nền sidebar.
- Sửa trong `frontend/styles.css`:
  - `.side-panel` dùng `height: 100dvh`, `overflow-y: auto`, `overflow-x: hidden`.
  - `.system-card` không co giãn theo flex để tránh méo nội dung.
  - Thêm breakpoint desktop thấp `min-width: 1181px` và `max-height: 760px` để giảm padding, gap, kích thước nav và card.
  - Mobile/tablet giữ `position: static`, `height: auto`, `overflow: visible` để không tạo sidebar cuộn lồng không cần thiết.
- Browser QA trên `127.0.0.1:8767`:
  - Desktop thấp `1280x360`: sidebar có scroll nội bộ, nền sidebar phủ đủ chiều cao, không còn tràn visual ra ngoài.
  - Desktop thường `1920x900`: thẻ hệ thống nằm gọn trong sidebar, không có horizontal overflow.
  - Mobile `390x844`: sidebar trở lại layout thường, `system-card` ẩn như thiết kế cũ, không có horizontal overflow toàn trang.
  - Console browser không có warning/error.

## 2026-05-12 - Thêm ảnh demo cho GitHub README

- Nhận feedback: GitHub cần có hình ảnh demo để người xem thấy GUI ngay.
- Thêm thư mục `docs/assets/demo/` và 4 ảnh chụp:
  - `demo-train-desktop.png`: màn hình huấn luyện desktop.
  - `demo-dataset-wizard.png`: wizard chuẩn bị dataset và tạo cấu hình bằng GUI.
  - `demo-automation.png`: tab automation chạy YOLO theo kịch bản.
  - `demo-mobile.png`: layout mobile.
- Cập nhật `README.md` với mục `Demo giao diện`, nhúng ảnh bằng đường dẫn relative để GitHub render trực tiếp.
- Browser QA:
  - Chụp từ app local `127.0.0.1:8767`.
  - Desktop `1440x900` cho train/dataset/automation.
  - Mobile `390x844` cho layout mobile.

## 2026-05-12 - Ghi chú tác giả và phạm vi sử dụng

- Nhận feedback: phần license cần ghi rõ tác giả GUI là Châu Nghiệp Phát và dự án có thể tải/fork/update thêm nhưng không dùng thương mại.
- Cập nhật `README.md` mục `Ghi chú license`:
  - Tác giả phần GUI: Châu Nghiệp Phát.
  - Cho phép tải về, fork, học tập, thử nghiệm, chỉnh sửa hoặc đóng góp thêm.
  - Không được bán lại, đóng gói thành sản phẩm/dịch vụ thu phí, hoặc dùng thương mại nếu chưa có sự đồng ý của tác giả GUI.
  - Giữ ghi chú riêng về license Ultralytics YOLO AGPL-3.0/Enterprise để người dùng kiểm tra trước khi phân phối.

## 2026-05-12 - Hỗ trợ chạy YOLO GUI trên Google Colab

- Nhận feedback: dự án phải dùng được cả Windows và Google Colab; người dùng Colab không cần tự hiểu CLI, chỉ clone/chạy cell rồi mở GUI qua tunnel.
- Thêm `start_colab.py`:
  - Cài `requirements.txt`.
  - Tải `cloudflared` cho Linux x86_64 vào `.colab/` nếu chưa có.
  - Chạy `uvicorn yolo_gui.app:app` tại `127.0.0.1:8765`.
  - Mở Cloudflare Quick Tunnel tới GUI và parse link `trycloudflare.com`.
  - Hiển thị link/nút mở GUI trong notebook.
  - Ghi log vào `logs/colab/uvicorn.log` và `logs/colab/cloudflared.log`.
- Thêm `YOLO_GUI_Colab.ipynb` để người dùng Colab bấm chạy một cell.
- Thêm `docs/COLAB_GUIDE.md` hướng dẫn dùng Colab, cảnh báo link tunnel là tạm thời và public.
- Cập nhật `README.md` với nút Open in Colab, lệnh clone nhanh và link hướng dẫn.
- Cập nhật docs handoff: `INDEX`, `PROJECT_LOGIC`, `LOGGING_AND_DEBUGGING`, `USER_GUIDE`, `REPO_MAP`, `TODO_AND_STATUS`.

## 2026-05-12 - Tab Phiên bản, changelog và cập nhật từ GUI

- Nhận feedback: cần có mục phiên bản giống app có thông báo bản mới, changelog và nút update.
- Bump `yolo_gui.__version__` lên `0.4.0`.
- Thêm `CHANGELOG.md` để GUI hiển thị lịch sử thay đổi.
- Thêm `VersionManager`:
  - Đọc version hiện tại.
  - Kiểm tra commit local và commit mới trên GitHub.
  - Cố đọc latest version từ raw GitHub.
  - Chặn update khi repo có file đã sửa.
  - Update bằng `git pull --ff-only` và ghi log vào `logs/updates/`.
- Thêm API:
  - `GET /api/version`
  - `POST /api/version/update`
- Thêm tab `Phiên bản` trong sidebar/quick switch:
  - Hiển thị version hiện tại, latest version, branch, commit local/remote, remote URL.
  - Hiển thị changelog.
  - Có nút `Kiểm tra lại` và `Cập nhật ngay`.
- Cập nhật docs handoff: `README`, `REPO_MAP`, `PROJECT_LOGIC`, `LOGGING_AND_DEBUGGING`, `USER_GUIDE`, `PROJECT_MEMORY`, `TODO_AND_STATUS`.

## 2026-05-12 - Làm rõ tab Phiên bản cho Google Colab

- Nhận feedback: bản chạy Google Colab cũng phải có mục phiên bản/changelog/update.
- Vì Colab dùng cùng frontend/backend, tab `Phiên bản` đã dùng chung cho Windows và Colab.
- Bump version lên `0.4.1`.
- `VersionManager` trả thêm `runtime`: `Local` hoặc `Google Colab`.
- Sau khi update trên Colab, thông báo GUI hướng dẫn dừng cell, chạy lại cell `Chạy YOLO GUI` và mở link tunnel mới.
- Cập nhật `docs/COLAB_GUIDE.md`, `README.md`, `PROJECT_LOGIC.md`, `USER_GUIDE.md`, `CHANGELOG.md`.

## 2026-05-12 - QA mobile cho tab Phiên bản

- Kiểm tra tab `Phiên bản` trên server `127.0.0.1:8771`.
- Desktop xác nhận `v0.4.1`, môi trường `Local`, changelog đầu tiên `v0.4.1`, console không có warning/error.
- Chỉnh CSS mobile để nav và quick action chuyển sang grid, tránh cảm giác vỡ form hoặc phải kéo ngang để thấy nút chính.

## 2026-05-12 - Hiển thị version ở sidebar header

- Nhận feedback: muốn thấy phiên bản ngay dưới header của bar, bên dưới logo/tên `YOLO GUI`.
- Bump version lên `0.4.2`.
- Thêm `brandVersion` trong sidebar header và cập nhật bằng dữ liệu `/api/version` khi app load.
- Áp dụng cho cả Windows local và Google Colab vì cùng dùng frontend/backend version API.
