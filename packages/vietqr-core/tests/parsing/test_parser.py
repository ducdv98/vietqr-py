from decimal import Decimal

import pytest

from vietqr_core.emv.crc import generate_crc_code
from vietqr_core.emv.enums import QrType, ServiceType
from vietqr_core.emv.payload import build_beneficiary, build_merchant_info, build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.errors import (
    InvalidCrcError,
    InvalidPayloadError,
    NotVietQrError,
    VietQrError,
)
from vietqr_core.parsing.parser import parse_payload

STATIC_ACCOUNT_SPEC = (
    "00020101021138570010A00000072701270006970403011200110123456780208QRIBFTTA53037045802VN6304F4E5"
)
STATIC_CARD = (
    "00020101021138600010A00000072701300006970403011697040311012345670208QRIBFTTC"
    "53037045802VN63044F52"
)
DYNAMIC_ACCOUNT = (
    "00020101021238570010A00000072701270006970403011300110123456780208QRIBFTTA"
    "530370454061800005802VN62340107NPS68690819thanh toan don hang63042E2E"
)
BENEFICIARY = build_beneficiary("970403", "0011012345678", ServiceType.ACCOUNT)


def with_crc(body: str) -> str:
    body += "6304"
    return body + generate_crc_code(body)


def vietqr_body(*, amount_tlv: str = "", extra: str = "", method: str = "010211") -> str:
    return "000201" + method + BENEFICIARY + "5303704" + amount_tlv + "5802VN" + extra


def wrap_38(inner: str) -> str:
    return "000201" + "010211" + f"38{len(inner):02d}" + inner + "5303704" + "5802VN"


def test_parse_static_card_spec_example():
    info = parse_payload(STATIC_CARD)
    assert info.bank_bin == "970403"
    assert info.account_no == "9704031101234567"
    assert info.service_type is ServiceType.CARD
    assert info.qr_type is QrType.STATIC
    assert not info.is_dynamic
    assert info.amount is None
    assert info.currency == "704"
    assert info.country_code == "VN"
    assert info.description is None
    assert info.crc == "4F52"
    assert info.is_valid_crc
    assert info.raw_payload == STATIC_CARD


def test_parse_dynamic_account_spec_example():
    info = parse_payload(DYNAMIC_ACCOUNT)
    assert info.bank_bin == "970403"
    assert info.account_no == "0011012345678"
    assert info.service_type is ServiceType.ACCOUNT
    assert info.is_dynamic
    assert info.amount == Decimal(180000)
    assert info.bill_number == "NPS6869"
    assert info.description == "thanh toan don hang"
    assert info.reference_label is None
    assert info.crc == "2E2E"


def test_raw_tags_are_exposed_and_read_only():
    info = parse_payload(DYNAMIC_ACCOUNT)
    assert info.raw_tags["54"] == "180000"
    assert list(info.raw_tags)[-1] == "63"
    with pytest.raises(TypeError):
        info.raw_tags["54"] = "1"  # type: ignore[index]


@pytest.mark.parametrize("text", ["", "   ", "\n"])
def test_blank_payload(text):
    with pytest.raises(InvalidPayloadError):
        parse_payload(text)


def test_payload_too_long():
    with pytest.raises(InvalidPayloadError):
        parse_payload(STATIC_CARD, max_length=len(STATIC_CARD) - 1)
    assert parse_payload(STATIC_CARD, max_length=len(STATIC_CARD))


def test_bad_crc_is_rejected_when_strict():
    with pytest.raises(InvalidCrcError):
        parse_payload(STATIC_CARD[:-4] + "0000")


def test_bad_crc_is_reported_when_not_strict():
    info = parse_payload(STATIC_CARD[:-4] + "0000", strict_crc=False)
    assert not info.is_valid_crc
    assert info.crc == "0000"


def test_spec_example_with_length_typo_is_malformed():
    with pytest.raises(InvalidPayloadError):
        parse_payload(STATIC_ACCOUNT_SPEC)


def test_garbage_is_invalid_payload():
    with pytest.raises(InvalidPayloadError):
        parse_payload("hello world", strict_crc=False)


def test_missing_tag_38_is_not_vietqr():
    with pytest.raises(NotVietQrError):
        parse_payload(with_crc("000201" + "010211" + "5303704" + "5802VN"))


