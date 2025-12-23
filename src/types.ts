/**
 * Map of bank codes to their respective names.
 */
export const bankMap: Record<string, string> = {
  '0007': 'Novo Banco',
  '0010': 'BPI',
  '0018': 'Santander Totta',
  '0033': 'Millennium BCP',
  '0035': 'Caixa Geral de Depósitos',
  '0045': 'Crédito Agrícola',
  '0079': 'Abanca',
  '0086': 'Banco Invest',
  '0103': 'Banco BIC',
  '0121': 'Banco Carregosa',
} as const;

/**
 * Array of all available bank codes.
 */
export const bankCodes: string[] = Object.keys(bankMap);

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
