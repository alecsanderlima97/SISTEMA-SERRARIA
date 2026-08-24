import { db, getDocs, collection } from './js/firebase-init.js';

let chartVendasInstance = null;
let chartVolumeInstance = null;
let dashboardData = { romaneios: [], entradas: [], subprodutos: [], funcionarios: [], estoque: [], financeiro: [], relatoriosFinanceiros: [] };
let dashboardPeriodo = null;
let dashboardViewAtual = 'madeira';

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

document.addEventListener('themeChanged', () => {
    renderDashboardView(dashboardViewAtual);
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
        renderDashboardView(dashboardViewAtual);
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
    renderDashboardView(dashboardViewAtual);
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
    renderDashboardView(dashboardViewAtual);
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
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', () => renderDashboardView(card.dataset.dashboardView));
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                renderDashboardView(card.dataset.dashboardView);
            }
        });
    });
}

function renderDashboardView(view) {
    dashboardViewAtual = view || 'madeira';
    marcarKpiAtivo(dashboardViewAtual);
    if (view === 'subprodutos') {
        renderLineChart('Cavaco/Po por dia', agruparSubprodutosPorDia(), 'm3');
        renderBarChart('Volume por tipo de subproduto', agruparSubprodutosPorTipo(), 'm3');
        renderResumoSubprodutos();
        return;
    }

    if (view === 'toras') {
        renderLineChart('Entrada de toras por dia', agruparEntradasPorDia(), 'm3');
        renderBarChart('Entrada por empreiteiro', agruparEntradasPorEmpreiteiro(), 'm3');
        renderResumoToras();
        return;
    }

    if (view === 'rendimento') {
        renderLineChart('Rendimento no periodo', agruparRendimentoPorMes(), 'm3');
        renderBarChart('Rendimento da serraria em m3', calcularRendimentoSerraria(), 'm3');
        renderResumoRendimento();
        return;
    }

    if (view === 'financeiro') {
        renderLineChart('Comparativo financeiro no periodo', agruparFaturamentoRealPorMes(), 'brl');
        renderBarChart('Despesas por origem', calcularDespesasDetalhadasPeriodo().porOrigem, 'brl');
        renderResumoFinanceiroDashboard();
        return;
    }

    if (view === 'despesas') {
        const detalhes = calcularDespesasDetalhadasPeriodo();
        renderBarChart('Despesas por origem', detalhes.porOrigem, 'brl');
        renderLineChart('Despesas por origem no periodo', detalhes.porOrigem, 'brl');
        renderResumoDespesasDashboard(detalhes);
        return;
    }

    if (view === 'estoque') {
        const itens = getItensAlmoxarifadoAcabando();
        renderBarChart('Itens acabando no estoque', agruparItensAcabando(itens), 'num');
        renderLineChart('Itens abaixo do minimo', agruparItensAcabando(itens), 'num');
        renderResumoEstoqueAcabando(itens);
        return;
    }

    renderLineChart('Faturamento de madeira por dia', agruparMadeiraPorDia(), 'brl');
    renderBarChart('Madeiras mais vendidas', agruparMadeiraPorTipo(), 'm3');
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

function renderLineChart(label, dados, tipo = 'num') {
    const canvas = document.getElementById('chartVendasPeriodo');
    if (!canvas || typeof Chart === 'undefined') return;
    setChartTitle('chartDashboardLineTitle', `${label} - ${getPeriodoLabel()}`, 'chart-line');
    const entries = Object.entries(dados || {}).sort(([a], [b]) => a.localeCompare(b));
    const hasData = entries.some(([, value]) => Number(value) > 0);
    const labels = hasData ? entries.map(([key]) => abreviarLabel(key)) : ['Sem dados'];
    const values = hasData ? entries.map(([, value]) => Number(value) || 0) : [0];
    const ctx = canvas.getContext('2d');
    const premiumTheme = isOrquestraThemeActive();
    const palette = premiumTheme ? getChartPalette(label, tipo) : { main: '#00ff88', fill: 'rgba(0, 255, 136, 0.12)', soft: 'rgba(0, 255, 136, 0.78)' };
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, palette.fill);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    setChartInsight(canvas, entries, tipo, hasData ? 'Evolucao do periodo' : 'Sem movimentacao registrada', premiumTheme);
    if (chartVendasInstance) chartVendasInstance.destroy();
    chartVendasInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                borderColor: palette.main,
                backgroundColor: gradient,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: palette.main,
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 3,
                fill: true,
                tension: 0.38,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.96)',
                    titleColor: '#fffdf7',
                    bodyColor: '#e5e7eb',
                    borderColor: palette.main,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (items) => entries[items?.[0]?.dataIndex]?.[0] || items?.[0]?.label || '',
                        label: (item) => `${label}: ${formatChartValue(item.parsed.y, tipo)}`,
                        afterBody: (items) => tooltipPercentual(items?.[0]?.parsed?.y, values)
                    }
                }
            },
            layout: { padding: { top: 10, right: 14, bottom: 8, left: 4 } },
            scales: {
                x: {
                    ticks: { color: premiumTheme ? '#64748b' : '#9ca3af', maxRotation: premiumTheme ? 0 : 35, minRotation: 0, autoSkip: true, padding: 8, font: { size: 11, weight: 700 } },
                    grid: { display: !premiumTheme, color: 'rgba(255,255,255,0.06)' },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: premiumTheme ? '#64748b' : '#9ca3af', maxTicksLimit: 6, callback: value => formatChartValue(value, tipo), font: { size: 11, weight: 700 } },
                    grid: { color: premiumTheme ? 'rgba(148, 126, 93, 0.18)' : 'rgba(255,255,255,0.06)', drawBorder: false },
                    border: { display: false }
                }
            }
        }
    });
}

