// Painéis de análise do Início para as abas Toras, Cavaco/Pó, Despesas, Financeiro e Estoque.
// Só lê dados que o dashboard já carregou (mais os fechamentos de empreiteiros, para saber o que já foi pago).

const fmtR = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtN = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const dataBR = iso => { const [a, m, d] = String(iso || '').slice(0, 10).split('-'); return d ? `${d}/${m}/${a}` : '-'; };
const difPct = (v, media) => {
    if (!(media > 0) || !(v > 0)) return '';
    const p = (v / media - 1) * 100;
    return `<span class="dm-dif ${p > 1 ? 'acima' : p < -1 ? 'abaixo' : ''}">${p > 0 ? '+' : ''}${fmtN(p, 1)}%</span>`;
};
let fechamentosCache = null;

async function fechamentosEmpreiteiros() {
    if (fechamentosCache) return fechamentosCache;
    try { fechamentosCache = (await window.FS.getCollection('fechamentos_salvos')).filter(f => f.tipo === 'EXTRACAO_EMPREITEIRO'); }
    catch (_) { fechamentosCache = []; }
    return fechamentosCache;
}

function painel() {
    let el = document.getElementById('dashboardAnaliseExtra');
    if (el) return el;
    const ref = document.getElementById('dashboardAnaliseMadeira') || document.getElementById('dashboardResumoAnalitico');
    if (!ref) return null;
    el = document.createElement('section');
    el.id = 'dashboardAnaliseExtra';
    el.className = 'glass-panel dash-madeira';
    ref.insertAdjacentElement('afterend', el);
    return el;
}
const cabecalho = (titulo, icone, sub) => `<header class="dm-topo"><h3><i class="fa-solid ${icone}" aria-hidden="true"></i> ${titulo}</h3><small>${esc(sub)}</small></header>`;
const tabela = (cols, linhas, rodape = '') => `<div class="dm-tabela-wrap"><table class="dm-tabela" data-no-column-resize="true">
  <thead><tr>${cols.map(c => `<th${c.num ? ' class="num"' : ''}>${c.t}</th>`).join('')}</tr></thead>
  <tbody>${linhas || `<tr><td colspan="${cols.length}" class="dm-sem">Sem dados no período.</td></tr>`}</tbody>${rodape ? `<tfoot>${rodape}</tfoot>` : ''}</table></div>`;

