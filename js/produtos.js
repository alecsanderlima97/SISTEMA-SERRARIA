import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from './firebase-init.js';

// --- Gestão de Produtos / Madeiras ---

const formProduto = document.getElementById('formProduto');
const listaProdutos = document.getElementById('listaProdutos');

const produtosCollection = collection(db, 'produtos');
let produtosAtuais = [];
let produtoEditandoId = null;

window.switchTabProdutos = function(tabName, isEditing = false) {
    const tabForm = document.getElementById('tabProdForm');
    const tabLista = document.getElementById('tabProdLista');
    const btnForm = document.getElementById('btnTabProdForm');
    const btnLista = document.getElementById('btnTabProdLista');

    if (!tabForm || !tabLista || !btnForm || !btnLista) return;

    if (tabName === 'form') {
        tabForm.style.display = 'block';
        tabLista.style.display = 'none';
        btnForm.style.color = 'var(--accent-color)';
        btnForm.style.borderBottom = '3px solid var(--accent-color)';
        btnLista.style.color = 'var(--text-muted)';
        btnLista.style.borderBottom = 'none';

        if (!isEditing) {
            formProduto.reset();
            produtoEditandoId = null;
            const submitBtn = formProduto.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Madeira';
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

// Forçar letras maiúsculas em tempo real nos campos de madeiras
['prodTipo', 'prodNatureza', 'prodQualidade'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener('input', window.forceUppercaseInput);
    }
});

formProduto.addEventListener('submit', async function(e) {
    e.preventDefault();

    const dadosProd = {
        tipo: document.getElementById('prodTipo').value.toUpperCase().trim(),
        natureza: document.getElementById('prodNatureza').value.toUpperCase().trim(),
        qualidade: document.getElementById('prodQualidade').value.toUpperCase().trim(),
        classe: document.getElementById('prodClasse').value,
        espessura: parseFloat(document.getElementById('prodEspessura').value) || 0,
        largura: parseFloat(document.getElementById('prodLargura').value) || 0,
        comprimentoVenda: parseFloat(document.getElementById('prodComprimentoVenda').value) || 0,
        comprimentoReal: parseFloat(document.getElementById('prodComprimentoReal').value) || 0,
        preco: window.parseCurrencyValue(document.getElementById('prodPreco').value),
        atualizadoEm: new Date().toISOString()
    };

    const submitBtn = formProduto.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    submitBtn.disabled = true;

    try {
        if(produtoEditandoId) {
            // Atualizar
            const docRef = doc(db, 'produtos', produtoEditandoId);
            await updateDoc(docRef, dadosProd);
            
            produtoEditandoId = null;
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Madeira';
            submitBtn.classList.replace('btn-secondary', 'btn-primary');
            alert('Madeira atualizada!');
        } else {
            // Criar
            dadosProd.criadoEm = new Date().toISOString();
            await addDoc(produtosCollection, dadosProd);
            alert('Madeira cadastrada!');
        }

        formProduto.reset();
        await carregarProdutos();
        
        // Disparar evento para o combo do romaneio recarregar
        document.dispatchEvent(new Event('produtosUpdated'));
        window.switchTabProdutos('lista');
    } catch (error) {
        console.error("Erro ao salvar produto/madeira: ", error);
        alert('Erro ao salvar. Verifique o console.');
    } finally {
        if(!produtoEditandoId) submitBtn.innerHTML = textoOriginal;
        submitBtn.disabled = false;
    }
});

window.editarProduto = function(id) {
    let p = produtosAtuais.find(x => x.id === id);
    if(p) {
        document.getElementById('prodTipo').value = p.tipo || '';
        document.getElementById('prodNatureza').value = p.natureza || '';
        document.getElementById('prodQualidade').value = p.qualidade || '';
        document.getElementById('prodClasse').value = p.classe || '';
        document.getElementById('prodEspessura').value = p.espessura || 0;
        document.getElementById('prodLargura').value = p.largura || 0;
        document.getElementById('prodComprimentoVenda').value = p.comprimentoVenda || 0;
        document.getElementById('prodComprimentoReal').value = p.comprimentoReal || 0;
        document.getElementById('prodPreco').value = window.formatCurrencyValue(p.preco);

        produtoEditandoId = p.id;
        
        let submitBtn = formProduto.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Madeira';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
        
        window.switchTabProdutos('form', true);
        window.scrollTo(0, 0);
    }
}

window.apagarProduto = async function(id) {
    if(confirm('Apagar permanentemente configuração desta madeira?')) {
        try {
            const docRef = doc(db, 'produtos', id);
            await deleteDoc(docRef);
            await carregarProdutos();
            document.dispatchEvent(new Event('produtosUpdated'));
        } catch(error) {
            console.error("Erro ao apagar produto: ", error);
            alert("Erro ao excluir.");
        }
    }
}

function renderProdutos() {
    listaProdutos.innerHTML = '';
    
    if(produtosAtuais.length === 0) {
        listaProdutos.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhum produto cadastrado no momento.</td></tr>`;
        return;
    }

    produtosAtuais.forEach(p => {
        const naturezaQualidade = `${p.natureza || '-'} - ${p.qualidade || '-'}`;
        const precoNum = parseFloat(p.preco) || 0;
        const precoFormatado = precoNum.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const medidas = `${p.espessura} x ${p.largura} x ${p.comprimentoVenda}m`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${p.tipo || '-'}</strong>
            </td>
            <td>
                ${naturezaQualidade} <br>
                <small style="color: var(--warning)">${medidas}</small>
            </td>
            <td style="color:var(--accent-color); font-weight:bold;">${precoFormatado}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button onclick="window.editarProduto('${p.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1rem; padding: 6px 8px;" title="Editar">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button onclick="window.apagarProduto('${p.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1rem; padding: 6px 8px;" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaProdutos.appendChild(tr);
    });
}

async function carregarProdutos() {
    listaProdutos.innerHTML = `<tr><td colspan="4" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando do Firebase...</td></tr>`;
    try {
        const querySnapshot = await getDocs(produtosCollection);
        produtosAtuais = [];
        querySnapshot.forEach((doc) => {
            produtosAtuais.push({ id: doc.id, ...doc.data() });
        });
        
        renderProdutos();
        document.dispatchEvent(new Event('produtosUpdated'));
    } catch(error) {
        console.error("Erro ao buscar produtos: ", error);
        listaProdutos.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--danger-color);">Erro ao conectar com Firebase.</td></tr>`;
    }
}

// Adicionar listener de máscara de R$ para o preço da madeira
const prodPrecoInput = document.getElementById('prodPreco');
if (prodPrecoInput) {
    prodPrecoInput.addEventListener('input', window.formatCurrencyInput);
}

carregarProdutos();
