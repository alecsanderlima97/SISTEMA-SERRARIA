import { db, auth, collection, addDoc, getDocs, doc, getDoc, deleteDoc, updateDoc, runTransaction } from './firebase-init.js';

// ---- MÓDULO DE CONTROLE DE PÁTIO & ETIQUETAS ----

let itensPatioTemp = [];
let historicoPatioAtuais = [];
let totaisSalvosHoje = { pacotes: 0, volume: 0 };
let relatorioPatioEditandoId = null;
let etiquetasAvulsasPatio = [];
let producaoPatioRelatorioAtual = null;
let resumoRomaneiosPatioCache = null;
let patioRelatoriosCacheEm = 0;
let patioRelatoriosPromise = null;
let romaneiosPatioCache = [];
let romaneiosPatioCacheEm = 0;
let romaneiosPatioPromise = null;
let resumoProducaoPatioIndice = 0;
let configuracoesMadeiraPatioCache = [];
let configuracoesMadeiraPatioCacheEm = 0;
let configuracoesMadeiraPatioPromise = null;
let sugestoesConfiguracaoPatio = {};
let itensPatioSelecionados = new Set();
let itensFluxoPatioSelecionados = new Set();
let itemPatioEditandoId = null;
const CACHE_PATIO_MS = 30000;

async function carregarRelatoriosPatioCache(force = false) {
    if (!force && historicoPatioAtuais.length && Date.now() - patioRelatoriosCacheEm < CACHE_PATIO_MS) {
        return historicoPatioAtuais;
    }
    if (patioRelatoriosPromise) return patioRelatoriosPromise;
    patioRelatoriosPromise = getDocs(collection(db, 'patio_relatorios')).then(querySnapshot => {
        const relatorios = [];
        querySnapshot.forEach(docSnap => relatorios.push({ id: docSnap.id, ...docSnap.data() }));
        relatorios.sort((a, b) => new Date(b.atualizadoEm || b.criadoEm || `${b.data}T${b.horario || '00:00'}`) - new Date(a.atualizadoEm || a.criadoEm || `${a.data}T${a.horario || '00:00'}`));
        historicoPatioAtuais = relatorios;
        patioRelatoriosCacheEm = Date.now();
        return relatorios;
    }).finally(() => {
        patioRelatoriosPromise = null;
    });
    return patioRelatoriosPromise;
}

async function carregarRomaneiosPatioCache(force = false) {
    if (!force && romaneiosPatioCacheEm && Date.now() - romaneiosPatioCacheEm < CACHE_PATIO_MS) {
        return romaneiosPatioCache;
    }
    if (romaneiosPatioPromise) return romaneiosPatioPromise;
    romaneiosPatioPromise = getDocs(collection(db, 'romaneios')).then(snap => {
        const lista = [];
        snap.forEach(docSnap => lista.push({ id: docSnap.id, ...docSnap.data() }));
        romaneiosPatioCache = lista;
        romaneiosPatioCacheEm = Date.now();
        return lista;
    }).finally(() => {
        romaneiosPatioPromise = null;
    });
    return romaneiosPatioPromise;
}

async function carregarConfiguracoesMadeiraPatio(force = false) {
    if (!force && configuracoesMadeiraPatioCacheEm && Date.now() - configuracoesMadeiraPatioCacheEm < CACHE_PATIO_MS) {
        return configuracoesMadeiraPatioCache;
    }
    if (configuracoesMadeiraPatioPromise) return configuracoesMadeiraPatioPromise;
    configuracoesMadeiraPatioPromise = getDocs(collection(db, 'produtos')).then(snap => {
        const lista = [];
        snap.forEach(docSnap => {
            const item = { id: docSnap.id, ...docSnap.data() };
            const alturas = Number(item.alturas || 0);
            const larguraPacote = Number(item.larguraPacote || item.camada || 0);
            const amarras = Number(item.amarras || 0);
            const pecasPorPacote = Number(item.pecasPorPacote || ((alturas > 0 && larguraPacote > 0) ? alturas * larguraPacote + amarras : 0));
            if (Number(item.espessura) > 0 && Number(item.largura) > 0 && Number(item.comprimentoVenda || item.comprimento) > 0 && pecasPorPacote > 0) {
                lista.push({
                    ...item,
                    alturas,
                    larguraPacote,
                    amarras,
                    pecasPorPacote,
                    comprimentoReferencia: Number(item.comprimentoVenda || item.comprimento || 0)
                });
            }
        });
        configuracoesMadeiraPatioCache = lista;
        configuracoesMadeiraPatioCacheEm = Date.now();
        return lista;
    }).finally(() => {
        configuracoesMadeiraPatioPromise = null;
    });
    return configuracoesMadeiraPatioPromise;
}

document.addEventListener('historicoUpdated', () => {
    romaneiosPatioCacheEm = 0;
    resumoRomaneiosPatioCache = null;
});

document.addEventListener('produtosUpdated', () => {
    configuracoesMadeiraPatioCacheEm = 0;
});

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

function dataAtualPatio() {
    const hj = new Date();
    const yyyy = hj.getFullYear();
    const mm = String(hj.getMonth() + 1).padStart(2, '0');
    const dd = String(hj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function horaAtualPatio() {
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, '0');
    const min = String(agora.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
}

function instalarSugestoesConfiguracaoPatio() {
    const grupos = [
        { origem: 'producao', ids: ['prodPatioEsp', 'prodPatioLarg', 'prodPatioComp'] },
        { origem: 'controle', ids: ['patioItemEsp', 'patioItemLarg', 'patioItemComp'] }
    ];

    grupos.forEach(grupo => {
        grupo.ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.dataset.configSugestaoListener === '1') return;
            el.dataset.configSugestaoListener = '1';
            el.addEventListener('input', () => {
                window.clearTimeout(el._configSugestaoTimer);
                el._configSugestaoTimer = window.setTimeout(() => sugerirConfiguracaoMadeiraPatio(grupo.origem), 180);
            });
            el.addEventListener('blur', () => sugerirConfiguracaoMadeiraPatio(grupo.origem));
        });
    });

    ['prodPatioAlturas', 'prodPatioLarguraPacote', 'prodPatioAmarras', 'patioItemAltura', 'patioItemCamada', 'patioItemAmarras'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.configManualListener === '1') return;
        el.dataset.configManualListener = '1';
        el.addEventListener('input', () => {
            if (document.activeElement === el) delete el.dataset.configAuto;
        });
    });
}

// Inicializar Eventos Safely (Independente do momento do carregamento do módulo ES)
function inicializarPatioListeners() {
    const btnAbrir = document.getElementById('btnAbrirControleProducao');
    const formAdicionar = document.getElementById('formAdicionarItemPatio');
    const btnZerar = document.getElementById('btnZerarEtiquetas');
    const btnLimparTudo = document.getElementById('btnLimparTudoPatio');
    const btnImprimirEtiquetas = document.getElementById('btnImprimirEtiquetas');
    const btnImprimirEtiquetasFisicas = document.getElementById('btnImprimirEtiquetasFisicas');
    const btnEtiquetasAvulsas = document.getElementById('btnEtiquetasAvulsasPatio');
    const btnFecharEtiquetaAvulsa = document.getElementById('btnFecharEtiquetaAvulsaPatio');
    const btnAdicionarEtiquetaAvulsa = document.getElementById('btnAdicionarEtiquetaAvulsaPatio');
    const btnImprimirEtiquetaAvulsa = document.getElementById('btnImprimirEtiquetaAvulsaPatio');
    const btnLimparEtiquetaAvulsa = document.getElementById('btnLimparEtiquetaAvulsaPatio');
    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');
    const btnResumo = document.getElementById('btnResumoProducaoPatio');
    const btnImportarFluxo = document.getElementById('btnImportarFluxoPatio');
    instalarSugestoesConfiguracaoPatio();

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
        btnImprimirEtiquetas.addEventListener('click', () => imprimirListaDetalhadaPatio());
    }
    if (btnImprimirEtiquetasFisicas) {
        btnImprimirEtiquetasFisicas.addEventListener('click', () => {
            const relatorioAtual = historicoPatioAtuais.find(item => item.id === relatorioPatioEditandoId)
                || historicoPatioAtuais.find(item => item.data === dataAtualPatio())
                || historicoPatioAtuais[0];
            const itens = itensPatioTemp.length ? itensPatioTemp : (relatorioAtual?.itens || []);
            const selecionados = obterItensPatioSelecionadosObrigatorio(itens, 'Selecione os pacotes que deseja imprimir como etiqueta.');
            if (!selecionados.length) return;
            selecionados.forEach(item => {
                item.etiquetado = true;
                item.etiquetadoEm = new Date().toISOString();
            });
            renderizarItensPatioTemp();
            imprimirEtiquetasFisicas(selecionados);
        });
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

    if (btnResumo) btnResumo.addEventListener('click', mostrarResumoProducaoPatio);
    if (btnImportarFluxo) btnImportarFluxo.addEventListener('click', importarFluxoPatioParaControleProducao);

    const selectClasse = document.getElementById('patioItemClasse');
    if (selectClasse) {
        atualizarCorSelectClasse(selectClasse);
        selectClasse.addEventListener('change', () => atualizarCorSelectClasse(selectClasse));
    }

    // Calculadora de Peças e volume do Pátio (Alt x Cam + Am)
    const calcInputs = document.querySelectorAll('.calc-patio');
    calcInputs.forEach(input => {
        input.addEventListener('input', calcularPecasPatio);
    });
    ['patioItemEsp', 'patioItemLarg', 'patioItemComp', 'patioItemPacotes', 'patioItemPecas'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', atualizarPreviewVolumeItemPatio);
    });
}

// Mantem o calculo reutilizavel para digitacao manual e sugestoes de configuracao.
function calcularPecasPatio() {
    const alt = parseInt(document.getElementById('patioItemAltura')?.value, 10) || 0;
    const cam = parseInt(document.getElementById('patioItemCamada')?.value, 10) || 0;
    const am = parseInt(document.getElementById('patioItemAmarras')?.value, 10) || 0;
    const patioPecas = document.getElementById('patioItemPecas');
    const total = (alt * cam) + am;
    if (patioPecas) patioPecas.value = total > 0 ? total : '';
    atualizarPreviewVolumeItemPatio();
}

function atualizarPreviewVolumeItemPatio() {
    const preview = document.getElementById('patioItemVolumePreview');
    if (!preview) return;
    const esp = parseDecimal(document.getElementById('patioItemEsp')?.value || '');
    const larg = parseDecimal(document.getElementById('patioItemLarg')?.value || '');
    const comp = parseDecimal(document.getElementById('patioItemComp')?.value || '');
    const pacotes = parseInt(document.getElementById('patioItemPacotes')?.value, 10) || 0;
    const pecas = parseInt(document.getElementById('patioItemPecas')?.value, 10) || 0;
    const volume = esp > 0 && larg > 0 && comp > 0 && pacotes > 0 && pecas > 0
        ? (esp / 100) * (larg / 100) * comp * pecas * pacotes
        : 0;
    preview.value = volume > 0 ? formatDecimalMockup(volume) : '';
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
    document.body.classList.add('modal-open');

    // Preencher Data e Hora Atuais por padrão
    const inputData = document.getElementById('patioData');
    const inputHorario = document.getElementById('patioHorario');
    const selectPeriodo = document.getElementById('patioPeriodo');

    const dataAtualString = dataAtualPatio();

    if (inputData) {
        inputData.value = dataAtualString;
    }

    if (inputHorario) {
        inputHorario.value = horaAtualPatio();
    }
    if (selectPeriodo) selectPeriodo.value = 'Atualizacao do dia';

    // Inicializar itens do pátio
    relatorioPatioEditandoId = null;
    itensPatioTemp = [];
    renderizarItensPatioTemp();
    atualizarEstadoEdicaoPatio();

    // Carregar histórico do Firebase e calcular acumulados de hoje
    await carregarHistoricoPatio();
    const relHoje = historicoPatioAtuais.find(rel => rel.data === dataAtualString);
    if (relHoje) {
        carregarRelatorioPatioNoFormulario(relHoje, relHoje.id);
    }
    atualizarAvisoUltimaAlteracaoPatio();
    await calcularAcumuladosHoje(dataAtualString);
};

// Fechar Modal do Pátio
window.fecharModalPatio = function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (modalPatio) {
        modalPatio.style.display = 'none';
    }
    document.body.classList.remove('modal-open');
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
    const relatorios = await carregarRelatoriosPatioCache();
    // Um relatorio vazio pode existir por abertura anterior da tela. Para o fluxo
    // operacional, priorizamos a ultima lista que realmente possui pacotes.
    return relatorios.find(relatorio => Array.isArray(relatorio.itens) && relatorio.itens.length > 0)
        || relatorios[0]
        || null;
}

async function garantirRelatorioProducaoPatioAtual() {
    if (producaoPatioRelatorioAtual?.id) return producaoPatioRelatorioAtual;

    producaoPatioRelatorioAtual = await carregarRelatorioPatioAtual();
    if (producaoPatioRelatorioAtual?.id) return producaoPatioRelatorioAtual;

    const dataHoje = dataAtualPatio();
    const novoRelatorio = {
        data: dataHoje,
        horario: horaAtualPatio(),
        periodo: 'Atualizacao do dia',
        serrando: '',
        itens: [],
        totais: { totalVolume: 0, totalPacotes: 0, totalPecas: 0 },
        ultimaAlteracaoPatio: montarUltimaAlteracaoPatio('Criou controle de producao do patio'),
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };
    const ref = await addDoc(collection(db, 'patio_relatorios'), novoRelatorio);
    producaoPatioRelatorioAtual = { id: ref.id, ...novoRelatorio };
    patioRelatoriosCacheEm = 0;
    return producaoPatioRelatorioAtual;
}

async function sincronizarRelatorioProducaoPatioAtual() {
    await garantirRelatorioProducaoPatioAtual();
    if (!producaoPatioRelatorioAtual?.id) return producaoPatioRelatorioAtual;

    try {
        const snap = await getDoc(doc(db, 'patio_relatorios', producaoPatioRelatorioAtual.id));
        if (snap.exists()) {
            producaoPatioRelatorioAtual = { id: snap.id, ...snap.data() };
        }
    } catch (error) {
        console.warn('Nao foi possivel sincronizar o relatorio do patio antes de adicionar.', error);
    }

    producaoPatioRelatorioAtual.itens = Array.isArray(producaoPatioRelatorioAtual.itens)
        ? producaoPatioRelatorioAtual.itens
        : [];
    return producaoPatioRelatorioAtual;
}

function selecionarClassePatio(selectClasse, classe) {
    if (!selectClasse) return;
    const numero = obterNumeroClasse(classe) || 1;
    const opcao = Array.from(selectClasse.options || []).find(option => obterNumeroClasse(option.value) === numero);
    selectClasse.value = opcao ? opcao.value : selectClasse.value;
    atualizarCorSelectClasse(selectClasse);
}

function destacarEdicaoPatio() {
    const card = document.getElementById('cardCadastroLotePatio');
    const form = document.getElementById('formAdicionarItemPatio');
    const alvo = card || form;
    if (!alvo) return;

    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alvo.classList.remove('patio-editando-pisca');
    void alvo.offsetWidth;
    alvo.classList.add('patio-editando-pisca');
    setTimeout(() => alvo.classList.remove('patio-editando-pisca'), 1800);
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
                <td>${badgeClasseFluxo(obterClasseItemFluxo(item))}</td>
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
        const classeNumero = obterNumeroClasse(obterClasseItemFluxo(item));
        const classe = classeNumero ? formatarClasseFluxo(classeNumero) : '-';
        if (!acc.porClasse[classe]) acc.porClasse[classe] = { volume: 0, pacotes: 0 };
        if (!acc.porClasseNumero[classeNumero]) acc.porClasseNumero[classeNumero] = { volume: 0, pacotes: 0 };
        acc.pacotes += Number(item.pacotes) || 0;
        acc.pecas += Number(item.totalPecas) || Number(item.pecas) || 0;
        acc.volume += Number(item.volume) || 0;
        acc.porClasse[classe].volume += Number(item.volume) || 0;
        acc.porClasse[classe].pacotes += Number(item.pacotes) || 0;
        acc.porClasseNumero[classeNumero].volume += Number(item.volume) || 0;
        acc.porClasseNumero[classeNumero].pacotes += Number(item.pacotes) || 0;
        return acc;
    }, { pacotes: 0, pecas: 0, volume: 0, porClasse: {}, porClasseNumero: {} });
}

