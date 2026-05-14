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

// Busca de CEP Automática via API Pública (viacep)
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
                }
            })
            .catch(() => {
                cepStatus.textContent = "Erro na busca";
            });
    } else {
        cepStatus.textContent = "";
    }
});

// Formatar CEP
cepInput.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5, 8);
    e.target.value = v;
});

// Salvar Cliente
let clienteEditandoId = null;

formCliente.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Objeto Cliente
    const dadosCliente = {
        nome: document.getElementById('cliNome').value,
        cnpj: document.getElementById('cliCnpj').value,
        ie: document.getElementById('cliIe').value,
        contato: document.getElementById('cliContato').value,
        email: document.getElementById('cliEmail').value,
        cep: document.getElementById('cliCep').value,
        cidade: document.getElementById('cliCidade').value,
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

// Funcoes de tabela (Ver e Editar)
window.verCliente = function(id) {
    let c = clientesAtuais.find(x => x.id === id);
    if(c) {
        alert(`=== FICHA DO CLIENTE ===\nNome: ${c.nome}\nCNPJ/CPF: ${c.cnpj}\nIE: ${c.ie || 'Isento'}\nContato: ${c.contato}\nE-mail: ${c.email || 'Não inf.'}\nCEP: ${c.cep}\nCidade: ${c.cidade}`);
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
        document.getElementById('cliCidade').value = c.cidade || '';

        clienteEditandoId = c.id;
        
        let submitBtn = formCliente.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Ficha';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
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
    listaClientes.innerHTML = '';
    
    if(clientesAtuais.length === 0) {
        listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum cliente cadastrado no momento.</td></tr>`;
        return;
    }

    clientesAtuais.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.nome || 'Sem Nome'}</strong></td>
            <td>${c.cnpj || '-'}</td>
            <td>${c.cidade || '-'}</td>
            <td>${c.contato || '-'}</td>
            <td>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:#fff;" onclick="window.verCliente('${c.id}')" title="Ficha Completa"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="window.editarCliente('${c.id}')" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-danger" style="padding: 5px;" onclick="window.apagarCliente('${c.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        listaClientes.appendChild(tr);
    });
}

// Carregar clientes do Firestore
async function carregarClientes() {
    listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando do Firebase...</td></tr>`;
    try {
        const querySnapshot = await getDocs(clientesCollection);
        clientesAtuais = [];
        querySnapshot.forEach((doc) => {
            clientesAtuais.push({ id: doc.id, ...doc.data() });
        });
        
        renderClientes();
        document.dispatchEvent(new Event('clientesUpdated'));
    } catch (error) {
        console.error("Erro ao buscar clientes: ", error);
        listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger-color);">Erro ao conectar com Firebase.</td></tr>`;
    }
}

// Inicializar lista
carregarClientes();
