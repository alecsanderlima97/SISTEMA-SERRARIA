console.log("Modulo Financeiro: inicializando...");

const FINANCEIRO_KEY = 'orquestra_financeiro_lancamentos';
const FINANCEIRO_RELATORIOS_KEY = 'orquestra_financeiro_relatorios_mensais';
const FINANCEIRO_AI_USAGE_KEY = 'orquestra_financeiro_ai_usage';
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

let financeiroAbaAtiva = 'despesas-gerais';
let financeiroAnexosTemp = { documento: null, comprovante: null };
let financeiroRelatorioAtual = [];
let financeiroNuvemCarregada = false;

function normalizarTexto(valor) {
    return (valor || '').toString().trim().toUpperCase();
}

function obterLancamentosFinanceiros() {
    return JSON.parse(localStorage.getItem(FINANCEIRO_KEY) || '[]');
}

function salvarLancamentosFinanceiros(lista) {
    localStorage.setItem(FINANCEIRO_KEY, JSON.stringify(lista || []));
}

async function carregarFinanceiroNuvem() {
    if (!window.FS) return;
    try {
        const locais = obterLancamentosFinanceiros();
        const nuvem = await window.FS.getCollection(FINANCEIRO_COLLECTION);
        if (nuvem.length > 0) {
            salvarLancamentosFinanceiros(nuvem);
        } else if (locais.length > 0) {
            await Promise.all(locais.map(item => window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, item)));
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
        await window.FS.setDoc(FINANCEIRO_COLLECTION, item.id, item);
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

function textoVencimentoLembrete(item) {
    if (item.diasVencimento < 0) return `vencido ha ${Math.abs(item.diasVencimento)} dia(s)`;
    if (item.diasVencimento === 0) return 'vence hoje';
    if (item.diasVencimento === 1) return 'vence amanha';
    return `vence em ${item.diasVencimento} dias`;
}

function mostrarLembretesFinanceiros() {
    const alertas = obterBoletosAVencerFinanceiro();
    let banner = document.getElementById('financeiroLembreteTopo');
    const linkFinanceiro = document.querySelector('a[data-target="view-financeiro"]');
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
    const lista = obterLancamentosFinanceiros().filter(item => item.aba === financeiroAbaAtiva);
    const config = FINANCEIRO_ABAS[financeiroAbaAtiva];
    const tipos = [...new Set([...config.tipoPadrao, ...lista.map(item => item.tipo).filter(Boolean)])];
    const descricoes = [...new Set([...config.descricaoPadrao, ...lista.map(item => item.descricao).filter(Boolean)])];

    document.getElementById('financeiroClassesList').innerHTML = tipos.map(item => `<option value="${item}"></option>`).join('');
    document.getElementById('financeiroDescricaoList').innerHTML = descricoes.map(item => `<option value="${item}"></option>`).join('');
}

function preencherNomeArquivo(tipo, file) {
    const id = tipo === 'documento' ? 'financeiroDocumentoNome' : 'financeiroComprovanteNome';
    const el = document.getElementById(id);
    if (el) el.textContent = file ? file.name : (tipo === 'documento' ? 'Nenhum documento anexado' : 'Nenhum comprovante anexado');
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
        paginas.push(content.items.map(item => item.str || '').join(' '));
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
        /^valor da moeda$/i
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
        .replace(/\s+\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/g, '')
        .replace(/\s+\d{2}\.\d{3}\.\d{3}\/\d{4}.*$/g, '')
        .replace(/\s+(VENCIMENTO|AGENCIA|AGÊNCIA|DATA PROCESSAMENTO|ACEITE|ESP\.? DOC).*$/i, '')
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
    if (!dados.descricao || dados.descricao === 'PENDENTE DE CONFERENCIA') return true;
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
    const boletoAssistencial = limpo.match(/BOLETO\s+ASSISTENCIAL\s+REF\.?\s*\d{2}\/\d{4}/i)?.[0];
    if (boletoAssistencial) return boletoAssistencial.toUpperCase();
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

function extrairValorLinhaDigitavelFinanceiro(texto) {
    const numeros = String(texto || '').replace(/\D/g, '');
    const match = numeros.match(/748\d{41}/) || numeros.match(/\d{47}/);
    if (!match) return 0;
    return Number(match[0].slice(-10)) / 100;
}

function extrairDadosTextoFinanceiro(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ');
    const textoBusca = limpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const data = limpo.match(/(?:vencimento|venc\.?|pagar at[eé]|data de vencimento)[:\s]*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i)?.[1]
        || limpo.match(/\b(\d{2}[\/.-]\d{2}[\/.-]\d{4})\b/)?.[1];
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
    const isBoleto = /boleto|nosso n[uÃº]mero|ficha de compensa|linha digitavel|linha digitável/i.test(limpo);
    if (isBoleto) {
        const vencimentoBoleto = extrairVencimentoBoletoFinanceiro(texto);
        const valorBoleto = valor ? parseMoeda(valor) : extrairValorLinhaDigitavelFinanceiro(texto);
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
window.lerDocumentoFinanceiroAutomaticamente = async function() {
    const anexo = financeiroAnexosTemp.documento;
    if (!anexo?.dados) {
        alert('Selecione primeiro um documento PDF, XML ou imagem.');
        return;
    }
    if ((anexo.tipo || '').startsWith('image/')) {
        alert('Este documento parece ser imagem. A leitura automatica por imagem/OCR fica para a proxima etapa. Por enquanto, preencha manualmente.');
        return;
    }
    const nomeArquivo = (anexo.nome || '').toLowerCase();
    const tipoArquivo = (anexo.tipo || '').toLowerCase();
    let texto = '';
    if (nomeArquivo.endsWith('.pdf') || tipoArquivo.includes('pdf')) {
        try {
            texto = await extrairTextoPdfFinanceiro(anexo);
        } catch (error) {
            console.error('Erro ao ler PDF financeiro:', error);
            alert('Nao foi possivel abrir este PDF automaticamente. Preencha manualmente por enquanto.');
            return;
        }
        if (!texto || texto.length < 20) {
            alert('Este PDF nao possui texto extraivel. Provavelmente e imagem/escaneado e vai precisar OCR. Preencha manualmente por enquanto.');
            return;
        }
    } else {
        texto = textoDeAnexoBase64(anexo);
    }
    if (!texto) {
        alert('Nao foi possivel ler o conteudo do documento. Preencha manualmente.');
        return;
    }
    const dados = nomeArquivo.endsWith('.xml') || tipoArquivo.includes('xml') || /<\?xml|<nfeProc|<NFe|<cteProc|<CFe/i.test(texto)
        ? extrairDadosXmlFinanceiro(texto)
        : extrairDadosTextoFinanceiro(texto);
    if (!dados) {
        alert('Nao foi possivel identificar os dados do documento. Preencha manualmente.');
        return;
    }
    preencherCampoFinanceiro('financeiroTipo', dados.tipo, false);
    preencherCampoFinanceiro('financeiroDescricao', dados.descricao, false);
    preencherCampoFinanceiro('financeiroVencimento', dados.vencimento, false);
    if (dados.valor > 0) preencherCampoFinanceiro('financeiroValor', formatarMoeda(dados.valor), false);
    if (!document.getElementById('financeiroObservacao')?.value) {
        preencherCampoFinanceiro('financeiroObservacao', `IMPORTADO DO DOCUMENTO: ${anexo.nome}`, false);
    }
    alert('Leitura concluida. Confira os campos antes de salvar.');
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
        const overlay = document.createElement('div');
        overlay.className = 'financeiro-import-modal';
        overlay.innerHTML = `
            <div class="financeiro-import-box">
                <div class="financeiro-import-head">
                    <div>
                        <h3><i class="fa-solid fa-file-circle-check"></i> Conferir documento financeiro</h3>
                        <small>${nomeSeguro}</small>
                    </div>
                    <span class="financeiro-status-badge ${pendente ? 'pendente' : 'aberto'}">${pendente ? 'Pendente' : 'Lido automaticamente'}</span>
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

window.importarPastaFinanceira = async function(files) {
    const listaArquivos = Array.from(files || []).filter(file => /\.(pdf|xml)$/i.test(file.name) || (file.type || '').startsWith('image/'));
    if (!listaArquivos.length) {
        alert('Nenhum PDF, XML ou imagem encontrado na pasta selecionada.');
        return;
    }
    const lista = obterLancamentosFinanceiros();
    const importados = [];
    let lidosAutomaticamente = 0;
    let pendentesConferencia = 0;
    for (const file of listaArquivos) {
        try {
            const anexo = {
                nome: file.name,
                tipo: file.type || (file.name.toLowerCase().endsWith('.xml') ? 'application/xml' : 'application/octet-stream'),
                dados: await lerArquivoComoDataUrl(file)
            };
            const dados = await extrairDadosAnexoFinanceiro(anexo);
            const conferencia = await confirmarImportacaoFinanceira(anexo, dados, file.webkitRelativePath || file.name);
            if (conferencia?.cancelar) break;
            if (!conferencia) continue;
            if (conferencia?.precisaConferencia || !conferencia?.valor || !conferencia?.vencimento) {
                pendentesConferencia++;
            } else {
                lidosAutomaticamente++;
            }
            const id = `fin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const registro = {
                id,
                aba: 'caixa-financeira',
                tipo: normalizarTexto(conferencia?.tipo || 'DOCUMENTO'),
                descricao: normalizarTexto(conferencia?.descricao || 'PENDENTE DE CONFERENCIA'),
                vencimento: conferencia?.vencimento || '',
                valor: Number(conferencia?.valor || 0),
                observacao: conferencia?.observacao || `IMPORTADO DA PASTA FINANCEIRA: ${file.webkitRelativePath || file.name}`,
                conferenciaStatus: conferencia?.precisaConferencia ? 'pendente' : 'conferido',
                ia: dados?.analisadoPorIA ? {
                    confianca: dados.confiancaIA || 'media',
                    fornecedor: dados.fornecedor || '',
                    cnpj: dados.cnpj || '',
                    numeroDocumento: dados.numeroDocumento || '',
                    produtos: dados.produtos || [],
                    observacao: dados.observacaoIA || ''
                } : null,
                pago: false,
                pagoEm: null,
                documento: anexo,
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
    alert(`${importados.length} documento(s) importado(s).\n${lidosAutomaticamente} lido(s) automaticamente.\n${pendentesConferencia} pendente(s) de conferencia.`);
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
            const sugestao = fila.sugestao || {};
            const anexoLocal = fila.anexo?.localPath ? {
                nome: fila.anexo.nome || fila.nomeArquivo || file.name,
                tipo: fila.anexo.tipo || 'application/octet-stream',
                localPath: fila.anexo.localPath,
                localFolder: fila.anexo.localFolder || fila.pastaLocal || '',
                localUrl: fila.anexo.localUrl || '',
                storage: 'LOCAL'
            } : null;
            const dadosExtraidos = fila.anexo?.dados ? await extrairDadosAnexoFinanceiro(fila.anexo) : null;
            const id = `fin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const registro = {
                id,
                aba: 'caixa-financeira',
                tipo: normalizarTexto(dadosExtraidos?.tipo || sugestao.tipo || 'DOCUMENTO'),
                descricao: normalizarTexto(dadosExtraidos?.descricao || sugestao.descricao || 'PENDENTE DE CONFERENCIA'),
                vencimento: dadosExtraidos?.vencimento || sugestao.vencimento || '',
                valor: Number(dadosExtraidos?.valor || sugestao.valor || 0),
                observacao: `${sugestao.observacao || `IMPORTADO DA FILA DO MONITOR: ${fila.nomeArquivo || file.name}`}${dadosExtraidos?.precisaConferencia ? ' | CONFERIR MANUALMENTE' : ''}`,
                pago: false,
                pagoEm: null,
                conferenciaStatus: 'pendente',
                ia: dadosExtraidos?.analisadoPorIA ? {
                    confianca: dadosExtraidos.confiancaIA || 'media',
                    fornecedor: dadosExtraidos.fornecedor || '',
                    cnpj: dadosExtraidos.cnpj || '',
                    numeroDocumento: dadosExtraidos.numeroDocumento || '',
                    produtos: dadosExtraidos.produtos || [],
                    observacao: dadosExtraidos.observacaoIA || ''
                } : null,
                documento: anexoLocal || fila.anexo || null,
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
    document.querySelectorAll('.btn-tab-financeiro').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.finTab === aba);
    });
    document.getElementById('financeiroTituloLista').textContent = FINANCEIRO_ABAS[aba].titulo;
    const tituloForm = document.getElementById('financeiroTituloForm');
    if (tituloForm) {
        tituloForm.innerHTML = aba === 'caixa-financeira'
            ? '<i class="fa-solid fa-inbox"></i> Adicionar documento financeiro'
            : '<i class="fa-solid fa-plus-circle"></i> Novo lançamento financeiro';
    }
    window.limparFinanceiroForm();
    renderFinanceiro();
};

window.limparFinanceiroForm = function() {
    document.getElementById('financeiroForm')?.reset();
    document.getElementById('financeiroId').value = '';
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
    atualizarDatalistsFinanceiro();

    const filtroStatus = document.getElementById('financeiroFiltroStatus')?.value || 'TODOS';
    const ordenacao = document.getElementById('financeiroOrdenacao')?.value || 'VENCIMENTO_ASC';
    const busca = normalizarTexto(document.getElementById('financeiroBusca')?.value);
    let lista = obterLancamentosFinanceiros().filter(item => item.aba === financeiroAbaAtiva);

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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:28px; color:var(--text-muted);">Nenhum lançamento financeiro nesta aba.</td></tr>';
        mostrarLembretesFinanceiros();
        return;
    }

    tbody.innerHTML = lista.map(item => {
        const status = obterStatusItem(item);
        const anexos = [
            item.documento ? `<button type="button" class="btn-icon financeiro-link" style="color:#60a5fa; font-size:1.05rem; padding:4px;" onclick="window.abrirAnexoFinanceiro('${item.id}', 'documento')" title="Abrir documento"><i class="fa-solid fa-file-lines"></i></button>` : '',
            item.comprovante ? `<button type="button" class="btn-icon financeiro-link" style="color:#22c55e; font-size:1.05rem; padding:4px;" onclick="window.abrirAnexoFinanceiro('${item.id}', 'comprovante')" title="Abrir comprovante"><i class="fa-solid fa-receipt"></i></button>` : ''
        ].filter(Boolean).join('');
        const criadoEm = dataHoraBR(item.criadoEm);
        const atualizadoEm = dataHoraBR(item.atualizadoEm);
        const tooltipLancamento = `Lançado no sistema em: ${criadoEm}${atualizadoEm !== criadoEm ? ` | Última alteração: ${atualizadoEm}` : ''}`;

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

window.excluirFinanceiroSelecionados = async function() {
    const ids = Array.from(document.querySelectorAll('.financeiro-check:checked')).map(input => input.value);
    if (!ids.length) {
        alert('Selecione pelo menos um lançamento para excluir.');
        return;
    }
    const autorizado = await window.confirmarExclusaoComSenha(`Deseja excluir ${ids.length} lançamento(s) financeiro(s)?`);
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

window.abrirAnexoFinanceiro = function(id, tipo) {
    const item = obterLancamentosFinanceiros().find(reg => reg.id === id);
    const anexo = item?.[tipo];
    if (anexo?.storage === 'LOCAL' || anexo?.localPath) {
        if (anexo.localUrl) {
            window.open(anexo.localUrl, '_blank');
            return;
        }
        const caminho = anexo.localPath || anexo.localFolder || anexo.nome || '';
        window.prompt('Arquivo salvo localmente. Copie o caminho abaixo e cole no Explorador de Arquivos para abrir:', caminho);
        return;
    }
    if (!anexo?.dados) return;
    const win = window.open('', '_blank');
    if (!win) {
        alert('Libere pop-ups para visualizar o anexo.');
        return;
    }
    win.document.write(`<title>${anexo.nome}</title><iframe src="${anexo.dados}" style="width:100%; height:100vh; border:0;"></iframe>`);
    win.document.close();
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
    let lista = obterLancamentosFinanceiros().filter(item => item.aba === financeiroAbaAtiva);

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
    }).join('') : '<tr><td colspan="6" style="text-align:center; padding:22px; color:var(--text-muted);">Nenhum lançamento no período selecionado.</td></tr>';

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
        alert('Selecione pelo menos um lançamento para gerar o relatório.');
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

    if (!tipo || !descricao || !vencimento || valor <= 0) {
        alert('Preencha tipo, descrição, vencimento e valor.');
        return;
    }

    const id = document.getElementById('financeiroId').value || `fin_${Date.now()}`;
    const lista = obterLancamentosFinanceiros();
    const existente = lista.find(item => item.id === id);
    const pago = document.getElementById('financeiroPago').checked;
    const registro = {
        id,
        aba: financeiroAbaAtiva,
        tipo,
        descricao,
        vencimento,
        valor,
        observacao: document.getElementById('financeiroObservacao').value.trim(),
        conferenciaStatus: 'conferido',
        pago,
        pagoEm: pago ? (existente?.pagoEm || new Date().toISOString()) : null,
        documento: financeiroAnexosTemp.documento,
        comprovante: financeiroAnexosTemp.comprovante,
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
        .financeiro-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; border-bottom:1px solid var(--panel-border); padding-bottom:12px; }
        .btn-tab-financeiro { min-height:34px; background:rgba(255,255,255,0.03); border:1px solid var(--panel-border); color:var(--text-muted); border-radius:7px; padding:8px 12px; font-weight:800; cursor:pointer; display:flex; gap:7px; align-items:center; white-space:nowrap; }
        .btn-tab-financeiro.active { color:var(--accent-color); border-color:var(--accent-color); background:rgba(107,142,35,0.12); }
        .financeiro-form-card, .financeiro-list-card { padding:18px; margin-bottom:18px; }
        .financeiro-form-card > div:first-child { align-items:flex-start !important; gap:12px; }
        .financeiro-form-grid { display:grid; grid-template-columns: 1.05fr 1.25fr 0.9fr 0.85fr 0.85fr; gap:12px; align-items:start; }
        .financeiro-form-grid .input-group { min-width:0; }
        .financeiro-form-grid .input-group label { min-height:14px; margin-bottom:5px; font-size:0.68rem; letter-spacing:.02em; }
        .financeiro-form-grid input,
        .financeiro-form-grid select,
        .financeiro-form-grid textarea { width:100%; min-height:38px; border-radius:7px; box-sizing:border-box; }
        .financeiro-form-grid textarea { min-height:76px; resize:vertical; }
        .financeiro-form-grid small { display:block; margin-top:5px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .financeiro-obs { grid-column: span 2; }
        .financeiro-form-actions { display:flex; align-items:flex-end; justify-content:flex-end; height:100%; }
        .financeiro-form-actions .btn-primary,
        .financeiro-form-actions .btn-secondary,
        .financeiro-form-actions .btn-danger { min-height:40px; width:100%; justify-content:center; white-space:nowrap; }
        #btnLerDocumentoFinanceiro { min-height:38px; line-height:1.1; white-space:normal; }
        .financeiro-status-toggle { min-height:38px; border:1px solid rgba(239,68,68,0.35); background:rgba(239,68,68,0.12); color:#ef4444; border-radius:7px; padding:8px 10px; display:flex; align-items:center; gap:8px; font-weight:900; cursor:pointer; }
        .financeiro-status-toggle:has(input:checked) { border-color:rgba(16,185,129,0.45); background:rgba(16,185,129,0.12); color:#10b981; }
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
            .financeiro-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .financeiro-obs { grid-column: span 2; }
            .financeiro-list-header { grid-template-columns:1fr; }
            .financeiro-list-header > div:nth-child(2) { justify-content:flex-start; }
        }
        @media (max-width: 680px) {
            .financeiro-form-grid, .financeiro-filtros { grid-template-columns: 1fr; }
            .financeiro-obs { grid-column: span 1; }
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
    renderFinanceiro();
});

window.SectionLoader?.register('view-financeiro', carregarFinanceiroNuvem);
