console.log("Modulo Financeiro: inicializando...");

const FINANCEIRO_KEY = 'orquestra_financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_KEY = 'orquestra_financeiro_relatorios_mensais';
const FINANCEIRO_AI_USAGE_KEY = 'orquestra_financeiro_ai_usage';
const FINANCEIRO_UI_STATE_KEY = 'orquestra_financeiro_ui_state';
const FINANCEIRO_DB_NAME = 'orquestra_financeiro_arquivos';
const FINANCEIRO_DB_STORE = 'anexos';
const FINANCEIRO_COLLECTION = 'financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_COLLECTION = 'financeiro_relatorios_mensais';

const FINANCEIRO_ABAS = {
    'caixa-financeira': {
        titulo: 'Caixa financeira',
        tipoPadrao: ['BOLETO', 'IMPOSTO', 'NOTA FISCAL', 'CONTA', 'DOCUMENTO'],
        descricaoPadrao: ['PENDENTE DE CONFERENCIA', 'FORNECEDOR', 'GUIA DE IMPOSTO', 'BOLETO RECEBIDO', 'DOCUMENTO DO EMAIL']
    },
    'despesas-gerais': {
        titulo: 'Despesas gerais',
        tipoPadrao: ['BOLETO', 'MULTA', 'DESPESA AVULSA', 'FORNECEDOR'],
        descricaoPadrao: ['MANUTENCAO', 'COMPRA AVULSA', 'SERVICO TERCEIRO']
    },
    boletos: {
        titulo: 'Boletos avulsos',
        tipoPadrao: ['BOLETO', 'COBRANCA', 'PARCELA'],
        descricaoPadrao: ['FORNECEDOR', 'COMPRA', 'SERVICO']
    },
    impostos: {
        titulo: 'Impostos',
        tipoPadrao: ['IMPOSTO', 'GUIA', 'TAXA'],
        descricaoPadrao: ['FGTS', 'INSS', 'RECEITA FEDERAL', 'SIMPLES NACIONAL', 'SINDICATO', 'CARTORIO']
    },
    'despesas-fixas': {
        titulo: 'Despesas Fixas',
        tipoPadrao: ['DESPESA FIXA', 'CONTA MENSAL', 'CONTRATO'],
        descricaoPadrao: ['AGUA', 'ENERGIA', 'INTERNET', 'TELEFONE', 'SISTEMA NF', 'SEGURANCA DO TRABALHO']
    }
};

const FINANCEIRO_PASTAS = {
    todos: { titulo: 'Todos os documentos', icone: 'fa-folder-open', cor: '#8a6f3d', subpastas: ['GERAL'] },
    impostos: { titulo: 'Impostos', icone: 'fa-landmark', cor: '#f59e0b', subpastas: ['RECEITA FEDERAL', 'FGTS', 'INSS', 'SINDICATO', 'TAXAS'] },
    boletos: { titulo: 'Boletos', icone: 'fa-barcode', cor: '#8a6f3d', subpastas: ['SICREDI', 'FORNECEDORES', 'ALUGUEL', 'OUTROS BOLETOS'] },
    fornecedores: { titulo: 'Fornecedores', icone: 'fa-truck-field', cor: '#22c55e', subpastas: ['AIR EXPRESS', 'MATERIAIS', 'SERVICOS', 'OUTROS FORNECEDORES'] },
    funcionarios: { titulo: 'Funcionarios', icone: 'fa-users', cor: '#a78bfa', subpastas: ['HOLERITES', 'VALES', 'BENEFICIOS', 'OUTROS'] },
    fixas: { titulo: 'Despesas Fixas', icone: 'fa-repeat', cor: '#fb7185', subpastas: ['ENERGIA', 'INTERNET', 'TELEFONE', 'CONTABILIDADE', 'SISTEMAS'] },
    conferir: { titulo: 'Pendentes de conferência', icone: 'fa-triangle-exclamation', cor: '#f97316', subpastas: ['PENDENTE', 'SEM LEITURA', 'OUTROS'] }
};

const FINANCEIRO_DOC_CATEGORIAS = {
    AUTO: { label: 'Automático', icone: 'fa-wand-magic-sparkles', cor: '#94a3b8' },
    boleto: { label: 'Boleto', icone: 'fa-barcode', cor: '#8a6f3d' },
    nota_fiscal: { label: 'Nota fiscal', icone: 'fa-file-invoice', cor: '#f59e0b' },
    xml: { label: 'XML', icone: 'fa-code', cor: '#a78bfa' },
    comprovante: { label: 'Comprovante', icone: 'fa-receipt', cor: '#22c55e' },
    outro: { label: 'Outro', icone: 'fa-file-lines', cor: '#94a3b8' }
};

let financeiroAbaAtiva = 'todos';
let financeiroAnexosTemp = { documento: null, comprovante: null };
let financeiroRelatorioAtual = [];
let financeiroNuvemCarregada = false;

function obterPastaFinanceiraItem(item = {}) {
    if (item.pastaFinanceira) return item.pastaFinanceira;
    const tipo = normalizarTexto(item.tipo);
    const desc = normalizarTexto(`${item.descricao || ''} ${item.observacao || ''}`);
    if (item.conferenciaStatus === 'pendente') return 'conferir';
    if (/IMPOSTO|DARF|FGTS|INSS|RECEITA|SINDICATO|TAXA/.test(`${tipo} ${desc}`)) return 'impostos';
    if (/FUNCIONARIO|FUNCIONÃRIO|HOLERITE|VALE|SALARIO|SALÃRIO/.test(`${tipo} ${desc}`)) return 'funcionarios';
    if (/ENERGIA|INTERNET|TELEFONE|ALUGUEL|CONTABILIDADE|SISTEMA/.test(desc)) return 'fixas';
    if (/FORNECEDOR|AIR EXPRESS|MATERIAIS|SERVICO|SERVIÃ‡O/.test(desc)) return 'fornecedores';
    if (/BOLETO|COBRANCA|COBRANÃ‡A|PARCELA/.test(`${tipo} ${desc}`)) return 'boletos';
    return 'conferir';
}

function obterSubpastaFinanceiraItem(item = {}) {
    if (item.subpastaFinanceira) return item.subpastaFinanceira;
    const texto = normalizarTexto(`${item.tipo || ''} ${item.descricao || ''} ${item.observacao || ''}`);
    if (/RECEITA|DARF/.test(texto)) return 'RECEITA FEDERAL';
    if (/FGTS/.test(texto)) return 'FGTS';
    if (/INSS/.test(texto)) return 'INSS';
    if (/SICREDI/.test(texto)) return 'SICREDI';
    if (/AIR EXPRESS/.test(texto)) return 'AIR EXPRESS';
    if (/ENERGIA/.test(texto)) return 'ENERGIA';
    if (/INTERNET/.test(texto)) return 'INTERNET';
    if (/TELEFONE|VIVO/.test(texto)) return 'TELEFONE';
    return FINANCEIRO_PASTAS[obterPastaFinanceiraItem(item)]?.subpastas?.[0] || 'GERAL';
}

function normalizarTexto(valor) {
    return (valor || '').toString().trim().toUpperCase();
}

function obterLancamentosFinanceiros() {
    return JSON.parse(localStorage.getItem(FINANCEIRO_KEY) || '[]');
}

function limparDadosPesadosFinanceiro(item) {
    if (!item) return item;
    return {
        ...item,
        documentosVinculados: normalizarDocumentosVinculadosFinanceiro(item).map(removerDadosPesadosDocumentoVinculadoFinanceiro),
        documento: removerDadosPesadosAnexoFinanceiro(item.documento),
        comprovante: removerDadosPesadosAnexoFinanceiro(item.comprovante)
    };
}

function salvarLancamentosFinanceiros(lista) {
    const leves = (lista || []).map(limparDadosPesadosFinanceiro);
    localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(leves));
}

function removerDadosPesadosAnexoFinanceiro(anexo) {
    if (!anexo) return null;
    const { dados, ...leve } = anexo;
    return {
        ...leve,
        possuiArquivoLocal: Boolean(anexo.localPath || anexo.localUrl || anexo.arquivoId || dados),
        tamanhoLocalEstimado: typeof dados === 'string' ? dados.length : (anexo.tamanho || null)
    };
}

function normalizarCategoriaDocumentoFinanceiro(categoria) {
    const valor = String(categoria || '').trim().toLowerCase();
    if (valor === 'auto') return 'outro';
    if (FINANCEIRO_DOC_CATEGORIAS[valor]) return valor;
    return 'outro';
}

function detectarCategoriaDocumentoFinanceiro(anexo = {}, dados = {}) {
    const nome = normalizarTexto(anexo.nome || '');
    const tipo = normalizarTexto(anexo.tipo || '');
    const texto = normalizarTexto(`${dados.tipo || ''} ${dados.descricao || ''} ${dados.observacao || ''}`);
    if (nome.endsWith('.XML') || tipo.includes('XML') || texto.includes('NF-E') || texto.includes('NFE')) return 'xml';
    if (/NOTA FISCAL|DANFE|NF-E|NFE|NFSE|NFS-E/.test(`${nome} ${texto}`)) return 'nota_fiscal';
    if (/BOLETO|BLOQUETO|FICHA DE COMPENSACAO|FICHA DE COMPENSAÇÃO|LINHA DIGITAVEL|PAGAVEL|PAGÁVEL|SICREDI|NOSSO NUMERO|NOSSO NÚMERO/.test(`${nome} ${texto}`)) return 'boleto';
    if (/COMPROVANTE|PAGAMENTO REALIZADO|PIX|TRANSFERENCIA|TRANSFERÊNCIA/.test(`${nome} ${texto}`)) return 'comprovante';
    return 'outro';
}

function criarDocumentoVinculadoFinanceiro(anexo, categoria = 'outro', origem = 'formulario') {
    if (!anexo) return null;
    const categoriaFinal = normalizarCategoriaDocumentoFinanceiro(categoria);
    return {
        ...anexo,
        id: anexo.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        categoria: categoriaFinal,
        origem,
        criadoEm: anexo.criadoEm || new Date().toISOString()
    };
}

function normalizarAssinaturaFinanceira(valor) {
    return String(valor || '')
        .trim()
        .toLowerCase()
        .replace(/\\/g, '/')
        .replace(/\s+/g, ' ');
}

function obterAssinaturasDocumentoFinanceiro(doc = {}) {
    const assinaturas = [];
    const hash = doc.hashArquivo || doc.sha256 || doc.documentoHash || doc.assinaturaHash;
    const nome = normalizarAssinaturaFinanceira(doc.nome || doc.name || '');
    const tamanho = Number(doc.tamanho || doc.size || 0);
    const localPath = normalizarAssinaturaFinanceira(doc.localPath || doc.arquivoLocal || '');
    const localUrl = normalizarAssinaturaFinanceira(doc.localUrl || '');

    if (hash) assinaturas.push(`hash:${normalizarAssinaturaFinanceira(hash)}`);
    if (localPath) assinaturas.push(`path:${localPath}`);
    if (localUrl) assinaturas.push(`url:${localUrl}`);
    if (nome && tamanho > 0) assinaturas.push(`name-size:${nome}|${tamanho}`);
    if (nome) assinaturas.push(`name:${nome}`);

    return assinaturas;
}

function obterDocumentosIndexadosFinanceiro(item = {}) {
    return normalizarDocumentosVinculadosFinanceiro(item)
        .concat([item.documento, item.comprovante])
        .filter(Boolean);
}

function buscarDocumentoDuplicadoFinanceiro(anexo, ignorarRegistroId = '') {
    const assinaturas = new Set(obterAssinaturasDocumentoFinanceiro(anexo));
    if (!assinaturas.size) return null;

    for (const item of obterLancamentosFinanceiros()) {
        if (ignorarRegistroId && item.id === ignorarRegistroId) continue;
        for (const doc of obterDocumentosIndexadosFinanceiro(item)) {
            const docAssinaturas = obterAssinaturasDocumentoFinanceiro(doc);
            const assinaturaComum = docAssinaturas.find(chave => assinaturas.has(chave));
            if (assinaturaComum) {
                return {
                    item,
                    documento: doc,
                    assinatura: assinaturaComum
                };
            }
        }
    }
    return null;
}

function mensagemDocumentoDuplicadoFinanceiro(anexo, duplicado) {
    const item = duplicado?.item || {};
    const nome = anexo?.nome || duplicado?.documento?.nome || 'documento';
    const quando = dataHoraBR(item.criadoEm || item.atualizadoEm);
    return [
        `Documento duplicado: ${nome}`,
        `Ele já foi importado e salvo na lista financeira${quando !== '-' ? ` em ${quando}` : ''}.`,
        `Registro encontrado: ${item.descricao || item.tipo || 'Documento financeiro'}${item.vencimento ? ` - venc. ${dataBR(item.vencimento)}` : ''}${Number(item.valor || 0) ? ` - ${formatarMoeda(item.valor)}` : ''}.`,
        'A importação foi cancelada para evitar lançamento repetido.'
    ].join('\n');
}

async function calcularHashArquivoFinanceiro(file) {
    try {
        if (!file?.arrayBuffer || !window.crypto?.subtle) return '';
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    } catch (error) {
        console.warn('Não foi possível calcular assinatura do arquivo financeiro.', error);
        return '';
    }
}

function chaveDocumentoFinanceiro(doc = {}) {
    return [
        doc.categoria || 'outro',
        doc.hashArquivo || doc.localPath || doc.localUrl || doc.nome || '',
        doc.tipo || ''
    ].join('|').toLowerCase();
}

function combinarDocumentosFinanceiro(existente = [], novos = []) {
    const mapa = new Map();
    [...(existente || []), ...(novos || [])].filter(Boolean).forEach(doc => {
        const normalizado = criarDocumentoVinculadoFinanceiro(doc, doc.categoria || 'outro', doc.origem || 'formulario');
        const chave = chaveDocumentoFinanceiro(normalizado);
        if (!mapa.has(chave)) mapa.set(chave, normalizado);
    });
    return Array.from(mapa.values());
}

function normalizarDocumentosVinculadosFinanceiro(item = {}) {
    const documentos = Array.isArray(item.documentosVinculados) ? item.documentosVinculados : [];
    const legados = [
        item.documento ? criarDocumentoVinculadoFinanceiro(item.documento, item.documento.categoria || detectarCategoriaDocumentoFinanceiro(item.documento, item), 'legado') : null,
        item.comprovante ? criarDocumentoVinculadoFinanceiro(item.comprovante, 'comprovante', 'legado') : null
    ];
    return combinarDocumentosFinanceiro(documentos, legados);
}

function removerDadosPesadosDocumentoVinculadoFinanceiro(doc) {
    const leve = removerDadosPesadosAnexoFinanceiro(doc);
    if (!leve) return null;
    return {
        ...leve,
        categoria: normalizarCategoriaDocumentoFinanceiro(doc.categoria),
        origem: doc.origem || 'formulario',
        criadoEm: doc.criadoEm || null
    };
}

function prepararFinanceiroParaNuvem(item) {
    if (!item) return item;
    return limparDadosPesadosFinanceiro(item);
}

function abrirDbArquivosFinanceiro() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('Armazenamento local indisponível neste navegador.'));
            return;
        }
        const request = indexedDB.open(FINANCEIRO_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(FINANCEIRO_DB_STORE)) {
                db.createObjectStore(FINANCEIRO_DB_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Falha ao abrir armazenamento local.'));
    });
}

