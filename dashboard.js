import { db, getDocs, collection } from './js/firebase-init.js';

let chartVendasInstance = null;
let chartVolumeInstance = null;
let dashboardData = { romaneios: [], entradas: [], subprodutos: [], funcionarios: [], estoque: [], financeiro: [], relatoriosFinanceiros: [] };
let dashboardPeriodo = null;

const formatBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatM3 = (v) => `${(Number(v) || 0).toFixed(2).replace('.', ',')} m³`;

const dashboardLoader = window.SectionLoader?.register('view-dashboard', initDashboard);
document.addEventListener('historicoUpdated', () => {
    dashboardLoader?.invalidate();
    if (document.getElementById('view-dashboard')?.classList.contains('active-section')) {
        dashboardLoader?.load(true);
    }
});

async function initDashboard() {
    try {
        const [snapRomaneios, snapClientes, snapEntradas, snapSubprodutos, snapFuncionarios, snapEstoque, snapFinanceiro, snapRelatoriosFinanceiros] = await Promise.all([
            getDocs(collection(db, 'romaneios')),
            getDocs(collection(db, 'clientes')),
            getDocs(collection(db, 'entradas')),
            getDocs(collection(db, 'vendas_subprodutos')),
            getDocs(collection(db, 'funcionarios')),
            getDocs(collection(db, 'estoque')),
            getDocs(collection(db, 'financeiro_lancamentos')),
            getDocs(collection(db, 'financeiro_relatorios_mensais'))
        ]);

        dashboardData = {
            romaneios: docsToArray(snapRomaneios),
            entradas: docsToArray(snapEntradas),
            subprodutos: docsToArray(snapSubprodutos),
            funcionarios: docsToArray(snapFuncionarios),
            estoque: docsToArray(snapEstoque),
            financeiro: docsToArray(snapFinanceiro),
            relatoriosFinanceiros: docsToArray(snapRelatoriosFinanceiros)
        };

        configurarFiltroDashboard();
        atualizarKpisDashboard(snapClientes.size);

        bindKpiClicks();
        renderDashboardView('madeira');
        renderRelatorioMensalDashboard();
    } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
    }
}

document.addEventListener('financeiroUpdated', () => {
    atualizarKpisDashboard();
    renderRelatorioMensalDashboard();
});

function docsToArray(snapshot) {
    const list = [];
    snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
}

function configurarFiltroDashboard() {
    const mesInput = document.getElementById('dashFiltroMes');
    const inicioInput = document.getElementById('dashFiltroInicio');
    const fimInput = document.getElementById('dashFiltroFim');
    if (!mesInput || mesInput.dataset.bound === '1') return;
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    mesInput.value = mesInput.value || mesAtual;
    dashboardPeriodo = periodoPorMes(mesInput.value);
    mesInput.dataset.bound = '1';
    mesInput.addEventListener('change', () => {
        if (!mesInput.value) return;
        dashboardPeriodo = periodoPorMes(mesInput.value);
        if (inicioInput) inicioInput.value = '';
        if (fimInput) fimInput.value = '';
        atualizarKpisDashboard();
        renderRelatorioMensalDashboard();
    });
}

