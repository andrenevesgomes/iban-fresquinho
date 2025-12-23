import { describe, it, expect } from 'vitest';
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
  });

  it('should handle IBANs with spaces', () => {
    const { iban } = createIBAN();
    const withSpaces = formatIBAN(iban);
    const parsed = parseIBAN(withSpaces);
    expect(parsed).not.toBeNull();
  });
});

describe('formatIBAN', () => {
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
  it('should create the requested number of IBANs', () => {
    const ibans = createMultipleIBANs(5);
    expect(ibans).toHaveLength(5);
  });

  it('should limit to 100 IBANs maximum', () => {
    const ibans = createMultipleIBANs(150);
    expect(ibans).toHaveLength(100);
  });

  it('should create at least 1 IBAN', () => {
    const ibans = createMultipleIBANs(0);
    expect(ibans).toHaveLength(1);
  });

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
