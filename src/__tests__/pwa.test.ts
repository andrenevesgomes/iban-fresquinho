// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { startPWA } from '../pwa';

const mocked = vi.hoisted(() => ({
  listeners: new Map<string, (event: { isUpdate?: boolean }) => void>(),
  register: vi.fn<() => Promise<void>>(),
  messageSkipWaiting: vi.fn(),
  url: '',
}));

vi.mock('workbox-window', () => ({
  Workbox: class {
    constructor(url: string) {
      mocked.url = url;
    }
    addEventListener(name: string, callback: (event: { isUpdate?: boolean }) => void): void {
      mocked.listeners.set(name, callback);
    }
    register = mocked.register;
    messageSkipWaiting = mocked.messageSkipWaiting;
  },
}));

beforeEach(() => {
  mocked.listeners.clear();
  mocked.register.mockReset().mockResolvedValue(undefined);
  mocked.messageSkipWaiting.mockReset();
  document.body.innerHTML =
    '<div id="update-notice" hidden><p id="update-status"></p><button id="update-app">Atualizar</button></div>';
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} });
  vi.stubEnv('PROD', true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('PWA update control', () => {
  it('does not register a worker in development', () => {
    vi.stubEnv('PROD', false);
    startPWA();
    expect(mocked.register).not.toHaveBeenCalled();
  });

  it('does not activate a waiting update without explicit consent', () => {
    const reload = vi.fn();
    startPWA(reload);
    expect(mocked.register).toHaveBeenCalledTimes(1);
    expect(mocked.url).toBe(new URL('sw.js', document.baseURI).href);
    mocked.listeners.get('waiting')!({ isUpdate: true });
    expect(document.querySelector<HTMLDivElement>('#update-notice')!.hidden).toBe(false);
    expect(document.querySelector('#update-status')!.textContent).toContain('limpa os resultados');
    expect(mocked.messageSkipWaiting).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('#update-app')!.click();
    expect(mocked.messageSkipWaiting).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    mocked.listeners.get('controlling')!({ isUpdate: true });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('can accept an update that another tab has already activated without a silent reload', () => {
    const reload = vi.fn();
    startPWA(reload);
    mocked.listeners.get('controlling')!({ isUpdate: false });
    expect(document.querySelector<HTMLDivElement>('#update-notice')!.hidden).toBe(true);
    mocked.listeners.get('controlling')!({ isUpdate: true });
    expect(document.querySelector<HTMLDivElement>('#update-notice')!.hidden).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('#update-app')!.click();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(mocked.messageSkipWaiting).not.toHaveBeenCalled();
  });

  it('reports registration failure without blocking the rest of the app', async () => {
    mocked.register.mockRejectedValue(new Error('Offline unavailable'));
    startPWA();
    await Promise.resolve();
    expect(document.querySelector<HTMLDivElement>('#update-notice')!.hidden).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#update-app')!.hidden).toBe(true);
    expect(document.querySelector('#update-status')!.textContent).toContain('continua disponível');
  });
});
