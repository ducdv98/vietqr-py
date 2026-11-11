"""Routes that build a VietQR payload and render it as a PNG card."""

import base64
import re
from typing import Annotated, Any

from fastapi import APIRouter, Query, Response

from vietqr_api.deps import AssetsDep, CatalogDep
from vietqr_api.models import ApiResponse, GenerateRequest, GenerateResult
from vietqr_api.routes.common import API_PREFIX, CACHE_CONTROL
from vietqr_api.service import Prepared, prepare
from vietqr_core.rendering.assets import AssetProvider
from vietqr_core.rendering.card import render_card_png
from vietqr_core.rendering.print_card import render_print_png
from vietqr_core.rendering.qr_only import render_qr_png

router = APIRouter(prefix=API_PREFIX)

PNG_MEDIA_TYPE = "image/png"
PNG_RESPONSE: dict[int | str, dict[str, Any]] = {
    200: {"content": {PNG_MEDIA_TYPE: {}}, "description": "The card as a PNG."}
}

_UNSAFE_FILENAME_CHARS = re.compile(r"[^0-9A-Za-z_-]")


def render_png(prepared: Prepared, assets: AssetProvider | None) -> bytes:
    match prepared.template:
        case "compact":
            return render_card_png(prepared.payload, bank=prepared.bank, assets=assets)
        case "qr_only":
            return render_qr_png(prepared.payload, size=prepared.size)
        case "print":
            return render_print_png(
                prepared.payload, prepared.details, bank=prepared.bank, assets=assets
            )


def _filename(prepared: Prepared) -> str:
    account = _UNSAFE_FILENAME_CHARS.sub("", prepared.details.account_no or "")
    return f"vietqr-{prepared.bank.bin}-{account}.png"


def _image_response(prepared: Prepared, assets: AssetProvider | None, *, cache: bool) -> Response:
    headers = {"Content-Disposition": f'inline; filename="{_filename(prepared)}"'}
    if cache:
        headers["Cache-Control"] = CACHE_CONTROL
    return Response(render_png(prepared, assets), media_type=PNG_MEDIA_TYPE, headers=headers)


def _generate_result(prepared: Prepared, assets: AssetProvider | None) -> GenerateResult:
    encoded = base64.b64encode(render_png(prepared, assets)).decode("ascii")
    return GenerateResult(
        qr_code=prepared.payload, qrDataURL=f"data:{PNG_MEDIA_TYPE};base64,{encoded}"
    )


@router.get("/image", response_class=Response, responses=PNG_RESPONSE)
def get_image(
    request: Annotated[GenerateRequest, Query()], catalog: CatalogDep, assets: AssetsDep
) -> Response:
    return _image_response(prepare(request, catalog), assets, cache=True)


@router.post("/image", response_class=Response, responses=PNG_RESPONSE)
def post_image(request: GenerateRequest, catalog: CatalogDep, assets: AssetsDep) -> Response:
    return _image_response(prepare(request, catalog), assets, cache=False)


@router.get("/generate")
def get_generate(
    request: Annotated[GenerateRequest, Query()],
    response: Response,
    catalog: CatalogDep,
    assets: AssetsDep,
) -> ApiResponse[GenerateResult]:
    response.headers["Cache-Control"] = CACHE_CONTROL
    return ApiResponse(data=_generate_result(prepare(request, catalog), assets))


@router.post("/generate")
def post_generate(
    request: GenerateRequest, catalog: CatalogDep, assets: AssetsDep
) -> ApiResponse[GenerateResult]:
    return ApiResponse(data=_generate_result(prepare(request, catalog), assets))
