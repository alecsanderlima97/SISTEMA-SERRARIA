console.log("Modulo Financeiro: inicializando...");

const FINANCEIRO_KEY = 'orquestra_financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_KEY = 'orquestra_financeiro_relatorios_mensais';
const FINANCEIRO_COLLECTION = 'financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_COLLECTION = 'financeiro_relatorios_mensais';

const FINANCEIRO_ABAS = {
    'despesas-gerais': {
        titulo: 'Despesas Gerais',
        tipoPadrao: ['BOLETO', 'MULTA', 'DESPESA AVULSA', 'FORNECEDOR'],
        descricaoPadrao: ['MANUTENCAO', 'COMPRA AVULSA', 'SERVICO TERCEIRO']
    },
    boletos: {
        titulo: 'Boletos Aleatorios',
        tipoPadrao: ['BOLETO', 'COBRANCA', 'PARCELA'],
        descricaoPadrao: ['FORNECEDOR', 'COMPRA', 'SERVICO']
    },
    impostos: {
        titulo: 'Impostos',
        tipoPadrao: ['IMPOSTO', 'GUIA', 'TAXA'],
        descricaoPadrao: ['FGTS', 'INSS', 'RECEITA FEDERAL', 'SIMPLES NACIONAL', 'SINDICATO', 'CARTORIO']
    },
    'despesas-fixas': {
        titulo: 'Despesas Fixas',
        tipoPadrao: ['DESPESA FIXA', 'CONTA MENSAL', 'CONTRATO'],
        descricaoPadrao: ['AGUA', 'ENERGIA', 'INTERNET', 'TELEFONE', 'SISTEMA NF', 'SEGURANCA DO TRABALHO']
    }
};

let financeiroAbaAtiva = 'despesas-gerais';
let financeiroAnexosTemp = { documento: null, comprovante: null };
let financeiroRelatorioAtual = [];
let financeiroNuvemCarregada = false;

function normalizarTexto(valor) {
    return (valor || '').toString().trim().toUpperCase();
}

function obterLancamentosFinanceiros() {
    return JSON.parse(localStorage.getItem(FINANCEIRO_KEY) || '[]');
}

function salvarLancamentosFinanceiros(lista) {
    localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(lista || []));
}

async function carregarFinanceiroNuvem() {
    if (!window.FS) return;
    try {
        const locais = obterLancamentosFinanceiros();
        const nuvem = await window.FS.getCollection(FINANCEIRO_COLLECTION);
        if (nuvem.length > 0) {
            salvarLancamentosFinanceiros(nuvem);
        } else if (locais.length > 0) {
            await Promise.all(locais.map(item => window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, item)));
        }
        financeiroNuvemCarregada = true;
        renderFinanceiro();
    } catch (error) {
        console.error('Falha ao carregar financeiro no Firestore. Usando cache local.', error);
    }
}

async function salvarFinanceiroNuvem(item) {
    if (!window.FS || !item?.id) return;
    try {
        await window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, item);
    } catch (error) {
        console.error(`Falha ao salvar financeiro/${item.id} no Firestore.`, error);
        alert('Lancamento salvo localmente, mas nao foi possivel sincronizar com a nuvem agora.');
    }
}

