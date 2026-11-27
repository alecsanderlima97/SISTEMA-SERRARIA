const ROUND_FACTOR = 100;

export const COMMERCIAL_MODES = Object.freeze({
    SIMPLE: 'acrescimo',
    PRESERVE: 'preservacao',
    DISCOUNT: 'desconto',
    ADJUSTMENT: 'reajuste',
    REVERSE: 'reverso'
});

export function roundMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round((number + Number.EPSILON) * ROUND_FACTOR) / ROUND_FACTOR;
}

export function parseDecimal(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').trim().replace(/R\$\s*/gi, '').replace(/\s/g, '');
    if (!text) return 0;

    const hasComma = text.includes(',');
    const hasDot = text.includes('.');
    if (hasComma) {
        text = text.replace(/\./g, '').replace(',', '.');
    } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(text)) {
        text = text.replace(/\./g, '');
    }

    const number = Number(text.replace(/[^\d.-]/g, ''));
    return Number.isFinite(number) ? number : 0;
}

export function resolveClientPrice(cliente = {}, produto = '') {
    const texto = String(produto || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const extra = String(cliente.nomeMadeiraExtra || '').toUpperCase().trim();
    let campo = '';

    if (texto.includes('PINUS')) campo = 'madeiraPinus';
    else if (texto.includes('PRIMEIRA') || /\b1A?\b/.test(texto)) campo = 'madeira1';
    else if (texto.includes('SEGUNDA') || /\b2A?\b/.test(texto)) campo = 'madeira2';
    else if (texto.includes('TERCEIRA') || /\b3A?\b/.test(texto)) campo = 'madeira3';
    else if (extra && texto.includes(extra)) campo = 'valorMadeiraExtra';

    if (!campo || cliente[campo] === undefined || cliente[campo] === null || cliente[campo] === '') return null;
    const preco = parseDecimal(cliente[campo]);
    return preco > 0 ? preco : null;
}

function safePercent(value) {
    return Math.max(0, parseDecimal(value));
}

function safeItem(item = {}) {
    return {
        id: item.id || '',
        produto: String(item.produto || '').trim(),
        precoOriginal: Math.max(0, parseDecimal(item.precoOriginal)),
        quantidade: Math.max(0, parseDecimal(item.quantidade))
    };
}

function calculateLine(item, mode, taxPercent, discountPercent, reversePrice, adjustmentPrice) {
    const row = safeItem(item);
    const original = row.precoOriginal;
    const taxRate = taxPercent / 100;
    let finalUnit = original;
    let taxUnit = 0;
    let discountUnit = 0;
    let netUnit = original;

    if (mode === COMMERCIAL_MODES.SIMPLE) {
        const withTax = original * (1 + taxRate);
        taxUnit = withTax - original;
        discountUnit = withTax * (discountPercent / 100);
        finalUnit = withTax - discountUnit;
        netUnit = finalUnit - taxUnit;
    } else if (mode === COMMERCIAL_MODES.PRESERVE) {
        const withTax = taxRate >= 1 ? original : original / (1 - taxRate);
        taxUnit = withTax - original;
        discountUnit = withTax * (discountPercent / 100);
        finalUnit = withTax - discountUnit;
        netUnit = finalUnit - taxUnit;
    } else if (mode === COMMERCIAL_MODES.DISCOUNT) {
        discountUnit = original * (discountPercent / 100);
        finalUnit = original - discountUnit;
        netUnit = finalUnit;
    } else if (mode === COMMERCIAL_MODES.ADJUSTMENT) {
        finalUnit = adjustmentPrice > 0 ? adjustmentPrice : original;
        netUnit = finalUnit;
    } else if (mode === COMMERCIAL_MODES.REVERSE) {
        finalUnit = reversePrice > 0 ? reversePrice : original;
        taxUnit = finalUnit * taxRate;
        netUnit = finalUnit - taxUnit;
    }

    const quantity = row.quantidade;
    return {
        ...row,
        precoFinal: roundMoney(finalUnit),
        valorImpostos: roundMoney(taxUnit * quantity),
        valorDesconto: roundMoney(discountUnit * quantity),
        valorOriginal: roundMoney(original * quantity),
        valorFinal: roundMoney(finalUnit * quantity),
        valorLiquido: roundMoney(netUnit * quantity),
        liquidoPorM3: roundMoney(netUnit),
        volume: quantity
    };
}

function weightedPrice(lines, field, volume) {
    if (!volume) return 0;
    return roundMoney(lines.reduce((sum, line) => sum + (Number(line[field]) || 0) * line.volume, 0) / volume);
}

export function calculateCommercialSimulation(input = {}, options = {}) {
    const includeComparison = options.includeComparison !== false;
    const mode = Object.values(COMMERCIAL_MODES).includes(input.modalidade)
        ? input.modalidade
        : COMMERCIAL_MODES.SIMPLE;
    const taxPercent = safePercent(input.taxaPercentual);
    const discountPercent = safePercent(input.descontoPercentual);
    const freight = Math.max(0, parseDecimal(input.frete));
    const otherExpenses = Math.max(0, parseDecimal(input.outrasDespesas));
    const reversePrice = Math.max(0, parseDecimal(input.precoFinalReverso));
    const adjustmentOldPrice = Math.max(0, parseDecimal(input.precoAntigo));
    const adjustmentPrice = Math.max(0, parseDecimal(input.precoNovo));
    const rawItems = Array.isArray(input.itens) ? input.itens : [];
    const itens = rawItems.map(item => calculateLine(item, mode, taxPercent, discountPercent, reversePrice, adjustmentPrice));
    const volumeTotal = roundMoney(itens.reduce((sum, item) => sum + item.volume, 0));
    const originalTotal = roundMoney(itens.reduce((sum, item) => sum + item.valorOriginal, 0));
    const taxesTotal = roundMoney(itens.reduce((sum, item) => sum + item.valorImpostos, 0));
    const discountTotal = roundMoney(itens.reduce((sum, item) => sum + item.valorDesconto, 0));
    const productFinalTotal = roundMoney(itens.reduce((sum, item) => sum + item.valorFinal, 0));
    const productNetTotal = roundMoney(itens.reduce((sum, item) => sum + item.valorLiquido, 0));
    const operationTotal = roundMoney(productFinalTotal + freight + otherExpenses);
    const netOperationTotal = roundMoney(productNetTotal - freight - otherExpenses);

    const comparisonBase = { ...input, taxaPercentual: taxPercent, descontoPercentual: 0 };
    const simple = includeComparison
        ? calculateCommercialSimulation({ ...comparisonBase, modalidade: COMMERCIAL_MODES.SIMPLE }, { includeComparison: false })
        : null;
    const preserve = includeComparison
        ? calculateCommercialSimulation({ ...comparisonBase, modalidade: COMMERCIAL_MODES.PRESERVE }, { includeComparison: false })
        : null;
    const adjustmentPercent = adjustmentOldPrice > 0
        ? roundMoney(((adjustmentPrice - adjustmentOldPrice) / adjustmentOldPrice) * 100)
        : 0;
    const errors = [];
    if (!itens.length) errors.push('Adicione pelo menos um produto.');
    if (mode === COMMERCIAL_MODES.PRESERVE && taxPercent >= 100) errors.push('A preservação do valor líquido exige uma taxa abaixo de 100%.');
    if (mode === COMMERCIAL_MODES.REVERSE && reversePrice <= 0) errors.push('Informe o preço final para o cálculo reverso.');
    if (mode === COMMERCIAL_MODES.ADJUSTMENT && adjustmentOldPrice <= 0) errors.push('Informe o preço antigo para calcular o reajuste.');

    return {
        modalidade: mode,
        taxaPercentual: roundMoney(taxPercent),
        descontoPercentual: roundMoney(discountPercent),
        frete: roundMoney(freight),
        outrasDespesas: roundMoney(otherExpenses),
        itens,
        volumeTotal,
        originalTotal,
        impostosTotal: taxesTotal,
        descontoTotal: discountTotal,
        produtoFinalTotal: productFinalTotal,
        liquidoProdutoTotal: productNetTotal,
        totalOperacao: operationTotal,
        liquidoTotalOperacao: netOperationTotal,
        precoOriginalPorM3: weightedPrice(itens, 'precoOriginal', volumeTotal),
        precoFinalPorM3: weightedPrice(itens, 'precoFinal', volumeTotal),
        valorLiquidoPorM3: weightedPrice(itens, 'liquidoPorM3', volumeTotal),
        reajustePercentual: adjustmentPercent,
        comparacao: includeComparison ? {
            acrescimoSimples: {
                precoPorM3: simple.precoFinalPorM3,
                total: roundMoney(simple.produtoFinalTotal + freight + otherExpenses)
            },
            preservacaoLiquido: {
                precoPorM3: preserve.precoFinalPorM3,
                total: roundMoney(preserve.produtoFinalTotal + freight + otherExpenses)
            }
        } : null,
        erros: errors
    };
}

export function formatBRL(value) {
    return roundMoney(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
