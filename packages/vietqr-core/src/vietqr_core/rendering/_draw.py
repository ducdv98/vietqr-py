"""Small image helpers shared by the card templates."""

import io

from PIL import Image, ImageChops

MAX_LOGO_PIXELS = 4_000_000

type Box = tuple[int, int, int, int]


def decode_image(data: bytes) -> Image.Image | None:
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.width * image.height > MAX_LOGO_PIXELS:
                return None
            return image.convert("RGBA")
    except (OSError, ValueError, Image.DecompressionBombError):
        return None


def visual_bounds(image: Image.Image) -> tuple[Box, float]:
    red, green, blue, alpha = image.convert("RGBA").split()

    visible = alpha.point(lambda value: 255 if value > 15 else 0)
    not_white = ImageChops.lighter(
        ImageChops.lighter(
            red.point(lambda value: 255 if value < 248 else 0),
            green.point(lambda value: 255 if value < 248 else 0),
        ),
        blue.point(lambda value: 255 if value < 248 else 0),
    )
    mask = ImageChops.darker(visible, not_white)

    box = mask.getbbox()
    if box is None:
        return (0, 0, image.width, image.height), image.height / 2

    total = 0
    weighted = 0
    for y in range(box[1], box[3]):
        count = mask.crop((0, y, mask.width, y + 1)).histogram()[255]
        total += count
        weighted += y * count
    return box, weighted / total


def limit_scale(scale: float, width: int, height: int, *, max_height: int, max_width: int) -> float:
    return min(scale, max_height / height, max_width / width)
