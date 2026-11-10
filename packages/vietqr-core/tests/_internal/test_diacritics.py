import unicodedata

import pytest

from vietqr_core._internal.diacritics import normalize


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("Nguyễn Văn Ánh", "Nguyen Van Anh"),
        ("Đặng Thị Hồng", "Dang Thi Hong"),
        ("đường", "duong"),
        ("àáảãạ", "aaaaa"),
        ("ờứ", "ou"),
        ("Hello 123", "Hello 123"),
        ("café", "cafe"),
        ("€", "€"),
        ("", ""),
        ("   ", ""),
        ("a\x00b", "ab"),
        ("a\tb", "ab"),
        ("  Ánh ", "  Anh "),
    ],
)
def test_normalize(source, expected):
    assert normalize(source) == expected


@pytest.mark.parametrize("form", ["NFC", "NFD"])
def test_same_result_for_both_unicode_forms(form):
    text = unicodedata.normalize(form, "Nguyễn Đặng Thị Hồng")
    assert normalize(text) == "Nguyen Dang Thi Hong"
