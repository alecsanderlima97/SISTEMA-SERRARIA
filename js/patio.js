import { db, auth, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from './firebase-init.js';

// ---- MÃ“DULO DE CONTROLE DE PÃTIO & ETIQUETAS ----

let itensPatioTemp = [];
let historicoPatioAtuais = [];
let totaisSalvosHoje = { pacotes: 0, volume: 0 };
let relatorioPatioEditandoId = null;
let etiquetasAvulsasPatio = [];
let producaoPatioRelatorioAtual = null;

// UtilitÃ¡rios de FormataÃ§Ã£o e ConversÃ£o
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



// Inicializar Eventos Safely (Independente do momento do carregamento do mÃ³dulo ES)
function inicializarPatioListeners() {
    const btnAbrir = document.getElementById('btnAbrirControleProducao');
    const formAdicionar = document.getElementById('formAdicionarItemPatio');
    const btnZerar = document.getElementById('btnZerarEtiquetas');
    const btnLimparTudo = document.getElementById('btnLimparTudoPatio');
    const btnImprimirEtiquetas = document.getElementById('btnImprimirEtiquetas');
    const btnEtiquetasAvulsas = document.getElementById('btnEtiquetasAvulsasPatio');
    const btnFecharEtiquetaAvulsa = document.getElementById('btnFecharEtiquetaAvulsaPatio');
    const btnAdicionarEtiquetaAvulsa = document.getElementById('btnAdicionarEtiquetaAvulsaPatio');
    const btnImprimirEtiquetaAvulsa = document.getElementById('btnImprimirEtiquetaAvulsaPatio');
    const btnLimparEtiquetaAvulsa = document.getElementById('btnLimparEtiquetaAvulsaPatio');
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

    if (btnEtiquetasAvulsas) {
        btnEtiquetasAvulsas.addEventListener('click', gerarEtiquetasAvulsasPatio);
    }

    if (btnFecharEtiquetaAvulsa) {
        btnFecharEtiquetaAvulsa.addEventListener('click', fecharEtiquetaAvulsaPatio);
    }

    if (btnAdicionarEtiquetaAvulsa) {
        btnAdicionarEtiquetaAvulsa.addEventListener('click', adicionarEtiquetaAvulsaPatio);
    }

    if (btnImprimirEtiquetaAvulsa) {
        btnImprimirEtiquetaAvulsa.addEventListener('click', imprimirEtiquetaAvulsaPatio);
    }

    if (btnLimparEtiquetaAvulsa) {
        btnLimparEtiquetaAvulsa.addEventListener('click', limparEtiquetaAvulsaPatio);
    }

    document.querySelectorAll('[data-etiqueta-avulsa]').forEach(input => {
        input.addEventListener('input', atualizarPreviewEtiquetaAvulsaPatio);
    });

    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarRelatorioPatio);
    }

    const selectClasse = document.getElementById('patioItemClasse');
    if (selectClasse) {
        atualizarCorSelectClasse(selectClasse);
        selectClasse.addEventListener('change', () => atualizarCorSelectClasse(selectClasse));
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

function atualizarCorSelectClasse(selectClasse) {
    selectClasse.classList.remove('patio-classe-1', 'patio-classe-2', 'patio-classe-3');
    const valor = (selectClasse.value || '').toUpperCase();
    if (valor.includes('1')) {
        selectClasse.classList.add('patio-classe-1');
    } else if (valor.includes('2')) {
        selectClasse.classList.add('patio-classe-2');
    } else {
        selectClasse.classList.add('patio-classe-3');
    }
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

    // Preencher Data e Hora Atuais por padrÃ£o
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
                selectPeriodo.value = 'ManhÃ£ (In?cio do Dia)';
            } else {
                selectPeriodo.value = 'Tarde (Fechamento do Pátio)';
            }
        }
    }

    // Inicializar itens do pátio
    relatorioPatioEditandoId = null;
    itensPatioTemp = [];
    renderizarItensPatioTemp();
    atualizarEstadoEdicaoPatio();

    // Carregar histórico do Firebase e calcular acumulados de hoje
    await carregarHistoricoPatio();
    atualizarAvisoUltimaAlteracaoPatio();
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

async function carregarRelatorioPatioAtual() {
    const querySnapshot = await getDocs(collection(db, 'patio_relatorios'));
    const relatorios = [];
    querySnapshot.forEach(docSnap => relatorios.push({ id: docSnap.id, ...docSnap.data() }));
    relatorios.sort((a, b) => new Date(b.criadoEm || `${b.data}T${b.horario || '00:00'}`) - new Date(a.criadoEm || `${a.data}T${a.horario || '00:00'}`));
    return relatorios[0] || null;
}

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
        const atual = await carregarRelatorioPatioAtual();
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

        classes.innerHTML = Object.entries(totais.porClasse).map(([classe, total]) => cardFluxoPatio(`Volume ${classe}`, `${formatDecimalMockup(total.volume)} m³ | ${total.pacotes} pacotes`, classe)).join('');
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

function cardFluxoPatio(label, value, classe = null) {
    const colors = coresClasseFluxo(classe);
    const valueColor = classe ? colors.color : 'white';
    return `
        <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--panel-border); border-radius: 8px; padding: 16px; min-height: 82px;">
            <div style="font-size: 0.78rem; color: ${valueColor}; text-transform: uppercase; font-weight: 800;">${label}</div>
            <div style="font-size: 1.35rem; color: ${valueColor}; font-weight: 900; margin-top: 8px; line-height: 1.2;">${value}</div>
        </div>
    `;
}

function usuarioPodeAcessarDashboardItem(itemId) {
    if (!window.App || typeof window.App.canAccessSubsection !== 'function') return true;
    return window.App.canAccessSubsection('view-dashboard', itemId);
}

function aplicarPermissoesDashboardPatio() {
    document.querySelectorAll('[data-dashboard-permission]').forEach(el => {
        if (el.id === 'panelProducaoPatio') return;
        const permission = el.getAttribute('data-dashboard-permission');
        el.style.display = usuarioPodeAcessarDashboardItem(permission) ? '' : 'none';
    });

    const podeIndicadores = usuarioPodeAcessarDashboardItem('indicadores');
    document.querySelectorAll('#view-dashboard .kpi-card, #view-dashboard .dashboard-card, #view-dashboard canvas, #view-dashboard [data-dashboard-view]').forEach(el => {
        el.style.display = podeIndicadores ? '' : 'none';
    });
}

window.atualizarPermissoesDashboardPatio = aplicarPermissoesDashboardPatio;
setTimeout(aplicarPermissoesDashboardPatio, 0);

window.abrirProducaoPatio = async function() {
    if (!usuarioPodeAcessarDashboardItem('fluxo-patio')) {
        alert('Seu usuario nao tem permissao para acessar o Fluxo do Patio.');
        return;
    }
    const panel = document.getElementById('panelProducaoPatio');
    if (!panel) return;
    panel.style.display = 'block';
    setFormProducaoPatioAberto(false);
    aplicarPermissoesDashboardPatio();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await renderizarProducaoPatio();
};

function setFormProducaoPatioAberto(aberto) {
    const form = document.getElementById('formProducaoPatio');
    if (!form) return;
    form.dataset.aberto = aberto ? '1' : '0';
    form.style.display = aberto ? 'grid' : 'none';
}

window.fecharProducaoPatio = function() {
    setFormProducaoPatioAberto(false);
    const panel = document.getElementById('panelProducaoPatio');
    if (panel) panel.style.display = 'none';
};

window.toggleFormProducaoPatio = function() {
    const form = document.getElementById('formProducaoPatio');
    if (!form) return;
    const aberto = form.dataset.aberto === '1';
    setFormProducaoPatioAberto(!aberto);
    atualizarResumoClassesProducaoPatio();
    atualizarResumoNovaCubagemProducaoPatio();
};

