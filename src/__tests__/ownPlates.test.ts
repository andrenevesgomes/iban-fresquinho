import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_OWN_PLATES,
  normalisePlate,
  ownPlatesTemplate,
  parseOwnPlates,
  pickOwnVehicles,
} from '../ownPlates';
import { VehicleFilterError } from '../plate';
import { CATALOGUE, typicalPrice } from '../vehicles';

const NOW = new Date(2026, 9, 29);
const HEADER = 'Matrícula;Marca;Modelo;Versão;Combustível;cm³;cv;Mês;Ano;Preço';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('normalisePlate', () => {
  it.each([
    ['AB-12-CD', 'AB-12-CD', 'AA-00-AA'],
    ['ab 12 cd', 'AB-12-CD', 'AA-00-AA'],
    ['AB12CD', 'AB-12-CD', 'AA-00-AA'],
    ['12.AB.34', '12-AB-34', '00-AA-00'],
    ['12-34-KA', '12-34-KA', '00-00-AA'],
    ['MG-01-01', 'MG-01-01', 'AA-00-00'],
  ])('reads %s as %s', (input, plate, era) => {
    expect(normalisePlate(input)).toEqual({ plate, era });
  });

  it.each(['A1-23-BC', 'ABC-123', 'AB-12-C', '12-12-12', 'AB-CD-EF', ''])('rejects %s', (input) => {
    expect(normalisePlate(input)).toBeNull();
  });
});

describe('parseOwnPlates', () => {
  it('reads the template columns and skips rows without a plate', () => {
    const text = [
      HEADER,
      'AB-12-CD;SEAT;Ibiza;1.0 TSI;Gasolina;999;95;6;2021;12500',
      ';Fiat;500;1.2 69;Gasolina;1242;69;;;',
      '',
      '12-ab-34;Renault;Clio;1.5 dCi 90;Diesel;1461;90;3;2015;"7 250 €"',
    ].join('\r\n');
    const { vehicles, errors } = parseOwnPlates(text, NOW);
    expect(errors).toEqual([]);
    expect(vehicles).toEqual([
      {
        plate: 'AB-12-CD',
        era: 'AA-00-AA',
        firstRegistration: { year: 2021, month: 6 },
        make: 'SEAT',
        model: 'Ibiza',
        version: '1.0 TSI',
        fuel: 'Gasolina',
        displacement: 999,
        power: 95,
        price: 12500,
      },
      {
        plate: '12-AB-34',
        era: '00-AA-00',
        firstRegistration: { year: 2015, month: 3 },
        make: 'Renault',
        model: 'Clio',
        version: '1.5 dCi 90',
        fuel: 'Gasóleo',
        displacement: 1461,
        power: 90,
        price: 7250,
      },
    ]);
  });

  it('accepts the downloaded template with a BOM, the extra column and Excel tab paste', () => {
    const filled = ownPlatesTemplate().replace(
      ';SEAT;Ibiza;1.0 TSI;Gasolina;999;95;;;;2017-2026',
      'AA-01-AA;SEAT;Ibiza;1.0 TSI;Gasolina;999;95;1;2024;;2017-2026'
    );
    expect(parseOwnPlates(filled, NOW).vehicles.map(({ plate }) => plate)).toEqual(['AA-01-AA']);
    const pasted = 'AA-01-AA\tSEAT\tIbiza\t1.0 TSI\tGasolina\t999\t95\t1\t2024\t';
    expect(parseOwnPlates(pasted, NOW).vehicles).toHaveLength(1);
  });

  it('fills a missing price from the catalogue when the version matches', () => {
    const ibiza = CATALOGUE.find(({ make, version }) => make === 'SEAT' && version === '1.0 TSI')!;
    const [vehicle] = parseOwnPlates(
      `${HEADER}\nAA-01-AA;seat;ibiza;1.0 tsi;Gasolina;999;95;1;2024;`,
      NOW
    ).vehicles;
    expect(vehicle!.price).toBe(
      Math.round(typicalPrice(ibiza, { year: 2024, month: 1 }) / 50) * 50
    );
    const [unknown] = parseOwnPlates(
      `${HEADER}\nAA-01-AA;Lada;Niva;1.7;Gasolina;1690;80;1;2010;`,
      NOW
    ).vehicles;
    expect(unknown!.price).toBeNull();
  });

  it('reports each invalid row with its line number and keeps the valid ones', () => {
    const text = [
      HEADER,
      'XX;SEAT;Ibiza;;Gasolina;999;95;1;2020;',
      'AB-12-CD;;Ibiza;;Gasolina;999;95;1;2020;',
      'AB-12-CE;SEAT;Ibiza;;Elétrico;999;95;1;2020;',
      'AB-12-CF;SEAT;Ibiza;;Gasolina;99;95;1;2020;',
      'AB-12-CG;SEAT;Ibiza;;Gasolina;999;9999;1;2020;',
      'AB-12-CH;SEAT;Ibiza;;Gasolina;999;95;12;2026;',
      'AB-12-CI;SEAT;Ibiza;;Gasolina;999;95;1;2020;caro',
      'AB-12-CJ;SEAT;Ibiza;;Gasolina;999;95;1;2020;',
      'AB 12 CJ;SEAT;Ibiza;;Gasolina;999;95;1;2020;',
    ].join('\n');
    const { vehicles, errors } = parseOwnPlates(text, NOW);
    expect(vehicles.map(({ plate }) => plate)).toEqual(['AB-12-CJ']);
    expect(errors.map((message) => message.split(':')[0])).toEqual([
      'Linha 2',
      'Linha 3',
      'Linha 4',
      'Linha 5',
      'Linha 6',
      'Linha 7',
      'Linha 8',
      'Linha 10',
    ]);
    expect(errors.at(-1)).toContain('repetida');
  });

  it('names missing header columns', () => {
    expect(parseOwnPlates('Matrícula;Marca\nAB-12-CD;SEAT', NOW).errors[0]).toContain(
      'Modelo, Combustível, cm³, cv, Mês, Ano'
    );
  });

  it('returns nothing for empty text and refuses oversized lists', () => {
    expect(parseOwnPlates('', NOW)).toEqual({ vehicles: [], errors: [] });
    const rows = Array.from({ length: MAX_OWN_PLATES + 1 }, (_, index) => {
      const letters = String.fromCharCode(
        65 + Math.floor(index / 2600),
        65 + (Math.floor(index / 100) % 26)
      );
      return `${letters}-${String(index % 100).padStart(2, '0')}-AA;SEAT;Ibiza;;Gasolina;999;95;1;2020;`;
    });
    expect(parseOwnPlates(rows.join('\n'), NOW).errors[0]).toContain(String(MAX_OWN_PLATES));
  });
});

