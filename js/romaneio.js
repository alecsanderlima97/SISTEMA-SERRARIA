import { db, collection, addDoc, getDocs, query, where, orderBy, limit } from './firebase-init.js';

// --- Lógica Principal do Romaneio ---

let itensRomaneio = [];
let proximoItemId = 1;
let itemEditando = null;

// Elementos
const romSelectCliente = document.getElementById('romSelectCliente');
const romSelectTransporte = document.getElementById('romSelectTransporte');
const romSelectPagamento = document.getElementById('romSelectPagamento');
const descMadeira = document.getElementById('descMadeira'); 
const listaMadeirasSugestao = document.getElementById('listaMadeirasSugestao');
const precoCustomizado = document.getElementById('precoCustomizado'); 

let listaProdutosCache = [];const pacoteAltura = document.getElementById('pacoteAltura');
const pacoteLargura = document.getElementById('pacoteLargura');
const pacoteAmarras = document.getElementById('pacoteAmarras');
const quantidade = document.getElementById('quantidade'); 
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

// Carregar Combos do Firebase
async function carregarSelects() {
    console.log("Iniciando carregamento de dados do Firebase...");
    try {
        // Clientes
        const clientesSnapshot = await getDocs(collection(db, 'clientes'));
        if (romSelectCliente) {
            let selecaoAtualCliente = romSelectCliente.value;
            romSelectCliente.innerHTML = '<option value="">-- Escolha um Cliente --</option>';
            clientesSnapshot.forEach(doc => {
                const c = { id: doc.id, ...doc.data() };
                romSelectCliente.innerHTML += `<option value="${c.id}">${c.nome} - ${c.cidade || ''}</option>`;
            });
            if(selecaoAtualCliente) romSelectCliente.value = selecaoAtualCliente;
        }

        // Transportadoras
        const transportesSnapshot = await getDocs(collection(db, 'transportes'));
        if (romSelectTransporte) {
            let selecaoAtualTransp = romSelectTransporte.value;
            romSelectTransporte.innerHTML = '<option value="">-- Escolha um Transporte --</option>';
            transportesSnapshot.forEach(doc => {
                const t = { id: doc.id, ...doc.data() };
                romSelectTransporte.innerHTML += `<option value="${t.id}">${t.nome} (Placa: ${t.placa})</option>`;
            });
            if(selecaoAtualTransp) romSelectTransporte.value = selecaoAtualTransp;
        }

        // Produtos (Madeiras) para Sugestão
        const produtosSnapshot = await getDocs(collection(db, 'produtos'));
        if (listaMadeirasSugestao) {
            listaMadeirasSugestao.innerHTML = '';
            listaProdutosCache = [];
            produtosSnapshot.forEach(doc => {
                const p = { id: doc.id, ...doc.data() };
                listaProdutosCache.push(p);
                const label = `${p.tipo} (${p.natureza} ${p.qualidade})`;
                listaMadeirasSugestao.innerHTML += `<option value="${label}">`;
            });
        }
        console.log("Dados carregados com sucesso!");
    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
    }
}

// Ouvintes para atualizar combos
document.addEventListener('clientesUpdated', carregarSelects);
document.addEventListener('transportesUpdated', carregarSelects);
document.addEventListener('produtosUpdated', carregarSelects);
carregarSelects();

// Autopreenchimento de Preço ao selecionar Madeira
if (descMadeira) {
    descMadeira.addEventListener('input', function() {
        const valorDigitado = this.value;
        const produtoEncontrado = listaProdutosCache.find(p => {
            const label = `${p.tipo} (${p.natureza} ${p.qualidade})`;
            return label === valorDigitado;
        });

        if (produtoEncontrado) {
            precoCustomizado.value = produtoEncontrado.preco;
            console.log("Preço automático encontrado para:", valorDigitado, "R$", produtoEncontrado.preco);
        }
    });
}