function calcularNovaCubagemProducaoPatio() {
    const esp = parseDecimal(document.getElementById('prodPatioEsp')?.value);
    const larg = parseDecimal(document.getElementById('prodPatioLarg')?.value);
    const comp = parseDecimal(document.getElementById('prodPatioComp')?.value);
    const pacotes = parseInt(document.getElementById('prodPatioPacotes')?.value, 10) || 0;
    const alturas = parseInt(document.getElementById('prodPatioAlturas')?.value, 10) || 0;
    const larguraPacote = parseInt(document.getElementById('prodPatioLarguraPacote')?.value, 10) || 0;
    const amarras = parseInt(document.getElementById('prodPatioAmarras')?.value, 10) || 0;
    const pecas = alturas > 0 && larguraPacote > 0 ? (alturas * larguraPacote) + amarras : 0;
    const volumeUnidade = esp > 0 && larg > 0 && comp > 0 && pecas > 0 ? (esp / 100) * (larg / 100) * comp * pecas : 0;
    return { pecas, volume: volumeUnidade * pacotes };
}

function atualizarResumoNovaCubagemProducaoPatio() {
    const totalPecas = document.getElementById('prodPatioTotalPecas');
    const totalVolume = document.getElementById('prodPatioTotalVolume');
    if (!totalPecas && !totalVolume) return;
    const resumo = calcularNovaCubagemProducaoPatio();
    if (totalPecas) totalPecas.textContent = `${resumo.pecas || 0} pç`;
    if (totalVolume) totalVolume.textContent = `${formatDecimalMockup(resumo.volume || 0)} m³`;
}

function instalarListenersProducaoPatio() {
    ['prodPatioEsp', 'prodPatioLarg', 'prodPatioComp', 'prodPatioPacotes', 'prodPatioAlturas', 'prodPatioLarguraPacote', 'prodPatioAmarras'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.producaoListener) {
            el.addEventListener('input', atualizarResumoNovaCubagemProducaoPatio);
            el.dataset.producaoListener = '1';
        }
    });
}

function atualizarResumoClassesProducaoPatio() {
    const container = document.getElementById('resumoProducaoPatioClasses');
    if (!container) return;
    if (!producaoPatioRelatorioAtual) {
        container.innerHTML = '';
        return;
    }
    const totais = calcularTotaisFluxoPatio(producaoPatioRelatorioAtual.itens || []);
    container.innerHTML = Object.entries(totais.porClasse).map(([classe, total]) => cardFluxoPatio(`Classe ${classe}`, `${total.pacotes} pacotes | ${formatDecimalMockup(total.volume)} m³`, classe)).join('');
}

async function salvarRelatorioProducaoPatio(relatorio) {
    const itens = ordenarItensPatio(Array.isArray(relatorio.itens) ? relatorio.itens : []);
    const totais = calcularTotaisFluxoPatio(itens);
    const dados = {
        ...relatorio,
        itens,
        totais: {
            totalVolume: totais.volume,
            totalPacotes: totais.pacotes,
            totalPecas: totais.pecas
        },
        ultimaAlteracaoPatio: relatorio.ultimaAlteracaoPatio || montarUltimaAlteracaoPatio('Atualizacao do patio'),
        atualizadoEm: new Date().toISOString()
    };
    delete dados.id;
    await updateDoc(doc(db, 'patio_relatorios', relatorio.id), dados);
    producaoPatioRelatorioAtual = { id: relatorio.id, ...dados };
}