function renderBarChart(label, dados, tipo = 'num') {
    const canvas = document.getElementById('chartVolumeEspessura');
    if (!canvas || typeof Chart === 'undefined') return;
    setChartTitle('chartDashboardBarTitle', `${label} - ${getPeriodoLabel()}`, 'chart-bar');
    const entries = Object.entries(dados || {})
        .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
        .slice(0, 8);
    const hasData = entries.some(([, value]) => Number(value) > 0);
    const labels = hasData ? entries.map(([key]) => abreviarLabel(key)) : ['Sem dados'];
    const values = hasData ? entries.map(([, value]) => Number(value) || 0) : [0];
    const premiumTheme = isOrquestraThemeActive();
    const palette = premiumTheme ? getChartPalette(label, tipo) : { main: '#10b981', fill: 'rgba(16, 185, 129, 0.16)', soft: 'rgba(16, 185, 129, 0.78)' };
    const colors = labels.map((item, index) => getBarColor(item, palette, index));
    setChartInsight(canvas, entries, tipo, hasData ? 'Ranking principal' : 'Sem movimentacao registrada', premiumTheme);
    if (chartVolumeInstance) chartVolumeInstance.destroy();
    chartVolumeInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.78', '1')),
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
                barThickness: labels.length <= 4 ? 30 : 22,
                maxBarThickness: 34
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', axis: 'y', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.96)',
                    titleColor: '#fffdf7',
                    bodyColor: '#e5e7eb',
                    borderColor: palette.main,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (items) => entries[items?.[0]?.dataIndex]?.[0] || items?.[0]?.label || '',
                        label: (item) => `${label}: ${formatChartValue(item.parsed.x, tipo)}`,
                        afterBody: (items) => tooltipPercentual(items?.[0]?.parsed?.x, values)
                    }
                }
            },
            layout: { padding: { top: 8, right: 12, bottom: 6, left: 2 } },
            scales: {
                x: {
                    ticks: { color: premiumTheme ? '#64748b' : '#9ca3af', maxTicksLimit: 5, callback: value => formatChartValue(value, tipo), font: { size: 11, weight: 700 } },
                    grid: { color: premiumTheme ? 'rgba(148, 126, 93, 0.18)' : 'rgba(255,255,255,0.06)', drawBorder: false },
                    border: { display: false }
                },
                y: {
                    ticks: { color: premiumTheme ? '#334155' : '#d1d5db', autoSkip: false, font: { size: 11, weight: 800 } },
                    grid: { display: !premiumTheme, color: 'rgba(255,255,255,0.04)' },
                    border: { display: false }
                }
            }
        }
    });
}

