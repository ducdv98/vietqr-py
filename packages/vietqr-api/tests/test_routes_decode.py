import base64
import io
from collections.abc import Iterator
from typing import Any

import pytest
import segno
from fastapi.testclient import TestClient
from PIL import Image

from vietqr_api.app import create_app
from vietqr_api.settings import Settings

BASE = "/api/v1/vietqr-core"
URL = f"{BASE}/decode"
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


def card_png(client: TestClient) -> bytes:
    response = client.get(f"{BASE}/image", params=PARAMS)
    assert response.status_code == 200
    return response.content


def parsed_data(client: TestClient) -> dict[str, Any]:
    payload = client.get(f"{BASE}/generate", params=PARAMS).json()["data"]["qrCode"]
    data: dict[str, Any] = client.post(f"{BASE}/parse", json={"qrCode": payload}).json()["data"]
    return data


def png_of(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def text_qr_png(text: str) -> bytes:
    buffer = io.BytesIO()
    segno.make(text).save(buffer, kind="png", scale=8, border=4)
    return buffer.getvalue()


def upload(client: TestClient, data: bytes, field: str = "file") -> Any:
    return client.post(URL, files={field: ("qr.png", data, "image/png")})


def assert_error(response: Any, status: int, code: str) -> None:
    assert response.status_code == status
    body = response.json()
    assert body["code"] == code
    assert body["data"] is None
    assert body["desc"]


def chunks(data: bytes, size: int = 4096) -> Iterator[bytes]:
    for start in range(0, len(data), size):
        yield data[start : start + size]


def test_decodes_an_uploaded_image(client: TestClient) -> None:
    response = upload(client, card_png(client))
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "00"
    assert body["data"] == parsed_data(client)


def test_uses_the_first_file_when_the_field_is_not_called_file(client: TestClient) -> None:
    response = upload(client, card_png(client), field="picture")
    assert response.status_code == 200
    assert response.json()["data"]["accountNo"] == "0838539629"


def test_decodes_plain_base64(client: TestClient) -> None:
    encoded = base64.b64encode(card_png(client)).decode("ascii")
    response = client.post(URL, json={"imageBase64": encoded})
    assert response.status_code == 200
    assert response.json()["data"] == parsed_data(client)


def test_decodes_a_data_url(client: TestClient) -> None:
    encoded = base64.b64encode(card_png(client)).decode("ascii")
    response = client.post(URL, json={"imageBase64": f"data:image/png;base64,{encoded}"})
    assert response.status_code == 200
    assert response.json()["data"] == parsed_data(client)


def test_decodes_base64_wrapped_over_several_lines(client: TestClient) -> None:
    encoded = base64.encodebytes(card_png(client)).decode("ascii")
    assert "\n" in encoded
    response = client.post(URL, json={"imageBase64": f"  {encoded}  "})
    assert response.status_code == 200


def test_accepts_a_content_type_with_parameters(client: TestClient) -> None:
    encoded = base64.b64encode(card_png(client)).decode("ascii")
    response = client.post(
        URL,
        content=f'{{"imageBase64": "{encoded}"}}',
        headers={"Content-Type": "Application/JSON; charset=utf-8"},
    )
    assert response.status_code == 200


def test_decodes_the_amount_as_a_string(client: TestClient) -> None:
    response = upload(client, card_png(client))
    assert response.json()["data"]["amount"] == "50000"


@pytest.mark.parametrize(
    "send",
    [
        lambda c: c.post(URL, files={"file": ("empty.png", b"", "image/png")}),
        lambda c: c.post(URL, files={"note": (None, "hello")}),
        lambda c: c.post(URL, json={}),
        lambda c: c.post(URL, json={"imageBase64": None}),
        lambda c: c.post(URL, json={"imageBase64": "   "}),
        lambda c: c.post(URL, content=b"", headers={"Content-Type": "application/json"}),
    ],
    ids=["empty-file", "no-file-part", "empty-object", "null", "blank", "empty-body"],
)
def test_a_request_without_an_image_is_code_01(client: TestClient, send: Any) -> None:
    assert_error(send(client), 400, "01")


@pytest.mark.parametrize(
    "send",
    [
        lambda c: c.post(URL, content=b"{not json", headers={"Content-Type": "application/json"}),
        lambda c: c.post(URL, json=["a"]),
        lambda c: c.post(URL, json={"imageBase64": 123}),
        lambda c: c.post(URL, json={"imageBase64": "!!! not base64 !!!"}),
        lambda c: c.post(URL, json={"imageBase64": "aGk"}),
        lambda c: c.post(URL, json={"imageBase64": "data:image/png,aGk="}),
        lambda c: c.post(
            URL,
            files=[("a", ("1.png", b"1", "image/png")), ("b", ("2.png", b"2", "image/png"))],
        ),
    ],
    ids=[
        "malformed-json",
        "json-array",
        "not-a-string",
        "junk-base64",
        "missing-padding",
        "data-url-not-base64",
        "two-files",
    ],
)
def test_a_malformed_request_is_code_03(client: TestClient, send: Any) -> None:
    assert_error(send(client), 400, "03")


def test_other_content_types_are_415(client: TestClient) -> None:
    response = client.post(URL, content=b"hello", headers={"Content-Type": "text/plain"})
    assert_error(response, 415, "03")


def test_a_request_without_a_content_type_is_415(client: TestClient) -> None:
    assert_error(client.post(URL), 415, "03")


@pytest.mark.parametrize(
    "data",
    [
        b"definitely not an image",
        png_of(Image.new("L", (200, 200), 255)),
        text_qr_png("hello world"),
    ],
    ids=["junk", "no-qr", "qr-without-vietqr"],
)
def test_an_undecodable_image_is_code_06(client: TestClient, data: bytes) -> None:
    response = upload(client, data)
    assert_error(response, 400, "06")


def test_the_06_message_carries_the_reason(client: TestClient) -> None:
    response = upload(client, png_of(Image.new("L", (200, 200), 255)))
    assert "No QR code" in response.json()["desc"]


def test_the_pixel_limit_is_code_06() -> None:
    client = TestClient(create_app(Settings(assets_dir=None, max_image_pixels=1000)))
    assert_error(upload(client, card_png(client)), 400, "06")


def test_a_body_over_the_declared_limit_is_413_before_it_is_read() -> None:
    client = TestClient(create_app(Settings(assets_dir=None, max_upload_bytes=1000)))
    response = client.post(URL, files={"file": ("big.png", b"x" * 5000, "image/png")})
    assert_error(response, 413, "03")
    assert "x-correlation-id" in response.headers


def test_a_chunked_multipart_body_is_stopped_at_the_limit() -> None:
    client = TestClient(create_app(Settings(assets_dir=None, max_upload_bytes=1000)))
    boundary = "testboundary"
    head = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode()
    body = head + b"x" * 5000 + f"\r\n--{boundary}--\r\n".encode()
    response = client.post(
        URL,
        content=chunks(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    assert "content-length" not in response.request.headers
    assert_error(response, 413, "03")


def test_a_chunked_json_body_is_stopped_at_the_limit() -> None:
    client = TestClient(create_app(Settings(assets_dir=None, max_upload_bytes=1000)))
    body = b'{"imageBase64": "' + b"A" * 5000 + b'"}'
    response = client.post(URL, content=chunks(body), headers={"Content-Type": "application/json"})
    assert "content-length" not in response.request.headers
    assert_error(response, 413, "03")


def test_a_body_exactly_at_the_limit_is_accepted() -> None:
    plain = TestClient(create_app(Settings(assets_dir=None)))
    data = card_png(plain)
    body = f'{{"imageBase64": "{base64.b64encode(data).decode("ascii")}"}}'.encode()
    client = TestClient(create_app(Settings(assets_dir=None, max_upload_bytes=len(body))))
    response = client.post(URL, content=body, headers={"Content-Type": "application/json"})
    assert response.status_code == 200


def test_the_openapi_schema_lists_both_request_bodies(client: TestClient) -> None:
    operation = client.get("/openapi.json").json()["paths"][URL]["post"]
    content = operation["requestBody"]["content"]
    assert set(content) == {"multipart/form-data", "application/json"}
    assert content["multipart/form-data"]["schema"]["properties"]["file"]["format"] == "binary"
    assert "imageBase64" in content["application/json"]["schema"]["properties"]


def test_an_unexpected_failure_is_a_generic_500(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def explode(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr("vietqr_api.routes.decode.decode_image", explode)
    client = TestClient(create_app(Settings(assets_dir=None)), raise_server_exceptions=False)
    response = upload(client, card_png(client))
    assert_error(response, 500, "99")
    assert "secret" not in response.text
