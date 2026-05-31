import { auth, reautenticarUsuarioAtual } from './firebase-init.js';

// --- CONTROLE DE ESTOQUE SAAS PREMIUM & INTEGRADO ---
// Sincronizado com os módulos de Frotas (Manutenção de Peças e Insumos)
// Desenvolvido por: Orquestra.cs - sistemas industrial personalizado

console.log("Módulo de Estoque Premium: Inicializando almoxarifado unificado...");

const ESTOQUE_KEY = 'orquestra_estoque';
const MOV_KEY = 'orquestra_estoque_movimentacoes';
const FROTA_KEY = 'orquestra_frota';
const ESTOQUE_INICIALIZADO_KEY = 'orquestra_estoque_inicializado';

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

// Memória cache local para sincronização
let itensEstoque = [];
let movimentacoesEstoque = [];
let filtroBuscaEstoque = '';
let categoriaAtiva = 'TODAS';

function obterEstoque() {
    if (itensEstoque && itensEstoque.length > 0) return itensEstoque.filter(item => item.ativo !== false);

    const local = JSON.parse(localStorage.getItem(ESTOQUE_KEY) || '[]');
    if (local.length > 0) {
        itensEstoque = local;
        return itensEstoque.filter(item => item.ativo !== false);
    }

    itensEstoque = PADROES_ESTOQUE.map(item => ({ ...item }));
    localStorage.setItem(ESTOQUE_KEY, JSON.stringify(itensEstoque));
    return itensEstoque;
}

function salvarEstoque(dados) {
    itensEstoque = dados || [];
    localStorage.setItem(ESTOQUE_KEY, JSON.stringify(itensEstoque));
    if (window.FS) {
        itensEstoque.forEach(item => window.FS.setDoc('estoque', item.id, item).catch(err => {
            console.error('Erro ao sincronizar item de estoque:', err);
        }));
    }
}

