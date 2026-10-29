import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMultipleVehicles,
  createPlate,
  createVehicle,
  DEFAULT_FROM_YEAR,
  MAX_PLATE_BATCH_SIZE,
  plateEra,
  platesErasFor,
  plateStyle,
  PRICE_SPREAD,
  resolveVehicleFilters,
  VehicleFilterError,
  type VehicleFilters,
  type YearMonth,
} from '../plate';
import { CATALOGUE, typicalPrice } from '../vehicles';

const NOW = new Date(2026, 9, 22);

function filterError(filters: VehicleFilters): string | undefined {
  try {
    resolveVehicleFilters(filters, NOW);
    return undefined;
  } catch (error) {
    return error instanceof VehicleFilterError ? error.field : 'other';
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('plate sequences by first-registration month', () => {
  it.each([
    [{ year: 1937, month: 1 }, ['AA-00-00']],
    [{ year: 1992, month: 2 }, ['AA-00-00']],
    [{ year: 1992, month: 3 }, ['00-00-AA']],
    [{ year: 2004, month: 12 }, ['00-00-AA']],
    [{ year: 2005, month: 6 }, ['00-00-AA', '00-AA-00']],
    [{ year: 2006, month: 1 }, ['00-AA-00']],
    [{ year: 2020, month: 2 }, ['00-AA-00']],
    [{ year: 2020, month: 3 }, ['AA-00-AA']],
    [{ year: 2026, month: 10 }, ['AA-00-AA']],
  ])('%o uses %o', (date, eras) => {
    expect(platesErasFor(date)).toEqual(eras);
  });

  it.each([
    [{ year: 1992, month: 2 }, 'black'],
    [{ year: 1992, month: 3 }, 'white'],
    [{ year: 1997, month: 12 }, 'white'],
    [{ year: 1998, month: 1 }, 'dated'],
    [{ year: 2020, month: 2 }, 'dated'],
    [{ year: 2020, month: 3 }, 'modern'],
  ])('%o is printed on a %s plate', (date, style) => {
    expect(plateStyle(date)).toBe(style);
  });
});

describe('plateEra', () => {
  it.each([
    ['AB-12-34', 'AA-00-00'],
    ['12-34-AB', '00-00-AA'],
    ['12-AB-34', '00-AA-00'],
    ['AB-12-CD', 'AA-00-AA'],
    ['KW-01-YZ', 'AA-00-AA'],
    ['QJ-99-99', 'AA-00-00'],
  ])('recognises %s as %s', (plate, era) => {
    expect(plateEra(plate)).toBe(era);
  });

  it.each([
    'KA-12-34',
    '12-34-KA',
    '12-WA-34',
    '12-34-YB',
    'AP-12-34',
    'MG-01-01',
    'CD-12-34',
    'TA-12-34',
    'AB-00-00',
    '00-00-AB',
    '00-AB-00',
    'AB-00-CD',
    'ab-12-34',
    'AB 12 CD',
    'AB1234',
    'A1-23-BC',
    '',
  ])('rejects %s', (plate) => {
    expect(plateEra(plate)).toBeNull();
  });

  it('rejects non-strings', () => {
    for (const value of [null, undefined, 1234, ['AB', '12', 'CD'], { plate: 'AB-12-CD' }]) {
      expect(plateEra(value)).toBeNull();
    }
  });
});

describe('createPlate', () => {
  it.each([
    { year: 1970, month: 5 },
    { year: 1995, month: 7 },
    { year: 2010, month: 1 },
    { year: 2023, month: 11 },
  ])('produces only plates of the sequence in use in %o', (date) => {
    for (let index = 0; index < 500; index++) {
      const { plate, era } = createPlate(date);
      expect(plateEra(plate)).toBe(era);
      expect(platesErasFor(date)).toContain(era);
    }
  });

  it('uses both sequences in the 2005 transition year', () => {
    const random = vi.spyOn(Math, 'random');
    random.mockReturnValue(0);
    expect(createPlate({ year: 2005, month: 6 }).era).toBe('00-00-AA');
    random.mockReturnValue(0.99);
    expect(createPlate({ year: 2005, month: 6 }).era).toBe('00-AA-00');
  });

  it('never builds an all-zero number or a reserved 1937 group', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(createPlate({ year: 1970, month: 1 }).plate).toBe('AA-00-01');
    expect(createPlate({ year: 2000, month: 1 }).plate).toBe('00-01-AA');
    expect(createPlate({ year: 2010, month: 1 }).plate).toBe('00-AA-01');
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(createPlate({ year: 1970, month: 1 }).plate).toBe('ZZ-99-99');
  });

  it('never issues the reserved 00 block in the current sequence', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(createPlate({ year: 2024, month: 1 }).plate).toBe('AA-01-AA');
  });
});

function allowedMonths(filters: VehicleFilters): YearMonth[] {
  return resolveVehicleFilters(filters, NOW).candidates.flatMap(({ dates }) => dates);
}

