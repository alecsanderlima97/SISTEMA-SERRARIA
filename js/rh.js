import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from './firebase-init.js';

// --- MÓDULO DE GESTÃO DE PESSOAS (RH) ---

const funcionariosCollection = collection(db, 'funcionarios');
let funcionariosAtuais = [];
let funcionarioEditandoId = null;
let horaExtraEditandoId = null;
let anexosAtestadoAtual = [];
let anexosCatAtual = [];
let mesIndicadoresRH = 'aberto';

// Elementos do DOM
const viewRH = document.getElementById('view-rh');
const formFuncionario = document.getElementById('formFuncionario');
const listaRH = document.getElementById('listaRH');
const buscaFuncionario = document.getElementById('buscaFuncionario');

const cardFormRH = document.getElementById('cardFormRH');
const panelListaRH = document.getElementById('panelListaRH');
let valoresRHOcultos = localStorage.getItem('orquestra_rh_ocultar_valores') === 'true';
const btnToggleFormRH = document.getElementById('btnToggleFormRH');
const txtToggleFormRH = document.getElementById('txtToggleFormRH');
const btnCancelarRH = document.getElementById('btnCancelarRH');
const btnLimparBuscaRH = document.getElementById('btnLimparBuscaRH');

window.rhDocumentoActions = {
    getPayload(tipo) {
        const nomeFuncionario = (document.getElementById('he-funcionario-nome')?.textContent || '').trim()
            || (document.getElementById('falta-funcionario-nome')?.textContent || '').trim()
            || 'funcionario';
        const map = {
            holerite: { elementId: 'conteudoHolerite', title: `${nomeFuncionario} - Recibo de Pagamento`, filename: `${nomeFuncionario} - recibo de pagamento` },
            relatorio: { elementId: 'conteudoRelatorioHE', title: `${nomeFuncionario} - Relatorio Mensal de Horas Extras`, filename: `${nomeFuncionario} - relatorio mensal he` }
        };
        return map[tipo] || map.holerite;
    },
    print(tipo) {
        const payload = this.getPayload(tipo);
        const el = document.getElementById(payload.elementId);
        if (!el) return;
        window.DocActions.printHtml({ title: payload.title, contentHtml: el.innerHTML });
    },
    pdf(tipo) {
        const payload = this.getPayload(tipo);
        const el = document.getElementById(payload.elementId);
        if (!el) return;
        return window.DocActions.downloadPdf({ title: payload.title, filename: payload.filename, contentHtml: el.innerHTML });
    },
    whatsapp(tipo) {
        const payload = this.getPayload(tipo);
        const el = document.getElementById(payload.elementId);
        if (!el) return;
        return window.DocActions.sendWhatsApp({ title: payload.title, filename: payload.filename, message: `Segue o documento ${payload.title}.`, contentHtml: el.innerHTML });
    }
};

// Inicialização segura
function inicializarModuloRH() {
    if (!viewRH) return;

    injetarEstiloMobileRH();
    configurarTogglesRH();
    configurarFormulariosRH();
    carregarFuncionarios();
}

function injetarEstiloMobileRH() {
    if (document.getElementById('rh-mobile-style')) return;
    const style = document.createElement('style');
    style.id = 'rh-mobile-style';
    style.textContent = `
        @media (max-width: 760px) {
            #panelListaRH > div[style*="overflow-x"] { overflow-x: visible !important; }
            #panelListaRH .package-table { min-width: 0 !important; border-collapse: separate !important; border-spacing: 0 12px !important; }
            #panelListaRH .package-table thead { display: none !important; }
            #listaRH tr { display: grid; gap: 10px; padding: 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(15,23,42,0.72); }
            #listaRH td { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; align-items: center; border: 0 !important; padding: 0 !important; }
            #listaRH td::before { content: attr(data-label); color: var(--text-muted); font-size: 0.72rem; font-weight: 900; text-transform: uppercase; }
            #listaRH td:first-child { grid-template-columns: 1fr; }
            #listaRH td:first-child::before { display: none; }
            #listaRH td:last-child { grid-template-columns: 1fr; }
            #listaRH td:last-child::before { content: "Acoes"; margin-bottom: 2px; }
            #listaRH td:last-child > div { justify-content: flex-start !important; flex-wrap: wrap !important; }
            #listaRH .btn-icon { min-width: 42px; min-height: 38px; border-radius: 8px; background: rgba(255,255,255,0.04); }
            #cardFormRH { max-width: none !important; padding: 16px !important; }
            #formFuncionario .grid-form { grid-template-columns: 1fr !important; }
            #formFuncionario .input-group { grid-column: auto !important; }
        }
    `;
    document.head.appendChild(style);
}

// Configurar exibição condicional do formulário de cadastro
function configurarTogglesRH() {
    if (btnCancelarRH) {
        btnCancelarRH.onclick = fecharFormularioRH;
    }

    if (buscaFuncionario) {
        buscaFuncionario.addEventListener('input', filtrarFuncionarios);
    }
    const ordenarFuncionarios = document.getElementById('ordenarFuncionarios');
    if (ordenarFuncionarios) ordenarFuncionarios.addEventListener('change', filtrarFuncionarios);
}

window.switchTabRH = function(tabName, isEditing = false) {
    const tabForm = document.getElementById('cardFormRH');
    const tabLista = document.getElementById('panelListaRH');
    const btnForm = document.getElementById('btnTabRHForm');
    const btnLista = document.getElementById('btnTabRHLista');

    if (!tabForm || !tabLista || !btnForm || !btnLista) return;

    if (tabName === 'form') {
        tabForm.style.display = 'block';
        tabLista.style.display = 'none';
        btnForm.style.color = 'var(--accent-color)';
        btnForm.style.borderBottom = '3px solid var(--accent-color)';
        btnLista.style.color = 'var(--text-muted)';
        btnLista.style.borderBottom = 'none';

        if (!isEditing) {
            funcionarioEditandoId = null;
            if (formFuncionario) formFuncionario.reset();
            const idEl = document.getElementById('rh-id');
            if (idEl) idEl.value = '';
            const normalEl = document.getElementById('rh-valor-he-normal');
            if (normalEl) normalEl.value = '';
            const espEl = document.getElementById('rh-valor-he-especial');
            if (espEl) espEl.value = '';
            const titEl = document.getElementById('tituloFormRH');
            if (titEl) titEl.innerHTML = `<i class="fa-solid fa-user-plus"></i> Novo Funcionário`;
            const lblTab = document.getElementById('lblTabRHForm');
            if (lblTab) lblTab.textContent = 'Cadastrar Funcionário';
        }
    } else {
        tabForm.style.display = 'none';
        tabLista.style.display = 'block';
        btnLista.style.color = 'var(--accent-color)';
        btnLista.style.borderBottom = '3px solid var(--accent-color)';
        btnForm.style.color = 'var(--text-muted)';
        btnForm.style.borderBottom = 'none';
    }
};

function abrirFormularioRH(func = null) {
    if (func) {
        window.switchTabRH('form', true);
        
        funcionarioEditandoId = func.id;
        document.getElementById('tituloFormRH').innerHTML = `<i class="fa-solid fa-user-pen"></i> Editar Funcionário: ${func.nome}`;
        const lblTab = document.getElementById('lblTabRHForm');
        if (lblTab) lblTab.textContent = 'Editar Funcionário';
        
        document.getElementById('rh-id').value = func.id;
        document.getElementById('rh-nome').value = func.nome;
        document.getElementById('rh-nascimento').value = func.nascimento || '';
        document.getElementById('rh-cpf').value = func.cpf || '';
        document.getElementById('rh-rg').value = func.rg || '';
        document.getElementById('rh-contato').value = func.contato || '';
        document.getElementById('rh-funcao').value = func.funcao || '';
        document.getElementById('rh-admissao').value = func.admissao || '';
        
        document.getElementById('rh-salario').value = window.formatCurrencyValue ? window.formatCurrencyValue(func.salario || 0) : `R$ ${(func.salario || 0).toFixed(2)}`;
        document.getElementById('rh-vale').value = window.formatCurrencyValue ? window.formatCurrencyValue(func.vale || 0) : `R$ ${(func.vale || 0).toFixed(2)}`;
        document.getElementById('rh-forma-pagamento').value = func.formaPagamento || 'PIX';
        document.getElementById('rh-dados-bancarios').value = func.dadosBancarios || '';
        document.getElementById('rh-observacao').value = func.observacao || '';
        document.getElementById('rh-valor-he-normal').value = window.formatCurrencyValue ? window.formatCurrencyValue(func.valorHeNormal || 0) : `R$ ${(func.valorHeNormal || 0).toFixed(2)}`;
        document.getElementById('rh-valor-he-especial').value = window.formatCurrencyValue ? window.formatCurrencyValue(func.valorHeEspecial || 0) : `R$ ${(func.valorHeEspecial || 0).toFixed(2)}`;
        document.getElementById('rh-ferias-dias').value = func.feriasDias || 0;
        document.getElementById('rh-ferias-inicio').value = func.feriasInicio || '';
        document.getElementById('rh-ferias-fim').value = func.feriasFim || '';
        anexosAtestadoAtual = normalizarAnexosRH(func, 'atestado');
        anexosCatAtual = normalizarAnexosRH(func, 'cat');
        atualizarNomeAnexoRH('atestado', anexosAtestadoAtual);
        atualizarNomeAnexoRH('cat', anexosCatAtual);
    } else {
        window.switchTabRH('form', false);
        anexosAtestadoAtual = [];
        anexosCatAtual = [];
        atualizarNomeAnexoRH('atestado', anexosAtestadoAtual);
        atualizarNomeAnexoRH('cat', anexosCatAtual);
    }
}