async function excluirFinanceiroNuvem(id) {
    if (!window.FS || !id) return true;
    try {
        await window.FS.deleteDoc(FINANCEIRO_COLLECTION, id);
        return true;
    } catch (error) {
        console.error(`Falha ao excluir financeiro/${id} no Firestore.`, error);
        alert('Nao foi possivel excluir na nuvem agora. O lancamento foi mantido localmente para evitar divergencia. Tente novamente em alguns instantes.');
        return false;
    }
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoeda(valor) {
    const limpo = (valor || '').toString().replace(/\D/g, '');
    return limpo ? Number(limpo) / 100 : 0;
}

function aplicarMascaraMoeda(input) {
    const valor = parseMoeda(input.value);
    input.value = valor ? formatarMoeda(valor) : '';
}

function dataBR(dataIso) {
    if (!dataIso) return '-';
    return new Date(`${dataIso}T12:00:00`).toLocaleDateString('pt-BR');
}

function estaVencido(item) {
    if (item.pago || !item.vencimento) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(`${item.vencimento}T12:00:00`) < hoje;
}

function obterStatusItem(item) {
    if (item.pago) return { label: 'Pago', classe: 'pago' };
    if (estaVencido(item)) return { label: 'Vencido', classe: 'vencido' };
    return { label: 'Não pago', classe: 'aberto' };
}

function atualizarStatusToggle() {
    const pago = document.getElementById('financeiroPago')?.checked;
    const texto = document.getElementById('financeiroStatusTexto');
    if (texto) texto.textContent = pago ? 'Pago' : 'Não pago';
}

function atualizarDatalistsFinanceiro() {
    const lista = obterLancamentosFinanceiros().filter(item => item.aba === financeiroAbaAtiva);
    const config = FINANCEIRO_ABAS[financeiroAbaAtiva];
    const tipos = [...new Set([...config.tipoPadrao, ...lista.map(item => item.tipo).filter(Boolean)])];
    const descricoes = [...new Set([...config.descricaoPadrao, ...lista.map(item => item.descricao).filter(Boolean)])];

    document.getElementById('financeiroClassesList').innerHTML = tipos.map(item => `<option value="${item}"></option>`).join('');
    document.getElementById('financeiroDescricaoList').innerHTML = descricoes.map(item => `<option value="${item}"></option>`).join('');
}

function preencherNomeArquivo(tipo, file) {
    const id = tipo === 'documento' ? 'financeiroDocumentoNome' : 'financeiroComprovanteNome';
    const el = document.getElementById(id);
    if (el) el.textContent = file ? file.name : (tipo === 'documento' ? 'Nenhum documento anexado' : 'Nenhum comprovante anexado');
}

function lerArquivoFinanceiro(file, tipo) {
    if (!file) {
        financeiroAnexosTemp[tipo] = null;
        preencherNomeArquivo(tipo, null);
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        financeiroAnexosTemp[tipo] = {
            nome: file.name,
            tipo: file.type || 'application/octet-stream',
            dados: reader.result
        };
        preencherNomeArquivo(tipo, file);
    };
    reader.readAsDataURL(file);
}

function calcularKpisFinanceiro() {
    const lista = obterLancamentosFinanceiros();
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();

    const vencidos = lista.filter(estaVencido).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const aberto = lista.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const pagoMes = lista.filter(item => {
        if (!item.pago || !item.pagoEm) return false;
        const dt = new Date(item.pagoEm);
        return dt.getMonth() === mes && dt.getFullYear() === ano;
    }).reduce((acc, item) => acc + Number(item.valor || 0), 0);

    document.getElementById('financeiroKpiVencidos').textContent = formatarMoeda(vencidos);
    document.getElementById('financeiroKpiAberto').textContent = formatarMoeda(aberto);
    document.getElementById('financeiroKpiPagoMes').textContent = formatarMoeda(pagoMes);
    document.getElementById('financeiroKpiQtd').textContent = lista.length;
    const despesasMes = totalDespesasPorPeriodo(inicioMesAtual(), fimMesAtual());
    document.getElementById('financeiroKpiDespesas').textContent = formatarMoeda(despesasMes);
    document.dispatchEvent(new CustomEvent('financeiroUpdated', { detail: { despesasMes } }));
}

function inicioMesAtual() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function fimMesAtual() {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function totalDespesasPorPeriodo(inicio, fim) {
    return obterLancamentosFinanceiros()
        .filter(item => (!inicio || item.vencimento >= inicio) && (!fim || item.vencimento <= fim))
        .reduce((acc, item) => acc + Number(item.valor || 0), 0);
}

window.obterResumoFinanceiroLocal = function(inicio = inicioMesAtual(), fim = fimMesAtual()) {
    const lista = obterLancamentosFinanceiros().filter(item => (!inicio || item.vencimento >= inicio) && (!fim || item.vencimento <= fim));
    return {
        inicio,
        fim,
        despesas: lista.reduce((acc, item) => acc + Number(item.valor || 0), 0),
        pagos: lista.filter(item => item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
        abertos: lista.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
        vencidos: lista.filter(estaVencido).reduce((acc, item) => acc + Number(item.valor || 0), 0),
        quantidade: lista.length
    };
};

window.switchFinanceiroAba = function(aba) {
    financeiroAbaAtiva = aba;
    document.querySelectorAll('.btn-tab-financeiro').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.finTab === aba);
    });
    document.getElementById('financeiroTituloLista').textContent = FINANCEIRO_ABAS[aba].titulo;
    window.limparFinanceiroForm();
    renderFinanceiro();
};

