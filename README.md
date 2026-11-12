# vietqr-py

Toolkit for VietQR (NAPAS247 / EMVCo) payments. It builds and parses payment payloads,
renders QR images and payment cards, reads QR codes back from images, and exposes all of it as an
HTTP API and a web client. Everything runs offline; the bank catalog is bundled.

The repository holds three packages. `vietqr-core` and `vietqr-api` form a
[uv](https://docs.astral.sh/uv/) workspace; `vietqr-web` is a separate pnpm project.

| Package | What it is |
| :-- | :-- |
| [`vietqr-core`](packages/vietqr-core) | The library: payload builder and parser, PNG renderers, image decoder, bank catalog. |
| [`vietqr-api`](packages/vietqr-api) | A FastAPI service built on `vietqr-core`, with a Docker image. |
| [`vietqr-web`](packages/vietqr-web) | A Next.js web client for the API: Studio (create QR codes), Inspect (read them) and a bank browser. Vietnamese and English. |

Domain terms (Payload, QR type, Template, Studio, Pay link, ...) are defined in
[`CONTEXT.md`](CONTEXT.md); design decisions are recorded in [`docs/adr/`](docs/adr).

## Features

- Build and parse VietQR payloads (static and dynamic, account and card transfers) with CRC16
  checking.
- Render three PNG layouts: `compact` (payment card), `print` (counter/POS sheet) and `qr_only`.
- Decode PNG, JPEG, WebP, BMP and GIF images back into payment data, with a pixel limit against
  decompression bombs.
- Bundled bank catalog, looked up by BIN or short code.
- HTTP API with a uniform `{code, desc, data}` error envelope, upload size limits, CORS and
  security headers.
- Web client with three pages: **Studio** (choose a static or dynamic QR type, a bank and a
  template, then explicitly Generate), **Inspect** (paste a payload or upload an image to see what
  a QR says) and **Banks** (browse the catalog). An optional **Pay link** page shows a QR to a
  payer. The client stores nothing, and reaches the API through a same-origin proxy.

## Install

Requires Python 3.15 and [uv](https://docs.astral.sh/uv/). Nothing is published to PyPI yet, so
work from a checkout:

```bash
git clone <repo-url>
cd vietqr-py
uv sync
```

## Web app quick start

The full app (API plus web client) runs with Docker Compose. Only the web client is published; the
API sits on an internal network:

```bash
cp .env.example .env   # optional; every variable has a default
docker compose up --build
```

Open <http://localhost:3000> (change the port with `WEB_PORT`). See
[Web client settings](#web-client-settings) to configure it.

To develop the web client against a local API, start the API (see
[API quick start](#api-quick-start)), then:

```bash
cd packages/vietqr-web
pnpm install
cp .env.example .env.local   # VIETQR_API_URL defaults to http://localhost:8000
pnpm dev
```

Requires Node 24 and pnpm. More in [`packages/vietqr-web/README.md`](packages/vietqr-web/README.md).

## Library quick start

```python
from pathlib import Path

from vietqr_core.banks.catalog import default_catalog
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.parsing.decoder import decode_image
from vietqr_core.parsing.parser import parse_payload
from vietqr_core.rendering.card import render_card_png

catalog = default_catalog()

payload = build_payload(
    VietQrRequest(
        bin_code="970422",
        account_no="056789799999",
        amount=50000,
        description="Ung ho quy",
    )
)
print(payload)
# 00020101021238560010A0000007270126000697042201120567897999990208QRIBFTTA53037045405500005802VN62140810Ung ho quy63045C0B

info = parse_payload(payload, catalog=catalog)
print(info.bank_info.short_name, info.amount, info.is_valid_crc)
# MBBank 50000 True

png = render_card_png(payload, bank=info.bank_info)
Path("vietqr.png").write_bytes(png)

print(decode_image(png, catalog=catalog).account_no)
# 056789799999
```

Other renderers are `render_qr_png` (QR only) and `render_print_png` (print sheet). Errors derive
from `VietQrError`: `InvalidPayloadError`, `InvalidCrcError`, `NotVietQrError` and
`ImageDecodeError`.

## API quick start

```bash
uv run vietqr-api
```

The server listens on `127.0.0.1:8000`; interactive documentation is at
<http://127.0.0.1:8000/docs>. All examples below use this base URL:

```bash
B=http://127.0.0.1:8000/api/v1/vietqr-core
```

Render a payment card as PNG (all four parameters are required):

```bash
curl -o card.png "$B/image?bankBin=970422&accountNo=056789799999&amount=50000&description=Ung+ho+quy"
```

Get the payload and a Data URL instead of an image:

```bash
curl -X POST "$B/generate" -H "Content-Type: application/json" \
  -d '{"bankBin":"970422","accountNo":"056789799999","amount":"50000","description":"Ung ho quy","template":"qr_only"}'
# {"code":"00","desc":"success","data":{"qrCode":"0002...","qrDataURL":"data:image/png;base64,..."}}
```

Parse a payload, decode an image, and look up a bank:

```bash
curl -X POST "$B/parse" -H "Content-Type: application/json" -d '{"qrCode":"0002...6304XXXX"}'
curl -F "file=@card.png" "$B/decode"
curl "$B/banks/MB"
```

Parse and decode return the same data, with the amount as a string:

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "bankBin": "970422",
    "accountNo": "056789799999",
    "serviceType": "QRIBFTTA",
    "qrType": "12",
    "isDynamic": true,
    "isValidCrc": true,
    "bankInfo": {"bin": "970422", "code": "MB", "shortName": "MBBank", "name": "...", "logo": "..."},
    "amount": "50000",
    "currency": "704",
    "countryCode": "VN",
    "description": "Ung ho quy",
    "crc": "5C0B"
  }
}
```

## Endpoints

Every route except `/health` lives under `/api/v1/vietqr-core`.

| Method | Path | Purpose |
| :-- | :-- | :-- |
| GET, POST | `/image` | Payment card as `image/png`. Query string for GET, JSON body for POST. |
| GET, POST | `/generate` | JSON with the payload (`qrCode`) and the PNG as a Data URL (`qrDataURL`). |
| POST | `/parse` | Parse a payload string (`{"qrCode": "..."}`). |
| POST | `/decode` | Decode an image: multipart field `file`, or JSON `{"imageBase64": "..."}` (plain Base64 or a `data:` URL). |
| GET | `/banks` | The bank catalog. |
| GET | `/banks/{bin_or_code}` | One bank, by BIN or short code. |
| GET | `/health` | Liveness check (at the root, without the prefix). Returns `{"status": "ok", "version": "<api version>"}`. |

`/image` and `/generate` require `bankBin` and `accountNo`. `amount` and `description` are optional:
without an amount (missing or blank) the QR is static (QR type static, no amount, the payer enters it);
with one it is dynamic. An amount must be a positive whole number, so `0` is rejected (error `02`)
rather than treated as static. They also take
`accountName`, `template` (`compact`, the default, `qr_only` or `print`), `serviceType`,
`billNumber`, `format` (`png` only) and `size` (for `qr_only`). The full schema is in `/docs`.

## Settings

Environment variables, read when the server starts:

| Variable | Default | Meaning |
| :-- | :-- | :-- |
| `VIETQR_HOST` | `127.0.0.1` | Interface to bind. Loopback by default so a dev server is not exposed by accident. |
| `VIETQR_PORT` | `8000` | Port to listen on (1-65535). |
| `VIETQR_ASSETS_DIR` | unset | Directory with brand assets (see below). Unset: cards render without logos. |
| `VIETQR_DOCS_ENABLED` | `true` | Serve `/docs`, `/redoc` and `/openapi.json`. |
| `VIETQR_MAX_UPLOAD_BYTES` | `8388608` (8 MiB) | Maximum request body of `POST /decode`; larger bodies get 413. |
| `VIETQR_MAX_IMAGE_PIXELS` | `25000000` | Maximum decoded size (width x height) of an uploaded image. |

The `vietqr-core` library ships no brand images. The API's brand images live in
`packages/vietqr-api/assets/` (the Docker image sets `VIETQR_ASSETS_DIR` to them). To use your own,
point `VIETQR_ASSETS_DIR` at a directory laid out as:

```text
vietqr.png
vietqr_icon.png
napas247.png
logos/<BIN>.png
```

Every file is optional; a missing one is skipped.

## Error codes

Every failure is `{"code": "...", "desc": "...", "data": null}`; success has code `00`.

| Code | Meaning | HTTP status |
| :-- | :-- | :-- |
| `01` | Missing required parameter | 400 |
| `02` | Invalid amount | 400 |
| `03` | Invalid parameter (bad value, malformed body, failed validation) | 400; 413 body too large; 415 unsupported content type |
| `04` | Bank not found | 400 on `/image` and `/generate`; 404 on `/banks/{bin_or_code}` |
| `05` | Unsupported option (template or format) | 400 |
| `06` | Image could not be decoded, or holds no VietQR code | 400 |
| `07` | Payload is not a valid VietQR / EMVCo string | 400 |
| `99` | Internal error (details are logged, never returned) | 500 |

## Web client settings

`vietqr-web` reads these at server start, so one image serves every deployment; invalid values stop
the server with a clear error. The full list with comments is in
[`packages/vietqr-web/.env.example`](packages/vietqr-web/.env.example).

| Variable | Default | Meaning |
| :-- | :-- | :-- |
| `VIETQR_API_URL` | required | Base URL of `vietqr-api`. Server-side only; browsers reach the API through the web app's `/api/*` proxy. Compose sets it to `http://api:8080`. |
| `VIETQR_MAX_UPLOAD_BYTES` | `8388608` (8 MiB) | Largest body the proxy accepts. Keep equal to the API's setting of the same name. |
| `VIETQR_LOGO_HOSTS` | derived | Hosts the same-origin logo route may fetch bank logos from. Default: hosts of the catalog's logo URLs. |
| `VIETQR_APP_NAME` | `VietQR` | Product name in the header and page title. |
| `VIETQR_APP_LOGO` | none | Logo URL, or a path under `public/`. |
| `VIETQR_LOCALES` | `vi,en` | Enabled locales. |
| `VIETQR_DEFAULT_LOCALE` | first of `VIETQR_LOCALES` | Must be one of the enabled locales. |
| `VIETQR_DEFAULT_TEMPLATE` | `compact` | `compact`, `print` or `qr_only`. |
| `VIETQR_ENABLED_PAGES` | `studio,inspect,banks` | Any of `studio` (served at `/`), `inspect`, `banks`, `pay`. |
| `VIETQR_FOOTER_LINKS` | none | `Label\|URL` pairs separated by semicolons. |

`pay` is off by default: anyone can craft a Pay link (`/pay?bank=...&account=...`) for any account,
so operators opt in. The Pay page is served with `Referrer-Policy: no-referrer` and `noindex`.

## Docker

Both packages have a Dockerfile. `docker compose up --build` (above) runs them together. The API
image can also run alone:

```bash
docker build -t vietqr-api .
docker run --rm -p 8080:8080 vietqr-api
curl http://127.0.0.1:8080/health
```

The API image listens on `0.0.0.0:8080` (set through `VIETQR_HOST` and `VIETQR_PORT`) and runs as an
unprivileged user with uid 10001. The image bundles `packages/vietqr-api/assets/` at `/app/assets`
and sets `VIETQR_ASSETS_DIR` to it. To use your own brand assets instead, mount them read-only; the
directory must be readable by that uid:

```bash
docker run --rm -p 8080:8080 \
  -v "$PWD/assets:/assets:ro" -e VIETQR_ASSETS_DIR=/assets vietqr-api
```

## Limitations and behavior notes

- Output is PNG only: any other `format` is rejected with code `03`. There is no WebP or SVG output
  and no custom center logo.
- The payload builder does not write tags 59 and 60 (merchant name and city).
- There is no rate limiting, HTTPS redirect, Deeplink API, diagnostics endpoints or landing page,
  and only `/health` exists (no `/health/live` or `/health/ready`).
- `POST /decode` rejects a request with two or more uploaded files (400, code `03`). In JSON, only
  strings starting with `data:` are treated as Data URLs, and an empty body returns code `01`.
- CORS allows any origin. The web client does not rely on it: it calls the API through its own
  same-origin proxy (ADR 0002).
- The web client stores nothing (no accounts, history or browser storage of payment details). A Pay
  link is the only way to keep a QR (ADR 0001).

## Development

```bash
uv sync
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
uv run mypy packages/vietqr-core/src packages/vietqr-api/src
```

Web client (from `packages/vietqr-web`):

```bash
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test          # unit tests
pnpm api:check     # generated API client matches the API's OpenAPI schema
pnpm i18n:check    # locale files have the same keys
pnpm test:e2e      # Playwright + axe; needs a running API (E2E_API_URL)
```

After changing the API's schema, run `pnpm api:generate` to refresh the generated client.

The same commands run in CI (`.github/workflows/ci.yml`).

## Disclaimer

`VietQR` and `NAPAS247` are trademarks of NAPAS (Vietnam National Payment Corporation). The VietQR,
NAPAS247 and bank logos in `packages/vietqr-api/assets/` belong to their respective owners and are
not covered by the MIT license. This is an
independent open-source project, not an official NAPAS product, and the payload format follows
NAPAS's public specification and EMVCo's QR specification. The software is provided "as is": whoever
deploys it is responsible for the accuracy of the payment data (bank code, account number, amount)
encoded into every QR code, and the authors accept no liability for misdirected transfers or
financial loss.

## License

[MIT](LICENSE)
