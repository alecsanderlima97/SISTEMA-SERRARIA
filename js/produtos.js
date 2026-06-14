import { db, collection, getDocs, doc, deleteDoc } from './firebase-init.js';

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
            atualizarVisualClasseProduto();
            atualizarResumoProduto();
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

function obterClasseProduto() {
    const classe = document.getElementById('prodClasse')?.value || '1a CLASSE';
    if (classe === 'OUTRO') {
        return (document.getElementById('prodClasseOutro')?.value || 'OUTRO').toUpperCase().trim();
    }
    return classe;
}

function atualizarVisualClasseProduto() {
    const select = document.getElementById('prodClasse');
    const grupoOutro = document.getElementById('grupoProdClasseOutro');
    if (!select) return;

    select.classList.remove('patio-classe-1', 'patio-classe-2', 'patio-classe-3');
    if (select.value.includes('1')) select.classList.add('patio-classe-1');
    else if (select.value.includes('2')) select.classList.add('patio-classe-2');
    else if (select.value.includes('3')) select.classList.add('patio-classe-3');

    if (grupoOutro) grupoOutro.style.display = select.value === 'OUTRO' ? 'flex' : 'none';
}

function calcularResumoProduto() {
    const esp = parseNumeroBR(document.getElementById('prodEspessura')?.value);
    const larg = parseNumeroBR(document.getElementById('prodLargura')?.value);
    const comp = parseNumeroBR(document.getElementById('prodComprimentoVenda')?.value);
    const alturas = parseInt(document.getElementById('prodAlturas')?.value, 10) || 0;
    const larguraPacote = parseInt(document.getElementById('prodLarguraPacote')?.value, 10) || 0;
    const amarras = parseInt(document.getElementById('prodAmarras')?.value, 10) || 0;
    const pecas = alturas > 0 && larguraPacote > 0 ? (alturas * larguraPacote) + amarras : 0;
    const volume = (esp / 100) * (larg / 100) * comp * pecas;
    return { alturas, larguraPacote, amarras, pecas, volume };
}

