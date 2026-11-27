// Relatório de custos da frota: quem mais consome insumos (diesel/lubrificante), quem mais tem
// manutenção e quem mais gasta com peças. Lê os dados já carregados pelo módulo de frotas.

const RF = { periodo: '90', setor: 'TODOS', graficos: [] };
const moeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v, d = 0) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CORES = { diesel: '#b45309', posto: '#2563eb', lub: '#7c3aed', pecas: '#dc2626', corretiva: '#dc2626', preventiva: '#16a34a', outra: '#64748b' };

function inicioPeriodo() {
    if (RF.periodo === 'TODOS') return '';
    if (RF.periodo === 'ANO') return `${new Date().getFullYear()}-01-01`;
    return new Date(Date.now() - Number(RF.periodo) * 864e5).toISOString().slice(0, 10);
}
const nomeVeiculo = v => v ? `${v.codigo ? v.codigo + ' · ' : ''}${v.modelo || 'Veículo'}${v.placa ? ` (${v.placa})` : ''}` : 'Veículo excluído';

function calcular() {
    const { frota = [], abastecimentos = [], manutencoes = [] } = window.obterDadosFrotaRelatorio?.() || {};
    const ini = inicioPeriodo();
    const noPeriodo = x => !ini || String(x.data || '').slice(0, 10) >= ini;
    const porId = new Map(frota.map(v => [v.id, v]));
    const doSetor = id => RF.setor === 'TODOS' || (porId.get(id)?.grupo || '') === RF.setor;
    const linhas = new Map();
    const linha = id => {
        if (!linhas.has(id)) linhas.set(id, { id, v: porId.get(id), litrosDiesel: 0, rsDiesel: 0, rsPosto: 0, qtdLub: 0, rsLub: 0, manut: 0, corretivas: 0, preventivas: 0, rsPecas: 0, horas: [] });
        return linhas.get(id);
    };
    const meses = new Map();
    const mes = d => { const k = String(d || '').slice(0, 7) || 'sem data'; if (!meses.has(k)) meses.set(k, { insumos: 0, pecas: 0 }); return meses.get(k); };
    const pecasUsadas = new Map();

    abastecimentos.filter(a => noPeriodo(a) && doSetor(a.veiculoId)).forEach(a => {
        const l = linha(a.veiculoId);
        const total = Number(a.total || 0);
        if (a.tipo === 'LUBRIFICANTE') { l.qtdLub += Number(a.qtd || 0); l.rsLub += total; }
        else if (a.tipo === 'DIESEL_POSTO') { l.litrosDiesel += Number(a.qtd || 0); l.rsPosto += total; }
        else { l.litrosDiesel += Number(a.qtd || 0); l.rsDiesel += total; }
        if (Number(a.horimetro) > 0 && a.tipo !== 'LUBRIFICANTE') l.horas.push(Number(a.horimetro));
        mes(a.data).insumos += total;
    });
    manutencoes.filter(m => noPeriodo(m) && doSetor(m.veiculoId)).forEach(m => {
        const l = linha(m.veiculoId);
        l.manut++;
        if (/PREVENT/i.test(m.tipo || '')) l.preventivas++; else if (/CORRET/i.test(m.tipo || '')) l.corretivas++;
        const tot = Number(m.totalPecas || 0);
        l.rsPecas += tot;
        mes(m.data).pecas += tot;
        (m.pecas || []).forEach(p => {
            const k = String(p.nome || 'PEÇA').toUpperCase();
            const atual = pecasUsadas.get(k) || { nome: k, qtd: 0, total: 0 };
            atual.qtd += Number(p.qtd || 0);
            atual.total += Number(p.subtotal ?? (Number(p.qtd || 0) * Number(p.preco || 0)));
            pecasUsadas.set(k, atual);
        });
    });
    const lista = [...linhas.values()].map(l => {
        const insumos = l.rsDiesel + l.rsPosto + l.rsLub;
        const h = l.horas.length > 1 ? Math.max(...l.horas) - Math.min(...l.horas) : 0;
        return { ...l, insumos, total: insumos + l.rsPecas, horasRodadas: h, litrosPorHora: h > 0 ? l.litrosDiesel / h : 0 };
    }).sort((a, b) => b.total - a.total);
    return { lista, meses: [...meses.entries()].filter(([k]) => k !== 'sem data').sort(([a], [b]) => a.localeCompare(b)), pecas: [...pecasUsadas.values()].sort((a, b) => b.total - a.total) };
}

