"""Render a VietQR payload as a plain QR code PNG (the 'qr_only' template, no logo)."""

import io

import segno
from PIL import Image, ImageDraw

DEFAULT_SIZE = 500
MAX_SIZE = 4096

type Matrix = tuple[tuple[bool, ...], ...]


def build_matrix(text: str) -> Matrix:
    if not text.strip():
        raise ValueError("QR content must not be empty")
    qr = segno.make(text, error="q", micro=False, boost_error=False)
    return tuple(tuple(bool(cell) for cell in row) for row in qr.matrix)


def render_qr_png(text: str, *, size: int = DEFAULT_SIZE) -> bytes:
    if not 0 < size <= MAX_SIZE:
        raise ValueError(f"size must be between 1 and {MAX_SIZE}, got {size}")

    matrix = build_matrix(text)
    count = len(matrix)

    padding = max(10, int(size * 0.02))
    inner = size - 2 * padding
    if inner < count:
        raise ValueError(f"size {size} is too small for a {count}x{count} QR code")
    module = inner / count

    def edge(index: int) -> int:
        return padding + round(index * module)

    image = Image.new("RGB", (size, size), "white")
    draw = ImageDraw.Draw(image)
    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            if dark:
                draw.rectangle(
                    (edge(col), edge(row), edge(col + 1) - 1, edge(row + 1) - 1),
                    fill="black",
                )

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
