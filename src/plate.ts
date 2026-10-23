export const MAX_PLATE_BATCH_SIZE = 100;
export const FIRST_REGISTRATION_YEAR = 1937;
export const DEFAULT_FROM_YEAR = 2000;
export const DISPLACEMENT_LIMITS = { min: 600, max: 6500 } as const;
export const POWER_LIMITS = { min: 30, max: 650 } as const;

const DEFAULT_DISPLACEMENT = { min: 900, max: 2500 } as const;

export type PlateEra = 'AA-00-00' | '00-00-AA' | '00-AA-00' | 'AA-00-AA';
export type PlateStyle = 'black' | 'white' | 'dated' | 'modern';
export type Fuel = 'Gasolina' | 'Gasóleo' | 'Híbrido';

interface Range {
  min: number;
  max: number;
}

// Plausible output in cv per litre for each fuel, before the era cap.
const SPECIFIC_POWER: Readonly<Record<Fuel, Range>> = {
  Gasolina: { min: 45, max: 115 },
  Gasóleo: { min: 40, max: 95 },
  Híbrido: { min: 55, max: 100 },
};

// Older engines produced less: [first year without the cap, cv per litre cap], oldest first.
const ERA_CAPS: Readonly<Record<Fuel, readonly (readonly [number, number])[]>> = {
  Gasolina: [
    [1990, 75],
    [2005, 100],
  ],
  Gasóleo: [
    [1990, 50],
    [2000, 65],
    [2005, 80],
  ],
  Híbrido: [],
};

// Smallest common engine per fuel; rare micro diesels and hybrids are left out.
const MIN_FUEL_DISPLACEMENT: Readonly<Record<Fuel, number>> = {
  Gasolina: 600,
  Gasóleo: 1200,
  Híbrido: 1000,
};

export interface YearMonth {
  year: number;
  month: number;
}

export interface VehicleFilters {
  year?: number;
  month?: number;
  minDisplacement?: number;
  maxDisplacement?: number;
  minPower?: number;
  maxPower?: number;
}

export interface VehicleResult {
  plate: string;
  era: PlateEra;
  firstRegistration: YearMonth;
  displacement: number;
  power: number;
  fuel: Fuel;
}

export type VehicleFilterField = 'year' | 'month' | 'displacement' | 'power' | 'combination';

export class VehicleFilterError extends RangeError {
  constructor(
    readonly field: VehicleFilterField,
    message: string
  ) {
    super(message);
    this.name = 'VehicleFilterError';
  }
}

const LEGACY_LETTERS = 'ABCDEFGHIJLMNOPQRSTUVXZ';
const MODERN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const RESERVED_1937_GROUPS = new Set([
  'AM',
  'AP',
  'CC',
  'CD',
  'EP',
  'FM',
  'ME',
  'MG',
  'MX',
  'PR',
  'TA',
  'TB',
  'TC',
  'TD',
  'TE',
  'TF',
  'TG',
  'TH',
]);

const ERA_PATTERNS: Readonly<Record<PlateEra, RegExp>> = {
  'AA-00-00': /^([A-Z]{2})-([0-9]{2})-([0-9]{2})$/,
  '00-00-AA': /^([0-9]{2})-([0-9]{2})-([A-Z]{2})$/,
  '00-AA-00': /^([0-9]{2})-([A-Z]{2})-([0-9]{2})$/,
  'AA-00-AA': /^([A-Z]{2})-([0-9]{2})-([A-Z]{2})$/,
};

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickItem<Item>(items: readonly Item[]): Item {
  return items[Math.floor(Math.random() * items.length)]!;
}

function letterPair(alphabet: string): string {
  return pickItem([...alphabet]) + pickItem([...alphabet]);
}

const CIVILIAN_1937_GROUPS: readonly string[] = [...LEGACY_LETTERS]
  .flatMap((first) => [...LEGACY_LETTERS].map((second) => first + second))
  .filter((group) => !RESERVED_1937_GROUPS.has(group));

function digitPair(min = 0): string {
  return String(randomInt(min, 99)).padStart(2, '0');
}

function monthIndex({ year, month }: YearMonth): number {
  return year * 12 + month - 1;
}

