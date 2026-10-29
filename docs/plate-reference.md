# Licence plate reference

References checked on 2026-10-23; vehicle catalogue and prices on 2026-10-29.

Matrícula Fresquinha generates Portuguese car registration numbers in the format that was in use in the month of first registration, paired with a real car version from a built-in catalogue (make, model, version, displacement, power, fuel) and an indicative asking price. Nothing is looked up at run time, and the plate is random: it is not the registration of that car.

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

### How plates are drawn

- Lettering uses Barlow Semi Condensed, an open-licence DIN-style face close to the real plate font, not the official typeface.
- `black`: white characters on black with a raised silver rim and no EU band, as on pre-1992 aluminium plates.
- `white`, `dated` and `modern`: black on white with the blue EU band (12 stars and `P`). `dated` adds the yellow band with the year above a rule and the month below.
- Rear two-line plates, dealer/temporary plates and screw holes are not drawn.

### Rules the generator follows

- No group of digits is all zeros: `AA-00-00`, `00-00-AA` and `00-AA-00` never have `00` in both digit pairs, and the `AA-00-AA` series never has `00` in the middle (the first number issued was `AA-01-AA`).
- In the `AA-00-00` format, the groups reserved for the armed forces, the state, diplomats and temporary licences are left out: `AM`, `AP`, `CC`, `CD`, `EP`, `FM`, `ME`, `MG`, `MX`, `PR` and `TA` to `TH`.
- Letters are random within the format. They do **not** follow the real chronological order of the series, so a plate's letters do not prove its date. Use the date in the result, not the letters.

## Vehicle catalogue (`src/vehicles.ts`)

Each generated vehicle is one row of a catalogue of over 170 versions that are common in Portugal, from the Fiat 600 (1960s) to current hybrids. A row holds make, model, version, fuel (`Gasolina`, `Gasóleo`, `Híbrido`), displacement in cm³, power in cv, the years the version was sold new, and a price anchor. The month and year of first registration are picked within those years.

- **Specs** are factory figures. Where possible they were checked against Wikipedia model and engine pages; the rest match the manufacturer's version name and several used-car listings. Hybrids show combined system power. Mild hybrids are listed as `Gasolina`, as in most listings.
- **Years sold** are approximate European dates, not confirmed Portuguese launch and end dates.
- **Left out:** electric cars, LPG versions, motorcycles, trailers and special plates (military, diplomatic, export, dealer), and versions with no price observations (for example the Peugeot 205 and Opel Corsa A).

### Indicative price

The price is an asking price, not a valuation. It was derived on 2026-10-29 from public used-car search results on Standvirtual (one or two result pages per model, read by hand): only rounded figures were kept, no ads, sellers, locations, mileage or plates.

1. For each version, up to five observed asking prices were noted with their registration year. Most came from dealers, so private sales are usually a little cheaper.
2. A single yearly depreciation rate was fitted across all versions sold after 2000 (log-linear, within each version): **8.2 % a year** (`DEPRECIATION_RATE = 0.0856`).
3. Each version stores an anchor: the fitted typical price for one registration year (`priceYear`, `price`). One outlier (the SEAT Ibiza 1.4 16V, a single €390 listing) was replaced by the Volkswagen Polo 1.2 of the same years.
4. `typicalPrice()` moves the anchor by the rate for each year of difference. Cars older than 20 years stop falling, because old cars plateau or become classics.
5. Each generated vehicle varies by up to ±12 % around that price (`PRICE_SPREAD`) and is rounded to €50.

Prices drift: refresh the anchors and the rate about once a year with the same method, and update the date at the top of this page.

### Defaults and filters

| Filter               | Empty means              | Accepts                    |
| -------------------- | ------------------------ | -------------------------- |
| Month                | Any month                | January to December        |
| Year                 | 2000 to the current year | 1960 to the current year   |
| Displacement min/max | Any                      | 500–6500 cm³, min ≤ max    |
| Power min/max        | Any                      | 20–650 cv, min ≤ max       |

- First registration is never in the future: with a month and no year, months after the current one in the current year are skipped.
- Only versions whose displacement and power fall inside the filters, and that were sold in at least one allowed month, are offered. Each version is equally likely; the month is then picked among its allowed months.
- Invalid filters and impossible combinations throw `VehicleFilterError` naming what to change: `year`, `month`, `displacement`, `power` or `combination` (no catalogue version matches). The interface marks those fields and keeps the previous results.

## Own plates (internal list)

Random plates are not linked to the car shown. To use specific plates, such as test plates supplied by an insurer's data provider, fill an internal list:

1. Copy `data/plates.example.csv` to `data/plates.csv`. The example is the catalogue with an empty `Matrícula` column, in Excel's Portuguese format (UTF-8 with BOM, semicolons).
2. Fill `Matrícula`, `Mês` and `Ano` on the rows you need. Rows without a plate are ignored. `Preço` is optional: when empty and the row matches a catalogue version, the typical price is used. Rows for cars outside the catalogue can be added with any make, model and version.
3. Run `pnpm exec vitest run ownPlates` to check the file, then `pnpm run build`.

