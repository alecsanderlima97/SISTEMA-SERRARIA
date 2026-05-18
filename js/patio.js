import { db, collection, addDoc, getDocs, doc, deleteDoc } from './firebase-init.js';

// ---- MÓDULO: CONTROLE DE PRODUÇÃO & CONTAGEM DE PÁTIO ----

let itensPatioTemp = [];
let historicoPatioAtuais = [];

// Utilitários de Formatação e Conversão
function parseDecimal(val) {
    if (val === null || val === undefined) return 0;
    let s = val.toString().trim();
    if (s === '') return 0;
    // Remove pontos de milhar e substitui vírgula por ponto decimal
    s = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
}

function formatDecimal(num, places = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0,00';
    return num.toFixed(places).replace('.', ',');
}

// Inicializar Elementos
document.addEventListener('DOMContentLoaded', () => {
    const btnAbrir = document.getElementById('btnAbrirControleProducao');
    const modalPatio = document.getElementById('modalControleProducao');
    const formAdicionar = document.getElementById('formAdicionarItemPatio');
    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');
    const btnImprimir = document.getElementById('btnImprimirRelatorioPatio');

    if (btnAbrir) {
        btnAbrir.addEventListener('click', abrirModalPatio);
    }

    if (formAdicionar) {
        formAdicionar.addEventListener('submit', (e) => {
            e.preventDefault();
            adicionarItemAoPatio();
        });
    }

    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarRelatorioPatio);
    }

    if (btnImprimir) {
        btnImprimir.addEventListener('click', () => {
            imprimirRelatorioPatioCompleto();
        });
    }
});

// Abrir Modal do Pátio
window.abrirModalPatio = async function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (!modalPatio) return;

    modalPatio.style.display = 'flex';

    // Preencher Data e Hora Atuais por padrão
    const inputData = document.getElementById('patioData');
    const inputHorario = document.getElementById('patioHorario');
    const selectPeriodo = document.getElementById('patioPeriodo');

    if (inputData) {
        const hj = new Date();
        const yyyy = hj.getFullYear();
        const mm = String(hj.getMonth() + 1).padStart(2, '0');
        const dd = String(hj.getDate()).padStart(2, '0');
        inputData.value = `${yyyy}-${mm}-${dd}`;
    }

    if (inputHorario) {
        const hj = new Date();
        const hh = String(hj.getHours()).padStart(2, '0');
        const min = String(hj.getMinutes()).padStart(2, '0');
        inputHorario.value = `${hh}:${min}`;
        
        // Sugestão automática de período baseado no horário
        if (selectPeriodo) {
            if (hj.getHours() < 13) {
                selectPeriodo.value = 'Manhã (Início do Dia)';
            } else {
                selectPeriodo.value = 'Tarde (Fechamento do Pátio)';
            }
        }
    }

    // Limpar itens temporários e renderizar
    itensPatioTemp = [];
    renderizarItensPatioTemp();
    
    // Carregar histórico do Firebase
    await carregarHistoricoPatio();
};

// Fechar Modal do Pátio
window.fecharModalPatio = function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (modalPatio) {
        modalPatio.style.display = 'none';
    }
};

// Adicionar Item Temporário à Tabela do Pátio
function adicionarItemAoPatio() {
    const tipo = document.getElementById('patioItemTipo').value;
    const classe = document.getElementById('patioItemClasse').value;
    const espRaw = document.getElementById('patioItemEsp').value;
    const largRaw = document.getElementById('patioItemLarg').value;
    const compRaw = document.getElementById('patioItemComp').value;
    const pacotes = parseInt(document.getElementById('patioItemPacotes').value) || 0;
    const pecas = parseInt(document.getElementById('patioItemPecas').value) || 0;

    const esp = parseDecimal(espRaw);
    const larg = parseDecimal(largRaw);
    const comp = parseDecimal(compRaw);

    if (esp <= 0 || larg <= 0 || comp <= 0 || pacotes <= 0 || pecas <= 0) {
        alert("⚠️ Por favor, insira valores válidos e maiores que zero.");
        return;
    }

    // Cálculo do volume de madeira serrada comercial:
    // Espessura (cm) / 100 * Largura (cm) / 100 * Comprimento (m) * QtdPacotes * QtdPecasPorPacote
    const volumeItem = (esp / 100) * (larg / 100) * comp * pacotes * pecas;

    itensPatioTemp.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        tipo: tipo.toUpperCase(),
        classe: classe,
        espessura: esp,
        largura: larg,
        comprimento: comp,
        pacotes: pacotes,
        pecas: pecas,
        totalPecas: pacotes * pecas,
        volume: volumeItem
    });

    // Limpar campos de entrada individuais de medidas, mantendo tipo e classe para agilizar lançamento
    document.getElementById('patioItemEsp').value = '';
    document.getElementById('patioItemLarg').value = '';
    document.getElementById('patioItemComp').value = '';
    document.getElementById('patioItemPacotes').value = '';
    document.getElementById('patioItemPecas').value = '';
    document.getElementById('patioItemEsp').focus();

    renderizarItensPatioTemp();
}

