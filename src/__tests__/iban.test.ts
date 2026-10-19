import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  pad,
  mod97,
  calculateNIBControlDigits,
  calculateIBANCheckDigits,
  createIBAN,
  validateIBAN,
  parseIBAN,
  formatIBAN,
  createMultipleIBANs,
} from '../iban';
import { bankCodes, bankMap } from '../types';

afterEach(() => {
  vi.restoreAllMocks();
});

function referenceRemainder(value: string): number {
  const expanded = value.replace(/[A-Z]/g, (character) =>
    (character.charCodeAt(0) - 55).toString()
  );
  return Number(BigInt(expanded) % 97n);
}

function referenceIBAN(bban: string): string {
  const checkDigits = String(98 - referenceRemainder(bban + '252900')).padStart(2, '0');
  return 'PT' + checkDigits + bban;
}

describe('pad', () => {
  it('should pad single digit numbers', () => {
    expect(pad(5, 4)).toBe('0005');
  });

  it('should pad multi-digit numbers', () => {
    expect(pad(123, 6)).toBe('000123');
  });

  it('should not truncate numbers longer than length', () => {
    expect(pad(12345, 3)).toBe('12345');
  });

  it('should handle zero', () => {
    expect(pad(0, 4)).toBe('0000');
  });
});

describe('mod97', () => {
  it.each(['', '!', 'NaN', '1.2', '12-34', 'PT\n', 'pt', '１２'])(
    'should reject malformed input without partial parsing: %j',
    (value) => {
      expect(() => mod97(value)).toThrow(RangeError);
    }
  );

  it.each(['0', '00', '000000000001', '123456789012345678901234567890', 'PT00'])(
    'should match independent integer arithmetic: %s',
    (value) => {
      expect(mod97(value)).toBe(referenceRemainder(value));
    }
  );

  it('should calculate mod97 for numeric strings', () => {
    expect(mod97('123456789')).toBe(123456789 % 97);
  });

  it('should convert letters correctly (A=10, B=11, etc.)', () => {
    // 'A' should become '10', 'B' should become '11'
    expect(mod97('AB')).toBe(1011 % 97);
  });

  it('should handle PT country code correctly', () => {
    // PT = 2529
    expect(mod97('PT')).toBe(2529 % 97);
  });

  it('should handle large numbers by processing in chunks', () => {
    const largeNumber = '123456789012345678901234567890';
    const result = mod97(largeNumber);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(97);
  });
});

describe('calculateNIBControlDigits', () => {
  it('should reproduce the SWIFT reference domestic control digits', () => {
    expect(calculateNIBControlDigits('0002', '0123', '12345678901')).toBe('54');
  });

  it.each([
    ['ABCD', '0001', '12345678901'],
    ['35', '0001', '12345678901'],
    ['0035', '00001', '12345678901'],
    ['0035', '0001', '1234567890'],
    ['0035', '0001', '1234567890!'],
    ['0035', '0001', '1234567890\n'],
  ])('should reject malformed NIB components: %s / %s / %s', (bank, branch, account) => {
    expect(() => calculateNIBControlDigits(bank, branch, account)).toThrow(RangeError);
  });

  it('should return 2-digit string', () => {
    const result = calculateNIBControlDigits('0035', '0001', '12345678901');
    expect(result).toHaveLength(2);
  });

  it('should return consistent results for same input', () => {
    const result1 = calculateNIBControlDigits('0035', '0001', '12345678901');
    const result2 = calculateNIBControlDigits('0035', '0001', '12345678901');
    expect(result1).toBe(result2);
  });

  it('should return different results for different inputs', () => {
    const result1 = calculateNIBControlDigits('0035', '0001', '12345678901');
    const result2 = calculateNIBControlDigits('0035', '0002', '12345678901');
    expect(result1).not.toBe(result2);
  });
});

