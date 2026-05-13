const state = {
  selectedJobId: null,
  selectedAutomationId: null,
  runtime: null,
  logTimer: null,
  predictJobId: null,
  predictTimer: null,
  healthTimer: null,
  dependencyTimer: null,
  dependencyStatusRequestSeq: 0,
  dependencyActionsLocked: true,
  cloud: null,
  cloudManager: null,
  cloudBusy: false,
  automationTimer: null,
  colabRestartTimer: null,
  annotator: {
    images: [],
    currentIndex: -1,
    boxes: [],
    selectedBoxIndex: -1,
    draftBox: null,
    drawing: null,
    imageLoaded: false,
    busy: false,
  },
};

const HEALTH_CHECK_INTERVAL_MS = 30000;

const workflowForms = {
  train: { form: "#trainForm", endpoint: "/api/train/start", label: "train" },
  val: { form: "#valForm", endpoint: "/api/val/start", label: "val" },
  predict: { form: "#predictForm", endpoint: "/api/predict/start", label: "predict" },
  export: { form: "#exportForm", endpoint: "/api/export/start", label: "export" },
};

const sectionTitles = {
  train: "Huấn luyện model",
  val: "Đánh giá model",
  predict: "Dự đoán dữ liệu",
  export: "Đóng gói model",
  dataset: "Chuẩn bị dữ liệu",
  automation: "Automation YOLO",
  docs: "Hướng dẫn sử dụng",
  version: "Phiên bản và cập nhật",
  system: "Cài đặt môi trường",
  jobs: "Tiến trình và nhật ký",
};

const numberFields = new Set([
  "epochs",
  "time",
  "patience",
  "batch",
  "imgsz",
  "workers",
  "save_period",
  "seed",
  "multi_scale",
  "close_mosaic",
  "fraction",
  "max_det",
  "lr0",
  "lrf",
  "momentum",
  "weight_decay",
  "warmup_epochs",
  "warmup_momentum",
  "warmup_bias_lr",
  "box",
  "cls",
  "cls_pw",
  "dfl",
  "pose",
  "kobj",
  "rle",
  "angle",
  "nbs",
  "mask_ratio",
  "dropout",
  "hsv_h",
  "hsv_s",
  "hsv_v",
  "degrees",
  "translate",
  "scale",
  "shear",
  "perspective",
  "flipud",
  "fliplr",
  "bgr",
  "mosaic",
  "mixup",
  "cutmix",
  "copy_paste",
  "erasing",
  "conf",
  "iou",
  "line_width",
  "vid_stride",
  "opset",
  "workspace",
]);

const trainPresets = {
  quick: { epochs: 20, imgsz: 640, batch: 16, patience: 8 },
  balanced: { epochs: 100, imgsz: 640, batch: 16, patience: 40 },
  deep: { epochs: 200, imgsz: 768, batch: 8, patience: 70 },
};

const valPresets = {
  quick: { imgsz: 512, batch: 16, iou: 0.7 },
  balanced: { imgsz: 640, batch: 16, iou: 0.7 },
  strict: { imgsz: 768, batch: 8, iou: 0.75 },
};

const predictPresets = {
  sensitive: { conf: 0.15, iou: 0.65 },
  balanced: { conf: 0.25, iou: 0.7 },
  strict: { conf: 0.45, iou: 0.75 },
};

const helpCatalog = {
  "Bộ dữ liệu": "Nơi chứa ảnh và nhãn để YOLO học. Nếu chưa có file cấu hình, hãy bấm Chuẩn bị dữ liệu.",
  "Kiểu model": "Chọn kích thước model. Model nhỏ chạy nhanh và nhẹ GPU, model lớn thường chính xác hơn nhưng chậm hơn.",
  "Loại bài toán": "Chọn kiểu nhận diện bạn cần: phát hiện vật thể, tách vùng, phân loại ảnh, tư thế hoặc khung xoay.",
  "Mức huấn luyện": "Chọn mức phù hợp để GUI tự đặt số vòng học, kích thước ảnh và vài thông số chính.",
  "Máy chạy": "Chọn phần cứng xử lý. Tự động là an toàn nhất, GPU nhanh hơn khi CUDA sẵn sàng, CPU chậm hơn nhưng dễ chạy.",
  "Test nhanh": "Chạy ít vòng để kiểm tra dataset và luồng có lỗi không. Không dùng để lấy model cuối.",
  "Cân bằng": "Cấu hình nên dùng cho phần lớn dataset khi mới bắt đầu.",
  "Train kỹ": "Chạy lâu hơn để ưu tiên chất lượng khi dataset đã ổn.",
  "Tự tinh chỉnh": "Mở phần nâng cao để tự đặt thông số. Người mới có thể bỏ qua.",
  "Tự động": "Để GUI tự chọn cách chạy phù hợp với máy hiện tại.",
  "Ưu tiên GPU": "Dùng card NVIDIA đầu tiên nếu PyTorch thấy CUDA.",
  "Chạy CPU": "Không dùng GPU. Chậm hơn nhưng phù hợp khi máy thiếu CUDA.",
  "Tăng tốc đọc dữ liệu": "Cho phép cache dữ liệu để train nhanh hơn, đổi lại có thể tốn RAM hoặc ổ đĩa.",
  "Tiếp tục lần train trước": "Tiếp tục từ checkpoint cũ nếu job trước bị dừng hoặc chưa xong.",
  "Tối ưu GPU tự động": "Dùng chế độ tính toán hỗn hợp để chạy GPU nhanh và tiết kiệm bộ nhớ hơn.",
  "Tự đánh giá sau khi train": "Sau khi train xong, GUI chạy kiểm tra chất lượng trên tập kiểm tra.",
  "Lưu biểu đồ kết quả": "Lưu biểu đồ loss/metric để xem model học tốt hay đang gặp vấn đề.",
  "Lịch học mượt hơn": "Điều chỉnh tốc độ học giảm mượt dần, thường giúp model ổn hơn.",
  "Giữ tỉ lệ ảnh tốt hơn": "Giữ tỉ lệ ảnh khi train để giảm méo hình, hữu ích với ảnh kích thước khác nhau.",
  "Chỉ có một loại vật thể": "Dùng khi dataset chỉ cần nhận diện một class, kể cả nhãn có nhiều tên cũ.",
  "Model riêng": "Chọn file model có sẵn trên máy, ví dụ checkpoint đã train trước đó.",
  "Số vòng học": "Số lần model đi qua dataset. Nhiều hơn có thể tốt hơn nhưng lâu hơn và có nguy cơ học vẹt.",
  "Độ lớn ảnh": "Kích thước ảnh đưa vào model. Lớn hơn thấy chi tiết tốt hơn nhưng tốn GPU hơn.",
  "Số ảnh mỗi lượt": "Số ảnh xử lý cùng lúc. Tăng lên có thể nhanh hơn nhưng cần nhiều VRAM hơn.",
  "Dừng khi hết cải thiện": "Nếu chất lượng không tăng sau một số vòng, GUI dừng sớm để tiết kiệm thời gian.",
  "Luồng đọc dữ liệu": "Số luồng đọc ảnh từ ổ đĩa. Tăng có thể nhanh hơn nhưng không phải máy nào cũng cần.",
  "Cách tối ưu": "Thuật toán cập nhật model trong lúc học. Nếu không chắc, giữ Tự động.",
  "Nơi lưu kết quả": "Thư mục lưu output. Để trống để GUI tự dùng thư mục mặc định.",
  "Tên lần chạy": "Tên thư mục con cho lần chạy này, giúp phân biệt nhiều lần train.",
  "Tốc độ học đầu": "Mức thay đổi ban đầu của model. Cao quá dễ lỗi, thấp quá học chậm.",
  "Tốc độ học cuối": "Tốc độ học về cuối quá trình train.",
  "Đà học": "Giúp quá trình học ổn định hơn bằng cách giữ hướng cập nhật trước đó.",
  "Chống học vẹt": "Giảm nguy cơ model nhớ dataset quá mức nhưng nhận diện kém ngoài thực tế.",
  "Làm nóng ban đầu": "Cho model khởi động nhẹ vài vòng đầu để tránh cập nhật quá mạnh.",
  "Ghép ảnh huấn luyện": "Ghép nhiều ảnh thành một ảnh train để model thấy bối cảnh đa dạng hơn.",
  "Pha trộn ảnh": "Trộn ảnh và nhãn để tăng độ đa dạng dữ liệu.",
  "Đổi màu ánh sáng": "Tạo biến thể sáng tối để model bền hơn với điều kiện ánh sáng khác nhau.",
  "Xoay ảnh": "Tạo biến thể ảnh bị xoay nhẹ khi train.",
  "Dịch chuyển ảnh": "Tạo biến thể ảnh bị lệch vị trí để model bền hơn.",
  "Phóng thu ảnh": "Tạo biến thể zoom gần/xa khi train.",
  "Lật trái phải": "Tạo biến thể ảnh lật ngang, hữu ích khi vật thể có thể xuất hiện hai hướng.",
  "Model có sẵn": "Chọn model preset hoặc model đã train để đánh giá/dự đoán.",
  "Model cần đánh giá": "File model muốn kiểm tra chất lượng trên bộ dữ liệu kiểm tra.",
  "Bộ dữ liệu kiểm tra": "Dataset dùng để đo chất lượng model, thường là file cấu hình đã tạo ở tab Dữ liệu.",
  "Mức đánh giá": "Chọn mức kiểm tra nhanh hay kỹ. Kỹ hơn chạy lâu hơn.",
  "Nhanh": "Ưu tiên tốc độ, dùng khi muốn xem nhanh model có chạy được không.",
  "Chuẩn": "Mức cân bằng cho đa số lần kiểm tra.",
  "Kỹ": "Kiểm tra chặt hơn, phù hợp trước khi dùng model thật.",
  "Nguồn dữ liệu": "Nơi lấy ảnh, video, thư mục hoặc camera để model nhận diện.",
  "Mức lọc kết quả": "Điều chỉnh mức dễ/khó khi model quyết định có hiển thị vật thể hay không.",
  "Nhạy": "Hiển thị nhiều kết quả hơn, có thể có nhiều nhận nhầm hơn.",
  "Chắc chắn": "Chỉ hiển thị kết quả tự tin hơn, giảm nhận nhầm nhưng có thể bỏ sót.",
  "Ảnh hoặc video": "Dự đoán trên một file ảnh hoặc video.",
  "Thư mục ảnh": "Dự đoán toàn bộ ảnh trong một thư mục.",
  "Camera": "Dùng camera mặc định của máy để nhận diện trực tiếp.",
  "Nguồn dự đoán": "File, thư mục hoặc camera mà model sẽ chạy nhận diện.",
  "Camera mặc định": "Camera số 0 của máy. GUI tự gửi đúng giá trị cho YOLO.",
  "Lưu ảnh/video kết quả": "Lưu bản ảnh hoặc video đã vẽ khung nhận diện.",
  "Lưu nhãn máy đọc": "Lưu file nhãn dạng text để dùng cho kiểm tra hoặc pipeline khác.",
  "Lưu điểm tin cậy": "Ghi thêm điểm tự tin của từng vật thể vào file nhãn.",
  "Cắt riêng vật thể": "Lưu từng vật thể đã phát hiện thành ảnh riêng.",
  "Hiện tên vật thể": "Vẽ tên class lên ảnh/video kết quả.",
  "Hiện độ tin cậy": "Vẽ phần trăm tự tin lên ảnh/video kết quả.",
  "Vẽ khung nhận diện": "Hiển thị khung bao quanh vật thể.",
  "Gộp hộp trùng mạnh hơn": "Gộp các khung nhận diện trùng nhau để kết quả sạch hơn.",
  "Mask sắc nét hơn": "Dùng mask độ nét cao hơn cho bài toán tách vùng.",
  "Tối ưu GPU nhẹ hơn": "Dùng định dạng nhẹ hơn để giảm bộ nhớ GPU khi phù hợp.",
  "Đệm camera mượt hơn": "Giữ bộ đệm khi đọc camera/video để giảm giật hình.",
  "Ghi đè run": "Cho phép ghi vào thư mục kết quả đã tồn tại.",
  "Mức tin cậy tối thiểu": "Kết quả dưới mức này sẽ bị ẩn. Tăng lên để giảm nhận nhầm.",
  "Độ khớp hộp": "Ngưỡng gộp các khung bị trùng. Nếu không chắc, giữ mặc định.",
  "Số vật thể tối đa": "Giới hạn số vật thể được hiển thị trên mỗi ảnh.",
  "Đọc video cách quãng": "Bỏ qua một số frame để dự đoán video nhanh hơn.",
  "Độ dày khung": "Độ dày đường vẽ khung nhận diện trên ảnh/video kết quả.",
  "Model cần đóng gói": "File model muốn xuất sang định dạng dùng ở app/web/mobile/thiết bị khác.",
  "Mục đích sử dụng": "Chọn nơi bạn muốn dùng model, GUI sẽ map sang định dạng xuất phù hợp.",
  "Nén mạnh hơn": "Giảm kích thước model, có thể nhanh hơn nhưng cần kiểm tra lại chất lượng.",
  "Linh hoạt kích thước ảnh": "Cho phép model nhận nhiều kích thước ảnh hơn sau khi export.",
  "Tự làm gọn model": "Tối ưu cấu trúc model export để dễ chạy ở runtime khác.",
  "Gộp hộp trùng trong model": "Đưa bước gộp khung trùng vào model export nếu định dạng hỗ trợ.",
  "Phiên bản xuất nâng cao": "Phiên bản opset cho một số định dạng export. Giữ tự động nếu không chắc.",
  "Bộ nhớ GPU cho đóng gói": "Giới hạn bộ nhớ dùng khi export định dạng cần tối ưu GPU.",
  "Bộ dữ liệu mẫu khi nén mạnh": "Dataset dùng để hiệu chỉnh khi nén mạnh, giúp giữ chất lượng tốt hơn.",
  "Thư mục dataset": "Thư mục gốc chứa ảnh và nhãn. GUI sẽ tạo file cấu hình trong thư mục này.",
  "File sẽ được tạo": "Đường dẫn file cấu hình dataset mà GUI ghi tự động.",
  "Ảnh dùng để học": "Thư mục ảnh dùng để train model.",
  "Ảnh dùng để kiểm tra": "Thư mục ảnh dùng để kiểm tra chất lượng trong lúc train hoặc validate.",
  "Ảnh test thêm": "Thư mục test riêng nếu dataset có. Có thể để trống.",
  "Tên nhãn, mỗi dòng một nhãn": "Danh sách class model cần nhận diện, nhập mỗi class một dòng.",
  "Thư mục ảnh cần gán nhãn": "Thư mục chứa ảnh bạn muốn vẽ bounding box. Có thể chọn images/train hoặc images/val.",
  "Thư mục lưu nhãn": "Nơi lưu file .txt YOLO. Để trống thì GUI tự suy ra thư mục labels tương ứng.",
  "Danh sách class để gán": "Nhập danh sách nhãn, mỗi dòng một class. Khi vẽ box, GUI lưu class bằng số thứ tự trong danh sách này.",
  "Class đang vẽ": "Box mới sẽ dùng class đang chọn. Có thể chọn box cũ rồi đổi class.",
  "Vẽ bounding box như LabelImg": "Công cụ gán nhãn ảnh bằng cách kéo chuột để tạo hộp bao quanh vật thể.",
  "Mở thư mục ảnh": "Đọc danh sách ảnh trong thư mục đã chọn và tải nhãn YOLO hiện có nếu đã có file .txt.",
  "Lưu nhãn": "Ghi toàn bộ bounding box của ảnh đang mở thành file YOLO .txt.",
  "Chọn": "Mở bộ duyệt thư mục của GUI và gán đường dẫn vào ô này.",
  "Ảnh trong thư mục": "Danh sách ảnh có thể gán nhãn. Bấm vào từng ảnh để mở và chỉnh box.",
  "Box trong ảnh": "Danh sách bounding box của ảnh hiện tại. Bấm vào một box để chọn và đổi class hoặc xóa.",
  "Xóa box đang chọn": "Xóa bounding box đang được chọn trên ảnh hiện tại.",
  "Xóa toàn bộ box trong ảnh": "Xóa toàn bộ bounding box của ảnh hiện tại trước khi lưu lại.",
  "Sau khi tạo": "Quyết định GUI có tự gán dataset vừa tạo sang các tab khác hay không.",
  "Tự điền thư mục chuẩn": "Điền nhanh cấu trúc phổ biến images/train, images/val, images/test.",
  "Tạo và dùng ngay": "Tạo file cấu hình dataset và gán ngay vào các workflow cần dataset.",
  "Bộ dữ liệu cần kiểm tra": "Dataset muốn quét lỗi thiếu ảnh, thiếu nhãn hoặc class sai.",
  "Thư mục XML cũ": "Nơi chứa nhãn VOC XML cũ cần đổi sang định dạng YOLO.",
  "Nơi lưu nhãn mới": "Thư mục lưu file nhãn YOLO sau khi chuyển đổi.",
  "Ghi đè nhãn cũ nếu đã có": "Cho phép thay file nhãn cũ bằng nhãn mới khi convert.",
  "Nhãn model dự đoán": "Thư mục chứa file nhãn do model dự đoán.",
  "Nhãn đúng ban đầu": "Thư mục chứa file nhãn đúng dùng làm chuẩn so sánh.",
  "Mức khớp tối thiểu": "Mức trùng khung tối thiểu để tính là model dự đoán đúng.",
  "Số loại nhãn": "Số class cần tính điểm. Để trống để GUI tự suy ra khi có thể.",
  "Chuẩn bị dataset": "Tạo cấu hình dataset và kiểm tra lỗi dữ liệu trước khi train.",
  "Chuẩn bị rồi huấn luyện": "Tự chuẩn bị dataset, quét lỗi rồi chạy train.",
  "Đánh giá rồi đóng gói": "Kiểm tra chất lượng model, sau đó export sang định dạng bạn chọn.",
  "Dataset -> Train -> Đánh giá -> Đóng gói": "Chạy toàn bộ pipeline từ chuẩn bị dữ liệu đến xuất model.",
  "Automation đang chạy": "Danh sách các kịch bản tự động và trạng thái từng bước.",
  "Kịch bản": "Chạy nhiều bước YOLO liên tiếp bằng một nút.",
  "Phiên bản": "Xem phiên bản GUI hiện tại, changelog và kiểm tra bản mới trên GitHub.",
  "Cập nhật ngay": "Tải bản mới từ GitHub bằng git pull khi thư mục dự án không có file đang sửa.",
  "Kiểm tra lại": "Kiểm tra lại commit mới trên GitHub và trạng thái cập nhật.",
  "Trạng thái cập nhật": "Cho biết GUI đang là bản mới nhất hay có bản mới có thể cập nhật.",
  "Có gì mới": "Changelog các thay đổi chính theo từng phiên bản.",
  "Google Drive dùng chung cho mọi máy": "Kết nối một folder Google Drive public/shared để GUI tạo chuẩn thư mục chung cho Windows, máy khác và Colab.",
  "Bật Cloud mode": "Bật chế độ dùng workspace Drive chung. Khi tắt, GUI vẫn chạy local như bình thường.",
  "Google API key": "Key dùng để đọc metadata folder Drive public/shared. Key chỉ lưu local hoặc lấy từ biến môi trường, không ghi vào GitHub.",
  "Google Drive folder ID hoặc link": "Dán link folder Google Drive hoặc ID folder. Folder cần public/shared nếu chỉ dùng API key.",
  "Tên workspace chuẩn": "Tên thư mục chuẩn trong mirror local. Dùng cùng tên trên máy khác để dữ liệu được map giống nhau.",
  "Lưu cài đặt Cloud": "Lưu trạng thái bật Cloud, folder Drive và API key vào file local bị git ignore.",
  "Connect Google Drive": "Kiểm tra key, đọc folder Google Drive và tạo manifest/mirror theo chuẩn dữ liệu của GUI.",
  "Quy chuẩn dữ liệu khi bật Cloud": "Các folder mà GUI dùng thống nhất: datasets, models, runs, annotations, configs, exports và logs.",
  "Lưu và mở lại cấu hình, model, ảnh": "Cloud Manager lưu profile cấu hình GUI hiện tại và quét model, ảnh, dataset trong workspace để bấm dùng lại nhanh.",
  "Tên cấu hình muốn lưu": "Tên profile để bạn nhận ra cấu hình train/predict/dataset này sau này.",
  "Lưu cấu hình hiện tại": "Lưu các lựa chọn GUI hiện tại như dataset, model, preset train, nguồn dự đoán và annotator vào Cloud workspace.",
  "Profile đã lưu": "Danh sách cấu hình GUI đã lưu. Bấm Áp dụng để điền lại form mà không cần nhập tay.",
  "Thư viện Cloud": "Các model, file cấu hình, ảnh và folder kết quả đang nằm trong Cloud workspace local.",
  "Báo cáo máy đang chạy": "Tạo báo cáo môi trường để biết Python, PyTorch, CUDA, GPU và Ultralytics đang như thế nào.",
  "Trạng thái và nhật ký": "Theo dõi tiến trình và đọc log đầy đủ khi có lỗi.",
};

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 3500);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || `Request failed: ${response.status}`);
  }
  return payload;
}