// Lógica de Memória do Cliente e Info para PDF (Busca no Firestore)
romSelectCliente.addEventListener('change', async function() {
    const clienteId = this.value;
    console.log("Cliente selecionado ID:", clienteId);
    
    if(!clienteId) {
        printNomeCli.textContent = '';
        valorFrete.value = "0.00";
        return;
    }

    const selectedOption = this.options[this.selectedIndex];
    printNomeCli.textContent = selectedOption.text.split(' - ')[0];

    try {
        console.log("Buscando último frete no histórico para o cliente...");
        const historicoRef = collection(db, 'historico');
        const q = query(
            historicoRef, 
            where("clienteId", "==", clienteId), 
            orderBy("criadoEm", "desc"), 
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const ultimoRomaneio = querySnapshot.docs[0].data();
            console.log("Último romaneio encontrado:", ultimoRomaneio);
            if (ultimoRomaneio.freteAplicado !== undefined) {
                valorFrete.value = ultimoRomaneio.freteAplicado;
            }
        } else {
            console.log("Nenhum histórico encontrado para este cliente.");
            valorFrete.value = "0.00";
        }
    } catch (error) {
        console.error("Erro detalhado na busca de frete:", error);
    }
    
    recalcularTotais();
});

// Update Fretista Footer PDF
romSelectTransporte.addEventListener('change', async function() {
    if(!this.value) {
        printFretista.textContent = '---';
        printPlaca.textContent = '---';
        return;
    }
    
    const selectedOption = this.options[this.selectedIndex];
    printFretista.textContent = selectedOption.text.split(' (Placa:')[0];
    printPlaca.textContent = selectedOption.text.match(/\(Placa: (.*?)\)/)?.[1] || '';
});

// Update Pagamento Footer PDF
romSelectPagamento.addEventListener('change', function() {
    printPagam.textContent = this.value;
});


