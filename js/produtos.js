import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from './firebase-init.js';

// --- Gestão de Produtos / Madeiras ---

const formProduto = document.getElementById('formProduto');
const listaProdutos = document.getElementById('listaProdutos');

const produtosCollection = collection(db, 'produtos');
let produtosAtuais = [];
let produtoEditandoId = null;

formProduto.addEventListener('submit', async function(e) {
    e.preventDefault();

    const dadosProd = {
        tipo: document.getElementById('prodTipo').value,
        natureza: document.getElementById('prodNatureza').value,
        qualidade: document.getElementById('prodQualidade').value,
        classe: document.getElementById('prodClasse').value,
        espessura: parseFloat(document.getElementById('prodEspessura').value) || 0,
        largura: parseFloat(document.getElementById('prodLargura').value) || 0,
        comprimentoVenda: parseFloat(document.getElementById('prodComprimentoVenda').value) || 0,
        comprimentoReal: parseFloat(document.getElementById('prodComprimentoReal').value) || 0,
        preco: parseFloat(document.getElementById('prodPreco').value),
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
        document.getElementById('prodPreco').value = p.preco || 0;

        produtoEditandoId = p.id;
        
        let submitBtn = formProduto.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Madeira';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
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
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="window.editarProduto('${p.id}')" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-danger" style="padding: 5px;" onclick="window.apagarProduto('${p.id}')"><i class="fa-solid fa-trash"></i></button>
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

carregarProdutos();
