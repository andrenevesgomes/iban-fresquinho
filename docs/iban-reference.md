# IBAN reference

## Format

A Portuguese IBAN has 25 characters:

```text
PT 50 BBBB SSSS CCCCCCCCCCC KK
│  │  │    │    │           └─ NIB control digits (2)
│  │  │    │    └───────────── Account number (11)
│  │  │    └────────────────── Branch code (4)
│  │  └─────────────────────── Bank code (4)
│  └────────────────────────── IBAN check digits (2)
└───────────────────────────── Country code
```

The 21 digits after `PT50` are the BBAN (the domestic NIB). Values are handled as strings throughout, so leading zeros are never lost.

## Algorithms (`src/iban.ts`)

1. **NIB control digits:** `98 − mod97(bank + branch + account + "00")`, padded to two digits.
2. **IBAN check digits (ISO 13616):** `98 − mod97(BBAN + "PT00")`, where letters become numbers (`A` = 10 … `Z` = 35, so `PT` = `2529`).

`mod97` works one character at a time, so long numbers never exceed safe integer precision.

`validateIBAN` accepts a value only when it starts with `PT50`, has exactly 21 BBAN digits, carries the expected NIB digits and leaves an international remainder of 1. Ordinary spaces and lower-case country letters are tolerated; anything else is rejected. `parseIBAN` and `formatIBAN` validate first.

Generation picks a random branch (4 digits) and account (11 digits) for the chosen bank code and calculates both pairs of check digits. The tests verify the algorithms against a published SWIFT example and an independent `BigInt` calculation.

## Bank catalogue (`src/banks.ts`)

The list of bank codes comes from a dated snapshot of the Banco de Portugal IBAN list, stored in `docs/bank-reference.json`:

| Field    | Value                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| Source   | [Banco de Portugal, ListaIBAN.xls](https://www.bportugal.pt/sites/default/files/documents/2024-01/ListaIBAN.xls) |
| Dated    | 13/10/2026 (retrieved 14/10/2026), with the SHA-256 of the downloaded file                                       |
| Contents | 174 institution rows sharing 107 IBAN bank codes, plus 4 source notes                                            |
| Reuse    | [Banco de Portugal legal notice](https://www.bportugal.pt/page/avisos-legais)                                    |

The snapshot preserves the raw source columns and row numbers. Application decisions are made in `banks.ts`, not in the data:

- **Display names:** well-known banks get a readable alias (for example "Millennium BCP" or "Novo Banco") instead of the legal name. Codes shared by several institutions show all their names, except where an alias exists. Code `0045` is shared by 68 agricultural credit institutions.
- **Default pool:** "Qualquer banco" draws from the 69 codes whose institutions are all banks, savings banks, agricultural credit banks or EU bank branches.
- **Everything else** (the central bank, payment and e-money institutions, and so on) stays selectable in the full list for explicit generation.
- **Transitional code `0079`:** the source says Abanca `0079` IBANs remain valid for a transition period after the move to `0170` on 21/11/2025, with no end date. It is excluded from the default pool as an application choice, not because it is invalid.

`docs/ListaIBAN.xls` and `docs/ListaIBAN.xlsx` are older copies of the workbook kept for history; the JSON file is the source of truth. To refresh the snapshot, follow [maintaining.md](maintaining.md#update-the-bank-list).

## Limits

- A valid IBAN only proves that its check digits are consistent. Branches and accounts are random: nothing confirms that they exist, who owns them or that a payment provider or insurer accepts them.
- A generated value may match a real account. Use generated IBANs only in authorised tests, never for payments.
- Batches contain no duplicates; separate generations can repeat a value.
