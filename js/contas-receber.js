console.log('Contas a Receber: modulo carregado');

const CONTAS_RECEBER_KEY = 'orquestra_contas_receber';
const CONTAS_RECEBER_COLLECTION = 'contas_receber';
const DIAS_ALERTA_RECEBER = 5;

function normalizarReceber(valor) {
    return String(valor || '').trim();
}

function normalizarTextoReceber(valor) {
    return normalizarReceber(valor).toUpperCase();
}

function formatarMoedaReceber(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBRReceber(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(`${dataIso}T12:00:00`);
    return Number.isNaN(data.getTime()) ? '-' : data.toLocaleDateString('pt-BR');
}

function hojeIsoReceber() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

function somarDiasIsoReceber(dataIso, dias) {
    const base = dataIso ? new Date(`${dataIso}T12:00:00`) : new Date();
    if (Number.isNaN(base.getTime())) return hojeIsoReceber();
    base.setDate(base.getDate() + Number(dias || 0));
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

function obterDiasPrazoReceber(formaPagamento = '', prazoPagamento = '') {
    const texto = normalizarTextoReceber(`${formaPagamento} ${prazoPagamento}`);
    const numero = texto.match(/(\d{1,3})/);
    if (numero) return Number(numero[1]);
    if (/A\s*VISTA|AVISTA|DINHEIRO/.test(texto)) return 0;
    return 0;
}

function obterMetodoPagamentoReceber(formaPagamento = '', prazoPagamento = '') {
    const texto = normalizarTextoReceber(`${formaPagamento} ${prazoPagamento}`);
    if (texto.includes('PIX')) return 'Pix';
    if (texto.includes('BOLETO')) return 'Boleto';
    if (texto.includes('CHEQUE')) return 'Cheque';
    if (/A\s*VISTA|AVISTA|DINHEIRO/.test(texto)) return 'A vista';
    if (texto.includes('PRAZO')) return 'A prazo';
    return normalizarReceber(formaPagamento) || 'Nao informado';
}

function calcularVencimentoReceber(dataBase, formaPagamento, prazoPagamento) {
    const dias = obterDiasPrazoReceber(formaPagamento, prazoPagamento);
    return somarDiasIsoReceber(dataBase || hojeIsoReceber(), dias);
}

function obterContasReceberLocal() {
    try {
        return JSON.parse(localStorage.getItem(CONTAS_RECEBER_KEY) || '[]');
    } catch (error) {
        console.error('Contas a Receber: erro ao ler cache local', error);
        return [];
    }
}

function salvarContasReceberLocal(lista) {
    localStorage.setItem(CONTAS_RECEBER_KEY, JSON.stringify(lista || []));
}

function chaveReceber(dados = {}) {
    const origem = normalizarReceber(dados.origem || 'manual').toLowerCase();
    const origemId = normalizarReceber(dados.origemId || dados.codigo || dados.romaneio || Date.now());
    return `${origem}_${origemId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 140);
}

function diasAteVencimentoReceber(item = {}) {
    if (!item.vencimento) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(`${item.vencimento}T00:00:00`);
    vencimento.setHours(0, 0, 0, 0);
    return Math.ceil((vencimento - hoje) / 86400000);
}

function textoVencimentoReceber(item = {}) {
    const dias = item.diasVencimento ?? diasAteVencimentoReceber(item);
    if (dias === null) return 'sem vencimento';
    if (dias < 0) return `vencido ha ${Math.abs(dias)} dia(s)`;
    if (dias === 0) return 'vence hoje';
    if (dias === 1) return 'vence amanha';
    return `vence em ${dias} dias`;
}

function usuarioPodeVerRecebimentos() {
    const emailsPermitidos = ['escritoriovanmarte@hotmail.com', 'escritoriovanmarte@gmail.com'];
    const email = String(
        window.App?.userData?.email ||
        window.auth?.currentUser?.email ||
        document.getElementById('perfilEmail')?.value ||
        ''
    ).toLowerCase().trim();
    return emailsPermitidos.includes(email);
}

function obterRecebimentosAlertas() {
    return obterContasReceberLocal()
        .filter(item => !item.pago && item.vencimento && Number(item.valor || 0) > 0)
        .map(item => ({ ...item, diasVencimento: diasAteVencimentoReceber(item) }))
        .filter(item => item.diasVencimento !== null && item.diasVencimento <= DIAS_ALERTA_RECEBER)
        .sort((a, b) => a.diasVencimento - b.diasVencimento || String(a.cliente || '').localeCompare(String(b.cliente || ''), 'pt-BR'));
}

function montarMensagemCobranca(item = {}) {
    const codigo = item.codigo ? ` n. ${item.codigo}` : '';
    return [
        `Ola, tudo bem?`,
        ``,
        `Passando para lembrar sobre o pagamento da carga${codigo} referente a ${item.produto || 'venda'}.`,
        ``,
        `Cliente: ${item.cliente || '-'}`,
        `Data da carga: ${dataBRReceber(item.data)}`,
        `Valor: ${formatarMoedaReceber(item.valor)}`,
        `Forma de pagamento: ${item.metodoPagamento || item.formaPagamento || '-'}`,
        `Vencimento: ${dataBRReceber(item.vencimento)} (${textoVencimentoReceber(item)})`,
        ``,
        `Qualquer duvida fico a disposicao.`
    ].join('\n');
}

function abrirWhatsAppCobranca(item = {}) {
    const telefone = String(item.whatsapp || item.telefone || '').replace(/\D/g, '');
    const urlBase = telefone ? `https://wa.me/${telefone}` : 'https://wa.me/';
    window.open(`${urlBase}?text=${encodeURIComponent(montarMensagemCobranca(item))}`, '_blank');
}

function upsertReceberLocal(item) {
    const lista = obterContasReceberLocal();
    const index = lista.findIndex(atual => atual.id === item.id || atual.chave === item.chave);
    if (index >= 0) lista[index] = { ...lista[index], ...item };
    else lista.unshift(item);
    salvarContasReceberLocal(lista);
    return item;
}

async function salvarCobranca(dados = {}) {
    const chave = chaveReceber(dados);
    const vencimento = calcularVencimentoReceber(dados.data, dados.formaPagamento, dados.prazoPagamento);
    const item = {
        id: chave,
        chave,
        origem: dados.origem || 'manual',
        origemId: dados.origemId || '',
        codigo: dados.codigo || dados.romaneio || '',
        clienteId: dados.clienteId || '',
        cliente: normalizarTextoReceber(dados.cliente || ''),
        produto: normalizarReceber(dados.produto || ''),
        data: dados.data || hojeIsoReceber(),
        valor: Number(dados.valor || 0),
        formaPagamento: normalizarReceber(dados.formaPagamento || ''),
        prazoPagamento: normalizarReceber(dados.prazoPagamento || ''),
        metodoPagamento: obterMetodoPagamentoReceber(dados.formaPagamento, dados.prazoPagamento),
        vencimento,
        whatsapp: normalizarReceber(dados.whatsapp || dados.telefone || ''),
        status: dados.status || 'ABERTO',
        pago: Boolean(dados.pago),
        notaFiscal: dados.notaFiscal || null,
        atualizadoEm: new Date().toISOString(),
        criadoEm: dados.criadoEm || new Date().toISOString()
    };

    upsertReceberLocal(item);

    try {
        if (window.FS?.setDoc) {
            await window.FS.setDoc(CONTAS_RECEBER_COLLECTION, chave, item);
        }
    } catch (error) {
        console.warn('Contas a Receber: cobranca salva apenas localmente por falha na nuvem.', error);
    }

    mostrarLembretesReceber();
    document.dispatchEvent(new CustomEvent('contasReceberAtualizadas', { detail: item }));
    return item;
}

async function carregarContasReceber() {
    try {
        if (window.FS?.getCollection) {
            const nuvem = await window.FS.getCollection(CONTAS_RECEBER_COLLECTION);
            if (Array.isArray(nuvem) && nuvem.length) {
                const mapa = new Map(obterContasReceberLocal().map(item => [item.chave || item.id, item]));
                nuvem.forEach(item => mapa.set(item.chave || item.id, item));
                salvarContasReceberLocal(Array.from(mapa.values()));
            }
        }
    } catch (error) {
        console.warn('Contas a Receber: usando cache local por falha ao carregar nuvem.', error);
    }
    mostrarLembretesReceber();
}

function mostrarListaReceber() {
    const lista = obterContasReceberLocal()
        .filter(item => !item.pago)
        .map(item => ({ ...item, diasVencimento: diasAteVencimentoReceber(item) }))
        .sort((a, b) => (a.diasVencimento ?? 9999) - (b.diasVencimento ?? 9999));
    const linhas = lista.slice(0, 18).map(item => `
        <tr>
            <td>${item.cliente || '-'}</td>
            <td>${item.codigo || '-'}</td>
            <td>${item.produto || '-'}</td>
            <td>${dataBRReceber(item.vencimento)}</td>
            <td>${formatarMoedaReceber(item.valor)}</td>
            <td>${textoVencimentoReceber(item)}</td>
            <td><button type="button" class="receber-mini-btn" onclick="window.ContasReceber.enviarWhatsApp('${item.chave || item.id}')"><i class="fa-brands fa-whatsapp"></i> Cobrar</button></td>
        </tr>
    `).join('');
    const overlay = document.createElement('div');
    overlay.className = 'receber-overlay';
    overlay.innerHTML = `
        <div class="receber-modal">
            <div class="receber-modal-head">
                <div><h3>Contas a receber</h3><p>Cargas em aberto, vencendo ou vencidas.</p></div>
                <button type="button" onclick="this.closest('.receber-overlay')?.remove()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="table-responsive">
                <table class="receber-table"><thead><tr><th>Cliente</th><th>Carga</th><th>Produto</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Acao</th></tr></thead><tbody>${linhas || '<tr><td colspan="7">Nenhuma cobranca em aberto.</td></tr>'}</tbody></table>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function mostrarLembretesReceber() {
    let banner = document.getElementById('contasReceberLembreteTopo');
    const linkFinanceiro = document.querySelector('a[data-target="view-financeiro"]');
    if (!usuarioPodeVerRecebimentos()) {
        banner?.remove();
        linkFinanceiro?.classList.remove('receber-menu-alerta');
        return;
    }

    const alertas = obterRecebimentosAlertas();
    if (!alertas.length) {
        banner?.remove();
        linkFinanceiro?.classList.remove('receber-menu-alerta');
        return;
    }

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'contasReceberLembreteTopo';
        banner.className = 'receber-lembrete-topo hide-on-print';
        document.body.appendChild(banner);
    }

    const total = alertas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const principais = alertas.slice(0, 4).map(item => `${item.cliente || '-'} - ${formatarMoedaReceber(item.valor)} (${textoVencimentoReceber(item)})`).join(' | ');
    banner.innerHTML = `
        <button type="button" class="receber-lembrete-main" onclick="window.ContasReceber.verLista()">
            <i class="fa-solid fa-hand-holding-dollar"></i>
            <span><strong>${alertas.length} recebimento(s) a cobrar</strong> - ${formatarMoedaReceber(total)} - ${principais}</span>
        </button>
        <button type="button" class="receber-lembrete-doc" onclick="window.ContasReceber.enviarWhatsApp('${alertas[0].chave || alertas[0].id}')"><i class="fa-brands fa-whatsapp"></i> Cobrar agora</button>
        <button type="button" class="receber-lembrete-close" onclick="document.getElementById('contasReceberLembreteTopo')?.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    linkFinanceiro?.classList.add('receber-menu-alerta');
}

function injetarEstilosReceber() {
    if (document.getElementById('contasReceberStyles')) return;
    const style = document.createElement('style');
    style.id = 'contasReceberStyles';
    style.textContent = `
        .receber-lembrete-topo { position:fixed; top:58px; left:50%; transform:translateX(-50%); z-index:9997; width:min(980px, calc(100vw - 28px)); display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:12px; border:0; background:linear-gradient(90deg, rgba(17,24,39,.56), rgba(17,24,39,.42)); color:#ecfdf5; box-shadow:0 14px 34px rgba(15,23,42,.22); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); animation:receberPulse 4s ease-in-out infinite; }
        .receber-lembrete-main { flex:1; min-width:0; border:0; background:transparent; color:inherit; display:flex; align-items:center; gap:10px; text-align:left; cursor:pointer; font-weight:800; }
        .receber-lembrete-main span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .receber-lembrete-main i { color:#22c55e; }
        .receber-lembrete-doc, .receber-lembrete-close, .receber-mini-btn { border:0; background:rgba(255,255,255,.12); color:#ecfdf5; border-radius:8px; min-height:34px; padding:0 10px; font-weight:900; cursor:pointer; white-space:nowrap; }
        .receber-mini-btn { color:#047857; background:#ecfdf5; border-color:#a7f3d0; }
        .receber-lembrete-close { width:34px; padding:0; display:grid; place-items:center; }
        .receber-menu-alerta { position:relative; }
        .receber-menu-alerta::before { content:''; width:9px; height:9px; border-radius:999px; background:#22c55e; box-shadow:0 0 12px #22c55e; margin-right:6px; }
        .receber-overlay { position:fixed; inset:0; z-index:10000; background:rgba(15,23,42,.62); display:grid; place-items:center; padding:22px; }
        .receber-modal { width:min(1060px, 96vw); max-height:86vh; overflow:auto; background:var(--panel-bg, #111827); color:var(--text-color, #fff); border:1px solid var(--panel-border, rgba(255,255,255,.16)); border-radius:14px; padding:18px; box-shadow:0 24px 70px rgba(0,0,0,.42); }
        .receber-modal-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:14px; }
        .receber-modal-head h3 { margin:0; }
        .receber-modal-head p { margin:4px 0 0; color:var(--text-muted, #94a3b8); }
        .receber-modal-head button { width:36px; height:36px; border-radius:8px; border:1px solid var(--panel-border, rgba(255,255,255,.16)); background:transparent; color:inherit; cursor:pointer; }
        .receber-table { width:100%; border-collapse:collapse; font-size:.88rem; }
        .receber-table th, .receber-table td { padding:10px; border-bottom:1px solid var(--panel-border, rgba(255,255,255,.12)); text-align:left; }
        @keyframes receberPulse { 0%,100% { box-shadow:0 14px 34px rgba(15,23,42,.22), 0 0 0 rgba(34,197,94,0); } 50% { box-shadow:0 16px 38px rgba(15,23,42,.25), 0 0 14px rgba(34,197,94,.16); } }
        @media (max-width:680px) { .receber-lembrete-topo { top:74px; align-items:stretch; flex-direction:column; } .receber-lembrete-main span { white-space:normal; } }
    `;
    document.head.appendChild(style);
}

window.ContasReceber = {
    salvarCobranca,
    carregar: carregarContasReceber,
    verLista: mostrarListaReceber,
    mostrarLembretes: mostrarLembretesReceber,
    mensagem: montarMensagemCobranca,
    enviarWhatsApp(id) {
        const item = obterContasReceberLocal().find(cobranca => (cobranca.chave || cobranca.id) === id);
        if (!item) return alert('Cobranca nao encontrada.');
        abrirWhatsAppCobranca(item);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    injetarEstilosReceber();
    setTimeout(carregarContasReceber, 1800);
});

document.addEventListener('financeiroAtualizado', mostrarLembretesReceber);
