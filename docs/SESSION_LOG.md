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

## 2026-05-12 - JS health check 30 giây

- Nhận feedback: cần JS health check theo cron 30 giây một lần.
- Bump version lên `0.4.3`.
- Thêm `startHealthCheckCron()` trong `frontend/app.js`: gọi `/api/health` ngay khi mở app và lặp lại bằng `window.setInterval(..., 30000)`.
- Thêm badge `healthStatus` trong sidebar card `Máy hiện tại`; badge hiển thị `Online`, `Mất kết nối` hoặc `Đang kiểm tra`.
- Health check lỗi không hiện toast liên tục để tránh làm phiền người dùng.

## 2026-05-12 - Path picker, dependency lock và Colab camera guard

- Nhận feedback: cụm `Đường dẫn` bị xấu, chữ `Mở`/`Gán` bị vỡ dòng.
- Nhận feedback: khi GUI đang kiểm tra môi trường thì phải khóa nút để tránh người dùng bấm lung tung.
- Nhận log Colab: predict camera lỗi `NotImplementedError: 'source=0' webcam not supported in Colab and Kaggle notebooks`.
- Bump version lên `0.4.4`.
- Đổi nút `Mở`/`Gán` trong path picker thành icon button có `title` và `aria-label`.
- `loadDependencyStatus()` render trạng thái checking trước khi gọi API, đặt `aria-busy=true` và disable các nút cài/kiểm tra lại.
- Frontend khóa lựa chọn `Camera` khi runtime từ `/api/version` là `Google Colab`.
- Backend `POST /api/predict/start` chặn source dạng số trên Colab và trả lỗi tiếng Việt trước khi tạo job.

## 2026-05-12 - Làm rõ trạng thái CPU/GPU trên Colab

- Nhận feedback: chạy trên Colab sidebar vẫn hiện kiểu local với `CUDA: chưa sẵn sàng` và `Không thấy NVIDIA/CUDA GPU`, khiến người dùng không biết phải làm gì.
- Bump version lên `0.4.5`.
- `GET /api/dependencies/status` trả thêm `runtime` để frontend biết đang chạy `Local` hay `Google Colab` ngay trong payload dependency.
- Frontend đổi title thẻ sidebar thành `Colab hiện tại` khi runtime là Google Colab.
- Thẻ Colab hiển thị:
  - Môi trường: Google Colab.
  - Ultralytics/PyTorch đang cài hay chưa.
  - Chế độ train: GPU sẵn sàng hoặc CPU vẫn chạy được nhưng chậm.
  - Hướng dẫn bật GPU Colab bằng `Runtime > Change runtime type > GPU`, rồi chạy lại cell YOLO GUI.
- Mobile không ẩn thẻ này nữa; CSS chuyển thẻ sang dạng gọn để người dùng Colab màn hình hẹp vẫn thấy hướng dẫn CPU/GPU.
- Tab `Cài đặt` cũng đổi câu hướng dẫn khi Colab đang ở CPU runtime để người dùng không hiểu nhầm là phải tự sửa driver bằng CLI.
- `boot()` không còn phụ thuộc riêng vào `/api/version` để biết Colab; dependency payload tự có `runtime`, nên thẻ sidebar render đúng ngay cả khi các API chạy song song.

## 2026-05-12 - Predict preview và nút sao lưu cập nhật

