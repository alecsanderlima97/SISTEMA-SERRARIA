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
const ASSISTANT_HELP_ENABLED_KEY = 'orquestra_help_enabled';
const ASSISTANT_SCREEN_GUIDE_KEY = 'orquestra_screen_guide_enabled';
const ASSISTANT_FLOAT_ENABLED_KEY = 'orquestra_assistant_float_enabled';
const ASSISTANT_COMPANION_ENABLED_KEY = 'orquestra_assistant_companion_enabled';
let guiaAssistenteOculta = localStorage.getItem(ASSISTANT_SCREEN_GUIDE_KEY) === 'false';
let reconhecimentoVozPatio = null;
let gravandoComandoPatio = false;

function preferenciaLigada(key, defaultValue = true) {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    return value !== 'false';
}

function ajudaAssistenteAtiva() {
    return preferenciaLigada(ASSISTANT_HELP_ENABLED_KEY, true);
}

function guiaAssistenteAtivo() {
    return ajudaAssistenteAtiva() && preferenciaLigada(ASSISTANT_SCREEN_GUIDE_KEY, true);
}

function assistenteFlutuanteAtivo() {
    return preferenciaLigada(ASSISTANT_FLOAT_ENABLED_KEY, true);
}

function companionAssistenteAtivo() {
    return ajudaAssistenteAtiva() && preferenciaLigada(ASSISTANT_COMPANION_ENABLED_KEY, true);
}

const GUIAS_TELA = {
    'view-dashboard': {
        titulo: 'Inicio',
        passos: [
            'Use os KPIs para conferir producao, vendas e financeiro do periodo.',
            'Passe o mouse nos indicadores para entender a origem dos calculos.',
            'Abra o relatorio mensal para comparar meses anteriores.'
        ]
    },
    'view-romaneio-v2': {
        titulo: 'Gerar Romaneio',
        passos: [
            'Selecione o cliente e confira datas, frete e dados logisticos.',
            'Use Puxar do Patio para escolher pacotes ja contados no estoque.',
            'Confira o detalhamento financeiro antes de finalizar a carga.'
        ]
    },
    'view-cavaco': {
        titulo: 'Venda de Subprodutos',
        passos: [
            'Escolha o cliente, o tipo de subproduto e confira o numero do romaneio.',
            'O sistema bloqueia romaneio duplicado antes de salvar.',
            'Use Ultimos Lancamentos para gerar fechamento por periodo ou itens selecionados.'
        ]
    },
    'view-entrada': {
        titulo: 'Conferencia de Cargas',
        passos: [
            'Registre a entrada com fornecedor/empreiteiro, mato, produto e romaneio.',
            'Confira os valores de tora, lenha, outros e corte/remocao antes de salvar.',
            'Use Descarregamento para montar fechamentos por periodo.'
        ]
    },
    'view-mapa': {
        titulo: 'Mapa',
        passos: [
            'Cadastre cada mato com dono, contato, endereco ou coordenadas.',
            'Informe a unidade de medida negociada, como hectare, alqueire, m2, km ou pe.',
            'Use os atalhos do Google Maps e Earth para abrir o local e anexe contratos quando existir.'
        ]
    },
    'view-produtos': {
        titulo: 'Gestao de Madeira',
        passos: [
            'Cadastre classe, medidas e configuracao do pacote.',
            'Mantenha a ordem por classe e medida para facilitar o romaneio.',
            'Evite duplicar medidas iguais com configuracoes diferentes sem necessidade.'
        ]
    },
    'view-estoque': {
        titulo: 'Controle de Estoque',
        passos: [
            'Cadastre itens com categoria, unidade e limite de alerta.',
            'Use Entrada/Saida para movimentar estoque sem editar quantidade manualmente.',
            'Confira a lista de movimentacoes quando houver divergencia.'
        ]
    },
    'view-frotas': {
        titulo: 'Controle de Frota',
        passos: [
            'Use os cards para acessar abastecimento, manutencao e relatos.',
            'Registre problemas da maquina para gerar notificacao ate resolver.',
            'Mantenha foto e dados do veiculo atualizados para facilitar uso no celular.'
        ]
    },
    'view-financeiro': {
        titulo: 'Financeiro',
        passos: [
            'Importe documentos financeiros e confira tipo, vencimento e valor antes de salvar.',
            'Boletos a vencer aparecem no topo e destacam o menu Financeiro.',
            'Use a pasta raiz local para guardar PDFs sem pesar o banco de dados.'
        ]
    },
    'view-rh': {
        titulo: 'RH Funcionarios',
        passos: [
            'Cadastre dados completos do funcionario, forma de pagamento e observacoes.',
            'Lance horas extras por mes e feche o periodo quando finalizar.',
            'Use a ficha completa para consultar vales, faltas, atestados e CAT.'
        ]
    },
    'view-configuracoes': {
        titulo: 'Configuracoes',
        passos: [
            'Controle permissao de usuarios por tela e subtela.',
            'Use backup antes de alteracoes grandes.',
            'Mantenha perfil e dados da empresa atualizados.'
        ]
    }
};

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