function renderHealthStatus(status, detail = "") {
  const badge = qs("#healthStatus");
  if (!badge) return;

  const checkedAt = new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  badge.classList.remove("is-online", "is-offline", "is-checking");

  if (status === "online") {
    badge.classList.add("is-online");
    badge.textContent = "Online";
    badge.title = `Backend đang hoạt động. Kiểm tra lúc ${checkedAt}.`;
    return;
  }

  if (status === "offline") {
    badge.classList.add("is-offline");
    badge.textContent = "Mất kết nối";
    badge.title = `Không gọi được /api/health lúc ${checkedAt}.${detail ? ` ${detail}` : ""}`;
    return;
  }

  badge.classList.add("is-checking");
  badge.textContent = "Đang kiểm tra";
  badge.title = "GUI đang kiểm tra kết nối backend.";
}

async function loadHealthStatus() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("/api/health", {
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }
    renderHealthStatus("online");
    return payload;
  } catch (error) {
    renderHealthStatus("offline", error.message || "Health check lỗi.");
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function startHealthCheckCron() {
  if (state.healthTimer) return;
  renderHealthStatus("checking");
  loadHealthStatus().catch(() => {});
  state.healthTimer = window.setInterval(() => {
    loadHealthStatus().catch(() => {});
  }, HEALTH_CHECK_INTERVAL_MS);
}

function setIconRefresh() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function normalizeHelpKey(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[?：:]+$/g, "")
    .trim();
}

function contextualHelp(label) {
  const text = label.toLowerCase();
  if (text.includes("model")) return "Model là file hoặc preset dùng để train, đánh giá, dự đoán hoặc export.";
  if (text.includes("dataset") || text.includes("dữ liệu")) return "Mục này liên quan tới ảnh và nhãn mà YOLO dùng để học hoặc kiểm tra.";
  if (text.includes("gpu") || text.includes("cuda")) return "Mục này liên quan tới tăng tốc bằng card NVIDIA. Nếu không chắc, giữ tự động.";
  if (text.includes("nhật ký") || text.includes("log")) return "Nhật ký ghi tiến trình và lỗi đầy đủ để biết cần sửa gì.";
  if (text.includes("ảnh") || text.includes("video") || text.includes("camera")) return "Mục này chọn nguồn hình ảnh hoặc cách lưu kết quả nhận diện.";
  if (text.includes("đóng gói") || text.includes("export")) return "Mục này xuất model sang định dạng phù hợp để dùng ngoài GUI.";
  if (text.includes("automation")) return "Automation tự chạy nhiều bước liên tiếp để giảm thao tác thủ công.";
  return "Nếu không chắc mục này dùng để làm gì, hãy giữ mặc định của GUI.";
}

function helpTextFor(label) {
  const key = normalizeHelpKey(label);
  return helpCatalog[key] || contextualHelp(key);
}

function readableText(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll?.("input, select, textarea, .help-term, svg").forEach((node) => node.remove());
  return normalizeHelpKey(clone.textContent);
}

function attachHelpTerm(element, labelText = null) {
  if (!element || element.dataset.helpReady === "true") return;
  const label = normalizeHelpKey(labelText || readableText(element));
  if (!label) return;
  const help = helpTextFor(label);
  element.dataset.helpReady = "true";
  element.title = help;
  element.setAttribute("aria-label", `${label}. ${help}`);

  const icon = document.createElement("span");
  icon.className = "help-term";
  icon.tabIndex = 0;
  icon.setAttribute("role", "button");
  icon.setAttribute("aria-label", `Giải thích: ${help}`);
  icon.setAttribute("data-help", help);
  icon.title = help;
  icon.innerHTML = '<i data-lucide="circle-help"></i>';
  element.appendChild(icon);
}

function applyHelpTitle(element, labelText = null) {
  if (!element || element.dataset.helpTitleReady === "true") return;
  const label = normalizeHelpKey(labelText || readableText(element));
  if (!label) return;
  const help = helpTextFor(label);
  element.dataset.helpTitleReady = "true";
  element.title = help;
  element.setAttribute("aria-label", `${label}. ${help}`);
}

function enhanceInlineHelp() {
  [
    ".field > .label",
    ".section-label > span",
    ".choice-card strong",
    ".checkbox",
    ".advanced-block summary",
    ".panel-heading-row h3",
    ".automation-card h3",
    ".automation-step span",
    ".yaml-route-preview strong",
    ".wizard-step-strip span",
    ".check-tile strong",
    ".docs-card h4",
    ".term-grid strong",
    ".cloud-folder-card strong",
  ].forEach((selector) => qsa(selector).forEach((element) => attachHelpTerm(element)));

  qsa("button span:not(.icon), .quick-card small, .nav-item span").forEach((element) => applyHelpTitle(element));
  setIconRefresh();
}

function setActiveSection(section) {
  qsa(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.section === section));
  qsa(".quick-card").forEach((button) => button.classList.toggle("is-active", button.dataset.section === section));
  qsa(".page-section").forEach((panel) => panel.classList.toggle("is-active", panel.id === `section-${section}`));
  qs("#sectionTitle").textContent = sectionTitles[section] || "YOLO GUI";
  document.activeElement?.blur?.();
  const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  resetScroll();
  window.requestAnimationFrame(resetScroll);
  window.setTimeout(resetScroll, 80);
  if (section === "jobs") {
    loadJobs().catch((error) => showToast(error.message));
    loadLog().catch(() => {});
  }
  if (section === "automation") {
    loadAutomations().catch((error) => showToast(error.message));
    loadAutomationLog().catch(() => {});
  }
  if (section === "version") {
    loadVersion().catch((error) => showToast(error.message));
  }
  if (section === "dataset") {
    window.setTimeout(syncAnnotatorCanvas, 80);
  }
  if (section === "system") {
    loadCloudStatus().catch((error) => showToast(error.message));
    loadCloudManager({ silent: true }).catch(() => {});
  }
}

async function loadModels() {
  const payload = await api("/api/models");
  for (const select of qsa(".model-preset")) {
    select.innerHTML = "";
    for (const model of payload.models) {
      const option = document.createElement("option");
      option.value = model.value;
      option.textContent = friendlyModelLabel(model);
      select.appendChild(option);
    }
  }
}

function shortValue(value, fallback = "-") {
  return value ? String(value) : fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function compareVersionStrings(current, latest) {
  const currentParts = String(current || "")
    .replace(/^v/i, "")
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number);
  const latestParts = String(latest || "")
    .replace(/^v/i, "")
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number);
  const length = Math.max(currentParts.length, latestParts.length);
  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] || 0;
    const latestPart = latestParts[index] || 0;
    if (currentPart !== latestPart) return currentPart < latestPart ? -1 : 1;
  }
  return 0;
}

function isColabRuntime(runtime = state.runtime) {
  return runtime === "Google Colab";
}

function setBrandUpdateBusy(busy) {
  const button = qs("#brandUpdateButton");
  if (!button) return;
  button.disabled = busy;
  button.setAttribute("aria-busy", busy ? "true" : "false");
  button.querySelector("span:not(.icon)").textContent = busy ? "Updating..." : "Update now";
}

function versionLabel(value) {
  return value ? `v${value}` : "-";
}

function renderColabRestartPanel(restartStatus = null, versionPayload = null) {
  const panel = qs("#colabRestartPanel");
  if (!panel) return;
  const statePayload = restartStatus?.state || null;
  const requestPayload = restartStatus?.request || null;
  const shouldShow = Boolean(
    statePayload?.status || requestPayload?.status || (versionPayload?.restart_required && isColabRuntime(versionPayload.runtime)),
  );
  panel.classList.toggle("is-hidden", !shouldShow);
  if (!shouldShow) return;

  const status = statePayload?.status || requestPayload?.status || "requested";
  const titleMap = {
    requested: "Đã yêu cầu nạp lại server",
    starting: "Đang restart server",
    restarting: "Đang restart server",
    ready: "Đã nạp xong bản mới",
    switched: "Đã nạp xong bản mới",
    failed: "Không restart được server",
  };
  const detailMap = {
    requested: "Giữ tab này mở. Cell Colab sẽ giữ nguyên tunnel và restart server phía sau link hiện tại.",
    starting: "Cloudflare Tunnel vẫn chạy. Server YOLO GUI đang được nạp lại trên cùng port.",
    restarting: "Cloudflare Tunnel vẫn chạy. Server YOLO GUI đang được nạp lại trên cùng port.",
    ready: "Link hiện tại vẫn dùng được. GUI sẽ tự tải lại hoặc bạn có thể bấm nút bên dưới.",
    switched: "Link hiện tại vẫn dùng được. GUI sẽ tự tải lại hoặc bạn có thể bấm nút bên dưới.",
    failed: "Không thể restart server. Hãy xem log trong cell Colab hoặc chạy lại cell một lần.",
  };
  const url = statePayload?.tunnel_url || window.location.href;
  const canReload = ["ready", "switched"].includes(status);

  qs("#colabRestartTitle").textContent = titleMap[status] || "Đang xử lý cập nhật Colab";
  qs("#colabRestartDetail").textContent = statePayload?.message || detailMap[status] || detailMap.requested;
  const link = qs("#colabRestartLink");
  link.classList.toggle("is-hidden", !canReload || !url);
  if (url) {
    link.href = url;
  }
  setIconRefresh();
}

function appendVersionLog(lines) {
  const log = qs("#versionUpdateLog");
  const text = Array.isArray(lines) ? lines.filter(Boolean).join("\n") : String(lines || "");
  log.textContent = [log.textContent.trim(), text].filter(Boolean).join("\n");
}

