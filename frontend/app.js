const state = {
  selectedJobId: null,
  logTimer: null,
  dependencyTimer: null,
};

const workflowForms = {
  train: { form: "#trainForm", endpoint: "/api/train/start", label: "train" },
  val: { form: "#valForm", endpoint: "/api/val/start", label: "val" },
  predict: { form: "#predictForm", endpoint: "/api/predict/start", label: "predict" },
  export: { form: "#exportForm", endpoint: "/api/export/start", label: "export" },
};

const sectionTitles = {
  train: "Train model",
  val: "Validate model",
  predict: "Predict dữ liệu",
  export: "Export model",
  dataset: "Dataset tools",
  system: "System report",
  jobs: "Job và log",
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

function setIconRefresh() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setActiveSection(section) {
  qsa(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.section === section));
  qsa(".page-section").forEach((panel) => panel.classList.toggle("is-active", panel.id === `section-${section}`));
  qs("#sectionTitle").textContent = sectionTitles[section] || "YOLO GUI";
  if (section === "jobs") {
    loadJobs().catch((error) => showToast(error.message));
    loadLog().catch(() => {});
  }
}

async function loadModels() {
  const payload = await api("/api/models");
  for (const select of qsa(".model-preset")) {
    select.innerHTML = "";
    for (const model of payload.models) {
      const option = document.createElement("option");
      option.value = model.value;
      option.textContent = `${model.label} (${model.value})`;
      select.appendChild(option);
    }
  }
}

async function loadSystem() {
  const payload = await api("/api/dependencies/status");
  const torchDevices = payload.torch?.devices || [];
  const nvidiaGpus = payload.nvidia?.gpus || [];
  const devices = torchDevices.length
    ? torchDevices.map((device) => `GPU ${device.id}: ${device.name} (${device.memory_gb}GB)`).join("\n")
    : nvidiaGpus.length
      ? nvidiaGpus.map((device) => `NVIDIA: ${device.name} (${device.memory_mb}MB)`).join("\n")
      : "Không thấy NVIDIA/CUDA GPU";
  qs("#systemStatus").textContent = [
    `Ultralytics: ${payload.ultralytics.installed ? payload.ultralytics.version || "đã cài" : "chưa cài"}`,
    `Torch: ${payload.torch.installed ? payload.torch.version || "đã cài" : "chưa cài"}`,
    `CUDA: ${payload.torch.cuda_available ? payload.torch.cuda_version || "available" : "chưa sẵn sàng"}`,
    devices,
  ].join("\n");
}

async function loadDependencyStatus() {
  const payload = await api("/api/dependencies/status");
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
  const buttons = [qs("#installUltralyticsButton"), qs("#installTorchCudaButton"), qs("#installTorchCpuButton")];

  card.classList.remove("is-ready", "is-running", "has-log");
  buttons.forEach((button) => {
    button.disabled = false;
  });
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
    buttons.forEach((button) => {
      button.disabled = true;
    });
    return;
  }

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
    detail.textContent = payload.nvidia.available
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
}

async function installUltralytics() {
  await api("/api/dependencies/ultralytics/install", { method: "POST" });
  await loadDependencyStatus();
  showToast("Đã bắt đầu cài Ultralytics");
  startDependencyPolling();
}

async function installTorchCuda() {
  await api("/api/dependencies/torch/install-cuda", { method: "POST" });
  await loadDependencyStatus();
  showToast("Đã bắt đầu cài PyTorch CUDA");
  startDependencyPolling();
}

async function installTorchCpu() {
  await api("/api/dependencies/torch/install-cpu", { method: "POST" });
  await loadDependencyStatus();
  showToast("Đã bắt đầu cài PyTorch CPU");
  startDependencyPolling();
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
    : "Chưa có log cài đặt.";
  if (sections.length) {
    qs("#dependencyNotice").classList.add("has-log");
  }
}

function startDependencyPolling() {
  if (state.dependencyTimer) return;
  state.dependencyTimer = window.setInterval(() => {
    loadDependencyStatus().catch(() => {});
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
      showToast("Đã gán data.yaml vào ô đang chọn");
    }
  });
  return button;
}

function setPathTarget(path) {
  const targetId = qs("#pathTarget").value;
  const target = document.getElementById(targetId);
  if (target) {
    target.value = path;
  }
}

function useCurrentPath() {
  setPathTarget(qs("#folderPath").value.trim());
  showToast("Đã gán đường dẫn hiện tại");
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
  return data;
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
  const response = await api(setup.endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.selectedJobId = response.job.id;
  showToast(`Đã tạo job ${response.job.id}`);
  await loadJobs();
  startLogPolling();
  setActiveSection("jobs");
}

async function loadJobs() {
  const payload = await api("/api/jobs");
  const list = qs("#jobList");
  list.innerHTML = "";
  if (!payload.jobs.length) {
    list.textContent = "Chưa có job nào.";
    qs("#logOutput").textContent = "Chưa có job nào.";
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
        <strong>${job.id}</strong>
        <small>${job.job_type} · ${job.log_path}</small>
      </span>
      <span class="status-pill status-${job.status}">${job.status}</span>
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
  showToast("Đã gửi yêu cầu stop job");
  await loadJobs();
}

function splitList(text) {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeOutput(selector, payload) {
  qs(selector).textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

async function auditDataset() {
  const path = qs("#auditPath").value.trim();
  if (!path) throw new Error("Cần nhập data.yaml để audit");
  const payload = await api("/api/datasets/audit", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
  writeOutput("#datasetToolOutput", payload);
}

async function createYaml() {
  const payload = await api("/api/datasets/create-yaml", {
    method: "POST",
    body: JSON.stringify({
      output_path: qs("#yamlOutputPath").value.trim(),
      root: qs("#yamlRoot").value.trim(),
      train: qs("#yamlTrain").value.trim(),
      val: qs("#yamlVal").value.trim(),
      test: qs("#yamlTest").value.trim() || null,
      names: splitList(qs("#yamlNames").value),
    }),
  });
  writeOutput("#datasetToolOutput", payload);
  showToast("Đã tạo data.yaml");
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
  writeOutput("#systemReportOutput", {
    markdown_path: payload.markdown_path,
    json_path: payload.json_path,
    python: payload.report.python.executable,
    torch: payload.report.environment_status.torch,
    ultralytics: payload.report.environment_status.ultralytics,
  });
  showToast("Đã tạo system report");
}

function bindEvents() {
  qsa(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveSection(button.dataset.section));
  });
  qsa("[data-start-workflow]").forEach((button) => {
    button.addEventListener("click", () => {
      startWorkflow(button.dataset.startWorkflow).catch((error) => showToast(error.message));
    });
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
    loadDependencyStatus().catch((error) => showToast(error.message));
    loadDependencyLog().catch(() => {});
    loadSystem().catch(() => {});
  });
  qs("#auditDatasetButton").addEventListener("click", () => {
    auditDataset().catch((error) => showToast(error.message));
  });
  qs("#createYamlButton").addEventListener("click", () => {
    createYaml().catch((error) => showToast(error.message));
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
  await Promise.all([loadModels(), loadSystem(), loadDependencyStatus(), loadJobs()]);
  browsePath("").catch(() => {});
}

boot().catch((error) => showToast(error.message));
