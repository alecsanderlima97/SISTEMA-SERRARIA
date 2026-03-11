// --- Ferramentas Auxiliares / Calculadoras ---

// Inicializar Máscaras
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calcEsp')) applyMask(document.getElementById('calcEsp'), 1);
    if (document.getElementById('calcLar')) applyMask(document.getElementById('calcLar'), 1);
    if (document.getElementById('calcComp')) applyMask(document.getElementById('calcComp'), 2);

    if (document.getElementById('fardoEsp')) applyMask(document.getElementById('fardoEsp'), 1);
    if (document.getElementById('fardoLar')) applyMask(document.getElementById('fardoLar'), 1);
    if (document.getElementById('fardoComp')) applyMask(document.getElementById('fardoComp'), 2);
});

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
    btnCalcCavaco.addEventListener('click', function () {
        const tipo = document.getElementById('calcCavTipo').value;
        const unidade = document.getElementById('calcCavUnidade').value;
        const qtd = parseFloat(document.getElementById('calcCavQtd').value) || 0;
        const valorUni = parseFloat(document.getElementById('calcCavValor').value) || 0;

        const romaneio = document.getElementById('calcCavRomaneio').value || '---';
        const cliente = document.getElementById('calcCavCliente').value || '---';
        const motorista = document.getElementById('calcCavMotorista').value || '---';
        const medidas = document.getElementById('calcCavMedidas').value || '---';

        if (qtd <= 0 || valorUni <= 0) {
            alert("Preencha corretamente a quantidade e o valor unitário!");
            return;
        }

        const total = qtd * valorUni;

        // Salvar a venda no Banco de Dados (LocalStorage)
        const novaVenda = {
            id: 'CAV-' + Date.now(),
            data: new Date().toISOString().split('T')[0],
            romaneio: romaneio,
            cliente: cliente,
            motorista: motorista,
            medidas: medidas,
            tipo: tipo,
            unidade: unidade,
            quantidade: qtd,
            valorUnitario: valorUni,
            total: total
        };

        const vendasSub = DB.get('vendas_subprodutos');
        vendasSub.push(novaVenda);
        DB.set('vendas_subprodutos', vendasSub);

        // Preencher área de impressão
        document.getElementById('printCavRomaneio').textContent = romaneio;
        document.getElementById('printCavCliente').textContent = cliente;
        document.getElementById('printCavMotorista').textContent = motorista;
        document.getElementById('printCavMedidas').textContent = medidas;

        document.getElementById('printCavData').textContent = new Date().toLocaleDateString('pt-BR');
        document.getElementById('printCavTipo').textContent = tipo;
        document.getElementById('printCavQtd').textContent = qtd.toLocaleString('pt-BR');
        document.getElementById('printCavUni').textContent = unidade;
        document.getElementById('printCavValorUni').textContent = valorUni.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        document.getElementById('printCavTotal').textContent = total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        // Ocultar tudo na tela exceto a área de impressão
        const originalContent = document.body.innerHTML;
        const printContent = document.getElementById('printAreaSubprodutos').outerHTML;

        // Mostrar alerta de sucesso antes da impressão (opcional, como o print recarrega, alerta pode ser melhor depois se não fosse reload)
        console.log("Venda salva com sucesso!");

        document.body.innerHTML = printContent;
        // Forçar display block para impressão
        document.getElementById('printAreaSubprodutos').style.display = 'block';

        window.print();

        // Restaurar estado original (necessita reload suave das ações ou trocar display via classe)
        // A melhor prática para SPAs sem recarregar a tela após o print:
        document.body.innerHTML = originalContent;
        window.location.reload(); // Reload necessário para resvincular eventos após substituição brusca de innerHTML.
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
