"""Runtime configuration for the API, read from VIETQR_* environment variables."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven settings.

    ``assets_dir`` points at a directory laid out as ``vietqr.png``, ``napas247.png``,
    ``logos/<BIN>.png`` and ``fonts/...``. When it is unset, the renderers fall back to their
    synthetic logos and the built-in font.

    ``host`` defaults to loopback so a development server is not exposed to the network by
    accident. ``docs_enabled`` switches /docs, /redoc and /openapi.json on or off.
    """

    model_config = SettingsConfigDict(env_prefix="VIETQR_", frozen=True)

    assets_dir: Path | None = None
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    docs_enabled: bool = True
