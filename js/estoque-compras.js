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

// Código que liga a resposta do fornecedor a este pedido (para o comparativo).
function refPedido() {
    if (!st.ref) { const d = new Date(); st.ref = `PC-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`; }
    return st.ref;
}

function validar() {
    const semQtd = [...st.sel.values()].filter(x => !(Number(x.qtd) > 0)).length;
    if (semQtd) { aviso(`${semQtd} item(ns) marcado(s) sem quantidade. Informe a quantidade (campo em vermelho) ou desmarque.`); return false; }
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

function baixarArquivo(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const nomeArquivo = (c, ext) => `pedido-compra${c.numero ? '-' + c.numero : ''}${c.fornecedor ? '-' + c.fornecedor : ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase().replace(/-+/g, '-') + '.' + ext;

// Formulário que o fornecedor abre no celular/computador, preenche os preços (o total soma sozinho)
// e devolve pelo WhatsApp ou salva em PDF. Arquivo único, funciona sem internet.
window.pcBaixarFormulario = function() {
    if (!validar()) return;
    const e = window.dadosSerrariaEmitente || {};
    const c = dadosCabecalho();
    const itensJs = linhasPedido().map(x => ({ nome: x.i.nome, cod: x.i.codigoProduto || '', qtd: Number(x.qtd), un: unidade(x.i), obs: x.obs || '' }));
    const zap = (String(e.contato || '').match(/\d/g) || []).join('');
    const zapNum = zap.length >= 10 ? (zap.startsWith('55') ? zap : '55' + zap) : '';
    const dados = { empresa: e.nome || e.nomeFantasia || '', fantasia: e.nomeFantasia || '', cnpj: e.cnpj || '', end: [e.logradouro, e.numero].filter(Boolean).join(', ') + (e.cidade ? ' · ' + e.cidade : ''), contato: e.contato || '', email: e.email || '', zap: zapNum,
        ref: refPedido(), numero: c.numero, fornecedor: c.fornecedor, prazo: c.prazo ? new Date(c.prazo + 'T12:00:00').toLocaleDateString('pt-BR') : '', obs: c.obs, data: new Date().toLocaleDateString('pt-BR'), itens: itensJs };
    const json = JSON.stringify(dados).replace(/</g, '\\u003c');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orçamento - ${esc(dados.fantasia || dados.empresa)}</title>
<style>
*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;background:#f4f1ea}
.wrap{max-width:900px;margin:0 auto;padding:16px}
.card{background:#fff;border:1px solid #e5dccb;border-radius:12px;padding:16px;margin-bottom:12px}
h1{font-size:20px;margin:0 0 2px}small,.muted{color:#64748b}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;text-transform:uppercase;color:#475569}
input,textarea{font:inherit;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;width:100%}
input:focus,textarea:focus{outline:3px solid #99f6e4;border-color:#0f766e}
.item{display:grid;grid-template-columns:minmax(0,1fr) 110px 130px 120px;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #f1ece1}
.item:last-child{border-bottom:0}.item b{display:block}.qtd{text-align:right;white-space:nowrap}.tot{text-align:right;font-weight:800;white-space:nowrap}
.head{font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;padding-bottom:6px;border-bottom:2px solid #e5dccb}
.total{display:flex;justify-content:space-between;font-size:18px;font-weight:800;margin-top:10px}
.acoes{display:flex;gap:10px;flex-wrap:wrap}
button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:12px 16px;cursor:pointer}
.zap{background:#16a34a;color:#fff}.pdf{background:#1f2937;color:#fff}
.aviso{color:#b91c1c;font-weight:600;min-height:1.2em}
@media(max-width:640px){.item{grid-template-columns:1fr 1fr}.item>div:first-child{grid-column:1/-1}.head{display:none}.qtd,.tot{text-align:left}}
@media print{body{background:#fff}.acoes,.aviso,.dica{display:none}.card{border:0;padding:6px 0}input,textarea{border:0;padding:0}}
</style></head><body><div class="wrap">
<div class="card"><h1>Orçamento solicitado${dados.numero ? ' · Pedido nº ' + esc(dados.numero) : ''}</h1>
<div><b>${esc(dados.empresa)}</b>${dados.cnpj ? ' · CNPJ ' + esc(dados.cnpj) : ''}</div>
<small>${esc(dados.end)}${dados.contato ? ' · ' + esc(dados.contato) : ''}${dados.email ? ' · ' + esc(dados.email) : ''}</small>
<p class="muted" style="margin:8px 0 0">Data: ${esc(dados.data)}${dados.prazo ? ' · Precisamos receber até ' + esc(dados.prazo) : ''}${dados.obs ? '<br>Obs.: ' + esc(dados.obs) : ''}</p>
<p class="dica" style="margin:10px 0 0;padding:8px 10px;background:#ecfdf5;border-radius:8px">Preencha o <b>preço unitário</b> de cada item e os dados abaixo. O total é calculado sozinho. Depois toque em <b>Enviar resposta pelo WhatsApp</b>.</p></div>
<div class="card"><div class="grid">
<label>Empresa (fornecedor)<input id="forn" value="${esc(dados.fornecedor)}" autocomplete="organization"></label>
<label>Vendedor / contato<input id="vend" autocomplete="name"></label>
<label>Prazo de entrega<input id="prazo" placeholder="Ex.: 5 dias úteis"></label>
<label>Condição de pagamento<input id="pagto" placeholder="Ex.: 28 dias boleto"></label>
<label>Validade da proposta<input id="valid" placeholder="Ex.: 10 dias"></label>
<label>Frete<input id="frete" placeholder="CIF / FOB / valor"></label>
</div></div>
<div class="card"><div class="item head"><div>Item</div><div class="qtd">Quantidade</div><div>Preço unit. (R$)</div><div class="tot">Total</div></div><div id="itens"></div>
<div class="total"><span>Total geral</span><span id="totalGeral">R$ 0,00</span></div>
<label style="margin-top:12px">Observações do fornecedor<textarea id="obsf" rows="2"></textarea></label></div>
<p class="aviso" id="aviso" role="status"></p>
<div class="acoes"><button class="zap" id="btnZap">Enviar resposta pelo WhatsApp</button><button class="pdf" onclick="window.print()">Salvar em PDF / imprimir</button></div>
</div>
<script>
const D=${json};
const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=s=>{s=String(s||'').trim();if(!s)return 0;s=s.replace(/[^0-9,.-]/g,'');if(s.includes(','))s=s.replace(/\\./g,'').replace(',','.');return Number(s)||0};
const box=document.getElementById('itens');
box.innerHTML=D.itens.map((it,i)=>'<div class="item"><div><b>'+it.nome.replace(/[<&>]/g,'')+'</b>'+(it.cod?'<small>Cód. '+it.cod.replace(/[<&>]/g,'')+'</small> ':'')+(it.obs?'<small>'+it.obs.replace(/[<&>]/g,'')+'</small>':'')+'</div><div class="qtd">'+it.qtd.toLocaleString('pt-BR')+' '+it.un+'</div><div><input inputmode="decimal" data-i="'+i+'" class="preco" placeholder="0,00" aria-label="Preço unitário de '+it.nome.replace(/"/g,'')+'"></div><div class="tot" id="t'+i+'">—</div></div>').join('');
function calc(){let g=0;document.querySelectorAll('.preco').forEach(inp=>{const i=+inp.dataset.i,p=num(inp.value),t=p*D.itens[i].qtd;g+=t;document.getElementById('t'+i).textContent=p?fmt(t):'—'});document.getElementById('totalGeral').textContent=fmt(g);return g}
box.addEventListener('input',calc);
document.getElementById('btnZap').onclick=()=>{
 const v=id=>document.getElementById(id).value.trim();
 const precos=[...document.querySelectorAll('.preco')].map(x=>num(x.value));
 if(!precos.some(p=>p>0)){document.getElementById('aviso').textContent='Informe o preço de pelo menos um item.';return}
 const g=calc();
 const linhas=D.itens.map((it,i)=>(i+1)+'. '+it.nome+' — '+it.qtd.toLocaleString('pt-BR')+' '+it.un+' × '+(precos[i]?fmt(precos[i]):'sem preço')+(precos[i]?' = '+fmt(precos[i]*it.qtd):''));
 const txt=['*ORÇAMENTO'+(D.numero?' – Pedido nº '+D.numero:'')+'*','Ref: '+D.ref,'Fornecedor: '+(v('forn')||'-')+(v('vend')?' ('+v('vend')+')':''),'',...linhas,'','*Total: '+fmt(g)+'*','Prazo de entrega: '+(v('prazo')||'-'),'Pagamento: '+(v('pagto')||'-'),'Validade: '+(v('valid')||'-'),'Frete: '+(v('frete')||'-'),v('obsf')?'Obs.: '+v('obsf'):''].filter(l=>l!==null).join('\\n');
 window.open('https://wa.me/'+D.zap+'?text='+encodeURIComponent(txt),'_blank');
};
</script></body></html>`;
    baixarArquivo(nomeArquivo(c, 'html'), html, 'text/html;charset=utf-8');
    aviso('Formulário baixado. Envie esse arquivo ao fornecedor (WhatsApp ou e-mail): ele abre, preenche os preços e responde.', true);
    salvarHistorico('formulário');
};

// Planilha que abre no Excel/LibreOffice/Google Planilhas com coluna de preço e total com fórmula.
window.pcBaixarPlanilha = function() {
    if (!validar()) return;
    const e = window.dadosSerrariaEmitente || {};
    const c = dadosCabecalho();
    const linhas = linhasPedido();
    const ini = 8;
    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="t"><Font ss:Bold="1" ss:Size="14"/></Style><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/></Style>
<Style ss:ID="m"><NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/></Style><Style ss:ID="p"><NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/><Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Orçamento"><Table><Column ss:Width="30"/><Column ss:Width="260"/><Column ss:Width="70"/><Column ss:Width="40"/><Column ss:Width="100"/><Column ss:Width="110"/><Column ss:Width="200"/>
<Row><Cell ss:StyleID="t"><Data ss:Type="String">PEDIDO DE ORÇAMENTO${c.numero ? ' Nº ' + esc(c.numero) : ''}</Data></Cell></Row>
<Row><Cell ss:MergeAcross="6"><Data ss:Type="String">${esc(e.nome || '')} ${e.cnpj ? '· CNPJ ' + esc(e.cnpj) : ''} · ${esc(e.contato || '')} ${esc(e.email || '')}</Data></Cell></Row>
<Row><Cell ss:MergeAcross="6"><Data ss:Type="String">Data: ${new Date().toLocaleDateString('pt-BR')}${c.prazo ? ' · Entrega até ' + new Date(c.prazo + 'T12:00:00').toLocaleDateString('pt-BR') : ''}${c.obs ? ' · ' + esc(c.obs) : ''}</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">Fornecedor:</Data></Cell><Cell><Data ss:Type="String">${esc(c.fornecedor)}</Data></Cell></Row>
<Row><Cell ss:MergeAcross="6"><Data ss:Type="String">Preencha a coluna amarela (preço unitário). O total calcula sozinho.</Data></Cell></Row>
<Row/>
<Row>${['#', 'Item', 'Qtd', 'Un', 'Preço unit.', 'Total', 'Obs.'].map(h => `<Cell ss:StyleID="h"><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
${linhas.map((x, n) => `<Row><Cell><Data ss:Type="Number">${n + 1}</Data></Cell><Cell><Data ss:Type="String">${esc(x.i.nome)}</Data></Cell><Cell><Data ss:Type="Number">${Number(x.qtd)}</Data></Cell><Cell><Data ss:Type="String">${esc(unidade(x.i))}</Data></Cell><Cell ss:StyleID="p"/><Cell ss:StyleID="m" ss:Formula="=RC[-3]*RC[-1]"><Data ss:Type="Number">0</Data></Cell><Cell><Data ss:Type="String">${esc(x.obs || '')}</Data></Cell></Row>`).join('')}
<Row><Cell/><Cell ss:StyleID="h"><Data ss:Type="String">TOTAL</Data></Cell><Cell/><Cell/><Cell/><Cell ss:StyleID="m" ss:Formula="=SUM(R${ini}C:R${ini + linhas.length - 1}C)"><Data ss:Type="Number">0</Data></Cell></Row>
<Row/>${['Prazo de entrega:', 'Condição de pagamento:', 'Validade da proposta:', 'Frete:'].map(t => `<Row><Cell/><Cell><Data ss:Type="String">${t}</Data></Cell><Cell ss:StyleID="p" ss:MergeAcross="2"/></Row>`).join('')}
</Table></Worksheet></Workbook>`;
    baixarArquivo(nomeArquivo(c, 'xls'), xml, 'application/vnd.ms-excel');
    aviso('Planilha baixada. O fornecedor preenche a coluna amarela e devolve.', true);
    salvarHistorico('planilha');
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
    st.ref = '';
    ['pcFornecedor', 'pcContato', 'pcPrazo', 'pcObs', 'pcNumero'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    aviso('');
    renderLista();
};
window.pcSugerirBaixos = function() { sugerirBaixos(); renderLista(); };

function itensFiltrados() {
    const b = st.busca.toUpperCase();
    return itens()
        .filter(i => st.categoria === 'TODAS' || i.categoria === st.categoria)
        .filter(i => !b || String(i.nome).toUpperCase().includes(b) || String(i.codigoProduto || '').toUpperCase().includes(b))
        .filter(i => !st.soBaixos || baixo(i));
}
const qtdSugerida = i => (i && baixo(i)) ? Math.max(Math.ceil(minimo(i) - Number(i.quantidade || 0)), 1) : '';

// Marca todos os itens que estão aparecendo (respeita busca, categoria e "só no mínimo").
window.pcMarcarTodos = function() {
    itensFiltrados().forEach(i => { if (!st.sel.has(i.id)) st.sel.set(i.id, { qtd: qtdSugerida(i), obs: '' }); });
    renderLista();
};
window.pcDesmarcarTodos = function() {
    const visiveis = new Set(itensFiltrados().map(i => i.id));
    [...st.sel.keys()].forEach(id => { if (visiveis.has(id)) st.sel.delete(id); });
    renderLista();
};

function renderLista() {
    const box = document.getElementById('pcLista');
    if (!box) return;
    const lista = itensFiltrados()
        .sort((x, y) => Number(st.sel.has(y.id)) - Number(st.sel.has(x.id)) || Number(baixo(y)) - Number(baixo(x)) || String(x.nome).localeCompare(String(y.nome), 'pt-BR'));
    box.innerHTML = lista.length ? lista.map(i => {
        const s = st.sel.get(i.id);
        return `<div class="pc-item${s ? ' marcado' : ''}${s && !(Number(s.qtd) > 0) ? ' sem-qtd' : ''}${baixo(i) ? ' baixo' : ''}" data-id="${esc(i.id)}">
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
          <button type="button" class="btn-secondary pc-mini" onclick="window.pcMarcarTodos()"><i class="fa-solid fa-square-check" aria-hidden="true"></i> Marcar todos</button>
          <button type="button" class="btn-secondary pc-mini" onclick="window.pcDesmarcarTodos()"><i class="fa-regular fa-square" aria-hidden="true"></i> Desmarcar todos</button>
          <strong id="pcContagem"></strong>
        </div>
        <div id="pcLista" class="pc-lista"></div>
        <p id="pcAviso" class="pc-aviso" role="status" aria-live="polite"></p>
        <div class="pc-enviar">
          <button type="button" class="btn-primary" onclick="window.pcBaixarFormulario()" title="Arquivo que o fornecedor abre, preenche os preços e responde pelo WhatsApp"><i class="fa-solid fa-file-pen" aria-hidden="true"></i> Formulário para o fornecedor preencher</button>
          <button type="button" class="btn-secondary" onclick="window.pcBaixarPlanilha()"><i class="fa-solid fa-file-excel" aria-hidden="true"></i> Planilha Excel</button>
          <button type="button" class="btn-secondary" onclick="window.pcWhatsApp()"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Enviar texto por WhatsApp</button>
          <button type="button" class="btn-secondary" onclick="window.pcEmail()"><i class="fa-solid fa-envelope" aria-hidden="true"></i> Enviar por e-mail</button>
          <button type="button" class="btn-secondary" onclick="window.pcImprimir()"><i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir / PDF</button>
          <button type="button" class="btn-secondary" onclick="window.pcCopiar()"><i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar texto</button>
        </div>
      </div>
      <div class="glass-panel pc-painel">
        <h3 class="pc-h3"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i> Respostas dos fornecedores e comparativo de preços</h3>
        <p class="dm-dica">Quando o fornecedor responder pelo WhatsApp, copie a mensagem inteira e cole aqui. Repita para cada fornecedor do mesmo pedido.</p>
        <textarea id="pcRespostaTexto" rows="4" class="pc-resposta" placeholder="Cole aqui a mensagem do fornecedor (começa com *ORÇAMENTO*)"></textarea>
        <div class="pc-enviar"><button type="button" class="btn-primary" onclick="window.pcRegistrarResposta()"><i class="fa-solid fa-paste" aria-hidden="true"></i> Registrar resposta</button><span id="pcRespostaAviso" role="status" class="pc-resp-aviso"></span></div>
        <div id="pcComparativo" class="pc-comparativo"></div>
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
            if (e.target.checked) { const it = itens().find(i => i.id === id); st.sel.set(id, { qtd: qtdSugerida(it), obs: '' }); }
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
        st.sel.set(id, atual);
        row.classList.toggle('sem-qtd', !(Number(atual.qtd) > 0));
        row.classList.toggle('marcado', st.sel.has(id));
        const ck = row.querySelector('[data-acao="marcar"]'); if (ck) ck.checked = st.sel.has(id);
        const cont = document.getElementById('pcContagem'); if (cont) cont.textContent = `${linhasPedido().length} item(ns) no pedido`;
    });
}

// ---------- Respostas dos fornecedores e comparativo ----------
const COT_KEY = 'orquestra_cotacoes_v1';
let cotacoes = lerJSON(COT_KEY, []);
const numBR = s => { s = String(s || '').replace(/[^0-9,.-]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return Number(s) || 0; };
const normNome = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// Lê a mensagem que o formulário manda pelo WhatsApp (também aceita texto parecido digitado à mão).
export function lerRespostaFornecedor(texto) {
    const linhas = String(texto || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\*/g, '').trim()).filter(Boolean);
    const campo = rot => { const l = linhas.find(x => new RegExp('^' + rot + '\\s*:', 'i').test(x)); return l ? l.replace(/^[^:]*:\s*/, '').trim() : ''; };
    const itensR = [];
    linhas.forEach(l => {
        const m = l.match(/^\d+[.)-]\s*(.+?)\s+[—–-]\s+([\d.,]+)\s*([A-Za-zÀ-ú]*)\s*[×xX*]\s*(?:R\$\s*)?([\d.,]+|sem preço)/);
        if (m) itensR.push({ nome: m[1].trim(), qtd: numBR(m[2]), un: m[3] || '', preco: /sem/i.test(m[4]) ? 0 : numBR(m[4]) });
    });
    let fornecedor = campo('Fornecedor'), vendedor = '';
    const mv = fornecedor.match(/^(.*?)\s*\((.*)\)\s*$/); if (mv) { fornecedor = mv[1]; vendedor = mv[2]; }
    return { ref: campo('Ref'), fornecedor: fornecedor.replace(/^-$/, ''), vendedor, prazo: campo('Prazo de entrega'), pagamento: campo('Pagamento'), validade: campo('Validade'), frete: campo('Frete'), obs: campo('Obs\\.?'), itens: itensR };
}

async function salvarCotacao(c) {
    cotacoes = [c, ...cotacoes.filter(x => x.id !== c.id)];
    gravarJSON(COT_KEY, cotacoes);
    try { await window.FS?.setDoc('estoque_config', c.id, { ...c, tipo: 'COTACAO_FORNECEDOR' }); } catch (err) { console.warn('Cotação salva só neste computador:', err); }
}
async function carregarCotacoesNuvem() {
    try {
        const nuvem = (await window.FS.getCollection('estoque_config')).filter(x => x.tipo === 'COTACAO_FORNECEDOR');
        const mapa = new Map(cotacoes.map(c => [c.id, c]));
        nuvem.forEach(c => mapa.set(c.id, c));
        cotacoes = [...mapa.values()].sort((a, b) => String(b.recebidaEm).localeCompare(String(a.recebidaEm)));
        gravarJSON(COT_KEY, cotacoes);
    } catch (_) { /* fica com o que tem no computador */ }
}

window.pcRegistrarResposta = async function() {
    const ta = document.getElementById('pcRespostaTexto');
    const r = lerRespostaFornecedor(ta?.value);
    const msg = document.getElementById('pcRespostaAviso');
    if (!r.itens.length) { if (msg) msg.textContent = 'Não encontrei itens com preço. Cole a mensagem inteira que o fornecedor mandou.'; return; }
    if (!r.fornecedor) r.fornecedor = (prompt('Qual o nome do fornecedor?') || '').trim().toUpperCase();
    if (!r.fornecedor) return;
    const c = { id: `cotacao_${Date.now()}`, ...r, ref: r.ref || st.ref || 'SEM-REF', fornecedor: r.fornecedor.toUpperCase(), recebidaEm: new Date().toISOString(),
        total: r.itens.reduce((s, i) => s + i.qtd * i.preco, 0) };
    await salvarCotacao(c);
    if (ta) ta.value = '';
    if (msg) msg.textContent = `Cotação de ${c.fornecedor} registrada (${c.itens.filter(i => i.preco > 0).length} item(ns) com preço).`;
    st.refComparar = c.ref;
    renderComparativo();
};
window.pcExcluirCotacao = async function(id) {
    if (!confirm('Excluir esta cotação do comparativo?')) return;
    cotacoes = cotacoes.filter(c => c.id !== id);
    gravarJSON(COT_KEY, cotacoes);
    try { await window.FS?.deleteDoc('estoque_config', id); } catch (_) { /* sem permissão de exclusão: some só daqui */ }
    renderComparativo();
};

function renderComparativo() {
    const el = document.getElementById('pcComparativo');
    if (!el) return;
    const refs = [...new Set(cotacoes.map(c => c.ref))];
    if (!refs.length) { el.innerHTML = '<p class="dm-vazio">Nenhuma resposta registrada ainda. Quando o fornecedor responder pelo WhatsApp, copie a mensagem e cole acima.</p>'; return; }
    if (!refs.includes(st.refComparar)) st.refComparar = refs[0];
    // última cotação de cada fornecedor para o pedido escolhido
    const doPedido = cotacoes.filter(c => c.ref === st.refComparar);
    const porForn = new Map();
    doPedido.forEach(c => { if (!porForn.has(c.fornecedor)) porForn.set(c.fornecedor, c); });
    const forn = [...porForn.values()];
    const nomes = new Map();
    forn.forEach(c => c.itens.forEach(i => { const k = normNome(i.nome); if (!nomes.has(k)) nomes.set(k, { nome: i.nome, qtd: i.qtd, un: i.un }); }));
    const preco = (c, k) => { const it = c.itens.find(i => normNome(i.nome) === k); return it && it.preco > 0 ? it.preco : null; };
    let melhorTotal = 0;
    const linhasHtml = [...nomes.entries()].map(([k, it]) => {
        const precos = forn.map(c => preco(c, k));
        const validos = precos.filter(p => p != null);
        const min = validos.length ? Math.min(...validos) : null;
        if (min != null) melhorTotal += min * it.qtd;
        return `<tr><td><b>${esc(it.nome)}</b><small>${fmtN(it.qtd)} ${esc(it.un)}</small></td>${precos.map(p => `<td class="num ${p != null && p === min && validos.length > 1 ? 'pc-melhor' : ''}">${p != null ? fmtR(p) : '<span class="dm-sem">—</span>'}</td>`).join('')}</tr>`;
    }).join('');
    const totais = forn.map(c => c.itens.reduce((s, i) => s + (i.preco > 0 ? i.preco * i.qtd : 0), 0));
    const cotados = forn.map(c => c.itens.filter(i => i.preco > 0).length);
    const menorTotal = Math.min(...totais.filter((t, i) => cotados[i] === nomes.size).concat([Infinity]));
    el.innerHTML = `
      <div class="pc-comp-topo"><label>Pedido <select id="pcRefComparar">${refs.map(r => `<option ${r === st.refComparar ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
        <small>${forn.length} fornecedor(es) responderam · verde = menor preço do item</small></div>
      <div class="dm-tabela-wrap"><table class="dm-tabela pc-comp" data-no-column-resize="true">
        <thead><tr><th>Item</th>${forn.map(c => `<th class="num">${esc(c.fornecedor)}<small>${new Date(c.recebidaEm).toLocaleDateString('pt-BR')} <button type="button" class="pc-x" title="Excluir esta cotação" onclick="window.pcExcluirCotacao('${esc(c.id)}')">×</button></small></th>`).join('')}</tr></thead>
        <tbody>${linhasHtml}</tbody>
        <tfoot>
          <tr><td><b>Total</b></td>${forn.map((c, i) => `<td class="num ${totais[i] === menorTotal ? 'pc-melhor' : ''}"><b>${fmtR(totais[i])}</b>${cotados[i] < nomes.size ? `<small class="dm-alerta">${nomes.size - cotados[i]} item(ns) sem preço</small>` : ''}</td>`).join('')}</tr>
          <tr><td>Prazo</td>${forn.map(c => `<td class="num"><small>${esc(c.prazo || '-')}</small></td>`).join('')}</tr>
          <tr><td>Pagamento</td>${forn.map(c => `<td class="num"><small>${esc(c.pagamento || '-')}</small></td>`).join('')}</tr>
          <tr><td>Frete</td>${forn.map(c => `<td class="num"><small>${esc(c.frete || '-')}</small></td>`).join('')}</tr>
          <tr><td>Validade</td>${forn.map(c => `<td class="num"><small>${esc(c.validade || '-')}</small></td>`).join('')}</tr>
        </tfoot></table></div>
      ${forn.length > 1 ? `<p class="pc-melhor-comb">Comprando cada item no fornecedor mais barato: <b>${fmtR(melhorTotal)}</b>${isFinite(menorTotal) ? ` · economia de ${fmtR(menorTotal - melhorTotal)} sobre o menor orçamento completo` : ''}</p>` : ''}`;
    el.querySelector('#pcRefComparar')?.addEventListener('change', e => { st.refComparar = e.target.value; renderComparativo(); });
}

window.renderPedidoCompraEstoque = function() {
    instalar();
    if (!st.iniciado) { sugerirBaixos(); st.iniciado = true; }
    renderLista();
    renderHistorico();
    renderComparativo();
    carregarCotacoesNuvem().then(renderComparativo);
};
