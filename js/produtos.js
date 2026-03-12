// --- Gestão de Produtos / Madeiras ---

const formProduto = document.getElementById('formProduto');
const listaProdutos = document.getElementById('listaProdutos');

let produtoEditandoId = null;

formProduto.addEventListener('submit', async function(e) {
    e.preventDefault();

    const dadosProd = {
        tipo: document.getElementById('prodTipo').value,
        natureza: document.getElementById('prodNatureza').value,
        qualidade: document.getElementById('prodQualidade').value,
        classe: document.getElementById('prodClasse').value,
        preco: parseFloat(document.getElementById('prodPreco').value)
    };

    try {
        if(produtoEditandoId) {
            // Atualizar no Supabase
            await DB.update('produtos', produtoEditandoId, dadosProd);
            produtoEditandoId = null;
            formProduto.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> Salvar Madeira';
            formProduto.querySelector('button[type="submit"]').classList.replace('btn-secondary', 'btn-primary');
            alert('Madeira atualizada!');
        } else {
            // Criar no Supabase
            await DB.insert('produtos', dadosProd);
            alert('Madeira cadastrada!');
        }

        formProduto.reset();
        await renderProdutos();
        
        // Disparar evento para o combo do romaneio recarregar
        document.dispatchEvent(new Event('produtosUpdated'));
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar produto no Supabase.');
    }
});

window.editarProduto = async function(id) {
    let p = await DB.getById('produtos', id);
    if(p) {
        document.getElementById('prodTipo').value = p.tipo;
        document.getElementById('prodNatureza').value = p.natureza;
        document.getElementById('prodQualidade').value = p.qualidade;
        document.getElementById('prodClasse').value = p.classe || '';
        document.getElementById('prodPreco').value = p.preco;

        produtoEditandoId = p.id;
        
        let submitBtn = formProduto.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Madeira';
        submitBtn.classList.replace('btn-primary', 'btn-secondary');
        window.scrollTo(0, 0);
    }
}

window.apagarProduto = async function(id) {
    if(confirm('Apagar configuração de madeira?')) {
        const sucesso = await DB.delete('produtos', id);
        if (sucesso) {
            await renderProdutos();
            document.dispatchEvent(new Event('produtosUpdated'));
        }
    }
}

async function renderProdutos() {
    if(!listaProdutos) return;
    listaProdutos.innerHTML = '<tr><td colspan="4" style="text-align:center;">Buscando dados no Supabase...</td></tr>';

    const produtos = await DB.list('produtos');
    listaProdutos.innerHTML = '';
    
    if(!produtos || produtos.length === 0) {
        listaProdutos.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhum produto cadastrado.</td></tr>`;
        return;
    }

    produtos.forEach(p => {
        const naturezaQualidade = `${p.natureza} - ${p.qualidade}`;
        const precoFormatado = window.formatarMoeda(p.preco);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.tipo}</strong> <br> <span style="font-size:0.8rem; color:var(--text-muted);">${p.classe || ''}</span></td>
            <td>${naturezaQualidade}</td>
            <td style="color:var(--accent-color); font-weight:bold;">${precoFormatado}</td>
            <td>
                <button class="btn-secondary" style="padding: 5px; margin-right:5px; border-color:var(--accent-color); color:var(--accent-color);" onclick="editarProduto(${p.id})" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-danger" style="padding: 5px;" onclick="apagarProduto(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        listaProdutos.appendChild(tr);
    });
}

renderProdutos();
