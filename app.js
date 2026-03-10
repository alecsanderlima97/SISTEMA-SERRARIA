// Estado da aplicação
let itensRomaneio = [];
let proximoId = 1;

// Elementos DOM
const formItem = document.getElementById('itemForm');
const tabelaBody = document.getElementById('tabelaBody');
const totalQtdEl = document.getElementById('totalQtd');
const totalVolumeEl = document.getElementById('totalVolume');
const btnPrint = document.getElementById('btnPrint');

// Set data de hoje por padrão
document.getElementById('dataCarga').valueAsDate = new Date();

// Navegação da Sidebar (SPA)
document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
    link.addEventListener('click', function (e) {
        if (this.id === 'btnLogout') return;
        e.preventDefault();

        // Ativar link
        document.querySelectorAll('.sidebar nav ul li a').forEach(a => a.classList.remove('active'));
        this.classList.add('active');

        // Trocar seção
        const targetId = this.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.style.display = 'none';
        });
        document.getElementById(targetId).style.display = 'block';
    });
});

// Event Listener para submeter o formulário
formItem.addEventListener('submit', function (e) {
    e.preventDefault();

    // Coletar valores
    const espessura = parseFloat(document.getElementById('espessura').value);
    const largura = parseFloat(document.getElementById('largura').value);
    const comprimento = parseFloat(document.getElementById('comprimento').value);
    const quantidade = parseInt(document.getElementById('quantidade').value, 10);

    // Calcular volume de uma unidade
    // Fórmula: (Espessura / 100) * (Largura / 100) * Comprimento
    const volumeUnidade = (espessura / 100) * (largura / 100) * comprimento;

    // Volume total da linha
    const volumeTotalLinha = volumeUnidade * quantidade;

    // Criar objeto do item
    const novoItem = {
        id: proximoId++,
        espessura: espessura,
        largura: largura,
        comprimento: comprimento,
        quantidade: quantidade,
        volumeUnidade: volumeUnidade,
        volumeTotalLinha: volumeTotalLinha
    };

    // Adicionar ao array
    itensRomaneio.push(novoItem);

    // Atualizar UI
    renderizarTabela();

    // Resetar formulário
    formItem.reset();
    document.getElementById('espessura').focus();
});

// Event Listener para Impressão
btnPrint.addEventListener('click', () => {
    window.print();
});

// Função para renderizar a tabela
function renderizarTabela() {
    tabelaBody.innerHTML = '';

    if (itensRomaneio.length === 0) {
        tabelaBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-folder-open"></i><br>
                    Nenhum item adicionado ainda.
                </td>
            </tr>
        `;
        atualizarTotais();
        return;
    }

    itensRomaneio.forEach((item, index) => {
        const tr = document.createElement('tr');

        // Formatando o texto de medidas
        const medidasTexto = `${item.espessura} cm x ${item.largura} cm x ${item.comprimento.toFixed(1)} m`;

        tr.innerHTML = `
            <td>#${index + 1}</td>
            <td>${medidasTexto}</td>
            <td>${item.quantidade}</td>
            <td>${item.volumeUnidade.toFixed(4)}</td>
            <td><strong>${item.volumeTotalLinha.toFixed(4)}</strong></td>
            <td class="hide-on-print">
                <button class="btn-danger" onclick="removerItem(${item.id})" title="Remover">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        tabelaBody.appendChild(tr);
    });

    atualizarTotais();
}

// Função para atualizar os totais no rodapé
function atualizarTotais() {
    const somaQtd = itensRomaneio.reduce((acc, curr) => acc + curr.quantidade, 0);
    const somaVolume = itensRomaneio.reduce((acc, curr) => acc + curr.volumeTotalLinha, 0);

    totalQtdEl.innerHTML = `<strong>${somaQtd}</strong>`;
    totalVolumeEl.innerHTML = `<strong>${somaVolume.toFixed(4)} m³</strong>`;
}

// Função para remover item (exposta no escopo global)
window.removerItem = function (id) {
    itensRomaneio = itensRomaneio.filter(item => item.id !== id);
    renderizarTabela();
}

// Renderizar tabela inicial vazia
renderizarTabela();
