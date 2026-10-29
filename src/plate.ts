import { CATALOGUE, FIRST_CATALOGUE_YEAR, typicalPrice, type CatalogueVersion } from './vehicles';

export const MAX_PLATE_BATCH_SIZE = 100;
export const DEFAULT_FROM_YEAR = 2000;
export const DISPLACEMENT_LIMITS = { min: 500, max: 6500 } as const;
export const POWER_LIMITS = { min: 20, max: 650 } as const;
/** Generated prices vary this much around the typical asking price. */
export const PRICE_SPREAD = 0.12;

export type PlateEra = 'AA-00-00' | '00-00-AA' | '00-AA-00' | 'AA-00-AA';
export type PlateStyle = 'black' | 'white' | 'dated' | 'modern';
export type Fuel = 'Gasolina' | 'Gasóleo' | 'Híbrido';

interface Range {
  min: number;
  max: number;
}

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
  make: string;
  model: string;
  version: string;
  displacement: number;
  power: number;
  fuel: Fuel;
  /** Approximate asking price in euros, rounded to 50; null when an own entry has none. */
  price: number | null;
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

export function monthIndex({ year, month }: YearMonth): number {
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

interface Candidate {
  version: CatalogueVersion;
  dates: YearMonth[];
}

interface ResolvedFilters {
  candidates: Candidate[];
}

export interface ParsedFilters {
  dates: YearMonth[];
  displacement: Range;
  power: Range;
}

/** Validates filters and expands them to the allowed months and engine ranges. */
export function parseVehicleFilters(
  filters: VehicleFilters = {},
  now: Date = new Date()
): ParsedFilters {
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const { year, month } = filters;
  if (
    year !== undefined &&
    (!Number.isInteger(year) || year < FIRST_CATALOGUE_YEAR || year > current.year)
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

  const displacement = boundedRange(
    filters.minDisplacement,
    filters.maxDisplacement,
    DISPLACEMENT_LIMITS,
    'displacement'
  );
  const power = boundedRange(filters.minPower, filters.maxPower, POWER_LIMITS, 'power');
  return { dates, displacement, power };
}

export function resolveVehicleFilters(
  filters: VehicleFilters = {},
  now: Date = new Date()
): ResolvedFilters {
  const { dates, displacement, power } = parseVehicleFilters(filters, now);
  const candidates = CATALOGUE.flatMap((version) => {
    if (
      version.displacement < displacement.min ||
      version.displacement > displacement.max ||
      version.power < power.min ||
      version.power > power.max
    ) {
      return [];
    }
    const sold = dates.filter(({ year: y }) => y >= version.from && y <= version.to);
    return sold.length > 0 ? [{ version, dates: sold }] : [];
  });
  if (candidates.length === 0) {
    throw new VehicleFilterError('combination', 'No catalogue version matches these filters');
  }
  return { candidates };
}

function createFromResolved({ candidates }: ResolvedFilters): VehicleResult {
  const { version, dates } = pickItem(candidates);
  const firstRegistration = pickItem(dates);
  const spread = 1 - PRICE_SPREAD + Math.random() * PRICE_SPREAD * 2;
  return {
    ...createPlate(firstRegistration),
    firstRegistration,
    make: version.make,
    model: version.model,
    version: version.version,
    displacement: version.displacement,
    power: version.power,
    fuel: version.fuel,
    price: Math.max(50, Math.round((typicalPrice(version, firstRegistration) * spread) / 50) * 50),
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
