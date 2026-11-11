"""Request and response models. JSON uses camelCase, Python uses snake_case."""

from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from vietqr_core.banks.models import BankInfo
from vietqr_core.parsing.models import VietQrInfo


class ApiResponse[T](BaseModel):
    """Response envelope: ``code`` "00" means success."""

    code: str = "00"
    desc: str = "success"
    data: T | None = None


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class GenerateRequest(_CamelModel):
    """Body of POST /generate and /image.

    Every field is optional at the schema level so that a missing required field is reported
    by our own validation (code 01) instead of FastAPI's generic 422.
    """

    bank_bin: str | None = None
    account_no: str | None = None
    amount: str | None = None
    description: str | None = None
    account_name: str | None = None
    template: str | None = "compact"
    service_type: str | None = None
    bill_number: str | None = None
    format: str | None = "png"
    size: int | None = 500


class ParseRequest(_CamelModel):
    qr_code: str | None = None


class DecodeRequest(_CamelModel):
    """JSON body of POST /decode: a Base64 string or a Data URL."""

    image_base64: str | None = None


class GenerateResult(_CamelModel):
    qr_code: str
    qr_data_url: str = Field(alias="qrDataURL")


class BankModel(_CamelModel):
    bin: str
    code: str
    short_name: str
    name: str
    logo: str

    @classmethod
    def from_bank(cls, bank: BankInfo) -> Self:
        return cls(
            bin=bank.bin,
            code=bank.code,
            short_name=bank.short_name,
            name=bank.name,
            logo=bank.logo,
        )


class VietQrInfoModel(_CamelModel):
    """Wire format of a parsed payload.

    ``amount`` is a ``Decimal``, which pydantic writes to JSON as a string ("50000" or
    "1500.50"). That keeps the exact value from tag 54, including any decimal part.
    """

    bank_bin: str
    account_no: str
    service_type: str
    qr_type: str
    is_dynamic: bool
    is_valid_crc: bool
    raw_payload: str
    raw_tags: dict[str, str]
    bank_info: BankModel | None = None
    amount: Decimal | None = None
    currency: str | None = None
    country_code: str | None = None
    description: str | None = None
    bill_number: str | None = None
    reference_label: str | None = None
    merchant_name: str | None = None
    merchant_city: str | None = None
    crc: str | None = None

    @classmethod
    def from_info(cls, info: VietQrInfo) -> Self:
        return cls(
            bank_bin=info.bank_bin,
            account_no=info.account_no,
            service_type=info.service_type.value,
            qr_type=info.qr_type.value,
            is_dynamic=info.is_dynamic,
            is_valid_crc=info.is_valid_crc,
            raw_payload=info.raw_payload,
            raw_tags=dict(info.raw_tags),
            bank_info=None if info.bank_info is None else BankModel.from_bank(info.bank_info),
            amount=info.amount,
            currency=info.currency,
            country_code=info.country_code,
            description=info.description,
            bill_number=info.bill_number,
            reference_label=info.reference_label,
            merchant_name=info.merchant_name,
            merchant_city=info.merchant_city,
            crc=info.crc,
        )
