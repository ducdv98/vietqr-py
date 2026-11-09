import pytest

from vietqr_core.emv.crc import calculate_crc, generate_crc_code, verify_crc

STATIC_ACCOUNT = (
    "00020101021138570010A00000072701270006970403011200110123456780208QRIBFTTA53037045802VN6304F4E5"
)
STATIC_CARD = (
    "00020101021138600010A00000072701300006970403011697040311012345670208QRIBFTTC"
    "53037045802VN63044F52"
)
DYNAMIC_ACCOUNT = (
    "00020101021238570010A00000072701270006970403011300110123456780208QRIBFTTA"
    "530370454061800005802VN62340107NPS68690819thanh toan don hang63042E2E"
)


def test_standard_check_value():
    assert calculate_crc("123456789") == 0x29B1


def test_empty_input_returns_initial_value():
    assert calculate_crc("") == 0xFFFF


@pytest.mark.parametrize("payload", [STATIC_ACCOUNT, STATIC_CARD, DYNAMIC_ACCOUNT])
def test_spec_examples_generate_expected_crc(payload):
    assert generate_crc_code(payload[:-4]) == payload[-4:]


@pytest.mark.parametrize("payload", [STATIC_ACCOUNT, STATIC_CARD, DYNAMIC_ACCOUNT])
def test_spec_examples_verify(payload):
    assert verify_crc(payload)


def test_verify_accepts_lowercase_crc():
    assert verify_crc(STATIC_ACCOUNT[:-4] + "f4e5")


def test_verify_rejects_changed_data():
    assert not verify_crc(STATIC_ACCOUNT.replace("0123456", "0123457"))


def test_verify_rejects_wrong_crc():
    assert not verify_crc(STATIC_ACCOUNT[:-4] + "0000")


@pytest.mark.parametrize("payload", ["", "6304", "6304000", "XX6304F4E5"])
def test_verify_rejects_malformed(payload):
    assert not verify_crc(payload)


def test_verify_rejects_non_hex_crc():
    assert not verify_crc("6304+1+1")
    assert not verify_crc("00020163040xF4")
