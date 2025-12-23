import './styles.css';
import { inject } from '@vercel/analytics';
import { createIBAN, createMultipleIBANs, formatIBAN } from './iban';
import type { IBANResult } from './types';

// Initialize Vercel Web Analytics
inject();

/**
 * DOM element references with type safety.
 */
const elements = {
  ibanDisplay: document.getElementById('iban-single') as HTMLDivElement,
  bankName: document.getElementById('bank-name') as HTMLDivElement,
  copyTooltip: document.getElementById('copyTooltip') as HTMLSpanElement,
  countInput: document.getElementById('count-input') as HTMLInputElement,
  ibanList: document.getElementById('iban-list') as HTMLDivElement,
  generateBtn: document.getElementById('generate-btn') as HTMLButtonElement,
  copyBtn: document.getElementById('copy-btn') as HTMLButtonElement,
  generateMultipleBtn: document.getElementById('generate-multiple-btn') as HTMLButtonElement,
};

/**
 * Current IBAN state.
 */
let currentIBAN: IBANResult | null = null;

/**
 * Generates a new IBAN and updates the display.
 */
function generateIBAN(): void {
  currentIBAN = createIBAN();
  
  elements.ibanDisplay.textContent = formatIBAN(currentIBAN.iban);
  elements.bankName.textContent = currentIBAN.bankName;

  // Trigger animation
  elements.ibanDisplay.classList.remove('scale-100');
  elements.ibanDisplay.classList.add('scale-105');
  
  setTimeout(() => {
    elements.ibanDisplay.classList.remove('scale-105');
    elements.ibanDisplay.classList.add('scale-100');
  }, 200);
}

/**
 * Copies the current IBAN to the clipboard.
 */
async function copyIBAN(): Promise<void> {
  if (!currentIBAN) {
    return;
  }

  try {
    await navigator.clipboard.writeText(currentIBAN.iban);
    
    // Show tooltip
    elements.copyTooltip.classList.remove('hidden');
    setTimeout(() => {
      elements.copyTooltip.classList.add('hidden');
    }, 1200);
  } catch (error) {
    console.error('Failed to copy IBAN:', error);
  }
}

/**
 * Generates multiple IBANs and displays them in a list.
 */
function generateMultipleIBANs(): void {
  const count = Math.min(parseInt(elements.countInput.value, 10) || 2, 20);
  const ibans = createMultipleIBANs(count);

  // Clear existing list
  elements.ibanList.innerHTML = '';

  // Create elements for each IBAN
  ibans.forEach((result) => {
    const container = document.createElement('div');
    container.className =
      'bg-white dark:bg-gray-800 shadow-md px-4 py-2 rounded-xl text-center w-full animate-reveal text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
    container.textContent = formatIBAN(result.iban);

    // Add click to copy functionality
    container.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(result.iban);
        container.classList.add('ring-2', 'ring-green-500');
        setTimeout(() => {
          container.classList.remove('ring-2', 'ring-green-500');
        }, 500);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    });

    const bankTag = document.createElement('div');
    bankTag.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
    bankTag.textContent = result.bankName;

    container.appendChild(bankTag);
    elements.ibanList.appendChild(container);
  });
}

/**
 * Initialize event listeners.
 */
function init(): void {
  elements.generateBtn?.addEventListener('click', generateIBAN);
  elements.copyBtn?.addEventListener('click', copyIBAN);
  elements.generateMultipleBtn?.addEventListener('click', generateMultipleIBANs);

  // Allow Enter key to generate multiple IBANs
  elements.countInput?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      generateMultipleIBANs();
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export for testing
export { generateIBAN, copyIBAN, generateMultipleIBANs };
