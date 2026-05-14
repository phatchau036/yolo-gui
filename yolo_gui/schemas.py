from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class PathListRequest(BaseModel):
    path: str | None = None
    include_files: bool = True


class DatasetInspectRequest(BaseModel):
    path: str


class DatasetAuditRequest(BaseModel):
    path: str
    max_examples: int = Field(default=40, ge=1, le=500)


class DatasetYamlCreateRequest(BaseModel):
    output_path: str
    root: str
    train: str = "images/train"
    val: str = "images/val"
    test: str | None = None
    names: list[str] = Field(default_factory=list)


class VocConvertRequest(BaseModel):
    annotations_dir: str
    output_dir: str
    classes: list[str] = Field(default_factory=list)
    overwrite: bool = True


class MetricsRequest(BaseModel):
    prediction_dir: str
    ground_truth_dir: str
    iou_threshold: float = Field(default=0.5, ge=0, le=1)
    class_count: int | None = Field(default=None, ge=1)


class AnnotationListRequest(BaseModel):
    image_dir: str
    label_dir: str | None = None
    limit: int = Field(default=5000, ge=1, le=20000)


class AnnotationReadRequest(BaseModel):
    image_path: str
    image_dir: str | None = None
    label_dir: str | None = None


class AnnotationBox(BaseModel):
    class_id: int = Field(default=0, ge=0)
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)


class AnnotationSaveRequest(BaseModel):
    image_path: str
    image_dir: str | None = None
    label_dir: str | None = None
    boxes: list[AnnotationBox] = Field(default_factory=list)


class TrainRequest(BaseModel):
    model: str = Field(default="yolo26n.pt")
    data: str
    task: Literal["detect", "segment", "classify", "pose", "obb"] = "detect"

    epochs: int = Field(default=100, ge=1)
    time: float | None = Field(default=None, ge=0)
    patience: int = Field(default=100, ge=0)
    batch: int | float = 16
    imgsz: int = Field(default=640, ge=32)
    device: str | int | list[int] | None = None
    workers: int = Field(default=8, ge=0)

    project: str | None = None
    name: str | None = None
    exist_ok: bool = False
    save: bool = True
    save_period: int = -1
    cache: bool | str = False
    pretrained: bool | str = True
    resume: bool = False
    optimizer: str = "auto"
    seed: int = 0
    deterministic: bool = True
    verbose: bool = True
    single_cls: bool = False
    rect: bool = False
    multi_scale: float = 0.0
    cos_lr: bool = False
    close_mosaic: int = 10
    amp: bool = True
    fraction: float = Field(default=1.0, gt=0, le=1)
    profile: bool = False
    freeze: int | list[int] | None = None
    val: bool = True
    plots: bool = True
    compile: bool | str = False
    max_det: int = 300

    lr0: float = 0.01
    lrf: float = 0.01
    momentum: float = 0.937
    weight_decay: float = 0.0005
    warmup_epochs: float = 3.0
    warmup_momentum: float = 0.8
    warmup_bias_lr: float = 0.1
    box: float = 7.5
    cls: float = 0.5
    cls_pw: float = 0.0
    dfl: float = 1.5
    pose: float = 12.0
    kobj: float = 1.0
    rle: float = 1.0
    angle: float = 1.0
    nbs: int = 64
    overlap_mask: bool = True
    mask_ratio: int = 4
    dropout: float = 0.0

    hsv_h: float = 0.015
    hsv_s: float = 0.7
    hsv_v: float = 0.4
    degrees: float = 0.0
    translate: float = 0.1
    scale: float = 0.5
    shear: float = 0.0
    perspective: float = 0.0
    flipud: float = 0.0
    fliplr: float = 0.5
    bgr: float = 0.0
    mosaic: float = 1.0
    mixup: float = 0.0
    cutmix: float = 0.0
    copy_paste: float = 0.0
    copy_paste_mode: str = "flip"
    auto_augment: str = "randaugment"
    erasing: float = 0.4

    extra_args: dict[str, Any] = Field(default_factory=dict)


