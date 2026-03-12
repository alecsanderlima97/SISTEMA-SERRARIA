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
            <td style="color:var(--accent-color); font-weight:bold;">${vFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
        `;
        listaHistorico.appendChild(tr);
    });
}

// Escuta evento customizado disparado pelo romaneio.js
document.addEventListener('historicoUpdated', renderizarHistorico);

// Inicia Renderização
renderizarHistorico();
