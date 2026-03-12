// --- Lógica da Aba Financeiro ---

document.addEventListener('DOMContentLoaded', () => {
    // Definir o mês atual por padrão
    const inputMes = document.getElementById('finFiltroMes');
    if (inputMes) {
        const agora = new Date();
        const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
        inputMes.value = `${agora.getFullYear()}-${mes}`;
    }

    // Listener do filtro
    const btnFiltrar = document.getElementById('btnFiltrarFinanceiro');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', carregarDadosFinanceiros);
    }
    
    // Carregar inicialmente se a aba for aberta
    document.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'view-financeiro') {
            carregarDadosFinanceiros();
        }
    });
});

async function carregarDadosFinanceiros() {
    const mesReferencia = document.getElementById('finFiltroMes').value;
    if (!mesReferencia) return;

    const [ano, mes] = mesReferencia.split('-');
    
    // 1. Buscar Romaneios (Madeira Serrada)
    const historico = await DB.list('historico');
    const romaneiosMes = historico.filter(h => h.data_carga.startsWith(mesReferencia));
    
    // 2. Buscar Vendas de Subprodutos
    const subprodutos = await DB.list('vendas_subprodutos');
    const subMes = subprodutos.filter(s => {
        const data = s.created_at || s.data;
        return data.startsWith(mesReferencia);
    });

    // 3. Processar Totais
    const totalMadeira = romaneiosMes.reduce((acc, curr) => acc + (curr.valor_final || 0), 0);
    const totalSub = subMes.reduce((acc, curr) => acc + (curr.total || 0), 0);
    
    // 4. Detalhes por Produto (Agregação)
    const detalhes = {};

    // Romaneios (Por item dentro do romaneio)
    romaneiosMes.forEach(r => {
        r.itens.forEach(item => {
            const label = `Madeira: ${item.nomeProduto}`;
            if (!detalhes[label]) detalhes[label] = { qtd: 0, total: 0 };
            detalhes[label].qtd += (item.volumeTotalVenda || item.volumeTotal);
            detalhes[label].total += ((item.volumeTotalVenda || item.volumeTotal) * item.precoUsado);
        });
    });

    // Subprodutos (Por tipo)
    subMes.forEach(s => {
        const label = `Subproduto: ${s.tipo}`;
        if (!detalhes[label]) detalhes[label] = { qtd: 0, total: 0 };
        detalhes[label].qtd += s.quantidade;
        detalhes[label].total += s.total;
    });

    // 5. Atualizar UI
    document.getElementById('finTotalMadeira').textContent = totalMadeira.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('finTotalSubprodutos').textContent = totalSub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('finTotalGeral').textContent = (totalMadeira + totalSub).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const tableBody = document.querySelector('#tableFinanceiro tbody');
    tableBody.innerHTML = '';
    
    Object.keys(detalhes).forEach(key => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${key}</td>
            <td>${detalhes[key].qtd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td style="font-weight: bold;">${detalhes[key].total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        `;
        tableBody.appendChild(tr);
    });

    if (Object.keys(detalhes).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; opacity: 0.5;">Sem lançamentos para este período.</td></tr>';
    }
}
