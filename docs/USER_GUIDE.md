# Hướng Dẫn Người Dùng YOLO GUI

Tài liệu này dành cho người không muốn dùng CLI. Mọi thao tác chính đều làm trong giao diện web.

## Luồng Nhanh

1. Trên Windows, mở app bằng `start.ps1`, sau đó vào địa chỉ web local hiện trên terminal.
2. Trên Google Colab, mở `YOLO_GUI_Colab.ipynb`, chạy cell `Chạy YOLO GUI`, rồi bấm link `trycloudflare.com`.
3. Nếu muốn dùng chung dữ liệu giữa nhiều máy/Colab, vào tab `Cài đặt`, bật `Cloud mode`, nhập Google Drive folder và bấm `Connect Google Drive`.
4. Vào tab `Dữ liệu`, chọn thư mục dataset và nhập danh sách nhãn.
5. Nếu ảnh chưa có nhãn, dùng panel `Vẽ bounding box như LabelImg`: chọn thư mục ảnh, kéo chuột để vẽ box, chọn class rồi bấm `Lưu nhãn`.
6. Bấm `Tạo và dùng ngay` để GUI tự tạo cấu hình dataset và gán sang các tab khác.
7. Kiểm tra thẻ môi trường. Nếu thiếu PyTorch, CUDA hoặc Ultralytics thì bấm nút cài ngay trên GUI.
8. Vào tab `Huấn luyện`, chọn model, chọn mức `Cân bằng`, để máy chạy `Tự động`, rồi bấm `Bắt đầu huấn luyện`.
9. Vào tab `Tiến trình` để xem trạng thái và nhật ký.
10. Sau khi có model, dùng tab `Dự đoán`, `Đánh giá` hoặc `Đóng gói` theo nhu cầu.
11. Vào tab `Phiên bản` khi muốn xem changelog hoặc cập nhật GUI lên bản mới.

## Rê Chuột Để Xem Giải Thích

Các nhãn và tùy chọn trong GUI có biểu tượng dấu hỏi. Rê chuột vào dấu hỏi hoặc focus bằng bàn phím để xem mục đó dùng làm gì. Người mới nên giữ mặc định khi chưa chắc.

## Các Tab Chính

### Dữ liệu

Dùng để chuẩn bị dataset cho YOLO. Người dùng chỉ cần chọn thư mục gốc, nhập nơi chứa ảnh train/val/test và danh sách nhãn. GUI sẽ tự tạo file cấu hình cần thiết.

Nếu chưa có nhãn, dùng cụm `Vẽ bounding box như LabelImg` trong chính tab này. Chọn thư mục ảnh bằng nút `Chọn`, nhập danh sách class mỗi dòng một tên, bấm `Mở thư mục ảnh`, rồi kéo chuột trên ảnh để tạo bounding box. Bấm vào box để chọn, đổi `Class đang vẽ` để sửa class của box đang chọn, dùng nút thùng rác hoặc phím Delete để xóa. Bấm `Lưu nhãn` để GUI ghi file `.txt` theo chuẩn YOLO.

Ô `Thư mục lưu nhãn` có thể để trống. Khi đó GUI tự suy ra folder nhãn tương ứng: ví dụ ảnh trong `images/train` sẽ lưu nhãn vào `labels/train`. Nếu muốn lưu ở nơi khác, chọn folder nhãn riêng bằng nút `Chọn`.

### Huấn luyện

Dùng để tạo model từ dataset. Mức `Test nhanh` chỉ để kiểm tra lỗi dữ liệu. Mức `Cân bằng` phù hợp đa số trường hợp. Mức `Train kỹ` chạy lâu hơn để ưu tiên chất lượng.

### Đánh giá

Dùng để đo chất lượng model trên bộ ảnh kiểm tra. Nên đánh giá trước khi đóng gói hoặc dùng model ngoài thực tế.

### Dự đoán

Dùng để chạy model trên ảnh, video, thư mục ảnh hoặc camera. Kết quả có thể lưu thành ảnh/video đã vẽ khung và file nhãn.

Khi bấm `Bắt đầu dự đoán`, GUI sẽ ở lại tab `Dự đoán`, hiện thanh đang chạy và tự mở ảnh/video kết quả khi xong. Nếu cần đọc log đầy đủ, bấm `Xem log đầy đủ`.

