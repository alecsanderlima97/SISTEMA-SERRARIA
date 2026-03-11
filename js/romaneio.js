// --- Lógica Principal do Romaneio ---

// Inicializar Máscaras
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('espessura')) applyMask(document.getElementById('espessura'), 1);
    if (document.getElementById('largura')) applyMask(document.getElementById('largura'), 1);
    if (document.getElementById('comprimento')) applyMask(document.getElementById('comprimento'), 2);
});

let itensRomaneio = [];
let proximoItemId = 1;
let itemEditando = null;

// Elementos
const romSelectCliente = document.getElementById('romSelectCliente');
const romSelectTransporte = document.getElementById('romSelectTransporte');
const romSelectPagamento = document.getElementById('romSelectPagamento');
const romSelectMadeira = document.getElementById('romSelectMadeira');
const precoCustomizado = document.getElementById('precoCustomizado');
const pacoteAltura = document.getElementById('pacoteAltura');
const pacoteLargura = document.getElementById('pacoteLargura');
const pacoteAmarras = document.getElementById('pacoteAmarras');
const quantidade = document.getElementById('quantidade'); // Total Peças Final (O antigo "quantidade")
const qtPacotes = document.getElementById('qtPacotes');
const valorFrete = document.getElementById('valorFrete');
const valorJurosNf = document.getElementById('valorJurosNf');

const btnSalvarItem = document.getElementById('btnSalvarItem');
const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
const formItem = document.getElementById('itemForm');
const tabelaBody = document.getElementById('tabelaBody');

// Info Impressão
const printNomeCli = document.getElementById('printNomeCli');
const printFretista = document.getElementById('printFretista');
const printPlaca = document.getElementById('printPlaca');
const printPagam = document.getElementById('printPagam');

// Carregar Combos
function carregarSelects() {
    let clientes = DB.get('clientes') || [];
    romSelectCliente.innerHTML = '<option value="">-- Escolha um Cliente --</option>';
    clientes.forEach(c => {
        romSelectCliente.innerHTML += `<option value="${c.id}">${c.nome} - ${c.cidade}</option>`;
    });

    let transportes = DB.get('transportes') || [];
    romSelectTransporte.innerHTML = '<option value="">-- Escolha um Transporte --</option>';
    transportes.forEach(t => {
        romSelectTransporte.innerHTML += `<option value="${t.id}">${t.nome} (Placa: ${t.placa})</option>`;
    });

    let produtos = DB.get('produtos') || [];
    romSelectMadeira.innerHTML = '<option value="">-- Escolha a Madeira --</option>';
    produtos.forEach(p => {
        romSelectMadeira.innerHTML += `<option value="${p.id}">${p.tipo} (${p.natureza} - ${p.qualidade})</option>`;
    });
}

// Ouvintes para atualizar combos
document.addEventListener('clientesUpdated', carregarSelects);
document.addEventListener('transportesUpdated', carregarSelects);
document.addEventListener('produtosUpdated', carregarSelects);
carregarSelects();

// Lógica de Memória do Cliente e Info para PDF
romSelectCliente.addEventListener('change', function() {
    // 1. Preenche Header PDF
    let clientes = DB.get('clientes') || [];
    let c = clientes.find(x => x.id == this.value);
    if(c) {
        printNomeCli.textContent = c.nome;
    } else {
        printNomeCli.textContent = '';
    }

    // 2. Busca último frete deste cliente no Histórico
    let historico = DB.get('historico') || [];
    let encontrou = false;
    
    // Inverte para pegar do mais novo para o mais velho
    let histInvertido = [...historico].reverse();
    
    for(let h of histInvertido) {
        if(h.clienteId == this.value && h.freteAplicado !== undefined) {
            valorFrete.value = h.freteAplicado;
            encontrou = true;
            break;
        }
    }
    
    if(!encontrou) valorFrete.value = "0.00";
    recalcularTotais();
});

// Update Fretista Footer PDF
romSelectTransporte.addEventListener('change', function() {
    let transportes = DB.get('transportes') || [];
    let t = transportes.find(x => x.id == this.value);
    if(t) {
        printFretista.textContent = t.nome;
        printPlaca.textContent = `${t.placa} / ${t.motorista || ''}`;
    } else {
        printFretista.textContent = '---';
        printPlaca.textContent = '---';
    }
});

// Update Pagamento Footer PDF
romSelectPagamento.addEventListener('change', function() {
    printPagam.textContent = this.value;
});