function pareceComandoAgentePatio(pergunta) {
    const texto = normalizarTexto(pergunta);
    return (texto.includes('patio') || texto.includes('producao'))
        && (texto.includes('cubagem') || texto.includes('pacote') || texto.includes('amarras') || texto.includes('classe'));
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
    const rawText = await response.text();
    let data = {};
    try {
        data = rawText ? JSON.parse(rawText) : {};
    } catch {
        data = {};
    }
    if (!response.ok) {
        const erro = new Error(data.error || rawText || `Falha ao consultar o assistente. Status ${response.status}`);
        erro.status = response.status;
        erro.code = data.code || '';
        erro.userMessage = data.userMessage || mensagemAmigavelErroOpenAI(erro, rawText);
        throw erro;
    }
    if (data.usage) salvarUsoAssistente(data.usage);
    return data.resposta || 'Nao consegui gerar uma resposta agora.';
}

function mensagemAmigavelErroOpenAI(error, rawText = '') {
    const status = Number(error?.status || 0);
    const texto = String(error?.message || rawText || '').toLowerCase();

    if (status === 404 || texto.includes('<!doctype') || texto.includes('cannot get /api/assistente')) {
        return 'No link local simples, a rota da OpenAI nao roda. Vou responder com a analise interna do sistema.';
    }
    if (texto.includes('openai_api_key') || texto.includes('api key')) {
        return 'A chave da OpenAI nao esta configurada no ambiente do sistema.';
    }
    if (status === 401 || status === 403) {
        return 'A OpenAI recusou a autorizacao. Confira a chave e o projeto configurado.';
    }
    if (status === 429) {
        return 'A OpenAI limitou o uso no momento. Tente novamente em alguns instantes.';
    }
    if (status >= 500) {
        return 'A OpenAI ou a rota do assistente respondeu com instabilidade agora.';
    }
    return 'A IA online nao respondeu agora. Vou usar a analise interna do sistema.';
}

function atualizarStatusAssistente(texto, estado = 'local') {
    const statusEl = document.getElementById('assistantConnectionStatus');
    if (!statusEl) return;
    statusEl.textContent = texto;
    statusEl.dataset.state = estado;
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
    if (abrir) {
        setTimeout(() => {
            normalizarPosicaoAssistente(panel);
            document.getElementById('assistantInput')?.focus();
        }, 80);
    }
};

