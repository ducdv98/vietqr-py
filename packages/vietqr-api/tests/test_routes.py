import base64
import importlib.metadata
import io
from pathlib import Path
from typing import Any

import pytest
import zxingcpp
from fastapi.testclient import TestClient
from PIL import Image

from vietqr_api.app import create_app
from vietqr_api.settings import Settings
from vietqr_core.parsing.parser import parse_payload

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
BASE = "/api/v1/vietqr-core"
PARAMS = {
    "bankBin": "970422",
    "accountNo": "0838539629",
    "amount": "50000",
    "description": "Thanh toan don hang",
    "accountName": "NGUYEN VAN A",
}
TEMPLATES = ["compact", "qr_only", "print"]


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings(assets_dir=None)))


def decode_qr(png: bytes) -> str:
    results = zxingcpp.read_barcodes(Image.open(io.BytesIO(png)))
    assert len(results) == 1
    return str(results[0].text)


def payload_of(client: TestClient, **extra: Any) -> str:
    response = client.get(f"{BASE}/generate", params={**PARAMS, **extra})
    assert response.status_code == 200
    return str(response.json()["data"]["qrCode"])


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body == {"status": "ok", "version": client.app.version}  # type: ignore[attr-defined]
    assert body["version"] == importlib.metadata.version("vietqr-api")


@pytest.mark.parametrize("template", TEMPLATES)
def test_get_image_returns_a_png_that_decodes_to_the_payload(
    client: TestClient, template: str
) -> None:
    response = client.get(f"{BASE}/image", params={**PARAMS, "template": template})
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(PNG_MAGIC)

    payload = payload_of(client, template=template)
    assert decode_qr(response.content) == payload
    info = parse_payload(payload)
    assert info.bank_bin == "970422"
    assert info.amount == 50000


@pytest.mark.parametrize("template", TEMPLATES)
def test_post_image_matches_get_image(client: TestClient, template: str) -> None:
    from_get = client.get(f"{BASE}/image", params={**PARAMS, "template": template})
    from_post = client.post(f"{BASE}/image", json={**PARAMS, "template": template})
    assert from_post.status_code == 200
    assert from_post.content == from_get.content


def test_snake_case_query_names_are_accepted_too(client: TestClient) -> None:
    camel = client.get(f"{BASE}/image", params=PARAMS)
    snake = client.get(
        f"{BASE}/image",
        params={
            "bank_bin": "970422",
            "account_no": "0838539629",
            "amount": "50000",
            "description": "Thanh toan don hang",
            "account_name": "NGUYEN VAN A",
        },
    )
    assert snake.status_code == 200
    assert snake.content == camel.content


def test_image_headers(client: TestClient) -> None:
    get = client.get(f"{BASE}/image", params=PARAMS)
    assert get.headers["cache-control"] == "public, max-age=3600"
    assert get.headers["content-disposition"] == 'inline; filename="vietqr-970422-0838539629.png"'

    post = client.post(f"{BASE}/image", json=PARAMS)
    assert "cache-control" not in post.headers
    assert post.headers["content-disposition"] == get.headers["content-disposition"]


def test_filename_drops_unsafe_characters(client: TestClient) -> None:
    response = client.post(f"{BASE}/image", json={**PARAMS, "accountNo": 'a"b\r\nc/../é d'})
    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'inline; filename="vietqr-970422-abcd.png"'


@pytest.mark.parametrize("template", TEMPLATES)
def test_generate_returns_payload_and_data_url(client: TestClient, template: str) -> None:
    response = client.get(f"{BASE}/generate", params={**PARAMS, "template": template})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=3600"

    body = response.json()
    assert body["code"] == "00"
    assert body["desc"] == "success"
    prefix = "data:image/png;base64,"
    assert body["data"]["qrDataURL"].startswith(prefix)

    png = base64.b64decode(body["data"]["qrDataURL"].removeprefix(prefix))
    assert png.startswith(PNG_MAGIC)
    assert decode_qr(png) == body["data"]["qrCode"]


def test_post_generate_matches_get_generate(client: TestClient) -> None:
    from_get = client.get(f"{BASE}/generate", params=PARAMS)
    from_post = client.post(f"{BASE}/generate", json=PARAMS)
    assert from_post.status_code == 200
    assert "cache-control" not in from_post.headers
    assert from_post.json() == from_get.json()


def test_card_service_type_changes_the_payload(client: TestClient) -> None:
    payload = payload_of(client, serviceType="card")
    assert "QRIBFTTC" in payload


def test_size_controls_the_qr_only_image(client: TestClient) -> None:
    response = client.get(f"{BASE}/image", params={**PARAMS, "template": "qr_only", "size": 300})
    assert Image.open(io.BytesIO(response.content)).size == (300, 300)


@pytest.mark.parametrize("path", ["image", "generate"])
def test_missing_parameters_use_the_error_envelope(client: TestClient, path: str) -> None:
    response = client.get(f"{BASE}/{path}", params={"bankBin": "970422"})
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "01"
    assert body["data"] is None
    assert "accountNo" in body["desc"]