function destruirGraficos() { RF.graficos.forEach(g => { try { g.destroy(); } catch (_) { /* ok */ } }); RF.graficos = []; }

function grafico(id, config) {
    const el = document.getElementById(id);
    if (!el || typeof window.Chart !== 'function') return;
    const cor = getComputedStyle(document.body).color || '#334155';
    const extraPlugins = config.options?.plugins || {};
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { labels: { color: cor, boxWidth: 12 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${config._fmt ? config._fmt(c.parsed.x ?? c.parsed.y) : moeda(c.parsed.x ?? c.parsed.y)}` } } },
        scales: { x: { stacked: Boolean(config._stack), ticks: { color: cor }, grid: { color: 'rgba(148,163,184,.15)' } }, y: { stacked: Boolean(config._stack), ticks: { color: cor }, grid: { color: 'rgba(148,163,184,.15)' } } } }, config.options || {});
    config.options.plugins = Object.assign({ legend: { labels: { color: cor, boxWidth: 12 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${config._fmt ? config._fmt(c.parsed.x ?? c.parsed.y) : moeda(c.parsed.x ?? c.parsed.y)}` } } }, extraPlugins);
    if (config.options.indexAxis === 'y') {
        // nomes longos de veículo: corta no celular para o gráfico caber
        const max = window.innerWidth < 600 ? 14 : 34;
        const labels = config.data.labels;
        config.options.scales.y.ticks.callback = (v, i) => { const t = String(labels[i] ?? ''); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
        config.options.plugins.tooltip.callbacks.title = items => labels[items[0]?.dataIndex] ?? '';
    }
    RF.graficos.push(new window.Chart(el, config));
}

