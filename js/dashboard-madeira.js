import { auth } from './firebase-init.js';
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
let ultimoResumoFrete = [];
const CACHE_DIST = 'orquestra_dist_clientes_v1';
const lerCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_DIST) || '{}'); } catch (_) { return {}; } };
const gravarCache = c => { try { localStorage.setItem(CACHE_DIST, JSON.stringify(c)); } catch (_) { /* sem armazenamento */ } };
let clientesCad = null;

async function cadastroClientes() {
    if (clientesCad) return clientesCad;
    try { clientesCad = await window.FS.getCollection('clientes'); } catch (_) { clientesCad = []; }
    return clientesCad;
}
function cidadeDoCliente(c, cad) {
    const x = (c.clienteId && cad.find(k => k.id === c.clienteId)) || cad.find(k => norm(k.nome) === norm(c.nome));
    return String(x?.cidade || '').trim();
}

function htmlFrete() {
    const cache = lerCache();
    const lista = ultimoResumoFrete.filter(c => c.freteMedio > 0 || cache[norm(c.nome)]);
    if (!lista.length) return '<p class="dm-vazio">Sem frete lançado nos romaneios do período.</p>';
    const linhas = lista.map(c => {
        const d = cache[norm(c.nome)];
        const km = d?.km || null;
        const por100 = km && c.freteMedio ? c.freteMedio / km * 100 : null;
        return { c, km, por100, cidade: d?.cidade || '' };
    }).sort((a, b) => (b.por100 ?? -1) - (a.por100 ?? -1));
    const validos = linhas.filter(l => l.por100 != null);
    const media = validos.length ? validos.reduce((s, l) => s + l.por100, 0) / validos.length : null;
    return `<div class="dm-tabela-wrap"><table class="dm-tabela" data-no-column-resize="true">
      <thead><tr><th>Cliente</th><th>Frete R$/m³</th><th>Distância</th><th>R$/m³ a cada 100 km</th></tr></thead>
      <tbody>${linhas.map(l => `<tr><td><b>${esc(l.c.nome)}</b>${l.cidade ? `<small>${esc(l.cidade)}</small>` : ''}</td>
        <td class="num">${l.c.freteMedio ? fmtR(l.c.freteMedio) : '—'}</td>
        <td class="num">${l.km ? `${fmtN(l.km, 0)} km` : '<span class="dm-sem">—</span>'}</td>
        <td class="num">${l.por100 != null ? `${fmtR(l.por100)}${media ? `<span class="dm-dif ${l.por100 > media * 1.05 ? 'acima' : l.por100 < media * 0.95 ? 'abaixo' : ''}">${l.por100 >= media ? '+' : ''}${fmtN((l.por100 / media - 1) * 100, 0)}%</span>` : ''}` : '<span class="dm-sem">—</span>'}</td></tr>`).join('')}</tbody>
    </table></div>${media ? `<p class="dm-dica">Verde: cobra mais frete por km que a média; vermelho: cobra menos.</p>` : ''}`;
}

async function apiProspeccao(corpo) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sessão expirada. Entre novamente.');
    const r = await fetch('/api/prospeccao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...corpo, idToken: token }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Não foi possível consultar agora.');
    return d;
}

// Distância de estrada de cada cliente até a serraria. Fica guardada neste navegador
// para não consultar o Google toda vez (só consulta quem ainda não tem distância).
window.calcularDistanciasClientesMadeira = async function() {
    const box = document.getElementById('dmFreteDistancia');
    const aviso = t => { if (box) box.insertAdjacentHTML('afterbegin', `<p class="dm-aviso">${esc(t)}</p>`); };
    let origem = null;
    try { origem = (await window.FS.getDoc('prospeccao', '_config'))?.origem; } catch (_) { /* sem acesso */ }
    if (!origem || origem.lat == null) { aviso('Defina a localização da serraria em Clientes → Radar de Clientes → Central de leads.'); return; }
    const cad = await cadastroClientes();
    const cache = lerCache();
    const faltam = ultimoResumoFrete.filter(c => !cache[norm(c.nome)]);
    if (!faltam.length) { if (box) box.innerHTML = htmlFrete(); return; }
    if (box) box.innerHTML = `<p class="dm-vazio">Calculando ${faltam.length} distância(s)…</p>`;
    let semCidade = 0, erro = 0;
    for (const c of faltam) {
        const cidade = cidadeDoCliente(c, cad);
        if (!cidade) { semCidade++; continue; }
        try {
            const { local } = await apiProspeccao({ modo: 'local', cidade });
            const { rota } = await apiProspeccao({ modo: 'rota', origem, destino: { lat: local.lat, lng: local.lng } });
            if (rota?.km) cache[norm(c.nome)] = { km: rota.km, cidade, em: new Date().toISOString() };
            else erro++;
        } catch (_) { erro++; }
    }
    gravarCache(cache);
    if (box) box.innerHTML = htmlFrete();
    if (semCidade || erro) aviso(`${semCidade ? `${semCidade} cliente(s) sem cidade no cadastro. ` : ''}${erro ? `${erro} não encontrado(s).` : ''}`);
};