def test_post_without_a_body_is_a_coded_error(client: TestClient) -> None:
    response = client.post(f"{BASE}/image")
    assert response.status_code == 400
    assert response.json()["code"] == "03"


@pytest.mark.parametrize(
    ("overrides", "code"),
    [
        ({"amount": "0"}, "02"),
        ({"bankBin": "12"}, "03"),
        ({"bankBin": "999999"}, "04"),
        ({"template": "poster"}, "05"),
        ({"format": "webp"}, "05"),
        ({"size": 50}, "03"),
        ({"size": "abc"}, "03"),
    ],
)
def test_validation_failures_map_to_codes(
    client: TestClient, overrides: dict[str, Any], code: str
) -> None:
    response = client.get(f"{BASE}/image", params={**PARAMS, **overrides})
    assert response.status_code == 400
    assert response.json()["code"] == code


def test_assets_dir_is_used_for_rendering(tmp_path: Path) -> None:
    buffer = io.BytesIO()
    Image.new("RGBA", (300, 90), (200, 0, 0, 255)).save(buffer, format="PNG")
    (tmp_path / "vietqr.png").write_bytes(buffer.getvalue())

    plain = TestClient(create_app(Settings(assets_dir=None)))
    branded = TestClient(create_app(Settings(assets_dir=tmp_path)))
    default_png = plain.get(f"{BASE}/image", params=PARAMS).content
    branded_png = branded.get(f"{BASE}/image", params=PARAMS).content

    assert branded_png != default_png
    assert decode_qr(branded_png) == decode_qr(default_png)


def test_unexpected_errors_are_hidden_from_the_client(monkeypatch: pytest.MonkeyPatch) -> None:
    def explode(*_args: object, **_kwargs: object) -> bytes:
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr("vietqr_api.routes.qr.render_card_png", explode)
    client = TestClient(create_app(Settings(assets_dir=None)), raise_server_exceptions=False)

    response = client.get(f"{BASE}/image", params=PARAMS)
    assert response.status_code == 500
    assert response.json() == {"code": "99", "desc": "Internal server error.", "data": None}
    assert "secret" not in response.text


STATIC_PARAMS = {"bankBin": "970422", "accountNo": "0838539629"}


@pytest.mark.parametrize("amount", [None, "", "  "])
def test_generate_without_amount_is_a_static_qr(client: TestClient, amount: str | None) -> None:
    params = {**STATIC_PARAMS, **({} if amount is None else {"amount": amount})}
    get = client.get(f"{BASE}/generate", params=params)
    post = client.post(f"{BASE}/generate", json=params)
    assert get.status_code == post.status_code == 200
    info = parse_payload(get.json()["data"]["qrCode"])
    assert info.is_dynamic is False
    assert info.amount is None
    assert info.description is None
    assert "5303704" in info.raw_payload
    assert info.raw_tags["01"] == "11"
    assert post.json() == get.json()


def test_static_qr_keeps_the_description(client: TestClient) -> None:
    response = client.get(f"{BASE}/generate", params={**STATIC_PARAMS, "description": "Ung ho"})
    info = parse_payload(response.json()["data"]["qrCode"])
    assert info.raw_tags["01"] == "11"
    assert info.description == "Ung ho"


@pytest.mark.parametrize("template", TEMPLATES)
def test_static_image_for_every_template(client: TestClient, template: str) -> None:
    params = {**STATIC_PARAMS, "accountName": "NGUYEN VAN A", "template": template}
    get = client.get(f"{BASE}/image", params=params)
    post = client.post(f"{BASE}/image", json=params)
    assert get.status_code == post.status_code == 200
    assert get.content.startswith(PNG_MAGIC)
    assert post.content == get.content

    generated = client.get(f"{BASE}/generate", params=params).json()["data"]["qrCode"]
    assert decode_qr(get.content) == generated
    assert parse_payload(generated).amount is None


def test_static_print_card_has_no_amount_line(client: TestClient) -> None:
    dynamic = client.get(f"{BASE}/image", params={**PARAMS, "template": "print"})
    static = client.get(
        f"{BASE}/image",
        params={
            "bankBin": "970422",
            "accountNo": "0838539629",
            "accountName": "NGUYEN VAN A",
            "template": "print",
        },
    )
    # Fewer text lines (no amount, no description) means a shorter card.
    assert (
        Image.open(io.BytesIO(static.content)).height
        < Image.open(io.BytesIO(dynamic.content)).height
    )


@pytest.mark.parametrize("path", ["image", "generate"])
def test_missing_required_parameters_message(client: TestClient, path: str) -> None:
    response = client.get(f"{BASE}/{path}", params={"amount": "50000"})
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "01"
    assert body["desc"].startswith("Missing required parameters: bankBin, accountNo.")


@pytest.mark.parametrize("amount", ["0", "000"])
def test_explicit_zero_amount_is_still_invalid(client: TestClient, amount: str) -> None:
    response = client.get(f"{BASE}/generate", params={**STATIC_PARAMS, "amount": amount})
    assert response.status_code == 400
    assert response.json()["code"] == "02"
