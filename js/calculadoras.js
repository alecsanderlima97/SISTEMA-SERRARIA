// --- Ferramentas Auxiliares / Calculadoras ---

// Inicializar Máscaras
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calcEsp')) applyMask(document.getElementById('calcEsp'), 1);
    if (document.getElementById('calcLar')) applyMask(document.getElementById('calcLar'), 1);
    if (document.getElementById('calcComp')) applyMask(document.getElementById('calcComp'), 2);

    if (document.getElementById('fardoEsp')) applyMask(document.getElementById('fardoEsp'), 1);
    if (document.getElementById('fardoLar')) applyMask(document.getElementById('fardoLar'), 1);
    if (document.getElementById('fardoComp')) applyMask(document.getElementById('fardoComp'), 2);

    // Máscaras para Medidas de Subprodutos
    if (document.getElementById('calcCavComp')) applyMask(document.getElementById('calcCavComp'), 2);
    if (document.getElementById('calcCavLarg')) applyMask(document.getElementById('calcCavLarg'), 2);
    if (document.getElementById('calcCavAlt')) applyMask(document.getElementById('calcCavAlt'), 2);
    
    // Máscaras para Quantidade e Valor (Subprodutos)
    if (document.getElementById('calcCavQtd')) applyMask(document.getElementById('calcCavQtd'), 3);
    if (document.getElementById('calcCavValor')) applyMask(document.getElementById('calcCavValor'), 2);

    // Carregar histórico inicial
    renderizarHistoricoSubprodutos();
});

// Função para calcular volume automático na Venda de Subprodutos
function atualizarVolumeSubproduto() {
    const comp = parseLocalFloat(document.getElementById('calcCavComp').value) || 0;
    const larg = parseLocalFloat(document.getElementById('calcCavLarg').value) || 0;
    const alt = parseLocalFloat(document.getElementById('calcCavAlt').value) || 0;
    const unidade = document.getElementById('calcCavUnidade').value;

    // Calcula automático se houver medidas
    if (comp > 0 && larg > 0 && alt > 0) {
        const vol = comp * larg * alt;
        document.getElementById('calcCavQtd').value = vol.toFixed(3).replace('.', ',');
    }
}

// Eventos para cálculo automático
document.addEventListener('input', (e) => {
    if (['calcCavComp', 'calcCavLarg', 'calcCavAlt'].includes(e.target.id)) {
        atualizarVolumeSubproduto();
    }
});

if (document.getElementById('calcCavUnidade')) {
    document.getElementById('calcCavUnidade').addEventListener('change', atualizarVolumeSubproduto);
}

// Controle do Botão de Histórico
const btnToggleHistoricoCavaco = document.getElementById('btnToggleHistoricoCavaco');
const historicoCavacoContainer = document.getElementById('historicoCavacoContainer');

if (btnToggleHistoricoCavaco) {
    btnToggleHistoricoCavaco.addEventListener('click', () => {
        const isHidden = historicoCavacoContainer.style.display === 'none';
        historicoCavacoContainer.style.display = isHidden ? 'block' : 'none';
        btnToggleHistoricoCavaco.innerHTML = isHidden ? 
            '<i class="fa-solid fa-eye-slash"></i> Ocultar Histórico' : 
            '<i class="fa-solid fa-clock-rotate-left"></i> Ver Histórico';
        
        if (isHidden) renderizarHistoricoSubprodutos();
    });
}