// Quando selecionar uma Madeira, Auto-preencher o "Edit. Preço"
romSelectMadeira.addEventListener('change', function() {
    let pId = this.value;
    if(!pId) {
        precoCustomizado.value = ''; return;
    }

    // Primeiro busco se o cliente já comprou issso (Lembrança)
    let cId = romSelectCliente.value;
    let historico = DB.get('historico') || [];
    let precoHistEncontrado = null;

    if(cId) {
        let histInvertido = [...historico].reverse();
        for(let h of histInvertido) {
            if(h.clienteId == cId && h.itens) {
                // Procurar essa madeira nos itens desta carga velha
                let itemAntigo = h.itens.find(x => x.produtoId == pId);
                if(itemAntigo) {
                    precoHistEncontrado = itemAntigo.precoUsado;
                    break;
                }
            }
        }
    }

    if(precoHistEncontrado) {
        precoCustomizado.value = precoHistEncontrado.toFixed(2);
    } else {
        // Se nunca comprou, puxa o da tabela geral
        let pInfo = DB.get('produtos').find(prod => prod.id == pId);
        if(pInfo) {
            precoCustomizado.value = pInfo.preco.toFixed(2);
        }
    }
});

// Atualiza e Formata Totais
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function recalcularTotais() {
    // Totais Quantidade e Metro Cúbico Físico
    const somaQtd = itensRomaneio.reduce((acc, curr) => acc + curr.quantidade, 0);
    const somaPacotes = itensRomaneio.reduce((acc, curr) => acc + (curr.pacotes || 0), 0);
    const somaVolume = itensRomaneio.reduce((acc, curr) => acc + curr.volumeTotal, 0);

    document.getElementById('totalQtd').innerHTML = `<strong>${somaQtd} pçs</strong>`;
    document.getElementById('totalPacotes').innerHTML = `<strong>${somaPacotes} pct(s)</strong>`;
    document.getElementById('totalVolume').innerHTML = `<strong>${somaVolume.toFixed(4)} m³</strong>`;

    // Matemática Financeira Associada ao Produto
    let totalValorMadeira = itensRomaneio.reduce((acc, curr) => acc + (curr.volumeTotal * curr.precoUsado), 0);

    // Lógica do Frete: m³ total * Preço do Frete por m³ digitado
    let fretePorM3 = parseFloat(valorFrete.value) || 0;
    let custoFrete = somaVolume * fretePorM3;

    // Imposto NF
    let imposto = parseFloat(valorJurosNf.value) || 0;

    let valorTotalGeral = totalValorMadeira + custoFrete + imposto;

    document.getElementById('resValorMadeira').textContent = formatarMoeda(totalValorMadeira);
    document.getElementById('resValorFrete').textContent = formatarMoeda(custoFrete);
    document.getElementById('resValorImposto').textContent = formatarMoeda(imposto);
    document.getElementById('resValorTotal').textContent = formatarMoeda(valorTotalGeral);
}

// Disparar o cálculo quando frete ou imposto mudarem
valorFrete.addEventListener('input', recalcularTotais);
valorJurosNf.addEventListener('input', recalcularTotais);

// Função Cancelar Edição
function resetarFormItem() {
    formItem.reset();
    itemEditando = null;
    btnSalvarItem.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar';
    btnSalvarItem.classList.replace('btn-secondary', 'btn-primary');
    btnCancelarEdicao.style.display = 'none';
}

btnCancelarEdicao.addEventListener('click', resetarFormItem);

// ==========================================
// CALCULADORA DE FARDO / PACOTES (Live)
// ==========================================
const calcularFardo = () => {
    let alt = parseInt(pacoteAltura.value, 10) || 0;
    let larg = parseInt(pacoteLargura.value, 10) || 0;
    let amar = parseInt(pacoteAmarras.value, 10) || 0;

    if(alt > 0 && larg > 0) {
        let totalPecasPct = (alt * larg) + amar;
        quantidade.value = totalPecasPct;
    }
};

pacoteAltura.addEventListener('input', calcularFardo);
pacoteLargura.addEventListener('input', calcularFardo);
pacoteAmarras.addEventListener('input', calcularFardo);


