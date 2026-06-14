import { db, collection, getDocs, doc, deleteDoc } from './firebase-init.js';

// --- Cadastro e Gestão de Clientes ---

const formCliente = document.getElementById('formCliente');
const listaClientes = document.getElementById('listaClientes');
const cepInput = document.getElementById('cliCep');
const cepStatus = document.getElementById('cepStatus');

// Referência para a coleção no Firestore
const clientesCollection = collection(db, 'clientes');

// Lista local para manter estado na tela
let clientesAtuais = [];

// Busca de CNPJ Automática via Brasil API
const cnpjInput = document.getElementById('cliCnpj');
const nomeInput = document.getElementById('cliNome');
const emailInput = document.getElementById('cliEmail');
const contatoInput = document.getElementById('cliContato');

let clienteEditandoId = null;

// Salvar Cliente
if (formCliente) {
    formCliente.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Objeto Cliente
        const dadosCliente = {
            nome: document.getElementById('cliNome').value.toUpperCase().trim(),
            cnpj: document.getElementById('cliCnpj').value,
            ie: document.getElementById('cliIe').value,
            contato: document.getElementById('cliContato').value,
            email: document.getElementById('cliEmail').value,
            cep: document.getElementById('cliCep').value,
            logradouro: document.getElementById('cliLogradouro').value.toUpperCase().trim(),
            numero: document.getElementById('cliNumero').value,
            cidade: document.getElementById('cliCidade').value,
            valorFrete: window.parseCurrencyValue(document.getElementById('cliValorFrete').value),
            porcentagemNF: parseFloat(document.getElementById('cliPorcentagemNF').value) || 0,
            baseNF: document.getElementById('cliBaseNF')?.value || 'INTEIRA',
            formaPagamento: document.getElementById('cliFormaPagamento').value,
            prazoPagamento: document.getElementById('cliPrazoPagamento').value.toUpperCase().trim(),
            madeira1: window.parseCurrencyValue(document.getElementById('cliMadeira1').value),
            madeira2: window.parseCurrencyValue(document.getElementById('cliMadeira2').value),
            madeira3: window.parseCurrencyValue(document.getElementById('cliMadeira3').value),
            madeiraPinus: window.parseCurrencyValue(document.getElementById('cliMadeiraPinus').value),
            nomeMadeiraExtra: document.getElementById('cliNomeMadeiraExtra').value.toUpperCase().trim(),
            valorMadeiraExtra: window.parseCurrencyValue(document.getElementById('cliValorMadeiraExtra').value),
            observacao: document.getElementById('cliObservacao').value,
            atualizadoEm: new Date().toISOString()
        };

        const submitBtn = formCliente.querySelector('button[type="submit"]');
        const textoOriginal = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
        submitBtn.disabled = true;

        try {
            if(clienteEditandoId) {
                // Atualizar no Firestore com metadados SaaS
                await window.FS.updateDoc('clientes', clienteEditandoId, dadosCliente);
                
                clienteEditandoId = null;
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Cliente';
                submitBtn.classList.replace('btn-secondary', 'btn-primary');
                alert('Cliente atualizado com sucesso no Firebase!');
            } else {
                // Criar no Firestore
                dadosCliente.criadoEm = new Date().toISOString();
                await window.FS.addDoc('clientes', dadosCliente);
                alert('Cliente cadastrado com sucesso no Firebase!');
            }

            formCliente.reset();
            await carregarClientes(); // Recarrega da nuvem
            
            // Dispara evento para o combo do romaneio se recarregar
            document.dispatchEvent(new Event('clientesUpdated'));
            window.switchTabClientes('lista');
        } catch (error) {
            console.error("Erro ao salvar cliente: ", error);
            alert('Erro ao salvar o cliente. Verifique o console.');
        } finally {
            if(!clienteEditandoId) submitBtn.innerHTML = textoOriginal;
            submitBtn.disabled = false;
        }
    });
}

// Funcoes de tabela (Ver e Editar)
window.verCliente = function(id) {
    let c = clientesAtuais.find(x => x.id === id);
    if(c) {
        alert(`=== FICHA DO CLIENTE ===\nNome: ${c.nome}\nCNPJ/CPF: ${c.cnpj}\nIE: ${c.ie || 'Isento'}\nContato: ${c.contato}\nE-mail: ${c.email || 'Não inf.'}\nCEP: ${c.cep}\nLogradouro: ${c.logradouro || 'Não inf.'}, Nº ${c.numero || 'S/N'}\nCidade: ${c.cidade}`);
    }
}

