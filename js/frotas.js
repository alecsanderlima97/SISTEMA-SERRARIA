// --- CONTROLE DE FROTAS & EQUIPAMENTOS JS ---
// Arquitetura SaaS Premium com persistência de dados offline-first (localStorage)
// Integrado com controle de estoque e consumo de insumos (diesel e lubrificantes)

console.log("Módulo de Frotas carregado com sucesso. Inicializando...");

// --- PERSISTÊNCIA & ALIMENTAÇÃO DE DADOS PADRÕES ---
const KEYS = {
    FROTA: 'orquestra_frota',
    ABASTECIMENTOS: 'orquestra_frota_abastecimentos',
    MANUTENCOES: 'orquestra_frota_manutencoes',
    ESTOQUE: 'orquestra_estoque' // Chave unificada para simular o almoxarifado
};

// Inicialização de dados default no Estoque para demonstrar a vinculação
const DEFAULT_ESTOQUE = [
    { id: 'est_01', nome: 'FILTRO DE AR DE MOTOR', categoria: 'FILTROS', quantidade: 15, unitario: 180.00 },
    { id: 'est_02', nome: 'FILTRO DE COMBUSTÍVEL', categoria: 'FILTROS', quantidade: 22, unitario: 90.00 },
    { id: 'est_03', nome: 'PASTILHA DE FREIO DIANTEIRA', categoria: 'PEÇAS', quantidade: 8, unitario: 320.00 },
    { id: 'est_04', nome: 'CORREIA DO ALTERNADOR', categoria: 'CORREIAS INDUSTRIAIS', quantidade: 12, unitario: 75.00 },
    { id: 'est_05', nome: 'ÓLEO LUBRIFICANTE 15W40', categoria: 'LUBRIFICANTES', quantidade: 250, unitario: 28.00 },
    { id: 'est_06', nome: 'ÓLEO HIDRÁULICO ISO 68', categoria: 'LUBRIFICANTES', quantidade: 400, unitario: 32.00 },
    { id: 'est_07', nome: 'GRAXA DE CHASSI MP2', categoria: 'LUBRIFICANTES', quantidade: 50, unitario: 24.00 },
    { id: 'est_08', nome: 'BICO INJETOR DIESEL', categoria: 'PEÇAS', quantidade: 6, unitario: 650.00 },
    { id: 'est_09', nome: 'DIESEL COMUM', categoria: 'DIESEL', quantidade: 5000, unitario: 5.89 }
];

const DEFAULT_FROTA = [
    { id: 'v_01', modelo: 'CAMINHÃO VOLVO FH 540', placa: 'ABC-5F40', grupo: 'FLORESTAL', ano: 2021, documento: '', documentoNome: '' },
    { id: 'v_02', modelo: 'PÁ CARREGADEIRA CAT 924K', placa: 'PC-02', grupo: 'SERRARIA', ano: 2019, documento: '', documentoNome: '' },
    { id: 'v_03', modelo: 'ESCADA DE ESTEIRA KOMATSU D61', placa: 'TR-05', grupo: 'TERRAPLANAGEM', ano: 2022, documento: '', documentoNome: '' }
];

// Carregar e persistir iniciais se vazios
function obterBanco(key, defaults = []) {
    const dados = localStorage.getItem(key);
    if (!dados) {
        localStorage.setItem(key, JSON.stringify(defaults));
        return defaults;
    }
    return JSON.parse(dados);
}

function salvarBanco(key, dados) {
    localStorage.setItem(key, JSON.stringify(dados));
}

// Estados Locais
let frota = obterBanco(KEYS.FROTA, DEFAULT_FROTA);
let abastecimentos = obterBanco(KEYS.ABASTECIMENTOS, []);
let manutencoes = obterBanco(KEYS.MANUTENCOES, []);
let estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);

// Lista temporária de peças para o modal de manutenção
let pecasManutencaoTemp = [];

// --- FILTRO DE GRUPO ---
let setorFiltroAtual = 'TODOS';

// --- INICIALIZADOR DO MÓDULO ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventosFrotas();
    renderizarFrota();
    atualizarKPIsFrota();
});

// Registrar eventos
function inicializarEventosFrotas() {
    const btnCancelar = document.getElementById('btnCancelarFrota');
    const form = document.getElementById('formFrota');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            window.switchTabFrotas('lista');
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarVeiculo();
        });
    }

    document.getElementById('buscaFrota')?.addEventListener('input', renderizarFrota);
    document.getElementById('ordenarFrota')?.addEventListener('change', renderizarFrota);

    // Registrar submits de modals
    const formAbast = document.getElementById('formAbastecimento');
    if (formAbast) {
        formAbast.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarAbastecimento();
        });
    }

    const formManut = document.getElementById('formManutencao');
    if (formManut) {
        formManut.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarManutencao();
        });
    }
}