function stopColabRestartWatch() {
  if (state.colabRestartTimer) {
    window.clearInterval(state.colabRestartTimer);
    state.colabRestartTimer = null;
  }
}

function startColabRestartWatch(restart) {
  if (!restart || !["colab_handoff", "colab_same_tunnel_restart"].includes(restart.mode)) return;
  stopColabRestartWatch();
  renderColabRestartPanel(
    {
      request: { request_id: restart.request_id, status: "requested" },
      state: { request_id: restart.request_id, status: "requested", message: restart.message },
    },
    { runtime: "Google Colab", restart_required: true },
  );

  let attempts = 0;
  const poll = async () => {
    attempts += 1;
    try {
      const payload = await api(restart.status_url || "/api/version/restart-status");
      renderColabRestartPanel(payload, { runtime: "Google Colab", restart_required: payload.restart_required });
      const status = payload.state?.status;
      const url = payload.state?.tunnel_url;
      if ((status === "ready" || status === "switched") && (url || payload.state?.same_tunnel)) {
        stopColabRestartWatch();
        appendVersionLog(["", "Server đã nạp xong sau Cloudflare Tunnel hiện tại.", "GUI sẽ tự tải lại trên cùng link."]);
        showToast("Đã nạp xong bản mới, đang tải lại GUI");
        window.setTimeout(() => window.location.reload(), 1200);
      } else if (status === "failed") {
        stopColabRestartWatch();
        appendVersionLog(["", payload.state?.message || "Không restart được server sau tunnel hiện tại."]);
      }
    } catch (error) {
      if (attempts >= 60) {
        stopColabRestartWatch();
        appendVersionLog(["", `Không đọc được trạng thái restart: ${error.message}`]);
      }
    }
  };

  poll();
  state.colabRestartTimer = window.setInterval(poll, 2000);
}

function renderVersionStatus(payload) {
  const status = qs("#versionStatus");
  const updateButton = qs("#updateVersionButton");
  const saveAndUpdateButton = qs("#saveAndUpdateVersionButton");
  const current = versionLabel(payload.current_version);
  const source = versionLabel(payload.source_version || payload.current_version);
  const latest = payload.latest_version ? versionLabel(payload.latest_version) : "Chưa rõ";
  const brandVersion = qs("#brandVersion");
  const brandUpdateButton = qs("#brandUpdateButton");
  const needsSaveBeforeUpdate = Boolean(payload.update_available && payload.can_save_and_update);
  const restartRequired = Boolean(payload.restart_required);
  const comparableVersion = payload.source_version || payload.current_version;
  const versionBehind = compareVersionStrings(comparableVersion, payload.latest_version) < 0;
  const canRunSidebarUpdate = Boolean(payload.can_update || needsSaveBeforeUpdate);

  state.runtime = payload.runtime || null;
  if (brandVersion) {
    brandVersion.textContent = restartRequired ? `${current} -> ${source}` : current;
    brandVersion.title = restartRequired
      ? `Source đã là ${source}, backend đang chạy ${current}`
      : versionBehind
        ? `Bản mới nhất: ${latest}`
        : "Phiên bản GUI hiện tại";
  }
  if (brandUpdateButton) {
    const showSidebarUpdate = Boolean(!restartRequired && (versionBehind || (payload.update_available && canRunSidebarUpdate)));
    brandUpdateButton.classList.toggle("is-hidden", !showSidebarUpdate);
    brandUpdateButton.disabled = false;
    brandUpdateButton.dataset.updateMode = payload.can_update ? "direct" : needsSaveBeforeUpdate ? "save" : "version";
    brandUpdateButton.title = payload.can_update
      ? `Cập nhật YOLO GUI lên ${latest}`
      : needsSaveBeforeUpdate
        ? `Có bản mới ${latest}. GUI sẽ sao lưu thay đổi local rồi cập nhật.`
        : showSidebarUpdate
          ? `Có bản mới ${latest}. Mở tab Phiên bản để xem lý do chưa cập nhật tự động được.`
        : "Bạn đang dùng phiên bản mới nhất.";
    brandUpdateButton.querySelector("span:not(.icon)").textContent = "Update now";
  }
  qs("#versionCurrent").textContent = restartRequired ? `${current} đang chạy · source ${source}` : current;
  qs("#versionFactCurrent").textContent = current;
  qs("#versionFactSource").textContent = source;
  qs("#versionFactLatest").textContent = latest;
  qs("#versionFactRuntime").textContent = shortValue(payload.runtime);
  qs("#versionFactBranch").textContent = shortValue(payload.local_branch);
  qs("#versionFactCommit").textContent = shortValue(payload.local_commit_short);
  qs("#versionFactRemote").textContent = shortValue(payload.remote_commit_short);
  qs("#versionFactRemoteUrl").textContent = shortValue(payload.remote_url);

  status.classList.remove("is-new", "is-current", "is-warning");
  if (restartRequired) {
    status.classList.add("is-warning");
    status.textContent = payload.status_message || `Source đã cập nhật lên ${source}, nhưng server vẫn đang chạy ${current}.`;
  } else if (payload.update_available) {
    status.classList.add(payload.can_update ? "is-new" : "is-warning");
    status.textContent = payload.status_message || `Có phiên bản mới: ${latest}`;
  } else if (payload.remote_commit) {
    status.classList.add("is-current");
    status.textContent = payload.status_message || "Bạn đang dùng phiên bản mới nhất.";
  } else {
    status.classList.add("is-warning");
    status.textContent = payload.status_message || "Chưa kiểm tra được phiên bản mới trên GitHub.";
  }

  updateButton.disabled = restartRequired || !payload.can_update;
  updateButton.querySelector("span:not(.icon)").textContent = payload.can_update
    ? "Cập nhật ngay"
    : restartRequired
      ? "Chờ nạp bản mới"
    : needsSaveBeforeUpdate
      ? "Cần sao lưu trước"
      : payload.update_available
        ? "Không thể cập nhật"
      : "Đã mới nhất";
  updateButton.title = payload.can_update
    ? "Tải bản mới từ GitHub"
    : restartRequired
      ? "Source đã cập nhật, cần nạp lại backend sau tunnel hiện tại trước khi cập nhật tiếp."
    : needsSaveBeforeUpdate
      ? "Repo đang có file đã sửa. Bấm Sao lưu rồi cập nhật để GUI cất tạm thay đổi trước."
      : payload.update_available
        ? "Chưa đủ điều kiện cập nhật tự động"
      : "Chưa có bản mới để cập nhật";

  saveAndUpdateButton.classList.toggle("is-hidden", !needsSaveBeforeUpdate);
  saveAndUpdateButton.disabled = restartRequired || !needsSaveBeforeUpdate;
  saveAndUpdateButton.title = needsSaveBeforeUpdate
    ? "Cất tạm thay đổi local bằng Git stash rồi cập nhật source từ GitHub"
    : "Chỉ dùng khi có bản mới nhưng repo đang có file đã sửa";
  renderChangelog(payload.changelog || []);
  renderColabRestartPanel(payload.restart_status, payload);
  updatePredictRuntimeGuards();
}

function renderChangelog(sections) {
  const list = qs("#changelogList");
  list.innerHTML = "";
  if (!sections.length) {
    list.textContent = "Chưa có changelog.";
    return;
  }
  for (const section of sections) {
    const article = document.createElement("article");
    article.className = "changelog-entry";
    const items = (section.items || []).map((item) => `<li>${item}</li>`).join("");
    article.innerHTML = `
      <div class="changelog-entry-head">
        <strong>${section.version || "Phiên bản"}</strong>
        <span>${section.date || ""}</span>
      </div>
      <ul>${items || "<li>Không có ghi chú chi tiết.</li>"}</ul>
    `;
    list.appendChild(article);
  }
  enhanceInlineHelp();
}

async function loadVersion() {
  const payload = await api("/api/version");
  renderVersionStatus(payload);
  return payload;
}

async function updateVersion() {
  const updateButton = qs("#updateVersionButton");
  updateButton.disabled = true;
  setBrandUpdateBusy(true);
  qs("#versionUpdateLog").textContent = "Đang cập nhật từ GitHub...\nKhông đóng app trong lúc cập nhật.";
  try {
    const payload = await api("/api/version/update", { method: "POST" });
    qs("#versionUpdateLog").textContent = [
      payload.message || "Đã chạy cập nhật.",
      payload.log_path ? `Log: ${payload.log_path}` : null,
      "",
      payload.log || "",
    ].filter(Boolean).join("\n");
    renderVersionStatus(payload.after);
    startColabRestartWatch(payload.restart);
    showToast(payload.message || "Đã cập nhật phiên bản");
  } finally {
    setBrandUpdateBusy(false);
  }
}

async function saveAndUpdateVersion() {
  const button = qs("#saveAndUpdateVersionButton");
  button.disabled = true;
  setBrandUpdateBusy(true);
  qs("#versionUpdateLog").textContent = [
    "Đang sao lưu thay đổi local rồi cập nhật từ GitHub...",
    "Không đóng app trong lúc cập nhật.",
  ].join("\n");
  try {
    const payload = await api("/api/version/save-and-update", { method: "POST" });
    qs("#versionUpdateLog").textContent = [
      payload.message || "Đã sao lưu thay đổi và cập nhật.",
      payload.stash_message ? `Nhãn sao lưu: ${payload.stash_message}` : null,
      payload.log_path ? `Log: ${payload.log_path}` : null,
      "",
      payload.log || "",
    ].filter(Boolean).join("\n");
    renderVersionStatus(payload.after);
    startColabRestartWatch(payload.restart);
    showToast(payload.message || "Đã sao lưu và cập nhật phiên bản");
  } finally {
    setBrandUpdateBusy(false);
  }
}

function runBrandUpdate() {
  const button = qs("#brandUpdateButton");
  const mode = button.dataset.updateMode;
  if (mode === "direct") {
    updateVersion().catch((error) => {
      showToast(error.message);
      qs("#versionUpdateLog").textContent = error.message;
      loadVersion().catch(() => {});
    });
    return;
  }
  if (mode === "save") {
    saveAndUpdateVersion().catch((error) => {
      showToast(error.message);
      qs("#versionUpdateLog").textContent = error.message;
      loadVersion().catch(() => {});
    });
    return;
  }
  setActiveSection("version");
}

function friendlyModelLabel(model) {
  const value = model.value || "";
  const family = model.family || model.label || "YOLO";
  const sizeCode = value.replace(".pt", "").slice(-1);
  const sizeMap = {
    n: "Nhanh nhất, máy yếu cũng chạy được",
    s: "Nhanh, cân bằng nhẹ",
    m: "Chuẩn, chất lượng tốt hơn",
    l: "Chính xác cao, cần GPU khỏe",
    x: "Mạnh nhất, cần nhiều GPU/VRAM",
  };
  return `${family} - ${sizeMap[sizeCode] || model.label}`;
}

function packageStatus(packageInfo) {
  return packageInfo?.installed ? packageInfo.version || "đã cài" : "chưa cài";
}

function runtimeFromStatus(payload) {
  return payload.runtime || state.runtime || "Local";
}

function formatGpuDevices(torchDevices, nvidiaGpus) {
  if (torchDevices.length) {
    return torchDevices.map((device) => `GPU: ${device.name} (${device.memory_gb}GB)`).join("\n");
  }
  if (nvidiaGpus.length) {
    return nvidiaGpus.map((device) => {
      const memoryGb = device.memory_mb ? `${Math.round(device.memory_mb / 1024)}GB` : "VRAM chưa rõ";
      return `GPU: ${device.name} (${memoryGb})`;
    }).join("\n");
  }
  return "GPU: chưa thấy NVIDIA/CUDA";
}

function colabGpuHelp(payload, torchDevices, nvidiaGpus) {
  if (payload.torch?.cuda_available && torchDevices.length) {
    return `GPU: ${torchDevices.map((device) => `${device.name} (${device.memory_gb}GB)`).join(", ")}`;
  }
  if (payload.nvidia?.available || nvidiaGpus.length) {
    return "GPU: có NVIDIA, PyTorch đang CPU";
  }
  return "GPU: chưa bật runtime GPU";
}

function renderSystemStatus(payload) {
  const runtime = runtimeFromStatus(payload);
  state.runtime = runtime;
  const torchDevices = payload.torch?.devices || [];
  const nvidiaGpus = payload.nvidia?.gpus || [];
  const card = qs(".system-card");
  const title = qs("#systemCardTitle");
  const lines = isColabRuntime(runtime)
    ? [
        "Môi trường: Google Colab",
        `Ultralytics: ${packageStatus(payload.ultralytics)}`,
        `PyTorch: ${packageStatus(payload.torch)}`,
        `Train: ${payload.torch?.cuda_available ? "GPU sẵn sàng" : "CPU, chậm hơn"}`,
        colabGpuHelp(payload, torchDevices, nvidiaGpus),
        payload.torch?.cuda_available ? null : "Bật GPU: Runtime > GPU",
      ]
        .filter(Boolean)
    : [
        `Môi trường: ${runtime}`,
        `Ultralytics: ${packageStatus(payload.ultralytics)}`,
        `PyTorch: ${packageStatus(payload.torch)}`,
        `CUDA: ${payload.torch?.cuda_available ? payload.torch.cuda_version || "sẵn sàng" : "chưa sẵn sàng"}`,
        formatGpuDevices(torchDevices, nvidiaGpus),
      ];

  title.textContent = isColabRuntime(runtime) ? "Colab hiện tại" : "Máy hiện tại";
  card.classList.toggle("is-colab", isColabRuntime(runtime));
  qs("#systemStatus").textContent = lines.join("\n");
  updatePredictRuntimeGuards();
}

function dependencyActionButtons() {
  return [
    qs("#installUltralyticsButton"),
    qs("#installTorchCudaButton"),
    qs("#installTorchCpuButton"),
    qs("#refreshDependencyButton"),
  ].filter(Boolean);
}

function setDependencyActionsDisabled(disabled) {
  state.dependencyActionsLocked = disabled;
  qs("#dependencyNotice")?.classList.toggle("is-action-locked", disabled);
  dependencyActionButtons().forEach((button) => {
    button.disabled = disabled;
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
  });
}

function isDependencyActionLocked(button = null) {
  return state.dependencyActionsLocked || Boolean(button?.disabled);
}

function guardDependencyAction(button = null) {
  if (!isDependencyActionLocked(button)) return false;
  showToast("GUI đang kiểm tra môi trường. Hãy chờ xong rồi bấm tiếp.");
  return true;
}

function renderDependencyCheckingState() {
  const card = qs("#dependencyNotice");
  const badge = qs("#dependencyBadge");
  const title = qs("#dependencyTitle");
  const detail = qs("#dependencyDetail");

  card.classList.remove("is-ready", "is-running", "has-log");
  card.classList.add("is-checking");
  card.setAttribute("aria-busy", "true");
  badge.className = "status-pill status-starting";
  badge.textContent = "Đang kiểm tra";
  title.textContent = "Đang kiểm tra môi trường YOLO";
  detail.textContent = "GUI đang kiểm tra Python, pip, NVIDIA/CUDA, PyTorch và Ultralytics.";
  setDependencyActionsDisabled(true);
}