function usesOnly(letters: string, alphabet: string): boolean {
  return [...letters].every((letter) => alphabet.includes(letter));
}

/** Plate sequences in use for a first-registration month; 2005 is a transition year with both. */
export function platesErasFor(date: YearMonth): PlateEra[] {
  const index = monthIndex(date);
  if (index < monthIndex({ year: 1992, month: 3 })) return ['AA-00-00'];
  if (date.year < 2005) return ['00-00-AA'];
  if (date.year === 2005) return ['00-00-AA', '00-AA-00'];
  if (index < monthIndex({ year: 2020, month: 3 })) return ['00-AA-00'];
  return ['AA-00-AA'];
}

/** Physical plate design for a first-registration month. */
export function plateStyle(date: YearMonth): PlateStyle {
  const index = monthIndex(date);
  if (index < monthIndex({ year: 1992, month: 3 })) return 'black';
  if (date.year < 1998) return 'white';
  if (index < monthIndex({ year: 2020, month: 3 })) return 'dated';
  return 'modern';
}

/** Civilian plate sequence this generator can produce, or null (reserved, malformed or excluded). */
export function plateEra(value: unknown): PlateEra | null {
  if (typeof value !== 'string') return null;
  for (const era of Object.keys(ERA_PATTERNS) as PlateEra[]) {
    const match = ERA_PATTERNS[era].exec(value);
    if (!match) continue;
    const [, first = '', second = '', third = ''] = match;
    if (era === 'AA-00-00') {
      if (!usesOnly(first, LEGACY_LETTERS) || RESERVED_1937_GROUPS.has(first)) return null;
      return second === '00' && third === '00' ? null : era;
    }
    if (era === '00-00-AA') {
      return usesOnly(third, LEGACY_LETTERS) && `${first}${second}` !== '0000' ? era : null;
    }
    if (era === '00-AA-00') {
      return usesOnly(second, LEGACY_LETTERS) && `${first}${third}` !== '0000' ? era : null;
    }
    return second !== '00' ? era : null;
  }
  return null;
}

export function createPlate(date: YearMonth): { plate: string; era: PlateEra } {
  const eras = platesErasFor(date);
  const era = pickItem(eras);
  if (era === 'AA-00-AA') {
    return {
      plate: `${letterPair(MODERN_LETTERS)}-${digitPair(1)}-${letterPair(MODERN_LETTERS)}`,
      era,
    };
  }
  const first = digitPair();
  const second = digitPair(first === '00' ? 1 : 0);
  if (era === 'AA-00-00')
    return { plate: `${pickItem(CIVILIAN_1937_GROUPS)}-${first}-${second}`, era };
  const letters = letterPair(LEGACY_LETTERS);
  return {
    plate: era === '00-00-AA' ? `${first}-${second}-${letters}` : `${first}-${letters}-${second}`,
    era,
  };
}

function boundedRange(
  min: number | undefined,
  max: number | undefined,
  limits: Range,
  field: 'displacement' | 'power'
): Range {
  const range = { min: min ?? limits.min, max: max ?? limits.max };
  if (
    !Number.isInteger(range.min) ||
    !Number.isInteger(range.max) ||
    range.min < limits.min ||
    range.max > limits.max ||
    range.min > range.max
  ) {
    throw new VehicleFilterError(field, `Invalid ${field} range`);
  }
  return range;
}

interface ResolvedFilters {
  dates: YearMonth[];
  displacement: Range;
  power: Range;
}

/** Plausible cv per litre for a fuel in a given year; older engines produced less. */
export function specificPowerRange(fuel: Fuel, { year }: YearMonth): Range {
  const range = SPECIFIC_POWER[fuel];
  const eraCap = ERA_CAPS[fuel].find(([before]) => year < before)?.[1] ?? range.max;
  return { min: range.min, max: Math.min(range.max, eraCap) };
}

function fuelsFor({ year }: YearMonth): readonly Fuel[] {
  return year < 2000 ? ['Gasolina', 'Gasóleo'] : ['Gasolina', 'Gasóleo', 'Híbrido'];
}

