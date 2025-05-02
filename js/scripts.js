/**
 * Mapa de códigos de banco para os seus respetivos nomes.
 * @type {Object.<string, string>}
 */
const bankMap = {
    "0007": "Novo Banco",
    "0010": "BPI",
    "0018": "Santander Totta",
    "0033": "Millennium BCP",
    "0035": "Caixa Geral de Depósitos",
    "0045": "Crédito Agrícola",
    "0079": "Abanca",
    "0086": "Banco Invest",
    "0103": "Banco BIC",
    "0121": "Banco Carregosa",
};

/**
 * Array com todos os códigos de banco disponíveis.
 * @type {string[]}
 */
const bankCodes = Object.keys(bankMap);

/**
 * Gera um IBAN aleatório e atualiza a interface do utilizador.
 * Adiciona uma animação de escala ao elemento que exibe o IBAN.
 */
function generateIBAN() {
    const { iban, bankCode } = createIBAN();
    const box = document.getElementById("iban-single");
    box.textContent = iban;
    document.getElementById("bank-name").textContent =
        bankMap[bankCode] || "";
    box.classList.remove("scale-100");
    box.classList.add("scale-105");
    setTimeout(() => {
        box.classList.remove("scale-105");
        box.classList.add("scale-100");
    }, 200);
}

/**
 * Copia o IBAN atualmente exibido para a área de transferência.
 * Mostra um tooltip temporariamente para indicar ao utilizador que o IBAN foi copiado.
 */
function copyIBAN() {
    const iban = document.getElementById("iban-single").textContent;
    navigator.clipboard.writeText(iban).then(() => {
        const tooltip = document.getElementById("copyTooltip");
        tooltip.classList.remove("hidden");
        setTimeout(() => tooltip.classList.add("hidden"), 1200);
    });
}

/**
 * Gera múltiplos IBANs e apresenta-os numa lista.
 * O número máximo de IBANs gerados está limitado a 20.
 */
function generateIBANs() {
    const count = Math.min(
        parseInt(document.getElementById("count").value),
        20
    );
    const list = document.getElementById("iban-list");
    list.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const { iban, bankCode } = createIBAN();
        const div = document.createElement("div");
        const tag = document.createElement("div");
        tag.className = "text-xs text-gray-500 dark:text-gray-400 mt-1";
        tag.textContent = bankMap[bankCode] || "";
        div.className =
            "bg-white dark:bg-gray-800 shadow-md px-4 py-2 rounded-xl text-center w-full animate-reveal text-gray-900 dark:text-white";
        div.textContent = iban;
        div.appendChild(tag);
        list.appendChild(div);
    }
}

/**
 * Cria um IBAN português aleatório.
 * @returns {{iban: string, bankCode: string}} Um objeto contendo o IBAN gerado e o código do banco.
 */
function createIBAN() {
    const countryCode = "PT";  // Código de país para Portugal

    // Seleciona um código de banco aleatório da lista disponível
    const bankCode =
        bankCodes[Math.floor(Math.random() * bankCodes.length)];

    // Gera código de balcão aleatório (4 dígitos)
    const branchCode = pad(Math.floor(Math.random() * 10000), 4);

    // Gera número de conta aleatório (11 dígitos)
    const accountNumber = pad(Math.floor(Math.random() * 100000000000), 11);

    // Gera dígitos de controlo aleatórios (2 dígitos)
    const controlDigits = pad(Math.floor(Math.random() * 100), 2);

    // Constrói o BBAN (Basic Bank Account Number)
    const bban = bankCode + branchCode + accountNumber + controlDigits;

    // Rearranja conforme especificação para cálculo do checksum (PT = 2529)
    const rearranged = bban + "2529" + "00";

    // Calcula os dígitos de verificação (98 - módulo 97)
    const checksum = 98 - mod97(rearranged);

    return { iban: countryCode + pad(checksum, 2) + bban, bankCode };
}

/**
 * Adiciona zeros à esquerda de um número até atingir o comprimento especificado.
 * @param {number} number - O número a ser preenchido com zeros.
 * @param {number} length - O comprimento desejado da string resultante.
 * @returns {string} O número preenchido com zeros à esquerda.
 */
function pad(number, length) {
    return number.toString().padStart(length, "0");
}

/**
 * Calcula o resto da divisão por 97 para verificação do IBAN.
 * Este método é utilizado para calcular os dígitos de verificação do IBAN.
 * @param {string} iban - A string do IBAN a ser verificada.
 * @returns {number} O resto da divisão por 97.
 */
function mod97(iban) {
    // Converte letras em números conforme especificação ISO 13616
    const expanded = iban.replace(/[A-Z]/g, (ch) => ch.charCodeAt(0) - 55);

    // Processa o número em blocos para evitar limitações de inteiros em JavaScript
    let remainder = expanded;
    while (remainder.length > 2) {
        // Extrai blocos de 9 dígitos para processamento
        const block = remainder.substring(0, 9);
        // Calcula o resto e concatena com os dígitos restantes
        remainder =
            (parseInt(block, 10) % 97) + remainder.substring(block.length);
    }

    return parseInt(remainder, 10) % 97;
}