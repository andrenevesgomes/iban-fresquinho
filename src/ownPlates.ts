import {
  DISPLACEMENT_LIMITS,
  MAX_PLATE_BATCH_SIZE,
  monthIndex,
  parseVehicleFilters,
  POWER_LIMITS,
  VehicleFilterError,
  type Fuel,
  type PlateEra,
  type VehicleFilters,
  type VehicleResult,
} from './plate';
import { CATALOGUE, typicalPrice } from './vehicles';

export const MAX_OWN_PLATES = 5000;
const FIRST_PLATE_YEAR = 1937;

const COLUMNS = [
  'plate',
  'make',
  'model',
  'version',
  'fuel',
  'displacement',
  'power',
  'month',
  'year',
  'price',
] as const;
type Column = (typeof COLUMNS)[number];

const REQUIRED: readonly Column[] = [
  'plate',
  'make',
  'model',
  'fuel',
  'displacement',
  'power',
  'month',
  'year',
];

const HEADER_ALIASES: Readonly<Record<string, Column>> = {
  matricula: 'plate',
  marca: 'make',
  modelo: 'model',
  versao: 'version',
  combustivel: 'fuel',
  cm: 'displacement',
  cm3: 'displacement',
  cilindrada: 'displacement',
  cv: 'power',
  potencia: 'power',
  mes: 'month',
  ano: 'year',
  preco: 'price',
};

const HEADER = [
  'Matrícula',
  'Marca',
  'Modelo',
  'Versão',
  'Combustível',
  'cm³',
  'cv',
  'Mês',
  'Ano',
  'Preço',
];
const LABELS = Object.fromEntries(
  COLUMNS.map((column, index) => [column, HEADER[index]!])
) as Record<Column, string>;

