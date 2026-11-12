# vietqr-core

Python library for VietQR (NAPAS247 / EMVCo) payments: build and parse payment payloads, render
QR images and payment cards, and read QR codes back from images. It runs fully offline and ships
a bundled bank catalog.

## Install

The package is not published to PyPI yet. From a checkout of the repository:

```bash
uv sync
```

## Example

```python
from vietqr_core.emv.payload import build_payload
from vietqr_core.emv.request import VietQrRequest
from vietqr_core.parsing.parser import parse_payload

payload = build_payload(
    VietQrRequest(
        bin_code="970422",
        account_no="056789799999",
        amount=50000,
        description="Ung ho quy",
    )
)
info = parse_payload(payload)
print(info.bank_bin, info.account_no, info.amount)
```

Images are produced by `vietqr_core.rendering` (`render_qr_png`, `render_card_png`,
`render_print_png`) and read back with `vietqr_core.parsing.decoder.decode_image`.

See the repository README for the HTTP API, the web client, Docker usage and the full documentation.
