import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from vietqr_api import cli
from vietqr_api.app import create_app
from vietqr_api.settings import Settings

DOC_PATHS = ["/docs", "/redoc", "/openapi.json"]


@pytest.fixture(autouse=True)
def clean_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "ASSETS_DIR",
        "HOST",
        "PORT",
        "DOCS_ENABLED",
        "MAX_UPLOAD_BYTES",
        "MAX_IMAGE_PIXELS",
    ):
        monkeypatch.delenv(f"VIETQR_{name}", raising=False)


def test_settings_defaults() -> None:
    settings = Settings()
    assert settings.host == "127.0.0.1"
    assert settings.port == 8000
    assert settings.docs_enabled is True
    assert settings.max_upload_bytes == 8 * 1024 * 1024
    assert settings.max_image_pixels == 25_000_000


def test_settings_read_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VIETQR_HOST", "0.0.0.0")
    monkeypatch.setenv("VIETQR_PORT", "9100")
    monkeypatch.setenv("VIETQR_DOCS_ENABLED", "false")
    monkeypatch.setenv("VIETQR_MAX_UPLOAD_BYTES", "2048")
    monkeypatch.setenv("VIETQR_MAX_IMAGE_PIXELS", "4096")
    settings = Settings()
    assert settings.host == "0.0.0.0"
    assert settings.port == 9100
    assert settings.docs_enabled is False
    assert settings.max_upload_bytes == 2048
    assert settings.max_image_pixels == 4096


@pytest.mark.parametrize("port", ["0", "70000", "abc"])
def test_invalid_ports_are_rejected(monkeypatch: pytest.MonkeyPatch, port: str) -> None:
    monkeypatch.setenv("VIETQR_PORT", port)
    with pytest.raises(ValidationError):
        Settings()


@pytest.mark.parametrize("name", ["MAX_UPLOAD_BYTES", "MAX_IMAGE_PIXELS"])
@pytest.mark.parametrize("value", ["0", "-1", "abc"])
def test_invalid_limits_are_rejected(
    monkeypatch: pytest.MonkeyPatch, name: str, value: str
) -> None:
    monkeypatch.setenv(f"VIETQR_{name}", value)
    with pytest.raises(ValidationError):
        Settings()


@pytest.mark.parametrize("path", DOC_PATHS)
def test_docs_are_served_by_default(path: str) -> None:
    client = TestClient(create_app(Settings()))
    assert client.get(path).status_code == 200


@pytest.mark.parametrize("path", DOC_PATHS)
def test_docs_can_be_turned_off(path: str) -> None:
    client = TestClient(create_app(Settings(docs_enabled=False)))
    assert client.get(path).status_code == 404


def test_the_api_itself_still_works_with_docs_off() -> None:
    client = TestClient(create_app(Settings(docs_enabled=False)))
    assert client.get("/health").status_code == 200


def test_main_starts_uvicorn_with_the_configured_host_and_port(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[object, dict[str, object]]] = []

    def fake_run(app: object, **kwargs: object) -> None:
        calls.append((app, kwargs))

    monkeypatch.setattr(cli.uvicorn, "run", fake_run)
    monkeypatch.setenv("VIETQR_HOST", "0.0.0.0")
    monkeypatch.setenv("VIETQR_PORT", "9100")

    cli.main()

    assert len(calls) == 1
    app, kwargs = calls[0]
    assert isinstance(app, FastAPI)
    assert kwargs == {"host": "0.0.0.0", "port": 9100, "server_header": False}
