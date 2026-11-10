"""Remove Vietnamese diacritics so free text is safe for banking systems."""

import unicodedata


def _is_control(char: str) -> bool:
    return unicodedata.category(char) == "Cc"


def normalize(text: str) -> str:
    if not text.strip():
        return ""

    if text.isascii() and not any(_is_control(c) for c in text):
        return text

    decomposed = unicodedata.normalize("NFD", text)

    kept: list[str] = []
    for char in decomposed:
        if _is_control(char):
            continue
        if char == "đ":
            kept.append("d")
            continue
        if char == "Đ":
            kept.append("D")
            continue
        if unicodedata.category(char) == "Mn":
            continue
        kept.append(char)

    return unicodedata.normalize("NFC", "".join(kept))
