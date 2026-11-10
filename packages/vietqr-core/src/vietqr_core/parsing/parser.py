"""Parser for VietQR / EMVCo payloads (NAPAS247)."""

import re
from decimal import Decimal
from types import MappingProxyType

from vietqr_core.banks.catalog import BankCatalog, default_catalog
from vietqr_core.emv.crc import verify_crc
from vietqr_core.emv.enums import QrType, ServiceType
from vietqr_core.emv.payload import NAPAS_AID
from vietqr_core.emv.tlv import decode_tlv
from vietqr_core.errors import InvalidCrcError, InvalidPayloadError, NotVietQrError
from vietqr_core.parsing.models import VietQrInfo

DEFAULT_MAX_PAYLOAD_LENGTH = 1024

_AMOUNT = re.compile(r"[0-9]+(\.[0-9]+)?")


def _decode(text: str, where: str) -> dict[str, str]:
    try:
        return decode_tlv(text)
    except ValueError as exc:
        raise InvalidPayloadError(f"Malformed TLV in {where}: {exc}") from exc


def _optional(tags: dict[str, str], tag: str) -> str | None:
    value = tags.get(tag)
    return None if value is None else value.strip()


def _parse_amount(text: str) -> Decimal:
    text = text.strip()
    if not _AMOUNT.fullmatch(text):
        raise InvalidPayloadError(f"Invalid transaction amount (tag 54): {text!r}")
    return Decimal(text)


def parse_payload(
    text: str,
    *,
    strict_crc: bool = True,
    max_length: int = DEFAULT_MAX_PAYLOAD_LENGTH,
    catalog: BankCatalog | None = None,
) -> VietQrInfo:
    if not text.strip():
        raise InvalidPayloadError("Payload is empty")
    if len(text) > max_length:
        raise InvalidPayloadError(f"Payload is {len(text)} characters, maximum is {max_length}")

    is_valid_crc = verify_crc(text)
    if strict_crc and not is_valid_crc:
        raise InvalidCrcError("CRC (tag 63) does not match the payload content")

    root = _decode(text, "payload")

    if "38" not in root:
        raise NotVietQrError("Tag 38 (merchant account information) is missing")
    account_template = _decode(root["38"], "tag 38")
    if account_template.get("00", "").upper() != NAPAS_AID:
        raise NotVietQrError(f"Tag 38 does not carry the NAPAS identifier {NAPAS_AID}")
    if "01" not in account_template:
        raise NotVietQrError("Tag 38 has no beneficiary organization (sub-tag 01)")

    beneficiary = _decode(account_template["01"], "tag 38 sub-tag 01")
    bank_bin = beneficiary.get("00", "").strip()
    if not bank_bin:
        raise NotVietQrError("Beneficiary organization has no bank BIN")
    account_no = beneficiary.get("01", "").strip()

    if account_template.get("02", "").upper() == ServiceType.CARD:
        service_type = ServiceType.CARD
    else:
        service_type = ServiceType.ACCOUNT

    if root.get("01", "").strip() == QrType.DYNAMIC:
        qr_type = QrType.DYNAMIC
    else:
        qr_type = QrType.STATIC

    amount = _parse_amount(root["54"]) if "54" in root else None

    additional: dict[str, str] = {}
    if "62" in root:
        try:
            additional = decode_tlv(root["62"])
        except ValueError:
            additional = {}

    if catalog is None:
        catalog = default_catalog()

    return VietQrInfo(
        bank_bin=bank_bin,
        bank_info=catalog.get(bank_bin),
        account_no=account_no,
        service_type=service_type,
        qr_type=qr_type,
        is_valid_crc=is_valid_crc,
        raw_payload=text,
        raw_tags=MappingProxyType(root),
        amount=amount,
        currency=_optional(root, "53"),
        country_code=_optional(root, "58"),
        description=_optional(additional, "08"),
        bill_number=_optional(additional, "01"),
        reference_label=_optional(additional, "05"),
        merchant_name=_optional(root, "59"),
        merchant_city=_optional(root, "60"),
        crc=_optional(root, "63"),
    )
