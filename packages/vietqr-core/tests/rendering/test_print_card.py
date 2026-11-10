import io
from pathlib import Path

import pytest
from PIL import Image, ImageChops

from vietqr_core.banks.models import BankInfo
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.rendering.card import NAVY, PRINT
from vietqr_core.rendering.matrix import build_matrix
from vietqr_core.rendering.print_card import (
    FONT_ASSET,
    Line,
    PrintDetails,
    build_lines,
    format_amount,
    render_print_png,
)

PAYLOAD = build_payload(VietQrRequest("970422", "0123456789", amount=50000, description="hello"))
BANK = BankInfo(bin="970436", code="VCB", short_name="VCB", name="Vietcombank", logo="")
WHITE = (255, 255, 255)
FULL = PrintDetails(
    amount=1234567,
    description="Thanh toan don hang",
    account_name="Nguyễn Văn Á",
    account_no="0123456789",
)
SYSTEM_FONTS = [
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]


class FakeAssets:
    def __init__(self, files=None):
        self.files = files or {}

    def load(self, name):
        return self.files.get(name)


def render(details=FULL, **kwargs):
    data = render_print_png(PAYLOAD, details, **kwargs)
    return Image.open(io.BytesIO(data)).convert("RGB")


def navy_bbox(image, *, tolerance=60):
    masks = [
        band.point(lambda v, c=c: 255 if abs(v - c) <= tolerance else 0)
        for band, c in zip(image.split(), NAVY, strict=True)
    ]
    return ImageChops.darker(ImageChops.darker(masks[0], masks[1]), masks[2]).getbbox()


@pytest.mark.parametrize(
    ("amount", "text"),
    [(1, "1 VND"), (999, "999 VND"), (1000, "1.000 VND"), (1234567, "1.234.567 VND")],
)
def test_amount_uses_dots_as_thousands_separator(amount, text):
    assert format_amount(amount) == text


def test_all_lines_in_order_with_their_style():
    lines = build_lines(FULL, BANK)
    assert lines == [
        Line("Số tiền: 1.234.567 VND", False, 16),
        Line("Nội dung CK: Thanh toan don hang", False, 16),
        Line("Tên chủ TK: NGUYỄN VĂN Á", False, 16),
        Line("Số TK: 0123456789", True, 18),
        Line("Vietcombank", False, 15),
    ]


@pytest.mark.parametrize("amount", [None, 0, -5])
def test_no_amount_line_without_a_positive_amount(amount):
    lines = build_lines(PrintDetails(amount=amount, account_no="1"), None)
    assert [line.text for line in lines] == ["Số TK: 1"]


def test_card_service_uses_the_card_label():
    lines = build_lines(PrintDetails(account_no="9704", is_card=True), None)
    assert lines == [Line("Số thẻ: 9704", True, 18)]


def test_blank_values_are_skipped_and_whitespace_is_collapsed():
    details = PrintDetails(description="  a \n\t b  ", account_name="   ", account_no="")
    assert build_lines(details, None) == [Line("Nội dung CK: a b", False, 16)]


def test_bank_line_prefers_the_full_name_then_the_short_name():
    blank_name = BankInfo(bin="1", code="X", short_name="Short", name="  ", logo="")
    assert build_lines(PrintDetails(), BANK)[-1].text == "Vietcombank"
    assert build_lines(PrintDetails(), blank_name)[-1].text == "Short"
    assert build_lines(PrintDetails(), None) == []


@pytest.mark.parametrize(
    ("details", "bank", "lines"),
    [
        (PrintDetails(), None, 0),
        (PrintDetails(account_no="1"), None, 1),
        (FULL, BANK, 5),
    ],
)
def test_canvas_height_grows_by_28_pixels_per_line(details, bank, lines):
    assert render(details, bank=bank).size == (600, 590 + 28 * lines + 16)


def test_frame_and_separator_sit_at_the_print_offsets():
    image = render(PrintDetails())
    for point in [(112, 300), (113, 300), (486, 300), (487, 300)]:
        assert image.getpixel(point) == NAVY
    for point in [(300, 95), (300, 96), (300, 469), (300, 470)]:
        assert image.getpixel(point) == NAVY
    separator = [x for x in range(600) if image.getpixel((x, 516)) == NAVY]
    assert len(separator) == 2
    assert image.getpixel((separator[0], 498)) == NAVY
    assert image.getpixel((separator[0], 533)) == NAVY
    assert image.getpixel((separator[0], 497)) == WHITE
    assert image.getpixel((separator[0], 534)) == WHITE


def test_qr_modules_match_the_matrix_at_the_print_offsets():
    image = render(PrintDetails())
    matrix = build_matrix(PAYLOAD)
    module = (374 - 18) / len(matrix)
    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            x = PRINT.frame_left + 9 + int((col + 0.5) * module)
            y = PRINT.frame_top + 9 + int((row + 0.5) * module)
            assert image.getpixel((x, y)) == ((0, 0, 0) if dark else WHITE)


def test_text_is_drawn_below_the_card_only_when_there_are_lines():
    below_card = (0, 545, 600, 640)
    assert navy_bbox(render(PrintDetails()).crop((0, 545, 600, 606))) is None

    image = render(FULL, bank=BANK)
    box = navy_bbox(image.crop(below_card))
    assert box is not None
    assert abs((box[0] + box[2]) / 2 - 300) < 60  # centred


def test_diacritics_do_not_break_the_fallback_font():
    assert render(FULL, bank=BANK).size[0] == 600


def test_unusable_font_asset_falls_back():
    assets = FakeAssets({FONT_ASSET: b"this is not a font"})
    assert render(FULL, bank=BANK, assets=assets).size == (600, 590 + 28 * 5 + 16)


def test_a_real_font_is_used_when_the_provider_has_one():
    path = next((p for p in SYSTEM_FONTS if Path(p).is_file()), None)
    if path is None:
        pytest.skip("no system font with Vietnamese glyphs found")
    assets = FakeAssets({FONT_ASSET: Path(path).read_bytes()})
    with_font = render(FULL, bank=BANK, assets=assets)
    without = render(FULL, bank=BANK)
    assert with_font.size == without.size
    assert with_font.tobytes() != without.tobytes()


def test_blank_payload_is_rejected():
    with pytest.raises(ValueError):
        render_print_png("", PrintDetails())
