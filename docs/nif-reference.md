# NIF reference

References checked on 2026-10-19.

## Format

```text
P SSSSSSS K
│ │       └─ Check digit, modulo 11 (1)
│ └───────── Serial (7)
└─────────── First digit: taxpayer range (1)
```

The first eight digits are weighted 9 down to 2 and summed. If the sum modulo 11 is 0 or 1, the check digit is `0`; otherwise it is 11 minus that remainder.

## Generation scope

| Profile      | Prefixes      | Boundary                                                              |
| ------------ | ------------- | --------------------------------------------------------------------- |
| `individual` | `1`, `2`, `3` | Ordinary individual test data, not every individual range             |
| `company`    | `5`           | A deliberately limited RNPC/NIPC test profile, not all legal entities |

Decree-Law 14/2013, Article 4, defines nine digits for individuals: eight sequential digits and one control digit. It permits first digits 1-4 and identifies `45` as a special non-resident category. The AT's 2019 notice announces range `3`. The generator intentionally excludes range `4`, including `45`, rather than guessing additional allocation rules.

Article 11 says that an RNPC entity's NIF corresponds to its NIPC. Decree-Law 129/98, Article 13, describes nine-digit NIPCs with first digits 5-9 excluding 7, and delegates classification to a separate table. This module chooses only prefix `5`; it does not implement that complete classification table. The profile name is not evidence of a real entity's legal form. Public bodies, non-residents, estates and other special categories are outside generation scope. A sole trader is not a separate company-prefix category: Article 4(5) says an individual does not receive a new NIF merely for carrying on an activity.

## API contract (`src/nif.ts`)

- `calculateNIFCheckDigit(base)` accepts exactly eight ASCII digits as a string. It sums the digits weighted 9 down to 2, then uses modulo 11: remainders 0 and 1 produce `0`; otherwise the result is 11 minus the remainder. Malformed input throws `RangeError`.
- `hasValidNIFChecksum(value)` checks exactly nine ASCII digits, a nonzero first digit and the control digit. It does not check category allocation, registration, ownership, tax status or validity in an external system. No spaces, country prefix, punctuation or numeric coercion are accepted.
- `createNIF(category)` returns `{ nif, category }`. Omitted category means `individual`; unsupported categories throw. Internal serial zeroes are preserved.
- `createMultipleNIFs(count, category)` accepts an integer from 1 to 100. Values are unique within that batch only. It tries at most `count * 10` candidates, then throws instead of returning a partial batch.
- Randomness is for test-data variation, not passwords, secrets or anonymisation. No AT/VIES query, persistence or network access is performed.

Generated values can coincide with assigned NIFs. There is no verified reserved sandbox range here. Use only in authorised test environments; do not use the output as real taxpayer identification.

## Sources and verification

- [Decree-Law 14/2013, original publication, Articles 4 and 11](https://data.dre.pt/eli/dec-lei/14/2013/01/28/p/dre/pt/pdf): structure and individual/entity boundaries, PDF pages 1 and 3. This is the original publication, not a claim of a complete consolidated legal review.
- [AT: new individual NIF range, 8 April 2019](https://info.portaldasfinancas.gov.pt/pt/destaques/Paginas/Atribuicao_Nova_Gama_de_NIF_a_Pessoas_Singulares.aspx): introduction of range `3` and nine-digit structure.
- [Decree-Law 129/98, original publication, Article 13](https://data.dre.pt/eli/dec-lei/129/1998/05/13/p/dre/pt/pdf): NIPC structure and RNPC range boundaries.
- [python-stdnum 2.1 NIF documentation](https://arthurdejong.org/python-stdnum/doc/2.1/stdnum.pt.nif): independent published example `501964843`, with `501964842` rejected. This is a technical reference, not an AT certification. The implementation is local arithmetic; no library source is copied or installed in the app.

Tests cover all 11 checksum remainders, a separate BigInt calculation, malformed values, profile boundaries, batch limits and forced collisions. The published example is only a test vector, not an assertion that the number is unassigned.

How the interface keeps NIF and IBAN state apart is described in [architecture.md](architecture.md#switching-tools).
