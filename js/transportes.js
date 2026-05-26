import { db, collection, getDocs, doc, deleteDoc } from './firebase-init.js';

// --- Cadastro de Transportadoras ---

const formTransporte = document.getElementById('formTransporte');
const listaTransportes = document.getElementById('listaTransportes');

const transportesCollection = collection(db, 'transportes');
let transportesAtuais = [];
let transporteEditandoId = null;

window.switchTabTransportes = function(tabName, isEditing = false) {
    const tabForm = document.getElementById('tabTranspForm');
    const tabLista = document.getElementById('tabTranspLista');
    const btnForm = document.getElementById('btnTabTranspForm');
    const btnLista = document.getElementById('btnTabTranspLista');

    if (!tabForm || !tabLista || !btnForm || !btnLista) return;

    if (tabName === 'form') {
        tabForm.style.display = 'block';
        tabLista.style.display = 'none';
        btnForm.style.color = 'var(--accent-color)';
        btnForm.style.borderBottom = '3px solid var(--accent-color)';
        btnLista.style.color = 'var(--text-muted)';
        btnLista.style.borderBottom = 'none';

        if (!isEditing) {
            formTransporte.reset();
            transporteEditandoId = null;
            const submitBtn = formTransporte.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Transportadora';
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
};

// Forçar letras maiúsculas em tempo real nos campos de transportadoras
['transNome', 'transMotorista', 'transCaminhao', 'transPlaca'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', window.forceUppercaseInput);
    }
});

formTransporte.addEventListener('submit', async function(e) {
    e.preventDefault();

    const dadosTransp = {
        nome: document.getElementById('transNome').value.toUpperCase().trim(),
        motorista: document.getElementById('transMotorista').value.toUpperCase().trim(),
        caminhao: document.getElementById('transCaminhao').value.toUpperCase().trim(),
        placa: document.getElementById('transPlaca').value.toUpperCase().trim(),
        atualizadoEm: new Date().toISOString()
    };

    const submitBtn = formTransporte.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
    submitBtn.disabled = true;

    try {
        if(transporteEditandoId) {
            // Atualizar
            await window.FS.updateDoc('transportes', transporteEditandoId, dadosTransp);
            
            transporteEditandoId = null;
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Transportadora';
            submitBtn.classList.replace('btn-secondary', 'btn-primary');
            alert('Transportadora atualizada!');
        } else {
            // Criar
            dadosTransp.criadoEm = new Date().toISOString();
            await window.FS.addDoc('transportes', dadosTransp);
            alert('Transportadora cadastrada com sucesso!');
        }

        formTransporte.reset();
        await carregarTransportes();
        
        // Disparar evento para o combo do romaneio recarregar
        document.dispatchEvent(new Event('transportesUpdated'));
        window.switchTabTransportes('lista');
    } catch (error) {
        console.error("Erro ao salvar transportadora: ", error);
        alert('Erro ao salvar. Verifique o console.');
    } finally {
        if(!transporteEditandoId) submitBtn.innerHTML = textoOriginal;
        submitBtn.disabled = false;
    }
});

window.editarTransporte = function(id) {
    let t = transportesAtuais.find(x => x.id === id);
    if(t) {
        document.getElementById('transNome').value = t.nome || '';
        document.getElementById('transMotorista').value = t.motorista || '';
        document.getElementById('transCaminhao').value = t.caminhao || '';
        document.getElementById('transPlaca').value = t.placa || '';

        transporteEditandoId = t.id;
        
        let submitBtn = formTransporte.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Transportadora';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
        
        window.switchTabTransportes('form', true);
        window.scrollTo(0, 0);
    }
}

window.apagarTransporte = async function(id) {
    if(confirm('Apagar permanentemente esta transportadora/fretista do sistema?')) {
        try {
            const docRef = doc(db, 'transportes', id);
            await deleteDoc(docRef);
            await carregarTransportes();
            document.dispatchEvent(new Event('transportesUpdated'));
        } catch(error) {
            console.error("Erro ao apagar transportadora: ", error);
            alert("Erro ao excluir.");
        }
    }
}

function renderTransportes() {
    listaTransportes.innerHTML = '';

    const filtro = (document.getElementById('filtroTransportesBusca')?.value || '').toLowerCase().trim();
    const ordem = document.getElementById('ordenarTransportes')?.value || 'nome';
    const filtrados = transportesAtuais.filter(t => {
        return [t.nome, t.motorista, t.caminhao, t.placa].some(valor => (valor || '').toLowerCase().includes(filtro));
    }).sort((a, b) => {
        if (ordem === 'data-desc') return new Date(b.criadoEm || b.atualizadoEm || 0) - new Date(a.criadoEm || a.atualizadoEm || 0);
        if (ordem === 'data-asc') return new Date(a.criadoEm || a.atualizadoEm || 0) - new Date(b.criadoEm || b.atualizadoEm || 0);
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

    if (filtrados.length === 0) {
        listaTransportes.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma transportadora cadastrada no momento.</td></tr>`;
        return;
    }

    filtrados.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.nome || '-'}</strong></td>
            <td>${t.motorista || '-'}</td>
            <td>${t.caminhao || '-'}</td>
            <td>${t.placa || '-'}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button onclick="window.editarTransporte('${t.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1rem; padding: 6px 8px;" title="Editar">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button onclick="window.apagarTransporte('${t.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1rem; padding: 6px 8px;" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaTransportes.appendChild(tr);
    });
}

async function carregarTransportes() {
    listaTransportes.innerHTML = `<tr><td colspan="5" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Carregando do Firebase...</td></tr>`;
    try {
        const querySnapshot = await getDocs(transportesCollection);
        transportesAtuais = [];
        querySnapshot.forEach((doc) => {
            transportesAtuais.push({ id: doc.id, ...doc.data() });
        });
        
        renderTransportes();
        document.dispatchEvent(new Event('transportesUpdated'));
    } catch(error) {
        console.error("Erro ao buscar transportadoras: ", error);
        listaTransportes.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger-color);">Erro ao conectar com Firebase.</td></tr>`;
    }
}
window.renderTransportes = renderTransportes;

// Inicializar
document.getElementById('filtroTransportesBusca')?.addEventListener('input', renderTransportes);
document.getElementById('ordenarTransportes')?.addEventListener('change', renderTransportes);
carregarTransportes();
