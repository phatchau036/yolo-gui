from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from typing import Any

import yaml


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def read_dataset_yaml(path: str | Path) -> tuple[Path, dict[str, Any]]:
    yaml_path = Path(path).expanduser()
    if yaml_path.is_dir():
        yaml_path = yaml_path / "data.yaml"
    if not yaml_path.exists():
        raise FileNotFoundError(f"Dataset YAML does not exist: {yaml_path}")
    payload = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
    if not isinstance(payload, dict):
        raise ValueError("Dataset YAML must be a mapping")
    return yaml_path, payload


def inspect_dataset(path: str | Path) -> dict[str, Any]:
    yaml_path, payload = read_dataset_yaml(path)
    names = payload.get("names", [])
    class_names = _normalize_names(names)
    return {
        "path": str(yaml_path),
        "root": payload.get("path"),
        "train": payload.get("train"),
        "val": payload.get("val"),
        "test": payload.get("test"),
        "class_count": len(class_names),
        "names": names,
        "raw": payload,
    }


def audit_dataset(path: str | Path, max_examples: int = 40) -> dict[str, Any]:
    yaml_path, payload = read_dataset_yaml(path)
    base_dir = _dataset_root(yaml_path, payload)
    class_names = _normalize_names(payload.get("names", []))
    class_count = len(class_names)
    split_reports = {}
    totals = {
        "images": 0,
        "label_files": 0,
        "missing_label_files": 0,
        "empty_label_files": 0,
        "objects": 0,
        "malformed_lines": 0,
        "bad_class_ids": 0,
    }

    for split in ("train", "val", "test"):
        split_value = payload.get(split)
        if not split_value:
            continue
        report = _audit_split(base_dir, split_value, class_count=class_count, max_examples=max_examples)
        split_reports[split] = report
        for key in totals:
            totals[key] += int(report.get(key, 0))

    warnings = []
    if not class_names:
        warnings.append("Dataset YAML chưa có names hoặc names không đúng định dạng.")
    if "train" not in split_reports:
        warnings.append("Không tìm thấy split train trong YAML.")
    if "val" not in split_reports:
        warnings.append("Không tìm thấy split val trong YAML.")
    for split, report in split_reports.items():
        if report["missing_label_files"]:
            warnings.append(f"{split}: thiếu {report['missing_label_files']} file label.")
        if report["malformed_lines"]:
            warnings.append(f"{split}: có {report['malformed_lines']} dòng label sai format.")
        if report["bad_class_ids"]:
            warnings.append(f"{split}: có {report['bad_class_ids']} class id vượt ngoài names.")

    return {
        "yaml_path": str(yaml_path),
        "base_dir": str(base_dir),
        "class_count": class_count,
        "names": class_names,
        "splits": split_reports,
        "totals": totals,
        "warnings": warnings,
        "ok": not warnings,
    }


def create_dataset_yaml(request: Any) -> dict[str, Any]:
    output_path = Path(request.output_path).expanduser()
    payload: dict[str, Any] = {
        "path": str(Path(request.root).expanduser()),
        "train": request.train,
        "val": request.val,
        "names": {idx: name for idx, name in enumerate(request.names)},
    }
    if request.test:
        payload["test"] = request.test
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return {"path": str(output_path), "payload": payload}


def convert_voc_to_yolo(annotations_dir: str | Path, output_dir: str | Path, classes: list[str], overwrite: bool) -> dict[str, Any]:
    source = Path(annotations_dir).expanduser()
    target = Path(output_dir).expanduser()
    if not source.exists() or not source.is_dir():
        raise FileNotFoundError(f"VOC annotation folder does not exist: {source}")
    if not classes:
        raise ValueError("classes must contain at least one class name")
    target.mkdir(parents=True, exist_ok=True)
    class_to_id = {name: idx for idx, name in enumerate(classes)}
    converted = 0
    skipped = 0
    unknown_classes: dict[str, int] = defaultdict(int)
    errors: list[dict[str, str]] = []

    for xml_path in sorted(source.glob("*.xml")):
        txt_path = target / f"{xml_path.stem}.txt"
        if txt_path.exists() and not overwrite:
            skipped += 1
            continue
        try:
            root = ET.parse(xml_path).getroot()
            size = root.find("size")
            width = int(float(size.findtext("width", "0"))) if size is not None else 0
            height = int(float(size.findtext("height", "0"))) if size is not None else 0
            if width <= 0 or height <= 0:
                raise ValueError("invalid image width/height")

            lines = []
            for obj in root.findall("object"):
                name = (obj.findtext("name") or "").strip()
                if name not in class_to_id:
                    unknown_classes[name or "<empty>"] += 1
                    continue
                box = obj.find("bndbox")
                if box is None:
                    continue
                xmin = float(box.findtext("xmin", "0"))
                ymin = float(box.findtext("ymin", "0"))
                xmax = float(box.findtext("xmax", "0"))
                ymax = float(box.findtext("ymax", "0"))
                x_center = ((xmin + xmax) / 2) / width
                y_center = ((ymin + ymax) / 2) / height
                box_width = (xmax - xmin) / width
                box_height = (ymax - ymin) / height
                lines.append(
                    f"{class_to_id[name]} {x_center:.6f} {y_center:.6f} {box_width:.6f} {box_height:.6f}"
                )

            txt_path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
            converted += 1
        except Exception as exc:  # noqa: BLE001 - report every bad XML file to the GUI.
            errors.append({"file": str(xml_path), "error": repr(exc)})

    return {
        "annotations_dir": str(source),
        "output_dir": str(target),
        "classes": classes,
        "converted": converted,
        "skipped": skipped,
        "unknown_classes": dict(unknown_classes),
        "errors": errors,
    }


