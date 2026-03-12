// --- Histórico de Cargas ---

const listaHistorico = document.getElementById('listaHistorico');

async function renderizarHistorico() {
    if (!listaHistorico) return;
    listaHistorico.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando histórico...</td></tr>';

    const historias = await DB.list('historico');
    listaHistorico.innerHTML = '';

    if(!historias || historias.length === 0) {
        listaHistorico.innerHTML = `<tr><td colspan="5" style="text-align:center;">Ainda não há cargas finalizadas.</td></tr>`;
        return;
    }

    // Supabase já retorna ordenado se configurado em DB.list
    historias.forEach(h => {
        const tr = document.createElement('tr');
        // Mapeamento de campos snake_case para o novo sistema
        const numCarga = h.numero_carga || h.numeroCarga || '---';
        const dataCarga = h.data_carga || h.data || '---';
        const clienteNome = h.cliente_nome || h.cliente || 'Avulso';
        const volTotal = h.volume_total_item || h.volumeTotalItem || 0;
        const vFinal = h.valor_final || h.valorFinal || 0;

        tr.innerHTML = `
            <td><strong>${numCarga}</strong></td>
            <td>${dataCarga}</td>
            <td>${clienteNome}</td>
            <td>${volTotal.toFixed(4)} m³</td>
            <td style="color:var(--accent-color); font-weight:bold;">${window.formatarMoeda(vFinal)}</td>
            <td class="hide-on-print">
                <button class="btn-secondary" style="padding: 5px 10px;" onclick="exibirDetalhesCarga('${h.id}')" title="Ver Detalhes">
                    <i class="fa-solid fa-eye"></i> Detalhes
                </button>
            </td>
        `;
        listaHistorico.appendChild(tr);
    });
}

// Função para exibir detalhes
window.exibirDetalhesCarga = async function(id) {
    const h = await DB.getById('historico', id);
    if (!h) return;

    const modal = document.getElementById('modalDetalhes');
    const itensBody = document.getElementById('detalhesItensBody');
    const infoGeral = document.getElementById('detalheInfoGeral');
    const numCargaSpan = document.getElementById('detalheNumCarga');

    if (numCargaSpan) numCargaSpan.textContent = h.numero_carga || h.numeroCarga || '---';

    infoGeral.innerHTML = `
        <div><strong>Cliente:</strong> ${h.cliente_nome || h.cliente || '---'}</div>
        <div><strong>Transportadora:</strong> ${h.transportadora_nome || h.transportadora || '---'}</div>
        <div><strong>Data:</strong> ${h.data_carga || h.data || '---'}</div>
        <div><strong>Forma Pgto:</strong> ${h.pagamento || '---'}</div>
        <div><strong>Volume Total:</strong> ${h.volume_total_item || 0} m³</div>
        <div style="color:var(--accent-color); font-weight:bold;"><strong>Valor Total:</strong> ${window.formatarMoeda(h.valor_final || 0)}</div>
    `;

    itensBody.innerHTML = '';
    const itens = h.itens || [];
    
    if (itens.length === 0) {
        itensBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum item registrado para esta carga.</td></tr>';
    } else {
        itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nomeProduto}</td>
                <td>${item.espessura}x${item.largura}x${item.comprimento}</td>
                <td>${item.quantidade}</td>
                <td>${(item.volumeUnidade || 0).toFixed(4)}</td>
                <td>${(item.volumeTotal || 0).toFixed(4)}</td>
                <td>${window.formatarMoeda(item.precoUsado || 0)}</td>
                <td>${window.formatarMoeda(item.volumeTotal * (item.precoUsado || 0))}</td>
            `;
            itensBody.appendChild(tr);
        });
    }

    modal.style.display = 'block';
};

window.fecharModalDetalhes = function() {
    document.getElementById('modalDetalhes').style.display = 'none';
};

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalDetalhes');
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

// Escuta evento customizado disparado pelo romaneio.js
document.addEventListener('historicoUpdated', renderizarHistorico);

// Inicia Renderização
renderizarHistorico();