function fecharFormularioRH() {
    window.switchTabRH('lista');
    if (formFuncionario) formFuncionario.reset();
    funcionarioEditandoId = null;
    anexosAtestadoAtual = [];
        anexosCatAtual = [];
        atualizarNomeAnexoRH('atestado', anexosAtestadoAtual);
        atualizarNomeAnexoRH('cat', anexosCatAtual);
}

function normalizarAnexosRH(func, tipo) {
    const lista = tipo === 'cat' ? func.cats : func.atestados;
    const legado = tipo === 'cat' ? func.cat : func.atestado;
    if (Array.isArray(lista)) return lista.filter(a => a?.dados);
    return legado?.dados ? [legado] : [];
}

function atualizarNomeAnexoRH(tipo, anexos) {
    const el = document.getElementById(tipo === 'cat' ? 'rh-cat-nome' : 'rh-atestado-nome');
    if (!el) return;
    const lista = Array.isArray(anexos) ? anexos : [];
    el.textContent = lista.length ? lista.length + ' arquivo(s) selecionado(s)' : 'Nenhum arquivo selecionado';
    el.style.color = lista.length ? 'var(--accent-color)' : 'var(--text-muted)';
}

function lerArquivoRH(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            nome: file.name,
            tipo: file.type || 'application/octet-stream',
            tamanho: file.size,
            dados: reader.result,
            atualizadoEm: new Date().toISOString()
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function configurarAnexosRH() {
    const atestadoInput = document.getElementById('rh-atestado-arquivo');
    const catInput = document.getElementById('rh-cat-arquivo');

    if (atestadoInput) {
        atestadoInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            anexosAtestadoAtual.push(await lerArquivoRH(file));
            atualizarNomeAnexoRH('atestado', anexosAtestadoAtual);
            atestadoInput.value = '';
        });
    }

    if (catInput) {
        catInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            anexosCatAtual.push(await lerArquivoRH(file));
            atualizarNomeAnexoRH('cat', anexosCatAtual);
            catInput.value = '';
        });
    }
}

// Configuração de máscaras nos inputs e eventos
function configurarFormulariosRH() {
    configurarAnexosRH();
    // Máscara de Salário, Vale, valores de horas extras, adicionais e faltas
    ['rh-salario', 'rh-vale', 'rh-valor-he-normal', 'rh-valor-he-especial', 'he-adicional', 'falta-valor'].forEach(id => {
        const el = document.getElementById(id);
        if (el && window.formatCurrencyInput) {
            el.addEventListener('input', window.formatCurrencyInput);
        }
    });

    // Forçar caixa alta no Nome Completo, Função e Dados Bancários
    ['rh-nome', 'rh-funcao', 'rh-dados-bancarios', 'rh-observacao', 'he-observacao'].forEach(id => {
        const el = document.getElementById(id);
        if (el && window.forceUppercaseInput) {
            el.addEventListener('input', window.forceUppercaseInput);
        }
    });

    // Máscara básica para CPF: 000.000.000-00
    const inputCpf = document.getElementById('rh-cpf');
    if (inputCpf) {
        inputCpf.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, "");
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 9) {
                v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
            } else if (v.length > 6) {
                v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
            } else if (v.length > 3) {
                v = v.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
            }
            e.target.value = v;
        });
    }

    // Máscara básica para Telefone: (00) 00000-0000
    const inputContato = document.getElementById('rh-contato');
    if (inputContato) {
        inputContato.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, "");
            if (v.length > 11) v = v.slice(0, 11);
            if (v.length > 10) {
                v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
            } else if (v.length > 6) {
                v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
            } else if (v.length > 2) {
                v = v.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
            }
            e.target.value = v;
        });
    }

    // Evento de submit do formulário de funcionário
    if (formFuncionario) {
        formFuncionario.onsubmit = async (e) => {
            e.preventDefault();
            await salvarFuncionario();
        };
    }

    // Evento no input de data do modal de Horas Extras
    const heDataInput = document.getElementById('he-data');
    if (heDataInput) {
        heDataInput.addEventListener('change', (e) => {
            const dateStr = e.target.value;
            if (!dateStr) return;
            // Detecção automática de Sábado (6) ou Domingo (0)
            const d = new Date(dateStr + 'T12:00:00');
            const dayOfWeek = d.getDay();
            const heTipoDia = document.getElementById('he-tipo-dia');
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                heTipoDia.value = 'ESPECIAL';
            } else {
                heTipoDia.value = 'NORMAL';
            }
        });
    }

    // Form de horas extras submit
    const formHE = document.getElementById('formHE');
    if (formHE) {
        formHE.onsubmit = async (e) => {
            e.preventDefault();
            await adicionarHoraExtra();
        };
    }

    // Form de faltas submit
    const formFalta = document.getElementById('formFalta');
    if (formFalta) {
        formFalta.onsubmit = async (e) => {
            e.preventDefault();
            await adicionarFalta();
        };
    }
}