window.renderRelatorioFrota = function() {
    const painel = document.getElementById('panelRelatorioFrota');
    if (!painel) return;
    destruirGraficos();
    const { lista, meses, pecas } = calcular();
    const soma = k => lista.reduce((t, l) => t + Number(l[k] || 0), 0);
    const top = lista.slice(0, 10);
    const rot = top.map(l => nomeVeiculo(l.v));
    const maiorInsumo = [...lista].sort((a, b) => b.insumos - a.insumos)[0];
    const maisManut = [...lista].sort((a, b) => b.manut - a.manut)[0];
    const maisPecas = [...lista].sort((a, b) => b.rsPecas - a.rsPecas)[0];
    const altura = Math.max(220, top.length * 34 + 60);
    const botoesPeriodo = [['30', '30 dias'], ['90', '90 dias'], ['ANO', 'Este ano'], ['TODOS', 'Tudo']]
        .map(([v, t]) => `<button type="button" class="frel-chip${RF.periodo === v ? ' ativo' : ''}" aria-pressed="${RF.periodo === v}" onclick="window.frelPeriodo('${v}')">${t}</button>`).join('');

    painel.innerHTML = `
    <div class="frel-barra hide-on-print">
        <div class="frel-chips" role="group" aria-label="Período">${botoesPeriodo}</div>
        <label class="frel-setor">Setor
            <select onchange="window.frelSetor(this.value)">
                ${['TODOS', 'SERRARIA', 'FLORESTAL', 'TERRAPLANAGEM'].map(s => `<option value="${s}"${RF.setor === s ? ' selected' : ''}>${s === 'TODOS' ? 'Todos' : s.charAt(0) + s.slice(1).toLowerCase()}</option>`).join('')}
            </select>
        </label>
        <button type="button" class="btn-secondary" onclick="window.imprimirRelatorioFrota()"><i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir / PDF</button>
    </div>
    ${!lista.length ? '<div class="glass-panel frel-vazio">Nenhum abastecimento ou manutenção lançado neste período.</div>' : `
    <div class="frel-kpis">
        <div class="glass-panel frel-kpi"><span>Custo total da frota</span><strong>${moeda(soma('total'))}</strong><small>insumos + peças</small></div>
        <div class="glass-panel frel-kpi"><span>Insumos (diesel + lubrificante)</span><strong>${moeda(soma('insumos'))}</strong><small>${num(soma('litrosDiesel'))} L de diesel</small></div>
        <div class="glass-panel frel-kpi"><span>Peças em manutenções</span><strong>${moeda(soma('rsPecas'))}</strong><small>${num(soma('manut'))} manutenção(ões)</small></div>
        <div class="glass-panel frel-kpi"><span>Destaques</span>
            <small>Mais insumo: <b>${esc(nomeVeiculo(maiorInsumo?.v))}</b></small>
            <small>Mais manutenção: <b>${maisManut?.manut ? esc(nomeVeiculo(maisManut.v)) : '—'}</b></small>
            <small>Mais peças: <b>${maisPecas?.rsPecas ? esc(nomeVeiculo(maisPecas.v)) : '—'}</b></small>
        </div>
    </div>
    <div class="frel-grid">
        <div class="glass-panel frel-card"><h3>Consumo de insumos por veículo (R$)</h3><div style="height:${altura}px"><canvas id="frelInsumos" role="img" aria-label="Gasto com insumos por veículo"></canvas></div></div>
        <div class="glass-panel frel-card"><h3>Gasto com peças por veículo (R$)</h3><div style="height:${altura}px"><canvas id="frelPecas" role="img" aria-label="Gasto com peças por veículo"></canvas></div></div>
        <div class="glass-panel frel-card"><h3>Quantidade de manutenções por veículo</h3><div style="height:${altura}px"><canvas id="frelManut" role="img" aria-label="Manutenções por veículo"></canvas></div></div>
        <div class="glass-panel frel-card"><h3>Custo por mês</h3><div style="height:${altura}px"><canvas id="frelMeses" role="img" aria-label="Custo da frota por mês"></canvas></div></div>
    </div>
    <div class="glass-panel frel-card">
        <h3>Ranking da frota</h3>
        <div class="frel-tabela-wrap"><table class="frel-tabela" data-no-column-resize="true">
            <thead><tr><th>#</th><th>Veículo</th><th>Setor</th><th>Diesel (L)</th><th>L/hora</th><th>Insumos</th><th>Manut.</th><th>Peças</th><th>Custo total</th></tr></thead>
            <tbody>${lista.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(nomeVeiculo(l.v))}</td><td>${esc(l.v?.grupo || '-')}</td><td>${num(l.litrosDiesel)}</td><td>${l.litrosPorHora ? num(l.litrosPorHora, 1) : '—'}</td><td>${moeda(l.insumos)}</td><td>${l.manut}${l.corretivas ? ` <small>(${l.corretivas} corr.)</small>` : ''}</td><td>${moeda(l.rsPecas)}</td><td><b>${moeda(l.total)}</b></td></tr>`).join('')}</tbody>
        </table></div>
        <p class="frel-nota">L/hora = litros de diesel ÷ horas rodadas pelo horímetro/KM informado nos abastecimentos do período.</p>
    </div>
    ${pecas.length ? `<div class="glass-panel frel-card"><h3>Peças que mais pesaram</h3><div class="frel-tabela-wrap"><table class="frel-tabela" data-no-column-resize="true">
        <thead><tr><th>Peça</th><th>Quantidade</th><th>Total</th></tr></thead>
        <tbody>${pecas.slice(0, 15).map(p => `<tr><td>${esc(p.nome)}</td><td>${num(p.qtd)}</td><td>${moeda(p.total)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`}`;

    if (!lista.length) return;
    const barraH = (id, datasets, extra = {}) => grafico(id, { type: 'bar', data: { labels: rot, datasets }, options: { indexAxis: 'y' }, ...extra });
    barraH('frelInsumos', [
        { label: 'Diesel (tanque)', data: top.map(l => l.rsDiesel), backgroundColor: CORES.diesel },
        { label: 'Diesel (posto)', data: top.map(l => l.rsPosto), backgroundColor: CORES.posto },
        { label: 'Lubrificante', data: top.map(l => l.rsLub), backgroundColor: CORES.lub }
    ], { _stack: true });
    const topPecas = [...lista].sort((a, b) => b.rsPecas - a.rsPecas).slice(0, 10);
    grafico('frelPecas', { type: 'bar', data: { labels: topPecas.map(l => nomeVeiculo(l.v)), datasets: [{ label: 'Peças', data: topPecas.map(l => l.rsPecas), backgroundColor: CORES.pecas }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
    const topManut = [...lista].sort((a, b) => b.manut - a.manut).slice(0, 10);
    grafico('frelManut', { type: 'bar', _stack: true, _fmt: v => `${v}`, data: { labels: topManut.map(l => nomeVeiculo(l.v)), datasets: [
        { label: 'Corretiva', data: topManut.map(l => l.corretivas), backgroundColor: CORES.corretiva },
        { label: 'Preventiva', data: topManut.map(l => l.preventivas), backgroundColor: CORES.preventiva },
        { label: 'Outras', data: topManut.map(l => l.manut - l.corretivas - l.preventivas), backgroundColor: CORES.outra }
    ] }, options: { indexAxis: 'y' } });
    const rotMes = meses.map(([k]) => { const [a, m] = k.split('-'); return `${m}/${a.slice(2)}`; });
    grafico('frelMeses', { type: 'bar', _stack: true, data: { labels: rotMes, datasets: [
        { label: 'Insumos', data: meses.map(([, v]) => v.insumos), backgroundColor: CORES.diesel },
        { label: 'Peças', data: meses.map(([, v]) => v.pecas), backgroundColor: CORES.pecas }
    ] } });
};

window.frelPeriodo = v => { RF.periodo = v; window.renderRelatorioFrota(); };
window.frelSetor = v => { RF.setor = v; window.renderRelatorioFrota(); };

window.imprimirRelatorioFrota = function() {
    const painel = document.getElementById('panelRelatorioFrota');
    if (!painel) return;
    const imgs = [...painel.querySelectorAll('canvas')].map(c => ({ t: c.closest('.frel-card')?.querySelector('h3')?.textContent || '', src: c.toDataURL('image/png') }));
    const tabelas = [...painel.querySelectorAll('.frel-card')].filter(c => c.querySelector('table')).map(c => c.innerHTML).join('');
    const kpis = painel.querySelector('.frel-kpis')?.innerText.replace(/\n+/g, ' · ') || '';
    const w = window.open('', '_blank');
    if (!w) { alert('O navegador bloqueou a janela. Libere pop-ups para imprimir.'); return; }
    const periodo = { '30': 'Últimos 30 dias', '90': 'Últimos 90 dias', ANO: 'Este ano', TODOS: 'Todo o período' }[RF.periodo];
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de custos da frota</title>
<style>body{font:12px Arial,sans-serif;color:#111;margin:20px}h1{font-size:18px;margin:0}h3{font-size:13px;margin:14px 0 6px}table{width:100%;border-collapse:collapse;margin-bottom:8px}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#eee}img{max-width:100%;max-height:330px;display:block;margin:0 auto}.g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.g div{break-inside:avoid}p{margin:4px 0}small{color:#444}@media print{button{display:none}}</style></head><body>
<h1>Relatório de custos da frota</h1><p>${esc(periodo)} · Setor: ${esc(RF.setor === 'TODOS' ? 'todos' : RF.setor)} · Emitido em ${new Date().toLocaleString('pt-BR')}</p><p><small>${esc(kpis)}</small></p>
<div class="g">${imgs.map(i => `<div><h3>${esc(i.t)}</h3><img src="${i.src}" alt=""></div>`).join('')}</div>${tabelas}
<p><button onclick="window.print()">Imprimir / salvar PDF</button></p></body></html>`);
    w.document.close();
    setTimeout(() => { try { w.print(); } catch (_) { /* usa o botão */ } }, 400);
};
