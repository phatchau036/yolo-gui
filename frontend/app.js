const state = {
  selectedJobId: null,
  logTimer: null,
  dependencyTimer: null,
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
]);

const checkboxFields = new Set(["cache", "resume", "amp", "val", "plots", "cos_lr", "rect", "single_cls"]);

function qs(selector) {
  return document.querySelector(selector);
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

async function loadModels() {
  const payload = await api("/api/models");
  const select = qs("#modelSelect");
  select.innerHTML = "";
  for (const model of payload.models) {
    const option = document.createElement("option");
    option.value = model.value;
    option.textContent = `${model.label} (${model.value})`;
    select.appendChild(option);
  }
}

async function loadSystem() {
  const payload = await api("/api/dependencies/status");
  const devices = payload.torch.devices.length
    ? payload.torch.devices.map((device) => `GPU ${device.id}: ${device.name} (${device.memory_gb}GB)`).join("\n")
    : payload.nvidia.gpus.length
      ? payload.nvidia.gpus.map((device) => `NVIDIA: ${device.name} (${device.memory_mb}MB)`).join("\n")
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
  const buttons = [
    qs("#installUltralyticsButton"),
    qs("#installTorchCudaButton"),
    qs("#installTorchCpuButton"),
  ];

  card.classList.remove("is-ready", "is-running", "has-log");
  buttons.forEach((button) => {
    button.disabled = false;
  });
  qs("#installUltralyticsButton").querySelector("span:last-child").textContent =
    payload.ultralytics.installed ? "Cài lại Ultralytics" : "Cài Ultralytics";
  qs("#installTorchCudaButton").querySelector("span:last-child").textContent =
    payload.torch.installed && payload.torch.cuda_available ? "Cài lại PyTorch CUDA" : "Cài PyTorch CUDA";
  qs("#installTorchCpuButton").querySelector("span:last-child").textContent =
    payload.torch.installed ? "Cài PyTorch CPU" : "Cài PyTorch CPU";
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
    title.textContent = "Môi trường train GPU đã sẵn sàng";
    detail.textContent = `Torch ${payload.torch.version || "unknown"} · CUDA ${payload.torch.cuda_version || "available"} · Ultralytics ${payload.ultralytics.version || "unknown"}`;
    return;
  }

  if (payload.ultralytics.installed && payload.torch.installed) {
    card.classList.add("is-ready");
    badge.className = "status-pill status-completed";
    badge.textContent = "CPU ready";
    title.textContent = "Có thể train CPU, CUDA chưa sẵn sàng";
    detail.textContent = payload.nvidia.available
      ? "Máy có NVIDIA GPU nhưng PyTorch chưa thấy CUDA. Bấm Cài PyTorch CUDA để sửa môi trường GPU."
      : "Không thấy NVIDIA GPU qua nvidia-smi. Vẫn có thể train CPU hoặc cài driver/GPU sau.";
    return;
  }

  badge.className = "status-pill status-failed";
  badge.textContent = "Thiếu";
  title.textContent = "Thiếu dependency để train YOLO";
  detail.textContent = "Bấm các nút cài ngay trên GUI. App sẽ chạy pip bằng đúng Python đang chạy server.";
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
    {
      label: "Python/pip",
      ok: payload.pip.available,
      warn: false,
      text: payload.pip.available ? payload.pip.version : payload.pip.error || "pip lỗi",
    },
    {
      label: "NVIDIA/CUDA",
      ok: payload.nvidia.available,
      warn: !payload.nvidia.available,
      text: nvidiaText,
    },
    {
      label: "PyTorch",
      ok: payload.torch.installed && payload.torch.cuda_available,
      warn: payload.torch.installed && !payload.torch.cuda_available,
      text: torchText,
    },
    {
      label: "Ultralytics",
      ok: payload.ultralytics.installed,
      warn: false,
      text: payload.ultralytics.installed ? payload.ultralytics.version || "đã cài" : "Chưa cài",
    },
  ];

  qs("#dependencyChecklist").innerHTML = tiles
    .map((tile) => {
      const className = tile.ok ? "is-ok" : tile.warn ? "is-warn" : "is-bad";
      return `<div class="check-tile ${className}"><strong>${tile.label}</strong><span>${tile.text}</span></div>`;
    })
    .join("");
}

async function installUltralytics() {
  const payload = await api("/api/dependencies/ultralytics/install", { method: "POST" });
  await loadDependencyStatus();
  showToast("Đã bắt đầu cài Ultralytics trong GUI");
  startDependencyPolling();
}

async function installTorchCuda() {
  await api("/api/dependencies/torch/install-cuda", { method: "POST" });
  await loadDependencyStatus();
  showToast("Đã bắt đầu cài PyTorch CUDA trong GUI");
  startDependencyPolling();
}

