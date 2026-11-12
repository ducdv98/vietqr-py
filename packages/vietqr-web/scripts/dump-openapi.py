"""Print the vietqr-api OpenAPI document as stable JSON (run through `uv run`)."""

import json

from vietqr_api.app import create_app

print(json.dumps(create_app().openapi(), indent=2, sort_keys=True))