function cardFluxoPatio(label, value, classe = null) {
    const colors = coresClasseFluxo(classe);
    const valueColor = classe ? colors.color : 'var(--text-color, #111827)';
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

function ehFluxoPatioOperacionalExclusivo() {
    const podeFluxo = usuarioPodeAcessarDashboardItem('fluxo-patio');
    const podeControle = usuarioPodeAcessarDashboardItem('controle-producao');
    const podeIndicadores = usuarioPodeAcessarDashboardItem('indicadores');
    return podeFluxo && !podeControle && !podeIndicadores;
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

    const somenteFluxoPatio = ehFluxoPatioOperacionalExclusivo();
    document.body.classList.toggle('dashboard-fluxo-patio-exclusivo', somenteFluxoPatio);

    const painelFluxo = document.getElementById('panelProducaoPatio');
    if (somenteFluxoPatio && painelFluxo?.style.display !== 'block') {
        // O operador inicia direto no seu fluxo, sem reabrir o painel a cada renderizacao.
        setTimeout(() => window.abrirProducaoPatio?.(), 0);
    }
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
    // O Fluxo do Patio abre sozinho na tela (sem pedacos do Inicio em volta) para qualquer usuario.
    document.body.classList.add('fluxo-patio-foco');
    setFormProducaoPatioAberto(ehFluxoPatioOperacionalExclusivo());
    aplicarPermissoesDashboardPatio();
    window.scrollTo({ top: 0, behavior: 'auto' });
    // Apenas abrir o Fluxo nao deve criar uma lista vazia nem substituir a lista ativa.
    if (!producaoPatioRelatorioAtual?.id) {
        producaoPatioRelatorioAtual = await carregarRelatorioPatioAtual();
    }
    await renderizarProducaoPatio();
};

function setFormProducaoPatioAberto(aberto) {
    const form = document.getElementById('formProducaoPatio');
    if (!form) return;
    form.dataset.aberto = aberto ? '1' : '0';
    form.style.display = aberto ? 'grid' : 'none';
}

function clonarItensParaDesfazer(itens = []) {
    return JSON.parse(JSON.stringify(itens));
}

function registrarDesfazerFluxoPatio(itensAnteriores, descricao) {
    window.registrarAcaoDesfazivel?.({
        descricao,
        desfazer: async () => {
            if (!producaoPatioRelatorioAtual) return;
            producaoPatioRelatorioAtual.itens = clonarItensParaDesfazer(itensAnteriores);
            itensFluxoPatioSelecionados.clear();
            producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio('Desfez a ultima alteracao no Fluxo do Patio');
            await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
            await renderizarProducaoPatio({ recarregar: false });
        }
    });
}

function registrarDesfazerListaPatio(itensAnteriores, descricao) {
    window.registrarAcaoDesfazivel?.({
        descricao,
        desfazer: () => {
            itensPatioTemp = clonarItensParaDesfazer(itensAnteriores);
            itemPatioEditandoId = null;
            renderizarItensPatioTemp();
        }
    });
}

window.fecharProducaoPatio = function() {
    setFormProducaoPatioAberto(false);
    document.body.classList.remove('fluxo-patio-foco');
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
    if (totalPecas) totalPecas.textContent = `${resumo.pecas || 0} pcs`;
    if (totalVolume) totalVolume.textContent = `${formatDecimalMockup(resumo.volume || 0)} m3`;
}

function obterCamposConfiguracaoPatio(origem = 'producao') {
    const prefixo = origem === 'controle' ? 'patioItem' : 'prodPatio';
    return {
        esp: document.getElementById(`${prefixo}${origem === 'controle' ? 'Esp' : 'Esp'}`),
        larg: document.getElementById(`${prefixo}${origem === 'controle' ? 'Larg' : 'Larg'}`),
        comp: document.getElementById(`${prefixo}${origem === 'controle' ? 'Comp' : 'Comp'}`),
        alturas: document.getElementById(origem === 'controle' ? 'patioItemAltura' : 'prodPatioAlturas'),
        larguraPacote: document.getElementById(origem === 'controle' ? 'patioItemCamada' : 'prodPatioLarguraPacote'),
        amarras: document.getElementById(origem === 'controle' ? 'patioItemAmarras' : 'prodPatioAmarras'),
        pecas: document.getElementById(origem === 'controle' ? 'patioItemPecas' : 'prodPatioTotalPecas'),
        sugestao: document.getElementById(origem === 'controle' ? 'patioItemConfigSugestao' : 'prodPatioConfigSugestao')
    };
}

function chaveCubagemConfiguracao(esp, larg, comp) {
    return [
        Number(esp || 0).toFixed(1),
        Number(larg || 0).toFixed(1),
        Number(comp || 0).toFixed(2)
    ].join('|');
}

function camposConfiguracaoVazios(campos) {
    return !Number(campos.alturas?.value || 0)
        && !Number(campos.larguraPacote?.value || 0)
        && !Number(campos.amarras?.value || 0);
}

function formatarConfiguracaoPadrao(config) {
    return `${config.alturas} x ${config.larguraPacote} + ${config.amarras || 0} = ${config.pecasPorPacote} pecas`;
}

function aplicarConfiguracaoPadraoPatio(origem, config) {
    const campos = obterCamposConfiguracaoPatio(origem);
    if (!campos.alturas || !campos.larguraPacote || !campos.amarras) return;
    campos.alturas.value = config.alturas || '';
    campos.larguraPacote.value = config.larguraPacote || '';
    campos.amarras.value = config.amarras || 0;
    campos.alturas.dataset.configAuto = '1';
    campos.larguraPacote.dataset.configAuto = '1';
    campos.amarras.dataset.configAuto = '1';
    if (origem === 'controle') calcularPecasPatio();
    else atualizarResumoNovaCubagemProducaoPatio();
}

window.usarConfiguracaoPadraoPatio = function(origem) {
    const config = sugestoesConfiguracaoPatio[origem];
    if (!config) return;
    aplicarConfiguracaoPadraoPatio(origem, config);
};

async function sugerirConfiguracaoMadeiraPatio(origem = 'producao') {
    const campos = obterCamposConfiguracaoPatio(origem);
    if (!campos.esp || !campos.larg || !campos.comp || !campos.sugestao) return;
    const esp = parseDecimal(campos.esp.value);
    const larg = parseDecimal(campos.larg.value);
    const comp = parseDecimal(campos.comp.value);
    if (esp <= 0 || larg <= 0 || comp <= 0) {
        campos.sugestao.innerHTML = '';
        campos.sugestao.hidden = true;
        return;
    }

    const chave = chaveCubagemConfiguracao(esp, larg, comp);
    const configuracoes = await carregarConfiguracoesMadeiraPatio();
    const encontrada = configuracoes.find(item => chaveCubagemConfiguracao(item.espessura, item.largura, item.comprimentoReferencia) === chave);

    if (!encontrada) {
        campos.sugestao.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>Nenhuma configuracao padrao encontrada no Cadastro de Medidas para esta cubagem.</span>';
        campos.sugestao.hidden = false;
        delete sugestoesConfiguracaoPatio[origem];
        return;
    }

    sugestoesConfiguracaoPatio[origem] = encontrada;
    const texto = formatarConfiguracaoPadrao(encontrada);
    campos.sugestao.innerHTML = `
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>Padrao encontrado: <strong>${texto}</strong></span>
        <button type="button" onclick="window.usarConfiguracaoPadraoPatio('${origem}')">Usar</button>
    `;
    campos.sugestao.hidden = false;

    if (camposConfiguracaoVazios(campos) || campos.alturas.dataset.configAuto === '1') {
        aplicarConfiguracaoPadraoPatio(origem, encontrada);
    }
}

function instalarListenersProducaoPatio() {
    instalarSugestoesConfiguracaoPatio();
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
    container.innerHTML = Object.entries(totais.porClasse).map(([classe, total]) => cardFluxoPatio(`Classe ${classe}`, `${total.pacotes} pacotes | ${formatDecimalMockup(total.volume)} m3`, classe)).join('');
}

async function obterResumoRomaneiosPatio() {
    if (resumoRomaneiosPatioCache) return resumoRomaneiosPatioCache;
    const resumo = { totalPacotes: 0, porClasse: {} };
    try {
        const romaneios = await carregarRomaneiosPatioCache();
        romaneios.forEach(rom => {
            (rom.pacotes || []).forEach(p => {
                const classe = obterNumeroClasse(p.qualidade || p.classe) || 0;
                const qtd = Number(p.qtdPacotes || p.pacotes || 0);
                resumo.totalPacotes += qtd;
                if (!resumo.porClasse[classe]) resumo.porClasse[classe] = 0;
                resumo.porClasse[classe] += qtd;
            });
        });
    } catch (error) {
        console.warn('Nao foi possivel carregar resumo de romaneios:', error);
    }
    resumoRomaneiosPatioCache = resumo;
    return resumo;
}

async function atualizarResumoFluxoPatioCompleto() {
    const container = document.getElementById('resumoProducaoPatioClasses');
    if (!container || !producaoPatioRelatorioAtual) return;
    const totais = calcularTotaisFluxoPatio(producaoPatioRelatorioAtual.itens || []);
    const numerosClasse = Array.from(new Set([
        1,
        2,
        3,
        ...Object.keys(totais.porClasseNumero).map(Number).filter(Boolean)
    ])).sort((a, b) => a - b);
    const cards = [
        cardFluxoPatio('Total no patio', `${totais.pacotes || 0} pacotes | ${formatDecimalMockup(totais.volume || 0)} m3`),
        ...numerosClasse.map(numero => {
            const total = totais.porClasseNumero[numero] || { pacotes: 0, volume: 0 };
            return cardFluxoPatio(`${numero}a Classe patio`, `${total.pacotes || 0} pacotes | ${formatDecimalMockup(total.volume || 0)} m3`, `${numero}a CLASSE`);
        })
    ];
    container.innerHTML = cards.join('');

    const resumoMobile = document.getElementById('producaoPatioResumoMobile');
    if (resumoMobile) {
        const itens = (producaoPatioRelatorioAtual.itens || []).length;
        resumoMobile.innerHTML = `
            <div><b>${totais.pacotes || 0}</b><span>Pacotes</span></div>
            <div><b>${formatDecimalMockup(totais.volume || 0, 2)} m³</b><span>Volume</span></div>
            <div><b>${itens}</b><span>Itens</span></div>`;
    }
}

function atualizarStatusProducaoPatio(relatorio) {
    const status = document.getElementById('producaoPatioUltimaAlteracao');
    if (!status) return;
    const ultimo = relatorio?.ultimaAlteracaoPatio;
    if (!ultimo) {
        status.style.display = 'none';
        status.textContent = '';
        return;
    }
    const quando = ultimo.dataHora ? new Date(ultimo.dataHora).toLocaleString('pt-BR') : '';
    status.style.display = 'inline-flex';
    status.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${ultimo.acao || 'Atualizacao'} por ${ultimo.usuario || 'Usuario'}${quando ? ` em ${quando}` : ''}`;
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
    // Grava so se o patio nao mudou no banco desde que esta tela leu (ex.: um romaneio baixou
    // pacotes ou outro aparelho lancou). Se mudou, recarrega em vez de sobrescrever.
    const ref = doc(db, 'patio_relatorios', relatorio.id);
    const versaoLida = relatorio.atualizadoEm || null;
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(ref);
            const versaoBanco = snap.exists() ? (snap.data().atualizadoEm || null) : null;
            if (versaoLida && versaoBanco && versaoBanco !== versaoLida) {
                const conflito = new Error('PATIO_ALTERADO');
                conflito.code = 'PATIO_ALTERADO';
                throw conflito;
            }
            transaction.update(ref, dados);
        });
    } catch (error) {
        if (error?.code === 'PATIO_ALTERADO') {
            patioRelatoriosCacheEm = 0;
            alert('O patio foi alterado por outro lancamento (romaneio ou outro aparelho) enquanto esta tela estava aberta. A lista foi atualizada; confira e refaca a ultima acao.');
            try { await renderizarProducaoPatio({ recarregar: true }); } catch (_) {}
            error.avisado = true;
        }
        throw error;
    }
    producaoPatioRelatorioAtual = { id: relatorio.id, ...dados };
    patioRelatoriosCacheEm = 0;
}

async function renderizarProducaoPatio(options = {}) {
    const recarregar = options.recarregar !== false;
    const tbody = document.getElementById('producaoPatioLista');
    const info = document.getElementById('producaoPatioInfo');
    const serrandoInput = document.getElementById('producaoPatioSerrando');
    if (!tbody) return;

    if (recarregar) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 18px;"><span class="saw-loader" aria-hidden="true"></span> Carregando producao do patio...</td></tr>';
    }

    try {
        if (recarregar || !producaoPatioRelatorioAtual) {
            producaoPatioRelatorioAtual = await carregarRelatorioPatioAtual();
        }
        const atual = producaoPatioRelatorioAtual;
        if (!atual) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 18px; color: var(--text-muted);">Nenhum controle de producao salvo ainda.</td></tr>';
            if (info) info.textContent = 'Faca a primeira contagem no Controle de Producao.';
            atualizarStatusProducaoPatio(null);
            return;
        }

        atual.itens = ordenarItensPatio(Array.isArray(atual.itens) ? atual.itens : []);
        itensFluxoPatioSelecionados = new Set([...itensFluxoPatioSelecionados].filter(id => atual.itens.some(item => item.id === id)));
        instalarListenersProducaoPatio();
        atualizarResumoNovaCubagemProducaoPatio();
        if (serrandoInput) serrandoInput.value = atual.serrando || '';
        const dataFmt = atual.data ? new Date(`${atual.data}T12:00:00`).toLocaleDateString('pt-BR') : '-';
        if (info) info.textContent = `Controle atual: ${dataFmt} ${atual.horario || ''} | ${atual.periodo || '-'}`;
        atualizarStatusProducaoPatio(atual);

        let ultimaChaveCubagemFluxo = '';
        tbody.innerHTML = atual.itens.length ? atual.itens.map(item => {
            const classeItem = obterClasseItemFluxo(item);
            const corClasse = coresClasseFluxo(classeItem).color;
            const chaveCubagem = `${obterNumeroClasse(classeItem)}|${formatDecimal(item.espessura, 1)}|${formatDecimal(item.largura, 1)}|${formatDecimal(item.comprimento, 2)}`;
            const primeiraCubagem = chaveCubagem !== ultimaChaveCubagemFluxo;
            ultimaChaveCubagemFluxo = chaveCubagem;
            const classeHtml = primeiraCubagem
                ? badgeClasseFluxo(classeItem)
                : '<span style="color:#334155; font-weight:900;">*</span>';
            const cubagemHtml = primeiraCubagem
                ? `<div style="font-weight:900; color:${corClasse} !important; display:flex; align-items:center; gap:6px;">${formatCubagemFluxo(item)}<button type="button" class="btn-fluxo-mais-cubagem" onclick="window.novoPacoteMesmaCubagemProducaoPatio('${item.id}')" title="Adicionar pacote com esta cubagem e classe" aria-label="Adicionar pacote com esta cubagem">+</button></div>
                   <small style="display:block; margin-top:3px; color:#334155; font-size:0.74rem; font-weight:800;">* ${formatarResumoPacoteProducao(item)}</small>`
                : `<small style="display:block; color:#334155; font-size:0.78rem; font-weight:900;">* ${formatarResumoPacoteProducao(item)}</small>`;
            return `
            <tr class="fluxo-patio-row-areia ${itensFluxoPatioSelecionados.has(item.id) ? 'is-selected' : ''}" data-fluxo-patio-id="${item.id}">
                <td class="hide-on-print fluxo-patio-selection-cell" data-mobile-label="Selecionar"><input type="checkbox" ${itensFluxoPatioSelecionados.has(item.id) ? 'checked' : ''} onchange="window.toggleSelecionarItemFluxoPatio('${item.id}', this.checked)" title="Selecionar lote"></td>
                <td data-mobile-label="Classe">${classeHtml}</td>
                <td class="fluxo-patio-cubagem" data-mobile-label="Cubagem">
                    ${cubagemHtml}
                </td>
                <td class="fluxo-patio-numero" data-mobile-label="Pacotes" style="font-weight:900; color:#1d4ed8;">${item.pacotes || 0}</td>
                <td class="fluxo-patio-numero" data-mobile-label="Volume" style="font-weight:900; color:#047857;">${formatDecimalMockup(item.volume || 0)} m3</td>
                <td data-mobile-label="Acoes" style="text-align:center;">
                    ${botaoPacotePatio('remove', `window.alterarPacotesProducaoPatio('${item.id}', -1, this)`, 'Diminuir')}
                    ${botaoPacotePatio('add', `window.alterarPacotesProducaoPatio('${item.id}', 1, this)`, 'Adicionar')}
                    <button type="button" class="btn-fluxo-editar" onclick="window.editarCubagemProducaoPatio('${item.id}')" title="Editar este pacote e sua configuracao">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="btn-fluxo-excluir" onclick="window.excluirCubagemProducaoPatio('${item.id}')" title="Excluir cubagem">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `}).join('') : '<tr><td colspan="6" style="text-align:center; padding: 18px; color: var(--text-muted);">Sem cubagens neste controle.</td></tr>';
        atualizarResumoSelecaoFluxoPatio();
        renderizarCardsProducaoPatio(atual.itens);
        await atualizarResumoFluxoPatioCompleto();
    } catch (error) {
        console.error('Erro na producao do patio:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 18px; color:#ef4444;">Erro ao carregar producao do patio.</td></tr>';
    }
}

function animarAlteracaoFluxoPatio(origem, id, tipo) {
    const origemRect = origem?.left !== undefined ? origem : origem?.getBoundingClientRect?.();
    if (!origemRect) return;
    const destino = document.querySelector(`[data-fluxo-patio-id="${id}"]`);
    if (!destino) return;
    const destinoRect = destino.getBoundingClientRect();
    const centroOrigemX = origemRect.left + (origemRect.width / 2);
    const centroOrigemY = origemRect.top + (origemRect.height / 2);
    const centroDestinoX = destinoRect.left + (destinoRect.width * .58);
    const centroDestinoY = destinoRect.top + (destinoRect.height / 2);
    const ghost = document.createElement('div');
    ghost.className = `fluxo-patio-package-ghost is-${tipo}`;
    ghost.innerHTML = `<i class="fa-solid fa-${tipo === 'add' ? 'box' : 'box-open'}"></i><span>${tipo === 'add' ? 'Adicionado' : 'Removido'}</span>`;
    ghost.style.left = `${centroOrigemX - 58}px`;
    ghost.style.top = `${centroOrigemY - 16}px`;
    ghost.style.setProperty('--move-x', `${centroDestinoX - centroOrigemX}px`);
    ghost.style.setProperty('--move-y', `${centroDestinoY - centroOrigemY}px`);
    document.body.appendChild(ghost);
    destino.classList.remove('fluxo-patio-row-flash');
    void destino.offsetWidth;
    destino.classList.add('fluxo-patio-row-flash');
    setTimeout(() => ghost.remove(), 860);
}

function atualizarResumoSelecaoFluxoPatio() {
    const itens = (producaoPatioRelatorioAtual?.itens || []).filter(item => itensFluxoPatioSelecionados.has(item.id));
    const resumo = itens.reduce((acc, item) => {
        acc.lotes += 1;
        acc.pacotes += Number(item.pacotes) || 0;
        acc.volume += Number(item.volume) || 0;
        return acc;
    }, { lotes: 0, pacotes: 0, volume: 0 });
    const label = document.getElementById('fluxoPatioSelecaoResumo');
    const selecionarTodos = document.getElementById('fluxoPatioSelecionarTodos');
    const editar = document.getElementById('btnEditarSelecionadosFluxoPatio');
    const excluir = document.getElementById('btnExcluirSelecionadosFluxoPatio');
    const totalItens = producaoPatioRelatorioAtual?.itens?.length || 0;
    if (label) label.textContent = resumo.lotes
        ? `${resumo.lotes} lote(s) | ${resumo.pacotes} pacote(s) | ${formatDecimalMockup(resumo.volume)} m³`
        : 'Nenhum lote selecionado';
    if (selecionarTodos) {
        selecionarTodos.checked = totalItens > 0 && resumo.lotes === totalItens;
        selecionarTodos.indeterminate = resumo.lotes > 0 && resumo.lotes < totalItens;
    }
    const gruposSelecionados = new Set(itens.map(chaveGrupoCubagemPatio));
    if (editar) {
        editar.disabled = resumo.lotes === 0 || gruposSelecionados.size !== 1;
        editar.title = gruposSelecionados.size > 1
            ? 'Selecione uma unica cubagem e suas ramificacoes para editar em grupo'
            : 'Editar a cubagem selecionada';
    }
    if (excluir) excluir.disabled = resumo.lotes === 0;
}

window.toggleSelecionarItemFluxoPatio = function(id, checked) {
    if (checked) itensFluxoPatioSelecionados.add(id);
    else itensFluxoPatioSelecionados.delete(id);
    document.querySelectorAll(`[data-fluxo-patio-id="${id}"]`).forEach(linha => {
        linha.classList.toggle('is-selected', checked);
        const caixa = linha.querySelector('input[type="checkbox"]');
        if (caixa) caixa.checked = checked;
    });
    atualizarResumoSelecaoFluxoPatio();
};

window.selecionarTodosFluxoPatio = function(checked) {
    const itens = producaoPatioRelatorioAtual?.itens || [];
    itensFluxoPatioSelecionados = checked ? new Set(itens.map(item => item.id)) : new Set();
    renderizarProducaoPatio({ recarregar: false });
};

window.excluirSelecionadosFluxoPatio = async function() {
    const itens = producaoPatioRelatorioAtual?.itens || [];
    const ids = new Set([...itensFluxoPatioSelecionados].filter(id => itens.some(item => item.id === id)));
    if (!ids.size) return;
    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir ${ids.size} lote(s) selecionado(s) do Fluxo do Patio?`);
    if (!autorizado) return;
    const itensAnteriores = clonarItensParaDesfazer(itens);
    producaoPatioRelatorioAtual.itens = itens.filter(item => !ids.has(item.id));
    itensFluxoPatioSelecionados.clear();
    producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`Excluiu ${ids.size} lote(s) selecionado(s) do Fluxo do Patio`);
    await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
    await renderizarProducaoPatio({ recarregar: false });
    registrarDesfazerFluxoPatio(itensAnteriores, `${ids.size} lote(s) excluido(s) do Fluxo do Patio.`);
};

