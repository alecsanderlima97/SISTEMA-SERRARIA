// --- Cadastro e Gestão de Clientes ---

const formCliente = document.getElementById('formCliente');
const listaClientes = document.getElementById('listaClientes');
const cepInput = document.getElementById('cliCep');
const cepStatus = document.getElementById('cepStatus');

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

formCliente.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Objeto Cliente
    const dadosCliente = {
        nome: document.getElementById('cliNome').value,
        cnpj: document.getElementById('cliCnpj').value,
        ie: document.getElementById('cliIe').value,
        contato: document.getElementById('cliContato').value,
        email: document.getElementById('cliEmail').value,
        cep: document.getElementById('cliCep').value,
        cidade: document.getElementById('cliCidade').value
    };

    let clientes = DB.get('clientes');

    if(clienteEditandoId) {
        // Atualizar
        let index = clientes.findIndex(c => c.id === clienteEditandoId);
        if(index > -1) {
            dadosCliente.id = clienteEditandoId;
            clientes[index] = dadosCliente;
        }
        clienteEditandoId = null;
        formCliente.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> Salvar Cliente';
        formCliente.querySelector('button[type="submit"]').classList.replace('btn-secondary', 'btn-primary');
        alert('Cliente atualizado!');
    } else {
        // Criar
        dadosCliente.id = Date.now();
        clientes.push(dadosCliente);
        alert('Cliente cadastrado com sucesso!');
    }

    DB.set('clientes', clientes);

    formCliente.reset();
    renderClientes();
    
    // Dispara evento para o combo do romaneio se recarregar
    document.dispatchEvent(new Event('clientesUpdated'));
});

// Funcoes de tabela (Ver e Editar)
window.verCliente = function(id) {
    let c = DB.get('clientes').find(x => x.id === id);
    if(c) {
        alert(`=== FICHA DO CLIENTE ===\nNome: ${c.nome}\nCNPJ/CPF: ${c.cnpj}\nIE: ${c.ie || 'Isento'}\nContato: ${c.contato}\nE-mail: ${c.email || 'Não inf.'}\nCEP: ${c.cep}\nCidade: ${c.cidade}`);
    }
}

window.editarCliente = function(id) {
    let c = DB.get('clientes').find(x => x.id === id);
    if(c) {
        document.getElementById('cliNome').value = c.nome;
        document.getElementById('cliCnpj').value = c.cnpj;
        document.getElementById('cliIe').value = c.ie || '';
        document.getElementById('cliContato').value = c.contato;
        document.getElementById('cliEmail').value = c.email || '';
        document.getElementById('cliCep').value = c.cep;
        document.getElementById('cliCidade').value = c.cidade;

        clienteEditandoId = c.id;
        
        let submitBtn = formCliente.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Ficha';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
        window.scrollTo(0, 0); // Sobe a tela
    }
}

// Excluir e Renderizar
function apagarCliente(id) {
    if(confirm('Apagar cliente?')) {
        let clientes = DB.get('clientes').filter(c => c.id !== id);
        DB.set('clientes', clientes);
        renderClientes();
        document.dispatchEvent(new Event('clientesUpdated'));
    }
}

function renderClientes() {
    let clientes = DB.get('clientes');
    listaClientes.innerHTML = '';
    
    if(clientes.length === 0) {
        listaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum cliente cadastrado.</td></tr>`;
        return;
    }

    clientes.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.nome}</strong></td>
            <td>${c.cnpj}</td>
            <td>${c.cidade}</td>
            <td>${c.contato}</td>
            <td>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:#fff;" onclick="verCliente(${c.id})" title="Ficha Completa"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="editarCliente(${c.id})" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-danger" style="padding: 5px;" onclick="apagarCliente(${c.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        listaClientes.appendChild(tr);
    });
}

// Inicializar lista
renderClientes();
