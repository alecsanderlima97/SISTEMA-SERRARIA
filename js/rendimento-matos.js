// Relatorio "Rendimento por mato" (Conferencia de Carga de Tora).
// - Tora: soma das cargas conferidas por mato (m3, cargas, media por carga, custo por m3).
// - Producao: em cada dia do Controle de Producao com "Mato da tora serrada" preenchido, o volume
//   produzido no dia (saldo + vendido - inicio, por cubagem) vai para o mato daquele dia.
// - Aproveitamento = madeira produzida / tora recebida do mato (estimativa; so conta dias com mato informado).
// So le dados; nao grava nada.

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtR = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = d => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '-');
const hojeISO = () => new Date().toISOString().slice(0, 10);
const diasAtras = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const st = { inicio: diasAtras(90), fim: hojeISO(), ordem: 'aproveitamento', dados: null, erroProducao: '' };

function chaveCubagem(item) {
    const classe = String(item.classe || item.qualidade || '').replace(/\D/g, '') || '0';
    return `${classe}|${Number(item.espessura ?? item.esp ?? 0).toFixed(1)}|${Number(item.largura ?? item.larg ?? 0).toFixed(1)}|${Number(item.comprimento ?? item.compV ?? 0).toFixed(2)}`;
}

// volume produzido no dia de um relatorio do patio
function producaoDoDia(rel, vendidosPorData) {
    const mapa = new Map();
    const pegar = k => { if (!mapa.has(k)) mapa.set(k, { ini: 0, atual: 0, vend: 0 }); return mapa.get(k); };
    (Array.isArray(rel.estoqueInicialDia) ? rel.estoqueInicialDia : []).forEach(it => { pegar(chaveCubagem(it)).ini += Number(it.volume || 0); });
    (Array.isArray(rel.itens) ? rel.itens : []).forEach(it => { pegar(chaveCubagem(it)).atual += Number(it.volume || 0); });
    (vendidosPorData.get(rel.data) || []).forEach(p => { pegar(chaveCubagem(p)).vend += Number(p.m3VendaTotal || 0); });
    let total = 0;
    mapa.forEach(l => { total += Math.max(0, l.atual + l.vend - l.ini); });
    return total;
}

async function carregar() {
    const FS = window.FS;
    let entradas = Array.isArray(window.entradasAtuaisLista) && window.entradasAtuaisLista.length ? window.entradasAtuaisLista : null;
    if (!entradas) entradas = await FS.getCollection('entradas');
    let relatorios = [], romaneios = [];
    st.erroProducao = '';
    try {
        [relatorios, romaneios] = await Promise.all([FS.getCollection('patio_relatorios'), FS.getCollection('romaneios').catch(() => [])]);
    } catch (_) {
        st.erroProducao = 'Sem acesso ao Controle de Produção: o aproveitamento não pode ser calculado com este usuário.';
    }
    return { entradas, relatorios, romaneios };
}