window.limparTudoFluxoPatio = async function() {
    const itens = producaoPatioRelatorioAtual?.itens || [];
    if (!itens.length) return;
    const autorizado = await window.confirmarExclusaoComSenha('Deseja limpar todos os lotes do Fluxo do Patio? Voce podera desfazer esta acao por alguns segundos.');
    if (!autorizado) return;
    const itensAnteriores = clonarItensParaDesfazer(itens);
    producaoPatioRelatorioAtual.itens = [];
    itensFluxoPatioSelecionados.clear();
    producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio('Limpou todos os lotes do Fluxo do Patio');
    await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
    await renderizarProducaoPatio({ recarregar: false });
    registrarDesfazerFluxoPatio(itensAnteriores, 'Lista do Fluxo do Patio limpa.');
};

window.alterarPacotesProducaoPatio = async function(id, delta, origem = null) {
    if (window.__salvandoFluxoPatio) return;
    if (!producaoPatioRelatorioAtual) return;
    const origemRect = origem?.getBoundingClientRect?.();
    const item = (producaoPatioRelatorioAtual.itens || []).find(i => i.id === id);
    if (!item) return;
    const itensAnteriores = clonarItensParaDesfazer(producaoPatioRelatorioAtual.itens || []);

    window.__salvandoFluxoPatio = true;
    try {
        const novoPacotes = Math.max(0, (Number(item.pacotes) || 0) + delta);
        item.pacotes = novoPacotes;
        item.totalPecas = novoPacotes * (Number(item.pecas) || 0);
        item.volume = (Number(item.volumeUnidade) || 0) * novoPacotes;
        producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`${delta > 0 ? 'Adicionou' : 'Removeu'} pacote em ${formatCubagemFluxo(item)}`);
        await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
        await renderizarProducaoPatio({ recarregar: false });
        animarAlteracaoFluxoPatio(origemRect || origem, id, delta > 0 ? 'add' : 'remove');
        registrarDesfazerFluxoPatio(itensAnteriores, `${delta > 0 ? 'Pacote adicionado' : 'Pacote removido'} no Fluxo do Patio.`);
    } catch (error) {
        console.error('Erro ao atualizar pacotes no fluxo do patio:', error);
        if (!error?.avisado) alert('Nao foi possivel atualizar os pacotes. Verifique a internet e a permissao de edicao deste usuario.');
    } finally {
        window.__salvandoFluxoPatio = false;
    }
};

window.novoPacoteMesmaCubagemProducaoPatio = function(id) {
    if (!producaoPatioRelatorioAtual) return;
    const item = (producaoPatioRelatorioAtual.itens || []).find(i => i.id === id);
    if (!item) return;

    // Preenche o formulario com a cubagem e a classe do grupo. A configuracao do pacote (alturas, largura, amarras) fica para a pessoa informar.
    document.getElementById('prodPatioClasse').value = item.classe || '1a CLASSE';
    document.getElementById('prodPatioEsp').value = formatDecimal(item.espessura, 1);
    document.getElementById('prodPatioLarg').value = formatDecimal(item.largura, 1);
    document.getElementById('prodPatioComp').value = formatDecimal(item.comprimento, 2);
    document.getElementById('prodPatioPacotes').value = 1;
    document.getElementById('prodPatioAlturas').value = '';
    document.getElementById('prodPatioLarguraPacote').value = '';
    document.getElementById('prodPatioAmarras').value = 0;

    setFormProducaoPatioAberto(true);
    atualizarResumoNovaCubagemProducaoPatio();
    document.getElementById('prodPatioAlturas')?.focus();
};

window.editarCubagemProducaoPatio = function(id) {
    if (!producaoPatioRelatorioAtual) return;
    const item = (producaoPatioRelatorioAtual.itens || []).find(i => i.id === id);
    if (!item) return;

    const config = parseConfigPacote(item.pecasRaw);
    document.getElementById('prodPatioClasse').value = item.classe || '1a CLASSE';
    document.getElementById('prodPatioEsp').value = formatDecimal(item.espessura, 1);
    document.getElementById('prodPatioLarg').value = formatDecimal(item.largura, 1);
    document.getElementById('prodPatioComp').value = formatDecimal(item.comprimento, 2);
    document.getElementById('prodPatioPacotes').value = item.pacotes || 1;
    document.getElementById('prodPatioAlturas').value = config.alt || '';
    document.getElementById('prodPatioLarguraPacote').value = config.cam || '';
    document.getElementById('prodPatioAmarras').value = config.am || 0;

    producaoPatioRelatorioAtual.itens = (producaoPatioRelatorioAtual.itens || []).filter(i => i.id !== id);
    setFormProducaoPatioAberto(true);
    atualizarResumoNovaCubagemProducaoPatio();
    document.getElementById('prodPatioEsp')?.focus();
};

// Visao mobile do Fluxo do Patio: uma lista por classe (1a, depois 2a, depois 3a) e, dentro de cada
// classe, um card por cubagem da maior para a menor (mesma regra de ordenarItensPatio: comprimento,
// espessura e largura decrescentes). Usa os mesmos dados e funcoes de acao da tabela (desktop).
function renderizarCardsProducaoPatio(itens) {
    const box = document.getElementById('producaoPatioCards');
    if (!box) return;
    if (!Array.isArray(itens) || !itens.length) {
        box.innerHTML = '<p class="fluxo-patio-cards-vazio">Sem cubagens neste controle.</p>';
        return;
    }

    const classes = new Map();
    ordenarItensPatio(itens).forEach(item => {
        const numero = obterNumeroClasse(obterClasseItemFluxo(item)) || 0;
        if (!classes.has(numero)) classes.set(numero, new Map());
        const cubagens = classes.get(numero);
        const chave = `${formatDecimal(item.espessura, 1)}|${formatDecimal(item.largura, 1)}|${formatDecimal(item.comprimento, 2)}`;
        if (!cubagens.has(chave)) cubagens.set(chave, { cubagem: formatCubagemFluxo(item).replace(/m$/, ' m'), primeiroId: item.id, itens: [] });
        cubagens.get(chave).itens.push(item);
    });

    const pecasDe = lista => lista.reduce((soma, item) => soma + (Number(item.totalPecas) || ((Number(item.pecas) || 0) * (Number(item.pacotes) || 0))), 0);
    const pacotesDe = lista => lista.reduce((soma, item) => soma + (Number(item.pacotes) || 0), 0);
    const volumeDe = lista => lista.reduce((soma, item) => soma + (Number(item.volume) || 0), 0);
    const resumoDe = lista => `${pacotesDe(lista)} pct · ${pecasDe(lista)} pç · ${formatDecimalMockup(volumeDe(lista))} m³`;

    const fmtInt = n => Number(n || 0).toLocaleString('pt-BR');
    const fmtM3 = n => `${formatDecimalMockup(Number(n) || 0)} m³`;

    // Cada classe e um bloco proprio (1a em cima, 2a embaixo...). Dentro dele, cada cubagem mostra
    // primeiro o total daquela madeira (pacotes, pecas, m3) e depois as configuracoes de pacote.
    box.innerHTML = [...classes.entries()]
        .sort((a, b) => (a[0] || 99) - (b[0] || 99))
        .map(([numero, cubagens]) => {
            const nivel = numero >= 1 && numero <= 3 ? numero : 0;
            const todos = [...cubagens.values()].flatMap(grupo => grupo.itens);
            const cards = [...cubagens.values()].map(grupo => {
                const linhas = grupo.itens.map(item => {
                    const marcado = itensFluxoPatioSelecionados.has(item.id) ? 'checked' : '';
                    const qtd = Number(item.pacotes) || 0;
                    const d = obterDetalhesPacoteEtiqueta(item);
                    const pecasPacote = Number(d.totalPecas || item.pecas || 0);
                    const amarras = Number(d.amarras) || 0;
                    const config = `(${d.alturas || 0}×${d.largura || 0})${amarras ? ` + ${amarras}<small class="fp-am">am</small>` : ''}`;
                    return `
                    <div class="fp-pacote ${marcado ? 'is-selected' : ''}" data-fluxo-patio-id="${item.id}">
                        <input type="checkbox" ${marcado} onchange="window.toggleSelecionarItemFluxoPatio('${item.id}', this.checked)" aria-label="Selecionar esta configuração">
                        <div class="fp-formula">
                            <div class="fp-linha-principal">
                                <span class="fp-qtd-pacotes"><b>${qtd}</b> ${qtd === 1 ? 'pacote' : 'pacotes'}</span>
                                <span class="fp-config">${config}</span>
                            </div>
                            <span class="fp-qtd">${fmtInt(pecasPacote)} pç/pacote · ${fmtInt(pecasDe([item]))} pç · ${fmtM3(item.volume)}</span>
                        </div>
                        <div class="fp-acoes">
                            <button type="button" class="fp-btn-qtd" onclick="window.alterarPacotesProducaoPatio('${item.id}', -1, this)" aria-label="Tirar 1 pacote">−1</button>
                            <button type="button" class="fp-btn-qtd" onclick="window.alterarPacotesProducaoPatio('${item.id}', 1, this)" aria-label="Adicionar 1 pacote">+1</button>
                            <button type="button" class="fp-btn-editar" onclick="window.editarCubagemProducaoPatio('${item.id}')">Editar</button>
                            <button type="button" class="fp-btn-excluir" onclick="window.excluirCubagemProducaoPatio('${item.id}')" aria-label="Excluir só esta configuração">Excluir</button>
                        </div>
                    </div>`;
                }).join('');
                return `
                <section class="fp-grupo">
                    <header class="fp-grupo-head">
                        <div class="fp-grupo-titulo">
                            <span class="fp-cubagem">${grupo.cubagem}</span>
                            <span class="fp-grupo-total"><b>${fmtInt(pacotesDe(grupo.itens))}</b> pacotes · <b>${fmtInt(pecasDe(grupo.itens))}</b> pç · <b>${fmtM3(volumeDe(grupo.itens))}</b></span>
                        </div>
                        <button type="button" class="btn-fluxo-mais-cubagem" onclick="window.novoPacoteMesmaCubagemProducaoPatio('${grupo.primeiroId}')" aria-label="Adicionar nova configuração com esta cubagem" title="Adicionar nova configuração com esta cubagem">+</button>
                    </header>
                    ${linhas}
                    <footer class="fp-grupo-foot">
                        <button type="button" class="fp-excluir" onclick="window.excluirGrupoCubagemProducaoPatio('${grupo.itens.map(i => i.id).join(',')}')">Excluir cubagem inteira</button>
                    </footer>
                </section>`;
            }).join('');
            return `
            <div class="fp-classe fp-classe-n${nivel}">
                <div class="fp-classe-tit">
                    <span class="fp-badge">${numero ? `${numero}ª CLASSE` : 'SEM CLASSE'}</span>
                    <span class="fp-classe-total">${fmtInt(pacotesDe(todos))} pacotes · ${fmtInt(pecasDe(todos))} pç · ${fmtM3(volumeDe(todos))}</span>
                </div>
                <div class="fp-classe-lista">${cards}</div>
            </div>`;
        }).join('');
}

