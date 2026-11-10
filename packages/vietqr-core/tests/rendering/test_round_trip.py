import io
from decimal import Decimal

import pytest
import zxingcpp
from PIL import Image, ImageDraw

from vietqr_core.banks.models import BankInfo
from vietqr_core.emv.enums import QrType, ServiceType
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.parsing.parser import parse_payload
from vietqr_core.rendering.card import PRINT, render_card_png
from vietqr_core.rendering.print_card import PrintDetails, render_print_png
from vietqr_core.rendering.qr_only import render_qr_png

BANK = BankInfo(bin="970422", code="MB", short_name="MB", name="MB Bank", logo="")
DETAILS = PrintDetails(
    amount=1234567,
    description="Thanh toan don hang",
    account_name="Nguyễn Văn Á",
    account_no="0123456789",
)

REQUESTS = {
    "static": VietQrRequest("970422", "0123456789"),
    "dynamic": VietQrRequest("970422", "0123456789", amount=50000, description="hello"),
    "long": VietQrRequest(
        "970436",
        "1234567890123",
        amount=1234567,
        description="Thanh toan don hang 123",  # 23 characters, the VietQR maximum
        bill_number="HD0123456789",
    ),
    "card": VietQrRequest(
        "970422", "9704220123456789", amount=250000, service_type=ServiceType.CARD
    ),
}


class FakeAssets:
    def __init__(self, files):
        self.files = files

    def load(self, name):
        return self.files.get(name)


def png(width, height, color, *, margin=0):
    image = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    image.paste(
        Image.new("RGBA", (width - 2 * margin, height - 2 * margin), (*color, 255)),
        (margin, margin),
    )
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


ASSETS = FakeAssets(
    {
        "vietqr.png": png(200, 100, (200, 0, 0), margin=10),
        "vietqr_icon.png": png(100, 100, (0, 160, 0)),
        "napas247.png": png(120, 50, (0, 59, 112)),
        "logos/970422.png": png(100, 40, (0, 82, 155)),
    }
)

RENDERERS = {
    "qr-200": lambda payload: render_qr_png(payload, size=200),
    "qr-500": lambda payload: render_qr_png(payload, size=500),
    "compact": lambda payload: render_card_png(payload),
    "compact-assets": lambda payload: render_card_png(payload, bank=BANK, assets=ASSETS),
    "print": lambda payload: render_print_png(payload, DETAILS),
    "print-assets": lambda payload: render_print_png(payload, DETAILS, bank=BANK, assets=ASSETS),
}
CARDS = ["compact-assets", "print-assets"]


def decode(image: bytes | Image.Image) -> list[str]:
    if isinstance(image, bytes):
        image = Image.open(io.BytesIO(image))
    return [r.text for r in zxingcpp.read_barcodes(image, formats=zxingcpp.BarcodeFormat.QRCode)]


@pytest.mark.parametrize("request_name", REQUESTS)
@pytest.mark.parametrize("renderer", RENDERERS)
def test_every_renderer_produces_a_scannable_code(renderer, request_name):
    payload = build_payload(REQUESTS[request_name])
    assert decode(RENDERERS[renderer](payload)) == [payload]


@pytest.mark.parametrize("request_name", REQUESTS)
@pytest.mark.parametrize("renderer", CARDS)
def test_scanned_card_parses_back_into_the_original_request(renderer, request_name):
    request = REQUESTS[request_name]
    scanned = decode(RENDERERS[renderer](build_payload(request)))
    assert len(scanned) == 1

    info = parse_payload(scanned[0])
    assert info.is_valid_crc
    assert info.bank_bin == request.bin_code
    assert info.account_no == request.account_no
    assert info.service_type is request.service_type
    assert info.qr_type is (QrType.DYNAMIC if request.amount else QrType.STATIC)
    assert info.amount == (Decimal(request.amount) if request.amount else None)
    assert info.description == request.description
    assert info.bill_number == request.bill_number


def test_the_decoder_finds_nothing_in_a_blank_image():
    assert decode(Image.new("RGB", (540, 540), "white")) == []


def test_the_decoder_fails_when_the_code_is_destroyed():
    payload = build_payload(REQUESTS["dynamic"])
    image = Image.open(io.BytesIO(RENDERERS["print"](payload))).convert("RGB")
    left, top = PRINT.frame_left + 9, PRINT.frame_top + 9
    ImageDraw.Draw(image).rectangle((left, top, left + 355, top + 355), fill="black")
    assert decode(image) != [payload]