window.limparFinanceiroForm = function() {
    document.getElementById('financeiroForm')?.reset();
    document.getElementById('financeiroId').value = '';
    financeiroAnexosTemp = { documento: null, comprovante: null };
    preencherNomeArquivo('documento', null);
    preencherNomeArquivo('comprovante', null);
    atualizarStatusToggle();
    atualizarDatalistsFinanceiro();
};

window.renderFinanceiro = function() {
    const tbody = document.getElementById('financeiroLista');
    if (!tbody) return;

    atualizarKpisFinanceiro();
    atualizarDatalistsFinanceiro();

    const filtroStatus = document.getElementById('financeiroFiltroStatus')?.value || 'TODOS';
    const busca = normalizarTexto(document.getElementById('financeiroBusca')?.value);
    let lista = obterLancamentosFinanceiros().filter(item => item.aba === financeiroAbaAtiva);

    if (filtroStatus === 'PAGO') lista = lista.filter(item => item.pago);
    if (filtroStatus === 'ABERTO') lista = lista.filter(item => !item.pago);
    if (filtroStatus === 'VENCIDO') lista = lista.filter(estaVencido);
    if (busca) {
        lista = lista.filter(item => [item.tipo, item.descricao, item.observacao].some(valor => normalizarTexto(valor).includes(busca)));
    }

    lista.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
    document.getElementById('financeiroResumoLista').textContent = `${lista.length} registro(s)`;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:28px; color:var(--text-muted);">Nenhum lançamento financeiro nesta aba.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(item => {
        const status = obterStatusItem(item);
        const anexos = [
            item.documento ? `<button type="button" class="btn-icon financeiro-link" style="color:#60a5fa; font-size:1.05rem; padding:4px;" onclick="window.abrirAnexoFinanceiro('${item.id}', 'documento')" title="Abrir documento"><i class="fa-solid fa-file-lines"></i></button>` : '',
            item.comprovante ? `<button type="button" class="btn-icon financeiro-link" style="color:#22c55e; font-size:1.05rem; padding:4px;" onclick="window.abrirAnexoFinanceiro('${item.id}', 'comprovante')" title="Abrir comprovante"><i class="fa-solid fa-receipt"></i></button>` : ''
        ].filter(Boolean).join('');

        return `
            <tr>
                <td><strong>${item.tipo}</strong></td>
                <td>${item.descricao}<small>${item.observacao || ''}</small></td>
                <td>${dataBR(item.vencimento)}</td>
                <td><strong>${formatarMoeda(item.valor)}</strong></td>
                <td><span class="financeiro-status-badge ${status.classe}">${status.label}</span></td>
                <td>${anexos || '<span style="color:var(--text-muted);">-</span>'}</td>
                <td class="financeiro-acoes">
                    <button type="button" class="btn-icon" style="color:var(--primary-color); font-size:1.05rem; padding:4px;" onclick="window.editarFinanceiro('${item.id}')" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button type="button" class="btn-icon" style="color:#22c55e; font-size:1.05rem; padding:4px;" onclick="window.alternarPagoFinanceiro('${item.id}')" title="Alterar status"><i class="fa-solid fa-circle-check"></i></button>
                    <button type="button" class="btn-icon" style="color:var(--danger-color); font-size:1.05rem; padding:4px;" onclick="window.excluirFinanceiro('${item.id}')" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    }).join('');
};

function atualizarKpisFinanceiro() {
    calcularKpisFinanceiro();
}

window.editarFinanceiro = function(id) {
    const item = obterLancamentosFinanceiros().find(reg => reg.id === id);
    if (!item) return;

    financeiroAbaAtiva = item.aba;
    document.querySelectorAll('.btn-tab-financeiro').forEach(btn => btn.classList.toggle('active', btn.dataset.finTab === item.aba));
    document.getElementById('financeiroTituloLista').textContent = FINANCEIRO_ABAS[item.aba].titulo;
    document.getElementById('financeiroId').value = item.id;
    document.getElementById('financeiroTipo').value = item.tipo;
    document.getElementById('financeiroDescricao').value = item.descricao;
    document.getElementById('financeiroVencimento').value = item.vencimento;
    document.getElementById('financeiroValor').value = formatarMoeda(item.valor);
    document.getElementById('financeiroObservacao').value = item.observacao || '';
    document.getElementById('financeiroPago').checked = !!item.pago;
    financeiroAnexosTemp = { documento: item.documento || null, comprovante: item.comprovante || null };
    preencherNomeArquivo('documento', item.documento ? { name: item.documento.nome } : null);
    preencherNomeArquivo('comprovante', item.comprovante ? { name: item.comprovante.nome } : null);
    atualizarStatusToggle();
    window.scrollTo({ top: document.getElementById('view-financeiro').offsetTop, behavior: 'smooth' });
};

window.alternarPagoFinanceiro = async function(id) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(reg => reg.id === id);
    if (!item) return;
    item.pago = !item.pago;
    item.pagoEm = item.pago ? new Date().toISOString() : null;
    item.atualizadoEm = new Date().toISOString();
    salvarLancamentosFinanceiros(lista);
    await salvarFinanceiroNuvem(item);
    renderFinanceiro();
};

window.excluirFinanceiro = async function(id) {
    const autorizado = await window.confirmarExclusaoComSenha('Deseja excluir este lancamento financeiro?');
    if (!autorizado) return;
    const okNuvem = await excluirFinanceiroNuvem(id);
    if (!okNuvem) return;
    salvarLancamentosFinanceiros(obterLancamentosFinanceiros().filter(item => item.id !== id));
    renderFinanceiro();
};

window.abrirAnexoFinanceiro = function(id, tipo) {
    const item = obterLancamentosFinanceiros().find(reg => reg.id === id);
    const anexo = item?.[tipo];
    if (!anexo?.dados) return;
    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para visualizar o anexo.');
        return;
    }
    win.document.write(`<title>${anexo.nome}</title><iframe src="${anexo.dados}" style="width:100%; height:100vh; border:0;"></iframe>`);
    win.document.close();
};

window.abrirRelatorioFinanceiro = function() {
    const card = document.getElementById('financeiroRelatorioCard');
    if (!card) return;
    card.style.display = 'block';
    document.getElementById('financeiroRelatorioInicio').value = inicioMesAtual();
    document.getElementById('financeiroRelatorioFim').value = fimMesAtual();
    prepararRelatorioFinanceiro();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.fecharRelatorioFinanceiro = function() {
    const card = document.getElementById('financeiroRelatorioCard');
    if (card) card.style.display = 'none';
};

window.prepararRelatorioFinanceiro = function() {
    const inicio = document.getElementById('financeiroRelatorioInicio')?.value || '';
    const fim = document.getElementById('financeiroRelatorioFim')?.value || '';
    const statusFiltro = document.getElementById('financeiroRelatorioStatus')?.value || 'TODOS';
    let lista = obterLancamentosFinanceiros().filter(item => item.aba === financeiroAbaAtiva);

    if (inicio) lista = lista.filter(item => item.vencimento >= inicio);
    if (fim) lista = lista.filter(item => item.vencimento <= fim);
    if (statusFiltro === 'PAGO') lista = lista.filter(item => item.pago);
    if (statusFiltro === 'ABERTO') lista = lista.filter(item => !item.pago);
    if (statusFiltro === 'VENCIDO') lista = lista.filter(estaVencido);

    lista.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
    financeiroRelatorioAtual = lista;
    const tbody = document.getElementById('financeiroRelatorioLista');
    if (!tbody) return;

    tbody.innerHTML = lista.length ? lista.map(item => {
        const status = obterStatusItem(item);
        return `
            <tr>
                <td><input type="checkbox" class="financeiro-relatorio-check" value="${item.id}" checked onchange="window.atualizarResumoRelatorioFinanceiro()"></td>
                <td>${item.tipo}</td>
                <td>${item.descricao}</td>
                <td>${dataBR(item.vencimento)}</td>
                <td>${formatarMoeda(item.valor)}</td>
                <td><span class="financeiro-status-badge ${status.classe}">${status.label}</span></td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="6" style="text-align:center; padding:22px; color:var(--text-muted);">Nenhum lançamento no período selecionado.</td></tr>';

    const todos = document.getElementById('financeiroRelatorioTodos');
    if (todos) todos.checked = lista.length > 0;
    atualizarResumoRelatorioFinanceiro();
};

