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
  automationTimer: null,
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
  ].forEach((selector) => qsa(selector).forEach((element) => attachHelpTerm(element)));

  qsa("button span:not(.icon), .quick-card small, .nav-item span").forEach((element) => applyHelpTitle(element));
  setIconRefresh();
}

function setActiveSection(section) {
  qsa(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.section === section));
  qsa(".quick-card").forEach((button) => button.classList.toggle("is-active", button.dataset.section === section));
  qsa(".page-section").forEach((panel) => panel.classList.toggle("is-active", panel.id === `section-${section}`));
  qs("#sectionTitle").textContent = sectionTitles[section] || "YOLO GUI";
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

function isColabRuntime(runtime = state.runtime) {
  return runtime === "Google Colab";
}

function renderVersionStatus(payload) {
  const status = qs("#versionStatus");
  const updateButton = qs("#updateVersionButton");
  const saveAndUpdateButton = qs("#saveAndUpdateVersionButton");
  const current = `v${payload.current_version || "?"}`;
  const latest = payload.latest_version ? `v${payload.latest_version}` : "Chưa rõ";
  const brandVersion = qs("#brandVersion");
  const needsSaveBeforeUpdate = Boolean(payload.update_available && payload.can_save_and_update);

  state.runtime = payload.runtime || null;
  if (brandVersion) {
    brandVersion.textContent = current;
  }
  qs("#versionCurrent").textContent = current;
  qs("#versionFactCurrent").textContent = current;
  qs("#versionFactLatest").textContent = latest;
  qs("#versionFactRuntime").textContent = shortValue(payload.runtime);
  qs("#versionFactBranch").textContent = shortValue(payload.local_branch);
  qs("#versionFactCommit").textContent = shortValue(payload.local_commit_short);
  qs("#versionFactRemote").textContent = shortValue(payload.remote_commit_short);
  qs("#versionFactRemoteUrl").textContent = shortValue(payload.remote_url);

  status.classList.remove("is-new", "is-current", "is-warning");
  if (payload.update_available) {
    status.classList.add(payload.can_update ? "is-new" : "is-warning");
    status.textContent = payload.status_message || `Có phiên bản mới: ${latest}`;
  } else if (payload.remote_commit) {
    status.classList.add("is-current");
    status.textContent = payload.status_message || "Bạn đang dùng phiên bản mới nhất.";
  } else {
    status.classList.add("is-warning");
    status.textContent = payload.status_message || "Chưa kiểm tra được phiên bản mới trên GitHub.";
  }

  updateButton.disabled = !payload.can_update;
  updateButton.querySelector("span:not(.icon)").textContent = payload.can_update
    ? "Cập nhật ngay"
    : needsSaveBeforeUpdate
      ? "Cần sao lưu trước"
      : payload.update_available
        ? "Không thể cập nhật"
      : "Đã mới nhất";
  updateButton.title = payload.can_update
    ? "Tải bản mới từ GitHub"
    : needsSaveBeforeUpdate
      ? "Repo đang có file đã sửa. Bấm Sao lưu rồi cập nhật để GUI cất tạm thay đổi trước."
      : payload.update_available
        ? "Chưa đủ điều kiện cập nhật tự động"
      : "Chưa có bản mới để cập nhật";

  saveAndUpdateButton.classList.toggle("is-hidden", !needsSaveBeforeUpdate);
  saveAndUpdateButton.disabled = !needsSaveBeforeUpdate;
  saveAndUpdateButton.title = needsSaveBeforeUpdate
    ? "Cất tạm thay đổi local bằng Git stash rồi cập nhật source từ GitHub"
    : "Chỉ dùng khi có bản mới nhưng repo đang có file đã sửa";
  renderChangelog(payload.changelog || []);
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
  qs("#versionUpdateLog").textContent = "Đang cập nhật từ GitHub...\nKhông đóng app trong lúc cập nhật.";
  const payload = await api("/api/version/update", { method: "POST" });
  qs("#versionUpdateLog").textContent = [
    payload.message || "Đã chạy cập nhật.",
    payload.log_path ? `Log: ${payload.log_path}` : null,
    "",
    payload.log || "",
  ].filter(Boolean).join("\n");
  renderVersionStatus(payload.after);
  showToast(payload.message || "Đã cập nhật phiên bản");
}

async function saveAndUpdateVersion() {
  const button = qs("#saveAndUpdateVersionButton");
  button.disabled = true;
  qs("#versionUpdateLog").textContent = [
    "Đang sao lưu thay đổi local rồi cập nhật từ GitHub...",
    "Không đóng app trong lúc cập nhật.",
  ].join("\n");
  const payload = await api("/api/version/save-and-update", { method: "POST" });
  qs("#versionUpdateLog").textContent = [
    payload.message || "Đã sao lưu thay đổi và cập nhật.",
    payload.stash_message ? `Nhãn sao lưu: ${payload.stash_message}` : null,
    payload.log_path ? `Log: ${payload.log_path}` : null,
    "",
    payload.log || "",
  ].filter(Boolean).join("\n");
  renderVersionStatus(payload.after);
  showToast(payload.message || "Đã sao lưu và cập nhật phiên bản");
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
    return torchDevices.map((device) => `GPU ${device.id}: ${device.name} (${device.memory_gb}GB)`).join("\n");
  }
  if (nvidiaGpus.length) {
    return nvidiaGpus.map((device) => `NVIDIA: ${device.name} (${device.memory_mb}MB)`).join("\n");
  }
  return "Không thấy NVIDIA/CUDA GPU";
}

function colabGpuHelp(payload, torchDevices, nvidiaGpus) {
  if (payload.torch?.cuda_available && torchDevices.length) {
    return `GPU Colab: ${torchDevices.map((device) => `${device.name} (${device.memory_gb}GB)`).join(", ")}`;
  }
  if (payload.nvidia?.available || nvidiaGpus.length) {
    return "GPU Colab: Colab đã có GPU NVIDIA nhưng PyTorch đang chạy CPU. Vào tab Cài đặt rồi bấm Cài PyTorch CUDA.";
  }
  return "GPU Colab: chưa bật GPU runtime. Trong Colab bấm Runtime > Change runtime type > GPU, rồi chạy lại cell YOLO GUI.";
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
        `Chế độ train: ${payload.torch?.cuda_available ? "GPU sẵn sàng" : "CPU, vẫn chạy được nhưng chậm"}`,
        colabGpuHelp(payload, torchDevices, nvidiaGpus),
      ]
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
  button.innerHTML = `<i data-lucide="${type === "dir" ? "folder" : "file"}"></i><span>${name}</span>`;
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
  qs("#createReportButton").addEventListener("click", () => {
    createReport().catch((error) => showToast(error.message));
  });
}

async function boot() {
  setIconRefresh();
  bindEvents();
  startHealthCheckCron();
  await Promise.all([loadModels(), loadDependencyStatus(), loadVersion().catch(() => null), loadJobs(), loadAutomations()]);
  updatePredictSourceMode();
  updatePredictRuntimeGuards();
  updateDatasetDisplays();
  setYamlOutputPath(qs("#yamlOutputPath").value);
  enhanceInlineHelp();
  browsePath("").catch(() => {});
}

boot().catch((error) => showToast(error.message));
