import { db, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from './firebase-init.js';

// --- Ferramentas Auxiliares / Calculadoras ---

// 1. Cubagem Rápida
const btnCalcCub = document.getElementById('btnCalcCub');
const resultadoCub = document.getElementById('resultadoCub');

// Forçar letras maiúsculas em tempo real nos campos de subprodutos (Cavaco/Pó)
['calcCavRomaneio', 'calcCavCliente', 'calcCavMotorista', 'subCliNome', 'subCliIE', 'subCliLogradouro', 'subCliCidadeEstado', 'subCliCaminhao', 'subCliPlacaCaminhao', 'subCliPlacaCarreta', 'calcCavRomaneioCliente', 'calcCavCaminhao', 'calcCavPlacaCaminhao', 'calcCavPlacaCarreta'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', window.forceUppercaseInput);
    }
});

if (btnCalcCub) {
    btnCalcCub.addEventListener('click', function () {
        const esp = parseFloat(document.getElementById('calcEsp').value) || 0;
        const lar = parseFloat(document.getElementById('calcLar').value) || 0;
        const comp = parseFloat(document.getElementById('calcComp').value) || 0;
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
}

// 2. Consumo de Diesel
const btnCalcDiesel = document.getElementById('btnCalcDiesel');
const resultadoDiesel = document.getElementById('resultadoDiesel');

if (btnCalcDiesel) {
    btnCalcDiesel.addEventListener('click', function () {
        const km = parseFloat(document.getElementById('calcKm').value) || 0;
        const media = parseFloat(document.getElementById('calcMedia').value) || 0;
        const preco = window.parseCurrencyValue(document.getElementById('calcPrecoDiesel').value) || 0;

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
}

// 3. Venda de Cavaco / Pó de Serra / Subprodutos
const btnCalcCavaco = document.getElementById('btnCalcCavaco');

let clientesSubprodutosCache = [];
let clienteSubprodutoEditandoId = null;
let caminhoesSubprodutoForm = [];

function normalizarCaminhoesSubproduto(cli = {}) {
    if (Array.isArray(cli.caminhoes) && cli.caminhoes.length) {
        return cli.caminhoes.map(item => ({
            modelo: (item.modelo || '').toUpperCase().trim(),
            placaCaminhao: (item.placaCaminhao || '').toUpperCase().trim(),
            placaCarreta: (item.placaCarreta || '').toUpperCase().trim()
        })).filter(item => item.modelo || item.placaCaminhao || item.placaCarreta);
    }

    const legado = {
        modelo: (cli.caminhao || '').toUpperCase().trim(),
        placaCaminhao: (cli.placaCaminhao || '').toUpperCase().trim(),
        placaCarreta: (cli.placaCarreta || '').toUpperCase().trim()
    };

    return legado.modelo || legado.placaCaminhao || legado.placaCarreta ? [legado] : [];
}

function renderListaCaminhoesSub() {
    const lista = document.getElementById('subCliListaCaminhoes');
    if (!lista) return;

    if (!caminhoesSubprodutoForm.length) {
        lista.innerHTML = '<div style="font-size:0.8rem; color:#94a3b8;">Nenhum caminhão adicional cadastrado.</div>';
        return;
    }

    lista.innerHTML = caminhoesSubprodutoForm.map((item, index) => `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; padding:10px 12px; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(15,23,42,0.35);">
            <div style="font-size:0.85rem; line-height:1.5;">
                <div><strong>${item.modelo || 'Sem modelo'}</strong></div>
                <div>Placa cavalo: ${item.placaCaminhao || '-'}</div>
                <div>Placa carreta: ${item.placaCarreta || '-'}</div>
            </div>
            <button type="button" class="btn-icon" style="color:var(--danger-color);" onclick="window.removerCaminhaoSub(${index})" title="Remover caminhão">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function preencherCaminhaoSelecionadoSub(caminhao) {
    document.getElementById('calcCavCaminhao').value = caminhao?.modelo || '';
    document.getElementById('calcCavPlacaCaminhao').value = caminhao?.placaCaminhao || '';
    document.getElementById('calcCavPlacaCarreta').value = caminhao?.placaCarreta || '';
}

function preencherSeletorCaminhoesSub(cli) {
    const select = document.getElementById('calcCavCaminhaoSelecionado');
    if (!select) return;

    const caminhoes = normalizarCaminhoesSubproduto(cli);
    select.innerHTML = '<option value="">Selecionar caminhão cadastrado</option>';

    caminhoes.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        const partes = [item.modelo, item.placaCaminhao, item.placaCarreta].filter(Boolean);
        option.textContent = partes.join(' | ') || `Caminhão ${index + 1}`;
        select.appendChild(option);
    });

    if (caminhoes.length) {
        select.value = '0';
        preencherCaminhaoSelecionadoSub(caminhoes[0]);
    } else {
        select.value = '';
        preencherCaminhaoSelecionadoSub(null);
    }
}

// --- Gestão de Clientes de Subprodutos (CRUD & Sync) ---

async function carregarClientesSubprodutos() {
    const lista = document.getElementById('listaClientesSubprodutos');
    const select = document.getElementById('calcCavSelectCliente');
    
    if (!lista) return;
    
    try {
        const snap = await getDocs(collection(db, 'clientes_subprodutos'));
        clientesSubprodutosCache = [];
        lista.innerHTML = '';
        
        if (select) {
            select.innerHTML = '<option value="">Preenchimento Manual / Cliente Avulso</option>';
        }
        
        snap.forEach(d => {
            const cli = { id: d.id, ...d.data() };
            clientesSubprodutosCache.push(cli);
            
            // Adicionar ao select
            if (select) {
                const opt = document.createElement('option');
                opt.value = cli.id;
                opt.textContent = cli.nome;
                select.appendChild(opt);
            }
            
            // Adicionar à lista visual
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 10px 8px; font-weight: bold; color: var(--text-color);">${cli.nome}</td>
                <td style="padding: 10px 8px; color: var(--accent-color); font-size: 0.8rem; line-height: 1.4;">
                    Cavaco: R$ ${cli.valorCavaco.toLocaleString('pt-BR', {minimumFractionDigits:2})}<br>
                    Pó: R$ ${cli.valorPo.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                </td>
                <td style="padding: 10px 8px; text-align: right; white-space: nowrap;">
                    <button type="button" class="btn-icon" style="color: var(--primary-color); font-size:1rem; margin-right: 8px;" onclick="window.editarClienteSub('${cli.id}')" title="Editar">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button type="button" class="btn-icon" style="color: var(--danger-color); font-size:1rem;" onclick="window.excluirClienteSub('${cli.id}')" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            lista.appendChild(tr);
        });
    } catch (e) {
        console.error("Erro ao carregar clientes de subprodutos:", e);
    }
}

// Declarar funções no escopo global para que funcionem nos atributos onclick dos elementos
window.editarClienteSub = (id) => {
    const cli = clientesSubprodutosCache.find(x => x.id === id);
    if (!cli) return;
    
    clienteSubprodutoEditandoId = id;
    
    document.getElementById('subCliNome').value = cli.nome;
    document.getElementById('subCliDoc').value = cli.documento;
    document.getElementById('subCliIE').value = cli.ie || 'ISENTO';
    document.getElementById('subCliLogradouro').value = cli.logradouro || '';
    document.getElementById('subCliCidadeEstado').value = cli.cidadeEstado || '';
    
    document.getElementById('subCliValorCavaco').value = window.formatCurrencyValue(cli.valorCavaco);
    document.getElementById('subCliValorPo').value = window.formatCurrencyValue(cli.valorPo);
    document.getElementById('subCliValorCavacoParticular').value = window.formatCurrencyValue(cli.valorCavacoParticular || 0);
    document.getElementById('subCliValorPoParticular').value = window.formatCurrencyValue(cli.valorPoParticular || 0);
    
    caminhoesSubprodutoForm = normalizarCaminhoesSubproduto(cli);
    document.getElementById('subCliCaminhao').value = '';
    document.getElementById('subCliPlacaCaminhao').value = '';
    document.getElementById('subCliPlacaCarreta').value = '';
    renderListaCaminhoesSub();
    
    if (cli.medidas) {
        document.getElementById('subCliAlt').value = cli.medidas.alt || '';
        document.getElementById('subCliLarg').value = cli.medidas.larg || '';
        document.getElementById('subCliComp').value = cli.medidas.comp || '';
    }
    
    const btnSalvar = document.getElementById('btnSalvarClienteSub');
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Cliente';
        btnSalvar.style.background = '#f59e0b';
        btnSalvar.style.color = 'black';
    }
    
    document.getElementById('formClienteSubproduto').scrollIntoView({ behavior: 'smooth' });
};

window.excluirClienteSub = async (id) => {
    const cli = clientesSubprodutosCache.find(x => x.id === id);
    if (!cli) return;
    
    if (await window.confirmarExclusaoComSenha(`Deseja realmente excluir permanentemente o cliente ${cli.nome}?`)) {
        try {
            await deleteDoc(doc(db, 'clientes_subprodutos', id));
            alert("Cliente de subproduto excluído com sucesso!");
            await carregarClientesSubprodutos();
        } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            alert("Erro ao excluir cliente de subprodutos.");
        }
    }
};

// Cadastro de Cliente de Subproduto
const formCliSub = document.getElementById('formClienteSubproduto');
if (formCliSub) {
    formCliSub.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nome = document.getElementById('subCliNome').value.toUpperCase().trim();
        const docNum = document.getElementById('subCliDoc').value.trim();
        const ie = document.getElementById('subCliIE').value.toUpperCase().trim() || 'ISENTO';
        const logradouro = document.getElementById('subCliLogradouro').value.toUpperCase().trim();
        const cidadeEstado = document.getElementById('subCliCidadeEstado').value.toUpperCase().trim();
        
        const valorCavaco = window.parseCurrencyValue(document.getElementById('subCliValorCavaco').value);
        const valorPo = window.parseCurrencyValue(document.getElementById('subCliValorPo').value);
        const valorCavacoParticular = window.parseCurrencyValue(document.getElementById('subCliValorCavacoParticular').value);
        const valorPoParticular = window.parseCurrencyValue(document.getElementById('subCliValorPoParticular').value);
        
        const caminhao = document.getElementById('subCliCaminhao').value.toUpperCase().trim();
        const placaCaminhao = document.getElementById('subCliPlacaCaminhao').value.toUpperCase().trim();
        const placaCarreta = document.getElementById('subCliPlacaCarreta').value.toUpperCase().trim();
        
        const alt = parseFloat(document.getElementById('subCliAlt').value) || 0;
        const larg = parseFloat(document.getElementById('subCliLarg').value) || 0;
        const comp = parseFloat(document.getElementById('subCliComp').value) || 0;
        
        if (!nome || !docNum || valorCavaco <= 0 || valorPo <= 0) {
            alert("Por favor, preencha todos os campos obrigatórios (*)");
            return;
        }
        
        const caminhoes = [
            ...caminhoesSubprodutoForm,
            ...(caminhao || placaCaminhao || placaCarreta ? [{
                modelo: caminhao,
                placaCaminhao,
                placaCarreta
            }] : [])
        ];
        const caminhaoPrincipal = caminhoes[0] || { modelo: '', placaCaminhao: '', placaCarreta: '' };

        const dadosCli = {
            nome,
            documento: docNum,
            ie,
            logradouro,
            cidadeEstado,
            valorCavaco,
            valorPo,
            valorCavacoParticular,
            valorPoParticular,
            caminhao: caminhaoPrincipal.modelo,
            placaCaminhao: caminhaoPrincipal.placaCaminhao,
            placaCarreta: caminhaoPrincipal.placaCarreta,
            caminhoes,
            medidas: { alt, larg, comp }
        };
        
        const btnSalvar = document.getElementById('btnSalvarClienteSub');
        const originalHTML = btnSalvar.innerHTML;
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
        
        try {
            if (clienteSubprodutoEditandoId) {
                await window.FS.updateDoc('clientes_subprodutos', clienteSubprodutoEditandoId, dadosCli);
                alert("Cliente de subproduto atualizado com sucesso!");
                clienteSubprodutoEditandoId = null;
                btnSalvar.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Cliente';
                btnSalvar.style.background = '';
                btnSalvar.style.color = '';
            } else {
                await window.FS.addDoc('clientes_subprodutos', dadosCli);
                alert("Cliente de subproduto cadastrado com sucesso!");
            }
            
            formCliSub.reset();
            caminhoesSubprodutoForm = [];
            renderListaCaminhoesSub();
            await carregarClientesSubprodutos();
        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
            alert("Erro ao cadastrar ou atualizar cliente de subprodutos.");
        } finally {
            btnSalvar.disabled = false;
            if (!clienteSubprodutoEditandoId) {
                btnSalvar.innerHTML = originalHTML;
            }
        }
    });
}

// Busca automática de CNPJ no cadastro de clientes de subprodutos
const subCliDocInput = document.getElementById('subCliDoc');
if (subCliDocInput) {
    subCliDocInput.addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 11) {
            v = v.substring(0, 14);
            v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        } else {
            v = v.substring(0, 11);
            v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }
        e.target.value = v;
    });

    subCliDocInput.addEventListener('blur', async function() {
        let docClean = this.value.replace(/\D/g, '');
        if (docClean.length === 14) {
            const nomeInput = document.getElementById('subCliNome');
            const logradouroInput = document.getElementById('subCliLogradouro');
            const cidadeEstadoInput = document.getElementById('subCliCidadeEstado');

            if (nomeInput) nomeInput.placeholder = "Buscando dados do CNPJ...";
            
            try {
                const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${docClean}`);
                const data = await res.json();
                if (data.razao_social) {
                    if (nomeInput && !nomeInput.value) nomeInput.value = data.razao_social.toUpperCase();
                    
                    let log = (data.logradouro || '').toUpperCase();
                    if (data.numero) log += `, ${data.numero}`;
                    if (data.complemento) log += ` - ${data.complemento.toUpperCase()}`;
                    if (data.bairro) log += ` - ${data.bairro.toUpperCase()}`;
                    
                    if (logradouroInput && !logradouroInput.value) logradouroInput.value = log;
                    
                    let cidEst = "";
                    if (data.municipio) cidEst += data.municipio.toUpperCase();
                    if (data.uf) cidEst += ` / ${data.uf.toUpperCase()}`;
                    
                    if (cidadeEstadoInput && !cidadeEstadoInput.value) cidadeEstadoInput.value = cidEst;
                    
                    const ieInput = document.getElementById('subCliIE');
                    if (ieInput && !ieInput.value) ieInput.value = "ISENTO";
                }
            } catch (e) {
                console.error("Erro ao consultar CNPJ via BrasilAPI:", e);
            } finally {
                if (nomeInput) nomeInput.placeholder = "Nome / Razão Social *";
            }
        }
    });
}