function atualizarKpisDashboard(totalClientes = null) {
    const periodo = getDashboardPeriodoSelecionado();
    const romaneiosPeriodo = dashboardData.romaneios.filter(item => itemDentroPeriodo(item, periodo));
    const entradasPeriodo = dashboardData.entradas.filter(item => itemDentroPeriodo(item, periodo));
    const subprodutosPeriodo = dashboardData.subprodutos.filter(item => itemDentroPeriodo(item, periodo));
    const totalCargas = romaneiosPeriodo.length;
    const volumeMadeira = romaneiosPeriodo.reduce((acc, r) => acc + getVolumeRomaneio(r), 0);
    const faturamentoMadeira = romaneiosPeriodo.reduce((acc, r) => acc + (Number(r.financeiro?.totalGeral) || 0), 0);
    const volumeToras = entradasPeriodo.reduce((acc, e) => acc + (Number(e.volume) || 0), 0);
    const volumeSub = subprodutosPeriodo.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
    const faturamentoSub = subprodutosPeriodo.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const faturamentoTotal = faturamentoMadeira + faturamentoSub;
    const resumoFinanceiro = getResumoFinanceiroLocal(periodo.inicio, periodo.fim);
    const comparativoFinanceiro = faturamentoTotal - resumoFinanceiro.despesas;
    window.dashboardFinanceiroResumo = { faturamentoTotal, faturamentoMadeira, faturamentoSub, despesasMes: resumoFinanceiro.despesas, comparativoFinanceiro };
    const saldoSubEstimado = Math.max(volumeToras - volumeMadeira - volumeSub, 0);
    const aproveitamentoTotal = volumeToras > 0 ? ((volumeMadeira + volumeSub + saldoSubEstimado) / volumeToras) * 100 : 0;
    const itensAcabando = getItensAlmoxarifadoAcabando();

    setText('dash-total-cargas', totalCargas);
    setText('dash-volume-total', formatM3(volumeMadeira));
    setText('dash-entrada-toras', formatM3(volumeToras));
    setText('dash-faturamento-madeira', formatBRL(faturamentoMadeira));
    setText('dash-faturamento-sub', formatBRL(faturamentoSub));
    setText('dash-despesas-mes', formatBRL(resumoFinanceiro.despesas));
    setText('dash-comparativo-financeiro', formatBRL(comparativoFinanceiro));
    setText('dash-volume-sub', formatM3(volumeSub));
    setText('dash-rendimento-serraria', `${aproveitamentoTotal.toFixed(1).replace('.', ',')}%`);
    if (totalClientes !== null) setText('dash-total-clientes', totalClientes);
    setText('dash-total-estoque', itensAcabando.length);
    setText('dashPeriodoInfo', `KPIs de ${formatDataBR(periodo.inicio)} ate ${formatDataBR(periodo.fim)}.`);
}

