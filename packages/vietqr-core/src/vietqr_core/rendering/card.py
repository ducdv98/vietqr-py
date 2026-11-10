"""Render a VietQR payload as the compact card PNG.

Port of the C# compact template: VietQR header, framed QR code with a centre icon, and a footer
with the Napas247 logo and the bank logo. Every image is optional; a missing one is skipped.
The same drawing code serves the print template, which only moves things around (see `Layout`).
"""

import re
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

from vietqr_core.banks.models import BankInfo
from vietqr_core.rendering._draw import Box, decode_image, encode_png, limit_scale, visual_bounds
from vietqr_core.rendering.assets import AssetProvider
from vietqr_core.rendering.matrix import Matrix, build_matrix, draw_matrix

NAVY = (0, 59, 112)
BANK_TEXT_COLOR = (0, 82, 155)

FRAME_SIZE = 374
QR_PADDING = 9

CENTER_BOX = 58
CENTER_ICON = 46
CENTER_RADIUS = 5

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
class Layout:
    """The few numbers that differ between the compact and the print card."""

    width: int
    header_height: int
    header_top: int
    frame_top: int
    footer_y: int

    @property
    def frame_left(self) -> int:
        return (self.width - FRAME_SIZE) // 2


COMPACT = Layout(width=540, header_height=46, header_top=18, frame_top=84, footer_y=495)
PRINT = Layout(width=600, header_height=48, header_top=24, frame_top=96, footer_y=516)

FRAME_LEFT = COMPACT.frame_left
FRAME_TOP = COMPACT.frame_top


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


def _draw_header(canvas: Image.Image, layout: Layout, assets: AssetProvider | None) -> None:
    image = _load_image(assets, "vietqr.png")
    if image is None:
        return

    box, center_y = visual_bounds(image)
    width, height = box[2] - box[0], box[3] - box[1]
    scale = limit_scale(
        layout.header_height / height,
        width,
        height,
        max_height=layout.header_height,
        max_width=layout.width,
    )
    logo = _Logo(image, box, center_y, scale)
    logo.paste_onto(canvas, (layout.width - logo.width) // 2, layout.header_top)


def _draw_frame(draw: ImageDraw.ImageDraw, layout: Layout) -> None:
    # The C# stroke is 2.5 px centred on the frame edge: two fully covered pixel columns per side.
    draw.rectangle(
        (
            layout.frame_left - 1,
            layout.frame_top - 1,
            layout.frame_left + FRAME_SIZE,
            layout.frame_top + FRAME_SIZE,
        ),
        outline=NAVY,
        width=2,
    )


def _draw_center_icon(
    canvas: Image.Image, draw: ImageDraw.ImageDraw, layout: Layout, assets: AssetProvider | None
) -> None:
    image = _load_image(assets, "vietqr_icon.png")
    if image is None:
        return

    box_left = (layout.width - CENTER_BOX) // 2
    box_top = layout.frame_top + (FRAME_SIZE - CENTER_BOX) // 2
    draw.rounded_rectangle(
        (box_left, box_top, box_left + CENTER_BOX - 1, box_top + CENTER_BOX - 1),
        radius=CENTER_RADIUS,
        fill="white",
    )

    icon = image.resize((CENTER_ICON, CENTER_ICON), Image.Resampling.BICUBIC)
    icon_left = (layout.width - CENTER_ICON) // 2
    icon_top = layout.frame_top + (FRAME_SIZE - CENTER_ICON) // 2
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
    layout: Layout,
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
    napas_left = (layout.width - total) // 2
    separator_x = napas_left + napas_width + FOOTER_GAP + SEPARATOR_WIDTH // 2
    bank_left = separator_x + SEPARATOR_WIDTH // 2 + FOOTER_GAP

    draw.rectangle(
        (
            separator_x - SEPARATOR_WIDTH // 2,
            layout.footer_y - SEPARATOR_HALF_HEIGHT,
            separator_x + SEPARATOR_WIDTH // 2 - 1,
            layout.footer_y + SEPARATOR_HALF_HEIGHT - 1,
        ),
        fill=NAVY,
    )

    if napas is not None:
        napas.paste_centered_on(canvas, napas_left, layout.footer_y)
    if bank_logo is not None:
        bank_logo.paste_centered_on(canvas, bank_left, layout.footer_y)
    elif bank_text:
        draw.text(
            (bank_left, layout.footer_y),
            bank_text,
            fill=BANK_TEXT_COLOR,
            font=font,
            anchor="lm",
        )


def draw_card(
    canvas: Image.Image,
    layout: Layout,
    matrix: Matrix,
    bank: BankInfo | None,
    assets: AssetProvider | None,
) -> None:
    draw = ImageDraw.Draw(canvas)

    _draw_header(canvas, layout, assets)
    _draw_frame(draw, layout)
    draw_matrix(
        draw,
        matrix,
        left=layout.frame_left + QR_PADDING,
        top=layout.frame_top + QR_PADDING,
        size=FRAME_SIZE - 2 * QR_PADDING,
    )
    _draw_center_icon(canvas, draw, layout, assets)
    _draw_footer(canvas, draw, layout, bank, assets)


def render_card_png(
    payload: str, *, bank: BankInfo | None = None, assets: AssetProvider | None = None
) -> bytes:
    matrix = build_matrix(payload)

    canvas = Image.new("RGB", (COMPACT.width, COMPACT.width), "white")
    draw_card(canvas, COMPACT, matrix, bank, assets)
    return encode_png(canvas)
