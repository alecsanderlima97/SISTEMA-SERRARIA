import { calculateCommercialSimulation, COMMERCIAL_MODES, formatBRL, parseDecimal, resolveClientPrice } from './calculadora-comercial-core.mjs';

const root = document.getElementById('view-calculadora-comercial');
if (!root) throw new Error('Calculadora Comercial: seção não encontrada.');

const DEFAULT_ITEMS = [
    { id: 'item-1', produto: 'Madeira de primeira', precoOriginal: 1010, quantidade: 1 },
    { id: 'item-2', produto: 'Madeira de segunda', precoOriginal: 675, quantidade: 1 }
];

let itens = DEFAULT_ITEMS.map(item => ({ ...item }));
let clientes = [];
let produtos = [];
let historico = [];
let simulacaoEditandoId = null;
let dadosCarregados = false;
let historicoCarregado = false;

const $ = (id) => document.getElementById(id);

function valor(id) {
    return $(id)?.value ?? '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatNumber(value, decimals = 3) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatInputMoney(value) {
    const number = parseDecimal(value);
    return number ? number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function currentInput() {
    return {
        titulo: valor('calcComTitulo').trim(),
        clienteId: valor('calcComCliente'),
        clienteNome: $('calcComCliente')?.selectedOptions?.[0]?.textContent?.trim() || '',
        modalidade: valor('calcComModalidade') || COMMERCIAL_MODES.SIMPLE,
        taxaPercentual: valor('calcComTaxa'),
        descontoPercentual: valor('calcComDesconto'),
        frete: valor('calcComFrete'),
        outrasDespesas: valor('calcComOutras'),
        precoAntigo: valor('calcComPrecoAntigo'),
        precoNovo: valor('calcComPrecoNovo'),
        precoFinalReverso: valor('calcComPrecoFinalReverso'),
        itens: itens.map(item => ({ ...item }))
    };
}

function result() {
    return calculateCommercialSimulation(currentInput());
}

function showStatus(message, type = 'success') {
    const status = $('calcComStatus');
    if (!status) return;
    status.hidden = !message;
    status.dataset.type = type;
    status.textContent = message || '';
}

function renderClients() {
    const select = $('calcComCliente');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Sem cliente vinculado</option>' + clientes
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
        .map(cliente => `<option value="${escapeHtml(cliente.id)}">${escapeHtml(cliente.nome || cliente.razaoSocial || 'Cliente sem nome')}</option>`)
        .join('');
    if (current) select.value = current;
}

function produtoLabel(produto) {
    const nome = produto.tipo || produto.nome || produto.descricao || produto.produto || 'Produto sem nome';
    const classe = produto.classe || produto.qualidade || '';
    const especie = produto.natureza || produto.especie || '';
    return [nome, classe, especie].filter(Boolean).join(' | ');
}

function produtoPrice(produto) {
    return parseDecimal(produto.precoM3 ?? produto.valorM3 ?? produto.preco ?? produto.valor ?? produto.precoVenda);
}

function aplicarCondicoesCliente() {
    const clienteId = valor('calcComCliente');
    const cliente = clientes.find(item => String(item.id) === String(clienteId));
    if (!cliente) return;

    let camposAplicados = 0;
    if (Object.prototype.hasOwnProperty.call(cliente, 'porcentagemNF') && cliente.porcentagemNF !== '') {
        setField('calcComTaxa', String(parseDecimal(cliente.porcentagemNF)).replace('.', ','));
        camposAplicados += 1;
    }
    if (Object.prototype.hasOwnProperty.call(cliente, 'valorFrete') && cliente.valorFrete !== '') {
        setField('calcComFrete', formatInputMoney(cliente.valorFrete));
        camposAplicados += 1;
    }

    let precosAplicados = 0;
    itens = itens.map(item => {
        const preco = resolveClientPrice(cliente, item.produto);
        if (preco === null) return item;
        precosAplicados += 1;
        return { ...item, precoOriginal: preco };
    });

    if (precosAplicados) renderItems();
    updateResults();
    const nome = cliente.nome || cliente.razaoSocial || 'cliente selecionado';
    showStatus(`Condições de ${nome} aplicadas: ${camposAplicados + precosAplicados} campo(s) atualizado(s). Os valores continuam editáveis.`);
}

function renderProductDatalist() {
    const list = $('calcComProdutosDatalist');
    if (!list) return;
    const values = new Set();
    produtos.forEach(produto => values.add(produtoLabel(produto)));
    ['Madeira de primeira', 'Madeira de segunda'].forEach(value => values.add(value));
    list.innerHTML = [...values].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(value => `<option value="${escapeHtml(value)}"></option>`).join('');
}

function renderPriceTable() {
    const tbody = $('calcComTabelaPrecos');
    if (!tbody) return;
    if (!produtos.length) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum produto cadastrado encontrado.</td></tr>';
        return;
    }
    const ordenados = produtos
        .slice()
        .sort((a, b) => produtoLabel(a).localeCompare(produtoLabel(b), 'pt-BR'));
    tbody.innerHTML = ordenados
        .map((produto, index) => {
            const nome = produtoLabel(produto);
            const classe = produto.classe || produto.qualidade || '-';
            const price = produtoPrice(produto);
            return `<tr><td>${escapeHtml(nome)}</td><td>${escapeHtml(classe)}</td><td>${formatBRL(price)}</td><td><button type="button" class="calccom-price-use" data-price-id="${escapeHtml(produto.id || '')}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Usar</button></td></tr>`;
        }).join('');
}

