# IBAN Fresquinho 🏦

[![CI](https://github.com/andrenevesgomes/iban-fresquinho/actions/workflows/ci.yml/badge.svg)](https://github.com/andrenevesgomes/iban-fresquinho/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🇵🇹 Inspirado por uma mente brilhante e um coração que ama bordô.

> 🇬🇧 Inspired by a brilliant mind and a heart that loves bordeaux.

Um gerador de IBANs portugueses **válidos** para testes de software, desenvolvimento e demonstrações.

**Nota de validade:** os IBANs gerados têm estrutura portuguesa (`PT50` + 21 dígitos) e dígitos de controlo IBAN/NIB matematicamente válidos (ISO 13616). Podem coincidir com números já atribuídos: não se verifica a existência da conta, o balcão ou a titularidade. Usar apenas em testes autorizados, nunca para pagamentos.

## 📚 Índice / Table of Contents

- [IBAN Fresquinho 🏦](#iban-fresquinho-)
  - [📚 Índice / Table of Contents](#-índice--table-of-contents)
  - [✨ Funcionalidades](#-funcionalidades)
  - [🚀 Como Utilizar](#-como-utilizar)
  - [🛠️ Desenvolvimento](#️-desenvolvimento)
  - [💡 Sobre o formato de IBANs portugueses](#-sobre-o-formato-de-ibans-portugueses)
  - [🧑‍💻 Tecnologias utilizadas](#-tecnologias-utilizadas)


<details>
<summary><h2>🇵🇹 Versão Portuguesa</h2></summary>

Um gerador de IBANs portugueses válidos para testes de software, desenvolvimento e demonstrações.


## ✨ Funcionalidades

- ✅ Gera IBANs portugueses com **dígitos de verificação válidos** (ISO 13616)
- ✅ Calcula corretamente os **dígitos de controlo NIB** (norma portuguesa)
- ✅ Designações bancárias verificadas na lista do Banco de Portugal de 13/10/2026, sem confirmar contas ou balcões
- ✅ Todos os 107 códigos publicados disponíveis no seletor; 69 códigos bancários no grupo aleatório predefinido
- ✅ Gera entre 1 e 100 IBANs, sem repetições dentro do mesmo lote e sem truncar quantidades inválidas
- ✅ Botões de cópia acessíveis por teclado e alternativa manual quando o navegador recusa a cópia
- ✅ Interface clara, um IBAN pronto à chegada e um único fluxo para gerar de 1 a 100
- ✅ Pesquisa de bancos por nome ou código e cópia de todos os resultados apresentados
- ✅ PWA com caminhos e ícones corrigidos e atualização por confirmação; aceitação em dispositivos instalados continua necessária
- ✅ Interface simples e intuitiva
- ✅ NIF Fresquinho: NIFs de pessoa singular ou empresa, de 1 a 100, com dígito de controlo módulo 11
- ✅ Testes Vitest com vetor SWIFT, controlos independentes, entradas inválidas e colisões forçadas


## 🚀 Como Utilizar

### 🌐 Método Online

1. Acede à versão online em: [IBAN Fresquinho](https://iban-fresquinho.vercel.app/)
2. Um IBAN está pronto logo à chegada, com cópia imediata num clique
3. Seleciona um ou vários bancos nos atalhos ou na pesquisa por nome/código. A seleção é partilhada entre ambos; **Concluir** fecha o seletor e **Limpar seleção** repõe o grupo predefinido. Escolhe a quantidade (`1` a `100`) e clica em **Gerar**
4. Para vários resultados, **Copiar todos** copia todos os IBANs gerados. A confirmação aparece no botão e na barra de resultados, que acompanha a deslocação da lista

Com vários bancos selecionados, um único IBAN usa um banco escolhido aleatoriamente dessa seleção; pode repetir o banco anterior. Os lotes percorrem a seleção pela ordem escolhida. Inclui modo claro/escuro e suporte offline como PWA.

Os atalhos de quantidade `1`, `5` e `6` alteram apenas o próximo pedido; os resultados mantêm-se até clicar em **Gerar**. O seletor de bancos aceita navegação por setas e `Enter` quando a pesquisa devolve um único código.

**NIF Fresquinho:** clica no prefixo do título (**IBAN**) e escolhe **NIF** para gerar de 1 a 100 identificadores para **Pessoa singular** (gamas `1`, `2`, `3`) ou **Empresa** (perfil limitado à gama `5`). Mudar de ferramenta preserva os resultados, a quantidade e as escolhas de cada uma. Mudar o perfil só afeta a próxima geração. As gamas especiais estão excluídas, sem que isso as torne inválidas. Os NIFs podem coincidir com números atribuídos; não é consultada a AT nem o VIES.

Apenas a preferência de tema é guardada em `localStorage`; os IBANs e NIFs gerados ficam apenas em memória e são descartados ao recarregar. As animações de resposta são breves e respeitam a preferência de movimento reduzido. O modo offline requer uma primeira visita online e a instalação bem-sucedida da cache da PWA.

### 📍 Método Local (Desenvolvimento)

Recomendado: Node.js 24 LTS e pnpm 10.34.7, fixado no [package.json](package.json). O [pnpm-lock.yaml](pnpm-lock.yaml) é o único lockfile. Os requisitos mínimos técnicos estão em `engines`; não são necessárias variáveis de ambiente para gerar IBANs. Usar uma instalação existente de pnpm ou o Corepack; não é necessário alterar ferramentas globais.

```bash
# Clonar o repositório
git clone https://github.com/andrenevesgomes/iban-fresquinho.git
cd iban-fresquinho

# Instalar dependências
corepack pnpm install --frozen-lockfile

# Iniciar servidor de desenvolvimento
pnpm run dev

# Correr testes
pnpm test

# Build para produção
pnpm run build
```

## 🛠️ Desenvolvimento

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm run dev` | Inicia o servidor de desenvolvimento |
| `pnpm run build` | Compila para produção |
| `pnpm run preview` | Pré-visualiza o build com os cabeçalhos de segurança |
| `pnpm test` | Corre os testes em modo watch |
| `pnpm run test:run` | Corre os testes uma vez |
| `pnpm run test:coverage` | Corre os testes com cobertura |
| `pnpm run lint` | Verifica erros de linting |
| `pnpm run lint:fix` | Corrige erros de linting automaticamente |
| `pnpm run format` | Formata o código com Prettier |
| `pnpm run format:check` | Verifica a formatação sem alterar ficheiros |
| `pnpm run typecheck` | Verifica tipos TypeScript |

### Estrutura do Projeto

```
iban-fresquinho/
├── src/
│   ├── __tests__/
│   │   └── iban.test.ts    # Testes unitários
│   ├── iban.ts              # Lógica de geração de IBAN
│   ├── types.ts             # Definições TypeScript
│   ├── main.ts              # Ponto de entrada da aplicação
│   └── styles.css           # Estilos Tailwind
├── index.html               # HTML principal
├── vite.config.ts           # Configuração Vite
├── tailwind.config.js       # Configuração Tailwind
├── tsconfig.json            # Configuração TypeScript
├── vitest.config.ts         # Configuração Vitest
└── eslint.config.js         # Configuração ESLint
```

## 💡 Sobre o formato de IBANs portugueses

Os IBANs portugueses seguem a estrutura (25 caracteres):

```
PT 50 BBBB SSSS CCCCCCCCCCC KK
│  │  │    │    │           │
│  │  │    │    │           └─ Dígitos de controlo NIB (2)
│  │  │    │    └───────────── Número da conta (11)
│  │  │    └────────────────── Código da agência (4)
│  │  └─────────────────────── Código do banco (4)
│  └────────────────────────── Dígitos de verificação IBAN (2)
└───────────────────────────── Código do país
```

### Algoritmos Implementados

1. **Dígitos de controlo NIB**: `98 - mod97(bankCode + branchCode + accountNumber + "00")`
2. **Dígitos de verificação IBAN**: `98 - mod97(BBAN + "PT00")` (ISO 13616)

Antes do cálculo, as letras ASCII são convertidas em números (`PT` = `2529`). A validação exige `PT50`, 21 algarismos no BBAN, os dígitos NIB calculados e resto internacional igual a 1. Os identificadores são strings; zeros iniciais são preservados. Bancos suportados na geração e confirmação de contas reais são conceitos diferentes.

## 🧑‍💻 Tecnologias utilizadas

- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Vite](https://vitejs.dev/)** - Build tool e dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS
- **[Vitest](https://vitest.dev/)** - Framework de testes
- **[ESLint](https://eslint.org/)** + **[Prettier](https://prettier.io/)** - Linting e formatação
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD
- **PWA** - Progressive Web App com vite-plugin-pwa

</details>

<details>
<summary><h2>🇬🇧 English Version</h2></summary>

A generator of **valid** Portuguese IBANs for software testing, development, and demonstrations.


### ✨ Features

- ✅ Generates Portuguese IBANs with **valid check digits** (ISO 13616)
- ✅ Correctly calculates **NIB control digits** (Portuguese standard)
- ✅ Bank labels checked against Banco de Portugal's list dated 13/10/2026, without verifying accounts or branches
- ✅ All 107 published codes are selectable; 69 bank codes form the default random pool
- ✅ Generates 1 to 100 unique identifiers within each batch; invalid quantities are rejected
- ✅ Keyboard-accessible copy buttons and selected-text fallback when clipboard access fails
- ✅ Light interface, an IBAN ready on arrival and one workflow for quantities 1-100
- ✅ Search banks by name or code and copy all displayed results together
- ✅ Corrected PWA paths/icons and consent-based updates; installed-device acceptance is still required
- ✅ Simple and intuitive interface
- ✅ NIF Fresquinho: individual or company NIFs, 1-100 at a time, with a modulo 11 check digit
- ✅ Vitest checks with a SWIFT vector, independent checksums, invalid inputs and forced collisions

### 🚀 How to Use

#### 🌐 Online Method

1. Access the online version at: [IBAN Fresquinho](https://iban-fresquinho.vercel.app/)
2. An IBAN is ready on arrival with one-click copy
3. Select one or more banks using the shortcuts or name/code search. Both share the same selection; **Concluir** closes the picker and **Limpar seleção** restores the default pool. Choose a quantity (`1` to `100`), then click **Gerar**
4. For batches, **Copiar todos** copies one raw IBAN per line. Confirmation appears on the button and in the results toolbar, which stays visible while scrolling the list

With multiple banks selected, a single IBAN uses a randomly chosen bank from that selection; consecutive requests may choose the same bank. Batches cycle through the selection in the chosen order. Supports light/dark mode and offline PWA usage.

The `1`, `5` and `6` quantity shortcuts change only the next request; existing results stay until **Gerar** is pressed. The bank picker supports arrow-key navigation and `Enter` when a search returns one code.

**NIF Fresquinho:** select the title prefix (**IBAN**) and choose **NIF** to generate 1-100 identifiers for **Pessoa singular** (ranges `1`, `2`, `3`) or **Empresa** (limited range `5` profile). Switching tools retains each tool's results, quantity and selections. Profile changes apply only to the next generation. Special ranges are excluded without implying they are invalid. NIFs may coincide with assigned numbers; no AT or VIES lookup is performed.

Only the theme preference is saved in `localStorage`; generated IBANs and NIFs stay in memory and are discarded on reload. Brief feedback animations respect reduced-motion preferences. Offline use requires an initial online visit and successful PWA caching.

Generated identifiers may coincide with assigned account numbers. Mathematical validity does not verify an account, branch or ownership. Use only for authorised tests, never for payments.

#### 📍 Local Method (Development)

Recommended: Node.js 24 LTS and pnpm 10.34.7, pinned in [package.json](package.json). [pnpm-lock.yaml](pnpm-lock.yaml) is the only lockfile. Use an existing pnpm installation or Corepack; no global tool replacement is required. See `engines` for technical Node requirements. IBAN generation needs no environment variables.

```bash
# Clone the repository
git clone https://github.com/andrenevesgomes/iban-fresquinho.git
cd iban-fresquinho

# Install dependencies
corepack pnpm install --frozen-lockfile

# Start development server
pnpm run dev

# Run tests
pnpm test

# Build for production
pnpm run build
```

### 💡 About Portuguese IBAN format

Portuguese IBANs follow this structure (25 characters):

```
PT 50 BBBB SSSS CCCCCCCCCCC KK
│  │  │    │    │           │
│  │  │    │    │           └─ NIB control digits (2)
│  │  │    │    └───────────── Account number (11)
│  │  │    └────────────────── Branch code (4)
│  │  └─────────────────────── Bank code (4)
│  └────────────────────────── IBAN check digits (2)
└───────────────────────────── Country code
```

### Implemented Algorithms

1. **NIB control digits**: `98 - mod97(bankCode + branchCode + accountNumber + "00")`
2. **IBAN check digits**: `98 - mod97(BBAN + "PT00")` (ISO 13616)

ASCII letters are expanded before calculation (`PT` = `2529`). Validation requires `PT50`, 21 numeric BBAN characters, the calculated domestic control digits and international remainder 1. Identifiers remain strings. Recognised generator bank codes do not prove that accounts or branches exist.

### 🧑‍💻 Technologies used

- **[TypeScript](https://www.typescriptlang.org/)** - Static typing
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - CSS framework
- **[Vitest](https://vitest.dev/)** - Testing framework
- **[ESLint](https://eslint.org/)** + **[Prettier](https://prettier.io/)** - Linting and formatting
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD
- **PWA** - Progressive Web App with vite-plugin-pwa

</details>

## Release Checks

Phase 1 released IBAN generation. Phase 2 adds NIF generation, with independent in-memory state for each tool; its deliberately limited profiles, references and test-data constraints are documented in [docs/nif-reference.md](docs/nif-reference.md). The public URL reflects a change only after its approved pull request is merged and deployed. Vehicle data remains out of scope.

Before publishing, run `pnpm install --frozen-lockfile`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm run test:coverage`, `pnpm audit --audit-level=moderate`, and `pnpm run build`. Check the built preview for multi-bank selection, copy feedback with 100 results, keyboard operation and narrow layouts.

CI validates pushes to `release/iban-v2` without merging them into `main`. GitHub Pages deployment is manual and publishes only `dist/`. Vercel deployment depends on its connected repository and branch settings; a fork push alone does not establish a production release. Check the live URL and consent-based PWA update after an approved deployment.

Automated tests and accessibility checks do not establish complete WCAG conformance, Lighthouse scores, insurer acceptance or account ownership. The bank catalogue records the official source URL, date and download hash; the current tests do not re-download or hash the original workbook.

The application has no analytics client, backend or account lookup. Its own runtime code does not send generated identifiers to a server. Hosting providers can still log ordinary asset requests. Installation scripts and pnpm hooks are disabled; new dependency resolutions use a one-day release-age delay. These controls reduce risk, not guarantee safety. See [SECURITY.md](SECURITY.md) for limits, updates and deployment requirements.

## 📄 License

MIT © [André Neves Gomes](https://github.com/andrenevesgomes)

Font, icon and photograph licences: [third-party notices](public/third-party-notices.txt).
