import reference from '../docs/bank-reference.json';

export type BankInstitution = Readonly<(typeof reference.records)[number]>;

export interface BankReference {
  readonly code: string;
  readonly displayName: string;
  readonly institutions: readonly BankInstitution[];
  readonly institutionTypes: readonly string[];
  readonly transitional: boolean;
  readonly defaultGeneration: boolean;
}

export const bankReferenceSource = Object.freeze(reference.source);

const defaultInstitutionTypes = new Set(
  [
    'Bancos',
    'Caixas Econ\u00f3micas',
    'Caixa Central e Caixas de Cr\u00e9dito Agr\u00edcola M\u00fatuo',
    'Institui\u00e7\u00f5es de cr\u00e9dito com sede na UE - Sucursais em PT',
  ].map((type) => type.toLowerCase())
);

const displayAliases: Readonly<Record<string, string>> = {
  '0007': 'Novo Banco',
  '0010': 'BPI',
  '0014': 'Banco Invest',
  '0018': 'Santander Totta',
  '0033': 'Millennium BCP',
  '0035': 'Caixa Geral de Dep\u00f3sitos',
  '0045': 'Cr\u00e9dito Agr\u00edcola',
  '0079': 'Abanca (c\u00f3digo transit\u00f3rio)',
  '0170': 'Abanca',
  '0235': 'Banco Carregosa',
};

const groupedInstitutions = new Map<string, BankInstitution[]>();
for (const record of reference.records) {
  const institutions = groupedInstitutions.get(record.code) ?? [];
  institutions.push(Object.freeze(record));
  groupedInstitutions.set(record.code, institutions);
}

export const bankCatalogue: readonly BankReference[] = Object.freeze(
  [...groupedInstitutions.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([code, institutions]) => {
      const institutionTypes = [...new Set(institutions.map((entry) => entry.institutionType))];
      const transitional = code === reference.transition.bankCode;
      const displayName =
        displayAliases[code] ?? institutions.map((entry) => entry.officialName).join(' / ');
      return Object.freeze({
        code,
        displayName,
        institutions: Object.freeze(institutions),
        institutionTypes: Object.freeze(institutionTypes),
        transitional,
        defaultGeneration:
          !transitional &&
          institutionTypes.every((type) => defaultInstitutionTypes.has(type.toLowerCase())),
      });
    })
);

export const bankMap: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(bankCatalogue.map(({ code, displayName }) => [code, displayName]))
);

export const bankCodes: readonly string[] = Object.freeze(
  bankCatalogue.filter(({ defaultGeneration }) => defaultGeneration).map(({ code }) => code)
);
