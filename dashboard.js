// dashboard.js - Lógica de indicadores e gráficos

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Dashboard
    initDashboard();
});

// Listener para quando dados mudarem em outras abas
document.addEventListener('historicoUpdated', initDashboard);
document.addEventListener('vendasSubprodutosUpdated', initDashboard); // Evento que poderiamos disparar se quiséssemos

async function initDashboard() {
    // Buscar Dados Reais no Supabase
    const listPrompts = [
        DB.list('historico'),
        DB.list('entradas'),
        DB.list('vendas_subprodutos'),
        DB.list('clientes'),
        DB.list('produtos')
    ];

    const [historico, entradas, subprodutos, clientes, produtos] = await Promise.all(listPrompts);

    // 1. Total de Cargas (Vendas de Madeira)
    const totalCargas = (historico || []).length;

    // 2. Volume de Madeira Vendida (m³)
    const volumeVendido = (historico || []).reduce((acc, h) => acc + (h.volume_total_item || h.volumeTotalItem || 0), 0);

    // 3. Entrada de Toras (m³)
    const volumeEntrada = (entradas || []).reduce((acc, e) => acc + (e.volume || 0), 0);

    // 4. Faturamento Madeira (R$)
    const faturamentoMadeira = (historico || []).reduce((acc, h) => acc + (h.valor_final || h.valorFinal || 0), 0);

    // 5. Faturamento de Cavaco e Pó de Serra (R$)
    const faturamentoSub = (subprodutos || []).reduce((acc, s) => acc + (s.total || 0), 0);

    // 6. Volume de Cavaco e Pó de Serra (m³)
    const volumeSub = (subprodutos || []).reduce((acc, s) => {
        if (s.unidade === 'm³') return acc + (s.quantidade || 0);
        return acc;
    }, 0);

    // 7. Clientes Ativos
    const totalClientes = (clientes || []).length;

    // 8. Estoque (Simplificado: Entrada - Saída)
    const estoqueVolume = volumeEntrada - volumeVendido;

    // Atualizar indicadores (KPIs) na UI
    const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if(document.getElementById('dash-total-cargas')) document.getElementById('dash-total-cargas').textContent = totalCargas;
    if(document.getElementById('dash-volume-total')) document.getElementById('dash-volume-total').textContent = volumeVendido.toFixed(2) + ' m³';
    if(document.getElementById('dash-entrada-toras')) document.getElementById('dash-entrada-toras').textContent = volumeEntrada.toFixed(2) + ' m³';
    if(document.getElementById('dash-faturamento-madeira')) document.getElementById('dash-faturamento-madeira').textContent = formatBRL(faturamentoMadeira);
    if(document.getElementById('dash-faturamento-sub')) document.getElementById('dash-faturamento-sub').textContent = formatBRL(faturamentoSub);
    if(document.getElementById('dash-volume-sub')) document.getElementById('dash-volume-sub').textContent = volumeSub.toFixed(2) + ' m³';
    if(document.getElementById('dash-total-clientes')) document.getElementById('dash-total-clientes').textContent = totalClientes;
    if(document.getElementById('dash-total-estoque')) document.getElementById('dash-total-estoque').textContent = (estoqueVolume > 0 ? estoqueVolume : 0).toFixed(2) + ' m³';

    // Gráficos
    renderChartEspessura(historico || []);
    renderChartVendas(historico || []);
}

let chartEspessuraInstance = null;
let chartVendasInstance = null;

function renderChartEspessura(historico) {
    const canvas = document.getElementById('chartVolumeEspessura');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Agrupar volume por espessura dos dados reais
    const volumesPorEsp = {};
    historico.forEach(h => {
        if (h.itens) {
            h.itens.forEach(item => {
                const esp = item.espessura + 'cm';
                volumesPorEsp[esp] = (volumesPorEsp[esp] || 0) + item.volumeTotal;
            });
        }
    });

    const labels = Object.keys(volumesPorEsp).length > 0 ? Object.keys(volumesPorEsp) : ['Sem dados'];
    const data = Object.keys(volumesPorEsp).length > 0 ? Object.values(volumesPorEsp) : [0];

    if(chartEspessuraInstance) chartEspessuraInstance.destroy();

    // Criar o gráfico
    chartEspessuraInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume (m³)',
                data: data,
                backgroundColor: 'rgba(230, 126, 34, 0.6)',
                borderColor: '#e67e22',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                }
            }
        }
    });
}

function renderChartVendas(historico) {
    const canvas = document.getElementById('chartVendasPeriodo');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Agrupar vendas por mês (últimos 6 meses)
    const ultimosMeses = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        ultimosMeses.push(d.toLocaleString('pt-BR', { month: 'short' }));
    }

    const vendasMensais = new Array(6).fill(0);
    historico.forEach(h => {
        const dataH = new Date(h.data);
        const mesH = dataH.toLocaleString('pt-BR', { month: 'short' });
        const idx = ultimosMeses.indexOf(mesH);
        if (idx !== -1) {
            vendasMensais[idx] += h.valorFinal;
        }
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(230, 126, 34, 0.4)');
    gradient.addColorStop(1, 'rgba(230, 126, 34, 0)');

    if (chartVendasInstance) chartVendasInstance.destroy();

    chartVendasInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ultimosMeses,
            datasets: [{
                label: 'Vendas Mensais',
                data: vendasMensais,
                fill: true,
                backgroundColor: gradient,
                borderColor: '#f1c40f',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                }
            }
        }
    });
}
