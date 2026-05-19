// --- CONTROLE DE ESTOQUE SAAS PREMIUM & INTEGRADO ---
// Sincronizado com os módulos de Frotas (Manutenção de Peças e Insumos)
// Desenvolvido por: Orquestra.cs - sistemas industrial personalizado

console.log("Módulo de Estoque Premium: Inicializando almoxarifado unificado...");

const ESTOQUE_KEY = 'orquestra_estoque';
const MOV_KEY = 'orquestra_estoque_movimentacoes';
const FROTA_KEY = 'orquestra_frota';

// Wave and cylinder tank animations for the liquid simulators
const styleTag = document.createElement('style');
styleTag.innerHTML = `
@keyframes waveAnim {
    0% { transform: translateX(0) scaleY(1); }
    50% { transform: translateX(-25%) scaleY(0.9); }
    100% { transform: translateX(-50%) scaleY(1); }
}
.category-card-estoque:hover {
    transform: translateY(-2px);
    border-color: var(--accent-color) !important;
    background: rgba(255, 255, 255, 0.05) !important;
}
.btn-tab-estoque:hover {
    color: var(--accent-color) !important;
}
.btn-tab-estoque.active {
    text-shadow: 0 0 10px rgba(107, 142, 35, 0.4);
}
`;
document.head.appendChild(styleTag);

// Dados padrões do Estoque se não existirem
const PADROES_ESTOQUE = [
    { id: 'est_01', nome: 'FILTRO DE AR DE MOTOR', categoria: 'FILTROS', quantidade: 15, unitario: 180.00, limite_alerta: 5 },
    { id: 'est_02', nome: 'FILTRO DE COMBUSTÍVEL', categoria: 'FILTROS', quantidade: 22, unitario: 90.00, limite_alerta: 5 },
    { id: 'est_03', nome: 'PASTILHA DE FREIO DIANTEIRA', categoria: 'PEÇAS', quantidade: 8, unitario: 320.00, limite_alerta: 3 },
    { id: 'est_04', nome: 'CORREIA DO ALTERNADOR', categoria: 'CORREIAS INDUSTRIAIS', quantidade: 12, unitario: 75.00, limite_alerta: 4 },
    { id: 'est_05', nome: 'ÓLEO LUBRIFICANTE 15W40', categoria: 'LUBRIFICANTES', quantidade: 250, unitario: 28.00, limite_alerta: 40 },
    { id: 'est_06', nome: 'ÓLEO HIDRÁULICO ISO 68', categoria: 'LUBRIFICANTES', quantidade: 400, unitario: 32.00, limite_alerta: 40 },
    { id: 'est_07', nome: 'GRAXA DE CHASSI MP2', categoria: 'LUBRIFICANTES', quantidade: 50, unitario: 24.00, limite_alerta: 10 },
    { id: 'est_08', nome: 'BICO INJETOR DIESEL', categoria: 'PEÇAS', quantidade: 6, unitario: 650.00, limite_alerta: 2 },
    { id: 'est_09', nome: 'DIESEL COMUM', categoria: 'DIESEL', quantidade: 3200, unitario: 5.89, limite_alerta: 1000 }
];

function obterEstoque() {
    const dados = localStorage.getItem(ESTOQUE_KEY);
    if (!dados) {
        localStorage.setItem(ESTOQUE_KEY, JSON.stringify(PADROES_ESTOQUE));
        return PADROES_ESTOQUE;
    }
    return JSON.parse(dados);
}

function salvarEstoque(dados) {
    localStorage.setItem(ESTOQUE_KEY, JSON.stringify(dados));
}

let itensEstoque = obterEstoque();
let filtroBuscaEstoque = '';
let categoriaAtiva = 'TODAS';

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    renderizarEstoque();
    inicializarEventosEstoque();
    window.renderSimuladores();
    window.renderizarMovimentacoesEstoque();
});

// Registrar eventos
function inicializarEventosEstoque() {
    const formItem = document.getElementById('formNovoItemEstoque');
    if (formItem) {
        formItem.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarItemEstoque();
        });
    }

    const formMov = document.getElementById('formNovaMovimentacao');
    if (formMov) {
        formMov.addEventListener('submit', salvarNovaMovimentacaoManual);
    }
}