window.renderizarCardsProducaoPatio = renderizarCardsProducaoPatio;

window.excluirGrupoCubagemProducaoPatio = async function(idsCsv) {
    if (!producaoPatioRelatorioAtual) return;
    const ids = String(idsCsv || '').split(',').filter(Boolean);
    const alvo = (producaoPatioRelatorioAtual.itens || []).filter(i => ids.includes(i.id));
    if (!alvo.length) return;

    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir ${alvo.length} pacote(s) da cubagem ${formatCubagemFluxo(alvo[0])} do Fluxo do Patio?`);
    if (!autorizado) return;

    try {
        const itensAnteriores = clonarItensParaDesfazer(producaoPatioRelatorioAtual.itens || []);
        producaoPatioRelatorioAtual.itens = (producaoPatioRelatorioAtual.itens || []).filter(i => !ids.includes(i.id));
        producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`Excluiu cubagem ${formatCubagemFluxo(alvo[0])}`);
        await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
        await renderizarProducaoPatio({ recarregar: false });
        registrarDesfazerFluxoPatio(itensAnteriores, 'Cubagem excluida do Fluxo do Patio.');
    } catch (error) {
        console.error('Erro ao excluir grupo de cubagem do fluxo do patio:', error);
        if (!error?.avisado) alert('Nao foi possivel excluir esta cubagem agora.');
    }
};

window.excluirCubagemProducaoPatio = async function(id) {
    if (!producaoPatioRelatorioAtual) return;
    const item = (producaoPatioRelatorioAtual.itens || []).find(i => i.id === id);
    if (!item) return;

    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir a cubagem ${formatCubagemFluxo(item)} do Fluxo do Patio?`);
    if (!autorizado) return;

    try {
        const itensAnteriores = clonarItensParaDesfazer(producaoPatioRelatorioAtual.itens || []);
        producaoPatioRelatorioAtual.itens = (producaoPatioRelatorioAtual.itens || []).filter(i => i.id !== id);
        producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`Excluiu cubagem ${formatCubagemFluxo(item)}`);
        await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
        await renderizarProducaoPatio({ recarregar: false });
        registrarDesfazerFluxoPatio(itensAnteriores, 'Cubagem excluida do Fluxo do Patio.');
    } catch (error) {
        console.error('Erro ao excluir cubagem do fluxo do patio:', error);
        if (!error?.avisado) alert('Nao foi possivel excluir esta cubagem agora.');
    }
};

window.salvarSerrandoProducaoPatio = async function() {
    if (!producaoPatioRelatorioAtual) return;
    const input = document.getElementById('producaoPatioSerrando');
    producaoPatioRelatorioAtual.serrando = (input?.value || '').toUpperCase().trim();
    producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio('Atualizou madeira sendo serrada');
    await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
        await renderizarProducaoPatio({ recarregar: false });
};

function chaveCubagemProducaoPatio(item) {
    return [
        obterNumeroClasse(item.classe) || 0,
        String(item.especie || 'EUCALIPTO').toUpperCase(),
        Number(item.espessura || 0).toFixed(1),
        Number(item.largura || 0).toFixed(1),
        Number(item.comprimento || 0).toFixed(2),
        String(item.pecasRaw || '').replace(/\s+/g, '').toLowerCase()
    ].join('|');
}

function mesclarCubagemProducaoPatio(novoItem) {
    const itens = producaoPatioRelatorioAtual.itens || [];
    const chaveNova = chaveCubagemProducaoPatio(novoItem);
    const existente = itens.find(item => chaveCubagemProducaoPatio(item) === chaveNova);
    if (!existente) {
        producaoPatioRelatorioAtual.itens = [...itens, novoItem];
        return novoItem;
    }

    existente.pacotes = Number(existente.pacotes || 0) + Number(novoItem.pacotes || 0);
    existente.totalPecas = existente.pacotes * (Number(existente.pecas) || 0);
    existente.volumeUnidade = Number(existente.volumeUnidade || novoItem.volumeUnidade || 0);
    existente.volume = existente.volumeUnidade * existente.pacotes;
    return existente;
}

function preencherFormularioProducaoPatio(dados) {
    const classeNumero = Number(dados.classe || 1);
    const classeValor = `${classeNumero}a CLASSE`;
    const campos = {
        prodPatioClasse: classeValor,
        prodPatioEsp: formatDecimal(Number(dados.espessura || 0), 1),
        prodPatioLarg: formatDecimal(Number(dados.largura || 0), 1),
        prodPatioComp: formatDecimal(Number(dados.comprimento || 0), 2),
        prodPatioPacotes: String(Number(dados.pacotes || 1)),
        prodPatioAlturas: String(Number(dados.alturas || 0)),
        prodPatioLarguraPacote: String(Number(dados.larguraPacote || 0)),
        prodPatioAmarras: String(Number(dados.amarras || 0))
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.value = valor;
    });
    atualizarResumoNovaCubagemProducaoPatio();
}

function normalizarComandoProducaoPatio(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/ª|º/g, 'a')
        .replace(/\s+/g, ' ')
        .trim();
}

function prepararComandoFaladoProducaoPatio(comando) {
    let texto = normalizarComandoProducaoPatio(comando);
    const substituicoes = [
        [/\boito\s+e\s+meio\b/g, '8,5'],
        [/\boito\s+meio\b/g, '8,5'],
        [/\bum\s+e\s+vinte\b/g, '1,20'],
        [/\bum\s+e\s+vintes\b/g, '1,20'],
        [/\bum\s+vinte\b/g, '1,20'],
        [/\bum\s+e\s+meio\b/g, '1,50'],
        [/\bdezessete\b/g, '1,7'],
        [/\bdezesete\b/g, '1,7'],
        [/\bdezesseis\b/g, '16'],
        [/\bdezesSeis\b/gi, '16'],
        [/\bcinquenta\b/g, '50'],
        [/\bquatorze\b/g, '14'],
        [/\bcatorze\b/g, '14'],
        [/\bquinze\b/g, '15'],
        [/\btreze\b/g, '13'],
        [/\bdoze\b/g, '12'],
        [/\bonze\b/g, '11'],
        [/\bdez\b/g, '10'],
        [/\bnove\b/g, '9'],
        [/\boito\b/g, '8'],
        [/\bsete\b/g, '7'],
        [/\bseis\b/g, '6'],
        [/\bcinco\b/g, '5'],
        [/\bquatro\b/g, '4'],
        [/\btres\b/g, '3'],
        [/\bduas\b/g, '2'],
        [/\bdois\b/g, '2'],
        [/\buma\b/g, '1'],
        [/\bum\b/g, '1']
    ];

    substituicoes.forEach(([regex, valor]) => {
        texto = texto.replace(regex, valor);
    });

    return texto.replace(/\s+/g, ' ').trim();
}

function extrairDadosComandoProducaoPatio(comando) {
    const original = String(comando || '').trim();
    const texto = prepararComandoFaladoProducaoPatio(original);
    const classe = texto.includes('segunda') || /\b2\s*a\b/.test(texto) || /\b2\s*classe\b/.test(texto)
        ? 2
        : texto.includes('terceira') || /\b3\s*a\b/.test(texto) || /\b3\s*classe\b/.test(texto)
            ? 3
            : 1;

    const numerosDecimais = texto.match(/\d+(?:[,.]\d+)?/g) || [];
    let espessura = 0;
    let largura = 0;
    let comprimento = 0;
    const cubagemComSeparador = texto.match(/(\d+(?:[,.]\d+)?)\s*(?:\/|x|por)\s*(\d+(?:[,.]\d+)?)\s*(?:\/|x|por)\s*(\d+(?:[,.]\d+)?)/i);
    if (cubagemComSeparador) {
        espessura = parseDecimal(cubagemComSeparador[1]);
        largura = parseDecimal(cubagemComSeparador[2]);
        comprimento = parseDecimal(cubagemComSeparador[3]);
    } else if (numerosDecimais.length >= 3) {
        espessura = parseDecimal(numerosDecimais[0]);
        largura = parseDecimal(numerosDecimais[1]);
        comprimento = parseDecimal(numerosDecimais[2]);
    }

    const textoSemCubagem = cubagemComSeparador
        ? texto.replace(cubagemComSeparador[0], ' ')
        : texto;
    const config = textoSemCubagem.match(/(\d+)\s*(?:x|por)\s*(\d+)(?:\s*(?:\+|mais)\s*(\d+))?/i);
    const alturas = config ? parseInt(config[1], 10) : 0;
    const larguraPacote = config ? parseInt(config[2], 10) : 0;
    const amarras = config ? parseInt(config[3] || '0', 10) : 0;
    const pacoteMatch = texto.match(/(\d+)\s*(?:pacote|pacotes|pct|pcts)\b/);
    const pacotes = pacoteMatch ? Math.max(1, parseInt(pacoteMatch[1], 10) || 1) : 1;
    const pecas = alturas > 0 && larguraPacote > 0 ? (alturas * larguraPacote) + amarras : 0;
    const volumeUnidade = espessura > 0 && largura > 0 && comprimento > 0 && pecas > 0
        ? (espessura / 100) * (largura / 100) * comprimento * pecas
        : 0;

    return {
        original,
        classe,
        espessura,
        largura,
        comprimento,
        pacotes,
        alturas,
        larguraPacote,
        amarras,
        pecas,
        volumeUnidade,
        volume: volumeUnidade * pacotes
    };
}

function validarDadosAgenteProducaoPatio(dados) {
    const pendentes = [];
    if (![1, 2, 3].includes(Number(dados.classe))) pendentes.push('classe');
    if (Number(dados.espessura) <= 0 || Number(dados.largura) <= 0 || Number(dados.comprimento) <= 0) pendentes.push('cubagem');
    if (Number(dados.alturas) <= 0 || Number(dados.larguraPacote) <= 0) pendentes.push('configuracao do pacote');
    if (Number(dados.pecas) <= 0) pendentes.push('total de pecas');
    return pendentes;
}

function resumoConfirmacaoAgentePatio(dados) {
    return [
        'Conferir lancamento do Agente de Producao:',
        '',
        `Classe: ${dados.classe}a`,
        `Cubagem: ${formatDecimal(dados.espessura, 1)} / ${formatDecimal(dados.largura, 1)} / ${formatDecimal(dados.comprimento, 2)}m`,
        `Pacotes: ${dados.pacotes}`,
        `Configuracao: (${dados.alturas}x${dados.larguraPacote})+${dados.amarras} = ${dados.pecas} pecas por pacote`,
        `Volume total: ${formatDecimalMockup(dados.volume)} m3`,
        '',
        'Confirmar e salvar no Fluxo do Patio?'
    ].join('\n');
}

window.interpretarComandoAgentePatio = function(comando) {
    const dados = extrairDadosComandoProducaoPatio(comando);
    const pendentes = validarDadosAgenteProducaoPatio(dados);
    return { dados, pendentes };
};

window.executarComandoAgentePatio = async function(comando) {
    const resultEl = document.getElementById('patioAgentResult');
    const { dados, pendentes } = window.interpretarComandoAgentePatio(comando);

    if (pendentes.length) {
        const msg = `Nao consegui identificar: ${pendentes.join(', ')}. Tente informar classe, cubagem e configuracao do pacote.`;
        if (resultEl) resultEl.textContent = msg;
        return { ok: false, mensagem: msg };
    }

    if (resultEl) {
        resultEl.innerHTML = `
            <strong>Entendido:</strong>
            <span>${dados.classe}a classe | ${formatDecimal(dados.espessura, 1)} / ${formatDecimal(dados.largura, 1)} / ${formatDecimal(dados.comprimento, 2)}m</span>
            <span>${dados.pacotes} pacote(s) | (${dados.alturas}x${dados.larguraPacote})+${dados.amarras} = ${dados.pecas} pecas | ${formatDecimalMockup(dados.volume)} m3</span>
        `;
    }

    await window.abrirProducaoPatio?.();
    setFormProducaoPatioAberto(true);
    preencherFormularioProducaoPatio(dados);

    const confirmado = confirm(resumoConfirmacaoAgentePatio(dados));
    if (!confirmado) {
        if (resultEl) resultEl.textContent = 'Lancamento cancelado. Os campos ficaram preenchidos para ajuste manual.';
        return { ok: false, mensagem: 'Lancamento cancelado.' };
    }

    await window.adicionarCubagemProducaoPatio();
    const msg = `Lancamento salvo: ${dados.pacotes} pacote(s), ${dados.pecas} pecas por pacote, ${formatDecimalMockup(dados.volume)} m3.`;
    if (resultEl) resultEl.textContent = msg;
    return { ok: true, mensagem: msg };
};

