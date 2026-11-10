import io

import pytest
from PIL import Image

from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.rendering.matrix import build_matrix
from vietqr_core.rendering.qr_only import MAX_SIZE, render_qr_png

PAYLOAD = build_payload(VietQrRequest("970422", "0123456789", amount=50000, description="hello"))


def test_matrix_is_square_with_a_valid_qr_size():
    matrix = build_matrix(PAYLOAD)
    n = len(matrix)
    assert all(len(row) == n for row in matrix)
    assert (n - 17) % 4 == 0  # 21, 25, 29 ... = 17 + 4 * version


def test_matrix_has_finder_patterns_in_three_corners():
    matrix = build_matrix(PAYLOAD)
    n = len(matrix)
    for top, left in [(0, 0), (0, n - 7), (n - 7, 0)]:
        for r in range(7):
            for c in range(7):
                ring = max(abs(r - 3), abs(c - 3))
                assert matrix[top + r][left + c] is (ring != 2)


def test_matrix_is_deterministic():
    assert build_matrix(PAYLOAD) == build_matrix(PAYLOAD)


def test_longer_content_gives_a_bigger_matrix():
    assert len(build_matrix("x" * 200)) > len(build_matrix("x"))


@pytest.mark.parametrize("text", ["", "   ", "\n"])
def test_blank_content_is_rejected(text):
    with pytest.raises(ValueError):
        build_matrix(text)
    with pytest.raises(ValueError):
        render_qr_png(text)


def test_png_has_the_requested_size():
    data = render_qr_png(PAYLOAD, size=500)
    assert data.startswith(b"\x89PNG\r\n\x1a\n")
    assert Image.open(io.BytesIO(data)).size == (500, 500)


def test_default_size_is_500():
    assert Image.open(io.BytesIO(render_qr_png(PAYLOAD))).size == (500, 500)


@pytest.mark.parametrize("size", [300, 500, 777])
def test_pixels_match_the_matrix(size):
    matrix = build_matrix(PAYLOAD)
    n = len(matrix)
    image = Image.open(io.BytesIO(render_qr_png(PAYLOAD, size=size))).convert("L")
    padding = max(10, int(size * 0.02))
    module = (size - 2 * padding) / n
    for row in range(n):
        for col in range(n):
            x = padding + int((col + 0.5) * module)
            y = padding + int((row + 0.5) * module)
            assert (image.getpixel((x, y)) == 0) is matrix[row][col]


def test_border_is_white():
    image = Image.open(io.BytesIO(render_qr_png(PAYLOAD, size=500)))
    assert image.getpixel((0, 0)) == (255, 255, 255)
    assert image.getpixel((499, 499)) == (255, 255, 255)


@pytest.mark.parametrize("size", [0, -1, MAX_SIZE + 1, 20])
def test_bad_size_is_rejected(size):
    with pytest.raises(ValueError):
        render_qr_png(PAYLOAD, size=size)
