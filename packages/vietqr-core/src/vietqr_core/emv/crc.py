"""CRC16 checksum for VietQR / EMVCo payloads (ID "63")."""

import re

CRC_POLYNOMIAL = 0x1021
CRC_INITIAL_VALUE = 0xFFFF
CRC_MARKER = "6304"

_HEX4 = re.compile(r"[0-9A-Fa-f]{4}")


def calculate_crc(data: str) -> int:
    crc = CRC_INITIAL_VALUE
    for byte in data.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ CRC_POLYNOMIAL
            else:
                crc <<= 1
            crc &= 0xFFFF
    return crc


def generate_crc_code(content: str) -> str:
    return f"{calculate_crc(content):04X}"


def verify_crc(payload: str) -> bool:
    if len(payload) < 8:
        return False
    if payload[-8:-4] != CRC_MARKER:
        return False
    declared = payload[-4:]
    if not _HEX4.fullmatch(declared):
        return False
    return calculate_crc(payload[:-4]) == int(declared, 16)