window.perguntarAssistente = async function(pergunta) {
    if (!pergunta) return;
    window.toggleAssistenteIA(true);
    if (pareceComandoAgentePatio(pergunta) && typeof window.executarComandoAgentePatio === 'function') {
        window.switchCommunicationTab?.('agents');
        const inputAgente = document.getElementById('patioAgentCommand');
        if (inputAgente) inputAgente.value = pergunta;
        adicionarMensagem(pergunta, 'user');
        adicionarMensagem('Vou tratar isso pelo Agente de Produção do Pátio.', 'bot');
        await enviarComandoAgentePatio();
        return;
    }
    window.switchCommunicationTab?.('ai');
    adicionarMensagem(pergunta, 'user');
    adicionarMensagem('Pensando com IA...', 'bot');
    atualizarStatusAssistente('Consultando OpenAI...', 'loading');
    try {
        const resposta = await responderPerguntaOpenAI(pergunta);
        atualizarStatusAssistente('OpenAI conectada', 'online');
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
        const motivo = error.userMessage || mensagemAmigavelErroOpenAI(error);
        atualizarStatusAssistente('Modo analise local', 'local');
        const texto = `${fallback}\n\nAviso: ${motivo}`;
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
    if (!pergunta) {
        window.toggleAssistenteIA(true);
        window.switchCommunicationTab?.('messages');
        return;
    }
    input.value = '';
    window.perguntarAssistente(pergunta);
};

async function enviarComandoAgentePatio(event) {
    event?.preventDefault?.();
    const input = document.getElementById('patioAgentCommand');
    const comando = input?.value.trim();
    if (!comando) return;

    const result = document.getElementById('patioAgentResult');
    if (result) result.textContent = 'Interpretando comando do pátio...';

    try {
        if (typeof window.executarComandoAgentePatio !== 'function') {
            throw new Error('Agente do patio ainda nao carregou.');
        }
        const retorno = await window.executarComandoAgentePatio(comando);
        adicionarMensagem(retorno?.mensagem || 'Comando processado pelo agente do patio.', retorno?.ok ? 'bot' : 'user');
        if (retorno?.ok && input) input.value = '';
    } catch (error) {
        console.error('Erro no agente do patio:', error);
        const mensagem = 'Nao foi possivel executar o agente do patio agora. Tente novamente ou preencha a cubagem manualmente.';
        if (result) result.textContent = mensagem;
        adicionarMensagem(mensagem, 'bot');
    }
}

function atualizarEstadoVozPatio(gravando, mensagem = '') {
    gravandoComandoPatio = gravando;
    const botao = document.getElementById('patioAgentVoiceButton');
    const result = document.getElementById('patioAgentResult');
    if (botao) {
        botao.classList.toggle('is-listening', gravando);
        botao.innerHTML = gravando
            ? '<i class="fa-solid fa-wave-square"></i> Ouvindo...'
            : '<i class="fa-solid fa-microphone"></i> Falar lançamento';
    }
    if (mensagem && result) result.textContent = mensagem;
}

function iniciarVozAgentePatio() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const input = document.getElementById('patioAgentCommand');
    if (!SpeechRecognition) {
        atualizarEstadoVozPatio(false, 'Este navegador nao liberou reconhecimento de voz. Use Chrome ou Edge atualizado.');
        return;
    }

    if (gravandoComandoPatio && reconhecimentoVozPatio) {
        reconhecimentoVozPatio.stop();
        return;
    }

    reconhecimentoVozPatio = new SpeechRecognition();
    reconhecimentoVozPatio.lang = 'pt-BR';
    reconhecimentoVozPatio.interimResults = true;
    reconhecimentoVozPatio.continuous = false;

    let textoFinal = '';
    let teveErro = false;
    reconhecimentoVozPatio.onstart = () => atualizarEstadoVozPatio(true, 'Pode falar o lançamento do pátio...');
    reconhecimentoVozPatio.onresult = event => {
        let parcial = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const trecho = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) textoFinal += `${trecho} `;
            else parcial += trecho;
        }
        if (input) input.value = `${textoFinal}${parcial}`.trim();
    };
    reconhecimentoVozPatio.onerror = event => {
        teveErro = true;
        const mensagens = {
            'not-allowed': 'Microfone bloqueado. Libere o microfone no navegador e tente novamente.',
            'no-speech': 'Nao ouvi nenhuma fala. Clique no microfone e fale o lançamento novamente.',
            network: 'Falha de rede no reconhecimento de voz. Tente novamente.'
        };
        atualizarEstadoVozPatio(false, mensagens[event.error] || 'Nao foi possivel captar a voz agora.');
    };
    reconhecimentoVozPatio.onend = async () => {
        if (teveErro) return;
        atualizarEstadoVozPatio(false, 'Voz captada. Conferindo o comando...');
        const comando = input?.value.trim();
        if (comando) await enviarComandoAgentePatio();
        else atualizarEstadoVozPatio(false, 'Nao consegui capturar o comando. Tente falar mais perto do microfone.');
    };

    try {
        reconhecimentoVozPatio.start();
    } catch (error) {
        console.error('Erro ao iniciar voz do agente do patio:', error);
        atualizarEstadoVozPatio(false, 'O reconhecimento de voz ja estava em uso. Aguarde um instante e tente novamente.');
    }
}

