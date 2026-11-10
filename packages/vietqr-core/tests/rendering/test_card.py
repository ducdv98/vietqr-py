import io

import pytest
from PIL import Image, ImageChops

from vietqr_core.banks.models import BankInfo
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.rendering.card import (
    BANK_MAX_HEIGHT,
    BANK_MAX_WIDTH,
    FRAME_LEFT,
    FRAME_SIZE,
    FRAME_TOP,
    NAVY,
    QR_PADDING,
    render_card_png,
)
from vietqr_core.rendering.matrix import build_matrix

PAYLOAD = build_payload(VietQrRequest("970422", "0123456789", amount=50000, description="hello"))
BANK = BankInfo(bin="970436", code="VCB", short_name="Vietcombank", name="Vietcombank", logo="")
WHITE = (255, 255, 255)
FOOTER_BAND = (0, 440, 540, 540)


class FakeAssets:
    def __init__(self, files=None):
        self.files = files or {}
        self.requested = []

    def load(self, name):
        self.requested.append(name)
        return self.files.get(name)


def png(width, height, color, *, margin=0):
    """A transparent image holding one solid rectangle, `margin` px away from every edge."""
    image = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    image.paste(
        Image.new("RGBA", (width - 2 * margin, height - 2 * margin), (*color, 255)),
        (margin, margin),
    )
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def render(**kwargs):
    return Image.open(io.BytesIO(render_card_png(PAYLOAD, **kwargs))).convert("RGB")


def color_bbox(image, color, *, tolerance=40):
    """Bounding box of the pixels close to `color`, or None."""
    masks = [
        band.point(lambda v, c=c: 255 if abs(v - c) <= tolerance else 0)
        for band, c in zip(image.split(), color, strict=True)
    ]
    return ImageChops.darker(ImageChops.darker(masks[0], masks[1]), masks[2]).getbbox()


def test_card_is_a_540_square_png():
    data = render_card_png(PAYLOAD)
    assert data.startswith(b"\x89PNG\r\n\x1a\n")
    assert Image.open(io.BytesIO(data)).size == (540, 540)


def test_frame_has_two_pixel_columns_on_every_side():
    image = render()
    right = FRAME_LEFT + FRAME_SIZE
    bottom = FRAME_TOP + FRAME_SIZE
    for point in [
        (FRAME_LEFT - 1, 200),
        (FRAME_LEFT, 200),
        (right - 1, 200),
        (right, 200),
        (200, FRAME_TOP - 1),
        (200, FRAME_TOP),
        (200, bottom - 1),
        (200, bottom),
    ]:
        assert image.getpixel(point) == NAVY
    assert image.getpixel((FRAME_LEFT - 2, 200)) == WHITE
    assert image.getpixel((FRAME_LEFT + 1, 200)) == WHITE


def test_qr_modules_match_the_matrix_without_any_assets():
    image = render()
    matrix = build_matrix(PAYLOAD)
    module = (FRAME_SIZE - 2 * QR_PADDING) / len(matrix)
    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            x = FRAME_LEFT + QR_PADDING + int((col + 0.5) * module)
            y = FRAME_TOP + QR_PADDING + int((row + 0.5) * module)
            assert image.getpixel((x, y)) == ((0, 0, 0) if dark else WHITE)


def test_provider_that_has_nothing_still_renders():
    assert render(assets=FakeAssets(), bank=BANK).size == (540, 540)


def test_undecodable_assets_are_ignored():
    junk = {"vietqr.png": b"nope", "vietqr_icon.png": b"nope", "napas247.png": b"nope"}
    assert render(assets=FakeAssets(junk)).size == (540, 540)


def test_header_logo_is_centered_and_46_pixels_tall():
    assets = FakeAssets({"vietqr.png": png(200, 100, (200, 0, 0), margin=10)})  # box 180x80
    image = render(assets=assets)
    left, top, right, bottom = color_bbox(image.crop((0, 0, 540, 80)), (200, 0, 0))
    assert (top, bottom) == (18, 18 + 46)
    assert abs(left - (540 - right)) <= 1  # integer centring may be off by one pixel


