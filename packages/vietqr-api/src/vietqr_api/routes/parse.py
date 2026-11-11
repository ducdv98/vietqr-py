"""Route that turns an EMVCo string into structured VietQR data."""

from fastapi import APIRouter

from vietqr_api.deps import CatalogDep
from vietqr_api.errors import ApiError, ErrorCode
from vietqr_api.models import ApiResponse, ParseRequest, VietQrInfoModel
from vietqr_api.routes.common import API_PREFIX
from vietqr_core.errors import VietQrError
from vietqr_core.parsing.parser import parse_payload

router = APIRouter(prefix=API_PREFIX)


@router.post("/parse")
def parse(body: ParseRequest, catalog: CatalogDep) -> ApiResponse[VietQrInfoModel]:
    text = (body.qr_code or "").strip()
    if not text:
        raise ApiError(ErrorCode.MISSING_PARAMETER, "'qrCode' must not be empty.")

    try:
        info = parse_payload(text, catalog=catalog)
    except VietQrError as exc:
        raise ApiError(
            ErrorCode.INVALID_PAYLOAD,
            f"The string is not a valid VietQR / EMVCo payload. Error: {exc}",
        ) from exc

    return ApiResponse(data=VietQrInfoModel.from_info(info))
