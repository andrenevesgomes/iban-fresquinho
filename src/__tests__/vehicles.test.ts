import { describe, expect, it } from 'vitest';
import { DISPLACEMENT_LIMITS, POWER_LIMITS } from '../plate';
import {
  CATALOGUE,
  DEPRECIATION_RATE,
  FIRST_CATALOGUE_YEAR,
  PRICE_FLOOR_AGE,
  PRICE_REFERENCE_YEAR,
  typicalPrice,
  vehicleName,
  type CatalogueVersion,
} from '../vehicles';

const FUELS = ['Gasolina', 'Gasóleo', 'Híbrido'];

describe('vehicle catalogue', () => {
  it('has plausible, internally consistent rows', () => {
    expect(CATALOGUE.length).toBeGreaterThan(170);
    for (const entry of CATALOGUE) {
      const name = `${vehicleName(entry)} ${entry.from}`;
      expect(FUELS, name).toContain(entry.fuel);
      expect(entry.from, name).toBeLessThanOrEqual(entry.to);
      expect(entry.to, name).toBeLessThanOrEqual(PRICE_REFERENCE_YEAR);
      expect(entry.priceYear, name).toBeGreaterThanOrEqual(entry.from);
      expect(entry.priceYear, name).toBeLessThanOrEqual(entry.to);
      expect(entry.displacement, name).toBeGreaterThanOrEqual(DISPLACEMENT_LIMITS.min);
      expect(entry.displacement, name).toBeLessThanOrEqual(DISPLACEMENT_LIMITS.max);
      expect(entry.power, name).toBeGreaterThanOrEqual(POWER_LIMITS.min);
      expect(entry.power, name).toBeLessThanOrEqual(POWER_LIMITS.max);
      // Plug-in hybrids reach about 150 cv per litre of engine; anything above is a typo.
      expect((entry.power * 1000) / entry.displacement, name).toBeLessThan(160);
      expect((entry.power * 1000) / entry.displacement, name).toBeGreaterThan(25);
      expect(entry.price % 50, name).toBe(0);
      expect(entry.price, name).toBeGreaterThan(0);
      if (entry.fuel === 'Híbrido') expect(entry.from, name).toBeGreaterThanOrEqual(1997);
    }
  });

  it('has no duplicate rows', () => {
    const keys = CATALOGUE.map(
      (entry) => `${vehicleName(entry)}|${entry.displacement}|${entry.power}|${entry.from}`
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('covers every year from the first version to today', () => {
    expect(FIRST_CATALOGUE_YEAR).toBe(1960);
    for (let year = FIRST_CATALOGUE_YEAR; year <= PRICE_REFERENCE_YEAR; year++) {
      expect(
        CATALOGUE.some(({ from, to }) => from <= year && to >= year),
        String(year)
      ).toBe(true);
    }
  });
});

describe('typicalPrice', () => {
  const version: CatalogueVersion = {
    make: 'Test',
    model: 'Car',
    version: '1.0',
    fuel: 'Gasolina',
    displacement: 999,
    power: 70,
    from: 1990,
    to: PRICE_REFERENCE_YEAR,
    priceYear: 2016,
    price: 10000,
  };
  const at = (year: number): number => typicalPrice(version, { year, month: 6 });

  it('matches the anchor in its own year', () => {
    expect(at(2016)).toBeCloseTo(10000, 6);
  });

  it('loses the fitted rate for every extra year of age', () => {
    expect(at(2015) / at(2016)).toBeCloseTo(Math.exp(-DEPRECIATION_RATE), 10);
    expect(at(2020) / at(2016)).toBeCloseTo(Math.exp(4 * DEPRECIATION_RATE), 10);
  });

  it('stops falling after the floor age and never exceeds the price of a new car', () => {
    const floorYear = PRICE_REFERENCE_YEAR - PRICE_FLOOR_AGE;
    expect(at(floorYear - 10)).toBeCloseTo(at(floorYear), 6);
    expect(at(PRICE_REFERENCE_YEAR + 3)).toBeCloseTo(at(PRICE_REFERENCE_YEAR), 6);
  });
});
