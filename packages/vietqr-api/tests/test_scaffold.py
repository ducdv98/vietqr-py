from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient

from vietqr_api.errors import ApiError, ErrorCode, handle_api_error, handle_validation_error
from vietqr_api.models import ApiResponse, GenerateRequest, GenerateResult, ParseRequest
from vietqr_api.settings import Settings


def test_settings_default_is_no_assets_dir(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("VIETQR_ASSETS_DIR", raising=False)
    assert Settings().assets_dir is None


def test_settings_reads_assets_dir_from_env(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("VIETQR_ASSETS_DIR", str(tmp_path))
    assert Settings().assets_dir == tmp_path


def test_generate_request_accepts_camel_and_snake_case() -> None:
    from_json = GenerateRequest.model_validate({"bankBin": "970422", "accountNo": "123"})
    from_python = GenerateRequest(bank_bin="970422", account_no="123")
    assert from_json == from_python
    assert from_json.template == "compact"
    assert from_json.format == "png"
    assert from_json.size == 500


def test_parse_request_reads_camel_case() -> None:
    assert ParseRequest.model_validate({"qrCode": "000201"}).qr_code == "000201"


def test_envelope_serializes_with_wire_names() -> None:
    result = GenerateResult(qrCode="0002", qrDataURL="data:image/png;base64,AA==")
    dumped = ApiResponse[GenerateResult](data=result).model_dump(by_alias=True)
    assert dumped == {
        "code": "00",
        "desc": "success",
        "data": {"qrCode": "0002", "qrDataURL": "data:image/png;base64,AA=="},
    }


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)

    @app.get("/boom")
    def boom() -> None:
        raise ApiError(ErrorCode.BANK_NOT_FOUND, "no such bank")

    @app.get("/number")
    def number(size: int = 1) -> int:
        return size

    return TestClient(app)


def test_api_error_becomes_coded_envelope(client: TestClient) -> None:
    response = client.get("/boom")
    assert response.status_code == 400
    assert response.json() == {"code": "04", "desc": "no such bank", "data": None}


def test_validation_error_becomes_coded_envelope(client: TestClient) -> None:
    response = client.get("/number", params={"size": "abc"})
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "03"
    assert body["data"] is None
    assert "query.size" in body["desc"]
