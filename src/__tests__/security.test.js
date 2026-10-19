import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';

const read = (path) => readFileSync(path, 'utf8');
const manifest = JSON.parse(read('package.json'));
const policy = load(read('pnpm-workspace.yaml'));
const hosting = JSON.parse(read('vercel.json'));
const headers = Object.fromEntries(
  hosting.headers[0].headers.map(({ key, value }) => [key, value])
);

describe('Security configuration', () => {
  it('pins pnpm and blocks unattended install code', () => {
    expect(manifest.packageManager).toBe('pnpm@10.34.7');
    expect(manifest.private).toBe(true);
    expect(policy).toMatchObject({
      ignoreScripts: true,
      ignorePnpmfile: true,
      enablePrePostScripts: false,
      minimumReleaseAge: 1440,
      blockExoticSubdeps: true,
      verifyStoreIntegrity: true,
      strictStorePkgContentCheck: true,
      packageManagerStrictVersion: true,
    });
    expect(manifest.dependencies).not.toHaveProperty('@vercel/analytics');
    for (const version of Object.values({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('restricts scripts, connections, embedding and sensitive permissions', () => {
    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https:/);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
    expect(headers['Permissions-Policy']).toContain('clipboard-read=()');
    expect(hosting.headers.find(({ source }) => source === '/sw.js').headers[0].value).toContain(
      'no-cache'
    );
  });

  it('authorizes only the existing structured-data inline block by hash', () => {
    const html = read('index.html');
    const structuredData = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    )[1];
    const hash = createHash('sha256')
      .update(structuredData.replace(/\r\n?/g, '\n'))
      .digest('base64');
    expect(headers['Content-Security-Policy']).toContain(`'sha256-${hash}'`);
  });

  it('uses immutable actions and frozen script-free installs in both workflows', () => {
    for (const file of ['.github/workflows/ci.yml', '.github/workflows/static.yml']) {
      const workflow = load(read(file));
      expect(workflow.permissions).toEqual({ contents: 'read' });
      for (const job of Object.values(workflow.jobs)) {
        for (const step of job.steps) {
          if (step.uses) expect(step.uses).toMatch(/@[a-f0-9]{40}$/);
          if (step.uses?.startsWith('actions/checkout@'))
            expect(step.with['persist-credentials']).toBe(false);
          if (step.run?.includes(' install '))
            expect(step.run).toBe('pnpm install --frozen-lockfile --ignore-scripts');
          expect(step.run ?? '').not.toMatch(/\bnpm (ci|install|run)/);
        }
      }
    }
    const pages = load(read('.github/workflows/static.yml'));
    expect(Object.keys(pages.on)).toEqual(['workflow_dispatch']);
    expect(pages.jobs.deploy.needs).toBe('build');
  });
});
