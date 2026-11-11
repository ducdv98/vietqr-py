"""Error contract: every failure is a ``{code, desc, data}`` envelope"""

import logging
from collections.abc import Mapping
from enum import StrEnum

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from vietqr_api.middleware import CORRELATION_STATE_KEY, response_headers

logger = logging.getLogger(__name__)


class ErrorCode(StrEnum):
    MISSING_PARAMETER = "01"
    INVALID_AMOUNT = "02"
    INVALID_PARAMETER = "03"
    BANK_NOT_FOUND = "04"
    UNSUPPORTED_OPTION = "05"
    DECODE_FAILED = "06"
    INVALID_PAYLOAD = "07"
    INTERNAL = "99"


class ApiError(Exception):
    """A request failure that maps to a coded JSON response."""

    def __init__(self, code: ErrorCode, desc: str, *, status_code: int = 400) -> None:
        super().__init__(desc)
        self.code = code
        self.desc = desc
        self.status_code = status_code


def error_response(
    code: ErrorCode, desc: str, status_code: int, headers: Mapping[str, str] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"code": code.value, "desc": desc, "data": None},
        headers=headers,
    )


async def handle_api_error(_request: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.code, exc.desc, exc.status_code)


async def handle_validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """Replace FastAPI's default 422 body (e.g. ``size=abc``) with the coded envelope."""
    details = "; ".join(
        f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}" for error in exc.errors()
    )
    return error_response(ErrorCode.INVALID_PARAMETER, f"Invalid request: {details}", 400)


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Log the real cause, but never leak it to the client.

    Starlette runs this handler outside our middleware, so the headers it would normally add
    are attached here, using the correlation ID the middleware left in the request state.
    """
    correlation_id: str | None = getattr(request.state, CORRELATION_STATE_KEY, None)
    logger.error(
        "Unhandled error while serving a request (correlation id: %s)", correlation_id, exc_info=exc
    )
    headers = response_headers(correlation_id) if correlation_id else None
    return error_response(ErrorCode.INTERNAL, "Internal server error.", 500, headers)