window.editarCliente = function(id) {
    let c = clientesAtuais.find(x => x.id === id);
    if(c) {
        document.getElementById('cliNome').value = c.nome || '';
        document.getElementById('cliCnpj').value = c.cnpj || '';
        document.getElementById('cliIe').value = c.ie || '';
        document.getElementById('cliContato').value = c.contato || '';
        document.getElementById('cliEmail').value = c.email || '';
        document.getElementById('cliCep').value = c.cep || '';
        document.getElementById('cliLogradouro').value = c.logradouro || '';
        document.getElementById('cliNumero').value = c.numero || '';
        document.getElementById('cliCidade').value = c.cidade || '';
        document.getElementById('cliValorFrete').value = window.formatCurrencyValue(c.valorFrete);
        document.getElementById('cliPorcentagemNF').value = c.porcentagemNF || '';
        if (document.getElementById('cliBaseNF')) document.getElementById('cliBaseNF').value = c.baseNF || 'INTEIRA';
        document.getElementById('cliFormaPagamento').value = c.formaPagamento || '';
        
        const containerPrazo = document.getElementById('containerPrazo');
        if (containerPrazo) {
            containerPrazo.style.display = c.formaPagamento === 'A Prazo' ? 'flex' : 'none';
        }
        
        document.getElementById('cliPrazoPagamento').value = c.prazoPagamento || '';
        document.getElementById('cliMadeira1').value = window.formatCurrencyValue(c.madeira1);
        document.getElementById('cliMadeira2').value = window.formatCurrencyValue(c.madeira2);
        document.getElementById('cliMadeira3').value = window.formatCurrencyValue(c.madeira3);
        document.getElementById('cliMadeiraPinus').value = window.formatCurrencyValue(c.madeiraPinus);
        document.getElementById('cliNomeMadeiraExtra').value = c.nomeMadeiraExtra || '';
        document.getElementById('cliValorMadeiraExtra').value = window.formatCurrencyValue(c.valorMadeiraExtra);
        document.getElementById('cliObservacao').value = c.observacao || '';

        clienteEditandoId = c.id;
        
        let submitBtn = formCliente.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Ficha';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
        
        window.switchTabClientes('form', true);
        window.scrollTo(0, 0); // Sobe a tela
    }
}

// Excluir e Renderizar
window.apagarCliente = async function(id) {
    if(await window.confirmarExclusaoComSenha('Tem certeza que deseja apagar permanentemente este cliente do banco de dados?')) {
        try {
            const clienteRef = doc(db, 'clientes', id);
            await deleteDoc(clienteRef);
            await carregarClientes();
            document.dispatchEvent(new Event('clientesUpdated'));
        } catch (error) {
            console.error("Erro ao excluir: ", error);
            alert("Erro ao excluir cliente.");
        }
    }
}