// --- Automação do Emissor de Recibo de Vendas de Subprodutos ---

const selectCavCli = document.getElementById('calcCavSelectCliente');
if (selectCavCli) {
    selectCavCli.addEventListener('change', function() {
        const idSelected = this.value;
        if (!idSelected) {
            // Limpar para avulso
            document.getElementById('calcCavCliente').value = '';
            document.getElementById('calcCavCliente').disabled = false;
            document.getElementById('calcCavDoc').value = '';
            document.getElementById('calcCavIE').value = '';
            document.getElementById('calcCavLogradouro').value = '';
            document.getElementById('calcCavCidadeEstado').value = '';
            
            const selectCaminhao = document.getElementById('calcCavCaminhaoSelecionado');
            if (selectCaminhao) selectCaminhao.innerHTML = '<option value="">Selecionar caminhão cadastrado</option>';
            document.getElementById('calcCavCaminhao').value = '';
            document.getElementById('calcCavPlacaCaminhao').value = '';
            document.getElementById('calcCavPlacaCarreta').value = '';
            const chkParticular = document.getElementById('calcCavCarregamentoParticular');
            if (chkParticular) chkParticular.checked = false;
            
            document.getElementById('calcCavAlt').value = '';
            document.getElementById('calcCavLarg').value = '';
            document.getElementById('calcCavComp').value = '';
            document.getElementById('calcCavCupimAdicional').value = '';
            
            document.getElementById('calcCavQtd').value = '';
            document.getElementById('calcCavValor').value = '';
        } else {
            const cli = clientesSubprodutosCache.find(x => x.id === idSelected);
            if (cli) {
                document.getElementById('calcCavCliente').value = cli.nome;
                document.getElementById('calcCavCliente').disabled = false;
                
                document.getElementById('calcCavDoc').value = cli.documento || '';
                document.getElementById('calcCavIE').value = cli.ie || 'ISENTO';
                document.getElementById('calcCavLogradouro').value = cli.logradouro || '';
                document.getElementById('calcCavCidadeEstado').value = cli.cidadeEstado || '';
                
                preencherSeletorCaminhoesSub(cli);
                
                if (cli.medidas) {
                    document.getElementById('calcCavAlt').value = cli.medidas.alt || '';
                    document.getElementById('calcCavLarg').value = cli.medidas.larg || '';
                    document.getElementById('calcCavComp').value = cli.medidas.comp || '';
                    document.getElementById('calcCavCupimAdicional').value = cli.medidas.cupimAdicional || '';
                }
                
                const chkParticular = document.getElementById('calcCavCarregamentoParticular');
                if (chkParticular) chkParticular.checked = false;
                atualizarPrecoAcordadoCavacoPo(cli);
                calcularCubagemCaminhaoTempoReal();
            }
        }
    });
}

