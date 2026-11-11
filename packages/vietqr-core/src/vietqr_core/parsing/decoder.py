"""Reads a VietQR payment code out of an image."""

import io

import zxingcpp
from PIL import Image

from vietqr_core.banks.catalog import BankCatalog
from vietqr_core.errors import ImageDecodeError
from vietqr_core.parsing.models import VietQrInfo
from vietqr_core.parsing.parser import parse_payload

DEFAULT_MAX_PIXELS = 25_000_000
ALLOWED_FORMATS = ("PNG", "JPEG", "WEBP", "BMP", "GIF")

_QR_ONLY = zxingcpp.BarcodeFormats(zxingcpp.BarcodeFormat.QRCode)


def _open(data: bytes, max_pixels: int) -> Image.Image:
    """Open the image lazily: only the header is read, so the size check costs almost nothing."""
    try:
        image = Image.open(io.BytesIO(data), formats=ALLOWED_FORMATS)
    except Image.DecompressionBombError as exc:
        # Pillow's own guard fires first for absurd sizes, before our limit can be checked.
        raise ImageDecodeError("The image is far over the pixel limit") from exc
    except OSError as exc:
        raise ImageDecodeError("The data is not a supported image") from exc

    width, height = image.size
    if width * height > max_pixels:
        image.close()
        raise ImageDecodeError(
            f"The image is {width}x{height} pixels, which is over the {max_pixels} pixel limit"
        )
    return image


def _to_grayscale(image: Image.Image) -> Image.Image:
    """Decode all pixels into 8-bit luminance, drawing transparent areas on white."""
    try:
        if image.mode in ("RGBA", "LA") or "transparency" in image.info:
            rgba = image.convert("RGBA")
            image = Image.alpha_composite(Image.new("RGBA", rgba.size, "white"), rgba)
        return image.convert("L")
    except OSError as exc:
        raise ImageDecodeError("The image is corrupt or truncated") from exc


def read_qr_text(image: Image.Image) -> str | None:
    """Return the text of the first QR code found in ``image``, or ``None`` if there is none."""
    results = zxingcpp.read_barcodes(image, formats=_QR_ONLY)
    return results[0].text if results else None


def decode_image(
    data: bytes,
    *,
    catalog: BankCatalog | None = None,
    max_pixels: int = DEFAULT_MAX_PIXELS,
) -> VietQrInfo:
    """Decode the QR code in an image (PNG, JPEG, WebP, BMP or GIF) into payment information.

    Raises ``ImageDecodeError`` when the image cannot be read or holds no QR code, and the usual
    parsing errors (``InvalidPayloadError``, ``InvalidCrcError``, ``NotVietQrError``) when the QR
    code is not a valid VietQR payload.
    """
    if not data:
        raise ImageDecodeError("The image is empty")

    with _open(data, max_pixels) as image:
        gray = _to_grayscale(image)

    text = read_qr_text(gray)
    if text is None or not text.strip():
        raise ImageDecodeError("No QR code was found in the image")
    return parse_payload(text, catalog=catalog)