function instalarAgentePatioAssistente() {
    document.getElementById('patioAgentForm')?.addEventListener('submit', enviarComandoAgentePatio);
    document.getElementById('patioAgentVoiceButton')?.addEventListener('click', iniciarVozAgentePatio);
    document.querySelectorAll('[data-agent-example]').forEach(button => {
        button.addEventListener('click', () => {
            const input = document.getElementById('patioAgentCommand');
            if (input) {
                input.value = button.dataset.agentExample || '';
                input.focus();
            }
            window.switchCommunicationTab?.('agents');
        });
    });
}

function obterTelaAtivaAssistente() {
    return document.querySelector('.view-section.active-section')?.id || 'view-dashboard';
}

function renderizarGuiaAssistente(sectionId = obterTelaAtivaAssistente()) {
    const guia = GUIAS_TELA[sectionId] || {
        titulo: 'Guia do Sistema',
        passos: ['Use o menu lateral para navegar.', 'Preencha campos obrigatorios com atencao.', 'Em caso de duvida, pergunte ao assistente.']
    };
    const content = document.getElementById('assistantGuideContent');
    const card = document.getElementById('assistantGuideCard');
    if (!content) return;
    content.innerHTML = `
        <div class="assistant-guide-title">${guia.titulo}</div>
        <ol>${guia.passos.map(passo => `<li>${passo}</li>`).join('')}</ol>
    `;
    if (card) card.classList.toggle('is-hidden', guiaAssistenteOculta || !guiaAssistenteAtivo());
    atualizarCompanionAssistente(sectionId);
}

function injetarEstilosGuiaAssistente() {
    if (document.getElementById('assistantGuideStyles')) return;
    const style = document.createElement('style');
    style.id = 'assistantGuideStyles';
    style.textContent = `
        .assistant-guide-card { margin:10px 12px; padding:12px; border:1px solid rgba(245,158,11,.28); border-radius:10px; background:rgba(245,158,11,.08); color:var(--text-color); }
        .assistant-guide-card.is-hidden { display:none; }
        .assistant-guide-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:7px; }
        .assistant-guide-head > strong { display:block; color:#f59e0b; font-size:.82rem; text-transform:uppercase; letter-spacing:.04em; }
        .assistant-guide-head button { width:26px; height:26px; border:1px solid rgba(245,158,11,.24); border-radius:8px; background:rgba(255,255,255,.08); color:#f59e0b; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
        .assistant-guide-title { font-weight:900; color:inherit; margin-bottom:7px; }
        .assistant-guide-card ol { margin:0; padding-left:18px; display:grid; gap:6px; }
        .assistant-guide-card li { color:var(--text-muted); line-height:1.35; font-size:.86rem; }
    `;
    document.head.appendChild(style);
}

window.mostrarGuiaDaTelaAtual = function(abrirPainel = false) {
    if (!guiaAssistenteAtivo()) return;
    guiaAssistenteOculta = false;
    renderizarGuiaAssistente();
    if (abrirPainel) {
        window.toggleAssistenteIA(true);
        window.switchCommunicationTab?.('ai');
    }
};

window.fecharGuiaAssistente = function() {
    guiaAssistenteOculta = true;
    document.getElementById('assistantGuideCard')?.classList.add('is-hidden');
};

function atualizarCompanionAssistente(sectionId = obterTelaAtivaAssistente()) {
    const guia = GUIAS_TELA[sectionId] || GUIAS_TELA['view-dashboard'];
    const companion = document.getElementById('assistantCompanion');
    const titulo = document.getElementById('assistantCompanionTitle');
    const dica = document.getElementById('assistantCompanionHint');
    if (!companion) return;
    if (titulo) titulo.textContent = guia?.titulo || 'Guia da tela';
    if (dica) dica.textContent = guia?.passos?.[0] || 'Clique para ver orientações rápidas.';
    companion.classList.toggle('is-hidden', !companionAssistenteAtivo());
}

window.atualizarPreferenciasAssistente = function() {
    document.body.classList.toggle('assistant-help-disabled', !ajudaAssistenteAtiva());
    document.body.classList.toggle('assistant-guide-disabled', !guiaAssistenteAtivo());
    document.body.classList.toggle('assistant-float-disabled', !assistenteFlutuanteAtivo());
    document.body.classList.toggle('assistant-companion-disabled', !companionAssistenteAtivo());

    const panel = document.getElementById('assistantPanel');
    if (panel && !assistenteFlutuanteAtivo()) window.toggleAssistenteIA(false);

    renderizarGuiaAssistente();
    atualizarCompanionAssistente();
};