// Atualiza e Formata Totais
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function recalcularTotais() {
    // Totais Físicos
    const somaQtd = itensRomaneio.reduce((acc, curr) => acc + curr.quantidade, 0);
    const somaPacotes = itensRomaneio.reduce((acc, curr) => acc + (curr.pacotes || 0), 0);
    const somaVolume = itensRomaneio.reduce((acc, curr) => acc + curr.volumeTotal, 0);

    const totalQtdEl = document.getElementById('totalQtd');
    const totalPacotesEl = document.getElementById('totalPacotes');
    const totalVolumeEl = document.getElementById('totalVolume');

    if(totalQtdEl) totalQtdEl.innerHTML = `<strong>${somaQtd} pçs</strong>`;
    if(totalPacotesEl) totalPacotesEl.innerHTML = `<strong>${somaPacotes} pct(s)</strong>`;
    if(totalVolumeEl) totalVolumeEl.innerHTML = `<strong>${somaVolume.toFixed(4)} m³</strong>`;

    // VALOR SÓ DA MADEIRA (Sem somar frete no produto)
    let totalValorMadeira = itensRomaneio.reduce((acc, curr) => acc + (curr.volumeTotal * curr.precoUsado), 0);

    // VALOR SÓ DO FRETE (Cálculo à parte)
    let fretePorM3 = parseFloat(valorFrete.value) || 0;
    let custoFrete = somaVolume * fretePorM3;

    // ACRÉSCIMOS
    let imposto = parseFloat(valorJurosNf.value) || 0;

    // TOTAL FINAL DO ROMANEIO (Soma tudo mas exibe separado)
    let valorTotalGeral = totalValorMadeira + custoFrete + imposto;

    const resValorMadeiraEl = document.getElementById('resValorMadeira');
    const resValorFreteEl = document.getElementById('resValorFrete');
    const resValorImpostoEl = document.getElementById('resValorImposto');
    const resValorTotalEl = document.getElementById('resValorTotal');

    if(resValorMadeiraEl) resValorMadeiraEl.textContent = formatarMoeda(totalValorMadeira);
    if(resValorFreteEl) resValorFreteEl.textContent = formatarMoeda(custoFrete);
    if(resValorImpostoEl) resValorImpostoEl.textContent = formatarMoeda(imposto);
    if(resValorTotalEl) resValorTotalEl.textContent = formatarMoeda(valorTotalGeral);
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

    const nomeExibicao = descMadeira.value;
    const espessura = parseFloat(document.getElementById('espessura').value);
    const largMadeira = parseFloat(document.getElementById('largura').value);
    const comprimento = parseFloat(document.getElementById('comprimento').value);
    const pecasPckg = parseInt(document.getElementById('quantidade').value, 10);
    const pCustom = parseFloat(precoCustomizado.value);
    const pacotes = parseInt(document.getElementById('qtPacotes').value, 10) || 0;

    // Lógica multiplicadora (Se tiver pacote, multiplica, senão a quantidade total é igual às peças digitadas)
    const quantidadeAbsoluta = pacotes > 0 ? (pecasPckg * pacotes) : pecasPckg;

    const volumeUnidade = (espessura / 100) * (largMadeira / 100) * comprimento;
    const volumeTotal = volumeUnidade * quantidadeAbsoluta;

    if(itemEditando) {
        // Modo Edição
        let index = itensRomaneio.findIndex(x => x.id === itemEditando);
        if(index > -1) {
            itensRomaneio[index] = {
                id: itemEditando,
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
        
        let nomeAtual = descMadeira.value;
        let precoAtual = precoCustomizado.value;
        
        formItem.reset();
        
        // Mantém as escolhas por praticidade, zera apenas espessura/larg/etc
        descMadeira.value = nomeAtual;
        precoCustomizado.value = precoAtual;
        document.getElementById('espessura').focus();
    }

    renderizarTabelaRomaneio();
});

function exporParaEdicao(id) {
    let item = itensRomaneio.find(x => x.id === id);
    if(!item) return;

    descMadeira.value = item.nomeProduto;
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
document.getElementById('btnFinalizar').addEventListener('click', async () => {
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

    const btnFinalizar = document.getElementById('btnFinalizar');
    const textoOriginal = btnFinalizar.innerHTML;
    btnFinalizar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btnFinalizar.disabled = true;

    try {
        // Obter contagem do Firebase para gerar o próximo número de carga
        const historicoCol = collection(db, 'historico');
        const querySnapshot = await getDocs(historicoCol);
        let numCarga = (querySnapshot.size + 1).toString().padStart(4, '0');

        let novaHistoria = {
            numeroCarga: `Carga Nº ${numCarga}`,
            clienteId: cId,
            cliente: nomeClienteFinal,
            data: document.getElementById('dataCarga').value || new Date().toISOString().split('T')[0],
            freteAplicado: fretePorM3,
            itens: itensRomaneio,
            volumeTotalItem: somaVolume,
            valorFinal: valorTotalGeral,
            criadoEm: new Date().toISOString()
        };

        console.log("Tentando salvar no Firebase...", novaHistoria);

        // Salvar no Firebase
        await addDoc(historicoCol, novaHistoria);
        
        // Dispara Evento pro historico.js atualizar a tela de histórico
        document.dispatchEvent(new Event('historicoUpdated'));

        alert(`Sucesso! ${novaHistoria.numeroCarga} foi salva no Firebase.`);

        // Limpar Romaneio
        itensRomaneio = [];
        romSelectCliente.value = '';
        romSelectTransporte.value = '';
        descMadeira.value = '';
        precoCustomizado.value = '';
        valorFrete.value = '0.00';
        valorJurosNf.value = '0.00';
        document.getElementById('qtPacotes').value = '';
        document.getElementById('quantidade').value = '';
        document.getElementById('dataCarga').valueAsDate = new Date();
        
        // Atualiza info de tela impressa
        printNomeCli.textContent = '';
        printFretista.textContent = '';
        printPlaca.textContent = '';
        
        renderizarTabelaRomaneio();
    } catch (error) {
        console.error("ERRO CRÍTICO AO SALVAR NO FIREBASE: ", error);
        alert("Erro ao salvar histórico no Firebase. Verifique se você está logado ou se as regras do banco permitem escrita.");
    } finally {

        btnFinalizar.innerHTML = textoOriginal;
        btnFinalizar.disabled = false;
    }
});

// Força data do dia ao abrir
document.getElementById('dataCarga').valueAsDate = new Date();

// Init
renderizarTabelaRomaneio();
