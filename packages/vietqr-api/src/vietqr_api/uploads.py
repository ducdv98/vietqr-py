"""Reads the image of POST /decode from a multipart form or a JSON body, within a size limit."""

import base64
import binascii
from typing import Annotated

from fastapi import Depends, Request
from pydantic import ValidationError
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException
from starlette.types import Message, Receive

from vietqr_api.deps import SettingsDep
from vietqr_api.errors import ApiError, ErrorCode
from vietqr_api.models import DecodeRequest

MAX_FORM_FILES = 1
MAX_FORM_FIELDS = 5


def _too_large(limit: int) -> ApiError:
    return ApiError(
        ErrorCode.INVALID_PARAMETER,
        f"The request body is over the limit of {limit} bytes.",
        status_code=413,
    )


def _limited(receive: Receive, limit: int) -> Receive:
    """Wrap ``receive`` so reading stops with a 413 as soon as the body passes ``limit``."""
    received = 0

    async def limited_receive() -> Message:
        nonlocal received
        message = await receive()
        if message["type"] == "http.request":
            received += len(message.get("body", b""))
            if received > limit:
                raise _too_large(limit)
        return message

    return limited_receive


async def _read_multipart(request: Request) -> bytes:
    """Return the field ``file``, or else the first uploaded file, or ``b""`` if there is none."""
    try:
        async with request.form(max_files=MAX_FORM_FILES, max_fields=MAX_FORM_FIELDS) as form:
            files = [(k, v) for k, v in form.multi_items() if isinstance(v, UploadFile)]
            if not files:
                return b""
            chosen = next((v for k, v in files if k == "file"), files[0][1])
            return await chosen.read()
    except HTTPException as exc:
        raise ApiError(ErrorCode.INVALID_PARAMETER, f"Invalid form data: {exc.detail}") from exc


def _decode_base64(text: str) -> bytes:
    """Decode plain Base64 or a ``data:...;base64,`` URL, ignoring whitespace but not junk."""
    text = text.strip()
    if text.startswith("data:"):
        header, _, text = text.partition(",")
        if ";base64" not in header.lower():
            raise ApiError(ErrorCode.INVALID_PARAMETER, "The Data URL must be Base64 encoded.")
    try:
        return base64.b64decode("".join(text.split()), validate=True)
    except binascii.Error as exc:
        raise ApiError(ErrorCode.INVALID_PARAMETER, "'imageBase64' is not valid Base64.") from exc


async def _read_json(request: Request) -> bytes:
    body = bytearray()
    async for chunk in request.stream():
        body += chunk
    if not body:
        return b""
    try:
        decoded = DecodeRequest.model_validate_json(bytes(body))
    except ValidationError as exc:
        raise ApiError(
            ErrorCode.INVALID_PARAMETER,
            "The body must be a JSON object whose 'imageBase64' field is a string.",
        ) from exc
    return _decode_base64(decoded.image_base64) if decoded.image_base64 else b""


async def read_image(request: Request, settings: SettingsDep) -> bytes:
    """Return the uploaded image bytes, or ``b""`` when the request carries no image."""
    media_type = request.headers.get("content-type", "").partition(";")[0].strip().lower()
    if media_type not in ("multipart/form-data", "application/json"):
        raise ApiError(
            ErrorCode.INVALID_PARAMETER,
            "Send the image as multipart/form-data or as application/json.",
            status_code=415,
        )

    limit = settings.max_upload_bytes
    declared = request.headers.get("content-length", "")
    if declared.isdecimal() and int(declared) > limit:
        raise _too_large(limit)

    # A fresh Request around the counting receive: the original is untouched and the limit
    # applies to this route only.
    guarded = Request(request.scope, receive=_limited(request.receive, limit))
    if media_type == "multipart/form-data":
        return await _read_multipart(guarded)
    return await _read_json(guarded)


ImageBytesDep = Annotated[bytes, Depends(read_image)]