function getDashboardPeriodoSelecionado() {
    if (dashboardPeriodo) return dashboardPeriodo;
    const hoje = new Date();
    return periodoPorMes(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
}

function periodoPorMes(mes) {
    const [ano, mesNum] = String(mes || '').split('-').map(Number);
    const base = ano && mesNum ? new Date(ano, mesNum - 1, 1) : new Date();
    const inicio = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-01`;
    const fimDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const fim = `${fimDate.getFullYear()}-${String(fimDate.getMonth() + 1).padStart(2, '0')}-${String(fimDate.getDate()).padStart(2, '0')}`;
    return { inicio, fim, mes: inicio.slice(0, 7) };
}

function itemDentroPeriodo(item, periodo) {
    const data = normalizarDataISO(item);
    return !!data && data >= periodo.inicio && data <= periodo.fim;
}

function normalizarDataISO(item) {
    const raw = item?.data || item?.dataCarregamento || item?.dataCriacao || item?.criadoEm || item?.dataEmissao || item?.vencimento || '';
    if (!raw) return '';
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const date = raw?.toDate ? raw.toDate() : new Date(raw);
    if (!date || isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDataBR(iso) {
    if (!iso) return '-';
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
}

window.aplicarFiltroDashboard = function() {
    const mes = document.getElementById('dashFiltroMes')?.value || '';
    const inicio = document.getElementById('dashFiltroInicio')?.value || '';
    const fim = document.getElementById('dashFiltroFim')?.value || '';
    dashboardPeriodo = inicio || fim
        ? { inicio: inicio || fim, fim: fim || inicio, mes: '' }
        : periodoPorMes(mes);
    atualizarKpisDashboard();
    renderRelatorioMensalDashboard();
};

window.voltarMesAtualDashboard = function() {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const mesInput = document.getElementById('dashFiltroMes');
    const inicioInput = document.getElementById('dashFiltroInicio');
    const fimInput = document.getElementById('dashFiltroFim');
    if (mesInput) mesInput.value = mesAtual;
    if (inicioInput) inicioInput.value = '';
    if (fimInput) fimInput.value = '';
    dashboardPeriodo = periodoPorMes(mesAtual);
    atualizarKpisDashboard();
    renderRelatorioMensalDashboard();
};

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function bindKpiClicks() {
    document.querySelectorAll('[data-dashboard-view]').forEach(card => {
        if (card.dataset.dashboardBound === '1') return;
        card.dataset.dashboardBound = '1';
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => renderDashboardView(card.dataset.dashboardView));
    });
}

function renderDashboardView(view) {
    if (view === 'subprodutos') {
        renderLineChart('Fluxo de venda Cavaco/Pó', agruparSubprodutosPorDia());
        renderBarChart('Volume por tipo de subproduto', agruparSubprodutosPorTipo());
        renderResumoSubprodutos();
        return;
    }

    if (view === 'toras') {
        renderLineChart('Entrada de toras por dia', agruparEntradasPorDia());
        renderBarChart('Entrada por empreiteiro', agruparEntradasPorEmpreiteiro());
        renderResumoToras();
        return;
    }

    if (view === 'rendimento') {
        renderLineChart('Comparativo mensal da serraria', agruparRendimentoPorMes());
        renderBarChart('Rendimento da serraria em m³', calcularRendimentoSerraria());
        renderResumoRendimento();
        return;
    }

    if (view === 'financeiro') {
        renderLineChart('Comparativo financeiro mensal', agruparFaturamentoRealPorMes());
        renderBarChart('Despesas mensais', agruparDespesasPorMes());
        renderResumoFinanceiroDashboard();
        return;
    }

    if (view === 'despesas') {
        const detalhes = calcularDespesasDetalhadas();
        renderBarChart('Relatório de despesas por origem', detalhes.porOrigem);
        renderLineChart('Despesas mensais consolidadas', agruparDespesasPorMes());
        renderResumoDespesasDashboard(detalhes);
        return;
    }

    if (view === 'estoque') {
        const itens = getItensAlmoxarifadoAcabando();
        renderBarChart('Itens acabando no estoque', agruparItensAcabando(itens));
        renderLineChart('Itens abaixo do mínimo', agruparItensAcabando(itens));
        renderResumoEstoqueAcabando(itens);
        return;
    }

    renderLineChart('Evolução do faturamento de madeira', agruparMadeiraPorDia());
    renderBarChart('Madeiras mais vendidas', agruparMadeiraPorTipo());
    renderResumoMadeira();
}

function getItensAlmoxarifadoAcabando() {
    try {
        const itens = dashboardData.estoque.length
            ? dashboardData.estoque
            : JSON.parse(localStorage.getItem('orquestra_estoque') || '[]');
        return itens.filter(item => {
            const limite = item.limite_alerta !== undefined && item.limite_alerta !== null
                ? Number(item.limite_alerta)
                : (item.categoria === 'DIESEL' ? 1000 : item.categoria === 'LUBRIFICANTES' ? 40 : 3);
            return (Number(item.quantidade) || 0) <= limite;
        });
    } catch (error) {
        console.warn('Nao foi possivel ler o estoque local do almoxarifado.', error);
        return [];
    }
}

function renderLineChart(label, dados) {
    const canvas = document.getElementById('chartVendasPeriodo');
    if (!canvas || typeof Chart === 'undefined') return;
    setChartTitle('chartDashboardLineTitle', label, 'chart-line');
    const entries = Object.entries(dados || {}).sort(([a], [b]) => a.localeCompare(b));
    const hasData = entries.some(([, value]) => Number(value) > 0);
    const labels = hasData ? entries.map(([key]) => abreviarLabel(key)) : ['Sem dados'];
    const values = hasData ? entries.map(([, value]) => Number(value) || 0) : [0];
    if (chartVendasInstance) chartVendasInstance.destroy();
    chartVendasInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.12)',
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#e5e7eb' } },
                tooltip: {
                    backgroundColor: '#111827',
                    titleColor: '#fff',
                    bodyColor: '#e5e7eb',
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatNumberChart(ctx.parsed.y)}` }
                }
            },
            layout: { padding: { top: 8, right: 18, bottom: 24, left: 12 } },
            scales: {
                x: {
                    ticks: { color: '#9ca3af', maxRotation: 35, minRotation: 0, autoSkip: true, padding: 8 },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                },
                y: { beginAtZero: true, ticks: { color: '#9ca3af', callback: formatNumberChart }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
        }
    });
}

