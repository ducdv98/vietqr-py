import pytest
from fastapi.testclient import TestClient

from vietqr_api.app import create_app
from vietqr_api.settings import Settings
from vietqr_core.banks.catalog import default_catalog
from vietqr_core.emv.crc import generate_crc_code

BASE = "/api/v1/vietqr-core"
PARAMS = {
    "bankBin": "970422",
    "accountNo": "0838539629",
    "amount": "50000",
    "description": "Thanh toan don hang",
    "billNumber": "HD1",
}


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings(assets_dir=None)))


def generated_payload(client: TestClient, **extra: str) -> str:
    response = client.get(f"{BASE}/generate", params={**PARAMS, **extra})
    return str(response.json()["data"]["qrCode"])


def with_new_crc(content_with_crc_tag: str) -> str:
    return content_with_crc_tag + generate_crc_code(content_with_crc_tag)


def parse(client: TestClient, qr_code: str | None) -> dict[str, object]:
    response = client.post(f"{BASE}/parse", json={"qrCode": qr_code})
    result: dict[str, object] = response.json()
    result["_status"] = response.status_code
    return result


def test_parse_round_trips_a_generated_payload(client: TestClient) -> None:
    payload = generated_payload(client)
    response = client.post(f"{BASE}/parse", json={"qrCode": payload})
    assert response.status_code == 200

    body = response.json()
    assert body["code"] == "00"
    data = body["data"]
    assert data["bankBin"] == "970422"
    assert data["accountNo"] == "0838539629"
    assert data["serviceType"] == "QRIBFTTA"
    assert data["qrType"] == "12"
    assert data["isDynamic"] is True
    assert data["isValidCrc"] is True
    assert data["description"] == "Thanh toan don hang"
    assert data["billNumber"] == "HD1"
    assert data["rawPayload"] == payload
    assert data["rawTags"]["54"] == "50000"
    assert data["crc"] == payload[-4:]


def test_parse_includes_bank_info_from_the_catalog(client: TestClient) -> None:
    bank = default_catalog().find("970422")
    assert bank is not None
    data = client.post(f"{BASE}/parse", json={"qrCode": generated_payload(client)}).json()["data"]
    assert data["bankInfo"] == {
        "bin": bank.bin,
        "code": bank.code,
        "shortName": bank.short_name,
        "name": bank.name,
        "logo": bank.logo,
    }


def test_whole_amounts_are_written_as_strings(client: TestClient) -> None:
    data = client.post(f"{BASE}/parse", json={"qrCode": generated_payload(client)}).json()["data"]
    assert data["amount"] == "50000"


def test_decimal_amounts_keep_their_decimal_part(client: TestClient) -> None:
    content = generated_payload(client)[:-4].replace("540550000", "54071500.50")
    assert "54071500.50" in content

    data = client.post(f"{BASE}/parse", json={"qrCode": with_new_crc(content)}).json()["data"]
    assert data["amount"] == "1500.50"


def test_static_payload_has_no_amount(client: TestClient) -> None:
    content = generated_payload(client)[:-4].replace("540550000", "").replace("010212", "010211")
    data = client.post(f"{BASE}/parse", json={"qrCode": with_new_crc(content)}).json()["data"]
    assert data["amount"] is None
    assert data["qrType"] == "11"
    assert data["isDynamic"] is False


def test_surrounding_whitespace_is_ignored(client: TestClient) -> None:
    payload = generated_payload(client)
    response = client.post(f"{BASE}/parse", json={"qrCode": f"  {payload}\n"})
    assert response.status_code == 200
    assert response.json()["data"]["rawPayload"] == payload


@pytest.mark.parametrize("body", [{}, {"qrCode": None}, {"qrCode": ""}, {"qrCode": "   "}])
def test_blank_qr_code_is_code_01(client: TestClient, body: dict[str, object]) -> None:
    response = client.post(f"{BASE}/parse", json=body)
    assert response.status_code == 400
    assert response.json() == {
        "code": "01",
        "desc": "'qrCode' must not be empty.",
        "data": None,
    }


def test_wrong_crc_is_code_07(client: TestClient) -> None:
    payload = generated_payload(client)
    broken = payload[:-1] + ("0" if payload[-1] != "0" else "1")
    result = parse(client, broken)
    assert result["_status"] == 400
    assert result["code"] == "07"
    assert str(result["desc"]).startswith("The string is not a valid VietQR / EMVCo payload.")


@pytest.mark.parametrize("text", ["hello", "0002", "x" * 2000])
def test_garbage_is_code_07(client: TestClient, text: str) -> None:
    result = parse(client, text)
    assert result["_status"] == 400
    assert result["code"] == "07"


def test_valid_emv_but_not_vietqr_is_code_07(client: TestClient) -> None:
    content = "00020101021153037045802VN6304"
    result = parse(client, with_new_crc(content))
    assert result["_status"] == 400
    assert result["code"] == "07"