function parseNumeroBR(valor) {
    const n = parseFloat(String(valor || '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

function atualizarResumoProduto() {
    const resumo = calcularResumoProduto();
    const totalPecas = document.getElementById('prodTotalPecas');
    const volumePacote = document.getElementById('prodVolumePacote');
    if (totalPecas) totalPecas.textContent = `${resumo.pecas} pc`;
    if (volumePacote) volumePacote.textContent = `${resumo.volume.toFixed(3).replace('.', ',')} m3`;
}

function numeroClasse(valor) {
    const texto = String(valor || '').toUpperCase();
    if (texto.includes('1')) return 1;
    if (texto.includes('2')) return 2;
    if (texto.includes('3')) return 3;
    return 99;
}

function formatarClasseProduto(valor) {
    const numero = numeroClasse(valor);
    if (numero === 1) return '1° CLASSE';
    if (numero === 2) return '2° CLASSE';
    if (numero === 3) return '3° CLASSE';
    return String(valor || '-').toUpperCase();
}

function ordenarMadeiras(lista) {
    return [...lista].sort((a, b) => {
        return numeroClasse(a.classe || a.qualidade) - numeroClasse(b.classe || b.qualidade)
            || (Number(b.comprimentoVenda) || 0) - (Number(a.comprimentoVenda) || 0)
            || (Number(b.espessura) || 0) - (Number(a.espessura) || 0)
            || (Number(b.largura) || 0) - (Number(a.largura) || 0)
            || (Number(b.pecasPorPacote) || 0) - (Number(a.pecasPorPacote) || 0)
            || String(a.tipo || '').localeCompare(String(b.tipo || ''));
    });
}

['prodTipo', 'prodClasseOutro'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', window.forceUppercaseInput);
});

document.getElementById('prodClasse')?.addEventListener('change', atualizarVisualClasseProduto);
['prodEspessura', 'prodLargura', 'prodComprimentoVenda', 'prodAlturas', 'prodLarguraPacote', 'prodAmarras'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', atualizarResumoProduto);
});

formProduto.addEventListener('submit', async function(e) {
    e.preventDefault();

    const resumo = calcularResumoProduto();
    const especie = document.getElementById('prodNatureza').value.toUpperCase().trim();
    const classe = obterClasseProduto();
    const dadosProd = {
        tipo: document.getElementById('prodTipo').value.toUpperCase().trim(),
        natureza: especie,
        especie,
        qualidade: classe,
        classe,
        espessura: parseNumeroBR(document.getElementById('prodEspessura').value),
        largura: parseNumeroBR(document.getElementById('prodLargura').value),
        comprimentoVenda: parseNumeroBR(document.getElementById('prodComprimentoVenda').value),
        comprimentoReal: parseNumeroBR(document.getElementById('prodComprimentoReal').value),
        alturas: resumo.alturas,
        larguraPacote: resumo.larguraPacote,
        amarras: resumo.amarras,
        pecasPorPacote: resumo.pecas,
        configPct: resumo.alturas > 0 && resumo.larguraPacote > 0 ? `${resumo.alturas}x${resumo.larguraPacote}${resumo.amarras > 0 ? `+${resumo.amarras}` : ''}` : '-',
        volumePacote: parseFloat(resumo.volume.toFixed(3)),
        atualizadoEm: new Date().toISOString()
    };

    const submitBtn = formProduto.querySelector('button[type="submit"]');
    const textoOriginal = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
    submitBtn.disabled = true;

    try {
        if (produtoEditandoId) {
            await window.FS.updateDoc('produtos', produtoEditandoId, dadosProd);
            produtoEditandoId = null;
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Madeira';
            submitBtn.classList.replace('btn-secondary', 'btn-primary');
            alert('Madeira atualizada!');
        } else {
            dadosProd.criadoEm = new Date().toISOString();
            await window.FS.addDoc('produtos', dadosProd);
            alert('Madeira cadastrada!');
        }

        formProduto.reset();
        atualizarVisualClasseProduto();
        atualizarResumoProduto();
        await carregarProdutos();
        document.dispatchEvent(new Event('produtosUpdated'));
        window.switchTabProdutos('lista');
    } catch (error) {
        console.error('Erro ao salvar produto/madeira: ', error);
        alert('Erro ao salvar. Verifique o console.');
    } finally {
        if (!produtoEditandoId) submitBtn.innerHTML = textoOriginal;
        submitBtn.disabled = false;
    }
});

window.editarProduto = function(id) {
    const p = produtosAtuais.find(x => x.id === id);
    if (!p) return;

    document.getElementById('prodTipo').value = p.tipo || '';
    document.getElementById('prodNatureza').value = p.natureza || p.especie || 'EUCALIPTO';

    const classeSalva = p.classe || p.qualidade || '1a CLASSE';
    const classePadrao = ['1a CLASSE', '2a CLASSE', '3a CLASSE'].includes(classeSalva) ? classeSalva : 'OUTRO';
    document.getElementById('prodClasse').value = classePadrao;
    document.getElementById('prodClasseOutro').value = classePadrao === 'OUTRO' ? classeSalva : '';

    document.getElementById('prodEspessura').value = p.espessura || 0;
    document.getElementById('prodLargura').value = p.largura || 0;
    document.getElementById('prodComprimentoVenda').value = p.comprimentoVenda || 0;
    document.getElementById('prodComprimentoReal').value = p.comprimentoReal || 0;
    document.getElementById('prodAlturas').value = p.alturas || '';
    document.getElementById('prodLarguraPacote').value = p.larguraPacote || '';
    document.getElementById('prodAmarras').value = p.amarras || 0;

    atualizarVisualClasseProduto();
    atualizarResumoProduto();
    produtoEditandoId = p.id;

    const submitBtn = formProduto.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Madeira';
    submitBtn.classList.replace('btn-primary', 'btn-secondary');

    window.switchTabProdutos('form', true);
    window.scrollTo(0, 0);
};

window.apagarProduto = async function(id) {
    if (await window.confirmarExclusaoComSenha('Apagar permanentemente configuracao desta madeira?')) {
        try {
            const docRef = doc(db, 'produtos', id);
            await deleteDoc(docRef);
            await carregarProdutos();
            document.dispatchEvent(new Event('produtosUpdated'));
        } catch (error) {
            console.error('Erro ao apagar produto: ', error);
            alert('Erro ao excluir.');
        }
    }
};

function renderProdutos() {
    listaProdutos.innerHTML = '';

    if (produtosAtuais.length === 0) {
        listaProdutos.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhum produto cadastrado no momento.</td></tr>';
        return;
    }

    ordenarMadeiras(produtosAtuais).forEach(p => {
        const classe = p.classe || p.qualidade || '-';
        const numeroClasse = String(classe).includes('1') ? 1 : String(classe).includes('2') ? 2 : String(classe).includes('3') ? 3 : 0;
        const corClasse = numeroClasse === 1 ? '#22c55e' : numeroClasse === 2 ? '#facc15' : numeroClasse === 3 ? '#ef4444' : '#94a3b8';
        const medidas = `${p.espessura || 0} / ${p.largura || 0} / ${p.comprimentoVenda || 0}m`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span style="display:inline-block; min-width:92px; text-align:center; padding:7px 12px; border-radius:8px; background:${corClasse}26; color:${corClasse} !important; font-weight:900; border:1px solid ${corClasse}88;">${formatarClasseProduto(classe)}</span>
            </td>
            <td>
                <strong style="display:block; color:${corClasse} !important; font-size:1.18rem; font-weight:900; letter-spacing:0;">${medidas}</strong>
            </td>
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
    listaProdutos.innerHTML = '<tr><td colspan="3" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Carregando do Firebase...</td></tr>';
    try {
        const querySnapshot = await getDocs(produtosCollection);
        produtosAtuais = [];
        querySnapshot.forEach((doc) => {
            produtosAtuais.push({ id: doc.id, ...doc.data() });
        });

        renderProdutos();
        document.dispatchEvent(new Event('produtosUpdated'));
    } catch (error) {
        console.error('Erro ao buscar produtos: ', error);
        listaProdutos.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--danger-color);">Erro ao conectar com Firebase.</td></tr>';
    }
}

atualizarVisualClasseProduto();
atualizarResumoProduto();
window.SectionLoader?.register('view-produtos', carregarProdutos);