function renderBarChart(label, dados) {
    const canvas = document.getElementById('chartVolumeEspessura');
    if (!canvas || typeof Chart === 'undefined') return;
    setChartTitle('chartDashboardBarTitle', label, 'chart-bar');
    const entries = Object.entries(dados || {})
        .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
        .slice(0, 8);
    const hasData = entries.some(([, value]) => Number(value) > 0);
    const labels = hasData ? entries.map(([key]) => abreviarLabel(key)) : ['Sem dados'];
    const values = hasData ? entries.map(([, value]) => Number(value) || 0) : [0];
    if (chartVolumeInstance) chartVolumeInstance.destroy();
    chartVolumeInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: '#3498db',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#e5e7eb' } },
                tooltip: {
                    backgroundColor: '#111827',
                    titleColor: '#fff',
                    bodyColor: '#e5e7eb',
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatNumberChart(ctx.parsed.y)}` }
                }
            },
            layout: { padding: { top: 8, right: 18, bottom: 28, left: 12 } },
            scales: {
                x: {
                    ticks: { color: '#9ca3af', maxRotation: 35, minRotation: 0, autoSkip: false, padding: 8 },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                },
                y: { beginAtZero: true, ticks: { color: '#9ca3af', callback: formatNumberChart }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
        }
    });
}

function setChartTitle(id, text, icon) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<i class="fa-solid fa-${icon}"></i> ${text}`;
}

function abreviarLabel(label) {
    const texto = String(label || '-').trim();
    return texto.length > 18 ? `${texto.slice(0, 16)}...` : texto;
}

