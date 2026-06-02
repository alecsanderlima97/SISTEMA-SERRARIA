// --- CONTROLE DE FROTAS & EQUIPAMENTOS JS ---
// Arquitetura SaaS Premium com persistência de dados offline-first (localStorage)
// Integrado com controle de estoque e consumo de insumos (diesel e lubrificantes)

console.log("Módulo de Frotas carregado com sucesso. Inicializando...");

// --- PERSISTÊNCIA & ALIMENTAÇÃO DE DADOS PADRÕES ---
const KEYS = {
    FROTA: 'orquestra_frota',
    ABASTECIMENTOS: 'orquestra_frota_abastecimentos',
    MANUTENCOES: 'orquestra_frota_manutencoes',
    RELATOS: 'orquestra_frota_relatos',
    ESTOQUE: 'orquestra_estoque' // Chave unificada para simular o almoxarifado
};

const FROTA_COLLECTIONS = {
    FROTA: 'frotas',
    ABASTECIMENTOS: 'frota_abastecimentos',
    MANUTENCOES: 'frota_manutencoes'
};

const FINANCEIRO_FROTAS_KEY = 'orquestra_financeiro_lancamentos';
const FINANCEIRO_FROTAS_COLLECTION = 'financeiro_lancamentos';

function tipoAbastecimentoLabel(tipo) {
    if (tipo === 'DIESEL_POSTO') return 'DIESEL POSTO';
    if (tipo === 'DIESEL') return 'DIESEL COMUM';
    if (tipo === 'LUBRIFICANTE') return 'LUBRIFICANTE';
    return tipo || '-';
}

async function registrarDespesaAbastecimentoPosto(abastecimento, veiculo) {
    const lancamento = {
        id: abastecimento.financeiroId || `fin_frota_${abastecimento.id}`,
        aba: 'despesas-gerais',
        tipo: 'DIESEL POSTO',
        descricao: `ABASTECIMENTO POSTO - ${veiculo ? `${veiculo.modelo} ${veiculo.placa}` : 'FROTA'}`,
        vencimento: abastecimento.data,
        valor: abastecimento.total,
        observacao: `Gerado automaticamente pelo modulo de frotas. Requisicao: ${abastecimento.requisicao || '-'} | Litros: ${Number(abastecimento.qtd || 0).toLocaleString('pt-BR')} | Horimetro/KM: ${abastecimento.horimetro || '-'}`,
        pago: false,
        pagoEm: null,
        documento: null,
        comprovante: null,
        origem: 'FROTAS_ABASTECIMENTO_POSTO',
        abastecimentoId: abastecimento.id,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    const lista = JSON.parse(localStorage.getItem(FINANCEIRO_FROTAS_KEY) || '[]');
    const index = lista.findIndex(item => item.id === lancamento.id);
    if (index >= 0) lista[index] = lancamento;
    else lista.push(lancamento);
    localStorage.setItem(FINANCEIRO_FROTAS_KEY, JSON.stringify(lista));

    if (window.FS) await window.FS.setDoc(FINANCEIRO_FROTAS_COLLECTION, lancamento.id, lancamento);
    if (typeof window.renderFinanceiro === 'function') window.renderFinanceiro();
    return lancamento.id;
}

// Inicialização de dados default no Estoque para demonstrar a vinculação
const DEFAULT_ESTOQUE = [
    { id: 'est_01', nome: 'FILTRO DE AR DE MOTOR', categoria: 'FILTROS', quantidade: 15, unitario: 180.00 },
    { id: 'est_02', nome: 'FILTRO DE COMBUSTÍVEL', categoria: 'FILTROS', quantidade: 22, unitario: 90.00 },
    { id: 'est_03', nome: 'PASTILHA DE FREIO DIANTEIRA', categoria: 'PEÇAS', quantidade: 8, unitario: 320.00 },
    { id: 'est_04', nome: 'CORREIA DO ALTERNADOR', categoria: 'CORREIAS INDUSTRIAIS', quantidade: 12, unitario: 75.00 },
    { id: 'est_05', nome: 'ÓLEO LUBRIFICANTE 15W40', categoria: 'LUBRIFICANTES', quantidade: 250, unitario: 28.00 },
    { id: 'est_06', nome: 'ÓLEO HIDRÁULICO ISO 68', categoria: 'LUBRIFICANTES', quantidade: 400, unitario: 32.00 },
    { id: 'est_07', nome: 'GRAXA DE CHASSI MP2', categoria: 'LUBRIFICANTES', quantidade: 50, unitario: 24.00 },
    { id: 'est_08', nome: 'BICO INJETOR DIESEL', categoria: 'PEÇAS', quantidade: 6, unitario: 650.00 },
    { id: 'est_09', nome: 'DIESEL COMUM', categoria: 'DIESEL', quantidade: 5000, unitario: 5.89 }
];

const DEFAULT_FROTA = [
    { id: 'v_01', modelo: 'CAMINHÃO VOLVO FH 540', placa: 'ABC-5F40', grupo: 'FLORESTAL', ano: 2021, documento: '', documentoNome: '' },
    { id: 'v_02', modelo: 'PÁ CARREGADEIRA CAT 924K', placa: 'PC-02', grupo: 'SERRARIA', ano: 2019, documento: '', documentoNome: '' },
    { id: 'v_03', modelo: 'ESCADA DE ESTEIRA KOMATSU D61', placa: 'TR-05', grupo: 'TERRAPLANAGEM', ano: 2022, documento: '', documentoNome: '' }
];

// Carregar e persistir iniciais se vazios
function obterBanco(key, defaults = []) {
    const dados = localStorage.getItem(key);
    if (!dados) {
        localStorage.setItem(key, JSON.stringify(defaults));
        return defaults;
    }
    return JSON.parse(dados);
}

function salvarBanco(key, dados) {
    localStorage.setItem(key, JSON.stringify(dados));
}

async function carregarColecaoFrota(collName, key, defaults = []) {
    const cacheLocal = obterBanco(key, defaults);
    if (!window.FS) return cacheLocal;
    try {
        const nuvem = await window.FS.getCollection(collName);
        if (nuvem.length > 0) {
            salvarBanco(key, nuvem);
            return nuvem;
        }
        const base = cacheLocal.length > 0 ? cacheLocal : defaults;
        await Promise.all(base.map(item => window.FS.setDoc(collName, item.id, item)));
        salvarBanco(key, base);
        return base;
    } catch (error) {
        console.error(`Falha ao carregar ${collName} no Firestore. Usando cache local.`, error);
        return cacheLocal;
    }
}

async function salvarDocFrota(collName, item) {
    if (!window.FS || !item?.id) return;
    try {
        await window.FS.setDoc(collName, item.id, item);
    } catch (error) {
        console.error(`Falha ao salvar ${collName}/${item.id} no Firestore.`, error);
        alert('Registro salvo localmente, mas nao foi possivel sincronizar com a nuvem agora.');
    }
}

async function excluirDocFrota(collName, id) {
    if (!window.FS || !id) return true;
    try {
        await window.FS.deleteDoc(collName, id);
        return true;
    } catch (error) {
        console.error(`Falha ao excluir ${collName}/${id} no Firestore.`, error);
        alert('Nao foi possivel excluir na nuvem agora. O registro foi mantido localmente para evitar divergencia. Tente novamente em alguns instantes.');
        return false;
    }
}

// Estados Locais
let frota = obterBanco(KEYS.FROTA, DEFAULT_FROTA);
let abastecimentos = obterBanco(KEYS.ABASTECIMENTOS, []);
let manutencoes = obterBanco(KEYS.MANUTENCOES, []);
let relatosFrota = obterBanco(KEYS.RELATOS, []);
let estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);

// Lista temporária de peças para o modal de manutenção
let pecasManutencaoTemp = [];

// --- FILTRO DE GRUPO ---
let setorFiltroAtual = 'TODOS';

function gerarCodigoFrota(grupo = 'MAQ') {
    const prefixo = grupo === 'FLORESTAL' ? 'MAQ' : grupo === 'TERRAPLANAGEM' ? 'TER' : 'SER';
    const usados = new Set(frota.map(v => (v.codigo || '').toUpperCase()).filter(Boolean));
    let seq = frota.length + 1;
    let codigo = '';
    do {
        codigo = `${prefixo}-${String(seq).padStart(4, '0')}`;
        seq++;
    } while (usados.has(codigo));
    return codigo;
}

function garantirCodigoFrota(veiculo) {
    if (veiculo.codigo) return veiculo.codigo.toUpperCase().trim();
    const codigo = gerarCodigoFrota(veiculo.grupo || 'MAQ');
    veiculo.codigo = codigo;
    return codigo;
}

function getUrlFrotaCodigo(codigo) {
    const base = 'https://sistema-serraria.vercel.app/';
    return `${base}?view=frotas&codigo=${encodeURIComponent(codigo)}`;
}

function getStatusFrotaInfo(status = 'OK') {
    const mapa = {
        OK: { label: 'OK', color: '#22c55e' },
        AGUARDANDO: { label: 'AGUARDANDO', color: '#eab308' },
        MANUTENCAO: { label: 'EM MANUTENCAO', color: '#ef4444' }
    };
    return mapa[status] || mapa.OK;
}

// --- INICIALIZADOR DO MÓDULO ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventosFrotas();
    renderizarFrota();
    atualizarKPIsFrota();
    carregarDadosFrotaNuvem();
});

async function carregarDadosFrotaNuvem() {
    frota = await carregarColecaoFrota(FROTA_COLLECTIONS.FROTA, KEYS.FROTA, DEFAULT_FROTA);
    abastecimentos = await carregarColecaoFrota(FROTA_COLLECTIONS.ABASTECIMENTOS, KEYS.ABASTECIMENTOS, []);
    manutencoes = await carregarColecaoFrota(FROTA_COLLECTIONS.MANUTENCOES, KEYS.MANUTENCOES, []);
    relatosFrota = obterBanco(KEYS.RELATOS, []);
    renderizarFrota();
    atualizarKPIsFrota();
}

