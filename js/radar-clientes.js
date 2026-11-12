// Radar de Clientes: quem esta comprando, quem e hora de ligar, quem sumiu,
// e comparativo de precos por medida (o preco esta mudando muito).
// Aba "Clientes novos": busca empresas no Google Maps (via /api/prospeccao) e guarda o andamento
// de cada uma em prospeccao/{placeId}. As outras abas so leem dados.
import { auth } from './firebase-init.js';

const fmtR = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtN = (v, d = 3) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const DIA = 86400000;

let radar = { dados: null, aba: 'clientes', periodo: 365, busca: '' };
const ATALHOS_PROSP = ['fábrica de paletes', 'embalagens de madeira', 'caixaria de madeira', 'madeireira', 'construtora', 'indústria moveleira'];
const STATUS_PROSP = [['novo', 'Novo'], ['contatar', 'A contatar'], ['liguei', 'Liguei'], ['visitei', 'Visitei'], ['cliente', 'Virou cliente'], ['descartado', 'Descartado']];
let prosp = { texto: 'fábrica de paletes', cidade: '', centro: null, raio: 150, resultados: [], token: '', salvos: new Map(), soLista: false, msg: '', carregando: false };
try { const m = JSON.parse(localStorage.getItem('radarProspCentro') || 'null'); if (m?.lat) { prosp.centro = m; prosp.cidade = m.cidadeDigitada || ''; } } catch (_) {}
function distKm(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
}
async function chamarProsp(corpo) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sessão expirada. Entre novamente.');
    const r = await fetch('/api/prospeccao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...corpo, idToken }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Não foi possível buscar agora.');
    return d;
}
async function carregarSalvosProsp() {
    try {
        const lista = await window.FS.getCollection('prospeccao');
        prosp.salvos = new Map(lista.map(x => [x.placeId || x.id, x]));
    } catch (_) { /* sem permissao ou colecao vazia */ }
}
async function buscarProsp(maisPagina) {
    if (prosp.carregando) return;
    prosp.carregando = true; prosp.msg = 'Buscando…'; render();
    try {
        if (!prosp.centro || prosp.centro.cidadeDigitada !== prosp.cidade) {
            if (!prosp.cidade.trim()) throw new Error('Informe a cidade de partida (ex.: a cidade da serraria).');
            const { local } = await chamarProsp({ modo: 'local', cidade: prosp.cidade });
            prosp.centro = { ...local, cidadeDigitada: prosp.cidade };
            try { localStorage.setItem('radarProspCentro', JSON.stringify(prosp.centro)); } catch (_) {}
        }
        const d = await chamarProsp({ texto: prosp.texto, lat: prosp.centro.lat, lng: prosp.centro.lng, raioKm: prosp.raio, pageToken: maisPagina ? prosp.token : '' });
        const novos = (d.empresas || []).map(e => ({ ...e, km: distKm(prosp.centro, e) })).filter(e => e.km == null || e.km <= prosp.raio * 1.05);
        prosp.resultados = maisPagina ? [...prosp.resultados, ...novos.filter(n => !prosp.resultados.some(r => r.placeId === n.placeId))] : novos;
        prosp.resultados.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
        prosp.token = d.nextPageToken || '';
        prosp.msg = prosp.resultados.length ? '' : 'Nenhuma empresa encontrada. Tente outro termo ou aumente o raio.';
    } catch (e) {
        prosp.msg = e.message;
    } finally {
        prosp.carregando = false; render();
    }
}
async function salvarProsp(placeId, mudanca) {
    const base = prosp.salvos.get(placeId) || prosp.resultados.find(r => r.placeId === placeId);
    if (!base) return;
    const reg = {
        placeId, nome: base.nome || '', endereco: base.endereco || '', telefone: base.telefone || '', site: base.site || '',
        lat: base.lat ?? null, lng: base.lng ?? null, mapsUrl: base.mapsUrl || '', tipo: base.tipo || '', busca: base.busca || prosp.texto,
        status: base.status || 'novo', obs: base.obs || '', ...mudanca,
        atualizadoEm: new Date().toISOString(), atualizadoPor: auth.currentUser?.email || ''
    };
    try {
        await window.FS.setDoc('prospeccao', placeId, reg);
        prosp.salvos.set(placeId, reg);
        prosp.msg = 'Salvo.';
    } catch (_) { prosp.msg = 'Não foi possível salvar (verifique sua permissão).'; }
    render();
}
function linhaProsp(e, cadastroNomes) {
    const s = prosp.salvos.get(e.placeId);
    const st = s?.status || '';
    const jaCliente = cadastroNomes.has(norm(e.nome));
    const tel = String(e.telefone || '').replace(/\D/g, '');
    const whats = tel.length >= 10 && /^(\d{2})9/.test(tel.replace(/^55/, '')) ? `https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}?text=${encodeURIComponent(`Olá! Somos uma serraria e fornecemos madeira serrada para ${e.tipo || 'sua empresa'}. Posso te passar nossas medidas e preços?`)}` : '';
    const km = e.km ?? distKm(prosp.centro, e);
    return `<div class="prosp-item${st ? ' st-' + st : ''}">
      <div class="prosp-info">
        <b>${esc(e.nome)}</b>${jaCliente ? '<span class="radar-chip ativo">Já é cliente</span>' : ''}${e.situacao && e.situacao !== 'OPERATIONAL' ? '<span class="radar-chip sumido">Fechada</span>' : ''}
        <small>${esc(e.tipo || '')}${km != null ? ` · ${fmtN(km, 0)} km` : ''}${e.nota ? ` · ★ ${fmtN(e.nota, 1)} (${e.avaliacoes})` : ''}</small>
        <small>${esc(e.endereco || '')}</small>
      </div>
      <div class="prosp-acoes">
        ${e.telefone ? `<a href="tel:${esc(tel)}" class="prosp-btn"><i class="fa-solid fa-phone" aria-hidden="true"></i> ${esc(e.telefone)}</a>` : ''}
        ${whats ? `<a href="${whats}" target="_blank" rel="noopener" class="prosp-btn radar-whats"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>` : ''}
        ${e.site ? `<a href="${esc(e.site)}" target="_blank" rel="noopener noreferrer" class="prosp-btn">Site</a>` : ''}
        ${e.mapsUrl ? `<a href="${esc(e.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="prosp-btn">Mapa</a>` : ''}
        <label class="prosp-status">Andamento <select data-prosp-status="${esc(e.placeId)}">
          <option value="">—</option>${STATUS_PROSP.map(([v, n]) => `<option value="${v}"${st === v ? ' selected' : ''}>${n}</option>`).join('')}
        </select></label>
        <input type="text" class="prosp-obs" data-prosp-obs="${esc(e.placeId)}" value="${esc(s?.obs || '')}" placeholder="Anotação (ex.: falar com João, compra 1,20)" aria-label="Anotação sobre ${esc(e.nome)}">
        ${st === 'cliente' && !jaCliente ? `<button type="button" class="prosp-btn" data-prosp-cadastrar="${esc(e.placeId)}">Cadastrar cliente</button>` : ''}
      </div></div>`;
}
function renderProsp(el) {
    const cadastroNomes = new Set((radar.dados?.clientes || []).map(c => norm(c.nome)));
    const lista = prosp.soLista
        ? [...prosp.salvos.values()].map(x => ({ ...x, km: distKm(prosp.centro, x) })).sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))
        : prosp.resultados.map(r => ({ ...r, ...(prosp.salvos.get(r.placeId) ? { status: prosp.salvos.get(r.placeId).status } : {}) }));
    const cont = {}; prosp.salvos.forEach(x => { cont[x.status] = (cont[x.status] || 0) + 1; });
    el.innerHTML = `
      <form class="prosp-form" id="prospForm">
        <label>O que procurar <input type="search" id="prospTexto" value="${esc(prosp.texto)}" maxlength="100" required></label>
        <label>Cidade de partida <input type="text" id="prospCidade" value="${esc(prosp.cidade)}" placeholder="Cidade da serraria" maxlength="120" required></label>
        <label>Raio <select id="prospRaio">${[50, 100, 150, 300, 450, 600].map(r => `<option value="${r}"${prosp.raio === r ? ' selected' : ''}>${r} km</option>`).join('')}</select></label>
        <button type="submit" class="btn-primary prosp-buscar"${prosp.carregando ? ' disabled' : ''}><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Buscar</button>
      </form>
      <div class="prosp-atalhos">${ATALHOS_PROSP.map(a => `<button type="button" data-prosp-atalho="${esc(a)}">${esc(a)}</button>`).join('')}</div>
      <div class="prosp-barra">
        <label class="prosp-check"><input type="checkbox" id="prospSoLista"${prosp.soLista ? ' checked' : ''}> Ver só minha lista (${prosp.salvos.size})</label>
        <span class="radar-dica">${STATUS_PROSP.filter(([v]) => cont[v]).map(([v, n]) => `${n}: <b>${cont[v]}</b>`).join(' · ')}</span>
      </div>
      ${prosp.msg ? `<p class="radar-dica" role="status">${esc(prosp.msg)}</p>` : ''}
      <div class="prosp-lista">${lista.map(e => linhaProsp(e, cadastroNomes)).join('') || (prosp.carregando ? '' : '<p class="radar-vazio">Digite o que procurar, a cidade de partida e o raio, e clique em Buscar.</p>')}</div>
      ${!prosp.soLista && prosp.token ? `<button type="button" class="prosp-btn prosp-mais" id="prospMais"${prosp.carregando ? ' disabled' : ''}>Carregar mais resultados</button>` : ''}
      <p class="radar-dica">Dados do Google Maps. Use para contato comercial com empresas; não guarde dados pessoais além do necessário.</p>`;
}

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
    if (radar.aba === 'novos') { renderProsp(el); return; }
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
          <div><h2 id="radarTitulo"><i class="fa-solid fa-satellite-dish"></i> Radar de Clientes</h2><p>Madeira serrada · romaneios e Google Maps</p></div>
          <button type="button" class="radar-fechar" aria-label="Fechar" onclick="window.fecharRadarClientes()">×</button>
        </header>
        <div class="radar-filtros">
          <div class="radar-abas" role="tablist">
            <button type="button" role="tab" data-radar-aba="clientes">Clientes</button>
            <button type="button" role="tab" data-radar-aba="precos">Comparativo de preços</button>
            <button type="button" role="tab" data-radar-aba="novos">Clientes novos</button>
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
        const at = e.target.closest('[data-prosp-atalho]');
        if (at) { prosp.texto = at.dataset.prospAtalho; prosp.cidade = m.querySelector('#prospCidade')?.value || prosp.cidade; buscarProsp(false); return; }
        if (e.target.closest('#prospMais')) { buscarProsp(true); return; }
        const cad = e.target.closest('[data-prosp-cadastrar]');
        if (cad) {
            const s = prosp.salvos.get(cad.dataset.prospCadastrar);
            if (s && confirm(`Cadastrar "${s.nome}" como cliente?`)) {
                window.FS.addDoc('clientes', { nome: s.nome, contato: s.telefone || '', endereco: s.endereco || '', cidade: (s.endereco || '').split(',').slice(-3, -2)[0]?.trim() || '', origem: 'prospeccao', criadoEm: new Date().toISOString() })
                    .then(() => { radar.dados.clientes.push({ nome: s.nome }); prosp.msg = 'Cliente cadastrado.'; render(); })
                    .catch(() => { prosp.msg = 'Não foi possível cadastrar (verifique sua permissão).'; render(); });
            }
        }
    });
    m.addEventListener('submit', e => {
        if (e.target.id !== 'prospForm') return;
        e.preventDefault();
        prosp.texto = m.querySelector('#prospTexto').value.trim();
        prosp.cidade = m.querySelector('#prospCidade').value.trim();
        prosp.raio = Number(m.querySelector('#prospRaio').value) || 150;
        buscarProsp(false);
    });
    m.addEventListener('change', e => {
        const st = e.target.closest('[data-prosp-status]');
        if (st) { salvarProsp(st.dataset.prospStatus, { status: st.value || 'novo' }); return; }
        const ob = e.target.closest('[data-prosp-obs]');
        if (ob) { salvarProsp(ob.dataset.prospObs, { obs: ob.value.slice(0, 300) }); return; }
        if (e.target.id === 'prospSoLista') { prosp.soLista = e.target.checked; render(); }
        if (e.target.id === 'prospRaio') prosp.raio = Number(e.target.value) || 150;
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
        await carregarSalvosProsp();
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
