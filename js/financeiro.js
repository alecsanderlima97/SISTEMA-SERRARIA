import { auth } from './firebase-init.js';

console.log("Modulo Financeiro: inicializando...");

const FINANCEIRO_KEY = 'orquestra_financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_KEY = 'orquestra_financeiro_relatorios_mensais';
const FINANCEIRO_AI_USAGE_KEY = 'orquestra_financeiro_ai_usage';
const FINANCEIRO_UI_STATE_KEY = 'orquestra_financeiro_ui_state';
const FINANCEIRO_DB_NAME = 'orquestra_financeiro_arquivos';
const FINANCEIRO_DB_STORE = 'anexos';
const FINANCEIRO_COLLECTION = 'financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_COLLECTION = 'financeiro_relatorios_mensais';
const FINANCEIRO_NOTIFICACOES_LIDAS_KEY = 'orquestra_financeiro_notificacoes_lidas';
const SIGEWIN_LOCAL_API = 'http://127.0.0.1:8766';
const SIGEWIN_SYNC_STATE_KEY = 'orquestra_financeiro_sigewin_sync_v1';

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
    notas: { titulo: 'Notas fiscais', icone: 'fa-file-invoice', cor: '#f59e0b', subpastas: ['COMPRAS', 'SERVICOS', 'OUTRAS NOTAS'] },
    comprovantes: { titulo: 'Comprovantes', icone: 'fa-receipt', cor: '#22c55e', subpastas: ['SICREDI', 'PIX', 'OUTROS COMPROVANTES'] },
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
let financeiroDadosLeituraTemp = null;
let financeiroRelatorioAtual = [];
let financeiroNuvemCarregada = false;
let financeiroOrdenacaoTabela = { campo: 'vencimento', direcao: 'asc' };
let financeiroClassificacaoManual = false;

// Classe do documento: cada um no seu lugar (comprovante nao e boleto; nota nao e cobranca).
const FIN_REGEX_COMPROVANTE_NOME = /^SICREDI[\s_-]*\d{6,}(?:\.PDF)?$/;
function classeDocumentoFinanceiro(item = {}) {
    const doc = item.documento || (Array.isArray(item.documentosVinculados) ? item.documentosVinculados[0] : null) || {};
    const cat = String(doc.categoria || '').toLowerCase();
    const sem = v => normalizarTexto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tipo = sem(item.tipo);
    const desc = sem(item.descricao);
    const nome = sem(doc.nome || '').replace(/^.*[\\/]/, '');
    if (cat === 'comprovante' || /COMPROVANTE/.test(tipo) || /COMPROVANTE/.test(desc)
        || FIN_REGEX_COMPROVANTE_NOME.test(desc) || FIN_REGEX_COMPROVANTE_NOME.test(nome)) return 'comprovante';
    if (financeiroEhNotaFiscal(item)) return 'nota';
    if (cat === 'boleto' || /BOLETO|BLOQUETO|COBRANCA|FICHA DE COMPENSACAO/.test(tipo)) return 'boleto';
    return 'outro';
}