async function salvarArquivoFinanceiroLocal(anexo) {
    if (!anexo?.dados) return anexo || null;
    const arquivoId = anexo.arquivoId || `fin_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
        const db = await abrirDbArquivosFinanceiro();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(FINANCEIRO_DB_STORE, 'readwrite');
            tx.objectStore(FINANCEIRO_DB_STORE).put({
                id: arquivoId,
                nome: anexo.nome || 'documento',
                tipo: anexo.tipo || 'application/octet-stream',
                dados: anexo.dados,
                salvoEm: new Date().toISOString()
            });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('Falha ao salvar arquivo local.'));
        });
        db.close();
    } catch (error) {
        console.warn('Arquivo financeiro não foi salvo no armazenamento local. O registro será salvo sem o PDF pesado.', error);
    }
    return {
        ...anexo,
        arquivoId,
        storage: 'INDEXED_DB',
        possuiArquivoLocal: true
    };
}

async function obterArquivoFinanceiroLocal(arquivoId) {
    if (!arquivoId) return null;
    const db = await abrirDbArquivosFinanceiro();
    const arquivo = await new Promise((resolve, reject) => {
        const tx = db.transaction(FINANCEIRO_DB_STORE, 'readonly');
        const req = tx.objectStore(FINANCEIRO_DB_STORE).get(arquivoId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Falha ao ler arquivo local.'));
    });
    db.close();
    return arquivo;
}

async function hidratarAnexoFinanceiro(anexo) {
    if (!anexo) return null;
    if (anexo.dados) return anexo;
    const arquivo = await obterArquivoFinanceiroLocal(anexo.arquivoId);
    return arquivo?.dados ? { ...anexo, dados: arquivo.dados, tipo: anexo.tipo || arquivo.tipo, nome: anexo.nome || arquivo.nome } : anexo;
}

async function migrarArquivosFinanceirosLocal() {
    const lista = obterLancamentosFinanceiros();
    let alterou = false;
    for (const item of lista) {
        if (item.documento?.dados) {
            item.documento = await salvarArquivoFinanceiroLocal(item.documento);
            alterou = true;
        }
        if (item.comprovante?.dados) {
            item.comprovante = await salvarArquivoFinanceiroLocal(item.comprovante);
            alterou = true;
        }
        if (Array.isArray(item.documentosVinculados)) {
            for (let i = 0; i < item.documentosVinculados.length; i++) {
                if (item.documentosVinculados[i]?.dados) {
                    item.documentosVinculados[i] = await salvarArquivoFinanceiroLocal(item.documentosVinculados[i]);
                    alterou = true;
                }
            }
        }
    }
    if (alterou) salvarLancamentosFinanceiros(lista);
}

async function carregarFinanceiroNuvem() {
    if (!window.FS) return;
    try {
        const locais = obterLancamentosFinanceiros();
        const nuvem = await window.FS.getCollection(FINANCEIRO_COLLECTION);
        if (nuvem.length > 0) {
            salvarLancamentosFinanceiros(nuvem);
        } else if (locais.length > 0) {
            await Promise.all(locais.map(item => window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, prepararFinanceiroParaNuvem(item))));
        }
        financeiroNuvemCarregada = true;
        renderFinanceiro();
    } catch (error) {
        console.error('Falha ao carregar financeiro no Firestore. Usando cache local.', error);
    }
}

async function salvarFinanceiroNuvem(item) {
    if (!window.FS || !item?.id) return;
    try {
        await window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, prepararFinanceiroParaNuvem(item));
    } catch (error) {
        console.error(`Falha ao salvar financeiro/${item.id} no Firestore.`, error);
        alert('Registro salvo localmente, mas não foi possível sincronizar com a nuvem agora.');
    }
}

async function excluirFinanceiroNuvem(id) {
    if (!window.FS || !id) return true;
    try {
        await window.FS.deleteDoc(FINANCEIRO_COLLECTION, id);
        return true;
    } catch (error) {
        console.error(`Falha ao excluir financeiro/${id} no Firestore.`, error);
        alert('Não foi possível excluir na nuvem agora. O registro foi mantido localmente para evitar divergência. Tente novamente em alguns instantes.');
        return false;
    }
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoeda(valor) {
    const limpo = (valor || '').toString().replace(/\D/g, '');
    return limpo ? Number(limpo) / 100 : 0;
}

function aplicarMascaraMoeda(input) {
    const valor = parseMoeda(input.value);
    input.value = valor ? formatarMoeda(valor) : '';
}

function dataBR(dataIso) {
    if (!dataIso) return '-';
    return new Date(`${dataIso}T12:00:00`).toLocaleDateString('pt-BR');
}

function dataHoraBR(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return '-';
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function estaVencido(item) {
    if (item.pago || !item.vencimento) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(`${item.vencimento}T12:00:00`) < hoje;
}

function diasAteVencimentoFinanceiro(item) {
    if (!item.vencimento) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(`${item.vencimento}T00:00:00`);
    vencimento.setHours(0, 0, 0, 0);
    return Math.ceil((vencimento - hoje) / 86400000);
}

function obterBoletosAVencerFinanceiro() {
    return obterLancamentosFinanceiros()
        .filter(item => !item.pago && item.vencimento)
        .map(item => ({ ...item, diasVencimento: diasAteVencimentoFinanceiro(item) }))
        .filter(item => item.diasVencimento !== null && item.diasVencimento <= 7)
        .sort((a, b) => a.diasVencimento - b.diasVencimento || String(a.descricao || '').localeCompare(String(b.descricao || ''), 'pt-BR'));
}

function usuarioPodeVerLembreteFinanceiro() {
    const emailsPermitidos = ['escritoriovanmarte@hotmail.com', 'escritoriovanmarte@gmail.com'];
    const email = String(
        window.App?.userData?.email ||
        window.auth?.currentUser?.email ||
        document.getElementById('perfilEmail')?.value ||
        ''
    ).toLowerCase().trim();
    return emailsPermitidos.includes(email);
}

function textoVencimentoLembrete(item) {
    if (item.diasVencimento < 0) return `vencido ha ${Math.abs(item.diasVencimento)} dia(s)`;
    if (item.diasVencimento === 0) return 'vence hoje';
    if (item.diasVencimento === 1) return 'vence amanha';
    return `vence em ${item.diasVencimento} dias`;
}

function mostrarLembretesFinanceiros() {
    let banner = document.getElementById('financeiroLembreteTopo');
    const linkFinanceiro = document.querySelector('a[data-target="view-financeiro"]');
    if (!usuarioPodeVerLembreteFinanceiro()) {
        banner?.remove();
        linkFinanceiro?.classList.remove('financeiro-menu-alerta');
        document.body.classList.remove('financeiro-tem-alerta');
        return;
    }
    const alertas = obterBoletosAVencerFinanceiro();
    if (!alertas.length) {
        banner?.remove();
        linkFinanceiro?.classList.remove('financeiro-menu-alerta');
        document.body.classList.remove('financeiro-tem-alerta');
        return;
    }
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'financeiroLembreteTopo';
        banner.className = 'financeiro-lembrete-topo hide-on-print';
        document.body.appendChild(banner);
    }
    const total = alertas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const principais = alertas.slice(0, 4).map(item => `${escapeHtmlFinanceiro(item.descricao || item.tipo || 'Documento')} - ${formatarMoeda(item.valor)} (${textoVencimentoLembrete(item)})`).join('  |  ');
    banner.innerHTML = `
        <button type="button" class="financeiro-lembrete-main" onclick="window.irParaFinanceiroAlertas()">
            <i class="fa-solid fa-bell"></i>
            <span><strong>${alertas.length} boleto(s)/conta(s) a vencer</strong> - ${formatarMoeda(total)} - ${principais}</span>
        </button>
        ${alertas[0]?.documento ? `<button type="button" class="financeiro-lembrete-doc" onclick="window.abrirAnexoFinanceiro('${alertas[0].id}', 'documento')" title="Abrir documento mais urgente"><i class="fa-solid fa-file-arrow-up"></i> Abrir boleto</button>` : ''}
        <button type="button" class="financeiro-lembrete-close" onclick="document.getElementById('financeiroLembreteTopo')?.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    linkFinanceiro?.classList.add('financeiro-menu-alerta');
    document.body.classList.add('financeiro-tem-alerta');
}

window.irParaFinanceiroAlertas = function() {
    const link = document.querySelector('a[data-target="view-financeiro"]');
    link?.click();
    setTimeout(() => {
        const filtro = document.getElementById('financeiroFiltroStatus');
        if (filtro) filtro.value = 'ABERTO';
        window.renderFinanceiro?.();
        document.getElementById('financeiroLista')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
};

function obterStatusItem(item) {
    if (item.pago) return { label: 'Pago', classe: 'pago' };
    if (item.conferenciaStatus === 'pendente') return { label: 'Pendente', classe: 'pendente' };
    if (estaVencido(item)) return { label: 'Vencido', classe: 'vencido' };
    return { label: item.conferenciaStatus === 'conferido' ? 'Conferido' : 'Não pago', classe: 'aberto' };
}

function atualizarStatusToggle() {
    const pago = document.getElementById('financeiroPago')?.checked;
    const texto = document.getElementById('financeiroStatusTexto');
    if (texto) texto.textContent = pago ? 'Pago' : 'Não pago';
}

function atualizarDatalistsFinanceiro() {
    const lista = obterLancamentosFinanceiros().filter(item => financeiroAbaAtiva === 'todos' || obterPastaFinanceiraItem(item) === financeiroAbaAtiva || item.aba === financeiroAbaAtiva);
    const config = FINANCEIRO_ABAS[financeiroAbaAtiva] || FINANCEIRO_ABAS['caixa-financeira'];
    const tipos = [...new Set([...config.tipoPadrao, ...lista.map(item => item.tipo).filter(Boolean)])];
    const descricoes = [...new Set([...config.descricaoPadrao, ...lista.map(item => item.descricao).filter(Boolean)])];

    document.getElementById('financeiroClassesList').innerHTML = tipos.map(item => `<option value="${item}"></option>`).join('');
    document.getElementById('financeiroDescricaoList').innerHTML = descricoes.map(item => `<option value="${item}"></option>`).join('');
    const pastaSelect = document.getElementById('financeiroPasta');
    if (pastaSelect) {
        pastaSelect.innerHTML = Object.entries(FINANCEIRO_PASTAS)
            .filter(([key]) => key !== 'todos')
            .map(([key, pasta]) => `<option value="${key}">${pasta.titulo}</option>`)
            .join('');
        if (!pastaSelect.value) pastaSelect.value = financeiroAbaAtiva !== 'todos' ? financeiroAbaAtiva : 'conferir';
    }
    atualizarSubpastasFinanceiro();
}

window.atualizarSubpastasFinanceiro = function() {
    const pasta = document.getElementById('financeiroPasta')?.value || 'conferir';
    const base = FINANCEIRO_PASTAS[pasta]?.subpastas || ['GERAL'];
    const extras = obterLancamentosFinanceiros()
        .filter(item => obterPastaFinanceiraItem(item) === pasta)
        .map(obterSubpastaFinanceiraItem)
        .filter(Boolean);
    const subpastas = [...new Set([...base, ...extras])];
    const datalist = document.getElementById('financeiroSubpastasList');
    if (datalist) datalist.innerHTML = subpastas.map(item => `<option value="${item}"></option>`).join('');
    const input = document.getElementById('financeiroSubpasta');
    if (input && !input.value) input.value = subpastas[0] || 'GERAL';
};

window.atualizarSituacaoFinanceiro = function() {
    const situacao = document.getElementById('financeiroSituacaoDocumento')?.value || 'A_PAGAR';
    const pago = document.getElementById('financeiroPago');
    if (pago && situacao === 'PAGO_A_VISTA') pago.checked = true;
    if (pago && ['AGUARDANDO_BOLETO', 'AGUARDANDO_NOTA'].includes(situacao)) pago.checked = false;
    atualizarStatusToggle();
};

function preencherNomeArquivo(tipo, file) {
    const id = tipo === 'documento' ? 'financeiroDocumentoNome' : 'financeiroComprovanteNome';
    const el = document.getElementById(id);
    if (el) el.textContent = file ? file.name : (tipo === 'documento' ? 'Nenhum documento anexado' : 'Nenhum comprovante anexado');
}

function atualizarCategoriaDocumentoFinanceiro(anexo, dados = {}) {
    const select = document.getElementById('financeiroDocumentoCategoria');
    if (!select || select.value !== 'AUTO') return;
    const categoria = detectarCategoriaDocumentoFinanceiro(anexo, dados);
    if (categoria !== 'outro') select.value = categoria;
}

async function lerArquivoFinanceiro(file, tipo) {
    if (!file) {
        financeiroAnexosTemp[tipo] = null;
        preencherNomeArquivo(tipo, null);
        return;
    }

    const hashArquivo = await calcularHashArquivoFinanceiro(file);
    const anexoPreliminar = {
        nome: file.name,
        tipo: file.type || 'application/octet-stream',
        tamanho: file.size || 0,
        ultimaModificacao: file.lastModified || null,
        hashArquivo
    };
    const idAtual = document.getElementById('financeiroId')?.value || '';
    const duplicado = buscarDocumentoDuplicadoFinanceiro(anexoPreliminar, idAtual);
    if (duplicado) {
        financeiroAnexosTemp[tipo] = null;
        preencherNomeArquivo(tipo, null);
        const input = document.getElementById(tipo === 'documento' ? 'financeiroDocumento' : 'financeiroComprovante');
        if (input) input.value = '';
        alert(mensagemDocumentoDuplicadoFinanceiro(anexoPreliminar, duplicado));
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        financeiroAnexosTemp[tipo] = {
            ...anexoPreliminar,
            dados: reader.result
        };
        preencherNomeArquivo(tipo, file);
        if (tipo === 'documento') atualizarCategoriaDocumentoFinanceiro(financeiroAnexosTemp[tipo]);
    };
    reader.readAsDataURL(file);
}

function lerArquivoComoDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function lerArquivoComoTexto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsText(file, 'utf-8');
    });
}

function preencherCampoFinanceiro(id, valor, sobrescrever = false) {
    const el = document.getElementById(id);
    if (!el || valor === undefined || valor === null || valor === '') return;
    if (!sobrescrever && String(el.value || '').trim()) return;
    el.value = valor;
}

function escapeHtmlFinanceiro(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJsStringFinanceiro(valor) {
    return String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function textoDeAnexoBase64(anexo) {
    if (!anexo?.dados) return '';
    const partes = String(anexo.dados).split(',');
    if (partes.length < 2) return '';
    try {
        return decodeURIComponent(escape(atob(partes[1])));
    } catch (_) {
        try { return atob(partes[1]); } catch (e) { return ''; }
    }
}

function bytesDeAnexoBase64(anexo) {
    const partes = String(anexo?.dados || '').split(',');
    if (partes.length < 2) return null;
    const binario = atob(partes[1]);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
}

async function extrairTextoPdfFinanceiro(anexo) {
    if (!window.pdfjsLib) {
        throw new Error('Biblioteca PDF.js não carregada.');
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
    const bytes = bytesDeAnexoBase64(anexo);
    if (!bytes) return '';
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const paginas = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const linhas = new Map();
        content.items
            .filter(item => String(item.str || '').trim())
            .forEach(item => {
                const x = Number(item.transform?.[4] || 0);
                const y = Math.round(Number(item.transform?.[5] || 0) / 3) * 3;
                const chave = String(y);
                if (!linhas.has(chave)) linhas.set(chave, []);
                linhas.get(chave).push({ x, texto: String(item.str || '').trim() });
            });
        const textoPagina = Array.from(linhas.entries())
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([, itens]) => itens.sort((a, b) => a.x - b.x).map(item => item.texto).join(' '))
            .join('\n');
        paginas.push(textoPagina);
    }
    return paginas.join('\n').trim();
}

async function renderizarPrimeiraPaginaPdfFinanceiro(anexo) {
    if (!window.pdfjsLib) return '';
    const bytes = bytesDeAnexoBase64(anexo);
    if (!bytes) return '';
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.82);
}

function valorXmlPorTag(xml, tags = []) {
    for (const tag of tags) {
        const el = xml.getElementsByTagName(tag)?.[0];
        const texto = el?.textContent?.trim();
        if (texto) return texto;
    }
    return '';
}

function extrairDadosXmlFinanceiro(texto) {
    const xml = new DOMParser().parseFromString(texto, 'text/xml');
    const erro = xml.getElementsByTagName('parsererror')?.[0];
    if (erro) return null;
    const emit = xml.getElementsByTagName('emit')?.[0];
    const nome = emit?.getElementsByTagName('xNome')?.[0]?.textContent?.trim()
        || valorXmlPorTag(xml, ['xNome', 'nome']);
    const vencimento = valorXmlPorTag(xml, ['dVenc', 'vencimento', 'dtVenc']);
    const emissao = valorXmlPorTag(xml, ['dhEmi', 'dEmi']);
    const valor = valorXmlPorTag(xml, ['vNF', 'vLiq', 'valor']);
    return {
        tipo: 'NOTA FISCAL',
        descricao: nome || 'DOCUMENTO XML',
        vencimento: vencimento || (emissao ? emissao.slice(0, 10) : ''),
        valor: Number(String(valor || '0').replace(',', '.')) || 0
    };
}

function primeiraLinhaUtilFinanceiro(texto) {
    const ignorar = [
        /^local de pagamento$/i,
        /^pag/i,
        /^benefici/i,
        /^pagador$/i,
        /^recibo do pagador$/i,
        /^ficha de caixa$/i,
        /^ficha de compensa/i,
        /^autentica/i,
        /^uso do banco/i,
        /^carteira/i,
        /^quantidade$/i,
        /^valor da moeda$/i,
        /^em caso de d[uú]vidas/i,
        /^contate seu gerente/i,
        /^central no/i,
        /^ap[oó]s o vencimento/i,
        /^instru[cç][oõ]es/i
    ];
    return String(texto || '')
        .split(/\r?\n/)
        .map(linha => linha.replace(/\s+/g, ' ').trim())
        .find(linha => linha.length >= 4 && !ignorar.some(regex => regex.test(linha))) || '';
}

function extrairLinhaAposRotuloFinanceiro(texto, rotuloRegex) {
    const linhas = String(texto || '').split(/\r?\n/).map(linha => linha.replace(/\s+/g, ' ').trim());
    for (let i = 0; i < linhas.length; i++) {
        if (rotuloRegex.test(linhas[i])) {
            const naMesmaLinha = linhas[i].replace(rotuloRegex, '').trim();
            if (naMesmaLinha.length >= 4) return naMesmaLinha;
            for (let j = i + 1; j < Math.min(i + 4, linhas.length); j++) {
                if (linhas[j] && linhas[j].length >= 4) return linhas[j];
            }
        }
    }
    return '';
}

function limparDescricaoDocumentoFinanceiro(valor) {
    return String(valor || '')
        .replace(/^NOME\s+DO\s+BENEFICI\S*\s*/i, '')
        .replace(/^BENEFICI\S*\s*/i, '')
        .replace(/\s+\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/g, '')
        .replace(/\s+\d{2}\.\d{3}\.\d{3}\/\d{4}.*$/g, '')
        .replace(/\s+(VENCIMENTO|AGENCIA|AGÃŠNCIA|DATA PROCESSAMENTO|ACEITE|ESP\.? DOC).*$/i, '')
        .replace(/\s+(RUA|AV\.?|AVENIDA|RODOVIA)\s+.*$/i, '')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 90)
        .trim();
}

function pareceDocumentoFinanceiro(textoBusca, limpo) {
    return /BOLETO|VENCIMENTO|VALOR A PAGAR|VALOR DO DOCUMENTO|NOTA FISCAL|DANFE|DARF|FGTS|RECEITA FEDERAL|TELEFONICA|VIVO|FICHA DE COMPENSA/.test(textoBusca)
        || /R\$\s*[0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}/.test(limpo);
}

function aplicarRegrasFornecedorFinanceiro(dados, textoBusca, limpo) {
    const ajustado = { ...(dados || {}) };
    if (textoBusca.includes('SICREDI') && textoBusca.includes('ASSISTENCIAL')) {
        ajustado.tipo = 'BOLETO';
        ajustado.descricao = 'BOLETO ASSISTENCIAL';
    }
    if (textoBusca.includes('DIAFER')) {
        ajustado.tipo = 'BOLETO';
        ajustado.descricao = 'DIAFER LTDA';
    }
    if (textoBusca.includes('RECEITA FEDERAL') || textoBusca.includes('DOCUMENTO DE ARRECADACAO')) {
        ajustado.tipo = 'IMPOSTO';
        ajustado.descricao = 'RECEITA FEDERAL / DARF';
    }
    if (textoBusca.includes('FGTS DIGITAL')) {
        ajustado.tipo = 'IMPOSTO';
        ajustado.descricao = 'FGTS DIGITAL';
    }
    if (textoBusca.includes('TELEFONICA BRASIL') || textoBusca.includes(' VIVO ')) {
        ajustado.tipo = 'CONTA';
        ajustado.descricao = 'VIVO / TELEFONICA';
    }
    if (!ajustado.descricao && limpo) ajustado.descricao = 'PENDENTE DE CONFERENCIA';
    return ajustado;
}

