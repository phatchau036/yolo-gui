# Hướng Dẫn Dùng GUI Từng Bước

Tài liệu này dành cho người dùng muốn train, kiểm tra, dự đoán và đóng gói YOLO hoàn toàn bằng giao diện. Người dùng không cần biết lệnh `yolo`, không cần tự viết `data.yaml`, không cần nhớ `epochs`, `batch`, `device`, `conf` hoặc `iou`.

## Nguyên Tắc Khi Dùng

- Luôn thao tác trong trình duyệt, trừ bước mở app lần đầu trên Windows hoặc chạy cell Colab.
- Nếu thấy dấu hỏi `?`, rê chuột vào đó để xem mục đó dùng làm gì.
- Khi chưa chắc nên chọn gì, giữ preset mặc định của GUI.
- Khi có lỗi, đọc tab `Tiến trình` trước. Log trong GUI thường nói rõ lỗi nằm ở dataset, model, GPU, package hay đường dẫn.
- Khi bật Cloud Storage, đặt `Tên project` rõ ràng để sau này mở lại đúng dữ liệu.

## 1. Mở GUI

Trên Windows, chạy `start.ps1`, đợi app in địa chỉ local, rồi mở `http://127.0.0.1:8765` trong trình duyệt.

Trên Google Colab, mở `YOLO_GUI_Colab.ipynb`, chạy cell `Chạy YOLO GUI`, đợi link `trycloudflare.com`, rồi mở link đó. Giữ cell Colab chạy trong suốt thời gian dùng GUI.

Sau khi mở, màn hình chính có:

- Sidebar bên trái: chuyển tab như `Huấn luyện`, `Dữ liệu`, `Cài đặt`, `Tiến trình`.
- Thẻ môi trường: cho biết Local/Colab, PyTorch, CUDA, GPU và Ultralytics.
- Các nút workflow nhanh: đưa người dùng đến tab cần làm.

## 2. Kiểm Tra Và Cài Môi Trường

Vào tab `Cài đặt` hoặc xem thẻ môi trường ở sidebar.

Nếu GUI báo thiếu Ultralytics:

1. Bấm `Cài Ultralytics`.
2. Đợi trạng thái chạy xong.
3. Đọc log cài đặt trong GUI nếu lỗi.
4. Bấm `Kiểm tra lại`.

Nếu GUI báo thiếu PyTorch:

1. Nếu máy có NVIDIA GPU, bấm `Cài PyTorch CUDA`.
2. Nếu không có GPU hoặc chỉ muốn chạy CPU, bấm `Cài PyTorch CPU`.
3. Đợi cài xong rồi bấm `Kiểm tra lại`.

Trong lúc GUI đang kiểm tra hoặc cài package, các nút liên quan sẽ bị khóa để tránh người dùng bấm trùng nhiều lần.

## 3. Bật Cloud Project Nếu Muốn Dùng Nhiều Máy

Cloud không bắt buộc. Nếu chỉ train local một lần, có thể bỏ qua bước này.

Nếu muốn Windows và Colab dùng cùng chuẩn dữ liệu:

1. Vào tab `Cài đặt`.
2. Bật `Cloud mode`.
3. Nhập `Cloud API key`.
4. Bấm `Kiểm tra Cloud key`.
5. Khi GUI báo key hợp lệ, phần `Google Drive Auth` sẽ hiện ra.
6. Dán OAuth access token có quyền Google Drive vào ô `Google Drive Auth`.
7. Nếu muốn workspace nằm trong một folder cha có sẵn, nhập `Google Drive parent`; nếu không, để trống để GUI tạo trong My Drive.
8. Nhập `Tên workspace chuẩn`, ví dụ `YOLO-GUI-Cloud`.
9. Nhập `Tên project`, ví dụ `Helmet Detection`.
10. Bật `Cloud Storage` nếu muốn mỗi job tự lưu log, config và output.
11. Bấm `Connect Google Drive` để GUI tự tạo workspace, folder chuẩn và mirror.

Khi bật Cloud Storage, mỗi job xong sẽ có snapshot ở:

```text
runs/cloud/google-drive/<folder-id>/<workspace>/projects/<tên project>/jobs/<workflow>/<job_id>/
```

Snapshot gồm config job, log đầy đủ, thư mục job, output YOLO và manifest. Trong `Cloud Manager`, mục `Job snapshots` cho biết job nào đã được lưu.

Lưu ý: Cloud API key chỉ kiểm tra Google Cloud/Drive API. Google Drive Auth mới là quyền tạo folder trong Drive. Key/token chỉ lưu local hoặc lấy từ env, không commit lên GitHub.

## 4. Chuẩn Bị Dataset Bằng GUI

Vào tab `Dữ liệu`.

Nếu dataset đã có ảnh và nhãn:

1. Ở phần tạo dataset, chọn `Thư mục dataset`.
2. Chọn thư mục ảnh train, thường là `images/train`.
3. Chọn thư mục ảnh val, thường là `images/val`.
4. Nếu có test set, chọn thêm `images/test`; nếu không có thì để trống.
5. Nhập danh sách class, mỗi dòng một class, ví dụ:

```text
helmet
no_helmet
person
```

6. Bấm `Tạo và dùng ngay`.

GUI sẽ tự tạo file cấu hình dataset và tự gán sang tab `Huấn luyện`, `Đánh giá`, `Đóng gói` khi phù hợp. Người dùng không cần tự mở file `data.yaml`.

Nếu dataset chưa đúng layout, dùng nút `Layout YOLO` để GUI tự điền cấu trúc phổ biến:

```text
dataset-root/
  images/train/
  images/val/
  labels/train/
  labels/val/
```

## 5. Gán Nhãn Ảnh Như LabelImg

Nếu ảnh chưa có nhãn, vẫn ở tab `Dữ liệu`, dùng panel `Vẽ bounding box như LabelImg`.

1. Chọn `Thư mục ảnh cần gán nhãn`.
2. Có thể để trống `Thư mục lưu nhãn`; GUI sẽ tự suy ra folder `labels`.
3. Nhập danh sách class, mỗi dòng một class.
4. Bấm `Mở thư mục ảnh`.
5. Chọn ảnh trong danh sách bên trái.
6. Chọn `Class đang vẽ`.
7. Kéo chuột trên ảnh để vẽ bounding box.
8. Bấm vào box nếu muốn chọn lại box đó.
9. Đổi class, xóa box hoặc clear toàn bộ box nếu cần.
10. Bấm `Lưu nhãn`.

Sau khi lưu, GUI ghi file `.txt` theo chuẩn YOLO. Người dùng có thể chuyển ảnh tiếp theo và lặp lại.

Mẹo: nếu vẽ nhầm, chọn box rồi bấm nút xóa. Nếu muốn xóa hết box trong ảnh hiện tại, dùng nút clear trong toolbar.

## 6. Kiểm Tra Dataset Trước Khi Train

Vẫn ở tab `Dữ liệu`, dùng phần kiểm tra dataset.

1. Chọn file dataset vừa tạo.
2. Bấm kiểm tra hoặc audit dataset.
3. Xem kết quả thiếu ảnh, thiếu nhãn, nhãn rỗng, class sai hoặc dòng label lỗi.

Nên sửa dataset trước khi train lâu. Nếu dataset lỗi mà vẫn train, YOLO có thể dừng giữa chừng hoặc model học sai.

## 7. Huấn Luyện Model

Vào tab `Huấn luyện`.

1. Chọn `Bộ dữ liệu`. Nếu đã bấm `Tạo và dùng ngay`, GUI thường đã điền sẵn.
2. Chọn `Kiểu model`.
3. Chọn `Loại bài toán`, thường là `detect` nếu nhận diện vật thể bằng box.
4. Chọn `Mức huấn luyện`:
   - `Test nhanh`: dùng để kiểm tra dataset và luồng chạy.
   - `Cân bằng`: nên dùng cho phần lớn trường hợp.
   - `Train kỹ`: dùng khi dataset đã ổn và muốn chất lượng tốt hơn.
