# Changelog

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
