// --- Cadastro e Gestão de Clientes ---

const formCliente = document.getElementById('formCliente');
const listaClientes = document.getElementById('listaClientes');
const cepInput = document.getElementById('cliCep');
const cepStatus = document.getElementById('cepStatus');
const cnpjInput = document.getElementById('cliCnpj');
const btnBuscaCnpj = document.getElementById('btnBuscaCnpj');
const contatoInput = document.getElementById('cliContato');

// Aplicar Máscaras
if (window.maskCnpj) window.maskCnpj(cnpjInput);
if (window.maskPhone) window.maskPhone(contatoInput);

// Busca de CEP Automática
if (cepInput) {
    cepInput.addEventListener('blur', function() {
        let cep = this.value.replace(/\D/g, '');
        if (cep.length === 8) {
            if (cepStatus) cepStatus.textContent = "Buscando...";
            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(res => res.json())
                .then(data => {
                    if(data.erro) {
                        if (cepStatus) cepStatus.textContent = "CEP Inválido";
                        document.getElementById('cliCidade').value = "";
                    } else {
                        if (cepStatus) cepStatus.textContent = "✓";
                        document.getElementById('cliCidade').value = `${data.localidade} / ${data.uf}`;
                        if (data.logradouro) document.getElementById('cliRua').value = data.logradouro;
                        if (data.bairro) document.getElementById('cliBairro').value = data.bairro;
                    }
                })
                .catch(() => {
                    if (cepStatus) cepStatus.textContent = "Erro na busca";
                });
        }
    });
}

// Busca de CNPJ Automática (BrasilAPI)
if (btnBuscaCnpj) {
    btnBuscaCnpj.addEventListener('click', function() {
        let cnpj = cnpjInput.value.replace(/\D/g, '');
        if (cnpj.length !== 14) {
            alert("Digite um CNPJ válido (14 dígitos) para buscar.");
            return;
        }

        btnBuscaCnpj.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btnBuscaCnpj.disabled = true;

        fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
            .then(res => {
                if (!res.ok) throw new Error("CNPJ não encontrado");
                return res.json();
            })
            .then(data => {
                const fill = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val || '';
                };

                fill('cliNome', data.razao_social || data.nome_fantasia);
                fill('cliEmail', data.email);
                fill('cliContato', data.ddd_telefone_1);
                fill('cliCep', data.cep);
                fill('cliCidade', `${data.municipio} / ${data.uf}`);
                fill('cliRua', data.logradouro);
                fill('cliNumero', data.numero);
                fill('cliBairro', data.bairro);
                
                // Forçar trigger das máscaras
                if (contatoInput) contatoInput.dispatchEvent(new Event('input'));
                alert("Dados importados com sucesso!");
            })
            .catch(err => {
                alert("Erro ao buscar CNPJ: " + err.message);
            })
            .finally(() => {
                btnBuscaCnpj.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
                btnBuscaCnpj.disabled = false;
            });
    });
}

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
        rua: document.getElementById('cliRua').value,
        numero: document.getElementById('cliNumero').value,
        bairro: document.getElementById('cliBairro').value
    };

    try {
        if(clienteEditandoId) {
            // Atualizar no Supabase
            await DB.update('clientes', clienteEditandoId, dadosCliente);
            clienteEditandoId = null;
            formCliente.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> Salvar Cliente';
            formCliente.querySelector('button[type="submit"]').classList.replace('btn-secondary', 'btn-primary');
            alert('Cliente atualizado!');
        } else {
            // Criar no Supabase
            await DB.insert('clientes', dadosCliente);
            alert('Cliente cadastrado com sucesso!');
        }

        formCliente.reset();
        await renderClientes();
        
        // Dispara evento para o combo do romaneio se recarregar
        document.dispatchEvent(new Event('clientesUpdated'));
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar no Supabase.');
    }
});

// Funcoes de tabela (Ver e Editar)
window.verCliente = async function(id) {
    let c = await DB.getById('clientes', id);
    if(c) {
        let msg = `=== FICHA DO CLIENTE ===\n\n`;
        msg += `Nome: ${c.nome}\n`;
        msg += `CNPJ/CPF: ${c.cnpj}\n`;
        msg += `IE: ${c.ie || 'Isento'}\n`;
        msg += `Contato: ${c.contato}\n`;
        msg += `E-mail: ${c.email || 'Não inf.'}\n\n`;
        msg += `--- ENDEREÇO ---\n`;
        msg += `Rua: ${c.rua || '---'}\n`;
        msg += `Número: ${c.numero || '---'}\n`;
        msg += `Bairro: ${c.bairro || '---'}\n`;
        msg += `CEP: ${c.cep}\n`;
        msg += `Cidade: ${c.cidade}`;
        alert(msg);
    }
}

window.editarCliente = async function(id) {
    let c = await DB.getById('clientes', id);
    if(c) {
        document.getElementById('cliNome').value = c.nome;
        document.getElementById('cliCnpj').value = c.cnpj;
        document.getElementById('cliIe').value = c.ie || '';
        document.getElementById('cliContato').value = c.contato;
        document.getElementById('cliEmail').value = c.email || '';
        document.getElementById('cliCep').value = c.cep;
        document.getElementById('cliCidade').value = c.cidade;
        
        // Novos campos
        if(document.getElementById('cliRua')) document.getElementById('cliRua').value = c.rua || '';
        if(document.getElementById('cliNumero')) document.getElementById('cliNumero').value = c.numero || '';
        if(document.getElementById('cliBairro')) document.getElementById('cliBairro').value = c.bairro || '';

        clienteEditandoId = c.id;
        
        let submitBtn = formCliente.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Ficha';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
        window.scrollTo(0, 0); // Sobe a tela
    }
}

// Excluir e Renderizar
window.apagarCliente = async function(id) {
    if(confirm('Apagar cliente?')) {
        const sucesso = await DB.delete('clientes', id);
        if (sucesso) {
            await renderClientes();
            document.dispatchEvent(new Event('clientesUpdated'));
        }
    }
}

async function renderClientes() {
    if(!listaClientes) return;
    listaClientes.innerHTML = '<tr><td colspan="6" style="text-align:center;">Buscando dados no Supabase...</td></tr>';

    const clientes = await DB.list('clientes');
    listaClientes.innerHTML = '';
    
    if(!clientes || clientes.length === 0) {
        listaClientes.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum cliente cadastrado.</td></tr>`;
        return;
    }

    clientes.forEach(c => {
        const enderecoCompleto = `${c.rua || ''}, ${c.numero || ''} - ${c.bairro || ''}, ${c.cidade || ''}`;
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.nome}</strong></td>
            <td>${c.cnpj}</td>
            <td>${c.cidade}</td>
            <td>${c.contato}</td>
            <td>
                <a href="${googleMapsLink}" target="_blank" class="btn-secondary" style="padding: 5px; text-decoration:none; font-size:0.7rem;" title="Ver no Maps">
                    <i class="fa-solid fa-location-dot"></i> Abrir Maps
                </a>
            </td>
            <td>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:#fff;" onclick="verCliente(${c.id})" title="Ver Ficha"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="editarCliente(${c.id})" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-danger" style="padding: 5px;" onclick="apagarCliente(${c.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        listaClientes.appendChild(tr);
    });
}

// Inicializar lista
renderClientes();