Trên Google Colab, không dùng được webcam trực tiếp. Hãy chọn ảnh, video hoặc thư mục ảnh đã upload; nếu cần camera thật, chạy GUI trên Windows/local.

### Đóng gói

Dùng để xuất model sang định dạng phù hợp với app/web/mobile/thiết bị khác. Nếu bật nén mạnh, nên kiểm tra lại chất lượng sau khi xuất.

### Automation

Dùng để chạy nhiều bước bằng một nút. Ví dụ `Full pipeline` sẽ chuẩn bị dữ liệu, train, đánh giá và đóng gói theo cấu hình hiện tại.

### Cài đặt / Cloud workspace

Tab `Cài đặt` có phần `Google Drive dùng chung cho mọi máy`.

Khi bật `Cloud mode`, GUI dùng một chuẩn thư mục chung:

- `datasets`: bộ dữ liệu YOLO.
- `models`: checkpoint hoặc weight model.
- `runs`: kết quả train/dự đoán/đánh giá/export.
- `annotations`: nhãn YOLO và dữ liệu gán nhãn.
- `configs`: `data.yaml` và preset.
- `exports`: model đã đóng gói.
- `logs`: nhật ký và report.

Cách dùng:

1. Bật `Cloud mode`.
2. Nhập Google API key. Key này chỉ lưu local trong `logs/cloud/` hoặc lấy từ env `YOLO_GUI_GOOGLE_API_KEY`.
3. Dán Google Drive folder ID hoặc link folder.
4. Giữ `Tên workspace chuẩn` giống nhau trên các máy nếu muốn cùng cấu trúc.
5. Bấm `Lưu cài đặt Cloud` hoặc `Connect Google Drive`.

Lưu ý: API key chỉ đọc được folder public/shared. Nếu folder private, cần OAuth/service account ở bản sau. GUI không đưa raw API key lên màn hình sau khi lưu.

### Phiên bản

Dùng để xem GUI đang ở bản nào, đang chạy ở Local hay Google Colab, đọc changelog và kiểm tra bản mới trên GitHub. Nếu có bản mới và thư mục dự án không có file đang chỉnh sửa, bấm `Cập nhật ngay` để GUI tự tải bản mới. Nếu GUI báo có file đã sửa, bấm `Sao lưu rồi cập nhật` để GUI cất tạm thay đổi rồi cập nhật. Sau khi cập nhật, tải lại trang. Trên Colab, GUI giữ Cloudflare Tunnel hiện tại và chỉ restart server phía sau trên cùng port.

### Tiến trình

Hiển thị job đang chạy và nhật ký chi tiết. Khi có lỗi, đọc tab này để biết lỗi do dữ liệu, model, môi trường hay thiếu dependency.

## Lựa Chọn Khuyến Nghị

- Model: bắt đầu bằng model nhỏ hoặc nhanh để kiểm tra dataset.
- Mức huấn luyện: chọn `Cân bằng` nếu chưa có kinh nghiệm.
- Máy chạy: chọn `Tự động`.
- Dataset mới: chạy `Chuẩn bị dataset` hoặc `Kiểm tra` trước khi train.
- Dataset chưa có nhãn: gán nhãn ngay trong tab `Dữ liệu`, sau đó chạy `Kiểm tra` để phát hiện ảnh thiếu nhãn hoặc nhãn rỗng.
- Automation: dùng `Full pipeline` khi đã chắc dataset và môi trường ổn.
- Phiên bản: thỉnh thoảng bấm kiểm tra để lấy tính năng mới và đọc changelog trước khi update.

## Khi Gặp Lỗi

- Thiếu PyTorch hoặc Ultralytics: dùng các nút cài trong thẻ môi trường.
- Không thấy GPU trên Windows/local: kiểm tra NVIDIA driver/CUDA, hoặc tạm chọn CPU.
- Không thấy GPU trên Google Colab: vào `Runtime > Change runtime type > GPU`, lưu lại, chạy lại cell YOLO GUI và mở link tunnel mới.
- Train lỗi ngay từ đầu: kiểm tra dataset, class list và nhãn.
- Export lỗi: xem log vì một số định dạng cần runtime hoặc package bổ sung.
- Cập nhật báo có file đã sửa: bấm `Sao lưu rồi cập nhật`. Nếu vẫn lỗi, mở log trong `logs/updates/`.
