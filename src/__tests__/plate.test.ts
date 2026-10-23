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
  resolveVehicleFilters,
  specificPowerRange,
  VehicleFilterError,
  type VehicleFilters,
  type YearMonth,
} from '../plate';

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

describe('resolveVehicleFilters', () => {
  it('defaults to every month from 2000 up to the current month', () => {
    const { dates } = resolveVehicleFilters({}, NOW);
    expect(dates[0]).toEqual({ year: DEFAULT_FROM_YEAR, month: 1 });
    expect(dates.at(-1)).toEqual({ year: 2026, month: 10 });
    expect(dates).toHaveLength((2026 - DEFAULT_FROM_YEAR) * 12 + 10);
  });

  it('combines year and month filters without future months', () => {
    expect(resolveVehicleFilters({ year: 2015 }, NOW).dates).toHaveLength(12);
    expect(resolveVehicleFilters({ year: 2026 }, NOW).dates).toHaveLength(10);
    const march = resolveVehicleFilters({ month: 3 }, NOW).dates;
    expect(march.every(({ month }) => month === 3)).toBe(true);
    expect(march).toHaveLength(2026 - DEFAULT_FROM_YEAR + 1);
    expect(resolveVehicleFilters({ year: 1937, month: 1 }, NOW).dates).toEqual([
      { year: 1937, month: 1 },
    ]);
  });

  it.each<[VehicleFilters, string]>([
    [{ year: 1936 }, 'year'],
    [{ year: 2027 }, 'year'],
    [{ year: 2000.5 }, 'year'],
    [{ month: 0 }, 'month'],
    [{ month: 13 }, 'month'],
    [{ year: 2026, month: 11 }, 'month'],
    [{ minDisplacement: 599 }, 'displacement'],
    [{ maxDisplacement: 6501 }, 'displacement'],
    [{ minDisplacement: 2000, maxDisplacement: 1000 }, 'displacement'],
    [{ minDisplacement: 1000.5 }, 'displacement'],
    [{ minPower: 29 }, 'power'],
    [{ maxPower: 651 }, 'power'],
    [{ minPower: 200, maxPower: 100 }, 'power'],
    [{ minDisplacement: 600, maxDisplacement: 1000, minPower: 300 }, 'combination'],
    [{ minDisplacement: 6000, maxPower: 100 }, 'combination'],
    [{ year: 1980, minDisplacement: 1000, maxDisplacement: 1000, minPower: 110 }, 'combination'],
  ])('rejects %o in %s', (filters, field) => {
    expect(filterError(filters)).toBe(field);
  });

  it('keeps everyday displacement unless an engine filter is set', () => {
    expect(resolveVehicleFilters({}, NOW).displacement).toEqual({ min: 900, max: 2500 });
    expect(resolveVehicleFilters({ minPower: 400 }, NOW).displacement).toEqual({
      min: 600,
      max: 6500,
    });
    const powerful = createMultipleVehicles(20, { minPower: 400 }, NOW);
    expect(powerful.every(({ displacement }) => displacement >= 3478)).toBe(true);
  });

  it('keeps only months in which the requested engine was plausible', () => {
    const { dates } = resolveVehicleFilters(
      { minDisplacement: 1000, maxDisplacement: 1000, minPower: 110, maxPower: 110 },
      NOW
    );
    expect(dates[0]).toEqual({ year: 2005, month: 1 });
  });
});

describe('specificPowerRange', () => {
  it.each<[Parameters<typeof specificPowerRange>[0], number, number, number]>([
    ['Gasolina', 2020, 45, 115],
    ['Gasolina', 2000, 45, 100],
    ['Gasolina', 1980, 45, 75],
    ['Gasóleo', 2020, 40, 95],
    ['Gasóleo', 2003, 40, 80],
    ['Gasóleo', 1995, 40, 65],
    ['Gasóleo', 1985, 40, 50],
    ['Híbrido', 2015, 55, 100],
  ])('%s in %i allows %i to %i cv per litre', (fuel, year, min, max) => {
    expect(specificPowerRange(fuel, { year, month: 1 })).toEqual({ min, max });
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
    { minDisplacement: 600, maxDisplacement: 600 },
  ];

  it.each(cases)('keeps every vehicle inside %o', (filters) => {
    const vehicles = createMultipleVehicles(MAX_PLATE_BATCH_SIZE, filters, NOW);
    const { dates, displacement, power } = resolveVehicleFilters(filters, NOW);
    const allowed = new Set(dates.map(({ year, month }: YearMonth) => year * 12 + month));
    expect(new Set(vehicles.map(({ plate }) => plate)).size).toBe(MAX_PLATE_BATCH_SIZE);
    for (const vehicle of vehicles) {
      const { year, month } = vehicle.firstRegistration;
      expect(allowed.has(year * 12 + month)).toBe(true);
      expect(platesErasFor(vehicle.firstRegistration)).toContain(vehicle.era);
      expect(plateEra(vehicle.plate)).toBe(vehicle.era);
      expect(vehicle.displacement).toBeGreaterThanOrEqual(displacement.min);
      expect(vehicle.displacement).toBeLessThanOrEqual(displacement.max);
      expect(vehicle.power).toBeGreaterThanOrEqual(power.min);
      expect(vehicle.power).toBeLessThanOrEqual(power.max);
      const perLitre = (vehicle.power * 1000) / vehicle.displacement;
      const specific = specificPowerRange(vehicle.fuel, vehicle.firstRegistration);
      expect(perLitre).toBeGreaterThanOrEqual(specific.min - 1);
      expect(perLitre).toBeLessThanOrEqual(specific.max + 1);
      if (year < 2000) expect(vehicle.fuel).not.toBe('Híbrido');
      if (vehicle.fuel === 'Gasóleo') expect(vehicle.displacement).toBeGreaterThanOrEqual(1200);
      if (vehicle.fuel === 'Híbrido') expect(vehicle.displacement).toBeGreaterThanOrEqual(1000);
    }
  });

  it('leaves engines under 1000 cm³ to petrol', () => {
    const vehicles = createMultipleVehicles(50, { maxDisplacement: 999 }, NOW);
    expect(new Set(vehicles.map(({ fuel }) => fuel))).toEqual(new Set(['Gasolina']));
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