describe('resolveVehicleFilters', () => {
  it('defaults to every month from 2000 up to the current month', () => {
    const months = allowedMonths({}).map(({ year, month }) => year * 12 + month);
    expect(Math.min(...months)).toBe(DEFAULT_FROM_YEAR * 12 + 1);
    expect(Math.max(...months)).toBe(2026 * 12 + 10);
  });

  it('combines year and month filters without future months', () => {
    expect(allowedMonths({ year: 2015 }).every(({ year }) => year === 2015)).toBe(true);
    expect(Math.max(...allowedMonths({ year: 2026 }).map(({ month }) => month))).toBe(10);
    expect(allowedMonths({ month: 3 }).every(({ month }) => month === 3)).toBe(true);
    expect(allowedMonths({ year: 1960, month: 1 })).toEqual([{ year: 1960, month: 1 }]);
  });

  it('offers only versions sold in the chosen year', () => {
    const names = (year: number): string[] =>
      resolveVehicleFilters({ year }, NOW).candidates.map(
        ({ version }) => `${version.make} ${version.model}`
      );
    expect(names(1965)).toEqual(['Fiat 600']);
    expect(names(2026)).toContain('Toyota Yaris');
    expect(names(2026)).not.toContain('Fiat 600');
  });

  it('filters versions by displacement and power', () => {
    const { candidates } = resolveVehicleFilters(
      { minDisplacement: 900, maxDisplacement: 1000, minPower: 90, maxPower: 100 },
      NOW
    );
    expect(candidates.length).toBeGreaterThan(3);
    for (const { version } of candidates) {
      expect(version.displacement).toBeGreaterThanOrEqual(900);
      expect(version.displacement).toBeLessThanOrEqual(1000);
      expect(version.power).toBeGreaterThanOrEqual(90);
      expect(version.power).toBeLessThanOrEqual(100);
    }
  });

  it.each<[VehicleFilters, string]>([
    [{ year: 1959 }, 'year'],
    [{ year: 2027 }, 'year'],
    [{ year: 2000.5 }, 'year'],
    [{ month: 0 }, 'month'],
    [{ month: 13 }, 'month'],
    [{ year: 2026, month: 11 }, 'month'],
    [{ minDisplacement: 499 }, 'displacement'],
    [{ maxDisplacement: 6501 }, 'displacement'],
    [{ minDisplacement: 2000, maxDisplacement: 1000 }, 'displacement'],
    [{ minDisplacement: 1000.5 }, 'displacement'],
    [{ minPower: 19 }, 'power'],
    [{ maxPower: 651 }, 'power'],
    [{ minPower: 200, maxPower: 100 }, 'power'],
    [{ minPower: 300 }, 'combination'],
    [{ minDisplacement: 3000 }, 'combination'],
    [{ year: 1965, minPower: 100 }, 'combination'],
  ])('rejects %o in %s', (filters, field) => {
    expect(filterError(filters)).toBe(field);
  });
});

describe('createMultipleVehicles', () => {
  const cases: VehicleFilters[] = [
    {},
    { year: 1975 },
    { year: 2005, month: 6 },
    { month: 12 },
    { minDisplacement: 1000, maxDisplacement: 1200 },
    { minPower: 150, maxPower: 200 },
    { year: 2021, minDisplacement: 1500, maxDisplacement: 2000, minPower: 100, maxPower: 150 },
  ];

  it.each(cases)('keeps every vehicle inside %o', (filters) => {
    const vehicles = createMultipleVehicles(MAX_PLATE_BATCH_SIZE, filters, NOW);
    const allowed = new Set(allowedMonths(filters).map(({ year, month }) => year * 12 + month));
    const { minDisplacement = 0, maxDisplacement = Infinity } = filters;
    const { minPower = 0, maxPower = Infinity } = filters;
    expect(new Set(vehicles.map(({ plate }) => plate)).size).toBe(MAX_PLATE_BATCH_SIZE);
    for (const vehicle of vehicles) {
      const { year, month } = vehicle.firstRegistration;
      expect(allowed.has(year * 12 + month)).toBe(true);
      expect(platesErasFor(vehicle.firstRegistration)).toContain(vehicle.era);
      expect(plateEra(vehicle.plate)).toBe(vehicle.era);
      expect(vehicle.displacement).toBeGreaterThanOrEqual(minDisplacement);
      expect(vehicle.displacement).toBeLessThanOrEqual(maxDisplacement);
      expect(vehicle.power).toBeGreaterThanOrEqual(minPower);
      expect(vehicle.power).toBeLessThanOrEqual(maxPower);

      // Two generations can share a name and specs in their overlap year; any of them may be the source.
      const sources = CATALOGUE.filter(
        (entry) =>
          entry.make === vehicle.make &&
          entry.model === vehicle.model &&
          entry.version === vehicle.version &&
          entry.displacement === vehicle.displacement &&
          entry.power === vehicle.power &&
          entry.fuel === vehicle.fuel &&
          entry.from <= year &&
          entry.to >= year
      );
      expect(sources.length).toBeGreaterThan(0);
      const price = vehicle.price ?? Number.NaN;
      expect(price % 50).toBe(0);
      expect(
        sources.some((source) => {
          const typical = typicalPrice(source, vehicle.firstRegistration);
          return (
            price >= typical * (1 - PRICE_SPREAD) - 25 && price <= typical * (1 + PRICE_SPREAD) + 25
          );
        })
      ).toBe(true);
    }
  });

  it('creates a single vehicle with the same rules', () => {
    const vehicle = createVehicle({ year: 2019, month: 4 }, NOW);
    expect(vehicle.firstRegistration).toEqual({ year: 2019, month: 4 });
    expect(vehicle.era).toBe('00-AA-00');
  });

  it.each([0, 101, 1.5, Number.NaN])('rejects quantity %s', (count) => {
    expect(() => createMultipleVehicles(count, {}, NOW)).toThrow(RangeError);
  });

  it('validates filters before generating', () => {
    const random = vi.spyOn(Math, 'random');
    expect(() => createMultipleVehicles(5, { year: 1900 }, NOW)).toThrow(VehicleFilterError);
    expect(random).not.toHaveBeenCalled();
  });

  it('throws instead of returning a partial batch when plates keep colliding', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(() => createMultipleVehicles(2, {}, NOW)).toThrow(/attempt limit/);
  });
});