function obterPastaFinanceiraItem(item = {}) {
    if (item.pastaFinanceira) return item.pastaFinanceira;
    const classe = classeDocumentoFinanceiro(item);
    if (classe === 'comprovante') return 'comprovantes';
    if (classe === 'nota') return 'notas';
    const tipo = normalizarTexto(item.tipo);
    const desc = normalizarTexto(`${item.descricao || ''} ${item.observacao || ''}`);
    if (item.conferenciaStatus === 'pendente') return 'conferir';
    if (/IMPOSTO|DARF|FGTS|INSS|RECEITA|SINDICATO|TAXA/.test(`${tipo} ${desc}`)) return 'impostos';
    if (/FUNCIONARIO|FUNCIONÁRIO|HOLERITE|VALE|SALARIO|SALÁRIO/.test(`${tipo} ${desc}`)) return 'funcionarios';
    if (/ENERGIA|INTERNET|TELEFONE|ALUGUEL|CONTABILIDADE|SISTEMA/.test(desc)) return 'fixas';
    if (/FORNECEDOR|AIR EXPRESS|MATERIAIS|SERVICO|SERVIÇO/.test(desc)) return 'fornecedores';
    if (/BOLETO|COBRANCA|COBRANÇA|PARCELA/.test(`${tipo} ${desc}`)) return 'boletos';
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

function obterClassificacaoFinanceiraAutomatica(item = {}) {
    const pasta = obterPastaFinanceiraItem(item);
    const subpasta = obterSubpastaFinanceiraItem({ ...item, pastaFinanceira: pasta });
    return { pasta, subpasta };
}

function atualizarClassificacaoFinanceiraUI(item = {}) {
    const classificacao = obterClassificacaoFinanceiraAutomatica(item);
    const pasta = document.getElementById('financeiroPasta');
    const subpasta = document.getElementById('financeiroSubpasta');
    const resumo = document.getElementById('financeiroClassificacaoResumo');
    if (pasta && !financeiroClassificacaoManual && Array.from(pasta.options).some(option => option.value === classificacao.pasta)) {
        pasta.value = classificacao.pasta;
    }
    if (subpasta && !financeiroClassificacaoManual) subpasta.value = classificacao.subpasta;
    if (resumo) {
        const pastaTitulo = FINANCEIRO_PASTAS[classificacao.pasta]?.titulo || classificacao.pasta;
        resumo.textContent = financeiroClassificacaoManual
            ? 'Classificação manual ativada.'
            : `Classificação automática: ${pastaTitulo} / ${classificacao.subpasta}`;
    }
}

window.alternarClassificacaoFinanceira = function() {
    financeiroClassificacaoManual = !financeiroClassificacaoManual;
    document.querySelectorAll('.financeiro-classificacao-manual').forEach(elemento => {
        elemento.hidden = !financeiroClassificacaoManual;
    });
    const botao = document.getElementById('btnAlternarClassificacaoFinanceira');
    if (botao) {
        botao.innerHTML = financeiroClassificacaoManual
            ? '<i class="fa-solid fa-wand-magic-sparkles"></i> Usar classificação automática'
            : '<i class="fa-solid fa-sliders"></i> Ajustar manualmente';
    }
    atualizarClassificacaoFinanceiraUI({
        tipo: document.getElementById('financeiroTipo')?.value || '',
        descricao: document.getElementById('financeiroDescricao')?.value || '',
        observacao: document.getElementById('financeiroObservacao')?.value || '',
        conferenciaStatus: 'conferido'
    });
};

// Regra da empresa: nota aguardando boleto ha mais de 5 dias, sem boleto ligado e sem parcelas/boleto
// no XML, foi paga a vista. Nao grava nada: se o boleto chegar e for ligado, o status muda sozinho.
const FIN_DIAS_NOTA_A_VISTA = 5;
function notaPresumidaAVistaFinanceiro(item = {}) {
    if (item.pago || item.situacaoDocumento !== 'AGUARDANDO_BOLETO' || item.conferenciaStatus === 'pendente') return false;
    if (item.processoVinculoId && item.processoVinculoStatus === 'CONFIRMADO') return false;
    if ((item.ia?.parcelas || []).length || /BOLETO|DUPLICATA/i.test(item.ia?.formaPagamento || '')) return false;
    const base = item.dataEmissao || item.emissao || String(item.criadoEm || '').slice(0, 10);
    if (!base) return false;
    const dias = (Date.now() - new Date(`${base}T12:00:00`).getTime()) / 86400000;
    return dias > FIN_DIAS_NOTA_A_VISTA;
}

function obterStatusFinanceiro(item = {}) {
    if (item.pago || item.situacaoDocumento === 'PAGO_A_VISTA') return 'PAGO';
    if (notaPresumidaAVistaFinanceiro(item)) return 'PAGO';
    if (item.conferenciaStatus === 'pendente' || ['AGUARDANDO_BOLETO', 'AGUARDANDO_NOTA'].includes(item.situacaoDocumento)) return 'PENDENTE';
    if (estaVencido(item)) return 'VENCIDO';
    return financeiroGeraCobranca(item) ? 'A_PAGAR' : 'REGISTRADO';
}

function criarProcessoFinanceiro(item = {}, documentos = []) {
    const processoAnterior = item.processoFinanceiro || {};
    const processoId = item.processoId || processoAnterior.id || item.id || '';
    return {
        id: processoId,
        status: obterStatusFinanceiro(item),
        natureza: financeiroGeraCobranca(item) ? 'CONTAS_A_PAGAR' : 'DOCUMENTO_FINANCEIRO',
        valor: Number(item.valor || 0),
        vencimento: item.vencimento || '',
        dataEmissao: item.dataEmissao || item.emissao || '',
        documentos: documentos.map(documento => documento.id).filter(Boolean),
        atualizadoEm: item.atualizadoEm || item.criadoEm || new Date().toISOString()
    };
}

function normalizarLancamentoFinanceiro(item = {}) {
    if (!item || typeof item !== 'object') return item;

    const documentos = normalizarDocumentosVinculadosFinanceiro(item);
    const documentoPrincipal = item.documento || documentos.find(documento => documento.categoria !== 'comprovante') || null;
    const comprovantePrincipal = item.comprovante || documentos.find(documento => documento.categoria === 'comprovante') || null;
    const normalizado = {
        ...item,
        aba: item.aba || 'caixa-financeira',
        pastaFinanceira: item.pastaFinanceira || obterPastaFinanceiraItem(item),
        subpastaFinanceira: item.subpastaFinanceira || obterSubpastaFinanceiraItem(item),
        documentosVinculados: documentos,
        documento: documentoPrincipal,
        comprovante: comprovantePrincipal,
        geraCobranca: item.geraCobranca !== false && !financeiroEhNotaFiscal(item),
        pago: Boolean(item.pago),
        conferenciaStatus: item.conferenciaStatus || (['AGUARDANDO_BOLETO', 'AGUARDANDO_NOTA'].includes(item.situacaoDocumento) ? 'pendente' : 'conferido')
    };
    normalizado.statusFinanceiro = obterStatusFinanceiro(normalizado);
    normalizado.processoId = item.processoId || item.processoFinanceiro?.id || item.id || '';
    normalizado.processoFinanceiro = criarProcessoFinanceiro(normalizado, documentos);
    return normalizado;
}

function normalizarMetadadosLeituraFinanceira(dados = {}, anexo = null) {
    const metadados = {
        fornecedor: normalizarTexto(dados.fornecedor || ''),
        cnpj: String(dados.cnpj || '').trim(),
        numeroDocumento: String(dados.numeroDocumento || '').trim(),
        serie: String(dados.serie || '').trim(),
        chaveNfe: String(dados.chaveNfe || dados.chaveNFe || dados.chave || '').trim(),
        destinatario: normalizarTexto(dados.destinatario || ''),
        destinatarioCnpj: String(dados.destinatarioCnpj || '').trim(),
        linhaDigitavel: String(dados.linhaDigitavel || '').trim(),
        codigoBarras: String(dados.codigoBarras || '').trim(),
        banco: String(dados.banco || '').trim(),
        nossoNumero: String(dados.nossoNumero || dados.nossoNumeroBoleto || '').trim(),
        produtos: Array.isArray(dados.produtos) ? dados.produtos.slice(0, 200) : [],
        parcelas: Array.isArray(dados.parcelas) ? dados.parcelas.slice(0, 24) : [],
        formaPagamento: dados.pagamento?.descricao || '',
        confianca: dados.confiancaIA || dados.confianca || 'media',
        confiancaData: dados.confiancaData || dados.confiancaVencimento || 'media',
        fonteVencimento: dados.fonteVencimento || '',
        observacao: dados.observacaoIA || dados.observacao || '',
        analisadoPorIA: Boolean(dados.analisadoPorIA),
        arquivoNome: anexo?.nome || ''
    };
    return Object.fromEntries(Object.entries(metadados).filter(([, valor]) => valor !== '' && valor !== null && valor !== undefined));
}

function financeiroEhNotaFiscal(item = {}) {
    const tipoExplicito = normalizarTexto(item.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/BOLETO|COMPROVANTE|IMPOSTO|^CONTA/.test(tipoExplicito)) return false;
    const categoria = normalizarCategoriaDocumentoFinanceiro(item.documento?.categoria || item.categoriaDocumento || '');
    const texto = normalizarTexto([
        item.tipo,
        item.descricao,
        item.observacao,
        item.documento?.nome,
        item.ia?.numeroDocumento
    ].filter(Boolean).join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return categoria === 'nota_fiscal'
        || categoria === 'xml'
        || item.situacaoDocumento === 'AGUARDANDO_BOLETO'
        || /(?:^|[^A-Z0-9])(?:NOTA FISCAL|DANFE|NF-?E|NFS-?E)(?![A-Z])/.test(texto);
}

function financeiroGeraCobranca(item = {}) {
    if (item.geraCobranca === false) return false;
    if (financeiroEhNotaFiscal(item)) return false;
    if (classeDocumentoFinanceiro(item) === 'comprovante') return false;
    return true;
}

window.financeiroGeraCobranca = financeiroGeraCobranca;

function obterDataFinanceiroExibicao(item = {}) {
    if (financeiroEhNotaFiscal(item)) return item.dataEmissao || item.emissao || '';
    return item.vencimento || item.dataEmissao || '';
}

function obterDataFinanceiroOrdenacao(item = {}) {
    return obterDataFinanceiroExibicao(item) || item.criadoEm || item.atualizadoEm || '';
}

function obterStatusOrdemFinanceiro(item = {}) {
    const status = obterStatusFinanceiro(item);
    if (status === 'VENCIDO') return 0;
    if (status === 'PENDENTE') return 1;
    if (status === 'A_PAGAR') return 2;
    if (status === 'REGISTRADO') return 3;
    if (status === 'PAGO') return 4;
    return 5;
}

function obterLancamentosFinanceiros() {
    try {
        const registros = JSON.parse(localStorage.getItem(FINANCEIRO_KEY) || '[]');
        return Array.isArray(registros) ? registros.map(normalizarLancamentoFinanceiro) : [];
    } catch (error) {
        console.warn('Não foi possível ler os lançamentos financeiros locais.', error);
        return [];
    }
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
    const leves = (lista || []).map(item => limparDadosPesadosFinanceiro(normalizarLancamentoFinanceiro(item)));
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
    if (/(?:^|[^A-Z0-9])(?:NOTA FISCAL|DANFE|NF-?E|NFS-?E)(?![A-Z])/.test(`${nome} ${texto}`)) return 'nota_fiscal';
    const nomeBase = nome.replace(/^.*[\\/]/, '');
    if (/COMPROVANTE|PAGAMENTO REALIZADO|PAGAMENTO EFETUADO|AUTENTICA[CÇ][AÃ]O MEC/.test(`${nome} ${texto}`) || FIN_REGEX_COMPROVANTE_NOME.test(nomeBase)) return 'comprovante';
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

function limparNomeArquivoDuplicidadeFinanceira(nome = '') {
    return normalizarAssinaturaFinanceira(nome)
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/\s*\(\d+\)\s*$/g, '')
        .replace(/\s+-\s+cop[ií]a$/g, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizarDescricaoDuplicidadeFinanceira(valor = '') {
    const texto = normalizarTexto(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\.[A-Z0-9]{2,5}$/g, '')
        .replace(/\s*\(\d+\)\s*$/g, '')
        .replace(/IMPORTADO\s+(RAPIDO\s+)?(DA\s+PASTA|DA\s+FILA|PELO\s+MONITOR)\s+FINANCEIRA\s*:?.*$/g, '')
        .replace(/GUIAPAGAMENTO[_\s-]*/g, 'GUIA PAGAMENTO ')
        .replace(/[-_]+/g, ' ')
        .replace(/[^A-Z0-9/ ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!texto || ['DOCUMENTO', 'BOLETO', 'IMPOSTO', 'NOTA FISCAL', 'PENDENTE DE CONFERENCIA'].includes(texto)) return '';
    return texto.slice(0, 80);
}

function valorCentavosFinanceiro(valor) {
    const numero = Number(valor || 0);
    return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}

function grupoTipoFinanceiro(item = {}) {
    const texto = normalizarDescricaoDuplicidadeFinanceira(`${item.tipo || ''} ${item.descricao || ''} ${item.ia?.fornecedor || ''}`);
    if (/NOTA FISCAL|DANFE|NFE|NF E|XML/.test(texto)) return 'NOTA_FISCAL';
    if (/IMPOSTO|DARF|FGTS|INSS|RECEITA|SINDICATO|TAXA/.test(texto)) return 'IMPOSTO';
    if (/BOLETO|BLOQUETO|SICREDI|COBRANCA|FICHA DE COMPENSACAO/.test(texto)) return 'BOLETO';
    return normalizarDescricaoDuplicidadeFinanceira(item.tipo || 'DOCUMENTO') || 'DOCUMENTO';
}

function extrairIdentificadoresFinanceiros(item = {}) {
    const ia = item.ia || {};
    const texto = normalizarTexto([
        item.descricao,
        item.observacao,
        ia.fornecedor,
        ia.cnpj,
        ia.numeroDocumento,
        ia.chaveNfe,
        ia.linhaDigitavel,
        ia.codigoBarras,
        ia.nossoNumero,
        item.documento?.nome,
        item.documento?.localPath
    ].filter(Boolean).join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ids = new Set();
    const linhaDigitavel = texto.match(/\b\d{5}\.?\d{5}\s?\d{5}\.?\d{6}\s?\d{5}\.?\d{6}\s?\d\s?\d{14}\b/g) || [];
    linhaDigitavel.forEach(valor => ids.add(`linha:${valor.replace(/\D/g, '')}`));
    const numerosLongos = texto.match(/\b\d{20,60}\b/g) || [];
    numerosLongos.forEach(valor => ids.add(`num:${valor}`));
    const cnpjs = texto.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g) || [];
    cnpjs.forEach(valor => ids.add(`cnpj:${valor.replace(/\D/g, '')}`));
    const chaveNfe = String(ia.chaveNfe || ia.chaveNFe || '').replace(/\D/g, '');
    if (chaveNfe.length >= 44) ids.add(`nfe:${chaveNfe}`);
    const linhaDireta = String(ia.linhaDigitavel || '').replace(/\D/g, '');
    if (linhaDireta.length >= 44) ids.add(`linha:${linhaDireta}`);
    const codigoBarras = String(ia.codigoBarras || '').replace(/\D/g, '');
    if (codigoBarras.length >= 44) ids.add(`barcode:${codigoBarras}`);
    const nossoNumero = normalizarDescricaoDuplicidadeFinanceira(ia.nossoNumero || ia.nossoNumeroBoleto || '');
    if (nossoNumero.length >= 4) ids.add(`nosso:${nossoNumero}`);
    const numeroDocumento = normalizarDescricaoDuplicidadeFinanceira(ia.numeroDocumento || '');
    if (numeroDocumento && numeroDocumento.length >= 4) ids.add(`doc:${numeroDocumento}`);
    return Array.from(ids);
}

function chavesFortesVinculoFinanceiro(item = {}) {
    return extrairIdentificadoresFinanceiros(item)
        .filter(chave => /^(nfe|linha|barcode):/.test(chave));
}

function normalizarFornecedorVinculoFinanceiro(item = {}) {
    return normalizarTexto(item.ia?.fornecedor || item.fornecedor || '').replace(/[^A-Z0-9]/g, '');
}

function diferencaDiasFinanceiro(dataA, dataB) {
    if (!dataA || !dataB) return null;
    const primeiro = new Date(`${dataA}T12:00:00`);
    const segundo = new Date(`${dataB}T12:00:00`);
    if (Number.isNaN(primeiro.getTime()) || Number.isNaN(segundo.getTime())) return null;
    return Math.abs(primeiro.getTime() - segundo.getTime()) / 86400000;
}

function grupoVinculoFinanceiro(item = {}) {
    const classe = classeDocumentoFinanceiro(item);
    if (classe === 'comprovante') return 'COMPROVANTE';
    if (classe === 'nota') return 'NOTA_FISCAL';
    const tipo = normalizarTexto(item.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/(?:^|[^A-Z0-9])(?:NOTA FISCAL|DANFE|NF-?E|NFS-?E|XML)(?![A-Z])/.test(tipo)) return 'NOTA_FISCAL';
    if (/BOLETO|BLOQUETO|COBRANCA|FICHA DE COMPENSACAO/.test(tipo)) return 'BOLETO';
    if (/COMPROVANTE|PAGAMENTO|PIX|TRANSFERENCIA/.test(tipo)) return 'COMPROVANTE';
    return grupoTipoFinanceiro(item);
}

// Numero da nota sem zeros a esquerda (boleto costuma trazer "19541/1" ou "000019541-01").
function numeroNotaVinculoFinanceiro(item = {}) {
    const bruto = String(item.ia?.numeroDocumento || '').trim();
    const chave = String(item.ia?.chaveNfe || '').replace(/\D/g, '');
    const numero = bruto ? bruto.split(/[\/\-\s]/)[0].replace(/\D/g, '') : (chave.length === 44 ? chave.slice(25, 34) : '');
    const limpo = numero.replace(/^0+/, '');
    return limpo.length >= 3 ? limpo : '';
}

function obterSugestoesVinculoFinanceiro(registro, lista = []) {
    const gruposVinculaveis = new Set(['NOTA_FISCAL', 'BOLETO', 'COMPROVANTE']);
    const grupoAtual = grupoVinculoFinanceiro(registro);
    if (!gruposVinculaveis.has(grupoAtual)) return [];
    const fortesAtuais = new Set(chavesFortesVinculoFinanceiro(registro));
    const cnpjAtual = String(registro.ia?.cnpj || '').replace(/\D/g, '');
    const fornecedorAtual = normalizarFornecedorVinculoFinanceiro(registro);
    const valorAtual = valorCentavosFinanceiro(registro.valor);
    const dataAtual = registro.dataEmissao || registro.emissao || registro.vencimento || '';
    if (!fortesAtuais.size && !cnpjAtual && !fornecedorAtual) return [];

    return lista
        .filter(item => item?.id && item.id !== registro.id)
        .map(item => {
            const grupoItem = grupoVinculoFinanceiro(item);
            if (grupoItem === grupoAtual || !gruposVinculaveis.has(grupoItem)) return null;
            const fortesItem = new Set(chavesFortesVinculoFinanceiro(item));
            const identificadorComum = Array.from(fortesAtuais).find(chave => fortesItem.has(chave));
            const cnpjComum = cnpjAtual && cnpjAtual === String(item.ia?.cnpj || '').replace(/\D/g, '') ? cnpjAtual : '';
            const fornecedorComum = fornecedorAtual && fornecedorAtual === normalizarFornecedorVinculoFinanceiro(item);
            const valoresItem = [valorCentavosFinanceiro(item.valor), ...(item.ia?.parcelas || []).map(p => valorCentavosFinanceiro(p.valor))];
            const valoresAtual = [valorAtual, ...(registro.ia?.parcelas || []).map(p => valorCentavosFinanceiro(p.valor))];
            const mesmoValor = valoresAtual.some(v => v > 0 && valoresItem.includes(v));
            const numA = numeroNotaVinculoFinanceiro(registro), numB = numeroNotaVinculoFinanceiro(item);
            const mesmaNota = Boolean(numA && numB && numA === numB && (cnpjAtual ? (!String(item.ia?.cnpj || '').replace(/\D/g, '') || cnpjAtual === String(item.ia?.cnpj || '').replace(/\D/g, '')) : true));
            const dias = diferencaDiasFinanceiro(dataAtual, item.dataEmissao || item.emissao || item.vencimento || '');
            const dataProxima = dias !== null && dias <= 45;
            if (!identificadorComum && !mesmaNota && !(cnpjComum && mesmoValor && dataProxima) && !(fornecedorComum && mesmoValor && dataProxima)) return null;

            const confianca = (identificadorComum || (mesmaNota && (cnpjComum || mesmoValor))) ? 'alta' : (cnpjComum || mesmaNota ? 'media' : 'baixa');
            return {
                registroId: item.id,
                tipo: item.tipo || 'DOCUMENTO',
                descricao: item.descricao || 'Documento financeiro',
                grupo: grupoItem,
                confianca,
                motivo: identificadorComum
                    ? `Identificador comum: ${identificadorComum.split(':')[0]}`
                    : `${cnpjComum ? 'CNPJ' : 'fornecedor'} + mesmo valor + data próxima`
            };
        })
        .filter(Boolean)
        .sort((a, b) => ({ alta: 0, media: 1, baixa: 2 }[a.confianca] - { alta: 0, media: 1, baixa: 2 }[b.confianca]))
        .slice(0, 3);
}

function obterAssinaturasDocumentoFinanceiro(doc = {}) {
    const assinaturas = [];
    const hash = doc.hashArquivo || doc.sha256 || doc.documentoHash || doc.assinaturaHash;
    const nome = normalizarAssinaturaFinanceira(doc.nome || doc.name || '');
    const nomeLimpo = limparNomeArquivoDuplicidadeFinanceira(doc.nome || doc.name || '');
    const tamanho = Number(doc.tamanho || doc.size || 0);
    const localPath = normalizarAssinaturaFinanceira(doc.localPath || doc.arquivoLocal || '');
    const localUrl = normalizarAssinaturaFinanceira(doc.localUrl || '');

    if (hash) assinaturas.push(`hash:${normalizarAssinaturaFinanceira(hash)}`);
    if (localPath) assinaturas.push(`path:${localPath}`);
    if (localUrl) assinaturas.push(`url:${localUrl}`);
    if (nome && tamanho > 0) assinaturas.push(`name-size:${nome}|${tamanho}`);
    if (nomeLimpo && tamanho > 0) assinaturas.push(`name-clean-size:${nomeLimpo}|${tamanho}`);
    if (nome) assinaturas.push(`name:${nome}`);

    return assinaturas;
}

function obterDocumentosIndexadosFinanceiro(item = {}) {
    return normalizarDocumentosVinculadosFinanceiro(item)
        .concat([item.documento, item.comprovante])
        .filter(Boolean);
}

function obterAssinaturasLancamentoFinanceiro(item = {}) {
    const assinaturas = new Set();
    obterDocumentosIndexadosFinanceiro(item)
        .flatMap(obterAssinaturasDocumentoFinanceiro)
        .forEach(chave => assinaturas.add(chave));

    const vencimento = item.vencimento || '';
    const centavos = valorCentavosFinanceiro(item.valor);
    const descricao = normalizarDescricaoDuplicidadeFinanceira(item.descricao || item.ia?.fornecedor || '');
    const grupo = grupoTipoFinanceiro(item);
    const ids = extrairIdentificadoresFinanceiros(item);

    ids.forEach(id => {
        if (vencimento && centavos > 0) assinaturas.add(`id-valor:${id}|${vencimento}|${centavos}`);
        assinaturas.add(`id:${id}`);
    });

    if (vencimento && centavos > 0 && descricao) {
        assinaturas.add(`meta:${grupo}|${vencimento}|${centavos}|${descricao}`);
    }

    return Array.from(assinaturas);
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

function buscarLancamentoDuplicadoFinanceiro(registro, ignorarRegistroId = '') {
    const assinaturas = new Set(obterAssinaturasLancamentoFinanceiro(registro));
    if (!assinaturas.size) return null;

    const classeRegistro = classeDocumentoFinanceiro(registro);
    for (const item of obterLancamentosFinanceiros()) {
        if (ignorarRegistroId && item.id === ignorarRegistroId) continue;
        // comprovante, boleto e nota da mesma compra compartilham codigos; isso e vinculo, nao duplicidade
        const classeItem = classeDocumentoFinanceiro(item);
        if (classeItem !== classeRegistro && [classeItem, classeRegistro].some(c => ['comprovante', 'boleto', 'nota'].includes(c))) continue;
        const comum = obterAssinaturasLancamentoFinanceiro(item).find(chave => assinaturas.has(chave));
        if (comum) return { item, assinatura: comum };
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

function mensagemLancamentoDuplicadoFinanceiro(registro, duplicado) {
    const item = duplicado?.item || {};
    return [
        `Lançamento duplicado: ${registro.descricao || registro.tipo || 'documento financeiro'}`,
        `Já existe um registro salvo${item.criadoEm ? ` em ${dataHoraBR(item.criadoEm)}` : ''}.`,
        `Registro encontrado: ${item.descricao || item.tipo || 'Documento financeiro'}${item.vencimento ? ` - venc. ${dataBR(item.vencimento)}` : ''}${Number(item.valor || 0) ? ` - ${formatarMoeda(item.valor)}` : ''}.`,
        'A importação foi cancelada para evitar boleto/nota repetido.'
    ].join('\n');
}

function obterIdsDuplicadosFinanceiro(lista = []) {
    const vistos = new Map();
    const duplicados = new Set();
    (lista || []).forEach(item => {
        obterAssinaturasLancamentoFinanceiro(item).forEach(chave => {
            if (!chave.startsWith('meta:') && !chave.startsWith('id-valor:') && !chave.startsWith('hash:') && !chave.startsWith('name-clean-size:')) return;
            if (vistos.has(chave)) {
                duplicados.add(item.id);
                duplicados.add(vistos.get(chave));
            } else {
                vistos.set(chave, item.id);
            }
        });
    });
    return duplicados;
}

function dataOrdenacaoFinanceiro(item = {}) {
    return item.criadoEm || item.atualizadoEm || item.vencimento || '';
}

function obterGruposDuplicadosFinanceiro(lista = []) {
    const grupos = new Map();
    (lista || []).forEach(item => {
        obterAssinaturasLancamentoFinanceiro(item).forEach(chave => {
            if (!chave.startsWith('meta:') && !chave.startsWith('id-valor:') && !chave.startsWith('hash:') && !chave.startsWith('name-clean-size:')) return;
            if (!grupos.has(chave)) grupos.set(chave, []);
            grupos.get(chave).push(item);
        });
    });

    const idsRemover = new Set();
    const detalhes = [];
    grupos.forEach((itens, assinatura) => {
        if (itens.length < 2) return;
        const ordenados = [...itens].sort((a, b) => {
            const dataA = dataOrdenacaoFinanceiro(a);
            const dataB = dataOrdenacaoFinanceiro(b);
            if (dataA !== dataB) return dataA.localeCompare(dataB);
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
        const manter = ordenados[0];
        const remover = ordenados.slice(1).filter(item => !idsRemover.has(item.id));
        remover.forEach(item => idsRemover.add(item.id));
        if (remover.length) detalhes.push({ assinatura, manter, remover });
    });

    return {
        totalRemover: idsRemover.size,
        idsRemover: Array.from(idsRemover),
        detalhes
    };
}

window.preverDuplicadosFinanceiros = function() {
    const resultado = obterGruposDuplicadosFinanceiro(obterLancamentosFinanceiros());
    console.table(resultado.detalhes.flatMap(grupo => grupo.remover.map(item => ({
        removerId: item.id,
        remover: item.descricao || item.tipo || 'Documento',
        vencimento: item.vencimento || '',
        valor: Number(item.valor || 0),
        manterId: grupo.manter.id,
        manter: grupo.manter.descricao || grupo.manter.tipo || 'Documento'
    }))));
    return {
        totalRemover: resultado.totalRemover,
        idsRemover: resultado.idsRemover,
        grupos: resultado.detalhes.length
    };
};

window.limparDuplicadosFinanceiros = async function(confirmado = false) {
    const lista = obterLancamentosFinanceiros();
    const resultado = obterGruposDuplicadosFinanceiro(lista);
    if (!resultado.totalRemover) {
        alert('Nenhum lançamento financeiro duplicado foi encontrado pela regra atual.');
        return { removidos: 0 };
    }

    if (!confirmado) {
        const ok = confirm(`Foram encontrados ${resultado.totalRemover} lançamento(s) financeiro(s) duplicado(s).\n\nVou manter o primeiro lançamento de cada grupo e excluir somente as cópias posteriores.\n\nDeseja continuar?`);
        if (!ok) return { removidos: 0, cancelado: true };
    }

    let removidosNuvem = 0;
    for (const id of resultado.idsRemover) {
        const okNuvem = await excluirFinanceiroNuvem(id);
        if (!okNuvem) {
            alert('A limpeza foi interrompida porque um duplicado não pôde ser removido da nuvem. Nenhuma exclusão local adicional será feita agora.');
            return { removidos: removidosNuvem, interrompido: true };
        }
        removidosNuvem++;
    }

    const remover = new Set(resultado.idsRemover);
    salvarLancamentosFinanceiros(lista.filter(item => !remover.has(item.id)));
    renderFinanceiro();
    alert(`${resultado.totalRemover} lançamento(s) duplicado(s) removido(s).`);
    return { removidos: resultado.totalRemover };
};

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
    return limparDadosPesadosFinanceiro(normalizarLancamentoFinanceiro(item));
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
    if (item.pago || !item.vencimento || !financeiroGeraCobranca(item)) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(`${item.vencimento}T12:00:00`) < hoje;
}

function diasAteVencimentoFinanceiro(item) {
    if (!item.vencimento || !financeiroGeraCobranca(item)) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(`${item.vencimento}T00:00:00`);
    vencimento.setHours(0, 0, 0, 0);
    return Math.ceil((vencimento - hoje) / 86400000);
}

function obterBoletosAVencerFinanceiro() {
    return obterLancamentosFinanceiros()
        .filter(item => !item.pago && item.vencimento && financeiroGeraCobranca(item))
        .map(item => ({ ...item, diasVencimento: diasAteVencimentoFinanceiro(item) }))
        .filter(item => item.diasVencimento !== null && item.diasVencimento <= 7)
        .sort((a, b) => a.diasVencimento - b.diasVencimento || String(a.descricao || '').localeCompare(String(b.descricao || ''), 'pt-BR'));
}

// Lembretes de vencimento so aparecem para quem tem acesso ao Financeiro no seu nivel de permissao.
// (Exibicao apenas; o acesso aos dados continua protegido pelas regras do Firestore.)
function usuarioPodeVerLembreteFinanceiro() {
    const permissoes = window.App?.userPermissions;
    const secoes = Array.isArray(permissoes?.allowedSections) ? permissoes.allowedSections : [];
    return secoes.includes('view-financeiro');
}

function textoVencimentoLembrete(item) {
    if (item.diasVencimento < 0) return `vencido há ${Math.abs(item.diasVencimento)} dia(s)`;
    if (item.diasVencimento === 0) return 'vence hoje';
    if (item.diasVencimento === 1) return 'vence amanhã';
    return `vence em ${item.diasVencimento} dias`;
}

function chaveNotificacaoFinanceira(item) {
    return [
        item.id || '',
        item.vencimento || '',
        Number(item.valor || 0).toFixed(2),
        item.atualizadoEm || item.criadoEm || ''
    ].join('|');
}

function obterNotificacoesFinanceirasLidas() {
    try {
        const salvas = JSON.parse(localStorage.getItem(FINANCEIRO_NOTIFICACOES_LIDAS_KEY) || '[]');
        return Array.isArray(salvas) ? salvas : [];
    } catch (_) {
        return [];
    }
}

function salvarNotificacoesFinanceirasLidas(chaves) {
    try {
        localStorage.setItem(FINANCEIRO_NOTIFICACOES_LIDAS_KEY, JSON.stringify([...new Set(chaves)].slice(-400)));
    } catch (_) {
        // A lista continua funcional caso o navegador bloqueie armazenamento local.
    }
}

window.marcarNotificacoesFinanceirasComoLidas = function(alertasVisiveis = null) {
    const alertas = Array.isArray(alertasVisiveis) ? alertasVisiveis : obterBoletosAVencerFinanceiro();
    const chavesAtuais = alertas.map(chaveNotificacaoFinanceira);
    if (chavesAtuais.length) {
        salvarNotificacoesFinanceirasLidas([...obterNotificacoesFinanceirasLidas(), ...chavesAtuais]);
    }
    const badge = document.getElementById('headerNotificationBadge');
    if (badge) {
        badge.textContent = '0';
        badge.hidden = true;
    }
    window.dispatchEvent(new CustomEvent('financeiroNotificacoesLidas'));
};

function mostrarLembretesFinanceiros() {
    document.getElementById('financeiroLembreteTopo')?.remove();
    const button = document.getElementById('btnHeaderNotifications');
    const badge = document.getElementById('headerNotificationBadge');
    const panel = document.getElementById('headerNotificationPanel');
    const summary = document.getElementById('headerNotificationSummary');
    const list = document.getElementById('headerNotificationList');
    const linkFinanceiro = document.querySelector('a[data-target="view-financeiro"]');

    const clearNotifications = () => {
        if (badge) badge.hidden = true;
        if (panel) panel.hidden = true;
        button?.setAttribute('aria-expanded', 'false');
        if (summary) summary.textContent = 'Nenhuma pendência no momento.';
        if (list) list.innerHTML = '<div class="header-notification-empty"><i class="fa-regular fa-circle-check"></i><span>Tudo em ordem por aqui.</span></div>';
        linkFinanceiro?.classList.remove('financeiro-menu-alerta');
        document.body.classList.remove('financeiro-tem-alerta');
    };

    if (!usuarioPodeVerLembreteFinanceiro()) {
        clearNotifications();
        document.querySelector('.header-notification-center')?.classList.add('is-restricted');
        return;
    }
    document.querySelector('.header-notification-center')?.classList.remove('is-restricted');

    const alertas = obterBoletosAVencerFinanceiro();
    if (!alertas.length) {
        clearNotifications();
        return;
    }

    const notificacoesLidas = new Set(obterNotificacoesFinanceirasLidas());
    const alertasNovos = alertas.filter(item => !notificacoesLidas.has(chaveNotificacaoFinanceira(item)));
    const total = alertas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const vencidos = alertas.filter(item => item.diasVencimento < 0).length;
    const hoje = alertas.filter(item => item.diasVencimento === 0).length;
    if (badge) {
        badge.textContent = alertasNovos.length > 99 ? '99+' : String(alertasNovos.length);
        badge.hidden = alertasNovos.length === 0;
    }
    if (summary) summary.textContent = `${vencidos ? `${vencidos} vencido(s)` : 'Nenhum vencido'}${hoje ? ` | ${hoje} vence(m) hoje` : ''}`;
    if (list) {
        list.innerHTML = `${alertas.map((item, index) => `
        <button type="button" class="header-notification-item${item.diasVencimento < 0 ? ' overdue' : ''}" data-financeiro-alerta-indice="${index}" title="${item.documento ? 'Abrir documento' : 'Abrir Financeiro'}">
            <span class="header-notification-item-icon"><i class="fa-solid ${item.diasVencimento < 0 ? 'fa-triangle-exclamation' : 'fa-calendar-day'}"></i></span>
            <span class="header-notification-item-copy">
                <strong>${escapeHtmlFinanceiro(item.descricao || item.tipo || 'Documento financeiro')}</strong>
                <small>${escapeHtmlFinanceiro(textoVencimentoLembrete(item))}${item.vencimento ? ` · ${dataBR(item.vencimento)}` : ''}</small>
            </span>
            <strong class="header-notification-item-value">${formatarMoeda(item.valor)}</strong>
        </button>
        `).join('')}
        <button type="button" class="header-notification-open-finance" onclick="window.irParaFinanceiroAlertas()"><i class="fa-solid fa-wallet"></i> Abrir controle financeiro <span>${formatarMoeda(total)}</span></button>`;
    }

    list?.querySelectorAll('[data-financeiro-alerta-indice]').forEach(botao => {
        botao.addEventListener('click', () => {
            const item = alertas[Number(botao.dataset.financeiroAlertaIndice)];
            if (!item) return;
            if (panel) panel.hidden = true;
            button?.setAttribute('aria-expanded', 'false');
            if (item.documento) window.abrirAnexoFinanceiro(item.id, 'documento');
            else window.irParaFinanceiroAlertas();
        });
    });

    if (button && !button.dataset.notificationsReady) {
        button.dataset.notificationsReady = 'true';
        button.addEventListener('click', event => {
            event.stopPropagation();
            if (!panel) return;
            if (panel.hidden) window.marcarNotificacoesFinanceirasComoLidas?.(alertas);
            panel.hidden = !panel.hidden;
            button.setAttribute('aria-expanded', String(!panel.hidden));
        });
        document.getElementById('btnCloseHeaderNotifications')?.addEventListener('click', event => {
            event.stopPropagation();
            if (panel) panel.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        });
        document.addEventListener('click', event => {
            if (!panel || panel.hidden || event.target.closest('.header-notification-center')) return;
            panel.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        });
    }
    linkFinanceiro?.classList.add('financeiro-menu-alerta');
    document.body.classList.add('financeiro-tem-alerta');
}

// Chamado pelo core quando as permissoes do usuario logado sao carregadas/alteradas:
// quem tem Financeiro ve os lembretes ja no login; quem nao tem, nao ve nada.
window.atualizarLembretesFinanceirosPorPermissao = async function() {
    if (usuarioPodeVerLembreteFinanceiro() && !financeiroNuvemCarregada && window.FS) {
        try {
            const nuvem = await window.FS.getCollection(FINANCEIRO_COLLECTION);
            if (nuvem.length > 0) salvarLancamentosFinanceiros(nuvem);
        } catch (error) {
            console.warn('Lembretes financeiros: usando cache local.', error);
        }
    }
    mostrarLembretesFinanceiros();
};

// Ao sair do sistema: envia ao banco os lancamentos que so existem neste navegador e,
// se tudo subiu, apaga a copia local (em aparelho compartilhado ela ficava para o proximo usuario).
// Se algo nao subir, mantem a copia para nao perder dado.
window.prepararSaidaFinanceiro = async function() {
    const locais = obterLancamentosFinanceiros();
    if (!locais.length) {
        localStorage.removeItem(FINANCEIRO_RELATORIOS_KEY);
        return { limpo: true };
    }
    if (!window.FS) return { limpo: false };
    let idsNuvem = null;
    try {
        idsNuvem = new Set((await window.FS.getCollection(FINANCEIRO_COLLECTION)).map(item => item.id));
    } catch (_) {
        idsNuvem = null; // usuario sem leitura do financeiro (ex.: frota): tenta enviar os itens dele
    }
    const pendentes = locais.filter(item => item?.id && (!idsNuvem || !idsNuvem.has(item.id)));
    let falhas = 0;
    for (const item of pendentes) {
        try {
            await window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, prepararFinanceiroParaNuvem(item));
        } catch (_) {
            falhas++;
        }
    }
    if (falhas) return { limpo: false, falhas };
    localStorage.removeItem(FINANCEIRO_KEY);
    localStorage.removeItem(FINANCEIRO_RELATORIOS_KEY);
    return { limpo: true };
};

window.alternarListaLembretesFinanceiros = function() {
    document.getElementById('btnHeaderNotifications')?.click();
};

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
    const status = item.statusFinanceiro || obterStatusFinanceiro(item);
    const classe = classeDocumentoFinanceiro(item);
    if (classe === 'comprovante') return { label: 'Comprovante', classe: 'pago' };
    if (classe === 'nota' && notaPresumidaAVistaFinanceiro(item)) return { label: 'Paga à vista (sem boleto)', classe: 'pago' };
    if (classe === 'nota' && status !== 'PAGO' && item.processoVinculoId && item.processoVinculoStatus === 'CONFIRMADO') return { label: 'Boleto ligado', classe: 'aberto' };
    if (classe === 'nota' && status !== 'PAGO') {
        if (item.conferenciaStatus !== 'pendente' && item.situacaoDocumento === 'AGUARDANDO_BOLETO') return { label: 'Aguardando boleto', classe: 'pendente' };
        if (status === 'REGISTRADO') return { label: 'Nota (sem cobrança)', classe: 'aberto' };
    }
    if (status === 'PAGO') return { label: 'Pago', classe: 'pago' };
    if (status === 'PENDENTE') return { label: 'Pendente', classe: 'pendente' };
    if (status === 'VENCIDO') return { label: 'Vencido', classe: 'vencido' };
    if (status === 'REGISTRADO') return { label: 'Registrado', classe: 'aberto' };
    return { label: 'Não pago', classe: 'aberto' };
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
        if (tipo === 'documento') financeiroDadosLeituraTemp = null;
        preencherNomeArquivo(tipo, null);
        return;
    }

    if (tipo === 'documento') financeiroDadosLeituraTemp = null;

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

// PDFs com senha (boletos costumam vir protegidos, ex.: inicio do CNPJ/CPF).
// As senhas que funcionaram ficam guardadas so neste computador e sao tentadas nos proximos.
const FINANCEIRO_SENHAS_PDF_KEY = 'orquestra_financeiro_senhas_pdf';
let financeiroPedirSenhaPdf = true;
function senhasPdfFinanceiro() {
    try { return JSON.parse(localStorage.getItem(FINANCEIRO_SENHAS_PDF_KEY) || '[]').filter(Boolean).slice(0, 20); } catch (_) { return []; }
}
function guardarSenhaPdfFinanceiro(senha) {
    try { localStorage.setItem(FINANCEIRO_SENHAS_PDF_KEY, JSON.stringify([senha, ...senhasPdfFinanceiro().filter(x => x !== senha)].slice(0, 20))); } catch (_) {}
}
async function abrirPdfFinanceiro(bytes, nome = '') {
    const tentar = senha => window.pdfjsLib.getDocument({ data: bytes.slice(), ...(senha ? { password: senha } : {}) }).promise;
    try {
        return await tentar('');
    } catch (erro) {
        if (erro?.name !== 'PasswordException') throw erro;
    }
    for (const senha of senhasPdfFinanceiro()) {
        try { return await tentar(senha); } catch (_) { /* proxima */ }
    }
    if (financeiroPedirSenhaPdf) {
        for (let i = 0; i < 3; i++) {
            const senha = window.prompt(`O PDF "${nome || 'documento'}" tem senha.\nDigite a senha (em boletos costuma ser o início do CNPJ ou CPF). Ela fica guardada neste computador para os próximos.`);
            if (!senha) break;
            try { const pdf = await tentar(senha.trim()); guardarSenhaPdfFinanceiro(senha.trim()); return pdf; } catch (_) { /* senha errada */ }
        }
    }
    const e = new Error('PDF protegido por senha. Use "Ler de novo" e digite a senha.');
    e.pdfComSenha = true;
    throw e;
}

async function extrairTextoPdfFinanceiro(anexo) {
    if (!window.pdfjsLib) {
        throw new Error('Biblioteca PDF.js não carregada.');
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
    const bytes = bytesDeAnexoBase64(anexo);
    if (!bytes) return '';
    const pdf = await abrirPdfFinanceiro(bytes, anexo.nome);
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
    const pdf = await abrirPdfFinanceiro(bytes, anexo.nome);
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

function elementosXmlPorNome(raiz, nome) {
    return Array.from(raiz?.getElementsByTagName?.('*') || [])
        .filter(elemento => elemento.localName === nome || elemento.tagName === nome);
}

function primeiroElementoXmlPorNome(raiz, nome) {
    return elementosXmlPorNome(raiz, nome)[0] || null;
}

function valorXmlNoElemento(elemento, nome) {
    return primeiroElementoXmlPorNome(elemento, nome)?.textContent?.trim() || '';
}

function normalizarDataXmlFinanceiro(valor) {
    const texto = String(valor || '').trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const brasileira = texto.match(/^(\d{2})[\/. -](\d{2})[\/. -](\d{4})/);
    return brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : '';
}

function numeroXmlFinanceiro(valor) {
    const texto = String(valor ?? '').trim().replace(/\s/g, '');
    if (!texto) return 0;
    const normalizado = texto.includes(',')
        ? (texto.includes('.') ? texto.replace(/\./g, '').replace(',', '.') : texto.replace(',', '.'))
        : texto;
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
}

function extrairChaveNfeXmlFinanceiro(xml) {
    const chave = valorXmlPorTag(xml, ['chNFe']).replace(/\D/g, '');
    if (chave.length === 44) return chave;
    const infNfe = primeiroElementoXmlPorNome(xml, 'infNFe');
    const id = String(infNfe?.getAttribute?.('Id') || '').replace(/^NFe/i, '').replace(/\D/g, '');
    return id.length === 44 ? id : '';
}

function extrairProdutosXmlFinanceiro(xml) {
    return elementosXmlPorNome(xml, 'det').map((det, indice) => {
        const produto = primeiroElementoXmlPorNome(det, 'prod') || det;
        const descricao = valorXmlNoElemento(produto, 'xProd');
        if (!descricao) return null;
        return {
            item: Number(det.getAttribute?.('nItem') || indice + 1) || indice + 1,
            codigo: valorXmlNoElemento(produto, 'cProd'),
            descricao,
            ncm: valorXmlNoElemento(produto, 'NCM'),
            cfop: valorXmlNoElemento(produto, 'CFOP'),
            unidade: valorXmlNoElemento(produto, 'uCom') || valorXmlNoElemento(produto, 'uTrib'),
            quantidade: numeroXmlFinanceiro(valorXmlNoElemento(produto, 'qCom') || valorXmlNoElemento(produto, 'qTrib')),
            valorUnitario: numeroXmlFinanceiro(valorXmlNoElemento(produto, 'vUnCom') || valorXmlNoElemento(produto, 'vUnTrib')),
            valorTotal: numeroXmlFinanceiro(valorXmlNoElemento(produto, 'vProd'))
        };
    }).filter(Boolean);
}

// Forma de pagamento da NF-e (tag tPag): a vista ja nasce paga; boleto/duplicata aguarda o boleto.
const FIN_TPAG_A_VISTA = new Set(['01', '02', '03', '04', '10', '11', '12', '13', '17', '18', '20']);
const FIN_TPAG_NOMES = { '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão de crédito', '04': 'Cartão de débito', '05': 'Crédito loja', '10': 'Vale alimentação', '11': 'Vale refeição', '12': 'Vale presente', '13': 'Vale combustível', '14': 'Duplicata mercantil', '15': 'Boleto bancário', '16': 'Depósito bancário', '17': 'PIX', '18': 'Transferência', '19': 'Fidelidade', '20': 'PIX', '90': 'Sem pagamento', '99': 'Outros' };
function extrairParcelasXmlFinanceiro(xml) {
    return elementosXmlPorNome(xml, 'dup').map(dup => ({
        numero: valorXmlNoElemento(dup, 'nDup'),
        vencimento: normalizarDataXmlFinanceiro(valorXmlNoElemento(dup, 'dVenc')),
        valor: numeroXmlFinanceiro(valorXmlNoElemento(dup, 'vDup'))
    })).filter(p => p.valor > 0 || p.vencimento);
}
function extrairPagamentoXmlFinanceiro(xml) {
    const formas = elementosXmlPorNome(xml, 'detPag').map(det => ({
        codigo: valorXmlNoElemento(det, 'tPag'),
        valor: numeroXmlFinanceiro(valorXmlNoElemento(det, 'vPag')),
        indPag: valorXmlNoElemento(det, 'indPag')
    })).filter(f => f.codigo);
    const indPagIde = valorXmlNoElemento(primeiroElementoXmlPorNome(xml, 'ide'), 'indPag');
    return { formas, indPag: formas[0]?.indPag || indPagIde || '' };
}
// NFS-e (servico) tem layout diferente da NF-e; le os campos principais dos padroes mais comuns.
function extrairDadosNfseXmlFinanceiro(xml) {
    const valor = valorXmlPorTag(xml, ['ValorLiquidoNfse', 'ValorServicos', 'vServ', 'ValorTotal', 'vLiq']);
    if (!valor) return null;
    const prestador = primeiroElementoXmlPorNome(xml, 'PrestadorServico') || primeiroElementoXmlPorNome(xml, 'Prestador') || primeiroElementoXmlPorNome(xml, 'emit');
    const nome = valorXmlNoElemento(prestador, 'RazaoSocial') || valorXmlNoElemento(prestador, 'xNome') || valorXmlPorTag(xml, ['RazaoSocial', 'xNome']);
    const cnpj = valorXmlNoElemento(prestador, 'Cnpj') || valorXmlNoElemento(prestador, 'CNPJ');
    return {
        tipo: 'NOTA FISCAL', descricao: nome || 'NFS-E', fornecedor: nome, cnpj,
        numeroDocumento: valorXmlPorTag(xml, ['Numero', 'nNFSe', 'nDFSe']),
        vencimento: '', dataEmissao: normalizarDataXmlFinanceiro(valorXmlPorTag(xml, ['DataEmissao', 'dhEmi', 'dhProc'])),
        valor: numeroXmlFinanceiro(valor), produtos: [], parcelas: [], pagamento: { formas: [], indPag: '' },
        confianca: 'alta', confiancaData: 'alta', fonteVencimento: 'XML NFS-e', analisadoPorIA: false,
        geraCobranca: false, situacaoDocumento: 'AGUARDANDO_BOLETO'
    };
}

function extrairDadosXmlFinanceiro(texto) {
    const limpo = String(texto || '').replace(/^\uFEFF/, '').replace(/^[^<]+/, '');
    const xml = new DOMParser().parseFromString(limpo, 'text/xml');
    const erro = xml.getElementsByTagName('parsererror')?.[0];
    if (erro) return null;
    if (!primeiroElementoXmlPorNome(xml, 'infNFe') && !primeiroElementoXmlPorNome(xml, 'ICMSTot')) {
        const nfse = extrairDadosNfseXmlFinanceiro(xml);
        if (nfse) return nfse;
    }
    const emit = primeiroElementoXmlPorNome(xml, 'emit');
    const dest = primeiroElementoXmlPorNome(xml, 'dest');
    const ide = primeiroElementoXmlPorNome(xml, 'ide');
    const total = primeiroElementoXmlPorNome(xml, 'ICMSTot') || primeiroElementoXmlPorNome(xml, 'total');
    const nome = valorXmlNoElemento(emit, 'xNome') || valorXmlPorTag(xml, ['xNome', 'nome']);
    const cnpj = valorXmlNoElemento(emit, 'CNPJ');
    const numeroDocumento = valorXmlNoElemento(ide, 'nNF');
    const serie = valorXmlNoElemento(ide, 'serie');
    const emissao = valorXmlNoElemento(ide, 'dhEmi') || valorXmlNoElemento(ide, 'dEmi') || valorXmlPorTag(xml, ['dhEmi', 'dEmi']);
    const valor = valorXmlNoElemento(total, 'vNF') || valorXmlPorTag(xml, ['vNF', 'vLiq', 'valor']);
    const produtos = extrairProdutosXmlFinanceiro(xml);
    const chaveNfe = extrairChaveNfeXmlFinanceiro(xml);
    const descricao = nome || 'DOCUMENTO XML';
    const parcelas = extrairParcelasXmlFinanceiro(xml);
    const pagamento = extrairPagamentoXmlFinanceiro(xml);
    const codigos = pagamento.formas.map(f => f.codigo);
    const aVista = !parcelas.length && codigos.length > 0 && codigos.every(c => FIN_TPAG_A_VISTA.has(c));
    const situacaoDocumento = aVista ? 'PAGO_A_VISTA' : 'AGUARDANDO_BOLETO';
    const formaTexto = [...new Set(codigos.map(c => FIN_TPAG_NOMES[c] || `Código ${c}`))].join(', ');
    return {
        tipo: 'NOTA FISCAL',
        descricao,
        fornecedor: nome,
        cnpj,
        numeroDocumento,
        serie,
        chaveNfe,
        vencimento: '',
        dataEmissao: normalizarDataXmlFinanceiro(emissao),
        valor: numeroXmlFinanceiro(valor),
        produtos,
        destinatario: valorXmlNoElemento(dest, 'xNome'),
        destinatarioCnpj: valorXmlNoElemento(dest, 'CNPJ') || valorXmlNoElemento(dest, 'CPF'),
        confianca: 'alta',
        confiancaData: 'alta',
        fonteVencimento: 'XML NF-e',
        analisadoPorIA: false,
        geraCobranca: false,
        parcelas,
        pagamento: { ...pagamento, descricao: formaTexto },
        observacaoIA: [formaTexto ? `Pagamento: ${formaTexto}` : '', parcelas.length ? `${parcelas.length} parcela(s): ${parcelas.map(p => `${p.numero || ''} venc. ${p.vencimento ? p.vencimento.split('-').reverse().join('/') : '?'} R$ ${p.valor.toFixed(2).replace('.', ',')}`).join('; ')}` : ''].filter(Boolean).join(' | '),
        situacaoDocumento
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
        .replace(/\s+(VENCIMENTO|AGENCIA|AGÊNCIA|DATA PROCESSAMENTO|ACEITE|ESP\.? DOC).*$/i, '')
        .replace(/\s+(RUA|AV\.?|AVENIDA|RODOVIA)\s+.*$/i, '')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 90)
        .trim();
}

function pareceDocumentoFinanceiro(textoBusca, limpo) {
    return /COMPROVANTE|PIX|TRANSFERENCIA|BOLETO|VENCIMENTO|VALOR A PAGAR|VALOR DO DOCUMENTO|NOTA FISCAL|DANFE|DARF|FGTS|RECEITA FEDERAL|TELEFONICA|VIVO|FICHA DE COMPENSA/.test(textoBusca)
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
    if (!dados.vencimento && !dados.emissao && !dados.dataEmissao) return true;
    if (!Number(dados.valor || 0)) return true;
    if (descricaoFinanceiraRuim(dados.descricao)) return true;
    return false;
}

function leituraFinanceiraUtil(dados) {
    return Boolean(dados && Number(dados.valor || 0) > 0 && Boolean(dados.vencimento || dados.emissao || dados.dataEmissao) && !descricaoFinanceiraRuim(dados.descricao));
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
    const tipo = normalizarTexto(dados.tipo || 'DOCUMENTO');
    const ehNota = /(?:^|[^A-Z0-9])(?:NOTA FISCAL|DANFE|NF-?E|NFS-?E|XML)(?![A-Z])/.test(tipo);
    const ehComprovante = /COMPROVANTE/.test(tipo);
    return {
        tipo,
        descricao: normalizarTexto(descricao).slice(0, 90),
        fornecedor: normalizarTexto(fornecedor),
        cnpj: dados.cnpj || '',
        vencimento: ehNota || ehComprovante ? '' : (dados.vencimento || ''),
        dataEmissao: dados.dataEmissao || dados.emissao || (ehComprovante ? dados.vencimento || '' : ''),
        valor: Number(dados.valor || dados.valorTotal || 0),
        numeroDocumento: dados.numeroDocumento || '',
        chaveNfe: dados.chaveNfe || dados.chaveNFe || dados.chave || '',
        linhaDigitavel: dados.linhaDigitavel || '',
        codigoBarras: dados.codigoBarras || '',
        banco: dados.banco || '',
        nossoNumero: dados.nossoNumero || dados.nossoNumeroBoleto || '',
        produtos,
        categoriaSugerida: dados.categoriaSugerida || '',
        pastaSugerida: dados.pastaSugerida || '',
        confiancaIA: dados.confianca || 'media',
        confiancaData: dados.confiancaData || dados.confiancaVencimento || 'media',
        fonteVencimento: dados.fonteVencimento || '',
        observacaoIA: dados.observacao || '',
        analisadoPorIA: true,
        precisaConferencia: dados.confianca === 'baixa' || dados.confiancaData === 'baixa',
        geraCobranca: !ehNota,
        situacaoDocumento: ehNota ? (dados.situacaoDocumento === 'PAGO_A_VISTA' ? 'PAGO_A_VISTA' : 'AGUARDANDO_BOLETO') : (dados.situacaoDocumento || 'A_PAGAR')
    };
}

function marcarConflitoDataFinanceiro(dadosIA, dadosLocal) {
    if (!dadosIA || !dadosLocal || financeiroEhNotaFiscal(dadosIA)) return dadosIA;
    if (!dadosIA.vencimento || !dadosLocal.vencimento || dadosIA.vencimento === dadosLocal.vencimento) return dadosIA;
    return {
        ...dadosIA,
        precisaConferencia: true,
        confiancaData: 'baixa',
        observacaoIA: `Conflito de vencimento: leitura local ${dadosLocal.vencimento} e IA ${dadosIA.vencimento}. Confira o documento.`
    };
}

async function analisarDocumentoFinanceiroIA(textoDocumento, anexo, sugestaoLocal = {}, imagemDocumento = '') {
    let timeout;
    try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 58000);
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/financeiro-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken || ''}` },
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

// Tira do nome do beneficiario o que vem colado na mesma linha: agencia/codigo, CNPJ, datas.
function limparNomeBeneficiarioFinanceiro(nome = '') {
    return String(nome)
        .replace(/\s+\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}.*$/, '')
        .replace(/\s+\d{3,5}-?\d?\s*\/\s*\d{4,}.*$/, '')
        .replace(/\s+\d{2}\/\d{2}\/\d{4}.*$/, '')
        .trim();
}

function extrairDescricaoBoletoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const linhas = String(texto || '').split(/\r?\n/).map(linha => linha.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const boletoAssistencial = limpo.match(/BOLETO\s+ASSISTENCIAL\s+REF\.?\s*\d{2}\/\d{4}/i)?.[0];
    if (boletoAssistencial) return boletoAssistencial.toUpperCase();
    for (let i = 0; i < linhas.length; i++) {
        if (/NOME\s+DO\s+BENEFICI|BENEFICI|CEDENTE/i.test(linhas[i])) {
            const mesmaLinha = limparDescricaoDocumentoFinanceiro(linhas[i].replace(/^.*?(NOME\s+DO\s+)?BENEFICI\S*\s*:?\s*/i, ''));
            const ehCabecalho = /AG[ÊE]NCIA|C[ÓO]DIGO|CNPJ|CPF|MOTIVO|SACADO|AVALISTA|ENTREGA|VENCIMENTO|LOCAL DE PAGAMENTO|PAGADOR/i.test(linhas[i]);
            if (!ehCabecalho && mesmaLinha && mesmaLinha.length >= 5) {
                return limparNomeBeneficiarioFinanceiro(mesmaLinha);
            }
            const proximas = linhas.slice(i + 1, i + 5).filter(linha =>
                linha.length >= 5
                && !/LOCAL DE PAGAMENTO|VENCIMENTO|AG[ÊE]NCIA|DATA|DOCUMENTO|ESP[ÉE]CIE|ACEITE|PAGADOR|CNPJ:?\s*$/i.test(linha)
            );
            const fornecedorLinha = proximas.find(linha => /[A-Z]{3,}/.test(linha) && !/^\d/.test(linha));
            if (fornecedorLinha) return limparNomeBeneficiarioFinanceiro(limparDescricaoDocumentoFinanceiro(fornecedorLinha));
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
    const aposPagavel = limpo.match(/PAG[AÁ]VEL[\s\S]{0,180}?(\d{2}\/\d{2}\/\d{4})/i)?.[1];
    const todas = Array.from(limpo.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)).map(match => match[1]);
    return aposPagavel || todas[todas.length - 1] || '';
}

function linhasFinanceiro(texto) {
    return String(texto || '').split(/\r?\n/).map(linha => linha.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function extrairDataRotuladaFinanceiro(texto, rotuloRegex) {
    const padraoData = /\b(\d{2}[\/.-]\d{2}[\/.-]\d{4})\b/;
    const linhas = linhasFinanceiro(texto);
    for (let i = 0; i < linhas.length; i++) {
        if (!rotuloRegex.test(linhas[i])) continue;
        const mesmaLinha = linhas[i].match(padraoData)?.[1];
        if (mesmaLinha) return mesmaLinha;
        for (let j = i + 1; j <= Math.min(i + 2, linhas.length - 1); j++) {
            const proximaData = linhas[j].match(padraoData)?.[1];
            if (proximaData) return proximaData;
            if (/\b(?:vencimento|emiss[aã]o|processamento|pagador|benefici[aá]rio|cedente)\b/i.test(linhas[j])) break;
        }
    }
    return '';
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
    return extrairDataRotuladaFinanceiro(
        texto,
        /\b(?:DATA\s+DE\s+)?VENCIMENTO\b|\bPAG[AÃÁ]VEL\b/i
    );
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

// Boleto costuma citar a nota ("NFE019456-3/3") no numero do documento; isso nao o torna nota fiscal.
function textoEhBoletoFinanceiro(textoBusca) {
    const marcasBoleto = [/NOSSO NUMERO/, /LOCAL DE PAGAMENTO/, /FICHA DE COMPENSACAO/, /RECIBO DO PAGADOR/, /VALOR DO DOCUMENTO/, /CEDENTE|BENEFICIARIO/, /PAGAVEL/, /LINHA DIGITAVEL/]
        .filter(r => r.test(textoBusca)).length;
    const marcasNota = /DANFE|CHAVE DE ACESSO|NATUREZA DA OPERACAO|PROTOCOLO DE AUTORIZACAO|DOCUMENTO AUXILIAR DA NOTA/.test(textoBusca);
    return marcasBoleto >= 2 && !marcasNota;
}

function extrairDadosNotaFiscalTextoFinanceiro(texto, textoBusca, limpo) {
    if (!/DANFE|NOTA FISCAL|NF-E|NFE|NFS-E|NFSE/.test(textoBusca)) return null;
    if (textoEhBoletoFinanceiro(textoBusca)) return null;
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
        vencimento: '',
        dataEmissao: emissao ? emissao.split(/[\/.-]/).reverse().join('-') : '',
        valor: valorNota || 0,
        precisaConferencia: !valorNota || descricaoFinanceiraRuim(fornecedor),
        geraCobranca: false,
        situacaoDocumento: 'AGUARDANDO_BOLETO'
    };
}

// Linha digitavel / codigo de barras: valor e vencimento sao exatos (padrao FEBRABAN).
// Boleto bancario (47 digitos): campo 5 = fator de vencimento (4) + valor (10).
// Fator: base 07/10/1997; a partir de 22/02/2025 recomeca em 1000. Escolhe a data mais proxima de hoje.
// Arrecadacao/concessionaria (48 digitos, comeca com 8): so o valor.
function decodificarLinhaDigitavelFinanceiro(texto) {
    const bruto = String(texto || '');
    const m = bruto.match(/(\d{5})[.\s]?(\d{5})\s+(\d{5})[.\s]?(\d{6})\s+(\d{5})[.\s]?(\d{6})\s+(\d)\s+(\d{14})/);
    let linha = m ? m.slice(1).join('') : '';
    if (!linha) linha = bruto.replace(/[.\s-]/g, '').match(/(?<!\d)[0-7]\d{46}(?!\d)/)?.[0] || '';
    if (linha.length === 47) {
        const campo5 = linha.slice(33);
        return montarLinhaDecodificadaFinanceiro(linha, Number(campo5.slice(0, 4)), Number(campo5.slice(4)));
    }
    const barras = bruto.replace(/[.\s-]/g, '').match(/(?<!\d)[0-7]\d{43}(?!\d)/)?.[0];
    if (barras) return montarLinhaDecodificadaFinanceiro(barras, Number(barras.slice(5, 9)), Number(barras.slice(9, 19)));
    const arrec = bruto.match(/(8\d{10})[-\s]?\d\s+(\d{11})[-\s]?\d\s+(\d{11})[-\s]?\d\s+(\d{11})[-\s]?\d/);
    if (arrec) {
        const codigo = arrec.slice(1).join('');
        const valor = ['6', '8'].includes(codigo[2]) ? Number(codigo.slice(4, 15)) / 100 : 0;
        return { linhaDigitavel: codigo, valor, vencimento: '', arrecadacao: true };
    }
    return null;
}
function montarLinhaDecodificadaFinanceiro(linha, fator, centavos) {
    let vencimento = '';
    if (fator >= 1000) {
        const dia = 86400000;
        const d1 = Date.UTC(1997, 9, 7) + fator * dia;
        const d2 = Date.UTC(2025, 1, 22) + (fator - 1000) * dia;
        const agora = Date.now();
        vencimento = new Date(Math.abs(d2 - agora) < Math.abs(d1 - agora) ? d2 : d1).toISOString().slice(0, 10);
    }
    return { linhaDigitavel: linha, valor: centavos > 0 ? centavos / 100 : 0, vencimento };
}
// Completa/corrige a leitura com o que a linha digitavel garante.
function aplicarLinhaDigitavelFinanceiro(dados, texto) {
    if (!dados || financeiroEhNotaFiscal(dados) || /COMPROVANTE/i.test(dados.tipo || '')) return dados;
    const ld = decodificarLinhaDigitavelFinanceiro(texto) || decodificarLinhaDigitavelFinanceiro(dados.linhaDigitavel || dados.codigoBarras || '');
    if (!ld) return dados;
    const out = { ...dados, linhaDigitavel: dados.linhaDigitavel || ld.linhaDigitavel };
    if (ld.valor > 0) out.valor = ld.valor;
    if (ld.vencimento && (!out.vencimento || out.confiancaData === 'baixa' || out.precisaConferencia)) {
        out.vencimento = ld.vencimento;
        out.confiancaData = 'alta';
        out.fonteVencimento = 'linha digitável';
    }
    if (!out.tipo || /DOCUMENTO/i.test(out.tipo)) out.tipo = ld.arrecadacao ? 'CONTA' : 'BOLETO';
    if (out.valor > 0 && out.vencimento && !descricaoFinanceiraRuim(out.descricao)) out.precisaConferencia = false;
    return out;
}

// Comprovante de pagamento (Sicredi, PIX, TED, pagamento de boleto): para quem foi pago, valor pago,
// data do pagamento e o codigo do boleto pago (liga com o boleto com certeza).
function textoEhComprovanteFinanceiro(textoBusca) {
    return /COMPROVANTE (DE )?(PAGAMENTO|PIX|TRANSFERENCIA|TED|DOC|AGENDAMENTO|OPERACAO)|PIX ENVIADO|TRANSFERENCIA (REALIZADA|EFETUADA|ENVIADA)|PAGAMENTO (REALIZADO|EFETUADO|AGENDADO)|AUTENTICACAO (MECANICA|ELETRONICA|BANCARIA)|TRANSACAO EFETUADA/.test(textoBusca)
        || (/COMPROVANTE/.test(textoBusca) && /VALOR PAGO|DATA DO PAGAMENTO|DATA DE PAGAMENTO|DATA DA TRANSACAO|FAVORECIDO|RECEBEDOR/.test(textoBusca));
}
function extrairDadosComprovanteFinanceiro(texto, textoBusca, limpo) {
    if (!textoEhComprovanteFinanceiro(textoBusca)) return null;
    const moeda = rotulo => limpo.match(new RegExp(`(?:${rotulo})[^0-9]{0,30}([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2})`, 'i'))?.[1];
    const valorTxt = moeda('VALOR PAGO|VALOR TOTAL PAGO|VALOR DO PAGAMENTO|VALOR COBRADO|VALOR DA TRANSFER[ÊE]NCIA|VALOR DO PIX|VALOR TOTAL|VALOR')
        || limpo.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/)?.[1];
    const dataPag = limpo.match(/(?:DATA (?:DO |DE |DA )?(?:PAGAMENTO|TRANSA[CÇ][AÃ]O|D[EÉ]BITO|EFETIVA[CÇ][AÃ]O|OPERA[CÇ][AÃ]O)|PAGO EM|REALIZAD[OA] EM|EFETUAD[OA] EM)[^0-9]{0,25}(\d{2}\/\d{2}\/\d{4})/i)?.[1]
        || limpo.match(/\b(\d{2}\/\d{2}\/\d{4})\b/)?.[1] || '';
    const linhas = String(texto || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    let favorecido = '';
    const rotuloFav = /^(?:NOME DO )?(?:FAVORECIDO|BENEFICI[ÁA]RIO(?: FINAL)?|RECEBEDOR|DESTINAT[ÁA]RIO|PARA|CEDENTE|NOME DO RECEBEDOR|RAZ[ÃA]O SOCIAL)\b\s*:?\s*/i;
    for (let i = 0; i < linhas.length && !favorecido; i++) {
        if (!rotuloFav.test(linhas[i])) continue;
        const resto = linhas[i].replace(rotuloFav, '').trim();
        const candidato = resto && /[A-Z]{3,}/i.test(resto) ? resto : (linhas[i + 1] || '');
        if (!/PAGADOR|CPF|CNPJ\s*:?$|AG[ÊE]NCIA|CONTA|VALOR|DATA/i.test(candidato)) favorecido = candidato;
    }
    favorecido = limparNomeBeneficiarioFinanceiro(limparDescricaoDocumentoFinanceiro(String(favorecido || '').replace(/^(?:NOME|RAZ[ÃA]O SOCIAL)\s*:?\s*/i, '')));
    const cnpjFav = (limpo.match(/(?:FAVORECIDO|BENEFICI[ÁA]RIO|RECEBEDOR|DESTINO|DESTINAT)[\s\S]{0,160}?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i) || [])[1] || '';
    const ld = decodificarLinhaDigitavelFinanceiro(texto);
    return {
        tipo: 'COMPROVANTE',
        descricao: favorecido || 'COMPROVANTE DE PAGAMENTO',
        fornecedor: favorecido,
        cnpj: cnpjFav,
        vencimento: '',
        dataEmissao: dataPag ? dataPag.split('/').reverse().join('-') : '',
        valor: valorTxt ? parseMoeda(valorTxt) : (ld?.valor || 0),
        linhaDigitavel: ld?.linhaDigitavel || '',
        geraCobranca: false,
        situacaoDocumento: 'PAGO_A_VISTA',
        confianca: favorecido && valorTxt && dataPag ? 'alta' : 'media'
    };
}

function extrairDadosTextoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const textoBusca = limpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const data = extrairDataRotuladaFinanceiro(
        texto,
        /\b(?:DATA\s+DE\s+)?VENCIMENTO\b|\bPAG[AÃÁ]VEL\b|\bPAGAR\s+AT[EÃÉ]\b/i
    );
    const valor = limpo.match(/(?:valor(?:\s+total\s+do\s+documento|\s+do\s+documento)?|valor cobrado|valor a pagar|total da guia|valor a recolher|total)[:\s()=R$]*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i)?.[1]
        || limpo.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/)?.[1];
    const favorecido = limparDescricaoDocumentoFinanceiro(
        extrairLinhaAposRotuloFinanceiro(texto, /^(benefici|cedente|favorecido|fornecedor)\b[:\s-]*/i)
        || limpo.match(/(?:benefici[áa]rio|cedente|favorecido|fornecedor)[:\s-]*([A-Z0-9 .&\\/,-]{4,80})/i)?.[1]
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
    const dadosComprovante = extrairDadosComprovanteFinanceiro(texto, textoBusca, limpo);
    if (dadosComprovante) return dadosComprovante;
    const dadosNota = extrairDadosNotaFiscalTextoFinanceiro(texto, textoBusca, limpo);
    if (dadosNota) return dadosNota;
    const isBoleto = /boleto|nosso n[uú]mero|ficha de compensa|linha digitavel|linha digitável/i.test(limpo);
    if (isBoleto) {
        const vencimentoBoleto = extrairVencimentoBoletoRobustoFinanceiro(texto);
        const valorBoleto = extrairValorBoletoRobustoFinanceiro(texto) || (valor ? parseMoeda(valor) : 0);
        const descricaoBoleto = extrairDescricaoBoletoFinanceiro(texto);
        const numeroNotaBoleto = limpo.match(/\bNF-?E?\s*0*(\d{3,9})(?:\s*[-\/]\s*\d{1,3}(?:\s*\/\s*\d{1,3})?)?\b/i)?.[0]?.replace(/\s+/g, '') || '';
        const cnpjBeneficiario = String(texto || '').split(/\r?\n/)
            .filter(linha => !/PAGADOR|SACADO/i.test(linha))
            .map(linha => linha.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/)?.[0])
            .find(Boolean) || '';
        return aplicarRegrasFornecedorFinanceiro({
            tipo: 'BOLETO',
            numeroDocumento: numeroNotaBoleto ? numeroNotaBoleto.replace(/^NF-?E?0*/i, '') : '',
            cnpj: cnpjBeneficiario,
            fornecedor: descricaoBoleto || '',
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
    const ehXml = nomeArquivo.endsWith('.xml') || tipoArquivo.includes('xml') || /<\?xml|<nfeProc|<NFe|<cteProc|<CFe/i.test(texto);
    const dadosLocal = ehXml
        ? extrairDadosXmlFinanceiro(texto)
        : extrairDadosTextoFinanceiro(texto);
    const dadosIABruta = !ehXml
        ? await analisarDocumentoFinanceiroIA(texto, anexo, dadosLocal || {}, imagemDocumento)
        : null;
    const dadosIA = ehXml ? null : aplicarLinhaDigitavelFinanceiro(marcarConflitoDataFinanceiro(dadosIABruta, dadosLocal), texto);
    const dadosLocalLD = ehXml ? dadosLocal : aplicarLinhaDigitavelFinanceiro(dadosLocal, texto);
    let dadosEscolhidos = leituraFinanceiraUtil(dadosIA) ? dadosIA : dadosLocalLD;
    // comprovante: a leitura local entende o layout do banco; a IA so completa o que faltar
    if (dadosLocal?.tipo === 'COMPROVANTE') {
        const ia = dadosIA || {};
        dadosEscolhidos = {
            ...ia, ...dadosLocal,
            fornecedor: dadosLocal.fornecedor || ia.fornecedor || '',
            descricao: dadosLocal.fornecedor || ia.fornecedor || dadosLocal.descricao,
            valor: dadosLocal.valor || ia.valor || 0,
            dataEmissao: dadosLocal.dataEmissao || ia.dataEmissao || '',
            cnpj: dadosLocal.cnpj || ia.cnpj || '',
            linhaDigitavel: dadosLocal.linhaDigitavel || ia.linhaDigitavel || '',
            tipo: 'COMPROVANTE', vencimento: '', analisadoPorIA: Boolean(ia.analisadoPorIA)
        };
    }
    if (dadosEscolhidos && !ehXml && !dadosIA) {
        const exato = dadosEscolhidos.fonteVencimento === 'linha digitável' && dadosEscolhidos.valor > 0;
        return {
            dados: {
                ...dadosEscolhidos,
                precisaConferencia: !exato || descricaoFinanceiraRuim(dadosEscolhidos.descricao),
                fonteVencimento: exato ? 'linha digitável' : 'leitura_local_sem_IA',
                observacaoIA: 'A IA não ficou disponível. Confira a data diretamente no documento antes de salvar.'
            },
            usouIA: false,
            texto
        };
    }
    return {
        dados: dadosEscolhidos || dadosIA || dadosLocalLD,
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
    financeiroDadosLeituraTemp = normalizarMetadadosLeituraFinanceira(dados, anexo);
    preencherCampoFinanceiro('financeiroTipo', dados.tipo, true);
    preencherCampoFinanceiro('financeiroDescricao', dados.descricao, true);
    preencherCampoFinanceiro('financeiroVencimento', financeiroEhNotaFiscal(dados) ? (dados.dataEmissao || dados.emissao || '') : dados.vencimento, true);
    if (dados.valor > 0) preencherCampoFinanceiro('financeiroValor', formatarMoeda(dados.valor), true);
    atualizarCategoriaDocumentoFinanceiro(anexo, dados);
    atualizarClassificacaoFinanceiraUI(dados);
    const situacao = document.getElementById('financeiroSituacaoDocumento');
    if (situacao && financeiroEhNotaFiscal(dados)) situacao.value = 'AGUARDANDO_BOLETO';
    const obs = `${usouIA ? 'IMPORTADO DO DOCUMENTO COM APOIO DA IA' : 'IMPORTADO DO DOCUMENTO'}: ${anexo.nome}${dados.precisaConferencia ? ' | CONFERIR DATA E VALOR NO DOCUMENTO' : ''}`;
    preencherCampoFinanceiro('financeiroObservacao', obs, true);
    alert(`Leitura concluida${usouIA ? ' com apoio da IA' : ''}. ${dados.precisaConferencia ? 'A data ficou pendente para conferência manual. ' : ''}Confira os campos antes de salvar.`);
};

async function extrairDadosAnexoFinanceiro(anexo) {
    const nomeArquivo = (anexo.nome || '').toLowerCase();
    const tipoArquivo = (anexo.tipo || '').toLowerCase();
    if ((anexo.tipo || '').startsWith('image/')) {
        const dadosIA = await analisarDocumentoFinanceiroIA('', anexo, {}, anexo.dados || '');
        return dadosIA || { tipo: 'DOCUMENTO', descricao: 'DOCUMENTO IMAGEM - CONFERIR', vencimento: '', valor: 0, precisaConferencia: true };
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
            const imagem = await renderizarPrimeiraPaginaPdfFinanceiro(anexo).catch(() => '');
            const dadosIA = imagem ? await analisarDocumentoFinanceiroIA('', anexo, {}, imagem) : null;
            return dadosIA || { tipo: 'DOCUMENTO', descricao: 'PDF IMAGEM - PRECISA OCR', vencimento: '', valor: 0, precisaConferencia: true };
        }
    } else {
        texto = textoDeAnexoBase64(anexo);
    }
    if (!texto) return { tipo: 'DOCUMENTO', descricao: 'DOCUMENTO NAO LIDO', vencimento: '', valor: 0, precisaConferencia: true };
    const dadosLocal = (nomeArquivo.endsWith('.xml') || tipoArquivo.includes('xml') || /<\?xml|<nfeProc|<NFe|<cteProc|<CFe/i.test(texto))
        ? extrairDadosXmlFinanceiro(texto)
        : extrairDadosTextoFinanceiro(texto);
    const ehXml = nomeArquivo.endsWith('.xml') || tipoArquivo.includes('xml') || /<\?xml|<nfeProc|<NFe|<cteProc|<CFe/i.test(texto);
    if (ehXml) return dadosLocal;
    const dadosIA = aplicarLinhaDigitavelFinanceiro(marcarConflitoDataFinanceiro(
        await analisarDocumentoFinanceiroIA(texto, anexo, dadosLocal),
        dadosLocal
    ), texto);
    if (dadosIA && leituraFinanceiraUtil(dadosIA)) return dadosIA;
    const local = aplicarLinhaDigitavelFinanceiro(dadosLocal, texto);
    if (local && local.fonteVencimento === 'linha digitável' && leituraFinanceiraUtil(local)) return local;
    return {
        ...(dadosIA || local),
        precisaConferencia: true,
        fonteVencimento: 'leitura_local_sem_IA',
        observacaoIA: dadosIA?.observacaoIA || 'Confira a data diretamente no documento antes de salvar.'
    };
}

function confirmarImportacaoFinanceira(anexo, dados, origemArquivo) {
    return new Promise(resolve => {
        const ehNota = financeiroEhNotaFiscal(dados);
        const pendente = dados?.precisaConferencia || !dados?.valor || (!ehNota && !dados?.vencimento);
        const nomeSeguro = escapeHtmlFinanceiro(anexo?.nome || origemArquivo || 'Documento');
        const origemSegura = escapeHtmlFinanceiro(origemArquivo || anexo?.nome || '');
        const dataImportacao = ehNota ? (dados?.dataEmissao || dados?.emissao || '') : (dados?.vencimento || '');
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
                    <label>${ehNota ? 'Emissão' : 'Vencimento'}<input id="importFinVencimento" type="date" value="${escapeHtmlFinanceiro(dataImportacao)}"></label>
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
                    vencimento: ehNota ? '' : vencimento,
                    dataEmissao: ehNota ? vencimento : '',
                    valor,
                    observacao,
                    precisaConferencia: (!ehNota && !vencimento) || valor <= 0,
                    geraCobranca: !ehNota,
                    situacaoDocumento: ehNota ? 'AGUARDANDO_BOLETO' : 'A_PAGAR'
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

window.importarPastaFinanceira = async function(files, opcoes = {}) {
    const silencioso = Boolean(opcoes.silencioso);
    const origem = opcoes.origem || 'importacao_pasta';
    const rotuloOrigem = opcoes.rotuloOrigem || 'PASTA FINANCEIRA';
    const listaArquivos = Array.from(files || []).filter(file => /\.(pdf|xml)$/i.test(file.name) || (file.type || '').startsWith('image/'));
    if (!listaArquivos.length) {
        if (!silencioso) alert('Nenhum PDF, XML ou imagem encontrado na pasta selecionada.');
        return { importados: 0, duplicados: 0, ids: [] };
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
            const documentoVinculado = criarDocumentoVinculadoFinanceiro(anexoLocal, categoriaDocumento, origem);
            const ehNotaImportada = categoriaDocumento === 'nota_fiscal' || categoriaDocumento === 'xml';
            const registro = {
                id,
                aba: 'caixa-financeira',
                tipo: categoriaDocumento === 'boleto' ? 'BOLETO' : (ehNotaImportada ? 'NOTA FISCAL' : (categoriaDocumento === 'comprovante' ? 'COMPROVANTE' : 'DOCUMENTO')),
                descricao: normalizarTexto(file.name.replace(/\.(pdf|xml)$/i, '').replace(/[-_]+/g, ' ')) || 'PENDENTE DE CONFERENCIA',
                vencimento: '',
                dataEmissao: '',
                valor: 0,
                observacao: `IMPORTADO RAPIDO DE ${rotuloOrigem}: ${file.webkitRelativePath || file.name}`,
                conferenciaStatus: 'pendente',
                ia: null,
                pago: false,
                pagoEm: null,
                geraCobranca: !ehNotaImportada,
                situacaoDocumento: ehNotaImportada ? 'AGUARDANDO_BOLETO' : 'A_PAGAR',
                documentosVinculados: [documentoVinculado],
                documento: documentoVinculado,
                comprovante: null,
                atualizadoEm: new Date().toISOString(),
                criadoEm: new Date().toISOString()
            };
            const duplicadoRegistro = buscarLancamentoDuplicadoFinanceiro(registro);
            if (duplicadoRegistro) {
                duplicados.push({ nome: file.name, duplicado: duplicadoRegistro });
                continue;
            }
            obterAssinaturasLancamentoFinanceiro(registro).forEach(chave => assinaturasDoLote.add(chave));
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
    if (!silencioso) {
        const msg = [
            `${importados.length} documento(s) novo(s) importado(s) rapidamente.`,
            duplicados.length ? `${duplicados.length} duplicado(s) ignorado(s), pois já estavam salvos na lista financeira.` : '',
            importados.length ? 'A leitura automatica vai continuar em segundo plano e atualizar a lista conforme encontrar valor, vencimento e fornecedor.' : ''
        ].filter(Boolean).join('\n');
        alert(msg || 'Nenhum documento novo foi importado.');
    }
    return { importados: importados.length, duplicados: duplicados.length, ids: importados.map(item => item.id) };
};

function obterEstadoSigeWinFinanceiro() {
    try {
        const estado = JSON.parse(localStorage.getItem(SIGEWIN_SYNC_STATE_KEY) || '{}');
        return estado && typeof estado === 'object' ? estado : {};
    } catch (_) {
        return {};
    }
}

function salvarEstadoSigeWinFinanceiro(estado = {}) {
    localStorage.setItem(SIGEWIN_SYNC_STATE_KEY, JSON.stringify(estado));
}

function atualizarStatusSigeWinFinanceiro(mensagem, cor = '') {
    const elemento = document.getElementById('financeiroSigewinStatus');
    if (!elemento) return;
    elemento.textContent = `SIGEWIN local: ${mensagem}`;
    elemento.style.color = cor || 'var(--text-muted)';
}

window.sincronizarSigeWinFinanceiro = async function(opcoes = {}) {
    if (window.__sigeWinSyncEmAndamento) return { importados: 0, indisponivel: true };
    window.__sigeWinSyncEmAndamento = true;
    const silencioso = opcoes.silencioso !== false;
    const estadoAnterior = obterEstadoSigeWinFinanceiro();
    const consultaIniciadaEm = new Date().toISOString();
    try {
        const parametros = new URLSearchParams({ limit: estadoAnterior.primeiraConsulta ? '40' : '20' });
        if (estadoAnterior.ultimaConsultaEm) parametros.set('since', estadoAnterior.ultimaConsultaEm);
        atualizarStatusSigeWinFinanceiro('consultando arquivos novos...', '#64748b');
        const resposta = await fetch(`${SIGEWIN_LOCAL_API}/api/sigewin/nfe?${parametros.toString()}`, { cache: 'no-store' });
        if (!resposta.ok) throw new Error(`conector respondeu ${resposta.status}`);
        const dados = await resposta.json();
        const itens = Array.isArray(dados.items) ? dados.items : [];
        if (!itens.length) {
            salvarEstadoSigeWinFinanceiro({ ...estadoAnterior, primeiraConsulta: true, ultimaConsultaEm: consultaIniciadaEm });
            atualizarStatusSigeWinFinanceiro('conectado; nenhum XML novo.', '#047857');
            return { importados: 0, duplicados: 0 };
        }
        const arquivos = [];
        for (const item of itens) {
            const caminho = String(item.relativePath || '');
            if (!caminho) continue;
            const xmlResposta = await fetch(`${SIGEWIN_LOCAL_API}/api/sigewin/xml?path=${encodeURIComponent(caminho)}`, { cache: 'no-store' });
            if (!xmlResposta.ok) continue;
            const blob = await xmlResposta.blob();
            const arquivo = new File([blob], item.name || 'nfe.xml', {
                type: 'application/xml',
                lastModified: Date.parse(item.lastWriteTimeUtc || '') || Date.now()
            });
            arquivos.push(arquivo);
        }
        const resultado = await window.importarPastaFinanceira(arquivos, {
            silencioso: true,
            origem: 'sigewin_local_readonly',
            rotuloOrigem: 'SIGEWIN SOMENTE LEITURA'
        });
        salvarEstadoSigeWinFinanceiro({ ...estadoAnterior, primeiraConsulta: true, ultimaConsultaEm: consultaIniciadaEm });
        atualizarStatusSigeWinFinanceiro(
            resultado.importados ? `${resultado.importados} NF-e nova(s) importada(s).` : 'conectado; XMLs já importados.',
            '#047857'
        );
        if (!silencioso && !resultado.importados) alert('Nenhuma NF-e nova encontrada no SIGEWIN.');
        return resultado;
    } catch (error) {
        atualizarStatusSigeWinFinanceiro('conector local não disponível.', '#b45309');
        if (!silencioso) alert('Não foi possível conectar ao importador local do SIGEWIN. Inicie o conector e tente novamente.');
        return { importados: 0, indisponivel: true, erro: error.message };
    } finally {
        window.__sigeWinSyncEmAndamento = false;
    }
};

function iniciarSincronizacaoSigeWinFinanceiro() {
    window.sincronizarSigeWinFinanceiro({ silencioso: true });
    window.clearInterval(window.__sigeWinSyncTimer);
    window.__sigeWinSyncTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') window.sincronizarSigeWinFinanceiro({ silencioso: true });
    }, 60000);
}

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
            const sugestaoDescricao = normalizarTexto(sugestao.descricao || '');
            const descricaoFinal = !descricaoFinanceiraRuim(sugestaoDescricao) ? sugestaoDescricao : normalizarTexto(fila.nomeArquivo || file.name.replace(/\.json$/i, ''));
            const valorSugestao = Number(sugestao.valor || 0);
            const valorFinal = valorSugestao > 0 ? valorSugestao : 0;
            const vencimentoFinal = sugestao.vencimento || '';
            const tipoFinal = sugestao.tipo || 'DOCUMENTO';
            const id = `fin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const anexoPrincipal = anexoLocal || fila.anexo || null;
            const categoriaDocumento = detectarCategoriaDocumentoFinanceiro(anexoPrincipal || { nome: fila.nomeArquivo || file.name }, { tipo: tipoFinal, descricao: descricaoFinal });
            const ehNotaFila = categoriaDocumento === 'nota_fiscal' || categoriaDocumento === 'xml' || financeiroEhNotaFiscal({ tipo: tipoFinal, descricao: descricaoFinal, documento: anexoPrincipal });
            const precisaConferencia = !valorFinal || (!ehNotaFila && !vencimentoFinal) || descricaoFinanceiraRuim(descricaoFinal);
            const documentoVinculado = anexoPrincipal ? criarDocumentoVinculadoFinanceiro(anexoPrincipal, categoriaDocumento, 'fila_monitor') : null;
            const registro = {
                id,
                aba: 'caixa-financeira',
                tipo: ehNotaFila ? 'NOTA FISCAL' : normalizarTexto(tipoFinal),
                descricao: descricaoFinal || 'PENDENTE DE CONFERENCIA',
                vencimento: ehNotaFila ? '' : vencimentoFinal,
                dataEmissao: ehNotaFila ? (sugestao.dataEmissao || sugestao.emissao || vencimentoFinal || '') : '',
                valor: Number(valorFinal || 0),
                observacao: sugestao.observacao || `IMPORTADO RAPIDO DA FILA DO MONITOR: ${fila.nomeArquivo || file.name}`,
                pago: false,
                pagoEm: null,
                conferenciaStatus: precisaConferencia ? 'pendente' : 'conferido',
                ia: null,
                geraCobranca: !ehNotaFila,
                situacaoDocumento: ehNotaFila ? 'AGUARDANDO_BOLETO' : 'A_PAGAR',
                documentosVinculados: documentoVinculado ? [documentoVinculado] : [],
                documento: documentoVinculado,
                comprovante: null,
                atualizadoEm: new Date().toISOString(),
                criadoEm: new Date().toISOString()
            };
            const assinaturasRegistro = obterAssinaturasLancamentoFinanceiro(registro);
            if (assinaturasRegistro.some(chave => assinaturasDoLote.has(chave))) {
                duplicados.push({ nome: fila.nomeArquivo || file.name, duplicado: null });
                continue;
            }
            const duplicadoRegistro = buscarLancamentoDuplicadoFinanceiro(registro);
            if (duplicadoRegistro) {
                duplicados.push({ nome: fila.nomeArquivo || file.name, duplicado: duplicadoRegistro });
                continue;
            }
            assinaturasRegistro.forEach(chave => assinaturasDoLote.add(chave));
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

    const cobrancas = lista.filter(financeiroGeraCobranca);
    const vencidos = cobrancas.filter(estaVencido).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const aberto = cobrancas.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
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
        .filter(item => financeiroGeraCobranca(item) && (!inicio || item.vencimento >= inicio) && (!fim || item.vencimento <= fim))
        .reduce((acc, item) => acc + Number(item.valor || 0), 0);
}

window.obterResumoFinanceiroLocal = function(inicio = inicioMesAtual(), fim = fimMesAtual()) {
    const lista = obterLancamentosFinanceiros().filter(item => financeiroGeraCobranca(item) && (!inicio || item.vencimento >= inicio) && (!fim || item.vencimento <= fim));
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
        if (!itens.length && key !== 'todos' && key !== financeiroAbaAtiva) return '';
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

function obterMembrosProcessoVinculoFinanceiro(lista, processoId) {
    if (!processoId) return [];
    return lista
        .filter(item => item.processoVinculoId === processoId)
        .flatMap(item => [item.id, ...(Array.isArray(item.processoVinculoMembros) ? item.processoVinculoMembros : [])])
        .filter(Boolean);
}

window.confirmarVinculoFinanceiro = async function(id, alvoId) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(registro => registro.id === id);
    const alvo = lista.find(registro => registro.id === alvoId);
    if (!item || !alvo) {
        alert('Não foi possível localizar os dois documentos para confirmar o vínculo.');
        return false;
    }

    const ok = confirm([
        'Confirmar vínculo financeiro?',
        '',
        `${item.tipo || 'Documento'}: ${item.descricao || 'Sem descrição'}`,
        `${alvo.tipo || 'Documento'}: ${alvo.descricao || 'Sem descrição'}`,
        '',
        'Os registros continuarão separados, mas passarão a compartilhar o mesmo processo financeiro.'
    ].join('\n'));
    if (!ok) return false;

    const processoIds = new Set([item.processoVinculoId, alvo.processoVinculoId].filter(Boolean));
    const membros = new Set([item.id, alvo.id]);
    processoIds.forEach(processoId => obterMembrosProcessoVinculoFinanceiro(lista, processoId).forEach(membro => membros.add(membro)));
    const processoVinculoId = [...processoIds][0] || `proc_fin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const agora = new Date().toISOString();
    const membrosFinais = Array.from(membros);
    const afetados = lista.filter(registro => membros.has(registro.id));

    afetados.forEach(registro => {
        registro.processoVinculoId = processoVinculoId;
        registro.processoVinculoStatus = 'CONFIRMADO';
        registro.processoVinculoMembros = membrosFinais;
        registro.processoVinculoConfirmadoEm = agora;
        registro.processoVinculoSugestao = [];
        registro.atualizadoEm = agora;
    });

    // comprovante no processo = o boleto foi pago
    const comprovante = afetados.find(registro => classeDocumentoFinanceiro(registro) === 'comprovante');
    let baixados = 0;
    if (comprovante) {
        const dataPagamento = comprovante.dataEmissao || comprovante.vencimento || agora.slice(0, 10);
        afetados.filter(registro => registro !== comprovante && financeiroGeraCobranca(registro) && !registro.pago).forEach(registro => {
            registro.pago = true;
            registro.pagoEm = dataPagamento;
            registro.pagoOrigem = `Comprovante: ${comprovante.descricao || 'pagamento'}`;
            registro.pagoPor = window.App?.userName || '';
            baixados++;
        });
    }
    salvarLancamentosFinanceiros(lista);
    await Promise.all(afetados.map(registro => salvarFinanceiroNuvem(registro)));
    renderFinanceiro();
    alert(`Vínculo financeiro confirmado.${baixados ? ` ${baixados} boleto(s) marcado(s) como pago pelo comprovante.` : ''}`);
    return true;
};

window.desvincularProcessoFinanceiro = async function(id) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(registro => registro.id === id);
    if (!item?.processoVinculoId) return false;
    const ok = confirm('Desfazer o vínculo deste processo financeiro? Os documentos continuarão cadastrados separadamente.');
    if (!ok) return false;

    const membros = new Set(obterMembrosProcessoVinculoFinanceiro(lista, item.processoVinculoId));
    const afetados = lista.filter(registro => membros.has(registro.id));
    const agora = new Date().toISOString();
    afetados.forEach(registro => {
        registro.processoVinculoId = null;
        registro.processoVinculoStatus = 'DESVINCULADO';
        registro.processoVinculoMembros = [];
        registro.processoVinculoDesvinculadoEm = agora;
        registro.atualizadoEm = agora;
    });
    salvarLancamentosFinanceiros(lista);
    await Promise.all(afetados.map(registro => salvarFinanceiroNuvem(registro)));
    renderFinanceiro();
    alert('Vínculo desfeito. Os documentos continuam preservados na lista financeira.');
    return true;
};

window.abrirProcessoFinanceiro = function(id) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(registro => registro.id === id);
    if (!item?.processoVinculoId) return false;
    const membros = new Set(obterMembrosProcessoVinculoFinanceiro(lista, item.processoVinculoId));
    membros.add(item.id);
    const relacionados = lista.filter(registro => membros.has(registro.id));
    const overlay = document.createElement('div');
    overlay.className = 'financeiro-import-modal';
    overlay.innerHTML = `
        <div class="financeiro-import-box">
            <div class="financeiro-import-head">
                <div>
                    <h3><i class="fa-solid fa-link"></i> Processo financeiro</h3>
                    <small>${relacionados.length} documento(s) relacionado(s) · confirmado em ${dataHoraBR(item.processoVinculoConfirmadoEm)}</small>
                </div>
                <button type="button" class="btn-secondary" data-action="fechar"><i class="fa-solid fa-xmark"></i> Fechar</button>
            </div>
            <div class="financeiro-import-grid" style="display:block; margin-top:14px;">
                <div style="overflow:auto; border:1px solid rgba(148,163,184,.2); border-radius:8px;">
                    <table style="width:100%; border-collapse:collapse; min-width:620px;">
                        <thead><tr><th style="text-align:left; padding:9px;">Tipo</th><th style="text-align:left; padding:9px;">Descrição</th><th style="text-align:left; padding:9px;">Data</th><th style="text-align:right; padding:9px;">Valor</th><th style="text-align:left; padding:9px;">Status</th></tr></thead>
                        <tbody>${relacionados.map(registro => {
                            const status = obterStatusItem(registro);
                            return `<tr><td style="padding:9px; border-top:1px solid rgba(148,163,184,.14);">${escapeHtmlFinanceiro(registro.tipo || 'DOCUMENTO')}</td><td style="padding:9px; border-top:1px solid rgba(148,163,184,.14);">${escapeHtmlFinanceiro(registro.descricao || 'Sem descrição')}</td><td style="padding:9px; border-top:1px solid rgba(148,163,184,.14);">${dataBR(obterDataFinanceiroExibicao(registro))}</td><td style="padding:9px; border-top:1px solid rgba(148,163,184,.14); text-align:right;">${formatarMoeda(registro.valor)}</td><td style="padding:9px; border-top:1px solid rgba(148,163,184,.14);"><span class="financeiro-status-badge ${status.classe}">${status.label}</span></td></tr>`;
                        }).join('')}</tbody>
                    </table>
                </div>
            </div>
            <div class="financeiro-import-actions">
                <button type="button" class="btn-danger" data-action="desvincular"><i class="fa-solid fa-link-slash"></i> Desfazer vínculo</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="fechar"]')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('[data-action="desvincular"]')?.addEventListener('click', async () => {
        overlay.remove();
        await window.desvincularProcessoFinanceiro(item.id);
    });
    overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.remove();
    });
    return true;
};

window.recalcularSugestoesVinculoFinanceiro = async function() {
    if (window.App?.userData?.modoTeste) {
        alert('A varredura de vínculos fica disponível somente fora do modo teste local.');
        return { encontrados: 0, alterados: 0, somenteLeitura: true };
    }
    const lista = obterLancamentosFinanceiros();
    if (lista.length < 2) {
        alert('É preciso ter pelo menos dois documentos financeiros cadastrados para procurar vínculos.');
        return { encontrados: 0, alterados: 0 };
    }
    const ok = confirm('Procurar vínculos entre notas fiscais, boletos e comprovantes?\n\nApenas sugestões serão salvas. Nenhum documento será juntado ou excluído automaticamente.');
    if (!ok) return { encontrados: 0, alterados: 0, cancelado: true };

    let encontrados = 0;
    const alterados = [];
    lista.forEach(item => {
        if (item.processoVinculoId) return;
        const sugestoes = obterSugestoesVinculoFinanceiro(item, lista.filter(registro => registro.id !== item.id));
        encontrados += sugestoes.length;
        if (JSON.stringify(item.processoVinculoSugestao || []) !== JSON.stringify(sugestoes)) {
            item.processoVinculoSugestao = sugestoes;
            item.atualizadoEm = new Date().toISOString();
            alterados.push(item);
        }
    });

    if (alterados.length) {
        salvarLancamentosFinanceiros(lista);
        await Promise.all(alterados.map(item => salvarFinanceiroNuvem(item)));
    }
    renderFinanceiro();
    alert(encontrados
        ? `${encontrados} sugestão(ões) de vínculo encontrada(s). Revise cada uma antes de confirmar.`
        : 'Nenhum vínculo seguro foi encontrado pela regra atual.');
    return { encontrados, alterados: alterados.length };
};

function normalizarDocumentoPessoaConciliacao(valor = '') {
    return String(valor || '').replace(/\D/g, '');
}

function normalizarTextoConciliacao(valor = '') {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim();
}

function obterDocumentoClienteConciliacao(cliente = {}) {
    return normalizarDocumentoPessoaConciliacao(cliente.cnpj || cliente.cpf || cliente.documento || cliente.cnpjCpf || '');
}

function obterBaseNfConciliacao(valor = '') {
    const chave = String(valor || 'INTEIRA').toUpperCase();
    const bases = {
        INTEIRA: { fator: 1, descricao: 'nota inteira' },
        MEIA: { fator: 0.5, descricao: 'meia nota' },
        TERCO: { fator: 1 / 3, descricao: '1/3 da nota' },
        QUARTO: { fator: 0.25, descricao: '1/4 da nota' }
    };
    return bases[chave] || bases.INTEIRA;
}

function arredondarBaixoConciliacao(valor = 0, casas = 2) {
    const fator = 10 ** casas;
    return Math.floor((Number(valor || 0) * fator) + 0.0000001) / fator;
}

function obterDataRomaneioConciliacao(romaneio = {}) {
    return String(
        romaneio.logistica?.dataCarregamento
        || romaneio.logistica?.dataDescarregamento
        || romaneio.data
        || romaneio.dataCriacao
        || romaneio.criadoEm
        || ''
    ).slice(0, 10);
}

function obterNomeClienteRomaneioConciliacao(romaneio = {}) {
    return String(romaneio.cliente || romaneio.clienteNome || '').trim();
}

function obterMadeiraRomaneioConciliacao(romaneio = {}) {
    const pacotes = Array.isArray(romaneio.pacotes) ? romaneio.pacotes : [];
    const totalPacotes = pacotes.reduce((total, pacote) => {
        const valorSalvo = Number(pacote.valorTotalWood || 0);
        if (valorSalvo > 0) return total + valorSalvo;
        const volume = Number(pacote.m3VendaExato || pacote.m3VendaTotal || 0);
        return total + (volume * Number(pacote.precoM3 || 0));
    }, 0);
    return arredondarBaixoConciliacao(totalPacotes, 2);
}

function obterResumoFiscalRomaneioConciliacao(romaneio = {}, cliente = {}) {
    const madeira = obterMadeiraRomaneioConciliacao(romaneio);
    const adicional = Number(romaneio.financeiro?.adicionalMadeira || 0);
    const madeiraAjustada = arredondarBaixoConciliacao(madeira + adicional, 2);
    const baseConfig = obterBaseNfConciliacao(romaneio.financeiro?.baseNF || cliente.baseNF || 'INTEIRA');
    const base = arredondarBaixoConciliacao(madeiraAjustada * baseConfig.fator, 2);
    const taxa = Number(romaneio.financeiro?.taxaNF ?? cliente.porcentagemNF ?? 0) || 0;
    const imposto = arredondarBaixoConciliacao(base * (taxa / 100), 2);
    return {
        madeira,
        madeiraAjustada,
        base,
        taxa,
        imposto,
        esperadoNf: arredondarBaixoConciliacao(base + imposto, 2),
        totalRomaneio: Number(romaneio.financeiro?.totalGeral || madeiraAjustada + imposto || 0),
        baseDescricao: baseConfig.descricao,
        fatorBase: baseConfig.fator
    };
}

function obterDestinatarioNotaConciliacao(registro = {}) {
    return {
        nome: String(registro.ia?.destinatario || registro.destinatario || '').trim(),
        documento: normalizarDocumentoPessoaConciliacao(registro.ia?.destinatarioCnpj || registro.destinatarioCnpj || '')
    };
}

function obterDataNotaConciliacao(registro = {}) {
    return String(registro.dataEmissao || registro.emissao || obterDataFinanceiroExibicao(registro) || '').slice(0, 10);
}

function obterNumeroNotaConciliacao(registro = {}) {
    return String(registro.ia?.numeroDocumento || registro.numeroDocumento || '').trim();
}

function obterChaveNotaConciliacao(registro = {}) {
    return normalizarDocumentoPessoaConciliacao(registro.ia?.chaveNfe || registro.ia?.chaveNFe || registro.chaveNfe || '');
}

function obterClienteDaNotaConciliacao(nota = {}, clientes = []) {
    const destinatario = obterDestinatarioNotaConciliacao(nota);
    const nome = normalizarTextoConciliacao(destinatario.nome);
    const porDocumento = destinatario.documento
        ? clientes.find(cliente => obterDocumentoClienteConciliacao(cliente) === destinatario.documento)
        : null;
    if (porDocumento) return { cliente: porDocumento, confianca: 'alta', motivo: 'CNPJ/CPF do destinatário' };
    const porNome = nome
        ? clientes.filter(cliente => normalizarTextoConciliacao(cliente.nome) === nome)
        : [];
    if (porNome.length === 1) return { cliente: porNome[0], confianca: 'media', motivo: 'nome exato do destinatário' };
    return { cliente: null, confianca: 'baixa', motivo: destinatario.nome ? 'cliente não localizado pelo CNPJ/nome' : 'NF-e sem destinatário identificado' };
}

function romaneioJaTemNotaConciliacao(romaneio = {}, chaveNfe = '', financeiroId = '') {
    const links = Array.isArray(romaneio.documentosFinanceirosVinculados) ? romaneio.documentosFinanceirosVinculados : [];
    return links.some(link => {
        const mesmaChave = chaveNfe && normalizarDocumentoPessoaConciliacao(link.chaveNfe || '') === chaveNfe;
        const mesmoFinanceiro = financeiroId && String(link.financeiroId || '') === String(financeiroId);
        return mesmaChave || mesmoFinanceiro;
    });
}

function criarSugestoesNfeRomaneio(nota = {}, clientes = [], romaneios = []) {
    const clienteInfo = obterClienteDaNotaConciliacao(nota, clientes);
    const destinatario = obterDestinatarioNotaConciliacao(nota);
    const cliente = clienteInfo.cliente;
    const nomeNota = normalizarTextoConciliacao(destinatario.nome);
    const dataNota = obterDataNotaConciliacao(nota);
    const valorNota = Number(nota.valor || 0);
    const chaveNfe = obterChaveNotaConciliacao(nota);
    const romaneiosElegiveis = romaneios.filter(romaneio => {
        if (romaneioJaTemNotaConciliacao(romaneio, chaveNfe, nota.id)) return false;
        const mesmoId = cliente?.id && String(romaneio.clienteId || '') === String(cliente.id);
        const mesmoNome = nomeNota && normalizarTextoConciliacao(obterNomeClienteRomaneioConciliacao(romaneio)) === nomeNota;
        return Boolean(mesmoId || mesmoNome);
    });

    const candidatos = romaneiosElegiveis.map(romaneio => {
        const dataRomaneio = obterDataRomaneioConciliacao(romaneio);
        const dias = diferencaDiasFinanceiro(dataNota, dataRomaneio);
        if (dias !== null && dias > 90) return null;
        const resumo = obterResumoFiscalRomaneioConciliacao(romaneio, cliente || {});
        const diferenca = Math.abs(valorNota - resumo.esperadoNf);
        const baseComparacao = Math.max(Math.abs(resumo.esperadoNf), Math.abs(valorNota), 1);
        const diferencaPercentual = diferenca / baseComparacao;
        let pontuacao = cliente?.id && String(romaneio.clienteId || '') === String(cliente.id) ? 80 : 60;
        const motivos = [clienteInfo.motivo];
        if (dias === null) {
            motivos.push('data não informada');
        } else if (dias <= 1) {
            pontuacao += 25;
            motivos.push('mesma data ou data seguinte');
        } else if (dias <= 7) {
            pontuacao += 18;
            motivos.push(`${Math.round(dias)} dias de diferença`);
        } else if (dias <= 30) {
            pontuacao += 10;
            motivos.push(`${Math.round(dias)} dias de diferença`);
        } else {
            pontuacao += 2;
            motivos.push(`${Math.round(dias)} dias de diferença`);
        }
        if (resumo.esperadoNf > 0 && valorNota > 0) {
            if (diferenca <= 0.5) {
                pontuacao += 30;
                motivos.push('valor da NF confere com a base calculada');
            } else if (diferencaPercentual <= 0.02) {
                pontuacao += 22;
                motivos.push('valor da NF próximo da base calculada');
            } else if (diferencaPercentual <= 0.1) {
                pontuacao += 12;
                motivos.push('valor com pequena diferença');
            } else if (diferencaPercentual <= 0.25) {
                pontuacao += 4;
                motivos.push('valor precisa ser conferido');
            }
        }
        const confianca = pontuacao >= 130 ? 'alta' : (pontuacao >= 105 ? 'media' : 'baixa');
        return {
            notaId: nota.id,
            romaneioId: romaneio.id,
            clienteId: cliente?.id || romaneio.clienteId || '',
            clienteNome: cliente?.nome || obterNomeClienteRomaneioConciliacao(romaneio) || destinatario.nome || 'Cliente não identificado',
            numeroNota: obterNumeroNotaConciliacao(nota),
            chaveNfe,
            valorNota,
            dataNota,
            numeroRomaneio: String(romaneio.numero || romaneio.numeroCarga || romaneio.romaneio || '-'),
            dataRomaneio,
            valorEsperadoNf: resumo.esperadoNf,
            valorRomaneio: resumo.totalRomaneio,
            diferencaValor: diferenca,
            diferencaPercentual,
            baseDescricao: resumo.baseDescricao,
            fatorBase: resumo.fatorBase,
            taxaNF: resumo.taxa,
            pontuacao,
            confianca,
            motivos,
            romaneio
        };
    }).filter(Boolean)
        .filter(candidato => candidato.pontuacao >= 90)
        .sort((a, b) => b.pontuacao - a.pontuacao)
        .slice(0, 3);

    return {
        nota,
        cliente,
        clienteInfo,
        destinatario,
        candidatos
    };
}

function fecharModalConciliacaoNfe() {
    document.getElementById('financeiroConciliacaoNfeModal')?.remove();
}

window.confirmarVinculoNfeRomaneio = async function(financeiroId, romaneioId, sugestao = {}) {
    if (window.App?.userData?.modoTeste) {
        alert('A confirmação de vínculos exige uma sessão real, fora do modo teste local.');
        return false;
    }
    if (!window.FS) {
        alert('A conexão com o banco de dados ainda não está disponível.');
        return false;
    }
    const lista = obterLancamentosFinanceiros();
    const financeiro = lista.find(item => item.id === financeiroId);
    if (!financeiro) {
        alert('A NF-e não foi encontrada na lista financeira.');
        return false;
    }
    if (financeiro.vinculoRomaneioId) {
        alert(`Esta NF-e já está vinculada ao romaneio ${financeiro.vinculoRomaneio?.numeroRomaneio || ''}.`);
        return false;
    }

    const romaneio = await window.FS.getDoc('romaneios', romaneioId);
    if (!romaneio) {
        alert('O romaneio não foi encontrado. Atualize a lista e tente novamente.');
        return false;
    }
    const linksAntigos = Array.isArray(romaneio.documentosFinanceirosVinculados)
        ? romaneio.documentosFinanceirosVinculados.slice()
        : [];
    const outrosLinks = linksAntigos.filter(link => String(link.financeiroId || '') !== String(financeiroId));
    if (outrosLinks.length) {
        const continuar = confirm(`O romaneio ${sugestao.numeroRomaneio || romaneio.numero || '-'} já possui outra NF-e vinculada. Deseja acrescentar esta nota sem remover a anterior?`);
        if (!continuar) return false;
    }

    const agora = new Date().toISOString();
    const chaveNfe = sugestao.chaveNfe || obterChaveNotaConciliacao(financeiro);
    const vinculo = {
        financeiroId,
        chaveNfe,
        numeroNota: sugestao.numeroNota || obterNumeroNotaConciliacao(financeiro),
        serie: String(financeiro.ia?.serie || financeiro.serie || ''),
        valorNota: Number(financeiro.valor || sugestao.valorNota || 0),
        dataEmissao: obterDataNotaConciliacao(financeiro),
        baseNF: sugestao.baseDescricao || '',
        fatorBase: Number(sugestao.fatorBase || 1),
        taxaNF: Number(sugestao.taxaNF || 0),
        valorEsperadoNf: Number(sugestao.valorEsperadoNf || 0),
        vinculadoEm: agora
    };
    const novoLink = [...outrosLinks, vinculo];
    const ultimaConciliacaoAnterior = romaneio.ultimaConciliacaoFiscalEm || null;

    try {
        await window.FS.updateDoc('romaneios', romaneioId, {
            documentosFinanceirosVinculados: novoLink,
            ultimaConciliacaoFiscalEm: agora
        });
        const atualizado = {
            ...financeiro,
            vinculoRomaneioId: romaneioId,
            vinculoRomaneio: {
                romaneioId,
                numeroRomaneio: sugestao.numeroRomaneio || romaneio.numero || romaneio.numeroCarga || '',
                clienteId: sugestao.clienteId || romaneio.clienteId || '',
                cliente: sugestao.clienteNome || romaneio.cliente || '',
                chaveNfe,
                baseNF: sugestao.baseDescricao || '',
                fatorBase: Number(sugestao.fatorBase || 1),
                taxaNF: Number(sugestao.taxaNF || 0),
                valorEsperadoNf: Number(sugestao.valorEsperadoNf || 0),
                confirmadoEm: agora
            },
            atualizadoEm: agora
        };
        await salvarFinanceiroNuvem(atualizado);
        Object.assign(financeiro, atualizado);
        salvarLancamentosFinanceiros(lista);
        window.renderFinanceiro();
        return true;
    } catch (error) {
        try {
            await window.FS.updateDoc('romaneios', romaneioId, {
                documentosFinanceirosVinculados: linksAntigos,
                ultimaConciliacaoFiscalEm: ultimaConciliacaoAnterior
            });
        } catch (rollbackError) {
            console.error('Falha ao desfazer vínculo parcial de NF-e/romaneio:', rollbackError);
        }
        console.error('Falha ao confirmar vínculo entre NF-e e romaneio:', error);
        alert('Não foi possível confirmar o vínculo. Os lançamentos originais foram preservados.');
        return false;
    }
};

window.conciliarNfeComRomaneios = async function() {
    if (window.App?.userData?.modoTeste) {
        alert('A conciliação exige uma sessão real, fora do modo teste local.');
        return { encontrados: 0, somenteLeitura: true };
    }
    if (!window.FS) {
        alert('A conexão com o banco de dados ainda não está disponível.');
        return { encontrados: 0 };
    }
    try {
        const [clientes, romaneios] = await Promise.all([
            window.FS.getCollection('clientes'),
            window.FS.getCollection('romaneios')
        ]);
        const notas = obterLancamentosFinanceiros().filter(item => financeiroEhNotaFiscal(item) && !item.vinculoRomaneioId);
        if (!notas.length) {
            alert('Nenhuma NF-e pendente de vínculo foi encontrada na lista financeira.');
            return { encontrados: 0 };
        }
        const resultados = notas.map(nota => criarSugestoesNfeRomaneio(nota, clientes, romaneios));
        const encontrados = resultados.reduce((total, resultado) => total + resultado.candidatos.length, 0);
        const modal = document.createElement('div');
        modal.id = 'financeiroConciliacaoNfeModal';
        modal.className = 'financeiro-import-modal';
        modal.innerHTML = `
            <div class="financeiro-import-box" style="width:min(1120px,96vw); max-height:90vh; overflow:auto;">
                <div class="financeiro-import-head">
                    <div>
                        <h3><i class="fa-solid fa-file-circle-check"></i> Conciliação de NF-e com romaneios</h3>
                        <small>${notas.length} NF-e pendente(s) analisada(s) · ${encontrados} sugestão(ões) encontrada(s). Nenhum vínculo é confirmado automaticamente.</small>
                    </div>
                    <button type="button" class="btn-secondary" data-action="fechar"><i class="fa-solid fa-xmark"></i> Fechar</button>
                </div>
                <div style="margin:14px 0 10px; padding:10px 12px; border-radius:8px; background:rgba(14,165,163,.12); border:1px solid rgba(14,165,163,.28); color:#d7fffb; font-size:.82rem;">
                    A comparação usa o cliente pelo CNPJ/CPF, a data e o valor esperado da NF. Para a LOUV PALLETS, a base será meia nota somente se essa regra estiver salva no cadastro ou no romaneio.
                </div>
                <div style="display:grid; gap:10px; margin-top:12px;">
                    ${resultados.map(resultado => {
                        const nota = resultado.nota;
                        const numero = obterNumeroNotaConciliacao(nota) || '-';
                        const nome = resultado.destinatario.nome || 'Destinatário não identificado';
                        const notaResumo = `<strong>NF-e ${escapeHtmlFinanceiro(numero)}</strong><small>${escapeHtmlFinanceiro(nome)} · ${dataBR(obterDataNotaConciliacao(nota))} · ${formatarMoeda(nota.valor)}</small>`;
                        if (!resultado.candidatos.length) {
                            return `<div style="padding:12px; border:1px solid rgba(248,113,113,.35); border-radius:8px; background:rgba(127,29,29,.14);"><div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">${notaResumo}<span style="color:#fecaca; font-weight:800;">Sem sugestão segura</span></div><small style="display:block; margin-top:5px; color:#fecaca;">${escapeHtmlFinanceiro(resultado.clienteInfo.motivo)}. Confira o cliente ou o romaneio manualmente.</small></div>`;
                        }
                        return resultado.candidatos.map((candidato, indice) => `
                            <div data-conciliacao-row="${escapeHtmlFinanceiro(`${nota.id}-${candidato.romaneioId}-${indice}`)}" style="padding:12px; border:1px solid rgba(148,163,184,.28); border-radius:8px; background:rgba(15,23,42,.46);">
                                <div style="display:grid; grid-template-columns:minmax(220px,1.1fr) minmax(250px,1.5fr) auto; gap:12px; align-items:center;">
                                    <div style="display:flex; flex-direction:column; gap:3px; min-width:0;">${notaResumo}<small style="color:#cbd5e1;">${escapeHtmlFinanceiro(candidato.clienteNome)} · confiança ${escapeHtmlFinanceiro(candidato.confianca)}</small></div>
                                    <div style="display:flex; flex-direction:column; gap:3px; min-width:0;"><strong>Romaneio ${escapeHtmlFinanceiro(candidato.numeroRomaneio)}</strong><small>${escapeHtmlFinanceiro(candidato.dataRomaneio ? dataBR(candidato.dataRomaneio) : '-')} · esperado NF ${formatarMoeda(candidato.valorEsperadoNf)}</small><small style="color:#fcd34d;">Base: ${escapeHtmlFinanceiro(candidato.baseDescricao)} · ${Number(candidato.taxaNF || 0).toLocaleString('pt-BR')}% · diferença ${formatarMoeda(candidato.diferencaValor)}</small></div>
                                    <button type="button" class="btn-primary" data-action="confirmar" data-financeiro-id="${escapeHtmlFinanceiro(nota.id)}" data-romaneio-id="${escapeHtmlFinanceiro(candidato.romaneioId)}" style="white-space:nowrap;"><i class="fa-solid fa-link"></i> Confirmar vínculo</button>
                                </div>
                                <small style="display:block; margin-top:8px; color:#94a3b8;">${escapeHtmlFinanceiro(candidato.motivos.join(' · '))}</small>
                            </div>
                        `).join('');
                    }).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('[data-action="fechar"]')?.addEventListener('click', fecharModalConciliacaoNfe);
        modal.querySelectorAll('[data-action="confirmar"]').forEach(botao => {
            botao.addEventListener('click', async () => {
                botao.disabled = true;
                botao.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
                const resultado = resultados.find(item => item.nota.id === botao.dataset.financeiroId);
                const sugestao = resultado?.candidatos.find(item => item.romaneioId === botao.dataset.romaneioId) || {};
                const ok = await window.confirmarVinculoNfeRomaneio(botao.dataset.financeiroId, botao.dataset.romaneioId, sugestao);
                if (ok) {
                    botao.closest('[data-conciliacao-row]')?.remove();
                    const restantes = modal.querySelectorAll('[data-action="confirmar"]').length;
                    if (!restantes) fecharModalConciliacaoNfe();
                } else {
                    botao.disabled = false;
                    botao.innerHTML = '<i class="fa-solid fa-link"></i> Confirmar vínculo';
                }
            });
        });
        modal.addEventListener('click', event => {
            if (event.target === modal) fecharModalConciliacaoNfe();
        });
        return { encontrados, analisados: notas.length };
    } catch (error) {
        console.error('Falha ao conciliar NF-e com romaneios:', error);
        alert('Não foi possível consultar clientes e romaneios para a conciliação.');
        return { encontrados: 0, erro: true };
    }
};

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
    financeiroClassificacaoManual = false;
    document.querySelectorAll('.financeiro-classificacao-manual').forEach(elemento => {
        elemento.hidden = true;
    });
    const botaoClassificacao = document.getElementById('btnAlternarClassificacaoFinanceira');
    if (botaoClassificacao) botaoClassificacao.innerHTML = '<i class="fa-solid fa-sliders"></i> Ajustar manualmente';
    const situacao = document.getElementById('financeiroSituacaoDocumento');
    if (situacao) situacao.value = 'A_PAGAR';
    const categoria = document.getElementById('financeiroDocumentoCategoria');
    if (categoria) categoria.value = 'AUTO';
    financeiroAnexosTemp = { documento: null, comprovante: null };
    financeiroDadosLeituraTemp = null;
    preencherNomeArquivo('documento', null);
    preencherNomeArquivo('comprovante', null);
    atualizarStatusToggle();
    atualizarDatalistsFinanceiro();
    atualizarClassificacaoFinanceiraUI({ tipo: '', descricao: '', conferenciaStatus: 'conferido' });
};