async function carregarDadosDoFirestore() {
    try {
        console.log("Almoxarifado: Sincronizando dados com o Firestore...");
        
        let estoqueDados = await window.FS.getCollection('estoque');
        const estoqueJaInicializado = localStorage.getItem(ESTOQUE_INICIALIZADO_KEY) === 'true';
        if (estoqueDados.length === 0 && !estoqueJaInicializado) {
            console.log("Inicializando estoque default no Firestore...");
            for (let item of PADROES_ESTOQUE) {
                await window.FS.setDoc('estoque', item.id, item);
            }
            estoqueDados = await window.FS.getCollection('estoque');
        }
        itensEstoque = estoqueDados;
        localStorage.setItem(ESTOQUE_KEY, JSON.stringify(itensEstoque));
        localStorage.setItem(ESTOQUE_INICIALIZADO_KEY, 'true');

        let movsDados = await window.FS.getCollection('estoque_movimentacoes');
        movsDados.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
        movimentacoesEstoque = movsDados;
        localStorage.setItem(MOV_KEY, JSON.stringify(movimentacoesEstoque));

        renderizarEstoque();
        window.renderSimuladores();
        window.renderizarMovimentacoesEstoque();
        renderResumoEstoque();
    } catch (err) {
        console.error("Erro na sincronização do estoque:", err);
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDoFirestore();
    inicializarEventosEstoque();
    window.switchTabEstoque('resumo');
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
        formMov.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarNovaMovimentacaoManual(e);
        });
    }

    const buscaMovimentacao = document.getElementById('buscaMovimentacao');
    if (buscaMovimentacao) buscaMovimentacao.addEventListener('input', window.renderizarMovimentacoesEstoque);
    const filtroMovTipo = document.getElementById('filtroMovTipo');
    if (filtroMovTipo) filtroMovTipo.addEventListener('change', window.renderizarMovimentacoesEstoque);
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
    if (tabName === 'resumo') btnId = 'btnTabEstoqueResumo';
    else if (tabName === 'inventario') btnId = 'btnTabEstoqueInventario';
    else if (tabName === 'tanques') btnId = 'btnTabEstoqueTanques';
    else if (tabName === 'movimentacoes') btnId = 'btnTabEstoqueMovimentacoes';
    else if (tabName === 'lancar') btnId = 'btnTabEstoqueLancar';

    const activeBtn = document.getElementById(btnId);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = 'var(--accent-color)';
        activeBtn.style.borderBottom = '3px solid var(--accent-color)';
    }

    // Refresh display
    if (tabName === 'resumo') {
        renderResumoEstoque();
    } else if (tabName === 'tanques') {
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
    else if (cat === 'SERRAS E FACAS P/ PICADOR') activeCardId = 'catCard_SERRAS_FACAS';
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
    const itensAtivos = obterEstoque();
    const tbody = document.getElementById('corpoTabelaEstoque');
    if (!tbody) return;

    // Filter by text search
    let filtrados = itensAtivos.filter(item => 
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

    const ordem = document.getElementById('ordenarEstoque')?.value || 'nome';
    filtrados.sort((a, b) => {
        if (ordem === 'data-desc') return new Date(b.criadoEm || b.atualizadoEm || 0) - new Date(a.criadoEm || a.atualizadoEm || 0);
        if (ordem === 'data-asc') return new Date(a.criadoEm || a.atualizadoEm || 0) - new Date(b.criadoEm || b.atualizadoEm || 0);
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

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
                        <button type="button" class="btn-action-card" onclick="window.abrirSaidaRapida('${item.id}')" title="Registrar Entrada/Saída" style="padding: 5px 9px; color: #f59e0b; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); font-size: 0.78rem;"><i class="fa-solid fa-right-left"></i> Entrada/Saída</button>
                        <button type="button" class="btn-action-card" onclick="window.editarItemEstoque('${item.id}')" title="Editar item" style="padding: 5px 9px;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn-action-card" onclick="window.excluirItemEstoque('${item.id}')" title="Remover item" style="padding: 5px 9px; color: #f87171;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.renderizarEstoque = renderizarEstoque;

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

async function salvarItemEstoque() {
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

    const btn = document.querySelector('#modalNovoItemEstoque button[type="submit"]');
    const origText = btn ? btn.innerHTML : 'Salvar';
    if (btn) { btn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Gravando...'; btn.disabled = true; }

    try {
        const itemId = id || 'est_' + new Date().getTime();
        const itemObj = {
            id: itemId,
            nome,
            categoria,
            quantidade,
            unitario,
            limite_alerta,
            criadoEm: id ? (itensEstoque.find(i => i.id === id)?.criadoEm || new Date().toISOString()) : new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };

        await window.FS.setDoc('estoque', itemId, itemObj);

        if (id) {
            itensEstoque = itensEstoque.map(i => i.id === id ? itemObj : i);
        } else {
            itensEstoque.push(itemObj);
        }

        renderizarEstoque();
        window.renderSimuladores();
        fecharModalNovoItemEstoque();
        alert("Item do almoxarifado salvo com sucesso!");
    } catch (err) {
        console.error("Erro ao salvar item no Firestore:", err);
        alert("Erro ao salvar item.");
    } finally {
        if (btn) { btn.innerHTML = origText; btn.disabled = false; }
    }
}

window.excluirItemEstoque = async function(id) {
    const autorizado = await window.confirmarExclusaoComSenha('Deseja realmente ocultar este item do estoque? O historico sera preservado.');
    if (!autorizado) return;

    try {
        const todos = JSON.parse(localStorage.getItem(ESTOQUE_KEY) || '[]');
        const itemLocal = todos.find(i => i.id === id) || itensEstoque.find(i => i.id === id) || { id };
        const itemAtualizado = {
            ...itemLocal,
            ativo: false,
            removidoEm: new Date().toISOString()
        };

        if (window.FS) await window.FS.setDoc('estoque', id, itemAtualizado);
        itensEstoque = todos.length
            ? todos.map(i => i.id === id ? itemAtualizado : i)
            : itensEstoque.map(i => i.id === id ? itemAtualizado : i);
        localStorage.setItem(ESTOQUE_KEY, JSON.stringify(itensEstoque));

        renderizarEstoque();
        window.renderSimuladores();
        renderResumoEstoque();
        alert('Item ocultado com sucesso!');
    } catch (err) {
        console.error('Erro ao ocultar item no Firestore:', err);
        alert('Erro ao ocultar item.');
    }
};


// --- SIMULADORES DE TANQUES & CONVERSÃO EM BALDES DE 20L ---
function obterMovimentacoesEstoque() {
    const locais = JSON.parse(localStorage.getItem(MOV_KEY) || '[]');
    return locais.length > 0 ? locais : (movimentacoesEstoque || []);
}

function normalizarTipoMovimento(tipo) {
    return (tipo || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function calcularSaldoPorMovimentacoes(item) {
    return Number(item?.quantidade) || 0;
}

window.renderSimuladores = function() {
    itensEstoque = obterEstoque();
    
    // 1. Diesel Simulator (capacidade maxima de 5000 litros)
    const diesel = itensEstoque.find(i => normalizarTipoMovimento(i.categoria) === 'DIESEL')
        || itensEstoque.find(i => normalizarTipoMovimento(i.nome).includes('DIESEL'));
    const dieselQtd = diesel ? Number(diesel.quantidade || 0) : 0;
    const dieselCapacity = 5000;
    const dieselPercent = Math.min((dieselQtd / dieselCapacity) * 100, 100);
    const dieselSpaceLeft = Math.max(dieselCapacity - dieselQtd, 0);

    const liquid = document.getElementById('dieselLiquidLevel');
    if (liquid) liquid.style.height = `${dieselPercent}%`;

    const levelNumber = document.getElementById('dieselLevelNumber');
    if (levelNumber) {
        levelNumber.innerText = Math.round(dieselQtd).toLocaleString('pt-BR');
        levelNumber.style.bottom = `${Math.min(Math.max(dieselPercent, 2), 96)}%`;
    }

    const percentText = document.getElementById('dieselPercentText');
    if (percentText) percentText.innerText = `${dieselPercent.toFixed(1)}%`;

    const litersText = document.getElementById('dieselLitersText');
    if (litersText) litersText.innerText = Math.round(dieselQtd).toLocaleString('pt-BR');

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
            const totalLitros = calcularSaldoPorMovimentacoes(lub);
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

// Register stock movement and persist to Firestore
window.registrarMovimentacaoEstoque = async function({
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
    // Build movement object
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
        observacao,
        criadoEm: new Date().toISOString()
    };
    const movsLocal = JSON.parse(localStorage.getItem(MOV_KEY)) || [];
    movsLocal.unshift(nova);
    localStorage.setItem(MOV_KEY, JSON.stringify(movsLocal));
    movimentacoesEstoque = [nova, ...movimentacoesEstoque.filter(m => m.id !== nova.id)];
    // Persist to Firestore
    try {
        if (window.FS) await window.FS.setDoc('estoque_movimentacoes', nova.id, nova);
        // Update local cache
        window.renderizarMovimentacoesEstoque();
        document.dispatchEvent(new CustomEvent('estoqueUpdated', { detail: nova }));
        console.log(`[Almoxarifado] Movimento gravado no Firestore: ${nova.id}`);
    } catch (err) {
        console.error('Erro ao gravar movimento no Firestore', err);
        alert('Não foi possível registrar a movimentação. Veja o console para detalhes.');
    }
};

window.registrarSaidaEstoqueFrota = async function({
    itemNome,
    tipoInsumo,
    quantidade,
    unitario,
    frotaId = '',
    frotaPlaca = '',
    destino = '',
    observacao = ''
}) {
    const qtd = parseFloat(quantidade) || 0;
    const preco = parseFloat(unitario) || 0;

    if (qtd <= 0 || preco < 0) {
        throw new Error('Quantidade ou valor unitario invalido para saida de estoque.');
    }

    itensEstoque = obterEstoque();
    const nomeBusca = (itemNome || '').toUpperCase();
    const item = itensEstoque.find(i => (i.nome || '').toUpperCase() === nomeBusca)
        || itensEstoque.find(i => (i.categoria || '').toUpperCase() === (tipoInsumo || '').toUpperCase());

    if (!item) {
        throw new Error(`Item de estoque nao encontrado: ${itemNome}`);
    }

    if (item.quantidade <= 0) {
        alert(`Não é possível abastecer. O estoque de ${item.nome} está zerado.`);
        return null;
    }

    if (item.quantidade < qtd) {
        alert(`Não é possível abastecer ${qtd.toLocaleString('pt-BR')} L. Saldo disponível de ${item.nome}: ${Number(item.quantidade || 0).toLocaleString('pt-BR')} L.`);
        return null;
    }

    item.quantidade -= qtd;
    item.atualizadoEm = new Date().toISOString();
    salvarEstoque(itensEstoque);
    if (window.FS) await window.FS.setDoc('estoque', item.id, item);

    await window.registrarMovimentacaoEstoque({
        tipo: 'SAÍDA',
        itemId: item.id,
        itemNome: item.nome,
        categoria: item.categoria,
        quantidade: qtd,
        unitario: preco,
        frotaId,
        frotaPlaca,
        destino,
        observacao
    });

    renderizarEstoque();
    window.renderSimuladores();
    window.renderizarMovimentacoesEstoque();
    document.dispatchEvent(new CustomEvent('estoqueUpdated', { detail: { itemId: item.id, itemNome: item.nome } }));

    return item;
};

function getLimiteEstoque(item) {
    return item.limite_alerta !== undefined && item.limite_alerta !== null
        ? Number(item.limite_alerta)
        : (item.categoria === 'DIESEL' ? 1000 : item.categoria === 'LUBRIFICANTES' ? 40 : 3);
}

function renderResumoEstoque() {
    const itens = obterEstoque();
    const diesel = itens.find(i => i.categoria === 'DIESEL' || (i.nome || '').toUpperCase().includes('DIESEL'));
    const dieselQtd = diesel ? calcularSaldoPorMovimentacoes(diesel) : 0;
    const itensBaixos = itens.filter(item => (Number(item.quantidade) || 0) <= getLimiteEstoque(item));
    const valorTotal = itens.reduce((acc, item) => acc + ((Number(item.quantidade) || 0) * (Number(item.unitario) || 0)), 0);

    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    set('estoqueResumoDiesel', `${Math.round(dieselQtd).toLocaleString('pt-BR')} L`);
    set('estoqueResumoItens', itens.length);
    set('estoqueResumoAcabando', itensBaixos.length);
    set('estoqueResumoValor', valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

    const lista = document.getElementById('estoqueResumoListaBaixa');
    if (!lista) return;
    if (itensBaixos.length === 0) {
        lista.innerHTML = '<div style="color: var(--text-muted);">Nenhum item abaixo do mínimo.</div>';
        return;
    }
    lista.innerHTML = itensBaixos.slice(0, 8).map(item => {
        const unidade = item.categoria === 'DIESEL' || item.categoria === 'LUBRIFICANTES' ? 'L' : 'Un';
        return `
            <div style="border:1px solid rgba(248,113,113,0.28); background:rgba(248,113,113,0.08); border-radius:10px; padding:10px;">
                <strong style="color:white; display:block;">${item.nome}</strong>
                <small style="color:#fca5a5;">Saldo: ${Number(item.quantidade || 0).toLocaleString('pt-BR')} ${unidade} | Mínimo: ${getLimiteEstoque(item).toLocaleString('pt-BR')} ${unidade}</small>
            </div>
        `;
    }).join('');
}

async function validarSenhaMovimentacaoEstoque(mensagem = 'Digite sua senha de login para confirmar esta operacao:') {
    const senha = prompt(mensagem);
    if (!senha) return false;

    const user = auth.currentUser;
    if (!user?.email) {
        alert('Usuario autenticado nao encontrado. Faca login novamente.');
        return false;
    }

    try {
        await reautenticarUsuarioAtual(senha);
        return true;
    } catch (err) {
        console.error('Senha invalida para operacao de estoque:', err);
        alert('Senha incorreta. Operacao cancelada.');
        return false;
    }
}

// Estorna a movimentacao e remove o lancamento do historico.
window.excluirMovimentacaoEstoque = async function(id) {
    const autorizado = await window.confirmarExclusaoComSenha('Deseja realmente ESTORNAR este movimento? Isso revertera o estoque e removera o registro.');
    if (!autorizado) return;

    try {
        const movs = JSON.parse(localStorage.getItem(MOV_KEY) || '[]');
        const mov = movimentacoesEstoque.find(m => m.id === id) || movs.find(m => m.id === id);
        if (!mov) {
            alert('Movimento nao encontrado.');
            return;
        }

        itensEstoque = obterEstoque();
        const item = itensEstoque.find(i => i.id === mov.itemId);
        if (item) {
            if (mov.tipo === 'ENTRADA') {
                item.quantidade = Number(item.quantidade || 0) - Number(mov.quantidade || 0);
            } else if ((mov.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'SAIDA') {
                item.quantidade = Number(item.quantidade || 0) + Number(mov.quantidade || 0);
            }
            item.atualizadoEm = new Date().toISOString();
            salvarEstoque(itensEstoque);
            if (window.FS) await window.FS.setDoc('estoque', item.id, item);
        } else {
            alert('Aviso: o item original foi excluido. O lancamento sera removido, mas o estoque nao pode ser revertido.');
        }

        if (window.FS) await window.FS.deleteDoc('estoque_movimentacoes', id);
        movimentacoesEstoque = movimentacoesEstoque.filter(m => m.id !== id);
        localStorage.setItem(MOV_KEY, JSON.stringify(movs.filter(m => m.id !== id)));

        renderizarMovimentacoesEstoque();
        renderizarEstoque();
        window.renderSimuladores();
        renderResumoEstoque();
        alert('Lancamento estornado e estoque restabelecido com sucesso.');
    } catch (err) {
        console.error('Erro ao estornar movimento de estoque:', err);
        alert('Falha ao estornar movimento. Consulte o console.');
    }
};

// Exclui somente o lancamento da movimentacao. Exige senha e nao altera saldo.
window.apagarMovimentacaoEstoque = async function(id) {
    const movs = JSON.parse(localStorage.getItem(MOV_KEY) || '[]');
    const mov = movimentacoesEstoque.find(m => m.id === id) || movs.find(m => m.id === id);
    if (!mov) {
        alert('Movimento nao encontrado.');
        return;
    }

    if (!confirm(`Deseja EXCLUIR apenas este lancamento de ${mov.tipo}? O saldo do estoque nao sera alterado.`)) return;

    const senhaOk = await validarSenhaMovimentacaoEstoque('Digite sua senha de login para excluir este lancamento:');
    if (!senhaOk) return;

    try {
        if (window.FS) await window.FS.deleteDoc('estoque_movimentacoes', id);
        movimentacoesEstoque = movimentacoesEstoque.filter(m => m.id !== id);
        localStorage.setItem(MOV_KEY, JSON.stringify(movs.filter(m => m.id !== id)));

        window.renderizarMovimentacoesEstoque();
        alert('Lancamento excluido com sucesso.');
    } catch (err) {
        console.error('Erro ao excluir lancamento de estoque:', err);
        alert('Falha ao excluir lancamento. Consulte o console.');
    }
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

    popularItensMovimentacaoManual();

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

function itemControladoPorFrota(item) {
    const categoria = (item?.categoria || '').toUpperCase();
    const nome = (item?.nome || '').toUpperCase();
    const ehGraxa = nome.includes('GRAXA');
    if (ehGraxa) return false;
    return categoria === 'DIESEL' || categoria === 'LUBRIFICANTES' || nome.includes('DIESEL') || nome.includes('LUBRIFICANTE') || nome.includes('ÓLEO') || nome.includes('OLEO');
}

function popularItensMovimentacaoManual() {
    const selectItem = document.getElementById('movItemId');
    if (!selectItem) return;
    const tipo = document.getElementById('movTipo')?.value || 'SAÍDA';
    itensEstoque = obterEstoque();
    const itensPermitidos = tipo === 'SAÍDA'
        ? itensEstoque.filter(item => !itemControladoPorFrota(item))
        : itensEstoque;
    selectItem.innerHTML = '<option value="">-- SELECIONE O ITEM --</option>' +
        itensPermitidos.map(item => `<option value="${item.id}">${item.nome} (${item.categoria}) [Saldo: ${item.quantidade.toFixed(1)}]</option>`).join('');
}

window.fecharModalNovaMovimentacao = function() {
    document.getElementById('modalNovaMovimentacao').style.display = 'none';
};

// Atalho: abre o modal configurado para movimentar o item selecionado.
window.abrirSaidaRapida = function(itemId) {
    window.abrirModalNovaMovimentacao();
    const st = document.getElementById('movTipo');
    if (st) { st.value = 'SAÍDA'; window.onChangeMovTipo(); }
    const si = document.getElementById('movItemId');
    if (si && itemId) { si.value = itemId; window.onChangeMovItem(); }
    setTimeout(() => document.getElementById('movQtd')?.focus(), 150);
};

window.onChangeMovTipo = function() {
    const tipo = document.getElementById('movTipo').value;
    const containerFrota = document.getElementById('containerMovFrota');
    if (containerFrota) {
        containerFrota.style.display = tipo === 'SAÍDA' ? 'block' : 'none';
    }
    popularItensMovimentacaoManual();
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
    if (tipo === 'SAÍDA' && itemControladoPorFrota(item)) {
        alert('Saídas de diesel e lubrificantes de máquinas devem ser lançadas pelo Controle de Frota.');
        return;
    }
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
    if (window.FS) window.FS.setDoc('estoque', item.id, item).catch(err => {
        console.error('Erro ao sincronizar item de estoque:', err);
    });

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
        observacao: (retiradoPor ? `Responsável: ${retiradoPor}. ` : '') + observacao + ' (Manual)'
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
            (m.itemNome || '').toUpperCase().includes(query) ||
            (m.categoria || '').toUpperCase().includes(query) ||
            (m.destino || '').toUpperCase().includes(query) ||
            (m.frotaPlaca || '').toUpperCase().includes(query) ||
            (m.observacao || '').toUpperCase().includes(query)
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
                    <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                        <button type="button" class="btn-action-card" onclick="window.excluirMovimentacaoEstoque('${mov.id}')" title="Estornar lancamento" style="padding: 6px 10px; color: #f87171;"><i class="fa-solid fa-rotate-left"></i> Estornar</button>
                        <button type="button" class="btn-action-card" onclick="window.apagarMovimentacaoEstoque('${mov.id}')" title="Excluir lancamento com senha" style="padding: 6px 10px; color: #fb7185;"><i class="fa-solid fa-trash-can"></i> Excluir</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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
        renderResumoEstoque();
    }
});

document.addEventListener('estoqueUpdated', () => {
    itensEstoque = obterEstoque();
    renderizarEstoque();
    window.renderSimuladores();
    window.renderizarMovimentacoesEstoque();
    renderResumoEstoque();
});