// Adicionar / Editar Linha
formItem.addEventListener('submit', function(e) {
    e.preventDefault();

    const produtoId = romSelectMadeira.value;
    const espessura = parseLocalFloat(document.getElementById('espessura').value);
    const largMadeira = parseLocalFloat(document.getElementById('largura').value);
    const comprimento = parseLocalFloat(document.getElementById('comprimento').value);
    const pecasPckg = parseInt(document.getElementById('quantidade').value, 10);
    const pCustom = parseFloat(precoCustomizado.value);
    const pacotes = parseInt(document.getElementById('qtPacotes').value, 10) || 0;

    // Lógica multiplicadora (Se tiver pacote, multiplica, senão a quantidade total é igual às peças digitadas)
    const quantidadeAbsoluta = pacotes > 0 ? (pecasPckg * pacotes) : pecasPckg;

    const volumeUnidade = (espessura / 100) * (largMadeira / 100) * comprimento;
    const volumeTotal = volumeUnidade * quantidadeAbsoluta;

    let pInfo = (DB.get('produtos') || []).find(x => x.id == produtoId);
    let nomeExibicao = pInfo ? `${pInfo.tipo} ${pInfo.classe} (${pInfo.natureza})` : 'Madeira Padrão';

    if(itemEditando) {
        // Modo Edição
        let index = itensRomaneio.findIndex(x => x.id === itemEditando);
        if(index > -1) {
            itensRomaneio[index] = {
                id: itemEditando,
                produtoId: produtoId,
                nomeProduto: nomeExibicao,
                espessura: espessura,
                largura: largMadeira,
                comprimento: comprimento,
                pecasPckg: pecasPckg, // Peças por pacote salvas
                quantidade: quantidadeAbsoluta, // Quantidade final faturada
                pacotes: pacotes,
                alturaFardo: pacoteAltura.value,
                larguraFardo: pacoteLargura.value,
                amarras: pacoteAmarras.value,
                volumeUnidade: volumeUnidade,
                volumeTotal: volumeTotal,
                precoUsado: pCustom // Salva o preco unitário na hora!
            };
        }
        resetarFormItem();
    } else {
        // Modo Inserção Novo
        itensRomaneio.push({
            id: proximoItemId++,
            produtoId: produtoId,
            nomeProduto: nomeExibicao,
            espessura: espessura,
            largura: largMadeira,
            comprimento: comprimento,
            pecasPckg: pecasPckg,
            quantidade: quantidadeAbsoluta,
            pacotes: pacotes,
            alturaFardo: pacoteAltura.value,
            larguraFardo: pacoteLargura.value,
            amarras: pacoteAmarras.value,
            volumeUnidade: volumeUnidade,
            volumeTotal: volumeTotal,
            precoUsado: pCustom
        });
        
        let idMadeiraAtual = romSelectMadeira.value;
        let precoAtual = precoCustomizado.value;
        
        formItem.reset();
        
        // Mantém as escolhas por praticidade, zera apenas espessura/larg/etc
        romSelectMadeira.value = idMadeiraAtual;
        precoCustomizado.value = precoAtual;
        document.getElementById('espessura').focus();
    }

    renderizarTabelaRomaneio();
});

function exporParaEdicao(id) {
    let item = itensRomaneio.find(x => x.id === id);
    if(!item) return;

    romSelectMadeira.value = item.produtoId;
    precoCustomizado.value = item.precoUsado;
    
    document.getElementById('espessura').value = item.espessura;
    document.getElementById('largura').value = item.largura;
    document.getElementById('comprimento').value = item.comprimento;
    
    // Restaurar a Calculadora do Fardo se existir
    pacoteAltura.value = item.alturaFardo || '';
    pacoteLargura.value = item.larguraFardo || '';
    pacoteAmarras.value = item.amarras || '';

    // Recompila os outros
    quantidade.value = item.pecasPckg || item.quantidade;
    document.getElementById('qtPacotes').value = item.pacotes || 0;

    itemEditando = item.id;
    btnSalvarItem.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar';
    btnSalvarItem.classList.replace('btn-primary', 'btn-secondary');
    btnCancelarEdicao.style.display = 'inline-block';
}

// Remover Exposta na global para funcionar com String literals
window.removerItemRomaneio = function(id) {
    if(itemEditando === id) resetarFormItem();
    itensRomaneio = itensRomaneio.filter(item => item.id !== id);
    renderizarTabelaRomaneio();
}
window.editarItemRomaneio = exporParaEdicao;

