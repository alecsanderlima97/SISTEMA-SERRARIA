// --- Histórico de Cargas ---

const listaHistorico = document.getElementById('listaHistorico');

function renderizarHistorico() {
    let historias = DB.get('historico') || [];
    listaHistorico.innerHTML = '';

    if(historias.length === 0) {
        listaHistorico.innerHTML = `<tr><td colspan="5" style="text-align:center;">Ainda não há cargas finalizadas.</td></tr>`;
        return;
    }

    // Mostrar os mais recentes primeiro
    let histInvertido = [...historias].reverse();

    histInvertido.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${h.numeroCarga}</strong></td>
            <td>${h.data}</td>
            <td>${h.cliente}</td>
            <td>${h.volumeTotalItem.toFixed(4)} m³</td>
            <td style="color:var(--accent-color); font-weight:bold;">${h.valorFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
        `;
        listaHistorico.appendChild(tr);
    });
}

// Escuta evento customizado disparado pelo romaneio.js
document.addEventListener('historicoUpdated', renderizarHistorico);

// Inicia Renderização
renderizarHistorico();
