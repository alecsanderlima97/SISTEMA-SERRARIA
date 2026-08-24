const OPENAI_INPUT_USD_PER_1M = 0.05;
const OPENAI_OUTPUT_USD_PER_1M = 0.40;

function limitarContextoAssistente(contexto = {}) {
    const limitarLista = (lista, limite) => Array.isArray(lista) ? lista.slice(0, limite) : [];
    return {
        estoque: limitarLista(contexto.estoque, 80),
        frotas: limitarLista(contexto.frotas, 40),
        abastecimentos: limitarLista(contexto.abastecimentos, 80),
        manutencoes: limitarLista(contexto.manutencoes, 80),
        relatos: limitarLista(contexto.relatos, 80),
        financeiro: limitarLista(contexto.financeiro, 100)
    };
}

function extrairTextoOpenAI(data) {
    if (typeof data.output_text === 'string' && data.output_text.trim()) {
        return data.output_text.trim();
    }

    const textos = [];
    for (const item of data.output || []) {
        for (const content of item.content || []) {
            if (typeof content.text === 'string' && content.text.trim()) {
                textos.push(content.text.trim());
            }
        }
    }

    return textos.join('\n\n').trim();
}

function calcularCustoEstimadoOpenAI(usage = {}) {
    const inputTokens = Number(usage.input_tokens || 0);
    const outputTokens = Number(usage.output_tokens || 0);
    const totalTokens = Number(usage.total_tokens || inputTokens + outputTokens);
    const estimatedCostUsd =
        (inputTokens / 1000000) * OPENAI_INPUT_USD_PER_1M +
        (outputTokens / 1000000) * OPENAI_OUTPUT_USD_PER_1M;

    return {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd
    };
}

function enviarErro(res, status, code, userMessage, detalhe) {
    return res.status(status).json({
        error: detalhe || userMessage,
        userMessage,
        code,
        status
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return enviarErro(res, 405, 'method_not_allowed', 'Metodo nao permitido para o assistente.');
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return enviarErro(
            res,
            500,
            'missing_openai_key',
            'A chave da OpenAI nao esta configurada no ambiente do sistema.',
            'OPENAI_API_KEY nao configurada na Vercel.'
        );
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const pergunta = String(body.pergunta || '').trim();
        if (!pergunta) {
            return enviarErro(res, 400, 'missing_question', 'Digite uma pergunta para o assistente.');
        }

        const payload = {
            model: process.env.OPENAI_MODEL || 'gpt-5-nano',
            instructions: [
                'Voce e o Assistente IA do sistema de uma serraria.',
                'Responda em portugues do Brasil, de forma curta, pratica e operacional.',
                'Use os dados enviados como contexto do sistema. Se faltar dado, diga o que precisa ser conferido no sistema.',
                'Nao invente numeros. Para dinheiro, use formato brasileiro.'
            ].join(' '),
            input: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: `Pergunta do usuario: ${pergunta}\n\nContexto do sistema:\n${JSON.stringify(limitarContextoAssistente(body.contexto), null, 2)}`
                        }
                    ]
                }
            ]
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeout);

        const rawText = await response.text();
        let data = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = {};
        }

        if (!response.ok) {
            const detalhe = data.error?.message || rawText || 'Falha ao consultar a OpenAI.';
            let code = 'openai_error';
            let userMessage = 'A OpenAI nao respondeu corretamente agora.';
            if (response.status === 401 || response.status === 403) {
                code = 'openai_auth_error';
                userMessage = 'A OpenAI recusou a autorizacao. Confira a chave configurada.';
            } else if (response.status === 429) {
                code = 'openai_rate_limited';
                userMessage = 'A OpenAI limitou o uso no momento. Tente novamente em alguns instantes.';
            } else if (response.status >= 500) {
                code = 'openai_unstable';
                userMessage = 'A OpenAI esta instavel agora. O assistente pode usar a analise local.';
            }
            return enviarErro(res, response.status, code, userMessage, detalhe);
        }

        const resposta = extrairTextoOpenAI(data);
        if (!resposta) {
            return enviarErro(
                res,
                502,
                'openai_empty_response',
                'A OpenAI respondeu, mas nao retornou texto. Tente novamente.',
                'A OpenAI respondeu, mas nao retornou texto. Tente novamente ou troque o modelo.'
            );
        }

        return res.status(200).json({
            resposta,
            model: payload.model,
            usage: calcularCustoEstimadoOpenAI(data.usage)
        });
    } catch (error) {
        if (error?.name === 'AbortError') {
            return enviarErro(
                res,
                504,
                'openai_timeout',
                'A OpenAI demorou demais para responder. Tente novamente.',
                'Timeout ao consultar a OpenAI.'
            );
        }
        return enviarErro(
            res,
            500,
            'assistant_internal_error',
            'Erro interno no assistente. Use a analise local por enquanto.',
            error.message || 'Erro interno no assistente.'
        );
    }
};
