# Security And Safe Use

## Scope

IBAN Fresquinho is a static, client-side test-data generator. It does not look up accounts, accept payment instructions or authenticate users. Mathematical validity does not prove that a number is unassigned, that an account exists or that an insurer accepts it. Generated numbers may coincide with real accounts. Use only in authorised test environments, never for payments or identity verification.

The NIF feature also generates identifiers without querying AT, VIES or any registry. Checksum validity does not verify taxpayer registration, ownership, tax status or an unassigned number. Individual ranges 1-3 and the limited company range 5 are generation profiles, not an exhaustive validation of Portuguese taxpayer categories.

No absolute security guarantee is possible. A compromised browser, device, extension, dependency or hosting account remains outside the generator's protection.

## Data Handling

- Generation, bank search and each tool's results and selections stay in browser memory. Reloading clears both IBAN and NIF state.
- Only `iban-theme` is stored in localStorage. The PWA caches application assets, not generated IBANs or NIFs.
- The application has no analytics client or telemetry endpoint. Hosting providers may log normal page and asset requests, including IP addresses.
- Copy buttons write only after a user action; the app does not read the clipboard. Clipboard history and operating-system synchronisation are outside its control.
- Labels and generated values use textContent rather than inserting user-provided HTML.
- The sunflower messages are public source code behind a discovery gesture, not private or access-controlled content.

## Dependencies And CI

- pnpm 10.34.7 is pinned to retain the existing Node 20/22/24 compatibility. Direct dependencies are exact versions; pnpm-lock.yaml is the only lockfile.
- Use `pnpm install --frozen-lockfile`. Project policy blocks install scripts, pnpmfile hooks and automatic pre/post commands. Explicit build/test commands still execute trusted project and dependency code.
- `minimumReleaseAge: 1440` delays newly resolved versions by one day. It is not a malware detector or a retroactive guarantee for an existing lockfile.
- Store integrity verification and exotic transitive-source restrictions remain enabled. Protect the pnpm store and workspace from untrusted writers.
- The optional `trustPolicy: no-downgrade` heuristic was evaluated but is not enabled: existing packages on parallel release lines required accumulating provenance exceptions. No exceptions are configured. This is a limitation, not proof of package safety.
- During migration, GHSA-f29h-pxvx-f335 was checked: the existing eslint-config-prettier 9.1.2 is the patched 9.x version, not affected 9.1.1. A provenance warning alone is not a compromise finding.
- CI action revisions are pinned to commit hashes. Checkout does not persist credentials; tests use read-only repository permissions. Pages deployment remains manual and uploads only dist.
- CI runs a dependency audit and tests, including security-configuration checks. A clean audit means no known matching advisories were reported at that time, not that no vulnerabilities exist.
- ESLint 8 and some transitive build dependencies are deprecated. A separate compatibility-tested toolchain upgrade is still needed; do not hide warnings or use forced bulk upgrades as a security shortcut.

## Hosting

vercel.json configures a self-origin Content Security Policy, blocks inline script attributes and eval, denies framing, disables unnecessary device permissions and clipboard reads, sets no-referrer and nosniff, and revalidates sw.js. The structured-data block is allowed by a hash checked in tests. Recalculate that hash if the block changes.

`pnpm run preview` applies the common headers locally for browser acceptance checks. Vite development mode does not use the production policy because HMR needs different permissions. Production source maps are not emitted to avoid unnecessary build artifacts; source code remains public.

These headers take effect on Vercel only after deployment. GitHub Pages does not apply vercel.json: an alternative host needs equivalent response headers. Do not assume that a green CI run means the live site's headers or update lifecycle have been verified. After an approved release, check HTTPS, response headers, clipboard operation and the consent-based PWA update in the actual deployment. Vercel builds require Corepack, as specified by the install command.

## Maintenance And Reporting

Before updates, review dependency and lockfile diffs, run the frozen install, audit, full test suite and production build, then test the browser workflow. Do not enable all install scripts to work around a failing package. Security fixes may require a reviewed release-age exception, never an undocumented global bypass.

Report suspected vulnerabilities privately to the repository maintainer; use GitHub private vulnerability reporting when available. Do not put credentials, real banking details or exploit-ready sensitive data in public issues. Do not test against real banking systems without permission.