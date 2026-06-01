import { db, auth, onAuthStateChanged, collection, addDoc, getDocs, query, where, orderBy, limit, doc, getDoc, updateDoc } from './firebase-init.js';

console.log("Romaneio V2: Script carregado");

// Estado global do romaneio atual
let romaneioAtual = {
    numero: 0,
    cliente: '',
    formaPagamento: '',
    prazoPagamento: '',
    observacaoCliente: '',
    logistica: {
        dataCarregamento: '',
        dataDescarregamento: '',
        motorista: '',
        caminhao: '',
        placa: '',
        responsavelFrete: '',
        valorFrete: 0,
        adicionalFrete: 0,
        obsFrete: ''
    },
    pacotes: [], 
    financeiro: {
        taxaNF: 0,
        totalGeral: 0,
        adicionalMadeira: 0,
        obsMadeira: ''
    }
};

let produtosDisponiveis = [];
let clientesDisponiveis = [];
let transportadorasDisponiveis = [];
let pacoteEditandoId = null;

// 1. INICIALIZAÇÃO IMEDIATA (Para data e eventos)
function prepararInterface() {
    console.log("Romaneio V2: Preparando interface...");
    
    // Data de hoje (Imediato)
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    const hj = hoje.toISOString().split('T')[0];
    const proxDia = amanha.toISOString().split('T')[0];
    const inputData = document.getElementById('v2-data-carreg');
    if (inputData) {
        inputData.value = hj;
        console.log("Romaneio V2: Data automática definida para " + hj);
    }
    const inputDataDescarreg = document.getElementById('v2-data-descarreg');
    if (inputDataDescarreg && !inputDataDescarreg.value) {
        inputDataDescarreg.value = proxDia;
    }

    romaneioAtual.numero = `ROM-${Date.now().toString().slice(-6)}`;
    const elNum = document.getElementById('v2-numero-ordem');
    if (elNum) elNum.value = romaneioAtual.numero;

    configurarEventos();
    
    // Tentar carregar dados uma primeira vez
    carregarClientesParaRomaneio();
    carregarProdutosParaRomaneio();
    carregarTransportadorasParaRomaneio();
}

// 2. RE-TENTATIVA APÓS LOGIN (Para garantir acesso ao Firebase)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Romaneio V2: Usuário autenticado, atualizando listas...");
        carregarClientesParaRomaneio();
        carregarProdutosParaRomaneio();
        carregarTransportadorasParaRomaneio();
    }
});

async function carregarClientesParaRomaneio() {
    const select = document.getElementById('v2-select-cliente');
    if (!select) return;

    try {
        console.log("Romaneio V2: Buscando clientes...");
        const snap = await getDocs(collection(db, "clientes"));
        clientesDisponiveis = [];
        
        select.innerHTML = '<option value="">Selecione um cliente...</option>';
        
        if (snap.empty) {
            console.warn("Romaneio V2: Coleção de clientes está vazia.");
            return;
        }

        snap.forEach(doc => {
            const c = { id: doc.id, ...doc.data() };
            clientesDisponiveis.push(c);
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome || 'Sem Nome';
            select.appendChild(opt);
        });
        console.log(`Romaneio V2: ${clientesDisponiveis.length} clientes carregados.`);
    } catch (e) { 
        console.error("Erro ao carregar clientes:", e);
    }
}

