// dashboard.js - Lógica de indicadores e gráficos

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Dashboard
    initDashboard();
});

function initDashboard() {
    // Dados Fictícios para demonstração (serão integrados com dados reais futuramente)
    const stats = {
        totalCargas: 124,
        volumeVendido: 1450.5,
        clientesAtivos: 42,
        estoqueVolume: 850.2
    };

    // Atualizar indicadores (KPIs)
    document.getElementById('dash-total-cargas').textContent = stats.totalCargas;
    document.getElementById('dash-volume-total').textContent = stats.volumeVendido + ' m³';
    document.getElementById('dash-total-clientes').textContent = stats.clientesAtivos;
    document.getElementById('dash-total-estoque').textContent = stats.estoqueVolume + ' m³';

    // Gráfico de Volume por Espessura
    renderChartEspessura();

    // Gráfico de Vendas por Período
    renderChartVendas();
}

function renderChartEspessura() {
    const ctx = document.getElementById('chartVolumeEspessura').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['2.5cm', '3.0cm', '5.0cm', '10cm', '15cm'],
            datasets: [{
                label: 'Volume (m³)',
                data: [350, 480, 220, 150, 250],
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

function renderChartVendas() {
    const ctx = document.getElementById('chartVendasPeriodo').getContext('2d');

    // Gradiente para o gráfico de linha
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(230, 126, 34, 0.4)');
    gradient.addColorStop(1, 'rgba(230, 126, 34, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Vendas Mensais',
                data: [120, 190, 150, 250, 210, 310],
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
