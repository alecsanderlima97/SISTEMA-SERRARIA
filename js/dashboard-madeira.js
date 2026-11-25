// Painel "Análise da madeira serrada" no Início (aba Madeira).
// Mostra: cubagens que mais saíram (e para quem), preço médio por cliente comparado à média
// da mesma medida, e a curva de preço por m³ das medidas mais vendidas (últimos 12 meses).
// Só lê os romaneios que o dashboard já carregou.

const fmtR = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtN = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const CORES = ['#0f766e', '#b45309', '#1d4ed8', '#be123c', '#6d28d9'];
let grafico = null;

function dataRomaneio(r) {
    const s = r.logistica?.dataCarregamento || r.logistica?.dataDescarregamento || r.dataCriacao || r.data || '';
    const d = new Date(String(s).length === 10 ? `${s}T12:00:00` : s);
    return Number.isNaN(d.getTime()) ? null : d;
}
function medida(p) {
    const q = String(p.qualidade || '').toUpperCase();
    return `${q ? q + ' · ' : ''}${fmtN(p.esp, 1)} × ${fmtN(p.larg, 1)} × ${fmtN(p.compV || p.compR, 2)}`;
}
function vendas(romaneios) {
    const lista = [];
    (romaneios || []).forEach(r => {
        if (String(r.status || '').toLowerCase() === 'cancelado') return;
        const d = dataRomaneio(r);
        const cliente = String(r.cliente || 'Sem cliente').trim();
        (Array.isArray(r.pacotes) ? r.pacotes : []).forEach(p => {
            const m3 = Number(p.m3VendaTotal || p.m3VendaExato || 0);
            if (!(m3 > 0)) return;
            lista.push({ d, cliente, ck: norm(cliente), medida: medida(p), m3, preco: Number(p.precoM3 || 0) });
        });
    });
    return lista;
}

function analisar(doPeriodo) {
    const porMedida = new Map();
    doPeriodo.forEach(v => {
        if (!porMedida.has(v.medida)) porMedida.set(v.medida, { medida: v.medida, m3: 0, valor: 0, m3Preco: 0, clientes: new Map() });
        const x = porMedida.get(v.medida);
        x.m3 += v.m3;
        if (v.preco > 0) { x.valor += v.m3 * v.preco; x.m3Preco += v.m3; }
        const c = x.clientes.get(v.ck) || { nome: v.cliente, m3: 0, valor: 0, m3Preco: 0 };
        c.m3 += v.m3;
        if (v.preco > 0) { c.valor += v.m3 * v.preco; c.m3Preco += v.m3; }
        x.clientes.set(v.ck, c);
    });
    const medidas = [...porMedida.values()].map(x => ({
        ...x,
        media: x.m3Preco ? x.valor / x.m3Preco : 0,
        topCliente: [...x.clientes.values()].sort((a, b) => b.m3 - a.m3)[0]
    })).sort((a, b) => b.m3 - a.m3);

    // Cliente x média da mesma medida (ponderado pelo volume): mostra quem paga melhor.
    const mediaMedida = new Map(medidas.map(m => [m.medida, m.media]));
    const porCliente = new Map();
    doPeriodo.forEach(v => {
        const ref = mediaMedida.get(v.medida);
        if (!(v.preco > 0) || !(ref > 0)) return;
        const c = porCliente.get(v.ck) || { nome: v.cliente, m3: 0, valor: 0, ref: 0 };
        c.m3 += v.m3; c.valor += v.m3 * v.preco; c.ref += v.m3 * ref;
        porCliente.set(v.ck, c);
    });
    const clientes = [...porCliente.values()]
        .map(c => ({ ...c, preco: c.valor / c.m3, dif: (c.valor / c.ref - 1) * 100 }))
        .sort((a, b) => b.dif - a.dif);
    return { medidas, clientes };
}

function curva(todas, medidasTop) {
    const hoje = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const series = medidasTop.map((m, i) => {
        const acc = new Map();
        todas.filter(v => v.medida === m && v.preco > 0 && v.d).forEach(v => {
            const k = `${v.d.getFullYear()}-${String(v.d.getMonth() + 1).padStart(2, '0')}`;
            const a = acc.get(k) || { v: 0, m3: 0 };
            a.v += v.m3 * v.preco; a.m3 += v.m3;
            acc.set(k, a);
        });
        return { label: m, cor: CORES[i % CORES.length], dados: meses.map(k => (acc.get(k) ? +(acc.get(k).v / acc.get(k).m3).toFixed(2) : null)) };
    });
    return { labels: meses.map(k => { const [a, mm] = k.split('-'); return `${MESES[Number(mm) - 1]}/${a.slice(2)}`; }), series };
}

