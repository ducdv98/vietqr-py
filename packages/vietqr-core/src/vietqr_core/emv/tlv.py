"""TLV (Tag-Length-Value) encoding used by EMVCo / VietQR payloads."""

MAX_VALUE_LENGTH = 99


def _is_two_digits(text: str) -> bool:
    return len(text) == 2 and text.isascii() and text.isdigit()


def encode_tlv(tag: str, value: str | None) -> str:
    if not _is_two_digits(tag):
        raise ValueError(f"TLV tag must be exactly 2 digits, got {tag!r}")
    if not value:
        return ""
    if len(value) > MAX_VALUE_LENGTH:
        raise ValueError(
            f"TLV tag {tag!r}: value is {len(value)} characters, maximum is {MAX_VALUE_LENGTH}"
        )
    return f"{tag}{len(value):02d}{value}"


def decode_tlv(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}

    index = 0
    while index < len(text):
        header_end = index + 4
        if header_end > len(text):
            raise ValueError(f"Truncated TLV header at position {index}")
        tag = text[index:index + 2]
        length_text = text[index + 2:header_end]
        if not _is_two_digits(tag):
            raise ValueError(f"Invalid TLV tag {tag!r} at position {index}")
        if not _is_two_digits(length_text):
            raise ValueError(f"Invalid TLV length {length_text!r} for tag {tag!r}")
        value_end = header_end + int(length_text)
        if value_end > len(text):
            raise ValueError(f"TLV tag {tag!r}: declared length runs past end of data")
        fields[tag] = text[header_end:value_end]
        index = value_end
    return fields
