import pytest

from vietqr_core.emv.enums import QrType, ServiceType


def test_qr_type_values_are_wire_codes():
    assert QrType.STATIC == "11"
    assert QrType.DYNAMIC == "12"


def test_service_type_values_are_wire_codes():
    assert ServiceType.ACCOUNT == "QRIBFTTA"
    assert ServiceType.CARD == "QRIBFTTC"


def test_lookup_by_value():
    assert QrType("12") is QrType.DYNAMIC
    assert ServiceType("QRIBFTTC") is ServiceType.CARD


def test_unknown_value_is_rejected():
    with pytest.raises(ValueError):
        QrType("13")


def test_formats_as_plain_string():
    assert f"{QrType.STATIC}" == "11"