describe('calculateIBANCheckDigits', () => {
  it('should reproduce the SWIFT reference international control digits', () => {
    expect(calculateIBANCheckDigits('000201231234567890154', 'PT')).toBe('50');
  });

  it.each([
    ['000201231234567890154', 'ES'],
    ['000201231234567890154', 'pt'],
    ['00020123123456789015', 'PT'],
    ['00020123123456789015!', 'PT'],
  ])('should reject unsupported country or BBAN: %s / %s', (bban, country) => {
    expect(() => calculateIBANCheckDigits(bban, country)).toThrow(RangeError);
  });

  it('should return 2-digit string', () => {
    const bban = '003500011234567890112';
    const result = calculateIBANCheckDigits(bban, 'PT');
    expect(result).toHaveLength(2);
  });

  it('should produce valid check digits', () => {
    const bban = '003500011234567890112';
    const checkDigits = calculateIBANCheckDigits(bban, 'PT');
    const fullIban = 'PT' + checkDigits + bban;

    // Rearrange and check mod97 = 1
    const rearranged = fullIban.substring(4) + fullIban.substring(0, 4);
    expect(mod97(rearranged)).toBe(1);
  });
});

describe('createIBAN', () => {
  it.each([null, 35, {}, [], true])('should reject non-string bank inputs: %j', (value) => {
    expect(() => createIBAN(value as unknown as string)).toThrow(RangeError);
  });

  it.each([
    ['0014', 'Banco Invest'],
    ['0079', 'Abanca (código transitório)'],
    ['0170', 'Abanca'],
    ['0235', 'Banco Carregosa'],
  ])('should use the documented bank reference: %s / %s', (code, name) => {
    expect(bankMap[code]).toBe(name);
    expect(createIBAN(code).bankName).toBe(name);
  });

  it('should omit the transitional bank code from default random generation', () => {
    expect(bankCodes).not.toContain('0079');
    expect(bankCodes).toContain('0170');
    expect(Object.keys(bankMap)).toContain('0079');
    const random = vi.spyOn(Math, 'random');
    for (let index = 0; index < bankCodes.length; index++) {
      random.mockReturnValue((index + 0.5) / bankCodes.length);
      expect(createIBAN().bankCode).toBe(bankCodes[index]);
      expect(createIBAN().bankCode).not.toBe('0079');
    }
  });

  it('should still support explicit transitional-code generation and technical validation', () => {
    const result = createIBAN('0079');
    expect(result.bankCode).toBe('0079');
    expect(validateIBAN(result.iban)).toBe(true);
    expect(referenceRemainder(result.iban.substring(4))).toBe(1);
    expect(referenceRemainder(result.iban.substring(4) + result.iban.substring(0, 4))).toBe(1);
  });

  it.each(['0086', '0103', '0121'])('should not use a previously mislabelled code: %s', (code) => {
    expect(() => createIBAN(code)).toThrow(RangeError);
  });

  it.each(['', '35', '00350', 'ABCD', '9999', '0035 ', '003\n', '__proto__'])(
    'should reject unsupported bank inputs: %j',
    (code) => {
      expect(() => createIBAN(code)).toThrow(RangeError);
    }
  );

  it('should preserve zero-filled branch and account components', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(createIBAN('0035').iban).toBe('PT50' + '0035' + '0000' + '00000000000' + '29');
  });

  it('should pass independent structural and checksum checks for every supported bank', () => {
    let randomState = 12345;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      randomState = (1664525 * randomState + 1013904223) >>> 0;
      return randomState / 2 ** 32;
    });

    for (const bankCode of Object.keys(bankMap)) {
      for (let sample = 0; sample < 100; sample++) {
        const { iban } = createIBAN(bankCode);
        expect(iban).toMatch(/^PT50[0-9]{21}$/);
        expect(iban.substring(4, 8)).toBe(bankCode);
        expect(referenceRemainder(iban.substring(4))).toBe(1);
        expect(referenceRemainder(iban.substring(4) + iban.substring(0, 4))).toBe(1);
      }
    }
  });

  it('should create an IBAN with 25 characters', () => {
    const { iban } = createIBAN();
    expect(iban).toHaveLength(25);
  });

  it('should start with PT', () => {
    const { iban } = createIBAN();
    expect(iban.startsWith('PT')).toBe(true);
  });

  it('should return bank code and name', () => {
    const result = createIBAN();
    expect(result.bankCode).toBeDefined();
    expect(result.bankCode).toHaveLength(4);
    expect(result.bankName).toBeDefined();
    expect(result.bankName.length).toBeGreaterThan(0);
  });

  it('should create valid IBANs that pass validation', () => {
    // Generate 10 IBANs and validate all
    for (let i = 0; i < 10; i++) {
      const { iban } = createIBAN();
      expect(validateIBAN(iban)).toBe(true);
    }
  });

  it('should use specific bank code when provided', () => {
    const { bankCode } = createIBAN('0035');
    expect(bankCode).toBe('0035');
  });
});

