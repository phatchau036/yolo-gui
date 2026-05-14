# Changelog

## v0.4.22 - 2026-05-14

- Sửa lỗi Google Colab mở Cloudflare Tunnel xong rồi cell tự dừng vì `start_colab.py` thiếu import `RESTART_REQUEST_PATH`.
- Vòng theo dõi restart sau update Colab giờ đọc đúng `logs/colab/restart-request.json`, nên có thể giữ nguyên tunnel/link hiện tại và restart server trên cùng port như thiết kế.
- Bổ sung smoke test trực tiếp cho `next_restart_request()` để bắt lỗi runtime global thiếu import trước khi push.

## v0.4.21 - 2026-05-13

- Thêm `Tên project` trong Cloud workspace để tách dữ liệu theo từng project thay vì dùng chung một mirror phẳng.
- Thêm toggle `Bật Cloud Storage`: khi bật, mỗi job train/val/predict/export kết thúc sẽ tự snapshot config, log, thư mục job, output, model/data/source tham chiếu và manifest vào `runs/cloud/.../projects/<project_name>/jobs/...`.
- Cloud Manager chuyển profile sang workspace theo project và hiển thị thêm nhóm `Job snapshots` để kiểm tra nhanh job nào đã được lưu.
- API `/api/cloud/status` và `/api/cloud/manager` trả thêm `storage_enabled`, `project_name`, `project_root`; `POST /api/cloud/settings` nhận thêm `project_name` và `storage_enabled`.
- `TrainingManager` có callback sau khi job kết thúc để Cloud Storage chạy nền an toàn; nếu capture lỗi, job vẫn giữ trạng thái thật và lỗi chỉ ghi vào log job.
- Frontend cache-busting lên `0.4.21-cloud-storage.1`, có tooltip cho `Tên project`, `Bật Cloud Storage` và `Project workspace`.

## v0.4.20 - 2026-05-13

- Mở rộng Cloud workspace thành `Cloud Manager`: lưu profile cấu hình GUI hiện tại và áp dụng lại bằng một nút.
- Profile lưu các lựa chọn train/validate/predict/export, dataset wizard, annotator, model custom, nguồn ảnh/video và các preset GUI.
- Thêm API `/api/cloud/manager`, `POST /api/cloud/profiles`, `DELETE /api/cloud/profiles/{profile_id}`.
- Cloud Manager quét local mirror để hiển thị nhanh model, file config, ảnh, dataset folder, run và export trong các folder chuẩn.
- Từ thư viện Cloud có thể bấm dùng model cho Train/Predict/Export, dùng ảnh làm nguồn Predict hoặc dùng folder dataset trong wizard.
- Profile được ghi trong `runs/cloud/.../configs/gui-settings/`, không chứa Google API key/token/password.

## v0.4.19 - 2026-05-13

- Thêm Cloud workspace trong tab `Cài đặt`: bật Cloud mode, nhập Google API key, nhập Google Drive folder ID/link và bấm `Connect Google Drive` ngay trên GUI.
- Thêm chuẩn thư mục Cloud dùng chung giữa Windows/local và Google Colab: `datasets`, `models`, `runs`, `annotations`, `configs`, `exports`, `logs`.
- Backend có `CloudManager` và API `/api/cloud/status`, `/api/cloud/settings`, `/api/cloud/google-drive/connect` để lưu setting local, đọc metadata Google Drive và tạo mirror/manifest.
- API key không được ghi vào GitHub; GUI chỉ lưu local trong `logs/cloud/cloud-settings.local.json` hoặc đọc từ env `YOLO_GUI_GOOGLE_API_KEY`.
- UI Cloud khóa toàn bộ control khi đang kiểm tra/lưu/kết nối để tránh bấm chồng, hiển thị key dạng mask và không render raw key ngược lên frontend.
- Giao diện Cloud có summary card, trạng thái Drive folder, local mirror và danh sách folder standard đồng bộ style `Pro AI Lab`.

## v0.4.18 - 2026-05-12