function renderDependencyErrorState(error) {
  const card = qs("#dependencyNotice");
  const badge = qs("#dependencyBadge");
  const title = qs("#dependencyTitle");
  const detail = qs("#dependencyDetail");

  card.classList.remove("is-ready", "is-running", "is-checking");
  card.classList.add("has-log");
  card.setAttribute("aria-busy", "false");
  badge.className = "status-pill status-failed";
  badge.textContent = "Lỗi";
  title.textContent = "Không kiểm tra được môi trường";
  detail.textContent = error.message || "Không gọi được API kiểm tra môi trường. Có thể backend chưa chạy.";
  setDependencyActionsDisabled(true);
  state.dependencyActionsLocked = false;
  card.classList.remove("is-action-locked");
  qs("#refreshDependencyButton").disabled = false;
  qs("#refreshDependencyButton").setAttribute("aria-disabled", "false");
}

async function loadDependencyStatus(options = {}) {
  const requestSeq = ++state.dependencyStatusRequestSeq;
  setDependencyActionsDisabled(true);
  if (!options.silent) {
    renderDependencyCheckingState();
  }
  let payload;
  try {
    payload = await api("/api/dependencies/status");
  } catch (error) {
    if (requestSeq === state.dependencyStatusRequestSeq) {
      renderDependencyErrorState(error);
    }
    throw error;
  }
  if (requestSeq !== state.dependencyStatusRequestSeq) {
    return payload;
  }
  renderSystemStatus(payload);
  renderDependencyStatus(payload);
  if (payload.installing) {
    startDependencyPolling();
    await loadDependencyLog();
  } else {
    stopDependencyPolling();
  }
  return payload;
}

function renderDependencyStatus(payload) {
  const card = qs("#dependencyNotice");
  const badge = qs("#dependencyBadge");
  const title = qs("#dependencyTitle");
  const detail = qs("#dependencyDetail");

  card.classList.remove("is-ready", "is-running", "is-checking", "has-log");
  card.setAttribute("aria-busy", "false");
  qs("#installUltralyticsButton").querySelector("span:last-child").textContent =
    payload.ultralytics.installed ? "Cài lại Ultralytics" : "Cài Ultralytics";
  qs("#installTorchCudaButton").querySelector("span:last-child").textContent =
    payload.torch.installed && payload.torch.cuda_available ? "Cài lại PyTorch CUDA" : "Cài PyTorch CUDA";
  renderDependencyChecklist(payload);

  if (payload.installing) {
    card.classList.add("is-running", "has-log");
    badge.className = "status-pill status-running";
    badge.textContent = "Đang cài";
    title.textContent = "Đang cài môi trường YOLO";
    detail.textContent = `Python: ${payload.python}`;
    card.setAttribute("aria-busy", "true");
    setDependencyActionsDisabled(true);
    return;
  }

  setDependencyActionsDisabled(false);

  if (payload.ultralytics.installed && payload.torch.installed && payload.torch.cuda_available) {
    card.classList.add("is-ready");
    badge.className = "status-pill status-completed";
    badge.textContent = "GPU ready";
    title.textContent = "Môi trường GPU đã sẵn sàng";
    detail.textContent = `Torch ${payload.torch.version || "unknown"} · CUDA ${payload.torch.cuda_version || "available"} · Ultralytics ${payload.ultralytics.version || "unknown"}`;
    return;
  }

  if (payload.ultralytics.installed && payload.torch.installed) {
    card.classList.add("is-ready");
    badge.className = "status-pill status-completed";
    badge.textContent = "CPU ready";
    title.textContent = "Có thể chạy CPU, CUDA chưa sẵn sàng";
    detail.textContent = isColabRuntime(runtimeFromStatus(payload)) && !payload.nvidia.available
      ? "Colab đang ở CPU runtime. Vào Runtime > Change runtime type > GPU, rồi chạy lại cell YOLO GUI."
      : payload.nvidia.available
      ? "Máy có NVIDIA GPU nhưng PyTorch chưa thấy CUDA. Có thể cài PyTorch CUDA từ GUI."
      : "Không thấy NVIDIA GPU qua nvidia-smi. Có thể chạy CPU.";
    return;
  }

  badge.className = "status-pill status-failed";
  badge.textContent = "Thiếu";
  title.textContent = "Thiếu dependency YOLO";
  detail.textContent = "Cài PyTorch và Ultralytics trực tiếp trong GUI.";
  if (
    payload.ultralytics.install.status === "failed" ||
    payload.torch.cuda_install.status === "failed" ||
    payload.torch.cpu_install.status === "failed"
  ) {
    card.classList.add("has-log");
  }
}

function renderDependencyChecklist(payload) {
  const nvidiaText = payload.nvidia.available
    ? `${payload.nvidia.gpus.map((gpu) => gpu.name).join(", ")} · Driver ${payload.nvidia.driver_version || "unknown"}`
    : isColabRuntime(runtimeFromStatus(payload))
      ? "Colab đang ở CPU runtime. Bật GPU trong Runtime > Change runtime type, rồi chạy lại cell YOLO GUI."
    : payload.nvidia.error || "Không thấy nvidia-smi";
  const torchText = payload.torch.installed
    ? `${payload.torch.version || "unknown"}${payload.torch.cuda_available ? ` · CUDA ${payload.torch.cuda_version || "available"}` : " · CPU only"}`
    : "Chưa cài";
  const tiles = [
    { label: "Python/pip", ok: payload.pip.available, warn: false, text: payload.pip.available ? payload.pip.version : payload.pip.error || "pip lỗi" },
    { label: "NVIDIA/CUDA", ok: payload.nvidia.available, warn: !payload.nvidia.available, text: nvidiaText },
    { label: "PyTorch", ok: payload.torch.installed && payload.torch.cuda_available, warn: payload.torch.installed && !payload.torch.cuda_available, text: torchText },
    { label: "Ultralytics", ok: payload.ultralytics.installed, warn: false, text: payload.ultralytics.installed ? payload.ultralytics.version || "đã cài" : "Chưa cài" },
  ];

  qs("#dependencyChecklist").innerHTML = tiles
    .map((tile) => {
      const className = tile.ok ? "is-ok" : tile.warn ? "is-warn" : "is-bad";
      return `<div class="check-tile ${className}"><strong>${tile.label}</strong><span>${tile.text}</span></div>`;
    })
    .join("");
  enhanceInlineHelp();
}

async function performDependencyInstall(endpoint, message, button) {
  if (guardDependencyAction(button)) return;
  setDependencyActionsDisabled(true);
  try {
    await api(endpoint, { method: "POST" });
    await loadDependencyStatus();
    showToast(message);
    startDependencyPolling();
  } catch (error) {
    renderDependencyErrorState(error);
    throw error;
  }
}

async function installUltralytics() {
  await performDependencyInstall(
    "/api/dependencies/ultralytics/install",
    "Đã bắt đầu cài Ultralytics",
    qs("#installUltralyticsButton"),
  );
}

async function installTorchCuda() {
  await performDependencyInstall(
    "/api/dependencies/torch/install-cuda",
    "Đã bắt đầu cài PyTorch CUDA",
    qs("#installTorchCudaButton"),
  );
}

async function installTorchCpu() {
  await performDependencyInstall(
    "/api/dependencies/torch/install-cpu",
    "Đã bắt đầu cài PyTorch CPU",
    qs("#installTorchCpuButton"),
  );
}

async function refreshDependencyStatus() {
  const button = qs("#refreshDependencyButton");
  if (guardDependencyAction(button)) return;
  await loadDependencyStatus();
}

async function loadDependencyLog() {
  const [ultralytics, torchCuda, torchCpu] = await Promise.all([
    api("/api/dependencies/ultralytics/logs?tail=5000"),
    api("/api/dependencies/torch/logs?kind=cuda&tail=5000"),
    api("/api/dependencies/torch/logs?kind=cpu&tail=5000"),
  ]);
  const sections = [
    ["Ultralytics", ultralytics.log],
    ["PyTorch CUDA", torchCuda.log],
    ["PyTorch CPU", torchCpu.log],
  ].filter(([, log]) => log);
  qs("#dependencyLogOutput").textContent = sections.length
    ? sections.map(([name, log]) => `===== ${name} =====\n${log}`).join("\n\n")
    : "Chưa có nhật ký cài đặt.";
  if (sections.length) {
    qs("#dependencyNotice").classList.add("has-log");
  }
}

function startDependencyPolling() {
  if (state.dependencyTimer) return;
  state.dependencyTimer = window.setInterval(() => {
    loadDependencyStatus({ silent: true }).catch(() => {});
    loadDependencyLog().catch(() => {});
  }, 2500);
}

function stopDependencyPolling() {
  if (!state.dependencyTimer) return;
  window.clearInterval(state.dependencyTimer);
  state.dependencyTimer = null;
}

async function browsePath(path) {
  const payload = await api("/api/paths/list", {
    method: "POST",
    body: JSON.stringify({ path: path || null, include_files: true }),
  });
  qs("#folderPath").value = payload.path;
  const browser = qs("#pathBrowser");
  browser.innerHTML = "";

  if (payload.parent) {
    browser.appendChild(pathButton("..", payload.parent, "dir"));
  }
  for (const entry of payload.entries) {
    browser.appendChild(pathButton(entry.name, entry.path, entry.type, entry.is_data_yaml));
  }
  setIconRefresh();
}

function pathButton(name, path, type, isDataYaml = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "path-item";
  button.innerHTML = `<i data-lucide="${type === "dir" ? "folder" : "file"}"></i><span>${escapeHtml(name)}</span>`;
  button.addEventListener("click", () => {
    if (type === "dir") {
      browsePath(path).catch((error) => showToast(error.message));
      return;
    }
    setPathTarget(path);
    if (isDataYaml) {
      showToast("Đã gán bộ dữ liệu vào ô đang chọn");
    }
  });
  return button;
}

function setPathTarget(path) {
  const targetId = qs("#pathTarget").value;
  const target = document.getElementById(targetId);
  if (target) {
    target.value = path;
    if (targetId === "yamlRoot") {
      setYamlOutputPath(`${path.replace(/[\\/]$/, "")}\\data.yaml`);
    }
    updateDatasetDisplays();
  }
}

function openPathPickerForTarget(targetId) {
  const target = document.getElementById(targetId);
  const picker = qs(".path-tool");
  qs("#pathTarget").value = targetId;
  if (picker) {
    picker.open = true;
    picker.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const selectedPath = target?.value?.trim();
  if (selectedPath) {
    qs("#folderPath").value = selectedPath;
    browsePath(selectedPath).catch((error) => showToast(error.message));
  }
  qs("#folderPath").focus();
}

function useCurrentPath() {
  setPathTarget(qs("#folderPath").value.trim());
  showToast("Đã gán lựa chọn hiện tại");
}

function updateDatasetDisplays() {
  const pairs = [
    ["#trainDataPath", "#trainDatasetDisplay"],
    ["#valDataPath", "#valDatasetDisplay"],
    ["#exportDataPath", "#exportDatasetDisplay"],
    ["#auditPath", "#auditDatasetDisplay"],
  ];
  for (const [sourceSelector, displaySelector] of pairs) {
    const source = qs(sourceSelector);
    const display = qs(displaySelector);
    if (source && display) {
      display.value = source.value ? friendlyPath(source.value) : "";
    }
  }
}

function friendlyPath(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  return value.replace(/\\data\.ya?ml$/i, "").replace(/\/data\.ya?ml$/i, "") || value;
}

function setYamlOutputPath(path) {
  const value = String(path || "").trim();
  qs("#yamlOutputPath").value = value;
  const preview = qs("#yamlOutputPreview");
  if (preview) {
    preview.value = value;
  }
}

function annotatorClasses() {
  const classes = splitList(qs("#annotatorClasses").value);
  return classes.length ? classes : ["object"];
}

function updateAnnotatorClassSelect() {
  const select = qs("#annotatorClassSelect");
  const previous = select.value;
  select.innerHTML = "";
  annotatorClasses().forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${index}: ${name}`;
    select.appendChild(option);
  });
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function setButtonLabel(button, text) {
  const label = button?.querySelector("span:last-child");
  if (label) label.textContent = text;
}

function setAnnotatorBusy(busy, action = null) {
  state.annotator.busy = busy;
  setButtonLabel(qs("#loadAnnotatorButton"), busy && action === "load" ? "Đang mở ảnh..." : "Mở thư mục ảnh");
  setButtonLabel(qs("#saveAnnotationButton"), busy && action === "save" ? "Đang lưu..." : "Lưu nhãn");
  qsa("#annotatorImageDir, #annotatorLabelDir, #annotatorClasses, #annotatorClassSelect, .annotation-path-pick").forEach((element) => {
    element.disabled = busy;
  });
  qsa(".annotation-image-item, .annotation-box-item").forEach((button) => {
    button.disabled = busy;
  });
  updateAnnotatorButtons();
}

async function loadAnnotatorImages() {
  const imageDir = qs("#annotatorImageDir").value.trim();
  const labelDir = qs("#annotatorLabelDir").value.trim();
  if (!imageDir) throw new Error("Hãy chọn thư mục ảnh cần gán nhãn.");
  setAnnotatorBusy(true, "load");
  try {
    updateAnnotatorClassSelect();
    const payload = await api("/api/annotations/images", {
      method: "POST",
      body: JSON.stringify({ image_dir: imageDir, label_dir: labelDir || null }),
    });
    state.annotator.images = payload.images || [];
    state.annotator.currentIndex = -1;
    state.annotator.boxes = [];
    state.annotator.selectedBoxIndex = -1;
    qs("#annotatorImageCount").textContent = `${payload.count || 0} ảnh`;
    renderAnnotatorImageList();
    if (!state.annotator.images.length) {
      resetAnnotatorStage("Không tìm thấy ảnh trong thư mục đã chọn.");
      return;
    }
    await selectAnnotatorImage(0);
  } finally {
    setAnnotatorBusy(false);
  }
}

function resetAnnotatorStage(message = "Chọn thư mục ảnh rồi bấm mở.") {
  const shell = qs("#annotatorCanvasShell");
  shell.classList.remove("is-loaded");
  qs("#annotatorImage").removeAttribute("src");
  state.annotator.imageLoaded = false;
  state.annotator.boxes = [];
  state.annotator.selectedBoxIndex = -1;
  qs("#annotatorCurrentName").textContent = "Chưa chọn ảnh";
  qs("#annotatorLabelPath").textContent = "Nhãn sẽ lưu theo chuẩn YOLO .txt";
  qs("#annotatorEmptyState span").textContent = message;
  renderAnnotatorBoxes();
  updateAnnotatorButtons();
}

function renderAnnotatorImageList() {
  const list = qs("#annotatorImageList");
  list.innerHTML = "";
  if (!state.annotator.images.length) {
    list.textContent = "Chưa có ảnh.";
    return;
  }
  state.annotator.images.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `annotation-image-item ${index === state.annotator.currentIndex ? "is-active" : ""}`;
    button.disabled = state.annotator.busy;
    button.innerHTML = `
      <strong>${escapeHtml(image.name)}</strong>
      <span>${escapeHtml(image.relative || image.path)}</span>
      <span>${image.annotated ? "Đã có nhãn" : "Chưa có nhãn"} · ${image.box_count || 0} box</span>
    `;
    button.addEventListener("click", () => {
      selectAnnotatorImage(index).catch((error) => showToast(error.message));
    });
    list.appendChild(button);
  });
}

async function selectAnnotatorImage(index) {
  if (index < 0 || index >= state.annotator.images.length) return;
  state.annotator.currentIndex = index;
  state.annotator.selectedBoxIndex = -1;
  state.annotator.draftBox = null;
  state.annotator.drawing = null;
  state.annotator.imageLoaded = false;
  renderAnnotatorImageList();
  updateAnnotatorButtons();

  const image = state.annotator.images[index];
  qs("#annotatorCurrentName").textContent = image.relative || image.name;
  qs("#annotatorLabelPath").textContent = image.label_path || "Đang đọc nhãn...";
  const shell = qs("#annotatorCanvasShell");
  shell.classList.add("is-loaded");
  const img = qs("#annotatorImage");
  img.onload = () => {
    state.annotator.imageLoaded = true;
    window.requestAnimationFrame(() => {
      syncAnnotatorCanvas();
      window.requestAnimationFrame(syncAnnotatorCanvas);
    });
  };
  img.onerror = () => {
    resetAnnotatorStage("Không mở được ảnh này.");
    showToast("Không mở được ảnh để gán nhãn");
  };
  img.src = `/api/annotations/image?path=${encodeURIComponent(image.path)}&t=${Date.now()}`;

  const payload = await api("/api/annotations/read", {
    method: "POST",
    body: JSON.stringify({
      image_path: image.path,
      image_dir: qs("#annotatorImageDir").value.trim() || null,
      label_dir: qs("#annotatorLabelDir").value.trim() || null,
    }),
  });
  if (state.annotator.currentIndex !== index) return;
  state.annotator.boxes = payload.boxes || [];
  qs("#annotatorLabelPath").textContent = payload.label_path || image.label_path || "Nhãn YOLO .txt";
  renderAnnotatorBoxes();
  updateAnnotatorButtons();
  drawAnnotator();
  if (payload.errors?.length) {
    showToast(`File nhãn có ${payload.errors.length} dòng cần kiểm tra`);
  }
}

function syncAnnotatorCanvas() {
  if (!state.annotator.imageLoaded) return;
  const shell = qs("#annotatorCanvasShell");
  const img = qs("#annotatorImage");
  const canvas = qs("#annotatorCanvas");
  const imageRect = img.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const width = Math.max(1, Math.round(imageRect.width));
  const height = Math.max(1, Math.round(imageRect.height));
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${Math.round(imageRect.left - shellRect.left)}px`;
  canvas.style.top = `${Math.round(imageRect.top - shellRect.top)}px`;
  drawAnnotator();
}

function drawAnnotator() {
  const canvas = qs("#annotatorCanvas");
  if (!canvas || !canvas.width || !canvas.height) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.annotator.boxes.forEach((box, index) => {
    drawAnnotatorBox(ctx, box, index === state.annotator.selectedBoxIndex);
  });
  if (state.annotator.draftBox) {
    drawAnnotatorRect(ctx, state.annotator.draftBox, "#f59e0b", true);
  }
}

function drawAnnotatorBox(ctx, box, selected) {
  const classes = annotatorClasses();
  const rect = boxToCanvasRect(box);
  drawAnnotatorRect(ctx, rect, selected ? "#f97316" : "#0f766e", false);
  const label = classes[box.class_id] || `class ${box.class_id}`;
  ctx.font = "12px Arial";
  const textWidth = ctx.measureText(label).width + 12;
  ctx.fillStyle = selected ? "#f97316" : "#0f766e";
  ctx.fillRect(rect.x, Math.max(0, rect.y - 22), textWidth, 20);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, rect.x + 6, Math.max(14, rect.y - 8));
}

