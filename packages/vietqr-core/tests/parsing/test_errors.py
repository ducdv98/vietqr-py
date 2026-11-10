import pytest

from vietqr_core.errors import (
    InvalidCrcError,
    InvalidPayloadError,
    NotVietQrError,
    VietQrError,
)


@pytest.mark.parametrize(
    ("error", "code"),
    [
        (InvalidPayloadError, "qr.invalid_payload"),
        (InvalidCrcError, "qr.invalid_crc"),
        (NotVietQrError, "qr.not_vietqr"),
    ],
)
def test_parse_errors_have_codes_and_share_a_base(error, code):
    assert issubclass(error, VietQrError)
    assert error.code == code


def test_base_error_has_generic_code():
    assert VietQrError.code == "qr.error"


def test_can_catch_specific_error_through_base():
    with pytest.raises(VietQrError, match="bad crc"):
        raise InvalidCrcError("bad crc")


def test_code_is_readable_from_an_instance():
    assert InvalidCrcError("x").code == "qr.invalid_crc"
