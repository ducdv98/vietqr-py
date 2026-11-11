"""Application factory."""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from vietqr_api.errors import (
    ApiError,
    handle_api_error,
    handle_unexpected_error,
    handle_validation_error,
)
from vietqr_api.middleware import CORRELATION_HEADER, SecurityHeadersMiddleware
from vietqr_api.routes import banks, decode, health, parse, qr
from vietqr_api.settings import Settings
from vietqr_core.banks.catalog import BankCatalog, default_catalog
from vietqr_core.rendering.assets import DirectoryAssetProvider


def create_app(settings: Settings | None = None, catalog: BankCatalog | None = None) -> FastAPI:
    """Build the app. Tests pass their own settings and catalog instead of using the environment."""
    settings = settings or Settings()

    docs_url, redoc_url, openapi_url = (
        ("/docs", "/redoc", "/openapi.json") if settings.docs_enabled else (None, None, None)
    )
    app = FastAPI(
        title="VietQR API",
        version="0.1.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )
    app.state.settings = settings
    app.state.catalog = catalog or default_catalog()

    app.state.assets = (
        DirectoryAssetProvider(settings.assets_dir) if settings.assets_dir is not None else None
    )

    app.exception_handler(ApiError)(handle_api_error)
    app.exception_handler(RequestValidationError)(handle_validation_error)
    app.exception_handler(Exception)(handle_unexpected_error)

    app.include_router(qr.router)
    app.include_router(parse.router)
    app.include_router(banks.router)
    app.include_router(decode.router)
    app.include_router(health.router)

    # The last middleware added is the outermost one, so the security headers are applied to
    # every response, including CORS preflight answers.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[CORRELATION_HEADER],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    return app
