"""Render a VietQR payload as the compact card PNG.

Port of the C# compact template: VietQR header, framed QR code with a centre icon, and a footer
with the Napas247 logo and the bank logo. Every image is optional; a missing one is skipped.
"""

import io
import re
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

from vietqr_core.banks.models import BankInfo
from vietqr_core.rendering._draw import Box, decode_image, limit_scale, visual_bounds
from vietqr_core.rendering.assets import AssetProvider
from vietqr_core.rendering.matrix import build_matrix, draw_matrix

CANVAS = 540
NAVY = (0, 59, 112)
BANK_TEXT_COLOR = (0, 82, 155)

HEADER_HEIGHT = 46
HEADER_TOP = 18

FRAME_SIZE = 374
FRAME_LEFT = (CANVAS - FRAME_SIZE) // 2
FRAME_TOP = 84
QR_PADDING = 9

CENTER_BOX = 58
CENTER_ICON = 46
CENTER_RADIUS = 5

FOOTER_CENTER_Y = 495
FOOTER_LOGO_HEIGHT = 35
FOOTER_GAP = 14
SEPARATOR_WIDTH = 2
SEPARATOR_HALF_HEIGHT = 18
BANK_MAX_HEIGHT = 42
BANK_MAX_WIDTH = 220
BANK_TEXT_SIZE = 24

# The BIN comes from an untrusted payload and ends up in an asset name: ASCII digits only.
_BIN = re.compile(r"[0-9]+")


@dataclass(frozen=True, slots=True)
class _Logo:
    image: Image.Image
    box: Box
    center_y: float
    scale: float

    @property
    def width(self) -> int:
        return max(1, round((self.box[2] - self.box[0]) * self.scale))

    @property
    def height(self) -> int:
        return max(1, round((self.box[3] - self.box[1]) * self.scale))

    def paste_onto(self, canvas: Image.Image, left: int, top: int) -> None:
        part = self.image.crop(self.box).resize((self.width, self.height), Image.Resampling.BICUBIC)
        canvas.paste(part, (left, top), part)

    def paste_centered_on(self, canvas: Image.Image, left: int, center_y: int) -> None:
        offset = (self.center_y - self.box[1]) * self.scale
        self.paste_onto(canvas, left, round(center_y - offset))


def _load_image(assets: AssetProvider | None, name: str) -> Image.Image | None:
    if assets is None:
        return None
    data = assets.load(name)
    return decode_image(data) if data is not None else None


def _napas_logo(assets: AssetProvider | None) -> _Logo | None:
    image = _load_image(assets, "napas247.png")
    if image is None:
        return None

    box, center_y = visual_bounds(image)
    return _Logo(image, box, center_y, FOOTER_LOGO_HEIGHT / (box[3] - box[1]))


