# Project Logic

## Mục tiêu logic

Người dùng không phải nhớ lệnh CLI như `yolo train ...`, `yolo predict ...`, `yolo export ...`, không phải tự viết `data.yaml`, không phải hiểu `device=0`, `epochs`, `batch`, `conf`, `iou` trước khi dùng. UI gom thao tác thành lựa chọn GUI thân thiện, frontend map lựa chọn đó thành dict tham số, job runner gọi Python API của Ultralytics trong subprocess.

## Nguyên tắc 100% GUI

- Workflow chính chỉ dùng nhãn nghiệp vụ: Huấn luyện, Đánh giá, Dự đoán, Đóng gói, Dữ liệu.
- Trường bắt buộc của người dùng là chọn thư mục/file, chọn loại bài toán, chọn preset, bấm chạy.
- Tham số kỹ thuật vẫn được giữ trong schema/backend nhưng không được biến thành điều kiện bắt người dùng cuối phải biết.
- Nếu cần thêm setting mới, ưu tiên thêm preset/card/toggle có tiếng Việt dễ hiểu rồi map sang field YOLO trong `frontend/app.js`.
- Chỉ để thông số thô trong `details` nâng cao và phải bảo đảm workflow chạy được khi người dùng không mở phần đó.
- Mỗi nhãn, option card và checkbox quan trọng phải có giải thích nhanh. `frontend/app.js` dùng `helpCatalog` và `enhanceInlineHelp()` để gắn tooltip tự động, tránh phải viết lại markup lặp lại ở từng field.
- Nội dung hướng dẫn dài nằm ở tab `Hướng dẫn` và `docs/USER_GUIDE.md`, không nhồi vào workflow chính.

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
   - Khi frontend đang gọi `/api/dependencies/status`, card môi trường đặt `aria-busy=true` và khóa các nút cài/kiểm tra lại để tránh người dùng bấm nhiều lần trong lúc dữ liệu chưa rõ.
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

Riêng workflow `Dự đoán`: sau khi tạo job, frontend không tự chuyển sang tab `Tiến trình`. Nó giữ người dùng ở tab `Dự đoán`, hiển thị panel `Kết quả dự đoán`, poll job hiện tại và gọi `GET /api/jobs/{job_id}/artifacts` để lấy ảnh/video output. Khi người dùng cần log đầy đủ, nút trong panel mới chuyển sang tab `Tiến trình`.

## Health check frontend

- Khi app khởi động, `frontend/app.js` gọi `startHealthCheckCron()`.
- Hàm này gọi `/api/health` ngay lập tức, sau đó dùng `window.setInterval(..., 30000)` để kiểm tra lại mỗi 30 giây.
- Kết quả không hiện toast liên tục; chỉ cập nhật badge `healthStatus` trong sidebar card `Máy hiện tại`.
- Nếu backend trả `ok: true`, badge là `Online`. Nếu request lỗi, timeout hoặc backend trả lỗi, badge chuyển sang `Mất kết nối`.

## Sidebar system status

- `GET /api/dependencies/status` trả thêm `runtime`: `Local` hoặc `Google Colab`.
- Frontend dùng runtime này để render thẻ máy hiện tại. Local giữ title `Máy hiện tại`; Colab đổi thành `Colab hiện tại`.
- Trên Colab, không chỉ hiển thị `CUDA: chưa sẵn sàng`; UI phải nói rõ đang ở CPU runtime, vẫn chạy được nhưng chậm, và hướng dẫn bật GPU bằng `Runtime > Change runtime type > GPU`, sau đó chạy lại cell YOLO GUI.
- `loadDependencyStatus()` cũng gọi `renderSystemStatus(payload)`, nên thẻ sidebar và tab `Cài đặt` dùng cùng một payload môi trường, không bị lệch khi `/api/version` chạy chậm hoặc lỗi mạng.

## Phiên bản và cập nhật

Tab `Phiên bản` dùng `VersionManager` để gom thông tin:

- Version hiện tại lấy từ `yolo_gui.__version__`.
- Môi trường đang chạy trả về `Local` hoặc `Google Colab`.
- Changelog đọc từ `CHANGELOG.md`.
- Commit local lấy bằng `git rev-parse`.
- Commit mới trên GitHub lấy bằng `git ls-remote`.
- Version mới nhất cố đọc từ file `yolo_gui/__init__.py` trên raw GitHub.

Frontend gọi:

- `GET /api/version`: lấy trạng thái version, commit, changelog và cờ `update_available`.
- `POST /api/version/update`: chạy `git pull --ff-only <remote> <branch>`.
- `POST /api/version/save-and-update`: khi repo có file đã sửa, GUI chạy `git stash push --include-untracked` để cất tạm thay đổi rồi mới `git pull --ff-only`.

Sidebar header cũng dùng payload từ `GET /api/version` để hiển thị nhanh bản đang chạy dưới tên `YOLO GUI`, nên người dùng không cần mở tab `Phiên bản` chỉ để biết đang ở bản nào.

Nếu repo đang có file đã sửa (`git status --porcelain` không rỗng), nút cập nhật thường bị khóa và GUI hiện nút `Sao lưu rồi cập nhật`. Luồng này dùng Git stash để không ghi đè thay đổi local. Sau khi update, GUI báo người dùng tải lại trang; nếu backend Python thay đổi, cần restart app hoặc chạy lại cell Colab.