window.imprimirListaProducaoPatio = function() {
    const atual = producaoPatioRelatorioAtual;
    if (!atual || !Array.isArray(atual.itens) || atual.itens.length === 0) {
        alert('Nao ha itens no fluxo do patio para imprimir.');
        return;
    }

    const linhas = ordenarItensPatio(atual.itens).map(item => {
        const cores = coresClasseFluxo(item.classe);
        const classeNum = obterNumeroClasse(item.classe) || 0;
        return `
            <tr class="classe-${classeNum}">
                <td><span>${formatarClasseFluxo(item.classe)}</span></td>
                <td class="cubagem">${formatCubagemFluxo(item)}<small>${formatarResumoPacoteProducao(item)}</small></td>
                <td>${item.pacotes || 0}</td>
                <td>${formatDecimalMockup(item.volume || 0)} m3</td>
            </tr>
        `;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para imprimir a lista.');
        return;
    }
    win.document.write(`
        <html><head><title>Fluxo do Patio</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #1f2933; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 0 0 14px; color: #4b5563; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; background: #f3e2c4; }
            th { background: #d9bd8f; color: #1f2933; font-size: 15px; text-align: center; padding: 10px; }
            td { border-bottom: 1px solid #cdb486; padding: 10px; text-align: center; font-size: 17px; font-weight: 800; }
            td:nth-child(2) { text-align: center; }
            td span { display:inline-block; min-width:42px; padding:5px 10px; border-radius:999px; font-weight:900; }
            .classe-1 span { background:rgba(22,163,74,.14); border:1px solid rgba(22,163,74,.38); color:#15803d; }
            .classe-1 .cubagem { color:#15803d; }
            .classe-2 span { background:rgba(245,158,11,.18); border:1px solid rgba(217,119,6,.42); color:#b45309; }
            .classe-2 .cubagem { color:#b45309; }
            .classe-3 span { background:rgba(239,68,68,.16); border:1px solid rgba(239,68,68,.45); color:#f87171; }
            .classe-3 .cubagem { color:#f87171; }
            small { display: block; color: #4b5563; font-size: 12px; margin-top: 3px; font-weight: 700; }
            @media print { body { padding: 0; } }
        </style></head><body>
            <h1>Fluxo do Patio</h1>
            <p>${atual.serrando ? `Madeira serrando: ${atual.serrando}` : 'Lista resumida de cubagens do patio'}</p>
            <table><thead><tr><th>Classe</th><th>Cubagem</th><th>Pacotes</th><th>Volume</th></tr></thead><tbody>${linhas}</tbody></table>
        </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
};

window.adicionarCubagemProducaoPatio = async function() {
    await sincronizarRelatorioProducaoPatioAtual();
    const itensAnteriores = clonarItensParaDesfazer(producaoPatioRelatorioAtual?.itens || []);
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

    const itemSalvo = mesclarCubagemProducaoPatio(novoItem);
    const somouExistente = itemSalvo.id !== novoItem.id;
    producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`${somouExistente ? 'Somou pacote em cubagem existente' : 'Adicionou nova cubagem'} ${formatCubagemFluxo(itemSalvo)}`);
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
    await renderizarProducaoPatio({ recarregar: false });
    registrarDesfazerFluxoPatio(itensAnteriores, `${somouExistente ? 'Pacotes somados na cubagem existente.' : 'Nova cubagem adicionada ao Fluxo do Patio.'}`);
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
    if (numero === 1) return { bg: 'rgba(22,163,74,0.14)', border: 'rgba(22,163,74,0.38)', color: '#15803d' };
    if (numero === 2) return { bg: 'rgba(245,158,11,0.22)', border: 'rgba(217,119,6,0.55)', color: '#d97706' };
    if (numero === 3) return { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.45)', color: '#f87171' };
    return { bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)', color: '#cbd5e1' };
}

function formatCubagemFluxo(item) {
    return `${formatDecimal(item.espessura, 1)} / ${formatDecimal(item.largura, 1)} / ${formatDecimal(item.comprimento, 2)}m`;
}

let edicaoGrupoCubagemPatio = null;

function chaveGrupoCubagemPatio(item) {
    return [
        obterNumeroClasse(item?.classe) || 0,
        Number(item?.espessura || 0).toFixed(1),
        Number(item?.largura || 0).toFixed(1),
        Number(item?.comprimento || 0).toFixed(2)
    ].join('|');
}

function obterItensEscopoEdicaoCubagem(escopo) {
    return escopo === 'fluxo'
        ? (producaoPatioRelatorioAtual?.itens || [])
        : itensPatioTemp;
}

function abrirEdicaoGrupoCubagemPatio(escopo, ids) {
    const itens = obterItensEscopoEdicaoCubagem(escopo);
    const selecionados = itens.filter(item => ids.includes(item.id));
    if (!selecionados.length) {
        alert('Selecione ao menos uma cubagem para editar.');
        return;
    }

    const chaves = new Set(selecionados.map(chaveGrupoCubagemPatio));
    if (chaves.size !== 1) {
        alert('Para editar em grupo, selecione somente uma cubagem e suas ramificacoes.');
        return;
    }

    const referencia = selecionados[0];
    edicaoGrupoCubagemPatio = { escopo, ids: selecionados.map(item => item.id) };
    document.getElementById('edicaoGrupoClasse').value = referencia.classe || '1a CLASSE';
    document.getElementById('edicaoGrupoEsp').value = formatDecimal(referencia.espessura, 1);
    document.getElementById('edicaoGrupoLarg').value = formatDecimal(referencia.largura, 1);
    document.getElementById('edicaoGrupoComp').value = formatDecimal(referencia.comprimento, 2);
    document.getElementById('edicaoGrupoCubagemResumo').textContent = `${selecionados.length} configuracao(oes) de pacote serao atualizadas juntas.`;
    const modal = document.getElementById('modalEdicaoGrupoCubagemPatio');
    if (modal) modal.style.display = 'flex';
    setTimeout(() => document.getElementById('edicaoGrupoEsp')?.focus(), 80);
}

window.fecharEdicaoGrupoCubagemPatio = function() {
    const modal = document.getElementById('modalEdicaoGrupoCubagemPatio');
    if (modal) modal.style.display = 'none';
    edicaoGrupoCubagemPatio = null;
};

window.editarGrupoCubagemPatio = function(id, escopo = 'fluxo') {
    const itens = obterItensEscopoEdicaoCubagem(escopo);
    const referencia = itens.find(item => item.id === id);
    if (!referencia) return;
    const chave = chaveGrupoCubagemPatio(referencia);
    const ids = itens.filter(item => chaveGrupoCubagemPatio(item) === chave).map(item => item.id);

    if (escopo === 'fluxo') {
        itensFluxoPatioSelecionados = new Set(ids);
        renderizarProducaoPatio({ recarregar: false });
    } else {
        itensPatioSelecionados = new Set(ids);
        renderizarItensPatioTemp();
    }
    abrirEdicaoGrupoCubagemPatio(escopo, ids);
};

window.editarCubagemSelecionadaFluxoPatio = function() {
    abrirEdicaoGrupoCubagemPatio('fluxo', [...itensFluxoPatioSelecionados]);
};

window.editarCubagemSelecionadaPatio = function() {
    abrirEdicaoGrupoCubagemPatio('controle', [...itensPatioSelecionados]);
};

window.salvarEdicaoGrupoCubagemPatio = async function() {
    const contexto = edicaoGrupoCubagemPatio;
    if (!contexto) return;

    const classe = document.getElementById('edicaoGrupoClasse')?.value || '1a CLASSE';
    const espessura = parseDecimal(document.getElementById('edicaoGrupoEsp')?.value);
    const largura = parseDecimal(document.getElementById('edicaoGrupoLarg')?.value);
    const comprimento = parseDecimal(document.getElementById('edicaoGrupoComp')?.value);
    if (espessura <= 0 || largura <= 0 || comprimento <= 0) {
        alert('Informe medidas validas para a cubagem.');
        return;
    }

    const itens = obterItensEscopoEdicaoCubagem(contexto.escopo);
    const anteriores = clonarItensParaDesfazer(itens);
    const ids = new Set(contexto.ids);
    const atualizados = itens.map(item => {
        if (!ids.has(item.id)) return item;
        const pecas = Number(item.pecas) || 0;
        const pacotes = Number(item.pacotes) || 0;
        const volumeUnidade = (espessura / 100) * (largura / 100) * comprimento * pecas;
        return {
            ...item,
            classe,
            espessura,
            largura,
            comprimento,
            totalPecas: pacotes * pecas,
            volumeUnidade,
            volume: volumeUnidade * pacotes
        };
    });

    try {
        if (contexto.escopo === 'fluxo') {
            producaoPatioRelatorioAtual.itens = atualizados;
            producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`Editou cubagem em ${contexto.ids.length} configuracao(oes) de pacote`);
            await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
            await renderizarProducaoPatio({ recarregar: false });
            registrarDesfazerFluxoPatio(anteriores, 'Cubagem e ramificacoes atualizadas no Fluxo do Patio.');
        } else {
            itensPatioTemp = atualizados;
            renderizarItensPatioTemp();
            registrarDesfazerListaPatio(anteriores, 'Cubagem e ramificacoes atualizadas na lista do Patio.');
        }
        window.fecharEdicaoGrupoCubagemPatio();
    } catch (error) {
        console.error('Erro ao editar cubagem em grupo:', error);
        if (!error?.avisado) alert('Nao foi possivel salvar a edicao da cubagem agora.');
    }
};

function obterClasseItemFluxo(item) {
    return item?.classe || item?.classificacao || item?.qualidade || item?.tipoClasse || '';
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

// Adicionar Item via Formulário
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
    const itensAnteriores = clonarItensParaDesfazer(itensPatioTemp);
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

    const itemAtualizado = {
        ...(itensPatioTemp.find(i => i.id === itemPatioEditandoId) || {}),
        id: itemPatioEditandoId || Date.now().toString() + Math.random().toString(36).substr(2, 5),
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
    };

    if (itemPatioEditandoId) {
        itensPatioTemp = itensPatioTemp.map(item => item.id === itemPatioEditandoId ? itemAtualizado : item);
        itemPatioEditandoId = null;
    } else {
        itensPatioTemp.push(itemAtualizado);
    }

    // Mantem medidas/tipo/classe/especie para agilizar lancamentos repetidos.
    document.getElementById('patioItemPacotes').value = '';
    document.getElementById('patioItemPecas').value = '';
    document.getElementById('patioItemAmarras').value = '';
    const volumePreview = document.getElementById('patioItemVolumePreview');
    if (volumePreview) volumePreview.value = '';
    document.getElementById('patioItemPacotes').focus();

    renderizarItensPatioTemp();
    registrarDesfazerListaPatio(itensAnteriores, 'Lote alterado na lista de Patio.');
}

// Zerar quantidades de etiquetas
function zerarEtiquetasPatio() {
    if (itensPatioTemp.length === 0) return;
    if (confirm(" deseja zerar a quantidade de todos os pacotes na lista atual?")) {
        const itensAnteriores = clonarItensParaDesfazer(itensPatioTemp);
        itensPatioTemp.forEach(item => {
            item.pacotes = 0;
            item.totalPecas = 0;
            item.volume = 0;
        });
        renderizarItensPatioTemp();
        registrarDesfazerListaPatio(itensAnteriores, 'Quantidades da lista zeradas.');
    }
}

// Limpar toda a lista atual
function limparTudoPatio() {
    if (itensPatioTemp.length === 0) return;
    if (confirm(" deseja limpar completamente a lista de pátio atual?")) {
        const itensAnteriores = clonarItensParaDesfazer(itensPatioTemp);
        itensPatioTemp = [];
        renderizarItensPatioTemp();
        registrarDesfazerListaPatio(itensAnteriores, 'Lista de Patio limpa.');
    }
}

// Ações dinâmicas de incremento/decremento (+1 / -)
window.alterarPacotesPatio = async function(id, delta) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;
    const itensAnteriores = clonarItensParaDesfazer(itensPatioTemp);

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
    registrarDesfazerListaPatio(itensAnteriores, `${delta > 0 ? 'Pacote adicionado' : 'Pacote removido'} da lista de Patio.`);
};

// Remover linha diretamente pela lixeira
window.removerLinhaPatio = async function(id) {
    if (await window.confirmarExclusaoComSenha("Deseja remover este lote?")) {
        const itensAnteriores = clonarItensParaDesfazer(itensPatioTemp);
        itensPatioTemp = itensPatioTemp.filter(i => i.id !== id);
        renderizarItensPatioTemp();
        registrarDesfazerListaPatio(itensAnteriores, 'Lote removido da lista de Patio.');
    }
};

window.editarItemPatio = function(id) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;

    document.getElementById('patioItemTipo').value = item.tipo || 'TÁBUA';
    selecionarClassePatio(document.getElementById('patioItemClasse'), item.classe || '1ª CLASSE');
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
    atualizarPreviewVolumeItemPatio();

    itemPatioEditandoId = id;
    renderizarItensPatioTemp();
    destacarEdicaoPatio();
    setTimeout(() => document.getElementById('patioItemPacotes')?.focus(), 350);
};

window.imprimirEtiquetaItemPatio = function(id) {
    const item = itensPatioTemp.find(i => i.id === id);
    if (!item) return;
    item.etiquetado = true;
    item.etiquetadoEm = new Date().toISOString();
    renderizarItensPatioTemp();
    imprimirEtiquetasFisicas([item]);
};

function obterIdsPatioSelecionados() {
    return [...itensPatioSelecionados].filter(id => itensPatioTemp.some(item => item.id === id));
}

function obterItensPatioSelecionadosObrigatorio(lista, mensagem) {
    const ids = obterIdsPatioSelecionados();
    if (!ids.length) {
        alert(mensagem || 'Selecione ao menos um item para imprimir.');
        return [];
    }
    return lista.filter(item => ids.includes(item.id));
}

window.excluirSelecionadosPatio = async function() {
    const ids = obterIdsPatioSelecionados();
    if (!ids.length) return;
    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir ${ids.length} pacote(s) selecionado(s) da lista do Patio?`);
    if (!autorizado) return;

    const itensAnteriores = clonarItensParaDesfazer(itensPatioTemp);
    const idsParaExcluir = new Set(ids);
    itensPatioTemp = itensPatioTemp.filter(item => !idsParaExcluir.has(item.id));
    itensPatioSelecionados.clear();
    renderizarItensPatioTemp();
    registrarDesfazerListaPatio(itensAnteriores, `${ids.length} pacote(s) selecionado(s) removido(s) da lista do Patio.`);
};

function obterResumoPatioSelecionado() {
    const ids = obterIdsPatioSelecionados();
    return itensPatioTemp
        .filter(item => ids.includes(item.id))
        .reduce((acc, item) => {
            acc.linhas += 1;
            acc.pacotes += Number(item.pacotes) || 0;
            acc.volume += Number(item.volume) || 0;
            acc.pecas += Number(item.totalPecas) || 0;
            return acc;
        }, { linhas: 0, pacotes: 0, volume: 0, pecas: 0 });
}

function atualizarResumoSelecaoPatio() {
    const label = document.getElementById('patioSelecaoResumo');
    const resumo = obterResumoPatioSelecionado();
    if (label) {
        label.textContent = resumo.linhas
            ? `${resumo.pacotes} pct(s) selecionado(s) | ${formatDecimalMockup(resumo.volume)} m³`
            : 'Nenhum item selecionado';
    }
    const editar = document.getElementById('btnEditarSelecionadosPatio');
    const excluir = document.getElementById('btnExcluirSelecionadosPatio');
    const itensSelecionados = itensPatioTemp.filter(item => itensPatioSelecionados.has(item.id));
    const gruposSelecionados = new Set(itensSelecionados.map(chaveGrupoCubagemPatio));
    if (editar) {
        editar.disabled = resumo.linhas === 0 || gruposSelecionados.size !== 1;
        editar.title = gruposSelecionados.size > 1
            ? 'Selecione uma unica cubagem e suas ramificacoes para editar em grupo'
            : 'Editar a cubagem selecionada';
    }
    if (excluir) excluir.disabled = resumo.linhas === 0;
    atualizarConsolidatedStats();
}

window.toggleSelecionarItemPatio = function(id, checked) {
    if (checked) itensPatioSelecionados.add(id);
    else itensPatioSelecionados.delete(id);
    atualizarResumoSelecaoPatio();
};

window.selecionarTodosItensPatio = function(checked) {
    if (checked) itensPatioTemp.forEach(item => itensPatioSelecionados.add(item.id));
    else itensPatioSelecionados.clear();
    renderizarItensPatioTemp();
};

window.toggleCardCadastroPatio = function() {
    const card = document.getElementById('cardCadastroLotePatio');
    const texto = document.getElementById('textoToggleCadastroPatio');
    const icone = document.getElementById('iconeToggleCadastroPatio');
    if (!card) return;
    const vaiOcultar = card.style.display !== 'none';
    card.style.display = vaiOcultar ? 'none' : '';
    if (texto) texto.textContent = vaiOcultar ? 'Mostrar cadastro' : 'Ocultar cadastro';
    if (icone) icone.className = vaiOcultar ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
};

function montarResumoImpressaoPatio(lista) {
    const grupos = new Map();
    lista.forEach(item => {
        const classeNum = obterNumeroClasse(item.classe) || 0;
        const cubagem = `${formatDecimal(item.espessura, 1)} / ${formatDecimal(item.largura, 1)} / ${formatDecimal(item.comprimento, 2)}`;
        const chave = `${classeNum}|${cubagem}`;
        if (!grupos.has(chave)) {
            grupos.set(chave, {
                classe: item.classe,
                classeNum,
                cubagem,
                pacotes: 0,
                pecas: 0,
                volume: 0
            });
        }
        const grupo = grupos.get(chave);
        grupo.pacotes += Number(item.pacotes) || 0;
        grupo.pecas += Number(item.totalPecas) || 0;
        grupo.volume += Number(item.volume) || 0;
    });

    const gruposOrdenados = ordenarItensPatio([...grupos.values()].map(grupo => ({
        classe: grupo.classe,
        espessura: Number(String(grupo.cubagem).split(' / ')[0].replace(',', '.')) || 0,
        largura: Number(String(grupo.cubagem).split(' / ')[1].replace(',', '.')) || 0,
        comprimento: Number(String(grupo.cubagem).split(' / ')[2].replace(',', '.')) || 0,
        pacotes: grupo.pacotes,
        totalPecas: grupo.pecas,
        volume: grupo.volume
    })));

    return gruposOrdenados.map(item => {
        const classeNum = obterNumeroClasse(item.classe) || 0;
        return `
            <tr class="classe-${classeNum}">
                <td><span>${formatarClasseFluxo(item.classe)}</span></td>
                <td class="medidas"><div class="cubagem">${formatDecimal(item.espessura, 1)} / ${formatDecimal(item.largura, 1)} / ${formatDecimal(item.comprimento, 2)}</div></td>
                <td>${item.pacotes || 0}</td>
                <td>${item.totalPecas || 0}<small>pçs</small></td>
                <td class="volume">${formatDecimalMockup(item.volume || 0)}</td>
            </tr>
        `;
    }).join('');
}

function montarResumoGeralPatio(lista) {
    const porClasse = new Map();
    const geral = { pacotes: 0, pecas: 0, volume: 0 };

    lista.forEach(item => {
        const classeNum = obterNumeroClasse(item.classe) || 0;
        const classeLabel = formatarClasseFluxo(item.classe);

        if (!porClasse.has(classeNum)) {
            porClasse.set(classeNum, { classe: classeLabel, pacotes: 0, pecas: 0, volume: 0 });
        }
        const totalClasse = porClasse.get(classeNum);
        totalClasse.pacotes += Number(item.pacotes) || 0;
        totalClasse.pecas += Number(item.totalPecas) || 0;
        totalClasse.volume += Number(item.volume) || 0;
        geral.pacotes += Number(item.pacotes) || 0;
        geral.pecas += Number(item.totalPecas) || 0;
        geral.volume += Number(item.volume) || 0;
    });

    const cardGeral = `
        <div class="total-card total-card-geral">
            <strong>Total Geral</strong>
            <span>${geral.pacotes} pacote(s)</span>
            <em>${formatDecimalMockup(geral.volume)} m³</em>
            <small>${geral.pecas} pçs</small>
        </div>
    `;

    const cardsClasse = [...porClasse.entries()]
        .sort(([a], [b]) => a - b)
        .map(([classeNum, item]) => `
            <div class="total-card classe-${classeNum}">
                <strong>${item.classe} Classe</strong>
                <span>${item.pacotes} pacote(s)</span>
                <small>${item.pecas} pçs | ${formatDecimalMockup(item.volume)} m³</small>
            </div>
        `).join('');

    return `
        <div class="resumo-final">
            <h2>Resumo Geral</h2>
            <div class="total-cards">${cardGeral}${cardsClasse}</div>
        </div>
    `;
}

function imprimirListaDetalhadaPatio(relatorio = null) {
    const relatorioAtual = relatorio
        || historicoPatioAtuais.find(item => item.id === relatorioPatioEditandoId)
        || historicoPatioAtuais.find(item => item.data === dataAtualPatio())
        || historicoPatioAtuais[0]
        || null;
    const listaBaseOriginal = Array.isArray(itensPatioTemp) && itensPatioTemp.length
        ? itensPatioTemp
        : (Array.isArray(relatorioAtual?.itens) ? relatorioAtual.itens : []);
    const listaBase = relatorio
        ? listaBaseOriginal
        : obterItensPatioSelecionadosObrigatorio(listaBaseOriginal, 'Selecione os itens que deseja imprimir na lista.');
    if (!relatorio && listaBase.length === 0 && listaBaseOriginal.length > 0) return;
    if (!Array.isArray(listaBase) || listaBase.length === 0) {
        alert('Nao ha itens na lista do patio para imprimir.');
        return;
    }

    const serrando = document.getElementById('patioSerrando')?.value || relatorioAtual?.serrando || '';
    const resumoLinhas = montarResumoImpressaoPatio(listaBase);
    const resumoGeral = montarResumoGeralPatio(listaBase);

    let chaveDetalhadaAnterior = '';
    const linhas = ordenarItensPatio(listaBase).map(item => {
        const classeNum = obterNumeroClasse(item.classe) || 0;
        const chaveDetalhada = `${classeNum}|${formatDecimal(item.espessura, 1)}|${formatDecimal(item.largura, 1)}|${formatDecimal(item.comprimento, 2)}`;
        const primeiraLinhaGrupo = chaveDetalhada !== chaveDetalhadaAnterior;
        chaveDetalhadaAnterior = chaveDetalhada;
        const classeCelula = primeiraLinhaGrupo
            ? `<span>${formatarClasseFluxo(item.classe)}</span>`
            : '<span class="grupo-repetido">*</span>';
        const medidaPrincipal = primeiraLinhaGrupo
            ? `<div class="cubagem">${formatDecimal(item.espessura, 1)} / ${formatDecimal(item.largura, 1)} / ${formatDecimal(item.comprimento, 2)}</div>`
            : '';
        return `
            <tr class="classe-${classeNum}">
                <td>${classeCelula}</td>
                <td class="medidas">${medidaPrincipal}<small>* ${formatarResumoPacoteProducao(item)} / ${formatDecimalMockup(item.volumeUnidade)} m3</small></td>
                <td>${item.pacotes || 0}</td>
                <td>${item.totalPecas || 0}<small>pçs</small></td>
                <td class="volume">${formatDecimalMockup(item.volume || 0)}<small>(${formatDecimalMockup(item.volumeUnidade || 0)}/un)</small></td>
            </tr>
        `;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para imprimir a lista.');
        return;
    }
    win.document.write(`
        <html><head><title>Controle de Producao Geral</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 12px; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 20px; }
            p { margin: 0 0 10px; color: #4b5563; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; background: #f1dfbd; }
            th { background: #d9bd8f; color: #0f172a; font-size: 13px; text-align: center; padding: 8px; text-transform: uppercase; }
            td { border-bottom: 1.5px solid #8a8170; padding: 9px 8px; text-align: center; font-size: 17px; font-weight: 900; }
            td span { display:inline-block; min-width:28px; padding:5px 8px; border-radius:4px; font-weight:900; }
            .medidas { text-align: center; }
            .cubagem { font-size: 18px; font-weight: 900; }
            h2 { margin: 16px 0 6px; font-size: 15px; text-transform: uppercase; color: #0f172a; }
            .print-note { margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 700; }
            .page { min-height: 96vh; }
            .page-break { break-before: page; page-break-before: always; }
            .resumo-final { margin-top: 18px; padding-top: 10px; border-top: 2px solid #0f172a; }
            .total-cards { display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 12px; }
            .total-card { border:1px solid #8a8170; background:#fff7e6; border-radius:6px; padding:9px; text-align:center; font-weight:900; }
            .total-card-geral { background:#0f172a; color:#fff; border-color:#0f172a; }
            .total-card strong, .total-card span, .total-card small { display:block; }
            .total-card span { font-size: 17px; margin: 4px 0; }
            .total-card em { display:block; font-style:normal; font-size:18px; margin:4px 0; color:#22c55e; }
            .grupo-repetido { background: transparent !important; border: none !important; color: #334155 !important; font-size: 18px; min-width: 28px; }
            .classe-1 span { background:rgba(22,163,74,.14); border:1px solid rgba(22,163,74,.38); color:#15803d; }
            .classe-1 .cubagem { color:#15803d; }
            .classe-2 span { background:#fff1c2; border:1px solid #f59e0b; color:#d97706; }
            .classe-2 .cubagem { color:#d97706; }
            .classe-3 span { background:rgba(239,68,68,.16); border:1px solid rgba(239,68,68,.45); color:#f87171; }
            .classe-3 .cubagem { color:#f87171; }
            .volume { color:#047857; }
            small { display: block; color: #0f172a; font-size: 11px; margin-top: 2px; font-weight: 700; }
            @media print { body { padding: 0; } }
        </style></head><body>
            <section class="page">
                <h1>Controle de Producao Geral</h1>
                <p>${serrando ? `Madeira serrando: ${serrando.toUpperCase()}` : 'Lista resumida da contagem do patio'}</p>
                ${resumoGeral}
                <h2>Lista Resumida por Classe e Cubagem</h2>
                <p class="print-note">Total agrupado somente dos itens selecionados para impressao.</p>
                <table><thead><tr><th>Classe</th><th>Medidas</th><th>Pacotes</th><th>Total Pçs</th><th>Volume (m³)</th></tr></thead><tbody>${resumoLinhas}</tbody></table>
            </section>
            <section class="page page-break">
                <h1>Controle de Producao Geral</h1>
                <p>${serrando ? `Madeira serrando: ${serrando.toUpperCase()}` : 'Lista detalhada da contagem do patio'}</p>
                <h2>Lista Detalhada</h2>
                <table><thead><tr><th>Classe</th><th>Medidas</th><th>Pacotes</th><th>Total Pçs</th><th>Volume (m³)</th></tr></thead><tbody>${linhas}</tbody></table>
            </section>
        </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
}

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

// Renderizar lista do Controle de Produção Geral: blocos por classe > cubagem (maior para menor)
function renderizarItensPatioTemp() {
    const lista = document.getElementById('listaItensPatioTemp');
    if (!lista) return;

    ordenarItensPatioTemp();

    if (itensPatioTemp.length === 0) {
        itensPatioSelecionados.clear();
        lista.innerHTML = `<div class="cp-vazio">Nenhum pacote na lista de pátio. Adicione ou configure os lotes acima.</div>`;
        atualizarConsolidatedStats();
        atualizarResumoSelecaoPatio();
        return;
    }

    const fmtInt = n => (Number(n) || 0).toLocaleString('pt-BR');
    const fmtM3 = n => formatDecimalMockup(Number(n) || 0);
    const classes = new Map();
    itensPatioTemp.forEach(item => {
        const numero = obterNumeroClasse(item.classe) || 3;
        if (!classes.has(numero)) classes.set(numero, new Map());
        const chave = `${formatDecimal(item.espessura, 1)}|${formatDecimal(item.largura, 1)}|${formatDecimal(item.comprimento, 2)}`;
        const grupos = classes.get(numero);
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave).push(item);
    });

    const somar = itens => itens.reduce((acc, item) => {
        acc.pacotes += Number(item.pacotes) || 0;
        acc.pecas += Number(item.totalPecas) || (Number(item.pacotes) || 0) * (obterDetalhesPacoteEtiqueta(item).totalPecas || Number(item.pecas) || 0);
        acc.volume += Number(item.volume) || 0;
        return acc;
    }, { pacotes: 0, pecas: 0, volume: 0 });

    const linhaHtml = item => {
        const d = obterDetalhesPacoteEtiqueta(item);
        const amarras = Number(d.amarras) || 0;
        const config = `(${d.alturas || 0}×${d.largura || 0})${amarras ? ` + ${amarras}<small class="fp-am">am</small>` : ''}`;
        const pcPacote = d.totalPecas || item.pecas || 0;
        const totalPc = Number(item.totalPecas) || (Number(item.pacotes) || 0) * pcPacote;
        const volUn = Number(item.volumeUnidade) || ((Number(item.pacotes) || 0) ? (Number(item.volume) || 0) / Number(item.pacotes) : 0);
        const etiqueta = item.etiquetado ? '<span class="cp-etiqueta" title="Etiqueta impressa"><i class="fa-solid fa-tag"></i><span class="cp-etiqueta-txt"> etiquetado</span></span>' : '';
        const ultimoUso = item.ultimoUsoRomaneio;
        const usoRecenteMs = ultimoUso?.dataHora ? Date.now() - new Date(ultimoUso.dataHora).getTime() : Infinity;
        const usoHtml = ultimoUso && usoRecenteMs >= 0 && usoRecenteMs < 2 * 60 * 60 * 1000
            ? `<div class="cp-uso"><i class="fa-solid fa-truck-arrow-right"></i> ${ultimoUso.pacotes || 0} pct usado(s) no romaneio ${ultimoUso.romaneio || '-'}${ultimoUso.cliente ? ` - ${ultimoUso.cliente}` : ''}. Saldo: ${ultimoUso.saldo ?? item.pacotes ?? 0} pct.</div>`
            : '';
        return `
            <div class="cp-linha ${item.id === itemPatioEditandoId ? 'patio-linha-editando' : ''}">
                <label class="cp-sel hide-on-print" title="Selecionar">
                    <input type="checkbox" data-patio-sel="${item.id}" ${itensPatioSelecionados.has(item.id) ? 'checked' : ''} onchange="window.toggleSelecionarItemPatio('${item.id}', this.checked)">
                </label>
                <div class="cp-info">
                    <div class="fp-linha-principal">
                        <span class="fp-qtd-pacotes"><b>${fmtInt(item.pacotes)}</b> ${Number(item.pacotes) === 1 ? 'pacote' : 'pacotes'}</span>
                        <span class="fp-config">${config}</span>
                        ${etiqueta}
                    </div>
                    <div class="fp-qtd">${fmtInt(pcPacote)} pç/pacote · ${fmtInt(totalPc)} pç · ${fmtM3(item.volume)} m³ <span class="cp-un">(${fmtM3(volUn)} m³/pct)</span></div>
                    ${usoHtml}
                </div>
                <div class="cp-acoes hide-on-print">
                    <button type="button" class="fp-btn-qtd" onclick="alterarPacotesPatio('${item.id}', -1)" title="Diminuir 1 pacote" aria-label="Diminuir 1 pacote">−1</button>
                    <button type="button" class="fp-btn-qtd" onclick="alterarPacotesPatio('${item.id}', 1)" title="Aumentar 1 pacote" aria-label="Aumentar 1 pacote">+1</button>
                    <button type="button" class="fp-btn-editar" onclick="editarItemPatio('${item.id}')" title="Editar esta linha" aria-label="Editar esta linha"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button type="button" class="cp-btn-etiqueta" onclick="imprimirEtiquetaItemPatio('${item.id}')" title="Imprimir etiqueta" aria-label="Imprimir etiqueta"><i class="fa-solid fa-print"></i> Etiqueta</button>
                    <button type="button" class="fp-btn-excluir" onclick="removerLinhaPatio('${item.id}')" title="Excluir esta linha" aria-label="Excluir esta linha"><i class="fa-solid fa-trash-can"></i> Excluir</button>
                </div>
            </div>`;
    };

    let html = '';
    [...classes.keys()].sort((a, b) => a - b).forEach(numero => {
        const grupos = classes.get(numero);
        const todos = [...grupos.values()].flat();
        const tc = somar(todos);
        let gruposHtml = '';
        grupos.forEach(itens => {
            const ref = itens[0];
            const t = somar(itens);
            const ids = itens.map(i => i.id);
            gruposHtml += `
                <section class="fp-grupo cp-grupo">
                    <header class="cp-grupo-topo">
                        <div>
                            <div class="fp-cubagem">${formatDecimal(ref.espessura, 1)} × ${formatDecimal(ref.largura, 1)} × ${formatDecimal(ref.comprimento, 2)}</div>
                            <div class="fp-grupo-total"><b>${fmtInt(t.pacotes)}</b> pct · ${fmtInt(t.pecas)} pç · <b>${fmtM3(t.volume)}</b> m³</div>
                        </div>
                        <div class="cp-grupo-acoes hide-on-print">
                            <button type="button" class="cp-btn-texto cp-btn-azul" onclick="editarGrupoCubagemPatio('${ref.id}', 'controle')" title="Editar a cubagem inteira"><i class="fa-solid fa-pen-ruler"></i> Editar<span class="cp-txt-desk"> cubagem</span></button>
                            <button type="button" class="cp-btn-texto cp-btn-vermelho" onclick="excluirCubagemControlePatio(${JSON.stringify(ids).replace(/"/g, '&quot;')})" title="Excluir a cubagem inteira"><i class="fa-solid fa-trash-can"></i> Excluir<span class="cp-txt-desk"> cubagem</span></button>
                        </div>
                    </header>
                    <div class="cp-linhas">${itens.map(linhaHtml).join('')}</div>
                </section>`;
        });
        html += `
            <div class="fp-classe fp-classe-n${numero} cp-classe">
                <div class="fp-classe-tit">
                    <span class="fp-classe-badge">${numero}ª CLASSE</span>
                    <span class="fp-classe-tot"><b>${fmtInt(tc.pacotes)}</b> pct · ${fmtInt(tc.pecas)} pç · <b>${fmtM3(tc.volume)}</b> m³</span>
                </div>
                <div class="fp-classe-lista">${gruposHtml}</div>
            </div>`;
    });

    lista.innerHTML = html;
    atualizarResumoSelecaoPatio();
    atualizarConsolidatedStats();
}

window.excluirCubagemControlePatio = async function(ids) {
    const alvo = new Set((ids || []).filter(id => itensPatioTemp.some(item => item.id === id)));
    if (!alvo.size) return;
    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir a cubagem inteira (${alvo.size} linha(s)) da lista do Patio?`);
    if (!autorizado) return;
    const itensAnteriores = clonarItensParaDesfazer(itensPatioTemp);
    itensPatioTemp = itensPatioTemp.filter(item => !alvo.has(item.id));
    alvo.forEach(id => itensPatioSelecionados.delete(id));
    renderizarItensPatioTemp();
    registrarDesfazerListaPatio(itensAnteriores, 'Cubagem removida da lista do Patio.');
};

