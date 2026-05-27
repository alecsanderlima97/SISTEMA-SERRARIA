const KEYS_ASSISTENTE = {
    estoque: 'orquestra_estoque',
    frotas: 'orquestra_frota',
    abastecimentos: 'orquestra_frota_abastecimentos',
    manutencoes: 'orquestra_frota_manutencoes',
    relatos: 'orquestra_frota_relatos',
    financeiro: 'orquestra_financeiro_lancamentos'
};
const ASSISTANT_USAGE_KEY = 'orquestra_assistente_openai_usage';
const ASSISTANT_BUDGET_KEY = 'orquestra_assistente_openai_budget';

function lerLista(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function moeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function lerUsoAssistente() {
    try {
        return JSON.parse(localStorage.getItem(ASSISTANT_USAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function salvarUsoAssistente(usage = {}) {
    const atual = lerUsoAssistente();
    const novo = {
        totalTokens: Number(atual.totalTokens || 0) + Number(usage.totalTokens || 0),
        inputTokens: Number(atual.inputTokens || 0) + Number(usage.inputTokens || 0),
        outputTokens: Number(atual.outputTokens || 0) + Number(usage.outputTokens || 0),
        estimatedCostUsd: Number(atual.estimatedCostUsd || 0) + Number(usage.estimatedCostUsd || 0)
    };
    localStorage.setItem(ASSISTANT_USAGE_KEY, JSON.stringify(novo));
    atualizarPainelUsoAssistente();
}

function formatUsd(value) {
    return `US$ ${Number(value || 0).toFixed(4)}`;
}

function atualizarPainelUsoAssistente() {
    const uso = lerUsoAssistente();
    const custoEl = document.getElementById('assistantUsageCost');
    const tokensEl = document.getElementById('assistantUsageTokens');
    const budgetEl = document.getElementById('assistantBudgetInput');
    const barEl = document.getElementById('assistantUsageBar');
    const budget = Number(localStorage.getItem(ASSISTANT_BUDGET_KEY) || budgetEl?.value || 1);
    const custo = Number(uso.estimatedCostUsd || 0);

    if (custoEl) custoEl.textContent = formatUsd(custo);
    if (tokensEl) tokensEl.textContent = Number(uso.totalTokens || 0).toLocaleString('pt-BR');
    if (budgetEl && document.activeElement !== budgetEl) budgetEl.value = budget.toFixed(2);
    if (barEl) barEl.style.width = `${Math.min(100, budget > 0 ? (custo / budget) * 100 : 0)}%`;
}

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function unidadeEstoque(item) {
    const categoria = normalizarTexto(item?.categoria).toUpperCase();
    const nome = normalizarTexto(item?.nome).toUpperCase();
    return categoria === 'DIESEL' || categoria === 'LUBRIFICANTES' || nome.includes('DIESEL') || nome.includes('OLEO') ? 'L' : 'Un';
}

function textoContemTermo(texto, termo) {
    if (texto.includes(termo)) return true;
    if (termo.length > 3 && termo.endsWith('s') && texto.includes(termo.slice(0, -1))) return true;
    return false;
}

function mesAtual(dataIso) {
    if (!dataIso) return false;
    const data = new Date(`${dataIso}T12:00:00`);
    const hoje = new Date();
    return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
}

function coletarContexto() {
    const estoque = lerLista(KEYS_ASSISTENTE.estoque).filter(item => item.ativo !== false);
    const frotas = lerLista(KEYS_ASSISTENTE.frotas);
    const abastecimentos = lerLista(KEYS_ASSISTENTE.abastecimentos);
    const manutencoes = lerLista(KEYS_ASSISTENTE.manutencoes);
    const relatos = lerLista(KEYS_ASSISTENTE.relatos);
    const financeiro = lerLista(KEYS_ASSISTENTE.financeiro);
    return { estoque, frotas, abastecimentos, manutencoes, relatos, financeiro };
}

function analisarEstoque(ctx) {
    const baixos = ctx.estoque
        .filter(item => Number(item.quantidade || 0) <= Number(item.limite_alerta ?? (item.categoria === 'DIESEL' ? 1000 : item.categoria === 'LUBRIFICANTES' ? 40 : 3)))
        .sort((a, b) => Number(a.quantidade || 0) - Number(b.quantidade || 0));
    const diesel = ctx.estoque.find(item => (item.nome || '').toUpperCase().includes('DIESEL'));
    const linhas = [];
    if (diesel) linhas.push(`Diesel atual: ${Number(diesel.quantidade || 0).toLocaleString('pt-BR')} L.`);
    if (baixos.length) {
        linhas.push(`Itens que precisam de atencao: ${baixos.slice(0, 5).map(i => `${i.nome} (${Number(i.quantidade || 0).toLocaleString('pt-BR')})`).join(', ')}.`);
    } else {
        linhas.push('Nenhum item ativo abaixo do limite de alerta.');
    }
    return linhas.join('\n');
}

function buscarSaldoEstoque(ctx, pergunta) {
    const texto = normalizarTexto(pergunta);
    if (!texto) return '';

    const ignorar = new Set([
        'quantos', 'quantas', 'quanto', 'quanta', 'tenho', 'tem', 'no', 'na', 'nos', 'nas',
        'em', 'de', 'do', 'da', 'dos', 'das', 'estoque', 'item', 'itens', 'saldo',
        'numero', 'num', 'n', 'tamanho', 'tam', 'unidade', 'unidades', 'litro', 'litros'
    ]);
    const tokens = texto.split(' ').filter(token => token && !ignorar.has(token));
    const numeros = tokens.filter(token => /^\d+$/.test(token));
    const palavras = tokens.filter(token => !/^\d+$/.test(token));

    if (!palavras.length && !numeros.length) return '';

    const candidatos = ctx.estoque
        .map(item => {
            const alvo = normalizarTexto(`${item.nome || ''} ${item.categoria || ''}`);
            let pontos = 0;
            palavras.forEach(palavra => {
                if (textoContemTermo(alvo, palavra)) pontos += 3;
            });
            numeros.forEach(numero => {
                const regexNumero = new RegExp(`(^|\\s)${numero}(\\s|$)`);
                if (regexNumero.test(alvo)) pontos += 5;
            });
            return { item, pontos };
        })
        .filter(candidato => {
            const nomeCategoria = normalizarTexto(`${candidato.item.nome || ''} ${candidato.item.categoria || ''}`);
            return candidato.pontos > 0 && palavras.every(palavra => textoContemTermo(nomeCategoria, palavra));
        });

    if (!candidatos.length) return '';

    const maiorPontuacao = Math.max(...candidatos.map(c => c.pontos));
    const encontrados = candidatos.filter(c => c.pontos === maiorPontuacao).map(c => c.item);
    const total = encontrados.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
    const unidade = encontrados.length === 1 ? unidadeEstoque(encontrados[0]) : 'Un';
    const nomes = encontrados.map(item => item.nome).join(', ');

    return `Encontrei no estoque: ${nomes}.\nSaldo atual: ${total.toLocaleString('pt-BR')} ${unidade}.`;
}

function analisarFrotas(ctx) {
    const gastosPorVeiculo = new Map();
    ctx.abastecimentos.forEach(a => {
        gastosPorVeiculo.set(a.veiculoId, (gastosPorVeiculo.get(a.veiculoId) || 0) + Number(a.total || 0));
    });
    ctx.manutencoes.forEach(m => {
        gastosPorVeiculo.set(m.veiculoId, (gastosPorVeiculo.get(m.veiculoId) || 0) + Number(m.totalPecas || 0));
    });
    const ranking = [...gastosPorVeiculo.entries()]
        .map(([id, total]) => ({ veiculo: ctx.frotas.find(v => v.id === id), total }))
        .filter(item => item.veiculo)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    const pendentes = ctx.relatos.filter(r => r.status !== 'RESOLVIDO');
    const manutencao = ctx.frotas.filter(v => v.statusOperacional === 'MANUTENCAO');
    const linhas = [];
    linhas.push(`Relatos pendentes: ${pendentes.length}.`);
    if (manutencao.length) linhas.push(`Maquinas em manutencao: ${manutencao.map(v => v.modelo || v.placa).join(', ')}.`);
    if (ranking.length) linhas.push(`Maiores gastos: ${ranking.map(r => `${r.veiculo.modelo} (${moeda(r.total)})`).join(', ')}.`);
    if (!ranking.length && !pendentes.length) linhas.push('Nao encontrei gastos ou relatos relevantes em frotas.');
    return linhas.join('\n');
}

function analisarFinanceiro(ctx) {
    const mes = ctx.financeiro.filter(item => mesAtual(item.vencimento || item.data));
    const total = mes.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const abertos = mes.filter(item => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const dieselPosto = mes.filter(item => (item.tipo || '').includes('DIESEL POSTO')).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    return [
        `Lancamentos financeiros do mes: ${mes.length}.`,
        `Total previsto/registrado: ${moeda(total)}.`,
        `Em aberto: ${moeda(abertos)}.`,
        `Diesel de posto no financeiro: ${moeda(dieselPosto)}.`
    ].join('\n');
}

function responderPergunta(pergunta) {
    const ctx = coletarContexto();
    const q = (pergunta || '').toLowerCase();
    const respostaEstoque = buscarSaldoEstoque(ctx, pergunta);
    if (respostaEstoque) return respostaEstoque;
    if (q.includes('estoque') || q.includes('diesel') || q.includes('item')) return analisarEstoque(ctx);
    if (q.includes('frota') || q.includes('maquina') || q.includes('máquina') || q.includes('abastec') || q.includes('relato')) return analisarFrotas(ctx);
    if (q.includes('financeiro') || q.includes('despesa') || q.includes('gasto')) return analisarFinanceiro(ctx);
    return `Resumo geral:\n\n${analisarEstoque(ctx)}\n\n${analisarFrotas(ctx)}\n\n${analisarFinanceiro(ctx)}`;
}

async function responderPerguntaOpenAI(pergunta) {
    const response = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pergunta,
            contexto: coletarContexto()
        })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Falha ao consultar o assistente.');
    }
    if (data.usage) salvarUsoAssistente(data.usage);
    return data.resposta || 'Nao consegui gerar uma resposta agora.';
}

function adicionarMensagem(texto, tipo) {
    const box = document.getElementById('assistantMessages');
    if (!box) return;
    const msg = document.createElement('div');
    msg.className = `assistant-msg assistant-msg-${tipo}`;
    msg.textContent = texto;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

window.toggleAssistenteIA = function(force) {
    const panel = document.getElementById('assistantPanel');
    if (!panel) return;
    const abrir = force === undefined ? !panel.classList.contains('open') : Boolean(force);
    panel.classList.toggle('open', abrir);
    panel.setAttribute('aria-hidden', abrir ? 'false' : 'true');
    if (abrir) setTimeout(() => document.getElementById('assistantInput')?.focus(), 80);
};

window.perguntarAssistente = async function(pergunta) {
    if (!pergunta) return;
    window.toggleAssistenteIA(true);
    adicionarMensagem(pergunta, 'user');
    adicionarMensagem('Pensando com IA...', 'bot');
    try {
        const resposta = await responderPerguntaOpenAI(pergunta);
        const mensagens = document.querySelectorAll('.assistant-msg-bot');
        const ultima = mensagens[mensagens.length - 1];
        if (ultima && ultima.textContent === 'Pensando com IA...') {
            ultima.textContent = resposta;
        } else {
            adicionarMensagem(resposta, 'bot');
        }
    } catch (error) {
        const fallback = responderPergunta(pergunta);
        const mensagens = document.querySelectorAll('.assistant-msg-bot');
        const ultima = mensagens[mensagens.length - 1];
        const texto = `${fallback}\n\nIA OpenAI indisponivel: ${error.message}`;
        if (ultima && ultima.textContent === 'Pensando com IA...') {
            ultima.textContent = texto;
        } else {
            adicionarMensagem(texto, 'bot');
        }
    }
};

window.enviarPerguntaAssistenteHome = function() {
    const input = document.getElementById('assistantHomeInput');
    const pergunta = input?.value.trim();
    if (!pergunta) return;
    input.value = '';
    window.perguntarAssistente(pergunta);
};

document.addEventListener('DOMContentLoaded', () => {
    inicializarAssistenteArrastavel();
    atualizarPainelUsoAssistente();
    document.getElementById('assistantBudgetInput')?.addEventListener('change', (event) => {
        const valor = Math.max(0, Number(event.target.value || 0));
        localStorage.setItem(ASSISTANT_BUDGET_KEY, String(valor || 1));
        atualizarPainelUsoAssistente();
    });
    document.getElementById('assistantForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = document.getElementById('assistantInput');
        const pergunta = input?.value.trim();
        if (!pergunta) return;
        input.value = '';
        window.perguntarAssistente(pergunta);
    });
    document.getElementById('assistantHomeInput')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') window.enviarPerguntaAssistenteHome();
    });
});

function inicializarAssistenteArrastavel() {
    const panel = document.getElementById('assistantPanel');
    const header = panel?.querySelector('.assistant-panel-header');
    if (!panel || !header) return;

    const posSalva = JSON.parse(localStorage.getItem('orquestra_assistente_posicao') || 'null');
    if (posSalva) {
        panel.style.left = `${posSalva.left}px`;
        panel.style.top = `${posSalva.top}px`;
        panel.style.right = 'auto';
    }

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        dragging = true;
        const rect = panel.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        header.setPointerCapture(event.pointerId);
        panel.classList.add('dragging');
    });

    header.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const maxLeft = window.innerWidth - panel.offsetWidth - 8;
        const maxTop = window.innerHeight - panel.offsetHeight - 8;
        const left = Math.max(8, Math.min(maxLeft, event.clientX - offsetX));
        const top = Math.max(8, Math.min(maxTop, event.clientY - offsetY));
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.right = 'auto';
    });

    header.addEventListener('pointerup', () => {
        if (!dragging) return;
        dragging = false;
        panel.classList.remove('dragging');
        const rect = panel.getBoundingClientRect();
        localStorage.setItem('orquestra_assistente_posicao', JSON.stringify({
            left: Math.round(rect.left),
            top: Math.round(rect.top)
        }));
    });
}