function drawAnnotatorRect(ctx, rect, color, dashed) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.fillStyle = dashed ? "rgba(245, 158, 11, 0.12)" : "rgba(15, 118, 110, 0.08)";
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function boxToCanvasRect(box) {
  const canvas = qs("#annotatorCanvas");
  return {
    x: (box.x - box.w / 2) * canvas.width,
    y: (box.y - box.h / 2) * canvas.height,
    w: box.w * canvas.width,
    h: box.h * canvas.height,
  };
}

function canvasRectToBox(rect) {
  const canvas = qs("#annotatorCanvas");
  const x1 = Math.max(0, Math.min(rect.x, rect.x + rect.w));
  const y1 = Math.max(0, Math.min(rect.y, rect.y + rect.h));
  const x2 = Math.min(canvas.width, Math.max(rect.x, rect.x + rect.w));
  const y2 = Math.min(canvas.height, Math.max(rect.y, rect.y + rect.h));
  return {
    class_id: Number(qs("#annotatorClassSelect").value || 0),
    x: ((x1 + x2) / 2) / canvas.width,
    y: ((y1 + y2) / 2) / canvas.height,
    w: (x2 - x1) / canvas.width,
    h: (y2 - y1) / canvas.height,
  };
}

function annotatorPointerPosition(event) {
  const rect = qs("#annotatorCanvas").getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function annotatorHitTest(point) {
  for (let index = state.annotator.boxes.length - 1; index >= 0; index -= 1) {
    const rect = boxToCanvasRect(state.annotator.boxes[index]);
    if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) {
      return index;
    }
  }
  return -1;
}

function annotatorPointerDown(event) {
  if (!state.annotator.imageLoaded) return;
  event.preventDefault();
  const point = annotatorPointerPosition(event);
  state.annotator.drawing = { start: point, current: point, hitIndex: annotatorHitTest(point) };
  state.annotator.draftBox = null;
  qs("#annotatorCanvas").setPointerCapture?.(event.pointerId);
}

function annotatorPointerMove(event) {
  if (!state.annotator.drawing) return;
  event.preventDefault();
  const point = annotatorPointerPosition(event);
  const start = state.annotator.drawing.start;
  const rect = { x: start.x, y: start.y, w: point.x - start.x, h: point.y - start.y };
  if (Math.abs(rect.w) > 3 || Math.abs(rect.h) > 3) {
    state.annotator.draftBox = rect;
  }
  drawAnnotator();
}

function annotatorPointerUp(event) {
  if (!state.annotator.drawing) return;
  event.preventDefault();
  const point = annotatorPointerPosition(event);
  const start = state.annotator.drawing.start;
  const width = Math.abs(point.x - start.x);
  const height = Math.abs(point.y - start.y);
  if (width < 6 || height < 6) {
    selectAnnotatorBox(state.annotator.drawing.hitIndex);
  } else {
    const box = canvasRectToBox({ x: start.x, y: start.y, w: point.x - start.x, h: point.y - start.y });
    if (box.w > 0 && box.h > 0) {
      state.annotator.boxes.push(box);
      selectAnnotatorBox(state.annotator.boxes.length - 1);
    }
  }
  state.annotator.drawing = null;
  state.annotator.draftBox = null;
  qs("#annotatorCanvas").releasePointerCapture?.(event.pointerId);
  drawAnnotator();
  renderAnnotatorBoxes();
  updateAnnotatorButtons();
}

function selectAnnotatorBox(index) {
  state.annotator.selectedBoxIndex = index;
  const box = state.annotator.boxes[index];
  if (box) {
    updateAnnotatorClassSelect();
    qs("#annotatorClassSelect").value = String(box.class_id);
  }
  renderAnnotatorBoxes();
  updateAnnotatorButtons();
  drawAnnotator();
}

function renderAnnotatorBoxes() {
  const list = qs("#annotatorBoxList");
  const boxes = state.annotator.boxes;
  qs("#annotatorBoxCount").textContent = `${boxes.length} box`;
  if (!boxes.length) {
    list.textContent = "Chưa có box.";
    return;
  }
  const classes = annotatorClasses();
  list.innerHTML = "";
  boxes.forEach((box, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `annotation-box-item ${index === state.annotator.selectedBoxIndex ? "is-active" : ""}`;
    button.disabled = state.annotator.busy;
    const label = classes[box.class_id] || `class ${box.class_id}`;
    button.innerHTML = `
      <strong>${escapeHtml(index + 1)}. ${escapeHtml(label)}</strong>
      <span>x ${(box.x * 100).toFixed(1)}%, y ${(box.y * 100).toFixed(1)}%</span>
      <span>w ${(box.w * 100).toFixed(1)}%, h ${(box.h * 100).toFixed(1)}%</span>
    `;
    button.addEventListener("click", () => selectAnnotatorBox(index));
    list.appendChild(button);
  });
}

function updateAnnotatorButtons() {
  const hasImage = state.annotator.currentIndex >= 0;
  const busy = state.annotator.busy;
  qs("#loadAnnotatorButton").disabled = busy;
  qs("#saveAnnotationButton").disabled = busy || !hasImage;
  qs("#prevAnnotatorImageButton").disabled = busy || !hasImage || state.annotator.currentIndex <= 0;
  qs("#nextAnnotatorImageButton").disabled = busy || !hasImage || state.annotator.currentIndex >= state.annotator.images.length - 1;
  qs("#deleteAnnotationBoxButton").disabled = busy || state.annotator.selectedBoxIndex < 0;
  qs("#clearAnnotationBoxesButton").disabled = busy || !hasImage || state.annotator.boxes.length === 0;
}

function updateSelectedAnnotatorClass() {
  const index = state.annotator.selectedBoxIndex;
  if (index < 0 || !state.annotator.boxes[index]) return;
  state.annotator.boxes[index].class_id = Number(qs("#annotatorClassSelect").value || 0);
  renderAnnotatorBoxes();
  drawAnnotator();
}

function deleteSelectedAnnotatorBox() {
  const index = state.annotator.selectedBoxIndex;
  if (index < 0) return;
  state.annotator.boxes.splice(index, 1);
  state.annotator.selectedBoxIndex = -1;
  renderAnnotatorBoxes();
  updateAnnotatorButtons();
  drawAnnotator();
}

function clearAnnotatorBoxes() {
  state.annotator.boxes = [];
  state.annotator.selectedBoxIndex = -1;
  renderAnnotatorBoxes();
  updateAnnotatorButtons();
  drawAnnotator();
}

async function saveCurrentAnnotation() {
  const image = state.annotator.images[state.annotator.currentIndex];
  if (!image) throw new Error("Chưa chọn ảnh để lưu nhãn.");
  setAnnotatorBusy(true, "save");
  try {
    const payload = await api("/api/annotations/save", {
      method: "POST",
      body: JSON.stringify({
        image_path: image.path,
        image_dir: qs("#annotatorImageDir").value.trim() || null,
        label_dir: qs("#annotatorLabelDir").value.trim() || null,
        boxes: state.annotator.boxes,
      }),
    });
    image.annotated = true;
    image.box_count = payload.box_count;
    image.label_path = payload.label_path;
    qs("#annotatorLabelPath").textContent = payload.label_path;
    renderAnnotatorImageList();
    showToast(`Đã lưu ${payload.box_count} box`);
  } finally {
    setAnnotatorBusy(false);
  }
}

function handleAnnotatorKeydown(event) {
  const active = document.activeElement;
  if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
  if (event.key === "Delete" || event.key === "Backspace") {
    if (state.annotator.selectedBoxIndex >= 0) {
      event.preventDefault();
      deleteSelectedAnnotatorBox();
    }
  }
}