// Atualizar estatísticas dos cards em tempo real
function atualizarConsolidatedStats() {
    let totalPacotes = 0;
    let totalVolume = 0;
    let totalPecas = 0;
    let selPacotes = 0;
    let selVolume = 0;
    let selPecas = 0;
    const porClasse = {
        1: { pacotes: 0, volume: 0 },
        2: { pacotes: 0, volume: 0 }
    };

    itensPatioTemp.forEach(item => {
        const pacotes = Number(item.pacotes) || 0;
        const volume = Number(item.volume) || 0;
        const pecas = Number(item.totalPecas) || 0;
        const classeNum = obterNumeroClasse(item.classe);
        totalPacotes += pacotes;
        totalVolume += volume;
        totalPecas += pecas;
        if (porClasse[classeNum]) {
            porClasse[classeNum].pacotes += pacotes;
            porClasse[classeNum].volume += volume;
        }
        if (itensPatioSelecionados.has(item.id)) {
            selPacotes += pacotes;
            selVolume += volume;
            selPecas += pecas;
        }
    });

    // Atualizar UI
    const lblTotalPacotes = document.getElementById('lblTotalPacotes');
    const lblTotalVolume = document.getElementById('lblTotalVolume');
    const lblPacotesHoje = document.getElementById('lblPacotesHoje');
    const lblVolumeHoje = document.getElementById('lblVolumeHoje');

    if (lblTotalPacotes) lblTotalPacotes.innerText = totalPacotes;
    if (lblTotalVolume) lblTotalVolume.innerText = formatDecimalMockup(totalVolume);
    if (lblPacotesHoje) lblPacotesHoje.innerText = porClasse[1].pacotes;
    if (lblVolumeHoje) lblVolumeHoje.innerText = porClasse[2].pacotes;

    const pecasTotal = document.getElementById('lblTotalPecasPatio');
    const pecasSel = document.getElementById('lblPecasSelecionadasPatio');
    if (pecasTotal) pecasTotal.innerText = `${formatDecimalMockup(porClasse[2].volume)} m³`;
    if (pecasSel) pecasSel.innerText = `${formatDecimalMockup(porClasse[1].volume)} m³`;
    atualizarResumoProducaoRomaneios();
}

