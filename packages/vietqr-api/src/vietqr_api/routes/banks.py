"""Routes over the bank catalog."""

from fastapi import APIRouter, Response

from vietqr_api.deps import CatalogDep
from vietqr_api.errors import ApiError, ErrorCode
from vietqr_api.models import ApiResponse, BankModel
from vietqr_api.routes.common import API_PREFIX, CACHE_CONTROL

router = APIRouter(prefix=API_PREFIX)


@router.get("/banks")
def list_banks(response: Response, catalog: CatalogDep) -> ApiResponse[list[BankModel]]:
    response.headers["Cache-Control"] = CACHE_CONTROL
    return ApiResponse(data=[BankModel.from_bank(bank) for bank in catalog.all_banks()])


@router.get("/banks/{bin_or_code}")
def get_bank(bin_or_code: str, catalog: CatalogDep) -> ApiResponse[BankModel]:
    bank = catalog.find(bin_or_code)
    if bank is None:
        raise ApiError(
            ErrorCode.BANK_NOT_FOUND,
            f"No bank found for: {bin_or_code}.",
            status_code=404,
        )
    return ApiResponse(data=BankModel.from_bank(bank))