window.switchTabFrotas = function(tabName, isEditing = false) {
    const tabForm = document.getElementById('cardFormFrota');
    const tabLista = document.getElementById('panelListaFrotas');
    const btnForm = document.getElementById('btnTabFrotaForm');
    const btnLista = document.getElementById('btnTabFrotaLista');

    if (!tabForm || !tabLista || !btnForm || !btnLista) return;

    if (tabName === 'form') {
        tabForm.style.display = 'block';
        tabLista.style.display = 'block';
        btnForm.style.color = 'var(--accent-color)';
        btnForm.style.borderBottom = '3px solid var(--accent-color)';
        btnLista.style.color = 'var(--text-muted)';
        btnLista.style.borderBottom = 'none';

        if (!isEditing) {
            limparFormFrota();
            document.getElementById('veiculoId').value = '';
            document.getElementById('formFrotaTitulo').innerHTML = `<i class="fa-solid fa-truck-pickup"></i> Novo Veículo`;
            const lblTab = document.getElementById('lblTabFrotaForm');
            if (lblTab) lblTab.textContent = 'Novo Veículo / Máquina';
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

// --- CONTROLE DE CADASTRO DE VEÍCULOS ---
function limparFormFrota() {
    document.getElementById('veiculoId').value = '';
    document.getElementById('veicModelo').value = '';
    document.getElementById('veicPlaca').value = '';
    document.getElementById('veicGrupo').value = 'SERRARIA';
    document.getElementById('veicAno').value = '';
    document.getElementById('veicDocumento').value = '';
    document.getElementById('lblDocumentoNome').textContent = 'Nenhum arquivo anexado';
    document.getElementById('veicDocumentoBase64').value = '';
    document.getElementById('formFrotaTitulo').innerHTML = '<i class="fa-solid fa-truck-pickup"></i> Novo Veículo';
}

// Conversão do documento para base64 para salvar no localStorage
window.handleDocumentoUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const label = document.getElementById('lblDocumentoNome');
    if (label) label.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        document.getElementById('veicDocumentoBase64').value = base64Data;
    };
    reader.readAsDataURL(file);
};

function salvarVeiculo() {
    const id = document.getElementById('veiculoId').value;
    const modelo = document.getElementById('veicModelo').value.trim().toUpperCase() || 'VEÍCULO S/ MODELO';
    const placa = document.getElementById('veicPlaca').value.trim().toUpperCase() || 'S/ PLACA';
    const grupo = document.getElementById('veicGrupo').value || 'SERRARIA';
    const ano = parseInt(document.getElementById('veicAno').value) || new Date().getFullYear();
    const documento = document.getElementById('veicDocumentoBase64').value;
    const documentoNome = document.getElementById('lblDocumentoNome').textContent;

    if (id) {
        // Editar existente
        frota = frota.map(v => v.id === id ? { ...v, modelo, placa, grupo, ano, documento: documento || v.documento, documentoNome: documento ? documentoNome : v.documentoNome, atualizadoEm: new Date().toISOString() } : v);
    } else {
        // Novo veículo
        const novo = {
            id: 'v_' + new Date().getTime(),
            modelo,
            placa,
            grupo,
            ano,
            documento,
            documentoNome: documento ? documentoNome : 'Sem Anexo',
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };
        frota.push(novo);
    }

    salvarBanco(KEYS.FROTA, frota);
    renderizarFrota();
    atualizarKPIsFrota();

    // Fechar formulário
    window.switchTabFrotas('lista');
}

window.editarVeiculo = function(id) {
    const v = frota.find(item => item.id === id);
    if (!v) return;

    window.switchTabFrotas('form', true);

    document.getElementById('veiculoId').value = v.id;
    document.getElementById('veicModelo').value = v.modelo;
    document.getElementById('veicPlaca').value = v.placa;
    document.getElementById('veicGrupo').value = v.grupo;
    document.getElementById('veicAno').value = v.ano;
    document.getElementById('veicDocumentoBase64').value = v.documento || '';
    document.getElementById('lblDocumentoNome').textContent = v.documentoNome || 'Sem Anexo';

    document.getElementById('formFrotaTitulo').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Veículo: ${v.placa}`;
    const lblTab = document.getElementById('lblTabFrotaForm');
    if (lblTab) lblTab.textContent = 'Editar Veículo';

    // Rolar até o form
    document.getElementById('cardFormFrota').scrollIntoView({ behavior: 'smooth' });
};

window.excluirVeiculo = function(id) {
    if (!confirm("Tem certeza que deseja excluir este veículo? Isso não apagará o histórico de abastecimentos e manutenções dele, mas ele não constará na listagem principal.")) return;

    frota = frota.filter(v => v.id !== id);
    salvarBanco(KEYS.FROTA, frota);
    renderizarFrota();
    atualizarKPIsFrota();
};

// --- FILTRAR FROTA ---
window.filtrarFrota = function(grupo) {
    setorFiltroAtual = grupo;
    
    // Atualizar classes ativas dos botões
    const botoes = ['todos', 'serraria', 'florestal', 'terraplanagem'];
    botoes.forEach(b => {
        const el = document.getElementById(`btn-frota-${b}`);
        if (el) el.classList.remove('active');
    });

    const activeEl = document.getElementById(`btn-frota-${grupo.toLowerCase()}`);
    if (activeEl) activeEl.classList.add('active');

    renderizarFrota();
};

// --- RENDERIZAR GRID DE CARD DE VEÍCULOS ---
function renderizarFrota() {
    const grid = document.getElementById('gridVeiculosFrota');
    if (!grid) return;

    const busca = (document.getElementById('buscaFrota')?.value || '').toLowerCase().trim();
    const ordem = document.getElementById('ordenarFrota')?.value || 'nome';
    const filtrados = frota
        .filter(v => setorFiltroAtual === 'TODOS' || v.grupo === setorFiltroAtual)
        .filter(v => [v.modelo, v.placa, v.grupo].some(valor => (valor || '').toLowerCase().includes(busca)))
        .sort((a, b) => {
            if (ordem === 'data-desc') return new Date(b.criadoEm || b.atualizadoEm || 0) - new Date(a.criadoEm || a.atualizadoEm || 0);
            if (ordem === 'data-asc') return new Date(a.criadoEm || a.atualizadoEm || 0) - new Date(b.criadoEm || b.atualizadoEm || 0);
            return (a.modelo || '').localeCompare(b.modelo || '', 'pt-BR');
        });

    if (filtrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: span 3; text-align: center; color: var(--text-muted); padding: 40px;" class="glass-panel">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 10px; color: var(--accent-color);"></i>
                <p>Nenhum veículo ou equipamento cadastrado para o setor <strong>${setorFiltroAtual}</strong>.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtrados.map(v => {
        // Definir cores HSL vibrantes de badges com base no setor
        let badgeColor = '';
        let iconHtml = '<i class="fa-solid fa-truck"></i>';
        if (v.grupo === 'SERRARIA') {
            badgeColor = 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.2);';
            iconHtml = '<i class="fa-solid fa-forklift"></i>';
        } else if (v.grupo === 'FLORESTAL') {
            badgeColor = 'background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2);';
            iconHtml = '<i class="fa-solid fa-tractor"></i>';
        } else {
            badgeColor = 'background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.2);';
            iconHtml = '<i class="fa-solid fa-trowel-rebuild"></i>';
        }

        // Link de documento
        const docLinkHtml = v.documento 
            ? `<button class="btn-action-card" onclick="window.visualizarDocumento('${v.id}')" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(59,130,246,0.3); background: rgba(59,130,246,0.1); color: #60a5fa;"><i class="fa-solid fa-file-pdf"></i> Doc Anexo</button>`
            : `<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Sem Documento</span>`;

        return `
            <div class="glass-panel" style="padding: 20px; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--panel-border); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div>
                    <!-- Header Card -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; color: var(--accent-color);">
                            ${iconHtml}
                        </div>
                        <span style="font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; ${badgeColor}">
                            ${v.grupo}
                        </span>
                    </div>

                    <!-- Dados Principal -->
                    <h3 style="margin: 0 0 6px 0; font-size: 1.05rem; font-weight: 900; letter-spacing: 0.3px; color: white;">${v.modelo}</h3>
                    <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 15px;">
                        <span>PLACA / PREFIXO: <strong style="color: white;">${v.placa}</strong></span><br>
                        <span>ANO FABRICAÇÃO: <strong style="color: white;">${v.ano}</strong></span><br>
                        <span style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">DOCUMENTO: ${docLinkHtml}</span>
                    </div>
                </div>

                <!-- Ações Rápidas de Frota -->
                <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.abrirModalAbastecimento('${v.id}', 'DIESEL')" class="btn-icon" style="color:#ef4444; font-size:1.1rem; padding: 4px;" title="Lançar Diesel">
                            <i class="fa-solid fa-gas-pump"></i>
                        </button>
                        <button onclick="window.abrirModalAbastecimento('${v.id}', 'LUBRIFICANTE')" class="btn-icon" style="color:#60a5fa; font-size:1.1rem; padding: 4px;" title="Lançar Lubrificante">
                            <i class="fa-solid fa-oil-can"></i>
                        </button>
                        <button onclick="window.abrirModalManutencao('${v.id}')" class="btn-icon" style="color:#3b82f6; font-size:1.1rem; padding: 4px;" title="Registrar Manutenção Preventiva / Corretiva">
                            <i class="fa-solid fa-screwdriver-wrench"></i>
                        </button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.editarVeiculo('${v.id}')" class="btn-icon" style="color:var(--accent); font-size:1.1rem; padding: 4px;" title="Editar Dados do Veículo">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="window.excluirVeiculo('${v.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1.1rem; padding: 4px;" title="Excluir Registro permanentemente">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Download/Visualização do documento anexo em base64
window.visualizarDocumento = function(id) {
    const v = frota.find(item => item.id === id);
    if (!v || !v.documento) return;

    try {
        const newTab = window.open();
        if (newTab) {
            newTab.document.write(`<iframe src="${v.documento}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%; position:fixed;" allowfullscreen></iframe>`);
            newTab.document.title = `Documento - ${v.modelo} (${v.placa})`;
        } else {
            // Trigger download se popups bloqueados
            const link = document.createElement('a');
            link.href = v.documento;
            link.download = v.documentoNome || 'documento_veiculo';
            link.click();
        }
    } catch (e) {
        alert("Não foi possível abrir o documento. Baixando arquivo...");
    }
};

// --- CONTROLAR ATUALIZAÇÃO DE KPIS ---
function atualizarKPIsFrota() {
    const totalEl = document.getElementById('frota-kpi-total');
    const serrariaEl = document.getElementById('frota-kpi-serraria');
    const florestalEl = document.getElementById('frota-kpi-florestal');
    const terraplanagemEl = document.getElementById('frota-kpi-terraplanagem');

    if (totalEl) totalEl.textContent = frota.length;
    if (serrariaEl) serrariaEl.textContent = frota.filter(v => v.grupo === 'SERRARIA').length;
    if (florestalEl) florestalEl.textContent = frota.filter(v => v.grupo === 'FLORESTAL').length;
    if (terraplanagemEl) terraplanagemEl.textContent = frota.filter(v => v.grupo === 'TERRAPLANAGEM').length;
}


// =========================================================================
// MÓDULO ABASTECIMENTO (DIESEL / LUBRIFICANTES LINKED COM ESTOQUE)
// =========================================================================

window.abrirModalAbastecimento = function(veiculoId, tipoPadrao = 'DIESEL') {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;

    document.getElementById('abastVeiculoId').value = v.id;
    document.getElementById('abastData').value = new Date().toISOString().split('T')[0];
    document.getElementById('abastQtd').value = '';
    document.getElementById('abastPreco').value = '';
    document.getElementById('abastTotal').value = '';
    document.getElementById('abastHorimetro').value = obterUltimoHorimetro(v.id);
    document.getElementById('abastTipo').value = tipoPadrao;

    // Informações no Header do modal
    document.getElementById('abastVeiculoCard').innerHTML = `
        <div>
            <strong>VEÍCULO:</strong> ${v.modelo}<br>
            <strong>PLACA / PREFIXO:</strong> ${v.placa}
        </div>
        <div style="text-align: right;">
            <strong>SETOR:</strong> ${v.grupo}<br>
            <strong>ANO:</strong> ${v.ano}
        </div>
    `;

    // Atualizar preço unitário com base no estoque
    atualizarPrecoUnitarioEstoque();
    
    // Renderizar tabela recente do veículo
    renderizarAbastecimentosVeiculo(v.id);

    document.getElementById('modalAbastecimento').style.display = 'flex';
};

window.fecharModalAbastecimento = function() {
    document.getElementById('modalAbastecimento').style.display = 'none';
};

// Autopreencher preço unitário se houver no estoque virtual
window.atualizarPrecoUnitarioEstoque = function() {
    const tipo = document.getElementById('abastTipo').value;
    const inputPreco = document.getElementById('abastPreco');
    if (!inputPreco) return;

    let estoqueNome = '';
    if (tipo === 'DIESEL') estoqueNome = 'DIESEL COMUM';
    else if (tipo === 'LUBRIFICANTE') estoqueNome = 'ÓLEO LUBRIFICANTE 15W40';
    else if (tipo === 'HIDRAULICO') estoqueNome = 'ÓLEO HIDRÁULICO ISO 68';
    else if (tipo === 'GRAXA') estoqueNome = 'GRAXA DE CHASSI MP2';

    const item = estoque.find(i => i.nome === estoqueNome);
    if (item) {
        inputPreco.value = window.formatCurrencyValue(item.unitario);
    } else {
        inputPreco.value = '';
    }
    calcularTotalAbastecimento();
};

window.calcularTotalAbastecimento = function() {
    const qtd = parseFloat(document.getElementById('abastQtd').value) || 0;
    const preco = window.parseCurrencyValue(document.getElementById('abastPreco').value) || 0;
    const inputTotal = document.getElementById('abastTotal');

    if (inputTotal) {
        inputTotal.value = window.formatCurrencyValue(qtd * preco);
    }
};

// Obter o último horímetro/KM lançado
function obterUltimoHorimetro(veiculoId) {
    const filtrados = abastecimentos.filter(a => a.veiculoId === veiculoId);
    const filtradosManut = manutencoes.filter(m => m.veiculoId === veiculoId);
    
    let max = 0;
    filtrados.forEach(a => { if (a.horimetro > max) max = a.horimetro; });
    filtradosManut.forEach(m => { if (m.horimetro > max) max = m.horimetro; });
    
    return max > 0 ? max : '';
}

async function salvarAbastecimento() {
    const veiculoId = document.getElementById('abastVeiculoId').value;
    const data = document.getElementById('abastData').value || new Date().toISOString().split('T')[0];
    const tipo = document.getElementById('abastTipo').value || 'DIESEL';
    const qtd = parseFloat(document.getElementById('abastQtd').value) || 0;
    const preco = window.parseCurrencyValue(document.getElementById('abastPreco').value) || 0;
    const horimetro = parseInt(document.getElementById('abastHorimetro').value) || 0;

    if (qtd < 0 || preco < 0 || horimetro < 0) {
        alert("Por favor, insira valores válidos (maiores ou iguais a zero).");
        return;
    }

    const novo = {
        id: 'ab_' + new Date().getTime(),
        veiculoId,
        data,
        tipo,
        qtd,
        preco,
        total: qtd * preco,
        horimetro
    };

    // --- INTEGRAR E DEDUZIR DO ESTOQUE ---
    let estoqueNome = '';
    if (tipo === 'DIESEL') estoqueNome = 'DIESEL COMUM';
    else if (tipo === 'LUBRIFICANTE') estoqueNome = 'ÓLEO LUBRIFICANTE 15W40';
    else if (tipo === 'HIDRAULICO') estoqueNome = 'ÓLEO HIDRÁULICO ISO 68';
    else if (tipo === 'GRAXA') estoqueNome = 'GRAXA DE CHASSI MP2';

    const v = frota.find(item => item.id === veiculoId);

    if (window.registrarSaidaEstoqueFrota) {
        const itemAtualizado = await window.registrarSaidaEstoqueFrota({
            itemNome: estoqueNome,
            tipoInsumo: tipo,
            quantidade: qtd,
            unitario: preco,
            frotaId: veiculoId,
            frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
            destino: `Consumo Frota: ${v ? v.modelo : 'Veículo'}`,
            observacao: `Abastecimento registrado em frotas. Horímetro/KM: ${horimetro}`
        });

        if (!itemAtualizado) return;
    } else {
    estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);
    let itemEstoque = estoque.find(i => i.nome === estoqueNome);
    
    if (itemEstoque) {
        if (itemEstoque.quantidade < qtd) {
            console.log(`Atenção: A quantidade lançada (${qtd}) é maior do que o saldo atual em estoque (${itemEstoque.quantidade}). O estoque ficará negativo.`);
        }
        itemEstoque.quantidade -= qtd;
        salvarBanco(KEYS.ESTOQUE, estoque);
        console.log(`Estoque deduzido para ${estoqueNome}: novo saldo ${itemEstoque.quantidade}`);

        // Registrar transação de saída no log de estoque
        if (window.registrarMovimentacaoEstoque) {
            const v = frota.find(item => item.id === veiculoId);
            window.registrarMovimentacaoEstoque({
                tipo: 'SAÍDA',
                itemId: itemEstoque.id,
                itemNome: itemEstoque.nome,
                categoria: itemEstoque.categoria,
                quantidade: qtd,
                unitario: preco,
                frotaId: veiculoId,
                frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                destino: `Consumo Frota: ${v ? v.modelo : 'Veículo'}`,
                observacao: `Abastecimento de veículo. Horímetro/KM: ${horimetro}`
            });
        }
    }
    }

    abastecimentos.push(novo);
    salvarBanco(KEYS.ABASTECIMENTOS, abastecimentos);
    
    // Atualizar tabela e limpar form do modal
    renderizarAbastecimentosVeiculo(veiculoId);
    document.getElementById('abastQtd').value = '';
    document.getElementById('abastTotal').value = '';
    document.getElementById('abastHorimetro').value = horimetro; // Manter o último

    alert("Consumo registrado com sucesso! O estoque de almoxarifado foi devidamente deduzido.");
}

function renderizarAbastecimentosVeiculo(veiculoId) {
    const tbody = document.getElementById('listaAbastecimentosVeiculo');
    if (!tbody) return;

    const filtrados = abastecimentos
        .filter(a => a.veiculoId === veiculoId)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px; color: var(--text-muted);">Nenhum consumo registrado anteriormente para este veículo.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(a => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 8px 6px; color: white;">${new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td style="padding: 8px 6px;"><span style="font-weight: bold; color: ${a.tipo === 'DIESEL' ? '#ef4444' : '#60a5fa'}; font-size: 0.78rem;">${a.tipo}</span></td>
            <td style="padding: 8px 6px; text-align: center; color: white;">${a.qtd.toFixed(1)}</td>
            <td style="padding: 8px 6px; text-align: right; font-weight: bold; color: white;">R$ ${a.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td style="padding: 8px 6px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">${a.horimetro}</td>
            <td style="padding: 8px 6px; text-align: center; display: flex; gap: 4px; justify-content: center;">
                <button type="button" class="btn-action-card" onclick="window.imprimirAbastecimento('${a.id}', '${veiculoId}')" title="Imprimir Comprovante" style="padding: 4px 8px; color: #60a5fa;"><i class="fa-solid fa-print"></i></button>
                <button type="button" class="btn-action-card" onclick="window.excluirAbastecimento('${a.id}', '${veiculoId}')" title="Estornar Registro" style="padding: 4px 8px; color: #f87171;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.excluirAbastecimento = function(id, veiculoId) {
    if (!confirm("Tem certeza que deseja estornar este abastecimento? Isso reverterá a quantidade correspondente de volta ao estoque.")) return;

    const ab = abastecimentos.find(a => a.id === id);
    if (ab) {
        // Devolver estoque
        let estoqueNome = '';
        if (ab.tipo === 'DIESEL') estoqueNome = 'DIESEL COMUM';
        else if (ab.tipo === 'LUBRIFICANTE') estoqueNome = 'ÓLEO LUBRIFICANTE 15W40';
        else if (ab.tipo === 'HIDRAULICO') estoqueNome = 'ÓLEO HIDRÁULICO ISO 68';
        else if (ab.tipo === 'GRAXA') estoqueNome = 'GRAXA DE CHASSI MP2';

        estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);
        let itemEstoque = estoque.find(i => i.nome === estoqueNome);
        if (itemEstoque) {
            itemEstoque.quantidade += ab.qtd;
            salvarBanco(KEYS.ESTOQUE, estoque);

            // Registrar transação de entrada de estorno no log de estoque
            if (window.registrarMovimentacaoEstoque) {
                const v = frota.find(item => item.id === veiculoId);
                window.registrarMovimentacaoEstoque({
                    tipo: 'ENTRADA',
                    itemId: itemEstoque.id,
                    itemNome: itemEstoque.nome,
                    categoria: itemEstoque.categoria,
                    quantidade: ab.qtd,
                    unitario: ab.preco,
                    frotaId: veiculoId,
                    frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                    destino: `Estorno Consumo: ${v ? v.modelo : 'Veículo'}`,
                    observacao: `Estorno de abastecimento realizado via controle de frotas.`
                });
            }
        }
    }

    abastecimentos = abastecimentos.filter(a => a.id !== id);
    salvarBanco(KEYS.ABASTECIMENTOS, abastecimentos);
    renderizarAbastecimentosVeiculo(veiculoId);
};


// =========================================================================
// MÓDULO MANUTENÇÃO & CHECKLIST (VINCULADO COM PEÇAS DE ESTOQUE)
// =========================================================================

window.abrirModalManutencao = function(veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;

    document.getElementById('manutVeiculoId').value = v.id;
    document.getElementById('manutData').value = new Date().toISOString().split('T')[0];
    document.getElementById('manutHorimetro').value = obterUltimoHorimetro(v.id);
    document.getElementById('manutObs').value = '';
    
    // Reseta checklist
    document.getElementById('chkOleo').checked = false;
    document.getElementById('chkFreios').checked = false;
    document.getElementById('chkPneus').checked = false;
    document.getElementById('chkEletrica').checked = false;
    document.getElementById('chkArrefecimento').checked = false;
    document.getElementById('chkEstrutural').checked = false;

    // Reseta peças temporárias e checkbox manual
    const chkManual = document.getElementById('chkPecaManual');
    if (chkManual) chkManual.checked = false;
    if (window.togglePecaManual) window.togglePecaManual(false);

    pecasManutencaoTemp = [];
    renderizarPecasManutencaoTemp();

    // Informações do Header
    document.getElementById('manutVeiculoCard').innerHTML = `
        <div>
            <strong>VEÍCULO / EQUIPAMENTO:</strong> ${v.modelo}<br>
            <strong>PLACA / PREFIXO:</strong> ${v.placa}
        </div>
        <div style="text-align: right;">
            <strong>SETOR:</strong> ${v.grupo}<br>
            <strong>ANO:</strong> ${v.ano}
        </div>
    `;

    // Carregar itens do almoxarifado/estoque no select
    carregarPecasEstoqueSelect();
    
    // Renderizar histórico de manutenções
    renderizarManutencoesVeiculo(v.id);

    document.getElementById('modalManutencao').style.display = 'flex';
};

window.fecharModalManutencao = function() {
    document.getElementById('modalManutencao').style.display = 'none';
};

// Carregar select de estoque com itens reais de peças
function carregarPecasEstoqueSelect() {
    const select = document.getElementById('manutItemEstoque');
    if (!select) return;

    estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);

    // Filtrar apenas categorias de peças, correias e filtros
    const itensValidos = estoque.filter(i => ['PEÇAS', 'FILTROS', 'CORREIAS INDUSTRIAIS', 'LUBRIFICANTES'].includes(i.categoria));

    select.innerHTML = '<option value="">-- SELECIONE UMA PEÇA / INSUMO --</option>' + 
        itensValidos.map(i => `<option value="${i.id}">${i.nome} (Saldo: ${i.quantidade.toFixed(0)})</option>`).join('');

    document.getElementById('manutItemQtd').value = 1;
    document.getElementById('manutItemPreco').value = '';
}

window.atualizarPrecoPecaDinamica = function() {
    const itemId = document.getElementById('manutItemEstoque').value;
    const inputPreco = document.getElementById('manutItemPreco');
    if (!inputPreco) return;

    const item = estoque.find(i => i.id === itemId);
    if (item) {
        inputPreco.value = window.formatCurrencyValue(item.unitario);
    } else {
        inputPreco.value = '';
    }
};

window.togglePecaManual = function(isManual) {
    const selectEstoque = document.getElementById('manutItemEstoque');
    const inputManual = document.getElementById('manutItemManual');
    const inputPreco = document.getElementById('manutItemPreco');
    const labelSelect = document.getElementById('lblManutItemEstoque');
    
    if (isManual) {
        if (selectEstoque) selectEstoque.style.display = 'none';
        if (inputManual) {
            inputManual.style.display = 'block';
            inputManual.value = '';
        }
        if (labelSelect) labelSelect.textContent = 'Nome da Peça / Insumo';
        if (inputPreco) {
            inputPreco.value = '';
            inputPreco.readOnly = false;
        }
    } else {
        if (selectEstoque) selectEstoque.style.display = 'block';
        if (inputManual) {
            inputManual.style.display = 'none';
            inputManual.value = '';
        }
        if (labelSelect) labelSelect.textContent = 'Selecionar Peça / Item do Estoque';
        if (selectEstoque) selectEstoque.value = '';
        if (inputPreco) {
            inputPreco.value = '';
            inputPreco.readOnly = false;
        }
    }
};

window.adicionarPecaManutencao = function() {
    const chkManual = document.getElementById('chkPecaManual');
    const isManual = chkManual ? chkManual.checked : false;
    let itemId = '';
    let itemNome = '';

    const qtd = parseInt(document.getElementById('manutItemQtd').value) || 0;
    const preco = window.parseCurrencyValue(document.getElementById('manutItemPreco').value) || 0;

    if (isManual) {
        const inputManual = document.getElementById('manutItemManual');
        itemNome = inputManual ? inputManual.value.trim().toUpperCase() : '';
        itemId = 'manual_' + new Date().getTime();
        if (!itemNome) {
            alert("Por favor, digite o nome da peça.");
            return;
        }
    } else {
        const selectEstoque = document.getElementById('manutItemEstoque');
        itemId = selectEstoque ? selectEstoque.value : '';
        if (!itemId) {
            alert("Por favor, selecione uma peça do estoque ou ative a opção 'Peça Fora de Estoque'.");
            return;
        }
        const item = estoque.find(i => i.id === itemId);
        if (!item) return;
        itemNome = item.nome;
    }

    if (qtd <= 0 || preco <= 0) {
        alert("Preencha a quantidade e o preço unitário com valores maiores que zero.");
        return;
    }

    // Verificar se já existe na lista temporária
    const jaExiste = pecasManutencaoTemp.find(p => p.id === itemId || (isManual && p.nome === itemNome));
    if (jaExiste) {
        jaExiste.qtd += qtd;
        jaExiste.subtotal = jaExiste.qtd * jaExiste.preco;
    } else {
        pecasManutencaoTemp.push({
            id: itemId,
            nome: itemNome,
            qtd,
            preco,
            subtotal: qtd * preco,
            isManual: isManual
        });
    }

    renderizarPecasManutencaoTemp();

    // Resetar inputs de peças
    if (isManual) {
        const inputManual = document.getElementById('manutItemManual');
        if (inputManual) inputManual.value = '';
    } else {
        const selectEstoque = document.getElementById('manutItemEstoque');
        if (selectEstoque) selectEstoque.value = '';
    }
    document.getElementById('manutItemQtd').value = 1;
    document.getElementById('manutItemPreco').value = '';
};

function renderizarPecasManutencaoTemp() {
    const tbody = document.getElementById('listaPecasManutencaoTemp');
    if (!tbody) return;

    if (pecasManutencaoTemp.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 8px;">Nenhuma peça selecionada ainda.</td></tr>`;
        return;
    }

    tbody.innerHTML = pecasManutencaoTemp.map(p => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td style="padding: 6px 4px; color: white;">${p.nome}</td>
            <td style="padding: 6px 4px; text-align: center; color: white;">${p.qtd}</td>
            <td style="padding: 6px 4px; text-align: right; color: white;">R$ ${p.preco.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="padding: 6px 4px; text-align: right; font-weight: bold; color: var(--accent-color);">R$ ${p.subtotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="padding: 6px 4px; text-align: center;">
                <button type="button" class="btn-action-card" onclick="window.removerPecaManutencaoTemp('${p.id}')" style="padding: 2px 6px; color: #f87171;"><i class="fa-solid fa-xmark"></i></button>
            </td>
        </tr>
    `).join('');
}

window.removerPecaManutencaoTemp = function(id) {
    pecasManutencaoTemp = pecasManutencaoTemp.filter(p => p.id !== id);
    renderizarPecasManutencaoTemp();
};

function salvarManutencao() {
    const veiculoId = document.getElementById('manutVeiculoId').value;
    const data = document.getElementById('manutData').value || new Date().toISOString().split('T')[0];
    const tipo = document.getElementById('manutTipo').value || 'CORRETIVA';
    const horimetro = parseInt(document.getElementById('manutHorimetro').value) || 0;
    const obs = document.getElementById('manutObs').value.trim().toUpperCase();

    if (horimetro < 0) {
        alert("O horímetro / KM do veículo não pode ser negativo.");
        return;
    }

    // Coletar itens do checklist ok
    const chks = ['chkOleo', 'chkFreios', 'chkPneus', 'chkEletrica', 'chkArrefecimento', 'chkEstrutural'];
    const checklistOk = [];
    chks.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.checked) {
            checklistOk.push(el.value);
        }
    });

    const nova = {
        id: 'mn_' + new Date().getTime(),
        veiculoId,
        data,
        tipo,
        horimetro,
        checklist: checklistOk,
        pecas: [...pecasManutencaoTemp],
        totalPecas: pecasManutencaoTemp.reduce((acc, p) => acc + p.subtotal, 0),
        observacao: obs || 'MANUTENÇÃO PERIÓDICA REALIZADA'
    };

    // --- INTEGRAR E DEDUZIR PEÇAS DO ESTOQUE DEFINITIVAMENTE ---
    estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);

    pecasManutencaoTemp.forEach(p => {
        const itemEstoque = estoque.find(i => i.id === p.id);
        if (itemEstoque) {
            if (itemEstoque.quantidade < p.qtd) {
                console.warn(`Alerta de Estoque Baixo para ${p.nome}: Saldo ficará negativo.`);
            }
            itemEstoque.quantidade -= p.qtd;

            // Registrar transação de saída no log de estoque
            if (window.registrarMovimentacaoEstoque) {
                const v = frota.find(item => item.id === veiculoId);
                window.registrarMovimentacaoEstoque({
                    tipo: 'SAÍDA',
                    itemId: itemEstoque.id,
                    itemNome: itemEstoque.nome,
                    categoria: itemEstoque.categoria,
                    quantidade: p.qtd,
                    unitario: p.preco,
                    frotaId: veiculoId,
                    frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                    destino: `Manutenção Frota: ${v ? v.modelo : 'Veículo'}`,
                    observacao: `Peça aplicada na manutenção. OS: ${nova.id}`
                });
            }
        }
    });

    salvarBanco(KEYS.ESTOQUE, estoque);
    manutencoes.push(nova);
    salvarBanco(KEYS.MANUTENCOES, manutencoes);

    // Resetar campos e atualizar históricos
    pecasManutencaoTemp = [];
    renderizarPecasManutencaoTemp();
    document.getElementById('manutObs').value = '';
    carregarPecasEstoqueSelect(); // recarrega saldo
    renderizarManutencoesVeiculo(veiculoId);

    alert("Registro de manutenção e checklist salvo com sucesso! As peças foram deduzidas no almoxarifado.");
}

function renderizarManutencoesVeiculo(veiculoId) {
    const tbody = document.getElementById('listaManutencoesVeiculo');
    if (!tbody) return;

    const filtrados = manutencoes
        .filter(m => m.veiculoId === veiculoId)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px; color: var(--text-muted);">Nenhum histórico de manutenção encontrado para este veículo.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(m => {
        const checklistStr = m.checklist.length > 0 ? m.checklist.join(', ') : 'Nenhum';
        const pecasStr = m.pecas.length > 0 ? m.pecas.map(p => `${p.qtd}x ${p.nome}`).join('<br>') : 'Nenhuma';
        
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem;">
                <td style="padding: 8px 6px; color: white;">${new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td style="padding: 8px 6px;"><span style="font-weight: bold; color: var(--accent-color);">${m.tipo}</span></td>
                <td style="padding: 8px 6px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted);" title="${checklistStr}">${checklistStr}</td>
                <td style="padding: 8px 6px; line-height: 1.3; color: white;">${pecasStr}</td>
                <td style="padding: 8px 6px; text-align: center; color: white;">${m.horimetro}</td>
                <td style="padding: 8px 6px; text-align: center; display: flex; gap: 4px; justify-content: center;">
                    <button type="button" class="btn-action-card" onclick="window.imprimirManutencao('${m.id}', '${veiculoId}')" title="Imprimir Ordem/Checklist" style="padding: 4px 8px; color: #60a5fa;"><i class="fa-solid fa-print"></i></button>
                    <button type="button" class="btn-action-card" onclick="window.excluirManutencao('${m.id}', '${veiculoId}')" title="Excluir Registro" style="padding: 4px 8px; color: #f87171;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

window.excluirManutencao = function(id, veiculoId) {
    if (!confirm("Tem certeza que deseja excluir esta manutenção? Isso devolverá todas as peças utilizadas de volta ao estoque.")) return;

    const m = manutencoes.find(item => item.id === id);
    if (m && m.pecas && m.pecas.length > 0) {
        // Devolver peças
        estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);
        m.pecas.forEach(p => {
            const itemEstoque = estoque.find(i => i.id === p.id);
            if (itemEstoque) {
                itemEstoque.quantidade += p.qtd;

                // Registrar transação de entrada de estorno no log de estoque
                if (window.registrarMovimentacaoEstoque) {
                    const v = frota.find(item => item.id === veiculoId);
                    window.registrarMovimentacaoEstoque({
                        tipo: 'ENTRADA',
                        itemId: itemEstoque.id,
                        itemNome: itemEstoque.nome,
                        categoria: itemEstoque.categoria,
                        quantidade: p.qtd,
                        unitario: p.preco,
                        frotaId: veiculoId,
                        frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                        destino: `Estorno Peça: ${v ? v.modelo : 'Veículo'}`,
                        observacao: `Estorno de peça por exclusão da OS de manutenção ${m.id}.`
                    });
                }
            }
        });
        salvarBanco(KEYS.ESTOQUE, estoque);
    }

    manutencoes = manutencoes.filter(item => item.id !== id);
    salvarBanco(KEYS.MANUTENCOES, manutencoes);
    
    // Recarregar saldo de peças e histórico
    carregarPecasEstoqueSelect();
    renderizarManutencoesVeiculo(veiculoId);
};

window.imprimirAbastecimento = function(id, veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;
    const ab = abastecimentos.find(a => a.id === id);
    if (!ab) return;

    const dtObj = new Date(ab.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');
    
    let win = window.open('', '_blank');
    win.document.write(`
<html>
<head>
    <title>Comprovante de Abastecimento - ${v.placa}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 13px; line-height: 1.5; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        h2 { margin: 5px 0 0 0; font-size: 12px; color: #666; font-weight: normal; }
        .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; background: #f2f2f2; padding: 6px; margin: 20px 0 10px 0; border: 1px solid #ccc; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
        .info-item { padding: 4px 0; }
        .info-label { font-weight: bold; color: #555; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th { background: #f2f2f2; border: 1px solid #ccc; padding: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; }
        table.data-table td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
        .total-row { font-weight: bold; background: #eef2f5 !important; font-size: 13px; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-around; }
        .signature-line { text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        @media print {
            body { margin: 15px; }
            table.data-table th { background: #ddd !important; -webkit-print-color-adjust: exact; }
            .section-title { background: #ddd !important; -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td>
                <span style="font-weight: 900; font-size: 22px; color: #2563eb;">Orquestra.cs</span><br>
                <span style="font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Sistemas Personalizados</span>
            </td>
            <td style="text-align: right;">
                <h1>Recibo de Consumo de Insumo</h1>
                <h2>Controle de Frotas & Almoxarifado</h2>
                <h2 style="font-size: 11px; color: #888;">Emissão: ${new Date().toLocaleString('pt-BR')}</h2>
            </td>
        </tr>
    </table>

    <div class="section-title">Dados do Veículo / Equipamento</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Modelo/Descrição:</span> ${v.modelo}</div>
        <div class="info-item"><span class="info-label">Placa / Prefixo:</span> ${v.placa}</div>
        <div class="info-item"><span class="info-label">Setor / Grupo:</span> ${v.grupo}</div>
        <div class="info-item"><span class="info-label">Ano Fabricação:</span> ${v.ano}</div>
    </div>

    <div class="section-title">Detalhes do Abastecimento / Lançamento</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Data do Registro:</span> ${dtStr}</div>
        <div class="info-item"><span class="info-label">Horímetro / KM no Lançamento:</span> ${ab.horimetro}</div>
    </div>

    <table class="data-table">
        <thead>
            <tr>
                <th>Item / Insumo</th>
                <th style="text-align: center;">Quantidade</th>
                <th style="text-align: right;">Preço Unitário</th>
                <th style="text-align: right;">Valor Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>${ab.tipo}</strong></td>
                <td style="text-align: center;">${ab.qtd.toFixed(2)} Litros/Kg</td>
                <td style="text-align: right;">R$ ${ab.preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-weight: bold;">R$ ${ab.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
            <tr class="total-row">
                <td colspan="3" style="text-align: right; text-transform: uppercase;"><strong>Total Pago / Debitado:</strong></td>
                <td style="text-align: right; color: #1e3a8a;">R$ ${ab.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        </tbody>
    </table>

    <div class="signatures">
        <div class="signature-line">
            Operador / Motorista
        </div>
        <div class="signature-line">
            Responsável pelo Registro
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

window.imprimirManutencao = function(id, veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;
    const manut = manutencoes.find(m => m.id === id);
    if (!manut) return;

    const dtObj = new Date(manut.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');
    
    // Checklist items formatting
    const allChecklistItems = [
        "ÓLEO E FILTROS",
        "SISTEMA DE FREIOS",
        "PNEUS / LAGARTAS",
        "ELÉTRICA E FARÓIS",
        "ARREFECIMENTO",
        "CHASSI / ESTRUTURAL"
    ];
    
    let checklistHtml = '';
    allChecklistItems.forEach(item => {
        const isOk = manut.checklist.some(chItem => chItem.toUpperCase().includes(item.split(' ')[0]));
        const icon = isOk ? '☑' : '☐';
        const status = isOk ? '<span style="color: #16a34a; font-weight: bold;">OK</span>' : '<span style="color: #777;">Não Marcado</span>';
        checklistHtml += `
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed #ddd; padding: 6px 0;">
                <span>${icon} <strong>${item}</strong></span>
                <span>${status}</span>
            </div>
        `;
    });

    // Parts list formatting
    let partsRowsHtml = '';
    if (manut.pecas && manut.pecas.length > 0) {
        manut.pecas.forEach(p => {
            partsRowsHtml += `
                <tr>
                    <td>${p.nome}</td>
                    <td style="text-align: center;">${p.qtd}</td>
                    <td style="text-align: right;">R$ ${p.preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: right; font-weight: bold;">R$ ${p.subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });
    } else {
        partsRowsHtml = `<tr><td colspan="4" style="text-align: center; color: #666; font-style: italic;">Nenhuma peça utilizada nesta manutenção.</td></tr>`;
    }

    const totalPecas = manut.totalPecas || 0;

    let win = window.open('', '_blank');
    win.document.write(`
<html>
<head>
    <title>Checklist de Manutenção - ${v.placa}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 13px; line-height: 1.5; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        h2 { margin: 5px 0 0 0; font-size: 12px; color: #666; font-weight: normal; }
        .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; background: #f2f2f2; padding: 6px; margin: 20px 0 10px 0; border: 1px solid #ccc; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
        .info-item { padding: 4px 0; }
        .info-label { font-weight: bold; color: #555; }
        .checklist-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; border: 1px solid #ccc; padding: 15px; border-radius: 4px; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th { background: #f2f2f2; border: 1px solid #ccc; padding: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; }
        table.data-table td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
        .total-row { font-weight: bold; background: #eef2f5 !important; font-size: 13px; }
        .obs-box { border: 1px solid #ccc; padding: 12px; border-radius: 4px; background: #f9f9f9; min-height: 50px; font-style: italic; white-space: pre-wrap; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-around; }
        .signature-line { text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        @media print {
            body { margin: 15px; }
            table.data-table th { background: #ddd !important; -webkit-print-color-adjust: exact; }
            .section-title { background: #ddd !important; -webkit-print-color-adjust: exact; }
            .obs-box { background: none; }
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td>
                <span style="font-weight: 900; font-size: 22px; color: #2563eb;">Orquestra.cs</span><br>
                <span style="font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Sistemas Personalizados</span>
            </td>
            <td style="text-align: right;">
                <h1>Ordem de Manutenção & Checklist</h1>
                <h2>Controle de Frotas & Equipamentos</h2>
                <h2 style="font-size: 11px; color: #888;">Emissão: ${new Date().toLocaleString('pt-BR')}</h2>
            </td>
        </tr>
    </table>

    <div class="section-title">Dados do Veículo / Equipamento</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Modelo/Descrição:</span> ${v.modelo}</div>
        <div class="info-item"><span class="info-label">Placa / Prefixo:</span> ${v.placa}</div>
        <div class="info-item"><span class="info-label">Setor / Grupo:</span> ${v.grupo}</div>
        <div class="info-item"><span class="info-label">Ano Fabricação:</span> ${v.ano}</div>
    </div>

    <div class="section-title">Detalhes da Manutenção</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Data da Execução:</span> ${dtStr}</div>
        <div class="info-item"><span class="info-label">Tipo de Manutenção:</span> ${manut.tipo}</div>
        <div class="info-item"><span class="info-label">Horímetro / KM no Lançamento:</span> ${manut.horimetro}</div>
    </div>

    <div class="section-title">Checklist de Inspeção</div>
    <div class="checklist-grid">
        ${checklistHtml}
    </div>

    <div class="section-title">Peças e Materiais Utilizados</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Descrição da Peça / Insumo</th>
                <th style="text-align: center; width: 80px;">Quantidade</th>
                <th style="text-align: right; width: 120px;">Valor Unitário</th>
                <th style="text-align: right; width: 120px;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            ${partsRowsHtml}
            <tr class="total-row">
                <td colspan="3" style="text-align: right; text-transform: uppercase;"><strong>Custo Total de Peças:</strong></td>
                <td style="text-align: right; color: #1e3a8a;">R$ ${totalPecas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title">Diagnóstico Técnico / Observações</div>
    <div class="obs-box">${manut.observacao || 'NENHUMA OBSERVAÇÃO REGISTRADA'}</div>

    <div class="signatures">
        <div class="signature-line">
            Técnico / Mecânico
        </div>
        <div class="signature-line">
            Supervisor / Operador
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
