import { db, auth, onAuthStateChanged, collection, addDoc, getDocs, query, where, orderBy, limit, doc, getDoc, updateDoc } from './firebase-init.js';

console.log("Romaneio V2: Script carregado");

// Estado global do romaneio atual
let romaneioAtual = {
    numero: 0,
    cliente: '',
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
    const hj = new Date().toISOString().split('T')[0];
    const inputData = document.getElementById('v2-data-carreg');
    if (inputData) {
        inputData.value = hj;
        console.log("Romaneio V2: Data automática definida para " + hj);
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

    const selectProd = document.getElementById('v2-select-produto');
    if (selectProd) selectProd.onchange = selecionarMadeiraCadastrada;

    const selectCli = document.getElementById('v2-select-cliente');
    if (selectCli) selectCli.onchange = selecionarClienteCadastrado;

    const selectTransp = document.getElementById('v2-select-transporte');
    if (selectTransp) selectTransp.onchange = selecionarTransportadoraCadastrada;

    ['v2-taxa-nf', 'v2-valor-frete', 'v2-adicional-madeira', 'v2-adicional-frete', 'v2-obs-madeira', 'v2-obs-frete'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = atualizarTotalGeral;
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
    if (!cli) return;

    document.getElementById('v2-cliente').value = cli.nome;
    
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
            if (ultimo.financeiro && ultimo.financeiro.taxaNF) {
                document.getElementById('v2-taxa-nf').value = ultimo.financeiro.taxaNF;
            }
            if (ultimo.logistica && ultimo.logistica.valorFrete) {
                document.getElementById('v2-valor-frete').value = ultimo.logistica.valorFrete;
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
    document.getElementById('v2-preco-m3-item').value = p.preco || 0;
}

function calcularPecasAutomatico() {
    const alt = parseInt(document.getElementById('v2-altura').value) || 0;
    const cam = parseInt(document.getElementById('v2-camada').value) || 0;
    const amarras = parseInt(document.getElementById('v2-amarras').value) || 0;
    document.getElementById('v2-quantidade').value = (alt * cam) + amarras;
}

function adicionarPacote() {
    const prodId = document.getElementById('v2-select-produto').value;
    const qualidade = document.getElementById('v2-qualidade').value || 'Padrão';
    const precoM3 = parseFloat(document.getElementById('v2-preco-m3-item').value) || 0;
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
        medidas: `${esp}x${larg}x${compV}m`,
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
    limparCamposPacote();
}

function editarPacoteV2(id) {
    const p = romaneioAtual.pacotes.find(x => x.id === id);
    if (!p) return;

    pacoteEditandoId = id;
    
    document.getElementById('v2-select-produto').value = p.produtoId || '';
    document.getElementById('v2-qualidade').value = p.qualidade || '';
    document.getElementById('v2-preco-m3-item').value = p.precoM3;
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
    const precoM3 = parseFloat(document.getElementById('v2-preco-m3-item').value) || 0;
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
            medidas: `${esp}x${larg}x${compV}m`,
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

    const valorFreteUnit = parseFloat(document.getElementById('v2-valor-frete').value) || 0;
    let totalFrete = totalM3Frete * valorFreteUnit;
    
    const addMadeira = parseFloat(document.getElementById('v2-adicional-madeira')?.value) || 0;
    const addFrete = parseFloat(document.getElementById('v2-adicional-frete')?.value) || 0;
    
    romaneioAtual.financeiro.adicionalMadeira = addMadeira;
    romaneioAtual.financeiro.obsMadeira = document.getElementById('v2-obs-madeira')?.value || '';
    
    romaneioAtual.logistica.adicionalFrete = addFrete;
    romaneioAtual.logistica.obsFrete = document.getElementById('v2-obs-frete')?.value || '';

    totalFrete += addFrete;
    const totalMadeiraComAjuste = totalMadeira + addMadeira;

    const taxa = parseFloat(document.getElementById('v2-taxa-nf')?.value) || 0;
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
                    <button onclick="verPreviaRomaneioV2()" class="btn-v2" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid var(--border); flex: 1; max-width: 200px;">
                        <i class="fa-solid fa-eye"></i> Prévia
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

window.finalizarRomaneioV2 = async () => {
    const cliente = document.getElementById('v2-cliente').value;
    if (!cliente || romaneioAtual.pacotes.length === 0) { alert("Dados incompletos."); return; }
    
    try {
        await addDoc(collection(db, "romaneios"), {
            ...romaneioAtual,
            cliente,
            dataCriacao: new Date().toISOString(),
            status: 'finalizado'
        });
        
        for (const p of romaneioAtual.pacotes) {
            if (p.produtoId) {
                const totalPecasVendidas = (p.pecasPorPacote || 0) * (p.qtdPacotes || 1);
                const docRef = doc(db, "produtos", p.produtoId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const novoEstoque = Math.max(0, (docSnap.data().quantidade || 0) - totalPecasVendidas);
                    await updateDoc(docRef, { quantidade: novoEstoque });
                }
            }
        }
        // Mostrar modal de sucesso ou aviso melhor que alert
        alert(`Romaneio ${romaneioAtual.numero} salvo com sucesso no Firebase!`);
        
        // Resetar estado sem recarregar a página inteira (SPA style)
        romaneioAtual.pacotes = [];
        romaneioAtual.numero = `ROM-${Date.now().toString().slice(-6)}`;
        if (document.getElementById('v2-numero-ordem')) document.getElementById('v2-numero-ordem').value = romaneioAtual.numero;
        
        atualizarTotalGeral();
        renderizarTabelaPacotes();
        limparCamposPacote();
        
        // Disparar evento para atualizar dashboard/historico se estiverem abertos
        document.dispatchEvent(new Event('historicoUpdated'));
        
    } catch (e) { 
        console.error("Erro ao salvar romaneio:", e);
        alert("Erro ao salvar romaneio. Verifique o console.");
    } finally {
        const btn = document.querySelector('button[onclick="finalizarRomaneioV2()"]');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> FINALIZAR E SALVAR CARGA';
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
    
    // Gerar HTML da prévia
    const clienteId = document.getElementById('v2-select-cliente').value;
    const clienteObj = clientesDisponiveis.find(c => c.id === clienteId) || {};
    const cnpj = clienteObj.cnpj || clienteObj.cpf || '-';
    const cidade = clienteObj.cidade || '-';

    const r = {
        ...romaneioAtual,
        cliente: document.getElementById('v2-cliente').value || 'Cliente Não Selecionado',
        logistica: {
            ...romaneioAtual.logistica,
            dataCarregamento: document.getElementById('v2-data-carreg').value,
            motorista: document.getElementById('v2-motorista').value,
            caminhao: document.getElementById('v2-caminhao').value,
            placa: document.getElementById('v2-placa').value
        }
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
    r.pacotes.forEach(p => { totalPcts += p.qtdPacotes; totalPcs += (p.pecasPorPacote * p.qtdPacotes); });

    let adjMadHtml = r.financeiro.adicionalMadeira ? `<br><small>Ajuste Madeira: R$ ${r.financeiro.adicionalMadeira.toLocaleString('pt-BR', {minimumFractionDigits: 2})} ${r.financeiro.obsMadeira ? `(${r.financeiro.obsMadeira})` : ''}</small>` : '';
    let adjFreteHtml = r.logistica.adicionalFrete ? `<br><small>Ajuste Frete: R$ ${r.logistica.adicionalFrete.toLocaleString('pt-BR', {minimumFractionDigits: 2})} ${r.logistica.obsFrete ? `(${r.logistica.obsFrete})` : ''}</small>` : '';

    conteudo.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
            <div>
                <!-- O usuário enviará a logo, que deve ser salva na raiz como logo.png ou logo.jpg e referenciada aqui -->
                <img src="logo.png" alt="Logo Serraria" style="max-height: 80px; max-width: 250px; display: block;" onerror="this.style.display='none'">
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
            </div>
            <div>
                <p style="margin-bottom: 8px; font-weight: bold; font-size: 1rem; text-transform: uppercase;">Dados Logísticos</p>
                <p><strong>Data Carreg.:</strong> ${r.logistica.dataCarregamento}</p>
                <p><strong>Motorista:</strong> ${r.logistica.motorista || '-'}</p>
                <p><strong>Caminhão / Placa:</strong> ${r.logistica.caminhao || '-'} / ${r.logistica.placa || '-'}</p>
            </div>
        </div>
        <div style="margin-top: 15px; display: flex; justify-content: space-between; color: black;">
            <p><strong>Total de Pacotes:</strong> ${totalPcts} pcts</p>
            <p><strong>Total de Peças:</strong> ${totalPcs} pçs</p>
        </div>
        ${pacotesHtml}
        <div style="margin-top: 20px; text-align: right; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ccc; color: black;">
            <p style="font-size: 1.2rem; font-weight: 800; margin: 0;">TOTAL DO ROMANEIO: R$ ${r.financeiro.totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <small>Taxa NF: ${r.financeiro.taxaNF}% | Frete Base: R$ ${r.logistica.valorFrete}/m³</small>
            ${adjMadHtml}
            ${adjFreteHtml}
        </div>
        <div class="show-on-print" style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
            <div style="border-top: 1px solid black; text-align:center; padding-top: 5px; color: black;">Assinatura do Motorista</div>
            <div style="border-top: 1px solid black; text-align:center; padding-top: 5px; color: black;">Assinatura do Recebedor</div>
        </div>
        <div class="show-on-print" style="text-align: center; margin-top: 40px; font-size: 0.65rem; color: #777;">
            Desenvolvido por: Orquestra.cs - sistemas personalizados
        </div>
    `;
};

window.fecharModalDetalhes = () => {
    document.getElementById('modalDetalhesRomaneio').style.display = 'none';
};

function limparCamposPacote() {
    ['v2-altura', 'v2-camada', 'v2-amarras', 'v2-quantidade', 'v2-qtd-pacotes', 'v2-preco-m3-item', 'v2-qualidade', 'v2-espessura', 'v2-largura', 'v2-comprimento', 'v2-comprimento-real'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'v2-qtd-pacotes' ? 1 : '');
    });
    const selectProd = document.getElementById('v2-select-produto');
    if (selectProd) selectProd.value = '';
}

// CHAMADA IMEDIATA
prepararInterface();
