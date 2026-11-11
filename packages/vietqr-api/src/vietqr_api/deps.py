"""FastAPI dependencies: the bank catalog and asset provider live on ``app.state``."""

from typing import Annotated

from fastapi import Depends, Request

from vietqr_core.banks.catalog import BankCatalog
from vietqr_core.rendering.assets import AssetProvider


def get_catalog(request: Request) -> BankCatalog:
    catalog: BankCatalog = request.app.state.catalog
    return catalog


def get_assets(request: Request) -> AssetProvider | None:
    assets: AssetProvider | None = request.app.state.assets
    return assets


CatalogDep = Annotated[BankCatalog, Depends(get_catalog)]
AssetsDep = Annotated[AssetProvider | None, Depends(get_assets)]