// ---------- Toras / empreiteiros ----------
async function toras(el, d) {
    const fech = await fechamentosEmpreiteiros();
    const mapa = new Map();
    d.entradas.forEach(e => {
        const nome = String(e.empreiteiroNome || e.fornecedor || 'Sem nome').trim().toUpperCase();
        const x = mapa.get(nome) || { nome, cargas: 0, m3: 0, valor: 0, descarga: 0, matos: new Set() };
        x.cargas++; x.m3 += Number(e.volume || 0); x.valor += Number(e.totalEmpreiteiro || 0); x.descarga += Number(e.totalDescarga || 0);
        if (e.mato) x.matos.add(String(e.mato).toUpperCase());
        mapa.set(nome, x);
    });
    const pagos = new Map();
    fech.forEach(f => {
        const k = norm(f.pessoaNome || f.pastaNome);
        const p = pagos.get(k) || { pago: 0, saldo: 0, pagoPeriodo: 0 };
        p.pago += Number(f.valorPago || 0);
        p.saldo += Math.max(0, Number(f.valorTotal || 0) - Number(f.valorPago || 0));
        (f.pagamentos || []).forEach(pg => { const dt = String(pg.data || '').slice(0, 10); if (dt >= d.periodo.inicio && dt <= d.periodo.fim) p.pagoPeriodo += Number(pg.valor || 0); });
        pagos.set(k, p);
    });
    const lista = [...mapa.values()].map(x => ({ ...x, preco: x.m3 ? x.valor / x.m3 : 0, pg: pagos.get(norm(x.nome)) || { pago: 0, saldo: 0, pagoPeriodo: 0 } })).sort((a, b) => b.m3 - a.m3);
    const tot = lista.reduce((s, x) => ({ m3: s.m3 + x.m3, valor: s.valor + x.valor, cargas: s.cargas + x.cargas, pagoPeriodo: s.pagoPeriodo + x.pg.pagoPeriodo }), { m3: 0, valor: 0, cargas: 0, pagoPeriodo: 0 });
    const media = tot.m3 ? tot.valor / tot.m3 : 0;
    const comPreco = lista.filter(x => x.preco > 0);
    const caro = comPreco.reduce((a, b) => (!a || b.preco > a.preco ? b : a), null);
    const barato = comPreco.reduce((a, b) => (!a || b.preco < a.preco ? b : a), null);
    el.innerHTML = cabecalho('Análise de toras por empreiteiro', 'fa-tree', `${d.periodoLabel} · ${fmtN(tot.m3, 2)} m³ em ${tot.cargas} carga(s)`) + `
      <div class="dm-kpis">
        <div><small>Preço médio pago</small><b>${fmtR(media)}/m³</b></div>
        <div><small>Mais caro</small><b>${caro ? `${esc(caro.nome)} · ${fmtR(caro.preco)}/m³` : '-'}</b></div>
        <div><small>Mais barato</small><b>${barato ? `${esc(barato.nome)} · ${fmtR(barato.preco)}/m³` : '-'}</b></div>
        <div><small>A pagar no período</small><b>${fmtR(tot.valor)}</b></div>
        <div><small>Pago no período (fechamentos)</small><b>${fmtR(tot.pagoPeriodo)}</b></div>
      </div>
      ${tabela([{ t: 'Empreiteiro' }, { t: 'Cargas', num: 1 }, { t: 'm³ de tora', num: 1 }, { t: 'R$/m³ médio', num: 1 }, { t: 'Valor das cargas', num: 1 }, { t: 'Pago no período', num: 1 }, { t: 'Já pago (total)', num: 1 }, { t: 'Saldo em aberto', num: 1 }],
        lista.map(x => `<tr><td><b>${esc(x.nome)}</b><small>${esc([...x.matos].slice(0, 4).join(', '))}</small></td>
          <td class="num">${x.cargas}</td><td class="num">${fmtN(x.m3, 2)}</td>
          <td class="num">${x.preco ? fmtR(x.preco) : '—'}${difPct(x.preco, media)}</td>
          <td class="num">${fmtR(x.valor)}</td><td class="num">${fmtR(x.pg.pagoPeriodo)}</td><td class="num">${fmtR(x.pg.pago)}</td>
          <td class="num ${x.pg.saldo > 0.009 ? 'dm-alerta' : ''}">${fmtR(x.pg.saldo)}</td></tr>`).join(''),
        `<tr><td><b>Total</b></td><td class="num">${tot.cargas}</td><td class="num">${fmtN(tot.m3, 2)}</td><td class="num">${fmtR(media)}</td><td class="num">${fmtR(tot.valor)}</td><td class="num">${fmtR(tot.pagoPeriodo)}</td><td></td><td></td></tr>`)}
      <p class="dm-dica">% ao lado do preço: comparação com o preço médio pago por m³ no período (verde = mais caro, vermelho = mais barato). "Já pago" e "Saldo" vêm das pastas de fechamentos (todo o histórico).</p>`;
}