describe('validateIBAN', () => {
  it.each([null, undefined, 123, {}, []])('should reject non-string identifiers: %j', (value) => {
    const input = value as unknown as string;
    expect(validateIBAN(input)).toBe(false);
    expect(parseIBAN(input)).toBeNull();
    expect(() => formatIBAN(input)).toThrow(RangeError);
  });

  it('should accept the independent SWIFT Portugal reference vector', () => {
    expect(validateIBAN('PT50000201231234567890154')).toBe(true);
  });

  it('should reject an international checksum with invalid domestic control digits', () => {
    const invalid = 'PT53000201231234567890100';
    expect(referenceRemainder(invalid.substring(4) + invalid.substring(0, 4))).toBe(1);
    expect(validateIBAN(invalid)).toBe(false);
  });

  it.each([
    'PT50' + '!'.repeat(21),
    'PT50' + '0'.repeat(20) + '\n',
    'PT50\t000201231234567890154',
    'PT50\u00a0000201231234567890154',
    'PT50-0002-0123-12345678901-54',
    'PT50000201231234567890154\u200b',
    'PT500002012312345678901５4',
    'PT50000000000000000000000',
  ])('should reject malformed structure: %j', (value) => {
    expect(validateIBAN(value)).toBe(false);
    expect(parseIBAN(value)).toBeNull();
    expect(() => formatIBAN(value)).toThrow(RangeError);
  });

  it('should reject letters even when the international checksum is correct', () => {
    expect(validateIBAN(referenceIBAN('ABCD01231234567890154'))).toBe(false);
  });

  it('should reject noncanonical domestic control digits with a matching remainder', () => {
    expect(referenceRemainder('000000000000000000098')).toBe(1);
    expect(validateIBAN(referenceIBAN('000000000000000000001'))).toBe(false);
  });

  it('should validate correct Portuguese IBANs', () => {
    const { iban } = createIBAN();
    expect(validateIBAN(iban)).toBe(true);
  });

  it('should reject IBANs with wrong length', () => {
    expect(validateIBAN('PT50003500011234567890')).toBe(false);
  });

  it('should reject IBANs with wrong country code', () => {
    expect(validateIBAN('ES5000350001123456789012')).toBe(false);
  });

  it('should reject IBANs with invalid check digits', () => {
    // Create valid IBAN and then modify check digits
    const { iban } = createIBAN();
    const invalidIban = iban.substring(0, 2) + '00' + iban.substring(4);
    expect(validateIBAN(invalidIban)).toBe(false);
  });

  it('should handle IBANs with spaces', () => {
    const { iban } = createIBAN();
    const withSpaces = iban.match(/.{1,4}/g)?.join(' ') ?? iban;
    expect(validateIBAN(withSpaces)).toBe(true);
  });

  it('should handle lowercase IBANs', () => {
    const { iban } = createIBAN();
    expect(validateIBAN(iban.toLowerCase())).toBe(true);
  });
});

describe('parseIBAN', () => {
  it('should parse valid IBAN into components', () => {
    const { iban } = createIBAN();
    const parsed = parseIBAN(iban);

    expect(parsed).not.toBeNull();
    expect(parsed?.countryCode).toBe('PT');
    expect(parsed?.checkDigits).toHaveLength(2);
    expect(parsed?.bankCode).toHaveLength(4);
    expect(parsed?.branchCode).toHaveLength(4);
    expect(parsed?.accountNumber).toHaveLength(11);
    expect(parsed?.nibControlDigits).toHaveLength(2);
  });

  it('should return null for invalid IBANs', () => {
    expect(parseIBAN('invalid')).toBeNull();
    expect(parseIBAN('ES5000350001123456789012')).toBeNull();
    expect(parseIBAN('PT53000201231234567890100')).toBeNull();
  });

  it('should handle IBANs with spaces', () => {
    const { iban } = createIBAN();
    const withSpaces = formatIBAN(iban);
    const parsed = parseIBAN(withSpaces);
    expect(parsed).not.toBeNull();
  });
});