- Nhận feedback: tab `Dự đoán` không nên tự nhảy qua tab log; người dùng cần thấy thanh đang chạy và xem ảnh kết quả ngay tại tab dự đoán.
- Nhận feedback: tab `Phiên bản` báo `Cần lưu thay đổi` nhưng thiếu nút để người không biết git xử lý.
- Nhận feedback: panel `Tạo data.yaml` bị lỗi hiển thị, tooltip dấu hỏi chồng lên chữ `Dataset/Classes/data.yaml`.
- Bump version lên `0.4.6`.
- Thêm `POST /api/version/save-and-update`: dùng `git stash push --include-untracked` để cất tạm thay đổi local, sau đó chạy `git pull --ff-only`.
- Frontend hiển thị nút `Sao lưu rồi cập nhật` khi có bản mới nhưng repo đang dirty.
- Thêm `GET /api/jobs/{job_id}/artifacts` và `GET /api/jobs/{job_id}/artifacts/{artifact_id}` để liệt kê/serve ảnh hoặc video output của job.
- `TrainingManager.list_artifacts()` tìm ảnh/video trong `runs/predict/<name>*` và `job_dir`, sắp theo thời gian sửa mới nhất.
- Tab `Dự đoán` thêm panel `Kết quả dự đoán`: đang chạy có progress bar, xong thì hiện preview ảnh/video, lỗi thì giữ người dùng tại tab đó và cho nút xem log đầy đủ.
- Sửa `.yaml-route-preview` thành grid 2 hàng rõ ràng để icon, tiêu đề, tooltip và mô tả không chồng lên nhau.

## 2026-05-12 - Sửa UI cụm đường dẫn path browser

- Nhận feedback: cụm `Đường dẫn` bị vỡ chữ trong hai nút hành động, hiển thị thành `M ở` và `G án`.
- Bump version lên `0.4.7`.
- Harden CSS `.path-action-button`:
  - Button chỉ còn vùng 42x40px.
  - Ẩn mọi `span:not(.icon)` nếu markup/cache cũ còn text.
  - Đặt `font-size: 0`, `line-height: 0`, `overflow: hidden`, `white-space: nowrap` để text node không thể làm vỡ layout.
  - Icon SVG giữ 18x18px ổn định.
- Cụm input đường dẫn dùng grid `input + 2 icon button`, không làm hàng cao bất thường.

## 2026-05-12 - Căn lại dấu hỏi trong mục khái niệm

- Nhận feedback: các dấu `?` trong mục `Hướng dẫn > Các khái niệm hay gặp` chưa khớp nhau, nhìn lệch so với card.
- Bump version lên `0.4.8`.
- Sửa CSS `term-grid`:
  - Card khái niệm dùng `position: relative` và chừa sẵn vùng bên phải cho icon.
  - `.term-grid .help-term` được neo cố định ở góc phải trên của từng card thay vì dùng `float`.
  - Rule mô tả đổi từ `.term-grid span` sang `.term-grid > div > span` để không áp style mô tả nhầm vào icon tooltip.
- Tooltip trong term card được canh phải để không tràn khỏi mép card khi hover/focus.

## 2026-05-12 - Khóa nút dependency khi đang kiểm tra

- Nhận feedback: khi card `Môi trường YOLO` đang ở trạng thái `Đang kiểm tra`, các nút `Cài PyTorch CUDA`, `Cài PyTorch CPU`, `Cài Ultralytics`, `Kiểm tra lại` vẫn nhìn như bấm được.
- Bump version lên `0.4.9`.
- Thêm `dependencyStatusRequestSeq` để tránh race condition: response cũ của `/api/dependencies/status` không được render/mở khóa nếu đã có request mới hơn.
- Thêm `dependencyActionsLocked` và guard click cho các hành động cài dependency, tránh gửi nhiều lệnh cài trùng khi người dùng bấm nhanh.
- CSS thêm trạng thái `.dependency-card.is-action-locked` để khóa pointer event của cụm nút và làm nút mờ rõ ràng trong lúc `is-checking` hoặc `is-running`.
- Trạng thái lỗi vẫn chỉ mở lại nút `Kiểm tra lại`, còn các nút cài tiếp tục khóa cho tới khi kiểm tra môi trường thành công.

## 2026-05-12 - Update now ngay dưới version sidebar

- Nhận feedback: nếu phiên bản hiện tại thấp hơn bản mới nhất thì phải hiện luôn `Update now` ở vùng version dưới logo sidebar, không bắt người dùng tự vào tab `Phiên bản`.
- Bump version lên `0.4.10`.
- Thêm `brandUpdateButton` cạnh `brandVersion` trong sidebar header.
- `renderVersionStatus()` so sánh version dạng số bằng `compareVersionStrings()` để xử lý đúng `0.4.10` lớn hơn `0.4.9`.
- Khi có bản mới:
  - Repo sạch: nút sidebar gọi cùng luồng `updateVersion()`.
  - Repo có file đã sửa nhưng có thể stash: nút sidebar gọi `saveAndUpdateVersion()`.
  - Trường hợp không đủ điều kiện tự update: nút sidebar mở tab `Phiên bản` để người dùng xem lý do.
