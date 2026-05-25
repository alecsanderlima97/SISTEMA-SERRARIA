import { db, auth, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from './firebase-init.js';

// ---- MÓDULO: ENTRADA DE MADEIRA E EMPREITEIROS ----

const formEmpreiteiro = document.getElementById('formEmpreiteiro');
const listaEmpreiteiros = document.getElementById('listaEmpreiteiros');
const selectEmpreiteiro = document.getElementById('entEmpreiteiro');

let empreiteirosAtuais = [];
let empreiteiroEditandoId = null;
let matosEmpreiteiroEditando = [];
let ordenarEmpreiteirosAZ = false;

function normalizarNomeMato(nome) {
    return (nome || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function obterMatosEmpreiteiro(emp) {
    const matos = Array.isArray(emp?.matos) ? emp.matos : [];
    const normalizados = matos.map(mato => {
        if (typeof mato === 'string') {
            return { nome: mato.toUpperCase().trim(), valorMetro: Number(emp?.valorMetro) || 0 };
        }
        return {
            nome: (mato?.nome || '').toString().toUpperCase().trim(),
            valorMetro: Number(mato?.valorMetro ?? emp?.valorMetro) || 0
        };
    });

    if (normalizados.length === 0 && emp?.mato) {
        normalizados.push({ nome: emp.mato.toString().toUpperCase().trim(), valorMetro: Number(emp?.valorMetro) || 0 });
    }

    const unicos = new Map();
    normalizados.filter(mato => mato.nome).forEach(mato => unicos.set(mato.nome, mato));
    return [...unicos.values()];
}

function renderizarMatosEmpreiteiro() {
    const lista = document.getElementById('empMatosLista');
    if (!lista) return;
    lista.innerHTML = '';

    matosEmpreiteiroEditando.forEach((mato, index) => {
        const chip = document.createElement('span');
        chip.style.cssText = 'display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border-radius:14px; background:rgba(44,201,144,0.12); border:1px solid rgba(44,201,144,0.35); color:#d1fae5; font-size:0.78rem;';
        const valor = Number(mato.valorMetro || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        chip.innerHTML = `${mato.nome} - ${valor}/m³ <button type="button" data-action="edit" data-index="${index}" style="border:none; background:transparent; color:#93c5fd; cursor:pointer; font-weight:bold;" title="Editar mato"><i class="fa-solid fa-pen"></i></button><button type="button" data-action="remove" data-index="${index}" style="border:none; background:transparent; color:#fca5a5; cursor:pointer; font-weight:bold;" title="Remover mato">×</button>`;
        lista.appendChild(chip);
    });
}

function adicionarMatoEmpreiteiro() {
    const input = document.getElementById('empMato');
    const inputValor = document.getElementById('empMatoValor');
    const mato = (input?.value || '').toUpperCase().trim();
    const valorMetro = window.parseCurrencyValue(inputValor?.value || '') || 0;
    if (!mato) return;
    const existente = matosEmpreiteiroEditando.find(item => normalizarNomeMato(item.nome) === normalizarNomeMato(mato));
    if (existente) {
        existente.nome = mato;
        existente.valorMetro = valorMetro;
    } else {
        matosEmpreiteiroEditando.push({ nome: mato, valorMetro });
        matosEmpreiteiroEditando.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    if (input) input.value = '';
    if (inputValor) inputValor.value = '';
    renderizarMatosEmpreiteiro();
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
            <td>${obterMatosEmpreiteiro(emp).map(item => `${item.nome} (${Number(item.valorMetro || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}/m³)`).join(', ') || '-'}</td>
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
            option.textContent = usuarioPodeVerFinanceiroEmpreiteiro() ? `${mato.nome} - ${valorTexto}/m³` : mato.nome;
            option.dataset.valor = mato.valorMetro || 0;
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
    if (cardCad && cardCad.style.display === 'none') {
        cardCad.style.display = 'block';
        if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Cadastro';
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
                await updateDoc(doc(db, 'empreiteiros', empreiteiroEditandoId), dados);
                alert('Empreiteiro atualizado com sucesso!');
                empreiteiroEditandoId = null;
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Empreiteiro';
            } else {
                dados.criadoEm = new Date().toISOString();
                await addDoc(collection(db, 'empreiteiros'), dados);
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
    if(confirm("Tem certeza que deseja remover este empreiteiro?")) {
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
let entradasSelecionadas = new Set();
let entradasUnsubscribe = null;

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
    if(selectEmpreiteiro && selectEmpreiteiro.selectedIndex > 0) {
        const optEmpreiteiro = selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex];
        const selectMato = document.getElementById('entMatoSelect');
        valorMetro = parseFloat(selectMato?.selectedOptions?.[0]?.dataset?.valor || optEmpreiteiro.dataset.valor) || 0;
    }
    
    const totalFinanceiro = volume * valorMetro;
    if (resFinanceiro) resFinanceiro.textContent = totalFinanceiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    if (infoFinanceira) infoFinanceira.textContent = `Baseado em ${valorMetro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} por m³`;

    const valorDescargaM3 = window.parseCurrencyValue ? window.parseCurrencyValue(entValorDescarga?.value || '0') : 0;
    const totalDescarga = volume * valorDescargaM3;
    if (resDescarga) resDescarga.textContent = totalDescarga.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    if (infoDescarga) infoDescarga.textContent = `Baseado em ${valorDescargaM3.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} por m³`;

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
                <strong>${en.empreiteiroNome || en.fornecedor || '-'}</strong><br>
                <small style="color:#aaa;">Mato: ${en.mato || '-'}</small><br>
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

    if (filtradas.length === 0) {
        listaDescarregamentos.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum descarregamento com valor encontrado.</td></tr>';
        atualizarResumoDescarregamento(filtradas);
        return;
    }

    listaDescarregamentos.innerHTML = '';
    filtradas.forEach(en => {
        const tr = document.createElement('tr');
        const dtStr = new Date(en.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const funcionario = en.criadoPor?.nome || en.usuarioNome || en.autorNome || '-';
        tr.innerHTML = `
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
}
window.renderizarDescarregamentos = renderizarDescarregamentos;

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

window.gerarRelatorioDescarregamento = function() {
    const lista = getDescargasFiltradas().sort((a,b) => new Date(a.data + 'T' + (a.horario || '00:00')) - new Date(b.data + 'T' + (b.horario || '00:00')));
    if (lista.length === 0) {
        alert("Nenhum descarregamento com valor encontrado para imprimir.");
        return;
    }

    const totalVolume = lista.reduce((sum, en) => sum + (en.volume || 0), 0);
    const totalValor = lista.reduce((sum, en) => sum + (en.totalDescarga || 0), 0);
    const dataInicio = document.getElementById('filtroDescargaDataInicio')?.value;
    const dataFim = document.getElementById('filtroDescargaDataFim')?.value;
    const periodo = dataInicio || dataFim
        ? `${dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'Inicio'} a ${dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}`
        : 'Periodo geral';

    const rows = lista.map((en, index) => {
        const dtStr = new Date(en.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const funcionario = en.criadoPor?.nome || en.usuarioNome || en.autorNome || '-';
        return `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td>${dtStr} ${en.horario || ''}</td>
                <td>${funcionario}</td>
                <td>${en.romaneioNum || '-'}</td>
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
    <table>
        <thead>
            <tr>
                <th>Nº</th><th>Data/Hora</th><th>Funcionario</th><th>Romaneio</th><th>Motorista</th><th>Placa</th><th>Volume</th><th>Valor/m³</th><th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
            <tr class="total"><td colspan="6" style="text-align:right;">Total</td><td style="text-align:right;">${totalVolume.toFixed(2).replace('.', ',')} m³</td><td></td><td style="text-align:right;">${totalValor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td></tr>
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
        
        tableRowsHtml += `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td>${dtStr} ${en.horario || ''}</td>
                <td style="font-weight:bold;">${en.romaneioNum || '-'}</td>
                <td><strong>${en.empreiteiroNome || en.fornecedor || '-'}</strong></td>
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

    <table class="records">
        <thead>
            <tr>
                <th style="width: 30px; text-align:center;">Nº</th>
                <th style="width: 80px;">Data/Hora</th>
                <th style="width: 80px; text-align:left;">Nº Romaneio</th>
                <th>Empreiteiro</th>
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
                <td colspan="7" style="text-align: right; text-transform: uppercase;"><strong>Consolidado Geral:</strong></td>
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
        
        const empreiteiroId = selectEmpreiteiro.value;
        const empreiteiroNome = selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].text;
        const usuarioAuditoria = getUsuarioAtualAuditoria();
        
        const novaEntrada = {
            data: document.getElementById('entData').value,
            horario: document.getElementById('entHorario').value,
            empreiteiroId: empreiteiroId,
            empreiteiroNome: empreiteiroNome,
            mato: ((document.getElementById('entMatoSelect')?.style.display !== 'none' ? document.getElementById('entMatoSelect')?.value : entMato?.value) || '').toUpperCase().trim(),
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
        
        const submitBtn = formEntrada.querySelector('button[type="submit"]');
        const textoOriginal = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
        submitBtn.disabled = true;

        try {
            if (entradaEditandoId) {
                novaEntrada.atualizadoPor = usuarioAuditoria;
                await updateDoc(doc(db, 'entradas', entradaEditandoId), novaEntrada);
                alert(`✅ Entrada do Romaneio ${novaEntrada.romaneioNum} (${calcData.volume.toFixed(2).replace('.', ',')}m³) atualizada com sucesso!`);
                entradasSelecionadas.delete(entradaEditandoId); // Clean selection of edited item
                entradaEditandoId = null;
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Registrar Entrada';
            } else {
                novaEntrada.criadoEm = new Date().toISOString();
                novaEntrada.criadoPor = usuarioAuditoria;
                novaEntrada.atualizadoPor = usuarioAuditoria;
                await addDoc(collection(db, 'entradas'), novaEntrada);
                const valorMensagem = usuarioPodeVerFinanceiroEmpreiteiro()
                    ? calcData.totalFinanceiro.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
                    : calcData.totalDescarga.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
                const labelMensagem = usuarioPodeVerFinanceiroEmpreiteiro() ? 'Valor empreiteiro' : 'Valor da descarga';
                alert(`✅ Entrada do Romaneio ${novaEntrada.romaneioNum} (${calcData.volume.toFixed(2).replace('.', ',')}m³) registrada com sucesso!\n${labelMensagem}: ${valorMensagem}`);
            }
            
            formEntrada.reset();
            if(entValorDescarga) entValorDescarga.value = window.formatCurrencyValue ? window.formatCurrencyValue(1.05) : 'R$ 1,05';
            if(entData) entData.valueAsDate = new Date();
            if(entHorario) {
                const now = new Date();
                entHorario.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            }
            calcularVolumeAtual();
            carregarEntradas();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar entrada.");
        } finally {
            if(!entradaEditandoId) submitBtn.innerHTML = textoOriginal;
            submitBtn.disabled = false;
        }
    });
}

window.deletarEntrada = async function(id) {
    if(confirm("Tem certeza que deseja apagar este registro de entrada?")) {
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
    const financeiroDetalhe = usuarioPodeVerFinanceiroEmpreiteiro()
        ? `Valor/Metro Empreiteiro: R$ ${(en.valorMetroEmpreiteiro || 0).toFixed(2)}
Total Empreiteiro: R$ ${(en.totalEmpreiteiro || 0).toFixed(2)}
Valor Descarga/m³: R$ ${(en.valorDescargaM3 || 0).toFixed(2)}
Total Descarga: R$ ${(en.totalDescarga || 0).toFixed(2)}`
        : `Valor Descarga/m³: R$ ${(en.valorDescargaM3 || 0).toFixed(2)}
Total Descarga: R$ ${(en.totalDescarga || 0).toFixed(2)}`;
    
    alert(`Detalhes da Entrada:
Romaneio: ${en.romaneioNum || 'N/A'}
Empreiteiro: ${en.empreiteiroNome || en.fornecedor || 'N/A'}
Mato: ${en.mato || 'N/A'}
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
`);
};

window.alterarEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if(!en) return;
    alert('Você será direcionado para a tela de Registro / Calculadora M³ para alterar esta entrada.');
    entradaEditandoId = id;
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
    document.getElementById('entRomaneio').value = en.romaneioNum || '';
    document.getElementById('entMotorista').value = en.motorista || '';
    document.getElementById('entCaminhao').value = en.caminhao || '';
    document.getElementById('entPlaca').value = en.placa || '';
    document.getElementById('entComp').value = formatDecimalValue(en.comp) || '';
    document.getElementById('entLarg').value = formatDecimalValue(en.larg) || '';
    if (entValorDescarga) entValorDescarga.value = window.formatCurrencyValue ? window.formatCurrencyValue(en.valorDescargaM3 || 1.05) : formatDecimalValue(en.valorDescargaM3 || 1.05);
    
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
    
    const btn = formEntrada.querySelector('button[type="submit"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Entrada';
    
    if (typeof window.switchTabEntrada === 'function') {
        window.switchTabEntrada('registro');
    }

    window.scrollTo({top: formEntrada.offsetTop - 100, behavior: 'smooth'});
    calcularVolumeAtual();
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
        
        colEsquerda.style.display = 'block';
        colEsquerda.style.maxWidth = 'none';
        colEsquerda.style.margin = '0';
        cardEmp.style.display = 'block';
        
        colDireita.style.display = 'flex';
        colDireita.style.width = '100%';
        panelEmp.style.display = 'block';
        
        gridLayout.classList.add('form-table-grid');
    }
};

// Inicialização segura
function inicializarModuloEntrada() {
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

    // Forçar letras maiúsculas em tempo real nos campos de texto
    ['empNome', 'empMato', 'entRomaneio', 'entMato', 'entMotorista', 'entCaminhao', 'entPlaca'].forEach(id => {
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
    if(entValorDescarga) {
        entValorDescarga.addEventListener('input', window.formatCurrencyInput);
        entValorDescarga.addEventListener('input', calcularVolumeAtual);
    }

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
    if (empMatoValorInput) {
        empMatoValorInput.addEventListener('input', window.formatCurrencyInput);
        empMatoValorInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                adicionarMatoEmpreiteiro();
            }
        });
    }
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
                if (input) input.value = mato.nome || '';
                if (inputValor) inputValor.value = window.formatCurrencyValue(mato.valorMetro || 0);
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

    window.switchTabEntrada('registro');

    carregarEmpreiteiros();
    carregarEntradas();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarModuloEntrada);
} else {
    inicializarModuloEntrada();
}