describe('formatIBAN', () => {
  it('should normalize lowercase and ordinary spaces without changing leading zeros', () => {
    const formatted = 'PT50 0002 0123 1234 5678 9015 4';
    expect(formatIBAN('  pt50 0002 0123 1234 5678 9015 4  ')).toBe(formatted);
    expect(parseIBAN(formatted)?.branchCode).toBe('0123');
  });

  it('should format IBAN with spaces every 4 characters', () => {
    const { iban } = createIBAN();
    const formatted = formatIBAN(iban);

    // Should have spaces
    expect(formatted).toContain(' ');

    // Each group should be 4 chars (except possibly last)
    const groups = formatted.split(' ');
    groups.slice(0, -1).forEach((group) => {
      expect(group).toHaveLength(4);
    });
  });

  it('should handle already formatted IBANs', () => {
    const { iban } = createIBAN();
    const formatted = formatIBAN(iban);
    const doubleFormatted = formatIBAN(formatted);
    expect(formatted).toBe(doubleFormatted);
  });
});

describe('createMultipleIBANs', () => {
  it.each(Object.keys(bankMap))('should honour a selected code in a six-item batch: %s', (code) => {
    const batch = createMultipleIBANs(6, code);
    expect(batch).toHaveLength(6);
    expect(new Set(batch.map(({ iban }) => iban)).size).toBe(6);
    for (const result of batch) {
      expect(result.bankCode).toBe(code);
      expect(result.iban.substring(4, 8)).toBe(code);
      expect(referenceRemainder(result.iban.substring(4))).toBe(1);
      expect(referenceRemainder(result.iban.substring(4) + result.iban.substring(0, 4))).toBe(1);
    }
  });

  it('should reject an unsupported bank code for a batch', () => {
    expect(() => createMultipleIBANs(6, '9999')).toThrow(RangeError);
  });

  it.each([1, 5, 6, 100])('should return the exact supported quantity: %s', (count) => {
    expect(createMultipleIBANs(count)).toHaveLength(count);
  });

  it('should retry a collision and return a complete unique batch', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(0.5);
    expect(new Set(createMultipleIBANs(2).map(({ iban }) => iban)).size).toBe(2);
  });

  it('should stop after a bounded number of forced collisions', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(() => createMultipleIBANs(2)).toThrow('attempt limit');
    expect(random).toHaveBeenCalledTimes(60);
  });

  it('should create the requested number of IBANs', () => {
    const ibans = createMultipleIBANs(5);
    expect(ibans).toHaveLength(5);
  });

  it.each([0, -1, 1.5, 101, NaN, Infinity, -Infinity])(
    'should reject invalid quantities instead of changing them: %s',
    (count) => {
      expect(() => createMultipleIBANs(count)).toThrow(RangeError);
    }
  );

  it('should create all valid IBANs', () => {
    const ibans = createMultipleIBANs(10);
    ibans.forEach(({ iban }) => {
      expect(validateIBAN(iban)).toBe(true);
    });
  });

  it('should create unique IBANs (with very high probability)', () => {
    const ibans = createMultipleIBANs(20);
    const ibanStrings = ibans.map(({ iban }) => iban);
    const uniqueIbans = new Set(ibanStrings);
    expect(uniqueIbans.size).toBe(20);
  });
});

describe('IBAN Integration Tests', () => {
  it('should maintain consistency between create, parse, and validate', () => {
    const result = createIBAN();
    const parsed = parseIBAN(result.iban);

    expect(parsed).not.toBeNull();
    expect(parsed?.bankCode).toBe(result.bankCode);
    expect(validateIBAN(result.iban)).toBe(true);
  });

  it('should correctly reconstruct IBAN from parsed components', () => {
    const { iban } = createIBAN();
    const parsed = parseIBAN(iban);

    if (parsed) {
      const reconstructed =
        parsed.countryCode +
        parsed.checkDigits +
        parsed.bankCode +
        parsed.branchCode +
        parsed.accountNumber +
        parsed.nibControlDigits;

      expect(reconstructed).toBe(iban);
    }
  });
});
