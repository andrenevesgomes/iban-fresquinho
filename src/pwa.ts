import { Workbox } from 'workbox-window';

export function startPWA(reload: () => void = () => window.location.reload()): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const notice = document.getElementById('update-notice') as HTMLDivElement;
  const status = document.getElementById('update-status') as HTMLParagraphElement;
  const update = document.getElementById('update-app') as HTMLButtonElement;
  const workbox = new Workbox(new URL('sw.js', document.baseURI).href);
  let acceptedUpdate = false;
  let updateActivated = false;

  workbox.addEventListener('waiting', () => {
    notice.hidden = false;
    status.textContent = 'Nova versão disponível. A atualização limpa os resultados atuais.';
  });
  workbox.addEventListener('controlling', (event) => {
    if (acceptedUpdate) {
      reload();
    } else if (event.isUpdate) {
      updateActivated = true;
      notice.hidden = false;
      status.textContent = 'Nova versão disponível. A atualização limpa os resultados atuais.';
    }
  });
  update.addEventListener('click', () => {
    acceptedUpdate = true;
    if (updateActivated) reload();
    else workbox.messageSkipWaiting();
  });
  void workbox.register().catch(() => {
    notice.hidden = false;
    update.hidden = true;
    status.textContent = 'Modo offline indisponível. A geração nesta página continua disponível.';
  });
}
