import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from './firebase-init.js';

// --- MÓDULO DE GESTÃO DE PESSOAS (RH) ---

const funcionariosCollection = collection(db, 'funcionarios');
let funcionariosAtuais = [];
let funcionarioEditandoId = null;

// Elementos do DOM
const viewRH = document.getElementById('view-rh');
const formFuncionario = document.getElementById('formFuncionario');
const listaRH = document.getElementById('listaRH');
const buscaFuncionario = document.getElementById('buscaFuncionario');

const cardFormRH = document.getElementById('cardFormRH');
const panelListaRH = document.getElementById('panelListaRH');
const btnToggleFormRH = document.getElementById('btnToggleFormRH');
const txtToggleFormRH = document.getElementById('txtToggleFormRH');
const btnCancelarRH = document.getElementById('btnCancelarRH');
const btnLimparBuscaRH = document.getElementById('btnLimparBuscaRH');

// Inicialização segura
function inicializarModuloRH() {
    if (!viewRH) return;

    configurarTogglesRH();
    configurarFormulariosRH();
    carregarFuncionarios();
}

// Configurar exibição condicional do formulário de cadastro
function configurarTogglesRH() {
    if (btnToggleFormRH) {
        btnToggleFormRH.onclick = () => {
            if (cardFormRH.style.display === 'none') {
                abrirFormularioRH(null);
            } else {
                fecharFormularioRH();
            }
        };
    }

    if (btnCancelarRH) {
        btnCancelarRH.onclick = fecharFormularioRH;
    }

    if (buscaFuncionario) {
        buscaFuncionario.addEventListener('input', filtrarFuncionarios);
    }
}

function abrirFormularioRH(func = null) {
    if (!cardFormRH || !panelListaRH) return;
    
    cardFormRH.style.display = 'block';
    
    // Maximizar espaço ocultando a tabela quando formulário estiver aberto
    panelListaRH.style.display = 'none';

    if (func) {
        funcionarioEditandoId = func.id;
        document.getElementById('tituloFormRH').innerHTML = `<i class="fa-solid fa-user-pen"></i> Editar Funcionário: ${func.nome}`;
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
        document.getElementById('rh-valor-he-normal').value = window.formatCurrencyValue ? window.formatCurrencyValue(func.valorHeNormal || 0) : `R$ ${(func.valorHeNormal || 0).toFixed(2)}`;
        document.getElementById('rh-valor-he-especial').value = window.formatCurrencyValue ? window.formatCurrencyValue(func.valorHeEspecial || 0) : `R$ ${(func.valorHeEspecial || 0).toFixed(2)}`;
        document.getElementById('rh-ferias-dias').value = func.feriasDias || 0;
        document.getElementById('rh-ferias-inicio').value = func.feriasInicio || '';
        document.getElementById('rh-ferias-fim').value = func.feriasFim || '';
        
        if (txtToggleFormRH) txtToggleFormRH.textContent = "Voltar para Lista";
    } else {
        funcionarioEditandoId = null;
        if (formFuncionario) formFuncionario.reset();
        document.getElementById('rh-id').value = '';
        document.getElementById('rh-valor-he-normal').value = '';
        document.getElementById('rh-valor-he-especial').value = '';
        document.getElementById('tituloFormRH').innerHTML = `<i class="fa-solid fa-user-plus"></i> Novo Funcionário`;
        if (txtToggleFormRH) txtToggleFormRH.textContent = "Voltar para Lista";
    }
}

function fecharFormularioRH() {
    if (!cardFormRH || !panelListaRH) return;
    
    cardFormRH.style.display = 'none';
    panelListaRH.style.display = 'block';
    
    if (txtToggleFormRH) txtToggleFormRH.textContent = "Cadastrar Funcionário";
    if (formFuncionario) formFuncionario.reset();
    funcionarioEditandoId = null;
}