def calculate_yolo_metrics(
    prediction_dir: str | Path,
    ground_truth_dir: str | Path,
    iou_threshold: float = 0.5,
    class_count: int | None = None,
) -> dict[str, Any]:
    pred_dir = Path(prediction_dir).expanduser()
    gt_dir = Path(ground_truth_dir).expanduser()
    if not pred_dir.exists() or not pred_dir.is_dir():
        raise FileNotFoundError(f"Prediction folder does not exist: {pred_dir}")
    if not gt_dir.exists() or not gt_dir.is_dir():
        raise FileNotFoundError(f"Ground-truth folder does not exist: {gt_dir}")

    classes = set(range(class_count or 0))
    totals = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
    all_stems = {path.stem for path in gt_dir.glob("*.txt")} | {path.stem for path in pred_dir.glob("*.txt")}

    for stem in sorted(all_stems):
        gt_boxes = _read_yolo_boxes(gt_dir / f"{stem}.txt", has_conf=False)
        pred_boxes = _read_yolo_boxes(pred_dir / f"{stem}.txt", has_conf=True)
        for item in gt_boxes + pred_boxes:
            classes.add(item["class_id"])

        matched_gt: set[int] = set()
        pred_boxes = sorted(pred_boxes, key=lambda item: item.get("confidence", 1.0), reverse=True)
        for pred in pred_boxes:
            best_idx = None
            best_iou = 0.0
            for idx, truth in enumerate(gt_boxes):
                if idx in matched_gt or truth["class_id"] != pred["class_id"]:
                    continue
                current_iou = _iou(pred["box"], truth["box"])
                if current_iou > best_iou:
                    best_iou = current_iou
                    best_idx = idx
            class_id = pred["class_id"]
            if best_idx is not None and best_iou >= iou_threshold:
                matched_gt.add(best_idx)
                totals[class_id]["tp"] += 1
            else:
                totals[class_id]["fp"] += 1

        for idx, truth in enumerate(gt_boxes):
            if idx not in matched_gt:
                totals[truth["class_id"]]["fn"] += 1

    per_class = {}
    summary = {"tp": 0, "fp": 0, "fn": 0}
    for class_id in sorted(classes):
        counts = totals[class_id]
        tp, fp, fn = counts["tp"], counts["fp"], counts["fn"]
        summary["tp"] += tp
        summary["fp"] += fp
        summary["fn"] += fn
        per_class[str(class_id)] = _metric_row(tp, fp, fn)

    return {
        "prediction_dir": str(pred_dir),
        "ground_truth_dir": str(gt_dir),
        "iou_threshold": iou_threshold,
        "summary": _metric_row(summary["tp"], summary["fp"], summary["fn"]),
        "per_class": per_class,
        "file_count": len(all_stems),
    }


def _dataset_root(yaml_path: Path, payload: dict[str, Any]) -> Path:
    root = payload.get("path")
    if root:
        root_path = Path(str(root)).expanduser()
        return root_path if root_path.is_absolute() else (yaml_path.parent / root_path).resolve()
    return yaml_path.parent


def _normalize_names(names: Any) -> list[str]:
    if isinstance(names, dict):
        def sort_key(item: Any) -> tuple[int, int | str]:
            text = str(item)
            return (0, int(text)) if text.isdigit() else (1, text)

        return [str(names[key]) for key in sorted(names, key=sort_key)]
    if isinstance(names, list):
        return [str(item) for item in names]
    return []


