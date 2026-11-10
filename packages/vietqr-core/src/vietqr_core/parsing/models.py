"""Result model of the VietQR payload parser."""

from collections.abc import Mapping
from dataclasses import dataclass
from decimal import Decimal

from vietqr_core.emv.enums import QrType, ServiceType


@dataclass(frozen=True, slots=True)
class VietQrInfo:
    bank_bin: str
    account_no: str
    service_type: ServiceType
    qr_type: QrType
    is_valid_crc: bool
    raw_payload: str
    raw_tags: Mapping[str, str]
    amount: Decimal | None = None
    currency: str | None = None
    country_code: str | None = None
    description: str | None = None
    bill_number: str | None = None
    reference_label: str | None = None
    merchant_name: str | None = None
    merchant_city: str | None = None
    crc: str | None = None

    @property
    def is_dynamic(self) -> bool:
        return self.qr_type is QrType.DYNAMIC