function montar() {
    const { entradas, relatorios, romaneios } = st.dados;
    const noPeriodo = d => d && d >= st.inicio && d <= st.fim;
    const matos = new Map();
    const pegarMato = nome => {
        const k = norm(nome);
        if (!matos.has(k)) matos.set(k, { chave: k, nome: String(nome).toUpperCase().trim(), cargas: 0, m3: 0, custo: 0, empreiteiros: new Set(), primeira: '', ultima: '', produzido: 0, diasProducao: 0 });
        return matos.get(k);
    };
    entradas.forEach(en => {
        if (!en.mato || !noPeriodo(en.data)) return;
        const m = pegarMato(en.mato);
        m.cargas++;
        m.m3 += Number(en.volume || 0);
        m.custo += Number(en.totalEmpreiteiro || 0);
        if (en.empreiteiroNome) m.empreiteiros.add(en.empreiteiroNome);
        if (!m.primeira || en.data < m.primeira) m.primeira = en.data;
        if (!m.ultima || en.data > m.ultima) m.ultima = en.data;
    });
    // vendidos do patio por data (para descontar do saldo)
    const vendidosPorData = new Map();
    romaneios.forEach(rom => {
        const d = rom.logistica?.dataCarregamento || rom.data || '';
        (rom.pacotes || []).filter(p => p.origemPatio).forEach(p => {
            if (!vendidosPorData.has(d)) vendidosPorData.set(d, []);
            vendidosPorData.get(d).push(p);
        });
    });
    // um relatorio por dia (o mais recente)
    const porDia = new Map();
    relatorios.forEach(rel => {
        if (!noPeriodo(rel.data)) return;
        const atual = porDia.get(rel.data);
        if (!atual || String(rel.atualizadoEm || '') > String(atual.atualizadoEm || '')) porDia.set(rel.data, rel);
    });
    let semMato = 0, diasSemMato = 0;
    porDia.forEach(rel => {
        const vol = producaoDoDia(rel, vendidosPorData);
        const nomes = String(rel.matoSerrado || '').split(/\s*[\/+,;]\s*/).map(s => s.trim()).filter(Boolean);
        if (!nomes.length) { semMato += vol; diasSemMato++; return; }
        nomes.forEach(n => {
            const k = norm(n);
            const alvo = matos.get(k) || [...matos.values()].find(m => m.chave.includes(k) || k.includes(m.chave)) || pegarMato(n);
            alvo.produzido += vol / nomes.length;
            alvo.diasProducao++;
        });
    });
    const linhas = [...matos.values()].map(m => ({
        ...m,
        mediaCarga: m.cargas ? m.m3 / m.cargas : 0,
        custoM3: m.m3 ? m.custo / m.m3 : 0,
        aproveitamento: m.m3 > 0 && m.produzido > 0 ? (m.produzido / m.m3) * 100 : null,
        custoM3Serrado: m.produzido > 0 ? m.custo / m.produzido : null
    }));
    const ordem = {
        aproveitamento: (a, b) => (b.aproveitamento ?? -1) - (a.aproveitamento ?? -1) || b.m3 - a.m3,
        m3: (a, b) => b.m3 - a.m3,
        media: (a, b) => b.mediaCarga - a.mediaCarga,
        custo: (a, b) => (a.custoM3 || 1e9) - (b.custoM3 || 1e9)
    }[st.ordem];
    linhas.sort(ordem);
    return { linhas, semMato, diasSemMato, diasTotal: porDia.size };
}

function render() {
    const corpo = document.getElementById('rendMatoCorpo');
    if (!corpo || !st.dados) return;
    const R = montar();
    const comAprov = R.linhas.filter(l => l.aproveitamento != null);
    const melhor = comAprov[0] && st.ordem === 'aproveitamento' ? comAprov[0] : [...comAprov].sort((a, b) => b.aproveitamento - a.aproveitamento)[0];
    const totM3 = R.linhas.reduce((s, l) => s + l.m3, 0);
    const totProd = R.linhas.reduce((s, l) => s + l.produzido, 0);
    corpo.innerHTML = `
      <div class="rm-kpis">
        <div><span>Tora recebida</span><b>${fmtN(totM3)} m³</b><small>${R.linhas.reduce((s, l) => s + l.cargas, 0)} cargas</small></div>
        <div><span>Madeira produzida (com mato informado)</span><b>${fmtN(totProd)} m³</b><small>${R.diasTotal - R.diasSemMato} de ${R.diasTotal} dia(s) com mato</small></div>
        <div class="destaque"><span>Mato que mais rende</span><b>${melhor ? esc(melhor.nome) : '—'}</b><small>${melhor ? `${fmtN(melhor.aproveitamento, 1)}% de aproveitamento` : 'informe o mato no Controle de Produção'}</small></div>
      </div>
      ${st.erroProducao ? `<p class="rm-aviso">${esc(st.erroProducao)}</p>` : ''}
      ${R.diasSemMato ? `<p class="rm-aviso">${R.diasSemMato} dia(s) de produção sem o mato informado (${fmtN(R.semMato)} m³ ficaram fora do cálculo). Preencha <b>Mato da tora serrada</b> no Controle de Produção ou no Fluxo do Pátio.</p>` : ''}
      <div class="rm-tabela-wrap"><table class="rm-tabela">
        <thead><tr><th>Mato</th><th>Cargas</th><th>Tora (m³)</th><th>Média por carga</th><th>Custo / m³ tora</th><th>Madeira produzida</th><th>Aproveitamento</th><th>Custo / m³ serrado</th><th>Período</th></tr></thead>
        <tbody>${R.linhas.map((l, i) => `<tr${melhor && l.chave === melhor.chave ? ' class="melhor"' : ''}>
          <td><b>${esc(l.nome)}</b><small>${esc([...l.empreiteiros].join(', '))}</small></td>
          <td class="num">${l.cargas}</td>
          <td class="num">${fmtN(l.m3)}</td>
          <td class="num">${fmtN(l.mediaCarga)} m³</td>
          <td class="num">${l.custoM3 ? fmtR(l.custoM3) : '—'}</td>
          <td class="num">${l.produzido ? `${fmtN(l.produzido)} m³<small>${l.diasProducao} dia(s)</small>` : '—'}</td>
          <td class="num">${l.aproveitamento != null ? `<span class="rm-barra" style="--p:${Math.min(100, l.aproveitamento)}%">${fmtN(l.aproveitamento, 1)}%</span>` : '—'}</td>
          <td class="num">${l.custoM3Serrado ? fmtR(l.custoM3Serrado) : '—'}</td>
          <td>${dataBR(l.primeira)}${l.ultima && l.ultima !== l.primeira ? ` a ${dataBR(l.ultima)}` : ''}</td>
        </tr>`).join('') || '<tr><td colspan="9" class="rm-vazio">Nenhuma carga com mato no período.</td></tr>'}</tbody>
      </table></div>
      <p class="rm-nota">Aproveitamento = madeira produzida nos dias em que o mato foi serrado ÷ tora recebida do mato no período. É uma estimativa: fica mais preciso quanto mais dias tiverem o mato informado e quando a tora do período já foi serrada.</p>`;
}

