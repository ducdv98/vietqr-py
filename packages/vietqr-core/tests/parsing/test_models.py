from decimal import Decimal

import pytest

from vietqr_core.emv.enums import QrType, ServiceType
from vietqr_core.parsing.models import VietQrInfo


def make_info(**overrides):
    fields = {
        "bank_bin": "970403",
        "account_no": "123",
        "service_type": ServiceType.ACCOUNT,
        "qr_type": QrType.STATIC,
        "is_valid_crc": True,
        "raw_payload": "x",
        "raw_tags": {},
    }
    return VietQrInfo(**{**fields, **overrides})


def test_optional_fields_default_to_none():
    info = make_info()
    assert info.amount is None
    assert info.description is None
    assert info.crc is None


def test_is_dynamic():
    assert not make_info().is_dynamic
    assert make_info(qr_type=QrType.DYNAMIC, amount=Decimal(5)).is_dynamic


def test_is_immutable():
    with pytest.raises(AttributeError):
        make_info().bank_bin = "1"
