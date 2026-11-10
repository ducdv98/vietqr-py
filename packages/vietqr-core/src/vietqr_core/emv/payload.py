"""Building blocks of a VietQR payload (NAPAS247 / EMVCo)."""

from vietqr_core._internal.diacritics import normalize
from vietqr_core.emv.crc import generate_crc_code
from vietqr_core.emv.enums import QrType, ServiceType
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.emv.tlv import encode_tlv
from vietqr_core.errors import VietQrError

NAPAS_AID = "A000000727"
BIN_LENGTH = 6
MAX_CONSUMER_ID_LENGTH = 25
MAX_AMOUNT = 9_999_999_999_999
MAX_ADDITIONAL_FIELD_LENGTH = 25
MAX_MERCHANT_NAME_LENGTH = 25
MAX_MERCHANT_CITY_LENGTH = 15
DEFAULT_MERCHANT_CITY = "HANOI"

PAYLOAD_FORMAT_INDICATOR = "000201"
CURRENCY_VND = "5303704"
COUNTRY_VN = "5802VN"
CRC_PLACEHOLDER = "6304"


def _is_ascii_digits(text: str) -> bool:
    return text.isascii() and text.isdigit()


def _clean_text(value: str | None, max_length: int) -> str:
    if value is None:
        return ""
    return normalize(value.strip())[:max_length]


def build_beneficiary(bin_code: str, consumer_id: str, service_type: ServiceType) -> str:
    bin_code = bin_code.strip()
    consumer_id = consumer_id.strip()

    if len(bin_code) != BIN_LENGTH or not _is_ascii_digits(bin_code):
        raise VietQrError(f"Bank BIN must be exactly {BIN_LENGTH} digits, got {bin_code!r}")
    if not consumer_id or len(consumer_id) > MAX_CONSUMER_ID_LENGTH:
        raise VietQrError(
            f"Account/card number must be 1-{MAX_CONSUMER_ID_LENGTH} characters, "
            f"got {len(consumer_id)}"
        )

    account_info = encode_tlv("00", bin_code) + encode_tlv("01", consumer_id)
    return encode_tlv(
        "38",
        encode_tlv("00", NAPAS_AID)
        + encode_tlv("01", account_info)
        + encode_tlv("02", service_type),
    )


def build_amount(amount: int | None) -> str:
    if amount is None:
        return ""
    if not 1 <= amount <= MAX_AMOUNT:
        raise VietQrError(f"Amount must be between 1 and {MAX_AMOUNT}, got {amount}")
    return encode_tlv("54", str(amount))


def build_additional_data(
    purpose: str | None = None,
    bill_number: str | None = None,
    reference_label: str | None = None,
) -> str:
    inner = (
        encode_tlv("01", _clean_text(bill_number, MAX_ADDITIONAL_FIELD_LENGTH))
        + encode_tlv("05", _clean_text(reference_label, MAX_ADDITIONAL_FIELD_LENGTH))
        + encode_tlv("08", _clean_text(purpose, MAX_ADDITIONAL_FIELD_LENGTH))
    )
    return encode_tlv("62", inner)


def build_merchant_info(name: str | None, city: str | None = DEFAULT_MERCHANT_CITY) -> str:
    return encode_tlv("59", _clean_text(name, MAX_MERCHANT_NAME_LENGTH).upper()) + encode_tlv(
        "60", _clean_text(city, MAX_MERCHANT_CITY_LENGTH).upper()
    )


def build_payload(request: VietQrRequest) -> str:
    qr_type = request.effective_qr_type
    if qr_type is QrType.DYNAMIC and (request.amount is None or request.amount <= 0):
        raise VietQrError("A dynamic QR code requires an amount greater than 0")

    content = (
        PAYLOAD_FORMAT_INDICATOR
        + encode_tlv("01", qr_type)
        + build_beneficiary(request.bin_code, request.account_no, request.service_type)
        + CURRENCY_VND
        + build_amount(request.amount)
        + COUNTRY_VN
        + build_additional_data(
            purpose=request.description,
            bill_number=request.bill_number,
        )
        + CRC_PLACEHOLDER
    )
    return content + generate_crc_code(content)