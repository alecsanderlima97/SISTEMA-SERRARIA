// Modelos de palete (modulo Paletes): receita do palete, pedido do cliente e 3D.
// Os modelos ficam em configuracoes_sistema/modelos_palete (leitura: usuarios aprovados;
// gravacao: gerente/admin, pela regra ja existente). Nada aqui altera madeiras, patio ou estoque.
import { db, doc, getDoc, setDoc, collection, getDocs } from './firebase-init.js';

const DOC_REF = () => doc(db, 'configuracoes_sistema', 'modelos_palete');
const POSICOES = {
    superior: 'Tábua de cima',
    ligacao: 'Tábua de ligação',
    bloco: 'Bloco',
    inferior: 'Tábua de baixo',
    outro: 'Outro'
};

let modelos = [];
let editando = null;      // copia do modelo aberto no editor
let carregado = false;

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const novoId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let madeirasCache = [];
const madeiras = () => { const lista = window.obterProdutosMadeira?.() || []; return lista.length ? lista : madeirasCache; };
async function carregarMadeiras() {
    if ((window.obterProdutosMadeira?.() || []).length) return;
    try { madeirasCache = (await getDocs(collection(db, 'produtos'))).docs.map(d => ({ id: d.id, ...d.data() })); }
    catch (_) { madeirasCache = []; }
}

// Modelo inicial PBR. Manual ABRAS PBR-1 (2019): 1,00 x 1,20 m, 8 tabuas de cima de 1.200 mm,
// 3 de baixo de 1.200 mm, 3 de ligacao de 1.000 x 125 mm, 9 blocos, eucalipto, carga 1.200 kg.
// Desenho do usuario: altura total 137 mm e vao de entrada 99 mm. Com tabuas de 1,9 cm:
// 1,9 (baixo) + 8,0 (bloco) + 1,9 (ligacao) + 1,9 (cima) = 13,7 cm; vao = 8,0 + 1,9 = 9,9 cm.
// Espessura das tabuas, larguras de cima/baixo e medida do bloco sao deducoes: o usuario confirma.
function modeloPBR() {
    return {
        id: 'm' + Date.now().toString(36),
        nome: 'PBR 1,00 × 1,20',
        comprimento: 1.2,
        largura: 1.0,
        pregos: 0,
        obs: 'Altura 137 mm e vão 99 mm conforme desenho PBR. Confirmar espessura das tábuas (1,9 cm deduzida), larguras de cima/baixo, medida do bloco e pregos no manual ABRAS PBR-1.',
        componentes: [
            { id: novoId(), posicao: 'superior', produtoId: '', esp: 1.9, larg: 11, comp: 1.2, qtd: 8 },
            { id: novoId(), posicao: 'ligacao', produtoId: '', esp: 1.9, larg: 12.5, comp: 1.0, qtd: 3 },
            { id: novoId(), posicao: 'bloco', produtoId: '', esp: 8.0, larg: 11, comp: 0.10, qtd: 9 },
            { id: novoId(), posicao: 'inferior', produtoId: '', esp: 1.9, larg: 11, comp: 1.2, qtd: 3 }
        ]
    };
}

async function carregarModelos() {
    try {
        const snap = await getDoc(DOC_REF());
        modelos = snap.exists() ? (snap.data().modelos || []) : [];
    } catch (error) {
        console.warn('Paletes: nao foi possivel carregar os modelos.', error);
        modelos = [];
    }
    carregado = true;
}

async function salvarModelos(lista) {
    await setDoc(DOC_REF(), { modelos: lista, atualizadoEm: new Date().toISOString() }, { merge: true });
    modelos = lista;
}

// ---------- contas ----------
function volumePeca(c) { return (num(c.esp) / 100) * (num(c.larg) / 100) * num(c.comp); }
function resumoModelo(m) {
    const pecas = m.componentes.reduce((s, c) => s + num(c.qtd), 0);
    const m3 = m.componentes.reduce((s, c) => s + num(c.qtd) * volumePeca(c), 0);
    return { pecas, m3 };
}