5. Chọn `Máy chạy`:
   - `Tự động`: khuyến nghị cho người mới.
   - `Ưu tiên GPU`: dùng khi CUDA đã sẵn sàng.
   - `Chạy CPU`: chậm hơn nhưng dễ tương thích.
6. Bấm `Bắt đầu huấn luyện`.

Khi job bắt đầu, vào tab `Tiến trình` để xem log. Nếu Cloud Storage đang bật, khi job kết thúc GUI sẽ tự lưu snapshot vào project hiện tại.

## 8. Dự Đoán Ảnh, Video Hoặc Folder

Vào tab `Dự đoán`.

1. Chọn model muốn dùng. Có thể dùng model preset hoặc model đã train.
2. Chọn nguồn:
   - `Ảnh hoặc video`: chọn một file.
   - `Thư mục ảnh`: chạy toàn bộ ảnh trong folder.
   - `Camera`: dùng webcam local.
3. Chọn mức lọc kết quả:
   - `Nhạy`: thấy nhiều box hơn, có thể nhiều nhầm hơn.
   - `Cân bằng`: nên dùng trước.
   - `Chắc chắn`: ít box nhầm hơn, có thể bỏ sót.
4. Chọn các tùy chọn lưu kết quả như ảnh/video, nhãn txt, điểm tin cậy hoặc crop vật thể.
5. Bấm `Bắt đầu dự đoán`.

GUI sẽ ở lại tab `Dự đoán`, hiển thị thanh đang chạy và tự preview ảnh/video output khi xong. Nếu cần log đầy đủ, bấm `Xem log đầy đủ`.

Trên Google Colab, không dùng webcam trực tiếp. Hãy chọn ảnh, video hoặc folder trong `/content` hoặc Drive đã mount.

## 9. Đánh Giá Model

Vào tab `Đánh giá` khi muốn kiểm tra model trên dataset val/test.

1. Chọn model cần đánh giá.
2. Chọn dataset.
3. Chọn mức đánh giá.
4. Bấm chạy đánh giá.
5. Xem log và output trong tab `Tiến trình`.

Nên đánh giá trước khi dùng model thật hoặc trước khi export sang định dạng khác.

## 10. Đóng Gói Model

Vào tab `Đóng gói`.

1. Chọn model cần đóng gói.
2. Chọn mục đích dùng:
   - App/web.
   - NVIDIA GPU.
   - CPU Intel.
   - Mobile.
   - iPhone/Mac.
3. Giữ mặc định nếu chưa chắc.
4. Bấm bắt đầu đóng gói.

Nếu export lỗi, xem log. Một số định dạng cần package hoặc môi trường riêng, ví dụ TensorRT cần GPU/CUDA/TensorRT phù hợp.

## 11. Dùng Automation

Vào tab `Automation` nếu muốn GUI chạy nhiều bước.

Các kịch bản thường dùng:

- `Chuẩn bị dataset`: tạo/audit dataset trước khi train.
- `Chuẩn bị rồi huấn luyện`: kiểm tra dataset rồi train.
- `Đánh giá rồi đóng gói`: validate model rồi export.
- `Full pipeline`: dataset, audit, train, validate, export.

Người mới nên thử `Chuẩn bị dataset` trước. Khi dataset đã ổn mới chạy pipeline dài.

## 12. Lưu Và Mở Lại Cấu Hình Bằng Cloud Manager

Vào tab `Cài đặt`, phần `Cloud Manager`.

Để lưu cấu hình hiện tại:

1. Chọn dataset/model/preset ở các tab như bình thường.
2. Nhập tên profile, ví dụ `helmet yolo26n balanced`.
3. Nhập ghi chú nếu cần.
4. Bấm `Lưu cấu hình hiện tại`.

Để dùng lại:

1. Mở cùng Cloud workspace và cùng `Tên project`.
2. Vào `Cloud Manager`.
3. Bấm `Áp dụng` ở profile đã lưu.
4. Kiểm tra lại form.
5. Bấm chạy workflow chính khi đã đúng.

