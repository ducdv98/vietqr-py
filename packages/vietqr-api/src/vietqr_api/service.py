"""Validate a generate request and turn it into a payload plus render inputs.

The checks run in the same order as the C# API, so a request with several problems reports
the first one only.
"""

from dataclasses import dataclass
from typing import Literal

from vietqr_api.errors import ApiError, ErrorCode
from vietqr_api.models import GenerateRequest
from vietqr_core.banks.catalog import BankCatalog
from vietqr_core.banks.models import BankInfo
from vietqr_core.emv.enums import ServiceType
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.rendering.print_card import PrintDetails

type Template = Literal["compact", "qr_only", "print"]

DEFAULT_TEMPLATE = "compact"
SUPPORTED_FORMAT = "png"
CARD_SERVICE_ALIASES = frozenset({"card", "qribfttc", "1"})

BIN_LENGTH = 6
MAX_ACCOUNT_NO_LENGTH = 25
MAX_AMOUNT_DIGITS = 13
MAX_DESCRIPTION_LENGTH = 95
MIN_SIZE = 100
MAX_SIZE = 2000
DEFAULT_SIZE = 500


@dataclass(frozen=True, slots=True)
class Prepared:
    payload: str
    template: Template
    size: int
    bank: BankInfo
    details: PrintDetails


def _text(value: str | None) -> str:
    return (value or "").strip()


def _is_ascii_digits(text: str) -> bool:
    return text.isascii() and text.isdigit()


def _check_required(request: GenerateRequest) -> None:
    required = {
        "bankBin": request.bank_bin,
        "accountNo": request.account_no,
    }
    missing = [name for name, value in required.items() if not _text(value)]
    if missing:
        raise ApiError(
            ErrorCode.MISSING_PARAMETER,
            f"Missing required parameters: {', '.join(missing)}. "
            "Required: bankBin, accountNo. Optional: amount (omit it for a static QR), description.",
        )


def _parse_template(value: str | None) -> Template:
    template = _text(value).lower() or DEFAULT_TEMPLATE
    match template:
        case "compact" | "qr_only" | "print":
            return template
        case _:
            raise ApiError(
                ErrorCode.UNSUPPORTED_OPTION,
                f"Template {value!r} is not supported. Use 'compact', 'qr_only' or 'print'.",
            )


def _check_format(value: str | None) -> None:
    image_format = _text(value).lower() or SUPPORTED_FORMAT
    if image_format != SUPPORTED_FORMAT:
        raise ApiError(
            ErrorCode.UNSUPPORTED_OPTION,
            f"Format {value!r} is not supported. Only {SUPPORTED_FORMAT!r} is available.",
        )


def _parse_amount(value: str | None) -> int | None:
    """A blank amount means a static QR; any given amount must be a positive whole number."""
    text = _text(value)
    if not text:
        return None
    if not _is_ascii_digits(text) or len(text) > MAX_AMOUNT_DIGITS or int(text) <= 0:
        raise ApiError(
            ErrorCode.INVALID_AMOUNT,
            f"Invalid amount: digits only, a positive number of at most "
            f"{MAX_AMOUNT_DIGITS} digits.",
        )
    return int(text)


def _parse_bin(value: str | None) -> str:
    bin_code = _text(value)
    if len(bin_code) != BIN_LENGTH or not _is_ascii_digits(bin_code):
        raise ApiError(
            ErrorCode.INVALID_PARAMETER,
            f"Bank BIN {value!r} is invalid. It must be exactly {BIN_LENGTH} digits "
            "(for example 970422).",
        )
    return bin_code


def _parse_account_no(value: str | None) -> str:
    account_no = _text(value)
    if len(account_no) > MAX_ACCOUNT_NO_LENGTH:
        raise ApiError(
            ErrorCode.INVALID_PARAMETER,
            f"Account number is too long: at most {MAX_ACCOUNT_NO_LENGTH} characters "
            f"(got {len(account_no)}).",
        )
    return account_no


def _parse_description(value: str | None) -> str:
    description = _text(value)
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ApiError(
            ErrorCode.INVALID_PARAMETER,
            f"Description is too long: at most {MAX_DESCRIPTION_LENGTH} characters "
            f"(got {len(description)}).",
        )
    return description


def _parse_size(value: int | None) -> int:
    size = DEFAULT_SIZE if value is None else value
    if not MIN_SIZE <= size <= MAX_SIZE:
        raise ApiError(
            ErrorCode.INVALID_PARAMETER,
            f"Size {size} is out of range: use {MIN_SIZE} to {MAX_SIZE} pixels.",
        )
    return size


def _parse_service_type(value: str | None) -> ServiceType:
    if _text(value).lower() in CARD_SERVICE_ALIASES:
        return ServiceType.CARD
    return ServiceType.ACCOUNT


def prepare(request: GenerateRequest, catalog: BankCatalog) -> Prepared:
    _check_required(request)
    template = _parse_template(request.template)
    _check_format(request.format)
    amount = _parse_amount(request.amount)
    bin_code = _parse_bin(request.bank_bin)
    account_no = _parse_account_no(request.account_no)
    description = _parse_description(request.description)

    bank = catalog.find(bin_code)
    if bank is None:
        raise ApiError(ErrorCode.BANK_NOT_FOUND, f"No bank in the catalog for BIN {bin_code}.")

    size = _parse_size(request.size)
    service_type = _parse_service_type(request.service_type)

    payload = build_payload(
        VietQrRequest(
            bin_code=bin_code,
            account_no=account_no,
            amount=amount,
            description=description,
            service_type=service_type,
            bill_number=_text(request.bill_number) or None,
        )
    )
    details = PrintDetails(
        amount=amount,
        description=description,
        account_name=_text(request.account_name) or None,
        account_no=account_no,
        is_card=service_type is ServiceType.CARD,
    )
    return Prepared(payload, template, size, bank, details)
