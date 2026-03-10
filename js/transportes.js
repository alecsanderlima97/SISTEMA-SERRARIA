// --- Cadastro de Transportadoras ---

const formTransporte = document.getElementById('formTransporte');
const listaTransportes = document.getElementById('listaTransportes');

let transporteEditandoId = null;

formTransporte.addEventListener('submit', function(e) {
    e.preventDefault();

    const dadosTransp = {
        nome: document.getElementById('transNome').value,
        motorista: document.getElementById('transMotorista').value,
        caminhao: document.getElementById('transCaminhao').value,
        placa: document.getElementById('transPlaca').value
    };

    let transportes = DB.get('transportes') || [];

    if(transporteEditandoId) {
        // Atualizar
        let idx = transportes.findIndex(t => t.id === transporteEditandoId);
        if(idx > -1) {
            dadosTransp.id = transporteEditandoId;
            transportes[idx] = dadosTransp;
        }
        transporteEditandoId = null;
        formTransporte.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> Salvar Transportadora';
        formTransporte.querySelector('button[type="submit"]').classList.replace('btn-secondary', 'btn-primary');
        alert('Transportadora atualizada!');
    } else {
        // Criar
        dadosTransp.id = Date.now();
        transportes.push(dadosTransp);
        alert('Transportadora cadastrada com sucesso!');
    }

    DB.set('transportes', transportes);

    formTransporte.reset();
    renderTransportes();
    
    // Disparar evento para o combo do romaneio recarregar
    document.dispatchEvent(new Event('transportesUpdated'));
});

window.editarTransporte = function(id) {
    let t = (DB.get('transportes') || []).find(x => x.id === id);
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

window.apagarTransporte = function(id) {
    if(confirm('Apagar esta transportadora/fretista?')) {
        let transportes = (DB.get('transportes') || []).filter(t => t.id !== id);
        DB.set('transportes', transportes);
        renderTransportes();
        document.dispatchEvent(new Event('transportesUpdated'));
    }
}

function renderTransportes() {
    let transportes = DB.get('transportes') || [];
    listaTransportes.innerHTML = '';

    if (transportes.length === 0) {
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