The plate can be written with dashes, spaces, dots or nothing (`AB-12-CD`, `AB 12 CD`, `AB12CD`); fuel accepts `Gasolina`, `Gasóleo`/`Diesel` and `Híbrido`. Plates are checked for a Portuguese shape only, not against the generator's era rules, so imports and special series are accepted. If a plate's format does not match the first-registration date (for example a used import), it is drawn in the design of its own format.

When the list has valid rows, the plate tool shows **As minhas (N) | Aleatórias** and starts on the list. The same filters apply; if fewer rows match than requested, all matches are shown in random order and the status says so. Invalid rows are reported with their line numbers in the test and in the browser console, and are left out.

`data/plates.csv` is git-ignored, so it never reaches GitHub or the public Vercel build. It is bundled into any build made on a machine that has it: serve that build only on the internal network, never deploy it publicly.

## API contract (`src/plate.ts`)

- `platesErasFor(date)` returns the formats in use for a `{ year, month }`; two in 2005, one otherwise.
- `plateStyle(date)` returns the plate design: `black`, `white`, `dated` or `modern`.
- `plateEra(value)` returns the format of a value this generator could produce, or `null` for anything malformed, reserved or excluded (wrong alphabet, all-zero digits, reserved group). It is a check of this generator's output, not a registry check.
- `createPlate(date)` returns `{ plate, era }` with no loops, so it always ends, even with a mocked `Math.random`.
- `resolveVehicleFilters(filters, now)` validates the filters before any randomness is used and throws `VehicleFilterError` (a `RangeError` with a `field`). It returns the matching catalogue versions, each with its allowed months.
- `createVehicle(filters, now)` and `createMultipleVehicles(count, filters, now)` return `{ plate, era, firstRegistration, make, model, version, displacement, power, fuel, price }`. Batches take 1 to 100, are unique by plate, and give up after `count × 10` attempts instead of returning a partial batch.
- `now` is a parameter so tests can fix the current month.
- `src/vehicles.ts` exports `CATALOGUE`, `FIRST_CATALOGUE_YEAR`, `typicalPrice(version, date)` and `vehicleName(version)`. Add a version by appending a row; the catalogue tests check ranges, years, duplicates and year coverage.
- `src/ownPlates.ts` exports `parseOwnPlates(text, now)` (returns `{ vehicles, errors }`), `normalisePlate(value)`, `pickOwnVehicles(vehicles, count, filters, now)` and `ownPlatesTemplate()`. `src/ownPlatesData.ts` reads `data/plates.csv` at build time with `import.meta.glob`, which yields nothing when the file is absent. If the catalogue changes, regenerate `data/plates.example.csv` from `ownPlatesTemplate()`; a test fails until they match.

## Real vehicles

Almost every combination of the older formats has already been issued, and the current one is being issued now. **A generated plate may belong to a real vehicle, which is almost certainly not the version shown next to it.** Do not use the output to identify a vehicle, look up an owner or file a real claim. Use only in authorised test environments.

## Sources

- [Wikipedia: Vehicle registration plates of Portugal](https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Portugal): format dates, the 2005 and 2020 transitions, the `AA-01-AA` start, K/W/Y, reserved 1937 groups, plate colours and the date band.
- [Wikipédia: Matrículas de automóveis em Portugal](https://pt.wikipedia.org/wiki/Matr%C3%ADculas_de_autom%C3%B3veis_em_Portugal): the same history in Portuguese.
- [IMT FAQ on the 2020 registration rules (archived)](https://web.archive.org/web/20200929140747/http://www.imt-ip.pt/sites/IMTT/Portugues/Paginas/FAQs-diploma-altera-regulamento-matricula.aspx): the `AA 01 AA` series without dashes, the removal of the date band and why, and the expected 45-year lifetime of the series.
- [Letter sequences by year](http://www.bmw2002ti.eu/matriculas.htm) and [monthly series 1956–2015 (archived)](https://web.archive.org/web/20160623052802/http://www.comofazer.pt/series-mensais-de-matriculas-saber-o-mes-e-ano-de-determinada-matricula-automovel/): the real chronological order, which this generator deliberately does not reproduce.

Wikipedia and enthusiast sites are secondary sources. No official IMT table of every series was found; if one is published, prefer it and update this page.

Vehicle specs: Wikipedia model and engine pages (for example the Volkswagen Group, PSA, Renault K-Type, Nissan HR, Fiat FIRE and JTD, BMW N47, Mercedes OM651 and Hyundai U engine lists). Prices: Standvirtual public search results, read by hand on 2026-10-29 as described above; no listing data is stored.
