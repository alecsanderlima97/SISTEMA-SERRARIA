// --- Cadastro de Transportadoras ---

const formTransporte = document.getElementById('formTransporte');
const listaTransportes = document.getElementById('listaTransportes');

let transporteEditandoId = null;

formTransporte.addEventListener('submit', async function(e) {
    e.preventDefault();

    const dadosTransp = {
        nome: document.getElementById('transNome').value,
        motorista: document.getElementById('transMotorista').value,
        caminhao: document.getElementById('transCaminhao').value,
        placa: document.getElementById('transPlaca').value
    };

    try {
        if(transporteEditandoId) {
            // Atualizar no Supabase
            await DB.update('transportes', transporteEditandoId, dadosTransp);
            transporteEditandoId = null;
            formTransporte.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> Salvar Transportadora';
            formTransporte.querySelector('button[type="submit"]').classList.replace('btn-secondary', 'btn-primary');
            alert('Transportadora atualizada!');
        } else {
            // Criar no Supabase
            await DB.insert('transportes', dadosTransp);
            alert('Transportadora cadastrada com sucesso!');
        }

        formTransporte.reset();
        await renderTransportes();
        
        // Disparar evento para o combo do romaneio recarregar
        document.dispatchEvent(new Event('transportesUpdated'));
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar transportadora no Supabase.');
    }
});

window.editarTransporte = async function(id) {
    let t = await DB.getById('transportes', id);
    if(t) {
        document.getElementById('transNome').value = t.nome;
        document.getElementById('transMotorista').value = t.motorista || '';
        document.getElementById('transCaminhao').value = t.caminhao || '';
        document.getElementById('transPlaca').value = t.placa;

        transporteEditandoId = t.id;
        
        let submitBtn = formTransporte.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Transportadora';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
        window.scrollTo(0, 0);
    }
}

window.apagarTransporte = async function(id) {
    if(confirm('Apagar esta transportadora/fretista?')) {
        const sucesso = await DB.delete('transportes', id);
        if (sucesso) {
            await renderTransportes();
            document.dispatchEvent(new Event('transportesUpdated'));
        }
    }
}

async function renderTransportes() {
    if(!listaTransportes) return;
    listaTransportes.innerHTML = '<tr><td colspan="5" style="text-align:center;">Buscando dados no Supabase...</td></tr>';

    const transportes = await DB.list('transportes');
    listaTransportes.innerHTML = '';

    if (!transportes || transportes.length === 0) {
        listaTransportes.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma transportadora cadastrada.</td></tr>`;
        return;
    }

    transportes.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.nome}</strong></td>
            <td>${t.motorista || '-'}</td>
            <td>${t.caminhao || '-'}</td>
            <td>${t.placa}</td>
            <td>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="editarTransporte(${t.id})" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-danger" style="padding: 5px;" onclick="apagarTransporte(${t.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        listaTransportes.appendChild(tr);
    });
}

// Inicializar
renderTransportes();