function atualizarPrecoAcordadoCavacoPo(cli) {
    if (!cli) {
        const idSelected = document.getElementById('calcCavSelectCliente')?.value;
        if (idSelected) {
            cli = clientesSubprodutosCache.find(x => x.id === idSelected);
        }
    }
    
    if (!cli) return;
    
    const tipo = document.getElementById('calcCavTipo').value;
    const tipoNormalizado = (tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const valInput = document.getElementById('calcCavValor');
    
    if (valInput) {
        const carregamentoParticular = !!document.getElementById('calcCavCarregamentoParticular')?.checked;
        if (tipoNormalizado === 'Cavaco / Maravalha') {
            const valor = carregamentoParticular && (cli.valorCavacoParticular || 0) > 0 ? cli.valorCavacoParticular : cli.valorCavaco;
            valInput.value = window.formatCurrencyValue(valor);
        } else if (tipoNormalizado === 'Po de Serra') {
            const valor = carregamentoParticular && (cli.valorPoParticular || 0) > 0 ? cli.valorPoParticular : cli.valorPo;
            valInput.value = window.formatCurrencyValue(valor);
        }
    }
}

// Ouvintes de alteração automática de preços ao trocar o tipo de produto
const selectCavTipoInput = document.getElementById('calcCavTipo');
if (selectCavTipoInput) {
    selectCavTipoInput.addEventListener('change', function() {
        atualizarPrecoAcordadoCavacoPo();
    });
}

// Função de Cubagem Automática em Tempo Real (ALT x LARG x COMP)
function calcularCubagemCaminhaoTempoReal() {
    const alt = parseFloat(document.getElementById('calcCavAlt').value) || 0;
    const larg = parseFloat(document.getElementById('calcCavLarg').value) || 0;
    const comp = parseFloat(document.getElementById('calcCavComp').value) || 0;
    const cupimAdicional = parseFloat(document.getElementById('calcCavCupimAdicional')?.value) || 0;
    const qtdInput = document.getElementById('calcCavQtd');
    
    if (alt > 0 && larg > 0 && comp > 0) {
        const vol = (alt * larg * comp) + cupimAdicional;
        if (qtdInput) {
            qtdInput.value = String(Math.round(vol));
        }
    }
}

const btnAdicionarCaminhaoSub = document.getElementById('btnAdicionarCaminhaoSub');
if (btnAdicionarCaminhaoSub) {
    btnAdicionarCaminhaoSub.addEventListener('click', () => {
        const modelo = document.getElementById('subCliCaminhao').value.toUpperCase().trim();
        const placaCaminhao = document.getElementById('subCliPlacaCaminhao').value.toUpperCase().trim();
        const placaCarreta = document.getElementById('subCliPlacaCarreta').value.toUpperCase().trim();
        if (!modelo && !placaCaminhao && !placaCarreta) {
            alert('Preencha pelo menos modelo ou placa para adicionar o caminhão.');
            return;
        }
        caminhoesSubprodutoForm.push({ modelo, placaCaminhao, placaCarreta });
        document.getElementById('subCliCaminhao').value = '';
        document.getElementById('subCliPlacaCaminhao').value = '';
        document.getElementById('subCliPlacaCarreta').value = '';
        renderListaCaminhoesSub();
    });
}

window.removerCaminhaoSub = (index) => {
    caminhoesSubprodutoForm.splice(index, 1);
    renderListaCaminhoesSub();
};

const selectCavCaminhao = document.getElementById('calcCavCaminhaoSelecionado');
if (selectCavCaminhao) {
    selectCavCaminhao.addEventListener('change', function() {
        const cli = clientesSubprodutosCache.find(x => x.id === document.getElementById('calcCavSelectCliente')?.value);
        const caminhoes = normalizarCaminhoesSubproduto(cli);
        const item = caminhoes[Number(this.value)] || null;
        preencherCaminhaoSelecionadoSub(item);
    });
}

const chkCavParticular = document.getElementById('calcCavCarregamentoParticular');
if (chkCavParticular) {
    chkCavParticular.addEventListener('change', () => atualizarPrecoAcordadoCavacoPo());
}

renderListaCaminhoesSub();

// Ouvintes de cubagem
['calcCavAlt', 'calcCavLarg', 'calcCavComp', 'calcCavCupimAdicional'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', calcularCubagemCaminhaoTempoReal);
    }
});

