import pytest

from vietqr_core.emv.tlv import decode_tlv, encode_tlv

SPEC_TAG38 = "38570010A00000072701270006970468011300110099504460208QRIBFTTA"


@pytest.mark.parametrize(
    ("tag", "value", "expected"),
    [
        ("54", "50000", "540550000"),
        ("00", "01", "000201"),
        ("58", "VN", "5802VN"),
    ],
)
def test_encode(tag, value, expected):
    assert encode_tlv(tag, value) == expected


@pytest.mark.parametrize("value", [None, ""])
def test_encode_empty_value_is_skipped(value):
    assert encode_tlv("54", value) == ""


def test_encode_accepts_99_chars_and_rejects_100():
    assert encode_tlv("62", "a" * 99).startswith("6299")
    with pytest.raises(ValueError):
        encode_tlv("62", "a" * 100)


@pytest.mark.parametrize("tag", ["5", "540", "ab", ""])
def test_encode_rejects_bad_tag(tag):
    with pytest.raises(ValueError):
        encode_tlv(tag, "x")


def test_decode_simple():
    assert decode_tlv("000201010212") == {"00": "01", "01": "12"}


def test_decode_empty_string():
    assert decode_tlv("") == {}


def test_decode_duplicate_tag_last_wins():
    assert decode_tlv("000201000202") == {"00": "02"}


@pytest.mark.parametrize("text", ["0002", "00AB01", "000501", "AB0201"])
def test_decode_rejects_malformed(text):
    with pytest.raises(ValueError):
        decode_tlv(text)


def test_decode_spec_example_nested():
    tag38 = decode_tlv(SPEC_TAG38)["38"]
    inner = decode_tlv(tag38)
    assert inner["00"] == "A000000727"
    assert inner["02"] == "QRIBFTTA"
    beneficiary = decode_tlv(inner["01"])
    assert beneficiary == {"00": "970468", "01": "0011009950446"}


def test_round_trip():
    text = encode_tlv("00", "01") + encode_tlv("54", "50000")
    assert decode_tlv(text) == {"00": "01", "54": "50000"}
