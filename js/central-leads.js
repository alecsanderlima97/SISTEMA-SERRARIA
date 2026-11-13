// Central de Leads (aba "Clientes novos" do Radar de Clientes).
// - busca empresas no Google Maps (via /api/prospeccao; a chave fica so no servidor)
// - mapa com a serraria e os leads, fotos do Google
// - ficha do lead: andamento, proximo contato, CNPJ (Receita via BrasilAPI), credito anotado a mao,
//   distancia por estrada, frete estimado e historico de conversas
// Tudo fica em prospeccao/{id}; a configuracao (serraria e frete) em prospeccao/_config.
import { auth } from './firebase-init.js';

const fmtR = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtN = (v, d = 0) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const urlSegura = u => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
const hojeISO = () => new Date().toISOString().slice(0, 10);
const CONFIG_ID = '_config';
const FATOR_ESTRADA = 1.25; // linha reta x 1,25 ~ distancia por estrada (estimativa)

const ATALHOS = ['fábrica de paletes', 'embalagens de madeira', 'caixaria de madeira', 'madeireira', 'construtora', 'indústria moveleira'];
const STATUS = [
    ['novo', 'Novo', '#64748b'], ['contatar', 'A contatar', '#0369a1'], ['liguei', 'Liguei', '#7c3aed'],
    ['visitei', 'Visitei', '#b45309'], ['negociacao', 'Em negociação', '#c2410c'], ['cliente', 'Virou cliente', '#15803d'],
    ['descartado', 'Descartado', '#9ca3af']
];
const corStatus = s => (STATUS.find(x => x[0] === s) || STATUS[0])[2];
const nomeStatus = s => (STATUS.find(x => x[0] === s) || [, 'Sem andamento'])[1];
const CREDITO = [['', 'Não consultado'], ['ok', 'Sem restrição'], ['atencao', 'Atenção'], ['restricao', 'Com restrição']];

const st = {
    modo: 'busca', texto: 'fábrica de paletes', cidade: '', raio: 150, resultados: [], token: '', centroBusca: null,
    salvos: new Map(), cfg: { origem: null, freteKm: 0, idaVolta: true, m3Carga: 30 },
    aberto: null, msg: '', carregando: false, ajustarMapa: false, novoLead: false, filtro: ''
};
let ctx = { clientes: () => [], render: () => {} };
const fotoCache = new Map();
const rotaCache = new Map();
let mapa = null, camada = null, vistaMapa = null;

try {
    const c = JSON.parse(localStorage.getItem('radarProspCentro') || 'null');
    if (c?.cidadeDigitada) st.cidade = c.cidadeDigitada;
    const f = JSON.parse(sessionStorage.getItem('leadsFotos') || '{}');
    Object.entries(f).forEach(([k, v]) => fotoCache.set(k, v));
} catch (_) { /* sem storage */ }

function distKm(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
}
function kmLead(e) {
    if (e.rotaKm) return { km: e.rotaKm, estrada: true, minutos: e.rotaMin || null };
    const c = rotaCache.get(e.placeId);
    if (c) return { km: c.km, estrada: true, minutos: c.minutos };
    const d = distKm(st.cfg.origem, e);
    return d == null ? null : { km: d * FATOR_ESTRADA, estrada: false };
}
function frete(km) {
    const pk = Number(st.cfg.freteKm) || 0;
    if (!km || !pk) return null;
    const total = km * pk * (st.cfg.idaVolta ? 2 : 1);
    const m3 = Number(st.cfg.m3Carga) || 0;
    return { total, porM3: m3 > 0 ? total / m3 : null };
}

async function api(corpo) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sessão expirada. Entre novamente.');
    const r = await fetch('/api/prospeccao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...corpo, idToken }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Não foi possível consultar agora.');
    return d;
}

export async function carregarLeads() {
    try {
        const lista = await window.FS.getCollection('prospeccao');
        st.salvos = new Map();
        lista.forEach(x => {
            if (x.id === CONFIG_ID) { st.cfg = { ...st.cfg, ...x }; return; }
            st.salvos.set(x.placeId || x.id, { ...x, placeId: x.placeId || x.id });
        });
    } catch (_) { /* sem permissao ou colecao vazia */ }
}

async function salvarCfg(mudanca) {
    st.cfg = { ...st.cfg, ...mudanca };
    try {
        const { origem, freteKm, idaVolta, m3Carga } = st.cfg;
        await window.FS.setDoc('prospeccao', CONFIG_ID, { origem, freteKm: Number(freteKm) || 0, idaVolta: !!idaVolta, m3Carga: Number(m3Carga) || 0, atualizadoEm: new Date().toISOString() });
    } catch (_) { st.msg = 'Não foi possível salvar a configuração (verifique sua permissão).'; }
    ctx.render();
}