// Emissão de recibos de subprodutos
function gerarHtmlReciboSubproduto(venda) {
    const esc = window.DocActions?.escapeHtml || ((value) => String(value ?? ''));
    return `
        <div class="doc-header">
            <div>
                <img src="logo.png" alt="VANMARTE" class="doc-logo" onerror="this.style.display='none'">
                <div style="margin-top:10px; color:#334155; font-size:13px;"><strong>Recibo de Venda de Subprodutos</strong></div>
            </div>
            <div class="doc-title">
                <h1>${esc(venda.cliente)} - ${esc(venda.romaneio)}</h1>
                <p><strong>Subprodutos</strong></p>
                <p>Emitido em ${new Date().toLocaleString('pt-BR')}</p>
            </div>
        </div>
        <div class="doc-grid">
            <div class="doc-card">
                <h3>Comprador</h3>
                <p><strong>Cliente/Empresa:</strong> ${esc(venda.cliente)}</p>
                <p><strong>CNPJ/CPF:</strong> ${esc(venda.documento)}</p>
                <p><strong>Insc. Estadual:</strong> ${esc(venda.ie)}</p>
                <p><strong>Endereco:</strong> ${esc(venda.logradouro)}</p>
                <p><strong>Cidade/Estado:</strong> ${esc(venda.cidadeEstado)}</p>
            </div>
            <div class="doc-card">
                <h3>Transporte</h3>
                <p><strong>Motorista:</strong> ${esc(venda.motorista)}</p>
                <p><strong>Caminhao:</strong> ${esc(venda.caminhao)}</p>
                <p><strong>Placa Caminhao:</strong> ${esc(venda.placaCaminhao)}</p>
                <p><strong>Placa Carreta:</strong> ${esc(venda.placaCarreta)}</p>
                <p><strong>Medidas:</strong> ${esc(venda.medidasTexto)}</p>
            </div>
        </div>
        <table class="doc-table">
            <thead><tr><th>Romaneio</th><th>Romaneio Cliente</th><th>Produto</th><th>Quantidade</th><th>Valor Unit.</th><th>Total</th></tr></thead>
            <tbody><tr>
                <td>${esc(venda.romaneio)}</td>
                <td>${esc(venda.romaneioCliente)}</td>
                <td>${esc(venda.tipo)}</td>
                <td><strong>${Number(venda.quantidade || 0).toLocaleString('pt-BR')} ${esc(venda.unidade)}</strong></td>
                <td>R$ ${Number(venda.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td class="doc-money">R$ ${Number(venda.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr></tbody>
        </table>
        <div class="doc-signatures"><div>Responsavel / Conferente</div><div>Cliente / Motorista</div></div>
    `;
}

