import { bankCodes, bankMap, type IBANResult, type IBANStructure } from './types';

export const MAX_IBAN_BATCH_SIZE = 100;

function isNumericString(value: string, length: number): boolean {
  return typeof value === 'string' && value.length === length && !/[^0-9]/.test(value);
}

function normalizeIBAN(iban: string): string {
  return typeof iban === 'string' ? iban.replace(/ /g, '').toUpperCase() : '';
}

/**
 * Pads a number with leading zeros to achieve the specified length.
 * @param num - The number to pad.
 * @param length - The desired length of the resulting string.
 * @returns The padded string.
 */
export function pad(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

/**
 * Calculates the modulo 97 of a numeric string (used for IBAN verification).
 * Implements the ISO 13616 standard for IBAN check digit calculation.
 * @param value - The numeric string to process.
 * @returns The remainder when divided by 97.
 */
export function mod97(value: string): number {
  if (typeof value !== 'string' || value.length === 0 || /[^0-9A-Z]/.test(value)) {
    throw new RangeError('Expected a non-empty string of digits and uppercase ASCII letters');
  }

  let remainder = 0;
  for (const character of value) {
    const code = character.charCodeAt(0);
    const numericValue = code >= 65 ? code - 55 : code - 48;
    remainder = (remainder * (code >= 65 ? 100 : 10) + numericValue) % 97;
  }

  return remainder;
}

/**
 * Generates a random number within a range and pads it.
 * @param max - Maximum value (exclusive).
 * @param length - Desired string length.
 * @returns A padded random number string.
 */
function randomPadded(max: number, length: number): string {
  return pad(Math.floor(Math.random() * max), length);
}

/**
 * Calculates NIB control digits using the Portuguese standard.
 * @param bankCode - 4-digit bank code.
 * @param branchCode - 4-digit branch code.
 * @param accountNumber - 11-digit account number.
 * @returns The 2-digit NIB control digits.
 */
export function calculateNIBControlDigits(
  bankCode: string,
  branchCode: string,
  accountNumber: string
): string {
  if (
    !isNumericString(bankCode, 4) ||
    !isNumericString(branchCode, 4) ||
    !isNumericString(accountNumber, 11)
  ) {
    throw new RangeError('Expected bank (4), branch (4) and account (11) digits');
  }

  const nibBase = bankCode + branchCode + accountNumber;
  return pad(98 - mod97(nibBase + '00'), 2);
}

/**
 * Calculates international check digits for a Portuguese BBAN.
 * @param bban - The Basic Bank Account Number (21 digits for Portugal).
 * @param countryCode - The supported country code, "PT".
 * @returns The 2-digit IBAN check digits.
 */
export function calculateIBANCheckDigits(bban: string, countryCode: string): string {
  if (countryCode !== 'PT' || !isNumericString(bban, 21)) {
    throw new RangeError('Expected a Portuguese BBAN of 21 digits');
  }

  return pad(98 - mod97(bban + countryCode + '00'), 2);
}

/**
 * Creates a valid Portuguese IBAN with proper check digits.
 * Follows ISO 13616 for IBAN and Portuguese banking standards for NIB.
 * @param specificBankCode - Optional: Use a specific bank code instead of random.
 * @returns An object containing the generated IBAN and bank information.
 */
export function createIBAN(specificBankCode?: string): IBANResult {
  const countryCode = 'PT';

  // Select bank code (random or specified)
  const bankCode =
    specificBankCode === undefined
      ? bankCodes[Math.floor(Math.random() * bankCodes.length)]
      : specificBankCode;

  if (
    !bankCode ||
    !isNumericString(bankCode, 4) ||
    !Object.prototype.hasOwnProperty.call(bankMap, bankCode)
  ) {
    throw new RangeError('Unsupported bank code');
  }

  // Generate random branch code (4 digits) and account number (11 digits)
  const branchCode = randomPadded(10000, 4);
  const accountNumber = randomPadded(100000000000, 11);

  // Calculate NIB control digits (NOT random!)
  const nibControlDigits = calculateNIBControlDigits(bankCode, branchCode, accountNumber);

  // Build complete BBAN
  const bban = bankCode + branchCode + accountNumber + nibControlDigits;

  // Calculate IBAN check digits
  const ibanCheckDigits = calculateIBANCheckDigits(bban, countryCode);

  // Build final IBAN
  const iban = countryCode + ibanCheckDigits + bban;

  return {
    iban,
    bankCode,
    bankName: bankMap[bankCode]!,
  };
}

/**
 * Validates Portuguese structure, international and domestic control digits.
 * @param iban - The IBAN string to validate.
 * @returns True if the IBAN is valid, false otherwise.
 */
export function validateIBAN(iban: string): boolean {
  const cleaned = normalizeIBAN(iban);
  if (!cleaned.startsWith('PT50') || !isNumericString(cleaned.substring(4), 21)) {
    return false;
  }

  const expectedNIBDigits = calculateNIBControlDigits(
    cleaned.substring(4, 8),
    cleaned.substring(8, 12),
    cleaned.substring(12, 23)
  );
  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);

  return cleaned.substring(23) === expectedNIBDigits && mod97(rearranged) === 1;
}