function parseValue(name, value) {
  if (value === "") {
    return undefined;
  }
  if (numberFields.has(name)) {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
  return value;
}

function collectForm(formSelector) {
  const form = qs(formSelector);
  const data = {};
  for (const element of Array.from(form.elements)) {
    if (!element.name) continue;
    if (element.name.startsWith("ui_")) continue;
    if (element.disabled) continue;
    if (element.type === "radio" && !element.checked) continue;
    if (element.type === "checkbox") {
      data[element.name] = element.checked;
      continue;
    }
    const value = parseValue(element.name, element.value);
    if (value !== undefined) {
      data[element.name] = value;
    }
  }

  const customModel = form.querySelector("[data-custom-model]")?.value.trim();
  const presetModel = form.querySelector(".model-preset")?.value;
  if (customModel || presetModel) {
    data.model = customModel || presetModel;
  }

  const extraText = form.querySelector("[data-extra-args]")?.value.trim();
  data.extra_args = extraText ? JSON.parse(extraText) : {};
  applyGuiPresets(form, data);
  return data;
}

function checkedValue(form, name, fallback = "") {
  return form.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
}

function applyGuiPresets(form, data) {
  if (form.id === "trainForm") {
    const preset = checkedValue(form, "ui_train_preset", "balanced");
    if (preset !== "custom") {
      Object.assign(data, trainPresets[preset] || trainPresets.balanced);
    }
  }

  if (form.id === "valForm") {
    const preset = checkedValue(form, "ui_val_preset", "balanced");
    if (preset !== "custom") {
      Object.assign(data, valPresets[preset] || valPresets.balanced);
    }
  }

  if (form.id === "predictForm") {
    const sourceMode = checkedValue(form, "ui_predict_source_mode", "file");
    if (sourceMode === "camera") {
      data.source = qs("#predictCameraSelect").value;
    }
    const preset = checkedValue(form, "ui_predict_preset", "balanced");
    if (preset !== "custom") {
      Object.assign(data, predictPresets[preset] || predictPresets.balanced);
    }
  }
}

async function ensureDependencyReady() {
  const dependency = await loadDependencyStatus();
  if (dependency.installing) {
    showToast("Môi trường đang được cài. Đợi cài xong rồi chạy.");
    return false;
  }
  if (!dependency.ultralytics.installed || !dependency.torch.installed) {
    qs("#dependencyNotice").scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Cần cài PyTorch và Ultralytics trước khi chạy YOLO.");
    return false;
  }
  return true;
}

async function startWorkflow(kind) {
  const setup = workflowForms[kind];
  if (!setup) return;
  if (!(await ensureDependencyReady())) return;
  const payload = collectForm(setup.form);
  validateGuiPayload(kind, payload);
  const response = await api(setup.endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.selectedJobId = response.job.id;
  showToast(`Đã tạo tiến trình ${response.job.id}`);
  await loadJobs();
  startLogPolling();
  if (kind === "predict") {
    state.predictJobId = response.job.id;
    renderPredictRun(response.job, []);
    setPredictButtonRunning(true);
    startPredictPolling();
    qs("#predictRunPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  setActiveSection("jobs");
}

function validateGuiPayload(kind, payload) {
  if (["train", "val"].includes(kind) && !payload.data) {
    throw new Error("Hãy chọn hoặc tạo bộ dữ liệu trước khi chạy.");
  }
  if (kind === "predict" && !payload.source) {
    throw new Error("Hãy chọn ảnh, video, thư mục hoặc camera trước khi chạy.");
  }
  if (kind === "predict" && state.runtime === "Google Colab" && /^[0-9]+$/.test(String(payload.source).trim())) {
    throw new Error("Google Colab không hỗ trợ webcam trực tiếp. Hãy chọn ảnh, video hoặc thư mục ảnh; nếu cần camera, chạy GUI trên Windows/local.");
  }
  if (kind === "export" && !payload.model) {
    throw new Error("Hãy chọn file model cần đóng gói.");
  }
}

function datasetAutomationPayload() {
  const root = qs("#yamlRoot").value.trim();
  const names = splitList(qs("#yamlNames").value);
  if (!root || !names.length) return null;
  const outputPath = qs("#yamlOutputPath").value.trim() || `${root.replace(/[\\/]$/, "")}\\data.yaml`;
  return {
    output_path: outputPath,
    root,
    train: qs("#yamlTrain").value.trim() || "images/train",
    val: qs("#yamlVal").value.trim() || "images/val",
    test: qs("#yamlTest").value.trim() || null,
    names,
  };
}

function collectAutomationPayload(automationType) {
  const dataset = datasetAutomationPayload();
  const train = collectForm("#trainForm");
  const validate = collectForm("#valForm");
  const exportPayload = collectForm("#exportForm");
  const datasetPath = train.data || validate.data || qs("#auditPath").value.trim() || dataset?.output_path || "";

  if (datasetPath) {
    train.data = train.data || datasetPath;
    validate.data = validate.data || datasetPath;
    exportPayload.data = exportPayload.data || datasetPath;
  }
  if (!exportPayload.model && validate.model) {
    exportPayload.model = validate.model;
  }

  if (automationType === "prepare_dataset" && !dataset && !datasetPath) {
    throw new Error("Hãy chọn hoặc tạo thông tin dataset trước khi chạy automation.");
  }
  if (["train_ready", "full_pipeline"].includes(automationType) && !train.data && !dataset) {
    throw new Error("Hãy chọn dataset hoặc nhập thông tin tạo dataset trước khi tự động train.");
  }
  if (automationType === "evaluate_export" && !validate.model) {
    throw new Error("Hãy chọn model cần đánh giá trước.");
  }

  return {
    dataset,
    audit_path: datasetPath || null,
    train,
    validate,
    export: exportPayload,
  };
}

async function startAutomation(automationType) {
  if (automationType !== "prepare_dataset" && !(await ensureDependencyReady())) return;
  const payload = collectAutomationPayload(automationType);
  const response = await api("/api/automations/start", {
    method: "POST",
    body: JSON.stringify({ automation_type: automationType, payload }),
  });
  state.selectedAutomationId = response.automation.id;
  showToast(`Đã tạo automation ${response.automation.id}`);
  await loadAutomations();
  startAutomationPolling();
  setActiveSection("automation");
}

async function loadJobs() {
  const payload = await api("/api/jobs");
  const list = qs("#jobList");
  list.innerHTML = "";
  if (!payload.jobs.length) {
    list.textContent = "Chưa có tiến trình nào.";
    qs("#logOutput").textContent = "Chưa có tiến trình nào.";
    state.selectedJobId = null;
    updateStopButton([]);
    return;
  }
  const shouldAutoLoadLog = !state.selectedJobId;
  if (!state.selectedJobId || !payload.jobs.some((job) => job.id === state.selectedJobId)) {
    state.selectedJobId = payload.jobs[0].id;
  }
  for (const job of payload.jobs) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `job-card ${job.id === state.selectedJobId ? "is-selected" : ""}`;
    card.innerHTML = `
      <span>
        <strong>${friendlyJobType(job.job_type)}</strong>
        <small>${job.id} · ${job.log_path}</small>
      </span>
      <span class="status-pill status-${job.status}">${friendlyJobStatus(job.status)}</span>
    `;
    card.addEventListener("click", () => {
      state.selectedJobId = job.id;
      loadJobs().catch((error) => showToast(error.message));
      loadLog().catch((error) => showToast(error.message));
      startLogPolling();
    });
    list.appendChild(card);
  }
  updateStopButton(payload.jobs);
  if (shouldAutoLoadLog) {
    loadLog().catch(() => {});
  }
}

function friendlyJobType(type) {
  return {
    train: "Huấn luyện",
    val: "Đánh giá",
    predict: "Dự đoán",
    export: "Đóng gói",
  }[type] || type;
}

function friendlyJobStatus(status) {
  return {
    starting: "Đang chuẩn bị",
    running: "Đang chạy",
    stopping: "Đang dừng",
    stopped: "Đã dừng",
    completed: "Hoàn tất",
    failed: "Có lỗi",
  }[status] || status;
}

function isTerminalJobStatus(status) {
  return ["completed", "failed", "stopped"].includes(status);
}

function setPredictButtonRunning(running) {
  qsa('[data-start-workflow="predict"]').forEach((button) => {
    button.disabled = running;
    const label = button.querySelector("span:not(.icon)");
    if (label) {
      label.textContent = running ? "Đang dự đoán..." : "Bắt đầu dự đoán";
    }
  });
}

function renderPredictRun(job, artifacts = []) {
  const panel = qs("#predictRunPanel");
  const title = qs("#predictRunTitle");
  const detail = qs("#predictRunDetail");
  const badge = qs("#predictRunBadge");
  panel.classList.remove("is-hidden", "is-running", "is-completed", "is-failed");
  panel.classList.add(["starting", "running", "stopping"].includes(job.status) ? "is-running" : `is-${job.status}`);
  badge.className = `status-pill status-${job.status}`;
  badge.textContent = friendlyJobStatus(job.status);

  if (["starting", "running", "stopping"].includes(job.status)) {
    title.textContent = "Đang chạy dự đoán";
    detail.textContent = `Tiến trình ${job.id} đang xử lý. GUI sẽ tự hiện ảnh/video khi có kết quả.`;
    renderPredictArtifacts([], "Đang chờ ảnh/video kết quả...");
    return;
  }

  if (job.status === "completed") {
    title.textContent = "Dự đoán hoàn tất";
    detail.textContent = artifacts.length
      ? `Đã tìm thấy ${artifacts.length} file kết quả. Bấm ảnh để mở kích thước đầy đủ.`
      : "Dự đoán đã xong nhưng chưa thấy ảnh/video lưu. Hãy kiểm tra tùy chọn Lưu ảnh/video kết quả hoặc xem log đầy đủ.";
    renderPredictArtifacts(artifacts, "Chưa tìm thấy ảnh/video kết quả.");
    return;
  }

  title.textContent = job.status === "stopped" ? "Dự đoán đã dừng" : "Dự đoán gặp lỗi";
  detail.textContent = job.error || "Bấm Xem log đầy đủ để đọc nguyên lỗi và cách sửa.";
  renderPredictArtifacts(artifacts, "Chưa có ảnh/video kết quả.");
}

function renderPredictArtifacts(artifacts, emptyText) {
  const grid = qs("#predictPreviewGrid");
  grid.innerHTML = "";
  if (!artifacts.length) {
    const empty = document.createElement("p");
    empty.className = "predict-empty";
    empty.textContent = emptyText;
    grid.appendChild(empty);
    return;
  }

  for (const artifact of artifacts.slice(0, 12)) {
    const card = document.createElement("a");
    card.className = "predict-preview-item";
    card.href = artifact.url;
    card.target = "_blank";
    card.rel = "noreferrer";

    if (artifact.type === "video") {
      const video = document.createElement("video");
      video.src = artifact.url;
      video.controls = true;
      video.preload = "metadata";
      card.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = artifact.url;
      image.alt = artifact.name || "Kết quả dự đoán";
      image.loading = "lazy";
      card.appendChild(image);
    }

    const name = document.createElement("span");
    name.textContent = artifact.name || "Kết quả";
    card.appendChild(name);
    grid.appendChild(card);
  }
}

async function loadPredictRun() {
  if (!state.predictJobId) return;
  const [{ job }, artifactPayload] = await Promise.all([
    api(`/api/jobs/${state.predictJobId}`),
    api(`/api/jobs/${state.predictJobId}/artifacts`).catch(() => ({ artifacts: [] })),
  ]);
  renderPredictRun(job, artifactPayload.artifacts || []);
  if (isTerminalJobStatus(job.status)) {
    stopPredictPolling();
    setPredictButtonRunning(false);
  }
}

function startPredictPolling() {
  stopPredictPolling();
  state.predictTimer = window.setInterval(() => {
    loadPredictRun().catch(() => {});
  }, 2500);
  loadPredictRun().catch(() => {});
}

function stopPredictPolling() {
  if (!state.predictTimer) return;
  window.clearInterval(state.predictTimer);
  state.predictTimer = null;
}

function friendlyAutomationStatus(status) {
  return {
    starting: "Đang chuẩn bị",
    running: "Đang chạy",
    completed: "Hoàn tất",
    failed: "Có lỗi",
    pending: "Chờ chạy",
    skipped: "Bỏ qua",
  }[status] || status;
}

async function loadAutomations() {
  const payload = await api("/api/automations");
  const list = qs("#automationList");
  list.innerHTML = "";
  const automations = payload.automations || [];
  qs("#automationTotalCount").textContent = String(automations.length);
  qs("#automationRunningCount").textContent = String(automations.filter((item) => ["starting", "running"].includes(item.status)).length);
  qs("#automationDoneCount").textContent = String(automations.filter((item) => item.status === "completed").length);

  if (!automations.length) {
    list.textContent = "Chưa có automation nào.";
    qs("#automationLogOutput").textContent = "Chưa có nhật ký automation.";
    state.selectedAutomationId = null;
    return;
  }
  if (!state.selectedAutomationId || !automations.some((item) => item.id === state.selectedAutomationId)) {
    state.selectedAutomationId = automations[0].id;
  }
  for (const automation of automations) {
    list.appendChild(automationCard(automation));
  }
  enhanceInlineHelp();
  setIconRefresh();
  loadAutomationLog().catch(() => {});
}

function automationCard(automation) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `automation-run-card ${automation.id === state.selectedAutomationId ? "is-selected" : ""}`;
  const steps = (automation.steps || [])
    .map(
      (step) => `
        <span class="automation-step is-${step.status}">
          <i data-lucide="${automationStepIcon(step.status)}"></i>
          <span>${step.label}</span>
        </span>
      `,
    )
    .join("");
  card.innerHTML = `
    <span class="automation-run-head">
      <strong>${automation.name}</strong>
      <small>${automation.id}</small>
      <span class="status-pill status-${automation.status}">${friendlyAutomationStatus(automation.status)}</span>
    </span>
    <span class="automation-steps">${steps}</span>
  `;
  card.addEventListener("click", () => {
    state.selectedAutomationId = automation.id;
    loadAutomations().catch((error) => showToast(error.message));
    loadAutomationLog().catch((error) => showToast(error.message));
  });
  return card;
}

function automationStepIcon(status) {
  return {
    completed: "check",
    running: "loader-2",
    failed: "triangle-alert",
    skipped: "minus",
  }[status] || "circle";
}

async function loadAutomationLog() {
  if (!state.selectedAutomationId) return;
  const payload = await api(`/api/automations/${state.selectedAutomationId}/logs?tail=30000`);
  const output = qs("#automationLogOutput");
  output.textContent = payload.log || "Automation chưa có nhật ký.";
  output.scrollTop = output.scrollHeight;
}

function startAutomationPolling() {
  if (state.automationTimer) {
    window.clearInterval(state.automationTimer);
  }
  state.automationTimer = window.setInterval(() => {
    loadAutomations().catch(() => {});
    loadAutomationLog().catch(() => {});
  }, 2500);
}

function updateStopButton(jobs) {
  const selected = jobs.find((job) => job.id === state.selectedJobId);
  const canStop = selected && ["starting", "running", "stopping"].includes(selected.status);
  qs("#stopJobButton").disabled = !canStop;
}

async function loadLog() {
  if (!state.selectedJobId) return;
  const payload = await api(`/api/jobs/${state.selectedJobId}/logs?tail=30000`);
  const output = qs("#logOutput");
  output.textContent = payload.log || "Log chưa có nội dung.";
  output.scrollTop = output.scrollHeight;
}

function startLogPolling() {
  if (state.logTimer) {
    window.clearInterval(state.logTimer);
  }
  state.logTimer = window.setInterval(() => {
    if (!state.selectedJobId) return;
    loadJobs().catch(() => {});
    loadLog().catch(() => {});
  }, 2500);
}

async function stopSelectedJob() {
  if (!state.selectedJobId) return;
  await api(`/api/jobs/${state.selectedJobId}/stop`, {
    method: "POST",
    body: JSON.stringify({ force: false }),
  });
  showToast("Đã gửi yêu cầu dừng tiến trình");
  await loadJobs();
}

function splitList(text) {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeOutput(selector, payload) {
  qs(selector).textContent = typeof payload === "string" ? payload : formatToolOutput(payload);
}

function formatToolOutput(payload) {
  if (payload?.payload && payload?.path) {
    const names = Object.values(payload.payload.names || {});
    return [
      "Đã chuẩn bị xong bộ dữ liệu.",
      `Nơi lưu tự động: ${payload.path}`,
      `Thư mục dataset: ${payload.payload.path}`,
      `Ảnh học: ${payload.payload.train}`,
      `Ảnh kiểm tra: ${payload.payload.val}`,
      payload.payload.test ? `Ảnh test thêm: ${payload.payload.test}` : null,
      `Số nhãn: ${names.length}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (payload?.totals && payload?.splits) {
    const warnings = payload.warnings?.length ? payload.warnings.map((item) => `- ${item}`).join("\n") : "Không thấy lỗi lớn.";
    return [
      payload.ok ? "Bộ dữ liệu nhìn ổn." : "Bộ dữ liệu cần kiểm tra thêm.",
      `Tổng ảnh: ${payload.totals.images}`,
      `File nhãn: ${payload.totals.label_files}`,
      `Thiếu nhãn: ${payload.totals.missing_label_files}`,
      `Nhãn rỗng: ${payload.totals.empty_label_files}`,
      `Vật thể đã gắn nhãn: ${payload.totals.objects}`,
      "",
      "Ghi chú:",
      warnings,
    ].join("\n");
  }

  if (payload?.converted !== undefined && payload?.output_dir) {
    const errors = payload.errors?.length ? `\nLỗi: ${payload.errors.length} file cần xem lại.` : "";
    const unknown = payload.unknown_classes && Object.keys(payload.unknown_classes).length
      ? `\nNhãn lạ: ${Object.keys(payload.unknown_classes).join(", ")}`
      : "";
    return `Đã chuyển ${payload.converted} file nhãn.\nBỏ qua: ${payload.skipped}\nNơi lưu: ${payload.output_dir}${unknown}${errors}`;
  }

  if (payload?.summary && payload?.file_count !== undefined) {
    return [
      `Đã so sánh ${payload.file_count} file.`,
      `Precision: ${payload.summary.precision}`,
      `Recall: ${payload.summary.recall}`,
      `F1: ${payload.summary.f1}`,
      `Đúng: ${payload.summary.tp}`,
      `Nhầm: ${payload.summary.fp}`,
      `Bỏ sót: ${payload.summary.fn}`,
    ].join("\n");
  }

  return JSON.stringify(payload, null, 2);
}

async function auditDataset() {
  const path = qs("#auditPath").value.trim();
  if (!path) throw new Error("Hãy chọn hoặc tạo bộ dữ liệu trước khi kiểm tra.");
  const payload = await api("/api/datasets/audit", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
  writeOutput("#datasetToolOutput", payload);
}

async function createYaml() {
  const root = qs("#yamlRoot").value.trim();
  if (!root) throw new Error("Hãy chọn thư mục dataset trước.");
  const outputPath = qs("#yamlOutputPath").value.trim() || (root ? `${root.replace(/[\\/]$/, "")}\\data.yaml` : "");
  setYamlOutputPath(outputPath);
  const payload = await api("/api/datasets/create-yaml", {
    method: "POST",
    body: JSON.stringify({
      output_path: outputPath,
      root,
      train: qs("#yamlTrain").value.trim() || "images/train",
      val: qs("#yamlVal").value.trim() || "images/val",
      test: qs("#yamlTest").value.trim() || null,
      names: splitList(qs("#yamlNames").value),
    }),
  });
  setYamlOutputPath(payload.path);
  if (qs("#yamlAssignTargets").checked) {
    assignDatasetYaml(payload.path);
  }
  writeOutput("#datasetToolOutput", payload);
  showToast("Đã chuẩn bị bộ dữ liệu và gán vào các màn hình");
}

function assignDatasetYaml(path) {
  qs("#trainDataPath").value = path;
  qs("#valDataPath").value = path;
  qs("#auditPath").value = path;
  qs("#exportDataPath").value = path;
  updateDatasetDisplays();
}

function useYoloLayoutDefaults() {
  const root = qs("#yamlRoot").value.trim() || qs("#folderPath").value.trim();
  if (root) {
    const normalizedRoot = root.replace(/[\\/]$/, "");
    qs("#yamlRoot").value = normalizedRoot;
    setYamlOutputPath(`${normalizedRoot}\\data.yaml`);
  }
  qs("#yamlTrain").value = "images/train";
  qs("#yamlVal").value = "images/val";
  qs("#yamlTest").value = "images/test";
  showToast("Đã điền cấu trúc thư mục phổ biến");
}

function openDatasetWizard() {
  setActiveSection("dataset");
  qs(".path-tool").open = true;
  window.setTimeout(() => {
    qs("#yamlRoot").focus();
    qs("#yamlRoot").scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}

function updatePredictSourceMode() {
  const mode = checkedValue(qs("#predictForm"), "ui_predict_source_mode", "file");
  qs("#predictFilePanel").classList.toggle("is-hidden", mode === "camera");
  qs("#predictCameraPanel").classList.toggle("is-hidden", mode !== "camera");
}

function updatePredictRuntimeGuards() {
  const isColab = state.runtime === "Google Colab";
  const cameraChoice = qs("#predictCameraChoice");
  const cameraInput = cameraChoice?.querySelector('input[name="ui_predict_source_mode"]');
  const cameraText = qs("#predictCameraChoiceText");
  const note = qs("#predictColabCameraNote");
  if (!cameraChoice || !cameraInput || !cameraText || !note) return;

  cameraInput.disabled = isColab;
  cameraChoice.classList.toggle("is-disabled", isColab);
  note.classList.toggle("is-hidden", !isColab);
  cameraText.textContent = isColab
    ? "Không dùng được trên Google Colab."
    : "Dùng webcam đang cắm.";

  if (isColab && cameraInput.checked) {
    const fileInput = qs('input[name="ui_predict_source_mode"][value="file"]');
    if (fileInput) {
      fileInput.checked = true;
    }
  }
  updatePredictSourceMode();
}

async function convertVoc() {
  const payload = await api("/api/datasets/voc-to-yolo", {
    method: "POST",
    body: JSON.stringify({
      annotations_dir: qs("#vocAnnotationsDir").value.trim(),
      output_dir: qs("#vocOutputDir").value.trim(),
      classes: splitList(qs("#vocClasses").value),
      overwrite: qs("#vocOverwrite").checked,
    }),
  });
  writeOutput("#datasetToolOutput", payload);
  showToast("Đã convert VOC XML");
}

async function calculateMetrics() {
  const classCount = qs("#metricsClassCount").value.trim();
  const payload = await api("/api/datasets/metrics", {
    method: "POST",
    body: JSON.stringify({
      prediction_dir: qs("#metricsPredictionDir").value.trim(),
      ground_truth_dir: qs("#metricsGroundTruthDir").value.trim(),
      iou_threshold: Number(qs("#metricsIou").value || 0.5),
      class_count: classCount ? Number(classCount) : null,
    }),
  });
  writeOutput("#datasetToolOutput", payload);
}

function cloudControls() {
  return [
    qs("#cloudEnabled"),
    qs("#cloudGoogleApiKey"),
    qs("#cloudGoogleDriveFolder"),
    qs("#cloudRootName"),
    qs("#saveCloudSettingsButton"),
    qs("#connectGoogleDriveButton"),
    qs("#cloudProfileName"),
    qs("#cloudProfileNotes"),
    qs("#saveCloudProfileButton"),
    qs("#refreshCloudManagerButton"),
  ].filter(Boolean);
}

function setCloudBusy(busy, action = "check") {
  state.cloudBusy = busy;
  const panel = qs(".cloud-panel");
  panel?.classList.toggle("is-busy", busy);
  panel?.setAttribute("aria-busy", busy ? "true" : "false");

  cloudControls().forEach((control) => {
    control.disabled = busy;
    control.setAttribute("aria-disabled", busy ? "true" : "false");
  });

  const saveLabel = qs("#saveCloudSettingsButton span:last-child");
  const connectLabel = qs("#connectGoogleDriveButton span:last-child");
  if (!saveLabel || !connectLabel) return;

  if (!busy) {
    saveLabel.textContent = "Lưu cài đặt Cloud";
    connectLabel.textContent = "Connect Google Drive";
    return;
  }

  saveLabel.textContent = action === "save" ? "Đang lưu..." : "Đang khóa...";
  connectLabel.textContent = action === "connect" ? "Đang kết nối..." : "Đang kiểm tra...";
}

function formatCloudTime(value) {
  if (!value) return "Chưa kết nối";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function cloudPayloadFromForm() {
  return {
    enabled: qs("#cloudEnabled").checked,
    provider: "google_drive",
    google_api_key: qs("#cloudGoogleApiKey").value.trim() || null,
    google_drive_folder: qs("#cloudGoogleDriveFolder").value.trim() || null,
    root_name: qs("#cloudRootName").value.trim() || "YOLO-GUI-Cloud",
    clear_api_key: false,
  };
}

function renderCloudFolders(folders = []) {
  const container = qs("#cloudStandardFolders");
  if (!container) return;
  container.innerHTML = folders.length
    ? folders.map((folder) => {
      const driveLabel = folder.drive_ready ? "Có trên Drive" : "Chưa thấy trên Drive";
      const driveClass = folder.drive_ready ? "is-ready" : "is-local";
      const driveName = folder.drive_folder?.name || folder.key;
      return `
        <article class="cloud-folder-card ${driveClass}">
          <div class="cloud-folder-icon"><i data-lucide="${folder.drive_ready ? "cloud-check" : "folder"}"></i></div>
          <div>
            <strong>${escapeHtml(folder.label || folder.key)}</strong>
            <span>${escapeHtml(folder.description || "")}</span>
            <small>${escapeHtml(driveLabel)} · ${escapeHtml(driveName)}</small>
            <code>${escapeHtml(folder.local_path || "")}</code>
          </div>
        </article>
      `;
    }).join("")
    : '<article class="cloud-folder-card is-local"><div class="cloud-folder-icon"><i data-lucide="folder"></i></div><div><strong>Chưa có dữ liệu</strong><span>Bấm lưu cài đặt hoặc kết nối Google Drive để tạo chuẩn thư mục.</span></div></article>';
}

function renderCloudStatus(payload) {
  state.cloud = payload;
  const enabled = Boolean(payload?.enabled);
  const connected = Boolean(payload?.connected);
  qs(".cloud-panel")?.classList.toggle("is-cloud-enabled", enabled);
  qs(".cloud-panel")?.classList.toggle("is-cloud-connected", connected);
  const badge = qs("#cloudStatusBadge");
  if (badge) {
    badge.className = "status-pill";
    if (connected) {
      badge.classList.add("status-completed");
      badge.textContent = "Đã kết nối";
    } else if (enabled && payload?.has_api_key) {
      badge.classList.add("status-starting");
      badge.textContent = "Đã bật";
    } else if (enabled) {
      badge.classList.add("status-failed");
      badge.textContent = "Thiếu key";
    } else {
      badge.classList.add("status-idle");
      badge.textContent = "Chưa bật";
    }
  }

  qs("#cloudEnabled").checked = enabled;
  qs("#cloudGoogleDriveFolder").value = payload?.google_drive_folder || "";
  qs("#cloudRootName").value = payload?.root_name || "YOLO-GUI-Cloud";
  const keyInput = qs("#cloudGoogleApiKey");
  keyInput.value = "";
  keyInput.placeholder = payload?.has_api_key
    ? `Đã lưu key ${payload.api_key_masked || "***"} (${payload.api_key_source || "local"})`
    : "Dán API key để kết nối Drive public/shared";

  qs("#cloudKeyStatus").textContent = payload?.has_api_key
    ? `${payload.api_key_masked || "***"} · ${payload.api_key_source || "local"}`
    : "Chưa có";
  qs("#cloudDriveFolderId").textContent = payload?.google_drive_folder_id || "Chưa chọn";
  qs("#cloudLocalRoot").textContent = payload?.local_root || "-";
  qs("#cloudLastConnected").textContent = formatCloudTime(payload?.last_connected_at);
  renderCloudFolders(payload?.standard_folders || []);

  const lines = [
    connected ? "Cloud đã kết nối Google Drive." : enabled ? "Cloud đã bật, cần connect Drive để đọc metadata." : "Cloud đang tắt.",
    payload?.root_drive?.name ? `Drive root: ${payload.root_drive.name}` : null,
    payload?.google_drive_folder_id ? `Drive folder ID: ${payload.google_drive_folder_id}` : null,
    payload?.local_root ? `Local mirror: ${payload.local_root}` : null,
    payload?.manifest_path ? `Manifest: ${payload.manifest_path}` : null,
    payload?.last_error ? `Lỗi gần nhất: ${payload.last_error}` : null,
    "",
    "Lưu ý: API key chỉ đọc folder Google Drive public/shared. Private Drive hoặc upload/sync 2 chiều cần OAuth ở bước sau.",
  ].filter((line) => line !== null);
  qs("#cloudOutput").textContent = lines.join("\n");
  enhanceInlineHelp();
  setIconRefresh();
}

async function loadCloudStatus(options = {}) {
  if (!options.silent) {
    setCloudBusy(true, "check");
  }
  try {
    const payload = await api("/api/cloud/status");
    renderCloudStatus(payload);
    return payload;
  } finally {
    if (!options.silent) {
      setCloudBusy(false);
    }
  }
}

async function saveCloudSettings() {
  if (state.cloudBusy) {
    showToast("Cloud đang xử lý. Hãy chờ xong rồi bấm tiếp.");
    return null;
  }
  setCloudBusy(true, "save");
  try {
    const payload = await api("/api/cloud/settings", {
      method: "POST",
      body: JSON.stringify(cloudPayloadFromForm()),
    });
    renderCloudStatus(payload);
    await loadCloudManager({ silent: true });
    showToast("Đã lưu cài đặt Cloud");
    return payload;
  } finally {
    setCloudBusy(false);
  }
}

async function connectGoogleDrive() {
  if (state.cloudBusy) {
    showToast("Cloud đang xử lý. Hãy chờ xong rồi bấm tiếp.");
    return null;
  }
  setCloudBusy(true, "connect");
  try {
    await api("/api/cloud/settings", {
      method: "POST",
      body: JSON.stringify(cloudPayloadFromForm()),
    });
    const payload = await api("/api/cloud/google-drive/connect", { method: "POST" });
    renderCloudStatus(payload);
    await loadCloudManager({ silent: true });
    showToast("Đã kết nối Google Drive");
    return payload;
  } catch (error) {
    const status = await api("/api/cloud/status").catch(() => null);
    if (status) renderCloudStatus(status);
    qs("#cloudOutput").textContent = [
      "Không kết nối được Google Drive.",
      error.message,
      "",
      "Kiểm tra lại API key, folder ID/link và quyền public/shared của folder.",
    ].join("\n");
    throw error;
  } finally {
    setCloudBusy(false);
  }
}

function collectFormUiState(formSelector) {
  const form = qs(formSelector);
  const payload = {
    fields: {},
    checks: {},
    radios: {},
    model_preset: form.querySelector(".model-preset")?.value || "",
    custom_model: form.querySelector("[data-custom-model]")?.value.trim() || "",
    extra_args: form.querySelector("[data-extra-args]")?.value.trim() || "",
  };
  for (const element of Array.from(form.elements)) {
    if (!element.name) continue;
    if (element.type === "radio") {
      if (element.checked) payload.radios[element.name] = element.value;
      continue;
    }
    if (element.type === "checkbox") {
      payload.checks[element.name] = element.checked;
      continue;
    }
    payload.fields[element.name] = element.value;
  }
  return payload;
}

function applyFormUiState(formSelector, payload = {}) {
  const form = qs(formSelector);
  if (!form) return;
  Object.entries(payload.radios || {}).forEach(([name, value]) => {
    const input = form.querySelector(`input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(String(value))}"]`);
    if (input) input.checked = true;
  });
  Object.entries(payload.checks || {}).forEach(([name, value]) => {
    form.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(name)}"]`).forEach((input) => {
      input.checked = Boolean(value);
    });
  });
  Object.entries(payload.fields || {}).forEach(([name, value]) => {
    form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((element) => {
      if (element.type !== "radio" && element.type !== "checkbox") {
        element.value = value ?? "";
      }
    });
  });
  const modelPreset = form.querySelector(".model-preset");
  if (modelPreset && payload.model_preset) modelPreset.value = payload.model_preset;
  const customModel = form.querySelector("[data-custom-model]");
  if (customModel) customModel.value = payload.custom_model || "";
  const extraArgs = form.querySelector("[data-extra-args]");
  if (extraArgs) extraArgs.value = payload.extra_args || "";
}

