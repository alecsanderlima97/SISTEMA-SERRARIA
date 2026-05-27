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

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY nao configurada na Vercel.' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const pergunta = String(body.pergunta || '').trim();
        if (!pergunta) {
            return res.status(400).json({ error: 'Pergunta obrigatoria.' });
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

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const rawText = await response.text();
        let data = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = {};
        }

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error?.message || rawText || 'Falha ao consultar a OpenAI.',
                status: response.status
            });
        }

        const resposta = extrairTextoOpenAI(data);
        if (!resposta) {
            return res.status(502).json({
                error: 'A OpenAI respondeu, mas nao retornou texto. Tente novamente ou troque o modelo.'
            });
        }

        return res.status(200).json({
            resposta,
            model: payload.model,
            usage: calcularCustoEstimadoOpenAI(data.usage)
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Erro interno no assistente.' });
    }
};
