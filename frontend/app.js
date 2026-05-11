const state = {
  selectedJobId: null,
  logTimer: null,
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
  const [health, system] = await Promise.all([api("/api/health"), api("/api/system")]);
  const devices = system.devices.length
    ? system.devices.map((device) => `GPU ${device.id}: ${device.name} (${device.memory_gb}GB)`).join("\n")
    : "Không thấy CUDA GPU";
  qs("#systemStatus").textContent = [
    `Ultralytics: ${health.ultralytics_installed ? "đã cài" : "chưa cài"}`,
    `Torch: ${health.torch_installed ? system.torch || "đã cài" : "chưa cài"}`,
    devices,
  ].join("\n");
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
}

async function boot() {
  setIconRefresh();
  bindEvents();
  await Promise.all([loadModels(), loadSystem(), loadJobs()]);
  browsePath("").catch(() => {});
}

boot().catch((error) => showToast(error.message));
