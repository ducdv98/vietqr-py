"""Exceptions raised by vietqr-core."""

from typing import ClassVar


class VietQrError(ValueError):
    """Raised when input cannot be turned into a valid VietQR payload."""

    code: ClassVar[str] = "qr.error"


class InvalidPayloadError(VietQrError):
    """The text is blank, too long, or not well-formed EMVCo TLV."""

    code: ClassVar[str] = "qr.invalid_payload"


class InvalidCrcError(VietQrError):
    """The CRC in tag 63 does not match the payload content."""

    code: ClassVar[str] = "qr.invalid_crc"


class NotVietQrError(VietQrError):
    """Valid EMVCo data, but not a VietQR payment code."""

    code: ClassVar[str] = "qr.not_vietqr"


class ImageDecodeError(VietQrError):
    """The image cannot be read, is too large, or contains no QR code."""

    code: ClassVar[str] = "qr.image_decode_failed"