function renderizarTabelaRomaneio() {
    tabelaBody.innerHTML = '';

    if (itensRomaneio.length === 0) {
        tabelaBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-list-check"></i><br>
                    Nenhum item adicionado no momento.
                </td>
            </tr>
        `;
        recalcularTotais();
        return;
    }

    itensRomaneio.forEach((item, index) => {
        const tr = document.createElement('tr');
        const medidasTexto = `${item.espessura} cm x ${item.largura} cm x ${item.comprimento.toFixed(1)} m`;

        // Calculo Valor Unidade Customizado
        let valorUnitarioPeca = item.volumeUnidade * item.precoUsado;

        tr.innerHTML = `
            <td><strong>#${index + 1}</strong> - ${item.nomeProduto}</td>
            <td>${medidasTexto}</td>
            <td>${item.pacotes || 0}</td>
            <td>${item.quantidade}</td>
            <td>${item.volumeUnidade.toFixed(4)}</td>
            <td style="color:var(--accent-color); font-weight:bold;">${formatarMoeda(valorUnitarioPeca)}</td>
            <td><strong>${item.volumeTotal.toFixed(4)}</strong></td>
            <td class="hide-on-print">
                <button type="button" class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="editarItemRomaneio(${item.id})" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button type="button" class="btn-danger" style="padding: 5px;" onclick="removerItemRomaneio(${item.id})" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        
        tabelaBody.appendChild(tr);
    });

    recalcularTotais();
}

// Botões Especiais Romaneio
document.getElementById('btnPrint').addEventListener('click', () => {
    if(itensRomaneio.length === 0) {
        alert("Atenção: Você não tem itens no romaneio.");
        return;
    }
    if(!romSelectCliente.value) {
        alert("Atenção: Recomenda-se selecionar um Cliente antes da impressão.");
    }
    
    document.querySelector('.sidebar').classList.add('hide-on-print'); 
    window.print();
});

// Finalizar Carga e Salvar no Histórico
document.getElementById('btnFinalizar').addEventListener('click', () => {
    if(itensRomaneio.length === 0) {
        alert("Nenhum item na carga para finalizar.");
        return;
    }

    if(!confirm("Tem certeza que deseja SALVAR esta carga no histórico e emitir um novo romaneio?")) {
        return;
    }

    // Coletando Totais da UI
    const somaVolume = itensRomaneio.reduce((acc, curr) => acc + curr.volumeTotal, 0);
    let totalValorMadeira = itensRomaneio.reduce((acc, curr) => acc + (curr.volumeTotal * curr.precoUsado), 0);

    let fretePorM3 = parseFloat(valorFrete.value) || 0;
    let imposto = parseFloat(valorJurosNf.value) || 0;
    let valorTotalGeral = totalValorMadeira + (somaVolume * fretePorM3) + imposto;

    // Pegar nome do Cliente
    let cId = romSelectCliente.value;
    let nomeCliObj = (DB.get('clientes') || []).find(x => x.id == cId);
    let nomeClienteFinal = nomeCliObj ? nomeCliObj.nome : "Avulso (Sem cadastro)";

    // Objeto História
    let historias = DB.get('historico') || [];
    let numCarga = (historias.length + 1).toString().padStart(4, '0');

    let novaHistoria = {
        id: Date.now(),
        numeroCarga: `Carga Nº ${numCarga}`,
        clienteId: cId,
        cliente: nomeClienteFinal,
        data: document.getElementById('dataCarga').value || new Date().toISOString().split('T')[0],
        freteAplicado: fretePorM3,
        itens: itensRomaneio,
        volumeTotalItem: somaVolume,
        valorFinal: valorTotalGeral
    };

    historias.push(novaHistoria);
    DB.set('historico', historias);
    
    // Dispara Evento pro historico.js atualizar
    document.dispatchEvent(new Event('historicoUpdated'));

    alert(`Sucesso! ${novaHistoria.numeroCarga} foi salva no Histórico.`);

    // Limpar Romaneio
    itensRomaneio = [];
    romSelectCliente.value = '';
    romSelectTransporte.value = '';
    romSelectMadeira.value = '';
    precoCustomizado.value = '';
    valorFrete.value = '0.00';
    valorJurosNf.value = '0.00';
    document.getElementById('qtPacotes').value = '0';
    document.getElementById('dataCarga').valueAsDate = new Date();
    
    // Atualiza info de tela impressa
    printNomeCli.textContent = '';
    printFretista.textContent = '';
    printPlaca.textContent = '';
    
    renderizarTabelaRomaneio();
});

// Força data do dia ao abrir
document.getElementById('dataCarga').valueAsDate = new Date();

// Init
renderizarTabelaRomaneio();
