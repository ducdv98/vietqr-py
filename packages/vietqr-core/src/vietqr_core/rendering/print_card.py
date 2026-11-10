"""Render the 'print' card: the compact card on a taller canvas, payment details below it."""

import io
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

from vietqr_core._internal.diacritics import normalize
from vietqr_core.banks.models import BankInfo
from vietqr_core.rendering._draw import encode_png
from vietqr_core.rendering.assets import AssetProvider
from vietqr_core.rendering.card import NAVY, PRINT, draw_card
from vietqr_core.rendering.matrix import build_matrix

FONT_ASSET = "fonts/text.ttf"

BASE_HEIGHT = 590
LINE_HEIGHT = 28
BOTTOM_MARGIN = 16

TEXT_TOP = 566
REGULAR_ADVANCE = 26
BOLD_ADVANCE = 29
REGULAR_SIZE = 16
ACCOUNT_SIZE = 18
BANK_SIZE = 15
BOLD_STROKE = 0.4  # emulates Skia's synthetic Embolden on a regular face

type Font = ImageFont.FreeTypeFont | ImageFont.ImageFont


@dataclass(frozen=True, slots=True)
class PrintDetails:
    amount: int | None = None
    description: str | None = None
    account_name: str | None = None
    account_no: str | None = None
    is_card: bool = False


@dataclass(frozen=True, slots=True)
class Line:
    text: str
    bold: bool
    size: int


def _clean(value: str | None) -> str:
    return " ".join((value or "").split())


def format_amount(amount: int) -> str:
    return f"{amount:,}".replace(",", ".") + " VND"


def build_lines(details: PrintDetails, bank: BankInfo | None) -> list[Line]:
    lines: list[Line] = []

    if details.amount is not None and details.amount > 0:
        lines.append(Line(f"Số tiền: {format_amount(details.amount)}", False, REGULAR_SIZE))
    if description := _clean(details.description):
        lines.append(Line(f"Nội dung CK: {description}", False, REGULAR_SIZE))
    if account_name := _clean(details.account_name):
        lines.append(Line(f"Tên chủ TK: {account_name.upper()}", False, REGULAR_SIZE))
    if account_no := _clean(details.account_no):
        label = "Số thẻ" if details.is_card else "Số TK"
        lines.append(Line(f"{label}: {account_no}", True, ACCOUNT_SIZE))
    if bank is not None and (bank_name := _clean(bank.name) or _clean(bank.short_name)):
        lines.append(Line(bank_name, False, BANK_SIZE))

    return lines


def _usable_font_data(assets: AssetProvider | None) -> bytes | None:
    data = assets.load(FONT_ASSET) if assets is not None else None
    if data is None:
        return None
    try:
        ImageFont.truetype(io.BytesIO(data), REGULAR_SIZE)
    except (OSError, ValueError):
        return None
    return data


def _font(data: bytes | None, size: int) -> Font:
    if data is None:
        return ImageFont.load_default(size)
    return ImageFont.truetype(io.BytesIO(data), size)


def _draw_lines(canvas: Image.Image, lines: list[Line], assets: AssetProvider | None) -> None:
    font_data = _usable_font_data(assets)
    draw = ImageDraw.Draw(canvas)

    baseline = TEXT_TOP
    for line in lines:
        # Pillow's built-in font has no Vietnamese glyphs: without our own font, drop diacritics.
        text = line.text if font_data is not None else normalize(line.text)
        draw.text(
            (PRINT.width / 2, baseline),
            text,
            fill=NAVY,
            font=_font(font_data, line.size),
            anchor="ms",
            stroke_width=BOLD_STROKE if line.bold else 0,
            stroke_fill=NAVY,
        )
        baseline += BOLD_ADVANCE if line.bold else REGULAR_ADVANCE


def render_print_png(
    payload: str,
    details: PrintDetails,
    *,
    bank: BankInfo | None = None,
    assets: AssetProvider | None = None,
) -> bytes:
    matrix = build_matrix(payload)
    lines = build_lines(details, bank)

    height = BASE_HEIGHT + LINE_HEIGHT * len(lines) + BOTTOM_MARGIN
    canvas = Image.new("RGB", (PRINT.width, height), "white")
    draw_card(canvas, PRINT, matrix, bank, assets)
    _draw_lines(canvas, lines, assets)
    return encode_png(canvas)
