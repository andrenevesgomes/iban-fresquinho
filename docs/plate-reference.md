# Licence plate reference

References checked on 2026-10-23.

Matrícula Fresquinha generates Portuguese car registration numbers in the format that was in use in the month of first registration, together with fictitious but plausible vehicle data (displacement, power, fuel). Nothing is looked up.

## Formats by first registration

| Format     | First registration           | Letters                    | Plate design                          |
| ---------- | ---------------------------- | -------------------------- | ------------------------------------- |
| `AA-00-00` | 1937 to February 1992        | 23, reserved groups left out | White on black (`black`)              |
| `00-00-AA` | March 1992 to 2005           | 23                         | Black on white, blue band (`white`); yellow date band from 1998 (`dated`) |
| `00-AA-00` | 2005 to February 2020        | 23                         | Black on white, blue band, yellow date band (`dated`) |
| `AA-00-AA` | March 2020 onwards           | 26                         | Black on white, blue band, no date band (`modern`) |

- The 23-letter alphabet leaves out K, W and Y, which were not part of the Portuguese alphabet when those sequences were defined. The short-lived 1997 `KA`–`KF` series for imported vehicles is not generated.
- 2005 has no known switch month, so a vehicle first registered in 2005 can get either `00-00-AA` or `00-AA-00`.
- The date band shows the year over the month of first registration (for example `10` over `03` for March 2010). IMT removed it in 2020 because Portugal was the only EU country to print it, and abroad the same space usually shows when the registration expires.
- IMT writes the 2020 series without dashes (`AA 01 AA`). The generator keeps the dashes in every format so that all results share one shape; remove them if a form rejects them.

### Rules the generator follows

- No group of digits is all zeros: `AA-00-00`, `00-00-AA` and `00-AA-00` never have `00` in both digit pairs, and the `AA-00-AA` series never has `00` in the middle (the first number issued was `AA-01-AA`).
- In the `AA-00-00` format, the groups reserved for the armed forces, the state, diplomats and temporary licences are left out: `AM`, `AP`, `CC`, `CD`, `EP`, `FM`, `ME`, `MG`, `MX`, `PR` and `TA` to `TH`.
- Letters are random within the format. They do **not** follow the real chronological order of the series, so a plate's letters do not prove its date. Use the date in the result, not the letters.

## Vehicle data

All vehicle data is invented. It is meant to look right to an insurance or registration form, not to describe a real model.

- **Fuels:** petrol (`Gasolina`), diesel (`Gasóleo`) and, from 2000, hybrid (`Híbrido`). Electric cars, motorcycles, trailers and special plates (military, diplomatic, export, dealer) are not generated.
- **Displacement:** 600 to 6500 cm³. Diesel starts at 1200 cm³ and hybrid at 1000 cm³, so engines under 1000 cm³ are always petrol.
- **Power:** 30 to 650 cv, derived from displacement through a plausible output per litre:

| Fuel     | cv per litre | Era caps                                  |
| -------- | ------------ | ----------------------------------------- |
| Gasolina | 45–115       | 75 before 1990, 100 before 2005           |
| Gasóleo  | 40–95        | 50 before 1990, 65 before 2000, 80 before 2005 |
| Híbrido  | 55–100       | None (only from 2000)                     |

### Defaults and filters

| Filter               | Empty means                                 | Accepts                         |
| -------------------- | ------------------------------------------- | ------------------------------- |
| Month                | Any month                                   | January to December             |
| Year                 | 2000 to the current year                    | 1937 to the current year        |
| Displacement min/max | 900–2500 cm³ while no engine filter is set  | 600–6500 cm³, min ≤ max         |
| Power min/max        | Whatever the displacement allows            | 30–650 cv, min ≤ max            |

- First registration is never in the future: with a month and no year, months after the current one in the current year are skipped.
- Setting any displacement or power filter opens displacement to the full 600–6500 cm³, so a request such as "at least 400 cv" can be met.
- Months in which no fuel can meet the engine filters are dropped. For example, 1000 cm³ with at least 110 cv only exists from 2005 (petrol).
- Invalid filters and impossible combinations throw `VehicleFilterError` naming what to change: `year`, `month`, `displacement`, `power` or `combination`. The interface marks those fields and keeps the previous results.

## API contract (`src/plate.ts`)

- `platesErasFor(date)` returns the formats in use for a `{ year, month }`; two in 2005, one otherwise.
- `plateStyle(date)` returns the plate design: `black`, `white`, `dated` or `modern`.
- `plateEra(value)` returns the format of a value this generator could produce, or `null` for anything malformed, reserved or excluded (wrong alphabet, all-zero digits, reserved group). It is a check of this generator's output, not a registry check.
- `createPlate(date)` returns `{ plate, era }` with no loops, so it always ends, even with a mocked `Math.random`.
- `specificPowerRange(fuel, date)` returns the cv-per-litre range used for that fuel and year.
- `resolveVehicleFilters(filters, now)` validates the filters before any randomness is used and throws `VehicleFilterError` (a `RangeError` with a `field`). It returns the allowed months, displacement and power.
- `createVehicle(filters, now)` and `createMultipleVehicles(count, filters, now)` return `{ plate, era, firstRegistration, displacement, power, fuel }`. Batches take 1 to 100, are unique by plate, and give up after `count × 10` attempts instead of returning a partial batch.
- `now` is a parameter so tests can fix the current month.

## Real vehicles

Almost every combination of the older formats has already been issued, and the current one is being issued now. **A generated plate may belong to a real vehicle with different data.** Do not use the output to identify a vehicle, look up an owner or file a real claim. Use only in authorised test environments.

## Sources

- [Wikipedia: Vehicle registration plates of Portugal](https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Portugal): format dates, the 2005 and 2020 transitions, the `AA-01-AA` start, K/W/Y, reserved 1937 groups, plate colours and the date band.
- [Wikipédia: Matrículas de automóveis em Portugal](https://pt.wikipedia.org/wiki/Matr%C3%ADculas_de_autom%C3%B3veis_em_Portugal): the same history in Portuguese.
- [IMT FAQ on the 2020 registration rules (archived)](https://web.archive.org/web/20200929140747/http://www.imt-ip.pt/sites/IMTT/Portugues/Paginas/FAQs-diploma-altera-regulamento-matricula.aspx): the `AA 01 AA` series without dashes, the removal of the date band and why, and the expected 45-year lifetime of the series.
- [Letter sequences by year](http://www.bmw2002ti.eu/matriculas.htm) and [monthly series 1956–2015 (archived)](https://web.archive.org/web/20160623052802/http://www.comofazer.pt/series-mensais-de-matriculas-saber-o-mes-e-ano-de-determinada-matricula-automovel/): the real chronological order, which this generator deliberately does not reproduce.

Wikipedia and enthusiast sites are secondary sources. No official IMT table of every series was found; if one is published, prefer it and update this page.

The engine model is a deliberate simplification based on typical outputs per litre, not on a vehicle database.
