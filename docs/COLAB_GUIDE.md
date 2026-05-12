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

Dataset có thể nằm trong `/content`, Google Drive đã mount, hoặc thư mục bạn upload lên Colab.

## Ghi Chú Về Link Cloudflare

- Link `trycloudflare.com` là link tạm thời.
- Khi dừng cell, ngắt runtime hoặc Colab sleep, link sẽ mất.
- Link có thể truy cập từ internet, vì vậy không chia sẻ nếu notebook đang mở dữ liệu riêng tư.
- Nếu cần link cố định hoặc kiểm soát truy cập, cần tự cấu hình Cloudflare Tunnel có tài khoản riêng; luồng mặc định của repo chỉ dùng Quick Tunnel để người mới dễ chạy.

## Log Khi Lỗi

Trong Colab, log nằm tại:

- `logs/colab/uvicorn.log`: log server YOLO GUI.
- `logs/colab/cloudflared.log`: log Cloudflare Tunnel.
- `logs/workflow_jobs/`: log train/val/predict/export.
- `logs/dependency_installs/`: log cài PyTorch hoặc Ultralytics từ GUI.

Nếu link tunnel không hiện, xem `logs/colab/cloudflared.log`.

Nếu GUI mở được nhưng train lỗi, xem tab `Tiến trình` hoặc file trong `logs/workflow_jobs/`.

## Lỗi Thường Gặp

- Colab hết runtime hoặc bị sleep: chạy lại cell `Chạy YOLO GUI`.
- Không thấy GPU: vào `Runtime` -> `Change runtime type` và chọn GPU.
- Link `trycloudflare.com` không mở: chạy lại cell để lấy tunnel mới.
- Dataset trong Google Drive không thấy: mount Drive trước, rồi chọn đường dẫn trong `/content/drive/MyDrive/...`.
- Cài package lâu: lần đầu Colab phải cài dependency, các lần sau cùng runtime sẽ nhanh hơn.