function formatNumberChart(value) {
    const numero = Number(value) || 0;
    return numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function getDataKey(item) {
    const raw = item.data || item.dataCriacao || item.criadoEm || item.dataEmissao || '';
    const date = raw ? new Date(raw) : null;
    if (!date || isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function addGroup(acc, key, value) {
    acc[key || 'Sem identificação'] = (acc[key || 'Sem identificação'] || 0) + (Number(value) || 0);
    return acc;
}

function getVolumeRomaneio(r) {
    return (r.pacotes || []).reduce((sum, p) => sum + (Number(p.m3VendaTotal) || 0), 0);
}

function agruparMadeiraPorDia() {
    return dashboardData.romaneios.reduce((acc, r) => addGroup(acc, getDataKey(r), r.financeiro?.totalGeral || 0), {});
}

function agruparMadeiraPorTipo() {
    return dashboardData.romaneios.reduce((acc, r) => {
        (r.pacotes || []).forEach(p => addGroup(acc, p.qualidade || p.tipo || p.descricao, p.m3VendaTotal || 0));
        return acc;
    }, {});
}

function agruparEntradasPorDia() {
    return dashboardData.entradas.reduce((acc, e) => addGroup(acc, getDataKey(e), e.volume || 0), {});
}

function agruparEntradasPorEmpreiteiro() {
    return dashboardData.entradas.reduce((acc, e) => addGroup(acc, e.empreiteiroNome || e.fornecedor, e.volume || 0), {});
}

function agruparSubprodutosPorDia() {
    return dashboardData.subprodutos.reduce((acc, s) => addGroup(acc, getDataKey(s), s.quantidade || 0), {});
}

function agruparSubprodutosPorTipo() {
    return dashboardData.subprodutos.reduce((acc, s) => addGroup(acc, s.tipo, s.quantidade || 0), {});
}

function calcularRendimentoSerraria() {
    const toras = dashboardData.entradas.reduce((acc, e) => acc + (Number(e.volume) || 0), 0);
    const madeira = dashboardData.romaneios.reduce((acc, r) => acc + getVolumeRomaneio(r), 0);
    const subVendido = dashboardData.subprodutos.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
    const saldoSub = Math.max(toras - madeira - subVendido, 0);
    return {
        'Toras recebidas': toras,
        'Madeira serrada vendida': madeira,
        'Cavaco/Pó vendido': subVendido,
        'Saldo subproduto estimado': saldoSub
    };
}

function agruparRendimentoPorMes() {
    const grupos = {};
    dashboardData.entradas.forEach(e => addGroup(grupos, `Toras ${getMesKey(e)}`, e.volume || 0));
    dashboardData.romaneios.forEach(r => addGroup(grupos, `Madeira ${getMesKey(r)}`, getVolumeRomaneio(r)));
    dashboardData.subprodutos.forEach(s => addGroup(grupos, `Subprodutos ${getMesKey(s)}`, s.quantidade || 0));
    return grupos;
}

function obterLancamentosFinanceirosLocal() {
    try {
        if (dashboardData.financeiro.length) return dashboardData.financeiro;
        return JSON.parse(localStorage.getItem('orquestra_financeiro_lancamentos') || '[]');
    } catch (error) {
        return [];
    }
}

function getResumoFinanceiroLocal(inicio = null, fim = null) {
    if (!inicio || !fim) {
        const periodo = getDashboardPeriodoSelecionado();
        inicio = periodo.inicio;
        fim = periodo.fim;
    }
    const detalhes = calcularDespesasDetalhadas(inicio, fim);
    return { despesas: detalhes.total, quantidade: detalhes.quantidade, detalhes };
}

function agruparDespesasPorMes() {
    const grupos = {};
    obterLancamentosFinanceirosLocal().forEach(item => addGroup(grupos, getMesKey({ data: item.vencimento }), item.valor || 0));
    dashboardData.entradas.forEach(item => {
        addGroup(grupos, getMesKey({ data: item.data }), Number(item.totalEmpreiteiro || 0) + Number(item.totalDescarga || 0));
    });
    dashboardData.funcionarios.forEach(func => {
        const mes = getMesKey({ data: func.admissao || new Date().toISOString() });
        addGroup(grupos, mes, Number(func.salario || 0));
        (func.horasExtras || []).forEach(he => addGroup(grupos, getMesKey({ data: he.data }), calcularValorHoraExtra(func, he)));
    });
    return grupos;
}

function calcularDespesasDetalhadas(inicio = getInicioMesAtual(), fim = getFimMesAtual()) {
    const dentroPeriodo = data => (!inicio || data >= inicio) && (!fim || data <= fim);
    const manual = obterLancamentosFinanceirosLocal().filter(item => dentroPeriodo(item.vencimento || ''));
    const porOrigem = {
        'Pagamento funcionarios': dashboardData.funcionarios.reduce((acc, f) => acc + Number(f.salario || 0), 0),
        'Hora extra funcionarios': dashboardData.funcionarios.reduce((acc, f) => acc + (f.horasExtras || []).filter(he => dentroPeriodo(he.data || '')).reduce((sum, he) => sum + calcularValorHoraExtra(f, he), 0), 0),
        'Valor a pagar empreiteiro': dashboardData.entradas.filter(e => dentroPeriodo(e.data || '')).reduce((acc, e) => acc + Number(e.totalEmpreiteiro || 0), 0),
        'Valor a pagar descarregamento': dashboardData.entradas.filter(e => dentroPeriodo(e.data || '')).reduce((acc, e) => acc + Number(e.totalDescarga || 0), 0),
        'Despesas gerais': manual.filter(item => item.aba === 'despesas-gerais').reduce((acc, item) => acc + Number(item.valor || 0), 0),
        'Boletos aleatorios': manual.filter(item => item.aba === 'boletos').reduce((acc, item) => acc + Number(item.valor || 0), 0),
        'Impostos': manual.filter(item => item.aba === 'impostos').reduce((acc, item) => acc + Number(item.valor || 0), 0),
        'Despesas fixas': manual.filter(item => item.aba === 'despesas-fixas').reduce((acc, item) => acc + Number(item.valor || 0), 0)
    };
    return {
        porOrigem,
        total: Object.values(porOrigem).reduce((acc, valor) => acc + Number(valor || 0), 0),
        quantidade: manual.length + dashboardData.funcionarios.length + dashboardData.entradas.filter(e => dentroPeriodo(e.data || '')).length
    };
}

function calcularValorHoraExtra(func, he) {
    const salario = Number(func.salario || 0);
    const valorNormal = func.valorHeNormal !== undefined ? Number(func.valorHeNormal || 0) : (salario / 220) * 1.5;
    const valorEspecial = func.valorHeEspecial !== undefined ? Number(func.valorHeEspecial || 0) : (salario / 220) * 2;
    const valorHora = he.tipo === 'ESPECIAL' ? valorEspecial : valorNormal;
    return (Number(he.horas || 0) * valorHora) + Number(he.adicional || 0);
}

function getInicioMesAtual() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function getFimMesAtual() {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function agruparFaturamentoRealPorMes() {
    const grupos = {};
    dashboardData.romaneios.forEach(r => addGroup(grupos, getMesKey(r), r.financeiro?.totalGeral || 0));
    dashboardData.subprodutos.forEach(s => addGroup(grupos, getMesKey(s), s.total || 0));
    const despesas = agruparDespesasPorMes();
    Object.keys(despesas).forEach(mes => {
        grupos[mes] = (grupos[mes] || 0) - despesas[mes];
    });
    return grupos;
}

function renderResumoFinanceiroDashboard() {
    const resumo = getResumoFinanceiroLocal();
    const faturamento = dashboardData.romaneios.reduce((acc, r) => acc + (Number(r.financeiro?.totalGeral) || 0), 0)
        + dashboardData.subprodutos.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    setResumo(
        `Lucro geral: ${formatBRL(faturamento)}`,
        `Despesas gerais: ${formatBRL(resumo.despesas)}`,
        `Comparativo: ${formatBRL(faturamento - resumo.despesas)}`
    );
}

function renderResumoDespesasDashboard(detalhes) {
    const itens = Object.entries(detalhes.porOrigem)
        .sort((a, b) => b[1] - a[1])
        .map(([nome, valor]) => `${nome}: ${formatBRL(valor)}`);
    setResumo(
        `Total despesas: ${formatBRL(detalhes.total)}`,
        itens.slice(0, 3).join(' | ') || '-',
        itens.slice(3).join(' | ') || '-'
    );
}

function getMesKey(item) {
    const raw = item.data || item.dataCriacao || item.criadoEm || item.dataEmissao || '';
    const date = raw ? new Date(raw) : null;
    if (!date || isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' });
}

function renderResumoMadeira() {
    const maior = dashboardData.romaneios.reduce((best, r) => getVolumeRomaneio(r) > best.volume ? { volume: getVolumeRomaneio(r), label: r.numero || r.numeroCarga || '-' } : best, { volume: 0, label: '-' });
    const melhorDia = topEntry(agruparMadeiraPorDia(), formatBRL);
    const tipos = topList(agruparMadeiraPorTipo(), formatM3);
    setResumo(`${maior.label} - ${formatM3(maior.volume)}`, melhorDia, tipos);
}

function renderResumoToras() {
    const maior = dashboardData.entradas.reduce((best, e) => (Number(e.volume) || 0) > best.volume ? { volume: Number(e.volume) || 0, label: e.romaneioNum || '-' } : best, { volume: 0, label: '-' });
    const melhorDia = topEntry(agruparEntradasPorDia(), formatM3);
    const empreiteiros = topList(agruparEntradasPorEmpreiteiro(), formatM3);
    setResumo(`${maior.label} - ${formatM3(maior.volume)}`, melhorDia, empreiteiros);
}

function renderResumoSubprodutos() {
    const maior = dashboardData.subprodutos.reduce((best, s) => (Number(s.quantidade) || 0) > best.volume ? { volume: Number(s.quantidade) || 0, label: s.romaneio || s.romaneioCliente || '-' } : best, { volume: 0, label: '-' });
    const melhorDia = topEntry(agruparSubprodutosPorDia(), formatM3);
    const tipos = topList(agruparSubprodutosPorTipo(), formatM3);
    const mensal = topList(agruparSubprodutosPorMes(), formatM3);
    setResumo(`${maior.label} - ${formatM3(maior.volume)}`, `Mensal: ${mensal}`, tipos);
}

function agruparSubprodutosPorMes() {
    return dashboardData.subprodutos.reduce((acc, s) => addGroup(acc, getMesKey(s), s.quantidade || 0), {});
}

function agruparItensAcabando(itens) {
    return itens.reduce((acc, item) => addGroup(acc, item.nome || item.descricao || 'Item', item.quantidade || 0), {});
}

function renderResumoEstoqueAcabando(itens) {
    const lista = itens
        .sort((a, b) => (Number(a.quantidade) || 0) - (Number(b.quantidade) || 0))
        .slice(0, 8)
        .map(item => `${item.nome || item.descricao || 'Item'}: ${Number(item.quantidade) || 0}`)
        .join(' | ');
    setResumo(
        `${itens.length} item(ns) acabando`,
        lista || 'Nenhum item abaixo do mínimo',
        'Revise o almoxarifado'
    );
}

function renderResumoRendimento() {
    const dados = calcularRendimentoSerraria();
    const toras = dados['Toras recebidas'];
    const madeira = dados['Madeira serrada vendida'];
    const subVendido = dados['Cavaco/Pó vendido'];
    const saldoSub = dados['Saldo subproduto estimado'];
    const percMadeira = toras > 0 ? (madeira / toras) * 100 : 0;
    const percSub = toras > 0 ? ((subVendido + saldoSub) / toras) * 100 : 0;
    setResumo(
        `Madeira: ${percMadeira.toFixed(1).replace('.', ',')}%`,
        `Subproduto vendido: ${formatM3(subVendido)}`,
        `Saldo subproduto estimado: ${formatM3(saldoSub)} (${percSub.toFixed(1).replace('.', ',')}%)`
    );
}

function topEntry(obj, formatter) {
    const entry = Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
    return entry ? `${entry[0]} - ${formatter(entry[1])}` : '-';
}

function topList(obj, formatter) {
    const items = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return items.length ? items.map(([k, v]) => `${k}: ${formatter(v)}`).join(' | ') : '-';
}

function setResumo(maiorCarga, melhorDia, madeiras) {
    setText('dash-resumo-maior-carga', maiorCarga);
    setText('dash-resumo-melhor-dia', melhorDia);
    setText('dash-resumo-madeiras', madeiras);
}

function renderRelatorioMensalDashboard() {
    const info = document.getElementById('dash-relatorio-mensal-info');
    if (!info) return;
    const periodo = getDashboardPeriodoSelecionado();
    const mesAtual = periodo.mes || periodo.inicio.slice(0, 7);
    const relatoriosLocais = JSON.parse(localStorage.getItem('orquestra_financeiro_relatorios_mensais') || '{}');
    const salvo = dashboardData.relatoriosFinanceiros.find(item => item.id === mesAtual || item.mes === mesAtual) || relatoriosLocais[mesAtual];
    if (salvo) {
        info.textContent = `${mesAtual}: despesas ${formatBRL(salvo.despesas)} | comparativo ${formatBRL(salvo.comparativoFinanceiro || salvo.faturamentoReal || 0)}`;
        return;
    }
    info.textContent = `Periodo ${formatDataBR(periodo.inicio)} ate ${formatDataBR(periodo.fim)} ainda nao salvo.`;
}

window.visualizarRelatorioMensalDashboard = function() {
    const periodo = getDashboardPeriodoSelecionado();
    const mesAtual = periodo.mes || periodo.inicio.slice(0, 7);
    const relatoriosLocais = JSON.parse(localStorage.getItem('orquestra_financeiro_relatorios_mensais') || '{}');
    const salvo = dashboardData.relatoriosFinanceiros.find(item => item.id === mesAtual || item.mes === mesAtual) || relatoriosLocais[mesAtual];
    if (!salvo) {
        alert('Ainda nao existe relatorio salvo para este periodo.');
        return;
    }

    alert(
        `RELATORIO MENSAL - ${mesAtual}\n\n` +
        `Despesas: ${formatBRL(salvo.despesas || 0)}\n` +
        `Faturamento: ${formatBRL(salvo.faturamento || 0)}\n` +
        `Comparativo: ${formatBRL(salvo.comparativoFinanceiro || 0)}\n` +
        `Salvo em: ${new Date(salvo.salvoEm || Date.now()).toLocaleString('pt-BR')}`
    );
};
window.salvarRelatorioMensalDashboard = async function() {
    const periodo = getDashboardPeriodoSelecionado();
    const mesAtual = periodo.mes || periodo.inicio.slice(0, 7);
    const resumo = getResumoFinanceiroLocal(periodo.inicio, periodo.fim);
    const romaneiosPeriodo = dashboardData.romaneios.filter(item => itemDentroPeriodo(item, periodo));
    const subprodutosPeriodo = dashboardData.subprodutos.filter(item => itemDentroPeriodo(item, periodo));
    const faturamento = romaneiosPeriodo.reduce((acc, r) => acc + (Number(r.financeiro?.totalGeral) || 0), 0)
        + subprodutosPeriodo.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const relatorios = JSON.parse(localStorage.getItem('orquestra_financeiro_relatorios_mensais') || '{}');
    relatorios[mesAtual] = {
        mes: mesAtual,
        inicio: periodo.inicio,
        fim: periodo.fim,
        despesas: resumo.despesas,
        faturamento,
        comparativoFinanceiro: faturamento - resumo.despesas,
        salvoEm: new Date().toISOString()
    };
    localStorage.setItem('orquestra_financeiro_relatorios_mensais', JSON.stringify(relatorios));
    if (window.FS) {
        await window.FS.setDoc('financeiro_relatorios_mensais', mesAtual, relatorios[mesAtual]);
        dashboardData.relatoriosFinanceiros = [
            { id: mesAtual, ...relatorios[mesAtual] },
            ...dashboardData.relatoriosFinanceiros.filter(item => item.id !== mesAtual && item.mes !== mesAtual)
        ];
    }
    renderRelatorioMensalDashboard();
    alert('Relatorio mensal salvo no painel de controle.');
};