// --- SUB-TABS NAVIGATION ---
window.switchTabEstoque = function(tabName) {
    // Hide all sub-tabs
    document.querySelectorAll('.subview-estoque-section').forEach(s => s.style.display = 'none');
    
    // Show selected sub-tab
    const target = document.getElementById(`subview-estoque-${tabName}`);
    if (target) target.style.display = 'block';

    // Remove active state from all tab buttons
    document.querySelectorAll('.btn-tab-estoque').forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--text-muted)';
        b.style.borderBottom = 'none';
    });

    // Add active state to selected tab button
    let btnId = '';
    if (tabName === 'inventario') btnId = 'btnTabEstoqueInventario';
    else if (tabName === 'tanques') btnId = 'btnTabEstoqueTanques';
    else if (tabName === 'movimentacoes') btnId = 'btnTabEstoqueMovimentacoes';

    const activeBtn = document.getElementById(btnId);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = 'var(--accent-color)';
        activeBtn.style.borderBottom = '3px solid var(--accent-color)';
    }

    // Refresh display
    if (tabName === 'tanques') {
        window.renderSimuladores();
    } else if (tabName === 'movimentacoes') {
        window.renderizarMovimentacoesEstoque();
    } else {
        renderizarEstoque();
    }
};

// --- FILTRAR POR CATEGORIA (ATALHOS CARD) ---
window.filtrarPorCategoriaEstoque = function(cat) {
    categoriaAtiva = cat;
    
    // Update active class on category cards
    document.querySelectorAll('.category-card-estoque').forEach(card => {
        card.classList.remove('active');
        card.style.border = '1px solid var(--panel-border)';
        card.style.background = 'rgba(255,255,255,0.02)';
        
        const cardSpan = card.querySelector('span');
        if (cardSpan) {
            cardSpan.style.fontWeight = '500';
            cardSpan.style.color = 'var(--text-muted)';
        }
        
        const cardIcon = card.querySelector('i');
        if (cardIcon) cardIcon.style.color = 'var(--text-muted)';
    });

    // Make correct card active
    let activeCardId = 'catCard_TODAS';
    if (cat === 'PEÇAS') activeCardId = 'catCard_PEÇAS';
    else if (cat === 'FILTROS') activeCardId = 'catCard_FILTROS';
    else if (cat === 'LUBRIFICANTES') activeCardId = 'catCard_LUBRIFICANTES';
    else if (cat === 'DIESEL') activeCardId = 'catCard_DIESEL';
    else if (cat === 'CORREIAS INDUSTRIAIS') activeCardId = 'catCard_CORREIAS';
    else if (cat === "EPI'S") activeCardId = 'catCard_EPIS';
    else if (cat === 'ESCRITÓRIO') activeCardId = 'catCard_ESCRITORIO';

    const activeCard = document.getElementById(activeCardId);
    if (activeCard) {
        activeCard.classList.add('active');
        activeCard.style.border = '1px solid var(--accent-color)';
        activeCard.style.background = 'rgba(255,255,255,0.04)';
        
        const cardSpan = activeCard.querySelector('span');
        if (cardSpan) {
            cardSpan.style.fontWeight = 'bold';
            cardSpan.style.color = 'white';
        }
        
        const cardIcon = activeCard.querySelector('i');
        if (cardIcon) cardIcon.style.color = 'var(--accent-color)';
    }

    renderizarEstoque();
};