- CSS giữ nút nhỏ, dạng pill màu vàng, nằm trong header sidebar và không làm vỡ layout mobile.

## 2026-05-12 - Sidebar không tạo khoảng trống khi scroll

- Nhận feedback: khi scroll xuống trang dài, nền sidebar bên trái kết thúc giữa màn hình và tạo khoảng trống nền body.
- Bump version lên `0.4.11`.
- Desktop `.side-panel` đổi từ `position: sticky` sang `position: fixed` với `inset: 0 auto 0 0`, `width: 256px`, `height: 100dvh`.
- `.app-shell` vẫn giữ cột trái 256px và `.workspace` được ghim vào cột 2 để nội dung không chui dưới sidebar fixed.
- Media `max-width: 1180px` trả sidebar về `position: static`, `width: 100%`, `height: auto` để tablet/mobile vẫn dùng layout một cột.
- Sidebar vẫn `overflow-y: auto`, nên màn hình thấp vẫn cuộn nội bộ được mà nền không bị hụt.

## 2026-05-12 - Predict giữ tab và hiện kết quả tại chỗ

- Nhận feedback: ở phần `Dự đoán`, khi chạy không được nhảy qua log liền; phải hiện thanh đang chạy trong tab hiện tại và xong thì hiện ảnh ra luôn.
- Bump version lên `0.4.12`.
- Kiểm tra JS: `startWorkflow("predict")` đã return trước `setActiveSection("jobs")`, nên không còn chủ động chuyển qua tab log.
- Sửa lỗi layout chính: `#predictRunPanel` đang nằm ngoài `section-predict`, khiến người dùng ở tab `Dự đoán` không thấy thanh tiến trình sau khi bấm chạy.
- Chuyển `#predictRunPanel` vào trong `predictForm`, ngay dưới mô tả đầu form, và đổi sang class `predict-inline-panel`.
- CSS thêm `predict-inline-head` và style running/completed/failed cho panel inline để đang chạy có progress bar, hoàn tất có preview ảnh/video tại chỗ.
- Nút `Xem log đầy đủ` vẫn có trong panel nhưng chỉ là hành động phụ khi người dùng muốn xem chi tiết lỗi/log.

## 2026-05-12 - Sidebar desktop thấp không dùng scrollbar nội bộ

- Nhận feedback: card `Colab hiện tại` trong sidebar bị kẹt trong một vùng scroll riêng, nhìn như bị cắt ở đáy.
- Bump version lên `0.4.13`.
- Mở rộng media query compact sidebar từ `max-height: 760px` lên `max-height: 880px` để áp dụng cho màn laptop/desktop thấp như 768px.
- Giảm nhẹ `side-panel` padding/gap, nav item height/padding, system card padding và font/line-height trong `system-lines`.
- Rút gọn các dòng sidebar như `Train`, `GPU`, `Bật GPU` để card không bị quấn nhiều dòng; hướng dẫn dài vẫn giữ trong tab `Cài đặt`.
- Mục tiêu: sidebar vẫn fixed theo viewport, nhưng toàn bộ nội dung chính của sidebar vừa trong chiều cao màn hình phổ biến, không sinh scrollbar nội bộ khó chịu.

## 2026-05-12 - Fix triệt để tooltip route preview Dataset