async function renderizarProducaoPatio() {
    const tbody = document.getElementById('producaoPatioLista');
    const info = document.getElementById('producaoPatioInfo');
    const serrandoInput = document.getElementById('producaoPatioSerrando');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 18px;"><span class="saw-loader" aria-hidden="true"></span> Carregando producao do patio...</td></tr>';

    try {
        producaoPatioRelatorioAtual = await carregarRelatorioPatioAtual();
        const atual = producaoPatioRelatorioAtual;
        if (!atual) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 18px; color: var(--text-muted);">Nenhum controle de producao salvo ainda.</td></tr>';
            if (info) info.textContent = 'Faca a primeira contagem no Controle de Producao.';
            return;
        }

        atual.itens = ordenarItensPatio(Array.isArray(atual.itens) ? atual.itens : []);
        instalarListenersProducaoPatio();
        atualizarResumoNovaCubagemProducaoPatio();
        if (serrandoInput) serrandoInput.value = atual.serrando || '';
        const dataFmt = atual.data ? new Date(`${atual.data}T12:00:00`).toLocaleDateString('pt-BR') : '-';
        if (info) info.textContent = `Controle atual: ${dataFmt} ${atual.horario || ''} | ${atual.periodo || '-'}`;

        tbody.innerHTML = atual.itens.length ? atual.itens.map(item => `
            <tr>
                <td>${badgeClasseFluxo(item.classe)}</td>
                <td style="font-weight:800; color:${coresClasseFluxo(item.classe).color};">
                    ${formatCubagemFluxo(item)}
                    <small style="display:block; margin-top:3px; color:#94a3b8; font-size:0.72rem; font-weight:700;">${formatarResumoPacoteProducao(item)}</small>
                </td>
                <td style="font-weight:900; color:#60a5fa;">${item.pacotes || 0}</td>
                <td style="font-weight:900; color:var(--accent-color);">${formatDecimalMockup(item.volume || 0)} m³</td>
                <td style="text-align:center;">
                    ${botaoPacotePatio('remove', `window.alterarPacotesProducaoPatio('${item.id}', -1)`, 'Diminuir')}
                    ${botaoPacotePatio('add', `window.alterarPacotesProducaoPatio('${item.id}', 1)`, 'Adicionar')}
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; padding: 18px; color: var(--text-muted);">Sem cubagens neste controle.</td></tr>';
        atualizarResumoClassesProducaoPatio();
    } catch (error) {
        console.error('Erro na producao do patio:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 18px; color:#ef4444;">Erro ao carregar producao do patio.</td></tr>';
    }
}

window.alterarPacotesProducaoPatio = async function(id, delta) {
    if (window.__salvandoFluxoPatio) return;
    if (!producaoPatioRelatorioAtual) return;
    const item = (producaoPatioRelatorioAtual.itens || []).find(i => i.id === id);
    if (!item) return;

    window.__salvandoFluxoPatio = true;
    try {
        const novoPacotes = Math.max(0, (Number(item.pacotes) || 0) + delta);
        item.pacotes = novoPacotes;
        item.totalPecas = novoPacotes * (Number(item.pecas) || 0);
        item.volume = (Number(item.volumeUnidade) || 0) * novoPacotes;
        producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`${delta > 0 ? 'Adicionou' : 'Removeu'} pacote em ${formatCubagemFluxo(item)}`);
        await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
        await renderizarProducaoPatio();
    } catch (error) {
        console.error('Erro ao atualizar pacotes no fluxo do patio:', error);
        alert('Nao foi possivel atualizar os pacotes. Verifique a internet e a permissao de edicao deste usuario.');
    } finally {
        window.__salvandoFluxoPatio = false;
    }
};

window.salvarSerrandoProducaoPatio = async function() {
    if (!producaoPatioRelatorioAtual) return;
    const input = document.getElementById('producaoPatioSerrando');
    producaoPatioRelatorioAtual.serrando = (input?.value || '').toUpperCase().trim();
    producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio('Atualizou madeira sendo serrada');
    await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
    await renderizarProducaoPatio();
};

window.adicionarCubagemProducaoPatio = async function() {
    if (!producaoPatioRelatorioAtual) return;
    const classe = document.getElementById('prodPatioClasse')?.value || '1a CLASSE';
    const esp = parseDecimal(document.getElementById('prodPatioEsp')?.value);
    const larg = parseDecimal(document.getElementById('prodPatioLarg')?.value);
    const comp = parseDecimal(document.getElementById('prodPatioComp')?.value);
    const pacotes = parseInt(document.getElementById('prodPatioPacotes')?.value, 10) || 0;
    const alturas = parseInt(document.getElementById('prodPatioAlturas')?.value, 10) || 0;
    const larguraPacote = parseInt(document.getElementById('prodPatioLarguraPacote')?.value, 10) || 0;
    const amarras = parseInt(document.getElementById('prodPatioAmarras')?.value, 10) || 0;
    const resumoCubagem = calcularNovaCubagemProducaoPatio();
    const pecas = resumoCubagem.pecas;

    if (esp <= 0 || larg <= 0 || comp <= 0 || pacotes <= 0 || pecas <= 0) {
        alert('Preencha classe, cubagem, pacotes, alturas e largura do pacote.');
        return;
    }

    const volumeUnidade = (esp / 100) * (larg / 100) * comp * pecas;
    const dataRaw = producaoPatioRelatorioAtual.data || new Date().toISOString().slice(0, 10);
    const novoItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        dataRaw,
        dataFormatted: new Date(`${dataRaw}T12:00:00`).toLocaleDateString('pt-BR'),
        tipo: 'MADEIRA',
        classe,
        especie: 'EUCALIPTO',
        espessura: esp,
        largura: larg,
        comprimento: comp,
        pacotes,
        pecas,
        pecasRaw: `${alturas}x${larguraPacote}${amarras > 0 ? `+${amarras}` : ''}`,
        totalPecas: pacotes * pecas,
        volumeUnidade,
        volume: volumeUnidade * pacotes
    };

    producaoPatioRelatorioAtual.itens = [...(producaoPatioRelatorioAtual.itens || []), novoItem];
    producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`Adicionou nova cubagem ${formatCubagemFluxo(novoItem)}`);
    await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
    ['prodPatioEsp', 'prodPatioLarg', 'prodPatioComp', 'prodPatioAlturas', 'prodPatioLarguraPacote', 'prodPatioAmarras'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const amarrasInput = document.getElementById('prodPatioAmarras');
    if (amarrasInput) amarrasInput.value = '0';
    const pacotesInput = document.getElementById('prodPatioPacotes');
    if (pacotesInput) pacotesInput.value = '1';
    atualizarResumoNovaCubagemProducaoPatio();
    setFormProducaoPatioAberto(false);
    await renderizarProducaoPatio();
};

function formatarClasseFluxo(classe) {
    const numero = obterNumeroClasse(classe);
    return numero ? `${numero}&ordf;` : '-';
}

function badgeClasseFluxo(classe) {
    const label = formatarClasseFluxo(classe);
    const colors = coresClasseFluxo(classe);
    return `<span style="display:inline-flex; min-width:42px; justify-content:center; padding:5px 10px; border-radius:999px; font-weight:800; background:${colors.bg}; border:1px solid ${colors.border}; color:${colors.color};">${label}</span>`;
}

function coresClasseFluxo(classe) {
    const numero = obterNumeroClasse(classe);
    if (numero === 1) return { bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.45)', color: '#4ade80' };
    if (numero === 2) return { bg: 'rgba(234,179,8,0.16)', border: 'rgba(234,179,8,0.45)', color: '#facc15' };
    if (numero === 3) return { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.45)', color: '#f87171' };
    return { bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)', color: '#cbd5e1' };
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

function formatarResumoPacoteProducao(item) {
    const detalhes = obterDetalhesPacoteEtiqueta(item);
    const alturas = detalhes.alturas || 0;
    const largura = detalhes.largura || 0;
    const amarras = detalhes.amarras || 0;
    const total = detalhes.totalPecas || item.pecas || 0;
    return `(${alturas}x${largura})+${amarras} = ${total} pç`;
}

// Adicionar Item via FormulÃ¡rio
function obterDetalhesPacoteEtiqueta(item) {
    const raw = (item.pecasRaw || '').toString().trim();
    const detalhes = {
        alturas: '',
        largura: '',
        amarras: '',
        totalPecas: Number(item.pecas) || 0
    };

    if (raw.includes('x')) {
        const [base, amarras] = raw.split('+');
        const [alturas, largura] = base.split('x');
        detalhes.alturas = (alturas || '').trim();
        detalhes.largura = (largura || '').trim();
        detalhes.amarras = (amarras || '').trim();
    }

    if (!detalhes.alturas) detalhes.alturas = String(item.altura || item.alturas || '');
    if (!detalhes.largura) detalhes.largura = String(item.camada || item.larguraPacote || '');
    if (!detalhes.amarras) detalhes.amarras = String(item.amarras || '');
    if (!detalhes.totalPecas && detalhes.alturas && detalhes.largura) {
        detalhes.totalPecas = (Number(detalhes.alturas) || 0) * (Number(detalhes.largura) || 0) + (Number(detalhes.amarras) || 0);
    }

    return detalhes;
}

function obterClasseEtiqueta(classe) {
    const numero = obterNumeroClasse(classe);
    return numero ? `${numero}&ordf;` : '-';
}

function obterNumeroClasse(classe) {
    const valor = (classe || '').toString().toUpperCase();
    if (valor.includes('1')) return 1;
    if (valor.includes('2')) return 2;
    if (valor.includes('3')) return 3;
    return 0;
}

function obterUsuarioPatioAtual() {
    const user = auth?.currentUser || {};
    const nomeHeader = document.getElementById('userNameHeader')?.textContent?.trim();
    return window.App?.userName || nomeHeader || user.displayName || user.email || 'Usuario nao identificado';
}

function montarUltimaAlteracaoPatio(acao) {
    return {
        acao,
        usuario: obterUsuarioPatioAtual(),
        dataHora: new Date().toISOString()
    };
}

function botaoPacotePatio(tipo, onClick, title) {
    const isAdd = tipo === 'add';
    return `<button type="button" class="btn-pacote-touch" onclick="${onClick}" title="${title}" style="width:44px; height:44px; border-radius:10px; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-weight:900; font-size:1.08rem; color:#fff; background:${isAdd ? '#16a34a' : '#dc2626'}; box-shadow:0 6px 14px rgba(0,0,0,.18); touch-action:manipulation;">${isAdd ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-minus"></i>'}</button>`;
}

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
        alert("⚠️ Por favor, insira valores vÃ¡lidos e maiores que zero.");
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

// Ações dinÃ¢micas de incremento/decremento (+1 / -)
window.alterarPacotesPatio = async function(id, delta) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;

    const novoPacotes = item.pacotes + delta;
    if (novoPacotes < 0) {
        // Se for menor que zero, pergunta se deseja excluir
        if (await window.confirmarExclusaoComSenha("Deseja remover este lote da lista?")) {
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
window.removerLinhaPatio = async function(id) {
    if (await window.confirmarExclusaoComSenha("Deseja remover este lote?")) {
        itensPatioTemp = itensPatioTemp.filter(i => i.id !== id);
        renderizarItensPatioTemp();
    }
};

window.editarItemPatio = function(id) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;

    document.getElementById('patioItemTipo').value = item.tipo || 'TÃBUA';
    document.getElementById('patioItemClasse').value = item.classe || '1Âª CLASSE';
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

function ordenarItensPatio(lista) {
    return [...lista].sort((a, b) => {
        const classeA = obterNumeroClasse(a.classe) || 99;
        const classeB = obterNumeroClasse(b.classe) || 99;
        if (classeA !== classeB) return classeA - classeB;

        const compDiff = (Number(b.comprimento) || 0) - (Number(a.comprimento) || 0);
        if (compDiff !== 0) return compDiff;

        const espDiff = (Number(b.espessura) || 0) - (Number(a.espessura) || 0);
        if (espDiff !== 0) return espDiff;

        const largDiff = (Number(b.largura) || 0) - (Number(a.largura) || 0);
        if (largDiff !== 0) return largDiff;

        const pecasDiff = (Number(b.pecas) || 0) - (Number(a.pecas) || 0);
        if (pecasDiff !== 0) return pecasDiff;

        return String(a.id || '').localeCompare(String(b.id || ''));
    });
}

function ordenarItensPatioTemp() {
    itensPatioTemp = ordenarItensPatio(itensPatioTemp);
}

// Renderizar lista do pátio exatamente igual ao mockup
function renderizarItensPatioTemp() {
    const tbody = document.getElementById('listaItensPatioTemp');
    if (!tbody) return;

    ordenarItensPatioTemp();

    if (itensPatioTemp.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #64748b; padding: 30px; font-size: 0.9rem;">
                    Nenhum pacote na lista de pátio. Adicione ou configure os lotes acima.
                </td>
            </tr>
        `;
        atualizarConsolidatedStats();
        return;
    }

    let html = '';
    let ultimaChaveCubagem = '';
    itensPatioTemp.forEach(item => {
        // Tag badge da classe
        let classeBadge = '';
        const numeroClasse = obterNumeroClasse(item.classe);
        if (numeroClasse === 1) {
            classeBadge = `<span class="patio-tag-classe patio-tag-1a">1&ordf;</span>`;
        } else if (numeroClasse === 2) {
            classeBadge = `<span class="patio-tag-classe patio-tag-2a">2&ordf;</span>`;
        } else {
            classeBadge = `<span class="patio-tag-classe patio-tag-3a">3&ordf;</span>`;
        }

        const chaveCubagem = `${obterNumeroClasse(item.classe)}|${formatDecimal(item.espessura, 1)}|${formatDecimal(item.largura, 1)}|${formatDecimal(item.comprimento, 2)}`;
        const primeiraCubagem = chaveCubagem !== ultimaChaveCubagem;
        ultimaChaveCubagem = chaveCubagem;
        const classeHtml = primeiraCubagem ? classeBadge : '<span style="color:#e2e8f0; font-weight:900;">↳</span>';
        const corClasseCubagem = numeroClasse === 1 ? '#4ade80' : numeroClasse === 2 ? '#facc15' : '#f87171';
        const configTexto = `${formatarResumoPacoteProducao(item)} / ${formatDecimalMockup(item.volumeUnidade)} m³`;
        const medidasHtml = primeiraCubagem
            ? `
                <div style="font-weight:900; color:${corClasseCubagem}; font-size:1.05rem;">${formatDecimal(item.espessura, 1)} / ${formatDecimal(item.largura, 1)} / ${formatDecimal(item.comprimento, 2)}</div>
                <div style="display:grid; grid-template-columns:22px 1fr; align-items:center; column-gap:8px; margin-top:5px; color:#f8fafc; font-size:0.84rem; font-weight:900;">
                    <span style="text-align:center; color:#f8fafc;">*</span>
                    <span>${configTexto}</span>
                </div>`
            : `
                <div style="display:grid; grid-template-columns:22px 1fr; align-items:center; column-gap:8px; color:#f8fafc; font-size:0.84rem; font-weight:900;">
                    <span style="text-align:center; color:#f8fafc;">*</span>
                    <span>${configTexto}</span>
                </div>`;

        html += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; vertical-align: middle;">
                <!-- CLASSE -->
                <td style="padding: 14px 10px; text-align: left;">
                    ${classeHtml}
                </td>
                <!-- MEDIDAS + CONFIGURACAO DO PACOTE -->
                <td style="padding: 14px 10px; color: #0f172a; font-weight: bold; font-size: 0.92rem;">
                    ${medidasHtml}
                </td>
                <!-- PACOTES -->
                <td style="padding: 14px 10px; text-align: center;">
                    <div style="font-size: 1.15rem; font-weight: 900; color: #f8fafc;">${item.pacotes}</div>
                </td>
                <!-- TOTAL PECAS -->
                <td style="padding: 14px 10px; color: #f8fafc; text-align: center;">
                    <div style="font-weight: 900; color: #f8fafc;">${item.totalPecas || 0}</div>
                    <small style="color:#cbd5e1; font-size:0.72rem; font-weight:700;">pçs</small>
                </td>
                <!-- VOLUME TOTAL -->
                <td style="padding: 14px 10px; text-align: right;">
                    <div style="font-weight: 800; color: #16a34a; font-size: 1.05rem;">
                        <span style="color:#bbf7d0;">${formatDecimalMockup(item.volume)}</span>
                    </div>
                    <small style="color: #cbd5e1; font-size: 0.72rem;">(${formatDecimalMockup(item.volumeUnidade)}/un)</small>
                </td>
                <!-- AÃ‡Ã•ES (Mockup buttons) -->
                <td class="hide-on-print" style="padding: 14px 10px; text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        ${botaoPacotePatio('remove', `alterarPacotesPatio('${item.id}', -1)`, 'Diminuir Pacote')}
                        ${botaoPacotePatio('add', `alterarPacotesPatio('${item.id}', 1)`, 'Aumentar Pacote')}
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

// Atualizar estatÃ­sticas dos cards em tempo real
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
function atualizarEstadoEdicaoPatio() {
    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');
    if (!btnSalvar) return;

    if (relatorioPatioEditandoId) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar Lista do Pátio';
        btnSalvar.style.background = '#f59e0b';
        btnSalvar.style.color = '#111827';
    } else {
        btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Lançamento do Pátio';
        btnSalvar.style.background = '';
        btnSalvar.style.color = '';
    }
}

async function salvarRelatorioPatio() {
    if (itensPatioTemp.length === 0) {
        alert("⚠️ O pátio estÃ¡ vazio! Insira pelo menos um lote ou pacote para poder salvar.");
        return;
    }

    const dataVal = document.getElementById('patioData').value;
    const periodoVal = document.getElementById('patioPeriodo').value;
    const horarioVal = document.getElementById('patioHorario').value;
    const serrandoVal = document.getElementById('patioSerrando').value.toUpperCase().trim();

    if (!serrandoVal) {
        alert("⚠️ Por favor, digite qual madeira estÃ¡ sendo serrada no momento.");
        document.getElementById('patioSerrando').focus();
        return;
    }

    let totalPacotes = 0;
    let totalVolume = 0;
    let totalPecas = 0;
    const itensOrdenados = ordenarItensPatio(itensPatioTemp);

    itensOrdenados.forEach(item => {
        totalPacotes += item.pacotes;
        totalVolume += item.volume;
        totalPecas += item.totalPecas;
    });

    const relatorio = {
        data: dataVal,
        periodo: periodoVal,
        horario: horarioVal,
        serrando: serrandoVal,
        itens: itensOrdenados.map(item => ({ ...item })),
        totais: {
            totalVolume: totalVolume,
            totalPacotes: totalPacotes,
            totalPecas: totalPecas
        },
        atualizadoEm: new Date().toISOString()
    };

    if (!relatorioPatioEditandoId) {
        relatorio.criadoEm = new Date().toISOString();
    }

    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');
    const originalText = btnSalvar.innerHTML;
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';

    try {
        if (relatorioPatioEditandoId) {
            await updateDoc(doc(db, 'patio_relatorios', relatorioPatioEditandoId), relatorio);
            alert(`✅ Contagem do Pátio atualizada com sucesso!\nVolume Total: ${formatDecimalMockup(totalVolume)} m³.`);
            relatorioPatioEditandoId = null;
        } else {
            await window.FS.addDoc('patio_relatorios', relatorio);
            alert(`✅ Contagem do Pátio do período (${periodoVal}) salva com sucesso!\nVolume Total: ${formatDecimalMockup(totalVolume)} m³.`);
        }

        // Resetar rascunho
        document.getElementById('patioSerrando').value = '';
        itensPatioTemp = [];
        renderizarItensPatioTemp();
        atualizarEstadoEdicaoPatio();

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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b; padding: 15px;">Nenhuma contagem diÃ¡ria registrada ainda.</td></tr>';
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
                        <button type="button" onclick="baixarPdfHistoricoPatio('${rel.id}')" class="btn-patio-light" style="padding: 5px 12px !important; font-size: 0.72rem !important; border-radius: 6px !important; background: #ecfdf5 !important; border: 1px solid #86efac !important; color: #15803d !important;" title="Baixar PDF">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button type="button" onclick="enviarWhatsappHistoricoPatio('${rel.id}')" class="btn-patio-light" style="padding: 5px 12px !important; font-size: 0.72rem !important; border-radius: 6px !important; background: #dcfce7 !important; border: 1px solid #86efac !important; color: #16a34a !important;" title="Enviar WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
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
        atualizarAvisoUltimaAlteracaoPatio();
    } catch (error) {
        console.error("Erro ao carregar histórico do pátio:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Erro ao obter dados do pátio.</td></tr>';
    }
}

function atualizarAvisoUltimaAlteracaoPatio() {
    const aviso = document.getElementById('patioUltimaAlteracao');
    if (!aviso) return;
    const ultimo = historicoPatioAtuais?.[0]?.ultimaAlteracaoPatio;
    if (!ultimo) {
        aviso.style.display = 'none';
        aviso.textContent = '';
        return;
    }
    const quando = ultimo.dataHora ? new Date(ultimo.dataHora).toLocaleString('pt-BR') : '';
    aviso.style.display = 'block';
    aviso.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Última alteração no pátio: ${ultimo.acao || 'Atualizacao'} por ${ultimo.usuario || 'Usuario'}${quando ? ` em ${quando}` : ''}.`;
}

// Excluir registro do histórico
window.deletarHistoricoPatio = async function(id) {
    if (await window.confirmarExclusaoComSenha("Tem certeza absoluta que deseja excluir este relatorio de contagem do patio?")) {
        try {
            await deleteDoc(doc(db, 'patio_relatorios', id));
            alert("✅ Relatório de pátio excluÃ­do com sucesso!");
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
    window.patioDocActions.set(rel);
    gerarLayoutImpressaoPatio(rel);
};

window.visualizarHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    window.patioDocActions.set(rel);
    gerarLayoutImpressaoPatio(rel);
};

window.baixarPdfHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    window.patioDocActions.set(rel);
    window.patioDocActions.pdf();
};

window.enviarWhatsappHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    window.patioDocActions.set(rel);
    window.patioDocActions.whatsapp();
};

window.patioDocActions = {
    current: null,
    set(rel) {
        if (!rel) return;
        const itens = Array.isArray(rel.itens) ? rel.itens : [];
        const resumo = new Map();
        itens.forEach(i => {
            const classificacao = i.classe || i.classificacao || 'Sem classificacao';
            const cubagem = `${formatDecimal(i.espessura, 1)} x ${formatDecimal(i.largura, 1)} x ${formatDecimal(i.comprimento, 2)}`;
            const chave = `${classificacao}|${cubagem}`;
            const atual = resumo.get(chave) || { classificacao, cubagem, pacotes: 0, volume: 0 };
            atual.pacotes += Number(i.pacotes || 0);
            atual.volume += Number(i.volume || 0);
            resumo.set(chave, atual);
        });
        const linhas = Array.from(resumo.values()).map(item => `
            <tr>
                <td>${item.classificacao}</td>
                <td>${item.cubagem}</td>
                <td style="text-align:center;">${item.pacotes}</td>
                <td class="doc-total">${formatDecimalMockup(item.volume)} m³</td>
            </tr>
        `).join('');
        const dtStr = rel.data ? new Date(rel.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
        this.current = {
            title: `Resumo do Patio ${rel.data || ''}`,
            filename: `resumo-patio-${rel.data || rel.id || 'relatorio'}`,
            contentHtml: `
                <div class="doc-header"><div><img src="logo.png" alt="Serraria Vanmarte" class="doc-logo" onerror="this.style.display='none'"></div><div class="doc-title"><h1>Resumo da Contagem do Patio</h1><p>${dtStr} - ${rel.periodo || ''}</p></div></div>
                <div class="doc-grid"><div class="doc-card"><h3>Contagem</h3><p><strong>Horario:</strong> ${rel.horario || 'N/A'}</p><p><strong>Madeira:</strong> ${rel.serrando || 'N/A'}</p></div><div class="doc-card"><h3>Total geral</h3><p><strong>Pacotes:</strong> ${rel.totais?.totalPacotes || 0}</p><p><strong>Volume:</strong> <span class="doc-money">${formatDecimalMockup(rel.totais?.totalVolume || 0)} m³</span></p></div></div>
                <table class="doc-table"><thead><tr><th>Classificacao</th><th>Cubagem da madeira</th><th>Qtd. pacotes</th><th>Volume m³</th></tr></thead><tbody>${linhas}</tbody></table>`
        };
    },
    print() { if (this.current) window.DocActions.printHtml(this.current); },
    pdf() { if (this.current) window.DocActions.downloadPdf(this.current); },
    whatsapp() { if (this.current) window.DocActions.sendWhatsApp({ title: this.current.title, filename: this.current.filename, contentHtml: this.current.contentHtml, message: `Segue a ${this.current.title}.` }); }
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

    relatorioPatioEditandoId = id;
    itensPatioTemp = Array.isArray(rel.itens) ? rel.itens.map(item => ({ ...item })) : [];
    renderizarItensPatioTemp();
    atualizarEstadoEdicaoPatio();
    alert("Lancamento carregado para edicao. Ajuste os itens e salve novamente quando finalizar.");
};

function gerarEtiquetasAvulsasPatio() {
    const painel = document.getElementById('painelEtiquetaAvulsaPatio');
    if (!painel) return;
    painel.style.display = 'block';
    atualizarPreviewEtiquetaAvulsaPatio();
    painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharEtiquetaAvulsaPatio() {
    const painel = document.getElementById('painelEtiquetaAvulsaPatio');
    if (painel) painel.style.display = 'none';
}

function limparEtiquetaAvulsaPatio() {
    const campos = ['etqAvClassificacao', 'etqAvBitola1', 'etqAvBitola2', 'etqAvBitola3', 'etqAvAlturas', 'etqAvLargura', 'etqAvAmarras', 'etqAvTotalPecas', 'etqAvTotalM3'];
    campos.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    const produto = document.getElementById('etqAvProduto');
    if (produto) produto.value = 'Eucalipto';
    atualizarPreviewEtiquetaAvulsaPatio();
}

function calcularEtiquetaAvulsaPatio() {
    const esp = parseDecimal(obterCampoEtiquetaAvulsa('etqAvBitola1'));
    const larg = parseDecimal(obterCampoEtiquetaAvulsa('etqAvBitola2'));
    const comp = parseDecimal(obterCampoEtiquetaAvulsa('etqAvBitola3'));
    const alturas = parseInt(obterCampoEtiquetaAvulsa('etqAvAlturas'), 10) || 0;
    const larguraPacote = parseInt(obterCampoEtiquetaAvulsa('etqAvLargura'), 10) || 0;
    const amarras = parseInt(obterCampoEtiquetaAvulsa('etqAvAmarras'), 10) || 0;
    const pecas = alturas > 0 && larguraPacote > 0 ? (alturas * larguraPacote) + amarras : 0;
    const volumeUnidade = esp > 0 && larg > 0 && comp > 0 && pecas > 0 ? (esp / 100) * (larg / 100) * comp * pecas : 0;

    return { esp, larg, comp, alturas, larguraPacote, amarras, pecas, volumeUnidade };
}

function obterCampoEtiquetaAvulsa(id) {
    const el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
}

function coletarDadosEtiquetaAvulsaPatio() {
    const calculo = calcularEtiquetaAvulsaPatio();
    return {
        produto: obterCampoEtiquetaAvulsa('etqAvProduto') || 'Eucalipto',
        classificacao: obterCampoEtiquetaAvulsa('etqAvClassificacao'),
        bitola1: obterCampoEtiquetaAvulsa('etqAvBitola1'),
        bitola2: obterCampoEtiquetaAvulsa('etqAvBitola2'),
        bitola3: obterCampoEtiquetaAvulsa('etqAvBitola3'),
        alturas: obterCampoEtiquetaAvulsa('etqAvAlturas'),
        largura: obterCampoEtiquetaAvulsa('etqAvLargura'),
        amarras: obterCampoEtiquetaAvulsa('etqAvAmarras'),
        totalPecas: calculo.pecas ? String(calculo.pecas) : '',
        totalM3: calculo.volumeUnidade ? formatDecimalMockup(calculo.volumeUnidade) : '',
        calculo
    };
}

function montarItemEtiquetaAvulsaPatio() {
    const dados = coletarDadosEtiquetaAvulsaPatio();
    const { esp, larg, comp, alturas, larguraPacote, amarras, pecas, volumeUnidade } = dados.calculo;

    if (!dados.produto || !dados.classificacao || esp <= 0 || larg <= 0 || comp <= 0 || alturas <= 0 || larguraPacote <= 0 || pecas <= 0) {
        alert('Preencha produto, classificacao, bitolas, alturas e largura para adicionar a etiqueta.');
        return null;
    }

    const hoje = new Date();
    const dataRaw = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    return {
        id: `avulsa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dataRaw,
        dataFormatted: hoje.toLocaleDateString('pt-BR'),
        tipo: 'AVULSA',
        classe: dados.classificacao.toUpperCase(),
        especie: dados.produto.toUpperCase(),
        espessura: esp,
        largura: larg,
        comprimento: comp,
        pacotes: 1,
        pecas,
        pecasRaw: `${alturas}x${larguraPacote}${amarras > 0 ? `+${amarras}` : ''}`,
        altura: alturas,
        camada: larguraPacote,
        amarras,
        totalPecas: pecas,
        volumeUnidade,
        volume: volumeUnidade
    };
}

function adicionarEtiquetaAvulsaPatio() {
    const item = montarItemEtiquetaAvulsaPatio();
    if (!item) return;
    etiquetasAvulsasPatio.push(item);
    limparEtiquetaAvulsaPatio();
    renderizarFilaEtiquetasAvulsasPatio();
}

function escapeHtmlEtiquetaAvulsa(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function linhaEtiquetaAvulsa(valor, texto) {
    return `
        <div class="linha-etiqueta">
            <span class="linha-valor">${escapeHtmlEtiquetaAvulsa(valor)}</span>
            <span class="linha-seta">→</span>
            <span class="linha-texto">${texto}</span>
        </div>
    `;
}

function gerarHtmlEtiquetaAvulsaPatio(dados) {
    const bitolas = [dados.bitola1, dados.bitola2, dados.bitola3].map(escapeHtmlEtiquetaAvulsa);
    return `
        <div class="etiqueta-avulsa">
            <div class="etq-titulo">SERRARIA VANMARTE</div>
            <div class="etq-cidade">RIBEIRAO BRANCO - SP</div>
            <div class="etq-contato">E-mail: escritoriovanmarte@hotmail.com</div>
            <div class="etq-contato">Cel: (15) 99629-7072</div>
            <div class="etq-produto">
                <strong>Produto</strong> ${escapeHtmlEtiquetaAvulsa(dados.produto)}
                <strong>Classificacao</strong> ${escapeHtmlEtiquetaAvulsa(dados.classificacao)}
            </div>
            <div class="etq-bitolas"><strong>BITOLAS:</strong> <span>${bitolas[0]}</span> / <span>${bitolas[1]}</span> / <span>${bitolas[2]}</span></div>
            <div class="etq-linhas">
                ${linhaEtiquetaAvulsa(dados.alturas, 'ALTURAS&nbsp;&nbsp;&nbsp;&nbsp;(PECAS)')}
                ${linhaEtiquetaAvulsa(dados.largura, 'LARGURA&nbsp;&nbsp;&nbsp;&nbsp;(PECAS)')}
                ${linhaEtiquetaAvulsa(dados.amarras, 'AMARRAS PEZINHOS E MEIOS')}
                ${linhaEtiquetaAvulsa(dados.totalPecas, '<strong>TOTAL PECAS</strong>')}
                ${linhaEtiquetaAvulsa(dados.totalM3, '<strong>TOTAL MTS CUBICOS</strong>')}
            </div>
        </div>
    `;
}

function obterCssEtiquetaAvulsaPatio(incluirPagina = false) {
    return `
        ${incluirPagina ? 'body { margin:0; padding:0; background:#fff; font-family:Arial, Helvetica, sans-serif; }' : ''}
        .etiqueta-avulsa { width:265px; min-height:337px; box-sizing:border-box; border:1px solid #111; background:#fff; color:#000; padding:5px 0 8px; }
        .etq-titulo { text-align:center; font-size:21px; line-height:1.1; font-weight:900; letter-spacing:0; }
        .etq-cidade { text-align:center; font-size:16px; line-height:1.1; margin-top:1px; }
        .etq-contato { text-align:center; font-size:15px; line-height:1.08; white-space:nowrap; }
        .etq-produto { font-size:14px; line-height:1.15; margin-top:6px; padding:0 0 0 0; white-space:nowrap; }
        .etq-produto strong { font-weight:900; }
        .etq-bitolas { display:flex; align-items:flex-end; justify-content:center; gap:8px; font-size:22px; margin-top:8px; line-height:1; }
        .etq-bitolas strong { font-size:23px; font-weight:900; }
        .etq-bitolas span { min-width:28px; border-bottom:2px solid #111; display:inline-block; text-align:center; }
        .etq-linhas { margin-top:16px; }
        .linha-etiqueta { display:grid; grid-template-columns:52px 28px 1fr; align-items:end; min-height:31px; font-size:14px; }
        .linha-valor { border-bottom:2px solid #111; min-height:18px; padding-left:2px; font-size:15px; font-weight:700; }
        .linha-seta { text-align:center; font-size:18px; line-height:1; }
        .linha-texto { font-size:14px; line-height:1.05; white-space:nowrap; }
        @media print {
            @page { size:auto; margin:6mm; }
            body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
    `;
}

function atualizarPreviewEtiquetaAvulsaPatio() {
    const dados = coletarDadosEtiquetaAvulsaPatio();
    const totalPecas = document.getElementById('etqAvTotalPecas');
    const totalM3 = document.getElementById('etqAvTotalM3');
    if (totalPecas) totalPecas.value = dados.totalPecas;
    if (totalM3) totalM3.value = dados.totalM3;
    renderizarFilaEtiquetasAvulsasPatio();
}

function imprimirEtiquetaAvulsaPatio() {
    if (etiquetasAvulsasPatio.length === 0) {
        const itemAtual = montarItemEtiquetaAvulsaPatio();
        if (itemAtual) etiquetasAvulsasPatio.push(itemAtual);
    }
    if (etiquetasAvulsasPatio.length === 0) return;
    imprimirEtiquetasFisicas(etiquetasAvulsasPatio);
}

function removerEtiquetaAvulsaPatio(id) {
    etiquetasAvulsasPatio = etiquetasAvulsasPatio.filter(item => item.id !== id);
    renderizarFilaEtiquetasAvulsasPatio();
}

function renderizarFilaEtiquetasAvulsasPatio() {
    const preview = document.getElementById('previewEtiquetaAvulsaPatio');
    if (!preview) return;
    const dados = coletarDadosEtiquetaAvulsaPatio();
    const resumoAtual = dados.totalPecas
        ? `<div style="font-size:.84rem; color:#cbd5e1; margin-bottom:10px;">Atual: <strong style="color:#fff;">${dados.totalPecas} pecas</strong> | <strong style="color:#fff;">${dados.totalM3} m3</strong></div>`
        : '<div style="font-size:.84rem; color:#94a3b8; margin-bottom:10px;">Preencha as medidas para calcular pecas e volume.</div>';

    if (etiquetasAvulsasPatio.length === 0) {
        preview.innerHTML = `
            <strong style="display:block; margin-bottom:6px;">Etiquetas adicionadas</strong>
            ${resumoAtual}
            <div style="font-size:.86rem; color:#94a3b8;">Nenhuma etiqueta adicionada ainda. Preencha os campos e clique em Adicionar.</div>
        `;
        return;
    }

    const linhas = etiquetasAvulsasPatio.map((item, index) => `
        <div style="display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; padding:8px 0; border-top:1px solid rgba(255,255,255,.1);">
            <div style="font-size:.86rem;">
                <strong>${index + 1}. ${item.especie}</strong><br>
                <span style="color:#cbd5e1;">${formatDecimal(item.espessura, 1)} / ${formatDecimal(item.largura, 1)} / ${formatDecimal(item.comprimento, 2)} - ${item.pecas} pecas - ${formatDecimalMockup(item.volumeUnidade)} m3</span>
            </div>
            <button type="button" onclick="window.removerEtiquetaAvulsaPatio('${item.id}')" style="border:none; background:#ef4444; color:#fff; border-radius:6px; padding:6px 8px; cursor:pointer;">Excluir</button>
        </div>
    `).join('');

    preview.innerHTML = `
        <strong style="display:block; margin-bottom:6px;">Etiquetas adicionadas: ${etiquetasAvulsasPatio.length}</strong>
        ${resumoAtual}
        ${linhas}
    `;
}

window.removerEtiquetaAvulsaPatio = removerEtiquetaAvulsaPatio;

// Imprimir etiquetas fÃ­sicas (Mockup Circle Blue Action)
function imprimirEtiquetasFisicas(lista = itensPatioTemp) {
    if (!Array.isArray(lista)) {
        lista = itensPatioTemp;
    }

    if (lista.length === 0) {
        alert("⚠️ Não hÃ¡ pacotes listados para imprimir etiquetas! Lance pelo menos um pacote.");
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
    const telefoneSerraria = emitente.telefone || emitente.celular || "(15) 99629-7072";
    const emailSerraria = emitente.email || "escritoriovanmarte@hotmail.com";

    // Gerar etiquetas individuais por pacote fÃ­sico
    lista.forEach(item => {
        for (let p = 1; p <= item.pacotes; p++) {
            const zeroPaddedSerial = String(serialGlobal).padStart(3, '0');
            const uniqueId = `PCT-${item.dataRaw.replace(/-/g, '')}-${zeroPaddedSerial}`;
            const detalhesPacote = obterDetalhesPacoteEtiqueta(item);
            const classeEtiqueta = obterClasseEtiqueta(item.classe);
            
            let badgeStyle = '';
            const numeroClasse = obterNumeroClasse(item.classe);
            if (numeroClasse === 1) {
                badgeStyle = 'background:#16a34a; color:#fff;';
            } else if (numeroClasse === 2) {
                badgeStyle = 'background:#facc15; color:#111;';
            } else {
                badgeStyle = 'background:#dc2626; color:#fff;';
            }

            etiquetasHtml += `
                <div class="ticket-card">
                    <div class="ticket-header">
                        <div class="ticket-brand">VANMARTE</div>
                        <div class="ticket-city">SERRARIA - RIBEIRAO BRANCO - SP</div>
                    </div>
                    <div class="ticket-contact">${emailSerraria} - ${telefoneSerraria}</div>

                    <div class="ticket-product-row">
                        <div class="ticket-product">
                            <span>PRODUTO</span>
                            <strong>${item.especie || 'EUCALIPTO'}</strong>
                        </div>
                        <div class="ticket-class">
                            <span>CLASSE</span>
                            <strong class="ticket-badge" style="${badgeStyle}">${classeEtiqueta}</strong>
                        </div>
                    </div>

                    <div class="ticket-bitolas">
                        <span>BITOLAS</span>
                        <strong>${formatDecimal(item.espessura, 1)} / ${formatDecimal(item.largura, 1)} / ${formatDecimal(item.comprimento, 2)}</strong>
                    </div>

                    <div class="ticket-info-line"><strong>${detalhesPacote.alturas || '-'}</strong><span>ALTURAS</span><small>PEÇAS</small></div>
                    <div class="ticket-info-line"><strong>${detalhesPacote.largura || '-'}</strong><span>LARGURA</span><small>PEÇAS</small></div>
                    <div class="ticket-info-line"><strong>${detalhesPacote.amarras || '-'}</strong><span>AMARRAS</span><small></small></div>

                    <div class="ticket-totals">
                        <strong>${detalhesPacote.totalPecas || item.pecas || 0} PEÇAS</strong>
                        <strong>${formatDecimalMockup(item.volumeUnidade)} M³</strong>
                    </div>
                    <div class="ticket-footer">desenvolvido por Orquestra.cs - sistemas industrial personalizado</div>
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
            font-family: Arial, Helvetica, sans-serif;
            background: #f6f3ed;
            padding: 0.35cm;
            margin: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 0.22cm;
            align-items: flex-start;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .ticket-card {
            width: 7.5cm;
            height: 8.9cm;
            box-sizing: border-box;
            background: #fffdf8;
            border: 2px solid #111;
            border-radius: 8px;
            padding: 0.32cm;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            gap: 0.13cm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .ticket-header { background: #111; color: #fff; border-radius: 6px; padding: 7px 6px 6px; text-align: center; }
        .ticket-brand { font-weight: 900; font-size: 20px; line-height: 1; }
        .ticket-city { color: #f5c542; font-size: 8.6px; font-weight: 800; margin-top: 4px; }
        .ticket-contact { color: #222; font-size: 8.2px; text-align: center; line-height: 1.12; }
        .ticket-product-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; border-top: 1px solid #ddd5c7; padding-top: 7px; }
        .ticket-product, .ticket-class { display: flex; align-items: center; gap: 7px; }
        .ticket-product span, .ticket-class span { color: #555; font-size: 9.3px; font-weight: 800; }
        .ticket-product strong { color: #111; font-size: 12.8px; font-weight: 900; }
        .ticket-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 31px; min-height: 24px; border: 2px solid #111; border-radius: 5px; font-weight: 900; font-size: 13.5px; }
        .ticket-bitolas { background: #fff3f0; border: 1.5px solid #e32317; border-radius: 6px; padding: 6px 9px; }
        .ticket-bitolas span { display: block; color: #b9140c; font-size: 8.4px; font-weight: 900; margin-bottom: 3px; }
        .ticket-bitolas strong { display: block; color: #e32317; font-size: 16px; font-weight: 900; text-align: center; line-height: 1.05; }
        .ticket-info-line { min-height: 29px; display: grid; grid-template-columns: 48px 1fr 43px; align-items: center; gap: 7px; background: #fafafa; border: 1px solid #d8d8d8; border-radius: 5px; padding: 0 10px; }
        .ticket-info-line strong { color: #e32317; font-size: 17px; font-weight: 900; line-height: 1; }
        .ticket-info-line span { color: #111; font-size: 12px; font-weight: 900; }
        .ticket-info-line small { color: #555; font-size: 9px; font-weight: 800; text-align: right; }
        .ticket-totals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 1px; }
        .ticket-totals strong { min-height: 21px; border-radius: 4px; color: #fff; background: #111; display: flex; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 900; }
        .ticket-totals strong:last-child { background: #e32317; }
        .ticket-footer { margin-top: auto; text-align: center; color: #777; font-size: 6.8px; font-weight: 700; }
        @media print {
            @page { margin: 0.5cm; }
            body { background: #f6f3ed !important; padding: 0 !important; gap: 0.2cm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .ticket-card, .ticket-header, .ticket-bitolas, .ticket-info-line, .ticket-badge, .ticket-totals strong { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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

// Gerar layout de fechamento do pátio para impressÃ£o agrupado
function gerarLayoutImpressaoPatio(rel) {
    const dtObj = new Date(rel.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');

    const obterNumeroClasse = (item) => {
        const texto = String(item.classe || item.classificacao || '').trim();
        const match = texto.match(/[123]/);
        return match ? match[0] : 'sem-classe';
    };

    const itens = Array.isArray(rel.itens) ? rel.itens : [];
    const itens1 = itens.filter(i => obterNumeroClasse(i) === '1');
    const itens2 = itens.filter(i => obterNumeroClasse(i) === '2');
    const itens3 = itens.filter(i => obterNumeroClasse(i) === '3');
    const itensSemClasse = itens.filter(i => obterNumeroClasse(i) === 'sem-classe');

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
    const subSemClasse = calcularSubtotais(itensSemClasse);

    const win = window.open('', '_blank');
    
    win.document.write(`
<html>
<head>
    <title>Relatorio de Patio - Madeira Serrada</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            padding: 12px;
            margin: 0;
            line-height: 1.25;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .header-logo-img {
            max-height: 58px;
            max-width: 220px;
            display: block;
            object-fit: contain;
        }
        .meta-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 14px;
        }
        .meta-item {
            font-size: 15px;
        }
        .meta-item strong {
            color: #0f172a;
        }
        .class-section {
            margin-bottom: 14px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .class-header {
            padding: 10px 12px;
            font-weight: bold;
            font-size: 18px;
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
        .class-header-sem {
            background-color: #f1f5f9;
            color: #334155;
            border-bottom: 2px solid #64748b;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        th, td {
            padding: 9px 2px;
            text-align: center;
            font-size: 20px;
            border-bottom: 2px solid #e2e8f0;
            vertical-align: middle;
        }
        th {
            background: #e0f2fe;
            color: #075985;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 19px;
            border-bottom: 2px solid #38bdf8;
        }
        .num-col {
            text-align: center;
        }
        .qtd-col {
            text-align: center;
            font-weight: 800;
        }
        .vol-col {
            text-align: center;
            font-weight: bold;
            color: #15803d;
        }
        .classe-col {
            font-weight: 900;
            font-size: 20px;
        }
        .cubagem-col {
            font-weight: 800;
            color: #0f172a;
            white-space: nowrap;
            font-size: 20px;
            padding-right: 2px;
        }
        .config-col {
            font-size: 16px;
            color: #334155;
            font-weight: 900;
            white-space: nowrap;
            padding-left: 4px;
            padding-right: 4px;
        }
        .subtotal-row {
            background: #f0fdf4;
            font-size: 17px;
            font-weight: 900;
            color: #15803d;
        }
        .consolidated-card {
            background: #0f172a;
            color: #ffffff;
            border-radius: 8px;
            padding: 14px;
            margin-top: 18px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            text-align: center;
        }
        .consolidated-box {
            border-right: 1px solid #334155;
        }
        .consolidated-box:last-child {
            border-right: none;
        }
        .consolidated-title {
            font-size: 13px;
            text-transform: uppercase;
            color: #94a3b8;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .consolidated-val {
            font-size: 24px;
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
            @page { size: A4 portrait; margin: 8mm; }
            body { padding: 0; }
            .consolidated-card { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
            .class-header-1 { background-color: #eff6ff !important; color: #1e40af !important; -webkit-print-color-adjust: exact; }
            .class-header-2 { background-color: #fffbeb !important; color: #92400e !important; -webkit-print-color-adjust: exact; }
            .class-header-3 { background-color: #fef2f2 !important; color: #991b1b !important; -webkit-print-color-adjust: exact; }
            .class-header-sem { background-color: #f1f5f9 !important; color: #334155 !important; -webkit-print-color-adjust: exact; }
            tr, .class-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <img src="logo.png" alt="Serraria Vanmarte" class="header-logo-img" onerror="this.style.display='none'">
        </div>
        <div style="text-align: right;">
            <h2 style="margin: 0; color: #0f172a; font-size: 22px;">Contagem de Pátio</h2>
            <small style="color: #64748b; font-size: 14px;">Resumo de madeira serrada</small>
        </div>
    </div>

    <div class="meta-container">
        <div class="meta-item"><strong>Data da Contagem:</strong> ${dtStr}</div>
        <div class="meta-item"><strong>Turno / Período:</strong> ${rel.periodo}</div>
        <div class="meta-item"><strong>Horario da Contagem:</strong> ${rel.horario || 'N/A'}</div>
        <div class="meta-item"><strong>Madeira Serrando no Momento:</strong> <span style="color: #e67e22; font-weight: bold;">${rel.serrando || 'N/A'}</span></div>
    </div>
    `);

    // Construir tabelas por classe
    function gerarTabelaClasse(itens, classeName, headerClass, totalClasse) {
        if (itens.length === 0) return '';
        
        let rowsHtml = '';
        itens.forEach(i => {
            const classeTexto = classeName;
            rowsHtml += `
                <tr>
                    <td class="classe-col">${classeTexto}</td>
                    <td class="cubagem-col">${formatDecimal(i.espessura, 1)}/${formatDecimal(i.largura, 1)}/${formatDecimal(i.comprimento, 2)}</td>
                    <td class="vol-col">${formatDecimalMockup(i.volume)} m3</td>
                </tr>
            `;
        });

        return `
            <div class="class-section">
                <div class="class-header ${headerClass}">
                    <span>${classeName}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 31%;">Classe</th>
                            <th style="width: 34%;">Cubagem</th>
                            <th class="vol-col" style="width: 35%;">Vol m3</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr class="subtotal-row">
                            <td colspan="2">Subtotal ${classeName}</td>
                            <td class="vol-col">${formatDecimalMockup(totalClasse.volume)} m3</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    win.document.write(gerarTabelaClasse(itens1, '1a CLASSE', 'class-header-1', sub1));
    win.document.write(gerarTabelaClasse(itens2, '2a CLASSE', 'class-header-2', sub2));
    win.document.write(gerarTabelaClasse(itens3, '3a CLASSE', 'class-header-3', sub3));
    win.document.write(gerarTabelaClasse(itensSemClasse, 'SEM CLASSIFICACAO', 'class-header-sem', subSemClasse));

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
            <div class="consolidated-val" style="color: #16a34a;">${formatDecimalMockup(rel.totais.totalVolume)} m3</div>
        </div>
    </div>

    <div class="print-footer">
        <p>Relatorio emitido automaticamente pelo sistema da Serraria Vanmarte.</p>
        <p>Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
</body>
</html>
    `);

    win.document.close();
    win.print();
}
