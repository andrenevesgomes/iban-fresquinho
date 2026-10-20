import './styles.css';
import {
  createElement,
  Check,
  ChevronDown,
  Copy,
  Heart,
  Landmark,
  Minus,
  Moon,
  Plus,
  Search,
  Flower2,
  Sun,
  X,
  ArrowUpRight,
  type IconNode,
} from 'lucide';
import { createMultipleIBANs, formatIBAN, MAX_IBAN_BATCH_SIZE } from './iban';
import { createMultipleNIFs, MAX_NIF_BATCH_SIZE, type NIFCategory } from './nif';
import { bankCatalogue, bankReferenceSource } from './banks';
import { startPWA } from './pwa';

function element<ElementType extends HTMLElement>(id: string): ElementType {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing application element: ${id}`);
  return result as ElementType;
}

const countInput = element<HTMLInputElement>('count-input');
const countError = element<HTMLParagraphElement>('count-error');
const resultList = element<HTMLUListElement>('iban-list');
const copyStatus = element<HTMLParagraphElement>('copy-status');
const copyFallback = element<HTMLDivElement>('copy-fallback');
const copyValue = element<HTMLTextAreaElement>('copy-value');
const bankDialog = element<HTMLDialogElement>('bank-dialog');
const bankSearch = element<HTMLInputElement>('bank-search');
const bankOptions = element<HTMLUListElement>('bank-options');
const bankTrigger = element<HTMLButtonElement>('open-bank');
const copyAll = element<HTMLButtonElement>('copy-all');
const decrease = element<HTMLButtonElement>('decrease-count');
const increase = element<HTMLButtonElement>('increase-count');
const toolPrefix = element<HTMLButtonElement>('tool-prefix');
const toolMenu = element<HTMLUListElement>('tool-menu');

type Tool = 'iban' | 'nif';

interface IdentifierResult {
  value: string;
  formatted: string;
  label: string;
}

interface ToolState {
  results: IdentifierResult[];
  quantity: string;
  error: string;
  invalid: boolean;
}

const toolStates: Record<Tool, ToolState> = {
  iban: { results: [], quantity: '1', error: '', invalid: false },
  nif: { results: [], quantity: '1', error: '', invalid: false },
};
const nifLabels: Record<NIFCategory, string> = {
  individual: 'Pessoa singular',
  company: 'Empresa (NIF/NIPC)',
};
let activeTool: Tool = 'iban';
let nifCategory: NIFCategory = 'individual';
let selectedCodes: string[] = [];
let initialized = false;
let copyRequest = 0;
let copyTrigger: HTMLButtonElement | null = null;
let copiedButton: HTMLButtonElement | null = null;

interface SunflowerDedication {
  title: string;
  lead: string;
  sub: string;
  whisper: string;
}

const SUNFLOWER_DEDICATIONS: readonly SunflowerDedication[] = [
  {
    title: 'Para quem me inspira todos os dias.',
    lead: 'Entre tantos testes, validações e correrias, há uma certeza que nunca falha: tu és o meu lado bom do dia.',
    sub: 'Fiz este pequeno canto a pensar em ti — para que até os minutos mais repetitivos do trabalho tenham um bocadinho do meu colo e do meu orgulho por ti.',
    whisper: '“Como os girassóis procuram a luz, eu procuro o teu sorriso.”',
  },
  {
    title: 'Ao teu olhar atento e ao teu coração bonito.',
    lead: 'Admiro a forma como cuidas de cada detalhe, mesmo quando ninguém vê o esforço que pões em tudo o que fazes.',
    sub: 'Se este gerador te poupar nem que seja meio minuto hoje, já valeu a pena — porque o meu desejo é tornar os teus dias mais leves.',
    whisper: '“O meu caso de teste favorito foi o dia em que te encontrei.”',
  },
  {
    title: 'Um girassol escondido só para ti.',
    lead: 'No meio de números, regras e ecrãs, quis deixar-te um lembrete silencioso de que nunca estás sozinha no teu dia.',
    sub: 'Respira fundo, bebe um golo de água e lembra-te de como és brilhante. Estou sempre na primeira fila a aplaudir-te.',
    whisper: '“Onde quer que o dia te leve, o meu pensamento vai contigo.”',
  },
  {
    title: 'Bordô, luz de verão e o teu abraço.',
    lead: 'Há coisas que não precisam de algoritmo nem de dígito de controlo para se saber que estão certas: nós os dois.',
    sub: 'Obrigado por seres calma quando o mundo acelera e por transformares qualquer rotina num lugar onde apetece ficar.',
    whisper: '“És a minha pessoa, o meu porto de abrigo e a minha alegria diária.”',
  },
  {
    title: 'Para te roubar um sorriso a meio da tarde.',
    lead: 'Se o dia estiver pesado ou cheio de regressões teimosas, faz uma pausa pequenina aqui comigo.',
    sub: 'Logo à noite o trabalho fica lá fora e sobra o que mais importa: o nosso tempo, a nossa paz e o orgulho imenso que tenho em ti.',
    whisper: '“Nem mil validações chegam perto da sorte que é amar-te.”',
  },
  {
    title: 'Feito à mão, peça a peça, por amor a ti.',
    lead: 'Cada cor, cada palavra e cada pequeno cuidado desta página nasceu da vontade de te ver sorrir.',
    sub: 'Que nunca te falte motivos para brilhar como os girassóis que tanto adoras. Eu trato de te lembrar todos os dias.',
    whisper: '“Contigo, todos os dias passam no teste mais exigente: o do coração.”',
  },
];

const NIF_LOVE_NOTES: readonly SunflowerDedication[] = [
  {
    title: 'O único número que me importa é o nosso.',
    lead: 'Podes gerar cem identificadores por segundo, mas no mundo inteiro nunca haverá ninguém igual a ti.',
    sub: 'Criei o NIF Fresquinho para que também aqui sintas que penso nos teus dias, no teu rigor e em tudo o que faz de ti uma mulher extraordinária.',
    whisper: '“Na minha vida não há sorteios: escolher-te-ia em todas as tentativas.”',
  },
  {
    title: 'Identificação confirmada: o amor da minha vida.',
    lead: 'Adoro ver a tua inteligência em ação, a forma como encontras o que escapa a toda a gente e ainda guardas doçura para nós.',
    sub: 'Quando o ecrã cansar, lembra-te que tens sempre um abraço apertado à tua espera logo ali ao fundo do dia.',
    whisper: '“És a minha pessoa singular favorita — e o nosso futuro é a minha melhor empresa.”',
  },
  {
    title: 'Dígito de controlo: 100% apaixonado por ti.',
    lead: 'Nem a fórmula mais exata consegue medir a paz que sinto quando chego perto de ti e o dia finalmente abranda.',
    sub: 'Que cada pequeno atalho desta página seja um lembrete silencioso do quanto te admiro e do quanto gosto de cuidar de ti.',
    whisper: '“Todas as contas batem certo quando estou de mão dada contigo.”',
  },
  {
    title: 'Um segredo em bordô guardado para os teus olhos.',
    lead: 'Sabia que ias descobrir este cantinho. Porque tu reparas em tudo, sentes tudo e iluminas tudo à tua volta.',
    sub: 'Obrigado por seres a minha companheira de todas as horas, dos planos grandes aos cafés partilhados a meio da semana.',
    whisper: '“O teu sorriso é a única validação de que preciso para ganhar o dia.”',
  },
  {
    title: 'Singular no talento, imensa no coração.',
    lead: 'Qualquer equipa tem sorte em ter o teu olhar atento, mas a sorte grande saiu-me a mim no dia em que entraste na minha vida.',
    sub: 'Continua a brilhar com essa mistura linda de força e ternura. Eu estarei sempre aqui para celebrar cada conquista tua.',
    whisper: '“Entre milhões de números, tu és a minha única resposta.”',
  },
  {
    title: 'A nossa história é o meu projeto favorito.',
    lead: 'Mais uma ferramenta fresquinha para a tua caixa de testes, feita com o mesmo amor do primeiro dia e ainda mais admiração.',
    sub: 'Prometo continuar a inventar mil maneiras de te arrancar um sorriso, dentro e fora do ecrã.',
    whisper: '“Amar-te é a certeza mais bonita que levo comigo todos os dias.”',
  },
];

function animateFeedback(
  target: HTMLElement,
  frames: Keyframe[],
  duration = 480,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)'
): void {
  if (
    typeof target.animate !== 'function' ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  )
    return;
  target.getAnimations().forEach((animation) => animation.cancel());
  target.animate(frames, { duration, easing });
}

function icon(node: IconNode): SVGElement {
  return createElement(node, {
    width: 20,
    height: 20,
    'stroke-width': 1.7,
    'aria-hidden': 'true',
    focusable: 'false',
  });
}

function resetCopyFeedback(): void {
  copyRequest++;
  copyStatus.textContent = '';
  copyFallback.hidden = true;
  copyValue.value = '';
  if (copiedButton?.isConnected) {
    copiedButton.classList.remove('is-copied');
    if (copiedButton === copyAll) {
      copyAll.querySelector('[data-icon]')?.replaceChildren(icon(Copy));
      element('copy-all-label').textContent = 'Copiar todos';
    } else {
      copiedButton.replaceChildren(icon(Copy));
    }
  }
  copiedButton = null;
}

function quantity(): number | null {
  const value = countInput.value;
  const count = Number(value);
  return /^[0-9]+$/.test(value) && Number.isInteger(count) && count >= 1 && count <= batchLimit()
    ? count
    : null;
}

function batchLimit(): number {
  return activeTool === 'iban' ? MAX_IBAN_BATCH_SIZE : MAX_NIF_BATCH_SIZE;
}

function updateStepper(): void {
  const count = quantity();
  decrease.disabled = count === 1;
  increase.disabled = count === batchLimit();
  for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
    const active = Number(chip.dataset.preset) === count;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', String(active));
  }
}

function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
  const themeSlot = document.getElementById('theme-icon');
  if (themeSlot) themeSlot.replaceChildren(icon(theme === 'dark' ? Sun : Moon));
  const toggle = element<HTMLButtonElement>('theme-toggle');
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  toggle.setAttribute('aria-label', 'Modo escuro');
  toggle.dataset.tooltip = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#171517' : '#f7f3ee');
}

async function copyResult(value: string, trigger: HTMLButtonElement, count = 1): Promise<void> {
  resetCopyFeedback();
  const request = ++copyRequest;
  const name = activeTool.toUpperCase();
  copyTrigger = trigger;
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard unavailable');
    }
    await navigator.clipboard.writeText(value);
    if (request !== copyRequest) return;
    copyStatus.textContent = count === 1 ? `${name} copiado.` : `${count} ${name}s copiados.`;
    copiedButton = trigger;
    trigger.classList.add('is-copied');
    if (trigger === copyAll) {
      copyAll.querySelector('[data-icon]')?.replaceChildren(icon(Check));
      element('copy-all-label').textContent = 'Copiados!';
    } else {
      trigger.replaceChildren(icon(Check));
    }
    animateFeedback(
      trigger,
      [
        { transform: 'scale(0.95)', opacity: 0.88 },
        { transform: 'scale(1.03)', opacity: 1, offset: 0.45 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      480
    );
    animateFeedback(
      copyStatus,
      [{ transform: 'translateY(4px)' }, { transform: 'translateY(0)' }],
      480
    );
  } catch {
    if (request !== copyRequest) return;
    copyStatus.textContent = 'Não foi possível copiar automaticamente.';
    copyValue.value = value;
    copyValue.rows = Math.min(Math.max(count, 2), 6);
    copyFallback.hidden = false;
    copyValue.focus();
    copyValue.select();
  }
}

function generateResults(): void {
  const state = toolStates[activeTool];
  const hadResults = state.results.length > 0;
  const name = activeTool.toUpperCase();
  const count = quantity();
  if (count === null) {
    countError.textContent = `Escolhe um número inteiro entre 1 e ${batchLimit()}.`;
    countInput.setAttribute('aria-invalid', 'true');
    countInput.focus();
    return;
  }
  countInput.removeAttribute('aria-invalid');
  try {
    state.results = generateIdentifiers(count);
  } catch {
    countError.textContent = `Não foi possível gerar os ${name}s. Tenta novamente.`;
    return;
  }
  countError.textContent = '';
  resetCopyFeedback();
  updateStepper();
  renderResults();
  element('generation-status').textContent =
    count === 1 ? `Novo ${name} pronto.` : `${count} ${name}s prontos.`;
  if (hadResults) {
    animateFeedback(
      resultList,
      [
        { opacity: 0.35, transform: 'translateY(8px) scale(0.994)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      520
    );
  }
}

function generateIdentifiers(count: number): IdentifierResult[] {
  if (activeTool === 'nif') {
    return createMultipleNIFs(count, nifCategory).map(({ nif, category }) => ({
      value: nif,
      formatted: nif,
      label: nifLabels[category],
    }));
  }
  return createMultipleIBANs(count, selectedCodes.length > 0 ? selectedCodes : undefined).map(
    ({ iban, bankName }) => ({ value: iban, formatted: formatIBAN(iban), label: bankName })
  );
}

function renderResults(): void {
  const results = toolStates[activeTool].results;
  const name = activeTool.toUpperCase();
  const fragment = document.createDocumentFragment();
  results.forEach((result, index) => {
    const row = document.createElement('li');
    row.className = 'result-row';
    const content = document.createElement('div');
    content.className = 'result-content';
    const identifier = document.createElement('code');
    identifier.className = 'identifier';
    if (results.length === 1) identifier.id = `${activeTool}-single`;
    identifier.textContent = result.formatted;
    const bankName = document.createElement('p');
    bankName.className = 'result-bank';
    bankName.textContent = result.label;
    content.append(identifier, bankName);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'icon-button result-copy';
    copy.dataset.tooltip = `Copiar ${name}`;
    copy.setAttribute('aria-label', `Copiar ${name} ${index + 1}`);
    copy.appendChild(icon(Copy));
    copy.addEventListener('click', () => {
      void copyResult(result.value, copy);
    });
    row.append(content, copy);
    fragment.appendChild(row);
  });
  resultList.replaceChildren(fragment);
  resultList.classList.toggle('is-single', results.length === 1);
  resultList.setAttribute('aria-label', `${name}s gerados`);
  element('results-heading').textContent =
    results.length === 1 ? `O teu ${name}` : `Os teus ${results.length} ${name}s`;
  copyAll.hidden = results.length < 2;
}

function switchTool(next: Tool): void {
  if (next === activeTool) return;
  const previous = toolStates[activeTool];
  previous.quantity = countInput.value;
  previous.error = countError.textContent ?? '';
  previous.invalid = countInput.getAttribute('aria-invalid') === 'true';
  resetCopyFeedback();
  copyTrigger = null;
  activeTool = next;
  const state = toolStates[next];
  countInput.value = state.quantity;
  countInput.max = String(batchLimit());
  countError.textContent = state.error;
  if (state.invalid) countInput.setAttribute('aria-invalid', 'true');
  else countInput.removeAttribute('aria-invalid');
  updateStepper();
  for (const tool of ['iban', 'nif'] as const) {
    const active = tool === next;
    element(`tab-${tool}`).setAttribute('aria-current', String(active));
    element(`${tool}-controls`).hidden = !active;
    element(`${tool}-validity`).hidden = !active;
    element(`${tool}-about`).hidden = !active;
  }
  element('bank-note').hidden = next !== 'iban';
  const prefixText = element('tool-prefix-text');
  prefixText.textContent = next.toUpperCase();
  animateFeedback(
    prefixText,
    [
      { opacity: 0, transform: 'translateY(0.4em)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    420
  );
  element('copy-value-label').textContent = `${next.toUpperCase()} para cópia manual`;
  element('generation-status').textContent = '';
  const flowerTrigger = element<HTMLButtonElement>('sunflower-trigger');
  const triggerSlot = element('easter-trigger-icon');
  triggerSlot.replaceChildren(icon(next === 'iban' ? Flower2 : Heart));
  flowerTrigger.classList.toggle('is-bordeaux-egg', next === 'nif');
  flowerTrigger.setAttribute('aria-label', next === 'iban' ? 'Girassol' : 'Segredo Bordô');
  flowerTrigger.dataset.tooltip = next === 'iban' ? 'Girassol' : 'Segredo Bordô';
  if (state.results.length === 0) generateResults();
  else renderResults();
}

function toolOptions(): HTMLButtonElement[] {
  return [...toolMenu.querySelectorAll<HTMLButtonElement>('[data-tool]')];
}

function openToolMenu(focus: 'current' | 'first' | 'last'): void {
  toolMenu.hidden = false;
  toolPrefix.setAttribute('aria-expanded', 'true');
  const options = toolOptions();
  const target =
    focus === 'first'
      ? options[0]
      : focus === 'last'
        ? options[options.length - 1]
        : options.find((option) => option.dataset.tool === activeTool);
  target?.focus();
  animateFeedback(
    toolMenu,
    [
      { opacity: 0, transform: 'translateY(-4px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    260
  );
}

function closeToolMenu(returnFocus: boolean): void {
  if (toolMenu.hidden) return;
  toolMenu.hidden = true;
  toolPrefix.setAttribute('aria-expanded', 'false');
  if (returnFocus) toolPrefix.focus();
}

function initTools(): void {
  const picker = toolPrefix.closest<HTMLElement>('.wordmark-wrap')!;
  toolPrefix.addEventListener('click', () => {
    if (toolMenu.hidden) openToolMenu('current');
    else closeToolMenu(false);
  });
  toolPrefix.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeToolMenu(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    openToolMenu(event.key === 'ArrowDown' ? 'first' : 'last');
  });
  for (const option of toolOptions()) {
    option.addEventListener('click', () => {
      const tool = option.dataset.tool;
      if (tool === 'iban' || tool === 'nif') switchTool(tool);
      closeToolMenu(true);
    });
  }
  toolMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeToolMenu(true);
      return;
    }
    if (event.key === 'Tab') {
      closeToolMenu(false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const options = toolOptions();
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  });
  document.addEventListener('click', (event) => {
    if (!picker.contains(event.target as Node | null)) closeToolMenu(false);
  });
  for (const radio of document.querySelectorAll<HTMLInputElement>('[name="nif-category"]')) {
    radio.addEventListener('change', () => {
      if (radio.checked && (radio.value === 'individual' || radio.value === 'company')) {
        nifCategory = radio.value;
      }
    });
  }
}

function searchable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function closeDialogSmoothly(dialog: HTMLDialogElement): void {
  if (!dialog.open) return;
  if (
    typeof dialog.animate !== 'function' ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  ) {
    dialog.close();
    return;
  }
  dialog.getAnimations().forEach((animation) => animation.cancel());
  const animation = dialog.animate(
    [
      { opacity: 1, transform: 'translateY(0) scale(1)' },
      { opacity: 0, transform: 'translateY(6px) scale(0.985)' },
    ],
    { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
  );
  if (animation && typeof animation.onfinish !== 'undefined') {
    animation.onfinish = (): void => {
      if (dialog.open) dialog.close();
    };
  } else {
    dialog.close();
  }
}

function closeBankPicker(): void {
  closeDialogSmoothly(bankDialog);
}

function updateBankSummary(): void {
  const selectedBanks = selectedCodes
    .map((code) => bankCatalogue.find((entry) => entry.code === code))
    .filter((entry): entry is (typeof bankCatalogue)[number] => Boolean(entry));
  const label =
    selectedBanks.length === 0
      ? 'Qualquer banco'
      : selectedBanks.length <= 2
        ? selectedBanks.map((entry) => entry.displayName).join(', ')
        : `${selectedBanks.length} bancos selecionados (${selectedBanks
            .slice(0, 2)
            .map((entry) => entry.displayName)
            .join(', ')}…)`;
  element('selected-bank').textContent = label;
  bankTrigger.title =
    selectedBanks.length === 0
      ? 'Qualquer banco'
      : selectedBanks.map((entry) => entry.displayName).join(', ');
  const hasTransitional = selectedBanks.some((entry) => entry.transitional);
  const hasNonDefault = selectedBanks.some(
    (entry) => !entry.transitional && !entry.defaultGeneration
  );
  element('bank-note').textContent = hasTransitional
    ? 'Código transitório. A fonte não indica uma data de fim.'
    : hasNonDefault
      ? 'Instituição fora do grupo bancário predefinido. Serviços de pagamento não verificados.'
      : '';
  for (const pill of document.querySelectorAll<HTMLButtonElement>('[data-favorite]')) {
    const code = pill.dataset.favorite ?? '';
    const active = code === '' ? selectedCodes.length === 0 : selectedCodes.includes(code);
    pill.classList.toggle('is-active', active);
    pill.setAttribute('aria-pressed', String(active));
  }
  const clearBtn = document.getElementById('clear-banks') as HTMLButtonElement | null;
  if (clearBtn) clearBtn.hidden = selectedCodes.length === 0;
  const doneBtn = document.getElementById('done-bank') as HTMLButtonElement | null;
  if (doneBtn) {
    doneBtn.textContent =
      selectedCodes.length === 0 ? 'Concluir' : `Concluir (${selectedCodes.length})`;
  }
}

function syncBankOptionStates(): void {
  for (const option of bankOptions.querySelectorAll<HTMLButtonElement>('button.bank-option')) {
    const code = option.dataset.code ?? '';
    const isSelected = code ? selectedCodes.includes(code) : selectedCodes.length === 0;
    option.setAttribute('aria-pressed', String(isSelected));
    const slot = option.querySelector('[data-option-icon]');
    if (slot) slot.replaceChildren(icon(isSelected ? Check : Landmark));
  }
}

function toggleBankSelection(code?: string): void {
  if (!code) {
    selectedCodes = [];
  } else if (selectedCodes.includes(code)) {
    selectedCodes = selectedCodes.filter((item) => item !== code);
  } else {
    selectedCodes = [...selectedCodes, code];
  }
  updateBankSummary();
  syncBankOptionStates();
}

function buildBankOptionsOnce(): void {
  if (bankOptions.children.length > 0) return;
  const fragment = document.createDocumentFragment();
  const addOption = (name: string, detail: string, searchKey: string, code?: string): void => {
    const row = document.createElement('li');
    row.dataset.search = searchKey;
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'bank-option';
    option.dataset.code = code ?? '';
    const isSelected = code ? selectedCodes.includes(code) : selectedCodes.length === 0;
    option.setAttribute('aria-pressed', String(isSelected));
    const text = document.createElement('span');
    const label = document.createElement('span');
    label.className = 'picker-name';
    label.textContent = name;
    const description = document.createElement('span');
    description.className = 'picker-detail';
    description.textContent = detail;
    text.append(label, description);
    const iconSlot = document.createElement('span');
    iconSlot.dataset.optionIcon = 'true';
    iconSlot.appendChild(icon(isSelected ? Check : Landmark));
    option.append(text, iconSlot);
    option.addEventListener('click', () => {
      if (!code) {
        selectedCodes = [];
        updateBankSummary();
        syncBankOptionStates();
        closeBankPicker();
      } else {
        toggleBankSelection(code);
      }
    });
    row.appendChild(option);
    fragment.appendChild(row);
  };
  addOption('Qualquer banco', 'Seleção automática', '');
  for (const bank of bankCatalogue) {
    const key = searchable(
      `${bank.code} ${bank.displayName} ${bank.institutions.map((entry) => entry.officialName).join(' ')}`
    );
    addOption(
      bank.displayName,
      `${bank.code} · ${bank.institutionTypes.join(' / ')}`,
      key,
      bank.code
    );
  }
  bankOptions.replaceChildren(fragment);
}

function renderBankOptions(): void {
  buildBankOptionsOnce();
  const query = searchable(bankSearch.value.trim());
  let matchCount = 0;
  for (const row of bankOptions.querySelectorAll<HTMLLIElement>('li')) {
    const key = row.dataset.search ?? '';
    if (!key) {
      row.hidden = Boolean(query);
      continue;
    }
    const visible = !query || key.includes(query);
    row.hidden = !visible;
    if (visible) matchCount++;
  }
  syncBankOptionStates();
  element('bank-empty').hidden = matchCount > 0;
  element('bank-search-status').textContent =
    `${matchCount} ${matchCount === 1 ? 'código disponível' : 'códigos disponíveis'}`;
}

function init(): void {
  if (initialized) return;
  initialized = true;
  const icons: Record<string, IconNode> = {
    heart: Heart,
    chevron: ChevronDown,
    minus: Minus,
    moon: Moon,
    plus: Plus,
    copy: Copy,
    close: X,
    search: Search,
    flower: Flower2,
    sun: Sun,
    external: ArrowUpRight,
  };
  for (const slot of document.querySelectorAll<HTMLElement>('[data-icon]')) {
    const node = icons[slot.dataset.icon ?? ''];
    if (node) slot.replaceChildren(icon(node));
  }
  const systemTheme =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  let savedTheme: string | null = null;
  try {
    savedTheme = window.localStorage.getItem('iban-theme');
  } catch {
    savedTheme = null;
  }
  let themeChosen = savedTheme === 'light' || savedTheme === 'dark';
  applyTheme(savedTheme === 'dark' || (!themeChosen && systemTheme?.matches) ? 'dark' : 'light');
  systemTheme?.addEventListener('change', (event) => {
    if (!themeChosen) applyTheme(event.matches ? 'dark' : 'light');
  });
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    themeChosen = true;
    applyTheme(next);
    animateFeedback(
      element('theme-icon'),
      [
        { transform: 'rotate(-20deg) scale(0.86)', opacity: 0.65 },
        { transform: 'rotate(0deg) scale(1)', opacity: 1 },
      ],
      460
    );
    try {
      window.localStorage.setItem('iban-theme', next);
    } catch {
      return;
    }
  });
  for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
    chip.addEventListener('click', () => {
      countInput.value = chip.dataset.preset ?? '1';
      updateStepper();
      animateFeedback(chip, [{ transform: 'scale(0.95)' }, { transform: 'scale(1)' }], 380);
    });
  }
  for (const pill of document.querySelectorAll<HTMLButtonElement>('[data-favorite]')) {
    pill.addEventListener('click', () => {
      toggleBankSelection(pill.dataset.favorite || undefined);
      animateFeedback(pill, [{ transform: 'scale(0.95)' }, { transform: 'scale(1)' }], 380);
    });
  }
  startPWA();
  const sourceDate = bankReferenceSource.documentUpdatedAt.split('-').reverse().join('/');
  element('source-note').textContent =
    `Fonte: Banco de Portugal, lista de ${sourceDate}. ${bankCatalogue.length} códigos disponíveis; ${bankCatalogue.filter((bank) => bank.defaultGeneration).length} no grupo predefinido.`;
  countInput.max = String(MAX_IBAN_BATCH_SIZE);
  countInput.addEventListener('input', updateStepper);
  element<HTMLFormElement>('generation-form').addEventListener('submit', (event) => {
    event.preventDefault();
    generateResults();
  });
  for (const [button, change] of [
    [decrease, -1],
    [increase, 1],
  ] as const) {
    button.addEventListener('click', () => {
      const count = quantity();
      countInput.value = String(
        count === null ? 1 : Math.min(batchLimit(), Math.max(1, count + change))
      );
      updateStepper();
    });
  }
  copyAll.addEventListener('click', () => {
    const results = toolStates[activeTool].results;
    void copyResult(results.map(({ value }) => value).join('\n'), copyAll, results.length);
  });
  element('close-copy').addEventListener('click', () => {
    resetCopyFeedback();
    if (copyTrigger?.isConnected) copyTrigger.focus();
    else element<HTMLButtonElement>('generate-btn').focus();
  });
  bankTrigger.addEventListener('click', () => {
    bankSearch.value = '';
    renderBankOptions();
    bankDialog.showModal();
    bankSearch.focus();
  });
  element('close-bank').addEventListener('click', closeBankPicker);
  element('done-bank').addEventListener('click', closeBankPicker);
  element('clear-banks').addEventListener('click', () => {
    selectedCodes = [];
    updateBankSummary();
    syncBankOptionStates();
  });
  bankDialog.addEventListener('click', (event) => {
    if (event.target === bankDialog) closeBankPicker();
  });
  bankDialog.addEventListener('close', () => bankTrigger.focus());
  bankDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBankPicker();
    }
  });
  bankSearch.addEventListener('input', renderBankOptions);
  bankSearch.addEventListener('keydown', (event) => {
    const options = [
      ...bankOptions.querySelectorAll<HTMLButtonElement>('li:not([hidden]) > button'),
    ];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      options[0]?.focus();
    } else if (event.key === 'Enter' && options.length === 1) {
      event.preventDefault();
      options[0]?.click();
      closeBankPicker();
    }
  });
  bankOptions.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const options = [
      ...bankOptions.querySelectorAll<HTMLButtonElement>('li:not([hidden]) > button'),
    ];
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    options[next]?.focus();
  });
  const flowerTrigger = element<HTMLButtonElement>('sunflower-trigger');
  const flowerDialog = element<HTMLDialogElement>('sunflower-dialog');
  const flowerCard = element<HTMLDivElement>('sunflower-card');
  const flowerWhisper = element<HTMLElement>('sunflower-whisper');
  let flowerVisits = 0;
  const dedicationIndices: Record<Tool, number> = { iban: 0, nif: 0 };

  const renderDedication = (tool: Tool, index: number, animateNote = false): void => {
    const collection = tool === 'iban' ? SUNFLOWER_DEDICATIONS : NIF_LOVE_NOTES;
    const item = collection[index % collection.length]!;
    const isIban = tool === 'iban';
    flowerDialog.dataset.eggMode = tool;
    element('sunflower-photo-wrap').hidden = !isIban;
    element('bordeaux-velvet-wrap').hidden = isIban;
    element('note-emblem').replaceChildren(icon(isIban ? Flower2 : Heart));
    element('sunflower-title').textContent = item.title;
    element('sunflower-lead').textContent = item.lead;
    element('sunflower-sub').textContent = item.sub;
    flowerWhisper.textContent = item.whisper;
    const prefix = isIban ? 'Dedicatória' : 'Bilhete';
    element('sunflower-tag').textContent =
      `${prefix} · ${(index % collection.length) + 1} / ${collection.length}`;
    element('next-sunflower-label').textContent = isIban ? 'Outra dedicatória' : 'Outro bilhete';
    element('sunflower-signature').textContent = isIban
      ? 'Sempre teu, com todo o meu amor.'
      : 'Teu em todos os detalhes, hoje e sempre.';
    if (animateNote) {
      animateFeedback(
        flowerCard,
        [{ transform: 'translateY(6px)' }, { transform: 'translateY(0)' }],
        480
      );
      animateFeedback(
        flowerWhisper,
        [{ transform: 'translateY(4px)' }, { transform: 'translateY(0)' }],
        520
      );
    }
  };

  flowerTrigger.addEventListener('blur', () => {
    flowerVisits = 0;
  });
  flowerTrigger.addEventListener('click', () => {
    flowerVisits++;
    animateFeedback(
      flowerTrigger,
      [
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(-10deg) scale(1.06)', offset: 0.35 },
        { transform: 'rotate(8deg) scale(1.04)', offset: 0.7 },
        { transform: 'rotate(0deg) scale(1)' },
      ],
      520
    );
    if (flowerVisits < 5) return;
    flowerVisits = 0;
    renderDedication(activeTool, dedicationIndices[activeTool], false);
    if (activeTool === 'iban') {
      element<HTMLImageElement>('sunflower-image').src = new URL(
        'images/sunflowers.jpg',
        document.baseURI
      ).href;
    }
    flowerDialog.showModal();
    element<HTMLButtonElement>('close-sunflower').focus();
    animateFeedback(
      flowerDialog,
      [{ transform: 'translateY(10px) scale(0.985)' }, { transform: 'translateY(0) scale(1)' }],
      520
    );
  });
  element('next-sunflower').addEventListener('click', () => {
    const collection = activeTool === 'iban' ? SUNFLOWER_DEDICATIONS : NIF_LOVE_NOTES;
    dedicationIndices[activeTool] = (dedicationIndices[activeTool] + 1) % collection.length;
    renderDedication(activeTool, dedicationIndices[activeTool], true);
  });
  element('close-sunflower').addEventListener('click', () => closeDialogSmoothly(flowerDialog));
  flowerDialog.addEventListener('click', (event) => {
    if (event.target === flowerDialog) closeDialogSmoothly(flowerDialog);
  });
  flowerDialog.addEventListener('close', () => flowerTrigger.focus());
  flowerDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialogSmoothly(flowerDialog);
    }
  });
  initTools();
  renderBankOptions();
  generateResults();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export { init, generateResults };
