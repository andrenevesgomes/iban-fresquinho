import { describe, expect, it } from 'vitest';
import reference from '../../docs/bank-reference.json';
import { bankCodes, bankMap } from '../types';
import { bankCatalogue, bankReferenceSource } from '../banks';

describe('Banco de Portugal complete reference', () => {
  it('should include all 107 distinct IBAN codes in the official snapshot', () => {
    expect(Object.keys(bankMap)).toHaveLength(107);
    expect(bankMap).toHaveProperty('3560');
    expect(bankMap).toHaveProperty('9871');
  });

  it('should record the verified source metadata and sha256 digest', () => {
    expect(reference.source.publisher).toBe('Banco de Portugal');
    expect(reference.source.documentUpdatedAt).toBe('2026-10-13');
    expect(reference.source.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should match every supported label to the reviewed source projection', () => {
    expect(reference.records).toHaveLength(174);
    expect(reference.counts).toEqual({ institutionRows: 174, ibanCodes: 107 });
    expect(reference.records.map(({ row }) => row)).toEqual(
      Array.from({ length: 174 }, (_, index) => index + 2)
    );
    expect(new Set(reference.records.map(({ code }) => code)).size).toBe(107);
    expect(new Set(bankCatalogue.map(({ code }) => code))).toEqual(
      new Set(reference.records.map(({ code }) => code))
    );
    expect(
      bankCatalogue
        .flatMap(({ institutions }) => institutions)
        .sort((first, second) => first.row - second.row)
    ).toEqual(reference.records);
    for (const bank of bankCatalogue) {
      expect(bankMap[bank.code]).toBe(bank.displayName);
      expect(bank.institutions.every(({ code }) => code === bank.code)).toBe(true);
      expect(new Set(bank.institutionTypes)).toEqual(
        new Set(bank.institutions.map(({ institutionType }) => institutionType))
      );
    }
  });

  it('should apply the reviewed default-generation policy without replacing IBAN codes', () => {
    const ordinaryBankTypes = new Set(
      [
        'Bancos',
        'Caixas Económicas',
        'Caixa Central e Caixas de Crédito Agrícola Mútuo',
        'Instituições de crédito com sede na UE - Sucursais em PT',
      ].map((type) => type.toLowerCase())
    );
    expect(bankCodes).toEqual(
      [
        ...new Set(
          reference.records
            .filter(
              ({ code, institutionType }) =>
                code !== '0079' && ordinaryBankTypes.has(institutionType.toLowerCase())
            )
            .map(({ code }) => code)
        ),
      ].sort()
    );
    expect(bankCodes).toHaveLength(69);
    expect(bankCodes).toContain('0286');
    expect(bankCodes).toContain('0045');
    expect(bankCodes).not.toContain('9000');
    expect(bankCodes).not.toContain(reference.transition.bankCode);
    expect(bankCodes).toContain(reference.transition.successorBankCode);
  });

  it('should keep source categories, footnotes and shared institutions without guessing', () => {
    expect(bankCatalogue.find(({ code }) => code === '0045')?.institutions).toHaveLength(68);
    expect(
      bankCatalogue
        .find(({ code }) => code === '0045')
        ?.institutions.map(({ financialInstitutionCode }) => financialInstitutionCode)
    ).toContain('9000');
    expect(reference.notes).toHaveLength(4);
    expect(reference.transition.endDate).toBeNull();
    expect(bankCatalogue.find(({ code }) => code === '0079')?.transitional).toBe(true);
    for (const record of reference.records) {
      expect(record.code).toMatch(/^[0-9]{4}$/);
      expect(record.financialInstitutionCode).toMatch(/^[0-9]{4}$/);
      expect(record.rawBankCode).toBe(
        record.code + (record.sourceNote === null ? '' : `(${record.sourceNote})`)
      );
      expect(record.officialName).not.toBe('');
      expect(record.institutionType).not.toBe('');
    }
  });

  it('should retain non-bank codes for explicit generation without adding them to the default pool', () => {
    for (const code of ['0001', '0244', '0781', '7837', '8115', '8707', '9871']) {
      expect(bankMap).toHaveProperty(code);
      expect(bankCodes).not.toContain(code);
    }
    expect(bankCodes).toContain('3560');
  });

  it('should expose an immutable dated catalogue', () => {
    expect(bankReferenceSource.documentUpdatedAt).toBe('2026-10-13');
    expect(Object.isFrozen(bankReferenceSource)).toBe(true);
    expect(Object.isFrozen(bankMap)).toBe(true);
    expect(Object.isFrozen(bankCodes)).toBe(true);
    expect(Object.isFrozen(bankCatalogue)).toBe(true);
    for (const bank of bankCatalogue) {
      expect(Object.isFrozen(bank)).toBe(true);
      expect(Object.isFrozen(bank.institutions)).toBe(true);
      expect(Object.isFrozen(bank.institutionTypes)).toBe(true);
      expect(bank.institutions.every(Object.isFrozen)).toBe(true);
    }
  });
});
