// Estoque > Pedido de Compra: monta um pedido para o fornecedor a partir dos itens do estoque.
// Itens no mínimo já vêm marcados com a quantidade que falta. Sai por impressão/PDF, WhatsApp,
// e-mail ou texto copiado. Os pedidos enviados ficam guardados neste navegador (histórico).

const HIST_KEY = 'orquestra_pedidos_compra_v1';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
const fmtR = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const lerJSON = (k, pad) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? pad; } catch (_) { return pad; } };
const gravarJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* sem armazenamento */ } };

const st = { sel: new Map(), busca: '', categoria: 'TODAS', soBaixos: false, iniciado: false };

function itens() {
    return lerJSON('orquestra_estoque', []).filter(i => i && i.ativo !== false && i.nome);
}
const unidade = i => (i.categoria === 'DIESEL' || i.categoria === 'LUBRIFICANTES') ? 'L' : (i.unidadeCompra || 'UN');
const minimo = i => i.limite_alerta != null && i.limite_alerta !== '' ? Number(i.limite_alerta) : (i.categoria === 'DIESEL' ? 1000 : i.categoria === 'LUBRIFICANTES' ? 40 : 3);
const baixo = i => Number(i.quantidade || 0) <= minimo(i);

function sugerirBaixos() {
    itens().filter(baixo).forEach(i => {
        if (st.sel.has(i.id)) return;
        const falta = Math.max(minimo(i) - Number(i.quantidade || 0), 0);
        st.sel.set(i.id, { qtd: Math.ceil(falta > 0 ? falta : minimo(i)), obs: '' });
    });
}

function linhasPedido() {
    const mapa = new Map(itens().map(i => [i.id, i]));
    return [...st.sel.entries()].map(([id, s]) => ({ i: mapa.get(id), ...s })).filter(x => x.i && Number(x.qtd) > 0);
}

function dadosCabecalho() {
    const v = id => (document.getElementById(id)?.value || '').trim();
    return { fornecedor: v('pcFornecedor'), contato: v('pcContato'), prazo: v('pcPrazo'), obs: v('pcObs'), numero: v('pcNumero') };
}

