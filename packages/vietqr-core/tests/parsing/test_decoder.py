import io

import pytest
import segno
from PIL import Image

from vietqr_core.banks.catalog import InMemoryBankCatalog
from vietqr_core.banks.models import BankInfo
from vietqr_core.emv.crc import generate_crc_code
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.errors import (
    ImageDecodeError,
    InvalidCrcError,
    NotVietQrError,
    VietQrError,
)
from vietqr_core.parsing.decoder import decode_image
from vietqr_core.parsing.parser import parse_payload
from vietqr_core.rendering.card import render_card_png
from vietqr_core.rendering.print_card import PrintDetails, render_print_png
from vietqr_core.rendering.qr_only import render_qr_png

REQUESTS = {
    "static": VietQrRequest("970422", "0123456789"),
    "dynamic": VietQrRequest("970422", "0123456789", amount=50000, description="hello"),
}
DETAILS = PrintDetails(
    amount=50000,
    description="hello",
    account_name="Nguyen Van A",
    account_no="0123456789",
)
RENDERERS = {
    "qr": lambda payload: render_qr_png(payload, size=400),
    "card": lambda payload: render_card_png(payload),
    "print": lambda payload: render_print_png(payload, DETAILS),
}


def with_crc(body: str) -> str:
    body += "6304"
    return body + generate_crc_code(body)


def qr_png(text: str, *, scale: int = 8) -> bytes:
    buffer = io.BytesIO()
    segno.make(text, error="m").save(buffer, kind="png", scale=scale, border=4)
    return buffer.getvalue()


def encode(image: Image.Image, fmt: str) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


def open_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))


@pytest.mark.parametrize("renderer", RENDERERS)
@pytest.mark.parametrize("request_name", REQUESTS)
def test_decodes_what_the_renderers_produce(renderer, request_name):
    payload = build_payload(REQUESTS[request_name])
    info = decode_image(RENDERERS[renderer](payload))
    assert info == parse_payload(payload)


@pytest.mark.parametrize("fmt", ["PNG", "JPEG", "WEBP", "BMP", "GIF"])
def test_decodes_every_allowed_format(fmt):
    payload = build_payload(REQUESTS["dynamic"])
    image = open_image(render_qr_png(payload, size=400)).convert("RGB")
    assert decode_image(encode(image, fmt)) == parse_payload(payload)


@pytest.mark.parametrize("angle", [90, 180, 270])
def test_decodes_a_rotated_image(angle):
    payload = build_payload(REQUESTS["dynamic"])
    image = open_image(render_qr_png(payload, size=400)).rotate(angle, expand=True)
    assert decode_image(encode(image, "PNG")) == parse_payload(payload)


def test_decodes_a_qr_on_a_transparent_background():
    payload = build_payload(REQUESTS["dynamic"])
    gray = open_image(qr_png(payload)).convert("L")
    # Black modules stay opaque; the white background becomes fully transparent (and black).
    rgba = Image.new("RGBA", gray.size, (0, 0, 0, 0))
    rgba.putalpha(gray.point(lambda value: 255 - value))
    assert decode_image(encode(rgba, "PNG")) == parse_payload(payload)


def test_uses_the_given_catalog():
    bank = BankInfo(bin="970422", code="XYZ", short_name="Xyz", name="Xyz Bank", logo="")
    payload = build_payload(REQUESTS["static"])
    info = decode_image(render_qr_png(payload), catalog=InMemoryBankCatalog([bank]))
    assert info.bank_info == bank


@pytest.mark.parametrize(
    "data",
    [
        b"",
        b"definitely not an image",
        open_image(qr_png("hello")).convert("RGB").tobytes(),
    ],
    ids=["empty", "junk", "raw-pixels"],
)
def test_rejects_data_that_is_not_an_image(data):
    with pytest.raises(ImageDecodeError):
        decode_image(data)


def test_rejects_a_format_that_is_not_allowed():
    with pytest.raises(ImageDecodeError, match="supported image"):
        decode_image(encode(open_image(qr_png("hello")), "TIFF"))


@pytest.mark.parametrize("fmt", ["PNG", "JPEG"])
def test_rejects_a_truncated_image(fmt):
    data = encode(open_image(qr_png(build_payload(REQUESTS["dynamic"]))).convert("RGB"), fmt)
    with pytest.raises(ImageDecodeError):
        decode_image(data[: len(data) // 2])


def test_rejects_a_png_with_damaged_pixel_data():
    data = bytearray(qr_png(build_payload(REQUESTS["dynamic"])))
    middle = len(data) // 2
    data[middle : middle + 20] = b"\x00" * 20
    with pytest.raises(ImageDecodeError):
        decode_image(bytes(data))


def test_rejects_an_image_without_a_qr_code():
    with pytest.raises(ImageDecodeError, match="No QR code"):
        decode_image(encode(Image.new("L", (200, 200), 255), "PNG"))


def test_rejects_an_image_over_the_pixel_limit_without_decoding_it():
    # 20000 x 20000 one-bit pixels compress to a few kilobytes but would need 400 million pixels.
    bomb = encode(Image.new("1", (20000, 20000)), "PNG")
    assert len(bomb) < 100_000
    with pytest.raises(ImageDecodeError, match="pixel limit"):
        decode_image(bomb)


def test_pixel_limit_is_configurable():
    data = render_qr_png(build_payload(REQUESTS["static"]), size=400)
    with pytest.raises(ImageDecodeError, match="pixel limit"):
        decode_image(data, max_pixels=1000)
    decode_image(data, max_pixels=400 * 400 * 2)


def test_pillows_own_bomb_guard_is_also_reported_as_an_image_error():
    bomb = encode(Image.new("1", (20000, 20000)), "PNG")
    previous = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = 1000
    try:
        with pytest.raises(ImageDecodeError):
            decode_image(bomb, max_pixels=10**9)
    finally:
        Image.MAX_IMAGE_PIXELS = previous


def test_a_qr_that_is_not_emvco_is_a_payload_error_not_an_image_error():
    with pytest.raises(InvalidCrcError):
        decode_image(qr_png("hello world"))


def test_a_valid_emvco_qr_that_is_not_vietqr_is_reported_as_such():
    body = "000201" + "010211" + "5303704" + "5802VN"
    with pytest.raises(NotVietQrError):
        decode_image(qr_png(with_crc(body)))


def test_image_error_is_catchable_through_the_base_class():
    assert ImageDecodeError.code == "qr.image_decode_failed"
    with pytest.raises(VietQrError):
        decode_image(b"")
