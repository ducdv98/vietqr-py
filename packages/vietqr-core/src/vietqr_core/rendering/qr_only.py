"""Render a VietQR payload as a plain QR code PNG (the 'qr_only' template, no logo)."""

import io

from PIL import Image, ImageDraw

from vietqr_core.rendering.matrix import build_matrix, draw_matrix

DEFAULT_SIZE = 500
MAX_SIZE = 4096


def render_qr_png(text: str, *, size: int = DEFAULT_SIZE) -> bytes:
    if not 0 < size <= MAX_SIZE:
        raise ValueError(f"size must be between 1 and {MAX_SIZE}, got {size}")

    matrix = build_matrix(text)

    padding = max(10, int(size * 0.02))
    inner = size - 2 * padding
    if inner < len(matrix):
        raise ValueError(f"size {size} is too small for a {len(matrix)}x{len(matrix)} QR code")

    image = Image.new("RGB", (size, size), "white")
    draw_matrix(ImageDraw.Draw(image), matrix, left=padding, top=padding, size=inner)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