function textoPedido() {
    const e = window.dadosSerrariaEmitente || {};
    const c = dadosCabecalho();
    const linhas = linhasPedido();
    return [
        `*PEDIDO DE COMPRA${c.numero ? ` Nº ${c.numero}` : ''}*`,
        `${e.nomeFantasia || e.nome || ''}${e.cnpj ? ` · CNPJ ${e.cnpj}` : ''}`,
        c.fornecedor ? `Fornecedor: ${c.fornecedor}` : '',
        `Data: ${new Date().toLocaleDateString('pt-BR')}${c.prazo ? ` · Entrega até: ${new Date(c.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}`,
        '',
        ...linhas.map((x, n) => `${n + 1}. ${x.i.nome} — ${fmtN(x.qtd)} ${unidade(x.i)}${x.obs ? ` (${x.obs})` : ''}`),
        '',
        c.obs ? `Obs.: ${c.obs}` : '',
        'Por favor, enviar orçamento com preço unitário, prazo de entrega e condição de pagamento.',
        e.contato ? `Contato: ${e.contato}${e.email ? ` · ${e.email}` : ''}` : ''
    ].filter((l, idx, arr) => l !== '' || (arr[idx - 1] !== '' && idx > 0)).join('\n');
}

function validar() {
    if (!linhasPedido().length) { aviso('Marque pelo menos um item com quantidade.'); return false; }
    return true;
}
function aviso(t, ok = false) {
    const el = document.getElementById('pcAviso');
    if (el) { el.textContent = t; el.dataset.ok = ok ? '1' : ''; }
}

function salvarHistorico(meio) {
    const c = dadosCabecalho();
    const hist = lerJSON(HIST_KEY, []);
    hist.unshift({ id: Date.now(), data: new Date().toISOString(), meio, ...c, itens: linhasPedido().map(x => ({ nome: x.i.nome, qtd: Number(x.qtd), un: unidade(x.i), obs: x.obs })) });
    gravarJSON(HIST_KEY, hist.slice(0, 50));
    renderHistorico();
}

window.pcImprimir = function() {
    if (!validar()) return;
    const e = window.dadosSerrariaEmitente || {};
    const c = dadosCabecalho();
    const linhas = linhasPedido();
    const w = window.open('', '_blank');
    if (!w) { aviso('O navegador bloqueou a janela. Libere pop-ups para imprimir.'); return; }
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido de compra${c.numero ? ' ' + esc(c.numero) : ''}</title>
<style>body{font:13px Arial,sans-serif;color:#111;margin:28px}h1{font-size:20px;margin:0 0 4px}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}
.box{border:1px solid #bbb;border-radius:6px;padding:8px 10px;margin-bottom:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:6px 8px;text-align:left}th{background:#eee;font-size:11px;text-transform:uppercase}
td.n{text-align:right;white-space:nowrap}.pre{height:22px}.ass{margin-top:40px;display:flex;gap:40px}.ass div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:11px}small{color:#444}@media print{button{display:none}body{margin:12mm}}</style></head><body>
<div class="top"><div><h1>PEDIDO DE COMPRA${c.numero ? ` Nº ${esc(c.numero)}` : ''}</h1><small>Data: ${new Date().toLocaleDateString('pt-BR')}${c.prazo ? ` · Entrega até: ${new Date(c.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</small></div>
<div style="text-align:right"><b>${esc(e.nome || e.nomeFantasia || '')}</b><br><small>${e.cnpj ? 'CNPJ ' + esc(e.cnpj) + '<br>' : ''}${esc([e.logradouro, e.numero].filter(Boolean).join(', '))}${e.cidade ? ' · ' + esc(e.cidade) : ''}<br>${esc(e.contato || '')} ${esc(e.email || '')}</small></div></div>
<div class="box"><b>Fornecedor:</b> ${esc(c.fornecedor || '________________________________')}${c.contato ? ` · ${esc(c.contato)}` : ''}</div>
<table><thead><tr><th style="width:34px">#</th><th>Item</th><th style="width:110px">Quantidade</th><th style="width:120px">Preço unit. (R$)</th><th style="width:120px">Total (R$)</th></tr></thead><tbody>
${linhas.map((x, n) => `<tr><td>${n + 1}</td><td>${esc(x.i.nome)}${x.i.codigoProduto ? ` <small>(cód. ${esc(x.i.codigoProduto)})</small>` : ''}${x.obs ? `<br><small>${esc(x.obs)}</small>` : ''}</td><td class="n">${fmtN(x.qtd)} ${esc(unidade(x.i))}</td><td class="pre"></td><td class="pre"></td></tr>`).join('')}
</tbody></table>
${c.obs ? `<div class="box" style="margin-top:12px"><b>Observações:</b> ${esc(c.obs)}</div>` : ''}
<p><small>Favor informar preço unitário, prazo de entrega e condição de pagamento.</small></p>
<div class="ass"><div>Solicitante</div><div>Fornecedor</div></div>
<p style="margin-top:20px"><button onclick="window.print()">Imprimir / salvar PDF</button></p></body></html>`);
    w.document.close();
    setTimeout(() => { try { w.print(); } catch (_) { /* usuário imprime pelo botão */ } }, 300);
    salvarHistorico('impressão');
};

window.pcWhatsApp = function() {
    if (!validar()) return;
    const tel = (dadosCabecalho().contato.match(/\d/g) || []).join('');
    const num = tel.length >= 10 ? (tel.startsWith('55') ? tel : '55' + tel) : '';
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(textoPedido())}`, '_blank', 'noopener');
    salvarHistorico('WhatsApp');
};

window.pcEmail = function() {
    if (!validar()) return;
    const c = dadosCabecalho();
    const email = /\S+@\S+\.\S+/.test(c.contato) ? c.contato.match(/\S+@\S+\.\S+/)[0] : '';
    const assunto = `Pedido de compra${c.numero ? ' ' + c.numero : ''} - ${(window.dadosSerrariaEmitente || {}).nomeFantasia || ''}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(textoPedido().replace(/\*/g, ''))}`;
    salvarHistorico('e-mail');
};

window.pcCopiar = async function() {
    if (!validar()) return;
    try { await navigator.clipboard.writeText(textoPedido()); aviso('Pedido copiado. É só colar na conversa com o fornecedor.', true); salvarHistorico('copiado'); }
    catch (_) { aviso('Não consegui copiar. Use o WhatsApp ou a impressão.'); }
};

window.pcLimpar = function() {
    st.sel.clear();
    ['pcFornecedor', 'pcContato', 'pcPrazo', 'pcObs', 'pcNumero'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    aviso('');
    renderLista();
};
window.pcSugerirBaixos = function() { sugerirBaixos(); renderLista(); };

function renderLista() {
    const box = document.getElementById('pcLista');
    if (!box) return;
    const b = st.busca.toUpperCase();
    const lista = itens()
        .filter(i => st.categoria === 'TODAS' || i.categoria === st.categoria)
        .filter(i => !b || String(i.nome).toUpperCase().includes(b) || String(i.codigoProduto || '').toUpperCase().includes(b))
        .filter(i => !st.soBaixos || baixo(i))
        .sort((x, y) => Number(st.sel.has(y.id)) - Number(st.sel.has(x.id)) || Number(baixo(y)) - Number(baixo(x)) || String(x.nome).localeCompare(String(y.nome), 'pt-BR'));
    box.innerHTML = lista.length ? lista.map(i => {
        const s = st.sel.get(i.id);
        return `<div class="pc-item${s ? ' marcado' : ''}${baixo(i) ? ' baixo' : ''}" data-id="${esc(i.id)}">
          <label class="pc-check"><input type="checkbox" ${s ? 'checked' : ''} data-acao="marcar" aria-label="Incluir ${esc(i.nome)}"></label>
          <div class="pc-nome"><b>${esc(i.nome)}</b><small>${esc(i.categoria || '-')} · saldo ${fmtN(i.quantidade)} ${esc(unidade(i))} · mín. ${fmtN(minimo(i))}${i.unitario ? ` · último ${fmtR(i.unitario)}` : ''}</small></div>
          <input type="number" min="0" step="any" inputmode="decimal" class="pc-qtd" data-acao="qtd" value="${s ? esc(s.qtd) : ''}" placeholder="Qtd" aria-label="Quantidade de ${esc(i.nome)}">
          <span class="pc-un">${esc(unidade(i))}</span>
          <input type="text" class="pc-obs" data-acao="obs" value="${s ? esc(s.obs) : ''}" placeholder="Obs. (marca, medida...)" aria-label="Observação de ${esc(i.nome)}">
        </div>`;
    }).join('') : '<p class="dm-vazio">Nenhum item encontrado.</p>';
    const n = linhasPedido().length;
    const cont = document.getElementById('pcContagem');
    if (cont) cont.textContent = `${n} item(ns) no pedido`;
}

function renderHistorico() {
    const el = document.getElementById('pcHistorico');
    if (!el) return;
    const hist = lerJSON(HIST_KEY, []);
    el.innerHTML = hist.length ? hist.slice(0, 15).map(h => `<details class="pc-hist"><summary><b>${new Date(h.data).toLocaleDateString('pt-BR')}</b> · ${esc(h.fornecedor || 'sem fornecedor')} · ${h.itens.length} item(ns) · ${esc(h.meio)}</summary>
      <ul>${h.itens.map(x => `<li>${esc(x.nome)} — ${fmtN(x.qtd)} ${esc(x.un)}${x.obs ? ` (${esc(x.obs)})` : ''}</li>`).join('')}</ul></details>`).join('') : '<p class="dm-vazio">Nenhum pedido enviado ainda.</p>';
}

function instalar() {
    const box = document.getElementById('subview-estoque-compras');
    if (!box || box.dataset.pronto) return;
    box.dataset.pronto = '1';
    const cats = [...new Set(itens().map(i => i.categoria).filter(Boolean))].sort();
    const fornecedores = [...new Set(lerJSON(HIST_KEY, []).map(h => h.fornecedor).filter(Boolean))];
    box.innerHTML = `
      <div class="glass-panel pc-painel">
        <div class="pc-topo"><h3><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Pedido de compra para fornecedor</h3>
          <div class="pc-acoes-topo"><button type="button" class="btn-secondary" onclick="window.pcSugerirBaixos()"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Marcar itens no mínimo</button><button type="button" class="btn-secondary" onclick="window.pcLimpar()">Limpar</button></div></div>
        <div class="pc-cab">
          <label>Fornecedor<input id="pcFornecedor" list="pcFornecedoresLista" class="text-uppercase-input" placeholder="Nome do fornecedor"></label>
          <datalist id="pcFornecedoresLista">${fornecedores.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
          <label>WhatsApp ou e-mail<input id="pcContato" placeholder="(15) 99999-9999 ou email@fornecedor.com"></label>
          <label>Entrega até<input id="pcPrazo" type="date"></label>
          <label>Nº do pedido<input id="pcNumero" placeholder="Opcional"></label>
          <label class="pc-cab-obs">Observações<input id="pcObs" placeholder="Condição de pagamento, local de entrega..."></label>
        </div>
        <div class="pc-filtros">
          <input type="search" id="pcBusca" placeholder="Buscar item..." aria-label="Buscar item">
          <select id="pcCategoria" aria-label="Categoria"><option value="TODAS">Todas as categorias</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>
          <label class="pc-so-baixos"><input type="checkbox" id="pcSoBaixos"> Só itens no mínimo</label>
          <strong id="pcContagem"></strong>
        </div>
        <div id="pcLista" class="pc-lista"></div>
        <p id="pcAviso" class="pc-aviso" role="status" aria-live="polite"></p>
        <div class="pc-enviar">
          <button type="button" class="btn-primary" onclick="window.pcWhatsApp()"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Enviar por WhatsApp</button>
          <button type="button" class="btn-primary" onclick="window.pcEmail()"><i class="fa-solid fa-envelope" aria-hidden="true"></i> Enviar por e-mail</button>
          <button type="button" class="btn-secondary" onclick="window.pcImprimir()"><i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir / PDF</button>
          <button type="button" class="btn-secondary" onclick="window.pcCopiar()"><i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar texto</button>
        </div>
      </div>
      <div class="glass-panel pc-painel"><h4 class="dm-sub" style="margin-top:0">Pedidos enviados (neste computador)</h4><div id="pcHistorico"></div></div>`;
    box.querySelector('#pcBusca').addEventListener('input', e => { st.busca = e.target.value.trim(); renderLista(); });
    box.querySelector('#pcCategoria').addEventListener('change', e => { st.categoria = e.target.value; renderLista(); });
    box.querySelector('#pcSoBaixos').addEventListener('change', e => { st.soBaixos = e.target.checked; renderLista(); });
    const lista = box.querySelector('#pcLista');
    lista.addEventListener('change', e => {
        const row = e.target.closest('.pc-item'); if (!row) return;
        const id = row.dataset.id, acao = e.target.dataset.acao;
        if (acao === 'marcar') {
            if (e.target.checked) { const it = itens().find(i => i.id === id); st.sel.set(id, { qtd: Math.max(Math.ceil(minimo(it) - Number(it?.quantidade || 0)), 1), obs: '' }); }
            else st.sel.delete(id);
            renderLista();
        }
    });
    lista.addEventListener('input', e => {
        const row = e.target.closest('.pc-item'); if (!row) return;
        const id = row.dataset.id, acao = e.target.dataset.acao;
        if (acao !== 'qtd' && acao !== 'obs') return;
        const atual = st.sel.get(id) || { qtd: '', obs: '' };
        atual[acao] = acao === 'qtd' ? e.target.value : e.target.value;
        if (acao === 'qtd' && !(Number(e.target.value) > 0) && !atual.obs) st.sel.delete(id); else st.sel.set(id, atual);
        row.classList.toggle('marcado', st.sel.has(id));
        const ck = row.querySelector('[data-acao="marcar"]'); if (ck) ck.checked = st.sel.has(id);
        const cont = document.getElementById('pcContagem'); if (cont) cont.textContent = `${linhasPedido().length} item(ns) no pedido`;
    });
}

window.renderPedidoCompraEstoque = function() {
    instalar();
    if (!st.iniciado) { sugerirBaixos(); st.iniciado = true; }
    renderLista();
    renderHistorico();
};