// Configuração de máscaras nos inputs e eventos
function configurarFormulariosRH() {
    // Máscara de Salário, Vale, valores de horas extras, adicionais e faltas
    ['rh-salario', 'rh-vale', 'rh-valor-he-normal', 'rh-valor-he-especial', 'he-adicional', 'falta-valor'].forEach(id => {
        const el = document.getElementById(id);
        if (el && window.formatCurrencyInput) {
            el.addEventListener('input', window.formatCurrencyInput);
        }
    });

    // Forçar caixa alta no Nome Completo, Função e Dados Bancários
    ['rh-nome', 'rh-funcao', 'rh-dados-bancarios', 'he-observacao'].forEach(id => {
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
    listaRH.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando quadro de funcionários...</td></tr>';
    
    try {
        const snap = await getDocs(funcionariosCollection);
        funcionariosAtuais = [];
        snap.forEach(docSnap => {
            funcionariosAtuais.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Ordenar por nome
        funcionariosAtuais.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        renderizarFuncionarios(funcionariosAtuais);
    } catch (e) {
        console.error("Erro ao carregar funcionários:", e);
        listaRH.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger-color);"><i class="fa-solid fa-circle-exclamation"></i> Falha ao comunicar com Firebase.</td></tr>';
    }
}

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
                <td>
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
                <td>
                    <strong>${f.funcao || 'NÃO DEFINIDA'}</strong><br>
                    <small style="color:#aaa;">Adm: ${adm}</small>
                </td>
                <td>
                    <span style="font-size:0.85rem;">${f.contato || '-'}</span><br>
                    <small style="color:#888;">CPF: ${f.cpf || '-'}</small>
                </td>
                <td>
                    <span style="color:#00ff88; font-weight:bold;">${fSalario}</span><br>
                    <small style="color:#ef4444;">Vale: ${fVale}</small>
                </td>
                <td>${feriasInfo}</td>
                <td>
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
function filtrarFuncionarios() {
    const queryStr = buscaFuncionario.value.toLowerCase().trim();
    if (!queryStr) {
        renderizarFuncionarios(funcionariosAtuais);
        return;
    }
    const filtrados = funcionariosAtuais.filter(f => 
        (f.nome || '').toLowerCase().includes(queryStr) || 
        (f.funcao || '').toLowerCase().includes(queryStr)
    );
    renderizarFuncionarios(filtrados);
}

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
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    }

    try {
        const dados = {
            nome, nascimento, cpf, rg, contato, funcao, admissao,
            salario: parseFloat(salario) || 0,
            vale: parseFloat(vale) || 0,
            valorHeNormal: parseFloat(valorHeNormal) || 0,
            valorHeEspecial: parseFloat(valorHeEspecial) || 0,
            formaPagamento, dadosBancarios, feriasDias, feriasInicio, feriasFim,
            atualizadoEm: new Date().toISOString()
        };

        if (id) {
            // Edição
            const docRef = doc(db, 'funcionarios', id);
            await updateDoc(docRef, dados);
            alert("Funcionário atualizado com sucesso!");
        } else {
            // Criação
            dados.criadoEm = new Date().toISOString();
            dados.horasExtras = []; // Array vazio de horas extras
            await addDoc(funcionariosCollection, dados);
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

    if (confirm(`⚠️ OPERAÇÃO CRÍTICA!\nDeseja realmente EXCLUIR permanentemente o funcionário "${f.nome}"?\nTodos os históricos de férias e horas extras deste funcionário serão apagados para sempre.`)) {
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

    renderizarTabelaHE(f);

    const modal = document.getElementById('modalHorasExtras');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalHE = () => {
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
                <td>
                    <button onclick="window.removerHoraExtra('${h.id}')" class="btn-icon" style="color:var(--danger-color);" title="Excluir Lançamento">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (totalSoma) totalSoma.textContent = `${somaHoras}h`;
    if (totalValor) totalValor.textContent = somaValores.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
        id: Date.now().toString(),
        data,
        horas: parseFloat(horas) || 0,
        tipo,
        adicional: parseFloat(adicional) || 0,
        observacao
    };

    f.horasExtras.push(novoLote);

    try {
        const docRef = doc(db, 'funcionarios', idFunc);
        await updateDoc(docRef, { horasExtras: f.horasExtras });
        
        // Atualizar lista em memória local e UI
        renderizarTabelaHE(f);
        document.getElementById('he-horas').value = '';
        document.getElementById('he-adicional').value = '';
        document.getElementById('he-observacao').value = '';
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

    if (confirm("Deseja realmente excluir este lançamento?")) {
        f.horasExtras = f.horasExtras.filter(h => h.id !== idHE);
        try {
            const docRef = doc(db, 'funcionarios', idFunc);
            await updateDoc(docRef, { horasExtras: f.horasExtras });
            renderizarTabelaHE(f);
            
            // Atualizar tabela principal de funcionários
            filtrarFuncionarios();
        } catch (e) {
            console.error("Erro ao remover hora extra:", e);
            alert("Erro ao remover lançamento.");
        }
    }
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
    const valorRaw = document.getElementById('falta-valor').value;
    const valor = window.parseCurrencyValue ? window.parseCurrencyValue(valorRaw) : parseFloat(valorRaw.replace(/\D/g, "")) / 100;

    if (!idFunc || !data || isNaN(valor) || valor <= 0) {
        alert("Preencha a data e o valor de referência da falta.");
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
        const docRef = doc(db, 'funcionarios', idFunc);
        await updateDoc(docRef, { faltas: f.faltas });
        
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

    if (confirm("Deseja realmente excluir esta falta?")) {
        f.faltas = f.faltas.filter(x => x.id !== idFalta);
        try {
            const docRef = doc(db, 'funcionarios', idFunc);
            await updateDoc(docRef, { faltas: f.faltas });
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

    gerarHoleriteHtml(f);

    const modal = document.getElementById('modalHolerite');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalHolerite = () => {
    const modal = document.getElementById('modalHolerite');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('printing-holerite');
};

// Listeners de impressão para garantir ocultação perfeita de todo o resto
window.addEventListener('beforeprint', () => {
    const modal = document.getElementById('modalHolerite');
    if (modal && modal.style.display === 'flex') {
        document.body.classList.add('printing-holerite');
    }
});

window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-holerite');
});

function gerarHoleriteHtml(f) {
    const container = document.getElementById('conteudoHolerite');
    if (!container) return;

    const salarioBase = f.salario || 0;
    const vale = f.vale || 0;
    const heList = f.horasExtras || [];
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

    const dataAdmissao = f.admissao ? new Date(f.admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    
    // Mes de referencia atual
    const opcoesMes = { month: 'long', year: 'numeric' };
    const mesReferencia = new Date().toLocaleDateString('pt-BR', opcoesMes).toUpperCase();

    container.innerHTML = `
        <div style="border: 2px solid black; padding: 15px; color: black; background: white;">
            <!-- Linha Dupla de Topo -->
            <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: bold; letter-spacing: 1px;">EXTRATO E RECIBO DE HORAS EXTRAS / ADICIONAIS</h2>
                <small>SERRARIA ORQUESTRA.CS - SISTEMAS DE ALTA PERFORMANCE</small>
            </div>

            <!-- Dados da Empresa e Período -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; border-bottom: 1px solid black; padding-bottom: 8px; margin-bottom: 8px; gap: 10px;">
                <div>
                    <strong>EMPRESA:</strong> ORQUESTRACS SERRARIA INTEGRADA LTDA<br>
                    <strong>CNPJ:</strong> 12.345.678/0001-99<br>
                    <strong>ENDEREÇO:</strong> ZONA INDUSTRIAL DE LOGÍSTICA, S/N - PÁTIO SERRARIA
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
            <div style="font-family: monospace; font-size: 0.82rem;">
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; font-weight: bold; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 6px;">
                    <div>DESCRIÇÃO</div>
                    <div style="text-align: center;">REF.</div>
                    <div style="text-align: right;">PROVENTOS</div>
                    <div style="text-align: right;">DESCONTOS</div>
                </div>

                <!-- Horas Extras 50% -->
                ${horas50 > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 4px;">
                    <div>150 HORAS EXTRAS 50% (NORMAL)</div>
                    <div style="text-align: center;">${horas50}h</div>
                    <div style="text-align: right;">R$ ${ganhoHE50.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div style="text-align: right;">-</div>
                </div>
                ` : ''}

                <!-- Horas Extras 100% -->
                ${horas100 > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 4px;">
                    <div>151 HORAS EXTRAS 100% (DOM/SÁB/FER)</div>
                    <div style="text-align: center;">${horas100}h</div>
                    <div style="text-align: right;">R$ ${ganhoHE100.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div style="text-align: right;">-</div>
                </div>
                ` : ''}

                <!-- Adicionais Diários / Prêmios -->
                ${ganhoAdicionais > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 4px;">
                    <div>300 VALORES ADICIONAIS / PRÊMIOS DIÁRIOS</div>
                    <div style="text-align: center;">-</div>
                    <div style="text-align: right;">R$ ${ganhoAdicionais.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div style="text-align: right;">-</div>
                </div>
                ` : ''}

                <!-- Vale Mensal / Adiantamento -->
                ${vale > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 4px;">
                    <div>901 VALE DE ADIANTAMENTO MENSAL</div>
                    <div style="text-align: center;">-</div>
                    <div style="text-align: right;">-</div>
                    <div style="text-align: right;">R$ ${vale.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                ` : ''}

                <!-- Descontos Diários Adicionais -->
                ${descontosAdicionais > 0 ? `
                <div style="display: grid; grid-template-columns: 3.5fr 1fr 1.2fr 1.2fr; margin-bottom: 4px;">
                    <div>905 DESCONTOS DIÁRIOS ADICIONAIS</div>
                    <div style="text-align: center;">-</div>
                    <div style="text-align: right;">-</div>
                    <div style="text-align: right;">R$ ${descontosAdicionais.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                ` : ''}
            </div>

            <!-- Linha de Totais -->
            <div style="display: grid; grid-template-columns: 4.5fr 1.2fr 1.2fr; border-top: 1px solid black; padding-top: 5px; margin-top: 20px; font-weight: bold;">
                <div>TOTAIS EXTRATO</div>
                <div style="text-align: right; color: black;">R$ ${totalVencimentos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                <div style="text-align: right; color: black;">R$ ${totalDescontos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>

            <!-- Líquido a Receber Box -->
            <div style="border: 2.5px solid black; margin-top: 15px; padding: 10px; display: flex; justify-content: space-between; align-items: center; background: #eee;">
                <span style="font-weight: 900; font-size: 0.95rem;">LÍQUIDO A RECEBER (H. EXTRAS + ADIC. - VALE):</span>
                <span style="font-weight: 900; font-size: 1.4rem; color: black;">R$ ${valorLiquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>

            <!-- Informações Bancárias / Chave Pix -->
            <div style="margin-top: 15px; border-top: 1px dashed black; padding-top: 8px; font-size: 0.8rem;">
                <strong>FORMA DE PAGAMENTO:</strong> ${f.formaPagamento || 'PIX'}<br>
                <strong>DADOS PARA DEPÓSITO:</strong> ${f.dadosBancarios || 'Chave cadastrada no perfil'}
            </div>

            <!-- Declaração de Recebimento e Assinatura -->
            <div style="margin-top: 30px; border-top: 1px solid black; padding-top: 10px;">
                <p style="font-size: 0.72rem; text-align: justify; margin: 0 0 35px 0; color: #333; font-style: italic;">
                    * OBSERVAÇÃO IMPORTANTE: Este recibo compreende o cálculo do acúmulo de Horas Extras e prêmios diários informados, deduzindo o adiantamento de Vale. <strong>O SALÁRIO BASE INTEGRAL NÃO ESTÁ INCLUÍDO</strong> neste documento de fechamento extra, sendo pago via contracheque mensal padrão.
                </p>
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px; align-items: flex-end;">
                    <div style="border-top: 1px solid black; text-align: center; padding-top: 5px; font-size: 0.8rem;">
                        Data: ____/____/_______
                    </div>
                    <div style="border-top: 1px solid black; text-align: center; padding-top: 5px; font-size: 0.8rem;">
                        Assinatura do Funcionário: _________________________________________
                    </div>
                </div>
            </div>
        </div>
    `;
}


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