// ---------- Cavaco / pó de serra ----------
function subprodutos(el, d) {
    const porTipo = new Map(), porCliente = new Map();
    d.subprodutos.forEach(s => {
        const tipo = String(s.tipo || 'OUTRO').toUpperCase(), un = String(s.unidade || 'm3').toLowerCase();
        const kt = `${tipo}|${un}`, qtd = Number(s.quantidade || 0), total = Number(s.total || 0);
        const pago = String(s.statusPagamento || '').toUpperCase() === 'PAGO';
        const t = porTipo.get(kt) || { tipo, un, vendas: 0, qtd: 0, total: 0, recebido: 0 };
        t.vendas++; t.qtd += qtd; t.total += total; if (pago) t.recebido += total; porTipo.set(kt, t);
        const nome = String(s.cliente || 'Sem cliente').toUpperCase();
        const c = porCliente.get(nome) || { nome, vendas: 0, total: 0, pendente: 0, itens: new Map() };
        c.vendas++; c.total += total; if (!pago) c.pendente += total;
        const ci = c.itens.get(kt) || { qtd: 0, total: 0 }; ci.qtd += qtd; ci.total += total; c.itens.set(kt, ci);
        porCliente.set(nome, c);
    });
    const tipos = [...porTipo.values()].map(t => ({ ...t, preco: t.qtd ? t.total / t.qtd : 0 })).sort((a, b) => b.total - a.total);
    const media = new Map(tipos.map(t => [`${t.tipo}|${t.un}`, t.preco]));
    const total = tipos.reduce((s, t) => s + t.total, 0), recebido = tipos.reduce((s, t) => s + t.recebido, 0);
    const clientes = [...porCliente.values()].sort((a, b) => b.total - a.total);
    el.innerHTML = cabecalho('Faturamento de cavaco e pó de serra', 'fa-leaf', d.periodoLabel) + `
      <div class="dm-kpis">
        <div><small>Faturado</small><b>${fmtR(total)}</b></div>
        <div><small>Recebido</small><b>${fmtR(recebido)}</b></div>
        <div><small>A receber</small><b>${fmtR(total - recebido)}</b></div>
        <div><small>Vendas</small><b>${d.subprodutos.length}</b></div>
      </div>
      <h4 class="dm-sub">Por produto</h4>
      ${tabela([{ t: 'Produto' }, { t: 'Vendas', num: 1 }, { t: 'Quantidade', num: 1 }, { t: 'Preço médio', num: 1 }, { t: 'Faturado', num: 1 }, { t: 'Recebido', num: 1 }],
        tipos.map(t => `<tr><td><b>${esc(t.tipo)}</b></td><td class="num">${t.vendas}</td><td class="num">${fmtN(t.qtd, 2)} ${esc(t.un)}</td><td class="num">${fmtR(t.preco)}/${esc(t.un)}</td><td class="num">${fmtR(t.total)}</td><td class="num">${fmtR(t.recebido)}</td></tr>`).join(''))}
      <h4 class="dm-sub">Por cliente</h4>
      ${tabela([{ t: 'Cliente' }, { t: 'Vendas', num: 1 }, { t: 'O que levou (preço x média)' }, { t: 'Faturado', num: 1 }, { t: 'Em aberto', num: 1 }],
        clientes.map(c => `<tr><td><b>${esc(c.nome)}</b></td><td class="num">${c.vendas}</td>
          <td>${[...c.itens.entries()].map(([k, v]) => { const [tipo, un] = k.split('|'); const p = v.qtd ? v.total / v.qtd : 0; return `<span class="dm-pill">${esc(tipo)}: ${fmtN(v.qtd, 1)} ${esc(un)} · ${fmtR(p)}/${esc(un)} ${difPct(p, media.get(k))}</span>`; }).join('')}</td>
          <td class="num">${fmtR(c.total)}</td><td class="num ${c.pendente > 0.009 ? 'dm-alerta' : ''}">${fmtR(c.pendente)}</td></tr>`).join(''))}
      <p class="dm-dica">O preço de cada cliente é comparado com a média do mesmo produto e unidade no período.</p>`;
}

