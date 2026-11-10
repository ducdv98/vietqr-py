import pytest

from vietqr_core.rendering.assets import MAX_ASSET_BYTES, AssetProvider, DirectoryAssetProvider


@pytest.fixture
def root(tmp_path):
    folder = tmp_path / "assets"
    (folder / "logos").mkdir(parents=True)
    (folder / "vietqr.png").write_bytes(b"header")
    (folder / "logos" / "970422.png").write_bytes(b"mb")
    (tmp_path / "secret.txt").write_bytes(b"secret")
    return folder


def test_loads_a_file_from_the_root(root):
    assert DirectoryAssetProvider(root).load("vietqr.png") == b"header"


def test_loads_a_file_from_a_subfolder(root):
    assert DirectoryAssetProvider(root).load("logos/970422.png") == b"mb"


def test_accepts_a_string_root(root):
    assert DirectoryAssetProvider(str(root)).load("vietqr.png") == b"header"


@pytest.mark.parametrize("name", ["missing.png", "logos/000000.png", "logos", "nope/vietqr.png"])
def test_missing_file_gives_none(root, name):
    assert DirectoryAssetProvider(root).load(name) is None


@pytest.mark.parametrize(
    "name",
    [
        "../secret.txt",
        "logos/../../secret.txt",
        "..",
        ".",
        "",
        "/vietqr.png",
        "logos//970422.png",
        ".hidden",
        "logos\\970422.png",
        "C:vietqr.png",
        "vietqr.png\x00",
        "vietqr.png ",
    ],
)
def test_unsafe_names_give_none(root, name):
    assert DirectoryAssetProvider(root).load(name) is None


def test_absolute_path_to_a_real_file_is_refused(root, tmp_path):
    assert DirectoryAssetProvider(root).load(str(tmp_path / "secret.txt")) is None


def test_symlink_pointing_outside_the_root_is_refused(root, tmp_path):
    link = root / "link.png"
    try:
        link.symlink_to(tmp_path / "secret.txt")
    except OSError:
        pytest.skip("cannot create symlinks on this system")
    assert DirectoryAssetProvider(root).load("link.png") is None


def test_file_over_the_size_limit_gives_none(root):
    (root / "big.png").write_bytes(b"x" * (MAX_ASSET_BYTES + 1))
    (root / "limit.png").write_bytes(b"x" * MAX_ASSET_BYTES)
    provider = DirectoryAssetProvider(root)
    assert provider.load("big.png") is None
    assert provider.load("limit.png") is not None


def test_any_object_with_load_is_an_asset_provider():
    class Fake:
        def load(self, name: str) -> bytes | None:
            return name.encode()

    provider: AssetProvider = Fake()
    assert provider.load("a") == b"a"