def test_wrong_aid_is_not_vietqr():
    inner = "0010A000000999" + "0117" + "0006970403" + "0103123"
    with pytest.raises(NotVietQrError):
        parse_payload(with_crc(wrap_38(inner)))


def test_missing_beneficiary_is_not_vietqr():
    with pytest.raises(NotVietQrError):
        parse_payload(with_crc(wrap_38("0010A000000727" + "0208QRIBFTTA")))


def test_missing_bin_is_not_vietqr():
    inner = "0010A000000727" + "0107" + "0103123"
    with pytest.raises(NotVietQrError):
        parse_payload(with_crc(wrap_38(inner)))


def test_broken_nested_template_is_invalid_payload():
    inner = "0010A000000727" + "0150" + "0006970403"
    with pytest.raises(InvalidPayloadError):
        parse_payload(with_crc(wrap_38(inner)))


def test_unknown_service_code_defaults_to_account():
    payload = with_crc(vietqr_body()).replace("QRIBFTTA", "QRIBFTTX")
    assert parse_payload(payload, strict_crc=False).service_type is ServiceType.ACCOUNT


def test_service_code_is_case_insensitive():
    payload = with_crc(vietqr_body()).replace("QRIBFTTA", "qribfttc")
    assert parse_payload(payload, strict_crc=False).service_type is ServiceType.CARD


def test_unknown_initiation_method_defaults_to_static():
    info = parse_payload(with_crc(vietqr_body(method="010299")))
    assert info.qr_type is QrType.STATIC


@pytest.mark.parametrize(
    ("amount_text", "expected"),
    [("500", Decimal(500)), ("1500.50", Decimal("1500.50")), (" 7 ", Decimal(7))],
)
def test_amount_formats(amount_text, expected):
    tlv = f"54{len(amount_text):02d}{amount_text}"
    assert parse_payload(with_crc(vietqr_body(amount_tlv=tlv))).amount == expected


@pytest.mark.parametrize(
    "amount_text", ["abc", "NaN", "Infinity", "1E+9", "-5", "1,000", "５", "1."]
)
def test_invalid_amount_is_rejected(amount_text):
    tlv = f"54{len(amount_text):02d}{amount_text}"
    with pytest.raises(InvalidPayloadError):
        parse_payload(with_crc(vietqr_body(amount_tlv=tlv)))


def test_broken_tag_62_is_ignored():
    info = parse_payload(with_crc(vietqr_body(extra="6205" + "01990")))
    assert info.description is None
    assert info.bill_number is None


def test_merchant_fields_and_reference_label():
    extra = build_merchant_info("Shop A", "HCM") + "6212" + "0508REF12345"
    info = parse_payload(with_crc(vietqr_body(extra=extra)))
    assert info.merchant_name == "SHOP A"
    assert info.merchant_city == "HCM"
    assert info.reference_label == "REF12345"


def test_lowercase_crc_is_accepted():
    payload = STATIC_CARD[:-4] + STATIC_CARD[-4:].lower()
    assert parse_payload(payload).is_valid_crc


@pytest.mark.parametrize("bad", ["", "x" * 10, "00020101021163040000", STATIC_CARD[:-4] + "0000"])
def test_all_parse_failures_are_vietqr_errors(bad):
    with pytest.raises(VietQrError):
        parse_payload(bad)


@pytest.mark.parametrize(
    "request_",
    [
        VietQrRequest("970403", "0011012345678"),
        VietQrRequest("970403", "9704031101234567", service_type=ServiceType.CARD),
        VietQrRequest(
            "970422", "123456789", amount=250000, description="Thanh toán", bill_number="HD01"
        ),
        VietQrRequest("970436", "1" * 25, amount=1, qr_type=QrType.STATIC),
    ],
)
def test_round_trip(request_):
    info = parse_payload(build_payload(request_))
    assert info.bank_bin == request_.bin_code
    assert info.account_no == request_.account_no
    assert info.service_type is request_.service_type
    assert info.qr_type is request_.effective_qr_type
    assert info.amount == (None if request_.amount is None else Decimal(request_.amount))
    assert info.bill_number == request_.bill_number
    assert info.is_valid_crc