/**
 * Parses an IBAN into its component parts.
 * @param iban - The IBAN string to parse.
 * @returns The parsed IBAN structure or null if invalid.
 */
export function parseIBAN(iban: string): IBANStructure | null {
  const cleaned = normalizeIBAN(iban);

  if (!validateIBAN(cleaned)) {
    return null;
  }

  return {
    countryCode: cleaned.substring(0, 2),
    checkDigits: cleaned.substring(2, 4),
    bankCode: cleaned.substring(4, 8),
    branchCode: cleaned.substring(8, 12),
    accountNumber: cleaned.substring(12, 23),
    nibControlDigits: cleaned.substring(23, 25),
  };
}

/**
 * Formats an IBAN with spaces for better readability.
 * @param iban - The IBAN string to format.
 * @returns The formatted IBAN with spaces every 4 characters.
 */
export function formatIBAN(iban: string): string {
  const cleaned = normalizeIBAN(iban);
  if (!validateIBAN(cleaned)) {
    throw new RangeError('Invalid Portuguese IBAN');
  }

  return cleaned.match(/.{1,4}/g)!.join(' ');
}

/**
 * Generates a batch of unique IBANs, with at most ten attempts per requested item.
 * @param count - Integer number of IBANs to generate, from 1 to 100.
 * @param specificBankCode - Optional single bank code or array of bank codes to cycle/draw from.
 * @returns A complete batch, or throws if the quantity or collision limit is invalid.
 */
export function createMultipleIBANs(
  count: number,
  specificBankCode?: string | readonly string[]
): IBANResult[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_IBAN_BATCH_SIZE) {
    throw new RangeError(`Expected an integer quantity from 1 to ${MAX_IBAN_BATCH_SIZE}`);
  }

  const pool = Array.isArray(specificBankCode)
    ? specificBankCode
    : specificBankCode !== undefined
      ? [specificBankCode as string]
      : undefined;

  if (pool && pool.length === 0) {
    throw new RangeError('Unsupported bank code');
  }
  if (pool) {
    for (const code of pool) {
      if (
        !code ||
        !isNumericString(code, 4) ||
        !Object.prototype.hasOwnProperty.call(bankMap, code)
      ) {
        throw new RangeError('Unsupported bank code');
      }
    }
  }

  const results = new Map<string, IBANResult>();
  // A single IBAN starts at a random selected bank; batches cycle through the selection in order.
  const startOffset =
    pool && pool.length > 1 && count === 1 ? Math.floor(Math.random() * pool.length) : 0;
  for (let attempt = 0; attempt < count * 10 && results.size < count; attempt++) {
    const code = pool ? pool[(startOffset + results.size) % pool.length] : undefined;
    const result = createIBAN(code);
    results.set(result.iban, result);
  }

  if (results.size !== count) {
    throw new Error('Unable to generate a unique batch within the attempt limit');
  }

  return [...results.values()];
}