// Registrar eventos
function inicializarEventosFrotas() {
    const btnCancelar = document.getElementById('btnCancelarFrota');
    const form = document.getElementById('formFrota');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            window.switchTabFrotas('lista');
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarVeiculo();
        });
    }

    document.getElementById('buscaFrota')?.addEventListener('input', renderizarFrota);
    document.getElementById('ordenarFrota')?.addEventListener('change', renderizarFrota);
    document.getElementById('veicCodigo')?.addEventListener('input', window.forceUppercaseInput);

    // Registrar submits de modals
    const formAbast = document.getElementById('formAbastecimento');
    if (formAbast) {
        formAbast.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarAbastecimento();
        });
    }

    const formManut = document.getElementById('formManutencao');
    if (formManut) {
        formManut.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarManutencao();
        });
    }
}

window.switchTabFrotas = function(tabName, isEditing = false) {
    const tabForm = document.getElementById('cardFormFrota');
    const tabLista = document.getElementById('panelListaFrotas');
    const btnForm = document.getElementById('btnTabFrotaForm');
    const btnLista = document.getElementById('btnTabFrotaLista');

    if (!tabForm || !tabLista || !btnForm || !btnLista) return;

    if (tabName === 'form') {
        tabForm.style.display = 'block';
        tabLista.style.display = 'block';
        btnForm.style.color = 'var(--accent-color)';
        btnForm.style.borderBottom = '3px solid var(--accent-color)';
        btnLista.style.color = 'var(--text-muted)';
        btnLista.style.borderBottom = 'none';

        if (!isEditing) {
            limparFormFrota();
            document.getElementById('veiculoId').value = '';
            document.getElementById('formFrotaTitulo').innerHTML = `<i class="fa-solid fa-truck-pickup"></i> Novo Veículo`;
            const lblTab = document.getElementById('lblTabFrotaForm');
            if (lblTab) lblTab.textContent = 'Novo Veículo / Máquina';
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

// --- CONTROLE DE CADASTRO DE VEÍCULOS ---
function limparFormFrota() {
    document.getElementById('veiculoId').value = '';
    document.getElementById('veicModelo').value = '';
    document.getElementById('veicCodigo').value = '';
    document.getElementById('veicPlaca').value = '';
    document.getElementById('veicGrupo').value = 'SERRARIA';
    document.getElementById('veicStatus').value = 'OK';
    document.getElementById('veicAno').value = '';
    document.getElementById('veicDocumento').value = '';
    document.getElementById('lblDocumentoNome').textContent = 'Nenhum arquivo anexado';
    document.getElementById('veicDocumentoBase64').value = '';
    document.getElementById('formFrotaTitulo').innerHTML = '<i class="fa-solid fa-truck-pickup"></i> Novo Veículo';
}

// Conversão do documento para base64 para salvar no localStorage
window.handleDocumentoUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const label = document.getElementById('lblDocumentoNome');
    if (label) label.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        document.getElementById('veicDocumentoBase64').value = base64Data;
    };
    reader.readAsDataURL(file);
};

async function salvarVeiculo() {
    const id = document.getElementById('veiculoId').value;
    const modelo = document.getElementById('veicModelo').value.trim().toUpperCase() || 'VEÍCULO S/ MODELO';
    const codigoInput = document.getElementById('veicCodigo').value.trim().toUpperCase();
    const placa = document.getElementById('veicPlaca').value.trim().toUpperCase() || 'S/ PLACA';
    const grupo = document.getElementById('veicGrupo').value || 'SERRARIA';
    const statusOperacional = document.getElementById('veicStatus')?.value || 'OK';
    const ano = parseInt(document.getElementById('veicAno').value) || new Date().getFullYear();
    const documento = document.getElementById('veicDocumentoBase64').value;
    const documentoNome = document.getElementById('lblDocumentoNome').textContent;

    let registroSalvo = null;
    if (id) {
        // Editar existente
        frota = frota.map(v => {
            if (v.id !== id) return v;
            registroSalvo = { ...v, modelo, codigo: codigoInput || v.codigo || gerarCodigoFrota(grupo), placa, grupo, statusOperacional, ano, documento: documento || v.documento, documentoNome: documento ? documentoNome : v.documentoNome, atualizadoEm: new Date().toISOString() };
            return registroSalvo;
        });
    } else {
        // Novo veículo
        const novo = {
            id: 'v_' + new Date().getTime(),
            modelo,
            codigo: codigoInput || gerarCodigoFrota(grupo),
            placa,
            grupo,
            statusOperacional,
            ano,
            documento,
            documentoNome: documento ? documentoNome : 'Sem Anexo',
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };
        frota.push(novo);
        registroSalvo = novo;
    }

    salvarBanco(KEYS.FROTA, frota);
    await salvarDocFrota(FROTA_COLLECTIONS.FROTA, registroSalvo);
    renderizarFrota();
    atualizarKPIsFrota();

    // Fechar formulário
    window.switchTabFrotas('lista');
}

window.editarVeiculo = function(id) {
    const v = frota.find(item => item.id === id);
    if (!v) return;

    window.switchTabFrotas('form', true);

    document.getElementById('veiculoId').value = v.id;
    document.getElementById('veicModelo').value = v.modelo;
    document.getElementById('veicCodigo').value = garantirCodigoFrota(v);
    document.getElementById('veicPlaca').value = v.placa;
    document.getElementById('veicGrupo').value = v.grupo;
    document.getElementById('veicStatus').value = v.statusOperacional || 'OK';
    document.getElementById('veicAno').value = v.ano;
    document.getElementById('veicDocumentoBase64').value = v.documento || '';
    document.getElementById('lblDocumentoNome').textContent = v.documentoNome || 'Sem Anexo';

    document.getElementById('formFrotaTitulo').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Veículo: ${v.placa}`;
    const lblTab = document.getElementById('lblTabFrotaForm');
    if (lblTab) lblTab.textContent = 'Editar Veículo';

    // Rolar até o form
    document.getElementById('cardFormFrota').scrollIntoView({ behavior: 'smooth' });
};

window.excluirVeiculo = async function(id) {
    const autorizado = await window.confirmarExclusaoComSenha("Tem certeza que deseja excluir este veiculo? Isso nao apagara o historico de abastecimentos e manutencoes dele, mas ele nao constara na listagem principal.");
    if (!autorizado) return;

    const okNuvem = await excluirDocFrota(FROTA_COLLECTIONS.FROTA, id);
    if (!okNuvem) return;

    frota = frota.filter(v => v.id !== id);
    salvarBanco(KEYS.FROTA, frota);
    renderizarFrota();
    atualizarKPIsFrota();
};

window.abrirFrotaPorCodigo = function(codigo) {
    const codigoBusca = (codigo || '').toUpperCase().trim();
    if (!codigoBusca) return false;
    const veiculo = frota.find(v => (garantirCodigoFrota(v) || '').toUpperCase() === codigoBusca);
    if (!veiculo) {
        alert(`Nenhuma máquina encontrada com o código ${codigoBusca}.`);
        return false;
    }

    if (typeof window.navegarPara === 'function') window.navegarPara('view-frotas');
    window.switchTabFrotas('lista');
    const busca = document.getElementById('buscaFrota');
    if (busca) busca.value = codigoBusca;
    renderizarFrota();
    setTimeout(() => {
        const card = document.querySelector(`[data-frota-codigo="${codigoBusca}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.75)';
            setTimeout(() => card.style.boxShadow = '', 3500);
        }
    }, 250);
    return true;
};

