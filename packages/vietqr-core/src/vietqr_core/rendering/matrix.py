"""The QR module grid: build it from text, draw it onto an image."""

import segno
from PIL import ImageDraw

type Matrix = tuple[tuple[bool, ...], ...]


def build_matrix(text: str) -> Matrix:
    if not text.strip():
        raise ValueError("QR content must not be empty")
    qr = segno.make(text, error="q", micro=False, boost_error=False)
    return tuple(tuple(bool(cell) for cell in row) for row in qr.matrix)


def draw_matrix(
    draw: ImageDraw.ImageDraw, matrix: Matrix, *, left: int, top: int, size: int
) -> None:
    module = size / len(matrix)

    def edge(index: int) -> int:
        return round(index * module)

    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            if dark:
                draw.rectangle(
                    (
                        left + edge(col),
                        top + edge(row),
                        left + edge(col + 1) - 1,
                        top + edge(row + 1) - 1,
                    ),
                    fill="black",
                )
