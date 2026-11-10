"""Bank catalog: look up a bank by BIN, code or short name."""

import json
from collections.abc import Iterable
from functools import cache
from importlib import resources
from typing import Protocol

from vietqr_core.banks.models import BankInfo


class BankCatalog(Protocol):
    def find(self, key: str | None) -> BankInfo | None: ...

    def all_banks(self) -> tuple[BankInfo, ...]: ...


def _normalize_key(value: str) -> str:
    return value.strip().casefold()


class InMemoryBankCatalog:
    def __init__(self, banks: Iterable[BankInfo]) -> None:
        self._banks = tuple(banks)
        self._by_bin: dict[str, BankInfo] = {}
        self._by_name: dict[str, BankInfo] = {}
        for bank in self._banks:
            self._by_bin[_normalize_key(bank.bin)] = bank
            if bank.code:
                self._by_name[_normalize_key(bank.code)] = bank
            if bank.short_name:
                self._by_name[_normalize_key(bank.short_name)] = bank

    def find(self, key: str | None) -> BankInfo | None:
        if key is None or not key.strip():
            return None
        normalized = _normalize_key(key)
        bank = self._by_bin.get(normalized)
        if bank is None:
            bank = self._by_name.get(normalized)
        return bank

    def all_banks(self) -> tuple[BankInfo, ...]:
        return self._banks


def parse_banks_json(text: str) -> list[BankInfo]:
    banks: list[BankInfo] = []
    for item in json.loads(text)["data"]:
        bin_code = item.get("bin")
        if not bin_code:
            continue
        code = item.get("code") or ""
        banks.append(
            BankInfo(
                bin=bin_code,
                code=code,
                short_name=item.get("shortName") or code or bin_code,
                name=item.get("name") or "",
                logo=item.get("logo") or "",
            )
        )
    return banks


@cache
def default_catalog() -> BankCatalog:
    resource = resources.files("vietqr_core.banks") / "data" / "banks.json"
    return InMemoryBankCatalog(parse_banks_json(resource.read_text(encoding="utf-8")))
