"""Enumerations for the VietQR payload builder."""

from enum import StrEnum


class QrType(StrEnum):
    STATIC = "11"
    DYNAMIC = "12"


class ServiceType(StrEnum):
    ACCOUNT = "QRIBFTTA"
    CARD = "QRIBFTTC"