// Função para renderizar o histórico na tabela
async function renderizarHistoricoSubprodutos() {
    const tableBody = document.querySelector('#tableHistoricoCavaco tbody');
    if (!tableBody) return;

    const vendas = await DB.list('vendas_subprodutos');
    tableBody.innerHTML = '';

    vendas.slice(0, 15).forEach(v => {
        const tr = document.createElement('tr');
        const dataFormatada = new Date(v.created_at || v.data).toLocaleDateString('pt-BR');
        
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td title="${v.cliente}">${v.cliente.substring(0, 15)}${v.cliente.length > 15 ? '...' : ''}</td>
            <td style="font-weight: bold; color: var(--accent-color);">${v.placa || '---'}</td>
            <td><span class="badge" style="background: ${v.tipo === 'Cavaco' ? '#27ae60' : '#f39c12'}; font-size: 0.65rem;">${v.tipo}</span></td>
            <td>${v.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${v.unidade}</td>
            <td>${v.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>
                <button onclick="deletarVendaSubproduto(${v.id})" class="btn-action btn-delete" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    if (vendas.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; opacity: 0.5;">Nenhum registro encontrado.</td></tr>';
    }
}

// Global para ser acessado pelo onclick
window.deletarVendaSubproduto = async function(id) {
    if (confirm('Deseja realmente excluir este registro?')) {
        await DB.delete('vendas_subprodutos', id);
        renderizarHistoricoSubprodutos();
    }
};

// Escutar atualizações para recarregar a tabela
document.addEventListener('vendasSubprodutosUpdated', renderizarHistoricoSubprodutos);

// 1. Cubagem Rápida
const btnCalcCub = document.getElementById('btnCalcCub');
const resultadoCub = document.getElementById('resultadoCub');

btnCalcCub.addEventListener('click', function () {
    const esp = parseLocalFloat(document.getElementById('calcEsp').value) || 0;
    const lar = parseLocalFloat(document.getElementById('calcLar').value) || 0;
    const comp = parseLocalFloat(document.getElementById('calcComp').value) || 0;
    const qtd = parseInt(document.getElementById('calcQtd').value, 10) || 1;

    if (esp === 0 || lar === 0 || comp === 0) {
        resultadoCub.textContent = "Preencha as medidas!";
        resultadoCub.style.color = "var(--danger-color)";
        return;
    }

    // Fórmula m³ e Total
    const volUni = (esp / 100) * (lar / 100) * comp;
    const volTotal = volUni * qtd;

    resultadoCub.textContent = `${volTotal.toFixed(4)} m³`;
    resultadoCub.style.color = "var(--accent-color)";
});

// 2. Consumo de Diesel
const btnCalcDiesel = document.getElementById('btnCalcDiesel');
const resultadoDiesel = document.getElementById('resultadoDiesel');

btnCalcDiesel.addEventListener('click', function () {
    const km = parseFloat(document.getElementById('calcKm').value) || 0;
    const media = parseFloat(document.getElementById('calcMedia').value) || 0;
    const preco = parseFloat(document.getElementById('calcPrecoDiesel').value) || 0;

    if (km === 0 || media === 0 || preco === 0) {
        resultadoDiesel.textContent = "Dados inválidos!";
        return;
    }

    // Custo Estimado
    const litrosGastos = km / media;
    const custo = litrosGastos * preco;

    resultadoDiesel.textContent = custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    resultadoDiesel.style.color = "var(--danger-color)";
});

// 3. Venda de Cavaco / Pó de Serra / Subprodutos
const btnCalcCavaco = document.getElementById('btnCalcCavaco');

if (btnCalcCavaco) {
    btnCalcCavaco.addEventListener('click', async function () {
        const tipoElement = document.querySelector('input[name="subproduto_tipo"]:checked');
        const tipo = tipoElement ? tipoElement.value : 'Cavaco';
        const unidade = document.getElementById('calcCavUnidade').value;
        const qtd = parseLocalFloat(document.getElementById('calcCavQtd').value) || 0;
        const valorUni = parseLocalFloat(document.getElementById('calcCavValor').value) || 0;

        const romaneio = document.getElementById('calcCavRomaneio').value || '---';
        const cliente = document.getElementById('calcCavCliente').value || '---';
        const motorista = document.getElementById('calcCavMotorista').value || '---';
        const placa = document.getElementById('calcCavPlaca').value || '---';
        
        const comp = document.getElementById('calcCavComp').value || '0,00';
        const larg = document.getElementById('calcCavLarg').value || '0,00';
        const alt = document.getElementById('calcCavAlt').value || '0,00';
        const medidas = `${comp} x ${larg} x ${alt}`;

        if (qtd <= 0 || valorUni <= 0) {
            alert("Preencha corretamente a quantidade e o valor unitário!");
            return;
        }

        const total = qtd * valorUni;

        // Salvar a venda no Banco de Dados (Supabase)
        const novaVenda = {
            data: new Date().toISOString().split('T')[0],
            romaneio: romaneio,
            cliente: cliente,
            motorista: motorista,
            placa: placa.toUpperCase(),
            medidas: medidas,
            tipo: tipo,
            unidade: unidade,
            quantidade: qtd,
            valor_unitario: valorUni,
            total: total
        };

        try {
            await DB.insert('vendas_subprodutos', novaVenda);
            document.dispatchEvent(new Event('vendasSubprodutosUpdated'));
            
            // Preencher área de impressão
            document.getElementById('printCavRomaneio').textContent = romaneio;
            document.getElementById('printCavCliente').textContent = cliente;
            document.getElementById('printCavMotorista').textContent = motorista;
            document.getElementById('printCavPlaca').textContent = placa.toUpperCase();
            document.getElementById('printCavMedidas').textContent = medidas;

            document.getElementById('printCavData').textContent = new Date().toLocaleDateString('pt-BR');
            document.getElementById('printCavTipo').textContent = tipo;
            document.getElementById('printCavQtd').textContent = qtd.toLocaleString('pt-BR');
            document.getElementById('printCavUni').textContent = unidade;
            document.getElementById('printCavValorUni').textContent = valorUni.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            document.getElementById('printCavTotal').textContent = total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

            // Imprimir
            const printContent = document.getElementById('printAreaSubprodutos').innerHTML;
            const originalContent = document.body.innerHTML;

            document.body.innerHTML = printContent;
            window.print();
            
            // Recarregar para limpar e manter consistência
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar venda de subproduto no Supabase.');
        }
    });
}

// 4. Cálculo de Fardo Completo
const btnCalcFardo = document.getElementById('btnCalcFardo');
const resFardoQtd = document.getElementById('resFardoQtd');
const resFardoVol = document.getElementById('resFardoVol');

if (btnCalcFardo) {
    btnCalcFardo.addEventListener('click', function () {
        const esp = parseLocalFloat(document.getElementById('fardoEsp').value) || 0;
        const lar = parseLocalFloat(document.getElementById('fardoLar').value) || 0;
        const comp = parseLocalFloat(document.getElementById('fardoComp').value) || 0;
        const altPecas = parseInt(document.getElementById('fardoAltPecas').value, 10) || 0;
        const larPecas = parseInt(document.getElementById('fardoLarPecas').value, 10) || 0;
        const amarras = parseInt(document.getElementById('fardoAmarras').value, 10) || 0;

        if (esp === 0 || lar === 0 || comp === 0 || (altPecas === 0 && larPecas === 0)) {
            resFardoVol.textContent = "Dados incompletos!";
            resFardoVol.style.color = "var(--danger-color)";
            if(resFardoQtd) resFardoQtd.textContent = "";
            return;
        }

        // Cálculo de Peças e Volume
        const qtdTotal = (altPecas * larPecas) + amarras;
        const volUni = (esp / 100) * (lar / 100) * comp;
        const volTotal = volUni * qtdTotal;

        if(resFardoQtd) resFardoQtd.textContent = `${qtdTotal} peças`;
        if(resFardoVol) {
            resFardoVol.textContent = `${volTotal.toFixed(4)} m³`;
            resFardoVol.style.color = "var(--accent-color)";
        }
    });
}

// 5. Calculadora de Frete
const btnCalcFrete = document.getElementById('btnCalcFrete');
const resultadoFrete = document.getElementById('resultadoFrete');

if (btnCalcFrete) {
    btnCalcFrete.addEventListener('click', function () {
        const vol = parseFloat(document.getElementById('freteVol').value) || 0;
        const valorM3 = parseFloat(document.getElementById('freteValor').value) || 0;
        const extra = parseFloat(document.getElementById('freteExtra').value) || 0;

        if (vol === 0 || valorM3 === 0) {
            resultadoFrete.textContent = "Preencha o volume e valor!";
            resultadoFrete.style.color = "var(--danger-color)";
            return;
        }

        const totalFrete = (vol * valorM3) + extra;

        resultadoFrete.textContent = totalFrete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resultadoFrete.style.color = "var(--accent-color)";
    });
}