function garantirModal() {
    let m = document.getElementById('modalRendimentoMatos');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modalRendimentoMatos';
    m.className = 'rm-overlay';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-labelledby', 'rmTitulo');
    m.innerHTML = `<div class="rm-janela">
      <header class="rm-topo">
        <div><h2 id="rmTitulo"><i class="fa-solid fa-tree" aria-hidden="true"></i> Rendimento por mato</h2><p>Qual mato está rendendo mais: tora recebida × madeira produzida.</p></div>
        <button type="button" class="rm-fechar" aria-label="Fechar" data-rm-fechar>×</button>
      </header>
      <div class="rm-filtros">
        <label>De <input type="date" id="rmInicio" value="${st.inicio}"></label>
        <label>Até <input type="date" id="rmFim" value="${st.fim}"></label>
        <label>Ordenar por <select id="rmOrdem">
          <option value="aproveitamento">Aproveitamento</option><option value="m3">Mais tora</option>
          <option value="media">Maior média por carga</option><option value="custo">Menor custo por m³</option>
        </select></label>
        <button type="button" class="btn-secondary" data-rm-imprimir><i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir</button>
      </div>
      <div id="rendMatoCorpo" class="rm-corpo"><p class="rm-vazio">Carregando…</p></div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => {
        if (e.target.closest('[data-rm-fechar]')) window.fecharRendimentoMatos();
        if (e.target.closest('[data-rm-imprimir]')) window.print();
    });
    m.addEventListener('change', e => {
        if (e.target.id === 'rmInicio') st.inicio = e.target.value || st.inicio;
        if (e.target.id === 'rmFim') st.fim = e.target.value || st.fim;
        if (e.target.id === 'rmOrdem') st.ordem = e.target.value;
        render();
    });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') window.fecharRendimentoMatos(); });
    return m;
}

window.abrirRendimentoMatos = async function() {
    const m = garantirModal();
    m.style.display = 'grid';
    document.body.classList.add('modal-open');
    m.querySelector('.rm-fechar')?.focus();
    try {
        st.dados = await carregar();
        render();
    } catch (error) {
        console.error('Rendimento por mato', error);
        document.getElementById('rendMatoCorpo').innerHTML = '<p class="rm-vazio">Não foi possível carregar as cargas. Verifique a conexão.</p>';
    }
};
window.fecharRendimentoMatos = function() {
    const m = document.getElementById('modalRendimentoMatos');
    if (m) m.style.display = 'none';
    document.body.classList.remove('modal-open');
};
