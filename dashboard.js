import { db, getDocs, collection } from './js/firebase-init.js';

// dashboard.js - Lógica de indicadores e gráficos
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

// Listener para quando dados mudarem
document.addEventListener('historicoUpdated', initDashboard);

async function initDashboard() {
    console.log("Iniciando Dashboard com dados do Firebase...");
    
    try {
        // Buscar dados do Firebase
        const [snapRomaneios, snapClientes, snapProdutos] = await Promise.all([
            getDocs(collection(db, "romaneios")),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "produtos"))
        ]);

        const historico = [];
        snapRomaneios.forEach(doc => historico.push(doc.data()));

        const totalClientes = snapClientes.size;
        const totalProdutos = snapProdutos.size;

        // Cálculos básicos
        const totalCargas = historico.length;
        const volumeVendido = historico.reduce((acc, h) => {
            // No Romaneio V2, o volume está em pacotes
            let vol = 0;
            if (h.pacotes) {
                h.pacotes.forEach(p => vol += (p.m3VendaTotal || 0));
            }
            return acc + vol;
        }, 0);

        const faturamentoTotal = historico.reduce((acc, h) => {
            return acc + (h.financeiro?.totalGeral || 0);
        }, 0);

        // Atualizar indicadores (KPIs) na UI
        const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if(document.getElementById('dash-total-cargas')) document.getElementById('dash-total-cargas').textContent = totalCargas;
        if(document.getElementById('dash-volume-total')) document.getElementById('dash-volume-total').textContent = volumeVendido.toFixed(2) + ' m³';
        if(document.getElementById('dash-faturamento-madeira')) document.getElementById('dash-faturamento-madeira').textContent = formatBRL(faturamentoTotal);
        if(document.getElementById('dash-total-clientes')) document.getElementById('dash-total-clientes').textContent = totalClientes;

        // Renderizar gráficos se houver dados
        if (historico.length > 0) {
            renderChartVendas(historico);
        }
    } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
    }
}

let chartVendasInstance = null;

function renderChartVendas(historico) {
    const canvas = document.getElementById('chartVendasPeriodo');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Agrupar vendas por mês simplificado
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const data = [0, 0, 0, 0, 0, 0]; // Exemplo: Precisaria de lógica de data real para produção

    if (chartVendasInstance) chartVendasInstance.destroy();

    chartVendasInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas Mensais (R$)',
                data: data,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}