Cloud Manager chỉ điền lại form, không tự chạy job. Người dùng luôn có bước kiểm tra trước khi train/predict/export.

## 13. Đọc Tiến Trình Và Log Khi Lỗi

Vào tab `Tiến trình`.

Mỗi job có trạng thái:

- `starting`: đang tạo job.
- `running`: đang chạy.
- `completed`: chạy xong.
- `failed`: lỗi.
- `stopped`: đã dừng.

Nếu lỗi:

1. Chọn job lỗi.
2. Đọc log đầy đủ.
3. Tìm các dòng cuối cùng trước traceback.
4. Kiểm tra lỗi thuộc nhóm nào:
   - Thiếu package.
   - Sai đường dẫn model/dataset/source.
   - Dataset thiếu nhãn hoặc class sai.
   - GPU/CUDA không sẵn sàng.
   - Export format không phù hợp.

Không cần đoán lỗi từ popup ngắn. Log job là nguồn chính xác nhất.

## 14. Cập Nhật GUI

Vào tab `Phiên bản`.

1. Bấm `Kiểm tra lại`.
2. Nếu có bản mới, bấm `Cập nhật ngay`.
3. Nếu GUI báo có file local đã sửa, bấm `Sao lưu rồi cập nhật`.
4. Sau khi update, tải lại trang.

Trên Colab, link `trycloudflare.com` được giữ nguyên nếu server restart cùng port thành công. Giữ cell Colab chạy trong lúc cập nhật.

## 15. Công Thức Nhanh Cho Người Mới

### Train model đầu tiên

1. `Dữ liệu` -> tạo dataset -> `Tạo và dùng ngay`.
2. `Cài đặt` -> cài Ultralytics/PyTorch nếu thiếu.
3. `Huấn luyện` -> model nhỏ -> `Cân bằng` -> `Tự động`.
4. `Tiến trình` -> đọc log đến khi `completed`.
5. `Dự đoán` -> chọn model output -> chạy thử ảnh thật.

### Dùng cùng project trên Colab và Windows

1. Cả hai bên dùng cùng Google Drive folder.
2. Cả hai bên dùng cùng `Tên workspace chuẩn`.
3. Cả hai bên nhập cùng `Tên project`.
4. Bật `Cloud Storage` nếu muốn tự lưu job.
5. Dùng `Cloud Manager` để áp dụng lại profile.

### Khi dự đoán không ra ảnh

1. Kiểm tra có bật `Lưu ảnh/video kết quả`.
2. Xem panel kết quả trong tab `Dự đoán`.
3. Mở tab `Tiến trình` và đọc log.
4. Kiểm tra nguồn ảnh/video có tồn tại không.
5. Giảm mức lọc từ `Chắc chắn` về `Cân bằng` hoặc `Nhạy`.

## 16. Những Việc Không Cần Làm Bằng Tay

- Không cần tự viết `data.yaml`.
- Không cần tự chạy `pip install ultralytics` bằng terminal nếu dùng nút cài trong GUI.
- Không cần nhớ lệnh `yolo train`, `yolo predict`, `yolo export`.
- Không cần nhập `source=0` cho camera; GUI có lựa chọn `Camera`.
- Không cần tự tìm log trong folder nếu đang dùng GUI; tab `Tiến trình` đọc log cho bạn.
- Không cần tự ghi lại cấu hình train nếu bật Cloud Manager; profile có thể lưu và áp dụng lại.

## 17. Khi Nào Cần Dev Hỗ Trợ

Gửi cho dev các thông tin sau:

- Job id trong tab `Tiến trình`.
- Log đầy đủ của job lỗi.
- Ảnh chụp tab đang dùng.
- Dataset có bao nhiêu class và ví dụ vài ảnh/label.
- Runtime là Windows hay Google Colab.
- Cloud Storage có bật không và `Tên project` là gì.

Không gửi Google API key, token, file trong `logs/cloud/` hoặc link Cloudflare nếu notebook đang mở dữ liệu riêng tư.