window.marcarTodosRelatorioFinanceiro = function(checked) {
    document.querySelectorAll('.financeiro-relatorio-check').forEach(input => input.checked = checked);
    atualizarResumoRelatorioFinanceiro();
};

window.atualizarResumoRelatorioFinanceiro = function() {
    const selecionados = new Set(Array.from(document.querySelectorAll('.financeiro-relatorio-check:checked')).map(input => input.value));
    const lista = financeiroRelatorioAtual.filter(item => selecionados.has(item.id));
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const pagos = lista.filter(item => item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const abertos = lista.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const resumo = document.getElementById('financeiroRelatorioResumo');
    if (resumo) {
        resumo.innerHTML = `
            <div><small>Selecionados</small><strong>${lista.length}</strong></div>
            <div><small>Valor total</small><strong style="color:#ef4444;">${formatarMoeda(total)}</strong></div>
            <div><small>Pago</small><strong>${formatarMoeda(pagos)}</strong></div>
            <div><small>Em aberto</small><strong>${formatarMoeda(abertos)}</strong></div>
        `;
    }
};

window.imprimirRelatorioFinanceiro = function() {
    const selecionados = new Set(Array.from(document.querySelectorAll('.financeiro-relatorio-check:checked')).map(input => input.value));
    const lista = financeiroRelatorioAtual.filter(item => selecionados.has(item.id));
    if (lista.length === 0) {
        alert('Selecione pelo menos um lançamento para gerar o relatório.');
        return;
    }
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para imprimir o relatório.');
        return;
    }
    win.document.write(`
        <html><head><title>Relatório Financeiro</title><style>
            body{font-family:Arial,sans-serif;padding:24px;color:#111827} h1{margin-bottom:4px}
            table{width:100%;border-collapse:collapse;margin-top:18px} th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}
            th{background:#f3f4f6} .total{font-size:20px;font-weight:bold;color:#dc2626;margin-top:16px}
        </style></head><body>
            <h1>Relatório Financeiro - ${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}</h1>
            <p>Período: ${dataBR(document.getElementById('financeiroRelatorioInicio').value)} até ${dataBR(document.getElementById('financeiroRelatorioFim').value)}</p>
            <div class="total">Valor total: ${formatarMoeda(total)}</div>
            <table><thead><tr><th>Tipo</th><th>Descrição</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead><tbody>
                ${lista.map(item => `<tr><td>${item.tipo}</td><td>${item.descricao}</td><td>${dataBR(item.vencimento)}</td><td>${obterStatusItem(item).label}</td><td>${formatarMoeda(item.valor)}</td></tr>`).join('')}
            </tbody></table>
            <script>window.onload=function(){window.print();}</script>
        </body></html>
    `);
    win.document.close();
};