function feasibleDisplacement(
  fuel: Fuel,
  date: YearMonth,
  displacement: Range,
  power: Range
): Range | null {
  const specific = specificPowerRange(fuel, date);
  const range = {
    min: Math.max(
      displacement.min,
      MIN_FUEL_DISPLACEMENT[fuel],
      Math.ceil((power.min * 1000) / specific.max)
    ),
    max: Math.min(displacement.max, Math.floor((power.max * 1000) / specific.min)),
  };
  return range.min <= range.max ? range : null;
}

export function resolveVehicleFilters(
  filters: VehicleFilters = {},
  now: Date = new Date()
): ResolvedFilters {
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const { year, month } = filters;
  if (
    year !== undefined &&
    (!Number.isInteger(year) || year < FIRST_REGISTRATION_YEAR || year > current.year)
  ) {
    throw new VehicleFilterError('year', 'Invalid first-registration year');
  }
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw new VehicleFilterError('month', 'Invalid first-registration month');
  }
  const dates: YearMonth[] = [];
  for (let y = year ?? DEFAULT_FROM_YEAR; y <= (year ?? current.year); y++) {
    for (let m = month ?? 1; m <= (month ?? 12); m++) {
      if (monthIndex({ year: y, month: m }) <= monthIndex(current))
        dates.push({ year: y, month: m });
    }
  }
  if (dates.length === 0) {
    throw new VehicleFilterError('month', 'First registration cannot be in the future');
  }

  const power = boundedRange(filters.minPower, filters.maxPower, POWER_LIMITS, 'power');
  // Without any engine filter, stay within everyday cars; any filter opens the full range.
  const unfiltered =
    filters.minDisplacement === undefined &&
    filters.maxDisplacement === undefined &&
    filters.minPower === undefined &&
    filters.maxPower === undefined;
  const displacement = unfiltered
    ? { ...DEFAULT_DISPLACEMENT }
    : boundedRange(
        filters.minDisplacement,
        filters.maxDisplacement,
        DISPLACEMENT_LIMITS,
        'displacement'
      );

  const feasibleDates = dates.filter((date) =>
    fuelsFor(date).some((fuel) => feasibleDisplacement(fuel, date, displacement, power))
  );
  if (feasibleDates.length === 0) {
    throw new VehicleFilterError('combination', 'No plausible displacement and power combination');
  }
  return { dates: feasibleDates, displacement, power };
}

function createFromResolved({ dates, displacement, power }: ResolvedFilters): VehicleResult {
  const firstRegistration = pickItem(dates);
  const options = fuelsFor(firstRegistration).flatMap((fuel) => {
    const range = feasibleDisplacement(fuel, firstRegistration, displacement, power);
    return range ? [{ fuel, range }] : [];
  });
  const { fuel, range } = pickItem(options);
  const specific = specificPowerRange(fuel, firstRegistration);
  const cm3 = randomInt(range.min, range.max);
  const cv = randomInt(
    Math.max(power.min, Math.ceil((cm3 * specific.min) / 1000)),
    Math.min(power.max, Math.floor((cm3 * specific.max) / 1000))
  );
  return {
    ...createPlate(firstRegistration),
    firstRegistration,
    displacement: cm3,
    power: cv,
    fuel,
  };
}

export function createVehicle(filters: VehicleFilters = {}, now: Date = new Date()): VehicleResult {
  return createFromResolved(resolveVehicleFilters(filters, now));
}

export function createMultipleVehicles(
  count: number,
  filters: VehicleFilters = {},
  now: Date = new Date()
): VehicleResult[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PLATE_BATCH_SIZE) {
    throw new RangeError(`Expected an integer quantity from 1 to ${MAX_PLATE_BATCH_SIZE}`);
  }
  const resolved = resolveVehicleFilters(filters, now);
  const results = new Map<string, VehicleResult>();
  for (let attempt = 0; attempt < count * 10 && results.size < count; attempt++) {
    const vehicle = createFromResolved(resolved);
    results.set(vehicle.plate, vehicle);
  }
  if (results.size !== count) {
    throw new Error('Unable to generate a unique plate batch within the attempt limit');
  }
  return [...results.values()];
}