// Pedido: N paletes -> pecas por componente -> pecas da madeira (rendimento quando corta de peca maior) -> pacotes.
function calcularPedido(m, qtdPaletes) {
    const lista = madeiras();
    const porMadeira = new Map();
    const linhas = m.componentes.map(c => {
        const total = Math.max(0, Math.round(num(c.qtd) * qtdPaletes));
        const prod = lista.find(p => p.id === c.produtoId);
        let rendimento = 1, pecasMadeira = total, pacotes = null, paletesPorPacote = null, pecasPorPacote = 0;
        if (prod) {
            const compMadeira = num(prod.comprimentoReal) || num(prod.comprimentoVenda);
            rendimento = compMadeira && num(c.comp) > 0 ? Math.max(1, Math.floor(compMadeira / num(c.comp) + 0.001)) : 1;
            pecasMadeira = Math.ceil(total / rendimento);
            pecasPorPacote = num(prod.pecasPorPacote);
            if (pecasPorPacote > 0) {
                pacotes = pecasMadeira / pecasPorPacote;
                paletesPorPacote = num(c.qtd) > 0 ? Math.floor((pecasPorPacote * rendimento) / num(c.qtd)) : null;
            }
            const chave = prod.id;
            const atual = porMadeira.get(chave) || { prod, pecasMadeira: 0, pecasPorPacote, m3: 0 };
            atual.pecasMadeira += pecasMadeira;
            atual.m3 += pecasMadeira * (num(prod.espessura) / 100) * (num(prod.largura) / 100) * compMadeira;
            porMadeira.set(chave, atual);
        }
        return { c, prod, total, rendimento, pecasMadeira, pacotes, paletesPorPacote };
    });
    const madeirasPedido = [...porMadeira.values()].map(x => ({ ...x, pacotes: x.pecasPorPacote > 0 ? x.pecasMadeira / x.pecasPorPacote : null }));
    return { linhas, madeirasPedido, m3Pecas: resumoModelo(m).m3 * qtdPaletes };
}

// ---------- tela ----------
function nomeMadeira(p) {
    if (!p) return '';
    const classe = String(p.classe || p.qualidade || '').match(/[123]/)?.[0];
    return `${p.tipo || 'Madeira'} ${classe ? classe + 'ª ' : ''}· ${fmt(p.espessura, 1)} × ${fmt(p.largura, 1)} × ${fmt(p.comprimentoReal || p.comprimentoVenda, 2)}`;
}

function htmlLista() {
    if (!modelos.length) return '<p class="pal-vazio">Nenhum modelo salvo ainda. Comece pelo modelo PBR.</p>';
    return modelos.map(m => {
        const r = resumoModelo(m);
        return `<button type="button" class="pal-card ${editando?.id === m.id ? 'is-ativo' : ''}" data-abrir="${esc(m.id)}">
            <b>${esc(m.nome)}</b><span>${fmt(m.largura, 2)} × ${fmt(m.comprimento, 2)} m · ${r.pecas} peças · ${fmt(r.m3, 4)} m³</span></button>`;
    }).join('');
}