function dataRomaneio(r) {
    const s = r.logistica?.dataCarregamento || r.logistica?.dataDescarregamento || r.dataCriacao || r.data || '';
    const d = new Date(String(s).length === 10 ? `${s}T12:00:00` : s);
    return Number.isNaN(d.getTime()) ? null : d;
}
function medida(p) {
    const q = String(p.qualidade || '').toUpperCase();
    return `${q ? q + ' · ' : ''}${fmtN(p.esp, 1)} × ${fmtN(p.larg, 1)} × ${fmtN(p.compV || p.compR, 2)}`;
}
function classeDe(q) {
    const t = String(q || '').toUpperCase();
    if (t.includes('1')) return 1;
    if (t.includes('2')) return 2;
    if (t.includes('3')) return 3;
    return 0;
}
const BASE_NF = { INTEIRA: 1, MEIA: 0.5, TERCO: 1 / 3, QUARTO: 0.25 };

// Resumo por cliente: preço médio de 1ª e 2ª (comparado à média da mesma cubagem),
// % da nota e preço final por m³ (madeira + ajuste + imposto da nota) e frete cobrado.
function resumoClientes(romaneios, mediaMedida) {
    const mapa = new Map();
    (romaneios || []).forEach(r => {
        if (String(r.status || '').toLowerCase() === 'cancelado') return;
        const pacotes = (Array.isArray(r.pacotes) ? r.pacotes : []).filter(p => Number(p.m3VendaTotal || p.m3VendaExato || 0) > 0);
        if (!pacotes.length) return;
        const nome = String(r.cliente || 'Sem cliente').trim();
        const ck = norm(nome);
        const c = mapa.get(ck) || { nome, clienteId: r.clienteId || '', cargas: 0, m3: 0, madeira: 0, final: 0, classes: {}, taxaPond: 0, baseTxt: new Set(), freteM3: 0, freteValor: 0, freteM3Base: 0 };
        if (!c.clienteId && r.clienteId) c.clienteId = r.clienteId;
        let m3R = 0, madeiraR = 0;
        pacotes.forEach(p => {
            const m3 = Number(p.m3VendaTotal || p.m3VendaExato || 0);
            const preco = Number(p.precoM3 || 0);
            m3R += m3; madeiraR += m3 * preco;
            const k = classeDe(p.qualidade);
            const ref = mediaMedida.get(medida(p));
            const cl = c.classes[k] || { m3: 0, valor: 0, ref: 0 };
            if (preco > 0) { cl.m3 += m3; cl.valor += m3 * preco; if (ref > 0) cl.ref += m3 * ref; }
            c.classes[k] = cl;
        });
        const adic = Number(r.financeiro?.adicionalMadeira || 0);
        const taxa = Number(r.financeiro?.taxaNF || 0);
        const base = String(r.financeiro?.baseNF || 'INTEIRA').toUpperCase();
        const imposto = (madeiraR + adic) * (BASE_NF[base] ?? 1) * taxa / 100;
        c.cargas++; c.m3 += m3R; c.madeira += madeiraR;
        c.final += madeiraR + adic + imposto;
        c.taxaPond += taxa * m3R;
        if (taxa > 0) c.baseTxt.add(base);
        const fr = Number(r.logistica?.valorFrete || 0);
        if (fr > 0) { c.freteM3 += fr * m3R; c.freteM3Base += m3R; c.freteValor += fr * m3R + Number(r.logistica?.adicionalFrete || 0); }
        mapa.set(ck, c);
    });
    return [...mapa.values()].map(c => ({
        ...c,
        taxa: c.m3 ? c.taxaPond / c.m3 : 0,
        finalM3: c.m3 ? c.final / c.m3 : 0,
        freteMedio: c.freteM3Base ? c.freteM3 / c.freteM3Base : 0,
        classe: k => { const x = c.classes[k]; return x && x.m3 ? { preco: x.valor / x.m3, dif: x.ref ? (x.valor / x.ref - 1) * 100 : null, m3: x.m3 } : null; }
    }));
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
            lista.push({ d, cliente, ck: norm(cliente), medida: medida(p), classe: classeDe(p.qualidade), m3, preco: Number(p.precoM3 || 0) });
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
    const mediaMedida = new Map(medidas.map(m => [m.medida, m.media]));
    const resumo = resumoClientes(romaneiosPeriodo, mediaMedida).sort((a, b) => b.m3 - a.m3);
    const mediaFinal = resumo.reduce((s, c) => s + c.final, 0) / (resumo.reduce((s, c) => s + c.m3, 0) || 1);
    const dif = v => v == null ? '' : `<span class="dm-dif ${v > 1 ? 'acima' : v < -1 ? 'abaixo' : ''}">${v > 0 ? '+' : ''}${fmtN(v, 1)}%</span>`;
    const celClasse = (c, k) => { const x = c.classe(k); return x ? `<td class="num">${fmtR(x.preco)}${dif(x.dif)}</td>` : '<td class="num dm-sem">—</td>'; };
    const nomeBase = { INTEIRA: 'inteira', MEIA: 'meia', TERCO: '1/3', QUARTO: '1/4' };
    const tabelaClientes = resumo.length ? `<div class="dm-tabela-wrap"><table class="dm-tabela" data-no-column-resize="true">
        <thead><tr><th>Cliente</th><th>m³</th><th>1ª R$/m³</th><th>2ª R$/m³</th><th>Nota</th><th>Preço final/m³</th><th>Frete R$/m³</th></tr></thead>
        <tbody>${resumo.map(c => `<tr>
          <td><b>${esc(c.nome)}</b><small>${c.cargas} carga(s)</small></td>
          <td class="num">${fmtN(c.m3, 3)}</td>
          ${celClasse(c, 1)}${celClasse(c, 2)}
          <td class="num">${c.taxa > 0 ? `${fmtN(c.taxa, 1)}%<small>${[...c.baseTxt].map(b => nomeBase[b] || b.toLowerCase()).join(', ')}</small>` : '<span class="dm-sem">sem nota</span>'}</td>
          <td class="num"><b>${fmtR(c.finalM3)}</b>${dif((c.finalM3 / mediaFinal - 1) * 100)}</td>
          <td class="num">${c.freteMedio ? fmtR(c.freteMedio) : '<span class="dm-sem">—</span>'}</td>
        </tr>`).join('')}</tbody></table></div>
        <p class="dm-dica">% ao lado do preço da 1ª e 2ª: comparação com a média da mesma cubagem no período. "Preço final" = madeira + ajustes + imposto da nota, dividido pelo m³; o % compara com a média de todos os clientes.</p>` : '<p class="dm-vazio">Sem preços lançados nos pacotes.</p>';
    ultimoResumoFrete = resumo;

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
          <h4>Frete x distância</h4>
          <p class="dm-dica">Frete cobrado por m³ de cada cliente e a distância de estrada até a serraria (cidade do cadastro do cliente).</p>
          <div id="dmFreteDistancia">${htmlFrete()}</div>
          <button type="button" class="btn-primary dm-btn" onclick="window.calcularDistanciasClientesMadeira()"><i class="fa-solid fa-route" aria-hidden="true"></i> Calcular distâncias</button>
        </div>
      </div>
      <div class="dm-bloco dm-curva">
        <h4>Preço por cliente: 1ª, 2ª, nota e preço final</h4>
        ${tabelaClientes}
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
