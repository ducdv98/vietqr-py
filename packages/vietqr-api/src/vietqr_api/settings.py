"""Runtime configuration for the API, read from VIETQR_* environment variables."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from vietqr_core.parsing.decoder import DEFAULT_MAX_PIXELS


class Settings(BaseSettings):
    """Environment-driven settings.

    ``assets_dir`` points at a directory laid out as ``vietqr.png``, ``napas247.png``,
    ``logos/<BIN>.png`` and ``fonts/...``. When it is unset, the renderers fall back to their
    synthetic logos and the built-in font.

    ``host`` defaults to loopback so a development server is not exposed to the network by
    accident. ``docs_enabled`` switches /docs, /redoc and /openapi.json on or off.

    ``max_upload_bytes`` caps the request body of POST /decode, and ``max_image_pixels`` caps
    the decoded size of the image inside it.
    (add as a new paragraph at the end of the class docstring)
    """

    model_config = SettingsConfigDict(env_prefix="VIETQR_", frozen=True)

    assets_dir: Path | None = None
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    docs_enabled: bool = True

    max_upload_bytes: int = Field(default=8 * 1024 * 1024, gt=0)
    max_image_pixels: int = Field(default=DEFAULT_MAX_PIXELS, gt=0)