async function importarFluxoPatioParaControleProducao() {
    const rel = await carregarRelatorioPatioAtual();
    if (!rel || !Array.isArray(rel.itens) || rel.itens.length === 0) {
        alert('Nenhum fluxo do patio encontrado para importar.');
        return;
    }

    if (itensPatioTemp.length > 0 && !confirm('Ja existe uma lista no Controle de Producao. Deseja substituir pela lista do Fluxo do Patio?')) {
        return;
    }

    const hoje = dataAtualPatio();
    itensPatioTemp = ordenarItensPatio(rel.itens.map(item => ({
        ...item,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        dataRaw: hoje,
        dataFormatted: new Date(`${hoje}T12:00:00`).toLocaleDateString('pt-BR')
    })));

    const serrandoInput = document.getElementById('patioSerrando');
    if (serrandoInput && rel.serrando) serrandoInput.value = rel.serrando;
    renderizarItensPatioTemp();
    alert(`Fluxo do Patio importado com sucesso. ${itensPatioTemp.length} item(ns) foram carregados no Controle de Producao.`);
}

async function atualizarResumoProducaoRomaneios() {
    const box = document.getElementById('resumoPatioRomaneios');
    if (!box) return;
    const totaisPatio = calcularTotaisFluxoPatio(itensPatioTemp || []);
    const vendidos = { totalPacotes: 0, totalVolume: 0, porClasse: { 1: 0, 2: 0, 3: 0 } };
    try {
        const romaneios = await carregarRomaneiosPatioCache();
        romaneios.forEach(romaneio => {
            (romaneio.pacotes || []).filter(p => p.origemPatio).forEach(p => {
                const qtd = Number(p.patioQtdPacotes || p.qtdPacotes || 0);
                const classe = obterNumeroClasse(p.qualidade || p.classe) || 0;
                vendidos.totalPacotes += qtd;
                vendidos.totalVolume += Number(p.m3VendaTotal || p.volumeTotal || 0);
                vendidos.porClasse[classe] = (vendidos.porClasse[classe] || 0) + qtd;
            });
        });
    } catch (error) {
        console.warn('Nao foi possivel calcular pacotes vendidos do patio:', error);
    }
    const saldoTotal = Math.max(0, (totaisPatio.pacotes || 0) - vendidos.totalPacotes);
    box.innerHTML = `
        <div class="patio-kpi-card" style="background:rgba(59,130,246,0.1);">
            <span class="kpi-label">VENDIDOS ROMANEIO</span>
            <div class="kpi-value">${vendidos.totalPacotes || 0}</div>
            <small>1a: ${vendidos.porClasse[1] || 0} | 2a: ${vendidos.porClasse[2] || 0} | ${formatDecimalMockup(vendidos.totalVolume)} m3</small>
        </div>
        <div class="patio-kpi-card" style="background:rgba(15,23,42,0.58);">
            <span class="kpi-label">SALDO ESTIMADO</span>
            <div class="kpi-value">${saldoTotal}</div>
        </div>
    `;
}

function chaveResumoPatio(item) {
    return `${obterNumeroClasse(item.classe) || 0}|${Number(item.espessura || 0).toFixed(1)}|${Number(item.largura || 0).toFixed(1)}|${Number(item.comprimento || 0).toFixed(2)}`;
}

function acumularResumoPatio(mapa, item, sinal = 1) {
    const chave = chaveResumoPatio(item);
    const atual = mapa.get(chave) || {
        classe: obterNumeroClasse(item.classe) || 0,
        espessura: Number(item.espessura || 0), largura: Number(item.largura || 0), comprimento: Number(item.comprimento || 0),
        inicialPacotes: 0, atualPacotes: 0, vendidosPacotes: 0, inicialVolume: 0, atualVolume: 0, vendidosVolume: 0
    };
    atual.atualPacotes += sinal * Number(item.pacotes || 0);
    atual.atualVolume += sinal * Number(item.volume || 0);
    mapa.set(chave, atual);
}

function obterRelatoriosResumoProducao() {
    return [...historicoPatioAtuais].sort((a, b) => new Date(b.atualizadoEm || b.criadoEm || b.data || 0) - new Date(a.atualizadoEm || a.criadoEm || a.data || 0));
}

window.navegarResumoProducaoPatio = async function(delta) {
    const relatorios = obterRelatoriosResumoProducao();
    if (!relatorios.length) return;
    resumoProducaoPatioIndice = Math.max(0, Math.min(relatorios.length - 1, resumoProducaoPatioIndice + delta));
    await renderizarResumoProducaoPatioPorIndice(resumoProducaoPatioIndice);
};

async function mostrarResumoProducaoPatio() {
    const painel = document.getElementById('painelResumoProducaoPatio');
    if (!painel) return;
    if (painel.style.display !== 'none') {
        painel.style.display = 'none';
        return;
    }
    painel.style.display = 'block';
    const relatorios = obterRelatoriosResumoProducao();
    const indiceAtual = relatorios.findIndex(r => r.id === relatorioPatioEditandoId || r.data === dataAtualPatio());
    resumoProducaoPatioIndice = indiceAtual >= 0 ? indiceAtual : 0;
    await renderizarResumoProducaoPatioPorIndice(resumoProducaoPatioIndice);
}

async function renderizarResumoProducaoPatioPorIndice(indice = 0) {
    const painel = document.getElementById('painelResumoProducaoPatio');
    if (!painel) return;
    painel.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Calculando resumo do dia...';
    const relatorios = obterRelatoriosResumoProducao();
    const rel = relatorios[indice];
    if (!rel) {
        painel.innerHTML = 'Salve a primeira contagem do patio para gerar o resumo.';
        return;
    }
    const mapa = new Map();
    const inicial = Array.isArray(rel.estoqueInicialDia) ? rel.estoqueInicialDia : (rel.itens || []);
    const atual = itensPatioTemp.length ? itensPatioTemp : (rel.itens || []);
    inicial.forEach(item => {
        acumularResumoPatio(mapa, item, 0);
        const linha = mapa.get(chaveResumoPatio(item));
        linha.inicialPacotes += Number(item.pacotes || 0);
        linha.inicialVolume += Number(item.volume || 0);
    });
    atual.forEach(item => acumularResumoPatio(mapa, item));
    try {
        const romaneios = await carregarRomaneiosPatioCache();
        romaneios.forEach(rom => {
            const data = rom.logistica?.dataCarregamento || rom.data || '';
            if (data !== rel.data) return;
            (rom.pacotes || []).filter(p => p.origemPatio).forEach(p => {
                const item = {
                    classe: p.qualidade || p.classe,
                    espessura: p.espessura ?? p.esp,
                    largura: p.largura ?? p.larg,
                    comprimento: p.comprimento ?? p.compV,
                    pacotes: Number(p.patioQtdPacotes || p.qtdPacotes || 0),
                    volume: Number(p.m3VendaTotal || 0)
                };
                acumularResumoPatio(mapa, item, 0);
                const linha = mapa.get(chaveResumoPatio(item));
                linha.vendidosPacotes += item.pacotes;
                linha.vendidosVolume += item.volume;
            });
        });
    } catch (error) {
        console.warn('Erro ao calcular resumo diario do patio:', error);
    }
    const linhas = [...mapa.values()].sort((a, b) => a.classe - b.classe || b.comprimento - a.comprimento || b.espessura - a.espessura).map(item => {
        const produzidosPacotes = Math.max(0, item.atualPacotes + item.vendidosPacotes - item.inicialPacotes);
        const produzidoVolume = Math.max(0, item.atualVolume + item.vendidosVolume - item.inicialVolume);
        return `<tr><td>${item.classe}a</td><td>${formatDecimal(item.espessura,1)} / ${formatDecimal(item.largura,1)} / ${formatDecimal(item.comprimento,2)}</td><td>${item.inicialPacotes}</td><td>${item.vendidosPacotes}</td><td>${item.atualPacotes}</td><td>${produzidosPacotes}</td><td>${formatDecimalMockup(produzidoVolume)} m3</td></tr>`;
    }).join('');
    const dataResumo = rel.data ? new Date(`${rel.data}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data';
    painel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:12px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <button type="button" class="btn-icon" onclick="window.navegarResumoProducaoPatio(1)" ${indice >= relatorios.length - 1 ? 'disabled' : ''} title="Dia anterior" style="width:38px; height:38px; border-radius:10px;"><i class="fa-solid fa-chevron-left"></i></button>
                <h3 style="margin:0; min-width:210px; text-align:center;">Resumo da Producao - ${dataResumo}</h3>
                <button type="button" class="btn-icon" onclick="window.navegarResumoProducaoPatio(-1)" ${indice <= 0 ? 'disabled' : ''} title="Dia mais recente" style="width:38px; height:38px; border-radius:10px;"><i class="fa-solid fa-chevron-right"></i></button>
                <small style="color:var(--text-muted); font-weight:800;">${indice + 1} de ${relatorios.length}</small>
            </div>
            <button type="button" class="btn-icon" onclick="document.getElementById('painelResumoProducaoPatio').style.display='none'" title="Fechar" style="width:38px; height:38px; border-radius:10px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="overflow-x:auto;"><table style="width:100%; text-align:center;"><thead><tr><th>Classe</th><th>Cubagem</th><th>Inicio</th><th>Vendido</th><th>Saldo</th><th>Produzido</th><th>Volume produzido</th></tr></thead><tbody>${linhas || '<tr><td colspan="7">Sem movimentacoes.</td></tr>'}</tbody></table></div>
    `;
}

// Calcular os totais acumulados salvos no dia atual
async function calcularAcumuladosHoje(hojeStr) {
    totaisSalvosHoje = { pacotes: 0, volume: 0 };
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
        alert("⚠️ O pátio está vazio! Insira pelo menos um lote ou pacote para poder salvar.");
        return;
    }

    const dataVal = dataAtualPatio();
    const periodoVal = 'Atualizacao do dia';
    const horarioVal = horaAtualPatio();
    const serrandoVal = document.getElementById('patioSerrando').value.toUpperCase().trim();

    if (!serrandoVal) {
        alert("⚠️ Por favor, digite qual madeira está sendo serrada no momento.");
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
        atualizadoEm: new Date().toISOString(),
        ultimaAlteracaoPatio: montarUltimaAlteracaoPatio(relatorioPatioEditandoId ? 'Atualizou lista do patio' : 'Criou lista do patio')
    };

    const relatorioExistente = historicoPatioAtuais.find(item => item.id === relatorioPatioEditandoId);
    relatorio.estoqueInicialDia = Array.isArray(relatorioExistente?.estoqueInicialDia)
        ? relatorioExistente.estoqueInicialDia
        : itensOrdenados.map(item => ({ ...item }));

    if (!relatorioPatioEditandoId) {
        relatorio.criadoEm = new Date().toISOString();
    }

    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';

    try {
        if (relatorioPatioEditandoId) {
            await updateDoc(doc(db, 'patio_relatorios', relatorioPatioEditandoId), relatorio);
            alert(`✅ Contagem do Pátio atualizada com sucesso!\nVolume Total: ${formatDecimalMockup(totalVolume)} m³.`);
        } else {
            relatorioPatioEditandoId = await window.FS.addDoc('patio_relatorios', relatorio);
            alert(`✅ Contagem do Pátio salva com sucesso!\nVolume Total: ${formatDecimalMockup(totalVolume)} m³.`);
        }

        atualizarEstadoEdicaoPatio();

        // Recarregar histórico e atualizar os acumulados salvos do dia
        await carregarHistoricoPatio(true);
        const relAtualizado = historicoPatioAtuais.find(rel => rel.id === relatorioPatioEditandoId);
        if (relAtualizado) carregarRelatorioPatioNoFormulario(relAtualizado, relAtualizado.id);
        atualizarAvisoUltimaAlteracaoPatio();
        await calcularAcumuladosHoje(dataVal);
    } catch (error) {
        console.error("Erro ao salvar contagem do pátio:", error);
        alert("❌ Ocorreu um erro ao salvar o relatório no Firebase.");
    } finally {
        btnSalvar.disabled = false;
        atualizarEstadoEdicaoPatio();
    }
}