function htmlEditor() {
    if (!editando) return '<p class="pal-vazio">Escolha um modelo ou crie um novo.</p>';
    const m = editando;
    const opcoesMadeira = sel => `<option value="">Medida manual</option>` + madeiras().map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(nomeMadeira(p))}</option>`).join('');
    const r = resumoModelo(m);
    const linhas = m.componentes.map((c, i) => `
        <tr>
          <td><select data-c="${i}" data-campo="posicao" aria-label="Posição">${Object.entries(POSICOES).map(([k, v]) => `<option value="${k}" ${k === c.posicao ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
          <td><select data-c="${i}" data-campo="produtoId" aria-label="Madeira usada">${opcoesMadeira(c.produtoId)}</select></td>
          <td><input data-c="${i}" data-campo="esp" type="number" step="0.1" value="${c.esp}" aria-label="Espessura (cm)"></td>
          <td><input data-c="${i}" data-campo="larg" type="number" step="0.5" value="${c.larg}" aria-label="Largura (cm)"></td>
          <td><input data-c="${i}" data-campo="comp" type="number" step="0.01" value="${c.comp}" aria-label="Comprimento (m)"></td>
          <td><input data-c="${i}" data-campo="qtd" type="number" step="1" min="0" value="${c.qtd}" aria-label="Quantidade por palete"></td>
          <td class="pal-num">${fmt(num(c.qtd) * volumePeca(c), 4)}</td>
          <td><button type="button" class="pal-btn-x" data-remover="${i}" aria-label="Remover componente">×</button></td>
        </tr>`).join('');
    return `
      <div class="pal-editor-topo">
        <label>Nome do modelo<input id="palNome" type="text" value="${esc(m.nome)}"></label>
        <label>Largura (m)<input id="palLarg" type="number" step="0.01" value="${m.largura}"></label>
        <label>Comprimento (m)<input id="palComp" type="number" step="0.01" value="${m.comprimento}"></label>
        <label>Pregos por palete<span class="pal-inline"><input id="palPregos" type="number" step="1" min="0" value="${m.pregos || 0}"><button type="button" class="pal-btn" id="palSugerirPregos" title="Conta 2 pregos por cruzamento: tábua de cima × ligação e tábua de baixo × blocos">Sugerir</button></span></label>
      </div>
      <div class="pal-tabela-wrap">
        <table class="pal-tabela">
          <thead><tr><th>Posição</th><th>Madeira usada</th><th>Esp. (cm)</th><th>Larg. (cm)</th><th>Comp. (m)</th><th>Qtd.</th><th>m³</th><th></th></tr></thead>
          <tbody>${linhas}</tbody>
          <tfoot><tr><td colspan="5"><button type="button" class="pal-btn" id="palAddComp">+ Componente</button></td><td class="pal-num"><b>${r.pecas}</b> pç</td><td class="pal-num"><b>${fmt(r.m3, 4)}</b></td><td></td></tr></tfoot>
        </table>
      </div>
      <label class="pal-obs">Observação<textarea id="palObs" rows="2">${esc(m.obs || '')}</textarea></label>
      <div class="pal-acoes">
        <button type="button" class="pal-btn pal-btn-azul" id="pal3D"><i class="fa-solid fa-cube"></i> Ver palete em 3D</button>
        <button type="button" class="pal-btn pal-btn-ok" id="palSalvar"><i class="fa-solid fa-floppy-disk"></i> Salvar modelo</button>
        <button type="button" class="pal-btn pal-btn-vermelho" id="palExcluir">Excluir modelo</button>
      </div>`;
}

function htmlPedido() {
    if (!editando) return '';
    const qtd = Math.max(0, parseInt(document.getElementById('palQtdPedido')?.value || '500', 10) || 0);
    const p = calcularPedido(editando, qtd);
    const linhas = p.linhas.map(l => `
        <tr>
          <td>${POSICOES[l.c.posicao] || l.c.posicao}<small>${fmt(l.c.esp, 1)} × ${fmt(l.c.larg, 1)} × ${fmt(l.c.comp, 2)}</small></td>
          <td class="pal-num">${l.total.toLocaleString('pt-BR')}</td>
          <td>${l.prod ? esc(nomeMadeira(l.prod)) : '<span class="pal-aviso">sem madeira vinculada</span>'}${l.prod && (Math.abs(num(l.prod.espessura) - num(l.c.esp)) > 0.05 || Math.abs(num(l.prod.largura) - num(l.c.larg)) > 0.05) ? `<small class="pal-aviso">medida diferente da peça (${fmt(l.c.esp, 1)} × ${fmt(l.c.larg, 1)})</small>` : ''}</td>
          <td class="pal-num">${l.prod ? (l.rendimento > 1 ? `${l.rendimento} por peça` : '1:1') : '—'}</td>
          <td class="pal-num">${l.prod ? l.pecasMadeira.toLocaleString('pt-BR') : '—'}</td>
          <td class="pal-num">${l.paletesPorPacote != null ? l.paletesPorPacote.toLocaleString('pt-BR') : '—'}</td>
        </tr>`).join('');
    const resumo = p.madeirasPedido.map(x => `
        <li><b>${x.pacotes != null ? fmt(x.pacotes, 1) : '?'} pacote(s)</b> de ${esc(nomeMadeira(x.prod))}
          <span>${x.pecasMadeira.toLocaleString('pt-BR')} peças${x.pecasPorPacote ? ` · ${x.pecasPorPacote} pç/pacote` : ' · cadastre a configuração do pacote'} · ${fmt(x.m3, 3)} m³</span></li>`).join('');
    return `
      <div class="pal-pedido-topo">
        <label>Quantos paletes o cliente quer?<input id="palQtdPedido" type="number" min="1" step="1" value="${qtd}"></label>
        <div class="pal-total"><b>${fmt(p.m3Pecas, 3)} m³</b><span>de madeira nas peças do palete</span></div>
        <div class="pal-total"><b>${(Number(editando.pregos || 0) * qtd).toLocaleString('pt-BR')}</b><span>pregos (${editando.pregos || 0} por palete)</span></div>
      </div>
      ${resumo ? `<ul class="pal-resumo">${resumo}</ul>` : '<p class="pal-aviso">Vincule cada componente a uma madeira cadastrada para calcular os pacotes.</p>'}
      <div class="pal-tabela-wrap">
        <table class="pal-tabela">
          <thead><tr><th>Componente</th><th>Peças</th><th>Sai da madeira</th><th>Rendimento</th><th>Peças da madeira</th><th>Paletes por pacote</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <p class="pal-nota">Rendimento: quantos toquinhos saem de uma peça da madeira (ex.: viga de 7,2 ou 8,0 × 11 × 2,40 cortada em blocos de 0,10 m = 24), sem contar perda de serra. Pacotes arredondados para cima na hora de carregar.</p>`;
}

