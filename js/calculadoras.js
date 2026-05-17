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
    
    document.getElementById('subCliCaminhao').value = cli.caminhao || '';
    document.getElementById('subCliPlacaCaminhao').value = cli.placaCaminhao || '';
    document.getElementById('subCliPlacaCarreta').value = cli.placaCarreta || '';
    
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
    
    if (confirm(`Deseja realmente excluir permanentemente o cliente ${cli.nome}?`)) {
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
        
        const dadosCli = {
            nome,
            documento: docNum,
            ie,
            logradouro,
            cidadeEstado,
            valorCavaco,
            valorPo,
            caminhao,
            placaCaminhao,
            placaCarreta,
            medidas: { alt, larg, comp }
        };
        
        const btnSalvar = document.getElementById('btnSalvarClienteSub');
        const originalHTML = btnSalvar.innerHTML;
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        
        try {
            if (clienteSubprodutoEditandoId) {
                const docRef = doc(db, 'clientes_subprodutos', clienteSubprodutoEditandoId);
                await updateDoc(docRef, dadosCli);
                alert("Cliente de subproduto atualizado com sucesso!");
                clienteSubprodutoEditandoId = null;
                btnSalvar.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Cliente';
                btnSalvar.style.background = '';
                btnSalvar.style.color = '';
            } else {
                await addDoc(collection(db, 'clientes_subprodutos'), dadosCli);
                alert("Cliente de subproduto cadastrado com sucesso!");
            }
            
            formCliSub.reset();
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
            
            document.getElementById('calcCavCaminhao').value = '';
            document.getElementById('calcCavPlacaCaminhao').value = '';
            document.getElementById('calcCavPlacaCarreta').value = '';
            
            document.getElementById('calcCavAlt').value = '';
            document.getElementById('calcCavLarg').value = '';
            document.getElementById('calcCavComp').value = '';
            
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
                
                document.getElementById('calcCavCaminhao').value = cli.caminhao || '';
                document.getElementById('calcCavPlacaCaminhao').value = cli.placaCaminhao || '';
                document.getElementById('calcCavPlacaCarreta').value = cli.placaCarreta || '';
                
                if (cli.medidas) {
                    document.getElementById('calcCavAlt').value = cli.medidas.alt || '';
                    document.getElementById('calcCavLarg').value = cli.medidas.larg || '';
                    document.getElementById('calcCavComp').value = cli.medidas.comp || '';
                }
                
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
    const valInput = document.getElementById('calcCavValor');
    
    if (valInput) {
        if (tipo === 'Cavaco / Maravalha') {
            valInput.value = window.formatCurrencyValue(cli.valorCavaco);
        } else if (tipo === 'Pó de Serra') {
            valInput.value = window.formatCurrencyValue(cli.valorPo);
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
    const qtdInput = document.getElementById('calcCavQtd');
    
    if (alt > 0 && larg > 0 && comp > 0) {
        const vol = alt * larg * comp;
        if (qtdInput) {
            qtdInput.value = vol.toFixed(3);
        }
    }
}

// Ouvintes de cubagem
['calcCavAlt', 'calcCavLarg', 'calcCavComp'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', calcularCubagemCaminhaoTempoReal);
    }
});

// Emissão de recibos de subprodutos
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

        if (qtd <= 0 || valorUni <= 0) {
            alert("Preencha corretamente a quantidade e o valor unitário!");
            return;
        }

        const total = qtd * valorUni;

        const btnOriginalHTML = btnCalcCavaco.innerHTML;
        btnCalcCavaco.disabled = true;
        btnCalcCavaco.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

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
                medidas: { alt, larg, comp },
                tipo: tipo,
                unidade: unidade,
                quantidade: qtd,
                valorUnitario: valorUni,
                total: total,
                criadoEm: new Date().toISOString()
            };

            await addDoc(collection(db, 'vendas_subprodutos'), novaVenda);
            console.log("Calculadoras: Venda de subproduto salva no Firebase");
            document.dispatchEvent(new Event('historicoUpdated'));

            // Preencher área de impressão
            document.getElementById('printCavRomaneio').textContent = romaneio;
            document.getElementById('printCavRomaneioCliente').textContent = romaneioCliente;
            document.getElementById('printCavCliente').textContent = cliente;
            document.getElementById('printCavDoc').textContent = docCli;
            document.getElementById('printCavIE').textContent = ieCli;
            document.getElementById('printCavLogradouro').textContent = logradouro;
            document.getElementById('printCavCidadeEstado').textContent = cidadeEstado;
            
            document.getElementById('printCavMotorista').textContent = motorista;
            document.getElementById('printCavCaminhao').textContent = caminhao;
            document.getElementById('printCavPlacaCaminhao').textContent = placaCaminhao;
            document.getElementById('printCavPlacaCarreta').textContent = placaCarreta;
            
            let medidasStr = '---';
            if (alt > 0 && larg > 0 && comp > 0) {
                medidasStr = `${alt.toFixed(2)}m (Alt) x ${larg.toFixed(2)}m (Larg) x ${comp.toFixed(2)}m (Comp)`;
            }
            document.getElementById('printCavMedidas').textContent = medidasStr;

            document.getElementById('printCavData').textContent = new Date().toLocaleDateString('pt-BR');
            document.getElementById('printCavTipo').textContent = tipo;
            document.getElementById('printCavQtd').textContent = qtd.toLocaleString('pt-BR');
            document.getElementById('printCavUni').textContent = unidade;
            document.getElementById('printCavValorUni').textContent = valorUni.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            document.getElementById('printCavTotal').textContent = total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

            const printArea = document.getElementById('printAreaSubprodutos');
            if (printArea) {
                printArea.style.display = 'block';
                window.print();
                printArea.style.display = 'none';
                
                alert("Venda de subproduto registrada e enviada para impressão!");
                
                // Limpar apenas o formulário de emissão de recibo para manter a SPA fluida
                document.getElementById('formCavaco').reset();
                if (document.getElementById('calcCavSelectCliente')) {
                    document.getElementById('calcCavSelectCliente').value = '';
                }
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

// Alternância do painel de gerenciamento de clientes de subprodutos
function inicializarToggleClientesSub() {
    const btnToggle = document.getElementById('btnToggleGerenciarClientesSub');
    const panelCadastro = document.getElementById('panelCadastroClientesSub');
    const panelEmissao = document.getElementById('panelEmissaoCavaco');
    const container = document.getElementById('subprodutosContainer');

    if (btnToggle && panelCadastro && panelEmissao && container) {
        // Inicialização - Oculto por padrão
        panelCadastro.style.display = 'none';
        container.classList.remove('form-table-grid');
        container.style.maxWidth = '650px';
        panelEmissao.style.maxWidth = '100%';
        panelEmissao.style.margin = '0';

        btnToggle.addEventListener('click', function() {
            const isHidden = panelCadastro.style.display === 'none';
            if (isHidden) {
                // Mostrar painel de gerenciamento lateral
                panelCadastro.style.display = 'block';
                // Mudar layout do container para grid bilateral de duas colunas
                container.classList.add('form-table-grid');
                container.style.maxWidth = '1350px';
                btnToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Gerenciador';
                btnToggle.classList.add('btn-primary');
                btnToggle.classList.remove('btn-secondary');
            } else {
                // Esconder painel de gerenciamento
                panelCadastro.style.display = 'none';
                // Remover layout de grid do container
                container.classList.remove('form-table-grid');
                // Voltar limites manuais de centralização da calculadora
                container.style.maxWidth = '650px';
                btnToggle.innerHTML = '<i class="fa-solid fa-users-gear"></i> Gerenciar Clientes';
                btnToggle.classList.remove('btn-primary');
                btnToggle.classList.add('btn-secondary');
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarToggleClientesSub);
} else {
    inicializarToggleClientesSub();
}