- Redesign toàn bộ giao diện theo hướng `Pro AI Lab`: sidebar/header tối cao cấp, workspace sáng dễ đọc và cảm giác tool AI/GPU chuyên nghiệp hơn.
- Thêm Google Fonts `Be Vietnam Pro` với fallback system font để tiếng Việt rõ và đồng bộ hơn.
- Làm mới design system: màu, typography, shadow, button, focus state, card, form, quick workflow, dependency card, dataset wizard, annotator, automation, docs, version và jobs.
- Tối ưu responsive desktop/mobile để các form dài, annotator và quick actions không tạo horizontal overflow.
- Quick workflow trên desktop chuyển sang layout rộng hơn, không còn bẻ chữ giữa từ.
- Tab switch tự đưa người dùng về đầu tab mới, tránh giữ scroll sâu từ tab trước.
- Toolbar annotator cắt đường dẫn nhãn dài bằng ellipsis để không làm vỡ canvas/studio labeling.
- CSS/JS asset có query version để trình duyệt không dùng cache giao diện cũ sau update.
- Dependency log endpoint không còn trả 500 khi Windows Python có cache `python311.zip` thiếu, giúp console browser sạch warning/error.
- Cập nhật lại ảnh demo GitHub theo giao diện mới.

## v0.4.17 - 2026-05-12

- Thêm công cụ gán nhãn ảnh ngay trong tab `Dữ liệu`, thao tác tương tự LabelImg: chọn thư mục ảnh, xem danh sách ảnh, kéo chuột để vẽ bounding box, chọn class, xóa box và lưu nhãn YOLO `.txt`.
- Thêm API annotation: liệt kê ảnh, đọc nhãn YOLO hiện có, lưu nhãn mới và serve ảnh để canvas frontend hiển thị.
- Path browser có thêm mục gán vào `Thư mục ảnh để gán nhãn` và `Thư mục lưu nhãn box`; panel annotator cũng có nút `Chọn` để mở nhanh bộ duyệt thư mục.
- Trong lúc mở thư mục hoặc lưu nhãn, GUI khóa các nút/field của annotator để tránh người dùng bấm chồng làm lệch trạng thái.
- Thêm tooltip và tài liệu hướng dẫn cho luồng gán nhãn thuần GUI.

## v0.4.16 - 2026-05-12

- Đổi cơ chế update trên Google Colab sang giữ nguyên Cloudflare Tunnel/link hiện tại.
- Sau khi `git pull`, cell Colab chỉ restart server YOLO GUI trên đúng port cũ; process `cloudflared` không bị tắt nên link `trycloudflare.com` không đổi.
- GUI poll lại trạng thái restart; khi server sống lại, tab hiện tại tự tải lại để nạp frontend/backend mới.
- Panel `Colab tunnel` đổi nội dung từ mở link mới sang `Tải lại GUI` trên cùng link hiện tại.

## v0.4.15 - 2026-05-12

- Trên Google Colab, cập nhật phiên bản không còn bắt người dùng tự dừng cell và chạy lại ngay.
- Sau khi `git pull`, GUI tạo yêu cầu handoff; cell `start_colab.py` mở server mới và Cloudflare Tunnel mới trước, ghi link `trycloudflare.com` mới vào GUI/cell, rồi mới dừng phiên cũ.
- Tab `Phiên bản` phân biệt `Phiên bản hiện tại` đang chạy và `Source trong repo`, tránh lỗi source đã cập nhật nhưng GUI cũ vẫn báo `v0.4.8` là mới nhất.
- Thêm panel `Colab tunnel` trong tab `Phiên bản` để báo trạng thái đang mở tunnel mới và hiển thị nút `Mở GUI mới` khi link mới sẵn sàng.

## v0.4.14 - 2026-05-12

- Sửa triệt để lỗi hiển thị ở panel `Tạo data.yaml`: các dấu `?` trong route preview không còn bị kéo thành pill dọc hoặc làm vỡ card.
- Tách markup route preview thành `yaml-route-card` và `yaml-route-copy` để icon, tiêu đề, mô tả và tooltip có vùng riêng.
- CSS dùng selector trực tiếp cho icon route, đồng thời neo tooltip ở mép phải card để không bị rule lưới áp nhầm vào icon trợ giúp.
- Rà thêm các selector `span` trong Dataset Wizard, choice card và check tile để tooltip được chèn bằng JS không bị style như nội dung chính của card.

## v0.4.13 - 2026-05-12

