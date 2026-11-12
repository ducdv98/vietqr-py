from typing import Any

import pytest

from vietqr_api.errors import ApiError, ErrorCode
from vietqr_api.models import GenerateRequest
from vietqr_api.service import prepare
from vietqr_core.banks.catalog import default_catalog
from vietqr_core.emv.enums import QrType, ServiceType
from vietqr_core.parsing.parser import parse_payload

CATALOG = default_catalog()


def make(**overrides: Any) -> GenerateRequest:
    fields: dict[str, Any] = {
        "bank_bin": "970422",
        "account_no": "0838539629",
        "amount": "50000",
        "description": "Thanh toan don hang",
    }
    fields.update(overrides)
    return GenerateRequest(**fields)


def error_of(request: GenerateRequest) -> ApiError:
    with pytest.raises(ApiError) as caught:
        prepare(request, CATALOG)
    return caught.value


def test_success_round_trips_through_the_parser() -> None:
    prepared = prepare(make(bill_number="HD1"), CATALOG)
    info = parse_payload(prepared.payload)
    assert info.bank_bin == "970422"
    assert info.account_no == "0838539629"
    assert info.amount == 50000
    assert info.service_type is ServiceType.ACCOUNT
    assert info.bill_number == "HD1"
    assert prepared.bank.bin == "970422"
    assert prepared.template == "compact"
    assert prepared.size == 500
    assert prepared.details.amount == 50000
    assert prepared.details.account_no == "0838539629"
    assert prepared.details.is_card is False


def test_missing_fields_are_all_reported_in_one_message() -> None:
    error = error_of(GenerateRequest(account_no="  "))
    assert error.code is ErrorCode.MISSING_PARAMETER
    assert error.status_code == 400
    assert error.desc.startswith("Missing required parameters: bankBin, accountNo.")


@pytest.mark.parametrize("amount", [None, "", "   "])
def test_missing_amount_makes_a_static_qr(amount: str | None) -> None:
    prepared = prepare(make(amount=amount, description=None), CATALOG)
    info = parse_payload(prepared.payload)
    assert info.qr_type is QrType.STATIC
    assert info.amount is None
    assert info.description is None
    assert prepared.details.amount is None
    assert prepared.details.description == ""


def test_static_qr_keeps_an_optional_description() -> None:
    prepared = prepare(make(amount=None, description="Ung ho"), CATALOG)
    info = parse_payload(prepared.payload)
    assert info.qr_type is QrType.STATIC
    assert info.description == "Ung ho"


def test_amount_makes_a_dynamic_qr_even_without_description() -> None:
    info = parse_payload(prepare(make(description=None), CATALOG).payload)
    assert info.qr_type is QrType.DYNAMIC
    assert info.amount == 50000


def test_template_is_trimmed_and_case_insensitive() -> None:
    assert prepare(make(template=" PRINT "), CATALOG).template == "print"
    assert prepare(make(template=" "), CATALOG).template == "compact"
    assert prepare(make(template=None), CATALOG).template == "compact"


def test_unknown_template_is_rejected() -> None:
    error = error_of(make(template="poster"))
    assert error.code is ErrorCode.UNSUPPORTED_OPTION
    assert "poster" in error.desc


@pytest.mark.parametrize("image_format", ["webp", "svg", "gif"])
def test_only_png_is_supported(image_format: str) -> None:
    assert error_of(make(format=image_format)).code is ErrorCode.UNSUPPORTED_OPTION


def test_png_is_accepted_in_any_case_and_blank_means_png() -> None:
    prepare(make(format=" PNG "), CATALOG)
    prepare(make(format=""), CATALOG)
    prepare(make(format=None), CATALOG)


@pytest.mark.parametrize("amount", ["0", "000", "-5", "12.5", "1e3", "abc", "٣٤", "12345678901234"])
def test_bad_amounts(amount: str) -> None:
    assert error_of(make(amount=amount)).code is ErrorCode.INVALID_AMOUNT


def test_amount_boundaries_and_leading_zeros() -> None:
    assert prepare(make(amount="9999999999999"), CATALOG).details.amount == 9_999_999_999_999
    assert prepare(make(amount=" 0050 "), CATALOG).details.amount == 50


@pytest.mark.parametrize("bin_code", ["97042", "9704222", "97042a", "٩٧٠٤٢٢"])
def test_bad_bin(bin_code: str) -> None:
    assert error_of(make(bank_bin=bin_code)).code is ErrorCode.INVALID_PARAMETER


def test_account_no_length_boundary() -> None:
    prepare(make(account_no="1" * 25), CATALOG)
    error = error_of(make(account_no="1" * 26))
    assert error.code is ErrorCode.INVALID_PARAMETER
    assert "26" in error.desc


def test_description_length_boundary() -> None:
    prepare(make(description="a" * 95), CATALOG)
    error = error_of(make(description="a" * 96))
    assert error.code is ErrorCode.INVALID_PARAMETER
    assert "96" in error.desc


def test_unknown_bank_is_rejected() -> None:
    error = error_of(make(bank_bin="999999"))
    assert error.code is ErrorCode.BANK_NOT_FOUND
    assert "999999" in error.desc


@pytest.mark.parametrize("size", [100, 500, 2000])
def test_size_in_range(size: int) -> None:
    assert prepare(make(size=size), CATALOG).size == size


@pytest.mark.parametrize("size", [99, 2001, 0, -1])
def test_size_out_of_range(size: int) -> None:
    assert error_of(make(size=size)).code is ErrorCode.INVALID_PARAMETER


def test_size_none_uses_the_default() -> None:
    assert prepare(make(size=None), CATALOG).size == 500


@pytest.mark.parametrize("service_type", ["card", "CARD", " QRIBFTTC ", "1"])
def test_card_service_aliases(service_type: str) -> None:
    prepared = prepare(make(service_type=service_type), CATALOG)
    assert parse_payload(prepared.payload).service_type is ServiceType.CARD
    assert prepared.details.is_card is True


@pytest.mark.parametrize("service_type", [None, "", "account", "QRIBFTTA", "whatever"])
def test_everything_else_is_account(service_type: str | None) -> None:
    prepared = prepare(make(service_type=service_type), CATALOG)
    assert parse_payload(prepared.payload).service_type is ServiceType.ACCOUNT
    assert prepared.details.is_card is False


def test_checks_run_in_the_documented_order() -> None:
    assert error_of(make(template="x", amount="0")).code is ErrorCode.UNSUPPORTED_OPTION
    assert error_of(make(amount="0", bank_bin="1")).code is ErrorCode.INVALID_AMOUNT
    assert error_of(make(bank_bin="1", account_no="1" * 99)).code is ErrorCode.INVALID_PARAMETER
    assert error_of(make(bank_bin="999999", size=1)).code is ErrorCode.BANK_NOT_FOUND


def test_print_details_are_trimmed() -> None:
    details = prepare(make(account_name="  NGUYEN VAN A  ", description=" hi "), CATALOG).details
    assert details.account_name == "NGUYEN VAN A"
    assert details.description == "hi"
    assert prepare(make(account_name="   "), CATALOG).details.account_name is None