async function salvarFinanceiroSubmit(event) {
    event.preventDefault();

    const tipo = normalizarTexto(document.getElementById('financeiroTipo').value);
    const descricao = normalizarTexto(document.getElementById('financeiroDescricao').value);
    const vencimento = document.getElementById('financeiroVencimento').value;
    const valor = parseMoeda(document.getElementById('financeiroValor').value);

    if (!tipo || !descricao || !vencimento || valor <= 0) {
        alert('Preencha tipo, descrição, vencimento e valor.');
        return;
    }

    const id = document.getElementById('financeiroId').value || `fin_${Date.now()}`;
    const lista = obterLancamentosFinanceiros();
    const existente = lista.find(item => item.id === id);
    const pago = document.getElementById('financeiroPago').checked;
    const registro = {
        id,
        aba: financeiroAbaAtiva,
        tipo,
        descricao,
        vencimento,
        valor,
        observacao: document.getElementById('financeiroObservacao').value.trim(),
        pago,
        pagoEm: pago ? (existente?.pagoEm || new Date().toISOString()) : null,
        documento: financeiroAnexosTemp.documento,
        comprovante: financeiroAnexosTemp.comprovante,
        atualizadoEm: new Date().toISOString(),
        criadoEm: existente?.criadoEm || new Date().toISOString()
    };

    const index = lista.findIndex(item => item.id === id);
    if (index >= 0) lista[index] = registro;
    else lista.push(registro);

    salvarLancamentosFinanceiros(lista);
    await salvarFinanceiroNuvem(registro);
    window.limparFinanceiroForm();
    renderFinanceiro();
};

