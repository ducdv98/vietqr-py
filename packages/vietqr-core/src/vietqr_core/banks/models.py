"""Data model for a bank in the NAPAS / VietQR catalog."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BankInfo:
    bin: str
    code: str
    short_name: str
    name: str
    logo: str