describe('pickOwnVehicles', () => {
  const { vehicles } = parseOwnPlates(
    [
      HEADER,
      'AA-01-AA;SEAT;Ibiza;1.0 TSI;Gasolina;999;95;1;2024;',
      '12-AB-34;Renault;Clio;1.5 dCi 90;Gasóleo;1461;90;3;2015;',
      '34-CD-56;BMW;Série 3;320d;Gasóleo;1995;184;5;2013;',
    ].join('\n'),
    NOW
  );

  it('keeps only vehicles inside the filters, without repeats', () => {
    expect(pickOwnVehicles(vehicles, 5, { minPower: 100 }, NOW).map(({ plate }) => plate)).toEqual([
      '34-CD-56',
    ]);
    expect(pickOwnVehicles(vehicles, 2, { year: 2024, month: 1 }, NOW)).toHaveLength(1);
    const all = pickOwnVehicles(vehicles, 100, { year: 2015 }, NOW);
    expect(all.map(({ plate }) => plate)).toEqual(['12-AB-34']);
  });

  it('returns at most the requested count in random order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const picked = pickOwnVehicles(vehicles, 2, {}, NOW);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map(({ plate }) => plate)).size).toBe(2);
  });

  it('explains when nothing matches and validates the filters and quantity', () => {
    expect(() => pickOwnVehicles(vehicles, 1, { minPower: 300 }, NOW)).toThrow(VehicleFilterError);
    expect(() => pickOwnVehicles(vehicles, 1, { year: 1900 }, NOW)).toThrow(VehicleFilterError);
    expect(() => pickOwnVehicles(vehicles, 0, {}, NOW)).toThrow(RangeError);
  });
});

describe('plate list files', () => {
  it('keeps data/plates.example.csv equal to the template', () => {
    expect(readFileSync('data/plates.example.csv', 'utf8')).toBe(ownPlatesTemplate());
  });

  // Runs only where the private list exists, so a broken row fails the local test run.
  it.runIf(existsSync('data/plates.csv'))('data/plates.csv has no invalid rows', () => {
    expect(parseOwnPlates(readFileSync('data/plates.csv', 'utf8')).errors).toEqual([]);
  });
});
