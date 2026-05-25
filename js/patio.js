import { db, collection, addDoc, getDocs, doc, deleteDoc } from './firebase-init.js';

// ---- MÓDULO DE CONTROLE DE PÁTIO & ETIQUETAS ----

let itensPatioTemp = [];
let historicoPatioAtuais = [];
let totaisSalvosHoje = { pacotes: 0, volume: 0 };

// Utilitários de Formatação e Conversão
function parseDecimal(val) {
    if (val === null || val === undefined) return 0;
    let s = val.toString().trim();
    if (s === '') return 0;
    s = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
}

function formatDecimal(num, places = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0,00';
    return num.toFixed(places).replace('.', ',');
}

function formatDecimalMockup(num, places = 3) {
    if (num === null || num === undefined || isNaN(num)) return '0,000';
    return num.toFixed(places).replace('.', ',');
}



// Inicializar Eventos Safely (Independente do momento do carregamento do módulo ES)
function inicializarPatioListeners() {
    const btnAbrir = document.getElementById('btnAbrirControleProducao');
    const formAdicionar = document.getElementById('formAdicionarItemPatio');
    const btnZerar = document.getElementById('btnZerarEtiquetas');
    const btnLimparTudo = document.getElementById('btnLimparTudoPatio');
    const btnImprimirEtiquetas = document.getElementById('btnImprimirEtiquetas');
    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');

    if (btnAbrir) {
        btnAbrir.addEventListener('click', abrirModalPatio);
    }

    if (formAdicionar) {
        formAdicionar.addEventListener('submit', (e) => {
            e.preventDefault();
            adicionarItemAoPatio();
        });
    }

    if (btnZerar) {
        btnZerar.addEventListener('click', zerarEtiquetasPatio);
    }

    if (btnLimparTudo) {
        btnLimparTudo.addEventListener('click', limparTudoPatio);
    }

    if (btnImprimirEtiquetas) {
        btnImprimirEtiquetas.addEventListener('click', imprimirEtiquetasFisicas);
    }

    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarRelatorioPatio);
    }

    // Calculadora de Peças do Pátio (Alt x Cam + Am)
    const calcInputs = document.querySelectorAll('.calc-patio');
    calcInputs.forEach(input => {
        input.addEventListener('input', () => {
            const alt = parseInt(document.getElementById('patioItemAltura').value) || 0;
            const cam = parseInt(document.getElementById('patioItemCamada').value) || 0;
            const am = parseInt(document.getElementById('patioItemAmarras').value) || 0;
            const total = (alt * cam) + am;
            const patioPecas = document.getElementById('patioItemPecas');
            if (patioPecas) patioPecas.value = total > 0 ? total : '';
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPatioListeners);
} else {
    inicializarPatioListeners();
}

// Abrir Modal do Pátio
window.abrirModalPatio = async function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (!modalPatio) return;

    modalPatio.style.display = 'flex';

    // Preencher Data e Hora Atuais por padrão
    const inputData = document.getElementById('patioData');
    const inputHorario = document.getElementById('patioHorario');
    const selectPeriodo = document.getElementById('patioPeriodo');

    const hj = new Date();
    const yyyy = hj.getFullYear();
    const mm = String(hj.getMonth() + 1).padStart(2, '0');
    const dd = String(hj.getDate()).padStart(2, '0');
    const dataAtualString = `${yyyy}-${mm}-${dd}`;

    if (inputData) {
        inputData.value = dataAtualString;
    }

    if (inputHorario) {
        const hh = String(hj.getHours()).padStart(2, '0');
        const min = String(hj.getMinutes()).padStart(2, '0');
        inputHorario.value = `${hh}:${min}`;
        
        if (selectPeriodo) {
            if (hj.getHours() < 13) {
                selectPeriodo.value = 'Manhã (Início do Dia)';
            } else {
                selectPeriodo.value = 'Tarde (Fechamento do Pátio)';
            }
        }
    }

    // Inicializar itens do pátio
    itensPatioTemp = [];
    renderizarItensPatioTemp();

    // Carregar histórico do Firebase e calcular acumulados de hoje
    await carregarHistoricoPatio();
    await calcularAcumuladosHoje(dataAtualString);
};

// Fechar Modal do Pátio
window.fecharModalPatio = function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (modalPatio) {
        modalPatio.style.display = 'none';
    }
};

window.abrirFluxoPatio = async function() {
    const panel = document.getElementById('panelFluxoPatio');
    if (!panel) return;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await renderizarFluxoPatio();
};

window.fecharFluxoPatio = function() {
    const panel = document.getElementById('panelFluxoPatio');
    if (panel) panel.style.display = 'none';
};

