"""Command-line entry point: ``uv run vietqr-api``."""

import uvicorn

from vietqr_api.app import create_app
from vietqr_api.settings import Settings


def main() -> None:
    settings = Settings()
    uvicorn.run(
        create_app(settings),
        host=settings.host,
        port=settings.port,
        server_header=False,
    )
