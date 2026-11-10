import pytest

from vietqr_core.emv.enums import ServiceType
from vietqr_core.emv.payload import (
    build_additional_data,
    build_amount,
    build_beneficiary,
    build_merchant_info,
)
from vietqr_core.errors import VietQrError


def test_beneficiary_card_matches_spec():
    assert build_beneficiary("970403", "9704031101234567", ServiceType.CARD) == (
        "38600010A00000072701300006970403011697040311012345670208QRIBFTTC"
    )


def test_beneficiary_account_matches_spec():
    assert build_beneficiary("970403", "0011012345678", ServiceType.ACCOUNT) == (
        "38570010A00000072701270006970403011300110123456780208QRIBFTTA"
    )


def test_beneficiary_trims_input():
    assert build_beneficiary(" 970403 ", " 0011012345678 ", ServiceType.ACCOUNT) == (
        build_beneficiary("970403", "0011012345678", ServiceType.ACCOUNT)
    )


@pytest.mark.parametrize("bin_code", ["", "97040", "9704031", "97040A", "٩٧٠٤٠٣", "²²²²²²"])
def test_beneficiary_rejects_bad_bin(bin_code):
    with pytest.raises(VietQrError):
        build_beneficiary(bin_code, "123", ServiceType.ACCOUNT)


@pytest.mark.parametrize("consumer_id", ["", "   ", "1" * 26])
def test_beneficiary_rejects_bad_consumer_id(consumer_id):
    with pytest.raises(VietQrError):
        build_beneficiary("970403", consumer_id, ServiceType.ACCOUNT)


def test_beneficiary_accepts_25_chars():
    assert build_beneficiary("970403", "1" * 25, ServiceType.ACCOUNT)


def test_amount():
    assert build_amount(None) == ""
    assert build_amount(180000) == "5406180000"
    assert build_amount(1) == "54011"
    assert build_amount(9_999_999_999_999) == "54139999999999999"


@pytest.mark.parametrize("amount", [0, -5, 10_000_000_000_000])
def test_amount_rejects_out_of_range(amount):
    with pytest.raises(VietQrError):
        build_amount(amount)


def test_additional_data_matches_spec():
    assert build_additional_data("thanh toan don hang", "NPS6869") == (
        "62340107NPS68690819thanh toan don hang"
    )


def test_additional_data_all_empty():
    assert build_additional_data() == ""
    assert build_additional_data("  ", "", None) == ""


def test_additional_data_order_and_cleaning():
    assert build_additional_data("Thanh toán", "B1", "R-9") == "62270102B10503R-90810Thanh toan"


def test_additional_data_truncates_to_25():
    assert build_additional_data("x" * 40) == "6229" + "0825" + "x" * 25


def test_merchant_info():
    assert build_merchant_info("Nguyễn Văn A") == "5912NGUYEN VAN A6005HANOI"
    assert build_merchant_info("Shop", None) == "5904SHOP"
    assert build_merchant_info(None, "Hà Nội") == "6006HA NOI"
    assert build_merchant_info(None, None) == ""
    assert build_merchant_info("a" * 30, "b" * 20) == "5925" + "A" * 25 + "6015" + "B" * 15
