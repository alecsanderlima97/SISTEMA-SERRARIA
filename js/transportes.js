import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from './firebase-init.js';

// --- Cadastro de Transportadoras ---

const formTransporte = document.getElementById('formTransporte');
const listaTransportes = document.getElementById('listaTransportes');

const transportesCollection = collection(db, 'transportes');
let transportesAtuais = [];
let transporteEditandoId = null;

formTransporte.addEventListener('submit', async function(e) {
    e.preventDefault();

    const dadosTransp = {
        nome: document.getElementById('transNome').value,
        motorista: document.getElementById('transMotorista').value,
        caminhao: document.getElementById('transCaminhao').value,
        placa: document.getElementById('transPlaca').value,
        atualizadoEm: new Date().toISOString()
    };

    const submitBtn = formTransporte.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    submitBtn.disabled = true;

    try {
        if(transporteEditandoId) {
            // Atualizar
            const docRef = doc(db, 'transportes', transporteEditandoId);
            await updateDoc(docRef, dadosTransp);
            
            transporteEditandoId = null;
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Transportadora';
            submitBtn.classList.replace('btn-secondary', 'btn-primary');
            alert('Transportadora atualizada!');
        } else {
            // Criar
            dadosTransp.criadoEm = new Date().toISOString();
            await addDoc(transportesCollection, dadosTransp);
            alert('Transportadora cadastrada com sucesso!');
        }

        formTransporte.reset();
        await carregarTransportes();
        
        // Disparar evento para o combo do romaneio recarregar
        document.dispatchEvent(new Event('transportesUpdated'));
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

    if (transportesAtuais.length === 0) {
        listaTransportes.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma transportadora cadastrada no momento.</td></tr>`;
        return;
    }

    transportesAtuais.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.nome || '-'}</strong></td>
            <td>${t.motorista || '-'}</td>
            <td>${t.caminhao || '-'}</td>
            <td>${t.placa || '-'}</td>
            <td>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="window.editarTransporte('${t.id}')" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-danger" style="padding: 5px;" onclick="window.apagarTransporte('${t.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        listaTransportes.appendChild(tr);
    });
}

async function carregarTransportes() {
    listaTransportes.innerHTML = `<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando do Firebase...</td></tr>`;
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

// Inicializar
carregarTransportes();
