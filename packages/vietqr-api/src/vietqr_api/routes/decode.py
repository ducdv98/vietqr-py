"""Route that reads a VietQR code out of an uploaded image."""

from typing import Any

from fastapi import APIRouter

from vietqr_api.deps import CatalogDep, SettingsDep
from vietqr_api.errors import ApiError, ErrorCode
from vietqr_api.models import ApiResponse, DecodeRequest, VietQrInfoModel
from vietqr_api.routes.common import API_PREFIX
from vietqr_api.uploads import ImageBytesDep
from vietqr_core.errors import VietQrError
from vietqr_core.parsing.decoder import decode_image

router = APIRouter(prefix=API_PREFIX)

# The body is read by hand (it can be multipart or JSON), so FastAPI cannot infer it for /docs.
REQUEST_BODY: dict[str, Any] = {
    "requestBody": {
        "required": True,
        "content": {
            "multipart/form-data": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "file": {
                            "type": "string",
                            "format": "binary",
                            "description": "Image with the QR code (PNG, JPEG, WebP, BMP, GIF).",
                        }
                    },
                    "required": ["file"],
                }
            },
            "application/json": {"schema": DecodeRequest.model_json_schema()},
        },
    }
}


@router.post("/decode", openapi_extra=REQUEST_BODY)
def decode(
    image: ImageBytesDep, catalog: CatalogDep, settings: SettingsDep
) -> ApiResponse[VietQrInfoModel]:
    if not image:
        raise ApiError(
            ErrorCode.MISSING_PARAMETER,
            "Upload an image as form-data, or send an 'imageBase64' field in a JSON body.",
        )

    try:
        info = decode_image(image, catalog=catalog, max_pixels=settings.max_image_pixels)
    except VietQrError as exc:
        raise ApiError(
            ErrorCode.DECODE_FAILED,
            f"Could not decode the image, or it does not hold a standard VietQR code. Error: {exc}",
        ) from exc

    return ApiResponse(data=VietQrInfoModel.from_info(info))
