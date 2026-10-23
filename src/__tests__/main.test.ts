// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bankCatalogue } from '../banks';
import { hasValidNIFChecksum } from '../nif';
import { plateEra } from '../plate';

vi.mock('../styles.css', () => ({}));
vi.mock('../pwa', () => ({ startPWA: vi.fn() }));

const html = readFileSync(resolve('index.html'), 'utf8');
let app: typeof import('../main');
let writeText = vi.fn<(value: string) => Promise<void>>();

function input(selector: string): HTMLInputElement {
  return document.querySelector<HTMLInputElement>(selector)!;
}

function button(selector: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(selector)!;
}

function choose(code: string): void {
  button('#open-bank').click();
  if (code === '') {
    button('#bank-options button[data-code=""]').click();
    return;
  }
  if (!button('#clear-banks').hidden) button('#clear-banks').click();
  button(`#bank-options button[data-code="${code}"]`).click();
  button('#done-bank').click();
}

function generate(count?: number): void {
  if (count !== undefined) input('#count-input').value = String(count);
  document
    .querySelector('#generation-form')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
}

function identifiers(): string[] {
  return [...rows()].map((row) => row.querySelector('code')!.textContent!.replace(/ /g, ''));
}

function search(query: string): void {
  input('#bank-search').value = query;
  input('#bank-search').dispatchEvent(new Event('input'));
}

function rows(): NodeListOf<HTMLLIElement> {
  return document.querySelectorAll<HTMLLIElement>('#iban-list > li');
}

beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement): void {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement): void {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    },
  });
  app = await import('../main');
  app.init();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('IBAN workflow', () => {
  it('has a technically valid IBAN ready on arrival', () => {
    expect(document.querySelector('#iban-single')!.textContent!.replace(/ /g, '')).toMatch(
      /^PT50[0-9]{21}$/
    );
  });

  it('exposes each published code exactly once and initializes only once', () => {
    app.init();
    const options = [...document.querySelectorAll<HTMLButtonElement>('#bank-options button')];
    expect(options).toHaveLength(108);
    expect(options[0]?.dataset.code).toBe('');
    expect(new Set(options.slice(1).map((option) => option.dataset.code))).toEqual(
      new Set(bankCatalogue.map(({ code }) => code))
    );
    expect(rows()).toHaveLength(1);
    expect(document.querySelectorAll('form')).toHaveLength(1);
    expect(button('#copy-all').hidden).toBe(true);
    expect(input('#count-input').max).toBe('100');
  });

  it('uses the selection only for subsequent generation', () => {
    choose('3560');
    generate();
    const initial = document.querySelector('#iban-single')!.textContent!;
    expect(initial.replace(/ /g, '').slice(4, 8)).toBe('3560');
    choose('9871');
    expect(document.querySelector('#iban-single')!.textContent).toBe(initial);
    generate();
    expect(document.querySelector('#iban-single')!.textContent!.replace(/ /g, '').slice(4, 8)).toBe(
      '9871'
    );
    expect(document.querySelector('#selected-bank')!.textContent).toBe(
      bankCatalogue.find(({ code }) => code === '9871')!.displayName
    );
  });

  it.each(['0079', '8707', '0001', '0286'])('supports explicit generation for %s', (code) => {
    choose(code);
    generate();
    expect(document.querySelector('#iban-single')!.textContent!.replace(/ /g, '').slice(4, 8)).toBe(
      code
    );
    expect(document.querySelector('.result-bank')!.textContent).toBe(
      bankCatalogue.find((bank) => bank.code === code)!.displayName
    );
    if (code === '0079')
      expect(document.querySelector('#bank-note')!.textContent).toContain('transit');
  });

  it.each([1, 5, 6, 100])('generates the selected bank for an exact batch of %s', (count) => {
    choose('0269');
    generate(count);
    expect(rows()).toHaveLength(count);
    const values = identifiers();
    expect(new Set(values).size).toBe(count);
    expect(values.every((value) => value.slice(4, 8) === '0269')).toBe(true);
    expect(document.querySelector('#generation-status')!.textContent).toContain(
      count === 1 ? 'Novo IBAN' : String(count)
    );
    expect(button('#copy-all').hidden).toBe(count === 1);
    expect([...rows()].every((row) => row.querySelector('button')?.tabIndex === 0)).toBe(true);
  });

  it.each(['', '0', '-1', '1.5', '101', '1e2'])(
    'rejects %j without replacing existing results',
    (value) => {
      generate(6);
      const previous = document.querySelector('#iban-list')!.innerHTML;
      input('#count-input').value = value;
      generate();
      expect(document.querySelector('#iban-list')!.innerHTML).toBe(previous);
      expect(input('#count-input').getAttribute('aria-invalid')).toBe('true');
      expect(document.querySelector('#count-error')!.textContent).toContain('1 e 100');
      generate(6);
      expect(rows()).toHaveLength(6);
      expect(input('#count-input').hasAttribute('aria-invalid')).toBe(false);
      expect(document.querySelector('#count-error')!.textContent).toBe('');
    }
  );

  it('retains the previous batch after bounded collision exhaustion', () => {
    generate(6);
    const previous = document.querySelector('#iban-list')!.innerHTML;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    generate();
    expect(document.querySelector('#iban-list')!.innerHTML).toBe(previous);
    expect(document.querySelector('#count-error')!.textContent).not.toBe('');
  });

  it('retains source metadata in the data disclosure', () => {
    expect(document.querySelector('#source-note')!.textContent).toContain('13/10/2026');
    expect(document.querySelector('#source-note')!.textContent).toContain('107');
    expect(document.querySelector('#source-note')!.textContent).toContain('69');
  });

  it('changes quantity without discarding results and respects the stepper boundaries', () => {
    const before = identifiers();
    expect(button('#decrease-count').disabled).toBe(true);
    button('#increase-count').click();
    expect(input('#count-input').value).toBe('2');
    expect(identifiers()).toEqual(before);
    expect(button('#decrease-count').disabled).toBe(false);
    input('#count-input').value = '100';
    input('#count-input').dispatchEvent(new Event('input'));
    expect(button('#increase-count').disabled).toBe(true);
    button('#decrease-count').click();
    expect(input('#count-input').value).toBe('99');
    input('#count-input').value = '';
    button('#increase-count').click();
    expect(input('#count-input').value).toBe('1');
  });

  it('searches bank names without accents and by exact code, without changing results', () => {
    const before = identifiers();
    button('#open-bank').click();
    expect(document.activeElement).toBe(input('#bank-search'));
    search('credito agricola');
    expect(
      document.querySelector('#bank-options li:not([hidden]) button[data-code="0045"]')
    ).not.toBeNull();
    search('3560');
    expect(document.querySelectorAll('#bank-options li:not([hidden]) button')).toHaveLength(1);
    expect(document.querySelector('#bank-search-status')!.textContent).toContain('1 código');
    search('no-matching-bank');
    expect(document.querySelectorAll('#bank-options li:not([hidden]) button')).toHaveLength(0);
    expect(document.querySelector<HTMLElement>('#bank-empty')!.hidden).toBe(false);
    input('#bank-search').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(document.querySelector<HTMLDialogElement>('#bank-dialog')!.open).toBe(false);
    expect(document.activeElement).toBe(button('#open-bank'));
    button('#open-bank').click();
    button('#close-bank').click();
    expect(document.activeElement).toBe(button('#open-bank'));
    expect(identifiers()).toEqual(before);
    button('#open-bank').click();
    expect(input('#bank-search').value).toBe('');
    expect(document.querySelectorAll('#bank-options li:not([hidden]) button')).toHaveLength(108);
  });

  it('can return to the default bank pool without changing the previous result', () => {
    choose('0079');
    generate();
    const before = identifiers();
    choose('');
    expect(document.querySelector('#selected-bank')!.textContent).toBe('Qualquer banco');
    expect(document.querySelector('#bank-note')!.textContent).toBe('');
    expect(identifiers()).toEqual(before);
  });

  it('remembers the selected theme and changes presets without replacing results', () => {
    expect(document.documentElement.dataset.theme).toBe('light');
    button('#theme-toggle').click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('iban-theme')).toBe('dark');
    expect(button('#theme-toggle').getAttribute('aria-pressed')).toBe('true');
    button('#theme-toggle').click();
    expect(document.documentElement.dataset.theme).toBe('light');

    const previous = identifiers();
    button('[data-preset="5"]').click();
    expect(input('#count-input').value).toBe('5');
    expect(identifiers()).toEqual(previous);
    expect(button('[data-preset="5"]').getAttribute('aria-pressed')).toBe('true');
    expect(button('[data-preset="5"]').classList.contains('is-active')).toBe(true);
    generate();
    expect(rows()).toHaveLength(5);
  });

  it('restores the saved theme after reinitializing the page', async () => {
    button('#theme-toggle').click();
    vi.resetModules();
    document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
    app = await import('../main');
    app.init();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button('#theme-toggle').getAttribute('aria-pressed')).toBe('true');
    expect(window.localStorage.length).toBe(1);
  });

  it('still toggles the theme when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    button('#theme-toggle').click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(identifiers()).toHaveLength(1);
  });

  it('lets Enter choose a unique bank match and arrows navigate the bank list', () => {
    button('#open-bank').click();
    search('3560');
    input('#bank-search').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(document.querySelector<HTMLDialogElement>('#bank-dialog')!.open).toBe(false);
    expect(document.querySelector('#selected-bank')!.textContent).toContain('REVOLUT');
    button('#open-bank').click();
    input('#bank-search').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    const options = [...document.querySelectorAll<HTMLButtonElement>('#bank-options button')];
    expect(document.activeElement).toBe(options[0]);
    options[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(options.at(-1));
    options.at(-1)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(options[0]);
  });

  it('combines multiple main bank shortcuts and modal selections, and randomly rotates when count is 1', () => {
    const previous = identifiers();
    const cgdPill = button('[data-favorite="0035"]');
    const bcpPill = button('[data-favorite="0033"]');
    const santanderPill = button('[data-favorite="0018"]');
    const anyPill = button('[data-favorite=""]');
    expect(anyPill.getAttribute('aria-pressed')).toBe('true');

    cgdPill.click();
    expect(cgdPill.getAttribute('aria-pressed')).toBe('true');
    expect(anyPill.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('#selected-bank')!.textContent).toBe('Caixa Geral de Depósitos');
    expect(identifiers()).toEqual(previous);

    bcpPill.click();
    expect(bcpPill.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#selected-bank')!.textContent).toBe(
      'Caixa Geral de Depósitos, Millennium BCP'
    );

    // Open modal and add Revolut (3560) alongside CGD and Millennium
    button('#open-bank').click();
    expect(button('#bank-options button[data-code="0035"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    button('#bank-options button[data-code="3560"]').click();
    expect(document.querySelector<HTMLDialogElement>('#bank-dialog')!.open).toBe(true);
    expect(button('#done-bank').textContent).toBe('Concluir (3)');
    button('#done-bank').click();
    expect(document.querySelector<HTMLDialogElement>('#bank-dialog')!.open).toBe(false);

    expect(document.querySelector('#selected-bank')!.textContent).toContain(
      '3 bancos selecionados'
    );

    generate(6);
    const codes = identifiers().map((id) => id.slice(4, 8));
    expect(codes).toEqual(['0035', '0033', '3560', '0035', '0033', '3560']);

    // When generating 1 IBAN with multiple selected banks, it draws randomly across the chosen pool
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.75);
    generate(1);
    expect(identifiers()[0]?.slice(4, 8)).toBe('3560');
    randomSpy.mockRestore();

    santanderPill.click();
    expect(santanderPill.getAttribute('aria-pressed')).toBe('true');
    santanderPill.click();
    expect(santanderPill.getAttribute('aria-pressed')).toBe('false');

    choose('3560');
    expect(cgdPill.getAttribute('aria-pressed')).toBe('false');
    expect(bcpPill.getAttribute('aria-pressed')).toBe('false');
    expect(anyPill.getAttribute('aria-pressed')).toBe('false');

    anyPill.click();
    expect(anyPill.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#selected-bank')!.textContent).toBe('Qualquer banco');

    button('#open-bank').click();
    const bankDialog = document.querySelector<HTMLDialogElement>('#bank-dialog')!;
    expect(bankDialog.open).toBe(true);
    bankDialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(bankDialog.open).toBe(false);
  });
});

describe('IBAN and NIF Fresquinho', () => {
  it('switches tools from the wordmark prefix through an accessible disclosure menu', () => {
    const prefix = button('#tool-prefix');
    const menu = document.querySelector<HTMLElement>('#tool-menu')!;
    const key = (target: Element, name: string): void => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    };
    const heading = (): string =>
      document.querySelector('h1')!.textContent!.replace(/\s+/g, ' ').trim();
    expect(heading()).toBe('IBAN Fresquinho');
    expect(prefix.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hidden).toBe(true);
    expect(button('#tab-iban').getAttribute('aria-current')).toBe('true');
    expect(document.querySelector<HTMLElement>('#nif-controls')!.hidden).toBe(true);

    prefix.click();
    expect(menu.hidden).toBe(false);
    expect(prefix.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(button('#tab-iban'));
    key(button('#tab-iban'), 'ArrowDown');
    expect(document.activeElement).toBe(button('#tab-nif'));
    key(button('#tab-nif'), 'ArrowDown');
    expect(document.activeElement).toBe(button('#tab-plate'));
    key(button('#tab-plate'), 'ArrowDown');
    expect(document.activeElement).toBe(button('#tab-iban'));
    key(button('#tab-iban'), 'ArrowUp');
    expect(document.activeElement).toBe(button('#tab-plate'));
    key(button('#tab-plate'), 'End');
    expect(document.activeElement).toBe(button('#tab-plate'));
    button('#tab-nif').click();

    expect(menu.hidden).toBe(true);
    expect(prefix.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(prefix);
    expect(heading()).toBe('NIF Fresquinho');
    expect(button('#tab-nif').getAttribute('aria-current')).toBe('true');
    expect(button('#tab-iban').getAttribute('aria-current')).toBe('false');
    expect(document.querySelector<HTMLElement>('#iban-controls')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('#nif-controls')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#nif-about')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#iban-about')!.hidden).toBe(true);
    expect(document.querySelector('#iban-list')!.getAttribute('aria-label')).toBe('NIFs gerados');

    key(prefix, 'ArrowUp');
    expect(menu.hidden).toBe(false);
    expect(document.activeElement).toBe(button('#tab-plate'));
    key(button('#tab-plate'), 'Home');
    expect(document.activeElement).toBe(button('#tab-iban'));
    key(button('#tab-iban'), 'Escape');
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(prefix);
    expect(heading()).toBe('NIF Fresquinho');

    key(prefix, 'ArrowDown');
    expect(document.activeElement).toBe(button('#tab-iban'));
    key(button('#tab-iban'), 'Tab');
    expect(menu.hidden).toBe(true);
    prefix.click();
    document.body.click();
    expect(menu.hidden).toBe(true);
    prefix.click();
    prefix.click();
    expect(menu.hidden).toBe(true);
    prefix.click();
    key(prefix, 'Escape');
    expect(menu.hidden).toBe(true);
    key(prefix, 'Enter');
    expect(menu.hidden).toBe(true);
  });

  it('restores each tool quantity, results and pending selection', () => {
    choose('0035');
    generate(6);
    const ibans = identifiers();
    button('#tab-nif').click();
    expect(input('#count-input').value).toBe('1');
    expect(identifiers()[0]).toMatch(/^[123][0-9]{8}$/);
    const company = input('[name="nif-category"][value="company"]');
    company.click();
    generate(5);
    const nifs = identifiers();
    expect(nifs.every((value) => /^5[0-9]{8}$/.test(value))).toBe(true);
    input('[name="nif-category"][value="individual"]').click();
    expect(identifiers()).toEqual(nifs);
    button('#tab-iban').click();
    expect(input('#count-input').value).toBe('6');
    expect(identifiers()).toEqual(ibans);
    expect(button('[data-favorite="0035"]').getAttribute('aria-pressed')).toBe('true');
    button('#tab-nif').click();
    expect(input('#count-input').value).toBe('5');
    expect(identifiers()).toEqual(nifs);
    expect(input('[name="nif-category"][value="individual"]').checked).toBe(true);
    expect(document.querySelector('.result-bank')!.textContent).toBe('Empresa (NIF/NIPC)');
  });

  it('ignores a pending IBAN copy after switching to NIF', async () => {
    let finish: () => void = () => {};
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    button('.result-copy').click();
    button('#tab-nif').click();
    finish();
    await Promise.resolve();
    expect(document.querySelector('#copy-status')!.textContent).toBe('');
    button('.result-copy').click();
    await Promise.resolve();
    expect(writeText.mock.calls[1]?.[0]).toMatch(/^[123][0-9]{8}$/);
    expect(document.querySelector('#copy-status')!.textContent).toBe('NIF copiado.');
  });

  it.each([1, 5, 6, 100])(
    'generates and copies %s company NIFs with the correct labels',
    async (count) => {
      button('#tab-nif').click();
      input('[name="nif-category"][value="company"]').click();
      generate(count);
      const values = identifiers();
      expect(values).toHaveLength(count);
      expect(new Set(values).size).toBe(count);
      expect(values.every((value) => value.startsWith('5') && hasValidNIFChecksum(value))).toBe(
        true
      );
      expect(
        [...rows()].every(
          (row) => row.querySelector('.result-bank')!.textContent === 'Empresa (NIF/NIPC)'
        )
      ).toBe(true);
      expect(button('.result-copy').getAttribute('aria-label')).toBe('Copiar NIF 1');
      expect(button('#copy-all').hidden).toBe(count === 1);
      expect(document.querySelector('#generation-status')!.textContent).toBe(
        count === 1 ? 'Novo NIF pronto.' : `${count} NIFs prontos.`
      );
      input('[name="nif-category"][value="individual"]').click();
      input('#count-input').value = '2';
      button(count === 1 ? '.result-copy' : '#copy-all').click();
      await Promise.resolve();
      expect(writeText).toHaveBeenLastCalledWith(values.join('\n'));
      expect(document.querySelector('#copy-status')!.textContent).toBe(
        count === 1 ? 'NIF copiado.' : `${count} NIFs copiados.`
      );
    }
  );

  it('restores invalid quantities and errors independently without erasing results', () => {
    const ibans = identifiers();
    input('#count-input').value = '101';
    generate();
    button('#tab-nif').click();
    expect(input('#count-input').hasAttribute('aria-invalid')).toBe(false);
    expect(document.querySelector('#count-error')!.textContent).toBe('');
    const nifs = identifiers();
    input('#count-input').value = '';
    generate();
    expect(identifiers()).toEqual(nifs);
    button('#tab-iban').click();
    expect(input('#count-input').value).toBe('101');
    expect(input('#count-input').getAttribute('aria-invalid')).toBe('true');
    expect(identifiers()).toEqual(ibans);
    button('#tab-nif').click();
    expect(input('#count-input').value).toBe('');
    expect(input('#count-input').getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('#count-error')!.textContent).toContain('1 e 100');
    generate(6);
    expect(document.querySelector('#count-error')!.textContent).toBe('');
  });

  it('keeps NIF results and errors after a bounded generation failure', () => {
    button('#tab-nif').click();
    input('[name="nif-category"][value="company"]').click();
    generate(6);
    const nifs = identifiers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    generate();
    expect(identifiers()).toEqual(nifs);
    expect(document.querySelector('#count-error')!.textContent).toContain('NIFs');
    button('#tab-iban').click();
    expect(document.querySelector('#count-error')!.textContent).toBe('');
    button('#tab-nif').click();
    expect(identifiers()).toEqual(nifs);
    expect(document.querySelector('#count-error')!.textContent).toContain('NIFs');
  });

  it('keeps switching and reselecting a tab idempotent, without consuming randomness', () => {
    button('#tab-nif').click();
    const random = vi.spyOn(Math, 'random');
    button('#tab-nif').click();
    button('#tab-iban').click();
    button('#tab-nif').click();
    app.init();
    expect(random).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
  });

  it('selects every NIF for manual copying and clears fallback on a tool switch', async () => {
    button('#tab-nif').click();
    generate(6);
    writeText.mockRejectedValue(new Error('Denied'));
    button('#copy-all').click();
    await Promise.resolve();
    expect(input('#copy-value').value).toBe(identifiers().join('\n'));
    expect(input('#copy-value').selectionEnd).toBe(input('#copy-value').value.length);
    expect(document.querySelector('#copy-value-label')!.textContent).toBe('NIF para cópia manual');
    button('#close-copy').click();
    expect(document.activeElement).toBe(button('#copy-all'));
    button('#copy-all').click();
    await Promise.resolve();
    button('#tab-iban').click();
    expect(document.querySelector<HTMLElement>('#copy-fallback')!.hidden).toBe(true);
    expect(input('#copy-value').value).toBe('');
    expect(document.querySelector('#copy-status')!.textContent).toBe('');
  });

  it.each(['resolve', 'reject'])(
    'ignores a stale NIF copy %s after a round trip to IBAN',
    async (outcome) => {
      button('#tab-nif').click();
      let finish: () => void = () => {};
      writeText.mockImplementationOnce(
        () =>
          new Promise<void>((resolve, reject) => {
            finish = outcome === 'resolve' ? resolve : (): void => reject(new Error('Stale'));
          })
      );
      button('.result-copy').click();
      button('#tab-iban').click();
      button('#tab-nif').click();
      const current = identifiers();
      button('.result-copy').click();
      await Promise.resolve();
      finish();
      await Promise.resolve();
      expect(identifiers()).toEqual(current);
      expect(document.querySelector('#copy-status')!.textContent).toBe('NIF copiado.');
      expect(document.querySelector<HTMLElement>('#copy-fallback')!.hidden).toBe(true);
    }
  );
});

describe('Matrícula Fresquinha', () => {
  const summaryPattern =
    /^1\.ª matrícula (\d{2})\/(\d{4}) · (\d+) cm³ · (\d+) cv · (Gasolina|Gasóleo|Híbrido)$/;

  function fill(id: string, value: string): void {
    document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!.value = value;
  }

  function summaries(): RegExpMatchArray[] {
    return [...rows()].map(
      (row) => row.querySelector('.result-bank')!.textContent!.match(summaryPattern)!
    );
  }

  function plates(): string[] {
    return [...rows()].map((row) => row.querySelector('code')!.textContent!);
  }

  it('switches the wordmark and wording to a feminine tool with its own controls', () => {
    button('#tab-plate').click();
    expect(document.querySelector('h1')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Matrícula Fresquinha'
    );
    expect(button('#tab-plate').getAttribute('aria-current')).toBe('true');
    expect(document.querySelector<HTMLElement>('#plate-controls')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#plate-about')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#plate-validity')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#iban-controls')!.hidden).toBe(true);
    expect(document.querySelector('#results-heading')!.textContent).toBe('A tua matrícula');
    expect(document.querySelector('#iban-list')!.getAttribute('aria-label')).toBe(
      'Matrículas geradas'
    );
    expect(document.querySelector('#generation-status')!.textContent).toBe(
      'Nova matrícula pronta.'
    );
    expect(plateEra(plates()[0])).not.toBeNull();
    expect(summaries()[0]).not.toBeNull();
    expect(input('#plate-year').max).toBe(String(new Date().getFullYear()));
    button('#tab-iban').click();
    expect(document.querySelector('h1')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'IBAN Fresquinho'
    );
  });

  it('honours month, year, displacement and power filters for a whole batch', async () => {
    button('#tab-plate').click();
    fill('plate-month', '6');
    fill('plate-year', '2010');
    fill('plate-cm3-min', '1500');
    fill('plate-cm3-max', '1600');
    fill('plate-cv-min', '100');
    fill('plate-cv-max', '120');
    generate(6);
    expect(document.querySelector('#generation-status')!.textContent).toBe('6 matrículas prontas.');
    expect(document.querySelector('#results-heading')!.textContent).toBe('As tuas 6 matrículas');
    for (const [, month, year, cm3, cv] of summaries()) {
      expect([month, year]).toEqual(['06', '2010']);
      expect(Number(cm3)).toBeGreaterThanOrEqual(1500);
      expect(Number(cm3)).toBeLessThanOrEqual(1600);
      expect(Number(cv)).toBeGreaterThanOrEqual(100);
      expect(Number(cv)).toBeLessThanOrEqual(120);
    }
    expect(plates().every((plate) => /^[0-9]{2}-[A-Z]{2}-[0-9]{2}$/.test(plate))).toBe(true);
    button('#copy-all').click();
    await Promise.resolve();
    expect(writeText).toHaveBeenLastCalledWith(plates().join('\n'));
    expect(document.querySelector('#copy-status')!.textContent).toBe('6 matrículas copiadas.');
  });

  it.each([
    ['1985', 'plate--black', false, null],
    ['1995', 'plate--white', true, null],
    ['2010', 'plate--dated', true, '10'],
    ['2022', 'plate--modern', true, null],
  ])('prints a %s plate in the design of its time', (year, style, band, dateText) => {
    button('#tab-plate').click();
    fill('plate-year', year);
    fill('plate-month', '3');
    generate(1);
    const plate = document.querySelector<HTMLElement>('.plate')!;
    expect(plate.classList.contains(style)).toBe(true);
    expect(Boolean(plate.querySelector('.plate-band'))).toBe(band);
    const date = plate.querySelector('.plate-date');
    expect(date?.firstElementChild?.textContent ?? null).toBe(dateText);
    if (date) expect(date.lastElementChild!.textContent).toBe('03');
    expect(plate.querySelector('code')!.id).toBe('plate-single');
  });

  it('copies a single plate with feminine feedback', async () => {
    button('#tab-plate').click();
    button('.result-copy').click();
    await Promise.resolve();
    expect(writeText).toHaveBeenLastCalledWith(plates()[0]);
    expect(document.querySelector('#copy-status')!.textContent).toBe('Matrícula copiada.');
    expect(button('.result-copy').getAttribute('aria-label')).toBe('Copiar matrícula 1');
  });

  it.each<[Record<string, string>, string[], string]>([
    [{ 'plate-year': '1900' }, ['plate-year'], 'Escolhe um ano entre 1937'],
    [{ 'plate-year': '2026.5' }, ['plate-year'], 'Escolhe um ano entre 1937'],
    [
      { 'plate-year': String(new Date().getFullYear()), 'plate-month': '12' },
      ['plate-month', 'plate-year'],
      'ainda não chegou',
    ],
    [
      { 'plate-cm3-min': '2000', 'plate-cm3-max': '1000' },
      ['plate-cm3-min', 'plate-cm3-max'],
      'cilindrada',
    ],
    [{ 'plate-cv-max': '9999' }, ['plate-cv-min', 'plate-cv-max'], 'potência'],
    [
      { 'plate-cm3-min': '600', 'plate-cm3-max': '700', 'plate-cv-min': '300' },
      ['plate-cm3-min', 'plate-cm3-max', 'plate-cv-min', 'plate-cv-max'],
      'Não há carros plausíveis',
    ],
  ])('explains invalid filters %o and keeps the previous results', (values, invalid, message) => {
    button('#tab-plate').click();
    const previous = plates();
    for (const [id, value] of Object.entries(values)) fill(id, value);
    const now = new Date();
    if (values['plate-month'] === '12' && now.getMonth() === 11) return;
    generate(5);
    expect(document.querySelector('#plate-error')!.textContent).toContain(message);
    expect(plates()).toEqual(previous);
    for (const id of [
      'plate-year',
      'plate-month',
      'plate-cm3-min',
      'plate-cm3-max',
      'plate-cv-min',
      'plate-cv-max',
    ]) {
      expect(document.querySelector(`#${id}`)!.getAttribute('aria-invalid')).toBe(
        invalid.includes(id) ? 'true' : null
      );
    }
    expect(document.activeElement!.id).toBe(invalid[0]);
    for (const id of Object.keys(values)) fill(id, '');
    generate(2);
    expect(document.querySelector('#plate-error')!.textContent).toBe('');
    expect(document.querySelector('#plate-year')!.hasAttribute('aria-invalid')).toBe(false);
    expect(rows()).toHaveLength(2);
  });

  it('keeps plate results and filters while visiting the other tools', () => {
    button('#tab-plate').click();
    fill('plate-year', '2001');
    generate(5);
    const kept = plates();
    button('#tab-nif').click();
    button('#tab-iban').click();
    button('#tab-plate').click();
    expect(plates()).toEqual(kept);
    expect(input('#plate-year').value).toBe('2001');
    expect(document.querySelector('#copy-value-label')!.textContent).toBe(
      'Matrícula para cópia manual'
    );
  });
});

describe('Discreet sunflower interaction', () => {
  it('requires five activations and preserves results, with Escape returning focus', () => {
    const previous = identifiers();
    const dialog = document.querySelector<HTMLDialogElement>('#sunflower-dialog')!;
    const trigger = button('#sunflower-trigger');
    expect(dialog.open).toBe(false);
    expect(document.querySelector('.dedication')!.textContent).not.toContain('mulher');
    expect(document.querySelector('#sunflower-image')!.hasAttribute('src')).toBe(false);
    trigger.focus();
    for (let count = 0; count < 4; count++) trigger.click();
    expect(dialog.open).toBe(false);
    trigger.click();
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(button('#close-sunflower'));
    expect(document.querySelector<HTMLImageElement>('#sunflower-image')!.src).toContain(
      'images/sunflowers.jpg'
    );
    expect(document.querySelector('#sunflower-tag')!.textContent).toBe('Dedicatória · 1 / 6');
    const firstTitle = document.querySelector('#sunflower-title')!.textContent;
    button('#next-sunflower').click();
    expect(document.querySelector('#sunflower-tag')!.textContent).toBe('Dedicatória · 2 / 6');
    expect(document.querySelector('#sunflower-title')!.textContent).not.toBe(firstTitle);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(identifiers()).toEqual(previous);
    expect(window.localStorage.length).toBe(0);
    trigger.click();
    expect(dialog.open).toBe(false);
  });

  it('does not accumulate accidental clicks after focus leaves the flower', () => {
    const trigger = button('#sunflower-trigger');
    trigger.focus();
    for (let count = 0; count < 4; count++) trigger.click();
    button('#open-bank').focus();
    trigger.focus();
    trigger.click();
    expect(document.querySelector<HTMLDialogElement>('#sunflower-dialog')!.open).toBe(false);
    for (let count = 0; count < 4; count++) trigger.click();
    button('#close-sunflower').click();
    expect(document.querySelector<HTMLDialogElement>('#sunflower-dialog')!.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('gives NIF Fresquinho its own prefix and its own Bordeaux Easter egg', () => {
    expect(document.querySelector('#tool-prefix-text')!.textContent).toBe('IBAN');
    const trigger = button('#sunflower-trigger');
    expect(trigger.getAttribute('aria-label')).toBe('Girassol');

    button('#tab-nif').click();
    expect(document.querySelector('#tool-prefix-text')!.textContent).toBe('NIF');
    expect(trigger.getAttribute('aria-label')).toBe('Segredo Bordô');

    trigger.focus();
    for (let count = 0; count < 5; count++) trigger.click();
    const dialog = document.querySelector<HTMLDialogElement>('#sunflower-dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.dataset.eggMode).toBe('nif');
    expect(document.querySelector<HTMLElement>('#sunflower-photo-wrap')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('#bordeaux-velvet-wrap')!.hidden).toBe(false);
    expect(document.querySelector('#sunflower-tag')!.textContent).toBe('Bilhete · 1 / 6');
    const firstNifTitle = document.querySelector('#sunflower-title')!.textContent;
    button('#next-sunflower').click();
    expect(document.querySelector('#sunflower-tag')!.textContent).toBe('Bilhete · 2 / 6');
    expect(document.querySelector('#sunflower-title')!.textContent).not.toBe(firstNifTitle);
    button('#close-sunflower').click();
    expect(dialog.open).toBe(false);
  });

  it('gives Matrícula Fresquinha its own road-trip Easter egg', () => {
    const trigger = button('#sunflower-trigger');
    button('#tab-nif').click();
    button('#tab-plate').click();
    expect(trigger.getAttribute('aria-label')).toBe('Viagem a dois');
    expect(trigger.classList.contains('is-euro-egg')).toBe(true);
    expect(trigger.classList.contains('is-bordeaux-egg')).toBe(false);

    trigger.focus();
    for (let count = 0; count < 5; count++) trigger.click();
    const dialog = document.querySelector<HTMLDialogElement>('#sunflower-dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.dataset.eggMode).toBe('plate');
    expect(document.querySelector<HTMLElement>('#plate-egg-wrap')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#bordeaux-velvet-wrap')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('#sunflower-photo-wrap')!.hidden).toBe(true);
    expect(document.querySelector('#sunflower-tag')!.textContent).toBe('Viagem · 1 / 6');
    expect(document.querySelector('#next-sunflower-label')!.textContent).toBe('Outra viagem');
    button('#next-sunflower').click();
    expect(document.querySelector('#sunflower-tag')!.textContent).toBe('Viagem · 2 / 6');
    button('#close-sunflower').click();

    button('#tab-nif').click();
    expect(trigger.classList.contains('is-euro-egg')).toBe(false);
    expect(trigger.classList.contains('is-bordeaux-egg')).toBe(true);
  });

  it('uses bounded event animations and skips them for reduced motion', () => {
    const animate = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [{ cancel }],
    });
    try {
      generate(6);
      expect(animate).toHaveBeenCalledTimes(1);
      expect(cancel).toHaveBeenCalledTimes(1);
      for (const call of animate.mock.calls) {
        expect(call[1].duration).toBeLessThanOrEqual(560);
        expect(call[1].iterations).toBeUndefined();
      }
      animate.mockClear();
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      generate(5);
      button('#sunflower-trigger').click();
      expect(animate).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, 'animate');
      Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');
    }
  });
});

describe('Clipboard feedback', () => {
  it('can copy the initial result without generating again', async () => {
    button('.result-copy').click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toMatch(/^PT50[0-9]{21}$/);
  });

  it('announces success only after a raw-value write has completed', async () => {
    let finish: () => void = () => {};
    writeText.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    button('.result-copy').click();
    expect(document.querySelector('#copy-status')!.textContent).toBe('');
    expect(writeText.mock.calls[0]?.[0]).toMatch(/^PT50[0-9]{21}$/);
    finish();
    await Promise.resolve();
    expect(document.querySelector('#copy-status')!.textContent).toBe('IBAN copiado.');
  });

  it.each(['denied', 'unavailable'])(
    'offers selected raw text when clipboard is %s',
    async (state) => {
      if (state === 'denied') writeText.mockRejectedValue(new Error('Denied'));
      else Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      const trigger = button('.result-copy');
      trigger.click();
      await Promise.resolve();
      expect(document.querySelector<HTMLDivElement>('#copy-fallback')!.hidden).toBe(false);
      expect(input('#copy-value').value).toMatch(/^PT50[0-9]{21}$/);
      expect(input('#copy-value').readOnly).toBe(true);
      expect(document.activeElement).toBe(input('#copy-value'));
      expect(input('#copy-value').selectionStart).toBe(0);
      expect(input('#copy-value').selectionEnd).toBe(25);
      expect(document.querySelector('#copy-status')!.textContent).not.toBe('IBAN copiado.');
      button('#close-copy').click();
      expect(document.querySelector<HTMLDivElement>('#copy-fallback')!.hidden).toBe(true);
      expect(document.activeElement).toBe(trigger);
    }
  );

  it('copies an individual batch row through a native button', async () => {
    generate(6);
    const first = rows()[0]!;
    first.querySelector('button')!.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(
      first.querySelector('code')!.textContent!.replace(/ /g, '')
    );
    expect(document.querySelector('#copy-status')!.textContent).toBe('IBAN copiado.');
  });

  it('does not allow a stale copy failure to overwrite a newer success', async () => {
    let rejectOld: (reason: Error) => void = () => {};
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectOld = reject;
        })
    );
    button('.result-copy').click();
    button('.result-copy').click();
    await Promise.resolve();
    rejectOld(new Error('Old request'));
    await Promise.resolve();
    expect(document.querySelector('#copy-status')!.textContent).toBe('IBAN copiado.');
    expect(document.querySelector<HTMLDivElement>('#copy-fallback')!.hidden).toBe(true);
  });

  it('copies the displayed batch in order, not the pending quantity or bank choice', async () => {
    generate(6);
    const expected = identifiers().join('\n');
    input('#count-input').value = '1';
    choose('3560');
    button('#copy-all').click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(document.querySelector('#copy-status')!.textContent).toBe('6 IBANs copiados.');
  });

  it('offers every line of a batch for manual copying after refusal', async () => {
    generate(6);
    writeText.mockRejectedValue(new Error('Denied'));
    button('#copy-all').click();
    await Promise.resolve();
    const fallback = document.querySelector<HTMLTextAreaElement>('#copy-value')!;
    expect(fallback.value).toBe(identifiers().join('\n'));
    expect(fallback.selectionEnd).toBe(fallback.value.length);
    button('#close-copy').click();
    expect(document.activeElement).toBe(button('#copy-all'));
    expect(fallback.value).toBe('');
  });

  it('ignores pending copy feedback after new results replace the old ones', async () => {
    let finish: () => void = () => {};
    writeText.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    button('.result-copy').click();
    generate(6);
    finish();
    await Promise.resolve();
    expect(document.querySelector('#copy-status')!.textContent).toBe('');
    expect(document.querySelector<HTMLDivElement>('#copy-fallback')!.hidden).toBe(true);
  });
});
