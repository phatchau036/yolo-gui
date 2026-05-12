# Hướng Dẫn Người Dùng YOLO GUI

Tài liệu này dành cho người không muốn dùng CLI. Mọi thao tác chính đều làm trong giao diện web.

## Luồng Nhanh

1. Mở app bằng `start.ps1`, sau đó vào địa chỉ web local hiện trên terminal.
2. Vào tab `Dữ liệu`, chọn thư mục dataset và nhập danh sách nhãn.
3. Bấm `Tạo và dùng ngay` để GUI tự tạo cấu hình dataset và gán sang các tab khác.
4. Kiểm tra thẻ môi trường. Nếu thiếu PyTorch, CUDA hoặc Ultralytics thì bấm nút cài ngay trên GUI.
5. Vào tab `Huấn luyện`, chọn model, chọn mức `Cân bằng`, để máy chạy `Tự động`, rồi bấm `Bắt đầu huấn luyện`.
6. Vào tab `Tiến trình` để xem trạng thái và nhật ký.
7. Sau khi có model, dùng tab `Dự đoán`, `Đánh giá` hoặc `Đóng gói` theo nhu cầu.

## Rê Chuột Để Xem Giải Thích

Các nhãn và tùy chọn trong GUI có biểu tượng dấu hỏi. Rê chuột vào dấu hỏi hoặc focus bằng bàn phím để xem mục đó dùng làm gì. Người mới nên giữ mặc định khi chưa chắc.

## Các Tab Chính

### Dữ liệu

Dùng để chuẩn bị dataset cho YOLO. Người dùng chỉ cần chọn thư mục gốc, nhập nơi chứa ảnh train/val/test và danh sách nhãn. GUI sẽ tự tạo file cấu hình cần thiết.

### Huấn luyện

Dùng để tạo model từ dataset. Mức `Test nhanh` chỉ để kiểm tra lỗi dữ liệu. Mức `Cân bằng` phù hợp đa số trường hợp. Mức `Train kỹ` chạy lâu hơn để ưu tiên chất lượng.

### Đánh giá

Dùng để đo chất lượng model trên bộ ảnh kiểm tra. Nên đánh giá trước khi đóng gói hoặc dùng model ngoài thực tế.

### Dự đoán

Dùng để chạy model trên ảnh, video, thư mục ảnh hoặc camera. Kết quả có thể lưu thành ảnh/video đã vẽ khung và file nhãn.

### Đóng gói

Dùng để xuất model sang định dạng phù hợp với app/web/mobile/thiết bị khác. Nếu bật nén mạnh, nên kiểm tra lại chất lượng sau khi xuất.

### Automation

Dùng để chạy nhiều bước bằng một nút. Ví dụ `Full pipeline` sẽ chuẩn bị dữ liệu, train, đánh giá và đóng gói theo cấu hình hiện tại.

### Tiến trình

Hiển thị job đang chạy và nhật ký chi tiết. Khi có lỗi, đọc tab này để biết lỗi do dữ liệu, model, môi trường hay thiếu dependency.

## Lựa Chọn Khuyến Nghị

- Model: bắt đầu bằng model nhỏ hoặc nhanh để kiểm tra dataset.
- Mức huấn luyện: chọn `Cân bằng` nếu chưa có kinh nghiệm.
- Máy chạy: chọn `Tự động`.
- Dataset mới: chạy `Chuẩn bị dataset` hoặc `Kiểm tra` trước khi train.
- Automation: dùng `Full pipeline` khi đã chắc dataset và môi trường ổn.

## Khi Gặp Lỗi

- Thiếu PyTorch hoặc Ultralytics: dùng các nút cài trong thẻ môi trường.
- Không thấy GPU: kiểm tra NVIDIA driver/CUDA, hoặc tạm chọn CPU.
- Train lỗi ngay từ đầu: kiểm tra dataset, class list và nhãn.
- Export lỗi: xem log vì một số định dạng cần runtime hoặc package bổ sung.