function baseLead(id) { return st.salvos.get(id) || st.resultados.find(r => r.placeId === id) || null; }
async function salvarLead(id, mudanca, msg = 'Salvo.') {
    const b = baseLead(id);
    if (!b) return;
    const reg = {
        placeId: id, nome: b.nome || '', endereco: b.endereco || '', telefone: b.telefone || '', site: b.site || '',
        lat: b.lat ?? null, lng: b.lng ?? null, mapsUrl: b.mapsUrl || '', tipo: b.tipo || '', busca: b.busca || st.texto,
        fotos: Array.isArray(b.fotos) ? b.fotos.slice(0, 4) : [], nota: b.nota ?? null, avaliacoes: b.avaliacoes ?? 0,
        status: b.status || 'novo', obs: b.obs || '', contato: b.contato || '', proximoContato: b.proximoContato || '',
        cnpj: b.cnpj || '', cnpjDados: b.cnpjDados || null, credito: b.credito || null, notas: Array.isArray(b.notas) ? b.notas : [],
        rotaKm: b.rotaKm ?? null, rotaMin: b.rotaMin ?? null, manual: !!b.manual, criadoEm: b.criadoEm || new Date().toISOString(),
        ...mudanca,
        atualizadoEm: new Date().toISOString(), atualizadoPor: auth.currentUser?.email || ''
    };
    try {
        await window.FS.setDoc('prospeccao', id, reg);
        st.salvos.set(id, reg);
        st.msg = msg;
    } catch (_) { st.msg = 'Não foi possível salvar (verifique sua permissão).'; }
    ctx.render();
}

async function buscar(mais) {
    if (st.carregando) return;
    st.carregando = true; st.msg = 'Buscando no Google Maps…'; ctx.render();
    try {
        let centro = st.cfg.origem;
        if (st.cidade.trim()) {
            if (!st.centroBusca || st.centroBusca.cidadeDigitada !== st.cidade) {
                const { local } = await api({ modo: 'local', cidade: st.cidade });
                st.centroBusca = { ...local, cidadeDigitada: st.cidade };
                try { localStorage.setItem('radarProspCentro', JSON.stringify(st.centroBusca)); } catch (_) {}
            }
            centro = st.centroBusca;
        }
        if (!centro) throw new Error('Defina a localização da serraria (botão "Minha localização") ou digite a cidade de partida.');
        const d = await api({ texto: st.texto, lat: centro.lat, lng: centro.lng, raioKm: st.raio, pageToken: mais ? st.token : '' });
        const novos = (d.empresas || []).filter(e => { const k = distKm(centro, e); return k == null || k <= st.raio * 1.05; });
        st.resultados = mais ? [...st.resultados, ...novos.filter(n => !st.resultados.some(r => r.placeId === n.placeId))] : novos;
        st.resultados.sort((a, b) => (kmLead(a)?.km ?? 1e9) - (kmLead(b)?.km ?? 1e9));
        st.token = d.nextPageToken || '';
        st.msg = st.resultados.length ? '' : 'Nenhuma empresa encontrada. Tente outro termo ou aumente o raio.';
        st.ajustarMapa = true;
    } catch (e) {
        st.msg = e.message;
    } finally {
        st.carregando = false; ctx.render();
    }
}