function injetarEstilosFinanceiro() {
    const style = document.createElement('style');
    style.textContent = `
        .financeiro-tabs { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px; border-bottom:1px solid var(--panel-border); padding-bottom:12px; }
        .btn-tab-financeiro { background:rgba(255,255,255,0.03); border:1px solid var(--panel-border); color:var(--text-muted); border-radius:8px; padding:10px 14px; font-weight:800; cursor:pointer; display:flex; gap:8px; align-items:center; }
        .btn-tab-financeiro.active { color:var(--accent-color); border-color:var(--accent-color); background:rgba(107,142,35,0.12); }
        .financeiro-form-card, .financeiro-list-card { padding:20px; margin-bottom:20px; }
        .financeiro-form-grid { display:grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap:14px; align-items:end; }
        .financeiro-obs { grid-column: span 2; }
        .financeiro-form-actions { display:flex; align-items:flex-end; justify-content:flex-end; }
        .financeiro-status-toggle { min-height:42px; border:1px solid rgba(239,68,68,0.35); background:rgba(239,68,68,0.12); color:#ef4444; border-radius:8px; padding:8px 10px; display:flex; align-items:center; gap:8px; font-weight:900; cursor:pointer; }
        .financeiro-status-toggle:has(input:checked) { border-color:rgba(16,185,129,0.45); background:rgba(16,185,129,0.12); color:#10b981; }
        .financeiro-list-header { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
        .financeiro-filtros { display:flex; gap:8px; flex-wrap:wrap; }
        .financeiro-filtros select, .financeiro-filtros input { min-height:38px; border-radius:8px; border:1px solid var(--panel-border); background:rgba(15,23,42,0.7); color:var(--text-color); padding:0 10px; }
        .financeiro-table { width:100%; border-collapse:collapse; min-width:860px; }
        .financeiro-table th { text-align:left; color:var(--text-muted); font-size:0.78rem; text-transform:uppercase; padding:10px; border-bottom:1px solid var(--panel-border); }
        .financeiro-table td { padding:12px 10px; border-bottom:1px solid rgba(148,163,184,0.15); vertical-align:middle; }
        .financeiro-table td small { display:block; color:var(--text-muted); margin-top:4px; max-width:320px; }
        .financeiro-status-badge { border-radius:999px; padding:5px 10px; font-size:0.78rem; font-weight:900; white-space:nowrap; }
        .financeiro-status-badge.pago { color:#10b981; background:rgba(16,185,129,0.12); }
        .financeiro-status-badge.aberto { color:#f59e0b; background:rgba(245,158,11,0.12); }
        .financeiro-status-badge.vencido { color:#ef4444; background:rgba(239,68,68,0.12); }
        .financeiro-acoes, .financeiro-link { display:flex; gap:8px; align-items:center; }
        .financeiro-acoes button, .financeiro-link { cursor:pointer; text-decoration:none; }
        .financeiro-relatorio-card { padding:20px; margin-bottom:20px; }
        .financeiro-relatorio-filtros { display:grid; grid-template-columns: repeat(4, minmax(130px, 1fr)); gap:12px; align-items:end; margin-bottom:14px; }
        .financeiro-relatorio-resumo { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin:12px 0; }
        .financeiro-relatorio-resumo div { border:1px solid var(--panel-border); border-radius:8px; padding:10px; background:rgba(255,255,255,0.03); }
        .financeiro-relatorio-resumo small { color:var(--text-muted); display:block; }
        .financeiro-relatorio-resumo strong { display:block; margin-top:3px; font-size:1.05rem; }
        @media (max-width: 1100px) { .financeiro-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .financeiro-obs { grid-column: span 2; } }
        @media (max-width: 680px) { .financeiro-form-grid { grid-template-columns: 1fr; } .financeiro-obs { grid-column: span 1; } }
    `;
    document.head.appendChild(style);
}

