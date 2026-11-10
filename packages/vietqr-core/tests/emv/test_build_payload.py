import pytest

from vietqr_core.emv.crc import verify_crc
from vietqr_core.emv.enums import QrType, ServiceType
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.emv.tlv import decode_tlv
from vietqr_core.errors import VietQrError

STATIC_CARD = (
    "00020101021138600010A00000072701300006970403011697040311012345670208QRIBFTTC"
    "53037045802VN63044F52"
)
DYNAMIC_ACCOUNT = (
    "00020101021238570010A00000072701270006970403011300110123456780208QRIBFTTA"
    "530370454061800005802VN62340107NPS68690819thanh toan don hang63042E2E"
)
STATIC_ACCOUNT_FIXED = (
    "00020101021138570010A00000072701270006970403011300110123456780208QRIBFTTA53037045802VN63049E6F"
)


def test_static_card_matches_spec():
    request = VietQrRequest("970403", "9704031101234567", service_type=ServiceType.CARD)
    assert build_payload(request) == STATIC_CARD


def test_dynamic_account_matches_spec():
    request = VietQrRequest(
        "970403",
        "0011012345678",
        amount=180000,
        description="thanh toan don hang",
        bill_number="NPS6869",
    )
    assert build_payload(request) == DYNAMIC_ACCOUNT


def test_static_account_with_corrected_length():
    assert build_payload(VietQrRequest("970403", "0011012345678")) == STATIC_ACCOUNT_FIXED


def test_output_is_valid_and_decodable():
    payload = build_payload(VietQrRequest("970403", "0011012345678", amount=50000))
    assert verify_crc(payload)
    fields = decode_tlv(payload)
    assert fields["00"] == "01"
    assert fields["01"] == "12"
    assert fields["53"] == "704"
    assert fields["54"] == "50000"
    assert fields["58"] == "VN"
    assert list(fields)[-1] == "63"


def test_effective_type_is_derived_from_amount():
    assert VietQrRequest("970403", "1").effective_qr_type is QrType.STATIC
    assert VietQrRequest("970403", "1", amount=5).effective_qr_type is QrType.DYNAMIC


def test_explicit_type_wins():
    request = VietQrRequest("970403", "1", amount=5, qr_type=QrType.STATIC)
    assert request.effective_qr_type is QrType.STATIC


def test_static_qr_may_carry_amount():
    payload = build_payload(VietQrRequest("970403", "1", amount=5, qr_type=QrType.STATIC))
    fields = decode_tlv(payload)
    assert fields["01"] == "11"
    assert fields["54"] == "5"


@pytest.mark.parametrize("amount", [None, 0, -1])
def test_dynamic_requires_positive_amount(amount):
    with pytest.raises(VietQrError):
        build_payload(VietQrRequest("970403", "1", amount=amount, qr_type=QrType.DYNAMIC))


def test_invalid_amount_is_rejected():
    with pytest.raises(VietQrError):
        build_payload(VietQrRequest("970403", "1", amount=0))


def test_request_is_immutable():
    request = VietQrRequest("970403", "1")
    with pytest.raises(AttributeError):
        request.amount = 5