// Remover Item da Contagem Temporária
window.removerItemPatioTemp = function(id) {
    itensPatioTemp = itensPatioTemp.filter(item => item.id !== id);
    renderizarItensPatioTemp();
};

// Renderizar Tabela de Itens e Atualizar Totais
function renderizarItensPatioTemp() {
    const tbody = document.getElementById('listaItensPatioTemp');
    if (!tbody) return;

    if (itensPatioTemp.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; color:#aaa; padding: 20px;">Nenhum lote lançado no pátio. Insira os dados acima para iniciar a contagem!</td>
            </tr>
        `;
        atualizarConsolidadoPatio();
        return;
    }

    let html = '';
    itensPatioTemp.forEach(item => {
        let badgeStyle = '';
        if (item.classe === '1ª CLASSE') {
            badgeStyle = 'color: #2cc990; border: 1px solid rgba(44, 201, 144, 0.35); background: rgba(44, 201, 144, 0.1); padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.75rem;';
        } else if (item.classe === '2ª CLASSE') {
            badgeStyle = 'color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.35); background: rgba(241, 196, 15, 0.1); padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.75rem;';
        } else {
            badgeStyle = 'color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.35); background: rgba(231, 76, 60, 0.1); padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.75rem;';
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="font-weight: bold; color: #fff; padding: 12px 8px;">${item.tipo}</td>
                <td style="text-align:center; padding: 12px 8px;">
                    <span style="${badgeStyle}">${item.classe}</span>
                </td>
                <td style="padding: 12px 8px;">${formatDecimal(item.espessura, 1)} x ${formatDecimal(item.largura, 1)} x ${formatDecimal(item.comprimento, 2)}m</td>
                <td style="text-align:center; padding: 12px 8px; font-weight: bold;">${item.pacotes}</td>
                <td style="text-align:center; padding: 12px 8px; color: #ccc;">${item.pecas}</td>
                <td style="text-align:center; padding: 12px 8px; color: var(--accent-color); font-weight: bold;">${item.totalPecas}</td>
                <td style="text-align:right; padding: 12px 8px; font-weight: 900; color: #fff;">${formatDecimal(item.volume, 2)} m³</td>
                <td style="text-align:center; padding: 12px 8px;">
                    <button type="button" onclick="removerItemPatioTemp('${item.id}')" style="background:none; border:none; color: #e74c3c; cursor:pointer; font-size: 1.1rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1.0)'">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    atualizarConsolidatedStats();
}

// Calcular os totais por classe em tempo real
function atualizarConsolidatedStats() {
    let vol1 = 0, pac1 = 0, pec1 = 0;
    let vol2 = 0, pac2 = 0, pec2 = 0;
    let vol3 = 0, pac3 = 0, pec3 = 0;

    itensPatioTemp.forEach(item => {
        if (item.classe === '1ª CLASSE') {
            vol1 += item.volume;
            pac1 += item.pacotes;
            pec1 += item.totalPecas;
        } else if (item.classe === '2ª CLASSE') {
            vol2 += item.volume;
            pac2 += item.pacotes;
            pec2 += item.totalPecas;
        } else {
            vol3 += item.volume;
            pac3 += item.pacotes;
            pec3 += item.totalPecas;
        }
    });

    const totVol = vol1 + vol2 + vol3;
    const totPac = pac1 + pac2 + pac3;
    const totPec = pec1 + pec2 + pec3;

    // Atualizar UI
    document.getElementById('resPatioClasse1Vol').innerText = `${formatDecimal(vol1, 2)} m³`;
    document.getElementById('resPatioClasse1Detalhes').innerText = `${pac1} pacotes / ${pec1} peças`;

    document.getElementById('resPatioClasse2Vol').innerText = `${formatDecimal(vol2, 2)} m³`;
    document.getElementById('resPatioClasse2Detalhes').innerText = `${pac2} pacotes / ${pec2} peças`;

    document.getElementById('resPatioClasse3Vol').innerText = `${formatDecimal(vol3, 2)} m³`;
    document.getElementById('resPatioClasse3Detalhes').innerText = `${pac3} pacotes / ${pec3} peças`;

    document.getElementById('resPatioGeralVol').innerText = `${formatDecimal(totVol, 2)} m³`;
    document.getElementById('resPatioGeralDetalhes').innerText = `${totPac} pacotes / ${totPec} peças`;
}

// Salvar a Contagem Atual no Firebase Firestore
async function salvarRelatorioPatio() {
    if (itensPatioTemp.length === 0) {
        alert("⚠️ O pátio está vazio! Insira pelo menos um lote ou pacote para poder salvar.");
        return;
    }

    const dataVal = document.getElementById('patioData').value;
    const periodoVal = document.getElementById('patioPeriodo').value;
    const horarioVal = document.getElementById('patioHorario').value;
    const serrandoVal = document.getElementById('patioSerrando').value.toUpperCase().trim();

    if (!serrandoVal) {
        alert("⚠️ Por favor, digite qual madeira está sendo serrada no momento.");
        document.getElementById('patioSerrando').focus();
        return;
    }

    // Agrupar e somar totais
    let vol1 = 0, pac1 = 0, pec1 = 0;
    let vol2 = 0, pac2 = 0, pec2 = 0;
    let vol3 = 0, pac3 = 0, pec3 = 0;

    itensPatioTemp.forEach(item => {
        if (item.classe === '1ª CLASSE') {
            vol1 += item.volume;
            pac1 += item.pacotes;
            pec1 += item.totalPecas;
        } else if (item.classe === '2ª CLASSE') {
            vol2 += item.volume;
            pac2 += item.pacotes;
            pec2 += item.totalPecas;
        } else {
            vol3 += item.volume;
            pac3 += item.pacotes;
            pec3 += item.totalPecas;
        }
    });

    const totalVolume = vol1 + vol2 + vol3;
    const totalPacotes = pac1 + pac2 + pac3;
    const totalPecas = pec1 + pec2 + pec3;

    const relatorio = {
        data: dataVal,
        periodo: periodoVal,
        horario: horarioVal,
        serrando: serrandoVal,
        itens: itensPatioTemp,
        totais: {
            totalVolume: totalVolume,
            totalPacotes: totalPacotes,
            totalPecas: totalPecas,
            classe1: { volume: vol1, pacotes: pac1, pecas: pec1 },
            classe2: { volume: vol2, pacotes: pac2, pecas: pec2 },
            classe3: { volume: vol3, pacotes: pac3, pecas: pec3 }
        },
        criadoEm: new Date().toISOString()
    };

    const btnSalvar = document.getElementById('btnSalvarRelatorioPatio');
    const originalText = btnSalvar.innerHTML;
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    try {
        await addDoc(collection(db, 'patio_relatorios'), relatorio);
        alert(`✅ Contagem do Pátio do período (${periodoVal}) salva com sucesso!\nVolume Total: ${formatDecimal(totalVolume, 2)} m³.`);
        
        // Resetar campos e atualizar histórico
        document.getElementById('patioSerrando').value = '';
        itensPatioTemp = [];
        renderizarItensPatioTemp();
        await carregarHistoricoPatio();
    } catch (error) {
        console.error("Erro ao salvar contagem do pátio:", error);
        alert("❌ Ocorreu um erro ao salvar o relatório no Firebase.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = originalText;
    }
}

// Carregar o Histórico de Contagens do Firebase
async function carregarHistoricoPatio() {
    const tbody = document.getElementById('listaHistoricoPatio');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando contagens...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, 'patio_relatorios'));
        historicoPatioAtuais = [];
        querySnapshot.forEach((doc) => {
            historicoPatioAtuais.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar por data e horário decrescente
        historicoPatioAtuais.sort((a, b) => {
            const dateA = new Date(`${a.data}T${a.horario || '00:00'}`);
            const dateB = new Date(`${b.data}T${b.horario || '00:00'}`);
            return dateB - dateA;
        });

        if (historicoPatioAtuais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#aaa; padding: 15px;">Nenhuma contagem diária registrada ainda.</td></tr>';
            return;
        }

        let html = '';
        historicoPatioAtuais.forEach(rel => {
            const dtObj = new Date(rel.data + 'T12:00:00');
            const dtStr = dtObj.toLocaleDateString('pt-BR');
            const volStr = formatDecimal(rel.totais?.totalVolume || 0, 2);

            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                    <td style="padding: 10px 8px; font-weight: bold; color: #fff;">${dtStr} - ${rel.horario || 'N/A'}</td>
                    <td style="padding: 10px 8px; color: #ccc;">${rel.periodo}</td>
                    <td style="padding: 10px 8px; color: var(--accent-color); font-weight: 500;">${rel.serrando || 'N/A'}</td>
                    <td style="text-align:center; padding: 10px 8px;">${rel.totais?.totalPacotes || 0}</td>
                    <td style="text-align:center; padding: 10px 8px; color: #aaa;">${rel.totais?.totalPecas || 0}</td>
                    <td style="text-align:right; padding: 10px 8px; font-weight: 900; color: #fff;">${volStr} m³</td>
                    <td style="text-align:center; padding: 10px 8px; display: flex; gap: 8px; justify-content: center;">
                        <button type="button" onclick="imprimirHistoricoPatio('${rel.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 6px; background: var(--accent-color); color: #000; font-weight: bold;" title="Imprimir Relatório">
                            <i class="fa-solid fa-print"></i> Ver/Imprimir
                        </button>
                        <button type="button" onclick="deletarHistoricoPatio('${rel.id}')" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 1rem; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1.0)'" title="Apagar Registro">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar histórico do pátio:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#e74c3c;">Erro ao obter dados do pátio.</td></tr>';
    }
}

// Apagar registro do histórico
window.deletarHistoricoPatio = async function(id) {
    if (confirm("⚠️ Tem certeza absoluta que deseja excluir este relatório de contagem do pátio?")) {
        try {
            await deleteDoc(doc(db, 'patio_relatorios', id));
            alert("✅ Relatório de pátio excluído com sucesso!");
            await carregarHistoricoPatio();
        } catch (error) {
            console.error("Erro ao deletar contagem:", error);
            alert("Erro ao excluir o documento no Firestore.");
        }
    }
};

// Imprimir relatório selecionado do histórico
window.imprimirHistoricoPatio = function(id) {
    const rel = historicoPatioAtuais.find(r => r.id === id);
    if (!rel) return;
    gerarLayoutImpressaoPatio(rel);
};

// Imprimir contagem em tempo real (mesmo sem ter salvado ainda)
function imprimirRelatorioPatioCompleto() {
    if (itensPatioTemp.length === 0) {
        alert("⚠️ Não há itens no pátio para imprimir! Lance pelo menos um pacote.");
        return;
    }

    const dataVal = document.getElementById('patioData').value;
    const periodoVal = document.getElementById('patioPeriodo').value;
    const horarioVal = document.getElementById('patioHorario').value;
    const serrandoVal = document.getElementById('patioSerrando').value.toUpperCase().trim() || 'NÃO ESPECIFICADO';

    // Agrupar totais
    let vol1 = 0, pac1 = 0, pec1 = 0;
    let vol2 = 0, pac2 = 0, pec2 = 0;
    let vol3 = 0, pac3 = 0, pec3 = 0;

    itensPatioTemp.forEach(item => {
        if (item.classe === '1ª CLASSE') {
            vol1 += item.volume;
            pac1 += item.pacotes;
            pec1 += item.totalPecas;
        } else if (item.classe === '2ª CLASSE') {
            vol2 += item.volume;
            pac2 += item.pacotes;
            pec2 += item.totalPecas;
        } else {
            vol3 += item.volume;
            pac3 += item.pacotes;
            pec3 += item.totalPecas;
        }
    });

    const totalVolume = vol1 + vol2 + vol3;
    const totalPacotes = pac1 + pac2 + pac3;
    const totalPecas = pec1 + pec2 + pec3;

    const relatorioTemp = {
        data: dataVal,
        periodo: periodoVal,
        horario: horarioVal,
        serrando: serrandoVal,
        itens: itensPatioTemp,
        totais: {
            totalVolume: totalVolume,
            totalPacotes: totalPacotes,
            totalPecas: totalPecas,
            classe1: { volume: vol1, pacotes: pac1, pecas: pec1 },
            classe2: { volume: vol2, pacotes: pac2, pecas: pec2 },
            classe3: { volume: vol3, pacotes: pac3, pecas: pec3 }
        }
    };

    gerarLayoutImpressaoPatio(relatorioTemp);
}

// Gerar a janela de impressão profissional com as cores dos romaneios (Verde, Amarelo, Vermelho)
function gerarLayoutImpressaoPatio(rel) {
    const dtObj = new Date(rel.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');

    // Separar itens por qualidade/classe
    const itens1 = rel.itens.filter(i => i.classe === '1ª CLASSE');
    const itens2 = rel.itens.filter(i => i.classe === '2ª CLASSE');
    const itens3 = rel.itens.filter(i => i.classe === '3ª CLASSE');

    const win = window.open('', '_blank');
    
    // Início do documento de impressão
    win.document.write(`
<html>
<head>
    <title>Relação de Pátio - Madeira Serrada</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1a202c;
            padding: 30px;
            margin: 0;
            line-height: 1.4;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2d3748;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header-logo {
            font-family: sans-serif;
            letter-spacing: -0.5px;
        }
        .header-logo-main {
            color: #e67e22;
            font-weight: 900;
            font-size: 28px;
        }
        .header-logo-sub {
            color: #4a5568;
            font-weight: bold;
            font-size: 16px;
        }
        .meta-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 25px;
        }
        .meta-item {
            font-size: 14px;
        }
        .meta-item strong {
            color: #2d3748;
        }
        .class-section {
            margin-bottom: 25px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .class-header {
            padding: 10px 15px;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
        }
        .class-header-1 {
            background-color: #e6fffa;
            color: #234e52;
            border-bottom: 2px solid #319795;
        }
        .class-header-2 {
            background-color: #fefcbf;
            color: #744210;
            border-bottom: 2px solid #d69e2e;
        }
        .class-header-3 {
            background-color: #fff5f5;
            color: #742a2a;
            border-bottom: 2px solid #e53e3e;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
            border-bottom: 1px solid #edf2f7;
        }
        th {
            background: #edf2f7;
            color: #4a5568;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11px;
        }
        .num-col {
            text-align: center;
        }
        .vol-col {
            text-align: right;
            font-weight: bold;
        }
        .subtotal-row {
            background: #f7fafc;
            font-weight: bold;
        }
        .consolidated-card {
            background: #2d3748;
            color: #ffffff;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            text-align: center;
        }
        .consolidated-box {
            border-right: 1px solid #4a5568;
        }
        .consolidated-box:last-child {
            border-right: none;
        }
        .consolidated-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #a0aec0;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .consolidated-val {
            font-size: 20px;
            font-weight: 800;
        }
        .print-footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #a0aec0;
            border-top: 1px dashed #e2e8f0;
            padding-top: 15px;
        }
        @media print {
            body { padding: 10px; }
            .consolidated-card { background: #1a202c !important; color: white !important; -webkit-print-color-adjust: exact; }
            .class-header-1 { background-color: #e6fffa !important; color: #234e52 !important; -webkit-print-color-adjust: exact; }
            .class-header-2 { background-color: #fefcbf !important; color: #744210 !important; -webkit-print-color-adjust: exact; }
            .class-header-3 { background-color: #fff5f5 !important; color: #742a2a !important; -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-logo">
            <span class="header-logo-main">O</span><span class="header-logo-sub">rquestra.cs</span>
            <div style="font-size: 9px; color: #718096; font-weight: bold; letter-spacing: 0.5px; margin-top: -2px;">SISTEMAS PERSONALIZADOS</div>
        </div>
        <div style="text-align: right;">
            <h2 style="margin: 0; color: #2d3748; font-size: 20px;">Relação de Pátio Diário</h2>
            <small style="color: #718096;">Controle de Estoque de Madeira Serrada para Clientes</small>
        </div>
    </div>

    <div class="meta-container">
        <div class="meta-item"><strong>Data da Contagem:</strong> ${dtStr}</div>
        <div class="meta-item"><strong>Turno / Período:</strong> ${rel.periodo}</div>
        <div class="meta-item"><strong>Horário da Contagem:</strong> ${rel.horario || 'N/A'}</div>
        <div class="meta-item"><strong>Madeira Serrando no Momento:</strong> <span style="color: #e67e22; font-weight: bold;">${rel.serrando || 'N/A'}</span></div>
    </div>
    `);

    // Função interna para construir a tabela de uma classe
    function gerarTabelaClasse(itens, classeName, headerClass, totalClasse) {
        if (itens.length === 0) return '';
        
        let rowsHtml = '';
        itens.forEach(i => {
            rowsHtml += `
                <tr>
                    <td style="font-weight: bold;">${i.tipo}</td>
                    <td>${formatDecimal(i.espessura, 1)} x ${formatDecimal(i.largura, 1)} x ${formatDecimal(i.comprimento, 2)}m</td>
                    <td class="num-col">${i.pacotes}</td>
                    <td class="num-col">${i.pecas}</td>
                    <td class="num-col" style="font-weight: 500;">${i.totalPecas}</td>
                    <td class="vol-col">${formatDecimal(i.volume, 2)} m³</td>
                </tr>
            `;
        });

        return `
            <div class="class-section">
                <div class="class-header ${headerClass}">
                    <span><i class="fa-solid fa-layer-group"></i> ${classeName}</span>
                    <span>Subtotal: ${formatDecimal(totalClasse.volume, 2)} m³</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Medidas (Esp x Larg x Comp)</th>
                            <th class="num-col">Pacotes</th>
                            <th class="num-col">Peças/Pacote</th>
                            <th class="num-col">Total Peças</th>
                            <th class="vol-col">Volume (m³)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr class="subtotal-row">
                            <td colspan="2">TOTAL ${classeName}</td>
                            <td class="num-col">${totalClasse.pacotes}</td>
                            <td class="num-col">-</td>
                            <td class="num-col">${totalClasse.pecas}</td>
                            <td class="vol-col">${formatDecimal(totalClasse.volume, 2)} m³</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // Escrever tabelas das classes
    win.document.write(gerarTabelaClasse(itens1, '1ª CLASSE (VERDE)', 'class-header-1', rel.totais.classe1));
    win.document.write(gerarTabelaClasse(itens2, '2ª CLASSE (AMARELO)', 'class-header-2', rel.totais.classe2));
    win.document.write(gerarTabelaClasse(itens3, '3ª CLASSE (VERMELHO)', 'class-header-3', rel.totais.classe3));

    // Escrever bloco consolidado geral
    win.document.write(`
    <div class="consolidated-card">
        <div class="consolidated-box">
            <div class="consolidated-title">Total de Pacotes</div>
            <div class="consolidated-val">${rel.totais.totalPacotes}</div>
        </div>
        <div class="consolidated-box">
            <div class="consolidated-title">Total de Peças</div>
            <div class="consolidated-val">${rel.totais.totalPecas}</div>
        </div>
        <div class="consolidated-box" style="border-right: none;">
            <div class="consolidated-title">Volume Geral Pátio</div>
            <div class="consolidated-val" style="color: #2cc990;">${formatDecimal(rel.totais.totalVolume, 2)} m³</div>
        </div>
        <div class="consolidated-box" style="border-right: none; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 5px;">
            <div style="font-size: 9px; text-transform: uppercase; color: #a0aec0;">Status do Pátio</div>
            <div style="font-size: 14px; font-weight: bold; color: #e67e22; text-transform: uppercase;">Pronto p/ Venda</div>
        </div>
    </div>

    <div class="print-footer">
        <p>Relação emitida automaticamente pelo Sistema Orquestra.cs - Desenvolvimento personalizado de SaaS.</p>
        <p>Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
</body>
</html>
    `);

    win.document.close();
    win.print();
};
