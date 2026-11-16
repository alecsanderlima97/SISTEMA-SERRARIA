// Modulo Paletes: estoque da madeira comprada, montagem e paletes prontos.
// Cada entrada/saida e um documento em paletes_movimentos (nunca se apaga; erro se corrige com ajuste).
//   madeira: [{ produtoId, nome, pecas (+ entra / - sai), m3 }]
//   paletes: [{ modeloId, nome, qtd (+ entra / - sai) }]
// O saldo e a soma dos movimentos. A madeira e a mesma do Cadastro de Medidas (produtoId).
import { db, auth, collection, addDoc, getDocs } from './firebase-init.js';

const COL = 'paletes_movimentos';
const fmt = (n, d = 2) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const int = v => Math.max(0, Math.round(num(v)));
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => new Date().toISOString().slice(0, 10);
const TIPOS = { entrada: 'Compra de madeira', transferencia: 'Transferência do pátio', montagem: 'Montagem', venda: 'Venda (romaneio)', estorno_venda: 'Estorno de venda', ajuste: 'Ajuste' };

let movimentos = [];
let aba = 'madeira';
let form = null; // 'entrada' | 'transferencia' | 'montagem' | 'ajuste'
let patio = null;

function m3Madeira(p, pecas) {
    const comp = num(p?.comprimentoReal) || num(p?.comprimentoVenda);
    return (num(p?.espessura) / 100) * (num(p?.largura) / 100) * comp * pecas;
}

async function carregarMovimentos() {
    const snap = await getDocs(collection(db, COL));
    movimentos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
    return movimentos;
}

function saldos(lista = movimentos) {
    const madeira = new Map(), paletes = new Map();
    lista.forEach(m => {
        (m.madeira || []).forEach(x => {
            const s = madeira.get(x.produtoId) || { produtoId: x.produtoId, nome: x.nome, pecas: 0, m3: 0 };
            s.pecas += num(x.pecas); s.m3 += num(x.m3); s.nome = x.nome || s.nome;
            madeira.set(x.produtoId, s);
        });
        (m.paletes || []).forEach(x => {
            const s = paletes.get(x.modeloId) || { modeloId: x.modeloId, nome: x.nome, qtd: 0 };
            s.qtd += num(x.qtd); s.nome = x.nome || s.nome;
            paletes.set(x.modeloId, s);
        });
    });
    return { madeira, paletes };
}

async function gravar(mov) {
    const user = auth.currentUser || {};
    const doc = { data: hoje(), ...mov, criadoEm: new Date().toISOString(), usuario: user.email || user.uid || '' };
    // grava com a auditoria do sistema quando disponivel
    const id = window.FS?.addDoc ? await window.FS.addDoc(COL, doc) : await addDoc(collection(db, COL), doc).then(r => r.id);
    movimentos.unshift({ id, ...doc });
    return id;
}

// API usada pelo romaneio de paletes
window.PaletesEstoque = {
    async saldoProntos() { await carregarMovimentos(); return saldos().paletes; },
    async registrarVenda({ romaneioId, numero, cliente, itens }) {
        return gravar({ tipo: 'venda', romaneioId, romaneioNumero: numero, descricao: `Romaneio ${numero} · ${cliente}`, paletes: itens.map(i => ({ modeloId: i.modeloId, nome: i.nome, qtd: -int(i.qtd) })) });
    },
    async estornarVenda({ romaneioId, numero, cliente, itens }) {
        return gravar({ tipo: 'estorno_venda', romaneioId, romaneioNumero: numero, descricao: `Estorno do romaneio ${numero} · ${cliente}`, paletes: itens.map(i => ({ modeloId: i.modeloId, nome: i.nome, qtd: int(i.qtd) })) });
    }
};

// ---------- tela ----------
function msg(t, erro = false) {
    const el = document.getElementById('palEstMsg');
    if (el) { el.textContent = t; el.className = 'pal-est-msg' + (erro ? ' is-erro' : ''); }
}