function leituraFinanceiraIncompleta(dados) {
    if (!dados) return true;
    if (dados.precisaConferencia) return true;
    if (!dados.vencimento && !dados.emissao) return true;
    if (!Number(dados.valor || 0)) return true;
    if (descricaoFinanceiraRuim(dados.descricao)) return true;
    return false;
}

function leituraFinanceiraUtil(dados) {
    return Boolean(dados && Number(dados.valor || 0) > 0 && Boolean(dados.vencimento || dados.emissao) && !descricaoFinanceiraRuim(dados.descricao));
}

function comTimeoutFinanceiro(promessa, ms, mensagem = 'Tempo limite na leitura do documento.') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(mensagem)), ms);
    });
    return Promise.race([promessa, timeout]).finally(() => clearTimeout(timer));
}

function salvarUsoIAFinanceiro(usage = {}) {
    try {
        const atual = JSON.parse(localStorage.getItem(FINANCEIRO_AI_USAGE_KEY) || '{}');
        const novo = {
            totalTokens: Number(atual.totalTokens || 0) + Number(usage.totalTokens || 0),
            inputTokens: Number(atual.inputTokens || 0) + Number(usage.inputTokens || 0),
            outputTokens: Number(atual.outputTokens || 0) + Number(usage.outputTokens || 0),
            estimatedCostUsd: Number(atual.estimatedCostUsd || 0) + Number(usage.estimatedCostUsd || 0),
            documentos: Number(atual.documentos || 0) + 1
        };
        localStorage.setItem(FINANCEIRO_AI_USAGE_KEY, JSON.stringify(novo));
    } catch (error) {
        console.warn('Não foi possível salvar uso da IA financeira.', error);
    }
}

function normalizarDadosIAFinanceiro(dados = {}) {
    const fornecedor = dados.fornecedor || '';
    const descricao = dados.descricao || fornecedor || dados.tipo || 'PENDENTE DE CONFERENCIA';
    const produtos = Array.isArray(dados.produtos) ? dados.produtos.filter(p => p?.descricao) : [];
    return {
        tipo: normalizarTexto(dados.tipo || 'DOCUMENTO'),
        descricao: normalizarTexto(descricao).slice(0, 90),
        fornecedor: normalizarTexto(fornecedor),
        cnpj: dados.cnpj || '',
        vencimento: dados.vencimento || dados.emissao || '',
        valor: Number(dados.valor || dados.valorTotal || 0),
        numeroDocumento: dados.numeroDocumento || '',
        produtos,
        categoriaSugerida: dados.categoriaSugerida || '',
        pastaSugerida: dados.pastaSugerida || '',
        confiancaIA: dados.confianca || 'media',
        observacaoIA: dados.observacao || '',
        analisadoPorIA: true,
        precisaConferencia: dados.confianca === 'baixa'
    };
}

async function analisarDocumentoFinanceiroIA(textoDocumento, anexo, sugestaoLocal = {}, imagemDocumento = '') {
    let timeout;
    try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch('/api/financeiro-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                nomeArquivo: anexo?.nome || '',
                textoDocumento: String(textoDocumento || '').slice(0, 14000),
                sugestaoLocal,
                imagemDocumento
            })
        });
        clearTimeout(timeout);
        const rawText = await response.text();
        let data = {};
        try { data = rawText ? JSON.parse(rawText) : {}; } catch { data = {}; }
        if (!response.ok) throw new Error(data.error || rawText || 'Falha na IA financeira.');
        if (data.usage) salvarUsoIAFinanceiro(data.usage);
        return normalizarDadosIAFinanceiro(data.dados || {});
    } catch (error) {
        console.warn('IA financeira indisponivel:', error.message);
        return null;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

function extrairDescricaoBoletoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const linhas = String(texto || '').split(/\r?\n/).map(linha => linha.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const boletoAssistencial = limpo.match(/BOLETO\s+ASSISTENCIAL\s+REF\.?\s*\d{2}\/\d{4}/i)?.[0];
    if (boletoAssistencial) return boletoAssistencial.toUpperCase();
    for (let i = 0; i < linhas.length; i++) {
        if (/NOME\s+DO\s+BENEFICI|BENEFICI|CEDENTE/i.test(linhas[i])) {
            const mesmaLinha = limparDescricaoDocumentoFinanceiro(linhas[i]);
            if (mesmaLinha && !/LOCAL DE PAGAMENTO|VENCIMENTO|PAGADOR/i.test(mesmaLinha) && mesmaLinha.length >= 5) {
                return mesmaLinha;
            }
            const proximas = linhas.slice(i + 1, i + 5).filter(linha =>
                linha.length >= 5
                && !/LOCAL DE PAGAMENTO|VENCIMENTO|AG[ÊE]NCIA|DATA|DOCUMENTO|ESP[ÉE]CIE|ACEITE|PAGADOR|CNPJ:?\s*$/i.test(linha)
            );
            const fornecedorLinha = proximas.find(linha => /[A-Z]{3,}/.test(linha) && !/^\d/.test(linha));
            if (fornecedorLinha) return limparDescricaoDocumentoFinanceiro(fornecedorLinha);
        }
    }
    const beneficiario = limpo.match(/NOME\s+DO\s+BENEFICI\S*\s+([A-Z0-9 .&\\/,-]{4,120}?)(?:\s+\d{2}\.\d{3}\.\d{3}|\s+CNPJ|\s+CPF|\s+RUA|\s+AV\.|\s+ENDERE|\s+VENCIMENTO)/i)?.[1]
        || limpo.match(/BENEFICI\S*\s+([A-Z0-9 .&\\/,-]{4,120}?)(?:\s+\d{2}\.\d{3}\.\d{3}|\s+CNPJ|\s+CPF|\s+RUA|\s+AV\.|\s+ENDERE|\s+VENCIMENTO)/i)?.[1];
    if (beneficiario) return limparDescricaoDocumentoFinanceiro(beneficiario);
    const refDoc = limpo.match(/REF\.?\s*DOC\.?\s*[:\-]?\s*([A-Z0-9./ -]{4,40})/i)?.[0];
    if (refDoc) return refDoc.toUpperCase();
    return '';
}

function extrairVencimentoBoletoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const aposPagavel = limpo.match(/PAG[AÃ]VEL[\s\S]{0,180}?(\d{2}\/\d{2}\/\d{4})/i)?.[1];
    const todas = Array.from(limpo.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)).map(match => match[1]);
    return aposPagavel || todas[todas.length - 1] || '';
}