export interface OwnPlatesParse {
  vehicles: VehicleResult[];
  errors: string[];
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Accepts any of the four Portuguese formats with dashes, spaces, dots or nothing between groups. */
export function normalisePlate(value: string): { plate: string; era: PlateEra } | null {
  const compact = value.toUpperCase().replace(/[\s.-]/g, '');
  if (!/^[A-Z0-9]{6}$/.test(compact)) return null;
  const groups = [compact.slice(0, 2), compact.slice(2, 4), compact.slice(4)];
  const shape = groups
    .map((group) => (/^[A-Z]{2}$/.test(group) ? 'AA' : /^[0-9]{2}$/.test(group) ? '00' : '?'))
    .join('-');
  if (!['AA-00-00', '00-00-AA', '00-AA-00', 'AA-00-AA'].includes(shape)) return null;
  return { plate: groups.join('-'), era: shape as PlateEra };
}

function parseFuel(value: string): Fuel | null {
  const folded = fold(value);
  if (folded === 'gasolina') return 'Gasolina';
  if (folded === 'gasoleo' || folded === 'diesel') return 'Gasóleo';
  if (folded.startsWith('hibrid') || folded.startsWith('hybrid')) return 'Híbrido';
  return null;
}

/** Whole number from text such as "8950", "8 950 €", "8.950" or "8950,00"; NaN otherwise. */
function parseWhole(value: string): number {
  const text = value.replace(/[\s\u00a0\u202f€]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text))
    return Math.round(Number(text.replace(/\./g, '').replace(',', '.')));
  if (/^\d+([.,]\d+)?$/.test(text)) return Math.round(Number(text.replace(',', '.')));
  return Number.NaN;
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (char === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t';
  return line.split(';').length >= line.split(',').length ? ';' : ',';
}

function inBounds(value: number, { min, max }: { min: number; max: number }): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/** Parses a CSV file or rows pasted from Excel. Rows without a plate are skipped. */
export function parseOwnPlates(text: string, now: Date = new Date()): OwnPlatesParse {
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
  const first = lines.findIndex((line) => line.trim() !== '');
  if (first === -1) return { vehicles: [], errors: [] };
  const delimiter = detectDelimiter(lines[first]!);
  const headerCells = splitLine(lines[first]!, delimiter).map((cell) => HEADER_ALIASES[fold(cell)]);
  const hasHeader = headerCells.includes('plate');
  const columns: (Column | undefined)[] = hasHeader ? headerCells : [...COLUMNS];
  const missing = REQUIRED.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    return {
      vehicles: [],
      errors: [
        `Faltam colunas no cabeçalho: ${missing.map((column) => LABELS[column]).join(', ')}.`,
      ],
    };
  }

  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const vehicles: VehicleResult[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (let index = hasHeader ? first + 1 : first; index < lines.length; index++) {
    const line = lines[index]!;
    if (line.trim() === '') continue;
    const cells = splitLine(line, delimiter);
    const get = (column: Column): string => cells[columns.indexOf(column)] ?? '';
    if (get('plate') === '') continue;
    const fail = (message: string): void => {
      errors.push(`Linha ${index + 1}: ${message}`);
    };

    const plate = normalisePlate(get('plate'));
    if (!plate) {
      fail(`a matrícula «${get('plate')}» não tem um formato português.`);
      continue;
    }
    if (seen.has(plate.plate)) {
      fail(`a matrícula ${plate.plate} aparece repetida.`);
      continue;
    }
    const make = get('make');
    const model = get('model');
    if (make === '' || model === '') {
      fail('falta a marca ou o modelo.');
      continue;
    }
    const fuel = parseFuel(get('fuel'));
    if (!fuel) {
      fail(`o combustível «${get('fuel')}» não é Gasolina, Gasóleo nem Híbrido.`);
      continue;
    }
    const displacement = parseWhole(get('displacement'));
    if (!inBounds(displacement, DISPLACEMENT_LIMITS)) {
      fail(
        `a cilindrada tem de estar entre ${DISPLACEMENT_LIMITS.min} e ${DISPLACEMENT_LIMITS.max} cm³.`
      );
      continue;
    }
    const power = parseWhole(get('power'));
    if (!inBounds(power, POWER_LIMITS)) {
      fail(`a potência tem de estar entre ${POWER_LIMITS.min} e ${POWER_LIMITS.max} cv.`);
      continue;
    }
    const firstRegistration = { year: parseWhole(get('year')), month: parseWhole(get('month')) };
    if (
      !inBounds(firstRegistration.month, { min: 1, max: 12 }) ||
      !inBounds(firstRegistration.year, { min: FIRST_PLATE_YEAR, max: current.year }) ||
      monthIndex(firstRegistration) > monthIndex(current)
    ) {
      fail('o mês e o ano da 1.ª matrícula não são uma data válida até hoje.');
      continue;
    }
    const version = get('version');
    let price: number | null = null;
    if (get('price') !== '') {
      price = parseWhole(get('price'));
      if (!Number.isInteger(price) || price < 0) {
        fail(`o preço «${get('price')}» não é um valor em euros.`);
        continue;
      }
    } else {
      const known = CATALOGUE.find(
        (entry) =>
          fold(entry.make) === fold(make) &&
          fold(entry.model) === fold(model) &&
          fold(entry.version) === fold(version) &&
          entry.displacement === displacement &&
          entry.power === power &&
          entry.from <= firstRegistration.year &&
          entry.to >= firstRegistration.year
      );
      if (known) price = Math.round(typicalPrice(known, firstRegistration) / 50) * 50;
    }
    seen.add(plate.plate);
    vehicles.push({
      ...plate,
      firstRegistration,
      make,
      model,
      version,
      displacement,
      power,
      fuel,
      price,
    });
  }
  if (vehicles.length > MAX_OWN_PLATES) {
    return { vehicles: [], errors: [`A lista tem mais de ${MAX_OWN_PLATES} matrículas.`] };
  }
  return { vehicles, errors };
}

function csvLine(cells: readonly (string | number)[]): string {
  return cells
    .map((cell) => {
      const text = String(cell);
      return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(';');
}

/** The catalogue with an empty plate column, ready for Excel (UTF-8 with BOM, semicolons). */
export function ownPlatesTemplate(): string {
  return `\uFEFF${[
    csvLine([...HEADER, 'Anos de venda']),
    ...CATALOGUE.map((entry) =>
      csvLine([
        '',
        entry.make,
        entry.model,
        entry.version,
        entry.fuel,
        entry.displacement,
        entry.power,
        '',
        '',
        '',
        `${entry.from}-${entry.to}`,
      ])
    ),
  ].join('\r\n')}\r\n`;
}

/** Up to `count` saved vehicles that match the filters, in random order. */
export function pickOwnVehicles(
  vehicles: readonly VehicleResult[],
  count: number,
  filters: VehicleFilters = {},
  now: Date = new Date()
): VehicleResult[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PLATE_BATCH_SIZE) {
    throw new RangeError(`Expected an integer quantity from 1 to ${MAX_PLATE_BATCH_SIZE}`);
  }
  const { dates, displacement, power } = parseVehicleFilters(filters, now);
  const allowed = new Set(dates.map(monthIndex));
  const matches = vehicles.filter(
    (vehicle) =>
      allowed.has(monthIndex(vehicle.firstRegistration)) &&
      vehicle.displacement >= displacement.min &&
      vehicle.displacement <= displacement.max &&
      vehicle.power >= power.min &&
      vehicle.power <= power.max
  );
  if (matches.length === 0) {
    throw new VehicleFilterError('combination', 'No saved plate matches these filters');
  }
  for (let index = matches.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [matches[index], matches[swap]] = [matches[swap]!, matches[index]!];
  }
  return matches.slice(0, count);
}