def _draw_header(canvas: Image.Image, assets: AssetProvider | None) -> None:
    image = _load_image(assets, "vietqr.png")
    if image is None:
        return

    box, center_y = visual_bounds(image)
    width, height = box[2] - box[0], box[3] - box[1]
    scale = limit_scale(
        HEADER_HEIGHT / height, width, height, max_height=HEADER_HEIGHT, max_width=CANVAS
    )
    logo = _Logo(image, box, center_y, scale)
    logo.paste_onto(canvas, (CANVAS - logo.width) // 2, HEADER_TOP)


def _draw_frame(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle(
        (
            FRAME_LEFT - 1,
            FRAME_TOP - 1,
            FRAME_LEFT + FRAME_SIZE,
            FRAME_TOP + FRAME_SIZE,
        ),
        outline=NAVY,
        width=2,
    )


def _draw_center_icon(
    canvas: Image.Image, draw: ImageDraw.ImageDraw, assets: AssetProvider | None
) -> None:
    image = _load_image(assets, "vietqr_icon.png")
    if image is None:
        return

    box_left = (CANVAS - CENTER_BOX) // 2
    box_top = FRAME_TOP + (FRAME_SIZE - CENTER_BOX) // 2
    draw.rounded_rectangle(
        (box_left, box_top, box_left + CENTER_BOX - 1, box_top + CENTER_BOX - 1),
        radius=CENTER_RADIUS,
        fill="white",
    )

    icon = image.resize((CENTER_ICON, CENTER_ICON), Image.Resampling.BICUBIC)
    icon_left = (CANVAS - CENTER_ICON) // 2
    icon_top = FRAME_TOP + (FRAME_SIZE - CENTER_ICON) // 2
    canvas.paste(icon, (icon_left, icon_top), icon)


def _bank_logo(
    assets: AssetProvider | None, bank: BankInfo | None, napas_scale: float
) -> _Logo | None:
    if bank is None or not _BIN.fullmatch(bank.bin):
        return None

    image = _load_image(assets, f"logos/{bank.bin}.png")
    if image is None:
        return None

    box, center_y = visual_bounds(image)
    width, height = box[2] - box[0], box[3] - box[1]
    scale = FOOTER_LOGO_HEIGHT / height
    if image.width >= 800 and image.height >= 300:
        scale = napas_scale
    scale = limit_scale(scale, width, height, max_height=BANK_MAX_HEIGHT, max_width=BANK_MAX_WIDTH)
    return _Logo(image, box, center_y, scale)


def _draw_footer(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    bank: BankInfo | None,
    assets: AssetProvider | None,
) -> None:
    napas = _napas_logo(assets)
    napas_width = napas.width if napas is not None else 0

    bank_logo = _bank_logo(assets, bank, napas.scale if napas is not None else 1.0)
    bank_text = ""
    font = ImageFont.load_default(BANK_TEXT_SIZE)
    bank_width = 0
    if bank_logo is not None:
        bank_width = bank_logo.width
    elif bank is not None and bank.short_name.strip():
        bank_text = bank.short_name
        bank_width = round(draw.textlength(bank_text, font=font))

    total = napas_width + FOOTER_GAP + SEPARATOR_WIDTH + FOOTER_GAP + bank_width
    napas_left = (CANVAS - total) // 2
    separator_x = napas_left + napas_width + FOOTER_GAP + SEPARATOR_WIDTH // 2
    bank_left = separator_x + SEPARATOR_WIDTH // 2 + FOOTER_GAP

    draw.rectangle(
        (
            separator_x - SEPARATOR_WIDTH // 2,
            FOOTER_CENTER_Y - SEPARATOR_HALF_HEIGHT,
            separator_x + SEPARATOR_WIDTH // 2 - 1,
            FOOTER_CENTER_Y + SEPARATOR_HALF_HEIGHT - 1,
        ),
        fill=NAVY,
    )

    if napas is not None:
        napas.paste_centered_on(canvas, napas_left, FOOTER_CENTER_Y)
    if bank_logo is not None:
        bank_logo.paste_centered_on(canvas, bank_left, FOOTER_CENTER_Y)
    elif bank_text:
        draw.text(
            (bank_left, FOOTER_CENTER_Y),
            bank_text,
            fill=BANK_TEXT_COLOR,
            font=font,
            anchor="lm",
        )


def render_card_png(
    payload: str, *, bank: BankInfo | None = None, assets: AssetProvider | None = None
) -> bytes:
    matrix = build_matrix(payload)

    canvas = Image.new("RGB", (CANVAS, CANVAS), "white")
    draw = ImageDraw.Draw(canvas)

    _draw_header(canvas, assets)
    _draw_frame(draw)
    draw_matrix(
        draw,
        matrix,
        left=FRAME_LEFT + QR_PADDING,
        top=FRAME_TOP + QR_PADDING,
        size=FRAME_SIZE - 2 * QR_PADDING,
    )
    _draw_center_icon(canvas, draw, assets)
    _draw_footer(canvas, draw, bank, assets)

    buffer = io.BytesIO()
    canvas.save(buffer, format="PNG")
    return buffer.getvalue()
