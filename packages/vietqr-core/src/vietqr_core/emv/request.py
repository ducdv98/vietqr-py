"""Input model for the VietQR payload builder."""

from dataclasses import dataclass

from vietqr_core.emv.enums import QrType, ServiceType


@dataclass(frozen=True, slots=True)
class VietQrRequest:
    bin_code: str
    account_no: str
    amount: int | None = None
    description: str | None = None
    service_type: ServiceType = ServiceType.ACCOUNT
    bill_number: str | None = None
    qr_type: QrType | None = None
    
    @property
    def effective_qr_type(self) -> QrType:
        if self.qr_type is not None:
            return self.qr_type
        if self.amount is not None and self.amount > 0:
            return QrType.DYNAMIC
        return QrType.STATIC