function render() {
    const alvo = document.getElementById('paletesModelos');
    if (!alvo) return;
    alvo.innerHTML = `
      <div class="section-title"><h2><i class="fa-solid fa-pallet"></i> Modelos de palete</h2></div>
      <div class="pal-grid">
        <aside class="pal-lista">
          <button type="button" class="pal-btn pal-btn-azul" id="palNovoPBR">+ Novo modelo PBR</button>
          <div id="palListaModelos">${htmlLista()}</div>
        </aside>
        <div class="pal-main">
          <section class="pal-bloco"><h3>Receita do palete</h3><div id="palEditor">${htmlEditor()}</div></section>
          <section class="pal-bloco" id="palPedidoBloco" ${editando ? '' : 'hidden'}><h3>Pedido do cliente</h3><div id="palPedido">${htmlPedido()}</div></section>
        </div>
      </div>`;
}

function atualizarParcial() {
    const ed = document.getElementById('palEditor');
    const ped = document.getElementById('palPedido');
    const lista = document.getElementById('palListaModelos');
    if (ed) ed.innerHTML = htmlEditor();
    if (ped) ped.innerHTML = htmlPedido();
    if (lista) lista.innerHTML = htmlLista();
    const bloco = document.getElementById('palPedidoBloco');
    if (bloco) bloco.hidden = !editando;
}

function lerTopo() {
    if (!editando) return;
    const v = id => document.getElementById(id)?.value;
    if (v('palNome') !== undefined) editando.nome = String(v('palNome')).trim() || 'Palete';
    editando.largura = num(v('palLarg')) || editando.largura;
    editando.comprimento = num(v('palComp')) || editando.comprimento;
    editando.pregos = Math.max(0, parseInt(v('palPregos'), 10) || 0);
    editando.obs = v('palObs') ?? editando.obs;
}

