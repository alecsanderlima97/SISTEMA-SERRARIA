// Formulário de orçamento que o fornecedor preenche (preço por item, total automático) e devolve pelo WhatsApp.
// Usado tanto no arquivo baixado quanto na página online /orcamento (dados no #hash do link, não vão ao servidor).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const limpo = v => String(v ?? '').replace(/[<>&"'`]/g, '').slice(0, 300);
export function htmlFormularioFornecedor(entrada) {
    // dados podem vir de um link (#hash): normaliza tudo antes de montar a página
    const e = entrada || {};
    const dados = {
        empresa: limpo(e.empresa), fantasia: limpo(e.fantasia), cnpj: limpo(e.cnpj), end: limpo(e.end), contato: limpo(e.contato),
        email: limpo(e.email), zap: String(e.zap || '').replace(/\D/g, '').slice(0, 15), ref: limpo(e.ref), numero: limpo(e.numero),
        fornecedor: limpo(e.fornecedor), prazo: limpo(e.prazo), obs: limpo(e.obs), data: limpo(e.data),
        itens: (Array.isArray(e.itens) ? e.itens : []).slice(0, 300).map(it => ({
            nome: limpo(it?.nome), cod: limpo(it?.cod), qtd: Number(it?.qtd) || 0, un: limpo(it?.un).slice(0, 12), obs: limpo(it?.obs)
        }))
    };
    const json = JSON.stringify(dados).replace(/</g, '\\u003c');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
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
button,.btn{font:inherit;font-weight:700;border:0;border-radius:10px;padding:12px 16px;cursor:pointer;text-decoration:none;display:inline-block;text-align:center}
.acoes>*{flex:1 1 200px}
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
<noscript><p class="aviso">Este formulário precisa abrir no navegador (Chrome ou Safari). Toque em compartilhar/“Abrir no navegador” e tente de novo.</p></noscript>
<div class="acoes"><a class="zap btn" id="btnZap" href="#" role="button">Enviar resposta pelo WhatsApp</a><button class="pdf" type="button" id="btnCopiar">Copiar resposta</button><button class="pdf" type="button" onclick="window.print()">Salvar em PDF / imprimir</button></div>
<p class="dica" id="alt" hidden style="margin-top:10px">Não abriu o WhatsApp? <a id="btnZapWeb" href="#" target="_blank" rel="noopener">Toque aqui</a> ou use <b>Copiar resposta</b> e cole na conversa.</p>
</div>
<script>
const D=${json};
const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=s=>{s=String(s||'').trim();if(!s)return 0;s=s.replace(/[^0-9,.-]/g,'');if(s.includes(','))s=s.replace(/\\./g,'').replace(',','.');return Number(s)||0};
const box=document.getElementById('itens');
box.innerHTML=D.itens.map((it,i)=>'<div class="item"><div><b>'+it.nome.replace(/[<&>]/g,'')+'</b>'+(it.cod?'<small>Cód. '+it.cod.replace(/[<&>]/g,'')+'</small> ':'')+(it.obs?'<small>'+it.obs.replace(/[<&>]/g,'')+'</small>':'')+'</div><div class="qtd">'+it.qtd.toLocaleString('pt-BR')+' '+it.un+'</div><div><input inputmode="decimal" data-i="'+i+'" class="preco" placeholder="0,00" aria-label="Preço unitário de '+it.nome.replace(/"/g,'')+'"></div><div class="tot" id="t'+i+'">—</div></div>').join('');
function calc(){let g=0;document.querySelectorAll('.preco').forEach(inp=>{const i=+inp.dataset.i,p=num(inp.value),t=p*D.itens[i].qtd;g+=t;document.getElementById('t'+i).textContent=p?fmt(t):'—'});document.getElementById('totalGeral').textContent=fmt(g);return g}
box.addEventListener('input',calc);
const v=id=>document.getElementById(id).value.trim();
const movel=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function montar(){
 const precos=[...document.querySelectorAll('.preco')].map(x=>num(x.value));
 const g=calc();
 const linhas=D.itens.map((it,i)=>(i+1)+'. '+it.nome+' — '+it.qtd.toLocaleString('pt-BR')+' '+it.un+' × '+(precos[i]?fmt(precos[i]):'sem preço')+(precos[i]?' = '+fmt(precos[i]*it.qtd):''));
 const txt=['*ORÇAMENTO'+(D.numero?' – Pedido nº '+D.numero:'')+'*','Ref: '+D.ref,'Fornecedor: '+(v('forn')||'-')+(v('vend')?' ('+v('vend')+')':''),'',...linhas,'','*Total: '+fmt(g)+'*','Prazo de entrega: '+(v('prazo')||'-'),'Pagamento: '+(v('pagto')||'-'),'Validade: '+(v('valid')||'-'),'Frete: '+(v('frete')||'-'),v('obsf')?'Obs.: '+v('obsf'):null].filter(l=>l!==null).join('\\n');
 return {txt,ok:precos.some(p=>p>0)};
}
function links(){
 const {txt}=montar(); const t=encodeURIComponent(txt); const ph=D.zap?('phone='+D.zap+'&'):'';
 document.getElementById('btnZap').href=movel?('whatsapp://send?'+ph+'text='+t):('https://wa.me/'+(D.zap||'')+'?text='+t);
 document.getElementById('btnZapWeb').href='https://api.whatsapp.com/send?'+ph+'text='+t;
}
document.addEventListener('input',links);links();
document.getElementById('btnZap').addEventListener('click',e=>{
 const r=montar();
 if(!r.ok){e.preventDefault();document.getElementById('aviso').textContent='Informe o preço de pelo menos um item.';return}
 document.getElementById('aviso').textContent='';links();
 setTimeout(()=>{document.getElementById('alt').hidden=false},1500);
});
document.getElementById('btnCopiar').addEventListener('click',async()=>{
 const r=montar(); if(!r.ok){document.getElementById('aviso').textContent='Informe o preço de pelo menos um item.';return}
 try{await navigator.clipboard.writeText(r.txt);document.getElementById('aviso').textContent='Resposta copiada. Cole na conversa do WhatsApp.'}
 catch(_){const ta=document.createElement('textarea');ta.value=r.txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();document.getElementById('aviso').textContent='Resposta copiada. Cole na conversa do WhatsApp.'}
});
</script></body></html>`;
}

export function codificarPedidoLink(dados) {
    const bytes = new TextEncoder().encode(JSON.stringify(dados));
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodificarPedidoLink(texto) {
    const b64 = String(texto || '').replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
}