window.imprimirQrFrota = function(id) {
    const v = frota.find(item => item.id === id);
    if (!v) return;
    const codigo = garantirCodigoFrota(v);
    salvarBanco(KEYS.FROTA, frota);
    const url = getUrlFrotaCodigo(codigo);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
    const win = window.open('', '_blank');
    if (!win) {
        alert('Não foi possível abrir a etiqueta. Libere pop-ups para este site e tente novamente.');
        return;
    }
    win.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>QR Code ${codigo}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
                .etiqueta { width: 92mm; min-height: 92mm; border: 2px solid #111827; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; }
                h1 { font-size: 18px; margin: 0; text-transform: uppercase; }
                .codigo { font-size: 28px; font-weight: 900; letter-spacing: 1px; }
                img { width: 62mm; height: 62mm; }
                .meta { font-size: 12px; line-height: 1.35; }
                @media print { body { padding: 0; } .etiqueta { page-break-inside: avoid; } }
            </style>
        </head>
        <body>
            <div class="etiqueta">
                <h1>Sistema Serraria</h1>
                <div class="codigo">${codigo}</div>
                <img src="${qrUrl}" alt="QR Code ${codigo}">
                <div class="meta"><strong>${v.modelo || '-'}</strong><br>${v.placa || '-'} | ${v.grupo || '-'}</div>
                <div class="meta">Escaneie para abrir a ficha da máquina.</div>
            </div>
            <script>window.onload = () => setTimeout(() => window.print(), 500);<\/script>
        </body>
        </html>
    `);
    win.document.close();
};

// --- FILTRAR FROTA ---
window.filtrarFrota = function(grupo) {
    setorFiltroAtual = grupo;
    
    // Atualizar classes ativas dos botões
    const botoes = ['todos', 'serraria', 'florestal', 'terraplanagem'];
    botoes.forEach(b => {
        const el = document.getElementById(`btn-frota-${b}`);
        if (el) el.classList.remove('active');
    });

    const activeEl = document.getElementById(`btn-frota-${grupo.toLowerCase()}`);
    if (activeEl) activeEl.classList.add('active');

    renderizarFrota();
};

// --- RENDERIZAR GRID DE CARD DE VEÍCULOS ---
function renderizarFrota() {
    const grid = document.getElementById('gridVeiculosFrota');
    if (!grid) return;

    let atualizouCodigos = false;
    frota.forEach(v => {
        if (!v.codigo) {
            garantirCodigoFrota(v);
            atualizouCodigos = true;
        }
    });
    if (atualizouCodigos) {
        salvarBanco(KEYS.FROTA, frota);
        frota.forEach(v => salvarDocFrota(FROTA_COLLECTIONS.FROTA, v));
    }

    const busca = (document.getElementById('buscaFrota')?.value || '').toLowerCase().trim();
    const ordem = document.getElementById('ordenarFrota')?.value || 'nome';
    const filtrados = frota
        .filter(v => setorFiltroAtual === 'TODOS' || v.grupo === setorFiltroAtual)
        .filter(v => [v.modelo, v.codigo, v.placa, v.grupo].some(valor => (valor || '').toLowerCase().includes(busca)))
        .sort((a, b) => {
            if (ordem === 'data-desc') return new Date(b.criadoEm || b.atualizadoEm || 0) - new Date(a.criadoEm || a.atualizadoEm || 0);
            if (ordem === 'data-asc') return new Date(a.criadoEm || a.atualizadoEm || 0) - new Date(b.criadoEm || b.atualizadoEm || 0);
            return (a.modelo || '').localeCompare(b.modelo || '', 'pt-BR');
        });

    if (filtrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: span 3; text-align: center; color: var(--text-muted); padding: 40px;" class="glass-panel">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 10px; color: var(--accent-color);"></i>
                <p>Nenhum veículo ou equipamento cadastrado para o setor <strong>${setorFiltroAtual}</strong>.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtrados.map(v => {
        const codigo = garantirCodigoFrota(v);
        const statusInfo = getStatusFrotaInfo(v.statusOperacional || 'OK');
        const relatosPendentesLista = relatosFrota.filter(r => r.veiculoId === v.id && r.status !== 'RESOLVIDO');
        const relatosPendentes = relatosPendentesLista.length;
        const avisoProblemaHtml = relatosPendentes ? `
            <div style="margin-bottom:12px; padding:10px; border-radius:10px; background:rgba(245,158,11,0.14); border:1px solid rgba(245,158,11,0.35); color:#fde68a; font-size:0.82rem; line-height:1.35;">
                <strong style="display:flex; align-items:center; gap:6px; color:#fbbf24;"><i class="fa-solid fa-triangle-exclamation"></i> Maquina com problema</strong>
                <div style="margin-top:4px; color:#fff;">${relatosPendentesLista[0].relato || 'Relato pendente'}</div>
                <button type="button" onclick="window.resolverRelatosFrota('${v.id}')" style="margin-top:8px; border:none; border-radius:6px; padding:6px 9px; background:#16a34a; color:#fff; font-size:0.75rem; font-weight:800; cursor:pointer;">Marcar resolvido</button>
            </div>
        ` : '';
        // Definir cores HSL vibrantes de badges com base no setor
        let badgeColor = '';
        let iconHtml = '<i class="fa-solid fa-truck"></i>';
        if (v.grupo === 'SERRARIA') {
            badgeColor = 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.2);';
            iconHtml = '<i class="fa-solid fa-industry"></i>';
        } else if (v.grupo === 'FLORESTAL') {
            badgeColor = 'background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2);';
            iconHtml = '<i class="fa-solid fa-tractor"></i>';
        } else {
            badgeColor = 'background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.2);';
            iconHtml = '<i class="fa-solid fa-person-digging"></i>';
        }

        // Link de documento
        const docLinkHtml = v.documento 
            ? `<button class="btn-action-card" onclick="window.visualizarDocumento('${v.id}')" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(59,130,246,0.3); background: rgba(59,130,246,0.1); color: #60a5fa;"><i class="fa-solid fa-file-pdf"></i> Doc Anexo</button>`
            : `<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Sem Documento</span>`;
        const fotoHtml = v.foto
            ? `<div style="height: 150px; border-radius: 12px; overflow: hidden; margin-bottom: 14px; border: 1px solid var(--panel-border); background: rgba(0,0,0,0.22); position: relative;">
                    <img src="${v.foto}" alt="${v.modelo}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    ${v.fotoTipo === 'ilustrativa' ? '<span style="position:absolute; right:8px; bottom:8px; font-size:0.65rem; font-weight:800; color:#fbbf24; background:rgba(0,0,0,0.68); border:1px solid rgba(251,191,36,0.35); border-radius:999px; padding:3px 7px;">ILUSTRATIVA</span>' : ''}
                </div>`
            : `<div style="height: 150px; border-radius: 12px; margin-bottom: 14px; border: 1px dashed var(--panel-border); background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 2rem;">
                    ${iconHtml}
                </div>`;

        return `
            <div class="glass-panel" data-frota-codigo="${codigo}" style="padding: 20px; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--panel-border); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div>
                    ${fotoHtml}
                    ${avisoProblemaHtml}
                    <!-- Header Card -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; color: var(--accent-color);">
                            ${iconHtml}
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                            <span style="font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; ${badgeColor}">${v.grupo}</span>
                            <span title="${statusInfo.label}" style="display:inline-flex; align-items:center; gap:6px; font-size:0.7rem; color:var(--text-muted); font-weight:800;">
                                <span style="width:10px; height:10px; border-radius:50%; background:${statusInfo.color}; box-shadow:0 0 8px ${statusInfo.color}; display:inline-block;"></span>${statusInfo.label}
                            </span>
                        </div>
                    </div>

                    <!-- Dados Principal -->
                    <h3 style="margin: 0 0 6px 0; font-size: 1.05rem; font-weight: 900; letter-spacing: 0.3px; color: white;">${v.modelo}</h3>
                    <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 15px;">
                        <span>CÓDIGO: <strong style="color: var(--accent-color);">${codigo}</strong></span><br>
                        <span>PLACA / PREFIXO: <strong style="color: white;">${v.placa}</strong></span><br>
                        <span>ANO FABRICAÇÃO: <strong style="color: white;">${v.ano}</strong></span><br>
                        <span>RELATOS PENDENTES: <strong style="color: ${relatosPendentes ? '#f59e0b' : '#22c55e'};">${relatosPendentes}</strong></span><br>
                        <span style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">DOCUMENTO: ${docLinkHtml}</span>
                    </div>
                </div>

                <!-- Ações Rápidas de Frota -->
                <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.abrirModalAbastecimento('${v.id}', 'DIESEL')" class="btn-icon" style="color:#ef4444; font-size:1.1rem; padding: 4px;" title="Lançar Diesel">
                            <i class="fa-solid fa-gas-pump"></i>
                        </button>
                        <button onclick="window.abrirModalAbastecimento('${v.id}', 'LUBRIFICANTE')" class="btn-icon" style="color:#60a5fa; font-size:1.1rem; padding: 4px;" title="Lançar Lubrificante">
                            <i class="fa-solid fa-oil-can"></i>
                        </button>
                        <button onclick="window.abrirModalManutencao('${v.id}')" class="btn-icon" style="color:#3b82f6; font-size:1.1rem; padding: 4px;" title="Registrar Manutenção Preventiva / Corretiva">
                            <i class="fa-solid fa-screwdriver-wrench"></i>
                        </button>
                        <button onclick="window.imprimirQrFrota('${v.id}')" class="btn-icon" style="color:#22c55e; font-size:1.1rem; padding: 4px;" title="Imprimir QR Code">
                            <i class="fa-solid fa-qrcode"></i>
                        </button>
                        <button onclick="window.registrarRelatoFrota('${v.id}')" class="btn-icon" style="color:#f59e0b; font-size:1.1rem; padding: 4px;" title="Relatar Problema">
                            <i class="fa-solid fa-comment-medical"></i>
                        </button>
                        <button onclick="window.imprimirRelatorioGeralFrota('${v.id}')" class="btn-icon" style="color:#a78bfa; font-size:1.1rem; padding: 4px;" title="Relatorio Geral da Maquina">
                            <i class="fa-solid fa-file-lines"></i>
                        </button>
                        <button onclick="window.baixarPdfRelatorioGeralFrota('${v.id}')" class="btn-icon" style="color:#16a34a; font-size:1.1rem; padding: 4px;" title="Baixar PDF do Relatorio">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button onclick="window.enviarWhatsappRelatorioGeralFrota('${v.id}')" class="btn-icon" style="color:#22c55e; font-size:1.1rem; padding: 4px;" title="Enviar Relatorio no WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.editarVeiculo('${v.id}')" class="btn-icon" style="color:var(--accent); font-size:1.1rem; padding: 4px;" title="Editar Dados do Veículo">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="window.excluirVeiculo('${v.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1.1rem; padding: 4px;" title="Excluir Registro permanentemente">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
window.renderizarFrota = renderizarFrota;


function formatarDataFrota(data) {
    return data ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
}

function formatarMoedaFrota(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

window.registrarRelatoFrota = async function(veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;
    const relato = prompt('Relate o problema da maquina ' + v.modelo + ' (' + v.placa + '):');
    if (!relato || !relato.trim()) return;
    const novo = { id: 'rel_' + Date.now(), veiculoId, data: new Date().toISOString().split('T')[0], hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), relato: relato.trim().toUpperCase(), status: 'ABERTO', criadoEm: new Date().toISOString() };
    relatosFrota.unshift(novo);
    salvarBanco(KEYS.RELATOS, relatosFrota);
    if ((v.statusOperacional || 'OK') === 'OK') {
        v.statusOperacional = 'AGUARDANDO';
        v.atualizadoEm = new Date().toISOString();
        salvarBanco(KEYS.FROTA, frota);
        await salvarDocFrota(FROTA_COLLECTIONS.FROTA, v);
    }
    renderizarFrota();
    alert('Relato registrado para o mecanico.');
};

window.resolverRelatosFrota = async function(veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;
    const pendentes = relatosFrota.filter(r => r.veiculoId === veiculoId && r.status !== 'RESOLVIDO');
    if (!pendentes.length) return;
    if (!confirm(`Marcar ${pendentes.length} relato(s) da maquina ${v.modelo} como resolvido(s)?`)) return;

    relatosFrota = relatosFrota.map(r => {
        if (r.veiculoId === veiculoId && r.status !== 'RESOLVIDO') {
            return { ...r, status: 'RESOLVIDO', resolvidoEm: new Date().toISOString() };
        }
        return r;
    });
    salvarBanco(KEYS.RELATOS, relatosFrota);

    v.statusOperacional = 'OK';
    v.atualizadoEm = new Date().toISOString();
    salvarBanco(KEYS.FROTA, frota);
    await salvarDocFrota(FROTA_COLLECTIONS.FROTA, v);
    renderizarFrota();
};

window.imprimirRelatorioGeralFrota = function(veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;
    const abs = abastecimentos.filter(a => a.veiculoId === veiculoId).sort((a, b) => new Date(b.data) - new Date(a.data));
    const mans = manutencoes.filter(m => m.veiculoId === veiculoId).sort((a, b) => new Date(b.data) - new Date(a.data));
    const relatos = relatosFrota.filter(r => r.veiculoId === veiculoId).sort((a, b) => new Date(b.criadoEm || b.data) - new Date(a.criadoEm || a.data));
    const totalAbastecimento = abs.reduce((acc, a) => acc + Number(a.total || 0), 0);
    const totalManutencao = mans.reduce((acc, m) => acc + Number(m.totalPecas || 0), 0);
    const statusInfo = getStatusFrotaInfo(v.statusOperacional || 'OK');
    const linhasAbs = abs.length ? abs.map(a => '<tr><td>' + formatarDataFrota(a.data) + '</td><td>' + tipoAbastecimentoLabel(a.tipo) + '</td><td>' + (a.origem || '-') + '</td><td>' + (a.requisicao || '-') + '</td><td>' + Number(a.qtd || 0).toFixed(2) + ' L</td><td>' + formatarMoedaFrota(a.preco) + '</td><td>' + formatarMoedaFrota(a.total) + '</td><td>' + (a.horimetro || '-') + '</td></tr>').join('') : '<tr><td colspan="8">Nenhum abastecimento registrado.</td></tr>';
    const linhasMan = mans.length ? mans.map(m => { const pecas = (m.pecas || []).map(p => p.qtd + 'x ' + p.nome + ' (' + formatarMoedaFrota(p.subtotal) + ')').join('<br>') || '-'; return '<tr><td>' + formatarDataFrota(m.data) + '</td><td>' + (m.tipo || '-') + '</td><td>' + (m.horimetro || '-') + '</td><td>' + pecas + '</td><td>' + (m.observacao || '-') + '</td><td>' + formatarMoedaFrota(m.totalPecas) + '</td></tr>'; }).join('') : '<tr><td colspan="6">Nenhuma manutencao registrada.</td></tr>';
    const linhasRelatos = relatos.length ? relatos.map(r => '<tr><td>' + formatarDataFrota(r.data) + ' ' + (r.hora || '') + '</td><td>' + (r.status || 'ABERTO') + '</td><td>' + r.relato + '</td></tr>').join('') : '<tr><td colspan="3">Nenhum relato registrado.</td></tr>';
    const html = '<html><head><title>Relatorio Geral - ' + v.placa + '</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#222;font-size:12px}h1{margin:0;font-size:20px}.muted{color:#666}.header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.box{border:1px solid #ccc;padding:8px}.status{display:inline-flex;align-items:center;gap:6px;font-weight:bold}.dot{width:10px;height:10px;border-radius:50%;display:inline-block}h2{font-size:13px;background:#eee;border:1px solid #ccc;padding:7px;margin-top:18px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}th{background:#f3f3f3}.total{font-weight:bold;background:#f8fafc}@media print{body{margin:12px}th,h2{background:#ddd!important;-webkit-print-color-adjust:exact}}</style></head><body>' +
        '<div class="header"><div><h1>Relatorio Geral da Maquina</h1><div class="muted">Controle de frotas, abastecimentos, manutencoes e relatos</div></div><div><strong>Emissao:</strong> ' + new Date().toLocaleString('pt-BR') + '</div></div>' +
        '<div class="grid"><div class="box"><strong>Modelo</strong><br>' + v.modelo + '</div><div class="box"><strong>Codigo</strong><br>' + garantirCodigoFrota(v) + '</div><div class="box"><strong>Placa/Prefixo</strong><br>' + v.placa + '</div><div class="box"><strong>Status</strong><br><span class="status"><span class="dot" style="background:' + statusInfo.color + '"></span>' + statusInfo.label + '</span></div><div class="box"><strong>Setor</strong><br>' + v.grupo + '</div><div class="box"><strong>Ano</strong><br>' + v.ano + '</div><div class="box"><strong>Total Abastecimentos</strong><br>' + formatarMoedaFrota(totalAbastecimento) + '</div><div class="box"><strong>Total Pecas/Manutencao</strong><br>' + formatarMoedaFrota(totalManutencao) + '</div></div>' +
        '<h2>Abastecimentos e Gastos com Combustivel</h2><table><thead><tr><th>Data</th><th>Tipo</th><th>Origem</th><th>Requisicao</th><th>Qtd</th><th>Unitario</th><th>Total</th><th>Horimetro/KM</th></tr></thead><tbody>' + linhasAbs + '</tbody></table>' +
        '<h2>Manutencoes, Lubrificantes e Pecas</h2><table><thead><tr><th>Data</th><th>Tipo</th><th>Horimetro/KM</th><th>Pecas/Insumos</th><th>Observacao</th><th>Total</th></tr></thead><tbody>' + linhasMan + '</tbody></table>' +
        '<h2>Relatos dos Operadores</h2><table><thead><tr><th>Data/Hora</th><th>Status</th><th>Relato</th></tr></thead><tbody>' + linhasRelatos + '</tbody></table>' +
        '<table style="margin-top:18px"><tr class="total"><td>Total Geral Registrado</td><td style="text-align:right">' + formatarMoedaFrota(totalAbastecimento + totalManutencao) + '</td></tr></table><script>window.onload=function(){window.print();}</script></body></html>';
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
};

window.frotaDocActions = {
    current: null,
    setRelatorioGeral(veiculoId) {
        const v = frota.find(item => item.id === veiculoId);
        if (!v) return;
        const abs = abastecimentos.filter(a => a.veiculoId === veiculoId);
        const mans = manutencoes.filter(m => m.veiculoId === veiculoId);
        const relatos = relatosFrota.filter(r => r.veiculoId === veiculoId);
        const nomeFrota = [v.modelo, v.placa].filter(Boolean).join(' - ');
        this.current = {
            title: `${nomeFrota || 'Frota'} - Relatorio Geral`,
            filename: `${nomeFrota || `frota-${veiculoId}`} - relatorio geral`,
            contentHtml: `
                <div class="doc-header"><div><img src="logo.png" alt="Serraria" class="doc-logo" onerror="this.style.display='none'"></div><div class="doc-title"><h1>${nomeFrota || 'Frota'} - Relatorio Geral</h1><p>Maquina / veiculo</p></div></div>
                <div class="doc-grid"><div class="doc-card"><h3>Veiculo</h3><p><strong>Codigo:</strong> ${garantirCodigoFrota(v)}</p><p><strong>Setor:</strong> ${v.grupo}</p><p><strong>Ano:</strong> ${v.ano}</p></div><div class="doc-card"><h3>Totais</h3><p><strong>Abastecimentos:</strong> <span class="doc-money">${formatarMoedaFrota(abs.reduce((acc, a) => acc + Number(a.total || 0), 0))}</span></p><p><strong>Manutencoes:</strong> <span class="doc-money">${formatarMoedaFrota(mans.reduce((acc, m) => acc + Number(m.totalPecas || 0), 0))}</span></p><p><strong>Relatos:</strong> ${relatos.length}</p></div></div>
                <table class="doc-table"><thead><tr><th>Tipo</th><th>Data</th><th>Descricao</th><th>Valor</th></tr></thead><tbody>
                    ${abs.map(a => `<tr><td>Abastecimento</td><td>${formatarDataFrota(a.data)}</td><td>${tipoAbastecimentoLabel(a.tipo)} - ${a.qtd || 0}L</td><td class="doc-money">${formatarMoedaFrota(a.total)}</td></tr>`).join('')}
                    ${mans.map(m => `<tr><td>Manutencao</td><td>${formatarDataFrota(m.data)}</td><td>${m.tipo || '-'} - ${m.observacao || '-'}</td><td class="doc-money">${formatarMoedaFrota(m.totalPecas)}</td></tr>`).join('')}
                    ${relatos.map(r => `<tr><td>Relato</td><td>${formatarDataFrota(r.data)}</td><td>${r.relato || '-'}</td><td>-</td></tr>`).join('')}
                </tbody></table>`
        };
    },
    print() { if (this.current) window.DocActions.printHtml(this.current); },
    pdf() { if (this.current) window.DocActions.downloadPdf(this.current); },
    whatsapp() { if (this.current) window.DocActions.sendWhatsApp({ title: this.current.title, filename: this.current.filename, contentHtml: this.current.contentHtml, message: `Segue o ${this.current.title}.` }); }
};

window.baixarPdfRelatorioGeralFrota = function(veiculoId) {
    window.frotaDocActions.setRelatorioGeral(veiculoId);
    window.frotaDocActions.pdf();
};

window.enviarWhatsappRelatorioGeralFrota = function(veiculoId) {
    window.frotaDocActions.setRelatorioGeral(veiculoId);
    window.frotaDocActions.whatsapp();
};

// Download/visualizacao do documento anexo. Aceita URL local/publica ou base64 legado.
window.visualizarDocumento = function(id) {
    const v = frota.find(item => item.id === id);
    if (!v || !v.documento) return;

    try {
        if (!String(v.documento).startsWith('data:')) {
            window.open(v.documento, '_blank', 'noopener');
            return;
        }

        const newTab = window.open('', '_blank');
        if (newTab) {
            newTab.document.write(`<iframe src="${v.documento}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%; position:fixed;" allowfullscreen></iframe>`);
            newTab.document.title = `Documento - ${v.modelo} (${v.placa})`;
        } else {
            // Trigger download se popups bloqueados
            const link = document.createElement('a');
            link.href = v.documento;
            link.download = v.documentoNome || 'documento_veiculo';
            link.click();
        }
    } catch (e) {
        alert("Não foi possível abrir o documento. Baixando arquivo...");
    }
};

// --- CONTROLAR ATUALIZAÇÃO DE KPIS ---
function atualizarKPIsFrota() {
    const totalEl = document.getElementById('frota-kpi-total');
    const serrariaEl = document.getElementById('frota-kpi-serraria');
    const florestalEl = document.getElementById('frota-kpi-florestal');
    const terraplanagemEl = document.getElementById('frota-kpi-terraplanagem');

    if (totalEl) totalEl.textContent = frota.length;
    if (serrariaEl) serrariaEl.textContent = frota.filter(v => v.grupo === 'SERRARIA').length;
    if (florestalEl) florestalEl.textContent = frota.filter(v => v.grupo === 'FLORESTAL').length;
    if (terraplanagemEl) terraplanagemEl.textContent = frota.filter(v => v.grupo === 'TERRAPLANAGEM').length;
}


// =========================================================================
// MÓDULO ABASTECIMENTO (DIESEL / LUBRIFICANTES LINKED COM ESTOQUE)
// =========================================================================

window.abrirModalAbastecimento = function(veiculoId, tipoPadrao = 'DIESEL') {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;

    document.getElementById('abastVeiculoId').value = v.id;
    document.getElementById('abastData').value = new Date().toISOString().split('T')[0];
    document.getElementById('abastQtd').value = '';
    document.getElementById('abastPreco').value = '';
    document.getElementById('abastTotal').value = '';
    document.getElementById('abastHorimetro').value = obterUltimoHorimetro(v.id);
    document.getElementById('abastTipo').value = tipoPadrao;
    atualizarTituloModalAbastecimento(tipoPadrao);
    preencherSelectLubrificantesFrota();

    // Informações no Header do modal
    document.getElementById('abastVeiculoCard').innerHTML = `
        <div>
            <strong>VEÍCULO:</strong> ${v.modelo}<br>
            <strong>PLACA / PREFIXO:</strong> ${v.placa}
        </div>
        <div style="text-align: right;">
            <strong>SETOR:</strong> ${v.grupo}<br>
            <strong>ANO:</strong> ${v.ano}
        </div>
    `;

    // Atualizar preço unitário com base no estoque
    atualizarPrecoUnitarioEstoque();
    
    // Renderizar tabela recente do veículo
    renderizarAbastecimentosVeiculo(v.id);

    document.getElementById('modalAbastecimento').style.display = 'flex';
};

window.fecharModalAbastecimento = function() {
    document.getElementById('modalAbastecimento').style.display = 'none';
};

// Autopreencher preço unitário se houver no estoque virtual
function atualizarTituloModalAbastecimento(tipo) {
    const titulo = document.getElementById('tituloModalAbastecimento');
    if (!titulo) return;
    titulo.innerHTML = tipo === 'LUBRIFICANTE'
        ? '<i class="fa-solid fa-oil-can" style="color:#60a5fa;"></i> Lancar Lubrificante'
        : '<i class="fa-solid fa-gas-pump" style="color: var(--danger-color);"></i> Lancar Abastecimento';
}

function ehItemLubrificante(item = {}) {
    const nome = (item.nome || '').toUpperCase();
    const categoria = (item.categoria || '').toUpperCase();
    return categoria.includes('LUBR') || nome.includes('LUBR') || nome.includes('OLEO') || nome.includes('Ã“LEO') || nome.includes('GRAXA');
}

function preencherSelectLubrificantesFrota() {
    const select = document.getElementById('abastLubrificanteItem');
    if (!select) return;
    const lubrificantes = estoque.filter(ehItemLubrificante);
    select.innerHTML = '<option value="">Selecione o lubrificante...</option>' + lubrificantes.map(item => (
        `<option value="${item.id}">${item.nome} - Saldo: ${Number(item.quantidade || 0).toLocaleString('pt-BR')} L</option>`
    )).join('');
    if (lubrificantes.length) select.value = lubrificantes[0].id;
}

window.atualizarPrecoUnitarioEstoque = function() {
    const tipo = document.getElementById('abastTipo').value;
    const inputPreco = document.getElementById('abastPreco');
    const grupoReq = document.getElementById('grupoAbastRequisicao');
    const grupoLubrificante = document.getElementById('grupoAbastLubrificante');
    const selectLubrificante = document.getElementById('abastLubrificanteItem');
    const reqInput = document.getElementById('abastRequisicao');
    if (!inputPreco) return;

    if (grupoReq) grupoReq.style.display = tipo === 'DIESEL_POSTO' ? 'block' : 'none';
    if (grupoLubrificante) grupoLubrificante.style.display = tipo === 'LUBRIFICANTE' ? 'block' : 'none';
    if (tipo !== 'DIESEL_POSTO' && reqInput) reqInput.value = '';
    atualizarTituloModalAbastecimento(tipo);

    if (tipo === 'DIESEL') {
        const item = estoque.find(i => i.nome === 'DIESEL COMUM');
        inputPreco.value = item ? window.formatCurrencyValue(item.unitario) : '';
    } else if (tipo === 'DIESEL_POSTO') {
        inputPreco.value = '';
        setTimeout(() => inputPreco.focus(), 50);
    } else if (tipo === 'LUBRIFICANTE') {
        if (selectLubrificante && selectLubrificante.options.length <= 1) preencherSelectLubrificantesFrota();
        const item = estoque.find(i => i.id === selectLubrificante?.value) || estoque.find(ehItemLubrificante);
        inputPreco.value = item ? window.formatCurrencyValue(item.unitario) : '';
    }
    calcularTotalAbastecimento();
};
window.calcularTotalAbastecimento = function() {
    const qtd = parseFloat(document.getElementById('abastQtd').value) || 0;
    const preco = window.parseCurrencyValue(document.getElementById('abastPreco').value) || 0;
    const inputTotal = document.getElementById('abastTotal');
    if (inputTotal) inputTotal.value = window.formatCurrencyValue(qtd * preco);
};

function obterUltimoHorimetro(veiculoId) {
    const filtrados = abastecimentos.filter(a => a.veiculoId === veiculoId);
    const filtradosManut = manutencoes.filter(m => m.veiculoId === veiculoId);
    let max = 0;
    filtrados.forEach(a => { if (a.horimetro > max) max = a.horimetro; });
    filtradosManut.forEach(m => { if (m.horimetro > max) max = m.horimetro; });
    return max > 0 ? max : '';
}

async function salvarAbastecimento() {
    const veiculoId = document.getElementById('abastVeiculoId').value;
    const data = document.getElementById('abastData').value || new Date().toISOString().split('T')[0];
    const tipo = document.getElementById('abastTipo').value || 'DIESEL';
    const qtd = parseFloat(document.getElementById('abastQtd').value) || 0;
    const preco = window.parseCurrencyValue(document.getElementById('abastPreco').value) || 0;
    const horimetro = parseInt(document.getElementById('abastHorimetro').value) || 0;
    const requisicao = (document.getElementById('abastRequisicao')?.value || '').trim().toUpperCase();
    const v = frota.find(item => item.id === veiculoId);

    if (qtd <= 0 || preco < 0 || horimetro < 0) {
        alert('Por favor, informe quantidade maior que zero e valores validos.');
        return;
    }
    if (tipo === 'DIESEL_POSTO' && !requisicao) {
        alert('Informe o numero da requisicao para abastecimento no posto.');
        document.getElementById('abastRequisicao')?.focus();
        return;
    }

    const novo = {
        id: 'ab_' + new Date().getTime(),
        veiculoId,
        data,
        tipo,
        origem: tipo === 'DIESEL_POSTO' ? 'POSTO' : 'SERRARIA',
        requisicao,
        qtd,
        preco,
        total: qtd * preco,
        horimetro
    };

    if (tipo === 'DIESEL') {
        if (window.registrarSaidaEstoqueFrota) {
            const itemAtualizado = await window.registrarSaidaEstoqueFrota({
                itemNome: 'DIESEL COMUM',
                tipoInsumo: 'DIESEL',
                quantidade: qtd,
                unitario: preco,
                frotaId: veiculoId,
                frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                destino: `Consumo Frota: ${v ? v.modelo : 'Veiculo'}`,
                observacao: `Abastecimento diesel serraria. Horimetro/KM: ${horimetro}`
            });
            if (!itemAtualizado) return;
            estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);
        }
    } else if (tipo === 'LUBRIFICANTE') {
        const itemSelecionado = document.getElementById('abastLubrificanteItem')?.value || '';
        const itemLubrificante = estoque.find(i => i.id === itemSelecionado) || estoque.find(ehItemLubrificante);
        if (!itemLubrificante) {
            alert('Cadastre um lubrificante no estoque antes de lancar o consumo.');
            return;
        }
        if (window.registrarSaidaEstoqueFrota) {
            const itemAtualizado = await window.registrarSaidaEstoqueFrota({
                itemNome: itemLubrificante.nome,
                tipoInsumo: 'LUBRIFICANTE',
                quantidade: qtd,
                unitario: preco,
                frotaId: veiculoId,
                frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                destino: `Consumo Frota: ${v ? v.modelo : 'Veiculo'}`,
                observacao: `Lancamento de lubrificante. Horimetro/KM: ${horimetro}`
            });
            if (!itemAtualizado) return;
            estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);
        }
    } else if (tipo === 'DIESEL_POSTO') {
        novo.financeiroId = await registrarDespesaAbastecimentoPosto(novo, v);
    }

    abastecimentos.push(novo);
    salvarBanco(KEYS.ABASTECIMENTOS, abastecimentos);
    await salvarDocFrota(FROTA_COLLECTIONS.ABASTECIMENTOS, novo);
    renderizarAbastecimentosVeiculo(veiculoId);
    if (typeof window.renderSimuladores === 'function') window.renderSimuladores();
    if (typeof window.renderizarEstoque === 'function') window.renderizarEstoque();
    document.getElementById('abastQtd').value = '';
    document.getElementById('abastTotal').value = '';
    document.getElementById('abastHorimetro').value = horimetro;
    if (tipo === 'DIESEL_POSTO') document.getElementById('abastRequisicao').value = '';

    const mensagemSucesso = tipo === 'DIESEL_POSTO'
        ? 'Abastecimento do posto registrado e despesa financeira gerada!'
        : tipo === 'LUBRIFICANTE'
            ? 'Lubrificante registrado e baixado do estoque.'
            : 'Abastecimento registrado. O diesel da serraria foi baixado do estoque sem gerar despesa.';
    alert(mensagemSucesso);
}

function renderizarAbastecimentosVeiculo(veiculoId) {
    const tbody = document.getElementById('listaAbastecimentosVeiculo');
    if (!tbody) return;

    const filtrados = abastecimentos
        .filter(a => a.veiculoId === veiculoId)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px; color: var(--text-muted);">Nenhum consumo registrado anteriormente para este veículo.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(a => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 8px 6px; color: white;">${new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td style="padding: 8px 6px;"><span style="font-weight: bold; color: ${a.tipo === 'DIESEL_POSTO' ? '#f59e0b' : '#ef4444'}; font-size: 0.78rem;">${tipoAbastecimentoLabel(a.tipo)}</span>${a.requisicao ? `<br><small style="color:#94a3b8;">Req: ${a.requisicao}</small>` : ''}</td>
            <td style="padding: 8px 6px; text-align: center; color: white;">${a.qtd.toFixed(1)}</td>
            <td style="padding: 8px 6px; text-align: right; font-weight: bold; color: white;">R$ ${a.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td style="padding: 8px 6px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">${a.horimetro}</td>
            <td style="padding: 8px 6px; text-align: center; display: flex; gap: 4px; justify-content: center;">
                <button type="button" class="btn-action-card" onclick="window.imprimirAbastecimento('${a.id}', '${veiculoId}')" title="Imprimir Comprovante" style="padding: 4px 8px; color: #60a5fa;"><i class="fa-solid fa-print"></i></button>
                <button type="button" class="btn-action-card" onclick="window.excluirAbastecimento('${a.id}', '${veiculoId}')" title="Estornar Registro" style="padding: 4px 8px; color: #f87171;"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.excluirAbastecimento = async function(id, veiculoId) {
    const autorizado = await window.confirmarExclusaoComSenha('Tem certeza que deseja estornar este abastecimento? Diesel da serraria volta ao estoque; diesel posto remove a despesa financeira.');
    if (!autorizado) return;

    const ab = abastecimentos.find(a => a.id === id);
    if (ab) {
        if (ab.tipo === 'DIESEL' || ab.tipo === 'LUBRIFICANTE') {
            estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);
            let itemEstoque = ab.tipo === 'DIESEL'
                ? estoque.find(i => i.nome === 'DIESEL COMUM')
                : estoque.find(i => {
                    const nome = (i.nome || '').toUpperCase();
                    const categoria = (i.categoria || '').toUpperCase();
                    return categoria.includes('LUBR') || nome.includes('LUBR') || nome.includes('OLEO') || nome.includes('ÓLEO');
                });
            if (itemEstoque) {
                itemEstoque.quantidade += ab.qtd;
                salvarBanco(KEYS.ESTOQUE, estoque);
                if (window.registrarMovimentacaoEstoque) {
                    const v = frota.find(item => item.id === veiculoId);
                    window.registrarMovimentacaoEstoque({ tipo: 'ENTRADA', itemId: itemEstoque.id, itemNome: itemEstoque.nome, categoria: itemEstoque.categoria, quantidade: ab.qtd, unitario: ab.preco, frotaId: veiculoId, frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA', destino: `Estorno Consumo: ${v ? v.modelo : 'Veiculo'}`, observacao: `Estorno de ${tipoAbastecimentoLabel(ab.tipo).toLowerCase()} via controle de frotas.` });
                }
            }
        } else if (ab.tipo === 'DIESEL_POSTO' && ab.financeiroId) {
            const lista = JSON.parse(localStorage.getItem(FINANCEIRO_FROTAS_KEY) || '[]').filter(item => item.id !== ab.financeiroId);
            localStorage.setItem(FINANCEIRO_FROTAS_KEY, JSON.stringify(lista));
            if (window.FS) await window.FS.deleteDoc(FINANCEIRO_FROTAS_COLLECTION, ab.financeiroId);
            if (typeof window.renderFinanceiro === 'function') window.renderFinanceiro();
        }
    }
    abastecimentos = abastecimentos.filter(a => a.id !== id);
    salvarBanco(KEYS.ABASTECIMENTOS, abastecimentos);
    await excluirDocFrota(FROTA_COLLECTIONS.ABASTECIMENTOS, id);
    renderizarAbastecimentosVeiculo(veiculoId);
};

// =========================================================================
// MÓDULO MANUTENÇÃO & CHECKLIST (VINCULADO COM PEÇAS DE ESTOQUE)
// =========================================================================

window.abrirModalManutencao = function(veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;

    document.getElementById('manutVeiculoId').value = v.id;
    document.getElementById('manutData').value = new Date().toISOString().split('T')[0];
    document.getElementById('manutHorimetro').value = obterUltimoHorimetro(v.id);
    document.getElementById('manutObs').value = '';
    
    // Reseta checklist
    document.getElementById('chkOleo').checked = false;
    document.getElementById('chkFreios').checked = false;
    document.getElementById('chkPneus').checked = false;
    document.getElementById('chkEletrica').checked = false;
    document.getElementById('chkArrefecimento').checked = false;
    document.getElementById('chkEstrutural').checked = false;

    // Reseta peças temporárias e checkbox manual
    const chkManual = document.getElementById('chkPecaManual');
    if (chkManual) chkManual.checked = false;
    if (window.togglePecaManual) window.togglePecaManual(false);

    pecasManutencaoTemp = [];
    renderizarPecasManutencaoTemp();

    // Informações do Header
    document.getElementById('manutVeiculoCard').innerHTML = `
        <div>
            <strong>VEÍCULO / EQUIPAMENTO:</strong> ${v.modelo}<br>
            <strong>PLACA / PREFIXO:</strong> ${v.placa}
        </div>
        <div style="text-align: right;">
            <strong>SETOR:</strong> ${v.grupo}<br>
            <strong>ANO:</strong> ${v.ano}
        </div>
    `;

    // Carregar itens do almoxarifado/estoque no select
    carregarPecasEstoqueSelect();
    
    // Renderizar histórico de manutenções
    renderizarManutencoesVeiculo(v.id);

    document.getElementById('modalManutencao').style.display = 'flex';
};

window.fecharModalManutencao = function() {
    document.getElementById('modalManutencao').style.display = 'none';
};

// Carregar select de estoque com itens reais de peças
function carregarPecasEstoqueSelect() {
    const select = document.getElementById('manutItemEstoque');
    if (!select) return;

    estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);

    // Filtrar apenas categorias de peças, correias e filtros
    const itensValidos = estoque.filter(i => ['PEÇAS', 'FILTROS', 'CORREIAS INDUSTRIAIS', 'LUBRIFICANTES'].includes(i.categoria));

    select.innerHTML = '<option value="">-- SELECIONE UMA PEÇA / INSUMO --</option>' + 
        itensValidos.map(i => `<option value="${i.id}">${i.nome} (Saldo: ${i.quantidade.toFixed(0)})</option>`).join('');

    document.getElementById('manutItemQtd').value = 1;
    document.getElementById('manutItemPreco').value = '';
}

window.atualizarPrecoPecaDinamica = function() {
    const itemId = document.getElementById('manutItemEstoque').value;
    const inputPreco = document.getElementById('manutItemPreco');
    if (!inputPreco) return;

    const item = estoque.find(i => i.id === itemId);
    if (item) {
        inputPreco.value = window.formatCurrencyValue(item.unitario);
    } else {
        inputPreco.value = '';
    }
};

window.togglePecaManual = function(isManual) {
    const selectEstoque = document.getElementById('manutItemEstoque');
    const inputManual = document.getElementById('manutItemManual');
    const inputPreco = document.getElementById('manutItemPreco');
    const labelSelect = document.getElementById('lblManutItemEstoque');
    
    if (isManual) {
        if (selectEstoque) selectEstoque.style.display = 'none';
        if (inputManual) {
            inputManual.style.display = 'block';
            inputManual.value = '';
        }
        if (labelSelect) labelSelect.textContent = 'Nome da Peça / Insumo';
        if (inputPreco) {
            inputPreco.value = '';
            inputPreco.readOnly = false;
        }
    } else {
        if (selectEstoque) selectEstoque.style.display = 'block';
        if (inputManual) {
            inputManual.style.display = 'none';
            inputManual.value = '';
        }
        if (labelSelect) labelSelect.textContent = 'Selecionar Peça / Item do Estoque';
        if (selectEstoque) selectEstoque.value = '';
        if (inputPreco) {
            inputPreco.value = '';
            inputPreco.readOnly = false;
        }
    }
};

window.adicionarPecaManutencao = function() {
    const chkManual = document.getElementById('chkPecaManual');
    const isManual = chkManual ? chkManual.checked : false;
    let itemId = '';
    let itemNome = '';

    const qtd = parseInt(document.getElementById('manutItemQtd').value) || 0;
    const preco = window.parseCurrencyValue(document.getElementById('manutItemPreco').value) || 0;

    if (isManual) {
        const inputManual = document.getElementById('manutItemManual');
        itemNome = inputManual ? inputManual.value.trim().toUpperCase() : '';
        itemId = 'manual_' + new Date().getTime();
        if (!itemNome) {
            alert("Por favor, digite o nome da peça.");
            return;
        }
    } else {
        const selectEstoque = document.getElementById('manutItemEstoque');
        itemId = selectEstoque ? selectEstoque.value : '';
        if (!itemId) {
            alert("Por favor, selecione uma peça do estoque ou ative a opção 'Peça Fora de Estoque'.");
            return;
        }
        const item = estoque.find(i => i.id === itemId);
        if (!item) return;
        itemNome = item.nome;
    }

    if (qtd <= 0 || preco <= 0) {
        alert("Preencha a quantidade e o preço unitário com valores maiores que zero.");
        return;
    }

    // Verificar se já existe na lista temporária
    const jaExiste = pecasManutencaoTemp.find(p => p.id === itemId || (isManual && p.nome === itemNome));
    if (jaExiste) {
        jaExiste.qtd += qtd;
        jaExiste.subtotal = jaExiste.qtd * jaExiste.preco;
    } else {
        pecasManutencaoTemp.push({
            id: itemId,
            nome: itemNome,
            qtd,
            preco,
            subtotal: qtd * preco,
            isManual: isManual
        });
    }

    renderizarPecasManutencaoTemp();

    // Resetar inputs de peças
    if (isManual) {
        const inputManual = document.getElementById('manutItemManual');
        if (inputManual) inputManual.value = '';
    } else {
        const selectEstoque = document.getElementById('manutItemEstoque');
        if (selectEstoque) selectEstoque.value = '';
    }
    document.getElementById('manutItemQtd').value = 1;
    document.getElementById('manutItemPreco').value = '';
};

function renderizarPecasManutencaoTemp() {
    const tbody = document.getElementById('listaPecasManutencaoTemp');
    if (!tbody) return;

    if (pecasManutencaoTemp.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 8px;">Nenhuma peça selecionada ainda.</td></tr>`;
        return;
    }

    tbody.innerHTML = pecasManutencaoTemp.map(p => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td style="padding: 6px 4px; color: white;">${p.nome}</td>
            <td style="padding: 6px 4px; text-align: center; color: white;">${p.qtd}</td>
            <td style="padding: 6px 4px; text-align: right; color: white;">R$ ${p.preco.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="padding: 6px 4px; text-align: right; font-weight: bold; color: var(--accent-color);">R$ ${p.subtotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="padding: 6px 4px; text-align: center;">
                <button type="button" class="btn-action-card" onclick="window.removerPecaManutencaoTemp('${p.id}')" style="padding: 2px 6px; color: #f87171;"><i class="fa-solid fa-xmark"></i></button>
            </td>
        </tr>
    `).join('');
}

window.removerPecaManutencaoTemp = function(id) {
    pecasManutencaoTemp = pecasManutencaoTemp.filter(p => p.id !== id);
    renderizarPecasManutencaoTemp();
};

async function salvarManutencao() {
    const veiculoId = document.getElementById('manutVeiculoId').value;
    const data = document.getElementById('manutData').value || new Date().toISOString().split('T')[0];
    const tipo = document.getElementById('manutTipo').value || 'CORRETIVA';
    const horimetro = parseInt(document.getElementById('manutHorimetro').value) || 0;
    const obs = document.getElementById('manutObs').value.trim().toUpperCase();

    if (horimetro < 0) {
        alert("O horímetro / KM do veículo não pode ser negativo.");
        return;
    }

    // Coletar itens do checklist ok
    const chks = ['chkOleo', 'chkFreios', 'chkPneus', 'chkEletrica', 'chkArrefecimento', 'chkEstrutural'];
    const checklistOk = [];
    chks.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.checked) {
            checklistOk.push(el.value);
        }
    });

    const nova = {
        id: 'mn_' + new Date().getTime(),
        veiculoId,
        data,
        tipo,
        horimetro,
        checklist: checklistOk,
        pecas: [...pecasManutencaoTemp],
        totalPecas: pecasManutencaoTemp.reduce((acc, p) => acc + p.subtotal, 0),
        observacao: obs || 'MANUTENÇÃO PERIÓDICA REALIZADA'
    };

    // --- INTEGRAR E DEDUZIR PEÇAS DO ESTOQUE DEFINITIVAMENTE ---
    estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);

    pecasManutencaoTemp.forEach(p => {
        const itemEstoque = estoque.find(i => i.id === p.id);
        if (itemEstoque) {
            if (itemEstoque.quantidade < p.qtd) {
                console.warn(`Alerta de Estoque Baixo para ${p.nome}: Saldo ficará negativo.`);
            }
            itemEstoque.quantidade -= p.qtd;

            // Registrar transação de saída no log de estoque
            if (window.registrarMovimentacaoEstoque) {
                const v = frota.find(item => item.id === veiculoId);
                window.registrarMovimentacaoEstoque({
                    tipo: 'SAÍDA',
                    itemId: itemEstoque.id,
                    itemNome: itemEstoque.nome,
                    categoria: itemEstoque.categoria,
                    quantidade: p.qtd,
                    unitario: p.preco,
                    frotaId: veiculoId,
                    frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                    destino: `Manutenção Frota: ${v ? v.modelo : 'Veículo'}`,
                    observacao: `Peça aplicada na manutenção. OS: ${nova.id}`
                });
            }
        }
    });

    salvarBanco(KEYS.ESTOQUE, estoque);
    manutencoes.push(nova);
    salvarBanco(KEYS.MANUTENCOES, manutencoes);
    await salvarDocFrota(FROTA_COLLECTIONS.MANUTENCOES, nova);

    // Resetar campos e atualizar históricos
    pecasManutencaoTemp = [];
    renderizarPecasManutencaoTemp();
    document.getElementById('manutObs').value = '';
    carregarPecasEstoqueSelect(); // recarrega saldo
    renderizarManutencoesVeiculo(veiculoId);

    alert("Registro de manutenção e checklist salvo com sucesso! As peças foram deduzidas no almoxarifado.");
}

function renderizarManutencoesVeiculo(veiculoId) {
    const tbody = document.getElementById('listaManutencoesVeiculo');
    if (!tbody) return;

    const filtrados = manutencoes
        .filter(m => m.veiculoId === veiculoId)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px; color: var(--text-muted);">Nenhum histórico de manutenção encontrado para este veículo.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(m => {
        const checklistStr = m.checklist.length > 0 ? m.checklist.join(', ') : 'Nenhum';
        const pecasStr = m.pecas.length > 0 ? m.pecas.map(p => `${p.qtd}x ${p.nome}`).join('<br>') : 'Nenhuma';
        
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem;">
                <td style="padding: 8px 6px; color: white;">${new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td style="padding: 8px 6px;"><span style="font-weight: bold; color: var(--accent-color);">${m.tipo}</span></td>
                <td style="padding: 8px 6px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted);" title="${checklistStr}">${checklistStr}</td>
                <td style="padding: 8px 6px; line-height: 1.3; color: white;">${pecasStr}</td>
                <td style="padding: 8px 6px; text-align: center; color: white;">${m.horimetro}</td>
                <td style="padding: 8px 6px; text-align: center; display: flex; gap: 4px; justify-content: center;">
                    <button type="button" class="btn-action-card" onclick="window.imprimirManutencao('${m.id}', '${veiculoId}')" title="Imprimir Ordem/Checklist" style="padding: 4px 8px; color: #60a5fa;"><i class="fa-solid fa-print"></i></button>
                    <button type="button" class="btn-action-card" onclick="window.excluirManutencao('${m.id}', '${veiculoId}')" title="Excluir Registro" style="padding: 4px 8px; color: #f87171;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

window.excluirManutencao = async function(id, veiculoId) {
    const autorizado = await window.confirmarExclusaoComSenha("Tem certeza que deseja excluir esta manutencao? Isso devolvera todas as pecas utilizadas de volta ao estoque.");
    if (!autorizado) return;

    const m = manutencoes.find(item => item.id === id);
    if (m && m.pecas && m.pecas.length > 0) {
        // Devolver peças
        estoque = obterBanco(KEYS.ESTOQUE, DEFAULT_ESTOQUE);
        m.pecas.forEach(p => {
            const itemEstoque = estoque.find(i => i.id === p.id);
            if (itemEstoque) {
                itemEstoque.quantidade += p.qtd;

                // Registrar transação de entrada de estorno no log de estoque
                if (window.registrarMovimentacaoEstoque) {
                    const v = frota.find(item => item.id === veiculoId);
                    window.registrarMovimentacaoEstoque({
                        tipo: 'ENTRADA',
                        itemId: itemEstoque.id,
                        itemNome: itemEstoque.nome,
                        categoria: itemEstoque.categoria,
                        quantidade: p.qtd,
                        unitario: p.preco,
                        frotaId: veiculoId,
                        frotaPlaca: v ? `${v.modelo} (${v.placa})` : 'FROTA',
                        destino: `Estorno Peça: ${v ? v.modelo : 'Veículo'}`,
                        observacao: `Estorno de peça por exclusão da OS de manutenção ${m.id}.`
                    });
                }
            }
        });
        salvarBanco(KEYS.ESTOQUE, estoque);
    }

    manutencoes = manutencoes.filter(item => item.id !== id);
    salvarBanco(KEYS.MANUTENCOES, manutencoes);
    await excluirDocFrota(FROTA_COLLECTIONS.MANUTENCOES, id);
    
    // Recarregar saldo de peças e histórico
    carregarPecasEstoqueSelect();
    renderizarManutencoesVeiculo(veiculoId);
};

window.imprimirAbastecimento = function(id, veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;
    const ab = abastecimentos.find(a => a.id === id);
    if (!ab) return;

    const dtObj = new Date(ab.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');
    
    let win = window.open('', '_blank');
    win.document.write(`
<html>
<head>
    <title>Comprovante de Abastecimento - ${v.placa}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 13px; line-height: 1.5; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        h2 { margin: 5px 0 0 0; font-size: 12px; color: #666; font-weight: normal; }
        .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; background: #f2f2f2; padding: 6px; margin: 20px 0 10px 0; border: 1px solid #ccc; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
        .info-item { padding: 4px 0; }
        .info-label { font-weight: bold; color: #555; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th { background: #f2f2f2; border: 1px solid #ccc; padding: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; }
        table.data-table td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
        .total-row { font-weight: bold; background: #eef2f5 !important; font-size: 13px; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-around; }
        .signature-line { text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        @media print {
            body { margin: 15px; }
            table.data-table th { background: #ddd !important; -webkit-print-color-adjust: exact; }
            .section-title { background: #ddd !important; -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td>
                <span style="font-weight: 900; font-size: 22px; color: #2563eb;">Orquestra.cs</span><br>
                <span style="font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Sistemas Personalizados</span>
            </td>
            <td style="text-align: right;">
                <h1>Relatorio de Abastecimento</h1>
                <h2>Controle de Frotas, Combustivel e Gastos</h2>
                <h2 style="font-size: 11px; color: #888;">Emissão: ${new Date().toLocaleString('pt-BR')}</h2>
            </td>
        </tr>
    </table>

    <div class="section-title">Dados do Veículo / Equipamento</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Modelo/Descrição:</span> ${v.modelo}</div>
        <div class="info-item"><span class="info-label">Placa / Prefixo:</span> ${v.placa}</div>
        <div class="info-item"><span class="info-label">Setor / Grupo:</span> ${v.grupo}</div>
        <div class="info-item"><span class="info-label">Ano Fabricação:</span> ${v.ano}</div>
    </div>

    <div class="section-title">Detalhes do Abastecimento / Lançamento</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Data do Registro:</span> ${dtStr}</div>
        <div class="info-item"><span class="info-label">Horímetro / KM no Lançamento:</span> ${ab.horimetro}</div>
    </div>

    <table class="data-table">
        <thead>
            <tr>
                <th>Item / Insumo</th>
                <th style="text-align: center;">Quantidade</th>
                <th style="text-align: right;">Preço Unitário</th>
                <th style="text-align: right;">Valor Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>${tipoAbastecimentoLabel(ab.tipo)}</strong></td>
                <td style="text-align: center;">${ab.qtd.toFixed(2)} Litros</td>
                <td style="text-align: right;">R$ ${ab.preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-weight: bold;">R$ ${ab.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
            <tr class="total-row">
                <td colspan="3" style="text-align: right; text-transform: uppercase;"><strong>Total do Abastecimento:</strong></td>
                <td style="text-align: right; color: #1e3a8a;">R$ ${ab.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        </tbody>
    </table>

    <div class="signatures">
        <div class="signature-line">
            Operador / Motorista
        </div>
        <div class="signature-line">
            Responsável pelo Registro
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>
    `);
    win.document.close();
};

window.imprimirManutencao = function(id, veiculoId) {
    const v = frota.find(item => item.id === veiculoId);
    if (!v) return;
    const manut = manutencoes.find(m => m.id === id);
    if (!manut) return;

    const dtObj = new Date(manut.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');
    
    // Checklist items formatting
    const allChecklistItems = [
        "ÓLEO E FILTROS",
        "SISTEMA DE FREIOS",
        "PNEUS / LAGARTAS",
        "ELÉTRICA E FARÓIS",
        "ARREFECIMENTO",
        "CHASSI / ESTRUTURAL"
    ];
    
    let checklistHtml = '';
    allChecklistItems.forEach(item => {
        const isOk = manut.checklist.some(chItem => chItem.toUpperCase().includes(item.split(' ')[0]));
        const icon = isOk ? '☑' : '☐';
        const status = isOk ? '<span style="color: #16a34a; font-weight: bold;">OK</span>' : '<span style="color: #777;">Não Marcado</span>';
        checklistHtml += `
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed #ddd; padding: 6px 0;">
                <span>${icon} <strong>${item}</strong></span>
                <span>${status}</span>
            </div>
        `;
    });

    // Parts list formatting
    let partsRowsHtml = '';
    if (manut.pecas && manut.pecas.length > 0) {
        manut.pecas.forEach(p => {
            partsRowsHtml += `
                <tr>
                    <td>${p.nome}</td>
                    <td style="text-align: center;">${p.qtd}</td>
                    <td style="text-align: right;">R$ ${p.preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: right; font-weight: bold;">R$ ${p.subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });
    } else {
        partsRowsHtml = `<tr><td colspan="4" style="text-align: center; color: #666; font-style: italic;">Nenhuma peça utilizada nesta manutenção.</td></tr>`;
    }

    const totalPecas = manut.totalPecas || 0;

    let win = window.open('', '_blank');
    win.document.write(`
<html>
<head>
    <title>Checklist de Manutenção - ${v.placa}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 13px; line-height: 1.5; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        h2 { margin: 5px 0 0 0; font-size: 12px; color: #666; font-weight: normal; }
        .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; background: #f2f2f2; padding: 6px; margin: 20px 0 10px 0; border: 1px solid #ccc; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
        .info-item { padding: 4px 0; }
        .info-label { font-weight: bold; color: #555; }
        .checklist-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; border: 1px solid #ccc; padding: 15px; border-radius: 4px; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th { background: #f2f2f2; border: 1px solid #ccc; padding: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left; }
        table.data-table td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
        .total-row { font-weight: bold; background: #eef2f5 !important; font-size: 13px; }
        .obs-box { border: 1px solid #ccc; padding: 12px; border-radius: 4px; background: #f9f9f9; min-height: 50px; font-style: italic; white-space: pre-wrap; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-around; }
        .signature-line { text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        @media print {
            body { margin: 15px; }
            table.data-table th { background: #ddd !important; -webkit-print-color-adjust: exact; }
            .section-title { background: #ddd !important; -webkit-print-color-adjust: exact; }
            .obs-box { background: none; }
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td>
                <span style="font-weight: 900; font-size: 22px; color: #2563eb;">Orquestra.cs</span><br>
                <span style="font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Sistemas Personalizados</span>
            </td>
            <td style="text-align: right;">
                <h1>Ordem de Manutenção & Checklist</h1>
                <h2>Controle de Frotas & Equipamentos</h2>
                <h2 style="font-size: 11px; color: #888;">Emissão: ${new Date().toLocaleString('pt-BR')}</h2>
            </td>
        </tr>
    </table>

    <div class="section-title">Dados do Veículo / Equipamento</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Modelo/Descrição:</span> ${v.modelo}</div>
        <div class="info-item"><span class="info-label">Placa / Prefixo:</span> ${v.placa}</div>
        <div class="info-item"><span class="info-label">Setor / Grupo:</span> ${v.grupo}</div>
        <div class="info-item"><span class="info-label">Ano Fabricação:</span> ${v.ano}</div>
    </div>

    <div class="section-title">Detalhes da Manutenção</div>
    <div class="info-grid">
        <div class="info-item"><span class="info-label">Data da Execução:</span> ${dtStr}</div>
        <div class="info-item"><span class="info-label">Tipo de Manutenção:</span> ${manut.tipo}</div>
        <div class="info-item"><span class="info-label">Horímetro / KM no Lançamento:</span> ${manut.horimetro}</div>
    </div>

    <div class="section-title">Checklist de Inspeção</div>
    <div class="checklist-grid">
        ${checklistHtml}
    </div>

    <div class="section-title">Peças e Materiais Utilizados</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Descrição da Peça / Insumo</th>
                <th style="text-align: center; width: 80px;">Quantidade</th>
                <th style="text-align: right; width: 120px;">Valor Unitário</th>
                <th style="text-align: right; width: 120px;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            ${partsRowsHtml}
            <tr class="total-row">
                <td colspan="3" style="text-align: right; text-transform: uppercase;"><strong>Custo Total de Peças:</strong></td>
                <td style="text-align: right; color: #1e3a8a;">R$ ${totalPecas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title">Diagnóstico Técnico / Observações</div>
    <div class="obs-box">${manut.observacao || 'NENHUMA OBSERVAÇÃO REGISTRADA'}</div>

    <div class="signatures">
        <div class="signature-line">
            Técnico / Mecânico
        </div>
        <div class="signature-line">
            Supervisor / Operador
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>
    `);
    win.document.close();
};