const cloudProfileFieldIds = [
  "yamlRoot",
  "yamlOutputPath",
  "yamlTrain",
  "yamlVal",
  "yamlTest",
  "yamlNames",
  "trainDataPath",
  "valDataPath",
  "exportDataPath",
  "auditPath",
  "predictSourcePath",
  "annotatorImageDir",
  "annotatorLabelDir",
  "annotatorClasses",
  "exportModelPath",
  "valModelCustom",
  "predictModelCustom",
  "trainModelCustom",
];

function collectCloudFieldSnapshot() {
  const fields = {};
  cloudProfileFieldIds.forEach((id) => {
    const element = qs(`#${id}`);
    if (element) fields[id] = element.value || "";
  });
  return fields;
}

function applyCloudFieldSnapshot(fields = {}) {
  Object.entries(fields).forEach(([id, value]) => {
    const element = qs(`#${id}`);
    if (element) element.value = value || "";
  });
  if (fields.yamlOutputPath !== undefined) {
    setYamlOutputPath(fields.yamlOutputPath || "");
  } else if (fields.yamlRoot) {
    setYamlOutputPath(`${String(fields.yamlRoot).replace(/[\\/]$/, "")}\\data.yaml`);
  }
  updateDatasetDisplays();
  updateAnnotatorClassSelect();
}

function collectCloudProfilePayload() {
  const fields = collectCloudFieldSnapshot();
  return {
    saved_from: "YOLO GUI",
    saved_at: new Date().toISOString(),
    fields,
    train: collectForm("#trainForm"),
    train_ui: collectFormUiState("#trainForm"),
    validate: collectForm("#valForm"),
    validate_ui: collectFormUiState("#valForm"),
    predict: collectForm("#predictForm"),
    predict_ui: collectFormUiState("#predictForm"),
    export: collectForm("#exportForm"),
    export_ui: collectFormUiState("#exportForm"),
    dataset: {
      root: fields.yamlRoot || "",
      yaml_output_path: fields.yamlOutputPath || "",
      train: fields.yamlTrain || "",
      val: fields.yamlVal || "",
      test: fields.yamlTest || "",
      names: splitList(fields.yamlNames || ""),
    },
    annotator: {
      image_dir: fields.annotatorImageDir || "",
      label_dir: fields.annotatorLabelDir || "",
      classes: splitList(fields.annotatorClasses || ""),
    },
  };
}

