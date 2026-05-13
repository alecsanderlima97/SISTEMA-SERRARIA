import { db, collection, getDocs } from './firebase-init.js';

// --- Histórico de Cargas ---

const listaHistorico = document.getElementById('listaHistorico');

async function renderizarHistorico() {
    if(!listaHistorico) return;
    listaHistorico.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando do Firebase...</td></tr>';
    
    let historias = [];
    try {
        const querySnapshot = await getDocs(collection(db, 'historico'));
        querySnapshot.forEach((doc) => {
            historias.push({ id: doc.id, ...doc.data() });
        });
        
        // Mantém fallback para outros módulos
        if(window.DB) {
            window.DB.set('historico', historias);
        }
    } catch (error) {
        console.error("Erro ao buscar histórico: ", error);
        listaHistorico.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--danger-color);">Erro ao conectar com Firebase.</td></tr>';
        return;
    }

    listaHistorico.innerHTML = '';

    if(historias.length === 0) {
        listaHistorico.innerHTML = `<tr><td colspan="5" style="text-align:center;">Ainda não há cargas finalizadas.</td></tr>`;
        return;
    }

    // Ordenar pela data de criação ou numero (mais recentes primeiro)
    // Se existir um timestamp, podemos ordenar por ele, senão mantemos a ordem reversa
    // Considerando que vamos salvar com createdAt no romaneio.js
    historias.sort((a, b) => new Date(b.criadoEm || b.id) - new Date(a.criadoEm || a.id));

    historias.forEach(h => {
        const tr = document.createElement('tr');
        const valorFinalStr = typeof h.valorFinal === 'number' ? h.valorFinal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : h.valorFinal;
        tr.innerHTML = `
            <td><strong>${h.numeroCarga || '-'}</strong></td>
            <td>${h.data || '-'}</td>
            <td>${h.cliente || '-'}</td>
            <td>${(h.volumeTotalItem || 0).toFixed(4)} m³</td>
            <td style="color:var(--accent-color); font-weight:bold;">${valorFinalStr}</td>
        `;
        listaHistorico.appendChild(tr);
    });
}

// Escuta evento customizado disparado pelo romaneio.js
document.addEventListener('historicoUpdated', renderizarHistorico);

// Inicia Renderização
renderizarHistorico();
