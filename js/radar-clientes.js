// Radar de Clientes: quem esta comprando, quem e hora de ligar, quem sumiu,
// e comparativo de precos por medida (o preco esta mudando muito).
// So le dados (romaneios, clientes e contas a receber). Nao grava nada.

const fmtR = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtN = (v, d = 3) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const DIA = 86400000;

let radar = { dados: null, aba: 'clientes', periodo: 365, busca: '' };

function dataRomaneio(r) {
    const s = r.logistica?.dataCarregamento || r.logistica?.dataDescarregamento || r.dataCriacao || r.data || '';
    const d = new Date(String(s).length === 10 ? `${s}T12:00:00` : s);
    return Number.isNaN(d.getTime()) ? null : d;
}
function medidaChave(p) {
    const q = String(p.qualidade || '').toUpperCase() || '-';
    return `${q} · ${fmtN(p.esp, 1)} × ${fmtN(p.larg, 1)} × ${fmtN(p.compV || p.compR, 2)}`;
}
function mesChave(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function nomeMes(k) { const [a, m] = k.split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}/${a.slice(2)}`; }

async function carregar() {
    const FS = window.FS;
    const [romaneios, clientes] = await Promise.all([
        FS.getCollection('romaneios'),
        FS.getCollection('clientes').catch(() => [])
    ]);
    const contas = await FS.getCollection('contas_receber').catch(() => null); // pode nao ter permissao
    return { romaneios, clientes, contas };
}

function montar(dados, periodoDias) {
    const hoje = new Date();
    const desde = new Date(hoje.getTime() - periodoDias * DIA);
    const cadastro = new Map();
    dados.clientes.forEach(c => { cadastro.set(c.id, c); cadastro.set('N:' + norm(c.nome), c); });
    const chaveCliente = r => (r.clienteId ? r.clienteId : 'N:' + norm(r.cliente));

    const vendas = [];   // uma linha por pacote vendido
    const cargas = [];   // uma linha por romaneio
    dados.romaneios.forEach(r => {
        if (String(r.status || '').toLowerCase() === 'cancelado') return;
        const d = dataRomaneio(r);
        if (!d) return;
        const ck = chaveCliente(r);
        const cad = cadastro.get(ck) || cadastro.get('N:' + norm(r.cliente));
        const nome = cad?.nome || r.cliente || 'Sem nome';
        const pacotes = Array.isArray(r.pacotes) ? r.pacotes : [];
        let m3 = 0;
        pacotes.forEach(p => {
            const vol = Number(p.m3VendaTotal || p.m3VendaExato || 0);
            const preco = Number(p.precoM3 || 0);
            m3 += vol;
            if (vol > 0 && preco > 0) vendas.push({ d, ck, nome, medida: medidaChave(p), m3: vol, preco, valor: vol * preco });
        });
        cargas.push({ d, ck, nome, cad, m3, valor: Number(r.financeiro?.totalGeral || 0), numero: r.numero });
    });

    // ---- clientes ----
    const porCliente = new Map();
    cargas.forEach(c => {
        if (!porCliente.has(c.ck)) porCliente.set(c.ck, { ck: c.ck, nome: c.nome, cad: c.cad, datas: [], m3: 0, valor: 0, cargas: 0, medidas: new Map() });
        const x = porCliente.get(c.ck);
        x.datas.push(c.d.getTime());
        if (c.d >= desde) { x.m3 += c.m3; x.valor += c.valor; x.cargas++; }
    });
    vendas.forEach(v => {
        const x = porCliente.get(v.ck);
        if (!x) return;
        if (v.d >= desde) x.medidas.set(v.medida, (x.medidas.get(v.medida) || 0) + v.m3);
        if (!x.ultPreco || v.d > x.ultPreco.d) x.ultPreco = v;
    });
    // em aberto (contas a receber)
    const aberto = new Map();
    (dados.contas || []).forEach(c => {
        if (c.pago) return;
        const k = c.clienteId || 'N:' + norm(c.cliente);
        const a = aberto.get(k) || { valor: 0, vencido: 0 };
        a.valor += Number(c.valor || 0);
        if (c.vencimento && new Date(`${c.vencimento}T23:59:59`) < hoje) a.vencido += Number(c.valor || 0);
        aberto.set(k, a);
    });

    // preco medio atual (ultimos 30 dias, ou o ultimo mes com venda) por medida
    const precoAtual = new Map();
    const ult30 = new Date(hoje.getTime() - 30 * DIA);
    const acc = new Map();
    vendas.forEach(v => {
        const a = acc.get(v.medida) || { v30: 0, m30: 0, ult: null };
        if (v.d >= ult30) { a.v30 += v.valor; a.m30 += v.m3; }
        if (!a.ult || v.d > a.ult.d) a.ult = v;
        acc.set(v.medida, a);
    });
    acc.forEach((a, k) => precoAtual.set(k, a.m30 > 0 ? a.v30 / a.m30 : a.ult.preco));

    const clientes = [...porCliente.values()].map(x => {
        const ds = [...new Set(x.datas.map(t => Math.floor(t / DIA)))].sort((a, b) => a - b);
        const ultima = ds[ds.length - 1] * DIA;
        const diasSem = Math.floor((hoje.getTime() - ultima) / DIA);
        let intervalo = null;
        if (ds.length >= 2) intervalo = Math.round((ds[ds.length - 1] - ds[0]) / (ds.length - 1));
        let status = 'ativo';
        if (intervalo) {
            if (diasSem > Math.max(intervalo * 2, 60)) status = 'sumido';
            else if (diasSem >= intervalo * 0.9) status = 'ligar';
        } else if (diasSem > 90) status = 'sumido';
        else if (diasSem > 45) status = 'ligar';
        const medidaTop = [...x.medidas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        let difPreco = null;
        if (x.ultPreco) {
            const ref = precoAtual.get(x.ultPreco.medida);
            if (ref) difPreco = (x.ultPreco.preco - ref) / ref * 100;
        }
        const ab = aberto.get(x.ck) || aberto.get('N:' + norm(x.nome)) || null;
        return { ...x, ultima, diasSem, intervalo, status, medidaTop, difPreco, aberto: ab, totalCompras: ds.length };
    });
    const ordem = { ligar: 0, sumido: 1, ativo: 2 };
    clientes.sort((a, b) => ordem[a.status] - ordem[b.status] || b.valor - a.valor || a.diasSem - b.diasSem);

    // ---- precos por medida, por mes (ultimos 6 meses) ----
    const meses = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1); meses.push(mesChave(d)); }
    const porMedida = new Map();
    vendas.forEach(v => {
        const mk = mesChave(v.d);
        if (!meses.includes(mk)) return;
        const m = porMedida.get(v.medida) || { medida: v.medida, mes: {}, m3: 0, min: Infinity, max: 0, ult: null, clientes: new Map() };
        const cel = m.mes[mk] || { valor: 0, m3: 0 };
        cel.valor += v.valor; cel.m3 += v.m3; m.mes[mk] = cel;
        m.m3 += v.m3; m.min = Math.min(m.min, v.preco); m.max = Math.max(m.max, v.preco);
        if (!m.ult || v.d > m.ult.d) m.ult = v;
        const cl = m.clientes.get(v.ck);
        if (!cl || v.d > cl.d) m.clientes.set(v.ck, v);
        porMedida.set(v.medida, m);
    });
    const precos = [...porMedida.values()].map(m => {
        const medias = meses.map(k => (m.mes[k] && m.mes[k].m3 > 0 ? m.mes[k].valor / m.mes[k].m3 : null));
        const comValor = medias.filter(v => v != null);
        const atual = comValor[comValor.length - 1] ?? null, anterior = comValor[comValor.length - 2] ?? null;
        const variacao = atual != null && anterior ? (atual - anterior) / anterior * 100 : null;
        return { ...m, medias, atual, variacao };
    }).sort((a, b) => b.m3 - a.m3);

    const tot = { ativo: 0, ligar: 0, sumido: 0 };
    clientes.forEach(c => { tot[c.status]++; });
    return { clientes, precos, meses, tot, temContas: Array.isArray(dados.contas), precoAtual };
}

function linkWhats(c) {
    const tel = String(c.cad?.contato || c.cad?.telefone || c.cad?.whatsapp || '').replace(/\D/g, '');
    if (tel.length < 10) return '';
    const num = tel.startsWith('55') ? tel : '55' + tel;
    const msg = encodeURIComponent(`Olá, ${c.nome}! Tudo bem? Aqui é da serraria. Temos madeira disponível${c.medidaTop ? ` (${c.medidaTop.split(' · ')[1]})` : ''}. Posso te passar o preço de hoje?`);
    return `<a class="radar-whats" href="https://wa.me/${num}?text=${msg}" target="_blank" rel="noopener" aria-label="Chamar ${esc(c.nome)} no WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>`;
}
const chip = s => ({ ligar: '<span class="radar-chip ligar">Hora de ligar</span>', sumido: '<span class="radar-chip sumido">Sumiu</span>', ativo: '<span class="radar-chip ativo">Ativo</span>' }[s]);
function difTxt(v) {
    if (v == null) return '—';
    const cls = v < -2 ? 'abaixo' : v > 2 ? 'acima' : 'igual';
    return `<span class="radar-dif ${cls}">${v > 0 ? '+' : ''}${fmtN(v, 1)}%</span>`;
}

