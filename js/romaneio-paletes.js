// Romaneio de paletes: fica em Gerar Romaneio (seletor Madeira serrada / Paletes).
// Salva em romaneios_paletes, da baixa nos paletes prontos (paletes_movimentos),
// gera a conta a receber (origem 'romaneio_palete') e aparece no Historico de Vendas (filtro Paletes).
// O romaneio de madeira serrada nao e alterado.
import { db, auth, collection, addDoc, getDocs, doc, getDoc, deleteDoc } from './firebase-init.js';

const COL = 'romaneios_paletes';
const fmt = (n, d = 2) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = n => 'R$ ' + fmt(n, 2);
const num = v => { if (typeof v === 'number') return Number.isFinite(v) ? v : 0; const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const int = v => Math.max(0, Math.round(Number(String(v ?? '').replace(',', '.')) || 0));
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => new Date().toISOString().slice(0, 10);
const dataBR = d => (d && /^\d{4}-\d{2}-\d{2}/.test(d)) ? d.slice(0, 10).split('-').reverse().join('/') : '-';
const novoNumero = () => `PAL-${Date.now().toString().slice(-6)}`;

let clientes = [], transportes = [], modelos = [];
let rom = null;
let historico = [];

function vazio() {
    return { numero: novoNumero(), clienteId: '', data: hoje(), transporteId: '', motorista: '', caminhao: '', placa: '', obs: '', itens: [{ modeloId: '', qtd: 1, preco: 0 }] };
}

async function carregarBase() {
    const [c, t, m] = await Promise.all([
        getDocs(collection(db, 'clientes')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []),
        getDocs(collection(db, 'transportes')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []),
        window.PaletesAPI?.modelos?.() || []
    ]);
    clientes = c.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    transportes = t;
    modelos = m;
}

const totalRom = r => r.itens.reduce((s, i) => s + int(i.qtd) * num(i.preco), 0);

// ---------- documento impresso ----------
function gerarHtmlDocumentoPaletes(r, cli = {}) {
    const em = window.dadosSerrariaEmitente || {};
    const linhas = (r.itens || []).map(i => `<tr><td><strong>${esc(i.nome)}</strong><br><small>${esc(i.medidas || '')}</small></td><td>${int(i.qtd).toLocaleString('pt-BR')}</td><td>${brl(i.preco)}</td><td class="doc-money">${brl(int(i.qtd) * num(i.preco))}</td></tr>`).join('');
    const qtdTotal = (r.itens || []).reduce((s, i) => s + int(i.qtd), 0);
    return `
        <div class="doc-header">
            <div>
                <img src="logo.png" alt="${esc(em.nomeFantasia || 'Empresa')}" class="doc-logo" onerror="this.style.display='none'">
                <div style="margin-top:10px; color:#334155; font-size:13px;">
                    <strong>${esc(em.nome || '')}</strong><br>${em.cnpj ? 'CNPJ: ' + esc(em.cnpj) + '<br>' : ''}${esc(em.logradouro || '')} ${esc(em.numero || '')} ${em.cidade ? '· ' + esc(em.cidade) : ''}
                </div>
            </div>
            <div class="doc-title"><h1>Romaneio de Paletes ${esc(r.numero)}</h1><p><strong>Data:</strong> ${dataBR(r.data)}</p></div>
        </div>
        <div class="doc-grid">
            <div class="doc-card">
                <h3>Cliente</h3>
                <p><strong>Cliente:</strong> ${esc(r.cliente || '-')}</p>
                <p><strong>CPF/CNPJ:</strong> ${esc(cli.cnpj || cli.cpf || cli.documento || '-')}</p>
                <p><strong>Endereço:</strong> ${esc(cli.logradouro || cli.endereco || '-')}</p>
                <p><strong>Cidade:</strong> ${esc(cli.cidade || '-')}</p>
                ${r.formaPagamento ? `<p><strong>Pagamento:</strong> ${esc(r.formaPagamento)}${r.prazoPagamento ? ' · ' + esc(r.prazoPagamento) : ''}</p>` : ''}
            </div>
            <div class="doc-card">
                <h3>Transporte</h3>
                <p><strong>Motorista:</strong> ${esc(r.motorista || '-')}</p>
                <p><strong>Caminhão:</strong> ${esc(r.caminhao || '-')}</p>
                <p><strong>Placa:</strong> ${esc(r.placa || '-')}</p>
            </div>
        </div>
        <table class="doc-table">
            <thead><tr><th>Palete</th><th>Quantidade</th><th>Valor unitário</th><th>Total</th></tr></thead>
            <tbody>${linhas}</tbody>
            <tfoot><tr><td><strong>Total</strong></td><td><strong>${qtdTotal.toLocaleString('pt-BR')}</strong></td><td></td><td class="doc-money"><strong>${brl(r.total)}</strong></td></tr></tfoot>
        </table>
        ${r.obs ? `<p style="margin-top:12px;"><strong>Observação:</strong> ${esc(r.obs)}</p>` : ''}
        <div class="doc-signatures"><div>Assinatura do motorista</div><div>Assinatura do recebedor</div></div>`;
}

async function clienteDo(r) {
    let cli = clientes.find(c => c.id === r.clienteId);
    if (!cli && r.clienteId) { try { const s = await getDoc(doc(db, 'clientes', r.clienteId)); if (s.exists()) cli = s.data(); } catch (_) { /* sem acesso */ } }
    return cli || {};
}
async function imprimir(r) {
    const nome = window.DocActions?.buildDocumentName ? window.DocActions.buildDocumentName([r.cliente, r.numero]) : r.numero;
    window.DocActions?.printHtml({ title: nome, contentHtml: gerarHtmlDocumentoPaletes(r, await clienteDo(r)) });
}

// ---------- tela do romaneio ----------
function opcoes(lista, sel, rotulo, txt) {
    return `<option value="">${rotulo}</option>` + lista.map(x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(txt(x))}</option>`).join('');
}
function medidasModelo(m) { return m ? `${fmt(m.largura, 2)} × ${fmt(m.comprimento, 2)} m` : ''; }

function htmlRomaneio(saldoProntos) {
    const r = rom;
    const cli = clientes.find(c => c.id === r.clienteId);
    const itens = r.itens.map((i, k) => {
        const m = modelos.find(x => x.id === i.modeloId);
        const saldo = m ? Math.round(saldoProntos?.get(m.id)?.qtd || 0) : null;
        const falta = m && saldo !== null && int(i.qtd) > saldo;
        return `<tr>
          <td><select data-item="${k}" data-campo="modeloId" aria-label="Modelo de palete">${opcoes(modelos, i.modeloId, 'Escolha o palete…', x => `${x.nome} · ${medidasModelo(x)}`)}</select>
            ${m ? `<small class="${falta ? 'is-negativo' : ''}">Prontos no estoque: ${saldo}</small>` : ''}</td>
          <td><input data-item="${k}" data-campo="qtd" type="number" min="1" step="1" value="${int(i.qtd)}" aria-label="Quantidade"></td>
          <td><input data-item="${k}" data-campo="preco" type="text" inputmode="decimal" value="${i.preco ? fmt(i.preco, 2) : ''}" placeholder="0,00" aria-label="Valor por palete"></td>
          <td class="rp-total">${brl(int(i.qtd) * num(i.preco))}</td>
          <td><button type="button" class="btn-secondary rp-rem" data-remover="${k}" aria-label="Tirar item">×</button></td></tr>`;
    }).join('');
    return `
      <div class="rp-grid">
        <div class="card-v2">
          <span class="card-title">Cliente e data</span>
          <label class="rp-campo">Cliente<select id="rpCliente">${opcoes(clientes, r.clienteId, 'Selecione o cliente…', c => c.nome || 'Sem nome')}</select></label>
          ${cli ? `<p class="rp-info">${esc(cli.cnpj || cli.cpf || '')} ${cli.cidade ? '· ' + esc(cli.cidade) : ''}${cli.formaPagamento ? `<br>Pagamento: ${esc(cli.formaPagamento)}${cli.prazoPagamento ? ' · ' + esc(cli.prazoPagamento) : ''}` : ''}</p>` : ''}
          <div class="rp-linha"><label class="rp-campo">Data<input id="rpData" type="date" value="${esc(r.data)}"></label>
          <label class="rp-campo">Nº romaneio<input id="rpNumero" value="${esc(r.numero)}" maxlength="30"></label></div>
        </div>
        <div class="card-v2">
          <span class="card-title">Transporte</span>
          <label class="rp-campo">Transportadora<select id="rpTransp">${opcoes(transportes, r.transporteId, 'Selecione…', t => t.nome || 'Sem nome')}</select></label>
          <div class="rp-linha"><label class="rp-campo">Motorista<input id="rpMotorista" value="${esc(r.motorista)}"></label>
          <label class="rp-campo">Caminhão<input id="rpCaminhao" value="${esc(r.caminhao)}"></label>
          <label class="rp-campo">Placa<input id="rpPlaca" value="${esc(r.placa)}"></label></div>
        </div>
      </div>
      <div class="card-v2 rp-itens">
        <span class="card-title">Paletes</span>
        <div class="table-container"><table class="pal-tabela"><thead><tr><th>Palete</th><th>Qtd</th><th>Valor por palete</th><th>Total</th><th></th></tr></thead><tbody>${itens}</tbody></table></div>
        <button type="button" class="btn-secondary" id="rpAddItem"><i class="fa-solid fa-plus"></i> Adicionar palete</button>
        <label class="rp-campo">Observação<input id="rpObs" value="${esc(r.obs)}" maxlength="300"></label>
        <div class="rp-rodape">
          <strong class="rp-total-geral">Total: ${brl(totalRom(r))}</strong>
          <div class="rp-botoes">
            <button type="button" class="btn-secondary" id="rp3D"><i class="fa-solid fa-cube"></i> Ver carga em 3D</button>
            <button type="button" class="btn-secondary" id="rpLimpar">Limpar</button>
            <button type="button" class="btn-primary" id="rpSalvar"><i class="fa-solid fa-cloud-arrow-up"></i> Salvar e imprimir</button>
          </div>
        </div>
        <p id="rpMsg" class="pal-est-msg" role="status">${r.editando ? `Editando o romaneio ${esc(r.editando.numero)}. Ao salvar, o estoque e a cobrança são ajustados.` : ''}</p>
      </div>`;
}

let saldoCache = null;
async function render(recarregarSaldo = false) {
    const alvo = document.getElementById('romaneioPaletes');
    if (!alvo) return;
    if (recarregarSaldo || !saldoCache) { try { saldoCache = await window.PaletesEstoque?.saldoProntos(); } catch (_) { saldoCache = null; } }
    alvo.innerHTML = htmlRomaneio(saldoCache);
}
function msg(t, erro = false) { const el = document.getElementById('rpMsg'); if (el) { el.textContent = t; el.className = 'pal-est-msg' + (erro ? ' is-erro' : ''); } }

function lerCampos() {
    const $ = id => document.getElementById(id);
    rom.clienteId = $('rpCliente')?.value || '';
    rom.data = $('rpData')?.value || hoje();
    rom.numero = ($('rpNumero')?.value || rom.numero).trim().toUpperCase();
    rom.transporteId = $('rpTransp')?.value || '';
    rom.motorista = $('rpMotorista')?.value.trim() || '';
    rom.caminhao = $('rpCaminhao')?.value.trim() || '';
    rom.placa = ($('rpPlaca')?.value || '').trim().toUpperCase();
    rom.obs = $('rpObs')?.value.trim() || '';
}

async function salvar() {
    lerCampos();
    const cli = clientes.find(c => c.id === rom.clienteId);
    if (!cli) { msg('Selecione o cliente.', true); return; }
    const itens = rom.itens.filter(i => i.modeloId && int(i.qtd) > 0).map(i => {
        const m = modelos.find(x => x.id === i.modeloId);
        return { modeloId: m.id, nome: m.nome, medidas: medidasModelo(m), qtd: int(i.qtd), preco: num(i.preco) };
    });
    if (!itens.length) { msg('Adicione pelo menos um palete com quantidade.', true); return; }
    saldoCache = await window.PaletesEstoque?.saldoProntos();
    // na edicao, o que ja saiu por este romaneio volta para a conta do saldo
    const jaSaiu = id => (rom.editando?.itens || []).filter(i => i.modeloId === id).reduce((s, i) => s + int(i.qtd), 0);
    const faltas = itens.filter(i => i.qtd > Math.round(saldoCache?.get(i.modeloId)?.qtd || 0) + jaSaiu(i.modeloId));
    if (faltas.length && !confirm(`Não há paletes prontos suficientes de: ${faltas.map(f => f.nome).join(', ')}. O estoque vai ficar negativo. Salvar mesmo assim?`)) return;
    const total = itens.reduce((s, i) => s + i.qtd * i.preco, 0);
    const btn = document.getElementById('rpSalvar');
    if (btn) btn.disabled = true;
    try {
        const dados = {
            numero: rom.numero, data: rom.data, clienteId: cli.id, cliente: String(cli.nome || '').toUpperCase(),
            transporteId: rom.transporteId, motorista: rom.motorista, caminhao: rom.caminhao, placa: rom.placa, obs: rom.obs,
            itens, total, formaPagamento: cli.formaPagamento || '', prazoPagamento: cli.prazoPagamento || '',
            status: 'finalizado', usuario: auth.currentUser?.email || ''
        };
        let id;
        if (rom.editando) {
            // edicao: grava por cima, devolve ao estoque o que tinha saido e da baixa no novo
            id = rom.editando.id;
            await (window.FS?.updateDoc ? window.FS.updateDoc(COL, id, { ...dados, editadoEm: new Date().toISOString() }) : Promise.reject(new Error('FS')));
            await window.PaletesEstoque.estornarVenda({ romaneioId: id, numero: rom.editando.numero, cliente: rom.editando.cliente, itens: rom.editando.itens || [] });
        } else {
            dados.criadoEm = new Date().toISOString();
            id = window.FS?.addDoc ? await window.FS.addDoc(COL, dados) : await addDoc(collection(db, COL), dados).then(r => r.id);
        }
        await window.PaletesEstoque.registrarVenda({ romaneioId: id, numero: dados.numero, cliente: dados.cliente, itens });
        await window.ContasReceber?.salvarCobranca?.({
            origem: 'romaneio_palete', origemId: id, codigo: dados.numero, clienteId: cli.id, cliente: dados.cliente, produto: 'Paletes',
            data: dados.data, valor: total, formaPagamento: cli.formaPagamento || '', prazoPagamento: cli.prazoPagamento || '',
            prazoPrimeiroVencimentoDias: Number(cli.prazoPrimeiroVencimentoDias ?? String(cli.prazoPagamento || '').match(/\d{1,3}/)?.[0] ?? 0),
            quantidadeParcelas: Number(cli.quantidadeParcelas || 1), intervaloParcelasDias: Number(cli.intervaloParcelasDias || 30),
            whatsapp: cli.contato || cli.telefone || cli.whatsapp || ''
        });
        await imprimir({ id, ...dados });
        rom = vazio();
        await render(true);
        msg(`Romaneio ${dados.numero} salvo. Está no Histórico de Vendas (Paletes) e a cobrança está no Financeiro.`);
    } catch (e) {
        console.error('Romaneio paletes:', e);
        msg(e?.code === 'permission-denied' ? 'Sem permissão para salvar. Confirme as permissões e se as regras do Firestore foram publicadas.' : 'Não foi possível salvar. Nada foi baixado; tente de novo.', true);
    } finally {
        const b = document.getElementById('rpSalvar');
        if (b) b.disabled = false;
    }
}

function instalar() {
    const alvo = document.getElementById('romaneioPaletes');
    if (!alvo || alvo.dataset.ok) return;
    alvo.dataset.ok = '1';
    alvo.addEventListener('change', e => {
        const t = e.target;
        if (t.dataset.item !== undefined) {
            const it = rom.itens[Number(t.dataset.item)];
            if (t.dataset.campo === 'modeloId') it.modeloId = t.value;
            if (t.dataset.campo === 'qtd') it.qtd = int(t.value);
            if (t.dataset.campo === 'preco') it.preco = num(t.value);
            lerCampos(); render();
            return;
        }
        if (t.id === 'rpTransp') {
            const tr = transportes.find(x => x.id === t.value);
            lerCampos();
            if (tr) { rom.motorista = tr.motorista || ''; rom.caminhao = tr.caminhao || ''; rom.placa = tr.placa || ''; }
            render();
            return;
        }
        if (t.id === 'rpCliente') { lerCampos(); render(); }
    });
    alvo.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.id === 'rpAddItem') { lerCampos(); rom.itens.push({ modeloId: '', qtd: 1, preco: 0 }); render(); return; }
        if (b.dataset.remover !== undefined) { lerCampos(); rom.itens.splice(Number(b.dataset.remover), 1); if (!rom.itens.length) rom.itens.push({ modeloId: '', qtd: 1, preco: 0 }); render(); return; }
        if (b.id === 'rpLimpar') { rom = vazio(); render(); return; }
        if (b.id === 'rpSalvar') { salvar(); return; }
        if (b.id === 'rp3D') {
            lerCampos();
            const it = rom.itens.find(i => i.modeloId);
            const m = modelos.find(x => x.id === it?.modeloId);
            if (!m) { msg('Escolha um palete para ver em 3D.', true); return; }
            const qtd = rom.itens.filter(i => i.modeloId === m.id).reduce((s, i) => s + int(i.qtd), 0);
            await window.abrirPalete3D?.(m);
            document.querySelector('[data-pvista="caminhao"]')?.click();
            const q = document.getElementById('v3dQtd');
            if (q && qtd) { q.value = qtd; q.dispatchEvent(new Event('change')); }
        }
    });
}

async function abrirRomaneioPaletes() {
    instalar();
    if (!rom) rom = vazio();
    const alvo = document.getElementById('romaneioPaletes');
    if (alvo && !alvo.innerHTML.trim()) alvo.innerHTML = '<p class="pal-vazio"><span class="saw-loader" aria-hidden="true"></span> Carregando…</p>';
    await carregarBase();
    await render(true);
}

// ---------- seletor Madeira serrada / Paletes no Gerar Romaneio ----------
window.trocarTipoRomaneio = function(tipo) {
    const mods = window.modulosSistema?.() || { serraria: true, paletes: true };
    if (tipo === 'paletes' && mods.paletes === false) tipo = 'madeira';
    if (tipo === 'madeira' && mods.serraria === false) tipo = 'paletes';
    const sec = document.getElementById('secao-romaneio-v2');
    if (!sec) return;
    sec.classList.toggle('modo-paletes', tipo === 'paletes');
    sec.querySelectorAll('[data-romtipo]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.romtipo === tipo)));
    const box = document.getElementById('romaneioPaletes');
    if (box) box.hidden = tipo !== 'paletes';
    if (tipo === 'paletes') abrirRomaneioPaletes();
};
function prepararTela() {
    const mods = window.modulosSistema?.() || {};
    const sec = document.getElementById('secao-romaneio-v2');
    const ab = sec?.querySelector('.rom-tipo-abas');
    if (ab) ab.hidden = mods.paletes === false || mods.serraria === false;
    window.trocarTipoRomaneio(sec?.classList.contains('modo-paletes') || mods.serraria === false ? 'paletes' : 'madeira');
}
document.addEventListener('app:section-change', e => { if (e.detail?.id === 'view-romaneio-v2') prepararTela(); });
setTimeout(() => { if (document.getElementById('view-romaneio-v2')?.classList.contains('active-section')) prepararTela(); }, 0);

// ---------- Historico de Vendas: filtro Paletes ----------
async function carregarHistorico() {
    const snap = await getDocs(collection(db, COL));
    historico = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.criadoEm || b.data || '').localeCompare(String(a.criadoEm || a.data || '')));
}
window.HistoricoPaletes = {
    async render(tbody, termo = '', recarregar = true) {
        const header = tbody?.closest('table')?.querySelector('thead tr');
        if (header) header.innerHTML = '<th>Romaneio Nº</th><th>Data</th><th>Cliente</th><th>Paletes</th><th>Valor Total</th><th>Ações</th>';
        if (!tbody) return;
        if (recarregar) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Carregando...</td></tr>';
            try { await carregarHistorico(); }
            catch (e) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${e?.code === 'permission-denied' ? 'Sem permissão para ver os romaneios de paletes (confira as regras do Firestore).' : 'Erro ao carregar.'}</td></tr>`; return; }
        }
        const t = String(termo || '').toLowerCase();
        const lista = historico.filter(r => !t || `${r.cliente} ${r.numero}`.toLowerCase().includes(t));
        if (!lista.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum romaneio de paletes.</td></tr>'; return; }
        tbody.innerHTML = lista.map(r => `<tr>
            <td><strong>${esc(r.numero)}</strong></td><td>${dataBR(r.data)}</td><td>${esc(r.cliente)}</td>
            <td>${(r.itens || []).map(i => `${int(i.qtd)} × ${esc(i.nome)}`).join('<br>')}</td><td>${brl(r.total)}</td>
            <td><div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn-secondary" onclick="window.HistoricoPaletes.imprimir('${esc(r.id)}')"><i class="fa-solid fa-print"></i> Imprimir</button>
              <button type="button" class="btn-secondary" onclick="window.HistoricoPaletes.editar('${esc(r.id)}')"><i class="fa-solid fa-pen"></i> Editar</button>
              <button type="button" class="btn-secondary" onclick="window.HistoricoPaletes.excluir('${esc(r.id)}')"><i class="fa-solid fa-trash"></i> Excluir</button>
            </div></td></tr>`).join('');
    },
    async imprimir(id) { const r = historico.find(x => x.id === id); if (r) imprimir(r); },
    async editar(id) {
        const r = historico.find(x => x.id === id);
        if (!r) return;
        rom = {
            numero: r.numero, clienteId: r.clienteId, data: r.data || hoje(), transporteId: r.transporteId || '', motorista: r.motorista || '',
            caminhao: r.caminhao || '', placa: r.placa || '', obs: r.obs || '',
            itens: (r.itens || []).map(i => ({ modeloId: i.modeloId, qtd: int(i.qtd), preco: num(i.preco) })),
            editando: { id: r.id, numero: r.numero, cliente: r.cliente, itens: r.itens || [] }
        };
        document.querySelector('a[data-target="view-romaneio-v2"]')?.click();
        setTimeout(() => window.trocarTipoRomaneio('paletes'), 300);
    },
    async excluir(id) {
        const r = historico.find(x => x.id === id);
        if (!r) return;
        if (!confirm(`Excluir o romaneio ${r.numero}? Os paletes voltam para o estoque. A cobrança no Financeiro precisa ser cancelada lá.`)) return;
        try {
            if (window.FS?.deleteDoc) await window.FS.deleteDoc(COL, r.id); else await deleteDoc(doc(db, COL, r.id)); // primeiro apaga (confere a permissao), depois devolve ao estoque
            await window.PaletesEstoque.estornarVenda({ romaneioId: r.id, numero: r.numero, cliente: r.cliente, itens: r.itens || [] });
            historico = historico.filter(x => x.id !== id);
            const tbody = document.getElementById('listaHistorico');
            this.render(tbody, document.getElementById('filtroHistoricoCliente')?.value || '', false);
        } catch (e) {
            alert(e?.code === 'permission-denied' ? 'Somente gerente ou admin podem excluir.' : 'Não foi possível excluir.');
        }
    }
};