function setChartTitle(id, text, icon) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = isOrquestraThemeActive()
        ? `<span><i class="fa-solid fa-${icon}"></i> ${text}</span><small>clique nos KPIs para trocar a analise</small>`
        : `<i class="fa-solid fa-${icon}"></i> ${text}`;
}

function abreviarLabel(label) {
    const texto = String(label || '-').trim();
    return texto.length > 34 ? `${texto.slice(0, 32)}...` : texto;
}

function formatNumberChart(value) {
    const numero = Number(value) || 0;
    return numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function formatChartValue(value, tipo = 'num') {
    if (tipo === 'brl') return formatBRL(value);
    if (tipo === 'm3') return formatM3(value);
    return formatNumberChart(value);
}

function isOrquestraThemeActive() {
    return document.body?.classList.contains('orquestra-theme');
}

function marcarKpiAtivo(view) {
    document.querySelectorAll('[data-dashboard-view]').forEach(card => {
        card.classList.toggle('dashboard-kpi-active', card.dataset.dashboardView === view);
    });
}

function getChartPalette(label = '', tipo = 'num') {
    const lower = String(label).toLowerCase();
    if (tipo === 'brl' || lower.includes('faturamento') || lower.includes('financeiro')) {
        return { main: '#047857', fill: 'rgba(4, 120, 87, 0.22)', soft: 'rgba(4, 120, 87, 0.78)' };
    }
    if (lower.includes('despesa')) {
        return { main: '#b91c1c', fill: 'rgba(185, 28, 28, 0.18)', soft: 'rgba(185, 28, 28, 0.78)' };
    }
    if (lower.includes('tora') || lower.includes('entrada')) {
        return { main: '#b45309', fill: 'rgba(180, 83, 9, 0.18)', soft: 'rgba(180, 83, 9, 0.78)' };
    }
    if (lower.includes('cavaco') || lower.includes('subproduto') || lower.includes('po')) {
        return { main: '#0f766e', fill: 'rgba(15, 118, 110, 0.18)', soft: 'rgba(15, 118, 110, 0.78)' };
    }
    if (lower.includes('estoque') || lower.includes('acabando')) {
        return { main: '#d9822b', fill: 'rgba(217, 130, 43, 0.16)', soft: 'rgba(217, 130, 43, 0.78)' };
    }
    return { main: '#0f8fa6', fill: 'rgba(15, 143, 166, 0.18)', soft: 'rgba(15, 143, 166, 0.78)' };
}

function getBarColor(label, palette, index) {
    const texto = String(label || '').toLowerCase();
    if (texto.includes('1a') || texto.includes('1ª') || texto.includes('1 classe')) return 'rgba(4, 120, 87, 0.82)';
    if (texto.includes('2a') || texto.includes('2ª') || texto.includes('2 classe')) return 'rgba(196, 122, 28, 0.84)';
    if (texto.includes('3a') || texto.includes('3ª') || texto.includes('3 classe')) return 'rgba(185, 28, 28, 0.78)';
    const base = ['rgba(15, 143, 166, 0.82)', 'rgba(4, 120, 87, 0.78)', 'rgba(37, 99, 235, 0.74)', 'rgba(180, 83, 9, 0.78)', 'rgba(124, 58, 237, 0.72)', 'rgba(15, 118, 110, 0.76)', 'rgba(194, 65, 12, 0.72)', 'rgba(71, 85, 105, 0.72)'];
    return index === 0 ? palette.soft : base[index % base.length];
}

function tooltipPercentual(value, values) {
    const total = values.reduce((sum, item) => sum + (Number(item) || 0), 0);
    if (!total) return '';
    const percentual = ((Number(value) || 0) / total) * 100;
    return `Participacao: ${percentual.toFixed(1).replace('.', ',')}% do total exibido`;
}

function setChartInsight(canvas, entries, tipo, label, enabled = true) {
    const box = canvas.closest('.chart-box');
    if (!box) return;
    let insight = box.querySelector('.dashboard-chart-insight');
    if (!enabled) {
        insight?.remove();
        return;
    }
    if (!insight) {
        insight = document.createElement('div');
        insight.className = 'dashboard-chart-insight';
        box.querySelector('h3')?.insertAdjacentElement('afterend', insight);
    }
    const validEntries = entries.filter(([, value]) => Number(value) > 0);
    if (!validEntries.length) {
        insight.innerHTML = `<span>${label}</span><strong>Nenhum dado para o periodo.</strong>`;
        return;
    }
    const total = validEntries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
    const top = [...validEntries].sort((a, b) => b[1] - a[1])[0];
    insight.innerHTML = `
        <span>${label}</span>
        <strong>Total: ${formatChartValue(total, tipo)}</strong>
        <em>Maior: ${abreviarLabel(top[0])} - ${formatChartValue(top[1], tipo)}</em>
    `;
}

function getPeriodoLabel() {
    const periodo = getDashboardPeriodoSelecionado();
    return `${formatDataBR(periodo.inicio)} a ${formatDataBR(periodo.fim)}`;
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

function dadosPeriodo(nome) {
    const periodo = getDashboardPeriodoSelecionado();
    return (dashboardData[nome] || []).filter(item => itemDentroPeriodo(item, periodo));
}

function agruparMadeiraPorDia() {
    return dadosPeriodo('romaneios').reduce((acc, r) => addGroup(acc, getDataKey(r), r.financeiro?.totalGeral || 0), {});
}

function agruparMadeiraPorTipo() {
    return dadosPeriodo('romaneios').reduce((acc, r) => {
        (r.pacotes || []).forEach(p => addGroup(acc, p.qualidade || p.tipo || p.descricao, p.m3VendaTotal || 0));
        return acc;
    }, {});
}

function agruparEntradasPorDia() {
    return dadosPeriodo('entradas').reduce((acc, e) => addGroup(acc, getDataKey(e), e.volume || 0), {});
}

function agruparEntradasPorEmpreiteiro() {
    return dadosPeriodo('entradas').reduce((acc, e) => addGroup(acc, e.empreiteiroNome || e.fornecedor, e.volume || 0), {});
}

function agruparSubprodutosPorDia() {
    return dadosPeriodo('subprodutos').reduce((acc, s) => addGroup(acc, getDataKey(s), s.quantidade || 0), {});
}

function agruparSubprodutosPorTipo() {
    return dadosPeriodo('subprodutos').reduce((acc, s) => addGroup(acc, s.tipo, s.quantidade || 0), {});
}

function calcularRendimentoSerraria() {
    const toras = dadosPeriodo('entradas').reduce((acc, e) => acc + (Number(e.volume) || 0), 0);
    const madeira = dadosPeriodo('romaneios').reduce((acc, r) => acc + getVolumeRomaneio(r), 0);
    const subVendido = dadosPeriodo('subprodutos').reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
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
    dadosPeriodo('entradas').forEach(e => addGroup(grupos, `Toras ${getMesKey(e)}`, e.volume || 0));
    dadosPeriodo('romaneios').forEach(r => addGroup(grupos, `Madeira ${getMesKey(r)}`, getVolumeRomaneio(r)));
    dadosPeriodo('subprodutos').forEach(s => addGroup(grupos, `Subprodutos ${getMesKey(s)}`, s.quantidade || 0));
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
    const periodo = getDashboardPeriodoSelecionado();
    const grupos = {};
    obterLancamentosFinanceirosLocal()
        .filter(item => itemDentroPeriodo({ data: item.vencimento }, periodo))
        .forEach(item => addGroup(grupos, getDataKey({ data: item.vencimento }), item.valor || 0));
    dadosPeriodo('entradas').forEach(item => {
        addGroup(grupos, getMesKey({ data: item.data }), Number(item.totalEmpreiteiro || 0) + Number(item.totalDescarga || 0));
    });
    dashboardData.funcionarios.forEach(func => {
        (func.horasExtras || [])
            .filter(he => itemDentroPeriodo({ data: he.data }, periodo))
            .forEach(he => addGroup(grupos, getDataKey({ data: he.data }), calcularValorHoraExtra(func, he)));
    });
    return grupos;
}

function calcularDespesasDetalhadasPeriodo() {
    const periodo = getDashboardPeriodoSelecionado();
    return calcularDespesasDetalhadas(periodo.inicio, periodo.fim);
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
    dadosPeriodo('romaneios').forEach(r => addGroup(grupos, getDataKey(r), r.financeiro?.totalGeral || 0));
    dadosPeriodo('subprodutos').forEach(s => addGroup(grupos, getDataKey(s), s.total || 0));
    const despesas = agruparDespesasPorMes();
    Object.keys(despesas).forEach(dia => {
        grupos[dia] = (grupos[dia] || 0) - despesas[dia];
    });
    return grupos;
}

function renderResumoFinanceiroDashboard() {
    const resumo = getResumoFinanceiroLocal();
    const faturamento = dadosPeriodo('romaneios').reduce((acc, r) => acc + (Number(r.financeiro?.totalGeral) || 0), 0)
        + dadosPeriodo('subprodutos').reduce((acc, s) => acc + (Number(s.total) || 0), 0);
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
    const maior = dadosPeriodo('romaneios').reduce((best, r) => getVolumeRomaneio(r) > best.volume ? { volume: getVolumeRomaneio(r), label: r.numero || r.numeroCarga || '-' } : best, { volume: 0, label: '-' });
    const melhorDia = topEntry(agruparMadeiraPorDia(), formatBRL);
    const tipos = topList(agruparMadeiraPorTipo(), formatM3);
    setResumo(`${maior.label} - ${formatM3(maior.volume)}`, melhorDia, tipos);
}

function renderResumoToras() {
    const maior = dadosPeriodo('entradas').reduce((best, e) => (Number(e.volume) || 0) > best.volume ? { volume: Number(e.volume) || 0, label: e.romaneioNum || '-' } : best, { volume: 0, label: '-' });
    const melhorDia = topEntry(agruparEntradasPorDia(), formatM3);
    const empreiteiros = topList(agruparEntradasPorEmpreiteiro(), formatM3);
    setResumo(`${maior.label} - ${formatM3(maior.volume)}`, melhorDia, empreiteiros);
}

function renderResumoSubprodutos() {
    const maior = dadosPeriodo('subprodutos').reduce((best, s) => (Number(s.quantidade) || 0) > best.volume ? { volume: Number(s.quantidade) || 0, label: s.romaneio || s.romaneioCliente || '-' } : best, { volume: 0, label: '-' });
    const melhorDia = topEntry(agruparSubprodutosPorDia(), formatM3);
    const tipos = topList(agruparSubprodutosPorTipo(), formatM3);
    const mensal = topList(agruparSubprodutosPorMes(), formatM3);
    setResumo(`${maior.label} - ${formatM3(maior.volume)}`, `Mensal: ${mensal}`, tipos);
}

function agruparSubprodutosPorMes() {
    return dadosPeriodo('subprodutos').reduce((acc, s) => addGroup(acc, getMesKey(s), s.quantidade || 0), {});
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
