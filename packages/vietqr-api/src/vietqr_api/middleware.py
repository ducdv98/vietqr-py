"""Security headers and the correlation ID, as a pure ASGI middleware."""

import re
import uuid

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

CORRELATION_HEADER = "X-Correlation-Id"
CORRELATION_STATE_KEY = "correlation_id"

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}


# Only accept a client-supplied ID that is short and made of safe characters; anything else is
# replaced, so a caller cannot put arbitrary text into our logs or response headers.
_SAFE_CORRELATION_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")


def resolve_correlation_id(headers: Headers) -> str:
    supplied = headers.get(CORRELATION_HEADER)
    if supplied is not None and _SAFE_CORRELATION_ID.fullmatch(supplied):
        return supplied
    return uuid.uuid4().hex


def response_headers(correlation_id: str) -> dict[str, str]:
    return {CORRELATION_HEADER: correlation_id, **SECURITY_HEADERS}


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        correlation_id = resolve_correlation_id(Headers(scope=scope))
        scope.setdefault("state", {})[CORRELATION_STATE_KEY] = correlation_id

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in response_headers(correlation_id).items():
                    headers[name] = value
            await send(message)

        await self.app(scope, receive, send_with_headers)
