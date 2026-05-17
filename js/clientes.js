import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from './firebase-init.js';

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
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;

        try {
            if(clienteEditandoId) {
                // Atualizar no Firestore
                const clienteRef = doc(db, 'clientes', clienteEditandoId);
                await updateDoc(clienteRef, dadosCliente);
                
                clienteEditandoId = null;
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Cliente';
                submitBtn.classList.replace('btn-secondary', 'btn-primary');
                alert('Cliente atualizado com sucesso no Firebase!');
            } else {
                // Criar no Firestore
                dadosCliente.criadoEm = new Date().toISOString();
                await addDoc(clientesCollection, dadosCliente);
                alert('Cliente cadastrado com sucesso no Firebase!');
            }

            formCliente.reset();
            await carregarClientes(); // Recarrega da nuvem
            
            // Dispara evento para o combo do romaneio se recarregar
            document.dispatchEvent(new Event('clientesUpdated'));
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
        
        // Garante que a lista de clientes esteja aberta ao editar
        const panelLista = document.getElementById('panelListaClientes');
        const gridLayout = document.getElementById('gridClientesLayout');
        const cardForm = document.getElementById('cardFormCliente');
        const btnToggle = document.getElementById('btnToggleListaClientes');
        if (panelLista && panelLista.style.display === 'none') {
            panelLista.style.display = 'block';
            if (gridLayout) gridLayout.classList.add('form-table-grid');
            if (cardForm) {
                cardForm.style.maxWidth = 'none';
                cardForm.style.margin = '0';
            }
            if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Clientes';
        }
        
        window.scrollTo(0, 0); // Sobe a tela
    }
}

// Excluir e Renderizar
window.apagarCliente = async function(id) {
    if(confirm('Tem certeza que deseja apagar permanentemente este cliente do banco de dados?')) {
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
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button class="btn-secondary" style="padding: 5px 8px; border-color:#fff; font-size: 0.9rem;" onclick="window.verCliente('${c.id}')" title="Ficha Completa"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-secondary" style="padding: 5px 8px; border-color:var(--accent-color); color:var(--accent-color); font-size: 0.9rem;" onclick="window.editarCliente('${c.id}')" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-danger" style="padding: 5px 8px; font-size: 0.9rem;" onclick="window.apagarCliente('${c.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        listaClientes.appendChild(tr);
    });
}

// Carregar clientes do Firestore
async function carregarClientes() {
    if (!listaClientes) return;
    listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando do Firebase...</td></tr>`;
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

    // Inicializar Toggles
    inicializarToggleClientes();

    // Listener de pesquisa
    const filtroClientesBusca = document.getElementById('filtroClientesBusca');
    if (filtroClientesBusca) {
        filtroClientesBusca.addEventListener('input', renderClientes);
    }

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

    carregarClientes();
}

function inicializarToggleClientes() {
    const btn = document.getElementById('btnToggleListaClientes');
    const panelLista = document.getElementById('panelListaClientes');
    const gridLayout = document.getElementById('gridClientesLayout');
    const cardForm = document.getElementById('cardFormCliente');

    if (!btn || !panelLista || !gridLayout || !cardForm) return;

    // Inicia oculto por padrão
    panelLista.style.display = 'none';
    gridLayout.classList.remove('form-table-grid');
    cardForm.style.maxWidth = '650px';
    cardForm.style.margin = '0 auto';

    btn.addEventListener('click', () => {
        if (panelLista.style.display === 'none') {
            panelLista.style.display = 'block';
            gridLayout.classList.add('form-table-grid');
            cardForm.style.maxWidth = 'none';
            cardForm.style.margin = '0';
            btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Clientes';
        } else {
            panelLista.style.display = 'none';
            gridLayout.classList.remove('form-table-grid');
            cardForm.style.maxWidth = '650px';
            cardForm.style.margin = '0 auto';
            btn.innerHTML = '<i class="fa-solid fa-users"></i> Gerenciar Clientes';
        }
    });
}

// Executar de forma segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarModuloClientes);
} else {
    inicializarModuloClientes();
}
