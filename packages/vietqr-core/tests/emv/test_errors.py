import pytest

from vietqr_core.errors import VietQrError


def test_is_a_value_error():
    assert issubclass(VietQrError, ValueError)


def test_can_be_caught_as_value_error():
    with pytest.raises(ValueError, match="boom"):
        raise VietQrError("boom")