- Sửa sidebar desktop trên màn thấp bị hiện scrollbar nội bộ ở card `Colab hiện tại`/`Máy hiện tại`.
- Mở rộng compact sidebar cho viewport desktop cao tới `880px`, giảm nhẹ padding, khoảng cách nav và font trong card hệ thống để nội dung trải đủ trong sidebar thay vì phải kéo scroll riêng.
- Rút gọn các dòng trạng thái GPU/Colab trong sidebar; hướng dẫn dài vẫn nằm ở tab `Cài đặt`.
- Mobile/tablet không đổi; sidebar vẫn trải theo layout một cột.

## v0.4.12 - 2026-05-12

- Sửa vị trí panel `Kết quả dự đoán`: thanh đang chạy và preview ảnh/video giờ nằm ngay trong tab `Dự đoán`, sát phần đầu form.
- Khi bấm `Bắt đầu dự đoán`, GUI vẫn giữ người dùng ở tab `Dự đoán`, tự scroll tới thanh tiến trình và không nhảy sang tab log.
- Panel kết quả đổi thành dạng inline trong form, tránh bị đặt nhầm dưới tab huấn luyện/đánh giá nên người dùng không thấy tiến trình.

## v0.4.11 - 2026-05-12

- Sửa sidebar desktop bị tạo khoảng trống bên trái khi scroll sâu ở các trang dài như `Phiên bản`.
- Sidebar desktop chuyển sang `position: fixed`, phủ đủ chiều cao viewport và vẫn có scroll nội bộ nếu nội dung sidebar cao hơn màn hình.
- Tablet/mobile vẫn dùng sidebar `static` để không chiếm màn hình và không tạo layout hai cột trên màn hình hẹp.

## v0.4.10 - 2026-05-12

- Sidebar header hiển thị nút `Update now` ngay cạnh phiên bản khi GUI phát hiện phiên bản hiện tại thấp hơn bản mới nhất trên GitHub.
- Nút `Update now` dùng lại luồng cập nhật của tab `Phiên bản`: repo sạch thì chạy `Cập nhật ngay`, repo dirty thì chạy `Sao lưu rồi cập nhật`, còn trường hợp chưa đủ điều kiện sẽ mở tab `Phiên bản` để xem lý do.
- Thêm so sánh version dạng số để nhận đúng các bản như `0.4.10` lớn hơn `0.4.9`.

## v0.4.9 - 2026-05-12

- Khóa toàn bộ nút cài/kiểm tra dependency trong lúc GUI đang kiểm tra môi trường YOLO để tránh người dùng bấm nhiều lần gây job cài trùng.
- Thêm guard JS chống race condition cho `/api/dependencies/status`: response cũ không được mở khóa nếu request mới hơn đang chạy.
- Thêm lớp CSS `is-action-locked` cho card dependency để nút bị mờ, không nhận pointer event khi trạng thái là `Đang kiểm tra` hoặc `Đang cài`.

## v0.4.8 - 2026-05-12

- Sửa UI/UX dấu `?` trong mục `Hướng dẫn > Các khái niệm hay gặp`: icon trợ giúp được neo cố định ở góc phải từng card, không còn lệch theo dòng chữ.
- Tách CSS mô tả của `term-grid` để rule của nội dung không áp nhầm vào icon tooltip, giúp các dấu hỏi có cùng kích thước và cùng hàng trên desktop/mobile.

## v0.4.7 - 2026-05-12

- Sửa UI/UX cụm `Đường dẫn` trong trình duyệt thư mục: nút mở/gán chỉ hiển thị icon, không còn vỡ chữ `Mở`/`Gán`.
- Khóa kích thước icon button để hàng input đường dẫn không bị cao bất thường khi text cũ hoặc cache còn sót.

## v0.4.6 - 2026-05-12

- Tab `Phiên bản` có nút `Sao lưu rồi cập nhật` khi GitHub có bản mới nhưng repo đang có file đã sửa; GUI tự cất tạm thay đổi bằng Git stash rồi cập nhật.
- Tab `Dự đoán` không tự nhảy sang `Tiến trình` nữa; sau khi bấm chạy sẽ hiện panel đang xử lý ngay tại chỗ.
- Khi predict hoàn tất, GUI tự tìm ảnh/video output và hiển thị preview trực tiếp trong tab `Dự đoán`.
- Sửa lỗi route card trong Dataset Wizard bị chồng icon tooltip lên chữ ở panel `Tạo data.yaml`.