function garantirPainel() {
    let el = document.getElementById('dashboardAnaliseMadeira');
    if (el) return el;
    const ref = document.getElementById('dashboardResumoAnalitico');
    if (!ref) return null;
    el = document.createElement('section');
    el.id = 'dashboardAnaliseMadeira';
    el.className = 'glass-panel dash-madeira';
    el.setAttribute('aria-label', 'Análise da madeira serrada');
    ref.insertAdjacentElement('afterend', el);
    return el;
}

window.renderAnaliseMadeiraDashboard = function(romaneiosPeriodo, romaneiosTodos, periodoLabel = '') {
    const el = garantirPainel();
    if (!el) return;
    if (!romaneiosPeriodo) { el.hidden = true; return; }
    el.hidden = false;
    const doPeriodo = vendas(romaneiosPeriodo);
    const { medidas, clientes } = analisar(doPeriodo);
    const totalM3 = medidas.reduce((s, m) => s + m.m3, 0);
    const top = medidas.slice(0, 8);
    const maxM3 = top[0]?.m3 || 1;
    const melhores = clientes.slice(0, 6);
    const piores = clientes.length > 6 ? clientes.slice(-4).reverse() : [];
    const linhaCliente = c => `<li><span class="dm-nome">${esc(c.nome)}</span><span class="dm-num">${fmtR(c.preco)}/m³</span><span class="dm-dif ${c.dif > 1 ? 'acima' : c.dif < -1 ? 'abaixo' : ''}">${c.dif > 0 ? '+' : ''}${fmtN(c.dif, 1)}%</span></li>`;

    el.innerHTML = `
      <header class="dm-topo">
        <h3><i class="fa-solid fa-chart-column" aria-hidden="true"></i> Análise da madeira serrada</h3>
        <small>${esc(periodoLabel)}${totalM3 ? ` · ${fmtN(totalM3, 3)} m³ vendidos` : ''}</small>
      </header>
      ${!medidas.length ? '<p class="dm-vazio">Nenhuma venda de madeira com pacotes no período.</p>' : `
      <div class="dm-grid">
        <div class="dm-bloco">
          <h4>Cubagens que mais saíram</h4>
          <ol class="dm-barras">${top.map(m => `<li>
            <div class="dm-linha"><b>${esc(m.medida)}</b><span>${fmtN(m.m3, 3)} m³ · ${fmtN(m.m3 / totalM3 * 100, 0)}%</span></div>
            <div class="dm-barra"><i style="width:${Math.max(3, m.m3 / maxM3 * 100).toFixed(1)}%"></i></div>
            <small>Mais para <b>${esc(m.topCliente?.nome || '-')}</b> (${fmtN(m.topCliente?.m3, 3)} m³)${m.media ? ` · média ${fmtR(m.media)}/m³` : ''}</small>
          </li>`).join('')}</ol>
        </div>
        <div class="dm-bloco">
          <h4>Preço por cliente x média</h4>
          <p class="dm-dica">Compara o que cada cliente pagou com a média da mesma cubagem no período.</p>
          ${clientes.length ? `<ul class="dm-clientes">${melhores.map(linhaCliente).join('')}</ul>
          ${piores.length ? `<h5>Pagando menos</h5><ul class="dm-clientes">${piores.map(linhaCliente).join('')}</ul>` : ''}` : '<p class="dm-vazio">Sem preços lançados nos pacotes.</p>'}
        </div>
      </div>
      <div class="dm-bloco dm-curva">
        <h4>Curva de preço por m³ · últimos 12 meses</h4>
        <div class="dm-canvas"><canvas id="dashMadeiraCurva" aria-label="Curva de preço por m³ das cubagens mais vendidas"></canvas></div>
      </div>`}`;

    if (!medidas.length || typeof window.Chart === 'undefined') return;
    const todas = vendas(romaneiosTodos);
    const c = curva(todas, top.slice(0, 4).map(m => m.medida));
    if (grafico) { grafico.destroy(); grafico = null; }
    grafico = new window.Chart(document.getElementById('dashMadeiraCurva').getContext('2d'), {
        type: 'line',
        data: { labels: c.labels, datasets: c.series.map(s => ({ label: s.label, data: s.dados, borderColor: s.cor, backgroundColor: s.cor, tension: .3, spanGaps: true, pointRadius: 3, borderWidth: 2 })) },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, color: '#334155' } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y == null ? '—' : fmtR(ctx.parsed.y)}` } } },
            scales: { y: { ticks: { callback: v => fmtR(v), color: '#475569' }, grid: { color: 'rgba(148,163,184,.25)' } }, x: { ticks: { color: '#475569' }, grid: { display: false } } }
        }
    });
};
