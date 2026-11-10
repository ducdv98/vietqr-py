"""Where the card renderer finds its images (logos): a small plug-in interface."""

import re
from pathlib import Path
from typing import Protocol

MAX_ASSET_BYTES = 2 * 1024 * 1024

# One path segment: starts with a letter, digit or underscore, so "." and ".." never match.
_SAFE_SEGMENT = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.-]*")


class AssetProvider(Protocol):
    def load(self, name: str) -> bytes | None: ...


class DirectoryAssetProvider:
    def __init__(self, root: str | Path) -> None:
        self._root = Path(root).resolve()

    def load(self, name: str) -> bytes | None:
        segments = name.split("/")
        if not all(_SAFE_SEGMENT.fullmatch(segment) for segment in segments):
            return None

        path = self._root.joinpath(*segments).resolve()
        if not path.is_relative_to(self._root):
            return None

        try:
            with path.open("rb") as file:
                data = file.read(MAX_ASSET_BYTES + 1)
        except OSError:
            return None
        return data if len(data) <= MAX_ASSET_BYTES else None
