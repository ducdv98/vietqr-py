# vietqr-api

HTTP API for VietQR (NAPAS247 / EMVCo), built with FastAPI on top of `vietqr-core`. It generates
QR payloads and PNG images, parses payloads, decodes uploaded QR images and serves the bank
catalog.

## Run

```bash
uv run vietqr-api
```

The server listens on `127.0.0.1:8000` by default; interactive docs are at `/docs`. It is
configured through `VIETQR_*` environment variables (host, port, assets directory, upload and
image size limits, docs switch).

See the repository README for the endpoint list, the settings table, error codes and Docker usage.
The [`vietqr-web`](../vietqr-web) client is built on this API; its generated client must match the
OpenAPI schema, so after changing a route or model run `pnpm api:generate` in `packages/vietqr-web`
(CI fails on drift).