async function carregarProdutosParaRomaneio() {
    const select = document.getElementById('v2-select-produto');
    if (!select) return;
    try {
        const snap = await getDocs(collection(db, "produtos"));
        produtosDisponiveis = [];
        select.innerHTML = '<option value="">Selecione uma madeira...</option>';
        snap.forEach(doc => {
            const p = { id: doc.id, ...doc.data() };
            produtosDisponiveis.push(p);
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.tipo || 'Sem Tipo'} (${p.espessura}x${p.largura}x${p.comprimentoVenda}m)`;
            select.appendChild(opt);
        });
    } catch (e) { console.error("Erro produtos:", e); }
}

async function carregarTransportadorasParaRomaneio() {
    const select = document.getElementById('v2-select-transporte');
    if (!select) return;
    try {
        const snap = await getDocs(collection(db, "transportes"));
        transportadorasDisponiveis = [];
        select.innerHTML = '<option value="">Selecione...</option>';
        snap.forEach(doc => {
            const t = { id: doc.id, ...doc.data() };
            transportadorasDisponiveis.push(t);
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.nome || 'Sem Nome';
            select.appendChild(opt);
        });
    } catch (e) { console.error("Erro transportes:", e); }
}

function configurarEventos() {
    const btnAdd = document.getElementById('btn-add-pacote-v2');
    if (btnAdd) btnAdd.onclick = adicionarPacote;

    const btnUpdate = document.getElementById('btn-update-pacote-v2');
    if (btnUpdate) btnUpdate.onclick = salvarEdicaoPacote;

    const inputsAuto = ['v2-altura', 'v2-camada', 'v2-amarras'];
    inputsAuto.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = calcularPecasAutomatico;
    });

    // Inputs que afetam o volume exibido em tempo real
    const inputsVolume = ['v2-espessura', 'v2-largura', 'v2-comprimento', 'v2-quantidade', 'v2-qtd-pacotes'];
    inputsVolume.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', atualizarVolumePreview);
    });

    const selectProd = document.getElementById('v2-select-produto');
    if (selectProd) selectProd.onchange = selecionarMadeiraCadastrada;

    const selectCli = document.getElementById('v2-select-cliente');
    if (selectCli) selectCli.onchange = selecionarClienteCadastrado;

    // Ao mudar a qualidade, preencher preco automaticamente
    const inputQualidade = document.getElementById('v2-qualidade');
    if (inputQualidade) inputQualidade.addEventListener('blur', preencherPrecoPorQualidade);
    if (inputQualidade) inputQualidade.addEventListener('input', preencherPrecoPorQualidade);

    const selectTransp = document.getElementById('v2-select-transporte');
    if (selectTransp) selectTransp.onchange = selecionarTransportadoraCadastrada;

    ['v2-taxa-nf', 'v2-valor-frete', 'v2-adicional-madeira', 'v2-adicional-frete', 'v2-obs-madeira', 'v2-obs-frete', 'v2-obs-carga'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = atualizarTotalGeral;
    });

    ['v2-preco-m3-item', 'v2-valor-frete', 'v2-adicional-madeira', 'v2-adicional-frete'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', window.formatCurrencyInput);
        }
    });

    // Forçar letras maiúsculas em tempo real nos campos de romaneio e observações
    ['v2-motorista', 'v2-caminhao', 'v2-placa', 'v2-obs-madeira', 'v2-obs-frete'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', window.forceUppercaseInput);
        }
    });

    const btnLimpar = document.getElementById('btn-limpar-romaneio-v2');
    if (btnLimpar) {
        btnLimpar.onclick = () => {
            if (confirm("Deseja realmente limpar toda a carga atual? Isso não afetará os dados salvos.")) {
                romaneioAtual.pacotes = [];
                atualizarTotalGeral();
                renderizarTabelaPacotes();
                limparCamposPacote();
            }
        };
    }
}

async function selecionarClienteCadastrado(e) {
    const cli = clientesDisponiveis.find(x => x.id === e.target.value);
    const infoBox = document.getElementById('v2-info-cliente-box');
    const infoTexto = document.getElementById('v2-info-cliente-texto');

    if (!cli) {
        if(infoBox) infoBox.style.display = 'none';
        return;
    }

    document.getElementById('v2-cliente').value = cli.nome;
    
    // Salvar dados do cliente no romaneio atual para o preview
    romaneioAtual.formaPagamento = cli.formaPagamento || '';
    romaneioAtual.prazoPagamento = cli.prazoPagamento || '';
    romaneioAtual.observacaoCliente = cli.observacao || '';
    
    // Atualizar box de informações comerciais
    if (infoBox && infoTexto) {
        let infoHtml = '';
        if(cli.formaPagamento) infoHtml += `<strong>Pagamento:</strong> ${cli.formaPagamento} ${cli.prazoPagamento ? `(${cli.prazoPagamento})` : ''}<br>`;
        
        let precos = [];
        if(cli.madeira1) precos.push(`1ª: R$ ${cli.madeira1}`);
        if(cli.madeira2) precos.push(`2ª: R$ ${cli.madeira2}`);
        if(cli.madeira3) precos.push(`3ª: R$ ${cli.madeira3}`);
        if(cli.madeiraPinus) precos.push(`Pinus: R$ ${cli.madeiraPinus}`);
        if(cli.nomeMadeiraExtra && cli.valorMadeiraExtra) precos.push(`${cli.nomeMadeiraExtra}: R$ ${cli.valorMadeiraExtra}`);
        
        if(precos.length > 0) infoHtml += `<strong>Preços Acordados:</strong> ${precos.join(' | ')}<br>`;
        if(cli.observacao) infoHtml += `<strong>Obs do Cliente:</strong> <span style="color:var(--warning);">${cli.observacao}</span><br>`;
        
        if(infoHtml !== '') {
            infoTexto.innerHTML = infoHtml;
            infoBox.style.display = 'block';
        } else {
            infoBox.style.display = 'none';
        }
    }

    // Preencher campos automáticos (taxa e frete) a partir do cadastro do cliente
    if (cli.porcentagemNF) {
        document.getElementById('v2-taxa-nf').value = cli.porcentagemNF;
    }
    if (cli.valorFrete) {
        document.getElementById('v2-valor-frete').value = window.formatCurrencyValue(cli.valorFrete);
    }

    try {
        const qCount = query(collection(db, "romaneios"), where("cliente", "==", cli.nome));
        const snapCount = await getDocs(qCount);
        document.getElementById('v2-numero-ordem').value = snapCount.size + 1;

        const q = query(
            collection(db, "romaneios"), 
            where("cliente", "==", cli.nome),
            orderBy("dataCriacao", "desc"),
            limit(1)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            const ultimo = snap.docs[0].data();
            // Se não tiver no cadastro do cliente, puxa do último romaneio dele
            if (!cli.porcentagemNF && ultimo.financeiro && ultimo.financeiro.taxaNF) {
                document.getElementById('v2-taxa-nf').value = ultimo.financeiro.taxaNF;
            }
            if (!cli.valorFrete && ultimo.logistica && ultimo.logistica.valorFrete) {
                document.getElementById('v2-valor-frete').value = window.formatCurrencyValue(ultimo.logistica.valorFrete);
            }
        }
    } catch (e) { console.error("Erro histórico cliente:", e); }
    atualizarTotalGeral();
}

function selecionarTransportadoraCadastrada(e) {
    const t = transportadorasDisponiveis.find(x => x.id === e.target.value);
    if (!t) return;

    document.getElementById('v2-motorista').value = t.motorista || '';
    document.getElementById('v2-caminhao').value = t.caminhao || '';
    document.getElementById('v2-placa').value = t.placa || '';
}

function selecionarMadeiraCadastrada(e) {
    const p = produtosDisponiveis.find(x => x.id === e.target.value);
    if (!p) return;

    document.getElementById('v2-espessura').value = p.espessura;
    document.getElementById('v2-largura').value = p.largura;
    document.getElementById('v2-comprimento').value = p.comprimentoVenda;
    document.getElementById('v2-comprimento-real').value = p.comprimentoReal || p.comprimentoVenda;
    document.getElementById('v2-preco-m3-item').value = window.formatCurrencyValue(p.preco);
    
    // Ao selecionar produto, verificar se já tem qualidade preenchida e tentar preencher preço
    preencherPrecoPorQualidade();
    atualizarVolumePreview();
}

// Preenche o Preço m³ automaticamente com base na qualidade selecionada e cliente
function preencherPrecoPorQualidade() {
    const qualStr = (document.getElementById('v2-qualidade')?.value || '').toUpperCase().trim();
    if (!qualStr) return;

    const clienteId = document.getElementById('v2-select-cliente')?.value;
    if (!clienteId) return;

    const cli = clientesDisponiveis.find(x => x.id === clienteId);
    if (!cli) return;

    let precoAcordado = null;

    if (qualStr.includes('1') || qualStr.includes('1ª') || qualStr.includes('MAD 1') || qualStr === '1A') {
        precoAcordado = cli.madeira1;
    } else if (qualStr.includes('2') || qualStr.includes('2ª') || qualStr.includes('MAD 2') || qualStr === '2A') {
        precoAcordado = cli.madeira2;
    } else if (qualStr.includes('3') || qualStr.includes('3ª') || qualStr.includes('MAD 3') || qualStr === '3A') {
        precoAcordado = cli.madeira3;
    } else if (qualStr.includes('PINUS')) {
        precoAcordado = cli.madeiraPinus;
    } else if (cli.nomeMadeiraExtra && qualStr.includes(cli.nomeMadeiraExtra.toUpperCase())) {
        precoAcordado = cli.valorMadeiraExtra;
    }

    if (precoAcordado && precoAcordado > 0) {
        const inputPreco = document.getElementById('v2-preco-m3-item');
        if (inputPreco) {
            inputPreco.value = window.formatCurrencyValue(precoAcordado);
            // Destaque visual para indicar preenchimento automático
            inputPreco.style.borderColor = 'var(--accent)';
            inputPreco.style.boxShadow = '0 0 8px rgba(0,255,136,0.3)';
            setTimeout(() => {
                inputPreco.style.borderColor = '';
                inputPreco.style.boxShadow = '';
            }, 2000);
        }
    }
}

// Atualiza o preview de volume em tempo real no card de adicionar pacotes
function atualizarVolumePreview() {
    const esp = parseFloat(document.getElementById('v2-espessura')?.value) || 0;
    const larg = parseFloat(document.getElementById('v2-largura')?.value) || 0;
    const comp = parseFloat(document.getElementById('v2-comprimento')?.value) || 0;
    const pecas = parseInt(document.getElementById('v2-quantidade')?.value) || 0;
    const qtdPacotes = parseInt(document.getElementById('v2-qtd-pacotes')?.value) || 1;

    const m3Unit = (esp / 100) * (larg / 100) * comp * pecas;
    const m3Total = m3Unit * qtdPacotes;

    const elUnit = document.getElementById('v2-volume-unit');
    const elTotal = document.getElementById('v2-volume-total');

    if (elUnit) elUnit.textContent = m3Unit.toFixed(3) + ' m³';
    if (elTotal) elTotal.textContent = m3Total.toFixed(3) + ' m³';
}

function calcularPecasAutomatico() {
    const alt = parseInt(document.getElementById('v2-altura').value) || 0;
    const cam = parseInt(document.getElementById('v2-camada').value) || 0;
    const amarras = parseInt(document.getElementById('v2-amarras').value) || 0;
    document.getElementById('v2-quantidade').value = (alt * cam) + amarras;
    atualizarVolumePreview();
}

function adicionarPacote() {
    const prodId = document.getElementById('v2-select-produto').value;
    const qualidade = document.getElementById('v2-qualidade').value || 'Padrão';
    const precoM3 = window.parseCurrencyValue(document.getElementById('v2-preco-m3-item').value) || 0;
    const qtdPacotes = parseInt(document.getElementById('v2-qtd-pacotes').value) || 1;
    
    const esp = parseFloat(document.getElementById('v2-espessura').value) || 0;
    const larg = parseFloat(document.getElementById('v2-largura').value) || 0;
    const compV = parseFloat(document.getElementById('v2-comprimento').value) || 0;
    const compR = parseFloat(document.getElementById('v2-comprimento-real').value) || compV;
    const pecasPorPacote = parseInt(document.getElementById('v2-quantidade').value) || 0;

    if (!prodId || pecasPorPacote <= 0) {
        alert("Selecione a madeira e informe a quantidade de peças.");
        return;
    }

    const prod = produtosDisponiveis.find(x => x.id === prodId);
    
    const alt = parseInt(document.getElementById('v2-altura').value) || 0;
    const cam = parseInt(document.getElementById('v2-camada').value) || 0;
    const amarras = parseInt(document.getElementById('v2-amarras').value) || 0;
    const configPct = (alt > 0 || cam > 0) ? `${alt}x${cam}${amarras > 0 ? '+'+amarras : ''}` : '-';

    const m3VendaUnit = ( (esp/100) * (larg/100) * compV ) * pecasPorPacote;
    const m3FreteUnit = ( (esp/100) * (larg/100) * compR ) * pecasPorPacote;

    const novoPacote = {
        id: Date.now(),
        produtoId: prodId,
        produtoNome: prod.tipo,
        qualidade: qualidade.toUpperCase(),
        medidas: `${esp.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} x ${larg.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} x ${compV.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}m`,
        esp, larg, compV, compR,
        pecasPorPacote,
        alt, cam, amarras, configPct,
        qtdPacotes,
        precoM3,
        m3VendaTotal: parseFloat((m3VendaUnit * qtdPacotes).toFixed(3)),
        m3FreteTotal: parseFloat((m3FreteUnit * qtdPacotes).toFixed(3)),
        valorTotalWood: parseFloat((m3VendaUnit * qtdPacotes * precoM3).toFixed(2))
    };

    romaneioAtual.pacotes.push(novoPacote);
    atualizarTotalGeral();
    renderizarTabelaPacotes();
    
    if (confirm("Deseja adicionar outro pacote com a mesma cubagem (espessura, largura, comprimento), preço e qualidade?\n\n[OK] = Mantém os dados para informar nova quantidade\n[Cancelar] = Limpa todos os campos")) {
        ['v2-altura', 'v2-camada', 'v2-amarras', 'v2-quantidade'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('v2-qtd-pacotes').value = 1;
        document.getElementById('v2-altura').focus();
    } else {
        limparCamposPacote();
    }
}

function editarPacoteV2(id) {
    const p = romaneioAtual.pacotes.find(x => x.id === id);
    if (!p) return;

    pacoteEditandoId = id;
    
    document.getElementById('v2-select-produto').value = p.produtoId || '';
    document.getElementById('v2-qualidade').value = p.qualidade || '';
    document.getElementById('v2-preco-m3-item').value = window.formatCurrencyValue(p.precoM3);
    document.getElementById('v2-qtd-pacotes').value = p.qtdPacotes;
    document.getElementById('v2-espessura').value = p.esp;
    document.getElementById('v2-largura').value = p.larg;
    document.getElementById('v2-comprimento').value = p.compV;
    document.getElementById('v2-comprimento-real').value = p.compR;
    document.getElementById('v2-quantidade').value = p.pecasPorPacote;
    
    document.getElementById('v2-altura').value = p.alt || '';
    document.getElementById('v2-camada').value = p.cam || '';
    document.getElementById('v2-amarras').value = p.amarras || '';
    
    // UI
    document.getElementById('btn-add-pacote-v2').style.display = 'none';
    document.getElementById('btn-update-pacote-v2').style.display = 'block';
    
    window.scrollTo({ top: document.getElementById('secao-romaneio-v2').offsetTop, behavior: 'smooth' });
}

function salvarEdicaoPacote() {
    if (!pacoteEditandoId) return;
    const prodId = document.getElementById('v2-select-produto').value;
    const qualidade = (document.getElementById('v2-qualidade').value || 'Padrão').toUpperCase();
    const precoM3 = window.parseCurrencyValue(document.getElementById('v2-preco-m3-item').value) || 0;
    const qtdPacotes = parseInt(document.getElementById('v2-qtd-pacotes').value) || 1;
    const pecasPorPacote = parseInt(document.getElementById('v2-quantidade').value) || 0;
    const esp = parseFloat(document.getElementById('v2-espessura').value) || 0;
    const larg = parseFloat(document.getElementById('v2-largura').value) || 0;
    const compV = parseFloat(document.getElementById('v2-comprimento').value) || 0;
    const compR = parseFloat(document.getElementById('v2-comprimento-real').value) || compV;

    const prod = produtosDisponiveis.find(x => x.id === prodId);

    const alt = parseInt(document.getElementById('v2-altura').value) || 0;
    const cam = parseInt(document.getElementById('v2-camada').value) || 0;
    const amarras = parseInt(document.getElementById('v2-amarras').value) || 0;
    const configPct = (alt > 0 || cam > 0) ? `${alt}x${cam}${amarras > 0 ? '+'+amarras : ''}` : '-';

    const m3VendaUnit = ( (esp/100) * (larg/100) * compV ) * pecasPorPacote;
    const m3FreteUnit = ( (esp/100) * (larg/100) * compR ) * pecasPorPacote;

    const index = romaneioAtual.pacotes.findIndex(x => x.id === pacoteEditandoId);
    if (index !== -1) {
        romaneioAtual.pacotes[index] = {
            ...romaneioAtual.pacotes[index],
            produtoId: prodId,
            produtoNome: prod ? prod.tipo : 'Madeira',
            qualidade,
            medidas: `${esp.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} x ${larg.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} x ${compV.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}m`,
            esp, larg, compV, compR,
            pecasPorPacote,
            alt, cam, amarras, configPct,
            qtdPacotes,
            precoM3,
            m3VendaTotal: parseFloat((m3VendaUnit * qtdPacotes).toFixed(3)),
            m3FreteTotal: parseFloat((m3FreteUnit * qtdPacotes).toFixed(3)),
            valorTotalWood: parseFloat((m3VendaUnit * qtdPacotes * precoM3).toFixed(2))
        };
    }
    pacoteEditandoId = null;
    document.getElementById('btn-add-pacote-v2').style.display = 'block';
    document.getElementById('btn-update-pacote-v2').style.display = 'none';
    atualizarTotalGeral();
    renderizarTabelaPacotes();
    limparCamposPacote();
}

function atualizarTotalGeral() {
    let totalMadeira = 0;
    let totalM3Frete = 0;
    let totalPacotes = 0;
    let totalPecasGeral = 0;

    romaneioAtual.pacotes.forEach(p => {
        totalMadeira += p.valorTotalWood;
        totalM3Frete += p.m3FreteTotal;
        totalPacotes += (p.qtdPacotes || 0);
        totalPecasGeral += (p.pecasPorPacote * p.qtdPacotes) || 0;
    });

    const valorFreteUnit = window.parseCurrencyValue(document.getElementById('v2-valor-frete').value) || 0;
    let totalFrete = totalM3Frete * valorFreteUnit;
    
    const addMadeira = window.parseCurrencyValue(document.getElementById('v2-adicional-madeira')?.value) || 0;
    const addFrete = window.parseCurrencyValue(document.getElementById('v2-adicional-frete')?.value) || 0;
    
    romaneioAtual.financeiro.adicionalMadeira = addMadeira;
    romaneioAtual.financeiro.obsMadeira = document.getElementById('v2-obs-madeira')?.value || '';
    
    romaneioAtual.logistica.adicionalFrete = addFrete;
    romaneioAtual.logistica.obsFrete = document.getElementById('v2-obs-frete')?.value || '';

    romaneioAtual.observacaoCarga = document.getElementById('v2-obs-carga')?.value || '';

    totalFrete += addFrete;
    const totalMadeiraComAjuste = totalMadeira + addMadeira;

    const taxaStr = (document.getElementById('v2-taxa-nf')?.value || "0").toString().replace(',', '.');
    const taxa = parseFloat(taxaStr) || 0;
    const imposto = totalMadeiraComAjuste * (taxa / 100);
    
    romaneioAtual.financeiro.totalGeral = totalMadeiraComAjuste + imposto;
    romaneioAtual.financeiro.taxaNF = taxa;
    romaneioAtual.logistica.valorFrete = valorFreteUnit;
    romaneioAtual.numero = parseInt(document.getElementById('v2-numero-ordem').value) || 0;
    
    renderizarResumoFinanceiro(totalFrete, totalM3Frete, totalPacotes, totalPecasGeral, totalMadeira, addMadeira, imposto, totalMadeiraComAjuste);
}

function getCorPorQualidade(qual) {
    const q = qual.toUpperCase();
    if (q.includes('MAD 1') || q.includes('1ª') || q.includes('1A')) return '#00ff88'; // Verde
    if (q.includes('MAD 2') || q.includes('2ª') || q.includes('2A')) return '#f59e0b'; // Amarelo/Laranja
    if (q.includes('MAD 3') || q.includes('3ª') || q.includes('3A')) return '#ef4444'; // Vermelho
    if (q.includes('PINUS')) return '#8b4513'; // Marrom
    if (q.includes('BCA') || q.includes('OUTRO')) return '#94a3b8'; // Cinza
    return '#10b981'; // Padrão Verde Água
}

window.romaneioDocumentoAtual = null;

function normalizarRomaneioDocumento(r = {}, clienteObj = {}) {
    const emitente = window.dadosSerrariaEmitente || {};
    const pacotes = Array.isArray(r.pacotes) ? r.pacotes : [];
    let totalPcts = 0;
    let totalPcs = 0;
    let totalM3Madeira = 0;
    let totalMadeira = 0;
    let totalM3Frete = 0;

    pacotes.forEach(p => {
        totalPcts += Number(p.qtdPacotes || 0);
        totalPcs += Number((p.pecasPorPacote || 0) * (p.qtdPacotes || 0));
        totalM3Madeira += Number(p.m3VendaTotal || 0);
        totalMadeira += Number(p.valorTotalWood || 0);
        totalM3Frete += Number(p.m3FreteTotal || p.m3VendaTotal || 0);
    });

    const taxa = Number(r.financeiro?.taxaNF || 0);
    const adicionalMadeira = Number(r.financeiro?.adicionalMadeira || 0);
    const imposto = (totalMadeira + adicionalMadeira) * (taxa / 100);
    const subtotalLiquido = totalMadeira + adicionalMadeira + imposto;
    const valorFrete = Number(r.logistica?.valorFrete || 0);
    const freteBruto = totalM3Frete * valorFrete;
    const freteFinal = freteBruto + Number(r.logistica?.adicionalFrete || 0);
    const totalCarga = Number(r.financeiro?.totalGeral || subtotalLiquido);
    return { emitente, clienteObj, romaneio: r, pacotes, totalPcts, totalPcs, totalM3Madeira, totalMadeira, totalM3Frete, taxa, imposto, subtotalLiquido, valorFrete, freteBruto, freteFinal, totalCarga };
}

function gerarHtmlDocumentoRomaneio(payload) {
    const { emitente, clienteObj, romaneio: r, pacotes, totalPcts, totalPcs, totalM3Madeira, totalMadeira, totalM3Frete, taxa, imposto, subtotalLiquido, valorFrete, freteBruto, freteFinal, totalCarga } = payload;
    const pacotesHtml = `
        <table class="doc-table">
            <thead><tr><th>Classificacao</th><th>Madeira</th><th>Pcts</th><th>Config</th><th>Pcs/Pct</th><th>Total Pecas</th><th>m3 Venda</th><th>V. Unit.</th><th>Total</th></tr></thead>
            <tbody>
                ${pacotes.map(p => {
                    const cor = getCorPorQualidade(p.qualidade || 'PADRAO');
                    const totalPecas = Number((p.pecasPorPacote || 0) * (p.qtdPacotes || 0));
                    const valorUnit = totalPecas ? (Number(p.valorTotalWood || 0) / totalPecas) : 0;
                    return `<tr><td><span style="display:inline-block; padding:5px 10px; border-radius:999px; background:${cor}22; color:${cor}; font-weight:800; border:1px solid ${cor}66;">${p.qualidade || 'PADRAO'}</span></td><td><strong>${p.produtoNome || '-'}</strong><br><span class="doc-muted">${p.medidas || '-'}</span></td><td>${p.qtdPacotes || 0}</td><td>${p.configPct || '-'}</td><td>${p.pecasPorPacote || 0}</td><td><strong>${totalPecas}</strong></td><td class="doc-total">${Number(p.m3VendaTotal || 0).toFixed(3)}</td><td>R$ ${valorUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td class="doc-money">R$ ${Number(p.valorTotalWood || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`;
                }).join('')}
            </tbody>
        </table>`;
    return `
        <div class="doc-header"><div><img src="logo.png" alt="${(emitente.nomeFantasia || 'VANMARTE').toUpperCase()}" class="doc-logo" onerror="this.style.display='none'"><div style="margin-top:10px; color:#334155; font-size:13px;"><strong>${emitente.nomeFantasia || emitente.nome || 'SERRARIA VANMARTE'}</strong><br>${emitente.cnpj ? `CNPJ: ${emitente.cnpj}<br>` : ''}${(emitente.logradouro || '')} ${(emitente.numero || '')}<br>${emitente.cidade || ''}</div></div><div class="doc-title"><h1>Romaneio de Carga</h1><p><strong>N ${r.numero || r.numeroCarga || '-'}</strong></p><p>Emitido em ${new Date().toLocaleString('pt-BR')}</p></div></div>
        <div class="doc-grid"><div class="doc-card"><h3>Dados do Comprador</h3><p><strong>Cliente:</strong> ${r.cliente || '-'}</p><p><strong>CNPJ/CPF:</strong> ${clienteObj.cnpj || clienteObj.cpf || '-'}</p><p><strong>Cidade:</strong> ${clienteObj.cidade || '-'}</p>${r.formaPagamento ? `<p><strong>Pagamento:</strong> ${r.formaPagamento} ${r.prazoPagamento ? `(${r.prazoPagamento})` : ''}</p>` : ''}${r.observacaoCliente ? `<p><strong>Obs. cliente:</strong> ${r.observacaoCliente}</p>` : ''}</div><div class="doc-card"><h3>Dados Logisticos</h3><p><strong>Data carreg.:</strong> ${r.logistica?.dataCarregamento || '-'}</p><p><strong>Data descarreg.:</strong> ${r.logistica?.dataDescarregamento || '-'}</p><p><strong>Motorista:</strong> ${r.logistica?.motorista || '-'}</p><p><strong>Caminhao:</strong> ${r.logistica?.caminhao || '-'}</p><p><strong>Placa:</strong> ${r.logistica?.placa || '-'}</p><p><strong>Transporte:</strong> ${r.logistica?.responsavelFrete || '-'}</p></div></div>
        ${pacotesHtml}
        <div class="doc-grid" style="margin-top:20px;"><div class="doc-card"><h3>Resumo da Carga</h3><p><strong>Total de pacotes:</strong> ${totalPcts}</p><p><strong>Total de pecas:</strong> ${totalPcs}</p><p><strong>Total m3:</strong> <span class="doc-total">${totalM3Madeira.toFixed(3)} m3</span></p></div><div class="doc-card"><h3>Resumo Financeiro</h3><p><strong>Soma dos produtos:</strong> <span class="doc-money">R$ ${totalMadeira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>${Number(r.financeiro?.adicionalMadeira || 0) ? `<p><strong>Ajuste madeira:</strong> R$ ${Number(r.financeiro?.adicionalMadeira || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${r.financeiro?.obsMadeira ? `(${r.financeiro.obsMadeira})` : ''}</p>` : ''}<p><strong>Impostos / taxa NF (${taxa}%):</strong> R$ ${imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p><strong>Subtotal liquido:</strong> <span class="doc-money">R$ ${subtotalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p><p><strong>Frete base:</strong> ${totalM3Frete.toFixed(3)} m3 x R$ ${valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ ${freteBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>${Number(r.logistica?.adicionalFrete || 0) ? `<p><strong>Ajuste frete:</strong> R$ ${Number(r.logistica?.adicionalFrete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${r.logistica?.obsFrete ? `(${r.logistica.obsFrete})` : ''}</p>` : ''}<p><strong>Total frete:</strong> <span style="color:#1d4ed8; font-weight:800;">R$ ${freteFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p><p style="font-size:20px; margin-top:14px;"><strong>Total da carga:</strong> <span class="doc-money">R$ ${totalCarga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p></div></div>
        ${r.observacaoCarga ? `<div class="doc-note"><strong>Observacoes da carga</strong><div style="margin-top:8px; white-space:pre-wrap;">${r.observacaoCarga}</div></div>` : ''}
        <div class="doc-signatures"><div>Assinatura do Motorista</div><div>Assinatura do Recebedor</div></div>`;
}

function definirDocumentoRomaneioAtual(r, clienteObj = {}) {
    window.romaneioDocumentoAtual = normalizarRomaneioDocumento(r, clienteObj);
    return window.romaneioDocumentoAtual;
}
window.definirDocumentoRomaneioAtual = definirDocumentoRomaneioAtual;

window.romaneioDocActions = {
    print() {
        if (!window.romaneioDocumentoAtual) return;
        window.DocActions.printHtml({ title: `Romaneio ${window.romaneioDocumentoAtual.romaneio.numero || ''}`, contentHtml: gerarHtmlDocumentoRomaneio(window.romaneioDocumentoAtual) });
    },
    pdf() {
        if (!window.romaneioDocumentoAtual) return window.Promise?.resolve?.();
        return window.DocActions.downloadPdf({ title: `Romaneio ${window.romaneioDocumentoAtual.romaneio.numero || ''}`, filename: `romaneio-${window.romaneioDocumentoAtual.romaneio.numero || 'carga'}`, contentHtml: gerarHtmlDocumentoRomaneio(window.romaneioDocumentoAtual) });
    },
    whatsapp() {
        if (!window.romaneioDocumentoAtual) return window.Promise?.resolve?.();
        const phone = window.romaneioDocumentoAtual.clienteObj?.contato || window.romaneioDocumentoAtual.clienteObj?.telefone || '';
        return window.DocActions.sendWhatsApp({ title: `Romaneio ${window.romaneioDocumentoAtual.romaneio.numero || ''}`, filename: `romaneio-${window.romaneioDocumentoAtual.romaneio.numero || 'carga'}`, phone, message: `Segue o romaneio ${window.romaneioDocumentoAtual.romaneio.numero || ''} da carga de madeira serrada.`, contentHtml: gerarHtmlDocumentoRomaneio(window.romaneioDocumentoAtual) });
    }
};

window.modalDetalhesActions = window.romaneioDocActions;

function renderizarTabelaPacotes() {
    const container = document.getElementById('v2-lista-classes');
    if (!container) return;
    if (romaneioAtual.pacotes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhum pacote adicionado.</p>';
        return;
    }
    const grupos = {};
    romaneioAtual.pacotes.forEach(p => {
        if (!grupos[p.qualidade]) grupos[p.qualidade] = { itens: [], subtotalM3: 0, subtotalValor: 0 };
        grupos[p.qualidade].itens.push(p);
        grupos[p.qualidade].subtotalM3 += p.m3VendaTotal;
        grupos[p.qualidade].subtotalValor += p.valorTotalWood;
    });
    let html = '';
    for (const qual in grupos) {
        const g = grupos[qual];
        const cor = getCorPorQualidade(qual);
        html += `
            <div class="card-v2" style="margin-bottom: 20px; border-left: 6px solid ${cor}; background: rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: 800; color: ${cor}; font-size: 1.1rem;">${qual}</span>
                    <span style="background: ${cor}22; padding: 6px 15px; border-radius: 20px; font-size: 0.9rem; color: ${cor}; border: 1px solid ${cor}44;">
                        Total do Grupo: <strong>${g.subtotalM3.toFixed(3)} m³</strong> | R$ ${g.subtotalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </span>
                </div>
                <div style="overflow-x: auto;">
                    <table class="package-table">
                        <thead>
                            <tr>
                                <th>Madeira / Medida</th>
                                <th>Pcts</th>
                                <th>Config</th>
                                <th>Pçs/Pct</th>
                                <th>Total Pçs</th>
                                <th>m³ Venda</th>
                                <th>V. Unit.</th>
                                <th>Preço m³</th>
                                <th>Subtotal</th>
                                <th class="hide-on-print">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${g.itens.map(p => `
                                <tr>
                                    <td><strong>${p.produtoNome}</strong><br><small>${p.medidas}</small></td>
                                    <td>${p.qtdPacotes}</td>
                                    <td><small>${p.configPct}</small></td>
                                    <td>${p.pecasPorPacote}</td>
                                    <td><strong>${p.pecasPorPacote * p.qtdPacotes}</strong></td>
                                    <td>${p.m3VendaTotal.toFixed(3)}</td>
                                    <td>R$ ${(p.valorTotalWood / (p.pecasPorPacote * p.qtdPacotes)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    <td>R$ ${p.precoM3.toLocaleString('pt-BR')}</td>
                                    <td><strong>R$ ${p.valorTotalWood.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></td>
                                    <td class="hide-on-print">
                                        <button onclick="editarPacoteV2(${p.id})" class="btn-icon text-warning" style="margin-right:10px;"><i class="fa-solid fa-pencil"></i></button>
                                        <button onclick="removerPacoteV2(${p.id})" class="btn-icon text-danger"><i class="fa-solid fa-trash"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderizarResumoFinanceiro(valFrete, volFrete, totalPacotes, totalPecasGeral, totalMadeira, addMadeira, imposto, totalMadeiraComAjuste) {
    const taxa = romaneioAtual.financeiro.taxaNF;
    const totalComTaxa = totalMadeiraComAjuste + imposto;

    const obsMadHtml = romaneioAtual.financeiro.obsMadeira ? ` <small style="color:var(--text-muted);">(${romaneioAtual.financeiro.obsMadeira})</small>` : '';
    const obsFreteHtml = romaneioAtual.logistica.obsFrete ? ` <br><span style="margin-left: 25px; color:var(--text-muted);">Ajuste: R$ ${romaneioAtual.logistica.adicionalFrete.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${romaneioAtual.logistica.obsFrete})</span>` : (romaneioAtual.logistica.adicionalFrete ? ` <br><span style="margin-left: 25px; color:var(--text-muted);">Ajuste: R$ ${romaneioAtual.logistica.adicionalFrete.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>` : '');

    const addMadDisplay = addMadeira !== 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted);">Ajuste Madeira:${obsMadHtml}</span>
            <span style="color: ${addMadeira < 0 ? 'var(--danger)' : '#00ff88'};">${addMadeira < 0 ? '' : '+'} R$ ${addMadeira.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
        </div>
    ` : '';

    const elResumo = document.querySelector('.finance-footer');
    if (!elResumo) return;

    elResumo.innerHTML = `
        <div style="width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;">
            <div style="background: rgba(255,255,255,0.03); padding: 25px; border-radius: 16px; border: 1px solid var(--border); position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--warning);"></div>
                <h4 style="color: var(--warning); margin-bottom: 15px; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">Detalhamento Financeiro</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-muted);">Total de Pacotes / Peças:</span>
                    <span><strong>${totalPacotes}</strong> pcts / <strong>${totalPecasGeral}</strong> pçs</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-muted);">Soma dos Produtos:</span>
                    <span>R$ ${totalMadeira.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                ${addMadDisplay}
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-muted);">Impostos / Taxa NF (${taxa}%):</span>
                    <span style="color: var(--danger);">+ R$ ${imposto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-weight: bold; font-size: 1.1rem;">
                    <span>Subtotal Líquido:</span>
                    <span style="color: var(--accent);">R$ ${totalComTaxa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div style="margin-top: 20px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; font-size: 0.9rem;">
                    <i class="fa-solid fa-truck" style="margin-right: 8px; color: var(--warning);"></i>
                    <strong>Frete Estimado:</strong> ${volFrete.toFixed(3)} m³ × R$ ${romaneioAtual.logistica.valorFrete} ${obsFreteHtml} = 
                    <span style="float: right; font-weight: bold;">R$ ${valFrete.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
            
            <div style="text-align: right; display: flex; flex-direction: column; justify-content: center;">
                <span class="total-label" style="color: var(--text-muted); font-size: 1rem; margin-bottom: 5px;">VALOR TOTAL DO ROMANEIO</span>
                <div class="total-value" style="font-size: 3rem; line-height: 1;">R$ ${totalComTaxa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                
                <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="verPreviaRomaneioV2()" class="btn-v2" style="background: #f59e0b; color: #111827; border: 1px solid rgba(245,158,11,0.55); font-weight: 800; flex: 1; max-width: 200px;">
                        <i class="fa-solid fa-eye"></i> Prévia
                    </button>
                    <button onclick="window.romaneioDocActions.pdf()" class="btn-v2" style="background: #16a34a; color: white; border: 1px solid rgba(22,163,74,0.55); flex: 1; max-width: 200px;">
                        <i class="fa-solid fa-file-pdf"></i> Baixar PDF
                    </button>
                    <button onclick="window.romaneioDocActions.whatsapp()" class="btn-v2" style="background: #22c55e; color: white; border: 1px solid rgba(34,197,94,0.55); flex: 1; max-width: 220px;">
                        <i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp
                    </button>
                    <button onclick="finalizarRomaneioV2()" class="btn-v2" style="background: #00ff88; color: black; font-weight: 900; flex: 2; max-width: 300px; box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);">
                        <i class="fa-solid fa-cloud-arrow-up"></i> FINALIZAR CARGA
                    </button>
                </div>
            </div>
        </div>
    `;
}


window.removerPacoteV2 = (id) => {
    romaneioAtual.pacotes = romaneioAtual.pacotes.filter(p => p.id !== id);
    atualizarTotalGeral();
    renderizarTabelaPacotes();
};

window.editarPacoteV2 = editarPacoteV2;

window.carregarRomaneioParaEdicao = function(r) {
    // 1. Setar o romaneioAtual com os dados carregados
    romaneioAtual = {
        idFirebase: r.id, // Guardamos o ID do Firebase para usar no updateDoc depois
        numero: r.numero || r.numeroCarga,
        cliente: r.cliente,
        formaPagamento: r.formaPagamento || '',
        prazoPagamento: r.prazoPagamento || '',
        observacaoCliente: r.observacaoCliente || '',
        logistica: { ...r.logistica },
        pacotes: [ ...r.pacotes ],
        financeiro: { ...r.financeiro }
    };
    
    // 2. Preencher os inputs na tela
    const selectCli = document.getElementById('v2-select-cliente');
    if (selectCli) {
        const clienteObj = clientesDisponiveis.find(c => c.nome === r.cliente);
        selectCli.value = clienteObj ? clienteObj.id : '';
    }
    
    if (document.getElementById('v2-cliente')) document.getElementById('v2-cliente').value = r.cliente;
    if (document.getElementById('v2-data-carreg')) document.getElementById('v2-data-carreg').value = r.logistica?.dataCarregamento || '';
    if (document.getElementById('v2-data-descarreg')) document.getElementById('v2-data-descarreg').value = r.logistica?.dataDescarregamento || '';
    if (document.getElementById('v2-numero-ordem')) document.getElementById('v2-numero-ordem').value = r.numero || r.numeroCarga || '';
    
    const selectTransp = document.getElementById('v2-select-transporte');
    if (selectTransp) {
        const transpObj = transportadorasDisponiveis.find(t => t.nome === r.logistica?.responsavelFrete);
        selectTransp.value = transpObj ? transpObj.id : '';
    }
    
    if (document.getElementById('v2-motorista')) document.getElementById('v2-motorista').value = r.logistica?.motorista || '';
    if (document.getElementById('v2-caminhao')) document.getElementById('v2-caminhao').value = r.logistica?.caminhao || '';
    if (document.getElementById('v2-placa')) document.getElementById('v2-placa').value = r.logistica?.placa || '';
    
    if (document.getElementById('v2-valor-frete')) document.getElementById('v2-valor-frete').value = window.formatCurrencyValue(r.logistica?.valorFrete || 0);
    if (document.getElementById('v2-adicional-frete')) document.getElementById('v2-adicional-frete').value = window.formatCurrencyValue(r.logistica?.adicionalFrete || 0);
    if (document.getElementById('v2-adicional-madeira')) document.getElementById('v2-adicional-madeira').value = window.formatCurrencyValue(r.financeiro?.adicionalMadeira || 0);
    if (document.getElementById('v2-taxa-nf')) document.getElementById('v2-taxa-nf').value = r.financeiro?.taxaNF || 0;
    
    if (document.getElementById('v2-obs-madeira')) document.getElementById('v2-obs-madeira').value = r.financeiro?.obsMadeira || '';
    if (document.getElementById('v2-obs-frete')) document.getElementById('v2-obs-frete').value = r.logistica?.obsFrete || '';
    if (document.getElementById('v2-obs-carga')) document.getElementById('v2-obs-carga').value = r.observacaoCarga || '';
    
    // 3. Forçar recálculo e renderização
    atualizarTotalGeral();
    renderizarTabelaPacotes();
    
    // Mudar estilo do botão de finalizar para indicar edição
    const btnFinalizar = document.querySelector('button[onclick="finalizarRomaneioV2()"]');
    if (btnFinalizar) {
        btnFinalizar.innerHTML = '<i class="fa-solid fa-save"></i> SALVAR ALTERAÇÕES DA CARGA';
        btnFinalizar.style.background = '#f59e0b'; // Cor Laranja/Alerta
        btnFinalizar.style.color = 'black';
    }
    
    // 4. Mudar para a aba de Gerar Romaneio
    const linkRomaneio = document.querySelector('.sidebar nav ul li a[data-target="view-romaneio-v2"]');
    if (linkRomaneio) {
        linkRomaneio.click();
    }
    
    alert(`Carga ${r.numero || r.numeroCarga} carregada no editor! Edite o que for necessário e clique em "SALVAR ALTERAÇÕES DA CARGA" no final.`);
};

window.finalizarRomaneioV2 = async () => {
    const cliente = document.getElementById('v2-cliente').value.toUpperCase().trim();
    if (!cliente || romaneioAtual.pacotes.length === 0) { alert("Dados incompletos."); return; }
    
    // Atualizar dados de logística e observações redundantes em maiúsculo
    romaneioAtual.logistica.dataCarregamento = document.getElementById('v2-data-carreg')?.value || '';
    romaneioAtual.logistica.dataDescarregamento = document.getElementById('v2-data-descarreg')?.value || '';
    romaneioAtual.logistica.motorista = (document.getElementById('v2-motorista')?.value || '').toUpperCase().trim();
    romaneioAtual.logistica.caminhao = (document.getElementById('v2-caminhao')?.value || '').toUpperCase().trim();
    romaneioAtual.logistica.placa = (document.getElementById('v2-placa')?.value || '').toUpperCase().trim();
    romaneioAtual.logistica.obsFrete = (document.getElementById('v2-obs-frete')?.value || '').toUpperCase().trim();
    romaneioAtual.financeiro.obsMadeira = (document.getElementById('v2-obs-madeira')?.value || '').toUpperCase().trim();
    romaneioAtual.observacaoCarga = (document.getElementById('v2-obs-carga')?.value || '').toUpperCase().trim();
    
    const btn = document.querySelector('button[onclick="finalizarRomaneioV2()"]');
    if (btn) {
        btn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
        btn.disabled = true;
    }

    try {
        if (romaneioAtual.idFirebase) {
            // --- Edição de Carga Existente ---
            const docRef = doc(db, "romaneios", romaneioAtual.idFirebase);
            
            // 1. Estornar Estoque dos Pacotes da Carga antiga
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const antigo = docSnap.data();
                if (antigo.pacotes) {
                    for (const p of antigo.pacotes) {
                        if (p.produtoId) {
                            const pecasAntigas = (p.pecasPorPacote || 0) * (p.qtdPacotes || 1);
                            await window.FS.ajustarQuantidadeProduto(p.produtoId, pecasAntigas);
                        }
                    }
                }
            }
            
            // 2. Debitar Estoque dos Novos Pacotes
            for (const p of romaneioAtual.pacotes) {
                if (p.produtoId) {
                    const pecasNovas = (p.pecasPorPacote || 0) * (p.qtdPacotes || 1);
                    await window.FS.ajustarQuantidadeProduto(p.produtoId, -pecasNovas);
                }
            }
            
            // 3. Atualizar o Firestore
            const dadosNovos = { ...romaneioAtual };
            delete dadosNovos.idFirebase; // Remover ID local antes de salvar
            
            await window.FS.updateDoc('romaneios', romaneioAtual.idFirebase, {
                ...dadosNovos,
                cliente,
                dataEdicao: new Date().toISOString(),
                status: 'finalizado'
            });
            
            alert(`Carga ${romaneioAtual.numero} atualizada com sucesso no Firebase!`);
        } else {
            // --- Criação de Carga Nova ---
            await window.FS.addDoc('romaneios', {
                ...romaneioAtual,
                cliente,
                dataCriacao: new Date().toISOString(),
                status: 'finalizado'
            });
            
            for (const p of romaneioAtual.pacotes) {
                if (p.produtoId) {
                    const totalPecasVendidas = (p.pecasPorPacote || 0) * (p.qtdPacotes || 1);
                    await window.FS.ajustarQuantidadeProduto(p.produtoId, -totalPecasVendidas);
                }
            }
            alert(`Romaneio ${romaneioAtual.numero} salvo com sucesso no Firebase!`);
        }
        
        // Resetar o estado sem idFirebase
        romaneioAtual.idFirebase = null;
        romaneioAtual.pacotes = [];
        romaneioAtual.numero = `ROM-${Date.now().toString().slice(-6)}`;
        if (document.getElementById('v2-numero-ordem')) document.getElementById('v2-numero-ordem').value = romaneioAtual.numero;
        
        atualizarTotalGeral();
        renderizarTabelaPacotes();
        limparCamposPacote();
        
        // Resetar visual do botão na aba gerar
        const btnFinalizar = document.querySelector('button[onclick="finalizarRomaneioV2()"]');
        if (btnFinalizar) {
            btnFinalizar.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> FINALIZAR CARGA';
            btnFinalizar.style.background = '#00ff88';
            btnFinalizar.style.color = 'black';
        }
        
        document.dispatchEvent(new Event('historicoUpdated'));
        
    } catch (e) { 
        console.error("Erro ao salvar romaneio:", e);
        alert("Erro ao salvar romaneio. Verifique o console.");
    } finally {
        if (btn) {
            btn.disabled = false;
        }
    }
};

window.verPreviaRomaneioV2 = () => {
    if (romaneioAtual.pacotes.length === 0) {
        alert("Adicione pelo menos um pacote para ver a prévia.");
        return;
    }

    const modal = document.getElementById('modalDetalhesRomaneio');
    const conteudo = document.getElementById('conteudoDetalhesRomaneio');
    
    if (!modal || !conteudo) return;

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Gerar HTML da prévia
    const clienteId = document.getElementById('v2-select-cliente').value;
    const clienteObj = clientesDisponiveis.find(c => c.id === clienteId) || {};
    const cnpj = clienteObj.cnpj || clienteObj.cpf || '-';
    const cidade = clienteObj.cidade || '-';

    const r = {
        ...romaneioAtual,
        cliente: (document.getElementById('v2-cliente').value || 'Cliente Não Selecionado').toUpperCase().trim(),
        logistica: {
            ...romaneioAtual.logistica,
            dataCarregamento: document.getElementById('v2-data-carreg').value,
            dataDescarregamento: document.getElementById('v2-data-descarreg')?.value || '',
            motorista: (document.getElementById('v2-motorista').value || '').toUpperCase().trim(),
            caminhao: (document.getElementById('v2-caminhao').value || '').toUpperCase().trim(),
            placa: (document.getElementById('v2-placa').value || '').toUpperCase().trim(),
            obsFrete: (document.getElementById('v2-obs-frete')?.value || '').toUpperCase().trim()
        },
        financeiro: {
            ...romaneioAtual.financeiro,
            obsMadeira: (document.getElementById('v2-obs-madeira')?.value || '').toUpperCase().trim()
        },
        observacaoCarga: (document.getElementById('v2-obs-carga')?.value || '').toUpperCase().trim()
    };

    let pacotesHtml = `
        <table class="package-table" style="margin-top:20px; color: black;">
            <thead>
                <tr>
                    <th>Qualidade</th>
                    <th>Madeira</th>
                    <th>Pcts</th>
                    <th>Config</th>
                    <th>Pçs/Pct</th>
                    <th>Total Pçs</th>
                    <th>m³ Venda</th>
                    <th>V. Unit.</th>
                    <th>Valor Total</th>
                </tr>
            </thead>
            <tbody>
                ${r.pacotes.map(p => `
                    <tr>
                        <td><strong>${p.qualidade}</strong></td>
                        <td>${p.produtoNome}<br><small>${p.medidas}</small></td>
                        <td>${p.qtdPacotes}</td>
                        <td><small>${p.configPct}</small></td>
                        <td>${p.pecasPorPacote}</td>
                        <td><strong>${p.pecasPorPacote * p.qtdPacotes}</strong></td>
                        <td>${p.m3VendaTotal.toFixed(3)}</td>
                        <td>R$ ${(p.valorTotalWood / (p.pecasPorPacote * p.qtdPacotes)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>R$ ${p.valorTotalWood.toLocaleString('pt-BR')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    let totalPcts = 0;
    let totalPcs = 0;
    let totalM3Madeira = 0;
    let totalMadeira = 0;
    let totalM3Frete = 0;

    r.pacotes.forEach(p => { 
        totalPcts += p.qtdPacotes; 
        totalPcs += (p.pecasPorPacote * p.qtdPacotes); 
        totalM3Madeira += p.m3VendaTotal;
        totalMadeira += p.valorTotalWood;
        totalM3Frete += p.m3FreteTotal;
    });

    const emitente = window.dadosSerrariaEmitente || {
        nome: "COMERCIO DE MADEIRAS VANMART LTDA",
        nomeFantasia: "SERRARIA VANMARTE",
        cnpj: "44.215.194/0001-18",
        ie: "ISENTO",
        contato: "15 996297072",
        email: "escritoriovanmarte@hotmail.com",
        cep: "18430-000",
        logradouro: "ESTRADA DO TAQUARI",
        numero: "267",
        cidade: "Ribeirão Branco / SP"
    };

    const taxa = r.financeiro.taxaNF || 0;
    const imposto = (totalMadeira + (r.financeiro.adicionalMadeira || 0)) * (taxa / 100);
    const subtotalLiquido = (totalMadeira + (r.financeiro.adicionalMadeira || 0)) + imposto;
    const freteBruto = totalM3Frete * (r.logistica.valorFrete || 0);
    const freteFinal = freteBruto + (r.logistica.adicionalFrete || 0);

    conteudo.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
            <div>
                <!-- O usuário enviará a logo, que deve ser salva na raiz como logo.png ou logo.jpg e referenciada aqui -->
                <img src="logo.png" alt="${(emitente.nomeFantasia || 'VANMARTE').toUpperCase()} - Madeiras serradas para embalagens" style="max-height: 80px; max-width: 250px; display: block;" onerror="this.style.display='none'">
            </div>
            <div style="text-align:right; color: black;">
                <h1 style="margin:0; font-size: 1.5rem; text-transform: uppercase;">ROMANEIO DE CARGA</h1>
                <h2 style="margin:5px 0 0 0; font-size: 1.2rem; color: #444;">Nº ${r.numero}</h2>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 20px; color: black;">
            <div>
                <p style="margin-bottom: 8px; font-weight: bold; font-size: 1rem; text-transform: uppercase;">Dados do Comprador</p>
                <p><strong>Cliente:</strong> ${r.cliente}</p>
                <p><strong>CNPJ/CPF:</strong> ${cnpj}</p>
                <p><strong>Localização:</strong> ${cidade}</p>
                ${r.formaPagamento ? `<p><strong>Pagamento:</strong> ${r.formaPagamento} ${r.prazoPagamento ? `(${r.prazoPagamento})` : ''}</p>` : ''}
                ${r.observacaoCliente ? `<p><strong>Obs Cliente:</strong> ${r.observacaoCliente}</p>` : ''}
            </div>
            <div>
                <p style="margin-bottom: 8px; font-weight: bold; font-size: 1rem; text-transform: uppercase;">Dados Logísticos</p>
                <p><strong>Data Carreg.:</strong> ${r.logistica.dataCarregamento}</p>
                <p><strong>Motorista:</strong> ${r.logistica.motorista || '-'}</p>
                <p><strong>Caminhão / Placa:</strong> ${r.logistica.caminhao || '-'} / ${r.logistica.placa || '-'}</p>
            </div>
        </div>
        ${pacotesHtml}
        
        <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; color: black; page-break-inside: avoid;">
            <!-- M3 e Resumo de Carga -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ccc; display: flex; flex-direction: column; justify-content: center;">
                <p style="margin: 0; font-size: 1rem;"><strong>Total de Pacotes:</strong> ${totalPcts} pcts</p>
                <p style="margin: 5px 0; font-size: 1rem;"><strong>Total de Peças:</strong> ${totalPcs} pçs</p>
                <p style="margin: 10px 0 0 0; font-size: 1.4rem; font-weight: 900; color: #111; text-transform: uppercase; border-top: 1px solid #ccc; padding-top: 10px;">
                    M³ TOTAL: <span style="float:right;">${totalM3Madeira.toFixed(3)} m³</span>
                </p>
            </div>

            <!-- Detalhamento Financeiro -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ccc; text-align: right;">
                <p style="margin: 0 0 5px 0; font-size: 1rem;">Soma dos Produtos: <span style="font-weight: 500;">R$ ${totalMadeira.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                ${r.financeiro.adicionalMadeira ? `<p style="margin: 0 0 5px 0; font-size: 0.9rem;">Ajuste Madeira: R$ ${r.financeiro.adicionalMadeira.toLocaleString('pt-BR', {minimumFractionDigits: 2})} ${r.financeiro.obsMadeira ? `(${r.financeiro.obsMadeira})` : ''}</p>` : ''}
                <p style="margin: 0 0 5px 0; font-size: 0.9rem;">Impostos / Taxa NF (${taxa}%): <span style="color: #555;">+ R$ ${imposto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                <p style="margin: 10px 0 5px 0; font-size: 1.1rem; font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px;">Subtotal Líquido: R$ ${subtotalLiquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 0.9rem;">
                    <p style="margin: 0 0 5px 0;">Estimativa Frete Base: ${totalM3Frete.toFixed(3)} m³ × R$ ${r.logistica.valorFrete}/m³ = R$ ${freteBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    ${r.logistica.adicionalFrete ? `<p style="margin: 0 0 5px 0;">Ajuste Frete: R$ ${r.logistica.adicionalFrete.toLocaleString('pt-BR', {minimumFractionDigits: 2})} ${r.logistica.obsFrete ? `(${r.logistica.obsFrete})` : ''}</p>` : ''}
                    <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 1.1rem; color: #111;">Custo Total Frete: R$ ${freteFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>

                <p style="font-size: 1.4rem; font-weight: 900; margin: 15px 0 0 0; border-top: 2px solid #333; padding-top: 10px;">
                    TOTAL DA CARGA: R$ ${r.financeiro.totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
            </div>
        </div>

        ${r.observacaoCarga ? `
        <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 8px; background: #fff; color: black; page-break-inside: avoid;">
            <p style="margin: 0; font-weight: bold; font-size: 1rem; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Observações da Carga</p>
            <p style="margin: 0; font-size: 0.95rem; white-space: pre-wrap;">${r.observacaoCarga}</p>
        </div>` : ''}
        <div class="show-on-print" style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
            <div style="border-top: 1px solid black; text-align:center; padding-top: 5px; color: black;">Assinatura do Motorista</div>
            <div style="border-top: 1px solid black; text-align:center; padding-top: 5px; color: black;">Assinatura do Recebedor</div>
        </div>
        <div class="show-on-print" style="text-align: center; margin-top: 40px; font-size: 0.65rem; color: #777;">
            Desenvolvido por: Orquestra.cs - sistema industrial personalizado
        </div>
    `;
    definirDocumentoRomaneioAtual(r, clienteObj);
    conteudo.innerHTML = gerarHtmlDocumentoRomaneio(window.romaneioDocumentoAtual);
};

window.fecharModalDetalhes = () => {
    document.getElementById('modalDetalhesRomaneio').style.display = 'none';
    document.body.classList.remove('modal-open');
};

function limparCamposPacote() {
    ['v2-altura', 'v2-camada', 'v2-amarras', 'v2-quantidade', 'v2-qtd-pacotes', 'v2-preco-m3-item', 'v2-qualidade', 'v2-espessura', 'v2-largura', 'v2-comprimento', 'v2-comprimento-real'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'v2-qtd-pacotes' ? 1 : '');
    });
    const selectProd = document.getElementById('v2-select-produto');
    if (selectProd) selectProd.value = '';
    // Resetar preview de volume
    const elUnit = document.getElementById('v2-volume-unit');
    const elTotal = document.getElementById('v2-volume-total');
    if (elUnit) elUnit.textContent = '0,000 m³';
    if (elTotal) elTotal.textContent = '0,000 m³';
}

// CHAMADA IMEDIATA
prepararInterface();
