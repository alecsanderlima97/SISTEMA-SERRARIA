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
        baseNF: 'INTEIRA',
        obsMadeira: ''
    }
};

let produtosDisponiveis = [];
let clientesDisponiveis = [];
let transportadorasDisponiveis = [];
let patioRelatorioRomaneio = null;
let patioItensDisponiveis = [];
let patioCarregamentoSequencia = 0;
let pacoteEditandoId = null;

function parseNumeroBR(valor) {
    const n = parseFloat(String(valor || '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

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
    carregarPatioParaRomaneio();
}

// 2. RE-TENTATIVA APÓS LOGIN (Para garantir acesso ao Firebase)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Romaneio V2: Usuário autenticado, atualizando listas...");
        carregarClientesParaRomaneio();
        carregarProdutosParaRomaneio();
        carregarTransportadorasParaRomaneio();
        carregarPatioParaRomaneio();
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
        const optManual = document.createElement('option');
        optManual.value = '__manual__';
        optManual.textContent = 'Madeira manual / nao cadastrada';
        select.appendChild(optManual);
        snap.forEach(doc => {
            const p = { id: doc.id, ...doc.data() };
            produtosDisponiveis.push(p);
        });
        produtosDisponiveis.sort((a, b) => {
            const classe = (valor) => {
                const texto = String(valor || '').toUpperCase();
                if (texto.includes('1')) return 1;
                if (texto.includes('2')) return 2;
                if (texto.includes('3')) return 3;
                return 99;
            };
            return classe(a.classe || a.qualidade) - classe(b.classe || b.qualidade)
                || (Number(b.comprimentoVenda) || 0) - (Number(a.comprimentoVenda) || 0)
                || (Number(b.espessura) || 0) - (Number(a.espessura) || 0)
                || (Number(b.largura) || 0) - (Number(a.largura) || 0)
                || (Number(b.pecasPorPacote) || 0) - (Number(a.pecasPorPacote) || 0)
                || String(a.tipo || '').localeCompare(String(b.tipo || ''));
        });
        produtosDisponiveis.forEach(p => {
            const opt = document.createElement('option');
            const classe = formatarClasseMadeira(p.classe || p.qualidade || '-');
            const cores = coresClasseMadeira(p.classe || p.qualidade);
            const medidas = formatarMedidasMadeiraOption(p);
            opt.value = p.id;
            opt.textContent = `${String(p.tipo || 'Sem Tipo').toUpperCase()} - ${classe} - ${medidas}`;
            opt.style.color = cores.color;
            opt.style.backgroundColor = cores.bg;
            opt.style.fontWeight = '800';
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

function numeroClasseRomaneio(valor) {
    const texto = String(valor || '').toUpperCase();
    if (texto.includes('1')) return 1;
    if (texto.includes('2')) return 2;
    if (texto.includes('3')) return 3;
    return 99;
}

function coresClassePatioRomaneio(valor) {
    const classe = numeroClasseRomaneio(valor);
    if (classe === 1) return { color: '#16a34a', bg: '#dcfce7' };
    if (classe === 2) return { color: '#b45309', bg: '#fef3c7' };
    if (classe === 3) return { color: '#dc2626', bg: '#fee2e2' };
    return { color: '#334155', bg: '#f8fafc' };
}

function detalhesConfiguracaoPatioRomaneio(item) {
    const raw = String(item.pecasRaw || item.configPct || '').trim().replace(/\s/g, '');
    const match = raw.match(/^(\d+)x(\d+)(?:\+(\d+))?$/i);
    const altura = Number(item.altura ?? item.alturas ?? item.alt ?? match?.[1] ?? 0);
    const camada = Number(item.camada ?? item.larguraPacote ?? item.cam ?? match?.[2] ?? 0);
    const amarras = Number(item.amarras ?? item.am ?? match?.[3] ?? 0);
    const pecas = Number(item.pecas ?? item.pecasPorPacote ?? ((altura * camada) + amarras) ?? 0);
    return { altura, camada, amarras, pecas };
}

function nomeMadeiraPatioRomaneio(tipo) {
    const nome = String(tipo || '').trim().toUpperCase();
    return !nome || nome === 'MADEIRA' || nome === 'MADEIRA DO PATIO' ? 'TÁBUA' : nome;
}

function chavePatioRomaneio(item) {
    const { altura: alt, camada: cam, amarras, pecas } = detalhesConfiguracaoPatioRomaneio(item);
    return [
        numeroClasseRomaneio(item.classe),
        nomeMadeiraPatioRomaneio(item.tipo),
        Number(item.espessura || 0).toFixed(1),
        Number(item.largura || 0).toFixed(1),
        Number(item.comprimento || 0).toFixed(2),
        alt,
        cam,
        amarras,
        pecas,
    ].join('|');
}

function agruparItensPatioRomaneio(itens) {
    const grupos = new Map();
    (itens || []).forEach(item => {
        const pacotes = Number(item.pacotes || 0);
        if (pacotes <= 0) return;
        const chave = chavePatioRomaneio(item);
        if (!grupos.has(chave)) {
            const { altura, camada, amarras, pecas } = detalhesConfiguracaoPatioRomaneio(item);
            grupos.set(chave, {
                ...item,
                id: chave,
                tipo: nomeMadeiraPatioRomaneio(item.tipo),
                altura,
                camada,
                amarras,
                pecas,
                patioItemIds: [],
                pacotes: 0,
                totalPecas: 0,
                volume: 0
            });
        }
        const grupo = grupos.get(chave);
        grupo.patioItemIds.push(item.id);
        grupo.pacotes += pacotes;
        grupo.totalPecas += Number(item.totalPecas || (Number(item.pecas || 0) * pacotes) || 0);
        grupo.volume += Number(item.volume || (Number(item.volumeUnidade || 0) * pacotes) || 0);
    });
    return Array.from(grupos.values());
}

function obterItemPatioSelecionadoRomaneio() {
    const select = document.getElementById('v2-select-patio');
    return patioItensDisponiveis.find(i => i.id === select?.value) || null;
}

async function carregarPatioParaRomaneio() {
    const select = document.getElementById('v2-select-patio');
    if (!select) return;
    const sequencia = ++patioCarregamentoSequencia;
    select.innerHTML = '<option value="">Usar madeira cadastrada/manual...</option>';
    patioRelatorioRomaneio = null;
    patioItensDisponiveis = [];

    try {
        let snap;
        try {
            snap = await getDocs(query(collection(db, 'patio_relatorios'), orderBy('atualizadoEm', 'desc'), limit(1)));
        } catch {
            snap = await getDocs(collection(db, 'patio_relatorios'));
        }
        const relatorios = [];
        snap.forEach(d => relatorios.push({ id: d.id, ...d.data() }));
        if (sequencia !== patioCarregamentoSequencia) return;
        relatorios.sort((a, b) => new Date(b.atualizadoEm || b.criadoEm || b.data || 0) - new Date(a.atualizadoEm || a.criadoEm || a.data || 0));
        patioRelatorioRomaneio = relatorios[0] || null;
        patioItensDisponiveis = agruparItensPatioRomaneio(patioRelatorioRomaneio?.itens || [])
            .sort((a, b) => numeroClasseRomaneio(a.classe) - numeroClasseRomaneio(b.classe)
                || Number(b.comprimento || 0) - Number(a.comprimento || 0)
                || Number(b.espessura || 0) - Number(a.espessura || 0)
                || Number(b.largura || 0) - Number(a.largura || 0)
                || String(a.tipo || '').localeCompare(String(b.tipo || ''), 'pt-BR')
                || Number(b.pecas || 0) - Number(a.pecas || 0));

        const fragmento = document.createDocumentFragment();
        patioItensDisponiveis.forEach(item => {
            const opt = document.createElement('option');
            const cores = coresClassePatioRomaneio(item.classe);
            opt.value = item.id;
            const configuracao = `(${Number(item.altura || 0)}x${Number(item.camada || 0)})${Number(item.amarras || 0) > 0 ? `+${Number(item.amarras)}` : ''} = ${Number(item.pecas || 0)} pç`;
            opt.textContent = `${item.classe || '-'} - ${item.tipo || 'MADEIRA'} - ${Number(item.espessura || 0).toLocaleString('pt-BR')} / ${Number(item.largura || 0).toLocaleString('pt-BR')} / ${Number(item.comprimento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${configuracao} - ${item.pacotes || 0} pct`;
            opt.style.color = cores.color;
            opt.style.backgroundColor = cores.bg;
            opt.style.fontWeight = '500';
            fragmento.appendChild(opt);
        });
        if (sequencia !== patioCarregamentoSequencia) return;
        select.innerHTML = '<option value="">Usar madeira cadastrada/manual...</option>';
        select.appendChild(fragmento);
    } catch (error) {
        console.error('Erro ao carregar patio para romaneio:', error);
    }
}

function selecionarPacotePatioRomaneio() {
    const select = document.getElementById('v2-select-patio');
    const item = patioItensDisponiveis.find(i => i.id === select?.value);
    if (!item) return;

    const produtoSelect = document.getElementById('v2-select-produto');
    if (produtoSelect) produtoSelect.value = '__manual__';
    selecionarMadeiraCadastrada({ target: produtoSelect });
    const set = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.value = valor ?? '';
    };
    set('v2-produto-manual', item.tipo || 'MADEIRA DO PATIO');
    set('v2-qualidade', numeroClasseRomaneio(item.classe) === 2 ? '2a CLASSE' : numeroClasseRomaneio(item.classe) === 3 ? '3a CLASSE' : '1a CLASSE');
    atualizarVisualClasseRomaneio();
    preencherPrecoPorQualidade();
    set('v2-especie', item.especie || 'EUCALIPTO');
    set('v2-espessura', Number(item.espessura || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
    set('v2-largura', Number(item.largura || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
    set('v2-comprimento', Number(item.comprimento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    set('v2-comprimento-real', Number(item.comprimento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    set('v2-altura', item.altura ?? item.alturas ?? item.alt ?? '');
    set('v2-camada', item.camada ?? item.larguraPacote ?? item.cam ?? '');
    set('v2-amarras', item.amarras ?? item.am ?? '');
    set('v2-quantidade', item.pecas ?? item.pecasRaw ?? item.pecasPorPacote ?? '');
    set('v2-qtd-pacotes', Math.min(1, Number(item.pacotes || 0)) || 1);
    const qtdInput = document.getElementById('v2-qtd-pacotes');
    if (qtdInput) qtdInput.max = Number(item.pacotes || 0);
    const saldoInfo = document.getElementById('v2-saldo-patio');
    if (saldoInfo) {
        saldoInfo.style.display = 'block';
        saldoInfo.textContent = `Saldo no patio: ${Number(item.pacotes || 0)} pacote(s).`;
    }
    atualizarVolumePreview();
}

function recalcularTotaisPatioItens(itens) {
    const totais = itens.reduce((acc, item) => {
        const pacotes = Number(item.pacotes || 0);
        const pecasPacote = Number(item.pecas || item.pecasRaw || 0);
        const volumeUnidade = Number(item.volumeUnidade || 0);
        acc.pacotes += pacotes;
        acc.pecas += pacotes * pecasPacote;
        acc.volume += pacotes * volumeUnidade;
        return acc;
    }, { pacotes: 0, pecas: 0, volume: 0 });
    return {
        pacotes: totais.pacotes,
        pecas: totais.pecas,
        volume: Number(totais.volume.toFixed(3))
    };
}

async function ajustarPacotesPatioRomaneio(pacotes, sinal, contexto = {}) {
    const vinculados = (pacotes || []).filter(p => p.origemPatio && p.patioRelatorioId && p.patioItemId);
    if (!vinculados.length) return;

    const porRelatorio = new Map();
    vinculados.forEach(p => {
        const chave = `${p.patioRelatorioId}|${p.patioItemId}`;
        const atual = porRelatorio.get(chave) || { qtd: 0, itemIds: [] };
        atual.qtd += Number(p.patioQtdPacotes || p.qtdPacotes || 0);
        atual.itemIds = p.patioItemIds?.length ? p.patioItemIds : [p.patioItemId];
        porRelatorio.set(chave, atual);
    });

    const relatoriosAfetados = [...new Set(vinculados.map(p => p.patioRelatorioId))];
    for (const relatorioId of relatoriosAfetados) {
        const ref = doc(db, 'patio_relatorios', relatorioId);
        const snap = await getDoc(ref);
        if (!snap.exists()) continue;

        const dados = snap.data();
        const itens = Array.isArray(dados.itens) ? [...dados.itens] : [];
        for (const [chave, info] of porRelatorio.entries()) {
            const [idRelatorio, idItem] = chave.split('|');
            if (idRelatorio !== relatorioId) continue;
            let restante = Number(info.qtd || 0);
            const idsParaBaixa = info.itemIds?.length ? info.itemIds : [idItem];
            for (const realId of idsParaBaixa) {
                if (restante <= 0) break;
                const idx = itens.findIndex(item => String(item.id) === String(realId));
                if (idx < 0) continue;
                const atual = Number(itens[idx].pacotes || 0);
                const delta = sinal < 0 ? Math.min(atual, restante) : restante;
                const novoTotal = atual + (sinal < 0 ? -delta : delta);
                if (novoTotal < 0) throw new Error('Saldo insuficiente no patio para finalizar o romaneio.');
                const volumeUnidade = Number(itens[idx].volumeUnidade || 0);
                const pecasPacote = Number(itens[idx].pecas || itens[idx].pecasRaw || 0);
                itens[idx] = {
                    ...itens[idx],
                    pacotes: novoTotal,
                    totalPecas: novoTotal * pecasPacote,
                    volume: Number((novoTotal * volumeUnidade).toFixed(3)),
                    movimentacoesPatio: sinal < 0 ? [
                        ...(Array.isArray(itens[idx].movimentacoesPatio) ? itens[idx].movimentacoesPatio : []),
                        {
                            tipo: 'SAIDA_ROMANEIO',
                            romaneio: contexto.numero || '-',
                            cliente: contexto.cliente || '-',
                            pacotes: delta,
                            saldo: novoTotal,
                            dataHora: new Date().toISOString()
                        }
                    ].slice(-20) : (itens[idx].movimentacoesPatio || []),
                    ultimoUsoRomaneio: sinal < 0 ? {
                        romaneio: contexto.numero || '-', cliente: contexto.cliente || '-', pacotes: delta,
                        saldo: novoTotal, dataHora: new Date().toISOString()
                    } : itens[idx].ultimoUsoRomaneio
                };
                restante -= delta;
            }
            if (restante > 0 && sinal < 0) throw new Error('Saldo insuficiente no patio para finalizar o romaneio.');
        }

        await updateDoc(ref, {
            itens,
            totais: recalcularTotaisPatioItens(itens),
            atualizadoEm: new Date().toISOString(),
            ultimaAlteracaoPatio: sinal < 0 ? {
                acao: `Baixa de pacotes no romaneio ${contexto.numero || '-'}`,
                usuario: contexto.cliente || 'Romaneio',
                dataHora: new Date().toISOString()
            } : dados.ultimaAlteracaoPatio
        });
    }
}

async function validarSaldoPatioRomaneio(pacotes, pacotesEstorno = []) {
    const vinculados = (pacotes || []).filter(p => p.origemPatio && p.patioRelatorioId && p.patioItemId);
    if (!vinculados.length) return;

    const agrupados = new Map();
    vinculados.forEach(p => {
        const chave = `${p.patioRelatorioId}|${p.patioItemId}`;
        const atual = agrupados.get(chave) || { qtd: 0, itemIds: [] };
        atual.qtd += Number(p.patioQtdPacotes || p.qtdPacotes || 0);
        atual.itemIds = p.patioItemIds?.length ? p.patioItemIds : [p.patioItemId];
        agrupados.set(chave, atual);
    });
    const estornos = new Map();
    (pacotesEstorno || []).filter(p => p.origemPatio && p.patioRelatorioId && p.patioItemId).forEach(p => {
        const chave = `${p.patioRelatorioId}|${p.patioItemId}`;
        estornos.set(chave, (estornos.get(chave) || 0) + Number(p.patioQtdPacotes || p.qtdPacotes || 0));
    });

    for (const [chave, info] of agrupados.entries()) {
        const [relatorioId, itemId] = chave.split('|');
        const snap = await getDoc(doc(db, 'patio_relatorios', relatorioId));
        if (!snap.exists()) throw new Error('Relatorio do patio nao encontrado.');
        const itens = snap.data().itens || [];
        const ids = info.itemIds?.length ? info.itemIds : [itemId];
        const saldoAtual = itens
            .filter(i => ids.includes(i.id))
            .reduce((acc, i) => acc + Number(i.pacotes || 0), 0);
        const saldoDisponivel = saldoAtual + Number(estornos.get(chave) || 0);
        if (saldoDisponivel < Number(info.qtd || 0)) {
            throw new Error('Nao ha pacotes suficientes no patio para esta carga.');
        }
    }
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

    const selectPatio = document.getElementById('v2-select-patio');
    if (selectPatio) selectPatio.onchange = selecionarPacotePatioRomaneio;

    const selectCli = document.getElementById('v2-select-cliente');
    if (selectCli) selectCli.onchange = selecionarClienteCadastrado;

    // Ao mudar a qualidade, preencher preco automaticamente
    const inputQualidade = document.getElementById('v2-qualidade');
    if (inputQualidade) inputQualidade.addEventListener('change', () => { atualizarVisualClasseRomaneio(); preencherPrecoPorQualidade(); });
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
    ['v2-motorista', 'v2-caminhao', 'v2-placa', 'v2-obs-madeira', 'v2-obs-frete', 'v2-produto-manual'].forEach(id => {
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
    romaneioAtual.financeiro.baseNF = cli.baseNF || 'INTEIRA';
    
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
    const grupoManual = document.getElementById('grupoV2MadeiraManual');
    const inputManual = document.getElementById('v2-produto-manual');
    if (e.target.value === '__manual__') {
        if (grupoManual) grupoManual.style.display = 'flex';
        ['v2-espessura', 'v2-largura', 'v2-comprimento', 'v2-comprimento-real'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (inputManual) inputManual.focus();
        preencherPrecoPorQualidade();
        atualizarVolumePreview();
        return;
    }
    if (grupoManual) grupoManual.style.display = 'none';
    if (inputManual) inputManual.value = '';

    const p = produtosDisponiveis.find(x => x.id === e.target.value);
    if (!p) return;

    document.getElementById('v2-espessura').value = p.espessura;
    document.getElementById('v2-largura').value = p.largura;
    document.getElementById('v2-comprimento').value = p.comprimentoVenda;
    document.getElementById('v2-comprimento-real').value = p.comprimentoReal || p.comprimentoVenda;
    aplicarClasseRomaneio(p.classe || p.qualidade);
    const especieMadeira = document.getElementById('v2-especie');
    const especieProduto = (p.especie || p.natureza || '').toUpperCase();
    if (especieMadeira && especieProduto) especieMadeira.value = especieProduto;
    
    // Ao selecionar produto, verificar se já tem qualidade preenchida e tentar preencher preço
    preencherPrecoPorQualidade();
    atualizarVolumePreview();
}

// Preenche o Preço m³ automaticamente com base na qualidade selecionada e cliente
function obterClasseRomaneio() {
    const classe = document.getElementById('v2-qualidade')?.value || '1a CLASSE';
    if (classe === 'OUTRO') {
        return (document.getElementById('v2-classe-outro')?.value || 'OUTRO').toUpperCase().trim();
    }
    return classe;
}

function atualizarVisualClasseRomaneio() {
    const select = document.getElementById('v2-qualidade');
    const grupoOutro = document.getElementById('grupoV2ClasseOutro');
    if (!select) return;
    select.classList.remove('patio-classe-1', 'patio-classe-2', 'patio-classe-3');
    if (select.value.includes('1')) select.classList.add('patio-classe-1');
    else if (select.value.includes('2')) select.classList.add('patio-classe-2');
    else if (select.value.includes('3')) select.classList.add('patio-classe-3');
    if (grupoOutro) grupoOutro.style.display = select.value === 'OUTRO' ? 'flex' : 'none';
}

function formatarClasseMadeira(valor) {
    const texto = String(valor || '').toUpperCase();
    if (texto.includes('1')) return '1° CLASSE';
    if (texto.includes('2')) return '2° CLASSE';
    if (texto.includes('3')) return '3° CLASSE';
    return texto || '-';
}

function coresClasseMadeira(valor) {
    const texto = String(valor || '').toUpperCase();
    if (texto.includes('1')) return { color: '#16a34a', bg: '#ecfdf3' };
    if (texto.includes('2')) return { color: '#d97706', bg: '#fff7db' };
    if (texto.includes('3')) return { color: '#dc2626', bg: '#fff1f2' };
    return { color: '#e5e7eb', bg: '#111827' };
}

function formatarNumeroMadeiraOption(valor, casas = 1) {
    const numero = Number(valor) || 0;
    return numero.toFixed(casas).replace('.', ',');
}

function formatarMedidasMadeiraOption(p) {
    return `${formatarNumeroMadeiraOption(p.espessura, 1)}/${formatarNumeroMadeiraOption(p.largura, 1)}/${formatarNumeroMadeiraOption(p.comprimentoVenda, 2)}`;
}

function aplicarClasseRomaneio(valor) {
    const texto = String(valor || '').toUpperCase().trim();
    const select = document.getElementById('v2-qualidade');
    const outro = document.getElementById('v2-classe-outro');
    if (!select || !texto) return;

    if (texto.includes('1')) {
        select.value = '1a CLASSE';
        if (outro) outro.value = '';
    } else if (texto.includes('2')) {
        select.value = '2a CLASSE';
        if (outro) outro.value = '';
    } else if (texto.includes('3')) {
        select.value = '3a CLASSE';
        if (outro) outro.value = '';
    } else {
        select.value = 'OUTRO';
        if (outro) outro.value = texto;
    }

    atualizarVisualClasseRomaneio();
}

function madeiraManualAtiva() {
    return document.getElementById('v2-select-produto')?.value === '__manual__';
}

function obterNomeMadeiraRomaneio(prod) {
    if (madeiraManualAtiva()) {
        return (document.getElementById('v2-produto-manual')?.value || '').toUpperCase().trim();
    }
    return prod?.tipo || '';
}

function preencherPrecoPorQualidade() {
    const qualStr = obterClasseRomaneio();
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
    const esp = parseNumeroBR(document.getElementById('v2-espessura')?.value);
    const larg = parseNumeroBR(document.getElementById('v2-largura')?.value);
    const comp = parseNumeroBR(document.getElementById('v2-comprimento')?.value);
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
    const manual = madeiraManualAtiva();
    const qualidade = obterClasseRomaneio();
    const especie = document.getElementById('v2-especie')?.value || '';
    const precoM3 = window.parseCurrencyValue(document.getElementById('v2-preco-m3-item').value) || 0;
    const qtdPacotes = parseInt(document.getElementById('v2-qtd-pacotes').value) || 1;
    const itemPatio = obterItemPatioSelecionadoRomaneio();

    if (itemPatio) {
        const jaReservados = romaneioAtual.pacotes
            .filter(p => p.origemPatio && p.patioRelatorioId === patioRelatorioRomaneio?.id && p.patioCubagemKey === chavePatioRomaneio(itemPatio))
            .reduce((total, p) => total + Number(p.patioQtdPacotes || p.qtdPacotes || 0), 0);
        const saldoDisponivel = Number(itemPatio.pacotes || 0) - jaReservados;
        if (qtdPacotes > saldoDisponivel) {
            alert(`Quantidade acima do saldo do patio. Disponivel para este romaneio: ${Math.max(0, saldoDisponivel)} pacote(s).`);
            return;
        }
    }
    
    const esp = parseNumeroBR(document.getElementById('v2-espessura').value);
    const larg = parseNumeroBR(document.getElementById('v2-largura').value);
    const compV = parseNumeroBR(document.getElementById('v2-comprimento').value);
    const compR = parseNumeroBR(document.getElementById('v2-comprimento-real').value) || compV;
    const pecasPorPacote = parseInt(document.getElementById('v2-quantidade').value) || 0;

    const prod = manual ? null : produtosDisponiveis.find(x => x.id === prodId);
    const nomeMadeira = obterNomeMadeiraRomaneio(prod);

    if ((!prodId || (!manual && !prod) || (manual && !nomeMadeira)) || pecasPorPacote <= 0) {
        alert("Selecione a madeira cadastrada ou informe a madeira manual, e informe a quantidade de pecas.");
        return;
    }

    const alt = parseInt(document.getElementById('v2-altura').value) || 0;
    const cam = parseInt(document.getElementById('v2-camada').value) || 0;
    const amarras = parseInt(document.getElementById('v2-amarras').value) || 0;
    const configPct = (alt > 0 || cam > 0) ? `${alt}x${cam}${amarras > 0 ? '+'+amarras : ''}` : '-';

    const m3VendaUnit = ( (esp/100) * (larg/100) * compV ) * pecasPorPacote;
    const m3FreteUnit = ( (esp/100) * (larg/100) * compR ) * pecasPorPacote;

    const novoPacote = {
        id: Date.now(),
        produtoId: manual ? null : prodId,
        produtoManual: manual,
        produtoNome: nomeMadeira,
        qualidade: qualidade.toUpperCase(),
        especie,
        medidas: `${esp.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} / ${larg.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} / ${compV.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}m`,
        esp, larg, compV, compR,
        pecasPorPacote,
        alt, cam, amarras, configPct,
        qtdPacotes,
        precoM3,
        origemPatio: !!itemPatio,
        patioRelatorioId: itemPatio ? patioRelatorioRomaneio?.id : null,
        patioItemId: itemPatio ? itemPatio.id : null,
        patioItemIds: itemPatio ? (itemPatio.patioItemIds || [itemPatio.id]) : [],
        patioQtdPacotes: itemPatio ? qtdPacotes : 0,
        patioCubagemKey: itemPatio ? chavePatioRomaneio(itemPatio) : null,
        m3VendaTotal: parseFloat((m3VendaUnit * qtdPacotes).toFixed(3)),
        m3FreteTotal: parseFloat((m3FreteUnit * qtdPacotes).toFixed(3)),
        valorTotalWood: parseFloat((m3VendaUnit * qtdPacotes * precoM3).toFixed(2))
    };

    romaneioAtual.pacotes.push(novoPacote);
    atualizarTotalGeral();
    renderizarTabelaPacotes();
    
    if (confirm("Deseja adicionar outro pacote com a mesma cubagem (espessura, largura, comprimento), preço e classe?\n\n[OK] = Mantém os dados para informar nova quantidade\n[Cancelar] = Limpa todos os campos")) {
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
    
    document.getElementById('v2-select-produto').value = p.produtoManual || !p.produtoId ? '__manual__' : p.produtoId;
    const grupoManual = document.getElementById('grupoV2MadeiraManual');
    const inputManual = document.getElementById('v2-produto-manual');
    if (grupoManual) grupoManual.style.display = (p.produtoManual || !p.produtoId) ? 'flex' : 'none';
    if (inputManual) inputManual.value = (p.produtoManual || !p.produtoId) ? (p.produtoNome || '') : '';
    const classeSalva = p.qualidade || '1a CLASSE';
    const classePadrao = ['1a CLASSE', '2a CLASSE', '3a CLASSE'].includes(classeSalva) ? classeSalva : 'OUTRO';
    document.getElementById('v2-qualidade').value = classePadrao;
    const classeOutro = document.getElementById('v2-classe-outro');
    if (classeOutro) classeOutro.value = classePadrao === 'OUTRO' ? classeSalva : '';
    atualizarVisualClasseRomaneio();
    const especie = document.getElementById('v2-especie');
    if (especie) especie.value = p.especie || 'EUCALIPTO';
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
    const manual = madeiraManualAtiva();
    const qualidade = obterClasseRomaneio().toUpperCase();
    const especie = document.getElementById('v2-especie')?.value || '';
    const precoM3 = window.parseCurrencyValue(document.getElementById('v2-preco-m3-item').value) || 0;
    const qtdPacotes = parseInt(document.getElementById('v2-qtd-pacotes').value) || 1;
    const pacoteOriginal = romaneioAtual.pacotes.find(x => x.id === pacoteEditandoId);
    const itemPatio = obterItemPatioSelecionadoRomaneio()
        || (pacoteOriginal?.origemPatio ? patioItensDisponiveis.find(item => chavePatioRomaneio(item) === pacoteOriginal.patioCubagemKey) : null);
    const pecasPorPacote = parseInt(document.getElementById('v2-quantidade').value) || 0;
    const esp = parseNumeroBR(document.getElementById('v2-espessura').value);
    const larg = parseNumeroBR(document.getElementById('v2-largura').value);
    const compV = parseNumeroBR(document.getElementById('v2-comprimento').value);
    const compR = parseNumeroBR(document.getElementById('v2-comprimento-real').value) || compV;

    const prod = manual ? null : produtosDisponiveis.find(x => x.id === prodId);
    const nomeMadeira = obterNomeMadeiraRomaneio(prod);
    if ((!prodId || (!manual && !prod) || (manual && !nomeMadeira)) || pecasPorPacote <= 0) {
        alert("Selecione a madeira cadastrada ou informe a madeira manual, e informe a quantidade de pecas.");
        return;
    }

    if (itemPatio) {
        const outrosReservados = romaneioAtual.pacotes
            .filter(p => p.id !== pacoteEditandoId && p.origemPatio && p.patioCubagemKey === chavePatioRomaneio(itemPatio))
            .reduce((total, p) => total + Number(p.patioQtdPacotes || p.qtdPacotes || 0), 0);
        const disponivel = Number(itemPatio.pacotes || 0) - outrosReservados;
        if (qtdPacotes > disponivel) {
            alert(`Saldo insuficiente no patio. Disponivel para este item: ${Math.max(0, disponivel)} pacote(s).`);
            return;
        }
    }

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
            produtoId: manual ? null : prodId,
            produtoManual: manual,
            produtoNome: nomeMadeira,
            qualidade,
            especie,
            medidas: `${esp.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} / ${larg.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} / ${compV.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}m`,
            esp, larg, compV, compR,
            pecasPorPacote,
            alt, cam, amarras, configPct,
            qtdPacotes,
        precoM3,
        origemPatio: !!itemPatio,
        patioRelatorioId: itemPatio ? patioRelatorioRomaneio?.id : null,
        patioItemId: itemPatio ? itemPatio.id : null,
        patioItemIds: itemPatio ? (itemPatio.patioItemIds || [itemPatio.id]) : [],
        patioQtdPacotes: itemPatio ? qtdPacotes : 0,
        patioCubagemKey: itemPatio ? chavePatioRomaneio(itemPatio) : null,
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
    romaneioAtual.financeiro.baseNF = romaneioAtual.financeiro.baseNF || 'INTEIRA';
    
    romaneioAtual.logistica.adicionalFrete = addFrete;
    romaneioAtual.logistica.obsFrete = document.getElementById('v2-obs-frete')?.value || '';

    romaneioAtual.observacaoCarga = document.getElementById('v2-obs-carga')?.value || '';

    totalFrete += addFrete;
    const totalMadeiraComAjuste = totalMadeira + addMadeira;

    const taxaStr = (document.getElementById('v2-taxa-nf')?.value || "0").toString().replace(',', '.');
    const taxa = parseFloat(taxaStr) || 0;
    const baseNF = romaneioAtual.financeiro.baseNF === 'MEIA' ? totalMadeiraComAjuste / 2 : totalMadeiraComAjuste;
    const imposto = baseNF * (taxa / 100);
    
    romaneioAtual.financeiro.totalGeral = totalMadeiraComAjuste + imposto;
    romaneioAtual.financeiro.taxaNF = taxa;
    romaneioAtual.logistica.valorFrete = valorFreteUnit;
    romaneioAtual.numero = parseInt(document.getElementById('v2-numero-ordem').value) || 0;
    
    renderizarResumoFinanceiro(totalFrete, totalM3Frete, totalPacotes, totalPecasGeral, totalMadeira, addMadeira, imposto, totalMadeiraComAjuste, baseNF);
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
    const baseNF = r.financeiro?.baseNF === 'MEIA' ? (totalMadeira + adicionalMadeira) / 2 : (totalMadeira + adicionalMadeira);
    const imposto = baseNF * (taxa / 100);
    const subtotalLiquido = totalMadeira + adicionalMadeira + imposto;
    const valorFrete = Number(r.logistica?.valorFrete || 0);
    const freteBruto = totalM3Frete * valorFrete;
    const freteFinal = freteBruto + Number(r.logistica?.adicionalFrete || 0);
    const totalCarga = Number(r.financeiro?.totalGeral || subtotalLiquido);
    return { emitente, clienteObj, romaneio: r, pacotes, totalPcts, totalPcs, totalM3Madeira, totalMadeira, totalM3Frete, taxa, baseNF, imposto, subtotalLiquido, valorFrete, freteBruto, freteFinal, totalCarga };
}

function gerarHtmlDocumentoRomaneio(payload) {
    const { emitente, clienteObj, romaneio: r, pacotes, totalPcts, totalPcs, totalM3Madeira, totalMadeira, totalM3Frete, taxa, baseNF, imposto, subtotalLiquido, valorFrete, freteBruto, freteFinal, totalCarga } = payload;
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
        <div class="doc-header"><div><img src="logo.png" alt="${(emitente.nomeFantasia || 'VANMARTE').toUpperCase()}" class="doc-logo" onerror="this.style.display='none'"><div style="margin-top:10px; color:#334155; font-size:13px;"><strong>${emitente.nomeFantasia || emitente.nome || 'SERRARIA VANMARTE'}</strong><br>${emitente.cnpj ? `CNPJ: ${emitente.cnpj}<br>` : ''}${(emitente.logradouro || '')} ${(emitente.numero || '')}<br>${emitente.cidade || ''}</div></div><div class="doc-title"><h1>${r.cliente || 'Comprador'} - Carga ${r.numero || r.numeroCarga || '-'}</h1><p><strong>Romaneio de Carga</strong></p><p>Emitido em ${new Date().toLocaleString('pt-BR')}</p></div></div>
        <div style="display:grid; grid-template-columns:1.15fr .85fr; gap:8px; margin-bottom:10px; font-size:12px;">
            <div style="border:1px solid #cbd5e1; border-radius:6px; padding:9px 11px;"><strong style="color:#0f766e;">COMPRADOR</strong><div style="margin-top:5px;"><b>${r.cliente || '-'}</b> | ${clienteObj.cnpj || clienteObj.cpf || '-'} | ${clienteObj.cidade || '-'}</div>${r.formaPagamento ? `<div>Pagamento: ${r.formaPagamento} ${r.prazoPagamento ? `(${r.prazoPagamento})` : ''}</div>` : ''}${r.observacaoCliente ? `<div>Obs.: ${r.observacaoCliente}</div>` : ''}</div>
            <div style="border:1px solid #cbd5e1; border-radius:6px; padding:9px 11px;"><strong style="color:#1d4ed8;">LOGISTICA</strong><div style="margin-top:5px;">Carreg.: ${r.logistica?.dataCarregamento || '-'} | Descarreg.: ${r.logistica?.dataDescarregamento || '-'}</div><div>${r.logistica?.motorista || '-'} | ${r.logistica?.caminhao || '-'} | ${r.logistica?.placa || '-'}</div><div>Transporte: ${r.logistica?.responsavelFrete || '-'}</div></div>
        </div>
        ${pacotesHtml}
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:10px;"><div style="padding:11px; border-radius:6px; background:#f1f5f9; text-align:center;"><small>PACOTES</small><strong style="display:block; font-size:22px;">${totalPcts}</strong></div><div style="padding:11px; border-radius:6px; background:#f1f5f9; text-align:center;"><small>PECAS</small><strong style="display:block; font-size:22px;">${totalPcs}</strong></div><div style="padding:11px; border-radius:6px; background:#ecfdf5; text-align:center;"><small>VOLUME</small><strong style="display:block; font-size:22px; color:#047857;">${totalM3Madeira.toFixed(3)} m3</strong></div></div>
        <div style="margin-top:8px; border:1px solid #cbd5e1; border-radius:6px; padding:10px 12px; font-size:12px;"><strong style="color:#0f172a;">RESUMO FINANCEIRO</strong><div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:7px;"><div>Madeira<br><b>R$ ${totalMadeira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div><div>Taxa NF (${taxa}%)<br><b>R$ ${imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div><div>Frete<br><b style="color:#1d4ed8;">R$ ${freteFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div><div>Total da carga<br><b style="color:#047857; font-size:16px;">R$ ${totalCarga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div></div>${r.financeiro?.baseNF === 'MEIA' ? `<div style="margin-top:6px;">Base NF meia carga: R$ ${baseNF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>` : ''}</div>
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
        const docName = window.DocActions.buildDocumentName([window.romaneioDocumentoAtual.romaneio.cliente, `carga ${window.romaneioDocumentoAtual.romaneio.numero || ''}`]);
        window.DocActions.printHtml({ title: docName, contentHtml: gerarHtmlDocumentoRomaneio(window.romaneioDocumentoAtual) });
    },
    pdf() {
        if (!window.romaneioDocumentoAtual) return window.Promise?.resolve?.();
        const docName = window.DocActions.buildDocumentName([window.romaneioDocumentoAtual.romaneio.cliente, `carga ${window.romaneioDocumentoAtual.romaneio.numero || ''}`]);
        return window.DocActions.downloadPdf({ title: docName, filename: docName, contentHtml: gerarHtmlDocumentoRomaneio(window.romaneioDocumentoAtual) });
    },
    whatsapp() {
        if (!window.romaneioDocumentoAtual) return window.Promise?.resolve?.();
        const phone = window.romaneioDocumentoAtual.clienteObj?.contato || window.romaneioDocumentoAtual.clienteObj?.telefone || '';
        const docName = window.DocActions.buildDocumentName([window.romaneioDocumentoAtual.romaneio.cliente, `carga ${window.romaneioDocumentoAtual.romaneio.numero || ''}`]);
        return window.DocActions.sendWhatsApp({ title: docName, filename: docName, phone, message: `Segue o romaneio ${docName} da madeira serrada.`, contentHtml: gerarHtmlDocumentoRomaneio(window.romaneioDocumentoAtual) });
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
    const numeroClasseRomaneio = (valor) => {
        const texto = String(valor || '').toUpperCase();
        if (texto.includes('1')) return 1;
        if (texto.includes('2')) return 2;
        if (texto.includes('3')) return 3;
        return 99;
    };
    const ordenarPorCubagem = (lista) => [...lista].sort((a, b) => {
        return numeroClasseRomaneio(a.qualidade) - numeroClasseRomaneio(b.qualidade)
            || (Number(b.compV) || 0) - (Number(a.compV) || 0)
            || (Number(b.esp) || 0) - (Number(a.esp) || 0)
            || (Number(b.larg) || 0) - (Number(a.larg) || 0)
            || (b.pecasPorPacote || 0) - (a.pecasPorPacote || 0);
    });
    const montarMedidaRomaneio = (p, primeiraCubagem, cor) => {
        const config = `${p.configPct || '-'} = ${p.pecasPorPacote || 0} pç`;
        const configHtml = `
            <div style="display:grid; grid-template-columns:22px 1fr; align-items:center; gap:6px; margin-top:${primeiraCubagem ? '5px' : '0'}; color:#f8fafc; font-size:0.78rem; font-weight:800; white-space:nowrap;">
                <span style="text-align:center;">*</span>
                <span>${config}</span>
            </div>
        `;
        if (!primeiraCubagem) return configHtml;
        return `
            <div style="font-weight:900; color:${cor}; font-size:0.95rem; white-space:nowrap;">${p.medidas}</div>
            ${configHtml}
        `;
    };
    const grupos = {};
    romaneioAtual.pacotes.forEach(p => {
        if (!grupos[p.qualidade]) grupos[p.qualidade] = { itens: [], subtotalM3: 0, subtotalValor: 0 };
        grupos[p.qualidade].itens.push(p);
        grupos[p.qualidade].subtotalM3 += p.m3VendaTotal;
        grupos[p.qualidade].subtotalValor += p.valorTotalWood;
    });
    let html = '';
    const qualidadesOrdenadas = Object.keys(grupos).sort((a, b) => numeroClasseRomaneio(a) - numeroClasseRomaneio(b) || a.localeCompare(b));
    for (const qual of qualidadesOrdenadas) {
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
                                <th>Total Pçs</th>
                                <th>m³ Venda</th>
                                <th>V. Unit.</th>
                                <th>Preço m³</th>
                                <th>Subtotal</th>
                                <th class="hide-on-print">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
                                let ultimaCubagem = '';
                                return ordenarPorCubagem(g.itens).map(p => {
                                    const cubagemAtual = `${p.produtoNome || ''}|${p.medidas || ''}`;
                                    const primeiraCubagem = cubagemAtual !== ultimaCubagem;
                                    ultimaCubagem = cubagemAtual;
                                    return `
                                        <tr>
                                            <td>${primeiraCubagem ? `<strong>${p.produtoNome}</strong><br>` : ''}${montarMedidaRomaneio(p, primeiraCubagem, cor)}</td>
                                            <td>${p.qtdPacotes}</td>
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
                                    `;
                                }).join('');
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderizarResumoFinanceiro(valFrete, volFrete, totalPacotes, totalPecasGeral, totalMadeira, addMadeira, imposto, totalMadeiraComAjuste, baseNF = totalMadeiraComAjuste) {
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
                ${romaneioAtual.financeiro.baseNF === 'MEIA' ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-muted);">Base NF meia carga:</span>
                    <span>R$ ${baseNF.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>` : ''}
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
                await validarSaldoPatioRomaneio(romaneioAtual.pacotes, antigo.pacotes || []);
                if (antigo.pacotes) {
                    await ajustarPacotesPatioRomaneio(antigo.pacotes, 1);
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
            await ajustarPacotesPatioRomaneio(romaneioAtual.pacotes, -1, { numero: romaneioAtual.numero, cliente });
            
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
            await validarSaldoPatioRomaneio(romaneioAtual.pacotes);
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
            await ajustarPacotesPatioRomaneio(romaneioAtual.pacotes, -1, { numero: romaneioAtual.numero, cliente });
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
        carregarPatioParaRomaneio();
        
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
                    <th>Classe</th>
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
    const baseNF = r.financeiro?.baseNF === 'MEIA' ? (totalMadeira + (r.financeiro.adicionalMadeira || 0)) / 2 : (totalMadeira + (r.financeiro.adicionalMadeira || 0));
    const imposto = baseNF * (taxa / 100);
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
    const selectPatio = document.getElementById('v2-select-patio');
    if (selectPatio) selectPatio.value = '';
    const qtdPacotes = document.getElementById('v2-qtd-pacotes');
    if (qtdPacotes) qtdPacotes.removeAttribute('max');
    const saldoPatio = document.getElementById('v2-saldo-patio');
    if (saldoPatio) {
        saldoPatio.style.display = 'none';
        saldoPatio.textContent = '';
    }
    const grupoManual = document.getElementById('grupoV2MadeiraManual');
    if (grupoManual) grupoManual.style.display = 'none';
    const inputManual = document.getElementById('v2-produto-manual');
    if (inputManual) inputManual.value = '';
    const classeOutro = document.getElementById('v2-classe-outro');
    if (classeOutro) classeOutro.value = '';
    atualizarVisualClasseRomaneio();
    // Resetar preview de volume
    const elUnit = document.getElementById('v2-volume-unit');
    const elTotal = document.getElementById('v2-volume-total');
    if (elUnit) elUnit.textContent = '0,000 m³';
    if (elTotal) elTotal.textContent = '0,000 m³';
}

// CHAMADA IMEDIATA
prepararInterface();
