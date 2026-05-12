from __future__ import annotations

from pathlib import Path
from typing import Any


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def list_images(image_dir: str, label_dir: str | None = None, limit: int = 5000) -> dict[str, Any]:
    root = Path(image_dir).expanduser()
    if not root.exists():
        raise FileNotFoundError(f"Không tìm thấy thư mục ảnh: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Đường dẫn ảnh không phải thư mục: {root}")

    images = []
    for image_path in sorted(root.rglob("*"), key=lambda path: str(path).lower()):
        if len(images) >= limit:
            break
        if not image_path.is_file() or image_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        label_path = label_path_for_image(image_path, label_dir=label_dir, image_dir=root)
        boxes = read_yolo_label_file(label_path)
        images.append(
            {
                "name": image_path.name,
                "path": str(image_path),
                "relative": str(image_path.relative_to(root)),
                "label_path": str(label_path),
                "annotated": label_path.exists(),
                "box_count": len(boxes["boxes"]),
            }
        )

    return {
        "image_dir": str(root),
        "label_dir": str(Path(label_dir).expanduser()) if label_dir else None,
        "count": len(images),
        "images": images,
        "truncated": len(images) >= limit,
    }


def read_labels(image_path: str, label_dir: str | None = None, image_dir: str | None = None) -> dict[str, Any]:
    image = Path(image_path).expanduser()
    if not image.exists() or not image.is_file():
        raise FileNotFoundError(f"Không tìm thấy ảnh: {image}")
    label_path = label_path_for_image(
        image,
        label_dir=label_dir,
        image_dir=Path(image_dir).expanduser() if image_dir else None,
    )
    payload = read_yolo_label_file(label_path)
    return {
        "image_path": str(image),
        "label_path": str(label_path),
        "boxes": payload["boxes"],
        "errors": payload["errors"],
        "exists": label_path.exists(),
    }


def save_labels(
    image_path: str,
    boxes: list[dict[str, Any]],
    label_dir: str | None = None,
    image_dir: str | None = None,
) -> dict[str, Any]:
    image = Path(image_path).expanduser()
    if not image.exists() or not image.is_file():
        raise FileNotFoundError(f"Không tìm thấy ảnh: {image}")
    label_path = label_path_for_image(
        image,
        label_dir=label_dir,
        image_dir=Path(image_dir).expanduser() if image_dir else None,
    )
    label_path.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for box in boxes:
        class_id = int(box.get("class_id", 0))
        x = clamp01(float(box.get("x", 0)))
        y = clamp01(float(box.get("y", 0)))
        w = clamp01(float(box.get("w", 0)))
        h = clamp01(float(box.get("h", 0)))
        if w <= 0 or h <= 0:
            continue
        lines.append(f"{class_id} {x:.6f} {y:.6f} {w:.6f} {h:.6f}")
    label_path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return {
        "image_path": str(image),
        "label_path": str(label_path),
        "box_count": len(lines),
        "saved": True,
    }


def label_path_for_image(image_path: Path, label_dir: str | None = None, image_dir: Path | None = None) -> Path:
    image = image_path.expanduser()
    if label_dir:
        label_root = Path(label_dir).expanduser()
        if image_dir:
            try:
                return label_root / image.relative_to(image_dir).with_suffix(".txt")
            except ValueError:
                pass
        return label_root / f"{image.stem}.txt"

    parts = list(image.parts)
    lowered = [part.lower() for part in parts]
    if "images" in lowered:
        index = len(lowered) - 1 - lowered[::-1].index("images")
        parts[index] = "labels"
        return Path(*parts).with_suffix(".txt")
    return image.parent / "labels" / f"{image.stem}.txt"


def read_yolo_label_file(label_path: Path) -> dict[str, Any]:
    boxes: list[dict[str, Any]] = []
    errors: list[str] = []
    if not label_path.exists():
        return {"boxes": boxes, "errors": errors}
    for line_number, raw_line in enumerate(label_path.read_text(encoding="utf-8", errors="replace").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5:
            errors.append(f"Dòng {line_number}: thiếu dữ liệu bbox")
            continue
        try:
            class_id = int(float(parts[0]))
            x, y, w, h = [float(value) for value in parts[1:5]]
        except ValueError:
            errors.append(f"Dòng {line_number}: không đọc được số")
            continue
        boxes.append(
            {
                "class_id": class_id,
                "x": clamp01(x),
                "y": clamp01(y),
                "w": clamp01(w),
                "h": clamp01(h),
            }
        )
    return {"boxes": boxes, "errors": errors}


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))