async function renderizarFluxoPatio() {
    const tbody = document.getElementById('fluxoPatioLista');
    const resumo = document.getElementById('fluxoPatioResumo');
    const classes = document.getElementById('fluxoPatioClasses');
    const info = document.getElementById('fluxoPatioInfo');
    if (!tbody || !resumo || !classes) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 18px;"><span class="saw-loader" aria-hidden="true"></span> Carregando fluxo do patio...</td></tr>';
    resumo.innerHTML = '';
    classes.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, 'patio_relatorios'));
        const relatorios = [];
        querySnapshot.forEach(docSnap => relatorios.push({ id: docSnap.id, ...docSnap.data() }));
        relatorios.sort((a, b) => new Date(b.criadoEm || `${b.data}T${b.horario || '00:00'}`) - new Date(a.criadoEm || `${a.data}T${a.horario || '00:00'}`));

        const atual = relatorios[0];
        if (!atual) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 18px; color: var(--text-muted);">Nenhum controle de producao salvo ainda.</td></tr>';
            if (info) info.textContent = 'Nenhum controle de producao salvo ainda.';
            return;
        }

        const itens = Array.isArray(atual.itens) ? atual.itens : [];
        const totais = calcularTotaisFluxoPatio(itens);
        const dataFmt = atual.data ? new Date(`${atual.data}T12:00:00`).toLocaleDateString('pt-BR') : '-';
        if (info) info.textContent = `Ultima atualizacao: ${dataFmt} ${atual.horario || ''} | Periodo: ${atual.periodo || '-'}`;

        resumo.innerHTML = `
            ${cardFluxoPatio('Madeira serrando', atual.serrando || '-')}
            ${cardFluxoPatio('Pacotes no patio', totais.pacotes)}
            ${cardFluxoPatio('Volume geral', `${formatDecimalMockup(totais.volume)} m³`)}
        `;

        tbody.innerHTML = itens.length ? itens.map(item => `
            <tr>
                <td>${badgeClasseFluxo(item.classe)}</td>
                <td style="font-weight:700; color:white;">${formatCubagemFluxo(item)}</td>
                <td style="font-weight:800;">${item.pacotes || 0}</td>
                <td style="font-weight:bold; color:var(--accent-color);">${formatDecimalMockup(item.volume || 0)} m³</td>
            </tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center; padding: 18px; color: var(--text-muted);">Sem itens neste controle.</td></tr>';

        classes.innerHTML = Object.entries(totais.porClasse).map(([classe, total]) => cardFluxoPatio(`Volume ${classe}`, `${formatDecimalMockup(total.volume)} m³ | ${total.pacotes} pacotes`)).join('');
    } catch (error) {
        console.error('Erro ao carregar fluxo do patio:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 18px; color:#ef4444;">Erro ao carregar fluxo do patio.</td></tr>';
    }
}

function calcularTotaisFluxoPatio(itens) {
    return itens.reduce((acc, item) => {
        const classe = formatarClasseFluxo(item.classe);
        if (!acc.porClasse[classe]) acc.porClasse[classe] = { volume: 0, pacotes: 0 };
        acc.pacotes += Number(item.pacotes) || 0;
        acc.pecas += Number(item.totalPecas) || Number(item.pecas) || 0;
        acc.volume += Number(item.volume) || 0;
        acc.porClasse[classe].volume += Number(item.volume) || 0;
        acc.porClasse[classe].pacotes += Number(item.pacotes) || 0;
        return acc;
    }, { pacotes: 0, pecas: 0, volume: 0, porClasse: {} });
}

function cardFluxoPatio(label, value) {
    return `
        <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--panel-border); border-radius: 8px; padding: 16px; min-height: 82px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">${label}</div>
            <div style="font-size: 1.35rem; color: white; font-weight: 900; margin-top: 8px; line-height: 1.2;">${value}</div>
        </div>
    `;
}

function formatarClasseFluxo(classe) {
    const value = (classe || '').toString().toUpperCase();
    if (value.includes('1')) return '1ª';
    if (value.includes('2')) return '2ª';
    if (value.includes('3')) return '3ª';
    return value || '-';
}

function badgeClasseFluxo(classe) {
    const label = formatarClasseFluxo(classe);
    let colors = { bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)', color: '#cbd5e1' };
    if (label === '1ª') colors = { bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.45)', color: '#4ade80' };
    if (label === '2ª') colors = { bg: 'rgba(234,179,8,0.16)', border: 'rgba(234,179,8,0.45)', color: '#facc15' };
    if (label === '3ª') colors = { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.45)', color: '#f87171' };
    return `<span style="display:inline-flex; min-width:42px; justify-content:center; padding:5px 10px; border-radius:999px; font-weight:800; background:${colors.bg}; border:1px solid ${colors.border}; color:${colors.color};">${label}</span>`;
}

function formatCubagemFluxo(item) {
    return `${formatDecimal(item.espessura, 1)} x ${formatDecimal(item.largura, 1)} x ${formatDecimal(item.comprimento, 2)}m`;
}

function formatarConfiguracaoPacote(item) {
    const raw = (item.pecasRaw || '').toString().trim();
    if (raw.includes('x')) {
        const [base, amarras] = raw.split('+');
        const textoBase = base.replace('x', ' x ');
        return amarras ? `${textoBase} + ${amarras} amarras` : textoBase;
    }
    return `${item.pecas || 0} peças`;
}

// Adicionar Item via Formulário
function adicionarItemAoPatio() {
    const tipo = document.getElementById('patioItemTipo').value;
    const classe = document.getElementById('patioItemClasse').value;
    const especie = document.querySelector('input[name="patioItemEspecie"]:checked')?.value || 'EUCALIPTO';
    const espRaw = document.getElementById('patioItemEsp').value;
    const largRaw = document.getElementById('patioItemLarg').value;
    const compRaw = document.getElementById('patioItemComp').value;
    const pacotes = parseInt(document.getElementById('patioItemPacotes').value) || 0;
    const pecas = parseInt(document.getElementById('patioItemPecas').value) || 0;

    const alt = parseInt(document.getElementById('patioItemAltura').value) || 0;
    const cam = parseInt(document.getElementById('patioItemCamada').value) || 0;
    const am = parseInt(document.getElementById('patioItemAmarras').value) || 0;

    let pecasRaw = '';
    if (alt > 0 && cam > 0) {
        pecasRaw = `${alt}x${cam}`;
        if (am > 0) pecasRaw += `+${am}`;
    } else {
        pecasRaw = pecas.toString();
    }

    const esp = parseDecimal(espRaw);
    const larg = parseDecimal(largRaw);
    const comp = parseDecimal(compRaw);

    if (esp <= 0 || larg <= 0 || comp <= 0 || pacotes <= 0 || pecas <= 0) {
        alert("⚠️ Por favor, insira valores válidos e maiores que zero.");
        return;
    }

    // Volume individual por pacote
    const volumeUnidade = (esp / 100) * (larg / 100) * comp * pecas;
    // Volume total da linha
    const volumeLinha = volumeUnidade * pacotes;

    const inputData = document.getElementById('patioData').value;
    const dtObj = new Date(inputData + 'T12:00:00');
    const dataFormatada = dtObj.toLocaleDateString('pt-BR');

    itensPatioTemp.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        dataRaw: inputData,
        dataFormatted: dataFormatada,
        tipo: tipo.toUpperCase(),
        classe: classe,
        especie: especie,
        espessura: esp,
        largura: larg,
        comprimento: comp,
        pacotes: pacotes,
        pecas: pecas,
        pecasRaw: pecasRaw,
        totalPecas: pacotes * pecas,
        volumeUnidade: volumeUnidade,
        volume: volumeLinha
    });

    // Mantem medidas/tipo/classe/especie para agilizar lancamentos repetidos.
    document.getElementById('patioItemPacotes').value = '';
    document.getElementById('patioItemPecas').value = '';
    document.getElementById('patioItemAmarras').value = '';
    document.getElementById('patioItemPacotes').focus();

    renderizarItensPatioTemp();
}

// Zerar quantidades de etiquetas
function zerarEtiquetasPatio() {
    if (itensPatioTemp.length === 0) return;
    if (confirm(" deseja zerar a quantidade de todos os pacotes na lista atual?")) {
        itensPatioTemp.forEach(item => {
            item.pacotes = 0;
            item.totalPecas = 0;
            item.volume = 0;
        });
        renderizarItensPatioTemp();
    }
}

// Limpar toda a lista atual
function limparTudoPatio() {
    if (itensPatioTemp.length === 0) return;
    if (confirm(" deseja limpar completamente a lista de pátio atual?")) {
        itensPatioTemp = [];
        renderizarItensPatioTemp();
    }
}

// Ações dinâmicas de incremento/decremento (+1 / -)
window.alterarPacotesPatio = function(id, delta) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;

    const novoPacotes = item.pacotes + delta;
    if (novoPacotes < 0) {
        // Se for menor que zero, pergunta se deseja excluir
        if (confirm(" deseja remover este lote da lista?")) {
            itensPatioTemp = itensPatioTemp.filter(i => i.id !== id);
        } else {
            return;
        }
    } else {
        item.pacotes = novoPacotes;
        item.totalPecas = item.pacotes * item.pecas;
        item.volume = item.volumeUnidade * item.pacotes;
    }
    
    renderizarItensPatioTemp();
};

// Remover linha diretamente pela lixeira
window.removerLinhaPatio = function(id) {
    if (confirm(" deseja remover este lote?")) {
        itensPatioTemp = itensPatioTemp.filter(i => i.id !== id);
        renderizarItensPatioTemp();
    }
};

window.editarItemPatio = function(id) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;

    document.getElementById('patioItemTipo').value = item.tipo || 'TÁBUA';
    document.getElementById('patioItemClasse').value = item.classe || '1ª CLASSE';
    const especieInput = document.querySelector(`input[name="patioItemEspecie"][value="${item.especie || 'EUCALIPTO'}"]`);
    if (especieInput) especieInput.checked = true;

    document.getElementById('patioItemEsp').value = formatDecimal(item.espessura, 1);
    document.getElementById('patioItemLarg').value = formatDecimal(item.largura, 1);
    document.getElementById('patioItemComp').value = formatDecimal(item.comprimento, 2);
    document.getElementById('patioItemPacotes').value = item.pacotes || '';
    document.getElementById('patioItemPecas').value = item.pecas || '';

    const configPacote = parseConfigPacote(item.pecasRaw);
    document.getElementById('patioItemAltura').value = configPacote.alt || '';
    document.getElementById('patioItemCamada').value = configPacote.cam || '';
    document.getElementById('patioItemAmarras').value = configPacote.am || '';

    itensPatioTemp = itensPatioTemp.filter(i => i.id !== id);
    renderizarItensPatioTemp();
    document.getElementById('patioItemPacotes').focus();
};

window.imprimirEtiquetaItemPatio = function(id) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;
    imprimirEtiquetasFisicas([item]);
};

function parseConfigPacote(raw) {
    const match = (raw || '').toString().match(/^(\d+)x(\d+)(?:\+(\d+))?$/);
    return match ? { alt: match[1], cam: match[2], am: match[3] || '' } : {};
}

// Renderizar lista do pátio exatamente igual ao mockup
function renderizarItensPatioTemp() {
    const tbody = document.getElementById('listaItensPatioTemp');
    if (!tbody) return;

    if (itensPatioTemp.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #64748b; padding: 30px; font-size: 0.9rem;">
                    Nenhum pacote na lista de pátio. Adicione ou configure os lotes acima.
                </td>
            </tr>
        `;
        atualizarConsolidatedStats();
        return;
    }

    let html = '';
    itensPatioTemp.forEach(item => {
        // Tag badge da classe
        let classeBadge = '';
        if (item.classe === '1ª CLASSE') {
            classeBadge = `<span class="patio-tag-classe patio-tag-1a">1ª</span>`;
        } else if (item.classe === '2ª CLASSE') {
            classeBadge = `<span class="patio-tag-classe patio-tag-2a">2ª</span>`;
        } else {
            classeBadge = `<span class="patio-tag-classe patio-tag-3a">3ª</span>`;
        }

        html += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.88rem; vertical-align: middle;">
                <!-- DATA -->
                <td style="padding: 14px 10px; color: #475569; font-weight: 500;">
                    ${item.dataFormatted}
                </td>
                <!-- CLASSE -->
                <td style="padding: 14px 10px; text-align: left;">
                    ${classeBadge}
                </td>
                <!-- QUANT. (Mockup blue pill style) -->
                <td style="padding: 14px 10px; text-align: center;">
                    <div style="font-size: 1.1rem; font-weight: 800; color: #2563eb; margin-bottom: 2px;">
                        ${item.pacotes}
                    </div>
                    <small style="color: #16a34a; font-weight: bold; font-size: 0.72rem; display: block; text-transform: uppercase;">
                        ETIQUETADO (${item.pacotes}/${item.pacotes})
                    </small>
                </td>
                <!-- MEDIDAS (Bold details) -->
                <td style="padding: 14px 10px; color: #0f172a; font-weight: bold; font-size: 0.9rem;">
                    ${formatDecimal(item.espessura, 1)} x ${formatDecimal(item.largura, 1)} x ${formatDecimal(item.comprimento, 2)}m
                </td>
                <!-- FORMAÇÃO (Pieces + unit vol) -->
                <td style="padding: 14px 10px; color: #475569;">
                    <div style="font-weight: 700; color: #0f172a;">${item.pecas} peças</div>
                    <small style="color: #64748b; font-size: 0.75rem;">
                        ${item.pecasRaw && item.pecasRaw !== item.pecas.toString() ? `Fórm: ${item.pecasRaw}<br>` : ''}
                        (${formatDecimalMockup(item.volumeUnidade)} m³ / pct)
                    </small>
                </td>
                <!-- VOLUME TOTAL -->
                <td style="padding: 14px 10px; text-align: right;">
                    <div style="font-weight: 800; color: #16a34a; font-size: 1.05rem;">
                        ${formatDecimalMockup(item.volume)}
                    </div>
                    <small style="color: #94a3b8; font-size: 0.72rem;">(${formatDecimalMockup(item.volumeUnidade)}/un)</small>
                </td>
                <!-- AÇÕES (Mockup buttons) -->
                <td class="hide-on-print" style="padding: 14px 10px; text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        <button type="button" class="btn-patio-action-minus" onclick="alterarPacotesPatio('${item.id}', -1)" title="Diminuir Pacote">
                            -
                        </button>
                        <button type="button" class="btn-patio-action-plus" onclick="alterarPacotesPatio('${item.id}', 1)" title="Aumentar Pacote">
                            +1
                        </button>
                        <button type="button" onclick="editarItemPatio('${item.id}')" style="background:none; border:none; color: #2563eb; cursor:pointer; font-size: 1rem; margin-left: 5px; transition: color 0.15s;" title="Editar Lote">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button type="button" onclick="imprimirEtiquetaItemPatio('${item.id}')" style="background:none; border:none; color: #16a34a; cursor:pointer; font-size: 1rem; transition: color 0.15s;" title="Imprimir Etiqueta">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        <button type="button" onclick="removerLinhaPatio('${item.id}')" style="background:none; border:none; color: #94a3b8; cursor:pointer; font-size: 1rem; margin-left: 5px; transition: color 0.15s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'" title="Excluir Lote">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    atualizarConsolidatedStats();
}

// Atualizar estatísticas dos cards em tempo real
function atualizarConsolidatedStats() {
    let totalPacotes = 0;
    let totalVolume = 0;

    itensPatioTemp.forEach(item => {
        totalPacotes += item.pacotes;
        totalVolume += item.volume;
    });

    // Atualizar UI
    document.getElementById('lblTotalPacotes').innerText = totalPacotes;
    document.getElementById('lblTotalVolume').innerText = formatDecimalMockup(totalVolume);

    // Cards da direita (Acumulados de Hoje)
    // Se a data de hoje coincidir com a data selecionada no painel, somamos o rascunho com o acumulado salvo do dia
    const inputData = document.getElementById('patioData');
    const hj = new Date();
    const yyyy = hj.getFullYear();
    const mm = String(hj.getMonth() + 1).padStart(2, '0');
    const dd = String(hj.getDate()).padStart(2, '0');
    const hojeStr = `${yyyy}-${mm}-${dd}`;

    if (inputData && inputData.value === hojeStr) {
        document.getElementById('lblPacotesHoje').innerText = totaisSalvosHoje.pacotes + totalPacotes;
        document.getElementById('lblVolumeHoje').innerText = formatDecimalMockup(totaisSalvosHoje.volume + totalVolume);
    } else {
        document.getElementById('lblPacotesHoje').innerText = totaisSalvosHoje.pacotes;
        document.getElementById('lblVolumeHoje').innerText = formatDecimalMockup(totaisSalvosHoje.volume);
    }
}

// Calcular os totais acumulados salvos no dia atual
async function calcularAcumuladosHoje(hojeStr) {
    totaisSalvosHoje = { pacotes: 0, volume: 0 };
    try {
        const querySnapshot = await getDocs(collection(db, 'patio_relatorios'));
        querySnapshot.forEach((doc) => {
            const rel = doc.data();
            if (rel.data === hojeStr) {
                totaisSalvosHoje.pacotes += rel.totais?.totalPacotes || 0;
                totaisSalvosHoje.volume += rel.totais?.totalVolume || 0;
            }
        });
    } catch (e) {
        console.error("Erro ao calcular acumulado do dia:", e);
    }
    atualizarConsolidatedStats();
}

// Salvar a Contagem Atual no Firebase
async function salvarRelatorioPatio() {
    if (itensPatioTemp.length === 0) {
        alert("⚠️ O pátio está vazio! Insira pelo menos um lote ou pacote para poder salvar.");
        return;
    }

    const dataVal = document.getElementById('patioData').value;
    const periodoVal = document.getElementById('patioPeriodo').value;
    const horarioVal = document.getElementById('patioHorario').value;
    const serrandoVal = document.getElementById('patioSerrando').value.toUpperCase().trim();

    if (!serrandoVal) {
        alert("⚠️ Por favor, digite qual madeira está sendo serrada no momento.");
        document.getElementById('patioSerrando').focus();
        return;
    }

    let totalPacotes = 0;
    let totalVolume = 0;
    let totalPecas = 0;

    itensPatioTemp.forEach(item => {
        totalPacotes += item.pacotes;
        totalVolume += item.volume;
        totalPecas += item.totalPecas;
    });

    const relatorio = {
        data: dataVal,
        periodo: periodoVal,
        horario: horarioVal,
        serrando: serrandoVal,
        itens: itensPatioTemp,
        totais: {
            totalVolume: totalVolume,
            totalPacotes: totalPacotes,
            totalPecas: totalPecas
        },
        criadoEm: new Date().toISOString()
    };

    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');
    const originalText = btnSalvar.innerHTML;
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';

    try {
        await addDoc(collection(db, 'patio_relatorios'), relatorio);
        alert(`✅ Contagem do Pátio do período (${periodoVal}) salva com sucesso!\nVolume Total: ${formatDecimalMockup(totalVolume)} m³.`);
        
        // Resetar rascunho
        document.getElementById('patioSerrando').value = '';
        itensPatioTemp = [];
        renderizarItensPatioTemp();

        // Recarregar histórico e atualizar os acumulados salvos do dia
        await carregarHistoricoPatio();
        await calcularAcumuladosHoje(dataVal);
    } catch (error) {
        console.error("Erro ao salvar contagem do pátio:", error);
        alert("❌ Ocorreu um erro ao salvar o relatório no Firebase.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = originalText;
    }
}

// Carregar Histórico do Firebase
async function carregarHistoricoPatio() {
    const tbody = document.getElementById('listaHistoricoPatio');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;"><span class="saw-loader" aria-hidden="true"></span> Carregando contagens...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, 'patio_relatorios'));
        historicoPatioAtuais = [];
        querySnapshot.forEach((doc) => {
            historicoPatioAtuais.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar decrescente
        historicoPatioAtuais.sort((a, b) => {
            const dateA = new Date(`${a.data}T${a.horario || '00:00'}`);
            const dateB = new Date(`${b.data}T${b.horario || '00:00'}`);
            return dateB - dateA;
        });

        if (historicoPatioAtuais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b; padding: 15px;">Nenhuma contagem diária registrada ainda.</td></tr>';
            return;
        }

        let html = '';
        historicoPatioAtuais.forEach(rel => {
            const dtObj = new Date(rel.data + 'T12:00:00');
            const dtStr = dtObj.toLocaleDateString('pt-BR');
            const volStr = formatDecimalMockup(rel.totais?.totalVolume || 0);

            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; vertical-align: middle;">
                    <td style="padding: 10px 8px; font-weight: bold; color: #0f172a;">${dtStr} - ${rel.horario || 'N/A'}</td>
                    <td style="padding: 10px 8px; color: #475569;">${rel.periodo}</td>
                    <td style="padding: 10px 8px; color: #e67e22; font-weight: bold;">${rel.serrando || 'N/A'}</td>
                    <td style="text-align:center; padding: 10px 8px; font-weight: bold;">${rel.totais?.totalPacotes || 0}</td>
                    <td style="text-align:center; padding: 10px 8px; color: #64748b;">${rel.totais?.totalPecas || 0}</td>
                    <td style="text-align:right; padding: 10px 8px; font-weight: 800; color: #16a34a;">${volStr} m³</td>
                    <td style="text-align:center; padding: 10px 8px;">
                        <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                        <button type="button" onclick="visualizarHistoricoPatio('${rel.id}')" class="btn-patio-light" style="padding: 5px 9px !important; font-size: 0.72rem !important; border-radius: 6px !important;" title="Visualizar">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" onclick="editarHistoricoPatio('${rel.id}')" class="btn-patio-light" style="padding: 5px 9px !important; font-size: 0.72rem !important; border-radius: 6px !important; background:#fff7ed !important; border:1px solid #fed7aa !important; color:#c2410c !important;" title="Editar">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button type="button" onclick="imprimirHistoricoPatio('${rel.id}')" class="btn-patio-light" style="padding: 5px 12px !important; font-size: 0.72rem !important; border-radius: 6px !important; background: #eff6ff !important; border: 1px solid #bfdbfe !important; color: #2563eb !important;" title="Imprimir Relatório">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        <button type="button" onclick="deletarHistoricoPatio('${rel.id}')" style="background: none; border: none; color: #cbd5e1; cursor: pointer; font-size: 1rem; transition: color 0.1s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#cbd5e1'" title="Apagar Registro">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar histórico do pátio:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Erro ao obter dados do pátio.</td></tr>';
    }
}

// Excluir registro do histórico
window.deletarHistoricoPatio = async function(id) {
    if (confirm("⚠️ Tem certeza absoluta que deseja excluir este relatório de contagem do pátio?")) {
        try {
            await deleteDoc(doc(db, 'patio_relatorios', id));
            alert("✅ Relatório de pátio excluído com sucesso!");
            await carregarHistoricoPatio();
            
            const dataVal = document.getElementById('patioData').value;
            await calcularAcumuladosHoje(dataVal);
        } catch (error) {
            console.error("Erro ao deletar contagem:", error);
            alert("Erro ao excluir o documento no Firestore.");
        }
    }
};

// Imprimir relatório selecionado do histórico
window.imprimirHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    gerarLayoutImpressaoPatio(rel);
};

window.visualizarHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    gerarLayoutImpressaoPatio(rel);
};

window.editarHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    if (!confirm("Deseja carregar este lancamento salvo para edicao no Controle de Producao?")) return;

    const inputData = document.getElementById('patioData');
    const selectPeriodo = document.getElementById('patioPeriodo');
    const inputHorario = document.getElementById('patioHorario');
    const inputSerrando = document.getElementById('patioSerrando');

    if (inputData) inputData.value = rel.data || '';
    if (selectPeriodo) selectPeriodo.value = rel.periodo || '';
    if (inputHorario) inputHorario.value = rel.horario || '';
    if (inputSerrando) inputSerrando.value = rel.serrando || '';

    itensPatioTemp = Array.isArray(rel.itens) ? rel.itens.map(item => ({ ...item })) : [];
    renderizarItensPatioTemp();
    alert("Lancamento carregado para edicao. Ajuste os itens e salve novamente quando finalizar.");
};

// Imprimir etiquetas físicas (Mockup Circle Blue Action)
function imprimirEtiquetasFisicas(lista = itensPatioTemp) {
    if (!Array.isArray(lista)) {
        lista = itensPatioTemp;
    }

    if (lista.length === 0) {
        alert("⚠️ Não há pacotes listados para imprimir etiquetas! Lance pelo menos um pacote.");
        return;
    }

    const win = window.open('', '_blank');
    if (!win) {
        alert("Nao foi possivel abrir a etiqueta. Libere pop-ups para este site e tente novamente.");
        return;
    }
    let etiquetasHtml = '';
    let serialGlobal = 1;

    const emitente = window.dadosSerrariaEmitente || {
        nomeFantasia: "VANMARTE"
    };

    // Gerar etiquetas individuais por pacote físico
    lista.forEach(item => {
        for (let p = 1; p <= item.pacotes; p++) {
            const zeroPaddedSerial = String(serialGlobal).padStart(3, '0');
            const uniqueId = `PCT-${item.dataRaw.replace(/-/g, '')}-${zeroPaddedSerial}`;
            const configPacote = formatarConfiguracaoPacote(item);
            
            let badgeStyle = '';
            if (item.classe === '1ª CLASSE') {
                badgeStyle = 'border: 2px solid #2563eb; color: #2563eb; background: #eff6ff;';
            } else if (item.classe === '2ª CLASSE') {
                badgeStyle = 'border: 2px solid #d97706; color: #d97706; background: #fffbeb;';
            } else {
                badgeStyle = 'border: 2px solid #dc2626; color: #dc2626; background: #fef2f2;';
            }

            etiquetasHtml += `
                <div class="ticket-card">
                    <div class="ticket-header">
                        <div class="ticket-brand">${(emitente.nomeFantasia || "VANMARTE").toUpperCase()}</div>
                        <div class="ticket-title">CONTROLE DE PÁTIO</div>
                    </div>
                    
                    <div style="text-align: center; margin: 12px 0;">
                        <span class="ticket-badge" style="${badgeStyle}">${item.classe}</span>
                    </div>

                    <div style="text-align:center; font-size: 12px; font-weight: 900; color:#0f172a; text-transform: uppercase; margin-top: -4px;">
                        ${item.especie || 'EUCALIPTO'}
                    </div>

                    <div class="ticket-measure">
                        ${formatDecimal(item.espessura, 1)} x ${formatDecimal(item.largura, 1)} x ${formatDecimal(item.comprimento, 2)}m
                    </div>

                    <div style="display: grid; grid-template-columns: 1.1fr 0.9fr 1fr; gap: 8px; border-top: 1px dashed #e2e8f0; border-bottom: 1px dashed #e2e8f0; padding: 8px 0; margin: 10px 0;">
                        <div class="ticket-meta">
                            <span>FORMAÇÃO</span>
                            <strong>${configPacote}</strong>
                        </div>
                        <div class="ticket-meta" style="text-align: center;">
                            <span>PEÇAS/PCT</span>
                            <strong style="color:#0f172a;">${item.pecas}</strong>
                        </div>
                        <div class="ticket-meta" style="text-align: right;">
                            <span>VOLUME</span>
                            <strong style="color: #16a34a;">${formatDecimalMockup(item.volumeUnidade)} m³</strong>
                        </div>
                    </div>

                    <div style="font-size: 10px; color: #64748b; text-align: center; margin-bottom: 6px;">
                        Data: ${item.dataFormatted}
                    </div>

                    <div class="ticket-barcode">
                        <div class="barcode-lines"></div>
                        <div class="barcode-text">${uniqueId}</div>
                    </div>
                </div>
            `;
            serialGlobal++;
        }
    });

    win.document.open();
    win.document.write(`
<html>
<head>
    <title>Imprimir Etiquetas do Pátio</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f1f5f9;
            padding: 0.4cm;
            margin: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 0.25cm;
            align-items: flex-start;
        }
        .ticket-card {
            width: 7.5cm;
            height: 7.5cm;
            box-sizing: border-box;
            background: #ffffff;
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 0.32cm;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
        }
        .ticket-brand {
            font-weight: 900;
            color: #e67e22;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        .ticket-title {
            font-weight: 700;
            color: #64748b;
            font-size: 8px;
        }
        .ticket-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            font-weight: 900;
            font-size: 10px;
            text-transform: uppercase;
        }
        .ticket-measure {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            text-align: center;
            letter-spacing: -0.5px;
            margin: 5px 0;
        }
        .ticket-meta {
            display: flex;
            flex-direction: column;
        }
        .ticket-meta span {
            font-size: 9px;
            color: #94a3b8;
            font-weight: bold;
        }
        .ticket-meta strong {
            font-size: 14px;
            color: #0f172a;
        }
        .ticket-barcode {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        .barcode-lines {
            width: 100%;
            height: 24px;
            background: repeating-linear-gradient(
                90deg,
                #0f172a,
                #0f172a 2px,
                #ffffff 2px,
                #ffffff 6px,
                #0f172a 6px,
                #0f172a 8px,
                #ffffff 8px,
                #ffffff 10px
            );
            border-radius: 3px;
        }
        .barcode-text {
            font-family: monospace;
            font-size: 10px;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: 1px;
        }
        @media print {
            @page { margin: 0.5cm; }
            body { background: transparent; padding: 0; gap: 0.2cm; }
            .ticket-card { border: 2px solid #000; box-shadow: none; margin: 0; }
            .barcode-lines { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    ${etiquetasHtml}
    <script>
        window.addEventListener('load', function() {
            window.focus();
            setTimeout(function() {
                window.print();
            }, 350);
        });
    </script>
</body>
</html>
    `);
    win.document.close();
    win.focus();
}

// Gerar layout de fechamento do pátio para impressão agrupado
function gerarLayoutImpressaoPatio(rel) {
    const dtObj = new Date(rel.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');

    const itens1 = rel.itens.filter(i => i.classe === '1ª CLASSE');
    const itens2 = rel.itens.filter(i => i.classe === '2ª CLASSE');
    const itens3 = rel.itens.filter(i => i.classe === '3ª CLASSE');

    // Calcular subtotais por classe
    const calcularSubtotais = (lista) => {
        let pacotes = 0, pecas = 0, volume = 0;
        lista.forEach(i => {
            pacotes += i.pacotes;
            pecas += i.totalPecas;
            volume += i.volume;
        });
        return { pacotes, pecas, volume };
    };

    const sub1 = calcularSubtotais(itens1);
    const sub2 = calcularSubtotais(itens2);
    const sub3 = calcularSubtotais(itens3);

    const win = window.open('', '_blank');
    
    win.document.write(`
<html>
<head>
    <title>Relação de Pátio - Madeira Serrada</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            padding: 30px;
            margin: 0;
            line-height: 1.4;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header-logo-img {
            max-height: 72px;
            max-width: 260px;
            display: block;
            object-fit: contain;
        }
        .meta-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 25px;
        }
        .meta-item {
            font-size: 14px;
        }
        .meta-item strong {
            color: #0f172a;
        }
        .class-section {
            margin-bottom: 25px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .class-header {
            padding: 10px 15px;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
        }
        .class-header-1 {
            background-color: #eff6ff;
            color: #1e40af;
            border-bottom: 2px solid #3b82f6;
        }
        .class-header-2 {
            background-color: #fffbeb;
            color: #92400e;
            border-bottom: 2px solid #d97706;
        }
        .class-header-3 {
            background-color: #fef2f2;
            color: #991b1b;
            border-bottom: 2px solid #ef4444;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
            border-bottom: 1px solid #edf2f7;
        }
        th {
            background: #f8fafc;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11px;
        }
        .num-col {
            text-align: center;
        }
        .vol-col {
            text-align: right;
            font-weight: bold;
        }
        .subtotal-row {
            background: #f8fafc;
            font-weight: bold;
        }
        .consolidated-card {
            background: #0f172a;
            color: #ffffff;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            text-align: center;
        }
        .consolidated-box {
            border-right: 1px solid #334155;
        }
        .consolidated-box:last-child {
            border-right: none;
        }
        .consolidated-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #94a3b8;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .consolidated-val {
            font-size: 20px;
            font-weight: 800;
        }
        .print-footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px dashed #e2e8f0;
            padding-top: 15px;
        }
        @media print {
            body { padding: 10px; }
            .consolidated-card { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
            .class-header-1 { background-color: #eff6ff !important; color: #1e40af !important; -webkit-print-color-adjust: exact; }
            .class-header-2 { background-color: #fffbeb !important; color: #92400e !important; -webkit-print-color-adjust: exact; }
            .class-header-3 { background-color: #fef2f2 !important; color: #991b1b !important; -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <img src="logo.png" alt="Serraria Vanmarte" class="header-logo-img" onerror="this.style.display='none'">
        </div>
        <div style="text-align: right;">
            <h2 style="margin: 0; color: #0f172a; font-size: 20px;">Relação de Pátio Diário</h2>
            <small style="color: #64748b;">Controle de Estoque de Madeira Serrada para Clientes</small>
        </div>
    </div>

    <div class="meta-container">
        <div class="meta-item"><strong>Data da Contagem:</strong> ${dtStr}</div>
        <div class="meta-item"><strong>Turno / Período:</strong> ${rel.periodo}</div>
        <div class="meta-item"><strong>Horário da Contagem:</strong> ${rel.horario || 'N/A'}</div>
        <div class="meta-item"><strong>Madeira Serrando no Momento:</strong> <span style="color: #e67e22; font-weight: bold;">${rel.serrando || 'N/A'}</span></div>
    </div>
    `);

    // Construir tabelas por classe
    function gerarTabelaClasse(itens, classeName, headerClass, totalClasse) {
        if (itens.length === 0) return '';
        
        let rowsHtml = '';
        itens.forEach(i => {
            rowsHtml += `
                <tr>
                    <td style="font-weight: bold;">${i.tipo}</td>
                    <td>${formatDecimal(i.espessura, 1)} x ${formatDecimal(i.largura, 1)} x ${formatDecimal(i.comprimento, 2)}m</td>
                    <td class="num-col">${i.pacotes}</td>
                    <td class="num-col">${i.pecas}</td>
                    <td class="num-col" style="font-weight: 500;">${i.totalPecas}</td>
                    <td class="vol-col">${formatDecimalMockup(i.volume)} m³</td>
                </tr>
            `;
        });

        return `
            <div class="class-section">
                <div class="class-header ${headerClass}">
                    <span>${classeName}</span>
                    <span>Subtotal: ${formatDecimalMockup(totalClasse.volume)} m³</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Medidas (Esp x Larg x Comp)</th>
                            <th class="num-col">Pacotes</th>
                            <th class="num-col">Peças/Pacote</th>
                            <th class="num-col">Total Peças</th>
                            <th class="vol-col">Volume (m³)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr class="subtotal-row">
                            <td colspan="2">TOTAL ${classeName}</td>
                            <td class="num-col">${totalClasse.pacotes}</td>
                            <td class="num-col">-</td>
                            <td class="num-col">${totalClasse.pecas}</td>
                            <td class="vol-col">${formatDecimalMockup(totalClasse.volume)} m³</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    win.document.write(gerarTabelaClasse(itens1, '1ª CLASSE (VERDE)', 'class-header-1', sub1));
    win.document.write(gerarTabelaClasse(itens2, '2ª CLASSE (AMARELO)', 'class-header-2', sub2));
    win.document.write(gerarTabelaClasse(itens3, '3ª CLASSE (VERMELHO)', 'class-header-3', sub3));

    // Escrever bloco consolidado geral
    win.document.write(`
    <div class="consolidated-card">
        <div class="consolidated-box">
            <div class="consolidated-title">Total de Pacotes</div>
            <div class="consolidated-val">${rel.totais.totalPacotes}</div>
        </div>
        <div class="consolidated-box">
            <div class="consolidated-title">Total de Peças</div>
            <div class="consolidated-val">${rel.totais.totalPecas}</div>
        </div>
        <div class="consolidated-box" style="border-right: none;">
            <div class="consolidated-title">Volume Geral Pátio</div>
            <div class="consolidated-val" style="color: #16a34a;">${formatDecimalMockup(rel.totais.totalVolume)} m³</div>
        </div>
        <div class="consolidated-box" style="border-right: none; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 5px;">
            <div style="font-size: 9px; text-transform: uppercase; color: #94a3b8;">Status do Pátio</div>
            <div style="font-size: 14px; font-weight: bold; color: #e67e22; text-transform: uppercase;">Pronto p/ Venda</div>
        </div>
    </div>

    <div class="print-footer">
        <p>Relação emitida automaticamente pelo sistema da Serraria Vanmarte.</p>
        <p>Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
</body>
</html>
    `);

    win.document.close();
    win.print();
}
