# Hướng Dẫn Chạy YOLO GUI Trên Google Colab

Tài liệu này dành cho người muốn dùng YOLO GUI trên Google Colab mà không muốn nhớ lệnh YOLO CLI. Sau khi chạy xong, bạn sẽ có một link web `trycloudflare.com` để mở GUI trong trình duyệt.

## Cách Dễ Nhất

1. Mở notebook `YOLO_GUI_Colab.ipynb` bằng Google Colab.
2. Bấm `Runtime` -> `Change runtime type`.
3. Chọn GPU nếu muốn train bằng GPU.
4. Bấm chạy cell `Chạy YOLO GUI`.
5. Đợi cell in link `trycloudflare.com`.
6. Bấm link đó để mở YOLO GUI.
7. Giữ cell đang chạy trong lúc dùng GUI.

## Cách Clone Thủ Công Trong Colab

Nếu bạn đang ở một notebook trắng, chạy một cell duy nhất:

```python
!git clone https://github.com/phatchau036/yolo-gui.git
%cd yolo-gui
!python start_colab.py
```

Script sẽ tự làm các bước sau:

- Cài package trong `requirements.txt`.
- Tải `cloudflared` nếu Colab chưa có.
- Chạy YOLO GUI server nội bộ ở `127.0.0.1:8765`.
- Mở Cloudflare Tunnel tạm thời tới server đó.
- In ra link public để người dùng mở GUI.

## Cách Dùng Sau Khi Link Mở

1. Vào tab `Cài đặt` nếu GUI báo thiếu PyTorch hoặc Ultralytics.
2. Vào tab `Dữ liệu` để chọn dataset và tạo cấu hình bằng GUI.
3. Vào tab `Huấn luyện` để chọn model, mức huấn luyện và bấm chạy.
4. Xem tiến trình ở tab `Tiến trình`.
5. Vào tab `Phiên bản` để xem changelog, kiểm tra bản mới và cập nhật source từ GitHub khi cần.

Dataset có thể nằm trong `/content`, Google Drive đã mount, hoặc thư mục bạn upload lên Colab.

## Nếu GUI Báo Colab Đang Chạy CPU

Nếu thẻ `Colab hiện tại` ghi `Chế độ train: CPU, vẫn chạy được nhưng chậm`, nghĩa là notebook chưa được bật GPU hoặc PyTorch chưa thấy GPU.

Trường hợp thường gặp nhất là chưa bật GPU runtime:

1. Trên thanh menu Google Colab, bấm `Runtime`.
2. Chọn `Change runtime type`.
3. Ở `Hardware accelerator`, chọn `GPU`.
4. Bấm `Save`.
5. Chạy lại cell `Chạy YOLO GUI`.
6. Mở link `trycloudflare.com` mới.

Nếu đã bật GPU nhưng GUI vẫn báo PyTorch đang chạy CPU, vào tab `Cài đặt` rồi bấm `Cài PyTorch CUDA`.

## Dự Đoán Trên Colab

Colab không hỗ trợ webcam trực tiếp kiểu `source=0` của Ultralytics. Trong GUI, lựa chọn `Camera` sẽ bị khóa khi app phát hiện đang chạy trên Google Colab.

Trên Colab, hãy dùng tab `Dự đoán` với:

- Ảnh hoặc video đã upload lên `/content`.
- Thư mục ảnh trong `/content` hoặc Google Drive đã mount.

Nếu cần nhận diện bằng webcam thật, hãy chạy YOLO GUI trên Windows/local.

## Cập Nhật Phiên Bản Trên Colab

Tab `Phiên bản` cũng có trong bản chạy Google Colab vì Colab dùng cùng web GUI với Windows.

Khi có bản mới:

1. Mở tab `Phiên bản`.
2. Bấm `Cập nhật ngay`.
3. Giữ tab GUI và cell Colab đang chạy.
4. Cell Colab sẽ tự mở server mới và Cloudflare Tunnel mới.
5. Khi panel `Colab tunnel` hiện nút `Mở GUI mới`, bấm nút đó để chuyển sang link `trycloudflare.com` mới.
6. Phiên cũ sẽ tự tắt sau vài giây sau khi link mới đã sẵn sàng.

Nếu bạn cập nhật từ một bản rất cũ chưa có cơ chế handoff, có thể phải dừng cell và chạy lại một lần để nạp cơ chế mới. Từ các bản có handoff trở đi, GUI sẽ tự chuyển sang tunnel mới.

Lý do vẫn cần mở tunnel mới: backend Python cũ đã import code vào bộ nhớ. Sau khi source đổi, server mới cần được mở để nạp code backend/frontend mới nhất, nhưng GUI sẽ giữ phiên cũ tới khi link mới sẵn sàng.

## Ghi Chú Về Link Cloudflare

- Link `trycloudflare.com` là link tạm thời.
- Khi dừng cell, ngắt runtime hoặc Colab sleep, link sẽ mất.
- Link có thể truy cập từ internet, vì vậy không chia sẻ nếu notebook đang mở dữ liệu riêng tư.
- Nếu cần link cố định hoặc kiểm soát truy cập, cần tự cấu hình Cloudflare Tunnel có tài khoản riêng; luồng mặc định của repo chỉ dùng Quick Tunnel để người mới dễ chạy.

## Log Khi Lỗi

Trong Colab, log nằm tại:

- `logs/colab/uvicorn.log`: log server YOLO GUI.
- `logs/colab/uvicorn-<port>.log`: log server YOLO GUI.
- `logs/colab/cloudflared-<port>.log`: log Cloudflare Tunnel.
- `logs/colab/restart-state.json`: trạng thái handoff khi cập nhật trên Colab.
- `logs/workflow_jobs/`: log train/val/predict/export.
- `logs/dependency_installs/`: log cài PyTorch hoặc Ultralytics từ GUI.
- `logs/updates/`: log khi bấm cập nhật ở tab `Phiên bản`.

Nếu link tunnel không hiện, xem `logs/colab/cloudflared.log`.

Nếu GUI mở được nhưng train lỗi, xem tab `Tiến trình` hoặc file trong `logs/workflow_jobs/`.

## Lỗi Thường Gặp

- Colab hết runtime hoặc bị sleep: chạy lại cell `Chạy YOLO GUI`.
- Không thấy GPU: vào `Runtime` -> `Change runtime type` và chọn GPU.
- Link `trycloudflare.com` không mở: chạy lại cell để lấy tunnel mới.
- Dataset trong Google Drive không thấy: mount Drive trước, rồi chọn đường dẫn trong `/content/drive/MyDrive/...`.
- Cài package lâu: lần đầu Colab phải cài dependency, các lần sau cùng runtime sẽ nhanh hơn.
- Cập nhật xong nhưng giao diện chưa đổi: xem panel `Colab tunnel` trong tab `Phiên bản`; nếu không có link mới sau khoảng 2 phút, dừng cell YOLO GUI, chạy lại cell và mở link tunnel mới.
- Dự đoán bằng `Camera` lỗi `source=0 webcam not supported in Colab`: Colab không hỗ trợ webcam trực tiếp. Chọn ảnh/video/thư mục ảnh, hoặc chạy GUI trên Windows/local nếu cần camera.