// Carregar Histórico do Firebase
async function carregarHistoricoPatio(force = false) {
    const tbody = document.getElementById('listaHistoricoPatio');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;"><span class="saw-loader" aria-hidden="true"></span> Carregando contagens...</td></tr>';

    try {
        await carregarRelatoriosPatioCache(force);

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
            alert("✅ Relatório de pátio excluído com sucesso!");
            await carregarHistoricoPatio(true);
            
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
    imprimirListaDetalhadaPatio(rel);
};

window.visualizarHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    window.patioDocActions.set(rel);
    imprimirListaDetalhadaPatio(rel);
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
            const cubagem = `${formatDecimal(i.espessura, 1)} / ${formatDecimal(i.largura, 1)} / ${formatDecimal(i.comprimento, 2)}`;
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

function carregarRelatorioPatioNoFormulario(rel, id) {
    const inputData = document.getElementById('patioData');
    const selectPeriodo = document.getElementById('patioPeriodo');
    const inputHorario = document.getElementById('patioHorario');
    const inputSerrando = document.getElementById('patioSerrando');

    if (inputData) inputData.value = rel.data || dataAtualPatio();
    if (selectPeriodo) selectPeriodo.value = rel.periodo || 'Atualizacao do dia';
    if (inputHorario) inputHorario.value = rel.horario || horaAtualPatio();
    if (inputSerrando) inputSerrando.value = rel.serrando || '';

    relatorioPatioEditandoId = id;
    itensPatioTemp = Array.isArray(rel.itens) ? rel.itens.map(item => ({ ...item })) : [];
    renderizarItensPatioTemp();
    atualizarEstadoEdicaoPatio();
}

window.editarHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    if (!confirm("Deseja carregar este lancamento salvo para edicao no Controle de Producao?")) return;

    carregarRelatorioPatioNoFormulario(rel, id);
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
    const telefoneSerraria = emitente.telefone || emitente.celular || "(15) 99629-7072";
    const emailSerraria = emitente.email || "escritoriovanmarte@hotmail.com";

    // Gerar etiquetas individuais por pacote físico
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

// Gerar layout de fechamento do pátio para impressão agrupado
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
            background-color: #fff4d6;
            color: #b45309;
            border-bottom: 2px solid #f59e0b;
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
        .classe-row-1 .classe-col,
        .classe-row-1 .cubagem-col {
            color: #15803d;
        }
        .classe-row-2 .classe-col,
        .classe-row-2 .cubagem-col {
            color: #b45309;
        }
        .classe-row-3 .classe-col,
        .classe-row-3 .cubagem-col {
            color: #b91c1c;
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
            .class-header-2 { background-color: #fff4d6 !important; color: #b45309 !important; -webkit-print-color-adjust: exact; }
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
        const rowClass = headerClass === 'class-header-1' ? 'classe-row-1' : headerClass === 'class-header-2' ? 'classe-row-2' : headerClass === 'class-header-3' ? 'classe-row-3' : '';
        
        let rowsHtml = '';
        itens.forEach(i => {
            const classeTexto = classeName;
            rowsHtml += `
                <tr class="${rowClass}">
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

// ---- LEITURA DA FOTO DA CONTAGEM (folha escrita a mao) ----
// A foto vai para /api/patio-foto, volta como linhas e o usuario confere antes de lancar.
let leituraFotoPatio = [];

function redimensionarFotoContagemPatio(file, maxLado = 1800) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = () => reject(new Error('Nao foi possivel abrir a foto.'));
        leitor.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Arquivo nao e uma imagem valida.'));
            img.onload = () => {
                const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * escala);
                canvas.height = Math.round(img.height * escala);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(file);
    });
}

function numeroFotoPatio(valor) {
    return Number(String(valor ?? '').trim().replace(',', '.')) || 0;
}

function converterMedidaFotoPatio(medida) {
    const partes = String(medida || '').split(/[\/\\|]/).map(p => p.trim()).filter(Boolean);
    if (partes.length < 3) return null;
    const ler = (valor, divisor) => {
        if (/[.,]/.test(valor)) return numeroFotoPatio(valor);
        const n = Number(valor.replace(/\D/g, ''));
        return n ? n / divisor : 0;
    };
    return { espessura: ler(partes[0], 10), largura: ler(partes[1], 10), comprimento: ler(partes[2], 1000) };
}

function normalizarLeituraFotoPatio(dados) {
    const linhas = [];
    (dados?.classes || []).forEach(grupo => {
        const classe = [1, 2, 3].includes(Number(grupo.classe)) ? Number(grupo.classe) : 1;
        (grupo.linhas || []).forEach(linha => {
            const medida = converterMedidaFotoPatio(linha.medida) || { espessura: 0, largura: 0, comprimento: 0 };
            const configs = (linha.configuracoes || []).map(c => ({
                pacotes: Number(c.pacotes) || 0,
                alturas: Number(c.alturas) || 0,
                largura: Number(c.largura) || 0,
                amarras: Number(c.amarras) || 0
            }));
            linhas.push({
                classe,
                totalCirculo: grupo.totalCirculo ?? null,
                ...medida,
                totalLinha: linha.totalLinha ?? null,
                duvida: !!linha.duvida,
                observacao: String(linha.observacao || ''),
                configs: configs.length ? configs : [{ pacotes: 1, alturas: 0, largura: 0, amarras: 0 }]
            });
        });
    });
    return linhas;
}

function escapeHtmlFotoPatio(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function garantirModalFotoPatio() {
    let modal = document.getElementById('modalFotoContagemPatio');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'modalFotoContagemPatio';
    modal.className = 'foto-patio-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'fotoPatioTitulo');
    modal.innerHTML = `
        <div class="foto-patio-caixa">
            <header class="foto-patio-topo">
                <div>
                    <h3 id="fotoPatioTitulo">Conferir leitura da foto</h3>
                    <p>Confira cada linha. Corrija o que estiver errado antes de lançar.</p>
                </div>
                <button type="button" class="foto-patio-fechar" onclick="window.fecharFotoContagemPatio()" aria-label="Fechar">×</button>
            </header>
            <div id="fotoPatioConteudo" class="foto-patio-conteudo"></div>
            <footer class="foto-patio-rodape">
                <button type="button" class="foto-patio-btn foto-patio-btn-sec" onclick="window.fecharFotoContagemPatio()">Cancelar</button>
                <button type="button" class="foto-patio-btn foto-patio-btn-alerta" onclick="window.aplicarFotoContagemPatio('substituir')">Substituir contagem do pátio</button>
                <button type="button" class="foto-patio-btn foto-patio-btn-ok" onclick="window.aplicarFotoContagemPatio('somar')">Somar ao pátio</button>
            </footer>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function renderizarPreviaFotoPatio() {
    const alvo = document.getElementById('fotoPatioConteudo');
    if (!alvo) return;
    if (!leituraFotoPatio.length) {
        alvo.innerHTML = '<div class="foto-patio-vazio">Nenhuma linha foi lida na foto.</div>';
        return;
    }
    const num = (v, passo = '1') => `value="${v === null || v === undefined ? '' : v}" inputmode="decimal" step="${passo}"`;
    const porClasse = new Map();
    leituraFotoPatio.forEach((linha, i) => {
        if (!porClasse.has(linha.classe)) porClasse.set(linha.classe, []);
        porClasse.get(linha.classe).push({ linha, i });
    });
    let html = '';
    [...porClasse.keys()].sort((a, b) => a - b).forEach(classe => {
        const itens = porClasse.get(classe);
        const somaClasse = itens.reduce((s, { linha }) => s + linha.configs.reduce((a, c) => a + (Number(c.pacotes) || 0), 0), 0);
        const circulo = itens.find(({ linha }) => linha.totalCirculo !== null && linha.totalCirculo !== undefined)?.linha.totalCirculo;
        const okClasse = circulo === undefined || circulo === null || Number(circulo) === somaClasse;
        html += `<section class="foto-patio-classe fp-classe-n${classe}">
            <div class="foto-patio-classe-tit"><b>${classe}ª CLASSE</b>
                <span class="${okClasse ? '' : 'foto-patio-erro'}">${somaClasse} pct${circulo !== undefined && circulo !== null ? ` · folha: ${circulo}${okClasse ? ' ✓' : ' ✗ não bate'}` : ''}</span>
            </div>`;
        itens.forEach(({ linha, i }) => {
            const soma = linha.configs.reduce((a, c) => a + (Number(c.pacotes) || 0), 0);
            const okLinha = linha.totalLinha === null || linha.totalLinha === undefined || Number(linha.totalLinha) === soma;
            html += `<div class="foto-patio-linha ${okLinha && !linha.duvida ? '' : 'is-alerta'}">
                <div class="foto-patio-medida">
                    <label>Classe<select onchange="window.editarFotoPatio(${i}, null, 'classe', this.value)">
                        ${[1, 2, 3].map(n => `<option value="${n}" ${n === linha.classe ? 'selected' : ''}>${n}ª</option>`).join('')}
                    </select></label>
                    <label>Esp.<input type="number" ${num(linha.espessura, '0.1')} onchange="window.editarFotoPatio(${i}, null, 'espessura', this.value)"></label>
                    <label>Larg.<input type="number" ${num(linha.largura, '0.1')} onchange="window.editarFotoPatio(${i}, null, 'largura', this.value)"></label>
                    <label>Comp.<input type="number" ${num(linha.comprimento, '0.01')} onchange="window.editarFotoPatio(${i}, null, 'comprimento', this.value)"></label>
                    <button type="button" class="foto-patio-remover" onclick="window.removerLinhaFotoPatio(${i})" aria-label="Remover linha">Remover</button>
                </div>
                ${linha.configs.map((c, j) => `
                <div class="foto-patio-config">
                    <label>Pacotes<input type="number" ${num(c.pacotes)} onchange="window.editarFotoPatio(${i}, ${j}, 'pacotes', this.value)"></label>
                    <span class="foto-patio-formula">(<input type="number" ${num(c.alturas)} aria-label="Alturas" onchange="window.editarFotoPatio(${i}, ${j}, 'alturas', this.value)">×<input type="number" ${num(c.largura)} aria-label="Largura do pacote" onchange="window.editarFotoPatio(${i}, ${j}, 'largura', this.value)">) +<input type="number" ${num(c.amarras)} aria-label="Amarras" onchange="window.editarFotoPatio(${i}, ${j}, 'amarras', this.value)"><small>am</small></span>
                </div>`).join('')}
                <div class="foto-patio-conferencia ${okLinha ? '' : 'foto-patio-erro'}">
                    Soma: <b>${soma}</b> pct${linha.totalLinha !== null && linha.totalLinha !== undefined ? ` · folha: ${linha.totalLinha}${okLinha ? ' ✓' : ' ✗ não bate'}` : ''}
                    ${linha.duvida ? ' · <span class="foto-patio-erro">leitura com dúvida</span>' : ''}
                    ${linha.observacao ? ` · ${escapeHtmlFotoPatio(linha.observacao)}` : ''}
                </div>
            </div>`;
        });
        html += '</section>';
    });
    alvo.innerHTML = html;
}

window.editarFotoPatio = function(i, j, campo, valor) {
    const linha = leituraFotoPatio[i];
    if (!linha) return;
    if (j === null) {
        linha[campo] = campo === 'classe' ? Number(valor) : numeroFotoPatio(valor);
    } else if (linha.configs[j]) {
        linha.configs[j][campo] = parseInt(valor, 10) || 0;
    }
    if (campo === 'pacotes' || campo === 'classe') renderizarPreviaFotoPatio();
};

window.removerLinhaFotoPatio = function(i) {
    leituraFotoPatio.splice(i, 1);
    renderizarPreviaFotoPatio();
};

window.fecharFotoContagemPatio = function() {
    const modal = document.getElementById('modalFotoContagemPatio');
    if (modal) modal.style.display = 'none';
};

window.abrirFotoContagemPatio = function() {
    let input = document.getElementById('inputFotoContagemPatio');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.id = 'inputFotoContagemPatio';
        input.style.display = 'none';
        input.addEventListener('change', () => {
            const arquivo = input.files?.[0];
            input.value = '';
            if (arquivo) lerFotoContagemPatio(arquivo);
        });
        document.body.appendChild(input);
    }
    input.click();
};

async function lerFotoContagemPatio(arquivo) {
    const modal = garantirModalFotoPatio();
    const conteudo = document.getElementById('fotoPatioConteudo');
    modal.style.display = 'flex';
    modal.classList.add('is-lendo');
    conteudo.innerHTML = '<div class="foto-patio-vazio" aria-live="polite">Lendo a foto… pode levar até 30 segundos.</div>';
    try {
        const imagem = await redimensionarFotoContagemPatio(arquivo);
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error('Sessao expirada. Entre novamente.');
        const resposta = await fetch('/api/patio-foto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagem, idToken })
        });
        const retorno = await resposta.json().catch(() => ({}));
        if (!resposta.ok) throw new Error(retorno.error || 'Nao foi possivel ler a foto.');
        leituraFotoPatio = normalizarLeituraFotoPatio(retorno.dados);
        renderizarPreviaFotoPatio();
    } catch (error) {
        leituraFotoPatio = [];
        conteudo.innerHTML = `<div class="foto-patio-vazio foto-patio-erro">${escapeHtmlFotoPatio(error.message || 'Erro ao ler a foto.')}</div>`;
    } finally {
        modal.classList.remove('is-lendo');
    }
}

window.aplicarFotoContagemPatio = async function(modo) {
    const itensNovos = [];
    for (const linha of leituraFotoPatio) {
        for (const c of linha.configs) {
            const pecas = (c.alturas || 0) * (c.largura || 0) + (c.amarras || 0);
            if (!(linha.espessura > 0 && linha.largura > 0 && linha.comprimento > 0 && c.pacotes > 0 && pecas > 0)) {
                alert(`Linha ${formatDecimal(linha.espessura || 0, 1)} / ${formatDecimal(linha.largura || 0, 1)} / ${formatDecimal(linha.comprimento || 0, 2)} está incompleta. Corrija ou remova antes de lançar.`);
                return;
            }
            itensNovos.push({ linha, c, pecas });
        }
    }
    if (!itensNovos.length) {
        alert('Nada para lançar.');
        return;
    }
    if (modo === 'substituir' && !confirm('Substituir toda a contagem atual do Fluxo do Pátio pela leitura da foto? (Dá para desfazer depois.)')) return;

    try {
        await garantirRelatorioProducaoPatioAtual();
        await sincronizarRelatorioProducaoPatioAtual();
        const itensAnteriores = clonarItensParaDesfazer(producaoPatioRelatorioAtual?.itens || []);
        if (modo === 'substituir') producaoPatioRelatorioAtual.itens = [];
        const dataRaw = producaoPatioRelatorioAtual.data || new Date().toISOString().slice(0, 10);
        itensNovos.forEach(({ linha, c, pecas }, idx) => {
            const volumeUnidade = (linha.espessura / 100) * (linha.largura / 100) * linha.comprimento * pecas;
            mesclarCubagemProducaoPatio({
                id: `${Date.now()}${idx}${Math.random().toString(36).slice(2, 6)}`,
                dataRaw,
                dataFormatted: new Date(`${dataRaw}T12:00:00`).toLocaleDateString('pt-BR'),
                tipo: 'MADEIRA',
                classe: `${linha.classe}a CLASSE`,
                especie: 'EUCALIPTO',
                espessura: linha.espessura,
                largura: linha.largura,
                comprimento: linha.comprimento,
                pacotes: c.pacotes,
                pecas,
                pecasRaw: `${c.alturas}x${c.largura}${c.amarras > 0 ? `+${c.amarras}` : ''}`,
                totalPecas: c.pacotes * pecas,
                volumeUnidade,
                volume: volumeUnidade * c.pacotes
            });
        });
        const totalPct = itensNovos.reduce((s, { c }) => s + c.pacotes, 0);
        producaoPatioRelatorioAtual.ultimaAlteracaoPatio = montarUltimaAlteracaoPatio(`${modo === 'substituir' ? 'Substituiu a contagem' : 'Somou contagem'} pela foto (${totalPct} pct)`);
        await salvarRelatorioProducaoPatio(producaoPatioRelatorioAtual);
        window.fecharFotoContagemPatio();
        await renderizarProducaoPatio({ recarregar: false });
        registrarDesfazerFluxoPatio(itensAnteriores, `Contagem da foto ${modo === 'substituir' ? 'substituiu' : 'somou'} ${totalPct} pacote(s) no Fluxo do Patio.`);
    } catch (error) {
        if (!error?.avisado) alert('Não foi possível lançar a contagem da foto. Tente novamente.');
    }
};


// Montador 3D com os pacotes do Controle de Producao (somente planejamento, nao grava).
window.montarCargaPatio3D = function() {
    const itens = (itensPatioTemp || []).filter(i => Number(i.pacotes) > 0).map(i => {
        const cfg = parseConfigPacote(i.pecasRaw);
        const larg = Number(i.largura) || 0;
        let cam = Number(cfg.cam) || 0, alt = Number(cfg.alt) || 0, am = Number(cfg.am) || 0;
        if (!cam && larg) cam = Math.max(1, Math.floor(120 / larg + 0.001));
        if (!alt && cam) { alt = Math.max(1, Math.round((Number(i.pecas) || cam) / cam)); am = 0; }
        return { qtd: Number(i.pacotes) || 0, p: { especie: i.especie || '', classe: obterNumeroClasse(i.classe) || 1, esp: Number(i.espessura) || 0, larg, comp: Number(i.comprimento) || 0, alt, cam, am } };
    }).filter(x => x.p.esp > 0 && x.p.larg > 0 && x.p.comp > 0);
    window.abrirMontadorCarga3D?.(itens, { titulo: 'Montar carga do pátio', origem: 'Pacotes do Controle de Produção' });
};