async function installTorchCpu() {
  await api("/api/dependencies/torch/install-cpu", { method: "POST" });
  await loadDependencyStatus();
  showToast("Đã bắt đầu cài PyTorch CPU trong GUI");
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
  if (state.dependencyTimer) {
    return;
  }
  state.dependencyTimer = window.setInterval(() => {
    loadDependencyStatus().catch(() => {});
    loadDependencyLog().catch(() => {});
  }, 2500);
}

function stopDependencyPolling() {
  if (!state.dependencyTimer) {
    return;
  }
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
    } else {
      if (isDataYaml || path.toLowerCase().endsWith(".yaml") || path.toLowerCase().endsWith(".yml")) {
        qs("#dataPath").value = path;
        inspectDataset().catch((error) => showToast(error.message));
      }
    }
  });
  return button;
}

async function inspectDataset() {
  const path = qs("#dataPath").value.trim();
  if (!path) {
    throw new Error("Bạn cần nhập đường dẫn data.yaml");
  }
  const payload = await api("/api/datasets/inspect", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
  qs("#datasetBadge").textContent = `${payload.class_count} class`;
  qs("#datasetBadge").className = "tag is-success is-light";
  qs("#datasetPreview").textContent = JSON.stringify(payload, null, 2);
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

function collectForm() {
  const form = qs("#trainForm");
  const data = {};
  for (const element of form.elements) {
    if (!element.name) continue;
    if (checkboxFields.has(element.name)) {
      data[element.name] = element.checked;
      continue;
    }
    const value = parseValue(element.name, element.value);
    if (value !== undefined) {
      data[element.name] = value;
    }
  }

  const customModel = qs("#customModel").value.trim();
  data.model = customModel || qs("#modelSelect").value;

  const extraText = qs("#extraArgs").value.trim();
  if (extraText) {
    data.extra_args = JSON.parse(extraText);
  } else {
    data.extra_args = {};
  }
  return data;
}

async function startTrain() {
  const dependency = await loadDependencyStatus();
  if (!dependency.ultralytics.installed || !dependency.torch.installed) {
    qs("#dependencyNotice").scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Cần cài PyTorch và Ultralytics trên GUI trước khi train.");
    return;
  }
  if (dependency.installing) {
    showToast("Môi trường đang được cài. Đợi cài xong rồi train.");
    return;
  }
  const payload = collectForm();
  const response = await api("/api/train/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.selectedJobId = response.job.id;
  showToast(`Đã tạo job ${response.job.id}`);
  await loadJobs();
  startLogPolling();
}

async function loadJobs() {
  const payload = await api("/api/train/jobs");
  const list = qs("#jobList");
  list.innerHTML = "";
  if (!payload.jobs.length) {
    list.textContent = "Chưa có job nào.";
    qs("#logOutput").textContent = "Chưa có job nào.";
    return;
  }
  const shouldAutoLoadLog = !state.selectedJobId;
  if (!state.selectedJobId) {
    state.selectedJobId = payload.jobs[0].id;
  }
  for (const job of payload.jobs) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `job-card ${job.id === state.selectedJobId ? "is-selected" : ""}`;
    card.innerHTML = `
      <span>
        <strong>${job.id}</strong>
        <small>${job.log_path}</small>
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
  const canStop = selected && ["starting", "running"].includes(selected.status);
  qs("#stopJobButton").disabled = !canStop;
}

async function loadLog() {
  if (!state.selectedJobId) return;
  const payload = await api(`/api/train/jobs/${state.selectedJobId}/logs?tail=20000`);
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
  await api(`/api/train/jobs/${state.selectedJobId}/stop`, {
    method: "POST",
    body: JSON.stringify({ force: false }),
  });
  showToast("Đã gửi yêu cầu stop job");
  await loadJobs();
}

function bindEvents() {
  qs("#browseButton").addEventListener("click", () => {
    browsePath(qs("#folderPath").value.trim()).catch((error) => showToast(error.message));
  });
  qs("#inspectDatasetButton").addEventListener("click", () => {
    inspectDataset().catch((error) => showToast(error.message));
  });
  qs("#startTrainButton").addEventListener("click", () => {
    startTrain().catch((error) => showToast(error.message));
  });
  qs("#refreshJobsButton").addEventListener("click", () => {
    loadJobs().catch((error) => showToast(error.message));
    loadLog().catch(() => {});
  });
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
  });
}

async function boot() {
  setIconRefresh();
  bindEvents();
  await Promise.all([loadModels(), loadSystem(), loadDependencyStatus(), loadJobs()]);
  browsePath("").catch(() => {});
}

boot().catch((error) => showToast(error.message));
