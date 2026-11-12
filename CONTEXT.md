# VietQR

Vocabulary for the VietQR toolkit: the core library, the HTTP API, and the web client.

## Language

**Payload**:
The EMVCo text string that a VietQR code encodes, ending in a CRC16 checksum.
_Avoid_: QR string, QR content, raw code

**QR type**:
Whether a Payload is **static** (no fixed amount; the payer enters it) or **dynamic** (carries an amount). In Studio the user chooses it up front; the API derives it from whether an amount is present.
_Avoid_: QR mode

**Service type**:
Whether the transfer targets a bank **account** or a bank **card**.

**Bank**:
An entry in the bundled catalog, identified by its **BIN** or its short **code**.
_Avoid_: Issuer, institution

**Template**:
A rendering layout for a QR image: `compact` (payment card), `print` (counter/POS sheet), or `qr_only`.
_Avoid_: Style, theme, layout

**Card image**:
The PNG produced by rendering a Payload with a Template. Not to be confused with a bank **card** (a Service type).

**Parse**:
Turn a Payload string into structured payment data.

**Decode**:
Read a QR image and recover its Payload, then Parse it.

**Inspect**:
The web client's single job of telling a user what a QR says, from either a pasted Payload (Parse) or an uploaded image (Decode).

**Studio**:
The web client's merchant-facing flow for creating a QR: choose a QR type, choose a Bank, enter payment details, pick a Template, and explicitly **Generate** to get a Card image. A result is never produced as a side effect of typing.

**Pay link**:
A web client URL that encodes payment details in its query string and opens a payer-facing page showing the QR. It is the client's only form of "saving" a QR, since the system stores nothing.
_Avoid_: Share link, payment page

## Relationships

- A **Payload** is built from payment details (Bank, account, optional amount and description) and has exactly one **QR type** and one **Service type**.
- A dynamic **Payload** requires an amount; a static one has none.
- A **Card image** is a **Payload** rendered with one **Template**.
- A **Pay link** reproduces the same payment details as the **Studio** form.
- **Inspect** is the union of **Parse** and **Decode**.
