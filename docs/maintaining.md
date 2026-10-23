# Maintaining

## Quality gate

Run all of these before opening a pull request. CI runs the same checks on Node 22 and 24 for every pull request to `main` and every push to `main`.

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test:coverage
pnpm audit --audit-level=moderate
pnpm run build
```

Then check the built app with `pnpm run preview`: desktop and a narrow phone width, light and dark themes, keyboard-only use, and copying a batch of 100.

`.gitattributes` keeps every file Prettier checks in LF, so `format:check` gives the same result on Windows and in CI.

## Release flow

Production is the `main` branch of [andrenevesgomes/iban-fresquinho](https://github.com/andrenevesgomes/iban-fresquinho), deployed by Vercel.

1. Work on a branch in the fork (`andreneves-gomes/iban-fresquinho`), based on the latest upstream `main`.
2. Pass the quality gate and the preview check.
3. Push the branch and open a pull request against upstream `main`.
4. The upstream owner approves CI for the external pull request and authorises the Vercel preview. Until then, Vercel reports "Authorization required to deploy"; that is expected, not a build failure.
5. Merge. Vercel builds and deploys `main`.
6. Check the live site: the new asset file names are served, the response headers are present, and existing visitors see the "Nova versão disponível" prompt.

The GitHub Pages workflow (`static.yml`) runs only when started by hand. Pages does not apply `vercel.json`, so it serves the app without the security headers.

Dependabot checks npm packages and GitHub Actions weekly. Minor and patch updates arrive as one grouped pull request per ecosystem; each major update arrives on its own, because it needs its migration guide read. Versions it deliberately skips are listed under [Pinned on purpose](#pinned-on-purpose). Merge a pull request only when its CI passes. Vercel deploys `main` even when CI fails, so after merging, check that CI on `main` is green and run the quality gate locally once.

CI also runs `pnpm audit`, so a newly published advisory can turn `main` red without any code change. Fix it with an exact-version update on a branch, as for any other dependency.

## Recipes

### Add a new tool

A new tool touches these places. Matrícula Fresquinha (`plate`) is the most complete example to copy.

1. **Domain:** create `src/<tool>.ts` with pure functions, a `MAX_<TOOL>_BATCH_SIZE` constant and a `createMultiple…(count, …)` that returns a unique batch or throws. Validate options before using randomness, and avoid retry loops that a mocked `Math.random` could keep spinning. Add `src/__tests__/<tool>.test.ts` that checks results with an independent calculation, not the code under test.
2. **Reference:** add `docs/<tool>-reference.md` with the rules, what is deliberately excluded and the sources.
3. **State:** in `main.ts`, extend the `Tool` type and `TOOLS`, `toolStates`, `batchLimit()` and `generateIdentifiers()`, and add an entry to `TOOL_TEXT` (prefix, name, singular, plural, feminine). Messages and headings are built from it.
4. **Markup:** in `index.html`, add a `tool-option` button with `id="tab-<tool>"` and `data-tool="<tool>"` to `#tool-menu`, plus `<tool>-controls` (a `form-row`), `<tool>-validity` and `<tool>-about`, all `hidden`. The `tab-` prefix is historical; keep it.
5. **Footer button:** add an entry to `EASTER_EGGS` with its own notes, icon, label and signature. If it needs its own colour, add a `triggerClass` and style it for both themes.
6. **Metadata:** update the page title and description, keywords, JSON-LD and the manifest description in `vite.config.ts`, then [recompute the CSP hash](#change-the-structured-data).
7. **Docs:** add the tool to the README (table, "Em português", usage, layout, documentation list), [architecture.md](architecture.md) and, if it can collide with real data, [SECURITY.md](../SECURITY.md).

### Update the bank list

The catalogue is a dated snapshot in `docs/bank-reference.json` (schema version 2), taken from the Banco de Portugal workbook at the URL stored in `source.url`. No importer is kept in the repository.

1. Download the current workbook and open it read-only, with macros and external links disabled.
2. Rebuild `records` with one entry per institution row, preserving the raw columns and source row numbers. Update `notes`, `counts` and `transition` from the workbook.
3. Update `source`: `documentUpdatedAt` (the date printed in the workbook), `retrievedAt`, `file`, `sha256` of the downloaded file and `dateCell`.
4. Review `displayAliases` and `defaultInstitutionTypes` in `src/banks.ts`.
5. Update the expected counts in `src/__tests__/banks.test.ts` on purpose (currently 174 rows, 107 codes, 69 in the default pool, 68 institutions sharing `0045`, 4 notes) and explain any change in the pull request.

The "Sobre estes dados" text in the app reads the source date and counts automatically.

### Change the structured data

The JSON-LD block in `index.html` is the only inline script, and the Content Security Policy allows it by hash. After any change to that block, including whitespace:

1. Run `pnpm exec vitest run src/__tests__/security.test.js`. The failure message shows the expected `sha256-…` value.
2. Replace the old hash in `vercel.json`. `vite preview` reads the same file.

To calculate it directly in PowerShell (the hash is taken after converting line endings to LF, as browsers do):

```powershell
$html = Get-Content index.html -Raw -Encoding UTF8
$json = [regex]::Match($html, '<script type="application/ld\+json">([\s\S]*?)</script>').Groups[1].Value -replace "`r`n?", "`n"
[Convert]::ToBase64String([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($json)))
```

Do not add other inline scripts or styles; move them to files instead.

### Add or update a dependency

- Versions are exact (no `^` or `~`); the security test enforces it.
- pnpm ignores install scripts and only resolves versions published at least three days ago (`pnpm-workspace.yaml`). Do not turn these off to make an install pass.
- Keep that window equal to Dependabot's cooldown (its default is three days). If a locked version is younger than Dependabot's window, every Dependabot npm update fails until it ages.
- For an urgent security fix younger than three days, add only that package to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, and remove it once the version is old enough.
- Review the lockfile diff before committing.
- Fonts and images must be self-hosted. Add their licence to `public/third-party-notices.txt`.

## Pinned on purpose

These are held back deliberately. Check the condition before upgrading, and update this table when it changes.

| Tool          | Held at                        | Why                                                                                                                       | Revisit when                                                                          |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| pnpm          | 10.x                           | Dependabot supports pnpm 7 to 10 only. On pnpm 11 or later its npm updates would stop working.                            | GitHub's Dependabot documentation lists the newer pnpm major as supported.            |
| TypeScript    | 5.9                            | typescript-eslint supports TypeScript below 6.1. `dependabot.yml` ignores TypeScript 6.1 and later.                       | typescript-eslint's peer range includes the new version; then remove the ignore rule. |
| `@types/node` | Lowest supported Node.js major | Newer types would allow Node.js APIs that the lowest supported version lacks. `dependabot.yml` ignores its major updates. | The minimum Node.js version is raised (see below).                                    |

## Support calendar

| Date          | Action                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| 30 April 2027 | Node.js 22 reaches end of life: drop it from `engines` and the CI matrix, and move `@types/node` to the 24 line. |
| 30 April 2028 | Node.js 24 reaches end of life: move to the next even-numbered LTS line.                                         |

## Design rules

These keep the interface feeling made by hand rather than generated. Please keep them.

- The title is always `<PREFIX> Fresquinho` (or `Fresquinha` for a feminine tool name); switching tools changes only the words, never the layout.
- Flat surfaces: no gradients, glows or decorative shadows. Shadows are reserved for floating layers (menus and dialogs).
- No pill badges, icon badges or decorative icons. Icons appear only where they act (copy, close, theme, steppers).
- Thin rules structure the page: a single column up to 820 px, form rows with the label on the left and the control on the right.
- Colour roles: Bordeaux (`--wine`) for the prefix and selected options, ink (`--ink`) for the main action. Define every colour for both themes. Licence plates are the exception: they keep their real colours in both themes.
- Type: Manrope for the interface, IBM Plex Mono for generated values.
- Controls are at least 44 px tall, show a visible focus ring, and animations are short and skipped for reduced motion.
- Interface text is European Portuguese and addresses the user as "tu".