function linhasFinanceiro(texto) {
    return String(texto || '').split(/\r?\n/).map(linha => linha.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function parseMoedaFinanceiro(valor) {
    return parseMoeda(String(valor || '').replace(/\s+/g, ''));
}

function dinheiroRegexFinanceiro() {
    return /(?:R\$\s*)?([0-9]{1,3}(?:[.\s][0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/g;
}

function extrairValoresMonetariosLinhaFinanceiro(linha) {
    return Array.from(String(linha || '').matchAll(dinheiroRegexFinanceiro()))
        .map(match => parseMoedaFinanceiro(match[1]))
        .filter(valor => Number.isFinite(valor) && valor > 0);
}

function linhaEhValorNegativoBoletoFinanceiro(linha) {
    return /\(-\)|DESCONTO|ABATIMENTO|DEDU[CÇ][AÃ]O|DEDUCAO|MORA|MULTA|JUROS|ACR[EÉ]SCIMO|ACRESCIMO|OUTRAS/i.test(linha);
}

function extrairValorLinhaDigitavelFinanceiro(texto) {
    const candidatos = [];
    const coletar = trecho => {
        const limpo = String(trecho || '').replace(/\D/g, '');
        if (limpo.length === 47 && /^\d{3}/.test(limpo)) {
            const valor = Number(limpo.slice(-10)) / 100;
            if (valor > 0) candidatos.push(valor);
        }
        if (limpo.length === 44 && /^\d{3}/.test(limpo)) {
            const valor = Number(limpo.slice(9, 19)) / 100;
            if (valor > 0) candidatos.push(valor);
        }
    };
    for (const linha of linhasFinanceiro(texto)) {
        Array.from(linha.matchAll(/(?:\d[\s.-]*){44,47}/g)).forEach(match => coletar(match[0]));
    }
    if (!candidatos.length) {
        Array.from(String(texto || '').matchAll(/(?:\d[\s.-]*){44,47}/g)).forEach(match => coletar(match[0]));
    }
    return candidatos[0] || 0;
}

function extrairVencimentoBoletoRobustoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const porRotulo = limpo.match(/VENCIMENTO[\s\S]{0,80}?(\d{2}\/\d{2}\/\d{4})/i)?.[1];
    const aposPagavel = limpo.match(/PAG[A-ZÃƒÂÃ]{0,4}VEL[\s\S]{0,220}?(\d{2}\/\d{2}\/\d{4})/i)?.[1];
    const todas = Array.from(limpo.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)).map(match => match[1]);
    return porRotulo || aposPagavel || todas[todas.length - 1] || '';
}

function extrairValorBoletoRobustoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const candidatos = [];
    linhasFinanceiro(texto).forEach((linha, index, linhas) => {
        if (!/(VALOR\s+DO\s+DOCUMENTO|VALOR\s+COBRADO|VALOR\s+A\s+PAGAR|TOTAL\s+A\s+PAGAR|VALOR\s+A\s+RECOLHER|TOTAL\s+DA\s+GUIA)/i.test(linha)) return;
        if (linhaEhValorNegativoBoletoFinanceiro(linha)) return;
        const janela = [linha, linhas[index + 1] || '', linhas[index + 2] || ''].join(' ');
        const valores = extrairValoresMonetariosLinhaFinanceiro(janela);
        if (valores.length) candidatos.push({ valor: valores[valores.length - 1], score: 100 });
    });
    const rotulos = [
        /\(=\)\s*VALOR\s+DO\s+DOCUMENTO[\s\S]{0,180}/ig,
        /VALOR\s+DO\s+DOCUMENTO[\s\S]{0,180}/ig,
        /\(=\)\s*VALOR\s+COBRADO[\s\S]{0,180}/ig,
        /VALOR\s+A\s+PAGAR[\s\S]{0,180}/ig,
        /TOTAL\s+A\s+PAGAR[\s\S]{0,180}/ig,
        /VALOR\s+A\s+RECOLHER[\s\S]{0,180}/ig,
        /TOTAL\s+DA\s+GUIA[\s\S]{0,180}/ig
    ];
    rotulos.forEach(regex => {
        Array.from(limpo.matchAll(regex)).forEach(match => {
            const trecho = match[0];
            if (linhaEhValorNegativoBoletoFinanceiro(trecho)) return;
            const valores = extrairValoresMonetariosLinhaFinanceiro(trecho);
            if (valores.length) candidatos.push({ valor: valores[valores.length - 1], score: 90 });
        });
    });
    const valorLinha = extrairValorLinhaDigitavelFinanceiro(texto);
    if (valorLinha > 0) candidatos.push({ valor: valorLinha, score: 95 });
    candidatos.sort((a, b) => b.score - a.score);
    return candidatos[0]?.valor || 0;
}

function descricaoFinanceiraRuim(descricao) {
    return !descricao
        || /PENDENTE|DOCUMENTO|IMPORTADO|EM CASO DE D[ÚU]VIDAS|CONTATE SEU GERENTE|CENTRAL NO|INSTRU[CÇ][OÕ]ES|AP[ÓO]S O VENCIMENTO/i.test(descricao);
}

function extrairDadosNotaFiscalTextoFinanceiro(texto, textoBusca, limpo) {
    if (!/DANFE|NOTA FISCAL|NF-E|NFE|NFS-E|NFSE/.test(textoBusca)) return null;
    const linhas = linhasFinanceiro(texto);
    const emissao = limpo.match(/(?:EMISS[AÃ]O|DATA\s+DE\s+EMISS[AÃ]O|DATA\s+DO\s+DOCUMENTO)[^\d]{0,40}(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i)?.[1]
        || limpo.match(/\b(\d{2}[\/.-]\d{2}[\/.-]\d{4})\b/)?.[1];
    const numero = limpo.match(/(?:N[ºO]\.?\s*|NUMERO\s+)(?:DA\s+NOTA\s+)?(?:NF-?E\s*)?(\d{3,12})/i)?.[1]
        || limpo.match(/NF-?E\s*(\d{3,12})/i)?.[1]
        || '';
    const fornecedor = limparDescricaoDocumentoFinanceiro(
        extrairLinhaAposRotuloFinanceiro(texto, /^(IDENTIFICA[CÇ][AÃ]O\s+DO\s+EMITENTE|EMITENTE|NOME\s*\/\s*RAZ[AÃ]O\s+SOCIAL)\b[:\s-]*/i)
        || linhas.find(linha => /LTDA|EIRELI|S\/A|ME\b|COMERCIO|INDUSTRIA|SERVICOS|SERVI[CÇ]OS/i.test(linha) && !/VANMART|MADEIRAS VANMART|COMERCIO DE MADEIRAS VANMART/i.test(linha))
        || primeiraLinhaUtilFinanceiro(texto)
    );
    const valorNota = (() => {
        const rotulos = [
            /VALOR\s+TOTAL\s+DA\s+NOTA[\s\S]{0,160}/ig,
            /VALOR\s+TOTAL\s+DOS\s+PRODUTOS[\s\S]{0,160}/ig,
            /VALOR\s+TOTAL\s+NF[\s\S]{0,160}/ig,
            /TOTAL\s+DA\s+NOTA[\s\S]{0,160}/ig
        ];
        for (const regex of rotulos) {
            const match = Array.from(limpo.matchAll(regex))[0];
            const valores = match ? extrairValoresMonetariosLinhaFinanceiro(match[0]) : [];
            if (valores.length) return valores[valores.length - 1];
        }
        return 0;
    })();
    return {
        tipo: 'NOTA FISCAL',
        descricao: fornecedor || 'NOTA FISCAL IMPORTADA',
        fornecedor,
        numeroDocumento: numero,
        vencimento: emissao ? emissao.split(/[\/.-]/).reverse().join('-') : '',
        valor: valorNota || 0,
        precisaConferencia: !valorNota || descricaoFinanceiraRuim(fornecedor)
    };
}

function extrairDadosTextoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const textoBusca = limpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const data = limpo.match(/(?:vencimento|venc\.?|pagar at[eÃ©]|data de vencimento)[:\s]*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i)?.[1]
        || limpo.match(/\b(\d{2}[\/.-]\d{2}[\/.-]\d{4})\b/)?.[1];
    const valor = limpo.match(/(?:valor(?:\s+total\s+do\s+documento|\s+do\s+documento)?|valor cobrado|valor a pagar|total da guia|valor a recolher|total)[:\s()=R$]*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i)?.[1]
        || limpo.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/)?.[1];
    const favorecido = limparDescricaoDocumentoFinanceiro(
        extrairLinhaAposRotuloFinanceiro(texto, /^(benefici|cedente|favorecido|fornecedor)\b[:\s-]*/i)
        || limpo.match(/(?:benefici[Ã¡a]rio|cedente|favorecido|fornecedor)[:\s-]*([A-Z0-9 .&\\/,-]{4,80})/i)?.[1]
        || primeiraLinhaUtilFinanceiro(texto)
    );
    const vencimento = data ? data.split(/[\/.-]/).reverse().join('-') : '';
    if (!pareceDocumentoFinanceiro(textoBusca, limpo)) {
        return {
            tipo: 'DOCUMENTO',
            descricao: 'PENDENTE DE CONFERENCIA',
            vencimento: '',
            valor: 0,
            precisaConferencia: true
        };
    }
    const dadosNota = extrairDadosNotaFiscalTextoFinanceiro(texto, textoBusca, limpo);
    if (dadosNota) return dadosNota;
    const isBoleto = /boleto|nosso n[uÃƒÂº]mero|ficha de compensa|linha digitavel|linha digitÃ¡vel/i.test(limpo);
    if (isBoleto) {
        const vencimentoBoleto = extrairVencimentoBoletoRobustoFinanceiro(texto);
        const valorBoleto = extrairValorBoletoRobustoFinanceiro(texto) || (valor ? parseMoeda(valor) : 0);
        const descricaoBoleto = extrairDescricaoBoletoFinanceiro(texto);
        return aplicarRegrasFornecedorFinanceiro({
            tipo: 'BOLETO',
            descricao: descricaoBoleto || favorecido || 'BOLETO IMPORTADO',
            vencimento: vencimentoBoleto ? vencimentoBoleto.split(/[\/.-]/).reverse().join('-') : vencimento,
            valor: valorBoleto || 0
        }, textoBusca, limpo);
    }
    if (textoBusca.includes('DOCUMENTO DE ARRECADACAO') && textoBusca.includes('RECEITAS FEDERAIS')) {
        return {
            tipo: 'IMPOSTO',
            descricao: 'RECEITA FEDERAL / DARF',
            vencimento,
            valor: valor ? parseMoeda(valor) : 0
        };
    }
    if (textoBusca.includes('GUIA DO FGTS DIGITAL') || textoBusca.includes('FGTS DIGITAL')) {
        const valorFgts = limpo.match(/Valor a recolher\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i)?.[1]
            || limpo.match(/Total da Guia:\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i)?.[1]
            || valor;
        return {
            tipo: 'IMPOSTO',
            descricao: 'FGTS DIGITAL',
            vencimento,
            valor: valorFgts ? parseMoeda(valorFgts) : 0
        };
    }
    if (textoBusca.includes('TELEFONICA BRASIL') || textoBusca.includes(' VIVO ')) {
        const valorVivo = limpo.match(/VALOR A PAGAR \(R\$\)\s*\d{2}\/\d{2}\/\d{4}\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i)?.[1]
            || limpo.match(/Total a pagar\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i)?.[1]
            || valor;
        return {
            tipo: 'CONTA',
            descricao: 'VIVO / TELEFONICA',
            vencimento,
            valor: valorVivo ? parseMoeda(valorVivo) : 0
        };
    }
    return {
        tipo: 'DOCUMENTO',
        descricao: favorecido || 'DOCUMENTO IMPORTADO',
        vencimento,
        valor: valor ? parseMoeda(valor) : 0
    };
}

async function extrairDadosFinanceirosDoAnexo(anexo) {
    if (!anexo?.dados) throw new Error('Este anexo não possui arquivo carregado para leitura.');
    if ((anexo.tipo || '').startsWith('image/')) {
        const dadosImagem = await analisarDocumentoFinanceiroIA('', anexo, {}, anexo.dados);
        return { dados: dadosImagem, usouIA: Boolean(dadosImagem?.analisadoPorIA), texto: '' };
    }
    const nomeArquivo = (anexo.nome || '').toLowerCase();
    const tipoArquivo = (anexo.tipo || '').toLowerCase();
    let texto = '';
    if (nomeArquivo.endsWith('.pdf') || tipoArquivo.includes('pdf')) {
        texto = await extrairTextoPdfFinanceiro(anexo);
    } else {
        texto = textoDeAnexoBase64(anexo);
    }
    const imagemDocumento = (nomeArquivo.endsWith('.pdf') || tipoArquivo.includes('pdf')) ? await renderizarPrimeiraPaginaPdfFinanceiro(anexo).catch(() => '') : '';
    if (!texto || texto.length < 20) {
        const dadosImagem = imagemDocumento ? await analisarDocumentoFinanceiroIA('', anexo, {}, imagemDocumento) : null;
        return { dados: dadosImagem, usouIA: Boolean(dadosImagem?.analisadoPorIA), texto: '' };
    }
    const dadosLocal = nomeArquivo.endsWith('.xml') || tipoArquivo.includes('xml') || /<\?xml|<nfeProc|<NFe|<cteProc|<CFe/i.test(texto)
        ? extrairDadosXmlFinanceiro(texto)
        : extrairDadosTextoFinanceiro(texto);
    const dadosIA = leituraFinanceiraIncompleta(dadosLocal)
        ? await analisarDocumentoFinanceiroIA(texto, anexo, dadosLocal || {}, imagemDocumento)
        : null;
    return {
        dados: leituraFinanceiraUtil(dadosIA) ? dadosIA : (leituraFinanceiraUtil(dadosLocal) ? dadosLocal : (dadosIA || dadosLocal)),
        usouIA: Boolean(dadosIA?.analisadoPorIA),
        texto
    };
}
window.lerDocumentoFinanceiroAutomaticamente = async function() {
    const anexo = await hidratarAnexoFinanceiro(financeiroAnexosTemp.documento);
    if (!anexo?.dados) {
        alert('Selecione primeiro um documento PDF, XML ou imagem.');
        return;
    }
    let resultado;
    try {
        resultado = await extrairDadosFinanceirosDoAnexo(anexo);
    } catch (error) {
        console.error('Erro ao ler documento financeiro:', error);
        alert(error.message || 'Não foi possível ler este documento automaticamente.');
        return;
    }
    const { dados, usouIA } = resultado;
    if (!dados) {
        alert('Não foi possível identificar os dados do documento. Preencha manualmente.');
        return;
    }
    preencherCampoFinanceiro('financeiroTipo', dados.tipo, true);
    preencherCampoFinanceiro('financeiroDescricao', dados.descricao, true);
    preencherCampoFinanceiro('financeiroVencimento', dados.vencimento, true);
    if (dados.valor > 0) preencherCampoFinanceiro('financeiroValor', formatarMoeda(dados.valor), true);
    atualizarCategoriaDocumentoFinanceiro(anexo, dados);
    const obs = usouIA
        ? `IMPORTADO DO DOCUMENTO COM APOIO DA IA: ${anexo.nome}`
        : `IMPORTADO DO DOCUMENTO: ${anexo.nome}`;
    preencherCampoFinanceiro('financeiroObservacao', obs, true);
    alert(`Leitura concluida${usouIA ? ' com apoio da IA' : ''}. Confira os campos antes de salvar.`);
};

async function extrairDadosAnexoFinanceiro(anexo) {
    const nomeArquivo = (anexo.nome || '').toLowerCase();
    const tipoArquivo = (anexo.tipo || '').toLowerCase();
    if ((anexo.tipo || '').startsWith('image/')) {
        return { tipo: 'DOCUMENTO', descricao: 'DOCUMENTO IMAGEM - CONFERIR', vencimento: '', valor: 0, precisaConferencia: true };
    }
    let texto = '';
    if (nomeArquivo.endsWith('.pdf') || tipoArquivo.includes('pdf')) {
        try {
            texto = await extrairTextoPdfFinanceiro(anexo);
        } catch (error) {
            console.error('Erro ao extrair PDF financeiro:', anexo.nome, error);
            return { tipo: 'DOCUMENTO', descricao: 'PDF NAO LIDO - CONFERIR', vencimento: '', valor: 0, precisaConferencia: true };
        }
        if (!texto || texto.length < 20) {
            return { tipo: 'DOCUMENTO', descricao: 'PDF IMAGEM - PRECISA OCR', vencimento: '', valor: 0, precisaConferencia: true };
        }
    } else {
        texto = textoDeAnexoBase64(anexo);
    }
    if (!texto) return { tipo: 'DOCUMENTO', descricao: 'DOCUMENTO NAO LIDO', vencimento: '', valor: 0, precisaConferencia: true };
    const dadosLocal = (nomeArquivo.endsWith('.xml') || tipoArquivo.includes('xml') || /<\?xml|<nfeProc|<NFe|<cteProc|<CFe/i.test(texto))
        ? extrairDadosXmlFinanceiro(texto)
        : extrairDadosTextoFinanceiro(texto);
    if (leituraFinanceiraIncompleta(dadosLocal)) {
        const dadosIA = await analisarDocumentoFinanceiroIA(texto, anexo, dadosLocal);
        if (dadosIA && !leituraFinanceiraIncompleta(dadosIA)) {
            return dadosIA;
        }
        if (dadosIA) {
            return { ...dadosLocal, ...dadosIA, precisaConferencia: true };
        }
    }
    return dadosLocal;
}

function confirmarImportacaoFinanceira(anexo, dados, origemArquivo) {
    return new Promise(resolve => {
        const pendente = dados?.precisaConferencia || !dados?.valor || !dados?.vencimento;
        const nomeSeguro = escapeHtmlFinanceiro(anexo?.nome || origemArquivo || 'Documento');
        const origemSegura = escapeHtmlFinanceiro(origemArquivo || anexo?.nome || '');
        const podeVisualizar = Boolean(anexo?.dados || anexo?.localUrl || anexo?.localPath);
        const overlay = document.createElement('div');
        overlay.className = 'financeiro-import-modal';
        overlay.innerHTML = `
            <div class="financeiro-import-box">
                <div class="financeiro-import-head">
                    <div>
                        <h3><i class="fa-solid fa-file-circle-check"></i> Conferir documento financeiro</h3>
                        <small>${nomeSeguro}</small>
                    </div>
                    <div class="financeiro-import-head-actions">
                        ${podeVisualizar ? '<button type="button" class="btn-secondary" data-action="visualizar"><i class="fa-solid fa-eye"></i> Visualizar PDF</button>' : ''}
                        <span class="financeiro-status-badge ${pendente ? 'pendente' : 'aberto'}">${pendente ? 'Pendente' : 'Lido automaticamente'}</span>
                    </div>
                </div>
                ${pendente ? '<div class="financeiro-import-alert"><i class="fa-solid fa-triangle-exclamation"></i> Confira os dados antes de salvar. Se este arquivo não for financeiro, clique em Ignorar.</div>' : ''}
                <div class="financeiro-import-grid">
                    <label>Tipo<input id="importFinTipo" value="${escapeHtmlFinanceiro(normalizarTexto(dados?.tipo || 'DOCUMENTO'))}"></label>
                    <label>Descrição<input id="importFinDescricao" value="${escapeHtmlFinanceiro(normalizarTexto(dados?.descricao || 'PENDENTE DE CONFERENCIA'))}"></label>
                    <label>Vencimento<input id="importFinVencimento" type="date" value="${escapeHtmlFinanceiro(dados?.vencimento || '')}"></label>
                    <label>Valor<input id="importFinValor" value="${escapeHtmlFinanceiro(dados?.valor ? formatarMoeda(dados.valor) : '')}" placeholder="R$ 0,00"></label>
                    <label class="span-2">Observacao<textarea id="importFinObservacao" rows="2">IMPORTADO: ${origemSegura}${pendente ? ' | CONFERIR MANUALMENTE' : ''}</textarea></label>
                </div>
                <div class="financeiro-import-actions">
                    <button type="button" class="btn-secondary" data-action="cancelar">Cancelar importacao</button>
                    <button type="button" class="btn-danger" data-action="ignorar"><i class="fa-solid fa-ban"></i> Ignorar</button>
                    <button type="button" class="btn-primary" data-action="salvar"><i class="fa-solid fa-floppy-disk"></i> Salvar conferido</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const valorInput = overlay.querySelector('#importFinValor');
        valorInput?.addEventListener('input', event => aplicarMascaraMoeda(event.target));
        overlay.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'cancelar') {
                    overlay.remove();
                    resolve({ cancelar: true });
                    return;
                }
                if (action === 'ignorar') {
                    overlay.remove();
                    resolve(null);
                    return;
                }
                if (action === 'visualizar') {
                    abrirAnexoFinanceiroDireto(anexo);
                    return;
                }
                const tipo = normalizarTexto(overlay.querySelector('#importFinTipo')?.value || '');
                const descricao = normalizarTexto(overlay.querySelector('#importFinDescricao')?.value || '');
                const vencimento = overlay.querySelector('#importFinVencimento')?.value || '';
                const valor = parseMoeda(overlay.querySelector('#importFinValor')?.value || '');
                const observacao = overlay.querySelector('#importFinObservacao')?.value?.trim() || '';
                overlay.remove();
                resolve({
                    tipo: tipo || 'DOCUMENTO',
                    descricao: descricao || 'PENDENTE DE CONFERENCIA',
                    vencimento,
                    valor,
                    observacao,
                    precisaConferencia: !vencimento || valor <= 0
                });
            });
        });
    });
}

function abrirAnexoFinanceiroDireto(anexo) {
    if (!anexo) return;
    if (anexo.dados) {
        const blobUrl = dataUrlParaBlobUrlFinanceiro(anexo.dados);
        if (blobUrl) {
            window.open(blobUrl, '_blank');
            return;
        }
        const win = window.open('', '_blank');
        if (!win) {
            alert('Libere pop-ups para visualizar o anexo.');
            return;
        }
        win.document.write(`<title>${escapeHtmlFinanceiro(anexo.nome || 'Anexo')}</title><iframe src="${anexo.dados}" style="width:100%; height:100vh; border:0;"></iframe>`);
        win.document.close();
        return;
    }
    if (anexo.localUrl) {
        window.open(anexo.localUrl, '_blank');
        return;
    }
    const caminho = anexo.localPath || anexo.localFolder || anexo.nome || '';
    window.prompt('Arquivo salvo localmente. Copie o caminho abaixo e cole no Explorador de Arquivos para abrir:', caminho);
}

function dataUrlParaBlobUrlFinanceiro(dataUrl) {
    try {
        const [header, base64] = String(dataUrl).split(',');
        if (!header || !base64) return '';
        const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: mime }));
    } catch (error) {
        console.error('Falha ao preparar visualizacao do anexo:', error);
        return '';
    }
}

window.importarPastaFinanceira = async function(files) {
    const listaArquivos = Array.from(files || []).filter(file => /\.(pdf|xml)$/i.test(file.name) || (file.type || '').startsWith('image/'));
    if (!listaArquivos.length) {
        alert('Nenhum PDF, XML ou imagem encontrado na pasta selecionada.');
        return;
    }
    const lista = obterLancamentosFinanceiros();
    const importados = [];
    const duplicados = [];
    const assinaturasDoLote = new Set();
    for (const file of listaArquivos) {
        try {
            const hashArquivo = await calcularHashArquivoFinanceiro(file);
            const anexo = {
                nome: file.name,
                tipo: file.type || (file.name.toLowerCase().endsWith('.xml') ? 'application/xml' : 'application/octet-stream'),
                tamanho: file.size || 0,
                ultimaModificacao: file.lastModified || null,
                hashArquivo,
                dados: await lerArquivoComoDataUrl(file)
            };
            const assinaturasArquivo = obterAssinaturasDocumentoFinanceiro(anexo);
            if (assinaturasArquivo.some(chave => assinaturasDoLote.has(chave))) {
                duplicados.push({ nome: file.name, duplicado: null });
                continue;
            }
            const duplicado = buscarDocumentoDuplicadoFinanceiro(anexo);
            if (duplicado) {
                duplicados.push({ nome: file.name, duplicado });
                continue;
            }
            assinaturasArquivo.forEach(chave => assinaturasDoLote.add(chave));
            const anexoLocal = await salvarArquivoFinanceiroLocal(anexo);
            const id = `fin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const categoriaDocumento = detectarCategoriaDocumentoFinanceiro(anexoLocal, {});
            const documentoVinculado = criarDocumentoVinculadoFinanceiro(anexoLocal, categoriaDocumento, 'importacao_pasta');
            const registro = {
                id,
                aba: 'caixa-financeira',
                tipo: categoriaDocumento === 'boleto' ? 'BOLETO' : (categoriaDocumento === 'xml' || categoriaDocumento === 'nota_fiscal' ? 'NOTA FISCAL' : 'DOCUMENTO'),
                descricao: normalizarTexto(file.name.replace(/\.(pdf|xml)$/i, '').replace(/[-_]+/g, ' ')) || 'PENDENTE DE CONFERENCIA',
                vencimento: '',
                valor: 0,
                observacao: `IMPORTADO RAPIDO DA PASTA FINANCEIRA: ${file.webkitRelativePath || file.name}`,
                conferenciaStatus: 'pendente',
                ia: null,
                pago: false,
                pagoEm: null,
                situacaoDocumento: categoriaDocumento === 'nota_fiscal' || categoriaDocumento === 'xml' ? 'AGUARDANDO_BOLETO' : 'A_PAGAR',
                documentosVinculados: [documentoVinculado],
                documento: documentoVinculado,
                comprovante: null,
                atualizadoEm: new Date().toISOString(),
                criadoEm: new Date().toISOString()
            };
            lista.push(registro);
            importados.push(registro);
            await salvarFinanceiroNuvem(registro);
        } catch (error) {
            console.error('Falha ao importar documento financeiro:', file.name, error);
        }
    }
    salvarLancamentosFinanceiros(lista);
    financeiroAbaAtiva = 'caixa-financeira';
    document.querySelectorAll('.btn-tab-financeiro').forEach(btn => btn.classList.toggle('active', btn.dataset.finTab === 'caixa-financeira'));
    document.getElementById('financeiroTituloLista').textContent = FINANCEIRO_ABAS['caixa-financeira'].titulo;
    renderFinanceiro();
    if (importados.length) {
        setTimeout(() => analisarFinanceiroImportados(importados.map(item => item.id)), 250);
    }
    const msg = [
        `${importados.length} documento(s) novo(s) importado(s) rapidamente.`,
        duplicados.length ? `${duplicados.length} duplicado(s) ignorado(s), pois já estavam salvos na lista financeira.` : '',
        importados.length ? 'A leitura automatica vai continuar em segundo plano e atualizar a lista conforme encontrar valor, vencimento e fornecedor.' : ''
    ].filter(Boolean).join('\n');
    alert(msg || 'Nenhum documento novo foi importado.');
};

window.importarFilaMonitorFinanceiro = async function(files) {
    const arquivos = Array.from(files || []).filter(file => file.name.toLowerCase().endsWith('.json'));
    if (!arquivos.length) {
        alert('Selecione os arquivos JSON da pasta FILA do monitor financeiro.');
        return;
    }
    const lista = obterLancamentosFinanceiros();
    let importados = 0;
    const duplicados = [];
    const assinaturasDoLote = new Set();
    for (const file of arquivos) {
        try {
            const texto = await lerArquivoComoTexto(file);
            const fila = JSON.parse(texto);
            const caminhoLocal = String(fila.anexo?.localPath || fila.arquivoLocal || '');
            if (caminhoLocal.includes('C:\\ORQUESTRA.CS\\')) {
                console.warn('Fila antiga ignorada:', file.name, caminhoLocal);
                continue;
            }
            const sugestao = fila.sugestao || {};
            const anexoLocal = fila.anexo?.localPath ? {
                nome: fila.anexo.nome || fila.nomeArquivo || file.name,
                tipo: fila.anexo.tipo || 'application/octet-stream',
                localPath: fila.anexo.localPath,
                localFolder: fila.anexo.localFolder || fila.pastaLocal || '',
                localUrl: fila.anexo.localUrl || '',
                tamanho: Number(fila.anexo.tamanho || fila.tamanho || 0),
                hashArquivo: fila.anexo.hashArquivo || fila.hashArquivo || fila.sha256 || '',
                storage: 'LOCAL'
            } : null;
            const anexoComparacao = anexoLocal || fila.anexo || { nome: fila.nomeArquivo || file.name, tamanho: fila.tamanho || 0, hashArquivo: fila.hashArquivo || fila.sha256 || '' };
            const assinaturasArquivo = obterAssinaturasDocumentoFinanceiro(anexoComparacao);
            if (assinaturasArquivo.some(chave => assinaturasDoLote.has(chave))) {
                duplicados.push({ nome: fila.nomeArquivo || file.name, duplicado: null });
                continue;
            }
            const duplicado = buscarDocumentoDuplicadoFinanceiro(anexoComparacao);
            if (duplicado) {
                duplicados.push({ nome: fila.nomeArquivo || file.name, duplicado });
                continue;
            }
            assinaturasArquivo.forEach(chave => assinaturasDoLote.add(chave));
            const sugestaoDescricao = normalizarTexto(sugestao.descricao || '');
            const descricaoFinal = !descricaoFinanceiraRuim(sugestaoDescricao) ? sugestaoDescricao : normalizarTexto(fila.nomeArquivo || file.name.replace(/\.json$/i, ''));
            const valorSugestao = Number(sugestao.valor || 0);
            const valorFinal = valorSugestao > 0 ? valorSugestao : 0;
            const vencimentoFinal = sugestao.vencimento || '';
            const tipoFinal = sugestao.tipo || 'DOCUMENTO';
            const id = `fin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const anexoPrincipal = anexoLocal || fila.anexo || null;
            const precisaConferencia = !valorFinal || !vencimentoFinal || descricaoFinanceiraRuim(descricaoFinal);
            const categoriaDocumento = detectarCategoriaDocumentoFinanceiro(anexoPrincipal || { nome: fila.nomeArquivo || file.name }, { tipo: tipoFinal, descricao: descricaoFinal });
            const documentoVinculado = anexoPrincipal ? criarDocumentoVinculadoFinanceiro(anexoPrincipal, categoriaDocumento, 'fila_monitor') : null;
            const registro = {
                id,
                aba: 'caixa-financeira',
                tipo: normalizarTexto(tipoFinal),
                descricao: descricaoFinal || 'PENDENTE DE CONFERENCIA',
                vencimento: vencimentoFinal,
                valor: Number(valorFinal || 0),
                observacao: sugestao.observacao || `IMPORTADO RAPIDO DA FILA DO MONITOR: ${fila.nomeArquivo || file.name}`,
                pago: false,
                pagoEm: null,
                conferenciaStatus: precisaConferencia ? 'pendente' : 'conferido',
                ia: null,
                situacaoDocumento: categoriaDocumento === 'nota_fiscal' || categoriaDocumento === 'xml' ? 'AGUARDANDO_BOLETO' : 'A_PAGAR',
                documentosVinculados: documentoVinculado ? [documentoVinculado] : [],
                documento: documentoVinculado,
                comprovante: null,
                atualizadoEm: new Date().toISOString(),
                criadoEm: new Date().toISOString()
            };
            lista.push(registro);
            await salvarFinanceiroNuvem(registro);
            importados++;
        } catch (error) {
            console.error('Falha ao importar fila financeira:', file.name, error);
        }
    }
    salvarLancamentosFinanceiros(lista);
    financeiroAbaAtiva = 'caixa-financeira';
    document.querySelectorAll('.btn-tab-financeiro').forEach(btn => btn.classList.toggle('active', btn.dataset.finTab === 'caixa-financeira'));
    document.getElementById('financeiroTituloLista').textContent = FINANCEIRO_ABAS['caixa-financeira'].titulo;
    renderFinanceiro();
    alert([
        `${importados} item(ns) novo(s) da fila importado(s) para a Caixa financeira.`,
        duplicados.length ? `${duplicados.length} duplicado(s) ignorado(s), pois já estavam salvos na lista financeira.` : ''
    ].filter(Boolean).join('\n'));
};

function calcularKpisFinanceiro() {
    const lista = obterLancamentosFinanceiros();
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();

    const vencidos = lista.filter(estaVencido).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const aberto = lista.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const pagoMes = lista.filter(item => {
        if (!item.pago || !item.pagoEm) return false;
        const dt = new Date(item.pagoEm);
        return dt.getMonth() === mes && dt.getFullYear() === ano;
    }).reduce((acc, item) => acc + Number(item.valor || 0), 0);

    document.getElementById('financeiroKpiVencidos').textContent = formatarMoeda(vencidos);
    document.getElementById('financeiroKpiAberto').textContent = formatarMoeda(aberto);
    document.getElementById('financeiroKpiPagoMes').textContent = formatarMoeda(pagoMes);
    document.getElementById('financeiroKpiQtd').textContent = lista.length;
    const despesasMes = totalDespesasPorPeriodo(inicioMesAtual(), fimMesAtual());
    document.getElementById('financeiroKpiDespesas').textContent = formatarMoeda(despesasMes);
    document.dispatchEvent(new CustomEvent('financeiroUpdated', { detail: { despesasMes } }));
}

function inicioMesAtual() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function fimMesAtual() {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function totalDespesasPorPeriodo(inicio, fim) {
    return obterLancamentosFinanceiros()
        .filter(item => (!inicio || item.vencimento >= inicio) && (!fim || item.vencimento <= fim))
        .reduce((acc, item) => acc + Number(item.valor || 0), 0);
}

window.obterResumoFinanceiroLocal = function(inicio = inicioMesAtual(), fim = fimMesAtual()) {
    const lista = obterLancamentosFinanceiros().filter(item => (!inicio || item.vencimento >= inicio) && (!fim || item.vencimento <= fim));
    return {
        inicio,
        fim,
        despesas: lista.reduce((acc, item) => acc + Number(item.valor || 0), 0),
        pagos: lista.filter(item => item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
        abertos: lista.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
        vencidos: lista.filter(estaVencido).reduce((acc, item) => acc + Number(item.valor || 0), 0),
        quantidade: lista.length
    };
};

window.switchFinanceiroAba = function(aba) {
    financeiroAbaAtiva = aba;
    document.querySelectorAll('.financeiro-folder-card').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.finFolder === aba);
    });
    document.getElementById('financeiroTituloLista').textContent = FINANCEIRO_PASTAS[aba]?.titulo || FINANCEIRO_ABAS[aba]?.titulo || 'Financeiro';
    const tituloForm = document.getElementById('financeiroTituloForm');
    if (tituloForm) {
        tituloForm.innerHTML = aba === 'todos'
            ? '<i class="fa-solid fa-inbox"></i> Adicionar documento financeiro'
            : '<i class="fa-solid fa-plus-circle"></i> Novo documento financeiro';
    }
    window.limparFinanceiroForm();
    renderFinanceiro();
};

function renderPastasFinanceiras() {
    const board = document.getElementById('financeiroPastas');
    if (!board) return;
    const lista = obterLancamentosFinanceiros();
    board.innerHTML = Object.entries(FINANCEIRO_PASTAS).map(([key, pasta]) => {
        const itens = key === 'todos' ? lista : lista.filter(item => obterPastaFinanceiraItem(item) === key);
        const total = itens.reduce((acc, item) => acc + Number(item.valor || 0), 0);
        const abertos = itens.filter(item => !item.pago).length;
        const subpastas = [...new Set(itens.map(obterSubpastaFinanceiraItem).filter(Boolean))].slice(0, 4);
        return `
            <button type="button" class="financeiro-folder-card ${financeiroAbaAtiva === key ? 'active' : ''}" data-fin-folder="${key}" onclick="window.switchFinanceiroAba('${key}')" style="--folder-color:${pasta.cor}">
                <i class="fa-solid ${pasta.icone}"></i>
                <span>${pasta.titulo}</span>
                <strong>${formatarMoeda(total)}</strong>
                <small>${itens.length} documento(s) - ${abertos} em aberto</small>
                ${subpastas.length ? `<em>${subpastas.join(' / ')}</em>` : ''}
            </button>
        `;
    }).join('');
    aplicarEstadoVisualFinanceiro();
}

function obterEstadoUiFinanceiro() {
    try {
        return JSON.parse(localStorage.getItem(FINANCEIRO_UI_STATE_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function salvarEstadoUiFinanceiro(estado) {
    localStorage.setItem(FINANCEIRO_UI_STATE_KEY, JSON.stringify(estado || {}));
}

function atualizarBotaoCollapseFinanceiro(targetId, oculto) {
    document.querySelectorAll(`[onclick*="${targetId}"]`).forEach(botao => {
        botao.classList.toggle('is-collapsed', oculto);
        botao.setAttribute('aria-expanded', String(!oculto));
        const icon = botao.querySelector('i');
        if (icon && botao.classList.contains('financeiro-collapse-icon')) {
            icon.className = oculto ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
        }
    });
}

window.toggleFinanceiroBloco = function(targetId) {
    const alvo = document.getElementById(targetId);
    if (!alvo) return;
    const oculto = !alvo.classList.contains('is-collapsed');
    alvo.classList.toggle('is-collapsed', oculto);
    const estado = obterEstadoUiFinanceiro();
    estado[targetId] = oculto;
    salvarEstadoUiFinanceiro(estado);
    atualizarBotaoCollapseFinanceiro(targetId, oculto);
};

function aplicarEstadoVisualFinanceiro() {
    const estado = obterEstadoUiFinanceiro();
    Object.entries(estado).forEach(([targetId, oculto]) => {
        const alvo = document.getElementById(targetId);
        if (!alvo) return;
        alvo.classList.toggle('is-collapsed', !!oculto);
        atualizarBotaoCollapseFinanceiro(targetId, !!oculto);
    });
}
window.limparFinanceiroForm = function() {
    document.getElementById('financeiroForm')?.reset();
    document.getElementById('financeiroId').value = '';
    const situacao = document.getElementById('financeiroSituacaoDocumento');
    if (situacao) situacao.value = 'A_PAGAR';
    const categoria = document.getElementById('financeiroDocumentoCategoria');
    if (categoria) categoria.value = 'AUTO';
    financeiroAnexosTemp = { documento: null, comprovante: null };
    preencherNomeArquivo('documento', null);
    preencherNomeArquivo('comprovante', null);
    atualizarStatusToggle();
    atualizarDatalistsFinanceiro();
};

window.renderFinanceiro = function() {
    const tbody = document.getElementById('financeiroLista');
    if (!tbody) return;

    atualizarKpisFinanceiro();
    renderPastasFinanceiras();
    atualizarDatalistsFinanceiro();

    const filtroStatus = document.getElementById('financeiroFiltroStatus')?.value || 'TODOS';
    const ordenacao = document.getElementById('financeiroOrdenacao')?.value || 'VENCIMENTO_ASC';
    const busca = normalizarTexto(document.getElementById('financeiroBusca')?.value);
    let lista = obterLancamentosFinanceiros().filter(item => financeiroAbaAtiva === 'todos' || obterPastaFinanceiraItem(item) === financeiroAbaAtiva || item.aba === financeiroAbaAtiva);

    if (filtroStatus === 'PAGO') lista = lista.filter(item => item.pago);
    if (filtroStatus === 'ABERTO') lista = lista.filter(item => !item.pago);
    if (filtroStatus === 'PENDENTE') lista = lista.filter(item => item.conferenciaStatus === 'pendente');
    if (filtroStatus === 'VENCIDO') lista = lista.filter(estaVencido);
    if (busca) {
        lista = lista.filter(item => [item.tipo, item.descricao, item.observacao].some(valor => normalizarTexto(valor).includes(busca)));
    }

    lista.sort((a, b) => {
        if (ordenacao === 'VENCIMENTO_DESC') return (b.vencimento || '').localeCompare(a.vencimento || '');
        if (ordenacao === 'CRIADO_DESC') return (b.criadoEm || b.atualizadoEm || '').localeCompare(a.criadoEm || a.atualizadoEm || '');
        if (ordenacao === 'CRIADO_ASC') return (a.criadoEm || a.atualizadoEm || '').localeCompare(b.criadoEm || b.atualizadoEm || '');
        return (a.vencimento || '').localeCompare(b.vencimento || '');
    });
    document.getElementById('financeiroResumoLista').textContent = `${lista.length} registro(s) encontrado(s)`;
    const selecionarTodos = document.getElementById('financeiroSelecionarTodos');
    if (selecionarTodos) {
        selecionarTodos.checked = false;
        selecionarTodos.indeterminate = false;
    }
    const btnExcluirSelecionados = document.getElementById('btnExcluirFinanceiroSelecionados');
    if (btnExcluirSelecionados) btnExcluirSelecionados.style.display = 'none';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:28px; color:var(--text-muted);">Nenhum documento financeiro encontrado nesta pasta.</td></tr>';
        mostrarLembretesFinanceiros();
        return;
    }

    tbody.innerHTML = lista.map(item => {
        const status = obterStatusItem(item);
        const anexos = normalizarDocumentosVinculadosFinanceiro(item).map(doc => {
            const meta = FINANCEIRO_DOC_CATEGORIAS[doc.categoria] || FINANCEIRO_DOC_CATEGORIAS.outro;
            return `<button type="button" class="financeiro-doc-chip" style="--doc-color:${meta.cor};" onclick="window.abrirAnexoFinanceiro('${escapeJsStringFinanceiro(item.id)}', 'vinculado', '${escapeJsStringFinanceiro(doc.id)}')" title="Abrir ${escapeHtmlFinanceiro(meta.label)}: ${escapeHtmlFinanceiro(doc.nome || 'documento')}"><i class="fa-solid ${meta.icone}"></i><span>${escapeHtmlFinanceiro(meta.label)}</span></button>`;
        }).join('');
        const criadoEm = dataHoraBR(item.criadoEm);
        const atualizadoEm = dataHoraBR(item.atualizadoEm);
        const tooltipLancamento = `Lançado no sistema em: ${criadoEm}${atualizadoEm !== criadoEm ? ` | Última alteração: ${atualizadoEm}` : ''}`;

        return `
            <tr class="financeiro-row" title="${tooltipLancamento}" onclick="window.toggleFinanceiroLinha('${escapeJsStringFinanceiro(item.id)}', event)">
                <td><input type="checkbox" class="financeiro-check" value="${item.id}" onchange="window.atualizarSelecaoFinanceiro()"></td>
                <td><span class="financeiro-tipo-pill">${escapeHtmlFinanceiro(item.tipo || 'Documento')}</span></td>
                <td class="financeiro-descricao-cell"><strong>${escapeHtmlFinanceiro(item.descricao || 'Sem descrição')}</strong>${item.ia ? `<small class="financeiro-ia-line"><i class="fa-solid fa-wand-magic-sparkles"></i> IA ${escapeHtmlFinanceiro(item.ia.confianca || 'media')}${item.ia.fornecedor ? ` - ${escapeHtmlFinanceiro(item.ia.fornecedor)}` : ''}</small>` : ''}<small>${escapeHtmlFinanceiro(item.observacao || '')}</small></td>
                <td>${dataBR(item.vencimento)}</td>
                <td><strong>${formatarMoeda(item.valor)}</strong></td>
                <td><span class="financeiro-status-badge ${status.classe}">${status.label}</span></td>
                <td>${anexos || '<span style="color:var(--text-muted);">-</span>'}</td>
                <td class="financeiro-acoes">
                    <button type="button" class="btn-icon financeiro-acao-ia" onclick="window.analisarFinanceiroDocumento('${item.id}')" title="Ler documento automaticamente"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                    <button type="button" class="btn-icon financeiro-acao-editar" onclick="window.editarFinanceiro('${item.id}')" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button type="button" class="btn-icon financeiro-acao-pago" onclick="window.alternarPagoFinanceiro('${item.id}')" title="Marcar como pago ou não pago"><i class="fa-solid fa-circle-check"></i></button>
                    <button type="button" class="btn-icon financeiro-acao-excluir" onclick="window.excluirFinanceiro('${item.id}')" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    mostrarLembretesFinanceiros();
};

window.toggleFinanceiroLinha = function(id, event) {
    const alvo = event?.target;
    if (alvo?.closest?.('button, a, input, label, select, textarea')) return;
    const check = Array.from(document.querySelectorAll('.financeiro-check')).find(input => input.value === id);
    if (!check) return;
    check.checked = !check.checked;
    window.atualizarSelecaoFinanceiro();
};

window.atualizarSelecaoFinanceiro = function() {
    const checks = Array.from(document.querySelectorAll('.financeiro-check'));
    const selecionados = checks.filter(input => input.checked);
    const total = checks.length;
    const resumo = document.getElementById('financeiroResumoLista');
    if (resumo) {
        const base = `${total} registro(s) encontrado(s)`;
        resumo.textContent = selecionados.length ? `${base} | ${selecionados.length} selecionado(s)` : base;
    }
    const todos = document.getElementById('financeiroSelecionarTodos');
    if (todos) {
        todos.checked = total > 0 && selecionados.length === total;
        todos.indeterminate = selecionados.length > 0 && selecionados.length < total;
    }
    const btn = document.getElementById('btnExcluirFinanceiroSelecionados');
    if (btn) btn.style.display = selecionados.length ? 'inline-flex' : 'none';
    checks.forEach(input => input.closest('tr')?.classList.toggle('financeiro-row-selected', input.checked));
};

window.marcarTodosFinanceiro = function(checked) {
    document.querySelectorAll('.financeiro-check').forEach(input => input.checked = checked);
    window.atualizarSelecaoFinanceiro();
};

window.analisarFinanceiroDocumento = async function(id, silencioso = false) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(reg => reg.id === id);
    if (!item) return false;
    const anexo = await hidratarAnexoFinanceiro(item.documento || normalizarDocumentosVinculadosFinanceiro(item).find(doc => doc.categoria !== 'comprovante'));
    if (!anexo?.dados) {
        if (!silencioso) alert('Este documento não possui arquivo local carregado para leitura. Abra ou anexe o PDF novamente para analisar.');
        return false;
    }
    try {
        const { dados, usouIA } = await comTimeoutFinanceiro(extrairDadosFinanceirosDoAnexo(anexo), silencioso ? 45000 : 70000);
        if (!dados || !leituraFinanceiraUtil(dados)) {
            if (!silencioso) alert('Não foi possível identificar os dados deste documento.');
            return false;
        }
        item.tipo = normalizarTexto(dados.tipo || item.tipo || 'DOCUMENTO');
        item.descricao = normalizarTexto(dados.descricao || item.descricao || 'PENDENTE DE CONFERENCIA');
        item.vencimento = dados.vencimento || item.vencimento || '';
        item.valor = Number(dados.valor || item.valor || 0);
        item.conferenciaStatus = leituraFinanceiraIncompleta(dados) ? 'pendente' : 'conferido';
        item.ia = usouIA ? {
            confianca: dados.confiancaIA || 'media',
            fornecedor: dados.fornecedor || '',
            cnpj: dados.cnpj || '',
            numeroDocumento: dados.numeroDocumento || '',
            produtos: dados.produtos || [],
            observacao: dados.observacaoIA || ''
        } : item.ia || null;
        item.atualizadoEm = new Date().toISOString();
        salvarLancamentosFinanceiros(lista);
        await salvarFinanceiroNuvem(item);
        if (!silencioso) renderFinanceiro();
        if (!silencioso) alert(`Documento analisado${usouIA ? ' com apoio da IA' : ''}. Confira o valor e vencimento na lista.`);
        return true;
    } catch (error) {
        console.error('Falha ao analisar documento financeiro:', error);
        if (!silencioso) alert(error.message || 'Não foi possível analisar este documento.');
        return false;
    }
};

async function analisarFinanceiroImportados(ids = []) {
    if (!ids.length) return;
    const resumo = document.getElementById('financeiroResumoLista');
    let lidos = 0;
    let falhas = 0;
    for (const id of ids) {
        if (resumo) resumo.textContent = `${ids.length} importado(s) | lendo ${lidos + falhas + 1}/${ids.length}...`;
        const ok = await window.analisarFinanceiroDocumento(id, true);
        if (ok) lidos++;
        else falhas++;
        await new Promise(resolve => setTimeout(resolve, 120));
    }
    renderFinanceiro();
    if (resumo) resumo.textContent = `${ids.length} importado(s) | ${lidos} lido(s), ${falhas} pendente(s)`;
}

window.excluirFinanceiroSelecionados = async function() {
    const ids = Array.from(document.querySelectorAll('.financeiro-check:checked')).map(input => input.value);
    if (!ids.length) {
        alert('Selecione pelo menos um registro financeiro para excluir.');
        return;
    }
    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir ${ids.length} registro(s) financeiro(s)?`);
    if (!autorizado) return;
    for (const id of ids) {
        const okNuvem = await excluirFinanceiroNuvem(id);
        if (!okNuvem) return;
    }
    const selecionados = new Set(ids);
    salvarLancamentosFinanceiros(obterLancamentosFinanceiros().filter(item => !selecionados.has(item.id)));
    renderFinanceiro();
};

function atualizarKpisFinanceiro() {
    calcularKpisFinanceiro();
}

window.editarFinanceiro = function(id) {
    const item = obterLancamentosFinanceiros().find(reg => reg.id === id);
    if (!item) return;

    financeiroAbaAtiva = item.aba;
    document.querySelectorAll('.btn-tab-financeiro').forEach(btn => btn.classList.toggle('active', btn.dataset.finTab === item.aba));
    document.getElementById('financeiroTituloLista').textContent = FINANCEIRO_ABAS[item.aba].titulo;
    document.getElementById('financeiroId').value = item.id;
    document.getElementById('financeiroTipo').value = item.tipo;
    document.getElementById('financeiroDescricao').value = item.descricao;
    document.getElementById('financeiroVencimento').value = item.vencimento;
    document.getElementById('financeiroValor').value = formatarMoeda(item.valor);
    document.getElementById('financeiroObservacao').value = item.observacao || '';
    document.getElementById('financeiroPago').checked = !!item.pago;
    const situacao = document.getElementById('financeiroSituacaoDocumento');
    if (situacao) situacao.value = item.situacaoDocumento || (item.pago ? 'PAGO_A_VISTA' : 'A_PAGAR');
    const documentos = normalizarDocumentosVinculadosFinanceiro(item);
    const principal = documentos.find(doc => doc.categoria !== 'comprovante') || item.documento || null;
    const categoria = document.getElementById('financeiroDocumentoCategoria');
    if (categoria) categoria.value = principal?.categoria || 'AUTO';
    financeiroAnexosTemp = { documento: item.documento || null, comprovante: item.comprovante || null };
    preencherNomeArquivo('documento', item.documento ? { name: item.documento.nome } : null);
    preencherNomeArquivo('comprovante', item.comprovante ? { name: item.comprovante.nome } : null);
    atualizarStatusToggle();
    window.scrollTo({ top: document.getElementById('view-financeiro').offsetTop, behavior: 'smooth' });
};

window.alternarPagoFinanceiro = async function(id) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(reg => reg.id === id);
    if (!item) return;
    item.pago = !item.pago;
    item.pagoEm = item.pago ? new Date().toISOString() : null;
    item.atualizadoEm = new Date().toISOString();
    salvarLancamentosFinanceiros(lista);
    await salvarFinanceiroNuvem(item);
    renderFinanceiro();
};

window.excluirFinanceiro = async function(id) {
    const autorizado = await window.confirmarExclusaoComSenha('Deseja excluir este registro financeiro?');
    if (!autorizado) return;
    const okNuvem = await excluirFinanceiroNuvem(id);
    if (!okNuvem) return;
    salvarLancamentosFinanceiros(obterLancamentosFinanceiros().filter(item => item.id !== id));
    renderFinanceiro();
};

window.abrirAnexoFinanceiro = async function(id, tipo, docId = '') {
    const item = obterLancamentosFinanceiros().find(reg => reg.id === id);
    const anexo = tipo === 'vinculado'
        ? normalizarDocumentosVinculadosFinanceiro(item).find(doc => doc.id === docId)
        : item?.[tipo];
    abrirAnexoFinanceiroDireto(await hidratarAnexoFinanceiro(anexo));
};

window.abrirRelatorioFinanceiro = function() {
    const card = document.getElementById('financeiroRelatorioCard');
    if (!card) return;
    card.style.display = 'block';
    document.getElementById('financeiroRelatorioInicio').value = inicioMesAtual();
    document.getElementById('financeiroRelatorioFim').value = fimMesAtual();
    prepararRelatorioFinanceiro();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.fecharRelatorioFinanceiro = function() {
    const card = document.getElementById('financeiroRelatorioCard');
    if (card) card.style.display = 'none';
};

window.prepararRelatorioFinanceiro = function() {
    const inicio = document.getElementById('financeiroRelatorioInicio')?.value || '';
    const fim = document.getElementById('financeiroRelatorioFim')?.value || '';
    const statusFiltro = document.getElementById('financeiroRelatorioStatus')?.value || 'TODOS';
    let lista = obterLancamentosFinanceiros().filter(item => financeiroAbaAtiva === 'todos' || obterPastaFinanceiraItem(item) === financeiroAbaAtiva || item.aba === financeiroAbaAtiva);

    if (inicio) lista = lista.filter(item => item.vencimento >= inicio);
    if (fim) lista = lista.filter(item => item.vencimento <= fim);
    if (statusFiltro === 'PAGO') lista = lista.filter(item => item.pago);
    if (statusFiltro === 'ABERTO') lista = lista.filter(item => !item.pago);
    if (statusFiltro === 'VENCIDO') lista = lista.filter(estaVencido);

    lista.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
    financeiroRelatorioAtual = lista;
    const tbody = document.getElementById('financeiroRelatorioLista');
    if (!tbody) return;

    tbody.innerHTML = lista.length ? lista.map(item => {
        const status = obterStatusItem(item);
        return `
            <tr>
                <td><input type="checkbox" class="financeiro-relatorio-check" value="${item.id}" checked onchange="window.atualizarResumoRelatorioFinanceiro()"></td>
                <td>${item.tipo}</td>
                <td>${item.descricao}</td>
                <td>${dataBR(item.vencimento)}</td>
                <td>${formatarMoeda(item.valor)}</td>
                <td><span class="financeiro-status-badge ${status.classe}">${status.label}</span></td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="6" style="text-align:center; padding:22px; color:var(--text-muted);">Nenhum registro no período selecionado.</td></tr>';

    const todos = document.getElementById('financeiroRelatorioTodos');
    if (todos) todos.checked = lista.length > 0;
    atualizarResumoRelatorioFinanceiro();
};

window.marcarTodosRelatorioFinanceiro = function(checked) {
    document.querySelectorAll('.financeiro-relatorio-check').forEach(input => input.checked = checked);
    atualizarResumoRelatorioFinanceiro();
};

window.atualizarResumoRelatorioFinanceiro = function() {
    const selecionados = new Set(Array.from(document.querySelectorAll('.financeiro-relatorio-check:checked')).map(input => input.value));
    const lista = financeiroRelatorioAtual.filter(item => selecionados.has(item.id));
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const pagos = lista.filter(item => item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const abertos = lista.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const resumo = document.getElementById('financeiroRelatorioResumo');
    if (resumo) {
        resumo.innerHTML = `
            <div><small>Selecionados</small><strong>${lista.length}</strong></div>
            <div><small>Valor total</small><strong style="color:#ef4444;">${formatarMoeda(total)}</strong></div>
            <div><small>Pago</small><strong>${formatarMoeda(pagos)}</strong></div>
            <div><small>Em aberto</small><strong>${formatarMoeda(abertos)}</strong></div>
        `;
    }
};

window.imprimirRelatorioFinanceiro = function() {
    const selecionados = new Set(Array.from(document.querySelectorAll('.financeiro-relatorio-check:checked')).map(input => input.value));
    const lista = financeiroRelatorioAtual.filter(item => selecionados.has(item.id));
    if (lista.length === 0) {
        alert('Selecione pelo menos um registro para gerar o relatório.');
        return;
    }
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para imprimir o relatório.');
        return;
    }
    win.document.write(`
        <html><head><title>Relatório Financeiro</title><style>
            body{font-family:Arial,sans-serif;padding:24px;color:#111827} h1{margin-bottom:4px}
            table{width:100%;border-collapse:collapse;margin-top:18px} th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}
            th{background:#f3f4f6} .total{font-size:20px;font-weight:bold;color:#dc2626;margin-top:16px}
        </style></head><body>
            <h1>Relatório Financeiro - ${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}</h1>
            <p>Período: ${dataBR(document.getElementById('financeiroRelatorioInicio').value)} até ${dataBR(document.getElementById('financeiroRelatorioFim').value)}</p>
            <div class="total">Valor total: ${formatarMoeda(total)}</div>
            <table><thead><tr><th>Tipo</th><th>Descrição</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead><tbody>
                ${lista.map(item => `<tr><td>${item.tipo}</td><td>${item.descricao}</td><td>${dataBR(item.vencimento)}</td><td>${obterStatusItem(item).label}</td><td>${formatarMoeda(item.valor)}</td></tr>`).join('')}
            </tbody></table>
            <script>window.onload=function(){window.print();}</script>
        </body></html>
    `);
    win.document.close();
};

async function salvarFinanceiroSubmit(event) {
    event.preventDefault();

    const tipo = normalizarTexto(document.getElementById('financeiroTipo').value);
    const descricao = normalizarTexto(document.getElementById('financeiroDescricao').value);
    const vencimento = document.getElementById('financeiroVencimento').value;
    const valor = parseMoeda(document.getElementById('financeiroValor').value);
    const situacaoDocumento = document.getElementById('financeiroSituacaoDocumento')?.value || 'A_PAGAR';
    const permiteSemVencimento = ['PAGO_A_VISTA', 'AGUARDANDO_BOLETO'].includes(situacaoDocumento);

    if (!tipo || !descricao || valor <= 0 || (!vencimento && !permiteSemVencimento)) {
        alert(permiteSemVencimento
            ? 'Preencha tipo, descrição e valor.'
            : 'Preencha tipo, descrição, vencimento e valor.');
        return;
    }

    const id = document.getElementById('financeiroId').value || `fin_${Date.now()}`;
    const lista = obterLancamentosFinanceiros();
    const existente = lista.find(item => item.id === id);
    const duplicadoDocumento = financeiroAnexosTemp.documento ? buscarDocumentoDuplicadoFinanceiro(financeiroAnexosTemp.documento, id) : null;
    if (duplicadoDocumento) {
        alert(mensagemDocumentoDuplicadoFinanceiro(financeiroAnexosTemp.documento, duplicadoDocumento));
        return;
    }
    const duplicadoComprovante = financeiroAnexosTemp.comprovante ? buscarDocumentoDuplicadoFinanceiro(financeiroAnexosTemp.comprovante, id) : null;
    if (duplicadoComprovante) {
        alert(mensagemDocumentoDuplicadoFinanceiro(financeiroAnexosTemp.comprovante, duplicadoComprovante));
        return;
    }
    const categoriaSelecionada = document.getElementById('financeiroDocumentoCategoria')?.value || 'AUTO';
    const categoriaDocumento = categoriaSelecionada === 'AUTO'
        ? detectarCategoriaDocumentoFinanceiro(financeiroAnexosTemp.documento, { tipo, descricao })
        : categoriaSelecionada;
    const documentoTemp = financeiroAnexosTemp.documento ? await salvarArquivoFinanceiroLocal(financeiroAnexosTemp.documento) : null;
    const comprovanteTemp = financeiroAnexosTemp.comprovante ? await salvarArquivoFinanceiroLocal(financeiroAnexosTemp.comprovante) : null;
    const novoDocumento = financeiroAnexosTemp.documento
        ? criarDocumentoVinculadoFinanceiro(documentoTemp, categoriaDocumento, 'formulario')
        : null;
    const novoComprovante = financeiroAnexosTemp.comprovante
        ? criarDocumentoVinculadoFinanceiro(comprovanteTemp, 'comprovante', 'formulario')
        : null;
    const documentosVinculados = combinarDocumentosFinanceiro(normalizarDocumentosVinculadosFinanceiro(existente || {}), [novoDocumento, novoComprovante]);
    const documentoPrincipal = novoDocumento || documentosVinculados.find(doc => doc.categoria !== 'comprovante') || null;
    const comprovantePrincipal = novoComprovante || documentosVinculados.find(doc => doc.categoria === 'comprovante') || null;
    const pago = situacaoDocumento === 'PAGO_A_VISTA' ? true : document.getElementById('financeiroPago').checked;
    const conferenciaPendente = ['AGUARDANDO_BOLETO', 'AGUARDANDO_NOTA'].includes(situacaoDocumento);
    const registro = {
        id,
        aba: financeiroAbaAtiva === 'todos' ? 'caixa-financeira' : financeiroAbaAtiva,
        pastaFinanceira: document.getElementById('financeiroPasta')?.value || (financeiroAbaAtiva === 'todos' ? 'conferir' : financeiroAbaAtiva),
        subpastaFinanceira: normalizarTexto(document.getElementById('financeiroSubpasta')?.value || ''),
        tipo,
        descricao,
        vencimento,
        valor,
        observacao: document.getElementById('financeiroObservacao').value.trim(),
        situacaoDocumento,
        conferenciaStatus: conferenciaPendente ? 'pendente' : 'conferido',
        pago,
        pagoEm: pago ? (existente?.pagoEm || new Date().toISOString()) : null,
        documentosVinculados,
        documento: documentoPrincipal,
        comprovante: comprovantePrincipal,
        atualizadoEm: new Date().toISOString(),
        criadoEm: existente?.criadoEm || new Date().toISOString()
    };

    const index = lista.findIndex(item => item.id === id);
    if (index >= 0) lista[index] = registro;
    else lista.push(registro);

    salvarLancamentosFinanceiros(lista);
    await salvarFinanceiroNuvem(registro);
    window.limparFinanceiroForm();
    renderFinanceiro();
};

function injetarEstilosFinanceiro() {
    const style = document.createElement('style');
    style.textContent = `
        #view-financeiro { --fin-page:#ece8dc; --fin-card:#fffdf7; --fin-card-soft:#f4efe4; --fin-field:#fbf8f0; --fin-field-focus:#ffffff; --fin-border:#d7ccb9; --fin-line:#e2d7c7; --fin-muted:#64748b; --fin-text:#111827; --fin-heading:#0f172a; --fin-primary:#111827; --fin-primary-hover:#0f172a; --fin-accent:#0f8fa6; --fin-gold:#b9852f; --fin-warn:#b45309; --fin-danger:#b91c1c; --fin-success:#047857; --fin-info:#475569; color:var(--fin-text); background:linear-gradient(180deg,#eee9dd 0%,#e4ddcf 100%); border-radius:12px; padding:18px; min-height:calc(100vh - 42px); animation:financeiroViewIn .24s ease-out both; }
        #view-financeiro .main-header { max-width:1120px; margin:0 auto 14px; text-align:left; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; border-bottom:1px solid var(--fin-border); padding-bottom:14px; animation:financeiroRise .28s ease-out both; }
        #view-financeiro .main-header h1 { font-size:1.45rem; letter-spacing:0; color:var(--fin-heading); background:none; -webkit-text-fill-color:currentColor; display:flex; align-items:center; gap:9px; margin:0; }
        #view-financeiro .main-header h1 i { color:var(--fin-gold); font-size:1.05rem; }
        #view-financeiro .main-header p { color:var(--fin-muted); font-size:.84rem; font-weight:600; letter-spacing:0; text-transform:none; margin:.2rem 0 0; }
        .financeiro-view-tools { max-width:1120px; margin:0 auto 12px; display:flex; gap:7px; flex-wrap:wrap; justify-content:flex-end; align-items:center; padding:8px; border:1px solid var(--fin-border); border-radius:10px; background:#fffdf7; box-shadow:0 8px 22px rgba(15,23,42,.06); }
        .financeiro-view-tools::before { content:'Organização da tela'; margin-right:auto; color:#6f6b62; font-size:.72rem; font-weight:850; text-transform:uppercase; letter-spacing:.02em; }
        .financeiro-toggle-btn, .financeiro-collapse-icon { min-height:32px; border:1px solid #c9bba7; background:#fbf8f0; color:#334155; border-radius:8px; padding:0 10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-weight:850; font-size:.76rem; cursor:pointer; white-space:nowrap; box-shadow:0 1px 2px rgba(15,23,42,.06); transition:transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease, color .16s ease; }
        .financeiro-toggle-btn:hover, .financeiro-collapse-icon:hover { border-color:#0f8fa6; color:#0f172a; background:#ffffff; transform:translateY(-1px); box-shadow:0 6px 14px rgba(15,23,42,.08); }
        .financeiro-toggle-btn:active, .financeiro-collapse-icon:active, #view-financeiro button:active { transform:translateY(0) scale(.99); }
        .financeiro-toggle-btn.is-collapsed { color:#667085; background:#efe7d8; opacity:.94; }
        .financeiro-card-tools { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .financeiro-collapse-icon { width:34px; padding:0; }
        .financeiro-collapsible { transition:opacity .16s ease, max-height .2s ease, margin .16s ease; }
        .financeiro-collapsible.is-collapsed { display:none !important; }
        .financeiro-kpis { grid-template-columns:repeat(auto-fit, minmax(178px, 1fr)); gap:10px !important; max-width:1120px; margin-left:auto; margin-right:auto; }
        #view-financeiro .financeiro-kpis .kpi-card { position:relative; min-height:78px; padding:12px 14px 12px 17px; border:1px solid var(--fin-border); border-radius:9px; background:linear-gradient(180deg,#fffdf7 0%,#fbf8f0 100%); box-shadow:0 8px 20px rgba(15,23,42,.06); cursor:default; transform:none !important; animation:financeiroRise .24s ease-out both; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(2) { animation-delay:.03s; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(3) { animation-delay:.06s; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(4) { animation-delay:.09s; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(5) { animation-delay:.12s; }
        #view-financeiro .financeiro-kpis .kpi-card::before { content:''; position:absolute; left:0; top:12px; bottom:12px; width:3px; border-radius:999px; background:var(--kpi-color,#64748b); }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(1) { --kpi-color:var(--fin-danger); }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(2) { --kpi-color:var(--fin-warn); }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(3) { --kpi-color:var(--fin-success); }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(4) { --kpi-color:var(--fin-info); }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(5) { --kpi-color:#7c2d12; }
        #view-financeiro .financeiro-kpis .kpi-card:hover { border-color:var(--fin-border); background:var(--fin-card); }
        #view-financeiro .financeiro-kpis .kpi-icon { width:34px; height:34px; border-radius:9px; background:color-mix(in srgb, var(--kpi-color,#64748b) 15%, #ffffff) !important; color:var(--kpi-color,#475569) !important; box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--kpi-color,#64748b) 18%, transparent), 0 6px 14px color-mix(in srgb, var(--kpi-color,#64748b) 12%, transparent); }
        #view-financeiro .financeiro-kpis .kpi-icon i { color:var(--kpi-color,#475569) !important; filter:saturate(1.12); }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(1) .kpi-icon { background:#fff0f0 !important; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(2) .kpi-icon { background:#fff5df !important; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(3) .kpi-icon { background:#e8f8ef !important; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(4) .kpi-icon { background:#edf4fb !important; }
        #view-financeiro .financeiro-kpis .kpi-card:nth-child(5) .kpi-icon { background:#fff1e8 !important; }
        #view-financeiro .financeiro-kpis .kpi-data h3 { font-size:1.08rem; color:var(--fin-heading); }
        #view-financeiro .financeiro-kpis .kpi-data p { font-size:.72rem; color:var(--fin-muted); font-weight:650; }
        .financeiro-folder-board { display:grid; grid-template-columns:repeat(auto-fit, minmax(176px, 1fr)); gap:10px; margin:0 auto 14px; max-width:1120px; width:100%; overflow:visible; align-items:stretch; }
        .financeiro-folder-card { --folder-color:#64748b; text-align:left; border:1px solid #d7ccb9; border-radius:8px; padding:11px 12px 11px 15px; min-height:98px; background:linear-gradient(180deg,#fffdf7 0%,#f8f4ea 100%); color:var(--fin-text); cursor:pointer; display:grid; grid-template-columns:30px minmax(0, 1fr); grid-template-areas:"icon title" "icon total" "meta meta" "subs subs"; column-gap:10px; row-gap:3px; box-shadow:0 5px 14px rgba(15,23,42,.05); transition:transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease; animation:financeiroRise .24s ease-out both; position:relative; overflow:visible; }
        .financeiro-folder-card::before { content:''; position:absolute; left:0; top:10px; bottom:10px; width:3px; border-radius:999px; background:var(--folder-color); opacity:.9; }
        .financeiro-folder-card i { grid-area:icon; width:26px; height:26px; border-radius:7px; display:grid; place-items:center; color:var(--folder-color); background:color-mix(in srgb, var(--folder-color) 12%, #ffffff); font-size:.9rem; margin-top:1px; filter:saturate(1.12); }
        .financeiro-folder-card span { grid-area:title; min-width:0; font-weight:850; color:#1e293b; font-size:.82rem; line-height:1.14; white-space:normal; overflow-wrap:break-word; }
        .financeiro-folder-card strong { grid-area:total; min-width:0; color:#0f172a; font-size:1rem; line-height:1.12; white-space:nowrap; }
        .financeiro-folder-card small, .financeiro-folder-card em { min-width:0; color:var(--fin-muted); font-style:normal; font-size:.7rem; line-height:1.25; }
        .financeiro-folder-card small { grid-area:meta; margin-top:4px; }
        .financeiro-folder-card em { grid-area:subs; max-height:2.5em; overflow:hidden; text-overflow:ellipsis; }
        .financeiro-folder-card:hover { border-color:color-mix(in srgb, var(--folder-color) 45%, #9a8a73); background:color-mix(in srgb, var(--folder-color) 5%, #fffdf7); transform:translateY(-2px); box-shadow:0 9px 20px rgba(15,23,42,.10); }
        .financeiro-folder-card.active { border-color:color-mix(in srgb, var(--folder-color) 58%, #9a8a73); background:color-mix(in srgb, var(--folder-color) 9%, #fffdf7); box-shadow:0 7px 18px rgba(15,23,42,.08); }
        .financeiro-folder-board .financeiro-folder-card:nth-child(1) { --folder-color:#0f8fa6; }
        .financeiro-folder-board .financeiro-folder-card:nth-child(2) { --folder-color:#475569; }
        .financeiro-folder-board .financeiro-folder-card:nth-child(3) { --folder-color:#b45309; }
        .financeiro-folder-board .financeiro-folder-card:nth-child(4) { --folder-color:#0f766e; }
        .financeiro-folder-board .financeiro-folder-card:nth-child(5) { --folder-color:#475569; }
        .financeiro-folder-board .financeiro-folder-card:nth-child(6) { --folder-color:#64748b; }
        .financeiro-folder-board .financeiro-folder-card:nth-child(7) { --folder-color:#b42318; }
        .financeiro-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; border-bottom:1px solid var(--panel-border); padding-bottom:12px; }
        .btn-tab-financeiro { min-height:34px; background:rgba(255,255,255,0.03); border:1px solid var(--panel-border); color:var(--text-muted); border-radius:7px; padding:8px 12px; font-weight:800; cursor:pointer; display:flex; gap:7px; align-items:center; white-space:nowrap; }
        .btn-tab-financeiro.active { color:var(--accent-color); border-color:var(--accent-color); background:rgba(107,142,35,0.12); }
        .financeiro-form-card, .financeiro-list-card, .financeiro-relatorio-card { padding:16px; margin-bottom:14px; max-width:1120px; margin-left:auto; margin-right:auto; border:1px solid var(--fin-border) !important; border-radius:10px !important; background:var(--fin-card) !important; box-shadow:0 12px 28px rgba(15,23,42,.08) !important; color:var(--fin-text); backdrop-filter:none !important; animation:financeiroRise .28s ease-out both; }
        #view-financeiro h3 { color:var(--fin-heading); font-size:1rem; font-weight:850; letter-spacing:0; }
        #view-financeiro small { color:var(--fin-muted) !important; }
        #view-financeiro .btn-primary { background:var(--fin-primary); color:#fff; border:1px solid var(--fin-primary); border-radius:8px; box-shadow:0 1px 2px rgba(15,23,42,.16); transition:transform .16s ease, background .16s ease, box-shadow .16s ease; }
        #view-financeiro .btn-primary:hover { background:var(--fin-primary-hover); transform:translateY(-1px); box-shadow:0 8px 18px rgba(15,23,42,.14); }
        #view-financeiro .btn-secondary { background:#fffdf7; color:#334155; border:1px solid #c9bba7; border-radius:8px; box-shadow:none; transition:transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease; }
        #view-financeiro .btn-secondary:hover { background:#ffffff; color:#0f172a; border-color:#0f8fa6; transform:translateY(-1px); box-shadow:0 6px 14px rgba(15,23,42,.08); }
        #view-financeiro .btn-danger { background:#fff1f2; color:var(--fin-danger); border:1px solid #fecdd3; border-radius:8px; box-shadow:none; transition:transform .16s ease, box-shadow .16s ease; }
        #view-financeiro .btn-danger:hover { transform:translateY(-1px); box-shadow:0 6px 14px rgba(185,28,28,.10); }
        .financeiro-form-card > div:first-child { align-items:center !important; gap:12px; }
        .financeiro-form-grid { display:grid; grid-template-columns: 136px 168px 118px minmax(220px, 1fr) 124px 112px 92px; grid-template-areas:
            "sec-doc sec-doc sec-doc sec-doc sec-doc sec-doc sec-doc"
            "pasta subpasta tipo desc venc valor status"
            "situacao situacao situacao situacao situacao situacao situacao"
            "sec-arq sec-arq sec-arq sec-arq sec-arq sec-arq sec-arq"
            "doc doc doc doc doc doc doc"
            "sec-final sec-final sec-final sec-final sec-final sec-final sec-final"
            "obs obs obs obs obs save save"; gap:10px 12px; align-items:end; }
        .financeiro-form-section { grid-column:1 / -1; display:flex; align-items:center; gap:7px; min-height:22px; margin-top:2px; padding-top:8px; border-top:1px solid #e3e8e5; color:#475569; font-size:.7rem; font-weight:900; text-transform:uppercase; letter-spacing:.03em; }
        .financeiro-form-section:first-of-type { margin-top:0; padding-top:0; border-top:0; }
        .financeiro-form-section i { color:var(--fin-accent); font-size:.78rem; }
        .fin-section-documento { grid-area:sec-doc; }
        .fin-section-arquivo { grid-area:sec-arq; }
        .fin-section-final { grid-area:sec-final; }
        .fin-pasta { grid-area:pasta; }
        .fin-subpasta { grid-area:subpasta; }
        .fin-tipo { grid-area:tipo; }
        .fin-desc { grid-area:desc; }
        .fin-venc { grid-area:venc; }
        .fin-valor { grid-area:valor; }
        .fin-status { grid-area:status; }
        .fin-situacao { grid-area:situacao; max-width:330px; }
        .fin-obs { grid-area:obs; }
        .fin-doc { grid-area:doc; }
        .fin-comprovante { grid-area:comprovante; }
        .fin-save { grid-area:save; }
        .financeiro-form-grid .input-group { min-width:0; }
        .financeiro-form-grid .input-group label { min-height:14px; margin-bottom:5px; font-size:0.66rem; letter-spacing:.02em; color:#64748b; font-weight:850; }
        .financeiro-form-grid input,
        .financeiro-form-grid select,
        .financeiro-form-grid textarea { width:100%; min-height:36px; border-radius:7px; box-sizing:border-box; font-size:.88rem; background:var(--fin-field) !important; border:1px solid #bdaF99 !important; color:#0f172a !important; font-weight:750; box-shadow:inset 0 1px 2px rgba(15,23,42,.05); transition:border-color .16s ease, box-shadow .16s ease, background .16s ease, transform .16s ease; }
        #view-financeiro .financeiro-form-grid input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
        #view-financeiro .financeiro-form-grid select,
        #view-financeiro .financeiro-form-grid textarea,
        #view-financeiro .financeiro-filtros input,
        #view-financeiro .financeiro-filtros select,
        #view-financeiro .financeiro-relatorio-filtros input,
        #view-financeiro .financeiro-relatorio-filtros select {
            background:var(--fin-field) !important;
            border:1px solid #c9bba7 !important;
            color:#111827 !important;
            box-shadow:inset 0 1px 2px rgba(15,23,42,.05) !important;
        }
        .financeiro-form-grid input:not([type="checkbox"]):not([type="radio"]):focus,
        .financeiro-form-grid select:focus,
        .financeiro-form-grid textarea:focus { background:var(--fin-field-focus) !important; border-color:var(--fin-accent) !important; box-shadow:0 0 0 2px rgba(138,111,61,.16), inset 0 1px 2px rgba(15,23,42,.04) !important; transform:translateY(-1px); }
        .financeiro-form-grid textarea { min-height:82px; resize:vertical; }
        #view-financeiro .fin-situacao select { background:#f8f1df !important; border-color:#c7a55d !important; }
        #view-financeiro input::placeholder, #view-financeiro textarea::placeholder { color:#94a3b8 !important; font-weight:650; }
        #view-financeiro select option { background:#fff; color:#0f172a; }
        .financeiro-form-grid small { display:block; margin-top:5px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-obs { grid-column:auto; }
        .financeiro-form-actions { display:flex; align-items:center; justify-content:flex-end; height:auto; min-height:40px; }
        .financeiro-form-actions .btn-primary,
        .financeiro-form-actions .btn-secondary,
        .financeiro-form-actions .btn-danger { min-height:40px; width:100%; justify-content:center; white-space:nowrap; }
        .fin-save .btn-primary { max-width:190px; min-width:170px; margin-left:auto; }
        #btnLerDocumentoFinanceiro { min-height:38px; line-height:1.1; white-space:nowrap; }
        .financeiro-status-toggle { width:92px; min-height:38px; border:1px solid #e4c799; background:#f8f0df; color:#9a5b13; border-radius:7px; padding:6px 8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:.68rem; line-height:1.05; text-align:center; font-weight:900; cursor:pointer; }
        .financeiro-status-toggle input { width:14px !important; height:14px; min-height:14px; flex:0 0 auto; }
        .financeiro-status-toggle:has(input:checked) { border-color:#bbf7d0; background:#ecfdf5; color:var(--fin-success); }
        .financeiro-file-row { display:grid; grid-template-columns:140px 110px minmax(220px, 1fr) 42px; gap:10px; align-items:center; max-width:100%; }
        .financeiro-file-row input[type="file"] { position:absolute; opacity:0; width:1px; height:1px; pointer-events:none; }
        .financeiro-file-compact { min-height:38px; border:1px solid #c7d0cc; border-radius:7px; background:#f8faf8; color:#334155; display:flex; align-items:center; justify-content:center; gap:6px; font-size:.78rem; font-weight:900; cursor:pointer; margin:0 !important; }
        .financeiro-file-row small { margin:0; align-self:center; }
        .financeiro-file-row .btn-secondary { min-width:42px; width:42px; min-height:38px; padding:0; display:grid; place-items:center; }
        .financeiro-form-clean .fin-doc { grid-column:1 / -1 !important; grid-area:doc !important; width:100% !important; }
        .financeiro-form-clean .fin-obs { grid-area:obs !important; width:100% !important; }
        .financeiro-form-clean .fin-save { grid-column:6 / -1 !important; grid-area:save !important; width:100% !important; }
        .financeiro-form-clean .fin-obs textarea { width:100% !important; min-height:72px !important; display:block !important; }
        .financeiro-form-clean .financeiro-file-row { width:100% !important; display:grid !important; grid-template-columns:140px 120px minmax(260px, 1fr) 44px !important; gap:10px !important; align-items:center !important; }
        .financeiro-form-clean .financeiro-file-compact { min-height:38px !important; height:38px !important; border:1px solid #c7d0cc !important; border-radius:7px !important; background:#f8faf8 !important; color:#334155 !important; display:flex !important; align-items:center !important; justify-content:center !important; gap:6px !important; font-size:.78rem !important; font-weight:900 !important; cursor:pointer !important; margin:0 !important; padding:0 10px !important; letter-spacing:0 !important; text-transform:none !important; }
        .financeiro-form-clean #financeiroDocumentoNome { margin:0 !important; font-size:.82rem !important; color:#475569 !important; line-height:38px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; }
        .financeiro-form-clean #btnLerDocumentoFinanceiro { width:44px !important; min-width:44px !important; height:38px !important; min-height:38px !important; padding:0 !important; display:grid !important; place-items:center !important; }
        .financeiro-list-header { display:grid; grid-template-columns: minmax(220px, 1fr) auto; gap:12px; align-items:start; margin-bottom:12px; }
        .financeiro-list-header h3 { white-space:nowrap; }
        #financeiroResumoLista { display:block; max-width:240px; line-height:1.35; }
        .financeiro-list-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; align-items:center; padding:8px; border:1px solid #d7ccb9; border-radius:10px; background:#f4efe4; max-width:100%; box-shadow:inset 0 1px 0 rgba(255,255,255,.72); }
        .financeiro-list-actions button { min-height:34px; white-space:nowrap; }
        .financeiro-list-actions .btn-secondary { min-width:126px; }
        .financeiro-list-actions .financeiro-collapse-icon { min-width:34px; width:34px; }
        #view-financeiro .financeiro-list-actions .btn-secondary:first-of-type { background:#172033; color:#fff; border-color:#172033; }
        #view-financeiro .financeiro-btn-report { border-color:#d1ac55; color:#3f3320; background:#f8edcb; }
        .financeiro-filtros { grid-column:1 / -1; display:grid; grid-template-columns: minmax(110px, .7fr) minmax(180px, .95fr) minmax(220px, 1.4fr); gap:8px; max-width:620px; }
        .financeiro-filtros select, .financeiro-filtros input { min-height:34px; border-radius:7px; border:1px solid #c1cac6 !important; background:var(--fin-field) !important; color:var(--fin-text) !important; padding:0 10px; font-size:.84rem; box-shadow:inset 0 1px 2px rgba(15,23,42,.04); }
        .financeiro-table { width:100%; border-collapse:separate; border-spacing:0; min-width:860px; background:#fffdf7; border:1px solid var(--fin-line); border-radius:9px; overflow:hidden; }
        .financeiro-table th { text-align:left; color:#475569; font-size:0.68rem; text-transform:uppercase; padding:9px 9px; border-bottom:1px solid #c9bba7; background:#efe7d8; }
        .financeiro-table td { padding:9px 9px; border-bottom:1px solid var(--fin-line); vertical-align:middle; font-size:.86rem; color:#0f172a; transition:background .16s ease, box-shadow .16s ease, transform .16s ease; }
        .financeiro-table tr { position:relative; transition:filter .16s ease; }
        .financeiro-table tbody tr.financeiro-row { cursor:pointer; }
        .financeiro-table tbody tr:nth-child(even) td { background:#f8f4ea; }
        .financeiro-table tbody tr.financeiro-row:hover td { background:#fff8e8; box-shadow:0 8px 18px rgba(23,32,51,.08); transform:translateY(-1px); }
        .financeiro-table tbody tr.financeiro-row:hover { filter:brightness(1.01); }
        .financeiro-table tbody tr.financeiro-row-selected td { background:#eef6f6 !important; box-shadow:none; }
        .financeiro-table tbody tr.financeiro-row-selected td:first-child { box-shadow:inset 3px 0 0 #0f8fa6; }
        .financeiro-table tbody tr.financeiro-row-selected td:not(:first-child) { border-left-color:transparent; }
        .financeiro-table tbody tr.financeiro-row-selected:hover td { background:#e7f3f3 !important; }
        .financeiro-table td small { display:block; color:var(--fin-muted); margin-top:4px; max-width:360px; }
        .financeiro-tipo-pill { display:inline-flex; align-items:center; justify-content:center; min-height:24px; max-width:116px; padding:3px 8px; border-radius:999px; background:#eef3f4; color:#172033; border:1px solid #cddfe3; font-size:.72rem; font-weight:900; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .financeiro-descricao-cell strong { display:block; color:#152033; font-size:.88rem; font-weight:850; line-height:1.25; max-width:390px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-descricao-cell small { font-size:.73rem; line-height:1.3; }
        .financeiro-descricao-cell small:empty { display:none; }
        .financeiro-ia-line { color:#806a4a !important; font-weight:800; }
        .financeiro-status-badge { border-radius:999px; padding:5px 10px; font-size:0.78rem; font-weight:900; white-space:nowrap; }
        .financeiro-status-badge.pago { color:var(--fin-success); background:#e7f4ec; }
        .financeiro-status-badge.aberto { color:var(--fin-warn); background:#f7eddc; }
        .financeiro-status-badge.pendente { color:var(--fin-warn); background:#f7eddc; }
        .financeiro-status-badge.vencido { color:var(--fin-danger); background:#f8e7e7; }
        .financeiro-acoes, .financeiro-link { display:flex; gap:6px; align-items:center; justify-content:flex-end; }
        .financeiro-acoes button, .financeiro-link { cursor:pointer; text-decoration:none; }
        #view-financeiro .financeiro-acoes .btn-icon { width:30px; height:30px; min-width:30px; min-height:30px; display:grid; place-items:center; border:1px solid transparent; border-radius:8px; padding:0 !important; font-size:.92rem !important; transition:transform .16s ease, box-shadow .16s ease, filter .16s ease, border-color .16s ease; }
        #view-financeiro .financeiro-acoes .btn-icon:hover { transform:translateY(-2px); filter:brightness(1.04); box-shadow:0 8px 18px rgba(23,32,51,.18); }
        #view-financeiro .financeiro-acao-ia { color:#7a5300 !important; background:#f8edcb; border-color:#dec16c; }
        #view-financeiro .financeiro-acao-editar { color:#17406d !important; background:#edf4fb; border-color:#bfd2e6; }
        #view-financeiro .financeiro-acao-pago { color:#0f6840 !important; background:#e6f3ec; border-color:#abd8bf; }
        #view-financeiro .financeiro-acao-excluir { color:#a3202b !important; background:#f8e7e7; border-color:#e7b8bc; }
        .financeiro-doc-chip { border:1px solid #c9c3b9; background:#fffdf7; color:#475569; border-radius:7px; min-height:28px; padding:3px 8px; display:inline-flex; align-items:center; gap:6px; font-size:.72rem; font-weight:800; margin:2px; cursor:pointer; transition:transform .14s ease, box-shadow .14s ease, border-color .14s ease, background .14s ease; }
        .financeiro-doc-chip i { color:var(--doc-color); }
        .financeiro-doc-chip:hover { background:#ffffff; border-color:#a99b86; transform:translateY(-1px); box-shadow:0 6px 14px rgba(23,32,51,.12); }
        .financeiro-doc-chip span { max-width:74px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-relatorio-card { padding:20px; margin-bottom:20px; }
        .financeiro-relatorio-filtros { display:grid; grid-template-columns: repeat(4, minmax(130px, 1fr)); gap:12px; align-items:end; margin-bottom:14px; }
        .financeiro-relatorio-resumo { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin:12px 0; }
        .financeiro-relatorio-resumo div { border:1px solid var(--panel-border); border-radius:8px; padding:10px; background:rgba(255,255,255,0.03); }
        .financeiro-relatorio-resumo small { color:var(--text-muted); display:block; }
        .financeiro-relatorio-resumo strong { display:block; margin-top:3px; font-size:1.05rem; }
        .financeiro-import-modal { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; padding:18px; background:rgba(0,0,0,0.72); backdrop-filter: blur(5px); }
        .financeiro-import-box { width:min(760px, 96vw); border:1px solid rgba(16,185,129,0.42); border-radius:12px; background:#111827; box-shadow:0 24px 80px rgba(0,0,0,0.55); padding:18px; }
        .financeiro-import-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-bottom:12px; border-bottom:1px solid rgba(148,163,184,0.18); }
        .financeiro-import-head h3 { margin:0 0 4px; color:#f8fafc; }
        .financeiro-import-head small { color:var(--text-muted); word-break:break-word; }
        .financeiro-import-head-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .financeiro-import-head-actions button { min-height:36px; white-space:nowrap; }
        .financeiro-import-alert { margin:12px 0; padding:10px 12px; border-radius:8px; color:#fed7aa; background:rgba(249,115,22,0.14); border:1px solid rgba(249,115,22,0.28); font-weight:800; }
        .financeiro-import-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; margin-top:14px; }
        .financeiro-import-grid label { color:var(--text-muted); font-size:.76rem; font-weight:900; text-transform:uppercase; }
        .financeiro-import-grid input, .financeiro-import-grid textarea { margin-top:5px; width:100%; min-height:40px; border-radius:8px; border:1px solid var(--panel-border); background:#0f172a; color:var(--text-color); padding:0 10px; box-sizing:border-box; }
        .financeiro-import-grid textarea { padding:10px; resize:vertical; }
        .financeiro-import-grid .span-2 { grid-column:span 2; }
        .financeiro-import-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; flex-wrap:wrap; }
        .financeiro-import-actions button { min-height:40px; white-space:nowrap; }
        .financeiro-lembrete-topo {
            position:fixed; top:10px; left:50%; transform:translateX(-50%);
            z-index:9998; width:min(980px, calc(100vw - 28px)); display:flex; align-items:center; gap:8px;
            padding:8px; border-radius:10px; border:1px solid rgba(245,158,11,.5);
            background:rgba(17,24,39,.96); color:#fff7ed; box-shadow:0 18px 50px rgba(0,0,0,.45);
            animation: financeiroPulse 1.35s ease-in-out infinite;
        }
        .financeiro-lembrete-main { flex:1; min-width:0; border:0; background:transparent; color:inherit; display:flex; align-items:center; gap:10px; text-align:left; cursor:pointer; font-weight:800; }
        .financeiro-lembrete-main span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; animation: financeiroTicker 18s linear infinite; }
        .financeiro-lembrete-main i { color:#f59e0b; font-size:1rem; }
        .financeiro-lembrete-doc, .financeiro-lembrete-close { border:1px solid rgba(245,158,11,.38); background:rgba(245,158,11,.14); color:#fff7ed; border-radius:8px; min-height:34px; padding:0 10px; font-weight:900; cursor:pointer; white-space:nowrap; }
        .financeiro-lembrete-close { width:34px; padding:0; display:grid; place-items:center; }
        .financeiro-menu-alerta { position:relative; animation:none !important; }
        .financeiro-menu-alerta::after { content:''; width:9px; height:9px; min-width:9px; border-radius:999px; background:#f5b843; box-shadow:0 0 0 4px rgba(245,184,67,.12), 0 0 16px rgba(245,184,67,.65); margin-left:auto; animation: financeiroMenuDotPulse 1.45s ease-in-out infinite; }
        @keyframes financeiroPulse { 0%,100% { box-shadow:0 18px 50px rgba(0,0,0,.45), 0 0 0 rgba(245,158,11,0); } 50% { box-shadow:0 18px 50px rgba(0,0,0,.45), 0 0 22px rgba(245,158,11,.42); } }
        @keyframes financeiroMenuGlow { 0%,100% { filter:none; } 50% { filter:brightness(1.35); } }
        @keyframes financeiroMenuDotPulse { 0%,100% { transform:scale(1); opacity:.9; } 50% { transform:scale(1.25); opacity:1; } }
        @keyframes financeiroTicker { 0%,12% { transform:translateX(0); } 88%,100% { transform:translateX(-12%); } }
        @keyframes financeiroViewIn { from { opacity:.88; } to { opacity:1; } }
        @keyframes financeiroRise { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @media (min-width: 901px) {
            #view-financeiro { font-size:14px; }
            #view-financeiro .main-header { margin-bottom:12px; }
            .financeiro-view-tools { margin-bottom:10px; }
            .financeiro-view-tools button,
            .financeiro-toggle-btn {
                min-height:31px;
                padding:6px 10px;
                font-size:.76rem;
            }
            .financeiro-kpis {
                grid-template-columns:repeat(auto-fit, minmax(166px, 1fr));
                gap:9px !important;
                margin-bottom:16px !important;
            }
            #view-financeiro .financeiro-kpis .kpi-card {
                min-height:68px;
                padding:10px 12px 10px 15px !important;
            }
            #view-financeiro .financeiro-kpis .kpi-icon {
                width:30px;
                height:30px;
            }
            #view-financeiro .financeiro-kpis .kpi-data h3 {
                font-size:1rem;
            }
            #view-financeiro .financeiro-kpis .kpi-data p {
                font-size:.68rem;
            }
            .financeiro-folder-board {
                grid-template-columns:repeat(auto-fit, minmax(166px, 1fr));
                gap:9px;
            }
            .financeiro-folder-card {
                min-height:88px;
                padding:9px 10px 9px 13px;
                grid-template-columns:28px minmax(0, 1fr);
            }
            .financeiro-folder-card i {
                width:24px;
                height:24px;
                font-size:.84rem;
            }
            .financeiro-folder-card span {
                font-size:.78rem;
            }
            .financeiro-folder-card strong {
                font-size:.93rem;
            }
            .financeiro-folder-card small,
            .financeiro-folder-card em {
                font-size:.66rem;
            }
            .financeiro-form-card,
            .financeiro-list-card,
            .financeiro-relatorio-card {
                padding:14px;
                margin-bottom:12px;
            }
            .financeiro-form-grid {
                grid-template-columns:126px 154px 110px minmax(205px, 1fr) 116px 104px 86px;
                gap:8px 10px;
            }
            .financeiro-form-grid input,
            .financeiro-form-grid select,
            .financeiro-form-grid textarea {
                min-height:32px;
                font-size:.82rem;
                padding:0 9px;
            }
            .financeiro-status-toggle {
                min-height:32px;
            }
            .financeiro-file-row {
                grid-template-columns:126px 108px minmax(220px, 1fr) 38px;
                gap:8px;
            }
            .financeiro-form-clean .financeiro-file-row {
                grid-template-columns:126px 108px minmax(240px, 1fr) 40px !important;
            }
            .financeiro-list-actions button {
                min-height:31px;
                padding:6px 10px;
                font-size:.78rem;
            }
            .financeiro-filtros select,
            .financeiro-filtros input {
                min-height:31px;
                font-size:.78rem;
            }
            .financeiro-table th {
                padding:7px 8px;
                font-size:.64rem;
            }
            .financeiro-table td {
                padding:7px 8px;
                font-size:.8rem;
            }
        }
        @media (max-width: 1100px) {
            .financeiro-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-areas:
                "sec-doc sec-doc"
                "pasta subpasta"
                "tipo desc"
                "venc valor"
                "status status"
                "situacao situacao"
                "sec-arq sec-arq"
                "doc doc"
                "sec-final sec-final"
                "obs obs"
                "save save"; }
            .fin-save .btn-primary { max-width:220px; }
            .financeiro-status-toggle { width:100%; max-width:120px; }
            .financeiro-list-header { grid-template-columns:1fr; }
            .financeiro-list-header > div:nth-child(2) { justify-content:flex-start; }
        }
        @media (max-width: 680px) {
            .financeiro-form-grid { grid-template-columns: 1fr; grid-template-areas:
                "sec-doc"
                "pasta"
                "subpasta"
                "tipo"
                "desc"
                "venc"
                "valor"
                "status"
                "situacao"
                "sec-arq"
                "doc"
                "sec-final"
                "obs"
                "save"; }
            .financeiro-filtros { grid-template-columns: 1fr; }
            .financeiro-status-toggle { max-width:112px; }
            .financeiro-file-row { grid-template-columns:1fr; }
            .financeiro-form-clean .fin-save { grid-column:1 / -1 !important; }
            .financeiro-form-clean .financeiro-file-row { grid-template-columns:1fr !important; }
            .fin-save .btn-primary { max-width:none; width:100%; }
            .financeiro-import-grid { grid-template-columns:1fr; }
            .financeiro-import-grid .span-2 { grid-column:span 1; }
            .financeiro-lembrete-topo { top:8px; width:calc(100vw - 14px); align-items:stretch; }
            .financeiro-lembrete-main span { white-space:normal; font-size:.82rem; }
            .financeiro-lembrete-doc { font-size:0; width:38px; padding:0; }
            .financeiro-lembrete-doc i { font-size:.9rem; }
        }
        @media (prefers-reduced-motion: reduce) {
            #view-financeiro,
            #view-financeiro *,
            #view-financeiro *::before,
            #view-financeiro *::after {
                animation:none !important;
                transition:none !important;
                transform:none !important;
            }
        }
    `;
    document.head.appendChild(style);
}

function prepararDocumentoRelatorioFinanceiro() {
    const selecionados = new Set(Array.from(document.querySelectorAll('.financeiro-relatorio-check:checked')).map(input => input.value));
    const lista = financeiroRelatorioAtual.filter(item => selecionados.has(item.id));
    if (lista.length === 0) {
        alert('Selecione pelo menos um registro para gerar o relatório.');
        return false;
    }
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const contentHtml = `
        <div class="doc-header">
            <div><img src="logo.png" alt="Serraria" class="doc-logo" onerror="this.style.display='none'"></div>
            <div class="doc-title"><h1>Relatório financeiro</h1><p>${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}</p></div>
        </div>
        <div class="doc-note"><strong>Período:</strong> ${dataBR(document.getElementById('financeiroRelatorioInicio').value)} até ${dataBR(document.getElementById('financeiroRelatorioFim').value)}<br><strong>Valor total:</strong> <span class="doc-money">${formatarMoeda(total)}</span></div>
        <table class="doc-table"><thead><tr><th>Tipo</th><th>Descrição</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead><tbody>${lista.map(item => `<tr><td>${item.tipo}</td><td>${item.descricao}</td><td>${dataBR(item.vencimento)}</td><td>${obterStatusItem(item).label}</td><td class="doc-money">${formatarMoeda(item.valor)}</td></tr>`).join('')}</tbody></table>
    `;
    window.financeiroDocAtual = { title: `Relatório financeiro ${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}`, filename: `financeiro-${financeiroAbaAtiva}`, contentHtml };
    return true;
}

window.imprimirRelatorioFinanceiro = function() {
    if (!prepararDocumentoRelatorioFinanceiro()) return;
    window.DocActions.printHtml(window.financeiroDocAtual);
};

window.baixarPdfRelatorioFinanceiro = function() {
    if (!prepararDocumentoRelatorioFinanceiro()) return;
    window.DocActions.downloadPdf(window.financeiroDocAtual);
};

window.enviarRelatorioFinanceiroWhatsapp = function() {
    if (!prepararDocumentoRelatorioFinanceiro()) return;
    window.DocActions.sendWhatsApp({ title: window.financeiroDocAtual.title, filename: window.financeiroDocAtual.filename, contentHtml: window.financeiroDocAtual.contentHtml, message: `Segue o ${window.financeiroDocAtual.title}.` });
};

document.addEventListener('DOMContentLoaded', () => {
    injetarEstilosFinanceiro();
    document.getElementById('financeiroForm')?.addEventListener('submit', salvarFinanceiroSubmit);
    document.getElementById('financeiroValor')?.addEventListener('input', event => aplicarMascaraMoeda(event.target));
    document.getElementById('financeiroPago')?.addEventListener('change', atualizarStatusToggle);
    document.getElementById('financeiroDocumento')?.addEventListener('change', event => lerArquivoFinanceiro(event.target.files[0], 'documento'));
    document.getElementById('financeiroComprovante')?.addEventListener('change', event => lerArquivoFinanceiro(event.target.files[0], 'comprovante'));
    document.getElementById('btnLerDocumentoFinanceiro')?.addEventListener('click', window.lerDocumentoFinanceiroAutomaticamente);
    document.getElementById('financeiroArquivosInput')?.addEventListener('change', event => window.importarPastaFinanceira(event.target.files));
    document.getElementById('financeiroPastaInput')?.addEventListener('change', event => window.importarPastaFinanceira(event.target.files));
    document.getElementById('financeiroFilaInput')?.addEventListener('change', event => window.importarFilaMonitorFinanceiro(event.target.files));
    window.limparFinanceiroForm();
    aplicarEstadoVisualFinanceiro();
    migrarArquivosFinanceirosLocal()
        .catch(error => console.warn('Não foi possível migrar anexos financeiros locais.', error))
        .finally(() => {
            renderFinanceiro();
            aplicarEstadoVisualFinanceiro();
        });
});

window.SectionLoader?.register('view-financeiro', carregarFinanceiroNuvem);