function instalarEventos() {
    const alvo = document.getElementById('paletesModelos');
    if (!alvo || alvo.dataset.eventos) return;
    alvo.dataset.eventos = '1';
    alvo.addEventListener('click', async e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.id === 'palNovoPBR') { editando = modeloPBR(); render(); return; }
        if (t.dataset.abrir) { editando = JSON.parse(JSON.stringify(modelos.find(m => m.id === t.dataset.abrir))); render(); return; }
        if (t.id === 'palAddComp') { lerTopo(); editando.componentes.push({ id: novoId(), posicao: 'outro', produtoId: '', esp: 1.7, larg: 10, comp: 1.0, qtd: 1 }); atualizarParcial(); return; }
        if (t.dataset.remover !== undefined) { lerTopo(); editando.componentes.splice(Number(t.dataset.remover), 1); atualizarParcial(); return; }
        if (t.id === 'pal3D') {
            lerTopo();
            const lista = madeiras();
            const comOrigem = JSON.parse(JSON.stringify(editando));
            comOrigem.componentes.forEach(c => {
                const prod = lista.find(p => p.id === c.produtoId);
                if (prod) c.origem = { comp: num(prod.comprimentoReal) || num(prod.comprimentoVenda), esp: num(prod.espessura), larg: num(prod.largura) };
            });
            window.abrirPalete3D?.(comOrigem);
            return;
        }
        if (t.id === 'palSugerirPregos') {
            lerTopo();
            const n = window.sugerirPregosPalete?.(editando);
            if (n) { editando.pregos = n; atualizarParcial(); }
            return;
        }
        if (t.id === 'palSalvar') {
            lerTopo();
            const lista = modelos.filter(m => m.id !== editando.id).concat([JSON.parse(JSON.stringify(editando))]);
            t.disabled = true;
            try { await salvarModelos(lista); atualizarParcial(); alert('Modelo de palete salvo.'); }
            catch (error) { console.error(error); alert(error?.code === 'permission-denied' ? 'Somente gerente ou admin podem salvar modelos de palete.' : 'Não foi possível salvar o modelo. Tente de novo.'); }
            finally { t.disabled = false; }
            return;
        }
        if (t.id === 'palExcluir') {
            if (!modelos.some(m => m.id === editando.id)) { editando = null; render(); return; }
            if (!(await window.confirmarExclusaoComSenha?.('Excluir este modelo de palete?'))) return;
            try { await salvarModelos(modelos.filter(m => m.id !== editando.id)); editando = null; render(); }
            catch (error) { alert(error?.code === 'permission-denied' ? 'Somente gerente ou admin podem excluir modelos de palete.' : 'Não foi possível excluir o modelo.'); }
        }
    });
    alvo.addEventListener('change', e => {
        const el = e.target;
        if (!editando) return;
        if (el.dataset.c !== undefined) {
            const c = editando.componentes[Number(el.dataset.c)];
            const campo = el.dataset.campo;
            if (campo === 'posicao') c.posicao = el.value;
            else if (campo === 'produtoId') {
                c.produtoId = el.value;
                const prod = madeiras().find(p => p.id === el.value);
                if (prod) {
                    if (!num(c.esp)) c.esp = num(prod.espessura);
                    if (!num(c.larg)) c.larg = num(prod.largura);
                    if (!num(c.comp)) c.comp = num(prod.comprimentoReal) || num(prod.comprimentoVenda);
                }
            } else c[campo] = num(el.value);
            lerTopo();
            atualizarParcial();
            return;
        }
        if (['palNome', 'palLarg', 'palComp', 'palPregos', 'palObs'].includes(el.id)) { lerTopo(); const l = document.getElementById('palListaModelos'); if (l) l.innerHTML = htmlLista(); }
        if (el.id === 'palQtdPedido') { const ped = document.getElementById('palPedido'); if (ped) ped.innerHTML = htmlPedido(); }
    });
}

window.renderPaletes = async function() {
    instalarEventos();
    await carregarMadeiras();
    if (!carregado) {
        const alvo = document.getElementById('paletesModelos');
        if (alvo) alvo.innerHTML = '<p class="pal-vazio"><span class="saw-loader" aria-hidden="true"></span> Carregando modelos…</p>';
        await carregarModelos();
    }
    render();
};

document.addEventListener('produtosUpdated', () => {
    if (document.getElementById('tabProdPalete')?.style.display === 'block') atualizarParcial();
});
// API para estoque, montagem e romaneio de paletes (js/paletes-estoque.js e js/romaneio-paletes.js)
window.PaletesAPI = {
    async modelos() { if (!carregado) await carregarModelos(); return modelos; },
    async madeiras() { await carregarMadeiras(); return madeiras(); },
    async pedido(m, qtd) { await carregarMadeiras(); return calcularPedido(m, qtd); },
    nomeMadeira,
    resumo: resumoModelo
};