// ---------- Despesas ----------
const NOTA_ORIGEM = {
    'Pagamento funcionarios': 'salário cadastrado de cada funcionário ativo no mês',
    'Hora extra funcionarios': 'horas extras lançadas no RH',
    'Valor a pagar empreiteiro': 'valor das cargas de tora recebidas no período',
    'Valor a pagar descarregamento': 'descarregamento das cargas de tora',
    'Lançamentos financeiros': 'boletos/contas do Financeiro com vencimento no período (notas e comprovantes não entram, para não contar duas vezes)'
};
function despesas(el, d) {
    const det = d.despesas;
    const origens = Object.entries(det.porOrigem).sort((a, b) => b[1] - a[1]);
    const qtd = det.fontes.reduce((acc, f) => { acc[f.categoria] = (acc[f.categoria] || 0) + 1; return acc; }, {});
    const maiores = [...det.fontes].sort((a, b) => b.valor - a.valor).slice(0, 12);
    el.innerHTML = cabecalho('De onde vêm as despesas', 'fa-arrow-trend-down', `${d.periodoLabel} · ${det.quantidade} lançamento(s)`) + `
      ${tabela([{ t: 'Origem' }, { t: 'Lançamentos', num: 1 }, { t: 'Valor', num: 1 }, { t: '% do total', num: 1 }, { t: 'Como é calculado' }],
        origens.map(([o, v]) => `<tr><td><b>${esc(o)}</b></td><td class="num">${qtd[o] || 0}</td><td class="num">${fmtR(v)}</td><td class="num">${fmtN(det.total ? v / det.total * 100 : 0, 1)}%</td><td><small>${esc(NOTA_ORIGEM[o] || 'lançamentos do Financeiro')}</small></td></tr>`).join(''),
        `<tr><td><b>Total</b></td><td class="num">${det.quantidade}</td><td class="num"><b>${fmtR(det.total)}</b></td><td class="num">100%</td><td></td></tr>`)}
      <h4 class="dm-sub">Maiores lançamentos do período</h4>
      ${tabela([{ t: 'Data' }, { t: 'Descrição' }, { t: 'Origem' }, { t: 'Valor', num: 1 }],
        maiores.map(f => `<tr><td>${dataBR(f.data)}</td><td>${esc(f.descricao || '-')}</td><td><small>${esc(f.categoria)}</small></td><td class="num">${fmtR(f.valor)}</td></tr>`).join(''))}
      <p class="dm-dica">Se um valor estiver errado, confira a origem: salário no cadastro do funcionário, valor por m³ no cadastro do empreiteiro ou o lançamento no Financeiro.</p>`;
}

// ---------- Financeiro (resultado) ----------
function financeiro(el, d) {
    const madeira = d.romaneios.reduce((s, r) => s + Number(r.financeiro?.totalGeral || 0), 0);
    const sub = d.subprodutos.reduce((s, x) => s + Number(x.total || 0), 0);
    const receita = madeira + sub, det = d.despesas;
    const origens = Object.entries(det.porOrigem).sort((a, b) => b[1] - a[1]);
    const resultado = receita - det.total;
    el.innerHTML = cabecalho('Resultado do período (receitas − custos)', 'fa-scale-balanced', d.periodoLabel) + `
      ${tabela([{ t: 'Conta' }, { t: 'Valor', num: 1 }, { t: '% da receita', num: 1 }], [
        `<tr><td><b>Madeira serrada</b></td><td class="num">${fmtR(madeira)}</td><td class="num">${fmtN(receita ? madeira / receita * 100 : 0, 1)}%</td></tr>`,
        `<tr><td><b>Cavaco / pó de serra</b></td><td class="num">${fmtR(sub)}</td><td class="num">${fmtN(receita ? sub / receita * 100 : 0, 1)}%</td></tr>`,
        `<tr class="dm-linha-total"><td><b>Receita total</b></td><td class="num"><b>${fmtR(receita)}</b></td><td class="num">100%</td></tr>`,
        ...origens.map(([o, v]) => `<tr><td>(−) ${esc(o)}</td><td class="num">${fmtR(-v)}</td><td class="num">${fmtN(receita ? v / receita * 100 : 0, 1)}%</td></tr>`),
        `<tr class="dm-linha-total"><td><b>Custos totais</b></td><td class="num"><b>${fmtR(-det.total)}</b></td><td class="num">${fmtN(receita ? det.total / receita * 100 : 0, 1)}%</td></tr>`,
        `<tr class="dm-linha-total"><td><b>Resultado</b></td><td class="num"><b class="${resultado >= 0 ? 'dm-ok' : 'dm-alerta'}">${fmtR(resultado)}</b></td><td class="num">${fmtN(receita ? resultado / receita * 100 : 0, 1)}%</td></tr>`
      ].join(''))}
      <p class="dm-dica">Receitas pelos romaneios e vendas de subproduto do período; custos com as mesmas regras da aba Despesas. É uma visão gerencial, não substitui o fechamento contábil.</p>`;
}