## v0.4.5 - 2026-05-12

- Thẻ sidebar `Máy hiện tại` đổi thành `Colab hiện tại` khi GUI chạy trên Google Colab.
- Trạng thái Colab không còn chỉ ghi `CUDA: chưa sẵn sàng`; GUI giải thích đang chạy CPU, vẫn chạy được nhưng chậm, và chỉ rõ cách bật GPU trong `Runtime > Change runtime type > GPU`.
- API `/api/dependencies/status` trả thêm `runtime` để frontend không bị render nhầm kiểu local khi kiểm tra dependency chạy trước kiểm tra version.
- Tab `Cài đặt` cũng dùng câu hướng dẫn riêng cho Colab CPU runtime thay vì chỉ báo không thấy `nvidia-smi`.

## v0.4.4 - 2026-05-12

- Làm lại cụm duyệt đường dẫn để nút mở/gán là icon button gọn, không còn vỡ chữ.
- Khi GUI đang kiểm tra môi trường YOLO, toàn bộ nút cài/kiểm tra lại được khóa để tránh bấm lung tung.
- Trên Google Colab, GUI tự ẩn/chặn lựa chọn Camera vì Ultralytics không hỗ trợ webcam `source=0` trong notebook.
- Backend cũng chặn predict webcam trên Colab và trả lỗi tiếng Việt dễ hiểu trước khi tạo job.

## v0.4.3 - 2026-05-12

- Thêm JS health check gọi `/api/health` ngay khi mở GUI và tự lặp lại mỗi 30 giây.
- Sidebar card `Máy hiện tại` có badge `Online` hoặc `Mất kết nối` để người dùng biết backend còn sống.

## v0.4.2 - 2026-05-12

- Hiển thị phiên bản hiện tại ngay dưới header `YOLO GUI` trong sidebar.
- Dòng phiên bản dùng chung dữ liệu `/api/version`, nên Windows và Google Colab đều thấy đúng bản đang chạy.

## v0.4.1 - 2026-05-12

- Tab `Phiên bản` hiển thị môi trường đang chạy: Local hoặc Google Colab.
- Luồng update trên Colab có hướng dẫn riêng: dừng cell, chạy lại cell `Chạy YOLO GUI`, rồi mở link tunnel mới.
- Bổ sung hướng dẫn Colab cho mục changelog/update trong GUI.
- Chỉnh responsive mobile để thanh điều hướng và quick action không tạo cuộn ngang ngoài ý muốn.

## v0.4.0 - 2026-05-12

- Thêm tab `Phiên bản` trong GUI.
- Hiển thị phiên bản hiện tại, commit local, commit mới trên GitHub và trạng thái cập nhật.
- Thêm changelog trong GUI để người dùng đọc các thay đổi chính.
- Thêm nút `Cập nhật ngay` chạy `git pull --ff-only` khi repo sạch.
- Ghi log cập nhật vào `logs/updates/`.

## v0.3.0 - 2026-05-12

- Thêm launcher Google Colab bằng `start_colab.py`.
- Thêm notebook `YOLO_GUI_Colab.ipynb` để clone/chạy GUI bằng một cell.
- Tự mở Cloudflare Quick Tunnel để dùng GUI trên Colab qua link `trycloudflare.com`.
- Thêm tài liệu `docs/COLAB_GUIDE.md`.

## v0.2.0 - 2026-05-12

- Chuyển UI sang định hướng 100% GUI, giảm thuật ngữ CLI/YOLO thô.
- Thêm Dataset Wizard tạo và gán `data.yaml` bằng giao diện.
- Thêm Automation chạy nhiều bước YOLO theo kịch bản.
- Thêm tooltip giải thích và tab `Hướng dẫn`.
- Thêm ảnh demo vào README.

## v0.1.0 - 2026-05-12

- Tạo nền FastAPI + frontend static cho YOLO GUI.
- Chạy train, validate, predict và export qua Ultralytics Python API.
- Thêm kiểm tra/cài PyTorch, CUDA và Ultralytics trong GUI.
- Ghi log workflow theo từng job.