// CRUD - Carregar Funcionários do Firestore
async function carregarFuncionarios() {
    if (!listaRH) return;
    listaRH.innerHTML = '<tr><td colspan="6" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Buscando quadro de funcionários...</td></tr>';
    
    try {
        const snap = await getDocs(funcionariosCollection);
        funcionariosAtuais = [];
        snap.forEach(docSnap => {
            funcionariosAtuais.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        preencherFiltroMesIndicadoresRH();
        atualizarKPIsRH();
        filtrarFuncionarios();
    } catch (e) {
        console.error("Erro ao carregar funcionários:", e);
        listaRH.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger-color);"><i class="fa-solid fa-circle-exclamation"></i> Falha ao comunicar com Firebase.</td></tr>';
    }
}

function funcionarioEmFerias(funcionario) {
    if (!funcionario?.feriasInicio || !funcionario?.feriasFim) return false;
    const hoje = new Date();
    const inicio = new Date(`${funcionario.feriasInicio}T00:00:00`);
    const fim = new Date(`${funcionario.feriasFim}T23:59:59`);
    return hoje >= inicio && hoje <= fim;
}

function formatarMoedaRH(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcularResumoHorasExtras(func, lista = null) {
    const heList = Array.isArray(lista) ? lista : (func.horasExtras || []);
    const valorHE50 = func.valorHeNormal !== undefined ? (parseFloat(func.valorHeNormal) || 0) : (((func.salario || 0) / 220) * 1.5);
    const valorHE100 = func.valorHeEspecial !== undefined ? (parseFloat(func.valorHeEspecial) || 0) : (((func.salario || 0) / 220) * 2.0);
    return heList.reduce((acc, h) => {
        const horas = parseFloat(h.horas) || 0;
        const tarifa = h.tipo === 'ESPECIAL' ? valorHE100 : valorHE50;
        const adicional = parseFloat(h.adicional) || 0;
        acc.horas += horas;
        acc.valor += (horas * tarifa) + adicional;
        return acc;
    }, { horas: 0, valor: 0 });
}

function obterMesReferenciaHE(lista) {
    const datas = (lista || []).map(h => h.data).filter(Boolean).sort();
    const base = datas[0] ? new Date(datas[0] + 'T12:00:00') : new Date();
    return {
        chave: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`,
        label: base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
    };
}

function renderizarHistoricoHE(func) {
    const tbody = document.getElementById('listaHistoricoHE');
    if (!tbody) return;
    const historico = Array.isArray(func.historicoHorasExtras) ? func.historicoHorasExtras : [];
    if (!historico.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#aaa; padding:10px;">Nenhum fechamento salvo.</td></tr>';
        return;
    }
    tbody.innerHTML = [...historico].sort((a, b) => String(b.mes || '').localeCompare(String(a.mes || ''))).map(fech => `
        <tr>
            <td><strong>${fech.mesLabel || fech.mes || '-'}</strong></td>
            <td>${Number(fech.totalHoras || 0).toLocaleString('pt-BR')}h</td>
            <td style="color:#00ff88; font-weight:800;">${formatarMoedaRH(fech.totalValor || 0)}</td>
            <td>${fech.fechadoEm ? new Date(fech.fechadoEm).toLocaleDateString('pt-BR') : '-'}</td>
            <td style="display:flex; gap:8px; align-items:center;">
                <button onclick="window.editarFechamentoHE('${fech.id}')" class="btn-icon" style="color:var(--accent-color);" title="Editar fechamento"><i class="fa-solid fa-pencil"></i></button>
                <button onclick="window.abrirRelatorioFechamentoHE('${fech.id}')" class="btn-icon" style="color:#22c55e;" title="Visualizar relatorio"><i class="fa-solid fa-file-lines"></i></button>
            </td>
        </tr>
    `).join('');
}

function aplicarVisibilidadeValoresRH() {
    const icon = document.getElementById('iconValoresRH');
    const botao = document.getElementById('btnToggleValoresRH');
    document.querySelectorAll('.rh-kpi-valor, .rh-lista-valor').forEach(el => {
        el.textContent = valoresRHOcultos ? 'R$ ••••••' : (el.dataset.valorReal || 'R$ 0,00');
    });
    if (icon) {
        icon.classList.toggle('fa-eye', !valoresRHOcultos);
        icon.classList.toggle('fa-eye-slash', valoresRHOcultos);
    }
    if (botao) botao.title = valoresRHOcultos ? 'Mostrar valores' : 'Ocultar valores';
}

function obterFechamentoFuncionarioMes(func, mes) {
    const historico = Array.isArray(func.historicoHorasExtras) ? func.historicoHorasExtras : [];
    return historico.find(item => item.mes === mes) || null;
}

function preencherFiltroMesIndicadoresRH() {
    const select = document.getElementById('rhFiltroMesIndicadores');
    if (!select) return;
    const meses = new Map();
    funcionariosAtuais.forEach(func => {
        (func.historicoHorasExtras || []).forEach(fech => {
            if (fech?.mes) meses.set(fech.mes, fech.mesLabel || fech.mes);
        });
    });
    const valorAtual = mesIndicadoresRH;
    select.innerHTML = '<option value="aberto">Mes em aberto</option>' + [...meses.entries()]
        .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
        .map(([mes, label]) => `<option value="${mes}">${label}</option>`)
        .join('');
    select.value = meses.has(valorAtual) || valorAtual === 'aberto' ? valorAtual : 'aberto';
    mesIndicadoresRH = select.value;
}

function atualizarKPIsRH() {
    const totalFuncionarios = funcionariosAtuais.length;
    const totalFerias = funcionariosAtuais.filter(funcionarioEmFerias).length;
    const usandoMesFechado = mesIndicadoresRH !== 'aberto';
    const funcionariosDoPeriodo = usandoMesFechado
        ? funcionariosAtuais.filter(f => obterFechamentoFuncionarioMes(f, mesIndicadoresRH))
        : funcionariosAtuais;
    const totalSalarios = funcionariosDoPeriodo.reduce((acc, f) => acc + Number(f.salario || 0), 0);
    const totalVales = funcionariosDoPeriodo.reduce((acc, f) => acc + Number(f.vale || 0), 0);
    const totalHorasExtras = funcionariosDoPeriodo.reduce((acc, f) => {
        if (!usandoMesFechado) return acc + calcularResumoHorasExtras(f).valor;
        const fechamento = obterFechamentoFuncionarioMes(f, mesIndicadoresRH);
        return acc + Number(fechamento?.totalValor || 0);
    }, 0);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    const setValor = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.dataset.valorReal = formatarMoedaRH(value);
    };

    setText('rhKpiFuncionarios', (usandoMesFechado ? funcionariosDoPeriodo.length : totalFuncionarios).toLocaleString('pt-BR'));
    setText('rhKpiFerias', totalFerias.toLocaleString('pt-BR'));
    setValor('rhKpiSalarios', totalSalarios);
    setValor('rhKpiVales', totalVales);
    setValor('rhKpiHorasExtras', totalHorasExtras);
    aplicarVisibilidadeValoresRH();
}

window.toggleValoresRH = function() {
    valoresRHOcultos = !valoresRHOcultos;
    localStorage.setItem('orquestra_rh_ocultar_valores', String(valoresRHOcultos));
    aplicarVisibilidadeValoresRH();
};

window.alterarMesIndicadoresRH = function(mes) {
    mesIndicadoresRH = mes || 'aberto';
    atualizarKPIsRH();
};

// Renderizar Tabela de Funcionários
function renderizarFuncionarios(lista) {
    if (!listaRH) return;
    if (lista.length === 0) {
        listaRH.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum funcionário encontrado.</td></tr>';
        return;
    }

    listaRH.innerHTML = lista.map(f => {
        const adm = f.admissao ? new Date(f.admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
        const heTotal = f.horasExtras ? f.horasExtras.reduce((acc, h) => acc + (parseFloat(h.horas) || 0), 0) : 0;
        const faltasTotal = f.faltas ? f.faltas.length : 0;
        
        const fSalario = f.salario ? f.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
        const fVale = f.vale ? f.vale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
        
        let feriasInfo = '<span style="color:#aaa;">Sem registro</span>';
        if (f.feriasDias > 0) {
            feriasInfo = `<strong>${f.feriasDias} dias</strong>`;
            if (f.feriasInicio && f.feriasFim) {
                const start = new Date(f.feriasInicio + 'T12:00:00').toLocaleDateString('pt-BR');
                const end = new Date(f.feriasFim + 'T12:00:00').toLocaleDateString('pt-BR');
                feriasInfo += `<br><small style="color:var(--warning);">${start} a ${end}</small>`;
            }
        }

        return `
            <tr>
                <td data-label="Funcionário">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:36px; height:36px; border-radius:50%; background:rgba(0,255,136,0.1); border:1px solid var(--accent-color); display:flex; align-items:center; justify-content:center; color:var(--accent-color); font-weight:bold;">
                            ${(f.nome || 'F').charAt(0)}
                        </div>
                        <div>
                            <strong style="color:white; font-size:0.95rem;">${f.nome}</strong><br>
                            <span style="font-size:0.75rem; color:#aaa;">ID: ${f.id.slice(-6).toUpperCase()}</span>
                        </div>
                    </div>
                </td>
                <td data-label="Função">
                    <strong>${f.funcao || 'NÃO DEFINIDA'}</strong><br>
                    <small style="color:#aaa;">Adm: ${adm}</small>
                </td>
                <td data-label="Contato">
                    <span style="font-size:0.85rem;">${f.contato || '-'}</span><br>
                    <small style="color:#888;">CPF: ${f.cpf || '-'}</small>
                </td>
                <td data-label="Valores">
                    <span class="rh-lista-valor" data-valor-real="${fSalario}" style="color:#00ff88; font-weight:bold;">${valoresRHOcultos ? 'R$ ******' : fSalario}</span><br>
                    <small style="color:#ef4444;">Vale: <span class="rh-lista-valor" data-valor-real="${fVale}">${valoresRHOcultos ? 'R$ ******' : fVale}</span></small>
                </td>
                <td data-label="Férias">${feriasInfo}</td>
                <td data-label="Ações">
                    <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                        <button onclick="window.abrirModalHolerite('${f.id}')" class="btn-icon" style="color:#0ea5e9; font-size:1.1rem; padding: 4px;" title="Ver Holerite / Ficha">
                            <i class="fa-solid fa-file-invoice-dollar"></i>
                        </button>
                        <button onclick="window.abrirModalHE('${f.id}')" class="btn-icon" style="color:#e67e22; font-size:1.1rem; padding: 4px;" title="Horas Extras (${heTotal}h)">
                            <i class="fa-solid fa-clock"></i> <span style="font-size: 0.8rem; font-weight:bold;">${heTotal}h</span>
                        </button>
                        <button onclick="window.abrirModalFaltas('${f.id}')" class="btn-icon" style="color:#f43f5e; font-size:1.1rem; padding: 4px;" title="Controle de Faltas (${faltasTotal})">
                            <i class="fa-solid fa-user-slash"></i> <span style="font-size: 0.8rem; font-weight:bold;">${faltasTotal}</span>
                        </button>
                        <button onclick="window.iniciarEditarRH('${f.id}')" class="btn-icon" style="color:var(--accent); font-size:1.1rem; padding: 4px;" title="Editar Funcionário">
                            <i class="fa-solid fa-user-pen"></i>
                        </button>
                        <button onclick="window.iniciarExcluirRH('${f.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1.1rem; padding: 4px;" title="Excluir Registro">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtrar funcionários em tempo real
window.abrirAnexoRH = function(id, tipo) {
    const f = funcionariosAtuais.find(x => x.id === id);
    const anexos = normalizarAnexosRH(f || {}, tipo);
    let anexo = anexos[0];
    if (anexos.length > 1) {
        const lista = anexos.map((item, index) => (index + 1) + ' - ' + (item.nome || 'Arquivo sem nome')).join('\n');
        const escolha = parseInt(prompt('Escolha o arquivo para abrir:\n\n' + lista), 10);
        if (!escolha || !anexos[escolha - 1]) return;
        anexo = anexos[escolha - 1];
    }
    if (!anexo?.dados) {
        alert(tipo === 'cat' ? 'Nenhuma CAT cadastrada para este funcionario.' : 'Nenhum atestado cadastrado para este funcionario.');
        return;
    }

    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para visualizar o anexo.');
        return;
    }
    win.document.write('<title>' + (anexo.nome || 'Anexo RH') + '</title><iframe src="' + anexo.dados + '" style="width:100%; height:100vh; border:0;"></iframe>');
    win.document.close();
};

function filtrarFuncionarios() {
    const inputBusca = document.getElementById('buscaFuncionario');
    const queryStr = (inputBusca?.value || '').toLowerCase().trim();
    const ordem = document.getElementById('ordenarFuncionarios')?.value || 'nome';
    const filtrados = funcionariosAtuais.filter(f => 
        (f.nome || '').toLowerCase().includes(queryStr) || 
        (f.funcao || '').toLowerCase().includes(queryStr)
    ).sort((a, b) => {
        if (ordem === 'data-desc') return new Date(b.criadoEm || b.admissao || 0) - new Date(a.criadoEm || a.admissao || 0);
        if (ordem === 'data-asc') return new Date(a.criadoEm || a.admissao || 0) - new Date(b.criadoEm || b.admissao || 0);
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });
    renderizarFuncionarios(filtrados);
}
window.filtrarFuncionarios = filtrarFuncionarios;

// CRUD - Salvar ou Atualizar Funcionário
async function salvarFuncionario() {
    const id = document.getElementById('rh-id').value;
    const nome = document.getElementById('rh-nome').value.toUpperCase().trim();
    const nascimento = document.getElementById('rh-nascimento').value;
    const cpf = document.getElementById('rh-cpf').value;
    const rg = document.getElementById('rh-rg').value.trim();
    const contato = document.getElementById('rh-contato').value;
    const funcao = document.getElementById('rh-funcao').value;
    const admissao = document.getElementById('rh-admissao').value;
    
    const salario = window.parseCurrencyValue ? window.parseCurrencyValue(document.getElementById('rh-salario').value) : parseFloat(document.getElementById('rh-salario').value.replace(/\D/g, "")) / 100;
    const vale = window.parseCurrencyValue ? window.parseCurrencyValue(document.getElementById('rh-vale').value) : parseFloat(document.getElementById('rh-vale').value.replace(/\D/g, "")) / 100;
    const valorHeNormal = window.parseCurrencyValue ? window.parseCurrencyValue(document.getElementById('rh-valor-he-normal').value) : parseFloat(document.getElementById('rh-valor-he-normal').value.replace(/\D/g, "")) / 100;
    const valorHeEspecial = window.parseCurrencyValue ? window.parseCurrencyValue(document.getElementById('rh-valor-he-especial').value) : parseFloat(document.getElementById('rh-valor-he-especial').value.replace(/\D/g, "")) / 100;
    
    const formaPagamento = document.getElementById('rh-forma-pagamento').value;
    const dadosBancarios = document.getElementById('rh-dados-bancarios').value.toUpperCase().trim();
    const observacao = document.getElementById('rh-observacao')?.value.toUpperCase().trim() || '';
    const feriasDias = parseInt(document.getElementById('rh-ferias-dias').value) || 0;
    const feriasInicio = document.getElementById('rh-ferias-inicio').value;
    const feriasFim = document.getElementById('rh-ferias-fim').value;

    if (!nome || !cpf || !contato || !funcao || !admissao || !salario || isNaN(valorHeNormal) || isNaN(valorHeEspecial)) {
        alert("Preencha todos os campos obrigatórios (*).");
        return;
    }

    const btnSalvar = document.getElementById('btnSalvarRH');
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
    }

    try {
        const dados = {
            nome, nascimento, cpf, rg, contato, funcao, admissao,
            salario: parseFloat(salario) || 0,
            vale: parseFloat(vale) || 0,
            valorHeNormal: parseFloat(valorHeNormal) || 0,
            valorHeEspecial: parseFloat(valorHeEspecial) || 0,
            formaPagamento, dadosBancarios, observacao, feriasDias, feriasInicio, feriasFim,
            atestados: anexosAtestadoAtual,
            cats: anexosCatAtual,
            atestado: anexosAtestadoAtual[0] || null,
            cat: anexosCatAtual[0] || null,
            atualizadoEm: new Date().toISOString()
        };

        if (id) {
            // Edição
            await window.FS.updateDoc('funcionarios', id, dados);
            alert("Funcionário atualizado com sucesso!");
        } else {
            // Criação
            dados.criadoEm = new Date().toISOString();
            dados.horasExtras = []; // Array vazio de horas extras
            await window.FS.addDoc('funcionarios', dados);
            alert("Funcionário cadastrado com sucesso!");
        }

        fecharFormularioRH();
        await carregarFuncionarios();
    } catch (e) {
        console.error("Erro ao salvar funcionário:", e);
        alert("Erro ao salvar. Verifique o console.");
    } finally {
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> SALVAR FUNCIONÁRIO';
        }
    }
}

// Iniciar edição
window.iniciarEditarRH = (id) => {
    const f = funcionariosAtuais.find(x => x.id === id);
    if (f) {
        abrirFormularioRH(f);
    }
};

// Iniciar exclusão definitiva com confirmação
window.iniciarExcluirRH = async (id) => {
    const f = funcionariosAtuais.find(x => x.id === id);
    if (!f) return;

    if (await window.confirmarExclusaoComSenha(`OPERACAO CRITICA!\nDeseja realmente EXCLUIR permanentemente o funcionario "${f.nome}"?\nTodos os historicos de ferias e horas extras deste funcionario serao apagados para sempre.`)) {
        try {
            const docRef = doc(db, 'funcionarios', id);
            await deleteDoc(docRef);
            alert("Registro excluído permanentemente!");
            await carregarFuncionarios();
        } catch (e) {
            console.error("Erro ao deletar funcionário:", e);
            alert("Erro ao deletar registro.");
        }
    }
};


// --- MÓDULO HORAS EXTRAS (HE) ---

window.abrirModalHE = (id) => {
    const f = funcionariosAtuais.find(x => x.id === id);
    if (!f) return;

    document.getElementById('he-funcionario-id').value = f.id;
    document.getElementById('he-funcionario-nome').textContent = f.nome;
    
    // Resetar campos form HE
    const dataInput = document.getElementById('he-data');
    if (dataInput) {
        // Pré-preencher data de hoje
        const hoje = new Date().toISOString().split('T')[0];
        dataInput.value = hoje;
        const d = new Date(hoje + 'T12:00:00');
        const dayOfWeek = d.getDay();
        document.getElementById('he-tipo-dia').value = (dayOfWeek === 0 || dayOfWeek === 6) ? 'ESPECIAL' : 'NORMAL';
    }
    document.getElementById('he-horas').value = '';
    document.getElementById('he-adicional').value = '';
    document.getElementById('he-observacao').value = '';
    horaExtraEditandoId = null;
    atualizarBotaoHoraExtra();
    const presetDropdown = document.getElementById('he-preset');
    if (presetDropdown) presetDropdown.value = 'NENHUM';

    renderizarTabelaHE(f);
    renderizarHistoricoHE(f);

    const modal = document.getElementById('modalHorasExtras');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalHE = () => {
    horaExtraEditandoId = null;
    atualizarBotaoHoraExtra();
    const modal = document.getElementById('modalHorasExtras');
    if (modal) modal.style.display = 'none';
};

function renderizarTabelaHE(func) {
    const tbody = document.getElementById('listaHE');
    const totalSoma = document.getElementById('he-total-soma');
    const totalValor = document.getElementById('he-total-valor');
    if (!tbody) return;

    const heList = func.horasExtras || [];
    
    // Tarifas acordadas ou fallbacks
    const valorHE50 = func.valorHeNormal !== undefined ? (parseFloat(func.valorHeNormal) || 0) : (((func.salario || 0) / 220) * 1.5);
    const valorHE100 = func.valorHeEspecial !== undefined ? (parseFloat(func.valorHeEspecial) || 0) : (((func.salario || 0) / 220) * 2.0);

    if (heList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#aaa; padding:15px;">Nenhum registro lançado.</td></tr>';
        if (totalSoma) totalSoma.textContent = '0h';
        if (totalValor) totalValor.textContent = 'R$ 0,00';
        return;
    }

    // Ordenar por data decrescente
    heList.sort((a,b) => new Date(b.data) - new Date(a.data));

    let somaHoras = 0;
    let somaValores = 0;

    tbody.innerHTML = heList.map(h => {
        const diaFormatado = new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
        const badgeCor = h.tipo === 'ESPECIAL' ? 'rgba(239, 68, 68, 0.15); border:1px solid #ef4444; color:#ff7b72;' : 'rgba(0,255,136,0.05); border:1px solid #00ff88; color:#00ff88;';
        const labelTipo = h.tipo === 'ESPECIAL' ? '100% Extra 🟥' : '50% Extra';
        
        const tarifa = h.tipo === 'ESPECIAL' ? valorHE100 : valorHE50;
        const adicional = parseFloat(h.adicional) || 0;
        const valorCalculado = ((parseFloat(h.horas) || 0) * tarifa) + adicional;

        somaHoras += parseFloat(h.horas) || 0;
        somaValores += valorCalculado;

        let adicionalTexto = '-';
        if (adicional > 0) {
            adicionalTexto = `<span style="color:#00ff88; font-weight:bold;">+ R$ ${adicional.toFixed(2)}</span>`;
        } else if (adicional < 0) {
            adicionalTexto = `<span style="color:#ef4444; font-weight:bold;">- R$ ${Math.abs(adicional).toFixed(2)}</span>`;
        }

        return `
            <tr>
                <td><strong>${diaFormatado.toUpperCase()}</strong></td>
                <td><span style="font-size:1.05rem; font-weight:bold; color:white;">${h.horas}h</span></td>
                <td>
                    <span style="padding:4px 8px; border-radius:12px; font-size:0.75rem; display:inline-block; font-weight:bold; ${badgeCor}">
                        ${labelTipo}
                    </span>
                </td>
                <td>${adicionalTexto}</td>
                <td><span style="font-size:0.8rem; color:#eee;">${h.observacao || '-'}</span></td>
                <td>
                    <strong style="color:#00ff88; font-size:0.95rem;">${valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><br>
                    <small style="color:#aaa;">(Tarifa: ${tarifa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h)</small>
                </td>
                <td style="display:flex; gap:8px; align-items:center;">
                    <button onclick="window.editarHoraExtra('${h.id}')" class="btn-icon" style="color:var(--accent-color);" title="Editar Lancamento">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button onclick="window.removerHoraExtra('${h.id}')" class="btn-icon" style="color:var(--danger-color);" title="Excluir Lancamento">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (totalSoma) totalSoma.textContent = `${somaHoras}h`;
    if (totalValor) totalValor.textContent = somaValores.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function atualizarBotaoHoraExtra() {
    const btn = document.getElementById('btnSalvarHE');
    if (!btn) return;
    btn.innerHTML = horaExtraEditandoId
        ? '<i class="fa-solid fa-floppy-disk"></i> ATUALIZAR REGISTRO'
        : '<i class="fa-solid fa-plus"></i> ADICIONAR REGISTRO DIARIO';
}

window.editarHoraExtra = function(idHE) {
    const idFunc = document.getElementById('he-funcionario-id').value;
    const f = funcionariosAtuais.find(x => x.id === idFunc);
    const h = f?.horasExtras?.find(item => item.id === idHE);
    if (!h) return;

    horaExtraEditandoId = idHE;
    document.getElementById('he-data').value = h.data || '';
    document.getElementById('he-horas').value = h.horas || '';
    document.getElementById('he-tipo-dia').value = h.tipo || 'NORMAL';
    document.getElementById('he-adicional').value = h.adicional ? window.formatCurrencyValue(h.adicional) : '';
    document.getElementById('he-observacao').value = h.observacao || '';
    const presetDropdown = document.getElementById('he-preset');
    if (presetDropdown) presetDropdown.value = 'NENHUM';
    atualizarBotaoHoraExtra();
    document.getElementById('he-horas')?.focus();
};

async function adicionarHoraExtra() {
    const idFunc = document.getElementById('he-funcionario-id').value;
    const data = document.getElementById('he-data').value;
    const horas = parseFloat(document.getElementById('he-horas').value) || 0;
    const tipo = document.getElementById('he-tipo-dia').value;

    // Campos Adicionais
    const adicionalRaw = document.getElementById('he-adicional').value || '0';
    let adicional = window.parseCurrencyValue ? window.parseCurrencyValue(adicionalRaw) : parseFloat(adicionalRaw.replace(/\D/g, "")) / 100;
    if (adicionalRaw.trim().startsWith('-')) {
        adicional = -Math.abs(adicional);
    }
    const observacao = document.getElementById('he-observacao').value.toUpperCase().trim();

    if (!idFunc || !data) {
        alert("Preencha ao menos a data da folha.");
        return;
    }

    const f = funcionariosAtuais.find(x => x.id === idFunc);
    if (!f) return;

    if (!f.horasExtras) f.horasExtras = [];

    const novoLote = {
        id: horaExtraEditandoId || Date.now().toString(),
        data,
        horas: parseFloat(horas) || 0,
        tipo,
        adicional: parseFloat(adicional) || 0,
        observacao
    };

    if (horaExtraEditandoId) {
        f.horasExtras = f.horasExtras.map(h => h.id === horaExtraEditandoId ? novoLote : h);
    } else {
        f.horasExtras.push(novoLote);
    }

    try {
        await window.FS.updateDoc('funcionarios', idFunc, { horasExtras: f.horasExtras });
        
        // Atualizar lista em memória local e UI
        renderizarTabelaHE(f);
        renderizarHistoricoHE(f);
        document.getElementById('he-horas').value = '';
        document.getElementById('he-adicional').value = '';
        document.getElementById('he-observacao').value = '';
        horaExtraEditandoId = null;
        atualizarBotaoHoraExtra();
        const presetDropdown = document.getElementById('he-preset');
        if (presetDropdown) presetDropdown.value = 'NENHUM';
        document.getElementById('he-horas').focus();
        
        // Atualizar tabela principal de funcionários
        filtrarFuncionarios();
    } catch (e) {
        console.error("Erro ao registrar horas extras no Firebase:", e);
        alert("Erro ao salvar lançamento no banco de dados.");
    }
}

window.removerHoraExtra = async (idHE) => {
    const idFunc = document.getElementById('he-funcionario-id').value;
    const f = funcionariosAtuais.find(x => x.id === idFunc);
    if (!f || !f.horasExtras) return;

    if (await window.confirmarExclusaoComSenha("Deseja realmente excluir este lancamento?")) {
        f.horasExtras = f.horasExtras.filter(h => h.id !== idHE);
        try {
            await window.FS.updateDoc('funcionarios', idFunc, { horasExtras: f.horasExtras });
            renderizarTabelaHE(f);
            renderizarHistoricoHE(f);
            
            // Atualizar tabela principal de funcionários
            filtrarFuncionarios();
        } catch (e) {
            console.error("Erro ao remover hora extra:", e);
            alert("Erro ao remover lançamento.");
        }
    }
};

window.salvarFechamentoMensalHE = async function() {
    const idFunc = document.getElementById('he-funcionario-id').value;
    const f = funcionariosAtuais.find(x => x.id === idFunc);
    if (!f) return;
    const lista = Array.isArray(f.horasExtras) ? f.horasExtras : [];
    if (!lista.length) {
        alert('Nao ha lancamentos de horas extras para fechar.');
        return;
    }
    const ref = obterMesReferenciaHE(lista);
    if (!confirm('Salvar fechamento de ' + ref.label + ' e zerar os lancamentos atuais?')) return;
    const resumo = calcularResumoHorasExtras(f, lista);
    const historico = Array.isArray(f.historicoHorasExtras) ? f.historicoHorasExtras : [];
    const fechamento = {
        id: Date.now().toString(),
        mes: ref.chave,
        mesLabel: ref.label,
        lancamentos: JSON.parse(JSON.stringify(lista)),
        totalHoras: resumo.horas,
        totalValor: resumo.valor,
        fechadoEm: new Date().toISOString()
    };
    f.historicoHorasExtras = historico.concat(fechamento);
    f.horasExtras = [];
    await window.FS.updateDoc('funcionarios', idFunc, { horasExtras: [], historicoHorasExtras: f.historicoHorasExtras });
    renderizarTabelaHE(f);
    renderizarHistoricoHE(f);
    filtrarFuncionarios();
    alert('Fechamento mensal salvo com sucesso.');
};

window.editarFechamentoHE = async function(idFechamento) {
    const idFunc = document.getElementById('he-funcionario-id').value;
    const f = funcionariosAtuais.find(x => x.id === idFunc);
    if (!f) return;
    const historico = Array.isArray(f.historicoHorasExtras) ? f.historicoHorasExtras : [];
    const fechamento = historico.find(item => item.id === idFechamento);
    if (!fechamento) return;
    if ((f.horasExtras || []).length && !confirm('Existem lancamentos atuais. Ao editar este fechamento, eles serao substituidos. Continuar?')) return;
    f.horasExtras = JSON.parse(JSON.stringify(fechamento.lancamentos || []));
    f.historicoHorasExtras = historico.filter(item => item.id !== idFechamento);
    await window.FS.updateDoc('funcionarios', idFunc, { horasExtras: f.horasExtras, historicoHorasExtras: f.historicoHorasExtras });
    renderizarTabelaHE(f);
    renderizarHistoricoHE(f);
    filtrarFuncionarios();
};

window.abrirRelatorioFechamentoHE = function(idFechamento) {
    const idFunc = document.getElementById('he-funcionario-id').value;
    const f = funcionariosAtuais.find(x => x.id === idFunc);
    const fechamento = f?.historicoHorasExtras?.find(item => item.id === idFechamento);
    if (!f || !fechamento) return;
    gerarRelatorioHEHtml({ ...f, horasExtras: fechamento.lancamentos || [] }, fechamento.mesLabel);
    const modal = document.getElementById('modalRelatorioHE');
    if (modal) modal.style.display = 'flex';
};


// --- MÓDULO DE FALTAS ---

window.abrirModalFaltas = (id) => {
    const f = funcionariosAtuais.find(x => x.id === id);
    if (!f) return;
    
    document.getElementById('falta-funcionario-id').value = f.id;
    document.getElementById('falta-funcionario-nome').textContent = f.nome;
    document.getElementById('falta-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('falta-valor').value = '';

    renderizarTabelaFaltas(f);
    
    const modal = document.getElementById('modalFaltas');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalFaltas = () => {
    const modal = document.getElementById('modalFaltas');
    if (modal) modal.style.display = 'none';
};

function renderizarTabelaFaltas(func) {
    const tbody = document.getElementById('listaFaltas');
    const totalQtd = document.getElementById('falta-total-qtd');
    const totalDesconto = document.getElementById('falta-total-valor');
    if (!tbody) return;

    const faltas = func.faltas || [];
    if (faltas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#aaa; padding:15px;">Nenhuma falta registrada.</td></tr>';
        if (totalQtd) totalQtd.textContent = '0';
        if (totalDesconto) totalDesconto.textContent = 'R$ 0,00';
        return;
    }

    // Ordenar por data decrescente
    faltas.sort((a,b) => new Date(b.data) - new Date(a.data));

    let somaValores = 0;

    tbody.innerHTML = faltas.map(f => {
        const dataFormatada = new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const valor = parseFloat(f.valor) || 0;
        somaValores += valor;

        return `
            <tr>
                <td><strong>${dataFormatada}</strong></td>
                <td><strong style="color:#f43f5e; font-size:0.95rem;">${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></td>
                <td>
                    <button onclick="window.removerFalta('${f.id}')" class="btn-icon" style="color:var(--danger-color);" title="Excluir Falta">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (totalQtd) totalQtd.textContent = faltas.length;
    if (totalDesconto) totalDesconto.textContent = somaValores.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function adicionarFalta() {
    const idFunc = document.getElementById('falta-funcionario-id').value;
    const data = document.getElementById('falta-data').value;
    const valorRaw = document.getElementById('falta-valor').value || '';
    const valor = valorRaw.trim() !== '' ? (window.parseCurrencyValue ? window.parseCurrencyValue(valorRaw) : parseFloat(valorRaw.replace(/\D/g, "")) / 100) : 0;

    if (!idFunc || !data) {
        alert("Preencha a data da falta.");
        return;
    }

    const f = funcionariosAtuais.find(x => x.id === idFunc);
    if (!f) return;

    if (!f.faltas) f.faltas = [];

    const novaFalta = {
        id: Date.now().toString(),
        data,
        valor: parseFloat(valor) || 0
    };

    f.faltas.push(novaFalta);

    try {
        await window.FS.updateDoc('funcionarios', idFunc, { faltas: f.faltas });
        
        // Atualizar UI
        renderizarTabelaFaltas(f);
        document.getElementById('falta-valor').value = '';
        
        // Atualizar tabela principal de funcionários
        filtrarFuncionarios();
    } catch (e) {
        console.error("Erro ao registrar falta no Firebase:", e);
        alert("Erro ao salvar falta no banco de dados.");
    }
}

window.removerFalta = async (idFalta) => {
    const idFunc = document.getElementById('falta-funcionario-id').value;
    const f = funcionariosAtuais.find(x => x.id === idFunc);
    if (!f || !f.faltas) return;

    if (await window.confirmarExclusaoComSenha("Deseja realmente excluir esta falta?")) {
        f.faltas = f.faltas.filter(x => x.id !== idFalta);
        try {
            await window.FS.updateDoc('funcionarios', idFunc, { faltas: f.faltas });
            renderizarTabelaFaltas(f);
            
            // Atualizar tabela principal de funcionários
            filtrarFuncionarios();
        } catch (e) {
            console.error("Erro ao remover falta:", e);
            alert("Erro ao remover falta.");
        }
    }
};


// --- MÓDULO RECIBO / HOLERITE ---

window.abrirModalHolerite = (id) => {
    const f = funcionariosAtuais.find(x => x.id === id);
    if (!f) return;

    const historico = Array.isArray(f.historicoHorasExtras) ? f.historicoHorasExtras : [];
    const opcoes = [];
    if ((f.horasExtras || []).length) opcoes.push({ tipo: 'aberto', label: 'MES EM ABERTO', lancamentos: f.horasExtras });
    historico
        .slice()
        .sort((a, b) => String(b.mes || '').localeCompare(String(a.mes || '')))
        .forEach(fechamento => opcoes.push({
            tipo: 'fechado',
            label: fechamento.mesLabel || fechamento.mes || 'FECHAMENTO',
            lancamentos: fechamento.lancamentos || []
        }));

    if (opcoes.length > 1) {
        const lista = opcoes.map((op, index) => `${index + 1} - ${op.label}`).join('\n');
        const escolha = parseInt(prompt(`Escolha o mes do holerite/ficha:\n\n${lista}`), 10);
        if (!escolha || !opcoes[escolha - 1]) return;
        gerarHoleriteHtml(f, opcoes[escolha - 1].lancamentos, opcoes[escolha - 1].label);
    } else if (opcoes.length === 1) {
        gerarHoleriteHtml(f, opcoes[0].lancamentos, opcoes[0].label);
    } else {
        gerarHoleriteHtml(f, [], 'SEM LANCAMENTOS');
    }

    const modal = document.getElementById('modalHolerite');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalHolerite = () => {
    const modal = document.getElementById('modalHolerite');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('printing-holerite');
};

window.abrirRelatorioMensalHE = () => {
    const idFunc = document.getElementById('he-funcionario-id').value;
    const f = funcionariosAtuais.find(x => x.id === idFunc);
    if (!f) return;

    gerarRelatorioHEHtml(f);

    const modal = document.getElementById('modalRelatorioHE');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalRelatorioHE = () => {
    const modal = document.getElementById('modalRelatorioHE');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('printing-relatorio');
};

// Listeners de impressão para garantir ocultação perfeita de todo o resto
window.addEventListener('beforeprint', () => {
    const modalH = document.getElementById('modalHolerite');
    const modalR = document.getElementById('modalRelatorioHE');
    if (modalH && modalH.style.display === 'flex') {
        document.body.classList.add('printing-holerite');
    }
    if (modalR && modalR.style.display === 'flex') {
        document.body.classList.add('printing-relatorio');
    }
});

window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-holerite');
    document.body.classList.remove('printing-relatorio');
});

function gerarHoleriteHtml(f, listaHorasExtras = null, mesReferenciaManual = null) {
    const container = document.getElementById('conteudoHolerite');
    if (!container) return;

    const salarioBase = f.salario || 0;
    const vale = f.vale || 0;
    const heList = Array.isArray(listaHorasExtras) ? listaHorasExtras : (f.horasExtras || []);
    const faltasCount = f.faltas ? f.faltas.length : 0;

    // Calcular dias trabalhados reais pelos lançamentos
    const datasNormais = new Set(heList.filter(h => h.tipo === 'NORMAL').map(h => h.data));
    const totalDiasNormais = datasNormais.size;

    const datasEspeciais = new Set(heList.filter(h => h.tipo === 'ESPECIAL').map(h => h.data));
    const totalDiasEspeciais = datasEspeciais.size;

    // Tarifas acordadas do cadastro ou fallbacks dinâmicos caso vazio
    const valorHE50 = f.valorHeNormal !== undefined ? (parseFloat(f.valorHeNormal) || 0) : ((salarioBase / 220) * 1.5);
    const valorHE100 = f.valorHeEspecial !== undefined ? (parseFloat(f.valorHeEspecial) || 0) : ((salarioBase / 220) * 2.0);

    let horas50 = 0;
    let horas100 = 0;
    let ganhoAdicionais = 0;
    let descontosAdicionais = 0;

    heList.forEach(h => {
        if (h.tipo === 'ESPECIAL') {
            horas100 += parseFloat(h.horas) || 0;
        } else {
            horas50 += parseFloat(h.horas) || 0;
        }
        
        const adicional = parseFloat(h.adicional) || 0;
        if (adicional > 0) {
            ganhoAdicionais += adicional;
        } else if (adicional < 0) {
            descontosAdicionais += Math.abs(adicional);
        }
    });

    const ganhoHE50 = horas50 * valorHE50;
    const ganhoHE100 = horas100 * valorHE100;
    
    // Cálculo do total de vencimentos (PROVENTOS) excluindo o salário base!
    const totalVencimentos = ganhoHE50 + ganhoHE100 + ganhoAdicionais;
    
    // Cálculo do total de descontos (DESCONTOS) incluindo o vale e descontos diários
    const totalDescontos = vale + descontosAdicionais;
    const valorLiquido = totalVencimentos - totalDescontos;
    const totalHorasExtras = horas50 + horas100;
    const atestadosCount = normalizarAnexosRH(f, 'atestado').length;
    const catsCount = normalizarAnexosRH(f, 'cat').length;
    const faltasValor = (f.faltas || []).reduce((acc, falta) => acc + (parseFloat(falta.valor) || 0), 0);
    const dadosPagamento = (f.dadosBancarios || 'Nao informado').toUpperCase();

    const emitente = window.dadosSerrariaEmitente || {
        nome: "COMERCIO DE MADEIRAS VANMART LTDA",
        nomeFantasia: "SERRARIA VANMARTE",
        cnpj: "44.215.194/0001-18",
        ie: "ISENTO",
        contato: "15 996297072",
        email: "escritoriovanmarte@hotmail.com",
        cep: "18430-000",
        logradouro: "ESTRADA DO TAQUARI",
        numero: "267",
        cidade: "Ribeirão Branco / SP"
    };

    const dataAdmissao = f.admissao ? new Date(f.admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    
    // Mes de referencia atual
    const opcoesMes = { month: 'long', year: 'numeric' };
    const mesReferencia = mesReferenciaManual || new Date().toLocaleDateString('pt-BR', opcoesMes).toUpperCase();

    container.innerHTML = `
        <div style="border: 2px solid black; padding: 15px; color: black; background: white;">
            <!-- Linha Dupla de Topo -->
            <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: bold; letter-spacing: 1px;">EXTRATO E RECIBO DE HORAS EXTRAS / ADICIONAIS</h2>
                <small>${emitente.nomeFantasia.toUpperCase()} | Suporte: Orquestra.cs - sistema industrial personalizado</small>
            </div>

            <!-- Dados da Empresa e Período -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; border-bottom: 1px solid black; padding-bottom: 8px; margin-bottom: 8px; gap: 10px;">
                <div>
                    <strong>EMPRESA:</strong> ${emitente.nome.toUpperCase()}<br>
                    <strong>CNPJ:</strong> ${emitente.cnpj}<br>
                    <strong>ENDEREÇO:</strong> ${emitente.logradouro.toUpperCase()}, ${emitente.numero} - ${emitente.cidade.toUpperCase()}
                </div>
                <div style="text-align: right;">
                    <strong>REFERÊNCIA MÊS:</strong><br>
                    <span style="font-size: 1.1rem; font-weight: bold; color: black;">${mesReferencia}</span>
                </div>
            </div>

            <!-- Dados do Funcionário -->
            <div style="display: grid; grid-template-columns: 1fr 2fr; border-bottom: 1px solid black; padding-bottom: 8px; margin-bottom: 8px; gap: 10px;">
                <div>
                    <strong>CÓDIGO:</strong> ${f.id.slice(-6).toUpperCase()}<br>
                    <strong>ADMISSÃO:</strong> ${dataAdmissao}
                </div>
                <div>
                    <strong>NOME:</strong> ${f.nome}<br>
                    <strong>CARGO:</strong> ${f.funcao || 'OPERÁRIO'}
                </div>
            </div>

            <!-- Resumo do Período (Dias e Faltas) -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); border: 2px solid black; padding: 10px; margin-bottom: 15px; font-size: 0.85rem; text-align: center; gap: 5px; background: #fafafa;">
                <div>
                    <strong>DIAS NORMAIS TRABALHADOS</strong><br>
                    <span style="font-size: 1.25rem; font-weight: 900; color: black;">${totalDiasNormais} dias</span>
                </div>
                <div>
                    <strong>SÁB/DOM/FER TRABALHADOS</strong><br>
                    <span style="font-size: 1.25rem; font-weight: 900; color: black;">${totalDiasEspeciais} dias</span>
                </div>
                <div style="border-left: 1px dashed black;">
                    <strong style="color: #e11d48;">FALTAS NO MÊS</strong><br>
                    <span style="font-size: 1.25rem; font-weight: 900; color: #e11d48;">${faltasCount} faltas</span>
                </div>
            </div>

            <!-- Cabeçalho da Tabela de Proventos/Descontos -->
            <div style="font-family: monospace; font-size: 0.92rem;">
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; font-weight: bold; border-bottom: 2px solid black; padding-bottom: 6px; margin-bottom: 8px; font-size: 0.98rem; color: black;">
                    <div>DESCRIÇÃO</div>
                    <div style="text-align: center;">REF.</div>
                    <div style="text-align: right;">PROVENTOS</div>
                    <div style="text-align: right;">DESCONTOS</div>
                </div>

                <!-- Horas Extras 50% -->
                ${horas50 > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 6px; font-size: 0.95rem; font-weight: bold; color: black;">
                    <div>150 HORAS EXTRAS 50% (NORMAL)</div>
                    <div style="text-align: center;">${horas50}h</div>
                    <div style="text-align: right;">R$ ${ganhoHE50.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div style="text-align: right;">-</div>
                </div>
                ` : ''}

                <!-- Horas Extras 100% -->
                ${horas100 > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 6px; font-size: 0.95rem; font-weight: bold; color: black;">
                    <div>151 HORAS EXTRAS 100% (DOM/SÁB/FER)</div>
                    <div style="text-align: center;">${horas100}h</div>
                    <div style="text-align: right;">R$ ${ganhoHE100.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div style="text-align: right;">-</div>
                </div>
                ` : ''}

                <!-- Adicionais Diários / Prêmios -->
                ${ganhoAdicionais > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 6px; font-size: 0.95rem; font-weight: bold; color: black;">
                    <div>300 VALORES ADICIONAIS / PRÊMIOS DIÁRIOS</div>
                    <div style="text-align: center;">-</div>
                    <div style="text-align: right;">R$ ${ganhoAdicionais.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div style="text-align: right;">-</div>
                </div>
                ` : ''}

                <!-- Vale Mensal / Adiantamento -->
                ${vale > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 6px; font-size: 0.95rem; font-weight: bold; color: black;">
                    <div>901 VALE DE ADIANTAMENTO MENSAL</div>
                    <div style="text-align: center;">-</div>
                    <div style="text-align: right;">-</div>
                    <div style="text-align: right; color: #b91c1c;">R$ ${vale.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                ` : ''}

                <!-- Descontos Diários Adicionais -->
                ${descontosAdicionais > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 6px; font-size: 0.95rem; font-weight: bold; color: black;">
                    <div>905 DESCONTOS DIÁRIOS ADICIONAIS</div>
                    <div style="text-align: center;">-</div>
                    <div style="text-align: right;">-</div>
                    <div style="text-align: right; color: #b91c1c;">R$ ${descontosAdicionais.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                ` : ''}
            </div>

            <!-- Total de Horas Extras (Apenas Vencimentos/Ganhos) -->
            <div style="border: 2.5px solid black; padding: 12px; margin-top: 20px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #eee;">
                <span style="font-weight: 900; font-size: 1.05rem; color: black; text-transform: uppercase;">TOTAL HORAS EXTRAS A PAGAR:</span>
                <span style="font-weight: 900; font-size: 1.55rem; color: black;">R$ ${totalVencimentos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>

            ${vale > 0 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 1.05rem; padding: 10px 12px; background: #fff; border: 1.5px solid #000; font-weight: bold; color: black;">
                <span style="text-transform: uppercase;">VALE ADIANTAMENTO JÁ ENTREGUE:</span>
                <span style="color: #b91c1c;">R$ ${vale.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            ` : ''}

            <!-- Informações Bancárias / Chave Pix -->
            <div style="margin-top: 15px; border-top: 1px dashed black; padding-top: 8px; font-size: 0.9rem; color: black;">
                <strong>FORMA DE PAGAMENTO:</strong> ${f.formaPagamento || 'PIX'}<br>
                <strong>DADOS PARA DEPÓSITO:</strong> ${f.dadosBancarios || 'Chave cadastrada no perfil'}
            </div>

            <!-- Declaração de Recebimento e Assinatura -->
            <div style="margin-top: 40px; border-top: 1px solid black; padding-top: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px; align-items: flex-end;">
                    <div style="border-top: 1px solid black; text-align: center; padding-top: 5px; font-size: 0.85rem; font-weight: bold; color: black;">
                        Data: ____/____/_______
                    </div>
                    <div style="border-top: 1px solid black; text-align: center; padding-top: 5px; font-size: 0.85rem; font-weight: bold; color: black;">
                        Assinatura do Funcionário: _________________________________________
                    </div>
                </div>
            </div>
        </div>
    `;
}


function gerarRelatorioHEHtml(f, mesReferenciaManual = null) {
    const container = document.getElementById('conteudoRelatorioHE');
    if (!container) return;

    const salarioBase = f.salario || 0;
    const heList = f.horasExtras || [];

    // Calcular dias com lançamentos
    const totalDiasComHE = heList.length;

    // Tarifas acordadas do cadastro ou fallbacks dinâmicos caso vazio
    const valorHE50 = f.valorHeNormal !== undefined ? (parseFloat(f.valorHeNormal) || 0) : ((salarioBase / 220) * 1.5);
    const valorHE100 = f.valorHeEspecial !== undefined ? (parseFloat(f.valorHeEspecial) || 0) : ((salarioBase / 220) * 2.0);

    let horasTotal = 0;
    let ganhoHE50 = 0;
    let ganhoHE100 = 0;
    let ganhoAdicionais = 0;
    let descontosAdicionais = 0;

    const sortedList = [...heList].sort((a, b) => new Date(a.data) - new Date(b.data));

    sortedList.forEach(h => {
        const horasNum = parseFloat(h.horas) || 0;
        horasTotal += horasNum;

        if (h.tipo === 'ESPECIAL') {
            ganhoHE100 += horasNum * valorHE100;
        } else {
            ganhoHE50 += horasNum * valorHE50;
        }
        
        const adicional = parseFloat(h.adicional) || 0;
        if (adicional > 0) {
            ganhoAdicionais += adicional;
        } else if (adicional < 0) {
            descontosAdicionais += Math.abs(adicional);
        }
    });

    // Cálculo das Horas Extras + Prêmios
    const totalHorasExtras = ganhoHE50 + ganhoHE100 + ganhoAdicionais - descontosAdicionais;
    
    const emitente = window.dadosSerrariaEmitente || {
        nome: "COMERCIO DE MADEIRAS VANMART LTDA",
        nomeFantasia: "SERRARIA VANMARTE",
        cnpj: "44.215.194/0001-18",
        ie: "ISENTO",
        contato: "15 996297072",
        email: "escritoriovanmarte@hotmail.com",
        cep: "18430-000",
        logradouro: "ESTRADA DO TAQUARI",
        numero: "267",
        cidade: "Ribeirão Branco / SP"
    };

    // Mes de referencia atual
    const opcoesMes = { month: 'long', year: 'numeric' };
    const mesReferencia = mesReferenciaManual || new Date().toLocaleDateString('pt-BR', opcoesMes).toUpperCase();

    // Gerar linhas da tabela de lançamentos diários
    const linhasTabela = sortedList.map(h => {
        const dataFormatada = new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const diaSemana = new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
        
        const isEspecial = h.tipo === 'ESPECIAL';
        const taxaUnit = isEspecial ? valorHE100 : valorHE50;
        const horasNum = parseFloat(h.horas) || 0;
        const adicionalVal = parseFloat(h.adicional) || 0;
        
        // Subtotal diário: (Horas * Tarifa) + Adicional (positivo ou negativo)
        const subtotal = (horasNum * taxaUnit) + adicionalVal;

        return `
            <tr style="border-bottom: 1px solid #ddd; font-size: 0.9rem;">
                <td style="padding: 8px; font-weight: bold; color: black;">${dataFormatada} (${diaSemana})</td>
                <td style="padding: 8px; text-align: center; color: black; font-weight: bold;">${horasNum > 0 ? horasNum + 'h' : '-'}</td>
                <td style="padding: 8px; text-align: center; font-weight: bold; color: ${isEspecial ? '#b91c1c' : '#1e293b'};">${isEspecial ? 'ESPECIAL' : 'NORMAL'}</td>
                <td style="padding: 8px; text-align: right; color: black; font-weight: bold;">${adicionalVal !== 0 ? (adicionalVal > 0 ? '+' : '') + 'R$ ' + adicionalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '-'}</td>
                <td style="padding: 8px; font-size: 0.82rem; text-transform: uppercase; color: #4b5563;">${h.observacao || '-'}</td>
                <td style="padding: 8px; text-align: right; font-weight: 900; color: black;">R$ ${subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div style="border: 2px solid black; padding: 25px; color: black; background: white; font-family: Arial, sans-serif;">
            
            <!-- Dados da Empresa e Referência -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid black; padding-bottom: 12px; margin-bottom: 15px;">
                <div>
                    <h2 style="margin: 0 0 6px 0; font-size: 1.25rem; font-weight: 900; text-transform: uppercase;">${emitente.nomeFantasia.toUpperCase()}</h2>
                    <span style="font-size: 0.85rem; font-weight: bold; color: #374151;">CNPJ: ${emitente.cnpj} | Suporte: Orquestra.cs - sistema industrial personalizado</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.8rem; font-weight: bold; text-transform: uppercase; color: #4b5563;">RELATÓRIO MENSAL DE HORAS EXTRAS</span><br>
                    <span style="font-size: 1.15rem; font-weight: 900; color: black;">${mesReferencia}</span>
                </div>
            </div>

            <!-- Dados do Colaborador -->
            <div style="border: 1.5px solid black; padding: 12px; margin-bottom: 20px; font-size: 0.9rem; background: #fafafa; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px;">
                <div>
                    <strong>COLABORADOR:</strong> <span style="font-weight: 900; font-size: 1rem;">${f.nome}</span><br>
                    <strong>CARGO:</strong> ${f.funcao || 'OPERÁRIO'}
                </div>
                <div>
                    <strong>CPF:</strong> ${f.cpf || '-'}<br>
                    <strong>RG:</strong> ${f.rg || '-'}
                </div>
                <div style="text-align: right;">
                    <strong>PAGTO:</strong> ${f.formaPagamento || 'PIX'}
                </div>
            </div>

            <!-- Tabela de Lançamentos de Horas Extras -->
            <div style="margin-bottom: 25px;">
                <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
                    <thead>
                        <tr style="background: #f3f4f6; border-bottom: 2px solid black; font-size: 0.85rem; font-weight: bold; text-align: left;">
                            <th style="padding: 8px;">DATA / DIA</th>
                            <th style="padding: 8px; text-align: center;">HORAS</th>
                            <th style="padding: 8px; text-align: center;">TIPO</th>
                            <th style="padding: 8px; text-align: right;">ADIC./DESCONTO</th>
                            <th style="padding: 8px;">OBSERVAÇÃO</th>
                            <th style="padding: 8px; text-align: right;">SUBTOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela || '<tr><td colspan="6" style="padding:15px; text-align:center; color:#666;">Nenhum lançamento de horas extras no período.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- Totais Consolidados (Apenas Horas Extras) -->
            <div style="border: 2px solid black; padding: 15px; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; margin-bottom: 30px;">
                <div>
                    <span>SOMA TOTAL DE DIAS:</span> <strong style="font-size: 1.1rem; margin-right: 20px;">${totalDiasComHE} dias</strong>
                    <span>TOTAL HORAS REALIZADAS:</span> <strong style="font-size: 1.1rem;">${horasTotal}h</strong>
                </div>
                <div style="border-left: 2px solid black; padding-left: 20px; text-align: right;">
                    <span style="font-size: 0.85rem; font-weight: bold; display: block; color: #4b5563; text-transform: uppercase;">TOTAL HORAS EXTRAS A PAGAR</span>
                    <span style="font-weight: 900; font-size: 1.6rem; color: black;">R$ ${totalHorasExtras.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            <!-- Rodapé de Assinaturas Simplificado -->
            <div style="margin-top: 50px; border-top: 1.5px solid black; padding-top: 20px; font-size: 0.85rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center;">
                    <div style="border-top: 1px solid black; padding-top: 6px; font-weight: bold; color: black;">
                        RESPONSÁVEL OPERACIONAL
                    </div>
                    <div style="border-top: 1px solid black; padding-top: 6px; font-weight: bold; color: black;">
                        COLABORADOR
                    </div>
                </div>
            </div>
        </div>
    `;
}


window.aplicarPresetHE = (tipo) => {
    const inputHoras = document.getElementById('he-horas');
    const inputAdicional = document.getElementById('he-adicional');
    const inputObservacao = document.getElementById('he-observacao');
    const inputTipoDia = document.getElementById('he-tipo-dia');

    if (!inputHoras || !inputAdicional || !inputObservacao || !inputTipoDia) return;

    if (tipo === 'MEIO') {
        inputHoras.value = '0';
        inputAdicional.value = '50,00';
        inputObservacao.value = 'DIÁRIA MEIO PERÍODO';
        inputTipoDia.value = 'ESPECIAL';
    } else if (tipo === 'INTEGRAL') {
        inputHoras.value = '0';
        inputAdicional.value = '100,00';
        inputObservacao.value = 'DIÁRIA INTEGRAL';
        inputTipoDia.value = 'ESPECIAL';
    } else {
        inputHoras.value = '';
        inputAdicional.value = '';
        inputObservacao.value = '';
        // Reseta o tipo de dia baseado na data atual
        const dataInput = document.getElementById('he-data');
        if (dataInput && dataInput.value) {
            const d = new Date(dataInput.value + 'T12:00:00');
            const dayOfWeek = d.getDay();
            inputTipoDia.value = (dayOfWeek === 0 || dayOfWeek === 6) ? 'ESPECIAL' : 'NORMAL';
        } else {
            inputTipoDia.value = 'NORMAL';
        }
    }
};


// Auto-inicializar ao carregar o DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarModuloRH);
} else {
    inicializarModuloRH();
}

window.iniciarEditarRH = window.iniciarEditarRH;
window.iniciarExcluirRH = window.iniciarExcluirRH;
window.abrirModalHE = window.abrirModalHE;
window.abrirModalHolerite = window.abrirModalHolerite;
window.abrirModalFaltas = window.abrirModalFaltas;
window.removerFalta = window.removerFalta;
window.aplicarPresetHE = window.aplicarPresetHE;
window.abrirRelatorioMensalHE = window.abrirRelatorioMensalHE;
window.fecharModalRelatorioHE = window.fecharModalRelatorioHE;
