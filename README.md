# IBAN Fresquinho 🏦

[![CI](https://github.com/andrenevesgomes/iban-fresquinho/actions/workflows/ci.yml/badge.svg)](https://github.com/andrenevesgomes/iban-fresquinho/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.3-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🇵🇹 Inspirado por uma mente brilhante e um coração que ama bordô.

> 🇬🇧 Inspired by a brilliant mind and a heart that loves bordeaux.

Um gerador de IBANs portugueses **válidos** para testes de software, desenvolvimento e demonstrações.

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
- ✅ Mostra o nome do banco correspondente ao código gerado
- ✅ Permite gerar múltiplos IBANs de uma vez (até 100)
- ✅ Cópia para a área de transferência com um clique
- ✅ Suporte para modo escuro automático
- ✅ Funciona offline como PWA (Progressive Web App)
- ✅ Interface simples e intuitiva
- ✅ **100% testado** com Vitest


## 🚀 Como Utilizar

### 🌐 Método Online

1. Acede à versão online em: [IBAN Fresquinho](https://andrenevesgomes.github.io/iban-fresquinho/)
2. Clica em **Gerar IBAN** ou gerar múltiplos conforme necessário
3. Podes copiar o IBAN com um clique
4. Funciona em dark mode e como aplicação PWA móvel

### 📍 Método Local (Desenvolvimento)

```bash
# Clonar o repositório
git clone https://github.com/andrenevesgomes/iban-fresquinho.git
cd iban-fresquinho

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Correr testes
npm test

# Build para produção
npm run build
```

## 🛠️ Desenvolvimento

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run preview` | Pré-visualiza o build de produção |
| `npm test` | Corre os testes em modo watch |
| `npm run test:run` | Corre os testes uma vez |
| `npm run test:coverage` | Corre os testes com cobertura |
| `npm run lint` | Verifica erros de linting |
| `npm run lint:fix` | Corrige erros de linting automaticamente |
| `npm run format` | Formata o código com Prettier |
| `npm run typecheck` | Verifica tipos TypeScript |

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
PT XX BBBB SSSS CCCCCCCCCCC KK
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
- ✅ Shows the corresponding bank name
- ✅ Allows generating multiple IBANs at once (up to 100)
- ✅ Copy to clipboard with a single click
- ✅ Automatic dark mode support
- ✅ Works offline as a Progressive Web App (PWA)
- ✅ Simple and intuitive interface
- ✅ **100% tested** with Vitest

### 🚀 How to Use

#### 🌐 Online Method

1. Access the online version at: [IBAN Fresquinho](https://andrenevesgomes.github.io/iban-fresquinho/)
2. Click on **Generate IBAN** or generate multiple as needed
3. You can copy the IBAN with a click
4. Works in dark mode and as a mobile PWA application

#### 📍 Local Method (Development)

```bash
# Clone the repository
git clone https://github.com/andrenevesgomes/iban-fresquinho.git
cd iban-fresquinho

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### 💡 About Portuguese IBAN format

Portuguese IBANs follow this structure (25 characters):

```
PT XX BBBB SSSS CCCCCCCCCCC KK
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

### 🧑‍💻 Technologies used

- **[TypeScript](https://www.typescriptlang.org/)** - Static typing
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - CSS framework
- **[Vitest](https://vitest.dev/)** - Testing framework
- **[ESLint](https://eslint.org/)** + **[Prettier](https://prettier.io/)** - Linting and formatting
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD
- **PWA** - Progressive Web App with vite-plugin-pwa

</details>

## 📄 License

MIT © [André Neves Gomes](https://github.com/andrenevesgomes)
