import io

import pytest
from PIL import Image, ImageDraw

from vietqr_core.rendering._draw import MAX_LOGO_PIXELS, decode_image, limit_scale, visual_bounds
from vietqr_core.rendering.matrix import draw_matrix


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_draw_matrix_paints_dark_modules_only():
    image = Image.new("RGB", (30, 30), "white")
    matrix = ((True, False), (False, True))
    draw_matrix(ImageDraw.Draw(image), matrix, left=5, top=5, size=20)
    assert image.getpixel((7, 7)) == (0, 0, 0)
    assert image.getpixel((22, 22)) == (0, 0, 0)
    assert image.getpixel((22, 7)) == (255, 255, 255)
    assert image.getpixel((7, 22)) == (255, 255, 255)
    assert image.getpixel((4, 4)) == (255, 255, 255)


def test_visual_bounds_of_a_dark_box_on_white():
    image = Image.new("RGB", (100, 100), "white")
    ImageDraw.Draw(image).rectangle((20, 30, 59, 49), fill="black")
    box, center_y = visual_bounds(image)
    assert box == (20, 30, 60, 50)
    assert center_y == 39.5


def test_visual_bounds_ignores_transparent_pixels():
    image = Image.new("RGBA", (50, 50), (0, 0, 0, 0))
    ImageDraw.Draw(image).rectangle((10, 5, 19, 14), fill=(200, 0, 0, 255))
    box, _ = visual_bounds(image)
    assert box == (10, 5, 20, 15)


def test_visual_bounds_treats_near_white_as_background():
    image = Image.new("RGB", (20, 20), (250, 250, 250))
    ImageDraw.Draw(image).rectangle((5, 5, 9, 9), fill=(247, 250, 250))
    box, _ = visual_bounds(image)
    assert box == (5, 5, 10, 10)


def test_visual_bounds_of_an_empty_image_is_the_whole_image():
    box, center_y = visual_bounds(Image.new("RGBA", (40, 20), (0, 0, 0, 0)))
    assert box == (0, 0, 40, 20)
    assert center_y == 10


def test_visual_bounds_center_follows_the_heavier_side():
    image = Image.new("RGB", (10, 10), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 9, 1), fill="black")  # rows 0-1, 10 px each
    draw.rectangle((0, 9, 0, 9), fill="black")  # row 9, 1 px
    _, center_y = visual_bounds(image)
    assert center_y == pytest.approx((0 * 10 + 1 * 10 + 9 * 1) / 21)


def test_decode_image_reads_a_png_as_rgba():
    decoded = decode_image(png_bytes(Image.new("RGB", (12, 7), "red")))
    assert decoded is not None
    assert decoded.mode == "RGBA"
    assert decoded.size == (12, 7)


@pytest.mark.parametrize("data", [b"", b"not an image", b"\x89PNG\r\n\x1a\n" + b"junk"])
def test_decode_image_gives_none_for_garbage(data):
    assert decode_image(data) is None


def test_decode_image_refuses_huge_images():
    side = int(MAX_LOGO_PIXELS**0.5) + 1
    assert decode_image(png_bytes(Image.new("1", (side, side)))) is None


def test_limit_scale_keeps_a_small_scale():
    assert limit_scale(0.5, 100, 40, max_height=42, max_width=220) == 0.5


def test_limit_scale_caps_the_height():
    assert limit_scale(2.0, 100, 40, max_height=42, max_width=220) == pytest.approx(1.05)


def test_limit_scale_caps_the_width():
    assert limit_scale(2.0, 400, 10, max_height=42, max_width=220) == pytest.approx(0.55)