// Previsão do que ainda vai ser pago: contas em aberto com vencimento nos próximos N dias
// (escolhidos pelo usuário), mais o que já está atrasado. Conta só o que gera cobrança
// (boletos/contas), para não somar nota e boleto do mesmo gasto.
let financeiroPrevisaoDias = (() => { try { return Number(localStorage.getItem('orquestra_fin_previsao_dias')) || 7; } catch (_) { return 7; } })();
function renderPrevisaoFinanceiro() {
    const corpo = document.getElementById('financeiroPrevisaoCorpo');
    if (!corpo) return;
    document.querySelectorAll('[data-prev-dias]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.prevDias) === financeiroPrevisaoDias)));
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hojeIso = iso(hoje);
    const fim = new Date(hoje); fim.setDate(fim.getDate() + financeiroPrevisaoDias);
    const fimIso = iso(fim);
    const abertos = obterLancamentosFinanceiros().filter(i => !i.pago && financeiroGeraCobranca(i) && Number(i.valor || 0) > 0 && i.vencimento);
    const atrasados = abertos.filter(i => i.vencimento < hojeIso);
    const proximos = abertos.filter(i => i.vencimento >= hojeIso && i.vencimento <= fimIso).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const soma = l => l.reduce((s, i) => s + Number(i.valor || 0), 0);
    const pagoMes = obterLancamentosFinanceiros().filter(i => {
        if (!i.pago || !i.pagoEm) return false;
        const d = new Date(i.pagoEm);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }).reduce((s, i) => s + Number(i.valor || 0), 0);
    const totalProx = soma(proximos), totalAtr = soma(atrasados);
    // agrupa por semana (ou por dia quando o período é de 7 dias)
    const grupos = new Map();
    proximos.forEach(i => {
        const d = new Date(i.vencimento + 'T12:00:00');
        let chave, rotulo;
        if (financeiroPrevisaoDias <= 7) { chave = i.vencimento; rotulo = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
        else { const ini = new Date(d); ini.setDate(d.getDate() - ((d.getDay() + 6) % 7)); chave = iso(ini); const f = new Date(ini); f.setDate(ini.getDate() + 6); rotulo = `Semana ${ini.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${f.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`; }
        const g = grupos.get(chave) || { rotulo, total: 0, qtd: 0 }; g.total += Number(i.valor || 0); g.qtd++; grupos.set(chave, g);
    });
    const maxG = Math.max(1, ...[...grupos.values()].map(g => g.total));
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const dataBR = v => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR');
    const diasAte = v => Math.round((new Date(v + 'T12:00:00') - hoje) / 86400000);
    corpo.innerHTML = `
      <div class="fin-prev-kpis">
        <div class="${totalAtr > 0 ? 'atrasado' : ''}"><small>Atrasado</small><b>${formatarMoeda(totalAtr)}</b><small>${atrasados.length} conta(s)</small></div>
        <div class="destaque"><small>Vence nos próximos ${financeiroPrevisaoDias} dias</small><b>${formatarMoeda(totalProx)}</b><small>${proximos.length} conta(s)</small></div>
        <div><small>Em aberto (todas)</small><b>${formatarMoeda(soma(abertos))}</b><small>${abertos.length} conta(s)</small></div>
        <div class="ok"><small>Pago neste mês</small><b>${formatarMoeda(pagoMes)}</b></div>
      </div>
      ${grupos.size ? `<div class="fin-prev-barras">${[...grupos.values()].map(g => `<div class="fin-prev-barra"><span>${esc(g.rotulo)}</span><div><i style="width:${Math.max(3, g.total / maxG * 100).toFixed(1)}%"></i></div><b>${formatarMoeda(g.total)}</b><small>${g.qtd}</small></div>`).join('')}</div>` : ''}
      ${proximos.length ? `<div class="fin-prev-lista"><table data-no-column-resize="true"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Tipo</th><th class="num">Valor</th></tr></thead><tbody>
        ${proximos.map(i => { const d = diasAte(i.vencimento); return `<tr><td>${dataBR(i.vencimento)}<small>${d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`}</small></td><td><b>${esc(i.descricao || '-')}</b></td><td><small>${esc(i.tipo || '-')}</small></td><td class="num">${formatarMoeda(i.valor)}</td></tr>`; }).join('')}
      </tbody></table></div>` : `<p class="fin-prev-vazio">Nenhuma conta em aberto vencendo nos próximos ${financeiroPrevisaoDias} dias.</p>`}`;
}
document.addEventListener('click', e => {
    const b = e.target.closest('[data-prev-dias]');
    if (!b) return;
    financeiroPrevisaoDias = Number(b.dataset.prevDias) || 7;
    try { localStorage.setItem('orquestra_fin_previsao_dias', String(financeiroPrevisaoDias)); } catch (_) { /* sem armazenamento */ }
    renderPrevisaoFinanceiro();
});

window.renderFinanceiro = function() {
    try { renderPrevisaoFinanceiro(); } catch (err) { console.error('Previsão financeira', err); }
    const tbody = document.getElementById('financeiroLista');
    if (!tbody) return;

    atualizarKpisFinanceiro();
    renderPastasFinanceiras();
    atualizarDatalistsFinanceiro();

    const filtroStatus = document.getElementById('financeiroFiltroStatus')?.value || 'TODOS';
    const ordenacao = document.getElementById('financeiroOrdenacao')?.value || 'VENCIMENTO_ASC';
    const busca = normalizarTexto(document.getElementById('financeiroBusca')?.value);
    const listaCompleta = obterLancamentosFinanceiros();
    const idsDuplicados = obterIdsDuplicadosFinanceiro(listaCompleta);
    let lista = listaCompleta.filter(item => financeiroAbaAtiva === 'todos' || obterPastaFinanceiraItem(item) === financeiroAbaAtiva || item.aba === financeiroAbaAtiva);

    const filtroClasse = document.getElementById('financeiroFiltroClasse')?.value || 'TODOS';
    if (filtroClasse !== 'TODOS') lista = lista.filter(item => classeDocumentoFinanceiro(item) === filtroClasse);
    if (filtroStatus === 'PAGO') lista = lista.filter(item => item.pago);
    if (filtroStatus === 'ABERTO') lista = lista.filter(item => !item.pago && financeiroGeraCobranca(item));
    if (filtroStatus === 'PENDENTE') lista = lista.filter(item => obterStatusFinanceiro(item) === 'PENDENTE');
    if (filtroStatus === 'VENCIDO') lista = lista.filter(estaVencido);
    if (busca) {
        lista = lista.filter(item => [
            item.tipo,
            item.descricao,
            item.observacao,
            item.vencimento,
            item.dataEmissao,
            item.ia?.numeroDocumento,
            item.documento?.nome,
            formatarMoeda(item.valor)
        ].some(valor => normalizarTexto(valor).includes(busca)));
    }

    lista.sort((a, b) => {
        const dir = financeiroOrdenacaoTabela.direcao === 'desc' ? -1 : 1;
        if (financeiroOrdenacaoTabela.campo === 'tipo') return dir * String(a.tipo || '').localeCompare(String(b.tipo || ''), 'pt-BR');
        if (financeiroOrdenacaoTabela.campo === 'descricao') return dir * String(a.descricao || '').localeCompare(String(b.descricao || ''), 'pt-BR');
        if (financeiroOrdenacaoTabela.campo === 'valor') return dir * (Number(a.valor || 0) - Number(b.valor || 0));
        if (financeiroOrdenacaoTabela.campo === 'status') return dir * (obterStatusOrdemFinanceiro(a) - obterStatusOrdemFinanceiro(b));
        if (financeiroOrdenacaoTabela.campo === 'vencimento') return dir * obterDataFinanceiroOrdenacao(a).localeCompare(obterDataFinanceiroOrdenacao(b));
        if (ordenacao === 'VENCIMENTO_DESC') return (b.vencimento || '').localeCompare(a.vencimento || '');
        if (ordenacao === 'CRIADO_DESC') return (b.criadoEm || b.atualizadoEm || '').localeCompare(a.criadoEm || a.atualizadoEm || '');
        if (ordenacao === 'CRIADO_ASC') return (a.criadoEm || a.atualizadoEm || '').localeCompare(b.criadoEm || b.atualizadoEm || '');
        return (a.vencimento || '').localeCompare(b.vencimento || '');
    });
    document.querySelectorAll('[data-sort-icon]').forEach(span => {
        span.textContent = span.dataset.sortIcon === financeiroOrdenacaoTabela.campo
            ? (financeiroOrdenacaoTabela.direcao === 'asc' ? '↑' : '↓')
            : '';
    });
    document.getElementById('financeiroResumoLista').textContent = `${lista.length} registro(s) encontrado(s)`;
    const selecionarTodos = document.getElementById('financeiroSelecionarTodos');
    if (selecionarTodos) {
        selecionarTodos.checked = false;
        selecionarTodos.indeterminate = false;
    }
    const btnExcluirSelecionados = document.getElementById('btnExcluirFinanceiroSelecionados');
    if (btnExcluirSelecionados) btnExcluirSelecionados.style.display = 'none';
    const btnMarcarPagos = document.getElementById('btnMarcarFinanceiroSelecionados');
    if (btnMarcarPagos) btnMarcarPagos.style.display = 'none';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:28px; color:var(--text-muted);">Nenhum documento financeiro encontrado nesta pasta.</td></tr>';
        renderCaixaConferenciaFinanceiro();
        mostrarLembretesFinanceiros();
        return;
    }

    const listaCompletaVinculos = obterLancamentosFinanceiros();
    const porIdVinculos = new Map(listaCompletaVinculos.map(reg => [reg.id, reg]));
    const rotuloVinculo = reg => {
        const classe = classeDocumentoFinanceiro(reg);
        const valor = Number(reg.valor) ? ` ${formatarMoeda(reg.valor)}` : '';
        if (classe === 'nota') return `Nota${numeroNotaVinculoFinanceiro(reg) ? ` nº ${numeroNotaVinculoFinanceiro(reg)}` : ''}${reg.ia?.fornecedor ? ` ${reg.ia.fornecedor}` : ''}${valor}`;
        if (classe === 'comprovante') return `Comprovante${reg.dataEmissao || reg.vencimento ? ` de ${dataBR(reg.dataEmissao || reg.vencimento)}` : ''}${valor}`;
        return `${classe === 'boleto' ? 'Boleto' : (reg.tipo || 'Documento')} ${reg.descricao || ''}${reg.vencimento ? ` venc. ${dataBR(reg.vencimento)}` : ''}${valor}${reg.pago ? ' (pago)' : ''}`;
    };
    tbody.innerHTML = lista.map(item => {
        const status = obterStatusItem(item);
        const duplicado = idsDuplicados.has(item.id);
        const anexos = normalizarDocumentosVinculadosFinanceiro(item).map(doc => {
            const meta = FINANCEIRO_DOC_CATEGORIAS[doc.categoria] || FINANCEIRO_DOC_CATEGORIAS.outro;
            return `<button type="button" class="financeiro-doc-chip" style="--doc-color:${meta.cor};" onclick="window.abrirAnexoFinanceiro('${escapeJsStringFinanceiro(item.id)}', 'vinculado', '${escapeJsStringFinanceiro(doc.id)}')" title="Abrir ${escapeHtmlFinanceiro(meta.label)}: ${escapeHtmlFinanceiro(doc.nome || 'documento')}"><i class="fa-solid ${meta.icone}"></i><span>${escapeHtmlFinanceiro(meta.label)}</span></button>`;
        }).join('');
        const criadoEm = dataHoraBR(item.criadoEm);
        const atualizadoEm = dataHoraBR(item.atualizadoEm);
        const tooltipLancamento = `Lançado no sistema em: ${criadoEm}${atualizadoEm !== criadoEm ? ` | Última alteração: ${atualizadoEm}` : ''}`;
        const ehNota = financeiroEhNotaFiscal(item);
        const dataExibicao = obterDataFinanceiroExibicao(item);
        const sugestaoVinculo = Array.isArray(item.processoVinculoSugestao) ? item.processoVinculoSugestao[0] : null;
        const processoVinculado = Boolean(item.processoVinculoId && item.processoVinculoStatus === 'CONFIRMADO');
        const vinculoRomaneio = item.vinculoRomaneioId
            ? `<small class="financeiro-ia-line"><i class="fa-solid fa-file-circle-check"></i> NF-e vinculada ao romaneio ${escapeHtmlFinanceiro(item.vinculoRomaneio?.numeroRomaneio || item.vinculoRomaneioId)}</small>`
            : '';
        const outrosVinculados = processoVinculado
            ? [...new Set(obterMembrosProcessoVinculoFinanceiro(listaCompletaVinculos, item.processoVinculoId))].filter(mid => mid !== item.id).map(mid => porIdVinculos.get(mid)).filter(Boolean)
            : [];
        const parcelasNota = Array.isArray(item.ia?.parcelas) && item.ia.parcelas.length && classeDocumentoFinanceiro(item) === 'nota'
            ? `<small class="financeiro-ia-line"><i class="fa-solid fa-calendar-days"></i> ${item.ia.formaPagamento ? `${escapeHtmlFinanceiro(item.ia.formaPagamento)} · ` : ''}${item.ia.parcelas.map(p => `${p.numero ? `${escapeHtmlFinanceiro(p.numero)}: ` : ''}${dataBR(p.vencimento)} ${formatarMoeda(p.valor)}`).join(' · ')}</small>`
            : (item.ia?.formaPagamento && classeDocumentoFinanceiro(item) === 'nota' ? `<small class="financeiro-ia-line"><i class="fa-solid fa-money-bill"></i> ${escapeHtmlFinanceiro(item.ia.formaPagamento)}</small>` : '');
        const pagoOrigem = item.pago && item.pagoOrigem ? `<small class="financeiro-ia-line"><i class="fa-solid fa-circle-check"></i> ${escapeHtmlFinanceiro(item.pagoOrigem)}</small>` : '';
        const vinculoResumo = processoVinculado
            ? `${outrosVinculados.length ? outrosVinculados.map(reg => `<small class="financeiro-ia-line"><i class="fa-solid fa-link"></i> ${escapeHtmlFinanceiro(rotuloVinculo(reg))}</small>`).join('') : '<small class="financeiro-ia-line"><i class="fa-solid fa-link"></i> Processo financeiro vinculado</small>'}${parcelasNota}${pagoOrigem}`
            : (sugestaoVinculo
                ? `<small class="financeiro-ia-line"><i class="fa-solid fa-link"></i> Combina com ${escapeHtmlFinanceiro(sugestaoVinculo.descricao || sugestaoVinculo.tipo || 'outro documento')} (${escapeHtmlFinanceiro(sugestaoVinculo.confianca || 'baixa')})</small>${parcelasNota}${pagoOrigem}`
                : `${parcelasNota}${pagoOrigem}`);
        const vinculoAcao = sugestaoVinculo
            ? `<button type="button" class="btn-icon financeiro-acao-vinculo" onclick="event.stopPropagation(); window.confirmarVinculoFinanceiro('${escapeJsStringFinanceiro(item.id)}', '${escapeJsStringFinanceiro(sugestaoVinculo.registroId)}')" title="Revisar vínculo sugerido com ${escapeHtmlFinanceiro(sugestaoVinculo.descricao || 'outro documento')}" aria-label="Revisar vínculo sugerido"><i class="fa-solid fa-link"></i></button>`
            : (processoVinculado
                ? `<button type="button" class="btn-icon financeiro-acao-vinculo" onclick="event.stopPropagation(); window.abrirProcessoFinanceiro('${escapeJsStringFinanceiro(item.id)}')" title="Ver processo financeiro vinculado" aria-label="Ver processo financeiro vinculado"><i class="fa-solid fa-link"></i></button>`
                : '');

        return `
            <tr class="financeiro-row ${duplicado ? 'financeiro-row-duplicado' : ''}" title="${tooltipLancamento}" onclick="window.toggleFinanceiroLinha('${escapeJsStringFinanceiro(item.id)}', event)">
                <td><input type="checkbox" class="financeiro-check" value="${item.id}" onchange="window.atualizarSelecaoFinanceiro()"></td>
                <td><span class="financeiro-tipo-pill">${escapeHtmlFinanceiro(item.tipo || 'Documento')}</span></td>
                <td class="financeiro-descricao-cell"><strong>${escapeHtmlFinanceiro(item.descricao || 'Sem descrição')}</strong>${duplicado ? '<span class="financeiro-duplicado-badge"><i class="fa-solid fa-copy"></i> Possível duplicado</span>' : ''}${item.ia ? `<small class="financeiro-ia-line"><i class="fa-solid fa-wand-magic-sparkles"></i> IA ${escapeHtmlFinanceiro(item.ia.confianca || 'media')}${item.ia.fornecedor ? ` - ${escapeHtmlFinanceiro(item.ia.fornecedor)}` : ''}</small>` : ''}${vinculoRomaneio}${vinculoResumo}<small>${escapeHtmlFinanceiro(item.observacao || '')}</small></td>
                <td>${dataBR(dataExibicao)}${ehNota ? '<small>Emissão fiscal</small>' : ''}</td>
                <td><strong>${formatarMoeda(item.valor)}</strong></td>
                <td><span class="financeiro-status-badge ${status.classe}">${status.label}</span></td>
                <td>${anexos || '<span style="color:var(--text-muted);">-</span>'}</td>
                <td class="financeiro-acoes orq-coluna-acoes-fixa">
                    <div class="financeiro-acoes-inner">
                        ${vinculoAcao}
                        <button type="button" class="btn-icon financeiro-acao-ia" onclick="event.stopPropagation(); window.analisarFinanceiroDocumento('${item.id}')" title="Ler documento automaticamente" aria-label="Ler documento automaticamente"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                        <button type="button" class="btn-icon financeiro-acao-editar" onclick="event.stopPropagation(); window.editarFinanceiro('${item.id}')" title="Editar lançamento" aria-label="Editar lançamento"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn-icon financeiro-acao-pago" onclick="event.stopPropagation(); window.alternarPagoFinanceiro('${item.id}')" title="Marcar como pago ou não pago" aria-label="Marcar como pago ou não pago"><i class="fa-solid fa-circle-check"></i></button>
                        <button type="button" class="btn-icon financeiro-acao-excluir" onclick="event.stopPropagation(); window.excluirFinanceiro('${item.id}')" title="Excluir" aria-label="Excluir lançamento"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    renderCaixaConferenciaFinanceiro();
    mostrarLembretesFinanceiros();
};

// =====================================================================
// AUTOMACAO: caixa de conferencia
// Tudo que entra (arquivo, pasta, SIGEWIN, fila, e-mail) cai aqui ja lido.
// O que veio completo e aprovado com 1 clique; o que falta dado mostra o que falta.
// Vinculos NF <-> boleto <-> comprovante sao sugeridos automaticamente.
// =====================================================================
const FINANCEIRO_OUTLOOK_IMPORTADOS_KEY = 'orquestra_financeiro_outlook_importados';
let financeiroCaixaExpandida = false;

function camposFaltandoFinanceiro(item = {}) {
    const faltando = [];
    if (descricaoFinanceiraRuim(item.descricao)) faltando.push('fornecedor');
    if (!(Number(item.valor) > 0)) faltando.push('valor');
    if (!financeiroEhNotaFiscal(item) && !item.vencimento) faltando.push('vencimento');
    return faltando;
}

function financeiroPrecisaConferir(item = {}) {
    return item.conferenciaStatus === 'pendente' && classeDocumentoFinanceiro(item) !== 'comprovante';
}

function financeiroTemVinculoSugerido(item = {}) {
    return !item.processoVinculoId && Array.isArray(item.processoVinculoSugestao) && item.processoVinculoSugestao.length > 0;
}

function usuarioPodeAcessarEstoqueFinanceiro() {
    const secoes = window.App?.userPermissions?.allowedSections || [];
    return secoes.includes('view-estoque');
}

function anexoXmlFinanceiro(item = {}) {
    return normalizarDocumentosVinculadosFinanceiro(item)
        .find(doc => /\.xml$/i.test(doc?.nome || '') || /xml/i.test(doc?.tipo || '') || doc?.categoria === 'xml') || null;
}

function notaAguardandoEstoqueFinanceiro(item = {}) {
    return financeiroEhNotaFiscal(item)
        && !item.vinculoRomaneioId
        && !item.entradaEstoqueEm
        && !item.entradaEstoqueIgnorada
        && Boolean(anexoXmlFinanceiro(item))
        && usuarioPodeAcessarEstoqueFinanceiro();
}

// Documentos da caixa que ja tem lancamento igual salvo (mesmo arquivo, chave da NF-e etc.)
const financeiroDuplicadosLote = new Set();
let financeiroIndiceConferidos = null;
function indiceConferidosFinanceiro(lista = obterLancamentosFinanceiros()) {
    const mapa = new Map();
    lista.filter(reg => !financeiroPrecisaConferir(reg)).forEach(reg => {
        obterAssinaturasLancamentoFinanceiro(reg).forEach(chave => { if (!mapa.has(chave)) mapa.set(chave, reg); });
    });
    return mapa;
}
function lancamentoJaExisteCaixaFinanceiro(item) {
    const indice = financeiroIndiceConferidos || indiceConferidosFinanceiro();
    const classeItem = classeDocumentoFinanceiro(item);
    for (const chave of obterAssinaturasLancamentoFinanceiro(item)) {
        const reg = indice.get(chave);
        if (reg && reg.id !== item.id && classeDocumentoFinanceiro(reg) === classeItem) return reg;
    }
    return null;
}
async function removerDuplicadosCaixaFinanceiro(ids) {
    if (!ids.length) return 0;
    const autorizado = await window.confirmarExclusaoComSenha(`Tirar ${ids.length} documento(s) repetido(s) da caixa de conferência? O lançamento original continua salvo.`);
    if (!autorizado) return 0;
    let removidos = 0;
    for (const id of ids) {
        if (await excluirFinanceiroNuvem(id).catch(() => false)) removidos++;
    }
    const tirar = new Set(ids);
    salvarLancamentosFinanceiros(obterLancamentosFinanceiros().filter(reg => !tirar.has(reg.id)));
    renderFinanceiro();
    return removidos;
}
window.tirarRepetidosCaixaFinanceiro = async function(id) {
    financeiroIndiceConferidos = null;
    const ids = id ? [id] : obterLancamentosFinanceiros().filter(item => financeiroPrecisaConferir(item) && lancamentoJaExisteCaixaFinanceiro(item)).map(item => item.id);
    await removerDuplicadosCaixaFinanceiro(ids);
};

// Nome que da para ler: arquivos com nome embaralhado (codigo do e-mail, chave da NF-e)
// viram "Tipo · fornecedor · nº da nota · chegou em dd/mm".
function nomeEmbaralhadoFinanceiro(texto) {
    const t = String(texto || '').trim();
    if (!t) return true;
    const maior = Math.max(...t.split(/[\s._-]+/).map(p => p.length));
    return maior >= 18;
}
function nomeLegivelCaixaFinanceiro(item = {}) {
    const desc = String(item.descricao || '').trim();
    if (desc && !nomeEmbaralhadoFinanceiro(desc) && !descricaoFinanceiraRuim(desc)) return desc;
    const docs = normalizarDocumentosVinculadosFinanceiro(item);
    const nomeArquivo = item.documento?.nome || docs[0]?.nome || desc;
    const chave = String(nomeArquivo || desc).match(/\d{44}/)?.[0] || '';
    const ehNota = financeiroEhNotaFiscal(item) || Boolean(chave) || /\.xml$/i.test(nomeArquivo || '');
    const tipoTxt = ehNota ? 'Nota fiscal' : String(item.tipo || 'Documento').toLowerCase().replace(/^./, c => c.toUpperCase());
    const fornecedor = item.ia?.fornecedor || item.fornecedor || item.emitente || '';
    const numeroNota = chave ? String(Number(chave.slice(25, 34))) : '';
    const cnpj = chave ? chave.slice(6, 20).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '';
    const entrada = item.criadoEm || item.importadoEm || item.createdAt || '';
    const partes = [
        tipoTxt,
        fornecedor || (cnpj ? `CNPJ ${cnpj}` : ''),
        numeroNota ? `nº ${numeroNota}` : '',
        /IMPORTADO RAPIDO DE E-?MAIL/i.test(item.observacao || '') ? 'do e-mail' : '',
        entrada && !Number.isNaN(new Date(entrada).getTime()) ? `chegou em ${new Date(entrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''
    ].filter(Boolean);
    return partes.join(' · ');
}
function anexoPrincipalCaixaFinanceiro(item = {}) {
    return item.documento || normalizarDocumentosVinculadosFinanceiro(item).find(doc => doc.categoria !== 'comprovante') || null;
}
window.abrirArquivoCaixaFinanceiro = async function(id) {
    const item = obterLancamentosFinanceiros().find(reg => reg.id === id);
    const anexo = await hidratarAnexoFinanceiro(anexoPrincipalCaixaFinanceiro(item));
    if (!anexo || (!anexo.dados && !anexo.localUrl)) {
        alert('O arquivo deste documento não está neste computador (ele fica salvo no computador que importou). Abra por lá ou anexe o PDF de novo em Editar.');
        return;
    }
    abrirAnexoFinanceiroDireto(anexo);
};
let financeiroLeituraLote = null;
window.lerTodosCaixaFinanceiro = async function() {
    if (financeiroLeituraLote) return;
    const alvos = obterLancamentosFinanceiros().filter(item => (financeiroPrecisaConferir(item) && camposFaltandoFinanceiro(item).length)
        || (classeDocumentoFinanceiro(item) === 'comprovante' && (!(Number(item.valor) > 0) || !item.dataEmissao || descricaoFinanceiraRuim(item.descricao) || FIN_REGEX_COMPROVANTE_NOME.test(normalizarTexto(item.descricao)))));
    if (!alvos.length) return;
    if (!confirm(`Ler de novo ${alvos.length} documento(s) com a IA? Pode levar alguns minutos; pode continuar usando o sistema.`)) return;
    financeiroLeituraLote = { total: alvos.length, feitos: 0, lidos: 0, semArquivo: 0, falhas: 0, senha: 0 };
    financeiroDuplicadosLote.clear();
    financeiroPedirSenhaPdf = false; // no lote nao para pedindo senha; usa as ja guardadas
    renderCaixaConferenciaFinanceiro();
    for (const item of alvos) {
        const anexo = await hidratarAnexoFinanceiro(anexoPrincipalCaixaFinanceiro(item));
        if (!anexo?.dados) financeiroLeituraLote.semArquivo++;
        else if (await window.analisarFinanceiroDocumento(item.id, true, true)) financeiroLeituraLote.lidos++;
        else if (financeiroDuplicadosLote.has(item.id)) { /* contado abaixo */ }
        else if (obterLancamentosFinanceiros().find(reg => reg.id === item.id)?.leituraErro === 'senha') financeiroLeituraLote.senha++;
        else financeiroLeituraLote.falhas++;
        financeiroLeituraLote.feitos++;
        renderCaixaConferenciaFinanceiro();
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    const r = financeiroLeituraLote;
    financeiroLeituraLote = null;
    financeiroPedirSenhaPdf = true;
    try { await sugerirVinculosFinanceiroSilencioso(); } catch (_) { /* opcional */ }
    renderFinanceiro();
    const dups = [...financeiroDuplicadosLote];
    alert([
        `Leitura concluída: ${r.lidos} preenchido(s).`,
        dups.length ? `${dups.length} já estavam lançados (repetidos).` : '',
        r.senha ? `${r.senha} PDF(s) com senha: clique em "Ler de novo" neles e digite a senha uma vez.` : '',
        r.falhas ? `${r.falhas} sem dados reconhecidos (confira em "Ver arquivo" e use Editar).` : '',
        r.semArquivo ? `${r.semArquivo} sem o arquivo neste computador.` : ''
    ].filter(Boolean).join('\n'));
    if (dups.length) await removerDuplicadosCaixaFinanceiro(dups);
};

function cartaoCaixaConferenciaFinanceiro(item) {
    const id = escapeJsStringFinanceiro(item.id);
    const faltando = camposFaltandoFinanceiro(item);
    const pronto = financeiroPrecisaConferir(item) && !faltando.length;
    const sugestao = financeiroTemVinculoSugerido(item) ? item.processoVinculoSugestao[0] : null;
    const alvoSugestao = sugestao ? obterLancamentosFinanceiros().find(reg => reg.id === sugestao.registroId) : null;
    const ehNota = financeiroEhNotaFiscal(item);
    const data = ehNota ? (item.dataEmissao ? `Emissão ${dataBR(item.dataEmissao)}` : 'Sem emissão') : (item.vencimento ? `Vence ${dataBR(item.vencimento)}` : 'Sem vencimento');
    const jaLancado = financeiroPrecisaConferir(item) ? lancamentoJaExisteCaixaFinanceiro(item) : null;
    const estado = jaLancado
        ? `<span class="fin-caixa-tag vinculo">Já lançado: ${escapeHtmlFinanceiro(jaLancado.descricao || jaLancado.tipo || 'registro')}${Number(jaLancado.valor) ? ` · ${formatarMoeda(jaLancado.valor)}` : ''}</span>`
        : item.leituraErro === 'senha' ? '<span class="fin-caixa-tag falta">PDF com senha: clique em Ler de novo e digite a senha</span>'
        : financeiroPrecisaConferir(item)
        ? (pronto ? '<span class="fin-caixa-tag ok">Pronto para aprovar</span>' : `<span class="fin-caixa-tag falta">Falta: ${faltando.join(', ')}</span>`)
        : (sugestao ? '<span class="fin-caixa-tag vinculo">Vínculo sugerido</span>' : '<span class="fin-caixa-tag vinculo">Nota de compra: dar entrada no estoque?</span>');
    const botoes = [];
    if (jaLancado) botoes.push(`<button type="button" class="btn-primary" onclick="window.tirarRepetidosCaixaFinanceiro('${id}')">Tirar da caixa</button>`);
    if (pronto && !jaLancado) botoes.push(`<button type="button" class="btn-primary" onclick="window.aprovarConferenciaFinanceiro('${id}')">Aprovar</button>`);
    if (sugestao && alvoSugestao) botoes.push(`<button type="button" class="btn-secondary" onclick="window.confirmarVinculoFinanceiro('${id}', '${escapeJsStringFinanceiro(sugestao.registroId)}')">Vincular a ${escapeHtmlFinanceiro((alvoSugestao.tipo || 'documento').toLowerCase())}</button>`);
    if (anexoPrincipalCaixaFinanceiro(item)) botoes.push(`<button type="button" class="btn-secondary" onclick="window.abrirArquivoCaixaFinanceiro('${id}')" title="Ver o PDF ou a imagem"><i class="fa-regular fa-file-lines" aria-hidden="true"></i> Ver arquivo</button>`);
    if (financeiroPrecisaConferir(item) && !pronto) botoes.push(`<button type="button" class="btn-secondary" onclick="window.analisarFinanceiroDocumento('${id}')">Ler de novo</button>`);
    if (notaAguardandoEstoqueFinanceiro(item)) {
        botoes.push(`<button type="button" class="btn-secondary" onclick="window.darEntradaEstoqueNotaFinanceiro('${id}')">Entrada no estoque</button>`);
        botoes.push(`<button type="button" class="btn-secondary" onclick="window.ignorarEntradaEstoqueFinanceiro('${id}')">Não é do estoque</button>`);
    }
    botoes.push(`<button type="button" class="btn-secondary" onclick="window.editarFinanceiro('${id}')"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar</button>`);
    botoes.push(`<button type="button" class="btn-secondary fin-caixa-excluir" onclick="window.excluirFinanceiro('${id}')" title="Excluir" aria-label="Excluir"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>`);
    return `
        <div class="fin-caixa-item${pronto ? ' is-pronto' : ''}">
            <div class="fin-caixa-info">
                <strong title="${escapeHtmlFinanceiro(anexoPrincipalCaixaFinanceiro(item)?.nome || item.descricao || '')}">${escapeHtmlFinanceiro(nomeLegivelCaixaFinanceiro(item) || 'Sem descrição')}</strong>
                <small>${escapeHtmlFinanceiro(item.tipo || 'Documento')} · ${data}${sugestao && alvoSugestao ? ` · combina com ${escapeHtmlFinanceiro(alvoSugestao.descricao || alvoSugestao.tipo || '')} (${escapeHtmlFinanceiro(sugestao.confianca || 'baixa')})` : ''}</small>
                ${estado}
            </div>
            <div class="fin-caixa-valor">${formatarMoeda(item.valor)}</div>
            <div class="fin-caixa-acoes">${botoes.join('')}</div>
        </div>`;
}

function caixaFinanceiroOculta() {
    try { return localStorage.getItem('orquestra_fin_caixa_oculta') === '1'; } catch (_) { return false; }
}
window.alternarOcultarCaixaFinanceiro = function() {
    try { localStorage.setItem('orquestra_fin_caixa_oculta', caixaFinanceiroOculta() ? '0' : '1'); } catch (_) {}
    renderCaixaConferenciaFinanceiro();
};

function renderCaixaConferenciaFinanceiro() {
    const box = document.getElementById('financeiroCaixaConferencia');
    if (!box) return;
    const lista = obterLancamentosFinanceiros();
    const conferir = lista.filter(financeiroPrecisaConferir);
    const vinculos = lista.filter(item => !financeiroPrecisaConferir(item) && financeiroTemVinculoSugerido(item));
    const notasEstoque = lista.filter(item => !financeiroPrecisaConferir(item) && !financeiroTemVinculoSugerido(item) && notaAguardandoEstoqueFinanceiro(item));
    const prontos = conferir.filter(item => !camposFaltandoFinanceiro(item).length);
    const itens = [...prontos, ...conferir.filter(item => camposFaltandoFinanceiro(item).length), ...vinculos, ...notasEstoque];
    if (!itens.length) {
        box.innerHTML = `<div class="fin-caixa-vazia"><strong>Caixa de conferência em dia.</strong> <span>Documentos novos aparecem aqui já lidos, prontos para aprovar.</span></div>`;
        return;
    }
    financeiroIndiceConferidos = indiceConferidosFinanceiro(lista);
    const repetidos = conferir.filter(item => lancamentoJaExisteCaixaFinanceiro(item)).length;
    if (caixaFinanceiroOculta()) {
        box.innerHTML = `<div class="fin-caixa-head fin-caixa-recolhida"><div><h3>Caixa de conferência</h3><small>${conferir.length} para conferir · oculta</small></div><button type="button" class="btn-secondary" onclick="window.alternarOcultarCaixaFinanceiro()" aria-expanded="false"><i class="fa-solid fa-eye" aria-hidden="true"></i> Mostrar</button></div>`;
        return;
    }
    const limite = financeiroCaixaExpandida ? itens.length : 6;
    box.innerHTML = `
        <div class="fin-caixa-head">
            <div>
                <h3>Caixa de conferência</h3>
                <small>${conferir.length} para conferir · ${prontos.length} pronto(s) · ${vinculos.length} vínculo(s) sugerido(s)${notasEstoque.length ? ` · ${notasEstoque.length} nota(s) para o estoque` : ''}</small>
            </div>
            <div class="fin-caixa-head-acoes">
                ${repetidos ? `<button type="button" class="btn-secondary" onclick="window.tirarRepetidosCaixaFinanceiro()">Tirar ${repetidos} já lançado(s)</button>` : ''}
                ${financeiroLeituraLote ? `<span class="fin-caixa-progresso" role="status">Lendo ${financeiroLeituraLote.feitos}/${financeiroLeituraLote.total}…</span>`
                    : `<button type="button" class="btn-secondary" onclick="window.lerTodosCaixaFinanceiro()" title="Lê de novo os documentos sem valor/vencimento e os comprovantes sem favorecido, valor ou data"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Ler todos de novo</button>`}
                ${prontos.length ? `<button type="button" class="btn-primary" onclick="window.aprovarProntosFinanceiro()">Aprovar ${prontos.length} pronto(s)</button>` : ''}
                <button type="button" class="btn-secondary" onclick="window.alternarOcultarCaixaFinanceiro()" aria-expanded="true" title="Ocultar a caixa de conferência"><i class="fa-solid fa-eye-slash" aria-hidden="true"></i> Ocultar</button>
            </div>
        </div>
        <div class="fin-caixa-lista">${itens.slice(0, limite).map(cartaoCaixaConferenciaFinanceiro).join('')}</div>
        ${itens.length > 6 ? `<button type="button" class="fin-caixa-mais" onclick="window.alternarCaixaConferenciaFinanceiro()">${financeiroCaixaExpandida ? 'Mostrar menos' : `Ver todos (${itens.length})`}</button>` : ''}`;
}

window.alternarCaixaConferenciaFinanceiro = function() {
    financeiroCaixaExpandida = !financeiroCaixaExpandida;
    renderCaixaConferenciaFinanceiro();
};

window.aprovarConferenciaFinanceiro = async function(id, renderizar = true) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(reg => reg.id === id);
    if (!item) return false;
    const faltando = camposFaltandoFinanceiro(item);
    if (faltando.length) {
        alert(`Falta preencher: ${faltando.join(', ')}. Use Editar.`);
        return false;
    }
    item.conferenciaStatus = 'conferido';
    item.conferidoEm = new Date().toISOString();
    item.conferidoPor = window.App?.userName || '';
    item.atualizadoEm = new Date().toISOString();
    salvarLancamentosFinanceiros(lista);
    await salvarFinanceiroNuvem(item);
    if (renderizar) renderFinanceiro();
    return true;
};

window.aprovarProntosFinanceiro = async function() {
    const prontos = obterLancamentosFinanceiros().filter(item => financeiroPrecisaConferir(item) && !camposFaltandoFinanceiro(item).length);
    if (!prontos.length) return;
    if (!confirm(`Aprovar ${prontos.length} documento(s) com fornecedor, valor e data já identificados?`)) return;
    for (const item of prontos) await window.aprovarConferenciaFinanceiro(item.id, false);
    renderFinanceiro();
};

// Recalcula sugestoes de vinculo sem perguntar (so sugestoes; nada e juntado sozinho).
async function sugerirVinculosFinanceiroSilencioso() {
    const lista = obterLancamentosFinanceiros();
    if (lista.length < 2) return 0;
    const alterados = [];
    lista.forEach(item => {
        if (item.processoVinculoId) return;
        const sugestoes = obterSugestoesVinculoFinanceiro(item, lista.filter(registro => registro.id !== item.id));
        if (JSON.stringify(item.processoVinculoSugestao || []) !== JSON.stringify(sugestoes)) {
            item.processoVinculoSugestao = sugestoes;
            item.atualizadoEm = new Date().toISOString();
            alterados.push(item);
        }
    });
    if (alterados.length) {
        salvarLancamentosFinanceiros(lista);
        await Promise.all(alterados.map(item => salvarFinanceiroNuvem(item)));
    }
    return alterados.length;
}

function textoDeDataUrlFinanceiro(dataUrl = '') {
    const [cabecalho, conteudo = ''] = String(dataUrl).split(',');
    if (!/;base64/i.test(cabecalho)) return decodeURIComponent(conteudo);
    const binario = atob(conteudo);
    const bytes = Uint8Array.from(binario, c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}

window.darEntradaEstoqueNotaFinanceiro = async function(id) {
    const item = obterLancamentosFinanceiros().find(reg => reg.id === id);
    const anexo = item ? await hidratarAnexoFinanceiro(anexoXmlFinanceiro(item)) : null;
    if (!anexo?.dados) {
        alert('O XML desta nota não está neste aparelho. Importe o XML aqui ou abra a nota no aparelho onde ela foi importada.');
        return;
    }
    if (typeof window.abrirNotaFiscalNoEstoque !== 'function') {
        alert('O módulo de estoque ainda não carregou. Tente novamente em instantes.');
        return;
    }
    window.abrirNotaFiscalNoEstoque(textoDeDataUrlFinanceiro(anexo.dados), anexo.nome || 'nfe.xml', id);
};

window.ignorarEntradaEstoqueFinanceiro = async function(id) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(reg => reg.id === id);
    if (!item) return;
    item.entradaEstoqueIgnorada = true;
    item.atualizadoEm = new Date().toISOString();
    salvarLancamentosFinanceiros(lista);
    await salvarFinanceiroNuvem(item);
    renderFinanceiro();
};

window.marcarEntradaEstoqueFinanceiro = async function(id) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(reg => reg.id === id);
    if (!item) return;
    item.entradaEstoqueEm = new Date().toISOString();
    item.atualizadoEm = item.entradaEstoqueEm;
    salvarLancamentosFinanceiros(lista);
    await salvarFinanceiroNuvem(item);
};

function arquivoDeBase64Financeiro(base64, nome, tipo) {
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, c => c.charCodeAt(0));
    return new File([bytes], nome, { type: tipo || 'application/octet-stream' });
}

const FIN_EMAIL_ANEXO_VALIDO = anexo => /\.(pdf|xml|png|jpe?g|webp)$/i.test(anexo?.nome || '') || /pdf|xml|image\//i.test(anexo?.tipo || '');

function lerOutlookImportadosFinanceiro() {
    try { return JSON.parse(localStorage.getItem(FINANCEIRO_OUTLOOK_IMPORTADOS_KEY) || '[]'); } catch (_) { return []; }
}

// Sugere o tipo do documento pelo nome do anexo e assunto do e-mail (só para exibição).
window.sugerirTipoDocumentoEmail = function(mensagem = {}, anexo = {}) {
    const t = `${anexo.nome || ''} ${mensagem.assunto || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/\.XML\b/.test(String(anexo.nome || '').toUpperCase()) || /NF-?E|NOTA FISCAL|DANFE|NFS-?E/.test(t)) return 'nota';
    if (/COMPROVANTE|PIX|TRANSFERENCIA|RECIBO|PAGAMENTO EFETUADO/.test(t)) return 'comprovante';
    if (/BOLETO|BLOQUETO|FATURA|COBRANCA|VENCIMENTO|2A VIA|SEGUNDA VIA/.test(t)) return 'boleto';
    return 'outro';
};

// Status de importação de uma mensagem: 'todos' | 'parcial' | 'nenhum'.
window.statusImportacaoEmailFinanceiro = function(mensagem = {}) {
    const validos = (mensagem.anexos || []).filter(FIN_EMAIL_ANEXO_VALIDO);
    if (!validos.length) return 'nenhum';
    const vistos = new Set(lerOutlookImportadosFinanceiro());
    const feitos = validos.filter(a => vistos.has(`${mensagem.id}|${a.id}`)).length;
    return feitos === validos.length ? 'todos' : (feitos ? 'parcial' : 'nenhum');
};

async function importarMensagensOutlookFinanceiro(mensagens, opcoes = {}) {
    const vistos = new Set(lerOutlookImportadosFinanceiro());
    const arquivos = [];
    const chavesNovas = [];
    for (const mensagem of mensagens) {
        for (const anexo of (mensagem.anexos || [])) {
            if (!FIN_EMAIL_ANEXO_VALIDO(anexo)) continue;
            const chave = `${mensagem.id}|${anexo.id}`;
            if (vistos.has(chave) && !opcoes.forcar) continue;
            try {
                const r = await fetch(`/api/outlook-attachment?messageId=${encodeURIComponent(mensagem.id)}&attachmentId=${encodeURIComponent(anexo.id)}`, { cache: 'no-store' });
                const conteudo = await r.json();
                if (!r.ok || !conteudo.conteudoBase64) continue;
                arquivos.push(arquivoDeBase64Financeiro(conteudo.conteudoBase64, conteudo.nome || anexo.nome, conteudo.tipo || anexo.tipo));
                chavesNovas.push(chave);
            } catch (error) {
                console.warn('Anexo do e-mail não baixado:', anexo.nome, error);
            }
        }
    }
    const resultado = arquivos.length
        ? await window.importarPastaFinanceira(arquivos, { silencioso: true, origem: 'outlook', rotuloOrigem: 'E-MAIL' })
        : { importados: 0, duplicados: 0 };
    if (chavesNovas.length) {
        const atuais = lerOutlookImportadosFinanceiro().filter(c => !chavesNovas.includes(c));
        localStorage.setItem(FINANCEIRO_OUTLOOK_IMPORTADOS_KEY, JSON.stringify([...chavesNovas, ...atuais].slice(0, 600)));
    }
    return resultado;
}

// Busca boletos, notas e comprovantes anexados nos e-mails do Outlook conectado e importa
// para a caixa de conferencia (arquivos repetidos sao ignorados pela assinatura do arquivo).
window.importarAnexosOutlookFinanceiro = async function(opcoes = {}) {
    const silencioso = Boolean(opcoes.silencioso);
    let dados;
    try {
        const resposta = await fetch('/api/outlook-messages?limite=30', { cache: 'no-store' });
        dados = await resposta.json().catch(() => ({}));
        if (resposta.status === 401) {
            if (!silencioso) alert('O e-mail ainda não está conectado. Conecte o Outlook em Configurações > Integração de e-mail.');
            return { importados: 0, desconectado: true };
        }
        if (!resposta.ok) throw new Error(dados.error || 'Falha ao listar e-mails.');
    } catch (error) {
        if (!silencioso) alert(`Não foi possível ler o e-mail agora: ${error.message}`);
        return { importados: 0, erro: true };
    }
    const resultado = await importarMensagensOutlookFinanceiro(Array.isArray(dados.messages) ? dados.messages : []);
    if (!silencioso) {
        alert(resultado.importados
            ? `${resultado.importados} documento(s) do e-mail importado(s). Eles aparecem na caixa de conferência conforme forem lidos.`
            : 'Nenhum anexo novo de boleto, nota ou comprovante no e-mail.');
    }
    return resultado;
};

// Lança no Financeiro os anexos de um e-mail específico (botão na lista de e-mails).
window.importarMensagemOutlookFinanceiro = async function(mensagem) {
    if (!mensagem?.id) return { importados: 0 };
    const jaFeito = window.statusImportacaoEmailFinanceiro(mensagem) === 'todos';
    if (jaFeito && !confirm('Os anexos deste e-mail já foram lançados. Importar de novo? (arquivos idênticos continuam sendo ignorados)')) {
        return { importados: 0 };
    }
    const resultado = await importarMensagensOutlookFinanceiro([mensagem], { forcar: jaFeito });
    alert(resultado.importados
        ? `${resultado.importados} documento(s) lançado(s) no Financeiro, na caixa de conferência.`
        : (resultado.duplicados ? 'Esses documentos já estão no Financeiro.' : 'Nenhum boleto, nota ou comprovante encontrado neste e-mail.'));
    return resultado;
};

function avisarDocumentosEmailFinanceiro(qtd) {
    if (!qtd) return;
    const view = document.getElementById('view-financeiro');
    if (!view) return;
    let aviso = document.getElementById('financeiroAvisoEmail');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'financeiroAvisoEmail';
        aviso.className = 'fin-aviso-email';
        aviso.setAttribute('role', 'status');
        view.prepend(aviso);
    }
    aviso.innerHTML = `<i class="fa-solid fa-envelope-circle-check" aria-hidden="true"></i>
        <span><strong>${qtd} documento(s) novo(s) chegaram por e-mail</strong> e foram para a caixa de conferência.</span>
        <button type="button" class="fin-aviso-email-fechar" aria-label="Fechar aviso" onclick="this.parentElement.remove()">&times;</button>`;
}

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
    const btnMarcarPagos = document.getElementById('btnMarcarFinanceiroSelecionados');
    if (btnMarcarPagos) btnMarcarPagos.style.display = selecionados.length ? 'inline-flex' : 'none';
    checks.forEach(input => input.closest('tr')?.classList.toggle('financeiro-row-selected', input.checked));
};

window.marcarTodosFinanceiro = function(checked) {
    document.querySelectorAll('.financeiro-check').forEach(input => input.checked = checked);
    window.atualizarSelecaoFinanceiro();
};

window.marcarFinanceirosSelecionadosComoPagos = async function() {
    const ids = new Set(Array.from(document.querySelectorAll('.financeiro-check:checked')).map(input => input.value));
    const lista = obterLancamentosFinanceiros();
    const pendentes = lista.filter(item => ids.has(item.id) && !item.pago);
    if (!pendentes.length) {
        alert('Selecione pelo menos um documento ainda nao pago.');
        return;
    }
    if (!confirm(`Marcar ${pendentes.length} documento(s) selecionado(s) como pago(s)?`)) return;

    const agora = new Date().toISOString();
    pendentes.forEach(item => {
        item.pago = true;
        item.pagoEm = agora;
        item.atualizadoEm = agora;
    });
    salvarLancamentosFinanceiros(lista);

    const falhas = [];
    if (window.FS?.setDoc) {
        for (const item of pendentes) {
            try {
                await window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, prepararFinanceiroParaNuvem(item));
            } catch (error) {
                console.error(`Falha ao marcar financeiro/${item.id} como pago.`, error);
                falhas.push(item.id);
            }
        }
    }

    renderFinanceiro();
    if (falhas.length) {
        alert(`${pendentes.length - falhas.length} documento(s) atualizado(s). ${falhas.length} nao puderam ser sincronizados na nuvem.`);
    }
};

window.ordenarFinanceiroPor = function(campo) {
    if (financeiroOrdenacaoTabela.campo === campo) {
        financeiroOrdenacaoTabela.direcao = financeiroOrdenacaoTabela.direcao === 'asc' ? 'desc' : 'asc';
    } else {
        financeiroOrdenacaoTabela = {
            campo,
            direcao: ['valor', 'status'].includes(campo) ? 'desc' : 'asc'
        };
    }
    window.renderFinanceiro();
};

window.analisarFinanceiroDocumento = async function(id, silencioso = false, semExcluirDuplicado = false) {
    const lista = obterLancamentosFinanceiros();
    const item = lista.find(reg => reg.id === id);
    if (!item) return false;
    const anexo = await hidratarAnexoFinanceiro(item.documento || normalizarDocumentosVinculadosFinanceiro(item).find(doc => doc.categoria !== 'comprovante'));
    if (!anexo?.dados) {
        if (!silencioso) alert('Este documento não possui arquivo local carregado para leitura. Abra ou anexe o PDF novamente para analisar.');
        return false;
    }
    try {
        const { dados, usouIA } = await comTimeoutFinanceiro(extrairDadosFinanceirosDoAnexo(anexo), silencioso ? 75000 : 90000);
        // aproveita leitura parcial (ex.: valor e vencimento certos mas fornecedor ilegivel)
        if (!dados || !(Number(dados.valor) > 0 || dados.vencimento || dados.dataEmissao || dados.emissao)) {
            if (!silencioso) alert('Não foi possível identificar os dados deste documento.');
            return false;
        }
        if (descricaoFinanceiraRuim(dados.descricao)) dados.descricao = dados.fornecedor && !descricaoFinanceiraRuim(dados.fornecedor) ? dados.fornecedor : item.descricao;
        const dadosIA = normalizarMetadadosLeituraFinanceira(dados, anexo);
        const ehNota = financeiroEhNotaFiscal(dados);
        const atualizado = {
            ...item,
            tipo: ehNota ? 'NOTA FISCAL' : ((classeDocumentoFinanceiro(item) === 'comprovante' || /COMPROVANTE/i.test(dados.tipo || '')) ? 'COMPROVANTE' : normalizarTexto(dados.tipo || item.tipo || 'DOCUMENTO')),
            descricao: normalizarTexto(dados.descricao || item.descricao || 'PENDENTE DE CONFERENCIA'),
            vencimento: ehNota ? '' : (dados.vencimento || item.vencimento || ''),
            dataEmissao: ehNota ? (dados.dataEmissao || dados.emissao || item.dataEmissao || '') : (item.dataEmissao || ''),
            valor: Number(dados.valor || item.valor || 0),
            conferenciaStatus: leituraFinanceiraIncompleta(dados) ? 'pendente' : 'conferido',
            geraCobranca: !ehNota,
            situacaoDocumento: ehNota ? (dados.situacaoDocumento === 'PAGO_A_VISTA' ? 'PAGO_A_VISTA' : 'AGUARDANDO_BOLETO') : (item.situacaoDocumento || 'A_PAGAR'),
            ...(ehNota && dados.situacaoDocumento === 'PAGO_A_VISTA' ? { pago: true, pagoEm: dados.dataEmissao || item.pagoEm || new Date().toISOString(), pagoOrigem: 'XML: pagamento à vista' } : {}),
            ia: dadosIA,
            leituraErro: '',
            atualizadoEm: new Date().toISOString()
        };
        if (atualizado.tipo === 'COMPROVANTE') {
            atualizado.geraCobranca = false;
            atualizado.vencimento = '';
            atualizado.situacaoDocumento = 'PAGO_A_VISTA';
            atualizado.conferenciaStatus = 'conferido';
            atualizado.pastaFinanceira = 'comprovantes';
            atualizado.subpastaFinanceira = /SICREDI/.test(normalizarTexto(`${item.descricao} ${dados.banco || ''}`)) ? 'SICREDI' : 'OUTROS COMPROVANTES';
        }
        if (!atualizado.processoVinculoId) {
            atualizado.processoVinculoSugestao = obterSugestoesVinculoFinanceiro(atualizado, lista.filter(registro => registro.id !== id));
        }
        const duplicado = buscarLancamentoDuplicadoFinanceiro(atualizado, id);
        if (duplicado) {
            if (silencioso && semExcluirDuplicado) { financeiroDuplicadosLote.add(id); return false; }
            if (silencioso) {
                const restantes = obterLancamentosFinanceiros().filter(reg => reg.id !== id);
                salvarLancamentosFinanceiros(restantes);
                await excluirFinanceiroNuvem(id).catch(() => false);
                return false;
            }
            const msg = mensagemLancamentoDuplicadoFinanceiro(atualizado, duplicado).replace('A importação foi cancelada para evitar boleto/nota repetido.', 'Este da caixa é uma cópia. Quer tirar da caixa de conferência?');
            if (confirm(msg)) await removerDuplicadosCaixaFinanceiro([id]);
            return false;
        }
        Object.assign(item, atualizado);
        item.atualizadoEm = new Date().toISOString();
        if (item.tipo === 'COMPROVANTE') setTimeout(() => vincularComprovanteAutomaticoFinanceiro(item.id).catch(() => 0), 0);
        salvarLancamentosFinanceiros(lista);
        await salvarFinanceiroNuvem(item);
        if (!silencioso) renderFinanceiro();
        if (!silencioso) alert(`Documento analisado${usouIA ? ' com apoio da IA' : ''}. Confira o valor e vencimento na lista.`);
        return true;
    } catch (error) {
        console.error('Falha ao analisar documento financeiro:', error);
        if (error?.pdfComSenha) {
            const listaAtual = obterLancamentosFinanceiros();
            const reg = listaAtual.find(x => x.id === id);
            if (reg) { reg.leituraErro = 'senha'; salvarLancamentosFinanceiros(listaAtual); }
            if (!silencioso) renderCaixaConferenciaFinanceiro();
        }
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
    try { await sugerirVinculosFinanceiroSilencioso(); } catch (error) { console.warn('Sugestao automatica de vinculos falhou:', error); }
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
    financeiroDadosLeituraTemp = item.ia ? { ...item.ia } : null;
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
    const ehNotaFiscalManual = categoriaDocumento === 'nota_fiscal'
        || categoriaDocumento === 'xml'
        || financeiroEhNotaFiscal({ tipo, descricao, situacaoDocumento, documento: financeiroAnexosTemp.documento });
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
    const vencimentoFinal = ehNotaFiscalManual ? '' : vencimento;
    const dataEmissaoFinal = ehNotaFiscalManual ? (vencimento || existente?.dataEmissao || '') : (existente?.dataEmissao || '');
    const observacao = document.getElementById('financeiroObservacao').value.trim();
    const classificacaoAutomatica = obterClassificacaoFinanceiraAutomatica({
        tipo,
        descricao,
        observacao,
        conferenciaStatus: conferenciaPendente ? 'pendente' : 'conferido'
    });
    const pastaFinanceira = financeiroClassificacaoManual
        ? (document.getElementById('financeiroPasta')?.value || classificacaoAutomatica.pasta)
        : classificacaoAutomatica.pasta;
    const subpastaFinanceira = financeiroClassificacaoManual
        ? normalizarTexto(document.getElementById('financeiroSubpasta')?.value || classificacaoAutomatica.subpasta)
        : classificacaoAutomatica.subpasta;
    const registro = {
        id,
        aba: financeiroAbaAtiva === 'todos' ? 'caixa-financeira' : financeiroAbaAtiva,
        pastaFinanceira,
        subpastaFinanceira,
        tipo,
        descricao,
        vencimento: vencimentoFinal,
        dataEmissao: dataEmissaoFinal,
        valor,
        observacao,
        situacaoDocumento,
        conferenciaStatus: conferenciaPendente ? 'pendente' : 'conferido',
        geraCobranca: !ehNotaFiscalManual,
        pago,
        pagoEm: pago ? (existente?.pagoEm || new Date().toISOString()) : null,
        documentosVinculados,
        documento: documentoPrincipal,
        comprovante: comprovantePrincipal,
        ia: financeiroDadosLeituraTemp,
        processoVinculoId: existente?.processoVinculoId || null,
        processoVinculoStatus: existente?.processoVinculoStatus || '',
        processoVinculoMembros: Array.isArray(existente?.processoVinculoMembros) ? existente.processoVinculoMembros : [],
        processoVinculoConfirmadoEm: existente?.processoVinculoConfirmadoEm || null,
        processoVinculoSugestao: existente?.processoVinculoId
            ? []
            : obterSugestoesVinculoFinanceiro({
                id,
                tipo,
                descricao,
                vencimento: vencimentoFinal,
                dataEmissao: dataEmissaoFinal,
                valor,
                ia: financeiroDadosLeituraTemp
            }, lista.filter(item => item.id !== id)),
        atualizadoEm: new Date().toISOString(),
        criadoEm: existente?.criadoEm || new Date().toISOString()
    };

    const duplicadoLancamento = buscarLancamentoDuplicadoFinanceiro(registro, id);
    if (duplicadoLancamento) {
        alert(mensagemLancamentoDuplicadoFinanceiro(registro, duplicadoLancamento));
        return;
    }

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
        #view-financeiro .main-header { max-width:100%; margin:0 auto 14px; text-align:left; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; border-bottom:1px solid var(--fin-border); padding-bottom:14px; animation:financeiroRise .28s ease-out both; }
        #view-financeiro .main-header h1 { font-size:1.45rem; letter-spacing:0; color:var(--fin-heading); background:none; -webkit-text-fill-color:currentColor; display:flex; align-items:center; gap:9px; margin:0; }
        #view-financeiro .main-header h1 i { color:var(--fin-gold); font-size:1.05rem; }
        #view-financeiro .main-header p { color:var(--fin-muted); font-size:.84rem; font-weight:600; letter-spacing:0; text-transform:none; margin:.2rem 0 0; }
        .financeiro-view-tools { max-width:100%; margin:0 auto 12px; display:flex; gap:7px; flex-wrap:wrap; justify-content:flex-end; align-items:center; padding:8px; border:1px solid var(--fin-border); border-radius:10px; background:#fffdf7; box-shadow:0 8px 22px rgba(15,23,42,.06); }
        .financeiro-view-tools::before { content:'Organização da tela'; margin-right:auto; color:#6f6b62; font-size:.72rem; font-weight:850; text-transform:uppercase; letter-spacing:.02em; }
        .financeiro-toggle-btn, .financeiro-collapse-icon { min-height:32px; border:1px solid #c9bba7; background:#fbf8f0; color:#334155; border-radius:8px; padding:0 10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-weight:850; font-size:.76rem; cursor:pointer; white-space:nowrap; box-shadow:0 1px 2px rgba(15,23,42,.06); transition:transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease, color .16s ease; }
        .financeiro-toggle-btn:hover, .financeiro-collapse-icon:hover { border-color:#0f8fa6; color:#0f172a; background:#ffffff; transform:translateY(-1px); box-shadow:0 6px 14px rgba(15,23,42,.08); }
        .financeiro-toggle-btn:active, .financeiro-collapse-icon:active, #view-financeiro button:active { transform:translateY(0) scale(.99); }
        .financeiro-toggle-btn.is-collapsed { color:#667085; background:#efe7d8; opacity:.94; }
        .financeiro-card-tools { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .financeiro-classificacao-bar { grid-area:classificacao; min-height:34px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; padding:7px 9px; border:1px solid #d9e6df; border-radius:8px; background:#f4faf6; color:#166534; font-size:.75rem; font-weight:750; }
        .financeiro-classificacao-bar i { margin-right:5px; color:#0f8fa6; }
        .financeiro-classificacao-bar .btn-secondary { min-height:28px; padding:0 9px; font-size:.72rem; }
        .financeiro-classificacao-manual[hidden] { display:none !important; }
        .financeiro-collapse-icon { width:34px; padding:0; }
        .financeiro-collapsible { transition:opacity .16s ease, max-height .2s ease, margin .16s ease; }
        .financeiro-collapsible.is-collapsed { display:none !important; }
        .financeiro-kpis { grid-template-columns:repeat(auto-fit, minmax(178px, 1fr)); gap:10px !important; max-width:100%; margin-left:auto; margin-right:auto; }
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
        .financeiro-folder-board { display:grid; grid-template-columns:repeat(auto-fit, minmax(176px, 1fr)); gap:10px; margin:0 auto 14px; max-width:100%; width:100%; overflow:visible; align-items:stretch; }
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
        .financeiro-form-card, .financeiro-list-card, .financeiro-relatorio-card { padding:16px; margin-bottom:14px; max-width:100%; margin-left:auto; margin-right:auto; border:1px solid var(--fin-border) !important; border-radius:10px !important; background:var(--fin-card) !important; box-shadow:0 12px 28px rgba(15,23,42,.08) !important; color:var(--fin-text); backdrop-filter:none !important; animation:financeiroRise .28s ease-out both; }
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
            "classificacao classificacao classificacao classificacao classificacao classificacao classificacao"
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
        .fin-classificacao { grid-area:classificacao; }
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
        #financeiroListaBody { width:100%; max-width:100%; overflow-x:hidden; overflow-y:visible; }
        #financeiroListaBody .financeiro-table { width:100%; min-width:0; max-width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; background:#fffdf7; border:1px solid var(--fin-line); border-radius:9px; overflow:hidden; }
        .financeiro-table { width:100%; border-collapse:separate; border-spacing:0; min-width:860px; background:#fffdf7; border:1px solid var(--fin-line); border-radius:9px; overflow:hidden; }
        #financeiroListaBody .financeiro-col-selecao { width:34px; }
        #financeiroListaBody .financeiro-col-tipo { width:82px; }
        #financeiroListaBody .financeiro-col-descricao { width:auto; }
        #financeiroListaBody .financeiro-col-data { width:80px; }
        #financeiroListaBody .financeiro-col-valor { width:84px; }
        #financeiroListaBody .financeiro-col-status { width:78px; }
        #financeiroListaBody .financeiro-col-anexos { width:84px; }
        #financeiroListaBody .financeiro-col-acoes { width:156px; }
        .financeiro-table th { text-align:left; color:#475569; font-size:0.68rem; text-transform:uppercase; padding:9px 7px; border-bottom:1px solid #c9bba7; background:#efe7d8; overflow:hidden; }
        .financeiro-table td { padding:9px 7px; border-bottom:1px solid var(--fin-line); vertical-align:middle; font-size:.82rem; color:#0f172a; overflow:hidden; transition:background .16s ease, box-shadow .16s ease, transform .16s ease; }
        .financeiro-table tr { position:relative; transition:filter .16s ease; }
        .financeiro-table tbody tr.financeiro-row { cursor:pointer; }
        .financeiro-table tbody tr:nth-child(even) td { background:#f8f4ea; }
        .financeiro-table tbody tr.financeiro-row:hover td { background:#fff8e8; box-shadow:0 8px 18px rgba(23,32,51,.08); transform:translateY(-1px); }
        .financeiro-table tbody tr.financeiro-row:hover { filter:brightness(1.01); }
        .financeiro-table tbody tr.financeiro-row-selected td { background:#eef6f6 !important; box-shadow:none; }
        .financeiro-table tbody tr.financeiro-row-selected td:first-child { box-shadow:inset 3px 0 0 #0f8fa6; }
        .financeiro-table tbody tr.financeiro-row-selected td:not(:first-child) { border-left-color:transparent; }
        .financeiro-table tbody tr.financeiro-row-selected:hover td { background:#e7f3f3 !important; }
        .financeiro-table tbody tr.financeiro-row-duplicado td { background:#fff7ed !important; }
        .financeiro-table tbody tr.financeiro-row-duplicado td:first-child { box-shadow:inset 3px 0 0 #f97316; }
        .financeiro-table td small { display:block; color:var(--fin-muted); margin-top:4px; max-width:360px; }
        .financeiro-tipo-pill { display:inline-flex; align-items:center; justify-content:center; min-height:24px; max-width:116px; padding:3px 8px; border-radius:999px; background:#eef3f4; color:#172033; border:1px solid #cddfe3; font-size:.72rem; font-weight:900; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .financeiro-descricao-cell strong { display:block; color:#152033; font-size:.84rem; font-weight:850; line-height:1.25; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-descricao-cell small { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.7rem; line-height:1.3; }
        .financeiro-descricao-cell small:empty { display:none; }
        .financeiro-ia-line { color:#806a4a !important; font-weight:800; }
        .financeiro-duplicado-badge { display:inline-flex; align-items:center; gap:5px; width:max-content; margin:5px 0 0; padding:3px 7px; border-radius:999px; background:#ffedd5; color:#9a3412; border:1px solid #fdba74; font-size:.68rem; font-weight:900; }
        .financeiro-status-badge { border-radius:999px; padding:5px 10px; font-size:0.78rem; font-weight:900; white-space:nowrap; }
        .financeiro-status-badge.pago { color:var(--fin-success); background:#e7f4ec; }
        .financeiro-status-badge.aberto { color:var(--fin-warn); background:#f7eddc; }
        .financeiro-status-badge.pendente { color:var(--fin-warn); background:#f7eddc; }
        .financeiro-status-badge.vencido { color:var(--fin-danger); background:#f8e7e7; }
        #financeiroListaBody .financeiro-acoes { display:table-cell; box-sizing:border-box; width:156px; max-width:156px; padding:7px 6px; white-space:nowrap; position:static; background:#fffdf7; box-shadow:none; }
        .financeiro-acoes-inner, .financeiro-link { display:flex; gap:5px; align-items:center; justify-content:center; flex-wrap:nowrap; min-width:0; }
        #financeiroListaBody .financeiro-table th:last-child { box-sizing:border-box; position:static; width:156px; max-width:156px; text-align:center; background:#efe7d8; box-shadow:none; }
        .financeiro-table tbody tr:nth-child(even) td.financeiro-acoes { background:#f8f4ea; }
        .financeiro-table tbody tr.financeiro-row:hover td.financeiro-acoes { background:#fff8e8; }
        .financeiro-table tbody tr.financeiro-row-selected td.financeiro-acoes { background:#eef6f6 !important; }
        .financeiro-table tbody tr.financeiro-row-duplicado td.financeiro-acoes { background:#fff7ed !important; }
        .financeiro-acoes button, .financeiro-link { cursor:pointer; text-decoration:none; }
        #view-financeiro .financeiro-acoes .btn-icon { width:28px; height:28px; min-width:28px; min-height:28px; display:grid; place-items:center; border:1px solid transparent; border-radius:7px; padding:0 !important; font-size:.84rem !important; transition:transform .16s ease, box-shadow .16s ease, filter .16s ease, border-color .16s ease; }
        #view-financeiro .financeiro-acoes .btn-icon:hover { transform:translateY(-2px); filter:brightness(1.04); box-shadow:0 8px 18px rgba(23,32,51,.18); }
        #view-financeiro .financeiro-acao-ia { color:#7a5300 !important; background:#f8edcb; border-color:#dec16c; }
        #view-financeiro .financeiro-acao-editar { color:#17406d !important; background:#edf4fb; border-color:#bfd2e6; }
        #view-financeiro .financeiro-acao-pago { color:#0f6840 !important; background:#e6f3ec; border-color:#abd8bf; }
        #view-financeiro .financeiro-acao-excluir { color:#a3202b !important; background:#f8e7e7; border-color:#e7b8bc; }
        #view-financeiro .financeiro-acao-vinculo { color:#0f6b78 !important; background:#e5f5f5; border-color:#a8d8dc; }
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
            z-index:9998; width:min(980px, calc(100vw - 28px)); display:flex; align-items:center; gap:8px; flex-wrap:wrap;
            padding:7px 8px; border-radius:12px; border:0;
            background:linear-gradient(90deg, rgba(17,24,39,.58), rgba(17,24,39,.44));
            color:#fff7ed; box-shadow:0 14px 34px rgba(15,23,42,.22);
            backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
            animation: financeiroPulse 3.8s ease-in-out infinite;
        }
        .financeiro-lembrete-main { flex:1; min-width:0; border:0; background:transparent; color:inherit; display:flex; align-items:center; gap:10px; text-align:left; cursor:pointer; font-weight:800; }
        .financeiro-lembrete-main span { display:flex; min-width:0; flex:1; flex-direction:column; gap:1px; overflow:hidden; }
        .financeiro-lembrete-main span strong, .financeiro-lembrete-main span small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-lembrete-main span small { color:rgba(255,247,237,.74); font-size:.73rem; font-weight:700; }
        .financeiro-lembrete-main i { color:#f59e0b; font-size:1rem; }
        .financeiro-lembrete-main .financeiro-lembrete-chevron { margin-left:auto; color:#fff7ed; transition:transform .2s ease; }
        .financeiro-lembrete-topo.is-expanded .financeiro-lembrete-chevron { transform:rotate(180deg); }
        .financeiro-lembrete-doc, .financeiro-lembrete-close { border:0; background:rgba(255,255,255,.12); color:#fff7ed; border-radius:8px; min-height:34px; padding:0 10px; font-weight:900; cursor:pointer; white-space:nowrap; }
        .financeiro-lembrete-close { width:34px; padding:0; display:grid; place-items:center; }
        .financeiro-lembrete-lista { flex:0 0 100%; max-height:min(310px, 56vh); overflow-y:auto; padding:6px; border-radius:9px; background:rgba(15,23,42,.72); scrollbar-width:thin; }
        .financeiro-lembrete-lista[hidden] { display:none; }
        .financeiro-lembrete-item { width:100%; display:grid; grid-template-columns:28px minmax(0,1fr) auto 20px; align-items:center; gap:9px; padding:8px; border:0; border-bottom:1px solid rgba(255,255,255,.09); background:transparent; color:#fff7ed; text-align:left; cursor:pointer; }
        .financeiro-lembrete-item:last-child { border-bottom:0; }
        .financeiro-lembrete-item:hover { background:rgba(255,255,255,.09); }
        .financeiro-lembrete-item-ordem { width:25px; height:25px; display:grid; place-items:center; border-radius:7px; background:rgba(245,158,11,.16); color:#fbbf24; font-weight:900; }
        .financeiro-lembrete-item-info { min-width:0; display:flex; flex-direction:column; gap:2px; }
        .financeiro-lembrete-item-info strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-lembrete-item-info small { color:rgba(255,247,237,.72); }
        .financeiro-lembrete-item-valor { white-space:nowrap; }
        .financeiro-menu-alerta { position:relative; animation:none !important; }
        .financeiro-menu-alerta::after { content:''; width:9px; height:9px; min-width:9px; border-radius:999px; background:#f5b843; box-shadow:0 0 0 4px rgba(245,184,67,.12), 0 0 16px rgba(245,184,67,.65); margin-left:auto; animation: financeiroMenuDotPulse 1.45s ease-in-out infinite; }
        .financeiro-sort-btn { appearance:none; border:0; background:transparent; color:inherit; display:inline-flex; align-items:center; gap:4px; padding:0; margin:0; font:inherit; font-weight:900; text-transform:inherit; cursor:pointer; }
        .financeiro-sort-btn:hover { color:#0f8fa6; }
        .financeiro-sort-btn span { min-width:10px; color:#0f8fa6; font-weight:900; }
        @keyframes financeiroPulse { 0%,100% { box-shadow:0 14px 34px rgba(15,23,42,.22), 0 0 0 rgba(245,158,11,0); } 50% { box-shadow:0 16px 38px rgba(15,23,42,.25), 0 0 14px rgba(245,158,11,.18); } }
        @keyframes financeiroMenuGlow { 0%,100% { filter:none; } 50% { filter:brightness(1.35); } }
        @keyframes financeiroMenuDotPulse { 0%,100% { transform:scale(1); opacity:.9; } 50% { transform:scale(1.25); opacity:1; } }
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
                "classificacao classificacao"
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
                "classificacao"
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
            .financeiro-lembrete-main span { font-size:.82rem; }
            .financeiro-lembrete-doc { font-size:0; width:38px; padding:0; }
            .financeiro-lembrete-doc i { font-size:.9rem; }
            .financeiro-lembrete-item { grid-template-columns:24px minmax(0,1fr) 18px; }
            .financeiro-lembrete-item-valor { grid-column:2; font-size:.82rem; }
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
    ['financeiroTipo', 'financeiroDescricao', 'financeiroObservacao'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            if (!financeiroClassificacaoManual) atualizarClassificacaoFinanceiraUI({
                tipo: document.getElementById('financeiroTipo')?.value || '',
                descricao: document.getElementById('financeiroDescricao')?.value || '',
                observacao: document.getElementById('financeiroObservacao')?.value || '',
                conferenciaStatus: 'conferido'
            });
        });
    });
    document.addEventListener('click', event => {
        document.querySelectorAll('.financeiro-mais-acoes[open]').forEach(menu => {
            if (!menu.contains(event.target) || event.target.closest('.financeiro-mais-acoes-menu button')) menu.open = false;
        });
    });
    document.getElementById('financeiroArquivosInput')?.addEventListener('change', event => window.importarPastaFinanceira(event.target.files));
    document.getElementById('financeiroPastaInput')?.addEventListener('change', event => window.importarPastaFinanceira(event.target.files));
    document.getElementById('financeiroSigewinInput')?.addEventListener('change', event => {
        const arquivos = Array.from(event.target.files || []).filter(file => /\.xml$/i.test(file.name));
        if (arquivos.length) window.importarPastaFinanceira(arquivos);
        else alert('Nenhum XML de NF-e foi encontrado na pasta selecionada do SIGEWIN.');
        event.target.value = '';
    });
    document.getElementById('financeiroFilaInput')?.addEventListener('change', event => window.importarFilaMonitorFinanceiro(event.target.files));
    iniciarSincronizacaoSigeWinFinanceiro();
    window.limparFinanceiroForm();
    aplicarEstadoVisualFinanceiro();
    migrarArquivosFinanceirosLocal()
        .catch(error => console.warn('Não foi possível migrar anexos financeiros locais.', error))
        .finally(() => {
            renderFinanceiro();
            aplicarEstadoVisualFinanceiro();
        });
});

// Ao abrir o Financeiro: carrega do banco e, se o Outlook estiver conectado, busca anexos novos
// do e-mail em segundo plano (no maximo a cada 10 minutos).
async function carregarFinanceiroComAutomacao() {
    await carregarFinanceiroNuvem();
    const agora = Date.now();
    if (agora - Number(window.__financeiroEmailVerificadoEm || 0) < 10 * 60 * 1000) return;
    window.__financeiroEmailVerificadoEm = agora;
    try {
        const status = await fetch('/api/outlook-status', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
        if (status?.connected) {
            const r = await window.importarAnexosOutlookFinanceiro({ silencioso: true });
            avisarDocumentosEmailFinanceiro(Number(r?.importados || 0));
        }
    } catch (_) {
        // sem e-mail conectado: segue normalmente
    }
}

window.SectionLoader?.register('view-financeiro', carregarFinanceiroComAutomacao);



// =====================================================================
// Reorganizar por classe (boleto / nota / comprovante) e baixa em lote dos vencidos.
// Nada e apagado: o estado anterior fica guardado e da para desfazer.
// =====================================================================
async function salvarVariosFinanceiroNuvem(registros) {
    for (let i = 0; i < registros.length; i += 10) {
        await Promise.all(registros.slice(i, i + 10).map(reg => salvarFinanceiroNuvem(reg).catch(() => false)));
    }
}

function planoReorganizacaoFinanceiro(lista) {
    const mudancas = [];
    lista.forEach(item => {
        const classe = classeDocumentoFinanceiro(item);
        const alvo = {};
        const desc = normalizarTexto(item.descricao);
        if (classe === 'comprovante') {
            if (item.tipo !== 'COMPROVANTE') alvo.tipo = 'COMPROVANTE';
            if (item.pastaFinanceira !== 'comprovantes') { alvo.pastaFinanceira = 'comprovantes'; alvo.subpastaFinanceira = /SICREDI/.test(desc) ? 'SICREDI' : (/PIX/.test(desc) ? 'PIX' : 'OUTROS COMPROVANTES'); }
            if (item.geraCobranca !== false) alvo.geraCobranca = false;
            if (item.conferenciaStatus === 'pendente') alvo.conferenciaStatus = 'conferido';
            if (item.documento && item.documento.categoria !== 'comprovante') alvo.documentoCategoria = 'comprovante';
        } else if (classe === 'nota') {
            if (item.pastaFinanceira !== 'notas') { alvo.pastaFinanceira = 'notas'; alvo.subpastaFinanceira = /SERVI/.test(desc) ? 'SERVICOS' : 'COMPRAS'; }
            if (item.geraCobranca !== false) alvo.geraCobranca = false;
        } else if (classe === 'boleto' && ['conferir', 'comprovantes', 'notas'].includes(item.pastaFinanceira) && item.conferenciaStatus !== 'pendente') {
            alvo.pastaFinanceira = 'boletos';
            alvo.subpastaFinanceira = /SICREDI/.test(desc) ? 'SICREDI' : 'OUTROS BOLETOS';
        }
        if (Object.keys(alvo).length) mudancas.push({ item, classe, alvo });
    });
    return mudancas;
}

window.reorganizarFinanceiro = async function() {
    const lista = obterLancamentosFinanceiros();
    const mudancas = planoReorganizacaoFinanceiro(lista);
    if (!mudancas.length) { alert('Tudo já está na pasta certa.'); return; }
    const conta = c => mudancas.filter(m => m.classe === c).length;
    if (!confirm([
        `Reorganizar ${mudancas.length} documento(s)?`,
        '',
        conta('comprovante') ? `• ${conta('comprovante')} comprovante(s) → pasta Comprovantes (deixam de ser cobrança)` : '',
        conta('nota') ? `• ${conta('nota')} nota(s) fiscal(is) → pasta Notas fiscais (nota não é cobrada; cobra o boleto)` : '',
        conta('boleto') ? `• ${conta('boleto')} boleto(s) → pasta Boletos` : '',
        '',
        'Nada é apagado e dá para desfazer.'
    ].filter((l, i, arr) => l || (arr[i - 1] && arr[i - 1] !== '')).join('\n'))) return;
    const agora = new Date().toISOString();
    const alterados = [];
    mudancas.forEach(({ item, alvo }) => {
        item.classificacaoAnterior = {
            tipo: item.tipo || '', pastaFinanceira: item.pastaFinanceira || '', subpastaFinanceira: item.subpastaFinanceira || '',
            geraCobranca: item.geraCobranca !== false, conferenciaStatus: item.conferenciaStatus || '', documentoCategoria: item.documento?.categoria || '', em: agora
        };
        const { documentoCategoria, ...resto } = alvo;
        Object.assign(item, resto);
        if (documentoCategoria) {
            item.documento = { ...item.documento, categoria: documentoCategoria };
            if (Array.isArray(item.documentosVinculados)) item.documentosVinculados = item.documentosVinculados.map(d => (d.id === item.documento.id ? { ...d, categoria: documentoCategoria } : d));
        }
        item.atualizadoEm = agora;
        alterados.push(item);
    });
    salvarLancamentosFinanceiros(lista);
    renderFinanceiro();
    await salvarVariosFinanceiroNuvem(alterados);
    const vinculados = await vincularNotasBoletosFinanceiro();
    alert(`${alterados.length} documento(s) reorganizado(s).${vinculados ? ` ${vinculados} nota(s) ligada(s) ao boleto da mesma compra.` : ''} Para voltar como estava, use "Desfazer reorganização".`);
};

// Liga sozinho nota <-> boleto quando a confianca e alta (mesmo numero de nota + CNPJ/valor, ou chave/linha digitavel).
// Nao mexe em pagamento. Comprovante -> boleto continua pedindo confirmacao (porque da baixa).
async function vincularNotasBoletosFinanceiro() {
    try { await sugerirVinculosFinanceiroSilencioso(); } catch (_) { return 0; }
    const lista = obterLancamentosFinanceiros();
    const porId = new Map(lista.map(reg => [reg.id, reg]));
    const agora = new Date().toISOString();
    const alterados = new Set();
    let ligados = 0;
    lista.forEach(item => {
        if (item.processoVinculoId || grupoVinculoFinanceiro(item) !== 'NOTA_FISCAL') return;
        const sug = (item.processoVinculoSugestao || []).find(sg => sg.confianca === 'alta' && grupoVinculoFinanceiro(porId.get(sg.registroId) || {}) === 'BOLETO');
        const alvo = sug && porId.get(sug.registroId);
        if (!alvo) return;
        const processoVinculoId = alvo.processoVinculoId || `proc_fin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const membros = new Set([item.id, alvo.id, ...(alvo.processoVinculoMembros || [])]);
        [item, alvo].forEach(reg => {
            reg.processoVinculoId = processoVinculoId;
            reg.processoVinculoStatus = 'CONFIRMADO';
            reg.processoVinculoMembros = [...membros];
            reg.processoVinculoConfirmadoEm = agora;
            reg.processoVinculoAutomatico = true;
            reg.processoVinculoSugestao = [];
            reg.atualizadoEm = agora;
            alterados.add(reg);
        });
        ligados++;
    });
    if (alterados.size) {
        salvarLancamentosFinanceiros(lista);
        renderFinanceiro();
        await salvarVariosFinanceiroNuvem([...alterados]);
    }
    return ligados;
}

window.desfazerReorganizacaoFinanceiro = async function() {
    const lista = obterLancamentosFinanceiros();
    const alvos = lista.filter(item => item.classificacaoAnterior);
    if (!alvos.length) { alert('Não há reorganização para desfazer.'); return; }
    if (!confirm(`Voltar ${alvos.length} documento(s) para a classificação anterior?`)) return;
    alvos.forEach(item => {
        const a = item.classificacaoAnterior;
        item.tipo = a.tipo;
        if (a.pastaFinanceira) item.pastaFinanceira = a.pastaFinanceira; else delete item.pastaFinanceira;
        if (a.subpastaFinanceira) item.subpastaFinanceira = a.subpastaFinanceira; else delete item.subpastaFinanceira;
        if (a.geraCobranca !== undefined) item.geraCobranca = a.geraCobranca;
        if (a.conferenciaStatus) item.conferenciaStatus = a.conferenciaStatus;
        if (a.documentoCategoria && item.documento) item.documento = { ...item.documento, categoria: a.documentoCategoria };
        delete item.classificacaoAnterior;
        item.atualizadoEm = new Date().toISOString();
    });
    salvarLancamentosFinanceiros(lista);
    renderFinanceiro();
    await salvarVariosFinanceiroNuvem(alvos);
};

window.abrirBaixaVencidosFinanceiro = function() {
    const vencidos = obterLancamentosFinanceiros().filter(estaVencido).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
    const temLote = obterLancamentosFinanceiros().some(item => item.baixaLote?.id);
    if (!vencidos.length) {
        if (temLote && confirm('Não há contas vencidas em aberto. Quer desfazer a última baixa em lote?')) window.desfazerUltimaBaixaLoteFinanceiro();
        else if (!temLote) alert('Não há contas a pagar vencidas em aberto.');
        return;
    }
    document.getElementById('finBaixaOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'finBaixaOverlay';
    overlay.className = 'fin-baixa-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'finBaixaTitulo');
    overlay.innerHTML = `
        <div class="fin-baixa-caixa">
            <header><h3 id="finBaixaTitulo">Dar baixa nos vencidos</h3><button type="button" class="fin-baixa-fechar" aria-label="Fechar">×</button></header>
            <p>Contas a pagar com vencimento antes de hoje e ainda em aberto. <b>Desmarque as que você NÃO pagou.</b> As marcadas ficam como pagas na data do vencimento.</p>
            <label class="fin-baixa-todos"><input type="checkbox" id="finBaixaTodos" checked> Marcar todas</label>
            <div class="fin-baixa-lista">${vencidos.map(item => `
                <label class="fin-baixa-item"><input type="checkbox" value="${escapeHtmlFinanceiro(item.id)}" checked>
                    <span><b>${escapeHtmlFinanceiro(item.descricao || item.tipo || 'Documento')}</b><small>${escapeHtmlFinanceiro(item.tipo || '')} · venceu ${dataBR(item.vencimento)}</small></span>
                    <strong>${formatarMoeda(item.valor)}</strong></label>`).join('')}</div>
            <footer>
                <span id="finBaixaTotal"></span>
                ${temLote ? '<button type="button" class="btn-secondary" data-acao="desfazer">Desfazer última baixa em lote</button>' : ''}
                <button type="button" class="btn-secondary" data-acao="cancelar">Cancelar</button>
                <button type="button" class="btn-primary" data-acao="confirmar">Dar baixa</button>
            </footer>
        </div>`;
    document.body.appendChild(overlay);
    const atualizarTotal = () => {
        const marcados = [...overlay.querySelectorAll('.fin-baixa-item input:checked')].map(i => vencidos.find(v => v.id === i.value));
        overlay.querySelector('#finBaixaTotal').textContent = `${marcados.length} de ${vencidos.length} · ${formatarMoeda(marcados.reduce((s, v) => s + Number(v?.valor || 0), 0))}`;
    };
    atualizarTotal();
    const fechar = () => overlay.remove();
    overlay.addEventListener('change', e => {
        if (e.target.id === 'finBaixaTodos') overlay.querySelectorAll('.fin-baixa-item input').forEach(i => { i.checked = e.target.checked; });
        atualizarTotal();
    });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
    overlay.addEventListener('click', async e => {
        if (e.target.closest('.fin-baixa-fechar') || e.target.closest('[data-acao="cancelar"]')) { fechar(); return; }
        if (e.target.closest('[data-acao="desfazer"]')) { fechar(); window.desfazerUltimaBaixaLoteFinanceiro(); return; }
        if (!e.target.closest('[data-acao="confirmar"]')) return;
        const ids = [...overlay.querySelectorAll('.fin-baixa-item input:checked')].map(i => i.value);
        if (!ids.length) { alert('Nenhuma conta marcada.'); return; }
        const autorizado = await window.confirmarExclusaoComSenha(`Dar baixa (marcar como pago) em ${ids.length} conta(s) vencida(s)?`, 'Digite sua senha operacional para confirmar a baixa:');
        if (!autorizado) return;
        const lista = obterLancamentosFinanceiros();
        const lote = { id: `lote_${Date.now()}`, em: new Date().toISOString(), por: window.App?.userName || '' };
        const alterados = [];
        ids.forEach(id => {
            const item = lista.find(reg => reg.id === id);
            if (!item || item.pago) return;
            item.pago = true;
            item.pagoEm = item.vencimento || lote.em.slice(0, 10);
            item.pagoOrigem = `Baixa em lote em ${dataBR(lote.em.slice(0, 10))}${lote.por ? ` por ${lote.por}` : ''}`;
            item.baixaLote = lote;
            item.atualizadoEm = lote.em;
            alterados.push(item);
        });
        salvarLancamentosFinanceiros(lista);
        fechar();
        renderFinanceiro();
        await salvarVariosFinanceiroNuvem(alterados);
        alert(`${alterados.length} conta(s) marcada(s) como paga(s). Para voltar, use "Dar baixa nos vencidos" → "Desfazer última baixa em lote".`);
    });
    overlay.querySelector('[data-acao="confirmar"]').focus();
};

window.desfazerUltimaBaixaLoteFinanceiro = async function() {
    const lista = obterLancamentosFinanceiros();
    const ultimo = lista.map(item => item.baixaLote?.id).filter(Boolean).sort().pop();
    if (!ultimo) { alert('Não há baixa em lote para desfazer.'); return; }
    const alvos = lista.filter(item => item.baixaLote?.id === ultimo);
    if (!confirm(`Desfazer a última baixa em lote (${alvos.length} conta(s) voltam a ficar em aberto)?`)) return;
    alvos.forEach(item => {
        item.pago = false; item.pagoEm = null; item.pagoOrigem = ''; item.baixaLoteDesfeito = item.baixaLote; delete item.baixaLote;
        item.atualizadoEm = new Date().toISOString();
    });
    salvarLancamentosFinanceiros(lista);
    renderFinanceiro();
    await salvarVariosFinanceiroNuvem(alvos);
};

// =====================================================================
// Pastas por fornecedor: cada fornecedor vira uma pasta automaticamente.
// Dentro, os documentos ligados (nota + boleto + comprovante) aparecem juntos.
// =====================================================================
const FIN_PALAVRAS_GENERICAS = /\b(FATURA|FAT|BOLETO|BOL|NF|NFE|NF-E|NFS|NFSE|NOTA|FISCAL|COMP|COMPROVANTE|PARC|PARCELA|DOCUMENTO|DOC|IMPORTADO|PAGAMENTO|PGTO|REF|VENC|VENCIMENTO|DE|DA|DO|DAS|DOS|E|LTDA|ME|EPP|EIRELI|S\/?A|SA|CIA|COMERCIO|COM|INDUSTRIA|IND|SERVICOS|SERV)\b/g;
function chaveNomeFornecedorFinanceiro(nome = '') {
    const limpo = normalizarTexto(nome).normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9 ]+/g, ' ').replace(FIN_PALAVRAS_GENERICAS, ' ').replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();
    return limpo.split(' ').filter(p => p.length >= 2).slice(0, 2).join(' ');
}
function nomeFornecedorFinanceiro(item = {}) {
    const candidatos = [item.ia?.fornecedor, item.fornecedor, item.descricao].filter(Boolean);
    for (const c of candidatos) {
        if (descricaoFinanceiraRuim(c) || nomeEmbaralhadoFinanceiro(c)) continue;
        if (classeDocumentoFinanceiro(item) === 'comprovante' && FIN_REGEX_COMPROVANTE_NOME.test(normalizarTexto(c))) continue;
        if (c === item.ia?.fornecedor || c === item.fornecedor) return String(c).trim();
        // nome vindo do nome do arquivo: tira "FATURA", "BOLETO", "NF", numeros etc.
        const limpo = normalizarTexto(c).replace(/\b(FATURA|FAT|BOLETO|BOL|NF|NFE|NF-E|NOTA|COMP|COMPROVANTE|PARC|PARCELA|DOC|REF|VENC)\b/g, ' ')
            .replace(/\b\d[\d\/.-]*\b/g, ' ').replace(/\s+/g, ' ').trim();
        if (limpo.length >= 3) return limpo;
    }
    return '';
}
function montarPastasFornecedoresFinanceiro(lista) {
    const pastas = new Map();
    const porCnpj = new Map();
    const porNome = new Map();
    lista.forEach(item => {
        const cnpj = String(item.ia?.cnpj || '').replace(/\D/g, '');
        const nome = nomeFornecedorFinanceiro(item);
        if (!nome && cnpj.length < 11 && item.processoVinculoId) return; // aparece junto do grupo ligado
        const chaveNome = chaveNomeFornecedorFinanceiro(nome);
        let chave = (cnpj.length >= 11 && porCnpj.get(cnpj)) || (chaveNome && porNome.get(chaveNome))
            || (cnpj.length >= 11 ? `cnpj:${cnpj}` : (chaveNome ? `nome:${chaveNome}` : 'sem'));
        if (cnpj.length >= 11) porCnpj.set(cnpj, chave);
        if (chaveNome) porNome.set(chaveNome, chave);
        if (!pastas.has(chave)) pastas.set(chave, { chave, nomes: new Map(), cnpj: '', itens: [] });
        const pasta = pastas.get(chave);
        if (cnpj && !pasta.cnpj) pasta.cnpj = cnpj;
        if (nome) pasta.nomes.set(nome, (pasta.nomes.get(nome) || 0) + (item.ia?.fornecedor ? 3 : 1));
        pasta.itens.push(item);
    });
    return [...pastas.values()].map(p => {
        const nome = [...p.nomes.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] || 'Sem fornecedor identificado';
        const cobrancas = p.itens.filter(financeiroGeraCobranca);
        return {
            ...p, nome,
            aberto: cobrancas.filter(i => !i.pago).reduce((s, i) => s + Number(i.valor || 0), 0),
            vencido: cobrancas.filter(estaVencido).reduce((s, i) => s + Number(i.valor || 0), 0),
            ultima: p.itens.map(i => i.vencimento || i.dataEmissao || (i.criadoEm || '').slice(0, 10)).filter(Boolean).sort().pop() || ''
        };
    }).sort((a, b) => (a.chave === 'sem') - (b.chave === 'sem') || a.nome.localeCompare(b.nome, 'pt-BR'));
}

let finFornecedorAberto = null;
let finFornecedorBusca = '';
function iconeClasseFinanceiro(classe) {
    return { nota: 'fa-file-invoice', boleto: 'fa-barcode', comprovante: 'fa-receipt' }[classe] || 'fa-file-lines';
}
function linhaDocFornecedorFinanceiro(item) {
    const classe = classeDocumentoFinanceiro(item);
    const status = obterStatusItem(item);
    const data = classe === 'nota' ? (item.dataEmissao ? `emissão ${dataBR(item.dataEmissao)}` : '')
        : classe === 'comprovante' ? (item.dataEmissao || item.vencimento ? `pago ${dataBR(item.dataEmissao || item.vencimento)}` : '')
        : (item.vencimento ? `vence ${dataBR(item.vencimento)}` : 'sem vencimento');
    const num = classe === 'boleto' && item.ia?.numeroDocumento ? String(item.ia.numeroDocumento).replace(/^NF-?E?0*/i, '') : numeroNotaVinculoFinanceiro(item);
    const id = escapeJsStringFinanceiro(item.id);
    return `<div class="fin-forn-doc classe-${classe}">
        <i class="fa-solid ${iconeClasseFinanceiro(classe)}" aria-hidden="true"></i>
        <div class="fin-forn-doc-info"><b>${escapeHtmlFinanceiro({ nota: 'Nota fiscal', boleto: 'Boleto', comprovante: 'Comprovante' }[classe] || (item.tipo || 'Documento'))}${num ? ` nº ${escapeHtmlFinanceiro(num)}` : ''}</b>
            <small>${escapeHtmlFinanceiro(data)}${item.pagoOrigem && item.pago ? ` · ${escapeHtmlFinanceiro(item.pagoOrigem)}` : ''}</small></div>
        <strong>${formatarMoeda(item.valor)}</strong>
        <span class="financeiro-status-badge ${status.classe}">${status.label}</span>
        <div class="fin-forn-doc-acoes">
            ${anexoPrincipalCaixaFinanceiro(item) ? `<button type="button" class="btn-secondary" onclick="window.abrirArquivoCaixaFinanceiro('${id}')">Ver arquivo</button>` : ''}
            <button type="button" class="btn-secondary" onclick="window.fecharFornecedoresFinanceiro(); window.editarFinanceiro('${id}')">Editar</button>
        </div>
    </div>`;
}
function renderFornecedoresFinanceiro() {
    const caixa = document.getElementById('finFornCaixa');
    if (!caixa) return;
    const lista = obterLancamentosFinanceiros();
    const pastas = montarPastasFornecedoresFinanceiro(lista);
    const busca = normalizarTexto(finFornecedorBusca).normalize('NFD').replace(/[̀-ͯ]/g, '');
    const visiveis = pastas.filter(p => !busca || normalizarTexto(p.nome).normalize('NFD').replace(/[̀-ͯ]/g, '').includes(busca) || p.cnpj.includes(busca.replace(/\D/g, '') || '###'));
    const aberta = pastas.find(p => p.chave === finFornecedorAberto);
    const ordemClasse = { nota: 0, boleto: 1, comprovante: 2, outro: 3 };
    let detalhe = '<p class="fin-forn-vazio">Escolha um fornecedor à esquerda.</p>';
    if (aberta) {
        const grupos = new Map();
        const soltos = [];
        aberta.itens.forEach(item => {
            if (item.processoVinculoId) {
                if (!grupos.has(item.processoVinculoId)) grupos.set(item.processoVinculoId, []);
                grupos.get(item.processoVinculoId).push(item);
            } else soltos.push(item);
        });
        // traz para o grupo os membros ligados que ficaram em outra pasta (ex.: comprovante sem nome)
        grupos.forEach((itens, pid) => {
            lista.filter(reg => reg.processoVinculoId === pid && !itens.includes(reg)).forEach(reg => itens.push(reg));
        });
        const ordenar = arr => arr.sort((a, b) => (ordemClasse[classeDocumentoFinanceiro(a)] - ordemClasse[classeDocumentoFinanceiro(b)]) || String(a.vencimento || a.dataEmissao || '').localeCompare(String(b.vencimento || b.dataEmissao || '')));
        const grupoHtml = [...grupos.values()].map(itens => {
            const classes = new Set(itens.map(classeDocumentoFinanceiro));
            const titulo = [classes.has('nota') ? 'Nota' : '', classes.has('boleto') ? 'Boleto' : '', classes.has('comprovante') ? 'Comprovante' : ''].filter(Boolean).join(' + ');
            const pago = itens.filter(financeiroGeraCobranca).every(i => i.pago);
            return `<section class="fin-forn-grupo${pago ? ' pago' : ''}"><h4><i class="fa-solid fa-link" aria-hidden="true"></i> ${escapeHtmlFinanceiro(titulo || 'Documentos ligados')}${pago ? ' <span>pago</span>' : ''}</h4>${ordenar(itens).map(linhaDocFornecedorFinanceiro).join('')}</section>`;
        }).join('');
        const soltosHtml = soltos.length ? `<section class="fin-forn-grupo soltos"><h4>Sem ligação</h4>${ordenar(soltos).map(item => {
            const sug = Array.isArray(item.processoVinculoSugestao) ? item.processoVinculoSugestao[0] : null;
            return linhaDocFornecedorFinanceiro(item) + (sug ? `<div class="fin-forn-sug">Combina com ${escapeHtmlFinanceiro(sug.descricao || sug.tipo || 'outro documento')} <button type="button" class="btn-secondary" onclick="window.confirmarVinculoFinanceiro('${escapeJsStringFinanceiro(item.id)}', '${escapeJsStringFinanceiro(sug.registroId)}').then(() => window.renderFornecedoresFinanceiro && window.renderFornecedoresFinanceiro())">Ligar</button></div>` : '');
        }).join('')}</section>` : '';
        detalhe = `<header class="fin-forn-det-topo"><div><h3>${escapeHtmlFinanceiro(aberta.nome)}</h3><small>${aberta.cnpj ? `CNPJ ${aberta.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')} · ` : ''}${aberta.itens.length} documento(s)</small></div>
            <div class="fin-forn-totais"><span>Em aberto <b>${formatarMoeda(aberta.aberto)}</b></span>${aberta.vencido ? `<span class="venc">Vencido <b>${formatarMoeda(aberta.vencido)}</b></span>` : ''}</div></header>
            ${grupoHtml}${soltosHtml}`;
    }
    caixa.innerHTML = `
        <div class="fin-forn-lista">
            <input type="search" id="finFornBusca" value="${escapeHtmlFinanceiro(finFornecedorBusca)}" placeholder="Buscar fornecedor ou CNPJ" aria-label="Buscar fornecedor">
            <div class="fin-forn-pastas">${visiveis.map(p => `<button type="button" class="fin-forn-pasta${p.chave === finFornecedorAberto ? ' ativa' : ''}" data-forn="${escapeHtmlFinanceiro(p.chave)}">
                <i class="fa-solid fa-folder${p.chave === finFornecedorAberto ? '-open' : ''}" aria-hidden="true"></i>
                <span><b>${escapeHtmlFinanceiro(p.nome)}</b><small>${p.itens.length} doc · ${p.aberto ? `${formatarMoeda(p.aberto)} em aberto` : 'nada em aberto'}</small></span>
                ${p.vencido ? '<em title="Tem conta vencida">!</em>' : ''}</button>`).join('') || '<p class="fin-forn-vazio">Nenhum fornecedor encontrado.</p>'}</div>
        </div>
        <div class="fin-forn-detalhe">${detalhe}</div>`;
    const input = caixa.querySelector('#finFornBusca');
    if (document.activeElement?.id !== 'finFornBusca' && finFornecedorBusca) { /* mantem */ }
    return input;
}
window.renderFornecedoresFinanceiro = renderFornecedoresFinanceiro;

window.abrirFornecedoresFinanceiro = function() {
    document.getElementById('finFornOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'finFornOverlay';
    overlay.className = 'fin-forn-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Fornecedores');
    overlay.innerHTML = `<div class="fin-forn-janela">
        <header class="fin-forn-topo"><h2><i class="fa-solid fa-folder-tree" aria-hidden="true"></i> Fornecedores</h2>
            <small>Uma pasta por fornecedor, criada automaticamente. Documentos ligados (nota + boleto + comprovante) aparecem juntos.</small>
            <button type="button" class="fin-forn-fechar" aria-label="Fechar" onclick="window.fecharFornecedoresFinanceiro()">×</button></header>
        <div id="finFornCaixa" class="fin-forn-caixa"></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
        const pasta = e.target.closest('[data-forn]');
        if (pasta) { finFornecedorAberto = pasta.dataset.forn; renderFornecedoresFinanceiro(); overlay.querySelector('.fin-forn-detalhe')?.scrollIntoView({ block: 'nearest' }); }
    });
    overlay.addEventListener('input', e => {
        if (e.target.id !== 'finFornBusca') return;
        finFornecedorBusca = e.target.value;
        const pos = e.target.selectionStart;
        renderFornecedoresFinanceiro();
        const campo = overlay.querySelector('#finFornBusca');
        if (campo) { campo.focus(); campo.setSelectionRange(pos, pos); }
    });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') window.fecharFornecedoresFinanceiro(); });
    renderFornecedoresFinanceiro();
    overlay.querySelector('#finFornBusca')?.focus();
};
window.fecharFornecedoresFinanceiro = function() { document.getElementById('finFornOverlay')?.remove(); };


// Comprovante com o MESMO codigo de barras/linha digitavel de um boleto: liga e da baixa sozinho
// (certeza total). Outros casos ficam como sugestao para confirmar.
async function vincularComprovanteAutomaticoFinanceiro(id) {
    const lista = obterLancamentosFinanceiros();
    const comp = lista.find(reg => reg.id === id);
    if (!comp || comp.processoVinculoId) return 0;
    const sug = (comp.processoVinculoSugestao || []).find(sg => sg.confianca === 'alta' && /linha|barcode/.test(sg.motivo || ''));
    const boleto = sug && lista.find(reg => reg.id === sug.registroId);
    if (!boleto || classeDocumentoFinanceiro(boleto) !== 'boleto') return 0;
    const agora = new Date().toISOString();
    const processoVinculoId = boleto.processoVinculoId || `proc_fin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const membros = new Set([comp.id, boleto.id, ...(boleto.processoVinculoMembros || [])]);
    const afetados = lista.filter(reg => membros.has(reg.id));
    afetados.forEach(reg => {
        reg.processoVinculoId = processoVinculoId;
        reg.processoVinculoStatus = 'CONFIRMADO';
        reg.processoVinculoMembros = [...membros];
        reg.processoVinculoConfirmadoEm = agora;
        reg.processoVinculoSugestao = [];
        reg.atualizadoEm = agora;
    });
    if (!boleto.pago) {
        boleto.pago = true;
        boleto.pagoEm = comp.dataEmissao || agora.slice(0, 10);
        boleto.pagoOrigem = `Comprovante: ${comp.descricao || 'pagamento'} (mesmo código do boleto)`;
    }
    salvarLancamentosFinanceiros(lista);
    await Promise.all(afetados.map(reg => salvarFinanceiroNuvem(reg).catch(() => false)));
    renderFinanceiro();
    return 1;
}