async function carregarFotos(raiz) {
    const imgs = [...raiz.querySelectorAll('img[data-lc-foto]')];
    for (const img of imgs) {
        const nome = img.dataset.lcFoto;
        const larg = Number(img.dataset.lcLarg) || 240;
        const chave = `${nome}|${larg}`;
        if (fotoCache.has(chave)) { img.src = fotoCache.get(chave); img.hidden = false; continue; }
        try {
            const { url } = await api({ modo: 'foto', foto: nome, largura: larg });
            if (!/^https:\/\//.test(url)) continue;
            fotoCache.set(chave, url);
            try { sessionStorage.setItem('leadsFotos', JSON.stringify(Object.fromEntries(fotoCache))); } catch (_) {}
            if (img.isConnected) { img.src = url; img.hidden = false; }
        } catch (_) { break; } // sem chave/cota: para de tentar
    }
}

async function calcularRota(id) {
    const e = baseLead(id);
    if (!e || !st.cfg.origem || e.lat == null) return;
    try {
        const { rota } = await api({ modo: 'rota', origem: st.cfg.origem, destino: { lat: e.lat, lng: e.lng } });
        if (!rota) return; // Routes API nao ativada: fica a estimativa
        rotaCache.set(id, rota);
        if (st.salvos.has(id)) await salvarLead(id, { rotaKm: Math.round(rota.km * 10) / 10, rotaMin: rota.minutos }, '');
        else ctx.render();
    } catch (_) { /* fica a estimativa */ }
}

async function consultarCnpj(id, cnpj) {
    const num = String(cnpj || '').replace(/\D/g, '');
    if (num.length !== 14) { st.msg = 'Digite o CNPJ com 14 números.'; ctx.render(); return; }
    st.msg = 'Consultando CNPJ na Receita…'; ctx.render();
    try {
        const { cnpj: dados } = await api({ modo: 'cnpj', cnpj: num });
        await salvarLead(id, { cnpj: num, cnpjDados: { ...dados, consultadoEm: new Date().toISOString() } }, 'CNPJ consultado.');
    } catch (e) { st.msg = e.message; ctx.render(); }
}

// ---------- mapa (Leaflet + OpenStreetMap, carregado so quando abre a aba) ----------
let leafletPromessa = null;
function carregarLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromessa) return leafletPromessa;
    leafletPromessa = new Promise((ok, falha) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        document.head.appendChild(css);
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        s.onload = () => ok(window.L);
        s.onerror = () => { leafletPromessa = null; falha(new Error('mapa')); };
        document.head.appendChild(s);
    });
    return leafletPromessa;
}
async function desenharMapa(raiz, lista) {
    const div = raiz.querySelector('#lcMapa');
    if (!div) return;
    let L;
    try { L = await carregarLeaflet(); } catch (_) { div.innerHTML = '<p class="radar-vazio">Mapa indisponível agora.</p>'; return; }
    if (!div.isConnected) return;
    if (mapa) { vistaMapa = { c: mapa.getCenter(), z: mapa.getZoom() }; mapa.remove(); mapa = null; }
    mapa = L.map(div, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(mapa);
    camada = L.layerGroup().addTo(mapa);
    const pontos = [];
    if (st.cfg.origem) {
        L.marker([st.cfg.origem.lat, st.cfg.origem.lng], { title: 'Serraria', icon: L.divIcon({ className: 'lc-pin-serraria', html: '<i class="fa-solid fa-industry" aria-hidden="true"></i>', iconSize: [34, 34], iconAnchor: [17, 17] }), zIndexOffset: 1000 }).addTo(camada).bindTooltip('Serraria', { permanent: false });
        pontos.push([st.cfg.origem.lat, st.cfg.origem.lng]);
    }
    lista.filter(e => e.lat != null).forEach(e => {
        const salvo = st.salvos.get(e.placeId);
        const cor = salvo ? corStatus(salvo.status) : '#2563eb';
        const mk = L.circleMarker([e.lat, e.lng], { radius: st.aberto === e.placeId ? 10 : 7, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 0.95 }).addTo(camada);
        mk.bindTooltip(esc(e.nome));
        mk.on('click', () => abrirFicha(e.placeId));
        pontos.push([e.lat, e.lng]);
    });
    const foco = st.aberto && baseLead(st.aberto);
    if (st.focar && foco?.lat != null) { mapa.setView([foco.lat, foco.lng], Math.max(vistaMapa?.z || 0, 9)); st.focar = false; }
    else if (st.ajustarMapa && pontos.length) { mapa.fitBounds(pontos, { padding: [30, 30], maxZoom: 11 }); st.ajustarMapa = false; }
    else if (vistaMapa) mapa.setView(vistaMapa.c, vistaMapa.z);
    else if (pontos.length) mapa.fitBounds(pontos, { padding: [30, 30], maxZoom: 11 });
    else mapa.setView([-23.5, -47.5], 7);
    setTimeout(() => mapa?.invalidateSize(), 50);
}

function abrirFicha(id) {
    st.aberto = id; st.msg = ''; st.focar = true;
    ctx.render();
    const e = baseLead(id);
    if (e && !kmLead(e)?.estrada) calcularRota(id);
}

// ---------- telas ----------
function linkWhats(e) {
    const tel = String(e.telefone || '').replace(/\D/g, '');
    const local = tel.replace(/^55/, '');
    if (!(local.length >= 10 && /^(\d{2})9/.test(local))) return '';
    return `https://wa.me/55${local}?text=${encodeURIComponent(`Olá! Somos uma serraria e fornecemos madeira serrada para ${e.tipo || 'sua empresa'}. Posso te passar nossas medidas e preços?`)}`;
}
function textoKm(e) {
    const k = kmLead(e);
    if (!k) return '';
    return `${k.estrada ? '' : '~'}${fmtN(k.km)} km${k.minutos ? ` · ${Math.floor(k.minutos / 60)}h${String(k.minutos % 60).padStart(2, '0')}` : ''}`;
}
function cartao(e, cadastro) {
    const s = st.salvos.get(e.placeId);
    const status = s?.status || '';
    const ja = cadastro.has(norm(e.nome));
    const k = kmLead(e);
    const f = frete(k?.km);
    const foto = (s?.fotos || e.fotos || [])[0];
    return `<article class="lc-card${st.aberto === e.placeId ? ' ativo' : ''}" data-lc-abrir="${esc(e.placeId)}" tabindex="0" aria-label="Abrir ficha de ${esc(e.nome)}">
      <div class="lc-thumb">${foto ? `<img data-lc-foto="${esc(foto)}" data-lc-larg="240" alt="" hidden>` : ''}<i class="fa-solid fa-industry" aria-hidden="true"></i></div>
      <div class="lc-card-info">
        <div class="lc-card-nome">${esc(e.nome)}</div>
        <div class="lc-card-sub">${esc(e.tipo || '')}${e.nota ? ` · <span class="lc-estrela">★ ${fmtN(e.nota, 1)}</span> (${e.avaliacoes || 0})` : ''}</div>
        <div class="lc-tags">
          ${status ? `<span class="lc-tag" style="--c:${corStatus(status)}">${esc(nomeStatus(status))}</span>` : ''}
          ${ja ? '<span class="lc-tag" style="--c:#15803d">Já é cliente</span>' : ''}
          ${e.situacao && e.situacao !== 'OPERATIONAL' ? '<span class="lc-tag" style="--c:#b91c1c">Fechada</span>' : ''}
          ${k ? `<span class="lc-tag neutra"><i class="fa-solid fa-route" aria-hidden="true"></i> ${textoKm(e)}</span>` : ''}
          ${f ? `<span class="lc-tag neutra"><i class="fa-solid fa-truck" aria-hidden="true"></i> ${fmtR(f.total)}</span>` : ''}
        </div>
      </div>
    </article>`;
}
function painelOrigem() {
    const o = st.cfg.origem;
    return `<div class="lc-origem">
      <div class="lc-origem-local"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>
        <span>Serraria: <b>${o ? esc(o.nome || 'Localização definida') : 'não definida'}</b></span>
        <button type="button" class="lc-btn" data-lc-acao="gps"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> Minha localização</button>
        <button type="button" class="lc-btn" data-lc-acao="origem-cidade">Definir por endereço</button>
      </div>
      <div class="lc-frete">
        <label>Frete R$/km <input type="number" min="0" step="0.01" inputmode="decimal" data-lc-cfg="freteKm" value="${esc(st.cfg.freteKm || '')}" placeholder="ex.: 6,50"></label>
        <label class="lc-check"><input type="checkbox" data-lc-cfg="idaVolta"${st.cfg.idaVolta ? ' checked' : ''}> Ida e volta</label>
        <label>m³ por carga <input type="number" min="1" step="1" data-lc-cfg="m3Carga" value="${esc(st.cfg.m3Carga || '')}"></label>
      </div>
    </div>`;
}
function telaBusca(cadastro) {
    return `
      <form class="lc-busca" id="lcForm">
        <label class="lc-campo-grande">O que procurar <input type="search" id="lcTexto" value="${esc(st.texto)}" maxlength="100" required></label>
        <label>Cidade de partida <input type="text" id="lcCidade" value="${esc(st.cidade)}" placeholder="vazio = serraria" maxlength="120"></label>
        <label>Raio <select id="lcRaio">${[50, 100, 150, 300, 450, 600].map(r => `<option value="${r}"${st.raio === r ? ' selected' : ''}>${r} km</option>`).join('')}</select></label>
        <button type="submit" class="lc-btn primario"${st.carregando ? ' disabled' : ''}><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Buscar</button>
      </form>
      <div class="lc-atalhos">${ATALHOS.map(a => `<button type="button" class="lc-chip${st.texto === a ? ' ativo' : ''}" data-lc-atalho="${esc(a)}">${esc(a)}</button>`).join('')}</div>
      <div class="lc-split">
        <div class="lc-lista">${st.resultados.map(e => cartao(e, cadastro)).join('') || (st.carregando ? '' : '<p class="radar-vazio">Escolha o que procurar e clique em Buscar. As empresas aparecem aqui e no mapa.</p>')}
          ${st.token ? `<button type="button" class="lc-btn lc-mais" data-lc-acao="mais"${st.carregando ? ' disabled' : ''}>Carregar mais</button>` : ''}
        </div>
        <div class="lc-mapa" id="lcMapa" role="region" aria-label="Mapa dos leads"></div>
      </div>`;
}
function telaLeads(cadastro) {
    const hoje = hojeISO();
    const todos = [...st.salvos.values()].filter(x => !st.filtro || norm(x.nome).includes(norm(st.filtro)) || norm(x.endereco).includes(norm(st.filtro)));
    const ordem = (a, b) => (a.proximoContato || '9999').localeCompare(b.proximoContato || '9999') || (kmLead(a)?.km ?? 1e9) - (kmLead(b)?.km ?? 1e9);
    const atrasados = todos.filter(x => x.proximoContato && x.proximoContato <= hoje && !['cliente', 'descartado'].includes(x.status)).length;
    return `
      <div class="lc-leads-barra">
        <input type="search" id="lcFiltro" value="${esc(st.filtro)}" placeholder="Filtrar por nome ou cidade" aria-label="Filtrar leads">
        ${atrasados ? `<span class="lc-alerta"><i class="fa-solid fa-bell" aria-hidden="true"></i> ${atrasados} contato(s) para hoje ou atrasado(s)</span>` : ''}
        <button type="button" class="lc-btn primario" data-lc-acao="novo-lead"><i class="fa-solid fa-plus" aria-hidden="true"></i> Novo lead</button>
      </div>
      ${st.novoLead ? `<form class="lc-novo" id="lcNovo">
        <label>Empresa <input name="nome" required maxlength="120"></label>
        <label>Cidade / endereço <input name="cidade" maxlength="160" placeholder="ex.: Sorocaba SP"></label>
        <label>Telefone <input name="telefone" maxlength="20" inputmode="tel"></label>
        <label>CNPJ <input name="cnpj" maxlength="18" inputmode="numeric"></label>
        <div class="lc-novo-acoes"><button type="submit" class="lc-btn primario">Salvar lead</button><button type="button" class="lc-btn" data-lc-acao="cancelar-novo">Cancelar</button></div>
      </form>` : ''}
      <div class="lc-kanban">${STATUS.map(([v, n, cor]) => {
          const col = todos.filter(x => (x.status || 'novo') === v).sort(ordem);
          return `<section class="lc-coluna" style="--c:${cor}"><h4>${n} <span>${col.length}</span></h4>
            ${col.map(x => `<div class="lc-mini${st.aberto === x.placeId ? ' ativo' : ''}" data-lc-abrir="${esc(x.placeId)}" tabindex="0">
              <b>${esc(x.nome)}</b>${cadastro.has(norm(x.nome)) && v !== 'cliente' ? ' <small class="lc-ok">cliente</small>' : ''}
              <small>${esc(cidadeDe(x))}${kmLead(x) ? ` · ${textoKm(x)}` : ''}</small>
              ${x.proximoContato ? `<small class="${x.proximoContato <= hoje && !['cliente', 'descartado'].includes(v) ? 'lc-atrasado' : ''}"><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${new Date(x.proximoContato + 'T12:00').toLocaleDateString('pt-BR')}</small>` : ''}
              ${x.credito?.situacao ? `<small class="lc-cred ${esc(x.credito.situacao)}">${esc((CREDITO.find(c => c[0] === x.credito.situacao) || [])[1] || '')}</small>` : ''}
            </div>`).join('') || '<p class="lc-coluna-vazia">—</p>'}
          </section>`;
      }).join('')}</div>`;
}
function cidadeDe(x) {
    if (x.cnpjDados?.municipio) return `${x.cnpjDados.municipio}/${x.cnpjDados.uf}`;
    const p = String(x.endereco || '').split(',').map(s => s.trim());
    return p.length >= 3 ? p[p.length - 2] : (p[0] || '');
}
function ficha(cadastro) {
    const e = baseLead(st.aberto);
    if (!e) return '';
    const s = st.salvos.get(e.placeId) || {};
    const salvo = st.salvos.has(e.placeId);
    const k = kmLead(e);
    const f = frete(k?.km);
    const whats = linkWhats(e);
    const tel = String(e.telefone || '').replace(/\D/g, '');
    const cd = s.cnpjDados;
    const cred = s.credito || {};
    const notas = (s.notas || []).slice().reverse();
    const fotos = (s.fotos || e.fotos || []).slice(0, 4);
    const site = urlSegura(e.site), maps = urlSegura(e.mapsUrl);
    const ja = cadastro.has(norm(e.nome));
    return `<aside class="lc-ficha" role="dialog" aria-label="Ficha de ${esc(e.nome)}">
      <header class="lc-ficha-topo">
        <div><h3>${esc(e.nome)}</h3><p>${esc(e.tipo || '')}${e.nota ? ` · ★ ${fmtN(e.nota, 1)} (${e.avaliacoes || 0} avaliações)` : ''}</p></div>
        <button type="button" class="lc-fechar" data-lc-acao="fechar" aria-label="Fechar ficha">×</button>
      </header>
      ${fotos.length ? `<div class="lc-fotos">${fotos.map(n => `<img data-lc-foto="${esc(n)}" data-lc-larg="480" alt="Foto de ${esc(e.nome)} no Google" hidden>`).join('')}</div>` : ''}
      <div class="lc-acoes-rapidas">
        ${tel ? `<a class="lc-btn" href="tel:${esc(tel)}"><i class="fa-solid fa-phone" aria-hidden="true"></i> ${esc(e.telefone)}</a>` : ''}
        ${whats ? `<a class="lc-btn whats" href="${whats}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>` : ''}
        ${site ? `<a class="lc-btn" href="${esc(site)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-globe" aria-hidden="true"></i> Site</a>` : ''}
        ${maps ? `<a class="lc-btn" href="${esc(maps)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> Google Maps</a>` : ''}
      </div>
      <p class="lc-endereco">${esc(e.endereco || '')}</p>

      <section class="lc-sec"><h4>Andamento</h4>
        <div class="lc-grade">
          <label>Situação <select data-lc-campo="status">${STATUS.map(([v, n]) => `<option value="${v}"${(s.status || (salvo ? 'novo' : '')) === v ? ' selected' : ''}>${n}</option>`).join('')}${salvo ? '' : '<option value="" selected>— escolha para salvar —</option>'}</select></label>
          <label>Próximo contato <input type="date" data-lc-campo="proximoContato" value="${esc(s.proximoContato || '')}"></label>
          <label>Falar com <input type="text" data-lc-campo="contato" maxlength="80" value="${esc(s.contato || '')}" placeholder="nome / cargo"></label>
        </div>
        ${!salvo ? '<p class="radar-dica">Escolha uma situação para guardar esta empresa na sua lista.</p>' : ''}
      </section>

      <section class="lc-sec"><h4>Distância e frete</h4>
        ${!st.cfg.origem ? '<p class="radar-dica">Defina a localização da serraria no topo para calcular a distância.</p>' : `
        <div class="lc-numeros">
          <div><span>Distância</span><b>${k ? `${fmtN(k.km)} km` : '—'}</b><small>${k ? (k.estrada ? `por estrada${k.minutos ? ` · ${Math.floor(k.minutos / 60)}h${String(k.minutos % 60).padStart(2, '0')}` : ''}` : 'estimada (linha reta × 1,25)') : ''}</small></div>
          <div><span>Frete ${st.cfg.idaVolta ? 'ida e volta' : 'só ida'}</span><b>${f ? fmtR(f.total) : '—'}</b><small>${st.cfg.freteKm ? `${fmtR(st.cfg.freteKm)}/km` : 'informe R$/km no topo'}</small></div>
          <div><span>Frete por m³</span><b>${f?.porM3 ? fmtR(f.porM3) : '—'}</b><small>${st.cfg.m3Carga ? `carga de ${fmtN(st.cfg.m3Carga)} m³` : ''}</small></div>
        </div>`}
      </section>

      <section class="lc-sec"><h4>Empresa (CNPJ)</h4>
        <div class="lc-linha">
          <input type="text" id="lcCnpj" inputmode="numeric" maxlength="18" value="${esc(s.cnpj || '')}" placeholder="00.000.000/0000-00" aria-label="CNPJ">
          <button type="button" class="lc-btn primario" data-lc-acao="cnpj"${salvo ? '' : ' disabled title="Salve o lead primeiro"'}><i class="fa-solid fa-building-columns" aria-hidden="true"></i> Consultar Receita</button>
        </div>
        ${cd ? `<dl class="lc-cnpj">
          <dt>Razão social</dt><dd>${esc(cd.razaoSocial)}</dd>
          ${cd.nomeFantasia ? `<dt>Fantasia</dt><dd>${esc(cd.nomeFantasia)}</dd>` : ''}
          <dt>Situação</dt><dd class="${norm(cd.situacao) === 'ATIVA' ? 'lc-ok' : 'lc-ruim'}">${esc(cd.situacao || '—')}</dd>
          <dt>Abertura</dt><dd>${cd.abertura ? `${new Date(cd.abertura + 'T12:00').toLocaleDateString('pt-BR')} (${Math.max(0, new Date().getFullYear() - Number(cd.abertura.slice(0, 4)))} anos)` : '—'}</dd>
          <dt>Porte</dt><dd>${esc(cd.porte || '—')}${cd.mei ? ' · MEI' : cd.simples ? ' · Simples' : ''}</dd>
          <dt>Capital social</dt><dd>${fmtR(cd.capitalSocial)}</dd>
          <dt>Atividade</dt><dd>${esc(cd.cnae || '—')}</dd>
          <dt>Endereço</dt><dd>${esc([cd.endereco, cd.municipio && `${cd.municipio}/${cd.uf}`].filter(Boolean).join(' · '))}</dd>
        </dl><p class="radar-dica">Fonte: Receita Federal (BrasilAPI), consultado em ${new Date(cd.consultadoEm).toLocaleDateString('pt-BR')}.</p>` : ''}
      </section>

      <section class="lc-sec"><h4>Crédito (Serasa / Boa Vista)</h4>
        <p class="radar-dica">A consulta de crédito é paga e feita no site de cada birô com o login da empresa. Anote aqui o resultado.</p>
        <div class="lc-acoes-rapidas">
          <a class="lc-btn" href="https://www.serasaexperian.com.br/" target="_blank" rel="noopener noreferrer">Abrir Serasa Experian</a>
          <a class="lc-btn" href="https://www.boavistaservicos.com.br/" target="_blank" rel="noopener noreferrer">Abrir Boa Vista</a>
        </div>
        <div class="lc-grade">
          <label>Resultado <select data-lc-cred="situacao"${salvo ? '' : ' disabled'}>${CREDITO.map(([v, n]) => `<option value="${v}"${(cred.situacao || '') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>Score <input type="number" min="0" max="1000" data-lc-cred="score" value="${esc(cred.score ?? '')}"${salvo ? '' : ' disabled'}></label>
          <label>Observação <input type="text" maxlength="160" data-lc-cred="obs" value="${esc(cred.obs || '')}" placeholder="ex.: 2 protestos, limite sugerido"${salvo ? '' : ' disabled'}></label>
        </div>
        ${cred.em ? `<p class="radar-dica">Anotado em ${new Date(cred.em).toLocaleDateString('pt-BR')}${cred.por ? ` por ${esc(cred.por)}` : ''}.</p>` : ''}
      </section>

      <section class="lc-sec"><h4>Histórico de conversas</h4>
        <form class="lc-linha" id="lcNota">
          <input type="text" id="lcNotaTexto" maxlength="400" placeholder="Ex.: liguei, pediu preço do 1,20 × 8,5; retornar sexta"${salvo ? '' : ' disabled'} aria-label="Nova anotação">
          <button type="submit" class="lc-btn primario"${salvo ? '' : ' disabled'}>Anotar</button>
        </form>
        ${s.obs ? `<p class="lc-nota"><small>Anotação antiga</small>${esc(s.obs)}</p>` : ''}
        ${notas.map(n => `<p class="lc-nota"><small>${new Date(n.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${n.por ? ` · ${esc(n.por)}` : ''}</small>${esc(n.texto)}</p>`).join('')}
      </section>

      ${salvo && !ja ? `<button type="button" class="lc-btn lc-cadastrar" data-lc-acao="cadastrar"><i class="fa-solid fa-user-plus" aria-hidden="true"></i> Cadastrar como cliente</button>` : ''}
    </aside>`;
}

export function renderLeads(el) {
    const cadastro = new Set((ctx.clientes() || []).map(c => norm(c.nome)));
    const n = st.salvos.size;
    el.innerHTML = `<div class="lc${st.aberto ? ' com-ficha' : ''}">
      <div class="lc-topo">
        <div class="lc-modos" role="tablist">
          <button type="button" role="tab" class="${st.modo === 'busca' ? 'ativo' : ''}" data-lc-modo="busca"><i class="fa-solid fa-magnifying-glass-location" aria-hidden="true"></i> Buscar no Google</button>
          <button type="button" role="tab" class="${st.modo === 'leads' ? 'ativo' : ''}" data-lc-modo="leads"><i class="fa-solid fa-table-columns" aria-hidden="true"></i> Meus leads <span>${n}</span></button>
        </div>
        ${painelOrigem()}
      </div>
      ${st.msg ? `<p class="lc-msg" role="status">${esc(st.msg)}</p>` : ''}
      <div class="lc-corpo">
        <div class="lc-principal">${st.modo === 'busca' ? telaBusca(cadastro) : telaLeads(cadastro)}</div>
        ${ficha(cadastro)}
      </div>
      <p class="radar-dica">Dados do Google Maps e da Receita Federal para contato comercial com empresas. Não guarde dados pessoais além do necessário.</p>
    </div>`;
    if (st.modo === 'busca') desenharMapa(el, st.resultados);
    else if (mapa) { mapa.remove(); mapa = null; }
    carregarFotos(el);
}

function pegarGps() {
    if (!navigator.geolocation) { st.msg = 'Este navegador não informa a localização.'; ctx.render(); return; }
    st.msg = 'Pegando sua localização…'; ctx.render();
    navigator.geolocation.getCurrentPosition(
        p => { st.msg = 'Localização da serraria salva.'; st.ajustarMapa = true; salvarCfg({ origem: { lat: p.coords.latitude, lng: p.coords.longitude, nome: 'Minha localização' } }); rotaCache.clear(); },
        () => { st.msg = 'Não consegui pegar a localização. Libere a permissão no navegador ou use "Definir por endereço".'; ctx.render(); },
        { enableHighAccuracy: true, timeout: 15000 }
    );
}
async function origemPorEndereco() {
    const txt = prompt('Endereço ou cidade da serraria:', st.cfg.origem?.nome && st.cfg.origem.nome !== 'Minha localização' ? st.cfg.origem.nome : '');
    if (!txt || txt.trim().length < 3) return;
    try {
        const { local } = await api({ modo: 'local', cidade: txt.trim() });
        rotaCache.clear(); st.ajustarMapa = true; st.msg = 'Localização da serraria salva.';
        await salvarCfg({ origem: { lat: local.lat, lng: local.lng, nome: local.nome } });
    } catch (e) { st.msg = e.message; ctx.render(); }
}
async function criarLeadManual(form) {
    const fd = new FormData(form);
    const nome = String(fd.get('nome') || '').trim();
    if (!nome) return;
    const cidade = String(fd.get('cidade') || '').trim();
    const id = 'm_' + Date.now().toString(36);
    const lead = { placeId: id, nome, endereco: cidade, telefone: String(fd.get('telefone') || '').trim(), cnpj: String(fd.get('cnpj') || '').replace(/\D/g, ''), status: 'negociacao', manual: true, lat: null, lng: null };
    if (cidade) { try { const { local } = await api({ modo: 'local', cidade }); lead.lat = local.lat; lead.lng = local.lng; lead.endereco = local.nome; } catch (_) { /* sem mapa */ } }
    st.resultados.push(lead); // base temporaria para salvarLead
    await salvarLead(id, lead, 'Lead salvo.');
    st.resultados = st.resultados.filter(r => r.placeId !== id);
    st.novoLead = false; st.aberto = id; ctx.render();
}

export function instalarLeads(modal, contexto) {
    ctx = contexto;
    modal.addEventListener('click', e => {
        const modo = e.target.closest('[data-lc-modo]');
        if (modo) { st.modo = modo.dataset.lcModo; st.msg = ''; ctx.render(); return; }
        const at = e.target.closest('[data-lc-atalho]');
        if (at) { st.texto = at.dataset.lcAtalho; st.cidade = modal.querySelector('#lcCidade')?.value.trim() ?? st.cidade; buscar(false); return; }
        const ab = e.target.closest('[data-lc-abrir]');
        if (ab) { abrirFicha(ab.dataset.lcAbrir); return; }
        const ac = e.target.closest('[data-lc-acao]');
        if (!ac) return;
        const a = ac.dataset.lcAcao;
        if (a === 'fechar') { st.aberto = null; ctx.render(); }
        else if (a === 'mais') buscar(true);
        else if (a === 'gps') pegarGps();
        else if (a === 'origem-cidade') origemPorEndereco();
        else if (a === 'novo-lead') { st.novoLead = true; ctx.render(); }
        else if (a === 'cancelar-novo') { st.novoLead = false; ctx.render(); }
        else if (a === 'cnpj') consultarCnpj(st.aberto, modal.querySelector('#lcCnpj')?.value);
        else if (a === 'cadastrar') {
            const s = st.salvos.get(st.aberto);
            if (!s || !confirm(`Cadastrar "${s.nome}" como cliente?`)) return;
            window.FS.addDoc('clientes', {
                nome: s.cnpjDados?.razaoSocial || s.nome, contato: s.telefone || '', endereco: s.cnpjDados?.endereco || s.endereco || '',
                cidade: s.cnpjDados?.municipio || cidadeDe(s), cnpj: s.cnpj || '', origem: 'prospeccao', criadoEm: new Date().toISOString()
            }).then(() => { ctx.clientes().push({ nome: s.nome }); salvarLead(s.placeId, { status: 'cliente' }, 'Cliente cadastrado.'); })
              .catch(() => { st.msg = 'Não foi possível cadastrar (verifique sua permissão).'; ctx.render(); });
        }
    });
    modal.addEventListener('keydown', e => {
        const ab = e.target.closest?.('[data-lc-abrir]');
        if (ab && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrirFicha(ab.dataset.lcAbrir); }
        if (e.key === 'Escape' && st.aberto) { e.stopPropagation(); st.aberto = null; ctx.render(); }
    }, true);
    modal.addEventListener('submit', e => {
        if (e.target.id === 'lcForm') {
            e.preventDefault();
            st.texto = modal.querySelector('#lcTexto').value.trim();
            st.cidade = modal.querySelector('#lcCidade').value.trim();
            st.raio = Number(modal.querySelector('#lcRaio').value) || 150;
            buscar(false);
        } else if (e.target.id === 'lcNota') {
            e.preventDefault();
            const t = modal.querySelector('#lcNotaTexto').value.trim().slice(0, 400);
            const s = st.salvos.get(st.aberto);
            if (!t || !s) return;
            const notas = [...(s.notas || []), { em: new Date().toISOString(), por: auth.currentUser?.email || '', texto: t }].slice(-60);
            salvarLead(st.aberto, { notas }, 'Anotado.');
        } else if (e.target.id === 'lcNovo') {
            e.preventDefault();
            criarLeadManual(e.target);
        }
    });
    modal.addEventListener('change', e => {
        const campo = e.target.closest('[data-lc-campo]');
        if (campo && st.aberto) {
            const k = campo.dataset.lcCampo;
            if (k === 'status' && !campo.value) return;
            salvarLead(st.aberto, { [k]: k === 'contato' ? campo.value.slice(0, 80) : campo.value });
            return;
        }
        const cr = e.target.closest('[data-lc-cred]');
        if (cr && st.aberto) {
            const s = st.salvos.get(st.aberto);
            const v = cr.dataset.lcCred === 'score' ? (cr.value === '' ? null : Math.max(0, Math.min(1000, Number(cr.value)))) : cr.value.slice(0, 160);
            salvarLead(st.aberto, { credito: { ...(s?.credito || {}), [cr.dataset.lcCred]: v, em: new Date().toISOString(), por: auth.currentUser?.email || '' } });
            return;
        }
        const cfg = e.target.closest('[data-lc-cfg]');
        if (cfg) {
            const k = cfg.dataset.lcCfg;
            salvarCfg({ [k]: k === 'idaVolta' ? cfg.checked : Math.max(0, Number(String(cfg.value).replace(',', '.')) || 0) });
            return;
        }
        if (e.target.id === 'lcRaio') st.raio = Number(e.target.value) || 150;
    });
    modal.addEventListener('input', e => {
        if (e.target.id === 'lcFiltro') {
            st.filtro = e.target.value;
            const pos = e.target.selectionStart;
            ctx.render();
            const f = modal.querySelector('#lcFiltro');
            if (f) { f.focus(); f.setSelectionRange(pos, pos); }
        }
    });
}