if (btnCalcCavaco) {
    btnCalcCavaco.addEventListener('click', async function () {
        const tipo = document.getElementById('calcCavTipo').value;
        const unidade = document.getElementById('calcCavUnidade').value;
        const qtd = parseFloat(document.getElementById('calcCavQtd').value) || 0;
        const valorUni = window.parseCurrencyValue(document.getElementById('calcCavValor').value) || 0;

        const romaneio = document.getElementById('calcCavRomaneio').value || '---';
        const romaneioCliente = document.getElementById('calcCavRomaneioCliente').value || '---';
        const cliente = document.getElementById('calcCavCliente').value || '---';
        const docCli = document.getElementById('calcCavDoc').value || '---';
        const ieCli = document.getElementById('calcCavIE').value || '---';
        const logradouro = document.getElementById('calcCavLogradouro').value || '---';
        const cidadeEstado = document.getElementById('calcCavCidadeEstado').value || '---';
        
        const motorista = document.getElementById('calcCavMotorista').value || '---';
        const caminhao = document.getElementById('calcCavCaminhao').value || '---';
        const placaCaminhao = document.getElementById('calcCavPlacaCaminhao').value || '---';
        const placaCarreta = document.getElementById('calcCavPlacaCarreta').value || '---';

        const alt = parseFloat(document.getElementById('calcCavAlt').value) || 0;
        const larg = parseFloat(document.getElementById('calcCavLarg').value) || 0;
        const comp = parseFloat(document.getElementById('calcCavComp').value) || 0;
        const cupimAdicional = parseFloat(document.getElementById('calcCavCupimAdicional')?.value) || 0;

        if (qtd <= 0 || valorUni <= 0) {
            alert("Preencha corretamente a quantidade e o valor unitário!");
            return;
        }

        const total = qtd * valorUni;

        const btnOriginalHTML = btnCalcCavaco.innerHTML;
        btnCalcCavaco.disabled = true;
        btnCalcCavaco.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';

        try {
            // Salvar a venda no Firestore
            const novaVenda = {
                data: new Date().toISOString().split('T')[0],
                romaneio: romaneio.toUpperCase().trim(),
                romaneioCliente: romaneioCliente.toUpperCase().trim(),
                cliente: cliente.toUpperCase().trim(),
                documento: docCli,
                ie: ieCli,
                logradouro: logradouro.toUpperCase().trim(),
                cidadeEstado: cidadeEstado.toUpperCase().trim(),
                motorista: motorista.toUpperCase().trim(),
                caminhao: caminhao.toUpperCase().trim(),
                placaCaminhao: placaCaminhao.toUpperCase().trim(),
                placaCarreta: placaCarreta.toUpperCase().trim(),
                medidas: { alt, larg, comp, cupimAdicional },
                tipo: tipo,
                unidade: unidade,
                quantidade: qtd,
                valorUnitario: valorUni,
                total: total,
                criadoEm: new Date().toISOString()
            };

            await window.FS.addDoc('vendas_subprodutos', novaVenda);
            console.log("Calculadoras: Venda de subproduto salva no Firebase");
            document.dispatchEvent(new Event('historicoUpdated'));

            let medidasStr = '---';
            if (alt > 0 && larg > 0 && comp > 0) {
                medidasStr = `${alt.toFixed(2)}m (Alt) x ${larg.toFixed(2)}m (Larg) x ${comp.toFixed(2)}m (Comp)`;
                if (cupimAdicional > 0) {
                    medidasStr += ` + ${cupimAdicional.toFixed(2)} m3 (Cupim adicional)`;
                }
            }

            const docName = window.DocActions?.buildDocumentName
                ? window.DocActions.buildDocumentName([cliente, romaneio])
                : `${cliente} - ${romaneio}`;
            const contentHtml = gerarHtmlReciboSubproduto({
                ...novaVenda,
                medidasTexto: medidasStr
            });

            if (window.DocActions?.printHtml) {
                window.DocActions.printHtml({ title: docName, contentHtml });
            } else {
                const win = window.open('', '_blank');
                if (win) {
                    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${docName}</title></head><body>${contentHtml}</body></html>`);
                    win.document.close();
                    win.print();
                }
            }

            alert("Venda de subproduto registrada e enviada para impressao!");
            document.getElementById('formCavaco').reset();
            if (document.getElementById('calcCavSelectCliente')) {
                document.getElementById('calcCavSelectCliente').value = '';
            }
        } catch (e) {
            console.error("Erro ao salvar venda de subproduto:", e);
            alert("Erro ao salvar no Firebase.");
        } finally {
            btnCalcCavaco.disabled = false;
            btnCalcCavaco.innerHTML = btnOriginalHTML;
        }
    });
}

// Iniciar os clientes de subprodutos na carga do script
carregarClientesSubprodutos();

// 4. Cálculo de Fardo Completo
const btnCalcFardo = document.getElementById('btnCalcFardo');
const resFardoQtd = document.getElementById('resFardoQtd');
const resFardoVol = document.getElementById('resFardoVol');

if (btnCalcFardo) {
    btnCalcFardo.addEventListener('click', function () {
        const esp = parseFloat(document.getElementById('fardoEsp').value) || 0;
        const lar = parseFloat(document.getElementById('fardoLar').value) || 0;
        const comp = parseFloat(document.getElementById('fardoComp').value) || 0;
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
        const valorM3 = window.parseCurrencyValue(document.getElementById('freteValor').value) || 0;
        const extra = window.parseCurrencyValue(document.getElementById('freteExtra').value) || 0;

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

// Inicializar listeners de máscara de R$ para as calculadoras
const inputsFinanceirosCalc = ['calcPrecoDiesel', 'calcCavValor', 'freteValor', 'freteExtra', 'subCliValorCavaco', 'subCliValorPo'];
inputsFinanceirosCalc.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', window.formatCurrencyInput);
    }
});
window.switchTabSubprodutos = function(tabName) {
    const tabRecibo = document.getElementById('panelEmissaoCavaco');
    const tabClientes = document.getElementById('panelCadastroClientesSub');
    const tabListaClientes = document.getElementById('panelListaClientesSub');
    const btnRecibo = document.getElementById('btnTabSubRecibo');
    const btnClientes = document.getElementById('btnTabSubClientes');
    const btnListaClientes = document.getElementById('btnTabSubListaClientes');

    if (!tabRecibo || !tabClientes || !tabListaClientes || !btnRecibo || !btnClientes || !btnListaClientes) return;

    const setInactive = (btn) => {
        btn.style.color = 'var(--text-muted)';
        btn.style.borderBottom = 'none';
    };
    const setActive = (btn) => {
        btn.style.color = 'var(--accent-color)';
        btn.style.borderBottom = '3px solid var(--accent-color)';
    };

    tabRecibo.style.display = 'none';
    tabClientes.style.display = 'none';
    tabListaClientes.style.display = 'none';
    [btnRecibo, btnClientes, btnListaClientes].forEach(setInactive);

    if (tabName === 'recibo') {
        tabRecibo.style.display = 'block';
        setActive(btnRecibo);
    } else if (tabName === 'clientes') {
        tabClientes.style.display = 'block';
        setActive(btnClientes);
    } else {
        tabListaClientes.style.display = 'block';
        setActive(btnListaClientes);
    }
};
