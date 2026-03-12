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
const tabelaBodySimples = document.getElementById('tabelaBodySimples');
const toggleFardo = document.getElementById('toggleFardo');
const camposFardo = document.getElementById('camposFardo');

// --- Lógica de Passos (Stepper) ---
window.goToStep = function(step) {
    // Validação básica para avançar
    if (step === 2 && !romSelectCliente.value) {
        alert("Por favor, selecione um cliente antes de prosseguir.");
        return;
    }
    if (step === 3 && itensRomaneio.length === 0) {
        alert("Adicione pelo menos um item à carga antes de revisar.");
        return;
    }

    // Gerenciar visibilidade dos conteúdos
    document.querySelectorAll('.romaneio-step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`romaneio-step${step}`).classList.add('active');

    // Gerenciar indicadores do stepper
    document.querySelectorAll('.step-item').forEach((el, index) => {
        el.classList.remove('active', 'completed');
        if (index + 1 < step) el.classList.add('completed');
        if (index + 1 === step) el.classList.add('active');
    });

    // Rolar para o topo da seção
    document.getElementById('view-romaneio').scrollIntoView({ behavior: 'smooth' });
};

// Toggle Calculadora de Fardo
if (toggleFardo) {
    toggleFardo.addEventListener('change', function() {
        camposFardo.style.display = this.checked ? 'grid' : 'none';
        if (!this.checked) {
            pacoteAltura.value = '';
            pacoteLargura.value = '';
            pacoteAmarras.value = '';
        }
    });
}

// Info Impressão
const printNomeCli = document.getElementById('printNomeCli');
const printFretista = document.getElementById('printFretista');
const printPlaca = document.getElementById('printPlaca');
const printPagam = document.getElementById('printPagam');

// Carregar Combos (Assíncrono)
async function carregarSelects() {
    let clientes = await DB.list('clientes');
    romSelectCliente.innerHTML = '<option value="">-- Escolha um Cliente --</option>';
    clientes.forEach(c => {
        romSelectCliente.innerHTML += `<option value="${c.id}">${c.nome} - ${c.cidade}</option>`;
    });

    let transportes = await DB.list('transportes');
    romSelectTransporte.innerHTML = '<option value="">-- Escolha um Transporte --</option>';
    transportes.forEach(t => {
        romSelectTransporte.innerHTML += `<option value="${t.id}">${t.nome} (Placa: ${t.placa})</option>`;
    });

    let produtos = await DB.list('produtos');
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
romSelectCliente.addEventListener('change', async function() {
    // 1. Preenche Header PDF
    let c = await DB.getById('clientes', this.value);
    if(c) {
        printNomeCli.textContent = c.nome;
        // Adicionando mais infos para o cabeçalho NF
        if(document.getElementById('printDocCli')) document.getElementById('printDocCli').textContent = c.cnpj || c.cpf || '---';
        if(document.getElementById('printEndCli')) document.getElementById('printEndCli').textContent = `${c.rua || ''}, ${c.numero || ''} - ${c.bairro || ''}`;
        if(document.getElementById('printCidCli')) document.getElementById('printCidCli').textContent = `${c.cidade || ''}`;
        if(document.getElementById('printFoneCli')) document.getElementById('printFoneCli').textContent = c.contato || '---';
    } else {
        printNomeCli.textContent = '';
        if(document.getElementById('printDocCli')) document.getElementById('printDocCli').textContent = '';
        if(document.getElementById('printEndCli')) document.getElementById('printEndCli').textContent = '';
        if(document.getElementById('printCidCli')) document.getElementById('printCidCli').textContent = '';
        if(document.getElementById('printFoneCli')) document.getElementById('printFoneCli').textContent = '';
    }

    // 2. Busca último frete deste cliente no Histórico
    let historico = await DB.list('historico');
    let encontrou = false;
    
    // Filtro e Ordenação já vem do Supabase (list ordena por created_at desc)
    for(let h of historico) {
        if(h.cliente_id == this.value && h.frete_aplicado !== undefined) {
            valorFrete.value = h.frete_aplicado;
            encontrou = true;
            break;
        }
    }
    
    if(!encontrou) valorFrete.value = "0.00";
    recalcularTotais();
});

// Update Fretista Footer PDF
romSelectTransporte.addEventListener('change', async function() {
    let t = await DB.getById('transportes', this.value);
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
romSelectMadeira.addEventListener('change', async function() {
    let pId = this.value;
    if(!pId) {
        precoCustomizado.value = ''; return;
    }

    // Primeiro busco se o cliente já comprou issso (Lembrança)
    let cId = romSelectCliente.value;
    let historico = await DB.list('historico');
    let precoHistEncontrado = null;

    if(cId) {
        for(let h of historico) {
            if(h.cliente_id == cId && h.itens) {
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
        let pInfo = await DB.getById('produtos', pId);
        if(pInfo) {
            precoCustomizado.value = pInfo.preco.toFixed(2);
        }
    }
});

// Atualiza e Formata Totais
function recalcularTotais() {
    // Totais Quantidade e Metro Cúbico Físico (CARGA / MOTORISTA)
    const somaQtd = itensRomaneio.reduce((acc, curr) => acc + curr.quantidade, 0);
    const somaPacotes = itensRomaneio.reduce((acc, curr) => acc + (curr.pacotes || 0), 0);
    const somaVolume = itensRomaneio.reduce((acc, curr) => acc + curr.volumeTotal, 0); // Real

    // Totais de VENDA (FATURAMENTO CLIENTE)
    const somaVolumeVenda = itensRomaneio.reduce((acc, curr) => acc + (curr.volumeTotalVenda || curr.volumeTotal), 0);

    document.getElementById('totalQtd').innerHTML = `<strong>${somaQtd} pçs</strong>`;
    document.getElementById('totalPacotes').innerHTML = `<strong>${somaPacotes} pct(s)</strong>`;
    document.getElementById('totalVolume').innerHTML = `<strong>${somaVolume.toFixed(4)} m³</strong>`;
    
    // Novo: Total Volume Venda
    if (document.getElementById('totalVolumeVenda')) {
        document.getElementById('totalVolumeVenda').innerHTML = `<strong>${somaVolumeVenda.toFixed(4)} m³</strong>`;
    }

    // Matemática Financeira Associada ao Produto (Venda)
    // Usamos somaVolumeVenda para o faturamento da madeira
    let totalValorMadeira = itensRomaneio.reduce((acc, curr) => acc + ((curr.volumeTotalVenda || curr.volumeTotal) * curr.precoUsado), 0);

    // Custo do Frete exibido separadamente
    let fretePorM3 = parseFloat(valorFrete.value) || 0;
    let custoFrete = somaVolume * fretePorM3;

    // Imposto NF
    let imposto = parseFloat(valorJurosNf.value) || 0;

    let valorTotalGeral = totalValorMadeira + imposto;

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
formItem.addEventListener('submit', async function(e) {
    e.preventDefault();

    const produtoId = romSelectMadeira.value;
    const espessura = parseLocalFloat(document.getElementById('espessura').value);
    const largMadeira = parseLocalFloat(document.getElementById('largura').value);
    const comprimento = parseLocalFloat(document.getElementById('comprimento').value);
    const comprimentoVenda = parseLocalFloat(document.getElementById('comprimentoVenda').value);
    const pecasPckg = parseInt(document.getElementById('quantidade').value, 10);
    const pCustom = parseFloat(precoCustomizado.value);
    const pacotes = parseInt(document.getElementById('qtPacotes').value, 10) || 0;

    // Lógica multiplicadora (Se tiver pacote, multiplica, senão a quantidade total é igual às peças digitadas)
    const quantidadeAbsoluta = pacotes > 0 ? (pecasPckg * pacotes) : pecasPckg;

    // Volume Real (Motorista)
    const volumeUnidade = (espessura / 100) * (largMadeira / 100) * comprimento;
    const volumeTotal = volumeUnidade * quantidadeAbsoluta;

    let compUsoVenda = comprimentoVenda > 0 ? comprimentoVenda : comprimento;
    const volumeUnidadeVenda = (espessura / 100) * (largMadeira / 100) * compUsoVenda;
    const volumeTotalVenda = volumeUnidadeVenda * quantidadeAbsoluta;

    const pInfo = await DB.getById('produtos', produtoId);
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
                volumeUnidadeVenda: volumeUnidadeVenda,
                volumeTotalVenda: volumeTotalVenda,
                comprimentoVenda: comprimentoVenda,
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
            volumeUnidadeVenda: volumeUnidadeVenda,
            volumeTotalVenda: volumeTotalVenda,
            comprimentoVenda: comprimentoVenda,
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
    document.getElementById('comprimento').value = item.espessura; // Bug check? Wait, it should be item.comprimento
    document.getElementById('comprimento').value = item.comprimento;
    if (document.getElementById('comprimentoVenda')) {
        document.getElementById('comprimentoVenda').value = item.comprimentoVenda || '';
    }
    
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
    if (tabelaBodySimples) tabelaBodySimples.innerHTML = '';

    if (itensRomaneio.length === 0) {
        const emptyState = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fa-solid fa-list-check"></i><br>
                    Nenhum item adicionado no momento.
                </td>
            </tr>
        `;
        tabelaBody.innerHTML = emptyState;
        if (tabelaBodySimples) tabelaBodySimples.innerHTML = emptyState.replace('colspan="8"', 'colspan="5"');
        recalcularTotais();
        return;
    }

    itensRomaneio.forEach((item, index) => {
        const tr = document.createElement('tr');
        const medidasTexto = `${item.espessura} cm x ${item.largura} cm x ${item.comprimento.toFixed(1)} m`;

        // Nota de Venda Customizada
        const temMedidaVenda = item.comprimentoVenda > 0 && item.comprimentoVenda !== item.comprimento;
        const notaVenda = temMedidaVenda ? 
            `<span class="nota-venda">Venda: ${item.volumeTotalVenda.toFixed(3)} m³ c/ ${item.comprimentoVenda.toFixed(2)}m</span>` : '';

        tr.innerHTML = `
            <td><strong>#${index + 1}</strong> - ${item.nomeProduto}</td>
            <td>${medidasTexto}${notaVenda}</td>
            <td>${item.pacotes || 0}</td>
            <td>${item.quantidade}</td>
            <td>${item.volumeUnidade.toFixed(4)}</td>
            <td style="color:var(--accent-color); font-weight:bold;">${formatarMoeda(item.precoUsado)}</td>
            <td><strong>${item.volumeTotal.toFixed(4)}</strong></td>
            <td class="hide-on-print">
                <button type="button" class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="editarItemRomaneio(${item.id})" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button type="button" class="btn-danger" style="padding: 5px;" onclick="removerItemRomaneio(${item.id})" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabelaBody.appendChild(tr);

        // Tabela Simples (Passo 2)
        if (tabelaBodySimples) {
            const trSimples = document.createElement('tr');
            trSimples.innerHTML = `
                <td>${item.nomeProduto}</td>
                <td>${medidasTexto}</td>
                <td>${item.quantidade}</td>
                <td>${item.volumeTotal.toFixed(3)} m³</td>
                <td>
                    <button type="button" class="btn-danger" style="padding: 4px 8px;" onclick="removerItemRomaneio(${item.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tabelaBodySimples.appendChild(trSimples);
        }
    });

    recalcularTotais();
}

// Botões Especiais Romaneio
document.getElementById('btnPrint').addEventListener('click', async () => {
    if(itensRomaneio.length === 0) {
        alert("Atenção: Você não tem itens no romaneio.");
        return;
    }
    if(!romSelectCliente.value) {
        alert("Atenção: Recomenda-se selecionar um Cliente antes da impressão.");
    }

    // Preencher data e número no cabeçalho NF antes de imprimir
    const dataCargaInput = document.getElementById('dataCarga').value;
    if (dataCargaInput) {
        const [ano, mes, dia] = dataCargaInput.split('-');
        document.getElementById('printDataCarga').textContent = `${dia}/${mes}/${ano}`;
    } else {
        document.getElementById('printDataCarga').textContent = new Date().toLocaleDateString('pt-BR');
    }

    // Tentar pegar o número da próxima carga (ou 'PREVIEW')
    const historias = await DB.list('historico');
    let numCorrente = (historias.length + 1).toString().padStart(4, '0');
    document.getElementById('printNumeroCarga').textContent = `Nº ${numCorrente}`;

    document.querySelector('.sidebar').classList.add('hide-on-print'); 
    window.print();
});

// Finalizar Carga e Salvar no Histórico
document.getElementById('btnFinalizar').addEventListener('click', async () => {
    if(itensRomaneio.length === 0) {
        alert("Nenhum item na carga para finalizar.");
        return;
    }

    if(!confirm("Tem certeza que deseja SALVAR esta carga no histórico e emitir um novo romaneio?")) {
        return;
    }

    // Coletando Totais para o Histórico
    const somaVolumeCarga = itensRomaneio.reduce((acc, curr) => acc + curr.volumeTotal, 0);
    const somaVolumeVenda = itensRomaneio.reduce((acc, curr) => acc + (curr.volumeTotalVenda || curr.volumeTotal), 0);
    let totalValorMadeira = itensRomaneio.reduce((acc, curr) => acc + ((curr.volumeTotalVenda || curr.volumeTotal) * curr.precoUsado), 0);

    let fretePorM3 = parseFloat(valorFrete.value) || 0;
    let imposto = parseFloat(valorJurosNf.value) || 0;
    
    // O valor faturado da madeira NÃO inclui o frete (conforme solicitado pelo usuário)
    let valorTotalGeral = totalValorMadeira + imposto;

    // Pegar nome do Cliente
    let cId = romSelectCliente.value;
    let cliObj = await DB.getById('clientes', cId);
    let nomeClienteFinal = cliObj ? cliObj.nome : "Avulso (Sem cadastro)";

    // Objeto História
    const historias = await DB.list('historico');
    let numCarga = (historias.length + 1).toString().padStart(4, '0');

    let novaHistoria = {
        numero_carga: `Carga Nº ${numCarga}`,
        cliente_id: cId || null,
        cliente_nome: nomeClienteFinal,
        data_carga: document.getElementById('dataCarga').value || new Date().toISOString().split('T')[0],
        frete_aplicado: fretePorM3,
        itens: itensRomaneio,
        volume_total_item: somaVolumeCarga, // Real (Motorista)
        volume_venda_total: somaVolumeVenda, // Faturamento
        valor_final: valorTotalGeral // Apenas Madeira + Imposto
    };

    try {
        await DB.insert('historico', novaHistoria);
        // Dispara Evento pro historico.js atualizar
        document.dispatchEvent(new Event('historicoUpdated'));

        alert(`Sucesso! ${novaHistoria.numero_carga} foi salva no Histórico.`);

        // Limpar Romaneio
        itensRomaneio = [];
        romSelectCliente.value = '';
        romSelectTransporte.value = '';
        romSelectMadeira.value = '';
        precoCustomizado.value = '';
        valorFrete.value = '0.00';
        valorJurosNf.value = '0.00';
        if (document.getElementById('qtPacotes')) document.getElementById('qtPacotes').value = '0';
        document.getElementById('dataCarga').valueAsDate = new Date();
        if (toggleFardo) {
            toggleFardo.checked = false;
            camposFardo.style.display = 'none';
        }
        
        // Voltar para o Passo 1
        goToStep(1);
        
        // Atualiza info de tela impressa
        printNomeCli.textContent = '';
        printFretista.textContent = '';
        printPlaca.textContent = '';
        
        renderizarTabelaRomaneio();
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar carga no Supabase.');
    }
});

// Força data do dia ao abrir
document.getElementById('dataCarga').valueAsDate = new Date();

// Init
renderizarTabelaRomaneio();