function renderItems() {
    const list = $('calcComItens');
    if (!list) return;
    list.innerHTML = itens.map((item, index) => `
        <div class="calccom-item-row" data-item-index="${index}">
            <div class="calccom-field"><label for="calcComProduto-${index}">Produto / classificação</label><input id="calcComProduto-${index}" data-item-field="produto" list="calcComProdutosDatalist" type="text" value="${escapeHtml(item.produto)}" placeholder="Ex.: Madeira de primeira"></div>
            <div class="calccom-field"><label for="calcComPreco-${index}">Valor original (R$/m³)</label><input id="calcComPreco-${index}" data-item-field="precoOriginal" type="text" inputmode="decimal" value="${escapeHtml(formatInputMoney(item.precoOriginal))}" placeholder="R$ 0,00"></div>
            <div class="calccom-field"><label for="calcComQtd-${index}">Quantidade (m³)</label><input id="calcComQtd-${index}" data-item-field="quantidade" type="text" inputmode="decimal" value="${escapeHtml(formatInputMoney(item.quantidade))}" placeholder="0,000"></div>
            <button type="button" class="calccom-item-remove" data-item-remove="${index}" title="Remover produto" aria-label="Remover produto"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('');
}

function updateModeFields() {
    const mode = valor('calcComModalidade');
    const wrap = $('calcComModoExtra');
    if (wrap) wrap.hidden = ![COMMERCIAL_MODES.ADJUSTMENT, COMMERCIAL_MODES.REVERSE].includes(mode);
    root.querySelectorAll('[data-mode-extra]').forEach(field => {
        field.hidden = field.dataset.modeExtra !== mode;
    });
}

function updateResults() {
    const data = result();
    const labels = {
        [COMMERCIAL_MODES.SIMPLE]: 'Acréscimo simples',
        [COMMERCIAL_MODES.PRESERVE]: 'Preservação do valor líquido',
        [COMMERCIAL_MODES.DISCOUNT]: 'Desconto comercial',
        [COMMERCIAL_MODES.ADJUSTMENT]: 'Reajuste de preço',
        [COMMERCIAL_MODES.REVERSE]: 'Cálculo reverso'
    };
    $('calcComResultadoModo').textContent = labels[data.modalidade] || labels[COMMERCIAL_MODES.SIMPLE];
    $('calcComKpiOriginal').textContent = `${formatBRL(data.precoOriginalPorM3)}/m³`;
    $('calcComKpiImpostos').textContent = formatBRL(data.impostosTotal);
    $('calcComKpiDesconto').textContent = formatBRL(data.descontoTotal);
    $('calcComKpiFinal').textContent = `${formatBRL(data.precoFinalPorM3)}/m³`;
    $('calcComKpiLiquido').textContent = `${formatBRL(data.valorLiquidoPorM3)}/m³`;
    $('calcComKpiVolume').textContent = `${formatNumber(data.volumeTotal)} m³`;
    $('calcComKpiTotal').textContent = formatBRL(data.totalOperacao);
    $('calcComKpiLiquidoTotal').textContent = formatBRL(data.liquidoTotalOperacao);
    $('calcComCompSimples').textContent = `${formatBRL(data.comparacao.acrescimoSimples.precoPorM3)}/m³`;
    $('calcComCompSimplesTotal').textContent = formatBRL(data.comparacao.acrescimoSimples.total);
    $('calcComCompPreserva').textContent = `${formatBRL(data.comparacao.preservacaoLiquido.precoPorM3)}/m³`;
    $('calcComCompPreservaTotal').textContent = formatBRL(data.comparacao.preservacaoLiquido.total);

    const reajuste = $('calcComReajusteResumo');
    reajuste.hidden = data.modalidade !== COMMERCIAL_MODES.ADJUSTMENT;
    $('calcComReajustePercent').textContent = `${data.reajustePercentual >= 0 ? '+' : ''}${data.reajustePercentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    const errors = $('calcComErros');
    errors.hidden = data.erros.length === 0;
    errors.innerHTML = data.erros.map(error => `<div><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(error)}</div>`).join('');
    return data;
}

let calculadorasAuxiliaresView = null;

function integrarCalculadorasAuxiliares() {
    const painel = $('calcComAuxiliaresPanel');
    const view = document.getElementById('view-calculadoras');
    if (!painel || !view || view.parentElement === painel) return;

    // Mantem os IDs e os listeners legados, mas coloca a tela dentro do modulo comercial.
    view.classList.remove('view-section');
    view.style.display = 'none';
    painel.appendChild(view);
    calculadorasAuxiliaresView = view;
}

function selecionarAbaCalculadora(aba = 'comercial') {
    const auxiliar = aba === 'auxiliares';
    const painelComercial = $('calcComComercialPanel');
    const painelAuxiliar = $('calcComAuxiliaresPanel');
    const btnComercial = $('btnCalcComTabComercial');
    const btnAuxiliar = $('btnCalcComTabAuxiliares');
    if (!painelComercial || !painelAuxiliar) return;

    painelComercial.hidden = auxiliar;
    painelAuxiliar.hidden = !auxiliar;
    if (calculadorasAuxiliaresView) calculadorasAuxiliaresView.style.display = auxiliar ? 'block' : 'none';
    btnComercial?.classList.toggle('is-active', !auxiliar);
    btnAuxiliar?.classList.toggle('is-active', auxiliar);
    btnComercial?.setAttribute('aria-selected', String(!auxiliar));
    btnAuxiliar?.setAttribute('aria-selected', String(auxiliar));
}

function setField(id, value) {
    const field = $(id);
    if (field) field.value = value ?? '';
}

function clearSimulation() {
    simulacaoEditandoId = null;
    setField('calcComTitulo', '');
    setField('calcComCliente', '');
    setField('calcComModalidade', COMMERCIAL_MODES.SIMPLE);
    setField('calcComTaxa', '9,3');
    setField('calcComDesconto', '0');
    setField('calcComFrete', '0,00');
    setField('calcComOutras', '0,00');
    setField('calcComPrecoAntigo', '');
    setField('calcComPrecoNovo', '');
    setField('calcComPrecoFinalReverso', '');
    itens = DEFAULT_ITEMS.map(item => ({ ...item, id: `${item.id}-${Date.now()}` }));
    renderItems();
    updateModeFields();
    updateResults();
    showStatus('Nova simulação iniciada.');
}

function serializarSimulacao(data) {
    const input = currentInput();
    return {
        titulo: input.titulo || `Simulação de ${new Date().toLocaleDateString('pt-BR')}`,
        clienteId: input.clienteId || null,
        clienteNome: input.clienteNome || null,
        modalidade: input.modalidade,
        taxaPercentual: parseDecimal(input.taxaPercentual),
        descontoPercentual: parseDecimal(input.descontoPercentual),
        frete: parseDecimal(input.frete),
        outrasDespesas: parseDecimal(input.outrasDespesas),
        precoAntigo: parseDecimal(input.precoAntigo),
        precoNovo: parseDecimal(input.precoNovo),
        precoFinalReverso: parseDecimal(input.precoFinalReverso),
        itens: input.itens.map(item => ({
            produto: item.produto,
            precoOriginal: parseDecimal(item.precoOriginal),
            quantidade: parseDecimal(item.quantidade)
        })),
        totalOperacao: data.totalOperacao,
        liquidoTotalOperacao: data.liquidoTotalOperacao,
        volumeTotal: data.volumeTotal,
        atualizadoEm: new Date().toISOString()
    };
}

function preencherSimulacao(simulacao, duplicar = false) {
    setField('calcComTitulo', duplicar ? `${simulacao.titulo || 'Simulação'} - cópia` : simulacao.titulo || '');
    setField('calcComCliente', simulacao.clienteId || '');
    setField('calcComModalidade', simulacao.modalidade || COMMERCIAL_MODES.SIMPLE);
    setField('calcComTaxa', String(simulacao.taxaPercentual ?? 0).replace('.', ','));
    setField('calcComDesconto', String(simulacao.descontoPercentual ?? 0).replace('.', ','));
    setField('calcComFrete', formatInputMoney(simulacao.frete));
    setField('calcComOutras', formatInputMoney(simulacao.outrasDespesas));
    setField('calcComPrecoAntigo', formatInputMoney(simulacao.precoAntigo));
    setField('calcComPrecoNovo', formatInputMoney(simulacao.precoNovo));
    setField('calcComPrecoFinalReverso', formatInputMoney(simulacao.precoFinalReverso));
    itens = (simulacao.itens || []).map((item, index) => ({ ...item, id: `item-${Date.now()}-${index}` }));
    if (!itens.length) itens = DEFAULT_ITEMS.map(item => ({ ...item, id: `${item.id}-${Date.now()}` }));
    simulacaoEditandoId = duplicar ? null : simulacao.id;
    renderItems();
    updateModeFields();
    updateResults();
    showStatus(duplicar ? 'Cópia carregada. Salve para registrar uma nova simulação.' : 'Simulação carregada para edição.');
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderHistory() {
    const target = $('calcComHistorico');
    if (!target) return;
    if (!historico.length) {
        target.innerHTML = '<div class="calccom-empty-state">Nenhuma simulação salva ainda.</div>';
        return;
    }
    target.innerHTML = historico.map(item => {
        const data = item.atualizadoEm ? new Date(item.atualizadoEm).toLocaleString('pt-BR') : 'Sem data';
        const volume = formatNumber(item.volumeTotal || 0);
        return `<article class="calccom-history-row"><div class="calccom-history-main"><strong>${escapeHtml(item.titulo || 'Simulação sem nome')}</strong><small>${escapeHtml(item.clienteNome || 'Sem cliente')} · ${escapeHtml(data)} · ${volume} m³</small></div><strong class="calccom-history-total">${formatBRL(item.totalOperacao)}</strong><div class="calccom-history-actions"><button type="button" data-history-action="edit" data-history-id="${escapeHtml(item.id)}" title="Editar simulação"><i class="fa-solid fa-pen"></i></button><button type="button" data-history-action="duplicate" data-history-id="${escapeHtml(item.id)}" title="Duplicar simulação"><i class="fa-solid fa-copy"></i></button><button type="button" data-history-action="delete" data-history-id="${escapeHtml(item.id)}" title="Excluir simulação"><i class="fa-solid fa-trash"></i></button></div></article>`;
    }).join('');
}

async function carregarApoio() {
    if (dadosCarregados) return;
    if (!window.FS?.getCollection) {
        renderClients();
        renderProductDatalist();
        renderPriceTable();
        dadosCarregados = true;
        return;
    }
    try {
        const [clientesData, produtosData] = await Promise.all([
            window.FS.getCollection('clientes'),
            window.FS.getCollection('produtos')
        ]);
        clientes = Array.isArray(clientesData) ? clientesData : [];
        produtos = Array.isArray(produtosData) ? produtosData : [];
        renderClients();
        renderProductDatalist();
        renderPriceTable();
        dadosCarregados = true;
    } catch (error) {
        console.error('Calculadora Comercial: falha ao carregar clientes/produtos', error);
        showStatus('Não foi possível carregar clientes e produtos cadastrados. A simulação manual continua disponível.', 'error');
    }
}

async function carregarHistorico(force = false) {
    if (!window.FS?.getCollection || (historicoCarregado && !force)) return;
    try {
        const registros = await window.FS.getCollection('calculadoras_comerciais');
        historico = (Array.isArray(registros) ? registros : []).sort((a, b) => new Date(b.atualizadoEm || 0) - new Date(a.atualizadoEm || 0));
        historicoCarregado = true;
        renderHistory();
    } catch (error) {
        console.error('Calculadora Comercial: falha ao carregar histórico', error);
        renderHistory();
        showStatus('O histórico não pôde ser carregado. Verifique sua permissão de acesso.', 'error');
    }
}

async function salvarSimulacao() {
    const data = updateResults();
    if (data.erros.length) {
        showStatus('Corrija os campos indicados antes de salvar.', 'error');
        return;
    }
    if (window.AppUserContext?.modoTeste) {
        showStatus('Modo teste local: a simulação foi calculada, mas não é gravada no banco.', 'error');
        return;
    }
    if (!window.FS?.addDoc || !window.FS?.updateDoc) {
        showStatus('Serviço de dados ainda não está disponível. Tente novamente.', 'error');
        return;
    }
    const payload = serializarSimulacao(data);
    try {
        if (simulacaoEditandoId) {
            await window.FS.updateDoc('calculadoras_comerciais', simulacaoEditandoId, payload);
            const index = historico.findIndex(item => item.id === simulacaoEditandoId);
            if (index >= 0) historico[index] = { ...historico[index], ...payload };
            showStatus('Simulação atualizada com sucesso.');
        } else {
            const id = await window.FS.addDoc('calculadoras_comerciais', { ...payload, criadoEm: payload.atualizadoEm });
            historico.unshift({ id, ...payload });
            simulacaoEditandoId = id;
            showStatus('Simulação salva no histórico.');
        }
        renderHistory();
    } catch (error) {
        console.error('Calculadora Comercial: erro ao salvar', error);
        showStatus('Não foi possível salvar a simulação. Verifique sua permissão e tente novamente.', 'error');
    }
}

async function excluirSimulacao(id) {
    if (!window.FS?.deleteDoc) return;
    if (!window.confirm('Excluir esta simulação do histórico?')) return;
    try {
        await window.FS.deleteDoc('calculadoras_comerciais', id);
        historico = historico.filter(item => item.id !== id);
        if (simulacaoEditandoId === id) clearSimulation();
        renderHistory();
        showStatus('Simulação excluída.');
    } catch (error) {
        console.error('Calculadora Comercial: erro ao excluir', error);
        showStatus('Não foi possível excluir a simulação.', 'error');
    }
}

function whatsappText(data) {
    const input = currentInput();
    const linhas = data.itens.map(item => `- ${item.produto || 'Produto'}: ${formatNumber(item.volume)} m³ x ${formatBRL(item.precoFinal)}/m³ = ${formatBRL(item.valorFinal)}`);
    return [
        `ORÇAMENTO COMERCIAL${input.titulo ? ` - ${input.titulo}` : ''}`,
        input.clienteNome && input.clienteId ? `Cliente: ${input.clienteNome}` : '',
        '',
        ...linhas,
        '',
        `Volume total: ${formatNumber(data.volumeTotal)} m³`,
        `Valor total da carga: ${formatBRL(data.totalOperacao)}`,
        `Valor líquido estimado: ${formatBRL(data.liquidoTotalOperacao)}`,
        `Taxas: ${data.taxaPercentual.toLocaleString('pt-BR')}% | Desconto: ${data.descontoPercentual.toLocaleString('pt-BR')}%`,
        '',
        'Simulação comercial. A nota fiscal deve refletir o valor real da operação.'
    ].filter(Boolean).join('\n');
}

async function copiarWhatsApp() {
    const text = whatsappText(updateResults());
    try {
        await navigator.clipboard.writeText(text);
    } catch (_) {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }
    showStatus('Orçamento formatado copiado para colar no WhatsApp.');
}

function printableHtml(data) {
    const input = currentInput();
    const rows = data.itens.map(item => `<tr><td>${escapeHtml(item.produto || 'Produto')}</td><td>${formatNumber(item.volume)} m³</td><td>${formatBRL(item.precoFinal)}</td><td>${formatBRL(item.valorFinal)}</td></tr>`).join('');
    return `<div class="doc-header"><div><strong style="color:#0f8fa6;">ORQUESTRA MAD360</strong><h1 style="margin:8px 0 0;">Orçamento Comercial</h1><p>${escapeHtml(input.titulo || 'Simulação de preços')}</p></div><div class="doc-title"><p>${new Date().toLocaleDateString('pt-BR')}</p><p>${escapeHtml(input.clienteNome || 'Sem cliente vinculado')}</p></div></div><div class="doc-grid"><div class="doc-card"><h3>Parâmetros</h3><p>Modalidade: <strong>${escapeHtml($('calcComResultadoModo').textContent)}</strong></p><p>Taxas: <strong>${data.taxaPercentual.toLocaleString('pt-BR')}%</strong></p><p>Desconto: <strong>${data.descontoPercentual.toLocaleString('pt-BR')}%</strong></p></div><div class="doc-card"><h3>Resumo</h3><p>Volume: <strong>${formatNumber(data.volumeTotal)} m³</strong></p><p>Preço médio final: <strong>${formatBRL(data.precoFinalPorM3)}/m³</strong></p><p>Valor líquido: <strong class="doc-money">${formatBRL(data.liquidoTotalOperacao)}</strong></p></div></div><table class="doc-table"><thead><tr><th>Produto</th><th>Quantidade</th><th>Preço final / m³</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3" class="doc-total">Valor total da operação</td><td class="doc-total">${formatBRL(data.totalOperacao)}</td></tr></tfoot></table><div class="doc-note">Frete: ${formatBRL(data.frete)} · Outras despesas: ${formatBRL(data.outrasDespesas)} · Impostos e taxas: ${formatBRL(data.impostosTotal)}<br><span class="doc-muted">Documento de simulação comercial. A nota fiscal deverá refletir o valor real da operação.</span></div>`;
}

async function gerarPdf() {
    const data = updateResults();
    if (!window.DocActions?.downloadPdf) {
        showStatus('A ferramenta de PDF ainda não carregou. Tente novamente.', 'error');
        return;
    }
    try {
        await window.DocActions.downloadPdf({ title: 'Orçamento Comercial', filename: currentInput().titulo || 'orcamento-comercial', contentHtml: printableHtml(data) });
        showStatus('PDF do orçamento gerado.');
    } catch (error) {
        console.error('Calculadora Comercial: erro ao gerar PDF', error);
        showStatus('Não foi possível gerar o PDF.', 'error');
    }
}

root.addEventListener('input', event => {
    const field = event.target.closest('[data-item-field]');
    if (field) {
        const row = field.closest('[data-item-index]');
        const index = Number(row?.dataset.itemIndex);
        if (Number.isInteger(index) && itens[index]) {
            itens[index][field.dataset.itemField] = field.dataset.itemField === 'produto' ? field.value : parseDecimal(field.value);
            updateResults();
        }
        return;
    }
    if (event.target.matches('input')) updateResults();
});

root.addEventListener('change', event => {
    if (event.target.id === 'calcComCliente') {
        aplicarCondicoesCliente();
        return;
    }
    if (event.target.id === 'calcComModalidade') {
        updateModeFields();
        updateResults();
    }
    if (event.target.matches('select')) updateResults();
});

root.addEventListener('click', event => {
    const remove = event.target.closest('[data-item-remove]');
    if (remove) {
        const index = Number(remove.dataset.itemRemove);
        if (itens.length > 1) {
            itens.splice(index, 1);
            renderItems();
            updateResults();
        } else showStatus('Mantenha pelo menos um produto na simulação.', 'error');
        return;
    }
    const usePrice = event.target.closest('[data-price-id]');
    if (usePrice) {
        const produto = produtos.find(item => String(item.id || '') === String(usePrice.dataset.priceId));
        if (!produto) return;
        const index = itens.length ? 0 : null;
        if (index === null) itens.push({ id: `item-${Date.now()}`, produto: produtoLabel(produto), precoOriginal: produtoPrice(produto), quantidade: 1 });
        else Object.assign(itens[index], { produto: produtoLabel(produto), precoOriginal: produtoPrice(produto) });
        renderItems();
        updateResults();
        showStatus('Produto aplicado ao primeiro item da simulação.');
        return;
    }
    const historyButton = event.target.closest('[data-history-action]');
    if (historyButton) {
        const item = historico.find(entry => entry.id === historyButton.dataset.historyId);
        if (!item) return;
        if (historyButton.dataset.historyAction === 'edit') preencherSimulacao(item);
        if (historyButton.dataset.historyAction === 'duplicate') preencherSimulacao(item, true);
        if (historyButton.dataset.historyAction === 'delete') excluirSimulacao(item.id);
    }
});

$('btnCalcComAddItem')?.addEventListener('click', () => {
    itens.push({ id: `item-${Date.now()}`, produto: '', precoOriginal: 0, quantidade: 1 });
    renderItems();
    updateResults();
    root.querySelector(`#calcComProduto-${itens.length - 1}`)?.focus();
});
$('btnCalcComNova')?.addEventListener('click', clearSimulation);
$('btnCalcComSalvar')?.addEventListener('click', salvarSimulacao);
$('btnCalcComWhatsApp')?.addEventListener('click', copiarWhatsApp);
$('btnCalcComPdf')?.addEventListener('click', gerarPdf);
$('btnCalcComAtualizarHistorico')?.addEventListener('click', () => carregarHistorico(true));
$('btnCalcComTabComercial')?.addEventListener('click', () => selecionarAbaCalculadora('comercial'));
$('btnCalcComTabAuxiliares')?.addEventListener('click', () => selecionarAbaCalculadora('auxiliares'));

const loader = window.SectionLoader?.register('view-calculadora-comercial', async () => {
    await carregarApoio();
    await carregarHistorico();
});

document.addEventListener('app:section-change', event => {
    if (event.detail?.id === 'view-calculadora-comercial') {
        loader?.load();
    }
});

renderItems();
updateModeFields();
updateResults();
integrarCalculadorasAuxiliares();
selecionarAbaCalculadora('comercial');