function render() {
    const el = document.getElementById('radarCorpo');
    if (!el || !radar.dados) return;
    const R = montar(radar.dados, radar.periodo);
    const b = norm(radar.busca);
    document.querySelectorAll('[data-radar-aba]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.radarAba === radar.aba)));
    if (radar.aba === 'clientes') {
        const lista = R.clientes.filter(c => !b || norm(c.nome).includes(b));
        el.innerHTML = `
          <div class="radar-kpis">
            <div class="radar-kpi ligar"><b>${R.tot.ligar}</b><span>hora de ligar</span></div>
            <div class="radar-kpi sumido"><b>${R.tot.sumido}</b><span>sumiram</span></div>
            <div class="radar-kpi ativo"><b>${R.tot.ativo}</b><span>ativos</span></div>
          </div>
          <p class="radar-dica">"Hora de ligar": já passou o tempo que o cliente costuma levar entre uma compra e outra. "Preço x hoje": o último preço que ele pagou comparado com a média dos últimos 30 dias da mesma medida.</p>
          <div class="radar-tabela-wrap"><table class="radar-tabela">
            <thead><tr><th>Cliente</th><th>Situação</th><th>Última compra</th><th>Compra a cada</th><th>Cargas</th><th>m³</th><th>Valor</th><th>Medida que mais leva</th><th>Último preço/m³</th><th>Preço x hoje</th>${R.temContas ? '<th>Em aberto</th>' : ''}<th></th></tr></thead>
            <tbody>${lista.map(c => `<tr>
              <td><b>${esc(c.nome)}</b>${c.cad?.cidade ? `<small>${esc(c.cad.cidade)}</small>` : ''}</td>
              <td>${chip(c.status)}</td>
              <td>há ${c.diasSem} dia(s)<small>${new Date(c.ultima).toLocaleDateString('pt-BR')}</small></td>
              <td>${c.intervalo ? `${c.intervalo} dias` : '—'}</td>
              <td class="num">${c.cargas}</td>
              <td class="num">${fmtN(c.m3)}</td>
              <td class="num">${fmtR(c.valor)}</td>
              <td>${esc(c.medidaTop) || '—'}</td>
              <td class="num">${c.ultPreco ? `${fmtR(c.ultPreco.preco)}<small>${esc(c.ultPreco.medida)}</small>` : '—'}</td>
              <td class="num">${difTxt(c.difPreco)}</td>
              ${R.temContas ? `<td class="num">${c.aberto ? `${fmtR(c.aberto.valor)}${c.aberto.vencido > 0 ? `<small class="radar-vencido">${fmtR(c.aberto.vencido)} vencido</small>` : ''}` : '—'}</td>` : ''}
              <td>${linkWhats(c)}</td></tr>`).join('') || `<tr><td colspan="12" class="radar-vazio">Nenhum cliente com compra no período.</td></tr>`}</tbody>
          </table></div>`;
    } else {
        const lista = R.precos.filter(p => !b || norm(p.medida).includes(b));
        el.innerHTML = `
          <p class="radar-dica">Preço médio por m³ de cada medida, mês a mês (média ponderada pelo volume vendido). "Variação": último mês com venda contra o mês anterior com venda. Clique numa medida para ver o último preço de cada cliente.</p>
          <div class="radar-tabela-wrap"><table class="radar-tabela">
            <thead><tr><th>Medida</th>${R.meses.map(m => `<th>${nomeMes(m)}</th>`).join('')}<th>Variação</th><th>Menor</th><th>Maior</th><th>m³ vendidos</th></tr></thead>
            <tbody>${lista.map((p, i) => `<tr class="radar-medida" data-radar-medida="${i}" tabindex="0">
              <td><b>${esc(p.medida)}</b></td>
              ${p.medias.map(v => `<td class="num">${v == null ? '—' : fmtR(v)}</td>`).join('')}
              <td class="num">${difTxt(p.variacao)}</td>
              <td class="num">${fmtR(p.min)}</td><td class="num">${fmtR(p.max)}</td><td class="num">${fmtN(p.m3)}</td></tr>
              <tr class="radar-detalhe" data-radar-det="${i}" hidden><td colspan="${R.meses.length + 5}">
                ${[...p.clientes.values()].sort((a, b) => b.d - a.d).map(v => `<span class="radar-pill">${esc(v.nome)}: <b>${fmtR(v.preco)}</b> em ${v.d.toLocaleDateString('pt-BR')} ${difTxt(R.precoAtual.get(p.medida) ? (v.preco - R.precoAtual.get(p.medida)) / R.precoAtual.get(p.medida) * 100 : null)}</span>`).join('')}
              </td></tr>`).join('') || `<tr><td colspan="${R.meses.length + 5}" class="radar-vazio">Sem vendas com preço nos últimos 6 meses.</td></tr>`}</tbody>
          </table></div>`;
    }
}

function garantirModal() {
    let m = document.getElementById('modalRadarClientes');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modalRadarClientes';
    m.className = 'radar-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-labelledby', 'radarTitulo');
    m.innerHTML = `
      <div class="radar-caixa">
        <header class="radar-topo">
          <div><h2 id="radarTitulo"><i class="fa-solid fa-satellite-dish"></i> Radar de Clientes</h2><p>Madeira serrada · dados dos romaneios</p></div>
          <button type="button" class="radar-fechar" aria-label="Fechar" onclick="window.fecharRadarClientes()">×</button>
        </header>
        <div class="radar-filtros">
          <div class="radar-abas" role="tablist">
            <button type="button" role="tab" data-radar-aba="clientes">Clientes</button>
            <button type="button" role="tab" data-radar-aba="precos">Comparativo de preços</button>
          </div>
          <label>Período <select id="radarPeriodo"><option value="90">90 dias</option><option value="180">6 meses</option><option value="365" selected>12 meses</option><option value="730">24 meses</option></select></label>
          <label class="radar-busca">Buscar <input type="search" id="radarBusca" placeholder="Cliente ou medida"></label>
        </div>
        <div id="radarCorpo" class="radar-corpo"><p class="radar-vazio">Carregando…</p></div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => {
        const aba = e.target.closest('[data-radar-aba]');
        if (aba) { radar.aba = aba.dataset.radarAba; render(); return; }
        const med = e.target.closest('[data-radar-medida]');
        if (med) { const d = m.querySelector(`[data-radar-det="${med.dataset.radarMedida}"]`); if (d) d.hidden = !d.hidden; }
    });
    m.addEventListener('keydown', e => {
        if (e.key === 'Escape') window.fecharRadarClientes();
        const med = e.target.closest?.('[data-radar-medida]');
        if (med && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); med.click(); }
    });
    m.querySelector('#radarPeriodo').addEventListener('change', e => { radar.periodo = Number(e.target.value) || 365; render(); });
    m.querySelector('#radarBusca').addEventListener('input', e => { radar.busca = e.target.value; render(); });
    return m;
}

window.abrirRadarClientes = async function() {
    const m = garantirModal();
    m.style.display = 'flex';
    document.body.classList.add('modal-open');
    try {
        radar.dados = await carregar();
        render();
    } catch (err) {
        console.error('Radar de clientes', err);
        document.getElementById('radarCorpo').innerHTML = '<p class="radar-vazio">Não foi possível carregar os dados. Verifique a conexão e tente de novo.</p>';
    }
};
window.fecharRadarClientes = function() {
    const m = document.getElementById('modalRadarClientes');
    if (m) m.style.display = 'none';
    document.body.classList.remove('modal-open');
};