function renderClientes() {
    if (!listaClientes) return;
    listaClientes.innerHTML = '';
    
    const filtroInput = document.getElementById('filtroClientesBusca');
    const filtro = filtroInput ? filtroInput.value.toLowerCase().trim() : '';
    
    const filtrados = clientesAtuais.filter(c => {
        const nome = (c.nome || '').toLowerCase();
        const cnpj = (c.cnpj || '').replace(/\D/g, '');
        const contato = (c.contato || '').toLowerCase();
        return nome.includes(filtro) || cnpj.includes(filtro) || contato.includes(filtro);
    });

    const ordem = document.getElementById('ordenarClientes')?.value || 'nome';
    filtrados.sort((a, b) => {
        if (ordem === 'data-desc') return new Date(b.criadoEm || b.atualizadoEm || 0) - new Date(a.criadoEm || a.atualizadoEm || 0);
        if (ordem === 'data-asc') return new Date(a.criadoEm || a.atualizadoEm || 0) - new Date(b.criadoEm || b.atualizadoEm || 0);
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

    if(filtrados.length === 0) {
        listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum cliente encontrado no momento.</td></tr>`;
        return;
    }

    filtrados.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.nome || 'Sem Nome'}</strong></td>
            <td>${c.cnpj || '-'}</td>
            <td>${c.cidade || '-'}</td>
            <td>${c.contato || '-'}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button onclick="window.verCliente('${c.id}')" class="btn-icon" style="color:var(--accent-color); font-size:1rem; padding: 6px 8px;" title="Ver Ficha">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button onclick="window.editarCliente('${c.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1rem; padding: 6px 8px;" title="Editar">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button onclick="window.apagarCliente('${c.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1rem; padding: 6px 8px;" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaClientes.appendChild(tr);
    });
}
window.renderClientes = renderClientes;

// Carregar clientes do Firestore
async function carregarClientes() {
    if (!listaClientes) return;
    listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Carregando do Firebase...</td></tr>`;
    try {
        const querySnapshot = await getDocs(clientesCollection);
        clientesAtuais = [];
        querySnapshot.forEach((doc) => {
            clientesAtuais.push({ id: doc.id, ...doc.data() });
        });
        
        renderClientes();
    } catch (error) {
        console.error("Erro ao buscar clientes: ", error);
        listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger-color);">Erro ao conectar com Firebase.</td></tr>`;
    }
}

// Inicializar Módulo de Clientes de forma robusta
function inicializarModuloClientes() {
    // Forçar letras maiúsculas em tempo real nos campos de clientes
    ['cliNome', 'cliLogradouro', 'cliPrazoPagamento', 'cliNomeMadeiraExtra'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', window.forceUppercaseInput);
        }
    });

    if (cnpjInput) {
        cnpjInput.addEventListener('blur', function() {
            let cnpj = this.value.replace(/\D/g, '');
            if (cnpj.length === 14) {
                nomeInput.placeholder = "Buscando dados do CNPJ...";
                fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
                    .then(res => res.json())
                    .then(data => {
                        if(data.razao_social) {
                            if(!nomeInput.value) nomeInput.value = data.razao_social;
                            if(!emailInput.value && data.email) emailInput.value = data.email;
                            if(!contatoInput.value && data.ddd_telefone_1) contatoInput.value = data.ddd_telefone_1;
                            if(!cepInput.value && data.cep) {
                                cepInput.value = data.cep;
                                cepInput.dispatchEvent(new Event('blur')); // Força a busca do endereço
                            }
                            this.value = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                        }
                        nomeInput.placeholder = "Nome / Razão Social";
                    })
                    .catch(() => {
                        nomeInput.placeholder = "Nome / Razão Social";
                    });
            }
        });

        cnpjInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length <= 11) {
                if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
                else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
                else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
            } else {
                v = v.substring(0, 14);
                if (v.length > 12) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
                else if (v.length > 8) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, "$1.$2.$3/$4");
                else if (v.length > 5) v = v.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
                else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,3})/, "$1.$2");
            }
            e.target.value = v;
        });
    }

    if (cepInput) {
        cepInput.addEventListener('blur', function() {
            let cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                cepStatus.textContent = "Buscando...";
                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(res => res.json())
                    .then(data => {
                        if(data.erro) {
                            cepStatus.textContent = "CEP Inválido";
                            document.getElementById('cliCidade').value = "";
                        } else {
                            cepStatus.textContent = "✓";
                            document.getElementById('cliCidade').value = `${data.localidade} / ${data.uf}`;
                            if(data.logradouro) document.getElementById('cliLogradouro').value = data.logradouro;
                        }
                    })
                    .catch(() => {
                        cepStatus.textContent = "Erro na busca";
                    });
            } else {
                cepStatus.textContent = "";
            }
        });

        cepInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5, 8);
            e.target.value = v;
        });
    }

    // Listener de pesquisa
    const filtroClientesBusca = document.getElementById('filtroClientesBusca');
    if (filtroClientesBusca) {
        filtroClientesBusca.addEventListener('input', renderClientes);
    }
    const ordenarClientes = document.getElementById('ordenarClientes');
    if (ordenarClientes) ordenarClientes.addEventListener('change', renderClientes);
    // Inicializar listeners financeiros
    const inputsFinanceirosCliente = [
        'cliValorFrete', 'cliMadeira1', 'cliMadeira2', 'cliMadeira3', 'cliMadeiraPinus', 'cliValorMadeiraExtra'
    ];
    inputsFinanceirosCliente.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', window.formatCurrencyInput);
        }
    });

}

window.switchTabClientes = function(tabName, isEditing = false) {
    const tabForm = document.getElementById('tabClienteForm');
    const tabLista = document.getElementById('tabClienteLista');
    const btnForm = document.getElementById('btnTabClienteForm');
    const btnLista = document.getElementById('btnTabClienteLista');

    if (!tabForm || !tabLista || !btnForm || !btnLista) return;

    if (tabName === 'form') {
        tabForm.style.display = 'block';
        tabLista.style.display = 'none';
        btnForm.style.color = 'var(--accent-color)';
        btnForm.style.borderBottom = '3px solid var(--accent-color)';
        btnLista.style.color = 'var(--text-muted)';
        btnLista.style.borderBottom = 'none';

        if (!isEditing) {
            formCliente.reset();
            clienteEditandoId = null;
            const submitBtn = formCliente.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Cliente';
                submitBtn.classList.replace('btn-secondary', 'btn-primary');
            }
        }
    } else {
        tabForm.style.display = 'none';
        tabLista.style.display = 'block';
        btnLista.style.color = 'var(--accent-color)';
        btnLista.style.borderBottom = '3px solid var(--accent-color)';
        btnForm.style.color = 'var(--text-muted)';
        btnForm.style.borderBottom = 'none';
    }
}

// Executar de forma segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarModuloClientes);
} else {
    inicializarModuloClientes();
}

window.SectionLoader?.register('view-clientes', carregarClientes);
