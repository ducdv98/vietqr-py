FROM python:3.15-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /bin/uv
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages/vietqr-core/pyproject.toml packages/vietqr-core/README.md packages/vietqr-core/
COPY packages/vietqr-api/pyproject.toml packages/vietqr-api/README.md packages/vietqr-api/
RUN uv sync --locked --no-dev --no-install-workspace --package vietqr-api

COPY packages/vietqr-core/src packages/vietqr-core/src
COPY packages/vietqr-api/src packages/vietqr-api/src
RUN uv sync --locked --no-dev --no-editable --package vietqr-api

FROM python:3.15-slim AS runtime
RUN useradd --system --uid 10001 --no-create-home app
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH" \
    VIETQR_HOST=0.0.0.0 \
    VIETQR_PORT=8080 \
    PYTHONUNBUFFERED=1
EXPOSE 8080
USER app
ENTRYPOINT ["vietqr-api"]
