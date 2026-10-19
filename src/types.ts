export { bankMap, bankCodes } from './banks';

/**
 * Result of IBAN generation.
 */
export interface IBANResult {
  /** The complete IBAN string */
  iban: string;
  /** The bank code used */
  bankCode: string;
  /** The bank name corresponding to the code */
  bankName: string;
}

/**
 * Structure of a Portuguese IBAN.
 */
export interface IBANStructure {
  /** Country code (always "PT") */
  countryCode: string;
  /** IBAN check digits (2 digits) */
  checkDigits: string;
  /** Bank code (4 digits) */
  bankCode: string;
  /** Branch code (4 digits) */
  branchCode: string;
  /** Account number (11 digits) */
  accountNumber: string;
  /** NIB control digits (2 digits) */
  nibControlDigits: string;
}