def _resolve_split_paths(base_dir: Path, split_value: Any) -> list[Path]:
    values = split_value if isinstance(split_value, list) else [split_value]
    paths = []
    for value in values:
        value_path = Path(str(value)).expanduser()
        if not value_path.is_absolute():
            value_path = base_dir / value_path
        if value_path.is_file() and value_path.suffix.lower() == ".txt":
            paths.extend(_read_list_file(value_path, base_dir))
        else:
            paths.append(value_path)
    return paths


def _read_list_file(path: Path, base_dir: Path) -> list[Path]:
    items = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        item = Path(stripped).expanduser()
        items.append(item if item.is_absolute() else base_dir / item)
    return items


def _audit_split(base_dir: Path, split_value: Any, class_count: int, max_examples: int) -> dict[str, Any]:
    split_paths = _resolve_split_paths(base_dir, split_value)
    images = []
    missing_examples = []
    malformed_examples = []
    bad_class_examples = []
    empty_label_files = 0
    label_files = 0
    objects = 0
    malformed_lines = 0
    bad_class_ids = 0

    for path in split_paths:
        if path.is_dir():
            images.extend(item for item in path.rglob("*") if item.suffix.lower() in IMAGE_EXTENSIONS)
        elif path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(path)

    images = sorted(set(images))
    for image_path in images:
        label_path = _label_path_for_image(image_path)
        if not label_path.exists():
            if len(missing_examples) < max_examples:
                missing_examples.append(str(image_path))
            continue
        label_files += 1
        lines = [line.strip() for line in label_path.read_text(encoding="utf-8", errors="replace").splitlines() if line.strip()]
        if not lines:
            empty_label_files += 1
            continue
        for line_number, line in enumerate(lines, start=1):
            parsed = _parse_yolo_line(line)
            if parsed is None:
                malformed_lines += 1
                if len(malformed_examples) < max_examples:
                    malformed_examples.append({"file": str(label_path), "line": line_number, "value": line})
                continue
            objects += 1
            class_id = parsed["class_id"]
            if class_count and (class_id < 0 or class_id >= class_count):
                bad_class_ids += 1
                if len(bad_class_examples) < max_examples:
                    bad_class_examples.append({"file": str(label_path), "line": line_number, "class_id": class_id})

    return {
        "paths": [str(path) for path in split_paths],
        "images": len(images),
        "label_files": label_files,
        "missing_label_files": max(0, len(images) - label_files),
        "empty_label_files": empty_label_files,
        "objects": objects,
        "malformed_lines": malformed_lines,
        "bad_class_ids": bad_class_ids,
        "missing_examples": missing_examples,
        "malformed_examples": malformed_examples,
        "bad_class_examples": bad_class_examples,
    }


def _label_path_for_image(image_path: Path) -> Path:
    parts = list(image_path.parts)
    lowered = [part.lower() for part in parts]
    if "images" in lowered:
        idx = len(lowered) - 1 - lowered[::-1].index("images")
        parts[idx] = "labels"
        return Path(*parts).with_suffix(".txt")
    return image_path.parent.parent / "labels" / f"{image_path.stem}.txt"


def _parse_yolo_line(line: str) -> dict[str, Any] | None:
    parts = line.strip().lstrip("\ufeff").split()
    if len(parts) < 5:
        return None
    try:
        class_id = int(float(parts[0]))
        values = [float(value) for value in parts[1:5]]
    except ValueError:
        return None
    if any(not math.isfinite(value) for value in values):
        return None
    return {"class_id": class_id, "box": values}


def _read_yolo_boxes(path: Path, has_conf: bool) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    boxes = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        parsed = _parse_yolo_line(line)
        if parsed is None:
            continue
        parts = line.split()
        confidence = 1.0
        if has_conf and len(parts) >= 6:
            try:
                confidence = float(parts[5])
            except ValueError:
                confidence = 1.0
        parsed["confidence"] = confidence
        boxes.append(parsed)
    return boxes


def _xywh_to_xyxy(box: list[float]) -> tuple[float, float, float, float]:
    x_center, y_center, width, height = box
    return (
        x_center - width / 2,
        y_center - height / 2,
        x_center + width / 2,
        y_center + height / 2,
    )


def _iou(box_a: list[float], box_b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = _xywh_to_xyxy(box_a)
    bx1, by1, bx2, by2 = _xywh_to_xyxy(box_b)
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    inter_area = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter_area
    return inter_area / union if union else 0.0


def _metric_row(tp: int, fp: int, fn: int) -> dict[str, Any]:
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": round(precision, 6),
        "recall": round(recall, 6),
        "f1": round(f1, 6),
    }
