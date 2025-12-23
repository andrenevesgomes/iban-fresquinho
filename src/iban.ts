import { bankCodes, bankMap, type IBANResult, type IBANStructure } from './types';

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
  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  const expanded = value.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString()
  );

  // Process in chunks to avoid JavaScript integer limitations
  let remainder = expanded;
  while (remainder.length > 2) {
    const block = remainder.substring(0, 9);
    remainder = (parseInt(block, 10) % 97).toString() + remainder.substring(block.length);
  }

  return parseInt(remainder, 10) % 97;
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
  const nibBase = bankCode + branchCode + accountNumber;
  return pad(98 - mod97(nibBase + '00'), 2);
}

/**
 * Calculates IBAN check digits according to ISO 13616.
 * @param bban - The Basic Bank Account Number (21 digits for Portugal).
 * @param countryCode - The country code (e.g., "PT").
 * @returns The 2-digit IBAN check digits.
 */
export function calculateIBANCheckDigits(bban: string, countryCode: string): string {
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
  const bankCode = specificBankCode ?? bankCodes[Math.floor(Math.random() * bankCodes.length)];
  
  if (!bankCode) {
    throw new Error('No bank codes available');
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
    bankName: bankMap[bankCode] ?? 'Unknown Bank',
  };
}

/**
 * Validates an IBAN using the mod97 algorithm.
 * @param iban - The IBAN string to validate.
 * @returns True if the IBAN is valid, false otherwise.
 */
export function validateIBAN(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  // Check length for Portuguese IBAN
  if (cleaned.length !== 25) {
    return false;
  }

  // Check country code
  if (!cleaned.startsWith('PT')) {
    return false;
  }

  // Rearrange: move first 4 chars to end
  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);

  // Valid IBAN has mod97 = 1
  return mod97(rearranged) === 1;
}

/**
 * Parses an IBAN into its component parts.
 * @param iban - The IBAN string to parse.
 * @returns The parsed IBAN structure or null if invalid.
 */
export function parseIBAN(iban: string): IBANStructure | null {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  if (cleaned.length !== 25 || !cleaned.startsWith('PT')) {
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
  const cleaned = iban.replace(/\s/g, '');
  return cleaned.match(/.{1,4}/g)?.join(' ') ?? iban;
}

/**
 * Generates multiple valid IBANs.
 * @param count - Number of IBANs to generate (max 100).
 * @returns Array of IBAN results.
 */
export function createMultipleIBANs(count: number): IBANResult[] {
  const safeCount = Math.min(Math.max(1, count), 100);
  return Array.from({ length: safeCount }, () => createIBAN());
}