function prepararDocumentoRelatorioFinanceiro() {
    const selecionados = new Set(Array.from(document.querySelectorAll('.financeiro-relatorio-check:checked')).map(input => input.value));
    const lista = financeiroRelatorioAtual.filter(item => selecionados.has(item.id));
    if (lista.length === 0) {
        alert('Selecione pelo menos um lancamento para gerar o relatorio.');
        return false;
    }
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const contentHtml = `
        <div class="doc-header">
            <div><img src="logo.png" alt="Serraria" class="doc-logo" onerror="this.style.display='none'"></div>
            <div class="doc-title"><h1>Relatorio Financeiro</h1><p>${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}</p></div>
        </div>
        <div class="doc-note"><strong>Periodo:</strong> ${dataBR(document.getElementById('financeiroRelatorioInicio').value)} ate ${dataBR(document.getElementById('financeiroRelatorioFim').value)}<br><strong>Valor total:</strong> <span class="doc-money">${formatarMoeda(total)}</span></div>
        <table class="doc-table"><thead><tr><th>Tipo</th><th>Descricao</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead><tbody>${lista.map(item => `<tr><td>${item.tipo}</td><td>${item.descricao}</td><td>${dataBR(item.vencimento)}</td><td>${obterStatusItem(item).label}</td><td class="doc-money">${formatarMoeda(item.valor)}</td></tr>`).join('')}</tbody></table>
    `;
    window.financeiroDocAtual = { title: `Relatorio Financeiro ${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}`, filename: `financeiro-${financeiroAbaAtiva}`, contentHtml };
    return true;
}

window.imprimirRelatorioFinanceiro = function() {
    if (!prepararDocumentoRelatorioFinanceiro()) return;
    window.DocActions.printHtml(window.financeiroDocAtual);
};

window.baixarPdfRelatorioFinanceiro = function() {
    if (!prepararDocumentoRelatorioFinanceiro()) return;
    window.DocActions.downloadPdf(window.financeiroDocAtual);
};

window.enviarRelatorioFinanceiroWhatsapp = function() {
    if (!prepararDocumentoRelatorioFinanceiro()) return;
    window.DocActions.sendWhatsApp({ title: window.financeiroDocAtual.title, filename: window.financeiroDocAtual.filename, contentHtml: window.financeiroDocAtual.contentHtml, message: `Segue o ${window.financeiroDocAtual.title}.` });
};

document.addEventListener('DOMContentLoaded', () => {
    injetarEstilosFinanceiro();
    document.getElementById('financeiroForm')?.addEventListener('submit', salvarFinanceiroSubmit);
    document.getElementById('financeiroValor')?.addEventListener('input', event => aplicarMascaraMoeda(event.target));
    document.getElementById('financeiroPago')?.addEventListener('change', atualizarStatusToggle);
    document.getElementById('financeiroDocumento')?.addEventListener('change', event => lerArquivoFinanceiro(event.target.files[0], 'documento'));
    document.getElementById('financeiroComprovante')?.addEventListener('change', event => lerArquivoFinanceiro(event.target.files[0], 'comprovante'));
    window.limparFinanceiroForm();
    renderFinanceiro();
    carregarFinanceiroNuvem();
});