// ---------- Estoque ----------
function estoque(el, d) {
    const unidade = i => (i.categoria === 'DIESEL' || i.categoria === 'LUBRIFICANTES') ? 'L' : (i.unidade || 'un');
    const custo = i => Number(i.unitario ?? i.valorUnitario ?? i.preco ?? 0);
    const minimo = i => i.limite_alerta != null ? Number(i.limite_alerta) : (i.categoria === 'DIESEL' ? 1000 : i.categoria === 'LUBRIFICANTES' ? 40 : 3);
    const criticos = d.itensAcabando.map(i => ({ i, saldo: Number(i.quantidade || 0), min: minimo(i), un: unidade(i), custo: custo(i) }))
        .map(x => ({ ...x, falta: Math.max(0, x.min - x.saldo) })).sort((a, b) => (a.saldo / (a.min || 1)) - (b.saldo / (b.min || 1)));
    const repor = criticos.reduce((s, x) => s + x.falta * x.custo, 0);
    const porCat = new Map();
    d.estoque.forEach(i => { const k = i.categoria || 'SEM CATEGORIA'; const c = porCat.get(k) || { itens: 0, valor: 0, baixos: 0 }; c.itens++; c.valor += Number(i.quantidade || 0) * custo(i); porCat.set(k, c); });
    criticos.forEach(x => { const c = porCat.get(x.i.categoria || 'SEM CATEGORIA'); if (c) c.baixos++; });
    el.innerHTML = cabecalho('Estoque: o que está acabando', 'fa-boxes-stacked', `${criticos.length} item(ns) no mínimo ou abaixo`) + `
      ${tabela([{ t: 'Item' }, { t: 'Categoria' }, { t: 'Saldo', num: 1 }, { t: 'Mínimo', num: 1 }, { t: 'Falta', num: 1 }, { t: 'Custo unit.', num: 1 }, { t: 'Custo p/ repor', num: 1 }],
        criticos.map(x => `<tr><td><b>${esc(x.i.nome || x.i.descricao || 'Item')}</b></td><td><small>${esc(x.i.categoria || '-')}</small></td>
          <td class="num ${x.saldo <= 0 ? 'dm-alerta' : ''}">${fmtN(x.saldo, x.un === 'un' ? 0 : 1)} ${x.un}</td><td class="num">${fmtN(x.min, x.un === 'un' ? 0 : 1)} ${x.un}</td>
          <td class="num">${fmtN(x.falta, x.un === 'un' ? 0 : 1)} ${x.un}</td><td class="num">${x.custo ? fmtR(x.custo) : '<span class="dm-sem">sem preço</span>'}</td><td class="num">${x.custo ? fmtR(x.falta * x.custo) : '—'}</td></tr>`).join(''),
        criticos.length ? `<tr><td colspan="6"><b>Custo estimado para voltar ao mínimo</b></td><td class="num"><b>${fmtR(repor)}</b></td></tr>` : '')}
      <h4 class="dm-sub">Estoque por categoria</h4>
      ${tabela([{ t: 'Categoria' }, { t: 'Itens', num: 1 }, { t: 'No mínimo', num: 1 }, { t: 'Valor em estoque', num: 1 }],
        [...porCat.entries()].sort((a, b) => b[1].valor - a[1].valor).map(([k, c]) => `<tr><td><b>${esc(k)}</b></td><td class="num">${c.itens}</td><td class="num ${c.baixos ? 'dm-alerta' : ''}">${c.baixos}</td><td class="num">${fmtR(c.valor)}</td></tr>`).join(''))}
      <p class="dm-dica">Mínimo = "Mínimo alerta" do cadastro do item (padrão: 1.000 L diesel, 40 L lubrificante, 3 unidades). Itens sem preço de compra não entram no custo.</p>`;
}

window.renderAnaliseDashboardExtra = async function(view, d) {
    const el = painel();
    if (!el) return;
    const fn = { toras, subprodutos, despesas, financeiro, estoque }[view];
    if (!fn) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    try { await fn(el, d); } catch (err) { console.error('Análise do painel', err); el.innerHTML = '<p class="dm-vazio">Não foi possível montar a análise agora.</p>'; }
};
