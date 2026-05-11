from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class PathListRequest(BaseModel):
    path: str | None = None
    include_files: bool = True


class DatasetInspectRequest(BaseModel):
    path: str


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


class StopJobRequest(BaseModel):
    force: bool = False