class ValidateRequest(BaseModel):
    model: str
    data: str
    task: Literal["detect", "segment", "classify", "pose", "obb"] = "detect"
    split: Literal["val", "test", "train"] = "val"
    imgsz: int = Field(default=640, ge=32)
    batch: int | float = 16
    conf: float | None = Field(default=None, ge=0, le=1)
    iou: float = Field(default=0.7, ge=0, le=1)
    device: str | int | list[int] | None = None
    workers: int = Field(default=8, ge=0)
    project: str | None = None
    name: str | None = None
    exist_ok: bool = False
    save_json: bool = False
    save_hybrid: bool = False
    plots: bool = True
    verbose: bool = True
    max_det: int = Field(default=300, ge=1)
    half: bool = False
    dnn: bool = False
    extra_args: dict[str, Any] = Field(default_factory=dict)


class PredictRequest(BaseModel):
    model: str
    source: str
    task: Literal["detect", "segment", "classify", "pose", "obb"] = "detect"
    imgsz: int = Field(default=640, ge=32)
    conf: float = Field(default=0.25, ge=0, le=1)
    iou: float = Field(default=0.7, ge=0, le=1)
    device: str | int | list[int] | None = None
    project: str | None = None
    name: str | None = None
    exist_ok: bool = False
    save: bool = True
    save_txt: bool = False
    save_conf: bool = False
    save_crop: bool = False
    show_labels: bool = True
    show_conf: bool = True
    show_boxes: bool = True
    line_width: int | None = Field(default=None, ge=1)
    max_det: int = Field(default=300, ge=1)
    vid_stride: int = Field(default=1, ge=1)
    stream_buffer: bool = False
    half: bool = False
    agnostic_nms: bool = False
    retina_masks: bool = False
    extra_args: dict[str, Any] = Field(default_factory=dict)


class ExportRequest(BaseModel):
    model: str
    format: Literal[
        "torchscript",
        "onnx",
        "openvino",
        "engine",
        "coreml",
        "saved_model",
        "pb",
        "tflite",
        "edgetpu",
        "tfjs",
        "paddle",
        "mnn",
        "ncnn",
        "imx",
        "rknn",
    ] = "onnx"
    imgsz: int = Field(default=640, ge=32)
    batch: int = Field(default=1, ge=1)
    device: str | int | list[int] | None = None
    half: bool = False
    int8: bool = False
    dynamic: bool = False
    simplify: bool = True
    opset: int | None = Field(default=None, ge=7)
    workspace: float | None = Field(default=None, ge=0)
    nms: bool = False
    data: str | None = None
    extra_args: dict[str, Any] = Field(default_factory=dict)


class StopJobRequest(BaseModel):
    force: bool = False


class AutomationStartRequest(BaseModel):
    automation_type: Literal["prepare_dataset", "train_ready", "evaluate_export", "full_pipeline"]
    payload: dict[str, Any] = Field(default_factory=dict)


class CloudSettingsRequest(BaseModel):
    enabled: bool = False
    provider: Literal["google_drive"] = "google_drive"
    google_api_key: str | None = None
    google_drive_folder: str | None = None
    root_name: str = Field(default="YOLO-GUI-Cloud", min_length=1, max_length=80)
    project_name: str = Field(default="Default Project", min_length=1, max_length=100)
    storage_enabled: bool = False
    clear_api_key: bool = False


class CloudDriveConnectRequest(BaseModel):
    google_drive_access_token: str | None = None
    google_drive_parent: str | None = None
    create_standard_folders: bool = True


class CloudProfileSaveRequest(BaseModel):
    name: str = Field(default="Cấu hình YOLO", min_length=1, max_length=80)
    notes: str | None = Field(default=None, max_length=500)
    payload: dict[str, Any] = Field(default_factory=dict)
