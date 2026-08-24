import { db, auth, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from './firebase-init.js';

// ---- MÓDULO: ENTRADA DE MADEIRA E EMPREITEIROS ----

const formEmpreiteiro = document.getElementById('formEmpreiteiro');
const listaEmpreiteiros = document.getElementById('listaEmpreiteiros');
const selectEmpreiteiro = document.getElementById('entEmpreiteiro');

let empreiteirosAtuais = [];
let empreiteiroEditandoId = null;
let matosEmpreiteiroEditando = [];
let ordenarEmpreiteirosAZ = false;

function injetarEstiloEmpreiteiro() {
    if (document.getElementById('empreiteiro-layout-style')) return;
    const style = document.createElement('style');
    style.id = 'empreiteiro-layout-style';
    style.textContent = `
        #formEmpreiteiro.form-empreiteiro {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: end;
            gap: 14px;
        }
        #formEmpreiteiro .emp-matos-group {
            grid-column: 1 / -1;
        }
        #formEmpreiteiro .emp-matos-row {
            display: grid;
            grid-template-columns: minmax(180px, 1.3fr) repeat(4, minmax(105px, 130px)) minmax(132px, auto);
            gap: 10px;
            align-items: stretch;
        }
        #formEmpreiteiro .emp-matos-labels {
            display: grid;
            grid-template-columns: minmax(180px, 1.3fr) repeat(4, minmax(105px, 130px)) minmax(132px, auto);
            gap: 10px;
            margin: 2px 0 6px;
            color: #a7b0c0;
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
        }
        #formEmpreiteiro .emp-matos-row input,
        #formEmpreiteiro .emp-matos-row button {
            min-width: 0;
            height: 42px;
            margin-bottom: 0 !important;
        }
        #formEmpreiteiro #btnAdicionarMatoEmpreiteiro {
            width: 100%;
            padding: 0 14px;
            white-space: nowrap;
            justify-content: center;
        }
        #empMatosLista span {
            max-width: 100%;
            overflow-wrap: anywhere;
        }
        #panelListaEmpreiteiros .table-container {
            max-width: 100%;
            overflow-x: hidden;
        }
        #panelListaEmpreiteiros table {
            width: 100%;
            table-layout: fixed;
        }
        #panelListaEmpreiteiros th:nth-child(1),
        #panelListaEmpreiteiros td:nth-child(1) { width: 18%; }
        #panelListaEmpreiteiros th:nth-child(2),
        #panelListaEmpreiteiros td:nth-child(2) { width: 13%; }
        #panelListaEmpreiteiros th:nth-child(3),
        #panelListaEmpreiteiros td:nth-child(3) { width: 39%; }
        #panelListaEmpreiteiros th:nth-child(4),
        #panelListaEmpreiteiros td:nth-child(4) { width: 11%; }
        #panelListaEmpreiteiros th:nth-child(5),
        #panelListaEmpreiteiros td:nth-child(5) { width: 11%; }
        #panelListaEmpreiteiros th:nth-child(6),
        #panelListaEmpreiteiros td:nth-child(6) { width: 8%; }
        #panelListaEmpreiteiros td {
            overflow-wrap: anywhere;
            vertical-align: top;
        }
        .empreiteiro-matos-wrap {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            max-width: 100%;
        }
        .empreiteiro-mato-chip {
            display: inline-flex;
            flex-direction: column;
            gap: 2px;
            max-width: 180px;
            padding: 5px 8px;
            border-radius: 8px;
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.22);
            color: #f8fafc;
            line-height: 1.2;
        }
        .empreiteiro-mato-chip strong {
            font-size: 0.76rem;
            overflow-wrap: anywhere;
        }
        .empreiteiro-mato-chip small {
            color: #facc15;
            font-weight: 800;
            white-space: nowrap;
        }
        @media (max-width: 760px) {
            #formEmpreiteiro.form-empreiteiro,
            #formEmpreiteiro .emp-matos-row,
            #formEmpreiteiro .emp-matos-labels {
                grid-template-columns: 1fr;
            }
            #formEmpreiteiro .emp-matos-labels span:not(:first-child) {
                display: none;
            }
            #formEmpreiteiro .input-group {
                grid-column: 1 / -1 !important;
            }
            #panelListaEmpreiteiros .table-container {
                overflow-x: auto;
            }
            #panelListaEmpreiteiros table {
                min-width: 720px;
            }
        }
    `;
    document.head.appendChild(style);
}

function normalizarNomeMato(nome) {
    return (nome || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function obterMatosEmpreiteiro(emp) {
    const matos = Array.isArray(emp?.matos) ? emp.matos : [];
    const normalizados = matos.map(mato => {
        if (typeof mato === 'string') {
            return criarMatoEmpreiteiro(mato, Number(emp?.valorMetro) || 0);
        }
        return criarMatoEmpreiteiro(mato?.nome, mato?.valorMetro ?? emp?.valorMetro, mato);
    });

    if (normalizados.length === 0 && emp?.mato) {
        normalizados.push(criarMatoEmpreiteiro(emp.mato, Number(emp?.valorMetro) || 0, emp));
    }

    const unicos = new Map();
    normalizados.filter(mato => mato.nome).forEach(mato => unicos.set(mato.nome, mato));
    return [...unicos.values()];
}

function criarMatoEmpreiteiro(nome, valorMetro = 0, extras = {}) {
    const valorPadrao = Number(valorMetro ?? extras?.valorMetro) || 0;
    return {
        nome: (nome || '').toString().toUpperCase().trim(),
        valorMetro: valorPadrao,
        valorLenha: Number(extras?.valorLenha ?? extras?.valorMetroLenha ?? 0) || 0,
        valorOutros: Number(extras?.valorOutros ?? extras?.valorMetroOutros ?? 0) || 0,
        valorCorteRemocao: Number(extras?.valorCorteRemocao ?? extras?.valorCorte ?? 0) || 0
    };
}

function obterValorMatoPorProduto(mato = {}, produto = '') {
    const tipo = normalizarNomeMato(produto);
    if (tipo.includes('LENHA')) return Number(mato.valorLenha ?? mato.valorMetro) || 0;
    if (tipo.includes('CORTE') || tipo.includes('REMOCAO') || tipo.includes('REMOÇÃO')) return Number(mato.valorCorteRemocao ?? 0) || 0;
    if (tipo.includes('OUTRO')) return Number(mato.valorOutros ?? mato.valorMetro) || 0;
    return Number(mato.valorMetro) || 0;
}

function obterMatoSelecionadoEntrada() {
    const selectMato = document.getElementById('entMatoSelect');
    if (selectMato && selectMato.style.display !== 'none' && selectMato.selectedIndex > 0) {
        const opt = selectMato.selectedOptions[0];
        return {
            nome: opt.value,
            valorMetro: Number(opt.dataset.valor || 0),
            valorLenha: Number(opt.dataset.valorLenha || 0),
            valorOutros: Number(opt.dataset.valorOutros || 0),
            valorCorteRemocao: Number(opt.dataset.valorCorteRemocao || 0)
        };
    }
    if (selectEmpreiteiro && selectEmpreiteiro.selectedIndex > 0) {
        const opt = selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex];
        return {
            nome: entMato?.value || '',
            valorMetro: Number(opt.dataset.valor || 0),
            valorLenha: Number(opt.dataset.valorLenha || 0),
            valorOutros: Number(opt.dataset.valorOutros || 0),
            valorCorteRemocao: Number(opt.dataset.valorCorteRemocao || 0)
        };
    }
    return {};
}

function renderizarMatosEmpreiteiro() {
    const lista = document.getElementById('empMatosLista');
    if (!lista) return;
    lista.innerHTML = '';

    matosEmpreiteiroEditando.forEach((mato, index) => {
        const chip = document.createElement('span');
        chip.style.cssText = 'display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border-radius:14px; background:rgba(44,201,144,0.12); border:1px solid rgba(44,201,144,0.35); color:#d1fae5; font-size:0.78rem;';
        const valor = Number(mato.valorMetro || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const lenha = Number(mato.valorLenha || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const outros = Number(mato.valorOutros || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const corte = Number(mato.valorCorteRemocao || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        chip.innerHTML = `${mato.nome} - Tora ${valor}/m3 | Lenha ${lenha}/m3 | Outros ${outros}/m3 | Corte ${corte}/m3 <button type="button" data-action="edit" data-index="${index}" style="border:none; background:transparent; color:#93c5fd; cursor:pointer; font-weight:bold;" title="Editar mato"><i class="fa-solid fa-pen"></i></button><button type="button" data-action="remove" data-index="${index}" style="border:none; background:transparent; color:#fca5a5; cursor:pointer; font-weight:bold;" title="Remover mato">x</button>`;
        lista.appendChild(chip);
    });
}
function adicionarMatoEmpreiteiro() {
    const input = document.getElementById('empMato');
    const inputValor = document.getElementById('empMatoValor');
    const inputValorLenha = document.getElementById('empMatoValorLenha');
    const inputValorOutros = document.getElementById('empMatoValorOutros');
    const inputValorCorte = document.getElementById('empMatoValorCorte');
    const mato = (input?.value || '').toUpperCase().trim();
    const valorMetro = window.parseCurrencyValue(inputValor?.value || '') || 0;
    const valorLenha = window.parseCurrencyValue(inputValorLenha?.value || '') || 0;
    const valorOutros = window.parseCurrencyValue(inputValorOutros?.value || '') || 0;
    const valorCorteRemocao = window.parseCurrencyValue(inputValorCorte?.value || '') || 0;
    if (!mato) return;
    const existente = matosEmpreiteiroEditando.find(item => normalizarNomeMato(item.nome) === normalizarNomeMato(mato));
    if (existente) {
        existente.nome = mato;
        existente.valorMetro = valorMetro;
        existente.valorLenha = valorLenha;
        existente.valorOutros = valorOutros;
        existente.valorCorteRemocao = valorCorteRemocao;
    } else {
        matosEmpreiteiroEditando.push({ nome: mato, valorMetro, valorLenha, valorOutros, valorCorteRemocao });
        matosEmpreiteiroEditando.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    if (input) input.value = '';
    if (inputValor) inputValor.value = '';
    if (inputValorLenha) inputValorLenha.value = '';
    if (inputValorOutros) inputValorOutros.value = '';
    if (inputValorCorte) inputValorCorte.value = '';
    renderizarMatosEmpreiteiro();
}
function formatarMatosListaEmpreiteiro(emp) {
    const matos = obterMatosEmpreiteiro(emp);
    if (!matos.length) return '-';
    return `<div class="empreiteiro-matos-wrap">${matos.map(item => {
        const valor = Number(item.valorMetro || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const lenha = Number(item.valorLenha || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const outros = Number(item.valorOutros || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const corte = Number(item.valorCorteRemocao || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        return `<span class="empreiteiro-mato-chip"><strong>${item.nome}</strong><small>Tora ${valor}/m3</small><small>Lenha ${lenha}/m3</small><small>Outros ${outros}/m3</small><small>Corte ${corte}/m3</small></span>`;
    }).join('')}</div>`;
}

async function carregarEmpreiteiros() {
    if(listaEmpreiteiros) listaEmpreiteiros.innerHTML = '<tr><td colspan="6" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Carregando...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, 'empreiteiros'));
        empreiteirosAtuais = [];
        querySnapshot.forEach((doc) => {
            empreiteirosAtuais.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarEmpreiteiros();
        atualizarSelectEmpreiteiros();
    } catch (error) {
        console.error("Erro ao buscar empreiteiros: ", error);
        if(listaEmpreiteiros) listaEmpreiteiros.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Erro ao carregar empreiteiros.</td></tr>';
    }
}

function renderizarEmpreiteiros() {
    if(!listaEmpreiteiros) return;
    listaEmpreiteiros.innerHTML = '';
    
    const filtroInput = document.getElementById('filtroEmpreiteirosBusca');
    const filtro = filtroInput ? filtroInput.value.toLowerCase().trim() : '';
    
    const filtrados = empreiteirosAtuais.filter(emp => {
        const nome = (emp.nome || '').toLowerCase();
        const mato = obterMatosEmpreiteiro(emp).map(item => item.nome).join(' ').toLowerCase();
        return nome.includes(filtro) || mato.includes(filtro);
    });

    if (ordenarEmpreiteirosAZ) {
        filtrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    }

    if(filtrados.length === 0) {
        listaEmpreiteiros.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum empreiteiro encontrado.</td></tr>';
        return;
    }

    filtrados.forEach(emp => {
        const tr = document.createElement('tr');
        const valorFormatado = parseFloat(emp.valorMetro).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        tr.innerHTML = `
            <td><strong>${emp.nome}</strong></td>
            <td>${emp.contato || '-'}</td>
            <td class="empreiteiro-matos-cell">${formatarMatosListaEmpreiteiro(emp)}</td>
            <td style="color:var(--accent-color); font-weight:bold;">${valorFormatado}</td>
            <td>${emp.pix || '-'}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button onclick="window.editarEmpreiteiro('${emp.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1.1rem; padding: 4px;" title="Editar Empreiteiro">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="window.deletarEmpreiteiro('${emp.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1.1rem; padding: 4px;" title="Excluir Empreiteiro">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaEmpreiteiros.appendChild(tr);
    });
}

function atualizarSelectEmpreiteiros() {
    if(!selectEmpreiteiro) return;
    selectEmpreiteiro.innerHTML = '<option value="">Selecione o Empreiteiro...</option>';
    empreiteirosAtuais.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.nome;
        opt.dataset.valor = emp.valorMetro;
        opt.dataset.matos = JSON.stringify(obterMatosEmpreiteiro(emp));
        selectEmpreiteiro.appendChild(opt);
    });
}
window.renderizarEmpreiteiros = renderizarEmpreiteiros;

window.abrirCadastroEmpreiteiro = function() {
    empreiteiroEditandoId = null;
    matosEmpreiteiroEditando = [];
    if (formEmpreiteiro) {
        formEmpreiteiro.reset();
        const btn = formEmpreiteiro.querySelector('button[type="submit"]');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Empreiteiro';
    }
    renderizarMatosEmpreiteiro();
    const cardCad = document.getElementById('cardFormEmpreiteiro');
    const gridLayout = document.getElementById('gridEntradasGeralLayout');
    const colEsquerda = gridLayout ? gridLayout.querySelector('.form-column-left') : null;
    if (cardCad) cardCad.style.display = 'block';
    if (colEsquerda) {
        colEsquerda.style.display = 'block';
        colEsquerda.style.width = '100%';
        colEsquerda.style.maxWidth = '100%';
    }
    cardCad?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function preencherDadosEmpreiteiroSelecionado() {
    if (!selectEmpreiteiro) return;
    const opt = selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex];
    const entMatoSelect = document.getElementById('entMatoSelect');
    let matos = [];
    try {
        matos = JSON.parse(opt?.dataset?.matos || '[]');
    } catch {
        matos = [];
    }

    if (!entMato || !entMatoSelect) return;
    entMatoSelect.innerHTML = '<option value="">Selecione o Mato...</option>';

    if (matos.length > 1) {
        matos.forEach(mato => {
            const option = document.createElement('option');
            option.value = mato.nome;
            const valorTexto = Number(mato.valorMetro || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
            option.textContent = usuarioPodeVerFinanceiroEmpreiteiro() ? `${mato.nome} - Tora ${valorTexto}/m3` : mato.nome;
            option.dataset.valor = mato.valorMetro || 0;
            option.dataset.valorLenha = mato.valorLenha || 0;
            option.dataset.valorOutros = mato.valorOutros || 0;
            option.dataset.valorCorteRemocao = mato.valorCorteRemocao || 0;
            entMatoSelect.appendChild(option);
        });
        entMato.value = '';
        entMato.style.display = 'none';
        entMatoSelect.style.display = 'block';
        return;
    }

    entMatoSelect.style.display = 'none';
    entMato.style.display = 'block';
    entMato.value = (matos[0]?.nome || '').toUpperCase();
    if (selectEmpreiteiro && matos[0]) {
        selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].dataset.valor = matos[0].valorMetro || 0;
        selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].dataset.valorLenha = matos[0].valorLenha || 0;
        selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].dataset.valorOutros = matos[0].valorOutros || 0;
        selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].dataset.valorCorteRemocao = matos[0].valorCorteRemocao || 0;
    }
}

window.editarEmpreiteiro = function(id) {
    const emp = empreiteirosAtuais.find(e => e.id === id);
    if(!emp) return;
    empreiteiroEditandoId = id;
    
    document.getElementById('empNome').value = emp.nome || '';
    document.getElementById('empContato').value = emp.contato || '';
    document.getElementById('empMato').value = '';
    matosEmpreiteiroEditando = obterMatosEmpreiteiro(emp);
    renderizarMatosEmpreiteiro();
    document.getElementById('empPix').value = emp.pix || '';
    
    const btn = formEmpreiteiro.querySelector('button[type="submit"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Empreiteiro';
    
    // Garante que o card de cadastro de empreiteiros fique visível ao editar
    const cardCad = document.getElementById('cardFormEmpreiteiro');
    const btnToggle = document.getElementById('btnToggleCadastroEmpreiteiro');
    const gridLayout = document.getElementById('gridEntradasGeralLayout');
    const colEsquerda = gridLayout ? gridLayout.querySelector('.form-column-left') : null;
    if (cardCad && cardCad.style.display === 'none') {
        cardCad.style.display = 'block';
        if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Cadastro';
    }
    if (gridLayout) gridLayout.classList.remove('form-table-grid');
    if (colEsquerda) {
        colEsquerda.style.display = 'block';
        colEsquerda.style.width = '100%';
        colEsquerda.style.maxWidth = '100%';
        colEsquerda.style.margin = '0 0 16px 0';
    }
    
    window.scrollTo({top: formEmpreiteiro.offsetTop - 100, behavior: 'smooth'});
};

if(formEmpreiteiro) {
    formEmpreiteiro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formEmpreiteiro.querySelector('button[type="submit"]');
        const txtOriginal = btn.innerHTML;
        btn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
        btn.disabled = true;

        const dados = {
            nome: document.getElementById('empNome').value.toUpperCase().trim(),
            contato: document.getElementById('empContato').value.trim(),
            matos: [...matosEmpreiteiroEditando],
            mato: '',
            pix: document.getElementById('empPix').value.trim(),
            atualizadoEm: new Date().toISOString()
        };

        try {
            if (empreiteiroEditandoId) {
                await window.FS.updateDoc('empreiteiros', empreiteiroEditandoId, dados);
                alert('Empreiteiro atualizado com sucesso!');
                empreiteiroEditandoId = null;
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Empreiteiro';
            } else {
                dados.criadoEm = new Date().toISOString();
                await window.FS.addDoc('empreiteiros', dados);
                alert('Empreiteiro cadastrado com sucesso!');
            }
            formEmpreiteiro.reset();
            matosEmpreiteiroEditando = [];
            renderizarMatosEmpreiteiro();
            await carregarEmpreiteiros();
        } catch (error) {
            console.error("Erro ao salvar empreiteiro:", error);
            alert('Erro ao salvar o empreiteiro.');
        } finally {
            if(!empreiteiroEditandoId) btn.innerHTML = txtOriginal;
            btn.disabled = false;
        }
    });
}

window.deletarEmpreiteiro = async function(id) {
    if(await window.confirmarExclusaoComSenha("Tem certeza que deseja remover este empreiteiro?")) {
        try {
            await deleteDoc(doc(db, 'empreiteiros', id));
            await carregarEmpreiteiros();
        } catch(e) {
            console.error(e);
            alert("Erro ao remover empreiteiro.");
        }
    }
};


// --- 2. ENTRADA DE TORAS (CÁLCULOS E REGISTRO) ---
let formEntrada, listaEntradas, listaDescarregamentos, filtroEntradasNome, filtroDescargaNome, entRomaneio, entMato, entComp, entLarg, inputsAlt = [], resVolume, resInfo, resFinanceiro, infoFinanceira, entData, entHorario, entValorDescarga, resDescarga, infoDescarga;

let entradaEditandoId = null;
window.entradasAtuaisLista = [];
let mapaMatosEntrada = [];
let entradasSelecionadas = new Set();
let descargasSelecionadas = new Set();
let entradasUnsubscribe = null;
const FECHAMENTOS_SALVOS_KEY = 'orquestra_fechamentos_salvos';
let fechamentosSalvosExtracao = [];

function lerMatosMapaLocalEntrada() {
    try {
        return JSON.parse(localStorage.getItem('orquestra_mapa_matos') || '[]');
    } catch {
        return [];
    }
}

function obterMapaMatoSelecionadoEntrada() {
    const select = document.getElementById('entMapaMatoId');
    if (!select?.value) return null;
    return mapaMatosEntrada.find(item => String(item.id) === String(select.value)) || null;
}

function atualizarInfoMapaMatoEntrada() {
    const info = document.getElementById('entMapaMatoInfo');
    const item = obterMapaMatoSelecionadoEntrada();
    if (!info) return;
    if (!item) {
        info.textContent = 'Vincule a carga para acompanhar volume, custos e saldo do mato.';
        return;
    }
    const partes = [item.proprietario, item.endereco].filter(Boolean);
    info.textContent = partes.length ? partes.join(' | ') : 'Local vinculado ao controle operacional do Mapa.';
}

function renderizarMatosMapaEntrada(valorSelecionado = '') {
    const select = document.getElementById('entMapaMatoId');
    if (!select) return;
    const atual = valorSelecionado || select.value;
    select.innerHTML = '<option value="">Sem vínculo com o Mapa</option>';
    mapaMatosEntrada
        .filter(item => item && item.status !== 'FINALIZADO')
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
        .forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.nome || 'Mato sem nome'}${item.proprietario ? ` - ${item.proprietario}` : ''}`;
            select.appendChild(option);
        });
    if (atual && [...select.options].some(option => option.value === atual)) select.value = atual;
    atualizarInfoMapaMatoEntrada();
}

async function carregarMatosMapaEntrada(valorSelecionado = '') {
    mapaMatosEntrada = lerMatosMapaLocalEntrada();
    renderizarMatosMapaEntrada(valorSelecionado);
    try {
        const nuvem = window.FS?.getCollection
            ? await window.FS.getCollection('mapa_matos')
            : (await getDocs(collection(db, 'mapa_matos'))).docs.map(item => ({ id: item.id, ...item.data() }));
        if (nuvem.length) {
            mapaMatosEntrada = nuvem.map(item => ({ ...item, id: item.id || item.cloudId }));
            renderizarMatosMapaEntrada(valorSelecionado);
        }
    } catch (error) {
        console.warn('Entrada: usando os matos salvos localmente.', error);
    }
}

function aplicarMapaMatoSelecionadoEntrada() {
    const item = obterMapaMatoSelecionadoEntrada();
    atualizarInfoMapaMatoEntrada();
    if (!item) return;
    const nome = String(item.nome || '').toUpperCase().trim();
    const entMatoSelect = document.getElementById('entMatoSelect');
    if (entMatoSelect?.style.display !== 'none') {
        const option = [...entMatoSelect.options].find(opt => normalizarNomeMato(opt.value) === normalizarNomeMato(nome));
        if (option) entMatoSelect.value = option.value;
    }
    if (entMato) entMato.value = nome;
    calcularVolumeAtual();
}

function atualizarEstadoEdicaoEntrada() {
    const btnSalvar = formEntrada?.querySelector('button[type="submit"]');
    const btnCancelar = document.getElementById('btnCancelarEdicaoEntrada');
    if (btnSalvar) {
        btnSalvar.innerHTML = entradaEditandoId
            ? '<i class="fa-solid fa-save"></i> Atualizar Entrada'
            : '<i class="fa-solid fa-save"></i> Registrar Entrada';
    }
    if (btnCancelar) btnCancelar.style.display = entradaEditandoId ? 'inline-flex' : 'none';
}

window.cancelarEdicaoEntrada = function() {
    entradaEditandoId = null;
    resetarFormularioEntradaCompleto();
};

function aplicarDataHoraAtualEntrada() {
    if (entData) entData.valueAsDate = new Date();
    if (entHorario) {
        const now = new Date();
        entHorario.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }
}

function resetarMedidasEntrada() {
    if (entComp) entComp.value = '';
    if (entLarg) entLarg.value = '';
    inputsAlt.forEach(input => {
        if (input) input.value = '';
    });
}

function resetarFormularioEntradaCompleto() {
    formEntrada?.reset();
    const mapaSelect = document.getElementById('entMapaMatoId');
    if (mapaSelect) mapaSelect.value = '';
    atualizarInfoMapaMatoEntrada();
    if (entValorDescarga) entValorDescarga.value = window.formatCurrencyValue ? window.formatCurrencyValue(0) : 'R$ 0,00';
    aplicarDataHoraAtualEntrada();
    atualizarOrigemToraEntrada();
    atualizarEstadoEdicaoEntrada();
    calcularVolumeAtual();
}

function prepararNovaEntradaMesmoEmpreiteiro() {
    if (entRomaneio) entRomaneio.value = '';
    aplicarDataHoraAtualEntrada();
    resetarMedidasEntrada();
    const observacao = document.getElementById('entObservacaoCarga');
    if (observacao) observacao.value = '';
    atualizarOrigemToraEntrada();
    atualizarEstadoEdicaoEntrada();
    calcularVolumeAtual();
    entRomaneio?.focus();
}

function moverFechamentoEntradasParaTopo() {
    const panel = document.getElementById('panelRelatorioConsolidado');
    const table = document.querySelector('#panelListaEntradas .table-container');
    if (panel && table && panel.nextElementSibling !== table) {
        table.parentElement.insertBefore(panel, table);
        panel.style.marginTop = '0';
        panel.style.marginBottom = '16px';
    }
}

function injetarEstiloFechamentosEntrada() {
    if (document.getElementById('fechamentos-entrada-style')) return;
    const style = document.createElement('style');
    style.id = 'fechamentos-entrada-style';
    style.textContent = `
        .fechamentos-salvos-lista {
            max-height: 360px;
            overflow-y: auto;
            display: grid;
            gap: 10px;
            padding-right: 4px;
        }
        .fechamento-folder-card {
            border: 1px solid rgba(234, 179, 8, 0.24);
            background: rgba(234, 179, 8, 0.06);
            border-radius: 10px;
            padding: 12px;
        }
        .fechamento-folder-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 8px;
        }
        .fechamento-folder-title {
            margin: 0;
            color: #facc15;
            font-size: 0.96rem;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .fechamento-file-row {
            display: grid;
            grid-template-columns: minmax(170px, 1.2fr) repeat(3, minmax(100px, .7fr)) minmax(210px, auto);
            gap: 10px;
            align-items: center;
            border-top: 1px solid rgba(255,255,255,0.08);
            padding: 10px 0 0;
            margin-top: 10px;
        }
        .fechamento-file-row strong {
            color: white;
            font-size: 0.88rem;
        }
        .fechamento-file-row small {
            color: var(--text-muted);
            display: block;
            margin-top: 2px;
        }
        .fechamento-status-badge {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            min-width: 74px;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 900;
            text-transform: uppercase;
        }
        .fechamento-status-aberto { color: #f87171; background: rgba(239,68,68,.13); border: 1px solid rgba(239,68,68,.3); }
        .fechamento-status-parcial { color: #facc15; background: rgba(250,204,21,.13); border: 1px solid rgba(250,204,21,.32); }
        .fechamento-status-quitado { color: #4ade80; background: rgba(34,197,94,.13); border: 1px solid rgba(34,197,94,.32); }
        @media (max-width: 900px) {
            .fechamento-file-row {
                grid-template-columns: 1fr;
                align-items: stretch;
            }
        }
    `;
    document.head.appendChild(style);
}

function normalizarCodigoRomaneioEntrada(valor) {
    return String(valor || '').trim().toUpperCase().replace(/\s+/g, '');
}

function existeRomaneioEntradaDuplicado(codigo, ignorarId = null) {
    const alvo = normalizarCodigoRomaneioEntrada(codigo);
    if (!alvo) return false;
    return (window.entradasAtuaisLista || []).some(en =>
        en.id !== ignorarId && normalizarCodigoRomaneioEntrada(en.romaneioNum) === alvo
    );
}

function getUsuarioAtualAuditoria() {
    const user = auth.currentUser || {};
    const nomeHeader = document.getElementById('userNameHeader')?.textContent?.trim();
    const nome = window.App?.userName || nomeHeader || user.displayName || user.email || 'Usuario nao identificado';
    return {
        uid: user.uid || null,
        nome: nome,
        email: user.email || null
    };
}

function normalizeText(value) {
    return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatarDataHoraLancamentoEntrada(en = {}) {
    const origem = en.criadoEm || en.createdAt || en.dataCriacao || en.data;
    if (!origem) return 'Data de lancamento nao registrada.';
    const data = String(origem).includes('T') ? new Date(origem) : new Date(`${origem}T${en.horario || '00:00:00'}`);
    if (Number.isNaN(data.getTime())) return 'Data de lancamento nao registrada.';
    return `Lancado no sistema em ${data.toLocaleDateString('pt-BR')} as ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
}

function usuarioPodeVerFinanceiroEmpreiteiro() {
    return normalizeText(window.App?.userRole) === 'gerente';
}

function aplicarVisibilidadeFinanceiraEntrada() {
    const podeVerEmpreiteiro = usuarioPodeVerFinanceiroEmpreiteiro();
    const cardEmpreiteiro = document.getElementById('entCardFinanceiroEmpreiteiro');
    if (cardEmpreiteiro) cardEmpreiteiro.style.display = podeVerEmpreiteiro ? 'block' : 'none';
}

function temDescarga(en) {
    return (en.totalDescarga || 0) > 0 && (en.valorDescargaM3 || 0) > 0;
}

function entradaCompraAvulsaAtiva() {
    return document.getElementById('entOrigemTora')?.value === 'COMPRA_AVULSA';
}

function atualizarOrigemToraEntrada() {
    const avulsa = entradaCompraAvulsaAtiva();
    const grupoFornecedor = document.getElementById('grupoFornecedorAvulso');
    const grupoValor = document.getElementById('grupoValorAvulso');
    const grupoEmpreiteiro = selectEmpreiteiro?.closest('.input-group');
    const fornecedor = document.getElementById('entFornecedorAvulso');
    const valorAvulso = document.getElementById('entValorAvulso');
    if (grupoFornecedor) grupoFornecedor.style.display = avulsa ? 'flex' : 'none';
    if (grupoValor) grupoValor.style.display = avulsa ? 'flex' : 'none';
    if (grupoEmpreiteiro) grupoEmpreiteiro.style.display = avulsa ? 'none' : 'flex';
    if (selectEmpreiteiro) selectEmpreiteiro.required = !avulsa;
    if (fornecedor) fornecedor.required = avulsa;
    if (valorAvulso) valorAvulso.required = false;
    if (avulsa) {
        if (selectEmpreiteiro) selectEmpreiteiro.value = '';
        const matoSelect = document.getElementById('entMatoSelect');
        if (matoSelect) matoSelect.style.display = 'none';
        if (entMato) entMato.style.display = '';
    }
    calcularVolumeAtual();
}

window.atualizarPermissoesEntrada = function() {
    aplicarVisibilidadeFinanceiraEntrada();
    renderizarEntradas();
    renderizarDescarregamentos();
};

// --- Funções de Máscara Decimal e Conversão ---
function formatDecimalValue(val) {
    if (val === null || val === undefined || val === '') return '';
    let num = parseFloat(val);
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(".", ",");
}

function parseDecimalValue(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    let cleanVal = val.toString().replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(cleanVal) || 0;
}

function formatDecimal2Input(e) {
    let value = e.target.value;
    if (!value) {
        e.target.value = "";
        return;
    }
    value = value.replace(/\D/g, "");
    if (!value) {
        e.target.value = "";
        return;
    }
    value = (parseInt(value, 10) / 100).toFixed(2) + "";
    value = value.replace(".", ",");
    e.target.value = value;
}

function descargaTemAdicional(horario) {
    return true;
}

function atualizarValorDescargaPorHorario() {
    const temAdicional = descargaTemAdicional(entHorario?.value || '');
    const aviso = document.getElementById('entAvisoDescargaHorario');
    if (aviso) {
        aviso.style.color = temAdicional ? '#4ade80' : '#f59e0b';
        aviso.textContent = 'Valor sugerido: R$ 1,12/m³. Você pode alterar quando necessário.';
    }
}

function calcularVolumeAtual() {
    const c = parseDecimalValue(entComp?.value) || 0;
    const l = parseDecimalValue(entLarg?.value) || 0;
    
    const valoresAltura = inputsAlt.map(i => parseDecimalValue(i?.value)).filter(v => !isNaN(v) && v > 0);
    
    let mediaAltura = 0;
    let volume = 0;
    
    if (valoresAltura.length > 0) {
        const mediaCalculada = valoresAltura.reduce((a, b) => a + b, 0) / valoresAltura.length;
        mediaAltura = Math.trunc(mediaCalculada * 100) / 100;
    }
    
    if (c > 0 && l > 0 && mediaAltura > 0) {
        volume = c * l * mediaAltura;
    }
    
    if (resVolume) resVolume.textContent = volume.toFixed(2).replace('.', ',') + ' m³';
    if (resInfo) resInfo.textContent = `Altura média: ${formatDecimalValue(mediaAltura)} m (${valoresAltura.length} pontos medidos)`;
    
    // Calculo Financeiro
    let valorMetro = 0;
    if (entradaCompraAvulsaAtiva()) {
        valorMetro = window.parseCurrencyValue ? window.parseCurrencyValue(document.getElementById('entValorAvulso')?.value || '0') : 0;
    } else if(selectEmpreiteiro && selectEmpreiteiro.selectedIndex > 0) {
        const produtoCarga = document.getElementById('entProdutoCarga')?.value || '';
        valorMetro = obterValorMatoPorProduto(obterMatoSelecionadoEntrada(), produtoCarga);
    }
    
    const totalFinanceiro = volume * valorMetro;
    if (resFinanceiro) resFinanceiro.textContent = totalFinanceiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    if (infoFinanceira) {
        const produtoCarga = document.getElementById('entProdutoCarga')?.value || 'TORA';
        infoFinanceira.textContent = `${formatDecimalValue(volume)} m3 x ${valorMetro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}/m3 = ${totalFinanceiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} (${produtoCarga})`;
    }

    atualizarValorDescargaPorHorario();
    const valorDescargaM3 = window.parseCurrencyValue ? window.parseCurrencyValue(entValorDescarga?.value || '0') : 0;
    const totalDescarga = volume * valorDescargaM3;
    if (resDescarga) resDescarga.textContent = totalDescarga.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    if (infoDescarga) {
        const regra = valorDescargaM3 > 0 ? 'periodo com adicional' : 'periodo sem adicional';
        infoDescarga.textContent = `Baseado em ${valorDescargaM3.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} por m3 (${regra})`;
    }

    aplicarVisibilidadeFinanceiraEntrada();
    return { volume, mediaAltura, pontos: valoresAltura.length, comp: c, larg: l, valorMetro, totalFinanceiro, valorDescargaM3, totalDescarga };
}

async function carregarEntradas() {
    if(!listaEntradas) return;
    listaEntradas.innerHTML = '<tr><td colspan="7" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Carregando...</td></tr>';

    if (entradasUnsubscribe) {
        renderizarEntradas();
        return;
    }

    try {
        entradasUnsubscribe = onSnapshot(collection(db, 'entradas'), (querySnapshot) => {
            window.entradasAtuaisLista = [];
            const idsAtuais = new Set();
            querySnapshot.forEach(docSnap => {
                idsAtuais.add(docSnap.id);
                window.entradasAtuaisLista.push({ id: docSnap.id, ...docSnap.data() });
            });

            entradasSelecionadas.forEach(id => {
                if (!idsAtuais.has(id)) entradasSelecionadas.delete(id);
            });

            const checkAll = document.getElementById('checkAllEntradas');
            if (checkAll) checkAll.checked = false;
            renderizarEntradas();
            renderizarDescarregamentos();
        }, (error) => {
            console.error(error);
            listaEntradas.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Erro ao carregar entradas.</td></tr>';
        });
    } catch (error) {
        console.error(error);
        listaEntradas.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Erro ao carregar entradas.</td></tr>';
    }
}

function renderizarEntradas() {
    if(!listaEntradas) return;
    listaEntradas.innerHTML = '';
    
    const filtroNome = filtroEntradasNome ? filtroEntradasNome.value.toLowerCase().trim() : '';
    const dataInicio = document.getElementById('filtroEntradasDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroEntradasDataFim')?.value || '';
    
    const filtradas = window.entradasAtuaisLista.filter(en => {
        // Filtro por fornecedor, mato ou romaneio
        const emp = (en.empreiteiroNome || en.fornecedor || '').toLowerCase();
        const mato = (en.mato || '').toLowerCase();
        const romaneio = (en.romaneioNum || '').toLowerCase();
        const bateNome = !filtroNome || emp.includes(filtroNome) || mato.includes(filtroNome) || romaneio.includes(filtroNome);
        
        // Filtro por Período de Data
        let bateData = true;
        if (dataInicio) {
            bateData = bateData && (en.data >= dataInicio);
        }
        if (dataFim) {
            bateData = bateData && (en.data <= dataFim);
        }
        
        return bateNome && bateData;
    });

    if(filtradas.length === 0) {
        listaEntradas.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhuma entrada encontrada.</td></tr>';
        atualizarPainelFechamento();
        return;
    }
    
    // Ordenar decrescente pela data e hora de entrada
    filtradas.sort((a,b) => new Date(b.data + 'T' + (b.horario || '00:00')) - new Date(a.data + 'T' + (a.horario || '00:00'))).forEach(en => {
        const tr = document.createElement('tr');
        tr.title = formatarDataHoraLancamentoEntrada(en);
        
        const dtObj = new Date(en.data + 'T12:00:00'); // hack para timezone
        const dtStr = dtObj.toLocaleDateString('pt-BR');
        const valorTotal = en.totalEmpreiteiro ? en.totalEmpreiteiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'R$ 0,00';
        const valorDescarga = en.totalDescarga ? en.totalDescarga.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'R$ 0,00';
        const financeiroHtml = usuarioPodeVerFinanceiroEmpreiteiro()
            ? `<div style="color:#3498db; font-size:0.9rem;">Emp.: ${valorTotal}</div>${temDescarga(en) ? `<div style="color:#f59e0b; font-size:0.85rem;">Desc.: ${valorDescarga}</div>` : ''}`
            : (temDescarga(en) ? `<div style="color:#f59e0b; font-size:0.9rem;">Desc.: ${valorDescarga}</div>` : '');
        const isChecked = entradasSelecionadas.has(en.id) ? 'checked' : '';
        const autorCriacao = en.criadoPor?.nome || en.usuarioNome || en.autorNome || '';
        const autorAlteracao = en.atualizadoPor?.nome || '';
        const infoAutor = autorAlteracao
            ? `Alterado por ${autorAlteracao}`
            : (autorCriacao ? `Lancado por ${autorCriacao}` : '');
        const infoAutorHtml = infoAutor
            ? `<br><small style="color:#f59e0b; font-size:0.68rem; font-weight:600; letter-spacing:0.2px;"><i class="fa-solid fa-user-pen"></i> ${infoAutor}</small>`
            : '';
        
        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="check-entrada" data-id="${en.id}" ${isChecked} style="transform: scale(1.25); cursor: pointer;"></td>
            <td>${dtStr} <br><small style="color:#aaa;">${en.horario || '-'}</small></td>
            <td>
                <strong style="display:block; font-size:1rem; color:#fff; text-transform:uppercase;">${en.empreiteiroNome || en.fornecedor || '-'}</strong>
                <span style="display:inline-block; margin-top:4px; padding:3px 8px; border-radius:6px; background:rgba(245,158,11,0.18); color:#fbbf24; font-weight:900; text-transform:uppercase;">Mato: ${en.mato || '-'}</span><br>
                <small style="color:#aaa;">Rom: ${en.romaneioNum || '-'}</small>
                ${infoAutorHtml}
            </td>
            <td><span class="badge" style="background:#555;">${en.placa}</span><br><small style="color:#aaa;">${en.caminhao || '-'}</small></td>
            <td style="font-size: 0.9em;">
                C: ${formatDecimalValue(en.comp)}m | L: ${formatDecimalValue(en.larg)}m <br>
                A. Média: ${formatDecimalValue(en.mediaAltura)}m
            </td>
            <td>
                <div style="font-size:1.1rem; color:var(--accent-color); font-weight:bold;">${en.volume.toFixed(2).replace('.', ',')} m³</div>
                ${financeiroHtml}
            </td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button onclick="window.visualizarEntrada('${en.id}')" class="btn-icon" style="color:var(--accent); font-size:1.1rem; padding: 4px;" title="Visualizar Entrada">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button onclick="window.alterarEntrada('${en.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1.1rem; padding: 4px;" title="Alterar Entrada">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="window.imprimirEntrada('${en.id}')" class="btn-icon" style="color:#3498db; font-size:1.1rem; padding: 4px;" title="Imprimir Comprovante">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    <button onclick="window.baixarPdfEntrada('${en.id}')" class="btn-icon" style="color:#16a34a; font-size:1.1rem; padding: 4px;" title="Baixar PDF">
                        <i class="fa-solid fa-file-pdf"></i>
                    </button>
                    <button onclick="window.enviarEntradaWhatsapp('${en.id}')" class="btn-icon" style="color:#22c55e; font-size:1.1rem; padding: 4px;" title="Enviar WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i>
                    </button>
                    <button onclick="window.deletarEntrada('${en.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1.1rem; padding: 4px;" title="Excluir Registro">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaEntradas.appendChild(tr);
    });

    atualizarPainelFechamento();
}
window.renderizarEntradas = renderizarEntradas;

function getDescargasFiltradas() {
    const filtroNome = filtroDescargaNome ? filtroDescargaNome.value.toLowerCase().trim() : '';
    const dataInicio = document.getElementById('filtroDescargaDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroDescargaDataFim')?.value || '';

    return window.entradasAtuaisLista.filter(en => {
        if (!temDescarga(en)) return false;
        const funcionario = (en.criadoPor?.nome || en.usuarioNome || en.autorNome || '').toLowerCase();
        const fornecedor = (en.empreiteiroNome || en.fornecedor || '').toLowerCase();
        const mato = (en.mato || '').toLowerCase();
        const romaneio = (en.romaneioNum || '').toLowerCase();
        const bateNome = !filtroNome || funcionario.includes(filtroNome) || fornecedor.includes(filtroNome) || mato.includes(filtroNome) || romaneio.includes(filtroNome);
        let bateData = true;
        if (dataInicio) bateData = bateData && (en.data >= dataInicio);
        if (dataFim) bateData = bateData && (en.data <= dataFim);
        return bateNome && bateData;
    }).sort((a,b) => new Date(b.data + 'T' + (b.horario || '00:00')) - new Date(a.data + 'T' + (a.horario || '00:00')));
}

function renderizarDescarregamentos() {
    if (!listaDescarregamentos) return;
    const filtradas = getDescargasFiltradas();
    const idsVisiveis = new Set(filtradas.map(en => en.id));
    descargasSelecionadas.forEach(id => {
        if (!idsVisiveis.has(id)) descargasSelecionadas.delete(id);
    });

    if (filtradas.length === 0) {
        listaDescarregamentos.innerHTML = '<tr><td colspan="9" style="text-align:center;">Nenhum descarregamento com valor encontrado.</td></tr>';
        atualizarResumoDescarregamento(filtradas);
        atualizarSelecaoDescarregamento(filtradas);
        return;
    }

    listaDescarregamentos.innerHTML = '';
    filtradas.forEach(en => {
        const tr = document.createElement('tr');
        const dtStr = new Date(en.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const funcionario = en.criadoPor?.nome || en.usuarioNome || en.autorNome || '-';
        const isChecked = descargasSelecionadas.has(en.id) ? 'checked' : '';
        tr.innerHTML = `
            <td style="text-align:center;"><input type="checkbox" class="check-descarga" data-id="${en.id}" ${isChecked} style="transform: scale(1.2); cursor:pointer;"></td>
            <td>${dtStr}<br><small style="color:#aaa;">${en.horario || '-'}</small></td>
            <td><strong>${en.empreiteiroNome || en.fornecedor || '-'}</strong><br><small style="color:#aaa;">Mato: ${en.mato || '-'}</small><br><small style="color:#aaa;">Rom: ${en.romaneioNum || '-'}</small></td>
            <td style="font-size: 0.9em;">C: ${formatDecimalValue(en.comp)}m | L: ${formatDecimalValue(en.larg)}m<br>A. Média: ${formatDecimalValue(en.mediaAltura)}m</td>
            <td><span class="badge" style="background:#555;">${en.placa || '-'}</span></td>
            <td style="font-weight:bold; color:var(--accent-color);">${(en.volume || 0).toFixed(2).replace('.', ',')} m³</td>
            <td>${(en.valorDescargaM3 || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
            <td style="font-weight:bold; color:#f59e0b;">${(en.totalDescarga || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button onclick="window.visualizarEntrada('${en.id}')" class="btn-icon" style="color:var(--accent); font-size:1.1rem; padding: 4px;" title="Visualizar Descarregamento">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button onclick="window.alterarEntrada('${en.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1.1rem; padding: 4px;" title="Alterar Descarregamento">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="window.deletarEntrada('${en.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1.1rem; padding: 4px;" title="Excluir Descarregamento">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaDescarregamentos.appendChild(tr);
    });

    atualizarResumoDescarregamento(filtradas);
    atualizarSelecaoDescarregamento(filtradas);
}
window.renderizarDescarregamentos = renderizarDescarregamentos;

function atualizarSelecaoDescarregamento(lista = getDescargasFiltradas()) {
    const info = document.getElementById('descargaSelecionadosInfo');
    if (info) info.textContent = `${descargasSelecionadas.size} selecionado(s)`;
    const checkAll = document.getElementById('checkAllDescargas');
    if (checkAll) {
        checkAll.checked = lista.length > 0 && lista.every(en => descargasSelecionadas.has(en.id));
        checkAll.indeterminate = descargasSelecionadas.size > 0 && !checkAll.checked;
    }
}

function atualizarResumoDescarregamento(lista) {
    const totalVolume = lista.reduce((sum, en) => sum + (en.volume || 0), 0);
    const totalValor = lista.reduce((sum, en) => sum + (en.totalDescarga || 0), 0);
    const qtd = document.getElementById('descargaQtdTotal');
    const volume = document.getElementById('descargaVolumeTotal');
    const valor = document.getElementById('descargaValorTotal');
    if (qtd) qtd.textContent = String(lista.length);
    if (volume) volume.textContent = totalVolume.toFixed(2).replace('.', ',') + ' m³';
    if (valor) valor.textContent = totalValor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

function obterMateriaPrimaEntrada(en = {}) {
    return (en.produtoCarga || en.tipoProduto || en.materiaPrima || 'NAO INFORMADO').toString().toUpperCase();
}

function resumirMateriaPrimaEntradas(lista = []) {
    const grupos = lista.reduce((acc, en) => {
        const nome = obterMateriaPrimaEntrada(en);
        if (!acc[nome]) acc[nome] = { qtd: 0, volume: 0 };
        acc[nome].qtd += 1;
        acc[nome].volume += Number(en.volume || 0);
        return acc;
    }, {});
    return Object.entries(grupos)
        .sort((a, b) => b[1].volume - a[1].volume)
        .map(([nome, item]) => `${nome}: ${item.qtd} carga(s) / ${item.volume.toFixed(2).replace('.', ',')} m3`)
        .join(' | ') || 'NAO INFORMADO';
}

window.gerarRelatorioDescarregamento = function() {
    const baseFiltrada = getDescargasFiltradas();
    const listaBase = descargasSelecionadas.size
        ? baseFiltrada.filter(en => descargasSelecionadas.has(en.id))
        : baseFiltrada;
    const lista = listaBase.sort((a,b) => new Date(a.data + 'T' + (a.horario || '00:00')) - new Date(b.data + 'T' + (b.horario || '00:00')));
    if (lista.length === 0) {
        alert("Nenhum descarregamento encontrado. Selecione itens ou ajuste o periodo.");
        return;
    }

    const totalVolume = lista.reduce((sum, en) => sum + (en.volume || 0), 0);
    const totalValor = lista.reduce((sum, en) => sum + (en.totalDescarga || 0), 0);
    const resumoMateriaPrima = resumirMateriaPrimaEntradas(lista);
    const dataInicio = document.getElementById('filtroDescargaDataInicio')?.value;
    const dataFim = document.getElementById('filtroDescargaDataFim')?.value;
    const periodo = descargasSelecionadas.size
        ? `${lista.length} descarregamento(s) selecionado(s)`
        : (dataInicio || dataFim
            ? `${dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'Inicio'} a ${dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}`
            : 'Periodo geral');

    const rows = lista.map((en, index) => {
        const dtStr = new Date(en.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const funcionario = en.criadoPor?.nome || en.usuarioNome || en.autorNome || '-';
        const materiaPrima = obterMateriaPrimaEntrada(en);
        return `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td>${dtStr} ${en.horario || ''}</td>
                <td>${funcionario}</td>
                <td>${en.romaneioNum || '-'}</td>
                <td><strong>${materiaPrima}</strong></td>
                <td>${en.motorista || '-'}</td>
                <td>${en.placa || '-'}</td>
                <td style="text-align:right;">${(en.volume || 0).toFixed(2).replace('.', ',')} m³</td>
                <td style="text-align:right;">${(en.valorDescargaM3 || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                <td style="text-align:right; font-weight:bold;">${(en.totalDescarga || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
            </tr>
        `;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`
<html>
<head>
    <title>Relatorio de Descarregamento</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 28px; color: #222; font-size: 12px; }
        h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        .muted { color: #666; margin-top: 4px; }
        .summary { display: flex; gap: 12px; margin: 18px 0; }
        .box { flex: 1; border: 1px solid #ccc; padding: 12px; text-align: center; }
        .box strong { display:block; margin-top: 5px; font-size: 16px; }
        .materials { border: 1px solid #ddd; background: #fff7d6; padding: 10px 12px; margin: -6px 0 16px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 7px; }
        th { background: #eee; text-align: left; }
        .total td { font-weight: bold; background: #f3f4f6; }
        .signatures { margin-top: 60px; display: flex; justify-content: space-around; }
        .signature { width: 260px; border-top: 1px solid #000; padding-top: 6px; text-align: center; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Relatorio de Descarregamento</h1>
    <div class="muted">Periodo: <strong>${periodo}</strong> | Gerado em ${new Date().toLocaleString('pt-BR')}</div>
    <div class="summary">
        <div class="box">Registros<strong>${lista.length}</strong></div>
        <div class="box">Volume Total<strong>${totalVolume.toFixed(2).replace('.', ',')} m³</strong></div>
        <div class="box">Total a Pagar<strong>${totalValor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</strong></div>
    </div>
    <div class="materials">Materia-prima: ${resumoMateriaPrima}</div>
    <table>
        <thead>
            <tr>
                <th>N.</th><th>Data/Hora</th><th>Funcionario</th><th>Romaneio</th><th>Materia-prima</th><th>Motorista</th><th>Placa</th><th>Volume</th><th>Valor/m3</th><th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
            <tr class="total"><td colspan="7" style="text-align:right;">Total</td><td style="text-align:right;">${totalVolume.toFixed(2).replace('.', ',')} m³</td><td></td><td style="text-align:right;">${totalValor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td></tr>
        </tbody>
    </table>
    <div class="signatures">
        <div class="signature">Responsavel</div>
        <div class="signature">Funcionario</div>
    </div>
    <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
    win.document.close();
};

function atualizarPainelFechamento() {
    const selected = window.entradasAtuaisLista.filter(en => entradasSelecionadas.has(en.id));
    const count = selected.length;
    const totalVolume = selected.reduce((sum, en) => sum + (en.volume || 0), 0);
    const totalPay = selected.reduce((sum, en) => sum + (usuarioPodeVerFinanceiroEmpreiteiro() ? (en.totalEmpreiteiro || 0) : (en.totalDescarga || 0)), 0);
    
    const countBadge = document.getElementById('fechamentoQtdCargas');
    const countText = document.getElementById('fechamentoRegistrosTotal');
    const volText = document.getElementById('fechamentoVolumeTotal');
    const payText = document.getElementById('fechamentoValorTotal');
    
    if (countBadge) countBadge.textContent = `${count} Carga(s) Selecionada(s)`;
    if (countText) countText.textContent = String(count);
    if (volText) volText.textContent = totalVolume.toFixed(2).replace('.', ',') + ' m³';
    if (payText) payText.textContent = totalPay.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function formatarMoedaEntrada(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function obterStatusFechamento(total, pago) {
    const valorTotal = Number(total || 0);
    const valorPago = Number(pago || 0);
    if (valorPago <= 0) return 'ABERTO';
    if (valorPago + 0.009 >= valorTotal) return 'QUITADO';
    return 'PARCIAL';
}

function obterFechamentosLocais() {
    try {
        return JSON.parse(localStorage.getItem(FECHAMENTOS_SALVOS_KEY) || '[]');
    } catch (_) {
        return [];
    }
}

function salvarFechamentosLocais(lista) {
    fechamentosSalvosExtracao = Array.isArray(lista) ? lista : [];
    localStorage.setItem(FECHAMENTOS_SALVOS_KEY, JSON.stringify(fechamentosSalvosExtracao));
}

async function carregarFechamentosSalvosExtracao() {
    try {
        if (window.FS) {
            const nuvem = await window.FS.getCollection('fechamentos_salvos');
            fechamentosSalvosExtracao = nuvem
                .filter(item => item.tipo === 'EXTRACAO_EMPREITEIRO')
                .sort((a, b) => new Date(b.criadoEm || b.dataGeracao || 0) - new Date(a.criadoEm || a.dataGeracao || 0));
            salvarFechamentosLocais(fechamentosSalvosExtracao);
        } else {
            fechamentosSalvosExtracao = obterFechamentosLocais().filter(item => item.tipo === 'EXTRACAO_EMPREITEIRO');
        }
    } catch (err) {
        console.warn('Fechamentos carregados apenas localmente:', err);
        fechamentosSalvosExtracao = obterFechamentosLocais().filter(item => item.tipo === 'EXTRACAO_EMPREITEIRO');
    }
    renderizarFechamentosSalvosExtracao();
}

function obterSelecionadasFechamentoExtracao() {
    return (window.entradasAtuaisLista || [])
        .filter(en => entradasSelecionadas.has(en.id))
        .sort((a, b) => new Date(a.data + 'T' + (a.horario || '00:00')) - new Date(b.data + 'T' + (b.horario || '00:00')));
}

function montarFechamentoExtracaoSelecionado() {
    const selected = obterSelecionadasFechamentoExtracao();
    if (!selected.length) {
        alert('Selecione as cargas que farão parte do fechamento.');
        return null;
    }

    const pessoas = [...new Set(selected.map(en => (en.empreiteiroNome || en.fornecedor || 'SEM NOME').trim().toUpperCase()))];
    if (pessoas.length > 1) {
        alert('Para salvar em pasta, selecione cargas de apenas um empreiteiro/fornecedor por fechamento.');
        return null;
    }

    const totalVolume = selected.reduce((sum, en) => sum + Number(en.volume || 0), 0);
    const totalValor = selected.reduce((sum, en) => sum + Number(en.totalEmpreiteiro || 0), 0);
    const datas = selected.map(en => en.data).filter(Boolean).sort();
    const usuario = getUsuarioAtualAuditoria();
    const pessoaNome = pessoas[0] || 'SEM NOME';
    const agora = new Date().toISOString();
    const id = `fech_ext_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
        id,
        tipo: 'EXTRACAO_EMPREITEIRO',
        direcao: 'A_PAGAR',
        modulo: 'Conferencia de Cargas',
        pessoaTipo: selected[0]?.compraAvulsa ? 'FORNECEDOR' : 'EMPREITEIRO',
        pessoaId: selected[0]?.empreiteiroId || null,
        pessoaNome,
        pastaNome: pessoaNome,
        periodoInicio: datas[0] || '',
        periodoFim: datas[datas.length - 1] || '',
        dataGeracao: agora,
        geradoPor: usuario,
        totalRegistros: selected.length,
        totalVolume,
        valorTotal: totalValor,
        valorPago: 0,
        saldoRestante: totalValor,
        status: obterStatusFechamento(totalValor, 0),
        pagamentos: [],
        resumoMateriaPrima: resumirMateriaPrimaEntradas(selected),
        itemIds: selected.map(en => en.id),
        itens: selected.map(en => ({
            id: en.id,
            data: en.data || '',
            horario: en.horario || '',
            romaneioNum: en.romaneioNum || '',
            empreiteiroNome: en.empreiteiroNome || en.fornecedor || '',
            mato: en.mato || '',
            materiaPrima: obterMateriaPrimaEntrada(en),
            motorista: en.motorista || '',
            caminhao: en.caminhao || '',
            placa: en.placa || '',
            comp: Number(en.comp || 0),
            larg: Number(en.larg || 0),
            mediaAltura: Number(en.mediaAltura || 0),
            volume: Number(en.volume || 0),
            valorMetroEmpreiteiro: Number(en.valorMetroEmpreiteiro || 0),
            totalEmpreiteiro: Number(en.totalEmpreiteiro || 0)
        }))
    };
}

window.salvarFechamentoExtracao = async function() {
    const fechamento = montarFechamentoExtracaoSelecionado();
    if (!fechamento) return;

    const periodo = `${fechamento.periodoInicio ? new Date(fechamento.periodoInicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} a ${fechamento.periodoFim ? new Date(fechamento.periodoFim + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`;
    if (!confirm(`Salvar fechamento de ${fechamento.pessoaNome}?\nPeriodo: ${periodo}\nTotal: ${formatarMoedaEntrada(fechamento.valorTotal)}`)) return;

    const lista = obterFechamentosLocais().filter(item => item.id !== fechamento.id);
    lista.unshift(fechamento);
    salvarFechamentosLocais(lista);
    renderizarFechamentosSalvosExtracao();

    try {
        if (window.FS) await window.FS.setDoc('fechamentos_salvos', fechamento.id, fechamento);
        alert('Fechamento salvo na pasta do empreiteiro/fornecedor.');
    } catch (err) {
        console.error('Erro ao salvar fechamento na nuvem:', err);
        alert('Fechamento salvo localmente, mas nao foi possivel sincronizar na nuvem agora.');
    }
};

function classeStatusFechamento(status) {
    if (status === 'QUITADO') return 'fechamento-status-quitado';
    if (status === 'PARCIAL') return 'fechamento-status-parcial';
    return 'fechamento-status-aberto';
}

function renderizarFechamentosSalvosExtracao() {
    const container = document.getElementById('listaFechamentosSalvosExtracao');
    if (!container) return;

    const busca = normalizeText(document.getElementById('buscaFechamentoExtracao')?.value || '');
    const filtroStatus = document.getElementById('filtroFechamentoStatusExtracao')?.value || 'TODOS';

    let lista = (fechamentosSalvosExtracao.length ? fechamentosSalvosExtracao : obterFechamentosLocais())
        .filter(item => item.tipo === 'EXTRACAO_EMPREITEIRO');

    if (busca) lista = lista.filter(item => normalizeText(item.pessoaNome || item.pastaNome || '').includes(busca));
    if (filtroStatus !== 'TODOS') lista = lista.filter(item => item.status === filtroStatus);

    if (!lista.length) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:14px; text-align:center;">Nenhum fechamento salvo ainda.</div>';
        return;
    }

    const grupos = lista.reduce((acc, item) => {
        const pasta = (item.pastaNome || item.pessoaNome || 'SEM NOME').toUpperCase();
        if (!acc[pasta]) acc[pasta] = [];
        acc[pasta].push(item);
        return acc;
    }, {});

    container.innerHTML = Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([pasta, itens]) => {
        const totalPasta = itens.reduce((sum, item) => sum + Number(item.valorTotal || 0), 0);
        const saldoPasta = itens.reduce((sum, item) => sum + Number(item.saldoRestante || 0), 0);
        const linhas = itens
            .sort((a, b) => new Date(b.dataGeracao || b.criadoEm || 0) - new Date(a.dataGeracao || a.criadoEm || 0))
            .map(item => {
                const periodo = `${item.periodoInicio ? new Date(item.periodoInicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} a ${item.periodoFim ? new Date(item.periodoFim + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`;
                const status = item.status || obterStatusFechamento(item.valorTotal, item.valorPago);
                return `
                    <div class="fechamento-file-row">
                        <div>
                            <strong>${periodo}</strong>
                            <small>${item.totalRegistros || 0} carga(s) / ${(Number(item.totalVolume || 0)).toFixed(2).replace('.', ',')} m3</small>
                        </div>
                        <div><small>Total</small><strong>${formatarMoedaEntrada(item.valorTotal)}</strong></div>
                        <div><small>Pago</small><strong style="color:#4ade80;">${formatarMoedaEntrada(item.valorPago)}</strong></div>
                        <div><small>Saldo</small><strong style="color:${Number(item.saldoRestante || 0) > 0 ? '#f87171' : '#4ade80'};">${formatarMoedaEntrada(item.saldoRestante)}</strong></div>
                        <div style="display:flex; justify-content:flex-end; align-items:center; gap:7px; flex-wrap:wrap;">
                            <span class="fechamento-status-badge ${classeStatusFechamento(status)}">${status}</span>
                            <button type="button" class="btn-icon" onclick="window.visualizarFechamentoExtracao('${item.id}')" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
                            <button type="button" class="btn-icon" onclick="window.registrarPagamentoFechamentoExtracao('${item.id}')" title="Registrar pagamento" style="color:#22c55e;"><i class="fa-solid fa-money-bill-transfer"></i></button>
                        </div>
                    </div>
                `;
            }).join('');

        return `
            <div class="fechamento-folder-card">
                <div class="fechamento-folder-header">
                    <h4 class="fechamento-folder-title"><i class="fa-solid fa-folder"></i> ${pasta}</h4>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; color:var(--text-muted); font-size:.8rem; font-weight:800;">
                        <span>${itens.length} fechamento(s)</span>
                        <span>Total: ${formatarMoedaEntrada(totalPasta)}</span>
                        <span>Saldo: ${formatarMoedaEntrada(saldoPasta)}</span>
                    </div>
                </div>
                ${linhas}
            </div>
        `;
    }).join('');
}

window.registrarPagamentoFechamentoExtracao = async function(id) {
    const lista = obterFechamentosLocais();
    const fechamento = (fechamentosSalvosExtracao.length ? fechamentosSalvosExtracao : lista).find(item => item.id === id);
    if (!fechamento) return alert('Fechamento nao encontrado.');

    const valorTexto = prompt(`Valor pago/recebido para ${fechamento.pessoaNome}:\nSaldo atual: ${formatarMoedaEntrada(fechamento.saldoRestante)}`);
    if (!valorTexto) return;
    const valor = window.parseCurrencyValue ? window.parseCurrencyValue(valorTexto) : Number(String(valorTexto).replace(/\./g, '').replace(',', '.'));
    if (!valor || valor <= 0) return alert('Informe um valor valido.');

    const forma = (prompt('Forma de pagamento: Pix, dinheiro, boleto, transferencia, cheque ou outro', 'PIX') || 'PIX').toUpperCase();
    const obs = prompt('Observacao do pagamento (opcional):', '') || '';
    const usuario = getUsuarioAtualAuditoria();
    const pagamentos = Array.isArray(fechamento.pagamentos) ? [...fechamento.pagamentos] : [];
    pagamentos.push({
        id: `pag_${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        dataHora: new Date().toISOString(),
        valor,
        forma,
        observacao: obs,
        registradoPor: usuario
    });

    const valorPago = pagamentos.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const atualizado = {
        ...fechamento,
        pagamentos,
        valorPago,
        saldoRestante: Number(fechamento.valorTotal || 0) - valorPago,
        status: obterStatusFechamento(fechamento.valorTotal, valorPago),
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: usuario
    };

    const locais = lista.filter(item => item.id !== id);
    locais.unshift(atualizado);
    salvarFechamentosLocais(locais);
    fechamentosSalvosExtracao = fechamentosSalvosExtracao.filter(item => item.id !== id);
    fechamentosSalvosExtracao.unshift(atualizado);
    renderizarFechamentosSalvosExtracao();

    try {
        if (window.FS) await window.FS.setDoc('fechamentos_salvos', id, atualizado);
        alert('Pagamento registrado no fechamento.');
    } catch (err) {
        console.error('Erro ao sincronizar pagamento do fechamento:', err);
        alert('Pagamento registrado localmente, mas nao foi possivel sincronizar na nuvem agora.');
    }
};

window.visualizarFechamentoExtracao = function(id) {
    const fechamento = (fechamentosSalvosExtracao.length ? fechamentosSalvosExtracao : obterFechamentosLocais()).find(item => item.id === id);
    if (!fechamento) return alert('Fechamento nao encontrado.');

    const periodo = `${fechamento.periodoInicio ? new Date(fechamento.periodoInicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} a ${fechamento.periodoFim ? new Date(fechamento.periodoFim + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`;
    const rows = (fechamento.itens || []).map((en, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${en.data ? new Date(en.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} ${en.horario || ''}</td>
            <td>${en.romaneioNum || '-'}</td>
            <td>${en.mato || '-'}</td>
            <td>${en.materiaPrima || '-'}</td>
            <td>${en.placa || '-'}</td>
            <td style="text-align:right;">${Number(en.volume || 0).toFixed(2).replace('.', ',')} m3</td>
            <td style="text-align:right;">${formatarMoedaEntrada(en.valorMetroEmpreiteiro)}</td>
            <td style="text-align:right;">${formatarMoedaEntrada(en.totalEmpreiteiro)}</td>
        </tr>
    `).join('');
    const pagamentos = (fechamento.pagamentos || []).map(p => `
        <tr>
            <td>${p.data ? new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
            <td>${p.forma || '-'}</td>
            <td>${p.observacao || '-'}</td>
            <td style="text-align:right;">${formatarMoedaEntrada(p.valor)}</td>
        </tr>
    `).join('') || '<tr><td colspan="4">Nenhum pagamento registrado.</td></tr>';

    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>Fechamento - ${fechamento.pessoaNome}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 28px; color:#222; font-size:12px; }
                h1 { margin:0; font-size:20px; text-transform:uppercase; }
                .muted { color:#666; margin:4px 0 16px; }
                .summary { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin:16px 0; }
                .box { border:1px solid #bbb; padding:10px; border-radius:6px; text-align:center; }
                .box strong { display:block; font-size:16px; margin-top:4px; }
                table { width:100%; border-collapse:collapse; margin-top:12px; }
                th, td { border:1px solid #ccc; padding:7px; }
                th { background:#eee; text-align:left; }
                .paid { color:#15803d; font-weight:bold; }
                .saldo { color:#b91c1c; font-weight:bold; }
            </style>
        </head>
        <body>
            <h1>Fechamento de Extracao</h1>
            <div class="muted">Pasta: <strong>${fechamento.pessoaNome}</strong> | Periodo: <strong>${periodo}</strong> | Status: <strong>${fechamento.status}</strong></div>
            <div class="summary">
                <div class="box">Cargas<strong>${fechamento.totalRegistros || 0}</strong></div>
                <div class="box">Volume<strong>${Number(fechamento.totalVolume || 0).toFixed(2).replace('.', ',')} m3</strong></div>
                <div class="box">Total<strong>${formatarMoedaEntrada(fechamento.valorTotal)}</strong></div>
                <div class="box">Saldo<strong>${formatarMoedaEntrada(fechamento.saldoRestante)}</strong></div>
            </div>
            <p><strong>Materia-prima:</strong> ${fechamento.resumoMateriaPrima || '-'}</p>
            <table><thead><tr><th>N.</th><th>Data</th><th>Romaneio</th><th>Mato</th><th>Materia-prima</th><th>Placa</th><th>Volume</th><th>R$/m3</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
            <h2>Pagamentos</h2>
            <table><thead><tr><th>Data</th><th>Forma</th><th>Observacao</th><th>Valor</th></tr></thead><tbody>${pagamentos}</tbody></table>
            <script>window.onload = function(){ window.print(); }</script>
        </body>
        </html>
    `);
    win.document.close();
};

window.gerarRelatorioConsolidado = function() {
    const selected = window.entradasAtuaisLista.filter(en => entradasSelecionadas.has(en.id));
    if (selected.length === 0) {
        alert("Nenhuma carga selecionada. Por favor, marque as cargas desejadas nos checkboxes da tabela para gerar o relatório.");
        return;
    }
    
    // Ordenar pela ordem cronológica
    selected.sort((a,b) => new Date(a.data + 'T' + (a.horario || '00:00')) - new Date(b.data + 'T' + (b.horario || '00:00')));
    
    const count = selected.length;
    const totalVolume = selected.reduce((sum, en) => sum + (en.volume || 0), 0);
    const totalPay = selected.reduce((sum, en) => sum + (en.totalEmpreiteiro || 0), 0);
    const resumoMateriaPrima = resumirMateriaPrimaEntradas(selected);
    
    const dataInicioInput = document.getElementById('filtroEntradasDataInicio')?.value;
    const dataFimInput = document.getElementById('filtroEntradasDataFim')?.value;
    
    let periodoStr = "Consolidado Geral";
    if (dataInicioInput || dataFimInput) {
        const di = dataInicioInput ? new Date(dataInicioInput + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início';
        const df = dataFimInput ? new Date(dataFimInput + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim';
        periodoStr = `${di} a ${df}`;
    }
    
    let win = window.open('', '_blank');
    
    let tableRowsHtml = '';
    selected.forEach((en, index) => {
        const dtObj = new Date(en.data + 'T12:00:00');
        const dtStr = dtObj.toLocaleDateString('pt-BR');
        const vTotal = en.totalEmpreiteiro ? en.totalEmpreiteiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'R$ 0,00';
        const vMetro = en.valorMetroEmpreiteiro ? en.valorMetroEmpreiteiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'R$ 0,00';
        const materiaPrima = obterMateriaPrimaEntrada(en);
        
        tableRowsHtml += `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td>${dtStr} ${en.horario || ''}</td>
                <td style="font-weight:bold;">${en.romaneioNum || '-'}</td>
                <td class="empreiteiro-cell"><strong>${en.empreiteiroNome || en.fornecedor || '-'}</strong></td>
                <td class="mato-cell"><strong>${en.mato || '-'}</strong></td>
                <td class="produto-cell"><strong>${materiaPrima}</strong></td>
                <td>${en.motorista || '-'}</td>
                <td style="text-align:center;">
                    <span style="border: 1px solid #777; padding: 2px 5px; border-radius: 3px; font-family: monospace; font-size: 0.85em;">${en.placa}</span>
                    <br><small style="color:#555;">${en.caminhao || '-'}</small>
                </td>
                <td style="text-align:center;">C: ${formatDecimalValue(en.comp)}m | L: ${formatDecimalValue(en.larg)}m | A: ${formatDecimalValue(en.mediaAltura)}m</td>
                <td style="text-align:right; font-weight:bold; color:#27ae60;">${en.volume.toFixed(2).replace('.', ',')} m³</td>
                <td style="text-align:right;">${vMetro}</td>
                <td style="text-align:right; font-weight:bold; color:#2980b9;">${vTotal}</td>
            </tr>
        `;
    });
    
    win.document.write(`
<html>
<head>
    <title>Fechamento de Extração - Empreiteiros</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 12px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .logo-img { max-height: 60px; max-width: 220px; }
        h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
        h2 { margin: 5px 0 0 0; font-size: 13px; color: #555; font-weight: normal; }
        .summary-box { display: flex; justify-content: space-between; background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 20px; }
        .summary-item { text-align: center; flex: 1; }
        .summary-item:not(:last-child) { border-right: 1px solid #ddd; }
        .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
        .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; color: #2c3e50; }
        table.records { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.records th { background: #f2f2f2; border: 1px solid #ccc; padding: 8px; font-weight: bold; text-align: left; font-size: 11px; text-transform: uppercase; }
        table.records td { border: 1px solid #ccc; padding: 8px; font-size: 11px; }
        table.records tr:nth-child(even) { background: #fafafa; }
        .empreiteiro-cell strong, .mato-cell strong { display: block; font-size: 13px; color: #111; text-transform: uppercase; line-height: 1.25; }
        .mato-cell { background: #fff7d6; }
        .produto-cell { background: #eefdf4; color: #166534; }
        .materials { border: 1px solid #ddd; background: #fff7d6; padding: 10px 12px; margin: -8px 0 16px; font-weight: bold; }
        .total-row { font-weight: bold; background: #eef2f5 !important; font-size: 12px; }
        .signatures { margin-top: 60px; display: flex; justify-content: space-around; }
        .signature-line { text-align: center; width: 250px; border-top: 1px solid #000; padding-top: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        @media print {
            body { margin: 15px; }
            .summary-box { background: none; border: 1px solid #000; }
            table.records th { background: #ddd !important; -webkit-print-color-adjust: exact; }
            .total-row { background: #ddd !important; -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td>
                <img src="logo.png" alt="Logo Serraria" class="logo-img" onerror="this.style.display='none'">
            </td>
            <td style="text-align: right;">
                <h1>Relatório de Fechamento de Extração</h1>
                <h2>Período das Cargas: <strong>${periodoStr}</strong></h2>
                <h2>Total de entradas neste relatório: <strong>${count}</strong></h2>
                <h2 style="font-size: 11px; color: #888;">Gerado em: ${new Date().toLocaleString('pt-BR')}</h2>
            </td>
        </tr>
    </table>

    <div class="summary-box">
        <div class="summary-item">
            <div class="summary-label">Total de Cargas</div>
            <div class="summary-value">${count} viagen(s)</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Volume Total</div>
            <div class="summary-value" style="color:#27ae60;">${totalVolume.toFixed(2).replace('.', ',')} m³</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Valor Total Fechado</div>
            <div class="summary-value" style="color:#2980b9;">${totalPay.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
        </div>
    </div>

    <div class="materials">Materia-prima: ${resumoMateriaPrima}</div>

    <table class="records">
        <thead>
            <tr>
                <th style="width: 30px; text-align:center;">Nº</th>
                <th style="width: 80px;">Data/Hora</th>
                <th style="width: 80px; text-align:left;">Nº Romaneio</th>
                <th>Empreiteiro</th>
                <th>Mato</th>
                <th>Materia-prima</th>
                <th>Motorista</th>
                <th style="width: 145px; text-align:center;">Veículo (Placa/Modelo)</th>
                <th style="text-align:center;">Dimensões da Carga</th>
                <th style="width: 70px; text-align:right;">Volume</th>
                <th style="width: 80px; text-align:right;">Preço/m³</th>
                <th style="width: 90px; text-align:right;">Total Geral</th>
            </tr>
        </thead>
        <tbody>
            ${tableRowsHtml}
            <tr class="total-row">
                <td colspan="9" style="text-align: right; text-transform: uppercase;"><strong>Consolidado Geral:</strong></td>
                <td style="text-align: right; font-size:12px; color:#27ae60;">${totalVolume.toFixed(2).replace('.', ',')} m³</td>
                <td></td>
                <td style="text-align: right; font-size:12px; color:#2980b9;">${totalPay.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
            </tr>
        </tbody>
    </table>

    <div class="signatures">
        <div class="signature-line">
            Assinatura do Responsável
        </div>
        <div class="signature-line">
            Assinatura do Empreiteiro
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>
    `);
    win.document.close();
};

function configurarSubmitEntrada() {
    if (!formEntrada || formEntrada.dataset.submitEntradaBound === '1') return;
    formEntrada.dataset.submitEntradaBound = '1';
    formEntrada.addEventListener('submit', async (e) => {
        e.preventDefault();
        const calcData = calcularVolumeAtual();
        
        if (calcData.volume <= 0) {
            alert("O volume calculado é zero. Preencha as medidas.");
            return;
        }
        
        const origemTora = document.getElementById('entOrigemTora')?.value || 'EMPREITEIRO';
        const compraAvulsa = origemTora === 'COMPRA_AVULSA';
        const empreiteiroId = compraAvulsa ? null : selectEmpreiteiro.value;
        const fornecedorAvulso = (document.getElementById('entFornecedorAvulso')?.value || '').toUpperCase().trim();
        const empreiteiroNome = compraAvulsa ? fornecedorAvulso : selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].text;
        const usuarioAuditoria = getUsuarioAtualAuditoria();
        const mapaMato = obterMapaMatoSelecionadoEntrada();
        
        const novaEntrada = {
            data: document.getElementById('entData').value,
            horario: document.getElementById('entHorario').value,
            origemTora,
            compraAvulsa,
            empreiteiroId: empreiteiroId,
            empreiteiroNome: empreiteiroNome,
            fornecedor: empreiteiroNome,
            mato: (mapaMato?.nome || (document.getElementById('entMatoSelect')?.style.display !== 'none' ? document.getElementById('entMatoSelect')?.value : entMato?.value) || '').toUpperCase().trim(),
            mapaMatoId: mapaMato?.id || null,
            mapaMatoNome: mapaMato?.nome || null,
            mapaMatoProprietario: mapaMato?.proprietario || null,
            mapaMatoEndereco: mapaMato?.endereco || null,
            produtoCarga: (document.getElementById('entProdutoCarga')?.value || '').toUpperCase().trim(),
            observacaoCarga: (document.getElementById('entObservacaoCarga')?.value || '').toUpperCase().trim(),
            romaneioNum: document.getElementById('entRomaneio').value.toUpperCase().trim(),
            motorista: document.getElementById('entMotorista').value.toUpperCase().trim(),
            caminhao: document.getElementById('entCaminhao').value.toUpperCase().trim(),
            placa: document.getElementById('entPlaca').value.toUpperCase().trim(),
            comp: calcData.comp,
            larg: calcData.larg,
            mediaAltura: calcData.mediaAltura,
            pontos: calcData.pontos,
            volume: calcData.volume,
            alturas: inputsAlt.map(i => parseDecimalValue(i?.value) || 0), // Salvar alturas individuais
            valorMetroEmpreiteiro: calcData.valorMetro,
            totalEmpreiteiro: calcData.totalFinanceiro,
            valorDescargaM3: calcData.valorDescargaM3,
            totalDescarga: calcData.totalDescarga,
            atualizadoEm: new Date().toISOString()
        };

        if (existeRomaneioEntradaDuplicado(novaEntrada.romaneioNum, entradaEditandoId)) {
            alert(`Já existe uma entrada cadastrada com o romaneio ${novaEntrada.romaneioNum}. Verifique antes de salvar.`);
            document.getElementById('entRomaneio')?.focus();
            return;
        }
        
        const submitBtn = formEntrada.querySelector('button[type="submit"]');
        const textoOriginal = submitBtn.innerHTML;
        const estavaEditandoEntrada = !!entradaEditandoId;
        submitBtn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
        submitBtn.disabled = true;

        try {
            if (entradaEditandoId) {
                novaEntrada.atualizadoPor = usuarioAuditoria;
                await window.FS.updateDoc('entradas', entradaEditandoId, novaEntrada);
                alert(`✅ Entrada do Romaneio ${novaEntrada.romaneioNum} (${calcData.volume.toFixed(2).replace('.', ',')}m³) atualizada com sucesso!`);
                entradasSelecionadas.delete(entradaEditandoId); // Clean selection of edited item
                entradaEditandoId = null;
                atualizarEstadoEdicaoEntrada();
            } else {
                novaEntrada.criadoEm = new Date().toISOString();
                novaEntrada.criadoPor = usuarioAuditoria;
                novaEntrada.atualizadoPor = usuarioAuditoria;
                await window.FS.addDoc('entradas', novaEntrada);
                const valorMensagem = usuarioPodeVerFinanceiroEmpreiteiro()
                    ? calcData.totalFinanceiro.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
                    : calcData.totalDescarga.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
                const labelMensagem = usuarioPodeVerFinanceiroEmpreiteiro() ? 'Valor empreiteiro' : 'Valor da descarga';
                alert(`✅ Entrada do Romaneio ${novaEntrada.romaneioNum} (${calcData.volume.toFixed(2).replace('.', ',')}m³) registrada com sucesso!\n${labelMensagem}: ${valorMensagem}`);
            }
            
            if (!estavaEditandoEntrada && confirm('Deseja continuar lançando com os mesmos dados deste empreiteiro?')) {
                prepararNovaEntradaMesmoEmpreiteiro();
            } else {
                resetarFormularioEntradaCompleto();
            }
            carregarEntradas();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar entrada.");
        } finally {
            if(!entradaEditandoId) atualizarEstadoEdicaoEntrada();
            else submitBtn.innerHTML = textoOriginal;
            submitBtn.disabled = false;
        }
    });
}

window.deletarEntrada = async function(id) {
    if(await window.confirmarExclusaoComSenha("Tem certeza que deseja apagar este registro de entrada?")) {
        try {
            await deleteDoc(doc(db, 'entradas', id));
            entradasSelecionadas.delete(id);
            await carregarEntradas();
        } catch (error) {
            console.error(error);
            alert("Erro ao deletar entrada.");
        }
    }
};

window.visualizarEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if(!en) return;
    
    let alturasStr = "Não gravadas individualmente";
    if (en.alturas && Array.isArray(en.alturas)) {
        alturasStr = `Esq: [${formatDecimalValue(en.alturas[0])}m, ${formatDecimalValue(en.alturas[1])}m, ${formatDecimalValue(en.alturas[2])}m]
Dir: [${formatDecimalValue(en.alturas[3])}m, ${formatDecimalValue(en.alturas[4])}m, ${formatDecimalValue(en.alturas[5])}m]`;
    }
    const volumeEntrada = Number(en.volume || 0);
    const valorMetroEmpreiteiro = Number(en.valorMetroEmpreiteiro || 0);
    const totalEmpreiteiro = Number(en.totalEmpreiteiro ?? (volumeEntrada * valorMetroEmpreiteiro)) || 0;
    const valorDescargaM3 = Number(en.valorDescargaM3 || 0);
    const totalDescarga = Number(en.totalDescarga ?? (volumeEntrada * valorDescargaM3)) || 0;
    const financeiroDetalhe = usuarioPodeVerFinanceiroEmpreiteiro()
        ? `Produto usado no calculo: ${en.produtoCarga || 'N/A'}
Valor/m3 empreiteiro: ${valorMetroEmpreiteiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
Calculo empreiteiro: ${formatDecimalValue(volumeEntrada)} m3 x ${valorMetroEmpreiteiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}/m3
Total a receber: ${totalEmpreiteiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}

Valor descarga/m3: ${valorDescargaM3.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
Calculo descarga: ${formatDecimalValue(volumeEntrada)} m3 x ${valorDescargaM3.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}/m3
Total descarga: ${totalDescarga.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`
        : `Valor descarga/m3: ${valorDescargaM3.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
Total descarga: ${totalDescarga.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;
    
    alert(`Detalhes da Entrada:
Romaneio: ${en.romaneioNum || 'N/A'}
Empreiteiro: ${en.empreiteiroNome || en.fornecedor || 'N/A'}
Mato: ${en.mato || 'N/A'}
Produto da Carga: ${en.produtoCarga || 'N/A'}
Motorista: ${en.motorista || 'N/A'}
Data: ${en.data} ${en.horario || ''}
Caminhão/Placa: ${en.caminhao || 'N/A'} / ${en.placa}

--- MEDIDAS ---
Comprimento: ${formatDecimalValue(en.comp)}m
Largura: ${formatDecimalValue(en.larg)}m
Alturas da Carroceria:
${alturasStr}
Altura Média: ${formatDecimalValue(en.mediaAltura)}m
Volume Total: ${en.volume.toFixed(2).replace('.', ',')}m³

--- FINANCEIRO ---
${financeiroDetalhe}
Observacao: ${en.observacaoCarga || 'N/A'}
`);
};

window.alterarEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if(!en) return;
    entradaEditandoId = id;
    const origemInput = document.getElementById('entOrigemTora');
    if (origemInput) origemInput.value = en.origemTora || (en.compraAvulsa ? 'COMPRA_AVULSA' : 'EMPREITEIRO');
    atualizarOrigemToraEntrada();
    const fornecedorAvulsoInput = document.getElementById('entFornecedorAvulso');
    if (fornecedorAvulsoInput) fornecedorAvulsoInput.value = en.compraAvulsa ? (en.empreiteiroNome || en.fornecedor || '') : '';
    const valorAvulsoInput = document.getElementById('entValorAvulso');
    if (valorAvulsoInput) valorAvulsoInput.value = en.compraAvulsa && window.formatCurrencyValue ? window.formatCurrencyValue(en.valorMetroEmpreiteiro || 0) : '';
    document.getElementById('entData').value = en.data || '';
    document.getElementById('entHorario').value = en.horario || '';
    if(selectEmpreiteiro) {
        selectEmpreiteiro.value = en.empreiteiroId || '';
        preencherDadosEmpreiteiroSelecionado();
    }
    const entMatoSelect = document.getElementById('entMatoSelect');
    if (entMatoSelect && entMatoSelect.style.display !== 'none') {
        entMatoSelect.value = en.mato || '';
    }
    if(entMato) entMato.value = en.mato || '';
    const mapaMatoSelect = document.getElementById('entMapaMatoId');
    if (mapaMatoSelect) {
        renderizarMatosMapaEntrada(en.mapaMatoId || '');
        mapaMatoSelect.value = en.mapaMatoId || '';
        atualizarInfoMapaMatoEntrada();
    }
    const produtoCargaInput = document.getElementById('entProdutoCarga');
    if (produtoCargaInput) produtoCargaInput.value = en.produtoCarga || '';
    const observacaoCargaInput = document.getElementById('entObservacaoCarga');
    if (observacaoCargaInput) observacaoCargaInput.value = en.observacaoCarga || '';
    document.getElementById('entRomaneio').value = en.romaneioNum || '';
    document.getElementById('entMotorista').value = en.motorista || '';
    document.getElementById('entCaminhao').value = en.caminhao || '';
    document.getElementById('entPlaca').value = en.placa || '';
    document.getElementById('entComp').value = formatDecimalValue(en.comp) || '';
    document.getElementById('entLarg').value = formatDecimalValue(en.larg) || '';
    if (entValorDescarga) entValorDescarga.value = window.formatCurrencyValue ? window.formatCurrencyValue(Number(en.valorDescargaM3 || 0)) : formatDecimalValue(Number(en.valorDescargaM3 || 0));
    
    // Carregar alturas individuais se existirem
    if (en.alturas && Array.isArray(en.alturas)) {
        document.getElementById('entAltEsq1').value = formatDecimalValue(en.alturas[0]) || '';
        document.getElementById('entAltEsq2').value = formatDecimalValue(en.alturas[1]) || '';
        document.getElementById('entAltEsq3').value = formatDecimalValue(en.alturas[2]) || '';
        document.getElementById('entAltDir1').value = formatDecimalValue(en.alturas[3]) || '';
        document.getElementById('entAltDir2').value = formatDecimalValue(en.alturas[4]) || '';
        document.getElementById('entAltDir3').value = formatDecimalValue(en.alturas[5]) || '';
    } else {
        document.getElementById('entAltEsq1').value = '';
        document.getElementById('entAltEsq2').value = '';
        document.getElementById('entAltEsq3').value = '';
        document.getElementById('entAltDir1').value = '';
        document.getElementById('entAltDir2').value = '';
        document.getElementById('entAltDir3').value = '';
    }
    
    atualizarEstadoEdicaoEntrada();
    
    if (typeof window.switchTabEntrada === 'function') {
        window.switchTabEntrada('registro');
    }

    window.scrollTo({top: formEntrada.offsetTop - 100, behavior: 'smooth'});
    calcularVolumeAtual();
};

function gerarHtmlReciboEntrada(en) {
    const dtObj = new Date(en.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');
    const reciboFinanceiro = usuarioPodeVerFinanceiroEmpreiteiro()
        ? `<br><p><strong>Valor Empreiteiro por MÂ³:</strong> R$ ${(en.valorMetroEmpreiteiro || 0).toFixed(2)}</p>
<p><strong>Total Empreiteiro:</strong> R$ ${(en.totalEmpreiteiro || 0).toFixed(2)}</p>
<p><strong>Valor Descarga por MÂ³:</strong> R$ ${(en.valorDescargaM3 || 0).toFixed(2)}</p>
<h3><strong>TOTAL DESCARGA:</strong> R$ ${(en.totalDescarga || 0).toFixed(2)}</h3>`
        : `<br><p><strong>Valor Descarga por MÂ³:</strong> R$ ${(en.valorDescargaM3 || 0).toFixed(2)}</p>
<h3><strong>TOTAL DESCARGA:</strong> R$ ${(en.totalDescarga || 0).toFixed(2)}</h3>`;
    return `
        <div class="doc-header"><div><img src="logo.png" alt="Serraria" class="doc-logo" onerror="this.style.display='none'"><div style="margin-top:10px; color:#334155; font-size:13px;"><strong>Recibo de Entrada de Toras</strong></div></div><div class="doc-title"><h1>Entrada</h1><p><strong>Romaneio ${en.romaneioNum || 'N/A'}</strong></p></div></div>
        <div class="doc-grid"><div class="doc-card"><h3>Dados Gerais</h3><p><strong>Empreiteiro:</strong> ${en.empreiteiroNome || en.fornecedor || 'N/A'}</p><p><strong>Produto:</strong> ${en.produtoCarga || 'N/A'}</p><p><strong>Mato:</strong> ${en.mato || 'N/A'}</p><p><strong>Motorista:</strong> ${en.motorista || 'N/A'}</p><p><strong>Data/Hora:</strong> ${dtStr} ${en.horario || ''}</p><p><strong>Veiculo:</strong> ${en.caminhao || 'N/A'} - ${en.placa || '-'}</p></div><div class="doc-card"><h3>Medidas</h3><p><strong>Comprimento:</strong> ${formatDecimalValue(en.comp)}m</p><p><strong>Largura:</strong> ${formatDecimalValue(en.larg)}m</p><p><strong>Altura media:</strong> ${formatDecimalValue(en.mediaAltura)}m</p><p><strong>Volume:</strong> <span class="doc-total">${en.volume.toFixed(2).replace('.', ',')} m3</span></p></div></div>
        ${en.observacaoCarga ? `<div class="doc-note"><strong>Observacao da carga:</strong><br>${en.observacaoCarga}</div>` : ''}
        <div class="doc-note">${reciboFinanceiro}</div>
        <div class="doc-signatures"><div>Assinatura</div><div>Conferencia</div></div>`;
}

window.entradaDocActions = {
    current: null,
    set(record) { this.current = record; },
    print() {
        if (!this.current) return;
        const nome = this.current.empreiteiroNome || this.current.fornecedor || 'empreiteiro';
        const docName = window.DocActions.buildDocumentName([nome, this.current.romaneioNum || this.current.id]);
        window.DocActions.printHtml({ title: docName, contentHtml: gerarHtmlReciboEntrada(this.current) });
    },
    pdf() {
        if (!this.current) return;
        const nome = this.current.empreiteiroNome || this.current.fornecedor || 'empreiteiro';
        const docName = window.DocActions.buildDocumentName([nome, this.current.romaneioNum || this.current.id]);
        return window.DocActions.downloadPdf({ title: docName, filename: docName, contentHtml: gerarHtmlReciboEntrada(this.current) });
    },
    whatsapp() {
        if (!this.current) return;
        const nome = this.current.empreiteiroNome || this.current.fornecedor || 'empreiteiro';
        const docName = window.DocActions.buildDocumentName([nome, this.current.romaneioNum || this.current.id]);
        return window.DocActions.sendWhatsApp({ title: docName, filename: docName, message: `Segue o recibo de entrada ${docName}.`, contentHtml: gerarHtmlReciboEntrada(this.current) });
    }
};

window.imprimirEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if(!en) return;
    const dtObj = new Date(en.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');
    const reciboFinanceiro = usuarioPodeVerFinanceiroEmpreiteiro()
        ? `<br><p><strong>Valor Empreiteiro por M³:</strong> R$ ${(en.valorMetroEmpreiteiro || 0).toFixed(2)}</p>
<p><strong>Total Empreiteiro:</strong> R$ ${(en.totalEmpreiteiro || 0).toFixed(2)}</p>
<p><strong>Valor Descarga por M³:</strong> R$ ${(en.valorDescargaM3 || 0).toFixed(2)}</p>
<h3><strong>TOTAL DESCARGA:</strong> R$ ${(en.totalDescarga || 0).toFixed(2)}</h3>`
        : `<br><p><strong>Valor Descarga por M³:</strong> R$ ${(en.valorDescargaM3 || 0).toFixed(2)}</p>
<h3><strong>TOTAL DESCARGA:</strong> R$ ${(en.totalDescarga || 0).toFixed(2)}</h3>`;
    let win = window.open('', '_blank');
    win.document.write(`
<html><head><title>Imprimir Recibo de Entrada</title>
<style>body{font-family: Arial, sans-serif; padding: 20px;} table{width: 100%; border-collapse: collapse; margin-top: 20px;} th, td{border: 1px solid #ccc; padding: 8px; text-align: left;}</style>
</head><body>
<h2>Recibo de Entrada de Toras</h2>
<p><strong>Nº Romaneio:</strong> ${en.romaneioNum || 'N/A'}</p>
<p><strong>Empreiteiro:</strong> ${en.empreiteiroNome || en.fornecedor || 'N/A'}</p>
<p><strong>Motorista:</strong> ${en.motorista || 'N/A'}</p>
<p><strong>Data/Hora:</strong> ${dtStr} ${en.horario || ''}</p>
<p><strong>Veículo:</strong> ${en.caminhao || 'N/A'} - Placa: ${en.placa}</p>
<table><tr><th>Comprimento</th><th>Largura</th><th>Altura Média</th><th>Volume (m³)</th></tr>
<tr><td>${formatDecimalValue(en.comp)}m</td><td>${formatDecimalValue(en.larg)}m</td><td>${formatDecimalValue(en.mediaAltura)}m</td><td><strong>${en.volume.toFixed(2).replace('.', ',')}</strong></td></tr></table>
${reciboFinanceiro}
<br><br><br>
<div style="text-align:center; width: 300px; border-top: 1px solid #000; margin: 0 auto;">Assinatura</div>
</body></html>
    `);
    win.document.close();
    win.print();
};

window.imprimirEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if (!en) return;
    window.entradaDocActions.set(en);
    window.entradaDocActions.print();
};

window.baixarPdfEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if (!en) return;
    window.entradaDocActions.set(en);
    window.entradaDocActions.pdf();
};

window.enviarEntradaWhatsapp = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if (!en) return;
    window.entradaDocActions.set(en);
    window.entradaDocActions.whatsapp();
};

window.switchTabEntrada = function(tabName) {
    const subTabs = ['registro', 'lista', 'descarregamento', 'empreiteiros'];
    const canAccess = (name) => !window.hasSubsectionPermission || window.hasSubsectionPermission('view-entrada', name);
    if (!canAccess(tabName)) {
        const fallback = subTabs.find(canAccess);
        if (!fallback) {
            alert('Seu usuario nao tem permissao para acessar telas internas de Entrada de Toras.');
            return;
        }
        tabName = fallback;
    }

    const tabRegistro = document.getElementById('btnTabEntradaRegistro');
    const tabLista = document.getElementById('btnTabEntradaLista');
    const tabDescarregamento = document.getElementById('btnTabEntradaDescarregamento');
    const tabEmpreiteiros = document.getElementById('btnTabEntradaEmpreiteiros');

    const cardEntrada = document.getElementById('cardFormEntrada');
    const panelEntradas = document.getElementById('panelListaEntradas');
    const panelDescargas = document.getElementById('panelDescarregamentos');
    const cardEmp = document.getElementById('cardFormEmpreiteiro');
    const panelEmp = document.getElementById('panelListaEmpreiteiros');
    
    const gridLayout = document.getElementById('gridEntradasGeralLayout');
    const colEsquerda = gridLayout ? gridLayout.querySelector('.form-column-left') : null;
    const colDireita = gridLayout ? gridLayout.querySelector('.table-column-right') : null;

    if (!tabRegistro || !tabLista || !tabDescarregamento || !tabEmpreiteiros || !cardEntrada || !panelEntradas || !panelDescargas || !cardEmp || !panelEmp || !gridLayout || !colEsquerda || !colDireita) return;

    tabRegistro.style.display = canAccess('registro') ? 'flex' : 'none';
    tabLista.style.display = canAccess('lista') ? 'flex' : 'none';
    tabDescarregamento.style.display = canAccess('descarregamento') ? 'flex' : 'none';
    tabEmpreiteiros.style.display = canAccess('empreiteiros') ? 'flex' : 'none';

    // Reset styles
    tabRegistro.style.color = 'var(--text-muted)';
    tabRegistro.style.borderBottom = 'none';
    tabLista.style.color = 'var(--text-muted)';
    tabLista.style.borderBottom = 'none';
    tabDescarregamento.style.color = 'var(--text-muted)';
    tabDescarregamento.style.borderBottom = 'none';
    tabEmpreiteiros.style.color = 'var(--text-muted)';
    tabEmpreiteiros.style.borderBottom = 'none';

    // Hide all
    cardEntrada.style.display = 'none';
    panelEntradas.style.display = 'none';
    panelDescargas.style.display = 'none';
    cardEmp.style.display = 'none';
    panelEmp.style.display = 'none';

    if (tabName === 'registro') {
        tabRegistro.style.color = 'var(--accent-color)';
        tabRegistro.style.borderBottom = '3px solid var(--accent-color)';
        
        colEsquerda.style.display = 'block';
        colEsquerda.style.maxWidth = '800px';
        colEsquerda.style.margin = '0 auto';
        
        colDireita.style.display = 'none';
        cardEntrada.style.display = 'block';
        
        gridLayout.classList.remove('form-table-grid');
    } else if (tabName === 'lista') {
        tabLista.style.color = 'var(--accent-color)';
        tabLista.style.borderBottom = '3px solid var(--accent-color)';
        
        colEsquerda.style.display = 'none';
        
        colDireita.style.display = 'block';
        colDireita.style.width = '100%';
        panelEntradas.style.display = 'block';
        
        gridLayout.classList.remove('form-table-grid');
    } else if (tabName === 'descarregamento') {
        tabDescarregamento.style.color = 'var(--accent-color)';
        tabDescarregamento.style.borderBottom = '3px solid var(--accent-color)';
        
        colEsquerda.style.display = 'none';
        colDireita.style.display = 'block';
        colDireita.style.width = '100%';
        panelDescargas.style.display = 'block';
        renderizarDescarregamentos();
        
        gridLayout.classList.remove('form-table-grid');
    } else if (tabName === 'empreiteiros') {
        tabEmpreiteiros.style.color = 'var(--accent-color)';
        tabEmpreiteiros.style.borderBottom = '3px solid var(--accent-color)';
        
        colEsquerda.style.display = 'none';
        colEsquerda.style.width = '100%';
        colEsquerda.style.maxWidth = '100%';
        colEsquerda.style.margin = '0 0 16px 0';
        
        colDireita.style.display = 'block';
        colDireita.style.width = '100%';
        panelEmp.style.display = 'block';
        
        gridLayout.classList.remove('form-table-grid');
    }
};

// Inicialização segura
function inicializarModuloEntrada() {
    injetarEstiloEmpreiteiro();
    // Resolver referências dos elementos dinamicamente para garantir que não fiquem nulos
    formEntrada = document.getElementById('formEntrada');
    listaEntradas = document.getElementById('listaEntradas');
    listaDescarregamentos = document.getElementById('listaDescarregamentos');
    filtroEntradasNome = document.getElementById('filtroEntradasNome');
    filtroDescargaNome = document.getElementById('filtroDescargaNome');
    entRomaneio = document.getElementById('entRomaneio');
    entMato = document.getElementById('entMato');
    entComp = document.getElementById('entComp');
    entLarg = document.getElementById('entLarg');
    inputsAlt = [
        document.getElementById('entAltEsq1'), document.getElementById('entAltEsq2'), document.getElementById('entAltEsq3'),
        document.getElementById('entAltDir1'), document.getElementById('entAltDir2'), document.getElementById('entAltDir3')
    ];
    resVolume = document.getElementById('entResultadoVolume');
    resInfo = document.getElementById('entInfoMedia');
    resFinanceiro = document.getElementById('entResultadoFinanceiro');
    infoFinanceira = document.getElementById('entInfoFinanceira');
    entValorDescarga = document.getElementById('entValorDescarga');
    resDescarga = document.getElementById('entResultadoDescarga');
    infoDescarga = document.getElementById('entInfoDescarga');
    entData = document.getElementById('entData');
    entHorario = document.getElementById('entHorario');
    configurarSubmitEntrada();
    moverFechamentoEntradasParaTopo();
    injetarEstiloFechamentosEntrada();
    atualizarEstadoEdicaoEntrada();
    carregarFechamentosSalvosExtracao();

    const btnCancelarEdicaoEntrada = document.getElementById('btnCancelarEdicaoEntrada');
    if (btnCancelarEdicaoEntrada) {
        btnCancelarEdicaoEntrada.addEventListener('click', window.cancelarEdicaoEntrada);
    }

    // Forçar letras maiúsculas em tempo real nos campos de texto
    ['empNome', 'empMato', 'entRomaneio', 'entMato', 'entFornecedorAvulso', 'entMotorista', 'entCaminhao', 'entPlaca', 'entObservacaoCarga'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', window.forceUppercaseInput);
        }
    });
    
    // Aplicar máscara decimal com 2 casas e escuta de cálculo em tempo real nas medidas
    const decimalInputs = [entComp, entLarg, ...inputsAlt];
    decimalInputs.forEach(input => {
        if(input) {
            input.addEventListener('input', formatDecimal2Input);
            input.addEventListener('input', calcularVolumeAtual);
        }
    });

    if(selectEmpreiteiro) {
        selectEmpreiteiro.addEventListener('change', () => {
            preencherDadosEmpreiteiroSelecionado();
            calcularVolumeAtual();
        });
    }
    const entMatoSelect = document.getElementById('entMatoSelect');
    if (entMatoSelect) {
        entMatoSelect.addEventListener('change', () => {
            if (entMato) entMato.value = entMatoSelect.value;
            calcularVolumeAtual();
        });
    }
    const entMapaMatoId = document.getElementById('entMapaMatoId');
    if (entMapaMatoId) entMapaMatoId.addEventListener('change', aplicarMapaMatoSelecionadoEntrada);
    if(entValorDescarga) {
        entValorDescarga.addEventListener('input', window.formatCurrencyInput);
        entValorDescarga.addEventListener('input', calcularVolumeAtual);
    }
    const entOrigemTora = document.getElementById('entOrigemTora');
    if (entOrigemTora) entOrigemTora.addEventListener('change', atualizarOrigemToraEntrada);
    const entValorAvulso = document.getElementById('entValorAvulso');
    if (entValorAvulso) {
        entValorAvulso.addEventListener('input', window.formatCurrencyInput);
        entValorAvulso.addEventListener('input', calcularVolumeAtual);
    }
    if(entHorario) {
        entHorario.addEventListener('input', calcularVolumeAtual);
        entHorario.addEventListener('change', calcularVolumeAtual);
    }
    const entProdutoCarga = document.getElementById('entProdutoCarga');
    if (entProdutoCarga) entProdutoCarga.addEventListener('change', calcularVolumeAtual);

    carregarMatosMapaEntrada();
    document.addEventListener('mapa:updated', () => carregarMatosMapaEntrada(document.getElementById('entMapaMatoId')?.value || ''));

    // Eventos de Busca e Filtro de Entradas
    if(filtroEntradasNome) filtroEntradasNome.addEventListener('input', renderizarEntradas);
    
    // Eventos de Filtro de Período
    const filtroEntradasDataInicio = document.getElementById('filtroEntradasDataInicio');
    const filtroEntradasDataFim = document.getElementById('filtroEntradasDataFim');
    if(filtroEntradasDataInicio) filtroEntradasDataInicio.addEventListener('change', renderizarEntradas);
    if(filtroEntradasDataFim) filtroEntradasDataFim.addEventListener('change', renderizarEntradas);

    if(filtroDescargaNome) filtroDescargaNome.addEventListener('input', renderizarDescarregamentos);
    const filtroDescargaDataInicio = document.getElementById('filtroDescargaDataInicio');
    const filtroDescargaDataFim = document.getElementById('filtroDescargaDataFim');
    if(filtroDescargaDataInicio) filtroDescargaDataInicio.addEventListener('change', renderizarDescarregamentos);
    if(filtroDescargaDataFim) filtroDescargaDataFim.addEventListener('change', renderizarDescarregamentos);
    const btnGerarRelatorioDescarga = document.getElementById('btnGerarRelatorioDescarga');
    if(btnGerarRelatorioDescarga) btnGerarRelatorioDescarga.addEventListener('click', window.gerarRelatorioDescarregamento);
    const checkAllDescargas = document.getElementById('checkAllDescargas');
    if (checkAllDescargas) {
        checkAllDescargas.addEventListener('change', (e) => {
            getDescargasFiltradas().forEach(en => {
                if (e.target.checked) descargasSelecionadas.add(en.id);
                else descargasSelecionadas.delete(en.id);
            });
            renderizarDescarregamentos();
        });
    }
    if (listaDescarregamentos) {
        listaDescarregamentos.addEventListener('change', (e) => {
            if (!e.target.classList.contains('check-descarga')) return;
            const id = e.target.dataset.id;
            if (e.target.checked) descargasSelecionadas.add(id);
            else descargasSelecionadas.delete(id);
            atualizarSelecaoDescarregamento();
        });
    }

    // Selecionar tudo
    const checkAll = document.getElementById('checkAllEntradas');
    if (checkAll) {
        checkAll.addEventListener('change', (e) => {
            const checkboxes = listaEntradas.querySelectorAll('.check-entrada');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const id = cb.dataset.id;
                if (e.target.checked) {
                    entradasSelecionadas.add(id);
                } else {
                    entradasSelecionadas.delete(id);
                }
            });
            atualizarPainelFechamento();
        });
    }

    // Delegar evento de clique individual para checkboxes de entradas
    if (listaEntradas) {
        listaEntradas.addEventListener('change', (e) => {
            if (e.target.classList.contains('check-entrada')) {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    entradasSelecionadas.add(id);
                } else {
                    entradasSelecionadas.delete(id);
                    if (checkAll) checkAll.checked = false;
                }
                atualizarPainelFechamento();
            }
        });
    }

    // Botão de gerar relatório consolidado
    const btnGerarConsolidado = document.getElementById('btnGerarRelatorioConsolidado');
    if (btnGerarConsolidado) {
        btnGerarConsolidado.addEventListener('click', window.gerarRelatorioConsolidado);
    }
    const btnSalvarFechamentoExtracao = document.getElementById('btnSalvarFechamentoExtracao');
    if (btnSalvarFechamentoExtracao) {
        btnSalvarFechamentoExtracao.addEventListener('click', window.salvarFechamentoExtracao);
    }
    const btnAtualizarFechamentosExtracao = document.getElementById('btnAtualizarFechamentosExtracao');
    if (btnAtualizarFechamentosExtracao) {
        btnAtualizarFechamentosExtracao.addEventListener('click', carregarFechamentosSalvosExtracao);
    }
    const buscaFechamentoExtracao = document.getElementById('buscaFechamentoExtracao');
    if (buscaFechamentoExtracao) buscaFechamentoExtracao.addEventListener('input', renderizarFechamentosSalvosExtracao);
    const filtroFechamentoStatusExtracao = document.getElementById('filtroFechamentoStatusExtracao');
    if (filtroFechamentoStatusExtracao) filtroFechamentoStatusExtracao.addEventListener('change', renderizarFechamentosSalvosExtracao);

    // Filtros de Empreiteiros
    const filtroEmpreiteirosBusca = document.getElementById('filtroEmpreiteirosBusca');
    if(filtroEmpreiteirosBusca) {
        filtroEmpreiteirosBusca.addEventListener('input', renderizarEmpreiteiros);
    }
    const btnOrdenarEmpreiteiros = document.getElementById('btnOrdenarEmpreiteiros');
    if (btnOrdenarEmpreiteiros) {
        btnOrdenarEmpreiteiros.addEventListener('click', () => {
            ordenarEmpreiteirosAZ = !ordenarEmpreiteirosAZ;
            btnOrdenarEmpreiteiros.style.background = ordenarEmpreiteirosAZ ? 'var(--accent-color)' : '';
            renderizarEmpreiteiros();
        });
    }
    const btnNovoEmpreiteiro = document.getElementById('btnNovoEmpreiteiro');
    if (btnNovoEmpreiteiro) btnNovoEmpreiteiro.addEventListener('click', window.abrirCadastroEmpreiteiro);
    const btnAdicionarMatoEmpreiteiro = document.getElementById('btnAdicionarMatoEmpreiteiro');
    if (btnAdicionarMatoEmpreiteiro) btnAdicionarMatoEmpreiteiro.addEventListener('click', adicionarMatoEmpreiteiro);
    const empMatoInput = document.getElementById('empMato');
    if (empMatoInput) {
        empMatoInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                adicionarMatoEmpreiteiro();
            }
        });
    }
    const empMatoValorInput = document.getElementById('empMatoValor');
    ['empMatoValor', 'empMatoValorLenha', 'empMatoValorOutros', 'empMatoValorCorte'].forEach(id => {
        const inputValorMato = document.getElementById(id);
        if (!inputValorMato) return;
        inputValorMato.addEventListener('input', window.formatCurrencyInput);
        inputValorMato.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                adicionarMatoEmpreiteiro();
            }
        });
    });
    const empMatosLista = document.getElementById('empMatosLista');
    if (empMatosLista) {
        empMatosLista.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-index]');
            if (!button) return;
            const index = Number(button.dataset.index);
            if (button.dataset.action === 'edit') {
                const mato = matosEmpreiteiroEditando[index];
                const input = document.getElementById('empMato');
                const inputValor = document.getElementById('empMatoValor');
                const inputValorLenha = document.getElementById('empMatoValorLenha');
                const inputValorOutros = document.getElementById('empMatoValorOutros');
                const inputValorCorte = document.getElementById('empMatoValorCorte');
                if (input) input.value = mato.nome || '';
                if (inputValor) inputValor.value = window.formatCurrencyValue(mato.valorMetro || 0);
                if (inputValorLenha) inputValorLenha.value = window.formatCurrencyValue(mato.valorLenha || 0);
                if (inputValorOutros) inputValorOutros.value = window.formatCurrencyValue(mato.valorOutros || 0);
                if (inputValorCorte) inputValorCorte.value = window.formatCurrencyValue(mato.valorCorteRemocao || 0);
                input?.focus();
                return;
            }
            matosEmpreiteiroEditando.splice(index, 1);
            renderizarMatosEmpreiteiro();
        });
    }

    // Inicializar data/horário atual padrão no formulário
    if(entData) entData.valueAsDate = new Date();
    if(entHorario) {
        const now = new Date();
        entHorario.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }

    atualizarOrigemToraEntrada();
    window.switchTabEntrada('registro');

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarModuloEntrada);
} else {
    inicializarModuloEntrada();
}

window.SectionLoader?.register('view-entrada', () => Promise.all([
    carregarEmpreiteiros(),
    carregarEntradas()
]));
