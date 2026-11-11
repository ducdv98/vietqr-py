import re
from collections.abc import Mapping

import pytest
from fastapi.testclient import TestClient

from vietqr_api.app import create_app
from vietqr_api.settings import Settings

BASE = "/api/v1/vietqr-core"
PARAMS = {
    "bankBin": "970422",
    "accountNo": "0838539629",
    "amount": "50000",
    "description": "Thanh toan don hang",
}
SECURITY = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
}


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings(assets_dir=None)))


def assert_security_headers(headers: Mapping[str, str]) -> None:
    for name, value in SECURITY.items():
        assert headers[name] == value


def test_success_responses_carry_the_security_headers(client: TestClient) -> None:
    for response in (
        client.get("/health"),
        client.get(f"{BASE}/image", params=PARAMS),
        client.get(f"{BASE}/banks"),
    ):
        assert response.status_code == 200
        assert_security_headers(response.headers)


def test_error_and_missing_route_responses_carry_them_too(client: TestClient) -> None:
    for response in (
        client.get(f"{BASE}/image"),
        client.get(f"{BASE}/banks/nope"),
        client.get("/no-such-route"),
    ):
        assert response.status_code in (400, 404)
        assert_security_headers(response.headers)
        assert response.headers["x-correlation-id"]


def test_a_correlation_id_is_generated_when_none_is_sent(client: TestClient) -> None:
    first = client.get("/health").headers["x-correlation-id"]
    second = client.get("/health").headers["x-correlation-id"]
    assert re.fullmatch(r"[0-9a-f]{32}", first)
    assert first != second


def test_a_supplied_correlation_id_is_echoed(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Correlation-Id": "order-42.a_b"})
    assert response.headers["x-correlation-id"] == "order-42.a_b"


@pytest.mark.parametrize("supplied", ["has space", "semi;colon", "é", "x" * 65, ""])
def test_unsafe_correlation_ids_are_replaced(client: TestClient, supplied: str) -> None:
    raw = supplied.encode("latin-1")  # httpx only takes non-ASCII header values as bytes
    response = client.get("/health", headers={"X-Correlation-Id": raw})
    assert re.fullmatch(r"[0-9a-f]{32}", response.headers["x-correlation-id"])


def test_cors_allows_any_origin_and_exposes_the_correlation_id(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "https://shop.example"})
    assert response.headers["access-control-allow-origin"] == "*"
    assert "X-Correlation-Id" in response.headers["access-control-expose-headers"]


def test_cors_preflight_is_answered_with_the_security_headers(client: TestClient) -> None:
    response = client.options(
        f"{BASE}/generate",
        headers={
            "Origin": "https://shop.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert_security_headers(response.headers)


def test_unexpected_errors_still_get_the_headers(monkeypatch: pytest.MonkeyPatch) -> None:
    def explode(*_args: object, **_kwargs: object) -> bytes:
        raise RuntimeError("boom")

    monkeypatch.setattr("vietqr_api.routes.qr.render_card_png", explode)
    client = TestClient(create_app(Settings(assets_dir=None)), raise_server_exceptions=False)

    response = client.get(f"{BASE}/image", params=PARAMS, headers={"X-Correlation-Id": "abc-1"})
    assert response.status_code == 500
    assert response.json()["code"] == "99"
    assert_security_headers(response.headers)