function applyCloudProfile(profile) {
  const payload = profile?.payload || {};
  applyFormUiState("#trainForm", payload.train_ui);
  applyFormUiState("#valForm", payload.validate_ui);
  applyFormUiState("#predictForm", payload.predict_ui);
  applyFormUiState("#exportForm", payload.export_ui);
  applyCloudFieldSnapshot(payload.fields || {});

  const datasetPath = payload.train?.data || payload.validate?.data || payload.dataset?.yaml_output_path || "";
  if (datasetPath) {
    assignDatasetYaml(datasetPath);
  }
  if (payload.predict?.source) {
    qs("#predictSourcePath").value = payload.predict.source;
  }
  updatePredictSourceMode();
  updatePredictRuntimeGuards();
  updateDatasetDisplays();
  updateAnnotatorClassSelect();
  showToast(`Đã áp dụng profile: ${profile.name || profile.id}`);
}

function useCloudAsset(path, action) {
  if (!path) return;
  if (action === "model-train") {
    qs("#trainModelCustom").value = path;
    setActiveSection("train");
    showToast("Đã gán model vào Huấn luyện");
    return;
  }
  if (action === "model-predict") {
    qs("#predictModelCustom").value = path;
    setActiveSection("predict");
    showToast("Đã gán model vào Dự đoán");
    return;
  }
  if (action === "model-export") {
    qs("#exportModelPath").value = path;
    setActiveSection("export");
    showToast("Đã gán model vào Đóng gói");
    return;
  }
  if (action === "dataset-yaml") {
    assignDatasetYaml(path);
    setActiveSection("train");
    showToast("Đã gán data.yaml vào các tab YOLO");
    return;
  }
  if (action === "predict-source") {
    qs("#predictSourcePath").value = path;
    const fileInput = qs('input[name="ui_predict_source_mode"][value="file"]');
    if (fileInput) fileInput.checked = true;
    updatePredictSourceMode();
    setActiveSection("predict");
    showToast("Đã gán ảnh/nguồn vào Dự đoán");
    return;
  }
  if (action === "dataset-root") {
    qs("#yamlRoot").value = path;
    setYamlOutputPath(`${path.replace(/[\\/]$/, "")}\\data.yaml`);
    setActiveSection("dataset");
    showToast("Đã gán thư mục dataset vào wizard");
  }
}

function cloudAssetActions(section, asset) {
  const path = asset.path || "";
  if (section === "models" || section === "exports") {
    return [
      ["model-train", "Train"],
      ["model-predict", "Predict"],
      ["model-export", "Export"],
    ];
  }
  if (section === "configs" && /\.(ya?ml)$/i.test(asset.name || "")) {
    return [["dataset-yaml", "Dùng data.yaml"]];
  }
  if (section === "images") {
    return [["predict-source", "Dự đoán"]];
  }
  if (section === "datasets") {
    return [["dataset-root", "Dùng dataset"]];
  }
  return path ? [] : [];
}

function renderCloudManager(payload) {
  state.cloudManager = payload;
  const profiles = payload?.profiles || [];
  qs("#cloudProfileCount").textContent = `${profiles.length} profile`;
  qs("#cloudProfilesList").innerHTML = profiles.length
    ? profiles.map((profile) => `
      <article class="cloud-profile-card">
        <div>
          <strong>${escapeHtml(profile.name || profile.id)}</strong>
          <span>${escapeHtml(formatCloudTime(profile.saved_at))}</span>
          ${(profile.summary || []).map((line) => `<small>${escapeHtml(line)}</small>`).join("")}
        </div>
        <div class="cloud-card-actions">
          <button class="button is-light" type="button" data-cloud-apply-profile="${escapeHtml(profile.id)}"><span>Áp dụng</span></button>
          <button class="button is-light" type="button" data-cloud-delete-profile="${escapeHtml(profile.id)}"><span>Xóa</span></button>
        </div>
      </article>
    `).join("")
    : "Chưa có profile. Bấm lưu cấu hình hiện tại để tạo profile đầu tiên.";

  const sections = [
    ["models", "Models"],
    ["configs", "Configs"],
    ["images", "Ảnh"],
    ["datasets", "Datasets"],
    ["runs", "Runs"],
    ["exports", "Exports"],
  ];
  const assets = payload?.assets || {};
  let total = 0;
  const html = sections.map(([key, label]) => {
    const items = assets[key] || [];
    total += items.length;
    if (!items.length) {
      return `<section class="cloud-asset-section"><h5>${label}</h5><p>Chưa có mục nào.</p></section>`;
    }
    return `<section class="cloud-asset-section"><h5>${label}</h5>${items.slice(0, 8).map((asset) => {
      const actions = cloudAssetActions(key, asset);
      return `
        <article class="cloud-asset-card">
          <div>
            <strong>${escapeHtml(asset.name)}</strong>
            <span>${escapeHtml(asset.relative_path || asset.path || "")}</span>
            <small>${asset.kind === "folder" ? "Folder" : formatBytes(asset.size)} · ${escapeHtml(formatCloudTime(asset.modified_at))}</small>
          </div>
          <div class="cloud-card-actions">
            ${actions.map(([action, text]) => `<button class="button is-light" type="button" data-cloud-use-asset="${escapeHtml(asset.path)}" data-cloud-asset-action="${action}"><span>${text}</span></button>`).join("")}
          </div>
        </article>
      `;
    }).join("")}</section>`;
  }).join("");
  qs("#cloudAssetCount").textContent = `${total} mục`;
  qs("#cloudAssetsList").innerHTML = html;
  enhanceInlineHelp();
  setIconRefresh();
}

async function loadCloudManager(options = {}) {
  if (!options.silent) {
    setCloudBusy(true, "check");
  }
  try {
    const payload = await api("/api/cloud/manager");
    renderCloudManager(payload);
    return payload;
  } finally {
    if (!options.silent) {
      setCloudBusy(false);
    }
  }
}

async function saveCloudProfile() {
  if (state.cloudBusy) {
    showToast("Cloud đang xử lý. Hãy chờ xong rồi bấm tiếp.");
    return null;
  }
  setCloudBusy(true, "save");
  try {
    const payload = await api("/api/cloud/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: qs("#cloudProfileName").value.trim() || "Cấu hình YOLO hiện tại",
        notes: qs("#cloudProfileNotes").value.trim() || null,
        payload: collectCloudProfilePayload(),
      }),
    });
    renderCloudManager(payload);
    showToast("Đã lưu profile vào Cloud Manager");
    return payload;
  } finally {
    setCloudBusy(false);
  }
}

async function deleteCloudProfile(profileId) {
  if (!profileId) return;
  setCloudBusy(true, "save");
  try {
    const payload = await api(`/api/cloud/profiles/${encodeURIComponent(profileId)}`, { method: "DELETE" });
    renderCloudManager(payload);
    showToast("Đã xóa profile Cloud");
  } finally {
    setCloudBusy(false);
  }
}

async function createReport() {
  const payload = await api("/api/system/report", { method: "POST" });
  writeOutput(
    "#systemReportOutput",
    [
      "Đã tạo báo cáo máy đang chạy.",
      `Bản dễ đọc: ${payload.markdown_path}`,
      `Bản dữ liệu: ${payload.json_path}`,
      `Python: ${payload.report.python.executable}`,
      `PyTorch: ${payload.report.environment_status.torch.installed ? payload.report.environment_status.torch.version || "đã cài" : "chưa cài"}`,
      `Ultralytics: ${payload.report.environment_status.ultralytics.installed ? payload.report.environment_status.ultralytics.version || "đã cài" : "chưa cài"}`,
    ].join("\n"),
  );
  showToast("Đã tạo báo cáo máy");
}

function bindEvents() {
  qsa("button[data-section]").forEach((button) => {
    button.addEventListener("click", () => setActiveSection(button.dataset.section));
  });
  qsa("[data-start-workflow]").forEach((button) => {
    button.addEventListener("click", () => {
      startWorkflow(button.dataset.startWorkflow).catch((error) => showToast(error.message));
    });
  });
  qsa("[data-start-automation]").forEach((button) => {
    button.addEventListener("click", () => {
      startAutomation(button.dataset.startAutomation).catch((error) => showToast(error.message));
    });
  });
  qsa('input[name="ui_predict_source_mode"]').forEach((input) => {
    input.addEventListener("change", updatePredictSourceMode);
  });
  qs("#browseButton").addEventListener("click", () => {
    browsePath(qs("#folderPath").value.trim()).catch((error) => showToast(error.message));
  });
  qs("#useCurrentPathButton").addEventListener("click", useCurrentPath);
  qs("#refreshJobsButton").addEventListener("click", () => {
    loadJobs().catch((error) => showToast(error.message));
    loadLog().catch(() => {});
  });
  qs("#openJobsButton").addEventListener("click", () => setActiveSection("jobs"));
  qs("#refreshAutomationsButton").addEventListener("click", () => {
    loadAutomations().catch((error) => showToast(error.message));
    loadAutomationLog().catch(() => {});
  });
  qs("#checkVersionButton").addEventListener("click", () => {
    loadVersion().catch((error) => showToast(error.message));
  });
  qs("#brandUpdateButton").addEventListener("click", runBrandUpdate);
  qs("#updateVersionButton").addEventListener("click", () => {
    updateVersion().catch((error) => {
      showToast(error.message);
      qs("#versionUpdateLog").textContent = error.message;
      loadVersion().catch(() => {});
    });
  });
  qs("#saveAndUpdateVersionButton").addEventListener("click", () => {
    saveAndUpdateVersion().catch((error) => {
      showToast(error.message);
      qs("#versionUpdateLog").textContent = error.message;
      loadVersion().catch(() => {});
    });
  });
  qs("#openDatasetWizardButton").addEventListener("click", openDatasetWizard);
  qs("#stopJobButton").addEventListener("click", () => {
    stopSelectedJob().catch((error) => showToast(error.message));
  });
  qs("#installUltralyticsButton").addEventListener("click", () => {
    installUltralytics().catch((error) => showToast(error.message));
  });
  qs("#installTorchCudaButton").addEventListener("click", () => {
    installTorchCuda().catch((error) => showToast(error.message));
  });
  qs("#installTorchCpuButton").addEventListener("click", () => {
    installTorchCpu().catch((error) => showToast(error.message));
  });
  qs("#refreshDependencyButton").addEventListener("click", () => {
    refreshDependencyStatus().catch((error) => showToast(error.message));
    loadDependencyLog().catch(() => {});
  });
  qs("#auditDatasetButton").addEventListener("click", () => {
    auditDataset().catch((error) => showToast(error.message));
  });
  qs("#createYamlButton").addEventListener("click", () => {
    createYaml().catch((error) => showToast(error.message));
  });
  qs("#loadAnnotatorButton").addEventListener("click", () => {
    loadAnnotatorImages().catch((error) => showToast(error.message));
  });
  qs("#saveAnnotationButton").addEventListener("click", () => {
    saveCurrentAnnotation().catch((error) => showToast(error.message));
  });
  qs("#prevAnnotatorImageButton").addEventListener("click", () => {
    selectAnnotatorImage(state.annotator.currentIndex - 1).catch((error) => showToast(error.message));
  });
  qs("#nextAnnotatorImageButton").addEventListener("click", () => {
    selectAnnotatorImage(state.annotator.currentIndex + 1).catch((error) => showToast(error.message));
  });
  qs("#deleteAnnotationBoxButton").addEventListener("click", deleteSelectedAnnotatorBox);
  qs("#clearAnnotationBoxesButton").addEventListener("click", clearAnnotatorBoxes);
  qs("#annotatorClassSelect").addEventListener("change", updateSelectedAnnotatorClass);
  qs("#annotatorClasses").addEventListener("input", () => {
    updateAnnotatorClassSelect();
    renderAnnotatorBoxes();
    drawAnnotator();
  });
  qs("#annotatorCanvas").addEventListener("pointerdown", annotatorPointerDown);
  qs("#annotatorCanvas").addEventListener("pointermove", annotatorPointerMove);
  qs("#annotatorCanvas").addEventListener("pointerup", annotatorPointerUp);
  qs("#annotatorCanvas").addEventListener("pointercancel", (event) => {
    state.annotator.drawing = null;
    state.annotator.draftBox = null;
    qs("#annotatorCanvas").releasePointerCapture?.(event.pointerId);
    drawAnnotator();
  });
  window.addEventListener("resize", syncAnnotatorCanvas);
  document.addEventListener("keydown", handleAnnotatorKeydown);
  qsa("[data-path-focus]").forEach((button) => {
    button.addEventListener("click", () => openPathPickerForTarget(button.dataset.pathFocus));
  });
  qs("#useYoloLayoutButton").addEventListener("click", useYoloLayoutDefaults);
  qs("#yamlRoot").addEventListener("input", () => {
    const root = qs("#yamlRoot").value.trim();
    setYamlOutputPath(root ? `${root.replace(/[\\/]$/, "")}\\data.yaml` : "");
  });
  qs("#convertVocButton").addEventListener("click", () => {
    convertVoc().catch((error) => showToast(error.message));
  });
  qs("#metricsButton").addEventListener("click", () => {
    calculateMetrics().catch((error) => showToast(error.message));
  });
  qs("#saveCloudSettingsButton").addEventListener("click", () => {
    saveCloudSettings().catch((error) => showToast(error.message));
  });
  qs("#connectGoogleDriveButton").addEventListener("click", () => {
    connectGoogleDrive().catch((error) => showToast(error.message));
  });
  qs("#saveCloudProfileButton").addEventListener("click", () => {
    saveCloudProfile().catch((error) => showToast(error.message));
  });
  qs("#refreshCloudManagerButton").addEventListener("click", () => {
    loadCloudManager().catch((error) => showToast(error.message));
  });
  qs(".cloud-manager-panel").addEventListener("click", (event) => {
    const applyButton = event.target.closest("[data-cloud-apply-profile]");
    if (applyButton) {
      const profile = (state.cloudManager?.profiles || []).find((item) => item.id === applyButton.dataset.cloudApplyProfile);
      if (profile) applyCloudProfile(profile);
      return;
    }
    const deleteButton = event.target.closest("[data-cloud-delete-profile]");
    if (deleteButton) {
      deleteCloudProfile(deleteButton.dataset.cloudDeleteProfile).catch((error) => showToast(error.message));
      return;
    }
    const assetButton = event.target.closest("[data-cloud-use-asset]");
    if (assetButton) {
      useCloudAsset(assetButton.dataset.cloudUseAsset, assetButton.dataset.cloudAssetAction);
    }
  });
  qs("#cloudEnabled").addEventListener("change", () => {
    qs(".cloud-panel")?.classList.toggle("is-cloud-enabled", qs("#cloudEnabled").checked);
  });
  qs("#createReportButton").addEventListener("click", () => {
    createReport().catch((error) => showToast(error.message));
  });
}

async function boot() {
  setIconRefresh();
  bindEvents();
  startHealthCheckCron();
  await Promise.all([loadModels(), loadDependencyStatus(), loadCloudStatus(), loadCloudManager(), loadVersion().catch(() => null), loadJobs(), loadAutomations()]);
  updatePredictSourceMode();
  updatePredictRuntimeGuards();
  updateDatasetDisplays();
  updateAnnotatorClassSelect();
  updateAnnotatorButtons();
  setYamlOutputPath(qs("#yamlOutputPath").value);
  enhanceInlineHelp();
  browsePath("").catch(() => {});
}

boot().catch((error) => showToast(error.message));