function htmlSaldoMadeira(s) {
    const linhas = [...s.madeira.values()].filter(x => Math.abs(x.pecas) > 0.0001).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    if (!linhas.length) return '<p class="pal-vazio">Nenhuma madeira no estoque ainda. Lance uma compra ou transfira do pátio.</p>';
    return `<div class="table-container"><table class="pal-tabela"><thead><tr><th>Madeira (Cadastro de Medidas)</th><th>Peças</th><th>m³</th></tr></thead><tbody>${linhas.map(x => `<tr${x.pecas < 0 ? ' class="is-negativo"' : ''}><td>${esc(x.nome)}</td><td>${Math.round(x.pecas).toLocaleString('pt-BR')}</td><td>${fmt(x.m3, 3)}</td></tr>`).join('')}</tbody></table></div>`;
}
function htmlSaldoPaletes(s, modelos) {
    const linhas = modelos.map(m => ({ m, qtd: s.paletes.get(m.id)?.qtd || 0 }));
    if (!linhas.length) return '<p class="pal-vazio">Cadastre as medidas de palete em Cadastro de Medidas → Medidas de palete.</p>';
    return `<div class="table-container"><table class="pal-tabela"><thead><tr><th>Modelo</th><th>Paletes prontos</th></tr></thead><tbody>${linhas.map(x => `<tr${x.qtd < 0 ? ' class="is-negativo"' : ''}><td>${esc(x.m.nome)}</td><td><b>${Math.round(x.qtd).toLocaleString('pt-BR')}</b></td></tr>`).join('')}</tbody></table></div>`;
}

