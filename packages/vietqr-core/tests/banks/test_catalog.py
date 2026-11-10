import json

import pytest

from vietqr_core.banks.catalog import InMemoryBankCatalog, default_catalog, parse_banks_json
from vietqr_core.banks.models import BankInfo

MB = BankInfo("970422", "MB", "MBBank", "Ngan hang Quan doi", "https://x/MB.png")
VCB = BankInfo("970436", "VCB", "Vietcombank", "Ngan hang Ngoai thuong", "https://x/VCB.png")


@pytest.fixture
def small_catalog():
    return InMemoryBankCatalog([MB, VCB])


@pytest.mark.parametrize("key", ["970422", "MB", "MBBank"])
def test_find_by_bin_code_or_short_name(small_catalog, key):
    assert small_catalog.find(key) is MB


@pytest.mark.parametrize("key", ["mb", "MBBANK", "mbbank", "  970422  ", " Mb "])
def test_find_ignores_case_and_whitespace(small_catalog, key):
    assert small_catalog.find(key) is MB


@pytest.mark.parametrize("key", [None, "", "   ", "999999", "unknown"])
def test_find_returns_none_when_not_found(small_catalog, key):
    assert small_catalog.find(key) is None


def test_bin_takes_priority_over_code():
    tricky = BankInfo("970001", "970436", "Tricky", "Tricky bank", "")
    catalog = InMemoryBankCatalog([tricky, VCB])
    assert catalog.find("970436") is VCB


def test_all_banks_is_an_immutable_tuple(small_catalog):
    assert small_catalog.all_banks() == (MB, VCB)
    assert isinstance(small_catalog.all_banks(), tuple)


def test_bank_info_is_immutable():
    with pytest.raises(AttributeError):
        MB.name = "other"


def test_parse_banks_json_reads_data_array():
    text = json.dumps(
        {
            "code": "00",
            "data": [
                {"bin": "970422", "code": "MB", "shortName": "MBBank", "name": "N", "logo": "L"}
            ],
        }
    )
    assert parse_banks_json(text) == [BankInfo("970422", "MB", "MBBank", "N", "L")]


def test_parse_banks_json_applies_fallbacks_and_skips_entries_without_bin():
    text = json.dumps(
        {
            "data": [
                {"bin": "111111", "code": "AAA"},
                {"bin": "222222"},
                {"code": "NOBIN", "shortName": "NoBin"},
                {"bin": "", "code": "EMPTY"},
            ]
        }
    )
    assert parse_banks_json(text) == [
        BankInfo("111111", "AAA", "AAA", "", ""),
        BankInfo("222222", "", "222222", "", ""),
    ]


def test_parse_banks_json_without_data_key_raises():
    with pytest.raises(KeyError):
        parse_banks_json("{}")


def test_default_catalog_is_loaded_once():
    assert default_catalog() is default_catalog()


def test_default_catalog_knows_real_banks():
    catalog = default_catalog()
    assert catalog.find("970422").short_name == "MBBank"
    assert catalog.find("970403").code == "STB"
    assert catalog.find("vcb").bin == "970436"
    assert catalog.find("Vietcombank").bin == "970436"


def test_default_catalog_data_is_sane():
    banks = default_catalog().all_banks()
    assert len(banks) > 50
    assert all(len(b.bin) == 6 and b.bin.isascii() and b.bin.isdigit() for b in banks)
    assert len({b.bin for b in banks}) == len(banks)
    assert len({b.code.casefold() for b in banks}) == len(banks)
    assert len({b.short_name.casefold() for b in banks}) == len(banks)
    assert len({b.bin for b in banks}) == len(banks)
    assert len({b.code.casefold() for b in banks}) == len(banks)
    assert len({b.short_name.casefold() for b in banks}) == len(banks)
    assert all(b.code and b.short_name and b.name and b.logo for b in banks)