def test_center_icon_sits_on_a_white_box_in_the_middle_of_the_frame():
    assets = FakeAssets({"vietqr_icon.png": png(100, 100, (0, 160, 0))})
    image = render(assets=assets)
    assert image.getpixel((270, 271)) == (0, 160, 0)
    for point in [(244, 271), (296, 271), (270, 245), (270, 297)]:
        assert image.getpixel(point) == WHITE


def test_separator_is_drawn_even_without_logos():
    image = render()
    column = [x for x in range(540) if image.getpixel((x, 495)) == NAVY]
    assert len(column) == 2 and column[1] == column[0] + 1
    x = column[0]
    assert image.getpixel((x, 477)) == NAVY
    assert image.getpixel((x, 512)) == NAVY
    assert image.getpixel((x, 476)) == WHITE
    assert image.getpixel((x, 513)) == WHITE


def test_missing_bank_logo_falls_back_to_the_short_name():
    image = render(bank=BANK)
    separator = next(x for x in range(540) if image.getpixel((x, 495)) == NAVY)
    left, top, _, bottom = color_bbox(image.crop(FOOTER_BAND), (0, 82, 155))
    assert left > separator
    assert 440 + top >= 470 and 440 + bottom <= 520


def test_no_bank_means_no_fallback_text():
    assert color_bbox(render().crop(FOOTER_BAND), (0, 82, 155)) is None


def test_bank_logo_is_scaled_to_35_pixels_and_centered_on_the_footer_line():
    assets = FakeAssets({"logos/970436.png": png(100, 40, (0, 160, 0))})  # scaled to 88x35
    image = render(assets=assets, bank=BANK)
    assert assets.requested.count("logos/970436.png") == 1
    left, top, right, bottom = color_bbox(image.crop(FOOTER_BAND), (0, 160, 0))
    assert (right - left, bottom - top) == (88, 35)
    assert 440 + top <= 495 < 440 + bottom


def test_napas_and_bank_logo_form_one_centered_group():
    assets = FakeAssets(
        {
            "napas247.png": png(120, 50, (200, 0, 0)),  # scale 0.7 -> 84x35
            "logos/970436.png": png(100, 40, (0, 160, 0)),  # scale 0.875 -> 88x35
        }
    )
    image = render(assets=assets, bank=BANK)
    napas = color_bbox(image.crop(FOOTER_BAND), (200, 0, 0))
    bank = color_bbox(image.crop(FOOTER_BAND), (0, 160, 0))
    assert (napas[2] - napas[0], napas[3] - napas[1]) == (84, 35)
    assert (bank[2] - bank[0], bank[3] - bank[1]) == (88, 35)
    total = 84 + 14 + 2 + 14 + 88
    assert napas[0] == (540 - total) // 2
    assert bank[0] == napas[0] + 84 + 14 + 2 + 14


def test_huge_bank_logo_is_capped():
    assets = FakeAssets({"logos/970436.png": png(2000, 400, (0, 160, 0))})
    image = render(assets=assets, bank=BANK)
    left, top, right, bottom = color_bbox(image.crop(FOOTER_BAND), (0, 160, 0))
    assert right - left <= BANK_MAX_WIDTH
    assert bottom - top <= BANK_MAX_HEIGHT


@pytest.mark.parametrize("bad_bin", ["97²436", "../x", "9704/36", "٩٧٠٤٣٦", "", "97 4"])
def test_unsafe_bin_never_reaches_the_asset_provider(bad_bin):
    assets = FakeAssets()
    bank = BankInfo(bin=bad_bin, code="X", short_name="X", name="X", logo="")
    render(assets=assets, bank=bank)
    assert set(assets.requested) <= {"vietqr.png", "vietqr_icon.png", "napas247.png"}


@pytest.mark.parametrize("text", ["", "  "])
def test_blank_payload_is_rejected(text):
    with pytest.raises(ValueError):
        render_card_png(text)
