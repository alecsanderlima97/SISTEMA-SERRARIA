// --- CONTROLE DE ESTOQUE DILIGENTE & INTEGRADO ---
// Sincronizado com os módulos de Frotas (Manutenção de Peças e Insumos)

console.log("Módulo de Estoque: Inicializando almoxarifado unificado...");

const ESTOQUE_KEY = 'orquestra_estoque';

// Dados padrões do Estoque se não existirem
const PADROES_ESTOQUE = [
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

document.addEventListener('DOMContentLoaded', () => {
    renderizarEstoque();
    inicializarEventosEstoque();
});

function inicializarEventosEstoque() {
    const form = document.getElementById('formNovoItemEstoque');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarItemEstoque();
        });
    }
}

// --- RENDERIZAR TABELA DE INVENTÁRIO ---
function renderizarEstoque() {
    // Obter dados atualizados (para refletir manutenções e abastecimentos instantaneamente)
    itensEstoque = obterEstoque();

    const tbody = document.getElementById('corpoTabelaEstoque');
    if (!tbody) return;

    const filtrados = itensEstoque.filter(item => 
        item.nome.toUpperCase().includes(filtroBuscaEstoque.toUpperCase()) ||
        item.categoria.toUpperCase().includes(filtroBuscaEstoque.toUpperCase())
    );

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 1.5rem; margin-bottom: 8px;"></i><br>
                    Nenhum item encontrado no almoxarifado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtrados.map(item => {
        const total = item.quantidade * item.unitario;
        const corQtd = item.quantidade <= 3 ? '#f87171' : 'white'; // Destaque para estoque crítico
        
        return `
            <tr style="border-bottom: 1px solid var(--panel-border); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='none'">
                <td style="padding: 12px 8px;"><span style="font-size: 0.72rem; font-weight: bold; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); color: var(--accent-color);">${item.categoria}</span></td>
                <td style="padding: 12px 8px; font-weight: 600; color: white;">${item.nome}</td>
                <td style="padding: 12px 8px; text-align: center; font-weight: bold; color: ${corQtd};">
                    ${item.quantidade.toFixed(1)} ${item.categoria === 'DIESEL' || item.categoria === 'LUBRIFICANTES' ? 'L' : 'Un'}
                    ${item.quantidade <= 3 ? '⚠️' : ''}
                </td>
                <td style="padding: 12px 8px; text-align: right; color: white;">R$ ${item.unitario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: var(--accent-color);">R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="padding: 12px 8px; text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button type="button" class="btn-action-card" onclick="window.editarItemEstoque('${item.id}')" title="Editar item" style="padding: 6px 10px;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn-action-card" onclick="window.excluirItemEstoque('${item.id}')" title="Remover item" style="padding: 6px 10px; color: #f87171;"><i class="fa-solid fa-trash"></i></button>
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

// --- MODAIS ---
window.abrirModalNovoItemEstoque = function() {
    document.getElementById('estoqueItemId').value = '';
    document.getElementById('estNome').value = '';
    document.getElementById('estCategoria').value = 'PEÇAS';
    document.getElementById('estQtd').value = '';
    document.getElementById('estUnitario').value = '';
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
    
    document.getElementById('tituloModalEstoque').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Item: ${item.nome}`;

    document.getElementById('modalNovoItemEstoque').style.display = 'flex';
};

function salvarItemEstoque() {
    const id = document.getElementById('estoqueItemId').value;
    const nome = document.getElementById('estNome').value.trim().toUpperCase();
    const categoria = document.getElementById('estCategoria').value;
    const quantidade = parseFloat(document.getElementById('estQtd').value) || 0;
    const unitario = window.parseCurrencyValue(document.getElementById('estUnitario').value) || 0;

    if (!nome || quantidade < 0 || unitario < 0) {
        alert("Preencha todos os campos obrigatórios corretamente.");
        return;
    }

    itensEstoque = obterEstoque();

    if (id) {
        // Editar
        itensEstoque = itensEstoque.map(i => i.id === id ? { ...i, nome, categoria, quantidade, unitario } : i);
    } else {
        // Novo
        const novo = {
            id: 'est_' + new Date().getTime(),
            nome,
            categoria,
            quantidade,
            unitario
        };
        itensEstoque.push(novo);
    }

    salvarEstoque(itensEstoque);
    renderizarEstoque();
    fecharModalNovoItemEstoque();

    alert("Item do almoxarifado salvo e sincronizado com sucesso!");
}

window.excluirItemEstoque = function(id) {
    if (!confirm("Deseja realmente remover este item do estoque? Se ele for uma peça ou combustível utilizado em frotas, evite excluí-lo para não quebrar referências históricas.")) return;

    itensEstoque = obterEstoque().filter(i => i.id !== id);
    salvarEstoque(itensEstoque);
    renderizarEstoque();
};

// Sincronização em tempo real quando o usuário muda para a aba de estoque
document.addEventListener('click', (e) => {
    const link = e.target.closest('.sidebar nav ul li a, .dropdown-item[data-target]');
    if (!link) return;

    const targetId = link.getAttribute('data-target');
    if (targetId === 'view-estoque') {
        renderizarEstoque();
    }
});
