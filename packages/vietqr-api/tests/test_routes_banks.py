from fastapi.testclient import TestClient

from vietqr_api.app import create_app
from vietqr_api.settings import Settings
from vietqr_core.banks.catalog import InMemoryBankCatalog, default_catalog
from vietqr_core.banks.models import BankInfo

BASE = "/api/v1/vietqr-core"
WIRE_KEYS = {"bin", "code", "shortName", "name", "logo"}


def make_client() -> TestClient:
    return TestClient(create_app(Settings(assets_dir=None)))


def test_list_returns_every_bank_in_the_catalog() -> None:
    response = make_client().get(f"{BASE}/banks")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=3600"

    body = response.json()
    assert body["code"] == "00"
    assert len(body["data"]) == len(default_catalog().all_banks()) == 76
    assert all(set(item) == WIRE_KEYS for item in body["data"])


def test_list_uses_the_injected_catalog() -> None:
    bank = BankInfo(bin="999999", code="TST", short_name="Test", name="Test Bank", logo="x.png")
    client = TestClient(
        create_app(Settings(assets_dir=None), catalog=InMemoryBankCatalog([bank])),
    )
    assert client.get(f"{BASE}/banks").json()["data"] == [
        {"bin": "999999", "code": "TST", "shortName": "Test", "name": "Test Bank", "logo": "x.png"}
    ]


def test_lookup_by_bin_code_and_any_case_finds_the_same_bank() -> None:
    client = make_client()
    by_bin = client.get(f"{BASE}/banks/970422")
    assert by_bin.status_code == 200
    expected = by_bin.json()["data"]
    assert set(expected) == WIRE_KEYS
    assert expected["bin"] == "970422"

    for key in (expected["code"], expected["code"].lower(), f" {expected['code']} "):
        response = client.get(f"{BASE}/banks/{key}")
        assert response.status_code == 200
        assert response.json()["data"] == expected


def test_unknown_bank_is_404_with_code_04() -> None:
    response = make_client().get(f"{BASE}/banks/does-not-exist")
    assert response.status_code == 404
    assert response.json() == {
        "code": "04",
        "desc": "No bank found for: does-not-exist.",
        "data": None,
    }