function opcoesMadeira(madeiras, sel = '') {
    const API = window.PaletesAPI;
    return '<option value="">Escolha a madeira…</option>' + madeiras.map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(API.nomeMadeira(p))}</option>`).join('');
}

async function htmlForm(madeiras, modelos) {
    if (form === 'entrada') return `
      <form class="pal-est-form" data-form="entrada">
        <h3>Compra de madeira</h3>
        <label>Madeira<select name="produtoId" required>${opcoesMadeira(madeiras)}</select></label>
        <label>Lançar por<select name="modo"><option value="pacote">Pacote</option><option value="peca">Peça</option></select></label>
        <div class="pal-est-pacote"><label>Pacotes<input name="pacotes" type="number" min="1" step="1" value="1"></label>
          <label>Fiadas<input name="alt" type="number" min="1" step="1"></label><label>Por fiada<input name="cam" type="number" min="1" step="1"></label><label>Amarras<input name="am" type="number" min="0" step="1" value="0"></label></div>
        <label class="pal-est-peca" hidden>Peças<input name="pecas" type="number" min="1" step="1"></label>
        <label>Fornecedor<input name="fornecedor" maxlength="120"></label>
        <label>Nota fiscal<input name="nota" maxlength="40"></label>
        <label>Data<input name="data" type="date" value="${hoje()}"></label>
        <p class="pal-est-previa" data-previa></p>
        <div class="pal-est-botoes"><button type="submit" class="btn-primary">Lançar entrada</button><button type="button" class="btn-secondary" data-fechar>Cancelar</button></div>
      </form>`;
    if (form === 'transferencia') {
        if (!patio) {
            try { patio = await window.PatioParaPaletes?.listar(); } catch (e) { patio = { erro: e }; }
        }
        if (!patio || patio.erro || !window.PatioParaPaletes) return `<div class="pal-est-form"><h3>Transferir do pátio</h3><p class="pal-vazio">Não foi possível ler o pátio. Esta opção precisa de acesso ao pátio (Gerar Romaneio).</p><button type="button" class="btn-secondary" data-fechar>Fechar</button></div>`;
        if (!patio.itens.length) return `<div class="pal-est-form"><h3>Transferir do pátio</h3><p class="pal-vazio">Não há pacotes no pátio.</p><button type="button" class="btn-secondary" data-fechar>Fechar</button></div>`;
        return `
      <form class="pal-est-form" data-form="transferencia">
        <h3>Transferir do pátio para a fábrica de paletes</h3>
        <label>Pacote do pátio<select name="item" required><option value="">Escolha…</option>${patio.itens.map((it, i) => `<option value="${i}">${esc(it.classe || '-')} · ${fmt(it.espessura, 1)} × ${fmt(it.largura, 1)} × ${fmt(it.comprimento, 2)} · (${it.altura}×${it.camada})${it.amarras ? '+' + it.amarras : ''} = ${it.pecas} pç · ${it.pacotes} pct</option>`).join('')}</select></label>
        <label>Quantos pacotes<input name="qtd" type="number" min="1" step="1" value="1"></label>
        <label>Entra no estoque como<select name="produtoId" required>${opcoesMadeira(madeiras)}</select></label>
        <p class="pal-est-previa" data-previa>A baixa sai do pátio (como no romaneio) e as peças entram no estoque de madeira dos paletes.</p>
        <div class="pal-est-botoes"><button type="submit" class="btn-primary">Transferir</button><button type="button" class="btn-secondary" data-fechar>Cancelar</button></div>
      </form>`;
    }
    if (form === 'montagem') return `
      <form class="pal-est-form" data-form="montagem">
        <h3>Montagem de paletes</h3>
        <label>Modelo<select name="modeloId" required><option value="">Escolha…</option>${modelos.map(m => `<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join('')}</select></label>
        <label>Quantidade montada<input name="qtd" type="number" min="1" step="1" value="1"></label>
        <label>Data<input name="data" type="date" value="${hoje()}"></label>
        <div class="pal-est-previa" data-previa>Escolha o modelo para ver a madeira que sai do estoque.</div>
        <div class="pal-est-botoes"><button type="submit" class="btn-primary">Lançar montagem</button><button type="button" class="btn-secondary" data-fechar>Cancelar</button></div>
      </form>`;
    if (form === 'ajuste') return `
      <form class="pal-est-form" data-form="ajuste">
        <h3>Ajuste de estoque</h3>
        <label>O que ajustar<select name="alvo"><option value="madeira">Madeira</option><option value="palete">Paletes prontos</option></select></label>
        <label class="pal-aj-madeira">Madeira<select name="produtoId">${opcoesMadeira(madeiras)}</select></label>
        <label class="pal-aj-palete" hidden>Modelo<select name="modeloId"><option value="">Escolha…</option>${modelos.map(m => `<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join('')}</select></label>
        <label>Quantidade (use − para tirar)<input name="qtd" type="number" step="1" required></label>
        <label>Motivo<input name="motivo" maxlength="160" required placeholder="Ex.: contagem do estoque, perda, quebra"></label>
        <div class="pal-est-botoes"><button type="submit" class="btn-primary">Lançar ajuste</button><button type="button" class="btn-secondary" data-fechar>Cancelar</button></div>
      </form>`;
    return '';
}

function htmlMovimentos() {
    if (!movimentos.length) return '<p class="pal-vazio">Nenhum movimento ainda.</p>';
    return `<div class="table-container"><table class="pal-tabela"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Madeira</th><th>Paletes</th><th>Usuário</th></tr></thead><tbody>${movimentos.slice(0, 200).map(m => `
      <tr><td>${esc((m.data || '').split('-').reverse().join('/'))}</td><td>${esc(TIPOS[m.tipo] || m.tipo)}</td><td>${esc(m.descricao || '')}</td>
      <td>${(m.madeira || []).map(x => `${num(x.pecas) > 0 ? '+' : ''}${Math.round(num(x.pecas))} pç ${esc(x.nome)}`).join('<br>') || '-'}</td>
      <td>${(m.paletes || []).map(x => `${num(x.qtd) > 0 ? '+' : ''}${Math.round(num(x.qtd))} ${esc(x.nome)}`).join('<br>') || '-'}</td>
      <td>${esc(m.usuario || '')}</td></tr>`).join('')}</tbody></table></div>`;
}

async function render() {
    const alvo = document.getElementById('paletesEstoque');
    if (!alvo) return;
    alvo.innerHTML = '<p class="pal-vazio"><span class="saw-loader" aria-hidden="true"></span> Carregando…</p>';
    let madeiras = [], modelos = [];
    try {
        [madeiras, modelos] = await Promise.all([window.PaletesAPI?.madeiras() || [], window.PaletesAPI?.modelos() || [], carregarMovimentos()]);
    } catch (e) {
        alvo.innerHTML = `<p class="pal-vazio">${e?.code === 'permission-denied' ? 'Sem permissão para o estoque de paletes. Peça ao gerente para liberar e confirme se as regras do Firestore foram publicadas.' : 'Não foi possível carregar o estoque. Tente de novo.'}</p>`;
        return;
    }
    const s = saldos();
    document.querySelectorAll('#view-paletes [data-pal-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.palAba === aba)));
    let html = '<p id="palEstMsg" class="pal-est-msg" role="status"></p>';
    if (aba === 'madeira') {
        html += `<div class="pal-est-acoes"><button type="button" class="btn-primary" data-abrir="entrada"><i class="fa-solid fa-truck-ramp-box"></i> Compra de madeira</button>
          <button type="button" class="btn-secondary" data-abrir="transferencia"><i class="fa-solid fa-right-left"></i> Transferir do pátio</button>
          <button type="button" class="btn-secondary" data-abrir="ajuste"><i class="fa-solid fa-scale-balanced"></i> Ajuste</button></div>`;
        html += (form && form !== 'montagem') ? await htmlForm(madeiras, modelos) : '';
        html += '<h3 class="pal-est-tit">Saldo da madeira</h3>' + htmlSaldoMadeira(s);
    } else if (aba === 'prontos') {
        html += `<div class="pal-est-acoes"><button type="button" class="btn-primary" data-abrir="montagem"><i class="fa-solid fa-hammer"></i> Lançar montagem</button>
          <button type="button" class="btn-secondary" data-abrir="ajuste"><i class="fa-solid fa-scale-balanced"></i> Ajuste</button></div>`;
        html += (form === 'montagem' || form === 'ajuste') ? await htmlForm(madeiras, modelos) : '';
        html += '<h3 class="pal-est-tit">Paletes prontos</h3>' + htmlSaldoPaletes(s, modelos);
    } else {
        html += htmlMovimentos();
    }
    alvo.innerHTML = html;
}

async function previaMontagem(f) {
    const alvo = f.querySelector('[data-previa]');
    const modelos = await window.PaletesAPI.modelos();
    const m = modelos.find(x => x.id === f.modeloId.value);
    const qtd = int(f.qtd.value);
    if (!m || !qtd) { alvo.textContent = 'Escolha o modelo e a quantidade.'; return null; }
    const ped = await window.PaletesAPI.pedido(m, qtd);
    const s = saldos();
    const semMadeira = ped.linhas.filter(l => !l.prod);
    const consumo = ped.madeirasPedido.map(x => {
        const saldo = s.madeira.get(x.prod.id)?.pecas || 0;
        return { ...x, saldo, falta: x.pecasMadeira > saldo };
    });
    alvo.innerHTML = `<b>Sai do estoque:</b><ul>${consumo.map(c => `<li${c.falta ? ' class="is-negativo"' : ''}>${c.pecasMadeira} pç · ${esc(window.PaletesAPI.nomeMadeira(c.prod))} (tem ${Math.round(c.saldo)})</li>`).join('')}</ul>`
        + (semMadeira.length ? `<p class="is-negativo">Peças sem madeira vinculada no modelo (não saem do estoque): ${semMadeira.map(l => esc(({ superior: 'tábua de cima', ligacao: 'tábua de ligação', bloco: 'bloco', inferior: 'tábua de baixo' })[l.c.posicao] || l.c.posicao || 'peça')).join(', ')}. Vincule em Cadastro de Medidas → Medidas de palete.</p>` : '');
    return { m, qtd, consumo };
}

function lerPecasEntrada(f, madeiras) {
    const p = madeiras.find(x => x.id === f.produtoId.value);
    if (!p) return { p: null, pecas: 0 };
    if (f.modo.value === 'peca') return { p, pecas: int(f.pecas.value) };
    const porPacote = int(f.alt.value) * int(f.cam.value) + int(f.am.value);
    return { p, pecas: porPacote * int(f.pacotes.value), porPacote };
}

function instalar() {
    const sec = document.getElementById('view-paletes');
    if (!sec || sec.dataset.estoque) return;
    sec.dataset.estoque = '1';
    sec.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.palAba) { aba = b.dataset.palAba; form = null; render(); return; }
        if (b.dataset.abrir) { form = b.dataset.abrir; render(); return; }
        if (b.hasAttribute('data-fechar')) { form = null; patio = null; render(); }
    });
    sec.addEventListener('change', async e => {
        const f = e.target.closest('form');
        if (!f) return;
        const madeiras = await window.PaletesAPI.madeiras();
        if (f.dataset.form === 'entrada') {
            const pac = f.modo.value === 'pacote';
            f.querySelector('.pal-est-pacote').hidden = !pac;
            f.querySelector('.pal-est-peca').hidden = pac;
            if (e.target.name === 'produtoId') {
                const p = madeiras.find(x => x.id === f.produtoId.value);
                if (p) { f.alt.value = p.alturas || ''; f.cam.value = p.larguraPacote || ''; f.am.value = p.amarras || 0; }
            }
            const { p, pecas } = lerPecasEntrada(f, madeiras);
            f.querySelector('[data-previa]').textContent = p && pecas ? `Entra: ${pecas.toLocaleString('pt-BR')} peças · ${fmt(m3Madeira(p, pecas), 3)} m³` : '';
        }
        if (f.dataset.form === 'transferencia' && e.target.name === 'item') {
            const it = patio?.itens[Number(f.item.value)];
            if (it) {
                const igual = madeiras.find(p => num(p.espessura) === num(it.espessura) && num(p.largura) === num(it.largura) && (num(p.comprimentoReal) || num(p.comprimentoVenda)) === num(it.comprimento));
                if (igual) f.produtoId.value = igual.id;
            }
        }
        if (f.dataset.form === 'montagem') await previaMontagem(f);
        if (f.dataset.form === 'ajuste') {
            const pal = f.alvo.value === 'palete';
            f.querySelector('.pal-aj-madeira').hidden = pal;
            f.querySelector('.pal-aj-palete').hidden = !pal;
        }
    });
    sec.addEventListener('submit', async e => {
        const f = e.target.closest('form');
        if (!f) return;
        e.preventDefault();
        const botao = f.querySelector('button[type="submit"]');
        botao.disabled = true;
        try {
            const madeiras = await window.PaletesAPI.madeiras();
            const API = window.PaletesAPI;
            if (f.dataset.form === 'entrada') {
                const { p, pecas, porPacote } = lerPecasEntrada(f, madeiras);
                if (!p || !pecas) { msg('Escolha a madeira e a quantidade.', true); return; }
                await gravar({ tipo: 'entrada', data: f.data.value || hoje(), fornecedor: f.fornecedor.value.trim(), nota: f.nota.value.trim(),
                    descricao: `Compra${f.fornecedor.value ? ' · ' + f.fornecedor.value.trim() : ''}${f.nota.value ? ' · NF ' + f.nota.value.trim() : ''}${porPacote ? ` · ${int(f.pacotes.value)} pct de ${porPacote} pç` : ''}`,
                    madeira: [{ produtoId: p.id, nome: API.nomeMadeira(p), pecas, m3: m3Madeira(p, pecas) }] });
                form = null; await render(); msg(`Entrada lançada: ${pecas} peças.`);
            } else if (f.dataset.form === 'transferencia') {
                const it = patio?.itens[Number(f.item.value)];
                const qtd = int(f.qtd.value);
                const p = madeiras.find(x => x.id === f.produtoId.value);
                if (!it || !qtd || !p) { msg('Escolha o pacote, a quantidade e a madeira.', true); return; }
                if (qtd > Number(it.pacotes)) { msg(`O pátio tem só ${it.pacotes} pacote(s) desse.`, true); return; }
                const pecas = qtd * Number(it.pecas || 0);
                await window.PatioParaPaletes.baixar(patio.relatorioId, it, qtd, { numero: 'PALETES', cliente: 'Fábrica de paletes', usuario: auth.currentUser?.email || 'Paletes' });
                await gravar({ tipo: 'transferencia', descricao: `Do pátio: ${qtd} pct de ${it.pecas} pç (${fmt(it.espessura, 1)} × ${fmt(it.largura, 1)} × ${fmt(it.comprimento, 2)})`,
                    madeira: [{ produtoId: p.id, nome: API.nomeMadeira(p), pecas, m3: m3Madeira(p, pecas) }] });
                patio = null; form = null; await render(); msg(`Transferidos ${qtd} pacote(s) do pátio (${pecas} peças).`);
            } else if (f.dataset.form === 'montagem') {
                const prev = await previaMontagem(f);
                if (!prev) return;
                const faltando = prev.consumo.filter(c => c.falta);
                if (faltando.length && !confirm(`Falta madeira no estoque para ${faltando.length} medida(s). O saldo vai ficar negativo. Lançar mesmo assim?`)) return;
                await gravar({ tipo: 'montagem', data: f.data.value || hoje(), descricao: `${prev.qtd} × ${prev.m.nome}`,
                    madeira: prev.consumo.map(c => ({ produtoId: c.prod.id, nome: API.nomeMadeira(c.prod), pecas: -c.pecasMadeira, m3: -m3Madeira(c.prod, c.pecasMadeira) })),
                    paletes: [{ modeloId: prev.m.id, nome: prev.m.nome, qtd: prev.qtd }] });
                form = null; await render(); msg(`Montagem lançada: ${prev.qtd} × ${prev.m.nome}.`);
            } else if (f.dataset.form === 'ajuste') {
                const qtd = Math.round(num(f.qtd.value));
                if (!qtd || !f.motivo.value.trim()) { msg('Informe a quantidade e o motivo.', true); return; }
                if (f.alvo.value === 'palete') {
                    const m = (await API.modelos()).find(x => x.id === f.modeloId.value);
                    if (!m) { msg('Escolha o modelo.', true); return; }
                    await gravar({ tipo: 'ajuste', descricao: f.motivo.value.trim(), paletes: [{ modeloId: m.id, nome: m.nome, qtd }] });
                } else {
                    const p = madeiras.find(x => x.id === f.produtoId.value);
                    if (!p) { msg('Escolha a madeira.', true); return; }
                    await gravar({ tipo: 'ajuste', descricao: f.motivo.value.trim(), madeira: [{ produtoId: p.id, nome: API.nomeMadeira(p), pecas: qtd, m3: m3Madeira(p, qtd) }] });
                }
                form = null; await render(); msg('Ajuste lançado.');
            }
        } catch (err) {
            console.error('Paletes estoque:', err);
            msg(err?.code === 'permission-denied' ? 'Sem permissão para gravar. Peça ao gerente e confirme se as regras do Firestore foram publicadas.' : (err?.message || 'Não foi possível salvar. Tente de novo.'), true);
        } finally {
            botao.disabled = false;
        }
    });
}

window.renderPaletesEstoque = async function() { instalar(); await render(); };
window.SectionLoader?.register('view-paletes', () => window.renderPaletesEstoque());