- Nhận feedback: panel `Tạo data.yaml` trong Dataset Wizard bị vỡ form, dấu `?` ở các dòng `Dataset`, `Classes`, `data.yaml` bị kéo thành pill dọc.
- Bump version lên `0.4.14`.
- Nguyên nhân: CSS `.yaml-route-preview span` và `.yaml-route-preview svg` bắt cả phần tử tooltip do `enhanceInlineHelp()` append vào `strong`, nên tooltip bị xem như một card/icon route.
- Sửa markup route preview thành `yaml-route-card` + `yaml-route-copy` để phân tách vùng icon, chữ và tooltip.
- CSS đổi sang selector trực tiếp `.yaml-route-preview > .yaml-route-card > svg`, chừa padding phải cho tooltip và neo `.help-term` bằng `position: absolute`.
- Tooltip trong route preview canh phải, reset `grid-row/align-self` cho SVG bên trong để không bị rule icon route kế thừa.
- Browser QA desktop phát hiện thêm `.wizard-step-strip span` cũng bắt nhầm `.help-term`; đã đổi các selector nguy cơ sang direct-child: `.wizard-step-strip > span`, `.choice-card > span`, `.check-tile > span`.

## 2026-05-12 - Colab update handoff không cần tự restart ngay

- Nhận feedback: khi cập nhật trên Google Colab, người dùng không muốn phải tự tắt cell rồi chạy lại; cần giữ phiên cũ tới khi có link Cloudflare mới.
- Bump version lên `0.4.15`.
- Thêm `yolo_gui/colab_runtime.py` để chia sẻ file điều khiển `logs/colab/restart-request.json` và `logs/colab/restart-state.json` giữa backend và `start_colab.py`.
- Sau khi update source thành công, `VersionManager` tạo restart request nếu runtime là Google Colab.
- `start_colab.py` theo dõi request này, mở server mới trên port trống kế tiếp, mở Cloudflare Tunnel mới, ghi link mới vào restart state, hiển thị link trong cell, chờ thêm 25 giây rồi mới dừng tunnel/server cũ.
- Tab `Phiên bản` thêm fact `Source trong repo` và panel `Colab tunnel`; frontend poll `/api/version/restart-status` để hiện nút `Mở GUI mới` khi link mới đã sẵn sàng.
- Sửa logic version để không còn báo nhầm bản đang chạy là mới nhất khi source trên ổ đã được `git pull` lên bản mới nhưng backend chưa nạp lại.

## 2026-05-12 - Giữ nguyên link Cloudflare khi update Colab

- Nhận feedback: không cần tạo tunnel mới; chỉ cần giữ process `cloudflared`, restart server trên đúng port cũ thì link `trycloudflare.com` không đổi.
- Bump version lên `0.4.16`.
- Đổi `start_colab.py`: bỏ luồng mở server/tunnel mới trên port khác; khi có restart request thì dừng uvicorn cũ, mở lại uvicorn trên cùng port, giữ nguyên Cloudflare Tunnel.
- Restart state có `same_tunnel=true`, `tunnel_url` là link hiện tại và status `restarting -> ready`.
- Frontend `startColabRestartWatch()` poll lại trên link hiện tại; khi server sống lại sẽ tự `window.location.reload()` để nạp frontend/backend mới.
- Panel `Colab tunnel` đổi CTA thành `Tải lại GUI`, không còn hướng người dùng sang link mới.

## 2026-05-12 - Thêm annotator kiểu LabelImg trong GUI

- Nhận yêu cầu: người dùng muốn chọn folder ảnh và vẽ bounding box ngay trong UI, tương tự LabelImg, để workflow dataset vẫn 100% GUI.
- Bump version lên `0.4.17`.
- Thêm `yolo_gui/annotation_tools.py` để liệt kê ảnh, suy ra path label, đọc và lưu nhãn YOLO `.txt`.
- Thêm API `/api/annotations/images`, `/api/annotations/read`, `/api/annotations/save`, `/api/annotations/image`.
- Tab `Dữ liệu` có panel `Vẽ bounding box như LabelImg`: chọn thư mục ảnh, chọn thư mục nhãn tùy chọn, nhập class, mở danh sách ảnh, kéo chuột trên canvas để tạo box, chọn/xóa/clear box và lưu nhãn.
- Path browser có thêm target annotator và panel có nút `Chọn` để mở nhanh bộ duyệt thư mục, giảm thao tác nhập path thủ công.
- Frontend khóa các field/nút annotator khi đang mở folder hoặc lưu nhãn để tránh bấm chồng gây lệch state.
- Cập nhật README, changelog và docs handoff cho dev tiếp theo.
