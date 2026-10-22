import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateNIFCheckDigit,
  createMultipleNIFs,
  createNIF,
  hasValidNIFChecksum,
  MAX_NIF_BATCH_SIZE,
  type NIFCategory,
} from '../nif';

afterEach(() => {
  vi.restoreAllMocks();
});

function referenceCheckDigit(base: string): string {
  const weightedSum = [...base].reduce(
    (total, digit, index) => total + BigInt(digit) * BigInt(9 - index),
    0n
  );
  const complement = 11n - (weightedSum % 11n);
  return complement >= 10n ? '0' : String(complement);
}

describe('calculateNIFCheckDigit', () => {
  it('matches the published python-stdnum example', () => {
    expect(calculateNIFCheckDigit('50196484')).toBe('3');
  });

  it.each([
    ['10000001', '0'],
    ['50000000', '0'],
    ['10000000', '2'],
  ])('handles modulo-11 boundaries for %s', (base, expected) => {
    expect(calculateNIFCheckDigit(base)).toBe(expected);
  });

  it.each([
    '',
    '1234567',
    '123456789',
    '1234567A',
    '1234567\n',
    '12345678\n',
    '\uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18',
    '12 34567',
  ])('rejects malformed input %j', (base) => {
    expect(() => calculateNIFCheckDigit(base)).toThrow(RangeError);
  });

  it.each([null, undefined, 12345678, {}, ['12345678']])('rejects non-string input %j', (base) => {
    expect(() => calculateNIFCheckDigit(base as string)).toThrow(RangeError);
  });

  it('matches independent integer arithmetic across every remainder', () => {
    const remainders = new Set<number>();
    for (let serial = 0; serial < 1000; serial++) {
      const base = String(10000000 + serial);
      const sum = [...base].reduce((total, digit, index) => total + Number(digit) * (9 - index), 0);
      remainders.add(sum % 11);
      expect(calculateNIFCheckDigit(base)).toBe(referenceCheckDigit(base));
    }
    expect(remainders.size).toBe(11);
  });
});

describe('hasValidNIFChecksum', () => {
  it('accepts the published vector and rejects its invalid counterpart', () => {
    expect(hasValidNIFChecksum('501964843')).toBe(true);
    expect(hasValidNIFChecksum('501964842')).toBe(false);
  });

  it.each([
    '',
    '50196484',
    '5019648430',
    'PT501964843',
    '501 964 843',
    '501-964-843',
    ' 501964843',
    '501964843 ',
    '501964843\n',
    '501964843\t',
    '50196484A',
    '\u0665\u0660\u0661\u0669\u0666\u0664\u0668\u0664\u0663',
    '000000000',
    null,
    undefined,
    501964843,
    {},
    ['501964843'],
  ])('returns false without coercion or partial parsing for %j', (value) => {
    expect(hasValidNIFChecksum(value)).toBe(false);
  });

  it('checks arithmetic without claiming that a special prefix is in generation scope', () => {
    const base = '45000000';
    expect(hasValidNIFChecksum(base + referenceCheckDigit(base))).toBe(true);
  });

  it('rejects all alternative check digits for the published base', () => {
    for (let digit = 0; digit <= 9; digit++) {
      expect(hasValidNIFChecksum(`50196484${digit}`)).toBe(digit === 3);
    }
  });
});

describe('NIF generation', () => {
  it.each([
    [0, '1'],
    [0.34, '2'],
    [0.99, '3'],
  ])('uses the expected individual range for random value %s', (randomValue, prefix) => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(randomValue as number)
      .mockReturnValue(0);
    const result = createNIF();
    expect(result.category).toBe('individual');
    expect(result.nif.slice(0, 8)).toBe(`${prefix}0000000`);
    expect(result.nif[8]).toBe(referenceCheckDigit(result.nif.slice(0, 8)));
  });

  it('uses prefix 5 for the company profile and preserves serial zeroes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(createNIF('company')).toEqual({ nif: '500000000', category: 'company' });
  });

  it.each(['individual', 'company'] as const)(
    'keeps upper serial bounds at nine digits for %s',
    (category) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999999999);
      const result = createNIF(category);
      expect(result.nif).toHaveLength(9);
      expect(result.nif.slice(1, 8)).toBe('9999999');
      expect(hasValidNIFChecksum(result.nif)).toBe(true);
    }
  );

  it.each(['', 'public', 'sole-trader', 'INDIVIDUAL', '5', null, 5, {}, ['company']])(
    'rejects an unsupported category %j before consuming randomness',
    (category) => {
      const random = vi.spyOn(Math, 'random');
      expect(() => createNIF(category as NIFCategory)).toThrow(RangeError);
      expect(() => createMultipleNIFs(1, category as NIFCategory)).toThrow(RangeError);
      expect(random).not.toHaveBeenCalled();
    }
  );
});

describe('NIF batches', () => {
  it.each(['individual', 'company'] as const)(
    'produces exact, independently checked batches for %s',
    (category) => {
      let sequence = 0;
      vi.spyOn(Math, 'random').mockImplementation(
        () => ((sequence++ * 7919) % 10000000) / 10000000
      );
      for (const count of [1, 5, 6, MAX_NIF_BATCH_SIZE]) {
        const results = createMultipleNIFs(count, category);
        expect(results).toHaveLength(count);
        expect(new Set(results.map(({ nif }) => nif)).size).toBe(count);
        for (const result of results) {
          expect(result.category).toBe(category);
          expect(result.nif).toMatch(category === 'individual' ? /^[123][0-9]{8}$/ : /^5[0-9]{8}$/);
          expect(result.nif[8]).toBe(referenceCheckDigit(result.nif.slice(0, 8)));
        }
      }
    }
  );

  it('defaults to the individual profile', () => {
    expect(createMultipleNIFs(1)[0]?.category).toBe('individual');
  });

  it.each([0, -1, 1.5, 101, NaN, Infinity, -Infinity, '5', null, undefined])(
    'rejects invalid quantity %j before consuming randomness',
    (count) => {
      const random = vi.spyOn(Math, 'random');
      expect(() => createMultipleNIFs(count as number)).toThrow(RangeError);
      expect(random).not.toHaveBeenCalled();
    }
  );

  it('retries duplicate candidates without returning duplicates', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.1);
    const results = createMultipleNIFs(2, 'company');
    expect(results.map(({ nif }) => nif.slice(0, 8))).toEqual(['50000000', '51000000']);
  });

  it('fails within the attempt limit instead of returning a partial batch', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(() => createMultipleNIFs(2, 'company')).toThrow('attempt limit');
    expect(random).toHaveBeenCalledTimes(20);
  });
});