// --- RENDERIZAR TABELA DE INVENTÁRIO ---
function renderizarEstoque() {
    itensEstoque = obterEstoque();
    const tbody = document.getElementById('corpoTabelaEstoque');
    if (!tbody) return;

    // Filter by text search
    let filtrados = itensEstoque.filter(item => 
        item.nome.toUpperCase().includes(filtroBuscaEstoque.toUpperCase()) ||
        item.categoria.toUpperCase().includes(filtroBuscaEstoque.toUpperCase())
    );

    // Filter by category active card
    if (categoriaAtiva !== 'TODAS') {
        filtrados = filtrados.filter(item => item.categoria === categoriaAtiva);
    }

    // Filter by low stock toggle
    const chkAcabando = document.getElementById('chkEstoqueAcabando');
    if (chkAcabando && chkAcabando.checked) {
        filtrados = filtrados.filter(item => item.quantidade <= (item.limite_alerta || 3));
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px 15px;">
                    <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 12px; color: var(--text-muted);"></i><br>
                    Nenhum item localizado no almoxarifado correspondente aos filtros.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtrados.map(item => {
        const total = item.quantidade * item.unitario;
        const limite = item.limite_alerta !== undefined && item.limite_alerta !== null ? item.limite_alerta : (item.categoria === 'DIESEL' ? 1000 : item.categoria === 'LUBRIFICANTES' ? 40 : 3);
        
        let statusBadge = '';
        if (item.quantidade <= 0) {
            statusBadge = `<span style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 4px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: bold; white-space: nowrap;"><i class="fa-solid fa-triangle-exclamation"></i> CRÍTICO / ZERADO</span>`;
        } else if (item.quantidade <= limite) {
            statusBadge = `<span style="background: rgba(230, 126, 34, 0.15); border: 1px solid rgba(230, 126, 34, 0.3); color: #fb923c; padding: 4px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: bold; white-space: nowrap;"><i class="fa-solid fa-triangle-exclamation"></i> ESTOQUE BAIXO</span>`;
        } else {
            statusBadge = `<span style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 4px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: bold; white-space: nowrap;"><i class="fa-solid fa-check"></i> NORMAL</span>`;
        }
        
        const unidade = item.categoria === 'DIESEL' || item.categoria === 'LUBRIFICANTES' ? 'L' : 'Un';
        
        return `
            <tr style="border-bottom: 1px solid var(--panel-border); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='none'">
                <td style="padding: 12px 8px;"><span style="font-size: 0.72rem; font-weight: bold; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); color: var(--accent-color);">${item.categoria}</span></td>
                <td style="padding: 12px 8px; font-weight: 600; color: white;">${item.nome}</td>
                <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                <td style="padding: 12px 8px; text-align: center; font-weight: bold; color: white;">
                    ${item.quantidade.toFixed(1)} ${unidade}
                </td>
                <td style="padding: 12px 8px; text-align: center; color: var(--text-muted);">
                    ${limite.toFixed(0)} ${unidade}
                </td>
                <td style="padding: 12px 8px; text-align: right; color: white;">R$ ${item.unitario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: var(--accent-color);">R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="padding: 12px 8px; text-align: center;">
                    <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                        <button type="button" class="btn-action-card" onclick="window.abrirSaidaRapida('${item.id}')" title="Registrar Saída" style="padding: 5px 9px; color: #f59e0b; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); font-size: 0.78rem;"><i class="fa-solid fa-arrow-right-from-bracket"></i> Saída</button>
                        <button type="button" class="btn-action-card" onclick="window.editarItemEstoque('${item.id}')" title="Editar item" style="padding: 5px 9px;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn-action-card" onclick="window.excluirItemEstoque('${item.id}')" title="Remover item" style="padding: 5px 9px; color: #f87171;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtro em tempo real
window.filtrarEstoque = function() {
    const input = document.getElementById('buscaEstoque');
    if (input) {
        filtroBuscaEstoque = input.value;
        renderizarEstoque();
    }
};

// --- MODAIS CRUD ITEM ---
window.abrirModalNovoItemEstoque = function() {
    document.getElementById('estoqueItemId').value = '';
    document.getElementById('estNome').value = '';
    document.getElementById('estCategoria').value = 'PEÇAS';
    document.getElementById('estQtd').value = '';
    document.getElementById('estUnitario').value = '';
    document.getElementById('estAlerta').value = '';
    document.getElementById('tituloModalEstoque').innerHTML = '<i class="fa-solid fa-box"></i> Novo Item de Estoque';

    document.getElementById('modalNovoItemEstoque').style.display = 'flex';
};

window.fecharModalNovoItemEstoque = function() {
    document.getElementById('modalNovoItemEstoque').style.display = 'none';
};

window.editarItemEstoque = function(id) {
    const item = itensEstoque.find(i => i.id === id);
    if (!item) return;

    document.getElementById('estoqueItemId').value = item.id;
    document.getElementById('estNome').value = item.nome;
    document.getElementById('estCategoria').value = item.categoria;
    document.getElementById('estQtd').value = item.quantidade;
    document.getElementById('estUnitario').value = window.formatCurrencyValue(item.unitario);
    document.getElementById('estAlerta').value = item.limite_alerta !== undefined && item.limite_alerta !== null ? item.limite_alerta : '';
    
    document.getElementById('tituloModalEstoque').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Item: ${item.nome}`;

    document.getElementById('modalNovoItemEstoque').style.display = 'flex';
};

function salvarItemEstoque() {
    const id = document.getElementById('estoqueItemId').value;
    const nome = document.getElementById('estNome').value.trim().toUpperCase();
    const categoria = document.getElementById('estCategoria').value;
    const quantidade = parseFloat(document.getElementById('estQtd').value) || 0;
    const unitario = window.parseCurrencyValue(document.getElementById('estUnitario').value) || 0;
    const alertVal = document.getElementById('estAlerta').value.trim();
    const limite_alerta = alertVal !== "" ? parseFloat(alertVal) : null;

    if (!nome || quantidade < 0 || unitario < 0) {
        alert("Preencha todos os campos obrigatórios corretamente.");
        return;
    }

    itensEstoque = obterEstoque();

    if (id) {
        // Editar
        itensEstoque = itensEstoque.map(i => i.id === id ? { ...i, nome, categoria, quantidade, unitario, limite_alerta } : i);
    } else {
        // Novo
        const novo = {
            id: 'est_' + new Date().getTime(),
            nome,
            categoria,
            quantidade,
            unitario,
            limite_alerta
        };
        itensEstoque.push(novo);
    }

    salvarEstoque(itensEstoque);
    renderizarEstoque();
    window.renderSimuladores();
    fecharModalNovoItemEstoque();

    alert("Item do almoxarifado salvo e sincronizado com sucesso!");
}

window.excluirItemEstoque = function(id) {
    if (!confirm("Deseja realmente remover este item do estoque? Se ele for uma peça ou combustível utilizado em frotas, evite excluí-lo para não quebrar referências históricas.")) return;

    itensEstoque = obterEstoque().filter(i => i.id !== id);
    salvarEstoque(itensEstoque);
    renderizarEstoque();
    window.renderSimuladores();
};

// --- SIMULADORES DE TANQUES & CONVERSÃO EM BALDES DE 20L ---
window.renderSimuladores = function() {
    itensEstoque = obterEstoque();
    
    // 1. Diesel Simulator (Capacidade máxima de 5000 Litros)
    const diesel = itensEstoque.find(i => i.categoria === 'DIESEL' || i.nome.toUpperCase().includes('DIESEL'));
    const dieselQtd = diesel ? diesel.quantidade : 0;
    const dieselCapacity = 5000;
    const dieselPercent = Math.min((dieselQtd / dieselCapacity) * 100, 100);
    const dieselSpaceLeft = Math.max(dieselCapacity - dieselQtd, 0);

    const liquid = document.getElementById('dieselLiquidLevel');
    if (liquid) liquid.style.height = `${dieselPercent}%`;

    const percentText = document.getElementById('dieselPercentText');
    if (percentText) percentText.innerText = `${dieselPercent.toFixed(1)}%`;

    const litersText = document.getElementById('dieselLitersText');
    if (litersText) litersText.innerText = `${Math.round(dieselQtd).toLocaleString('pt-BR')} L`;

    const spaceText = document.getElementById('dieselSpaceLeftText');
    if (spaceText) spaceText.innerText = `${Math.round(dieselSpaceLeft).toLocaleString('pt-BR')} L`;

    const adviceText = document.getElementById('dieselAdviceText');
    if (adviceText) {
        if (dieselPercent <= 20) {
            adviceText.innerHTML = `🚨 <strong>NÍVEL CRÍTICO!</strong> Tanque abaixo de 20%. Sugerimos compra urgente de <strong>${Math.round(dieselSpaceLeft).toLocaleString('pt-BR')} Litros</strong>.`;
            adviceText.parentElement.style.background = 'rgba(239, 68, 68, 0.1)';
            adviceText.parentElement.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            adviceText.parentElement.style.color = '#ef4444';
        } else if (dieselPercent <= 50) {
            adviceText.innerHTML = `⚠️ <strong>NÍVEL MÉDIO!</strong> Tanque abaixo de 50%. Agende abastecimento de <strong>${Math.round(dieselSpaceLeft).toLocaleString('pt-BR')} Litros</strong>.`;
            adviceText.parentElement.style.background = 'rgba(230, 126, 34, 0.1)';
            adviceText.parentElement.style.borderColor = 'rgba(230, 126, 34, 0.3)';
            adviceText.parentElement.style.color = '#e67e22';
        } else {
            adviceText.innerHTML = `✅ <strong>SAUDÁVEL!</strong> Tanque operando acima de 50%. Cabem mais <strong>${Math.round(dieselSpaceLeft).toLocaleString('pt-BR')} Litros</strong>.`;
            adviceText.parentElement.style.background = 'rgba(34, 197, 94, 0.1)';
            adviceText.parentElement.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            adviceText.parentElement.style.color = '#2ecc71';
        }
    }

    // 2. Lubrificantes Simulator Grid (Conversão em baldes de 20L)
    const lubs = itensEstoque.filter(i => i.categoria === 'LUBRIFICANTES');
    const container = document.getElementById('containerLubrificantesTanques');
    if (container) {
        if (lubs.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">Nenhum lubrificante cadastrado no estoque.</p>`;
            return;
        }

        container.innerHTML = lubs.map(lub => {
            const totalLitros = lub.quantidade;
            const baldes = Math.floor(totalLitros / 20);
            const litrosResto = (totalLitros % 20).toFixed(1);
            
            // Sub-balde partial level
            const remainingBaldePercent = ((totalLitros % 20) / 20) * 100;
            const limite = lub.limite_alerta || 40;
            const isLow = totalLitros <= limite;
            const colorCircle = isLow ? '#ef4444' : 'var(--accent-color)';

            return `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); border-radius: 12px; padding: 15px; display: flex; gap: 15px; align-items: center;">
                    <!-- Circular Liquid Indicator -->
                    <div style="position: relative; width: 60px; height: 60px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: inset 0 0 10px rgba(0,0,0,0.6);">
                        <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${remainingBaldePercent}%; background: ${colorCircle}; opacity: 0.7; transition: height 0.5s; box-shadow: 0 0 8px ${colorCircle};"></div>
                        <i class="fa-solid fa-oil-can" style="font-size: 1.25rem; color: white; position: relative; z-index: 2;"></i>
                    </div>

                    <!-- Breakdown Info -->
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; color: white; font-size: 0.95rem; font-weight: bold; text-transform: uppercase;">${lub.nome}</h4>
                        <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 15px; flex-wrap: wrap;">
                            <span>Volume: <strong style="color: white;">${totalLitros.toFixed(1)} L</strong></span>
                            <span>Contém: <strong style="color: var(--accent-color);">${baldes} Balde(s) (20L)</strong> + <strong style="color: var(--accent-color);">${litrosResto} L</strong></span>
                        </div>
                        ${isLow ? `<span style="font-size: 0.72rem; color: #f87171; font-weight: bold; display: block; margin-top: 5px;"><i class="fa-solid fa-triangle-exclamation"></i> ABAIXO DO MÍNIMO DE ALERTA (${limite}L)</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
};

// --- LOG DE MOVIMENTAÇÕES DE ESTOQUE ---

window.registrarMovimentacaoEstoque = function({
    tipo,
    itemId,
    itemNome,
    categoria,
    quantidade,
    unitario,
    frotaId = '',
    frotaPlaca = '',
    destino = '',
    retiradoPor = '',
    observacao = ''
}) {
    let movs = JSON.parse(localStorage.getItem(MOV_KEY)) || [];
    const nova = {
        id: 'mov_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000),
        tipo,
        data: new Date().toISOString().split('T')[0],
        dataHora: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        itemId,
        itemNome,
        categoria,
        quantidade: parseFloat(quantidade) || 0,
        unitario: parseFloat(unitario) || 0,
        total: (parseFloat(quantidade) || 0) * (parseFloat(unitario) || 0),
        frotaId,
        frotaPlaca,
        destino,
        retiradoPor,
        observacao
    };
    movs.unshift(nova);
    localStorage.setItem(MOV_KEY, JSON.stringify(movs));
    console.log(`[Almoxarifado] Transação gravada: ${tipo} de ${quantidade} ${itemNome}`);
};

window.abrirModalNovaMovimentacao = function() {
    document.getElementById('movTipo').value = 'SAÍDA';
    document.getElementById('movData').value = new Date().toISOString().split('T')[0];
    document.getElementById('movQtd').value = '';
    document.getElementById('movUnitario').value = '';
    document.getElementById('movDestino').value = '';
    document.getElementById('movObs').value = '';
    const retEl = document.getElementById('movRetiradoPor');
    if (retEl) retEl.value = '';

    // Populate dropdown with inventory items
    const selectItem = document.getElementById('movItemId');
    if (selectItem) {
        itensEstoque = obterEstoque();
        selectItem.innerHTML = '<option value="">-- SELECIONE O ITEM --</option>' + 
            itensEstoque.map(item => `<option value="${item.id}">${item.nome} (${item.categoria}) [Saldo: ${item.quantidade.toFixed(1)}]</option>`).join('');
    }

    // Populate dropdown with vehicles list
    const selectFrota = document.getElementById('movFrotaId');
    if (selectFrota) {
        const frota = JSON.parse(localStorage.getItem(FROTA_KEY)) || [];
        selectFrota.innerHTML = '<option value="">-- SELECIONE SE FOI USADO NA FROTA --</option>' + 
            frota.map(v => `<option value="${v.id}">${v.modelo} (${v.placa})</option>`).join('');
    }

    window.onChangeMovTipo(); // setup visibility
    document.getElementById('modalNovaMovimentacao').style.display = 'flex';
};

window.fecharModalNovaMovimentacao = function() {
    document.getElementById('modalNovaMovimentacao').style.display = 'none';
};

// Atalho: abre o modal já configurado para SAÍDA com o item pré-selecionado
window.abrirSaidaRapida = function(itemId) {
    window.abrirModalNovaMovimentacao();
    const st = document.getElementById('movTipo');
    if (st) { st.value = 'SAÍDA'; window.onChangeMovTipo(); }
    const si = document.getElementById('movItemId');
    if (si && itemId) { si.value = itemId; window.onChangeMovItem(); }
    setTimeout(() => document.getElementById('movRetiradoPor')?.focus(), 150);
};

window.onChangeMovTipo = function() {
    const tipo = document.getElementById('movTipo').value;
    const containerFrota = document.getElementById('containerMovFrota');
    if (containerFrota) {
        containerFrota.style.display = tipo === 'SAÍDA' ? 'block' : 'none';
    }
};

window.onChangeMovItem = function() {
    const itemId = document.getElementById('movItemId').value;
    if (!itemId) return;

    itensEstoque = obterEstoque();
    const item = itensEstoque.find(i => i.id === itemId);
    if (item) {
        // Auto-set the unit price of the selected item
        const inputPreco = document.getElementById('movUnitario');
        if (inputPreco) {
            inputPreco.value = window.formatCurrencyValue(item.unitario);
        }
    }
};

window.onChangeMovFrota = function() {
    const selectFrota = document.getElementById('movFrotaId');
    if (!selectFrota) return;

    const optSelected = selectFrota.options[selectFrota.selectedIndex];
    if (optSelected && optSelected.value) {
        // Auto-set the destination if vehicle selected
        const inputDestino = document.getElementById('movDestino');
        if (inputDestino) {
            inputDestino.value = `Frota: ${optSelected.text}`;
        }
    }
};

// Form submit event for new manual transaction
function salvarNovaMovimentacaoManual(e) {
    e.preventDefault();

    const tipo = document.getElementById('movTipo').value;
    const itemId = document.getElementById('movItemId').value;
    const data = document.getElementById('movData').value || new Date().toISOString().split('T')[0];
    const quantidade = parseFloat(document.getElementById('movQtd').value) || 0;
    const unitario = window.parseCurrencyValue(document.getElementById('movUnitario').value) || 0;
    const retiradoPor = (document.getElementById('movRetiradoPor')?.value || '').trim().toUpperCase();
    const frotaSelect = document.getElementById('movFrotaId');
    const frotaId = frotaSelect ? frotaSelect.value : '';
    let frotaPlaca = '';
    
    if (frotaSelect && frotaId) {
        const opt = frotaSelect.options[frotaSelect.selectedIndex];
        if (opt) frotaPlaca = opt.text;
    }

    const destino = document.getElementById('movDestino').value.trim() || (tipo === 'ENTRADA' ? 'REPOSIÇÃO ESTOQUE' : 'CONSUMO OPERACIONAL');
    const observacao = document.getElementById('movObs').value.trim() || 'Lançamento manual de movimentação';

    if (!itemId || quantidade <= 0 || unitario <= 0) {
        alert("Preencha todos os campos obrigatórios corretamente.");
        return;
    }

    itensEstoque = obterEstoque();
    const item = itensEstoque.find(i => i.id === itemId);
    if (!item) {
        alert("Item de estoque inválido.");
        return;
    }

    // Apply stock logic
    if (tipo === 'SAÍDA') {
        if (item.quantidade < quantidade) {
            if (!confirm(`Atenção: A quantidade de saída lançada (${quantidade}) é maior do que o saldo físico em estoque (${item.quantidade}). Deseja continuar e deixar o estoque negativo?`)) {
                return;
            }
        }
        item.quantidade -= quantidade;
    } else {
        item.quantidade += quantidade;
    }

    // Save stock changes
    salvarEstoque(itensEstoque);

    // Save transaction entry
    window.registrarMovimentacaoEstoque({
        tipo,
        itemId,
        itemNome: item.nome,
        categoria: item.categoria,
        quantidade,
        unitario,
        frotaId,
        frotaPlaca,
        destino,
        retiradoPor,
        observacao: (retiradoPor ? `Retirado por: ${retiradoPor}. ` : '') + observacao + ' (Manual)'
    });

    // Close and refresh
    fecharModalNovaMovimentacao();
    renderizarEstoque();
    window.renderSimuladores();
    window.renderizarMovimentacoesEstoque();

    alert("Movimentação registrada com sucesso no almoxarifado!");
}

window.renderizarMovimentacoesEstoque = function() {
    const tbody = document.getElementById('corpoTabelaMovimentacoesEstoque');
    if (!tbody) return;

    const query = (document.getElementById('buscaMovimentacao')?.value || '').trim().toUpperCase();
    const tipoFiltro = document.getElementById('filtroMovTipo')?.value || 'TODOS';

    let movs = JSON.parse(localStorage.getItem(MOV_KEY)) || [];

    // Filter by type
    if (tipoFiltro !== 'TODOS') {
        movs = movs.filter(m => m.tipo === tipoFiltro);
    }

    // Filter by text search
    if (query) {
        movs = movs.filter(m => 
            m.itemNome.toUpperCase().includes(query) ||
            m.categoria.toUpperCase().includes(query) ||
            m.destino.toUpperCase().includes(query) ||
            m.frotaPlaca.toUpperCase().includes(query) ||
            m.observacao.toUpperCase().includes(query)
        );
    }

    if (movs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px 15px;">
                    <i class="fa-solid fa-list-check" style="font-size: 2rem; margin-bottom: 12px; color: var(--text-muted);"></i><br>
                    Nenhuma movimentação registrada no histórico.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = movs.map(mov => {
        const tipoBadge = mov.tipo === 'ENTRADA' 
            ? `<span style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.72rem; white-space: nowrap;"><i class="fa-solid fa-circle-arrow-up"></i> ENTRADA</span>`
            : `<span style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.72rem; white-space: nowrap;"><i class="fa-solid fa-circle-arrow-down"></i> SAÍDA</span>`;

        const totalVal = mov.total || (mov.quantidade * mov.unitario);
        const unidade = mov.categoria === 'DIESEL' || mov.categoria === 'LUBRIFICANTES' ? 'L' : 'Un';
        
        return `
            <tr style="border-bottom: 1px solid var(--panel-border); font-size: 0.85rem; transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='none'">
                <td style="padding: 10px 8px; white-space: nowrap; color: var(--text-muted); font-size: 0.78rem;">${mov.dataHora}</td>
                <td style="padding: 10px 8px; text-align: center;">${tipoBadge}</td>
                <td style="padding: 10px 8px; font-weight: 600; color: white;">
                    ${mov.itemNome}<br>
                    <span style="font-size: 0.7rem; color: var(--accent-color); font-weight: bold; text-transform: uppercase;">${mov.categoria}</span>
                </td>
                <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: white;">
                    ${mov.quantidade.toFixed(1)} ${unidade}
                </td>
                <td style="padding: 10px 8px; text-align: right; color: var(--text-muted);">R$ ${mov.unitario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: var(--accent-color);">R$ ${totalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="padding: 10px 8px; color: #60a5fa; font-weight: 500;">
                    ${mov.frotaPlaca ? `<i class="fa-solid fa-truck-pickup" style="font-size: 0.75rem;"></i> ${mov.frotaPlaca}` : mov.destino || 'Uso Geral'}
                    ${mov.retiradoPor ? `<br><span style="font-size: 0.72rem; color: #a78bfa;"><i class="fa-solid fa-user"></i> ${mov.retiradoPor}</span>` : ''}
                </td>
                <td style="padding: 10px 8px; color: var(--text-muted); font-size: 0.8rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${mov.observacao}">${mov.observacao}</td>
                <td style="padding: 10px 8px; text-align: center;">
                    <button type="button" class="btn-action-card" onclick="window.excluirMovimentacaoEstoque('${mov.id}')" title="Estornar lançamento" style="padding: 6px 10px; color: #f87171;"><i class="fa-solid fa-rotate-left"></i> Estornar</button>
                </td>
            </tr>
        `;
    }).join('');
};

window.excluirMovimentacaoEstoque = function(id) {
    let movs = JSON.parse(localStorage.getItem(MOV_KEY)) || [];
    const mov = movs.find(m => m.id === id);
    if (!mov) return;

    if (!confirm(`Deseja realmente ESTORNAR este movimento de ${mov.tipo}? \nIsso reverterá a quantidade de ${mov.quantidade}x ${mov.itemNome} de volta ao saldo do almoxarifado.`)) {
        return;
    }

    itensEstoque = obterEstoque();
    const item = itensEstoque.find(i => i.id === mov.itemId);
    
    if (item) {
        // Revert inventory quantity
        if (mov.tipo === 'ENTRADA') {
            item.quantidade -= mov.quantidade;
        } else if (mov.tipo === 'SAÍDA') {
            item.quantidade += mov.quantidade;
        }
        salvarEstoque(itensEstoque);
    } else {
        alert("Aviso: O item de estoque original desta movimentação foi excluído. O registro do log será removido, mas o estoque não pôde ser revertido.");
    }

    // Delete transaction from list
    movs = movs.filter(m => m.id !== id);
    localStorage.setItem(MOV_KEY, JSON.stringify(movs));

    // Reload all subviews
    renderizarEstoque();
    window.renderSimuladores();
    window.renderizarMovimentacoesEstoque();

    alert("Lançamento estornado e estoque restabelecido com sucesso!");
};

// Sincronização em tempo real quando o usuário muda para a aba de estoque
document.addEventListener('click', (e) => {
    const link = e.target.closest('.sidebar nav ul li a, .dropdown-item[data-target]');
    if (!link) return;

    const targetId = link.getAttribute('data-target');
    if (targetId === 'view-estoque') {
        renderizarEstoque();
        window.renderSimuladores();
        window.renderizarMovimentacoesEstoque();
    }
});