Riêng Colab: sau khi update source, `start_colab.py` giữ nguyên process `cloudflared`, chỉ restart uvicorn trên cùng port. Vì vậy link `trycloudflare.com` không đổi; khi server mới sẵn sàng, GUI tự tải lại hoặc người dùng bấm `Tải lại GUI` trong panel `Colab tunnel`.

## Luồng Google Colab

Colab dùng cùng backend/frontend với Windows, chỉ khác cách mở URL:

1. Người dùng mở `YOLO_GUI_Colab.ipynb` hoặc clone repo trong Colab.
2. Cell chạy `python start_colab.py`.
3. `start_colab.py` cài `requirements.txt`, tải `cloudflared` vào `.colab/` nếu máy chưa có, rồi chạy:
   - `python -m uvicorn yolo_gui.app:app --host 127.0.0.1 --port 8765`
   - `cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8765`
4. Script parse link `trycloudflare.com` từ output của Cloudflare Tunnel và hiển thị nút mở GUI trong notebook.
5. Người dùng thao tác trong GUI giống Windows. Cell Colab phải tiếp tục chạy để server và tunnel còn sống.

Không thêm API launcher riêng cho Colab. Mục tiêu là giữ một codepath GUI, còn `start_colab.py` chỉ là launcher/tunnel wrapper. Các API runtime như `/api/version` và `/api/dependencies/status` vẫn trả cờ Colab để frontend đổi wording cho đúng người dùng notebook.

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

Riêng Google Colab không hỗ trợ webcam trực tiếp qua `source=0`. Frontend dùng runtime từ `/api/version` và `/api/dependencies/status` để khóa lựa chọn `Camera`; backend `POST /api/predict/start` cũng chặn source dạng số khi `VersionManager.is_colab_runtime()` trả true và trả lỗi tiếng Việt trước khi tạo job.

Predict artifact preview:

- `GET /api/jobs/{job_id}/artifacts`: liệt kê ảnh/video kết quả của job predict.
- `GET /api/jobs/{job_id}/artifacts/{artifact_id}`: serve file ảnh/video để frontend preview.
- Artifact id là path đã encode base64 URL-safe; backend chỉ resolve file nằm trong output root của job để tránh đọc file ngoài phạm vi.
- Output root ưu tiên `project/name*` trong config job, ví dụ `runs/predict/gui-predict*`, vì Ultralytics có thể tự tăng suffix nếu thư mục đã tồn tại.

## Dataset tools

- `POST /api/datasets/inspect`: đọc nhanh `data.yaml`.
- `POST /api/datasets/audit`: đếm ảnh/label theo split, phát hiện thiếu label, label rỗng, dòng label sai, class id vượt `names`.
- `POST /api/datasets/create-yaml`: tạo file cấu hình dataset từ thư mục gốc, thư mục ảnh học/kiểm tra/test và danh sách nhãn. Frontend Dataset Wizard gọi API này, rồi tự gán file vừa tạo vào Huấn luyện, Đánh giá, Kiểm tra và Đóng gói tối ưu.
- `POST /api/datasets/voc-to-yolo`: convert VOC XML sang YOLO txt.
- `POST /api/datasets/metrics`: tính precision/recall/F1 từ folder label prediction và ground truth.

## Annotation tools

Panel `Vẽ bounding box như LabelImg` trong tab `Dữ liệu` giúp người dùng tạo nhãn YOLO ngay trong web GUI:

- `POST /api/annotations/images`: nhận `image_dir`, `label_dir` tùy chọn, liệt kê ảnh hỗ trợ và đếm số box đã có trong file nhãn tương ứng.
- `POST /api/annotations/read`: đọc file `.txt` YOLO của một ảnh và trả về box dạng normalized `class_id, x, y, w, h`.
- `POST /api/annotations/save`: ghi lại box đang có trên canvas vào file `.txt` YOLO.
- `GET /api/annotations/image`: serve ảnh cho canvas frontend; endpoint chỉ nhận extension ảnh nằm trong danh sách hỗ trợ.

Quy tắc suy ra file nhãn nằm trong `annotation_tools.py`: nếu người dùng chọn `label_dir`, nhãn lưu theo đường dẫn tương đối của ảnh trong `image_dir`; nếu không chọn, path có segment `images` sẽ được đổi sang `labels`, ví dụ `images/train/a.jpg` -> `labels/train/a.txt`. Nếu path không có segment `images`, GUI dùng folder `labels` bên cạnh folder ảnh.

Frontend khóa cụm annotator trong lúc mở folder hoặc lưu nhãn để tránh click chồng. Canvas lưu tọa độ theo chuẩn YOLO normalized, nên kích thước ảnh hiển thị trên màn hình không làm thay đổi nhãn.

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
- `version_manager.py`: chỉ dùng git để kiểm tra/cập nhật source; không chạy lệnh destructive như reset/checkout.
- `frontend/app.js`: workflow mới phải có endpoint, form id, number field, handler start và mapping GUI -> tham số YOLO. Không thêm ô JSON/CLI thô vào workflow chính.
- `frontend/index.html` + `frontend/styles.css`: wizard hoặc form dài phải chia theo cụm thao tác, có cột hành động rõ, không rải field ngang toàn màn hình.
- `start_colab.py`: chỉ quản lý cài dependency, uvicorn và Cloudflare Tunnel; không nhân đôi logic train/dataset của backend.