document.addEventListener('DOMContentLoaded', () => {
    injetarEstilosGuiaAssistente();
    inicializarAssistenteArrastavel();
    inicializarBotaoAssistenteArrastavel();
    atualizarPainelUsoAssistente();
    window.atualizarPreferenciasAssistente();
    renderizarGuiaAssistente();
    document.querySelectorAll('.sidebar a[data-target], .profile-dropdown a[data-target]').forEach(link => {
        link.addEventListener('click', () => setTimeout(() => {
            renderizarGuiaAssistente(link.dataset.target);
            atualizarCompanionAssistente(link.dataset.target);
        }, 180));
    });
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
    instalarAgentePatioAssistente();
    window.addEventListener('resize', () => normalizarPosicaoAssistente(document.getElementById('assistantPanel')));
});

function normalizarPosicaoAssistente(panel) {
    if (!panel || !panel.classList.contains('open')) return;
    if (window.innerWidth <= 700) {
        panel.style.left = '';
        panel.style.top = '';
        panel.style.right = '';
        return;
    }

    const width = panel.offsetWidth || 390;
    const height = panel.offsetHeight || 520;
    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    const left = Math.max(8, Math.min(maxLeft, Number.isFinite(rect.left) ? rect.left : window.innerWidth - width - 18));
    const top = Math.max(8, Math.min(maxTop, Number.isFinite(rect.top) ? rect.top : 88));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = 'auto';
}

function inicializarAssistenteArrastavel() {
    const panel = document.getElementById('assistantPanel');
    const header = panel?.querySelector('.assistant-panel-header');
    if (!panel || !header) return;

    const posSalva = JSON.parse(localStorage.getItem('orquestra_assistente_posicao') || 'null');
    if (posSalva && window.innerWidth > 700) {
        panel.style.left = `${posSalva.left}px`;
        panel.style.top = `${posSalva.top}px`;
        panel.style.right = 'auto';
    }

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener('pointerdown', (event) => {
        if (window.innerWidth <= 700) return;
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

function normalizarPosicaoBotaoAssistente(button) {
    if (!button || window.innerWidth <= 700) return;
    const rect = button.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    const left = Math.max(8, Math.min(maxLeft, rect.left));
    const top = Math.max(8, Math.min(maxTop, rect.top));
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.right = 'auto';
    button.style.bottom = 'auto';
}

function inicializarBotaoAssistenteArrastavel() {
    const button = document.getElementById('assistantFloatButton');
    if (!button || button.dataset.dragReady === 'true') return;
    button.dataset.dragReady = 'true';
    button.classList.add('assistant-float-draggable');

    const posSalva = JSON.parse(localStorage.getItem('orquestra_assistente_botao_posicao') || 'null');
    if (posSalva && window.innerWidth > 700) {
        button.style.left = `${posSalva.left}px`;
        button.style.top = `${posSalva.top}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    }

    let dragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;
    let startX = 0;
    let startY = 0;

    button.addEventListener('pointerdown', (event) => {
        if (window.innerWidth <= 700 || event.button !== 0) return;
        dragging = true;
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        const rect = button.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        button.setPointerCapture(event.pointerId);
        button.classList.add('dragging');
    });

    button.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = Math.abs(event.clientX - startX);
        const dy = Math.abs(event.clientY - startY);
        if (dx + dy > 5) moved = true;

        const maxLeft = window.innerWidth - button.offsetWidth - 8;
        const maxTop = window.innerHeight - button.offsetHeight - 8;
        const left = Math.max(8, Math.min(maxLeft, event.clientX - offsetX));
        const top = Math.max(8, Math.min(maxTop, event.clientY - offsetY));
        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    });

    button.addEventListener('pointerup', (event) => {
        if (!dragging) return;
        dragging = false;
        button.classList.remove('dragging');
        const rect = button.getBoundingClientRect();
        localStorage.setItem('orquestra_assistente_botao_posicao', JSON.stringify({
            left: Math.round(rect.left),
            top: Math.round(rect.top)
        }));
        if (moved) {
            event.preventDefault();
            event.stopPropagation();
            button.dataset.skipNextClick = 'true';
        }
    });

    button.addEventListener('click', (event) => {
        if (button.dataset.skipNextClick === 'true') {
            delete button.dataset.skipNextClick;
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    window.addEventListener('resize', () => normalizarPosicaoBotaoAssistente(button));
}
