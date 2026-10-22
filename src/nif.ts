export const MAX_NIF_BATCH_SIZE = 100;

export type NIFCategory = 'individual' | 'company';

export interface NIFResult {
  nif: string;
  category: NIFCategory;
}

const individualPrefixes = ['1', '2', '3'] as const;

function requireCategory(category: NIFCategory): void {
  if (category !== 'individual' && category !== 'company') {
    throw new RangeError('Unsupported NIF generation category');
  }
}

export function calculateNIFCheckDigit(base: string): string {
  if (typeof base !== 'string' || base.length !== 8 || /[^0-9]/.test(base)) {
    throw new RangeError('Expected exactly eight ASCII digits');
  }

  let total = 0;
  for (let index = 0; index < base.length; index++) {
    total += Number(base[index]) * (9 - index);
  }
  const remainder = total % 11;
  return String(remainder < 2 ? 0 : 11 - remainder);
}

export function hasValidNIFChecksum(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === 9 &&
    !/[^0-9]/.test(value) &&
    value[0] !== '0' &&
    value[8] === calculateNIFCheckDigit(value.slice(0, 8))
  );
}

export function createNIF(category: NIFCategory = 'individual'): NIFResult {
  requireCategory(category);
  const prefix =
    category === 'individual'
      ? individualPrefixes[Math.floor(Math.random() * individualPrefixes.length)]!
      : '5';
  const serial = String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
  const base = prefix + serial;
  return { nif: base + calculateNIFCheckDigit(base), category };
}

export function createMultipleNIFs(
  count: number,
  category: NIFCategory = 'individual'
): NIFResult[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_NIF_BATCH_SIZE) {
    throw new RangeError(`Expected an integer quantity from 1 to ${MAX_NIF_BATCH_SIZE}`);
  }
  requireCategory(category);

  const results = new Map<string, NIFResult>();
  for (let attempt = 0; attempt < count * 10 && results.size < count; attempt++) {
    const result = createNIF(category);
    results.set(result.nif, result);
  }
  if (results.size !== count) {
    throw new Error('Unable to generate a unique NIF batch within the attempt limit');
  }
  return [...results.values()];
}
