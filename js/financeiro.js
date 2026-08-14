console.log("Modulo Financeiro: inicializando...");

const FINANCEIRO_KEY = 'orquestra_financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_KEY = 'orquestra_financeiro_relatorios_mensais';
const FINANCEIRO_AI_USAGE_KEY = 'orquestra_financeiro_ai_usage';
const FINANCEIRO_DB_NAME = 'orquestra_financeiro_arquivos';
const FINANCEIRO_DB_STORE = 'anexos';
const FINANCEIRO_COLLECTION = 'financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_COLLECTION = 'financeiro_relatorios_mensais';

const FINANCEIRO_ABAS = {
    'caixa-financeira': {
        titulo: 'Caixa Financeira',
        tipoPadrao: ['BOLETO', 'IMPOSTO', 'NOTA FISCAL', 'CONTA', 'DOCUMENTO'],
        descricaoPadrao: ['PENDENTE DE CONFERENCIA', 'FORNECEDOR', 'GUIA DE IMPOSTO', 'BOLETO RECEBIDO', 'DOCUMENTO DO EMAIL']
    },
    'despesas-gerais': {
        titulo: 'Despesas Gerais',
        tipoPadrao: ['BOLETO', 'MULTA', 'DESPESA AVULSA', 'FORNECEDOR'],
        descricaoPadrao: ['MANUTENCAO', 'COMPRA AVULSA', 'SERVICO TERCEIRO']
    },
    boletos: {
        titulo: 'Boletos Aleatorios',
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
    todos: { titulo: 'Todos', icone: 'fa-folder-open', cor: '#60a5fa', subpastas: ['GERAL'] },
    impostos: { titulo: 'Impostos', icone: 'fa-landmark', cor: '#f59e0b', subpastas: ['RECEITA FEDERAL', 'FGTS', 'INSS', 'SINDICATO', 'TAXAS'] },
    boletos: { titulo: 'Boletos', icone: 'fa-barcode', cor: '#38bdf8', subpastas: ['SICREDI', 'FORNECEDORES', 'ALUGUEL', 'OUTROS BOLETOS'] },
    fornecedores: { titulo: 'Fornecedores', icone: 'fa-truck-field', cor: '#22c55e', subpastas: ['AIR EXPRESS', 'MATERIAIS', 'SERVICOS', 'OUTROS FORNECEDORES'] },
    funcionarios: { titulo: 'Funcionarios', icone: 'fa-users', cor: '#a78bfa', subpastas: ['HOLERITES', 'VALES', 'BENEFICIOS', 'OUTROS'] },
    fixas: { titulo: 'Despesas Fixas', icone: 'fa-repeat', cor: '#fb7185', subpastas: ['ENERGIA', 'INTERNET', 'TELEFONE', 'CONTABILIDADE', 'SISTEMAS'] },
    conferir: { titulo: 'Conferir', icone: 'fa-triangle-exclamation', cor: '#f97316', subpastas: ['PENDENTE', 'SEM LEITURA', 'OUTROS'] }
};

const FINANCEIRO_DOC_CATEGORIAS = {
    AUTO: { label: 'Automatico', icone: 'fa-wand-magic-sparkles', cor: '#94a3b8' },
    boleto: { label: 'Boleto', icone: 'fa-barcode', cor: '#38bdf8' },
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

function chaveDocumentoFinanceiro(doc = {}) {
    return [
        doc.categoria || 'outro',
        doc.localPath || doc.localUrl || doc.nome || '',
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
            reject(new Error('IndexedDB nao disponivel neste navegador.'));
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
        console.warn('Arquivo financeiro nao foi salvo no armazenamento local. O lancamento sera salvo sem o PDF pesado.', error);
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
        alert('Lancamento salvo localmente, mas nao foi possivel sincronizar com a nuvem agora.');
    }
}

async function excluirFinanceiroNuvem(id) {
    if (!window.FS || !id) return true;
    try {
        await window.FS.deleteDoc(FINANCEIRO_COLLECTION, id);
        return true;
    } catch (error) {
        console.error(`Falha ao excluir financeiro/${id} no Firestore.`, error);
        alert('Nao foi possivel excluir na nuvem agora. O lancamento foi mantido localmente para evitar divergencia. Tente novamente em alguns instantes.');
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
    return { label: item.conferenciaStatus === 'conferido' ? 'Conferido' : 'NÃ£o pago', classe: 'aberto' };
}

function atualizarStatusToggle() {
    const pago = document.getElementById('financeiroPago')?.checked;
    const texto = document.getElementById('financeiroStatusTexto');
    if (texto) texto.textContent = pago ? 'Pago' : 'NÃ£o pago';
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

function lerArquivoFinanceiro(file, tipo) {
    if (!file) {
        financeiroAnexosTemp[tipo] = null;
        preencherNomeArquivo(tipo, null);
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        financeiroAnexosTemp[tipo] = {
            nome: file.name,
            tipo: file.type || 'application/octet-stream',
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
        throw new Error('Biblioteca PDF.js nao carregada.');
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
        console.warn('Nao foi possivel salvar uso da IA financeira.', error);
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

async function analisarDocumentoFinanceiroIA(textoDocumento, anexo, sugestaoLocal = {}) {
    try {
        const response = await fetch('/api/financeiro-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nomeArquivo: anexo?.nome || '',
                textoDocumento: String(textoDocumento || '').slice(0, 14000),
                sugestaoLocal
            })
        });
        const rawText = await response.text();
        let data = {};
        try { data = rawText ? JSON.parse(rawText) : {}; } catch { data = {}; }
        if (!response.ok) throw new Error(data.error || rawText || 'Falha na IA financeira.');
        if (data.usage) salvarUsoIAFinanceiro(data.usage);
        return normalizarDadosIAFinanceiro(data.dados || {});
    } catch (error) {
        console.warn('IA financeira indisponivel:', error.message);
        return null;
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
    if (!anexo?.dados) throw new Error('Este anexo nao possui arquivo carregado para leitura.');
    if ((anexo.tipo || '').startsWith('image/')) throw new Error('Imagem ainda precisa de OCR. Preencha manualmente por enquanto.');
    const nomeArquivo = (anexo.nome || '').toLowerCase();
    const tipoArquivo = (anexo.tipo || '').toLowerCase();
    let texto = '';
    if (nomeArquivo.endsWith('.pdf') || tipoArquivo.includes('pdf')) {
        texto = await extrairTextoPdfFinanceiro(anexo);
    } else {
        texto = textoDeAnexoBase64(anexo);
    }
    if (!texto || texto.length < 20) throw new Error('Texto insuficiente no documento. Pode ser PDF escaneado.');
    const dadosLocal = nomeArquivo.endsWith('.xml') || tipoArquivo.includes('xml') || /<\?xml|<nfeProc|<NFe|<cteProc|<CFe/i.test(texto)
        ? extrairDadosXmlFinanceiro(texto)
        : extrairDadosTextoFinanceiro(texto);
    const dadosIA = leituraFinanceiraIncompleta(dadosLocal)
        ? await analisarDocumentoFinanceiroIA(texto, anexo, dadosLocal || {})
        : null;
    return {
        dados: dadosIA && !leituraFinanceiraIncompleta(dadosIA) ? dadosIA : (dadosLocal || dadosIA),
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
        alert(error.message || 'Nao foi possivel ler este documento automaticamente.');
        return;
    }
    const { dados, usouIA } = resultado;
    if (!dados) {
        alert('Nao foi possivel identificar os dados do documento. Preencha manualmente.');
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
                ${pendente ? '<div class="financeiro-import-alert"><i class="fa-solid fa-triangle-exclamation"></i> Confira os dados antes de salvar. Se este arquivo nao for financeiro, clique em Ignorar.</div>' : ''}
                <div class="financeiro-import-grid">
                    <label>Tipo<input id="importFinTipo" value="${escapeHtmlFinanceiro(normalizarTexto(dados?.tipo || 'DOCUMENTO'))}"></label>
                    <label>Descricao<input id="importFinDescricao" value="${escapeHtmlFinanceiro(normalizarTexto(dados?.descricao || 'PENDENTE DE CONFERENCIA'))}"></label>
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
    for (const file of listaArquivos) {
        try {
            const anexo = {
                nome: file.name,
                tipo: file.type || (file.name.toLowerCase().endsWith('.xml') ? 'application/xml' : 'application/octet-stream'),
                dados: await lerArquivoComoDataUrl(file)
            };
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
    alert(`${importados.length} documento(s) importado(s) rapidamente.\nA leitura automatica vai continuar em segundo plano e atualizar a lista conforme encontrar valor, vencimento e fornecedor.`);
};

window.importarFilaMonitorFinanceiro = async function(files) {
    const arquivos = Array.from(files || []).filter(file => file.name.toLowerCase().endsWith('.json'));
    if (!arquivos.length) {
        alert('Selecione os arquivos JSON da pasta FILA do monitor financeiro.');
        return;
    }
    const lista = obterLancamentosFinanceiros();
    let importados = 0;
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
                storage: 'LOCAL'
            } : null;
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
    alert(`${importados} item(ns) da fila importado(s) para a Caixa Financeira.`);
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
            : '<i class="fa-solid fa-plus-circle"></i> Novo lancamento financeiro';
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
                <small>${itens.length} doc(s) - ${abertos} aberto(s)</small>
                ${subpastas.length ? `<em>${subpastas.join(' / ')}</em>` : ''}
            </button>
        `;
    }).join('');
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
    document.getElementById('financeiroResumoLista').textContent = `${lista.length} registro(s)`;
    const selecionarTodos = document.getElementById('financeiroSelecionarTodos');
    if (selecionarTodos) {
        selecionarTodos.checked = false;
        selecionarTodos.indeterminate = false;
    }
    const btnExcluirSelecionados = document.getElementById('btnExcluirFinanceiroSelecionados');
    if (btnExcluirSelecionados) btnExcluirSelecionados.style.display = 'none';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:28px; color:var(--text-muted);">Nenhum lanÃ§amento financeiro nesta aba.</td></tr>';
        mostrarLembretesFinanceiros();
        return;
    }

    tbody.innerHTML = lista.map(item => {
        const status = obterStatusItem(item);
        const anexos = normalizarDocumentosVinculadosFinanceiro(item).map(doc => {
            const meta = FINANCEIRO_DOC_CATEGORIAS[doc.categoria] || FINANCEIRO_DOC_CATEGORIAS.outro;
            return `<button type="button" class="btn-icon financeiro-doc-chip" style="--doc-color:${meta.cor};" onclick="window.abrirAnexoFinanceiro('${escapeJsStringFinanceiro(item.id)}', 'vinculado', '${escapeJsStringFinanceiro(doc.id)}')" title="Abrir ${escapeHtmlFinanceiro(meta.label)}: ${escapeHtmlFinanceiro(doc.nome || 'documento')}"><i class="fa-solid ${meta.icone}"></i><span>${escapeHtmlFinanceiro(meta.label)}</span></button>`;
        }).join('');
        const criadoEm = dataHoraBR(item.criadoEm);
        const atualizadoEm = dataHoraBR(item.atualizadoEm);
        const tooltipLancamento = `LanÃ§ado no sistema em: ${criadoEm}${atualizadoEm !== criadoEm ? ` | Ãšltima alteraÃ§Ã£o: ${atualizadoEm}` : ''}`;

        return `
            <tr title="${tooltipLancamento}">
                <td><input type="checkbox" class="financeiro-check" value="${item.id}" onchange="window.atualizarSelecaoFinanceiro()"></td>
                <td><strong>${item.tipo}</strong></td>
                <td>${item.descricao}${item.ia ? `<small style="color:#38bdf8;"><i class="fa-solid fa-wand-magic-sparkles"></i> IA ${item.ia.confianca || 'media'}${item.ia.fornecedor ? ` - ${item.ia.fornecedor}` : ''}</small>` : ''}<small>${item.observacao || ''}</small></td>
                <td>${dataBR(item.vencimento)}</td>
                <td><strong>${formatarMoeda(item.valor)}</strong></td>
                <td><span class="financeiro-status-badge ${status.classe}">${status.label}</span></td>
                <td>${anexos || '<span style="color:var(--text-muted);">-</span>'}</td>
                <td class="financeiro-acoes">
                    <button type="button" class="btn-icon" style="color:#38bdf8; font-size:1.05rem; padding:4px;" onclick="window.analisarFinanceiroDocumento('${item.id}')" title="Ler boleto/NF"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                    <button type="button" class="btn-icon" style="color:var(--primary-color); font-size:1.05rem; padding:4px;" onclick="window.editarFinanceiro('${item.id}')" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button type="button" class="btn-icon" style="color:#22c55e; font-size:1.05rem; padding:4px;" onclick="window.alternarPagoFinanceiro('${item.id}')" title="Alterar status"><i class="fa-solid fa-circle-check"></i></button>
                    <button type="button" class="btn-icon" style="color:var(--danger-color); font-size:1.05rem; padding:4px;" onclick="window.excluirFinanceiro('${item.id}')" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    mostrarLembretesFinanceiros();
};

window.atualizarSelecaoFinanceiro = function() {
    const checks = Array.from(document.querySelectorAll('.financeiro-check'));
    const selecionados = checks.filter(input => input.checked);
    const total = checks.length;
    const resumo = document.getElementById('financeiroResumoLista');
    if (resumo) {
        const base = `${total} registro(s)`;
        resumo.textContent = selecionados.length ? `${base} | ${selecionados.length} selecionado(s)` : base;
    }
    const todos = document.getElementById('financeiroSelecionarTodos');
    if (todos) {
        todos.checked = total > 0 && selecionados.length === total;
        todos.indeterminate = selecionados.length > 0 && selecionados.length < total;
    }
    const btn = document.getElementById('btnExcluirFinanceiroSelecionados');
    if (btn) btn.style.display = selecionados.length ? 'inline-flex' : 'none';
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
        if (!silencioso) alert('Este documento nao possui arquivo local carregado para leitura. Abra/anexe o PDF novamente para analisar.');
        return false;
    }
    try {
        const { dados, usouIA } = await extrairDadosFinanceirosDoAnexo(anexo);
        if (!dados) {
            if (!silencioso) alert('Nao foi possivel identificar os dados deste documento.');
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
        renderFinanceiro();
        if (!silencioso) alert(`Documento analisado${usouIA ? ' com apoio da IA' : ''}. Confira o valor e vencimento na lista.`);
        return true;
    } catch (error) {
        console.error('Falha ao analisar documento financeiro:', error);
        if (!silencioso) alert(error.message || 'Nao foi possivel analisar este documento.');
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
        alert('Selecione pelo menos um lanÃ§amento para excluir.');
        return;
    }
    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir ${ids.length} lanÃ§amento(s) financeiro(s)?`);
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
    const autorizado = await window.confirmarExclusaoComSenha('Deseja excluir este lancamento financeiro?');
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
    }).join('') : '<tr><td colspan="6" style="text-align:center; padding:22px; color:var(--text-muted);">Nenhum lanÃ§amento no perÃ­odo selecionado.</td></tr>';

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
        alert('Selecione pelo menos um lanÃ§amento para gerar o relatÃ³rio.');
        return;
    }
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para imprimir o relatÃ³rio.');
        return;
    }
    win.document.write(`
        <html><head><title>RelatÃ³rio Financeiro</title><style>
            body{font-family:Arial,sans-serif;padding:24px;color:#111827} h1{margin-bottom:4px}
            table{width:100%;border-collapse:collapse;margin-top:18px} th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}
            th{background:#f3f4f6} .total{font-size:20px;font-weight:bold;color:#dc2626;margin-top:16px}
        </style></head><body>
            <h1>RelatÃ³rio Financeiro - ${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}</h1>
            <p>PerÃ­odo: ${dataBR(document.getElementById('financeiroRelatorioInicio').value)} atÃ© ${dataBR(document.getElementById('financeiroRelatorioFim').value)}</p>
            <div class="total">Valor total: ${formatarMoeda(total)}</div>
            <table><thead><tr><th>Tipo</th><th>DescriÃ§Ã£o</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead><tbody>
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
            ? 'Preencha tipo, descricao e valor.'
            : 'Preencha tipo, descricao, vencimento e valor.');
        return;
    }

    const id = document.getElementById('financeiroId').value || `fin_${Date.now()}`;
    const lista = obterLancamentosFinanceiros();
    const existente = lista.find(item => item.id === id);
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
        .financeiro-folder-board { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:18px; }
        .financeiro-folder-card { text-align:left; border:1px solid rgba(148,163,184,0.22); border-radius:10px; padding:12px; min-height:118px; background:linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02)); color:var(--text-color); cursor:pointer; display:flex; flex-direction:column; gap:5px; box-shadow:0 10px 26px rgba(0,0,0,0.18); }
        .financeiro-folder-card i { color:var(--folder-color); font-size:1.25rem; }
        .financeiro-folder-card span { font-weight:900; color:#f8fafc; }
        .financeiro-folder-card strong { color:var(--folder-color); font-size:1.05rem; }
        .financeiro-folder-card small, .financeiro-folder-card em { color:var(--text-muted); font-style:normal; font-size:.76rem; line-height:1.25; }
        .financeiro-folder-card.active { border-color:var(--folder-color); background:linear-gradient(180deg, color-mix(in srgb, var(--folder-color) 18%, rgba(255,255,255,0.04)), rgba(255,255,255,0.03)); box-shadow:0 0 0 1px color-mix(in srgb, var(--folder-color) 30%, transparent), 0 14px 32px rgba(0,0,0,0.24); }
        .financeiro-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; border-bottom:1px solid var(--panel-border); padding-bottom:12px; }
        .btn-tab-financeiro { min-height:34px; background:rgba(255,255,255,0.03); border:1px solid var(--panel-border); color:var(--text-muted); border-radius:7px; padding:8px 12px; font-weight:800; cursor:pointer; display:flex; gap:7px; align-items:center; white-space:nowrap; }
        .btn-tab-financeiro.active { color:var(--accent-color); border-color:var(--accent-color); background:rgba(107,142,35,0.12); }
        .financeiro-form-card, .financeiro-list-card { padding:18px; margin-bottom:18px; max-width:1120px; margin-left:auto; margin-right:auto; }
        .financeiro-form-card > div:first-child { align-items:center !important; gap:12px; }
        .financeiro-form-grid { display:grid; grid-template-columns: 140px 170px 120px minmax(240px, 1fr) 125px 110px 92px; grid-template-areas:
            "pasta subpasta tipo desc venc valor status"
            "situacao situacao situacao situacao situacao situacao situacao"
            "doc doc doc doc doc doc doc"
            "obs obs obs obs obs obs obs"
            ". . . . . save save"; gap:12px; align-items:end; }
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
        .financeiro-form-grid .input-group label { min-height:14px; margin-bottom:5px; font-size:0.68rem; letter-spacing:.02em; }
        .financeiro-form-grid input,
        .financeiro-form-grid select,
        .financeiro-form-grid textarea { width:100%; min-height:38px; border-radius:7px; box-sizing:border-box; }
        .financeiro-form-grid textarea { min-height:96px; resize:vertical; }
        .financeiro-form-grid small { display:block; margin-top:5px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-obs { grid-column:auto; }
        .financeiro-form-actions { display:flex; align-items:center; justify-content:flex-end; height:auto; min-height:40px; }
        .financeiro-form-actions .btn-primary,
        .financeiro-form-actions .btn-secondary,
        .financeiro-form-actions .btn-danger { min-height:40px; width:100%; justify-content:center; white-space:nowrap; }
        .fin-save .btn-primary { max-width:190px; min-width:170px; margin-left:auto; }
        #btnLerDocumentoFinanceiro { min-height:38px; line-height:1.1; white-space:nowrap; }
        .financeiro-status-toggle { width:92px; min-height:38px; border:1px solid rgba(239,68,68,0.35); background:rgba(239,68,68,0.12); color:#ef4444; border-radius:7px; padding:6px 8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:.68rem; line-height:1.05; text-align:center; font-weight:900; cursor:pointer; }
        .financeiro-status-toggle input { width:14px !important; height:14px; min-height:14px; flex:0 0 auto; }
        .financeiro-status-toggle:has(input:checked) { border-color:rgba(16,185,129,0.45); background:rgba(16,185,129,0.12); color:#10b981; }
        .financeiro-file-row { display:grid; grid-template-columns:140px 110px minmax(220px, 1fr) 42px; gap:10px; align-items:center; max-width:100%; }
        .financeiro-file-row input[type="file"] { position:absolute; opacity:0; width:1px; height:1px; pointer-events:none; }
        .financeiro-file-compact { min-height:38px; border:1px solid var(--panel-border); border-radius:7px; background:#0f172a; color:#f8fafc; display:flex; align-items:center; justify-content:center; gap:6px; font-size:.78rem; font-weight:900; cursor:pointer; margin:0 !important; }
        .financeiro-file-row small { margin:0; align-self:center; }
        .financeiro-file-row .btn-secondary { min-width:42px; width:42px; min-height:38px; padding:0; display:grid; place-items:center; }
        .financeiro-form-clean .fin-doc { grid-column:1 / -1 !important; grid-area:doc !important; width:100% !important; }
        .financeiro-form-clean .fin-obs { grid-column:1 / -1 !important; grid-area:obs !important; width:100% !important; }
        .financeiro-form-clean .fin-save { grid-column:6 / -1 !important; grid-area:save !important; width:100% !important; }
        .financeiro-form-clean .fin-obs textarea { width:100% !important; min-height:104px !important; display:block !important; }
        .financeiro-form-clean .financeiro-file-row { width:100% !important; display:grid !important; grid-template-columns:140px 120px minmax(260px, 1fr) 44px !important; gap:10px !important; align-items:center !important; }
        .financeiro-form-clean .financeiro-file-compact { min-height:38px !important; height:38px !important; border:1px solid var(--panel-border) !important; border-radius:7px !important; background:#0f172a !important; color:#f8fafc !important; display:flex !important; align-items:center !important; justify-content:center !important; gap:6px !important; font-size:.78rem !important; font-weight:900 !important; cursor:pointer !important; margin:0 !important; padding:0 10px !important; letter-spacing:0 !important; text-transform:none !important; }
        .financeiro-form-clean #financeiroDocumentoNome { margin:0 !important; font-size:.82rem !important; color:#d1d5db !important; line-height:38px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; }
        .financeiro-form-clean #btnLerDocumentoFinanceiro { width:44px !important; min-width:44px !important; height:38px !important; min-height:38px !important; padding:0 !important; display:grid !important; place-items:center !important; }
        .financeiro-list-header { display:grid; grid-template-columns: minmax(170px, 1fr) auto; gap:12px; align-items:center; margin-bottom:14px; }
        .financeiro-list-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; align-items:center; }
        .financeiro-list-actions button { min-height:38px; white-space:nowrap; }
        .financeiro-filtros { grid-column:1 / -1; display:grid; grid-template-columns: minmax(110px, .7fr) minmax(180px, .95fr) minmax(220px, 1.4fr); gap:8px; max-width:620px; }
        .financeiro-filtros select, .financeiro-filtros input { min-height:36px; border-radius:7px; border:1px solid var(--panel-border); background:rgba(15,23,42,0.7); color:var(--text-color); padding:0 10px; }
        .financeiro-table { width:100%; border-collapse:collapse; min-width:860px; }
        .financeiro-table th { text-align:left; color:var(--text-muted); font-size:0.72rem; text-transform:uppercase; padding:9px 10px; border-bottom:1px solid var(--panel-border); }
        .financeiro-table td { padding:10px; border-bottom:1px solid rgba(148,163,184,0.15); vertical-align:middle; }
        .financeiro-table td small { display:block; color:var(--text-muted); margin-top:4px; max-width:320px; }
        .financeiro-status-badge { border-radius:999px; padding:5px 10px; font-size:0.78rem; font-weight:900; white-space:nowrap; }
        .financeiro-status-badge.pago { color:#10b981; background:rgba(16,185,129,0.12); }
        .financeiro-status-badge.aberto { color:#f59e0b; background:rgba(245,158,11,0.12); }
        .financeiro-status-badge.pendente { color:#f97316; background:rgba(249,115,22,0.16); }
        .financeiro-status-badge.vencido { color:#ef4444; background:rgba(239,68,68,0.12); }
        .financeiro-acoes, .financeiro-link { display:flex; gap:8px; align-items:center; }
        .financeiro-acoes button, .financeiro-link { cursor:pointer; text-decoration:none; }
        .financeiro-doc-chip { border:1px solid color-mix(in srgb, var(--doc-color) 42%, transparent); background:color-mix(in srgb, var(--doc-color) 13%, transparent); color:var(--doc-color); border-radius:999px; min-height:28px; padding:3px 8px; display:inline-flex; align-items:center; gap:5px; font-size:.72rem; font-weight:900; margin:2px; }
        .financeiro-doc-chip span { max-width:86px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
        .financeiro-menu-alerta { position:relative; animation: financeiroMenuGlow 1.1s ease-in-out infinite; }
        .financeiro-menu-alerta::after { content:''; width:9px; height:9px; border-radius:999px; background:#f59e0b; box-shadow:0 0 12px #f59e0b; margin-left:auto; }
        @keyframes financeiroPulse { 0%,100% { box-shadow:0 18px 50px rgba(0,0,0,.45), 0 0 0 rgba(245,158,11,0); } 50% { box-shadow:0 18px 50px rgba(0,0,0,.45), 0 0 22px rgba(245,158,11,.42); } }
        @keyframes financeiroMenuGlow { 0%,100% { filter:none; } 50% { filter:brightness(1.35); } }
        @keyframes financeiroTicker { 0%,12% { transform:translateX(0); } 88%,100% { transform:translateX(-12%); } }
        @media (max-width: 1100px) {
            .financeiro-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-areas:
                "pasta subpasta"
                "tipo desc"
                "venc valor"
                "status status"
                "situacao situacao"
                "doc doc"
                "obs obs"
                "save save"; }
            .fin-save .btn-primary { max-width:220px; }
            .financeiro-status-toggle { width:100%; max-width:120px; }
            .financeiro-list-header { grid-template-columns:1fr; }
            .financeiro-list-header > div:nth-child(2) { justify-content:flex-start; }
        }
        @media (max-width: 680px) {
            .financeiro-form-grid { grid-template-columns: 1fr; grid-template-areas:
                "pasta"
                "subpasta"
                "tipo"
                "desc"
                "venc"
                "valor"
                "status"
                "situacao"
                "doc"
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
    `;
    document.head.appendChild(style);
}

function prepararDocumentoRelatorioFinanceiro() {
    const selecionados = new Set(Array.from(document.querySelectorAll('.financeiro-relatorio-check:checked')).map(input => input.value));
    const lista = financeiroRelatorioAtual.filter(item => selecionados.has(item.id));
    if (lista.length === 0) {
        alert('Selecione pelo menos um lancamento para gerar o relatorio.');
        return false;
    }
    const total = lista.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const contentHtml = `
        <div class="doc-header">
            <div><img src="logo.png" alt="Serraria" class="doc-logo" onerror="this.style.display='none'"></div>
            <div class="doc-title"><h1>Relatorio Financeiro</h1><p>${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}</p></div>
        </div>
        <div class="doc-note"><strong>Periodo:</strong> ${dataBR(document.getElementById('financeiroRelatorioInicio').value)} ate ${dataBR(document.getElementById('financeiroRelatorioFim').value)}<br><strong>Valor total:</strong> <span class="doc-money">${formatarMoeda(total)}</span></div>
        <table class="doc-table"><thead><tr><th>Tipo</th><th>Descricao</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead><tbody>${lista.map(item => `<tr><td>${item.tipo}</td><td>${item.descricao}</td><td>${dataBR(item.vencimento)}</td><td>${obterStatusItem(item).label}</td><td class="doc-money">${formatarMoeda(item.valor)}</td></tr>`).join('')}</tbody></table>
    `;
    window.financeiroDocAtual = { title: `Relatorio Financeiro ${FINANCEIRO_ABAS[financeiroAbaAtiva].titulo}`, filename: `financeiro-${financeiroAbaAtiva}`, contentHtml };
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
    migrarArquivosFinanceirosLocal()
        .catch(error => console.warn('Nao foi possivel migrar anexos financeiros locais.', error))
        .finally(renderFinanceiro);
});

window.SectionLoader?.register('view-financeiro', carregarFinanceiroNuvem);


