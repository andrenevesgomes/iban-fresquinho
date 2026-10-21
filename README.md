# IBAN Fresquinho

> 🇵🇹 Inspirado por uma mente brilhante e um coração que ama bordô.<br>
> 🇬🇧 Inspired by a brilliant mind and a heart that loves bordeaux.

[![CI](https://github.com/andrenevesgomes/iban-fresquinho/actions/workflows/ci.yml/badge.svg)](https://github.com/andrenevesgomes/iban-fresquinho/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Fresh Portuguese test data with valid check digits, generated entirely in the browser.

**Live:** [iban-fresquinho.vercel.app](https://iban-fresquinho.vercel.app/)

| Tool                | Generates                                                                 | Checked by                                 |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| **IBAN Fresquinho** | Portuguese IBANs (`PT50` + 21 digits) for any of 107 published bank codes | NIB control digits and ISO 13616 modulo 97 |
| **NIF Fresquinho**  | Individual (ranges 1, 2, 3) or company (range 5) taxpayer numbers         | Modulo 11 check digit                      |

> [!IMPORTANT]
> Results are mathematically valid test data. Nothing is looked up: a value may coincide with a real account or taxpayer, and validity proves neither existence nor ownership. Use only in authorised test environments, never for payments or identity checks.

## Em português

Gera IBANs e NIFs portugueses com dígitos de controlo válidos, diretamente no navegador. Clica no prefixo do título (**IBAN**) para mudar para **NIF**. Escolhe os bancos ou o perfil, a quantidade (1 a 100) e clica em **Gerar**; cada resultado copia-se num clique. Nada é enviado para um servidor e só a preferência de tema fica guardada.

## Using it

1. Open the site. One IBAN is ready on arrival.
2. Select the title prefix (**IBAN**) to switch to **NIF**. Each tool keeps its own results, quantity and choices.
3. **IBAN:** combine bank shortcuts, or open **Lista completa** to search all 107 codes by name or code. **NIF:** choose **Pessoa singular** or **Empresa**.
4. Pick a quantity (1–100, with shortcuts 1, 5 and 6) and press **Gerar**. Choices apply to the next generation only.
5. Copy one value, or **Copiar todos** for one value per line. If the browser blocks the clipboard, the values are shown pre-selected for manual copying.

It works offline after the first visit, follows the system theme until you pick light or dark, and supports keyboard use and reduced motion.

## Development

Requires Node.js 20.19+, 22.12+ or 24+ (24 LTS recommended) and pnpm 10.34.7, which is pinned in `package.json` and available through Corepack.

```bash
git clone https://github.com/andrenevesgomes/iban-fresquinho.git
cd iban-fresquinho
corepack pnpm install --frozen-lockfile
pnpm run dev
```

| Command                  | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `pnpm run dev`           | Development server                                 |
| `pnpm run build`         | Type-check and build to `dist/`                    |
| `pnpm run preview`       | Serve `dist/` with the production security headers |
| `pnpm test`              | Tests in watch mode (`test:run` for a single run)  |
| `pnpm run test:coverage` | Single run with coverage                           |
| `pnpm run typecheck`     | TypeScript only                                    |
| `pnpm run lint`          | ESLint (`lint:fix` to apply fixes)                 |
| `pnpm run format`        | Prettier (`format:check` to verify only)           |

Before opening a pull request, run the full quality gate described in [docs/maintaining.md](docs/maintaining.md#quality-gate).

## Project layout

```text
src/
  main.ts            UI: tool switching, per-tool state, bank picker, clipboard, theme, dialogs
  iban.ts            IBAN generation, validation, parsing and formatting (no DOM)
  nif.ts             NIF generation and checksum validation (no DOM)
  banks.ts           Bank catalogue derived from docs/bank-reference.json
  types.ts           Shared IBAN types
  pwa.ts             Service worker registration and consent-based updates
  styles.css         Design tokens and component styles
  __tests__/         Domain, UI (jsdom), PWA and security-configuration tests
docs/                Architecture, maintenance and domain references
public/              Icons, images, robots/sitemap and third-party notices
index.html           Markup, metadata and structured data
vercel.json          Hosting headers, including the Content Security Policy
vite.config.ts       Build, PWA manifest and preview headers
pnpm-workspace.yaml  Supply-chain settings for pnpm
```

## Documentation

| Document                                 | Read it to…                                                         |
| ---------------------------------------- | ------------------------------------------------------------------- |
| [Architecture](docs/architecture.md)     | Understand how the modules, state and UI fit together               |
| [Maintaining](docs/maintaining.md)       | Release, add a tool, update the bank list, change headers or design |
| [IBAN reference](docs/iban-reference.md) | Check the IBAN format, algorithms and bank catalogue policy         |
| [NIF reference](docs/nif-reference.md)   | Check the NIF rules, generated ranges and legal sources             |
| [Security](SECURITY.md)                  | Review data handling, supply-chain controls and hosting limits      |

## Privacy

There is no backend, analytics or external lookup. Generated values live in memory and disappear on reload; only the theme preference (`iban-theme`) is stored. Hosting providers may still log ordinary page requests.

## Licence

MIT © [André Neves Gomes](https://github.com/andrenevesgomes). Fonts, icons and the photograph are listed in the [third-party notices](public/third-party-notices.txt).
