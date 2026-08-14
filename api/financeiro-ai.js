const OPENAI_INPUT_USD_PER_1M = 0.05;
const OPENAI_OUTPUT_USD_PER_1M = 0.40;

function calcularCustoEstimadoOpenAI(usage = {}) {
    const inputTokens = Number(usage.input_tokens || 0);
    const outputTokens = Number(usage.output_tokens || 0);
    const totalTokens = Number(usage.total_tokens || inputTokens + outputTokens);
    return {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd:
            (inputTokens / 1000000) * OPENAI_INPUT_USD_PER_1M +
            (outputTokens / 1000000) * OPENAI_OUTPUT_USD_PER_1M
    };
}

function extrairTextoOpenAI(data) {
    if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
    const textos = [];
    for (const item of data.output || []) {
        for (const content of item.content || []) {
            if (typeof content.text === 'string' && content.text.trim()) textos.push(content.text.trim());
        }
    }
    return textos.join('\n').trim();
}

function extrairJson(texto) {
    const limpo = String(texto || '').replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    const inicio = limpo.indexOf('{');
    const fim = limpo.lastIndexOf('}');
    if (inicio >= 0 && fim > inicio) return JSON.parse(limpo.slice(inicio, fim + 1));
    return JSON.parse(limpo);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido.' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY nao configurada na Vercel.' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const textoDocumento = String(body.textoDocumento || '').slice(0, 14000);
        const nomeArquivo = String(body.nomeArquivo || 'documento');
        const sugestaoLocal = body.sugestaoLocal || {};
        if (!textoDocumento || textoDocumento.length < 20) {
            return res.status(400).json({ error: 'Texto do documento insuficiente para analise por IA.' });
        }

        const payload = {
            model: process.env.OPENAI_MODEL || 'gpt-5-nano',
            instructions: [
                'Voce extrai dados financeiros de documentos brasileiros para um sistema de serraria.',
                'Responda somente JSON valido, sem markdown.',
                'Nao invente valores. Se nao encontrar, use vazio ou 0 e marque confianca baixa.',
                'Datas devem estar em ISO yyyy-mm-dd. Valores em numero decimal.',
                'Classifique tipo como BOLETO, IMPOSTO, NOTA FISCAL, CONTA, COMPROVANTE ou DOCUMENTO.',
                'Para boleto, o valor principal deve vir de (=) VALOR DO DOCUMENTO, VALOR COBRADO, VALOR A PAGAR ou da linha digitavel; nao use juros, multa, mora, desconto, abatimento ou quantidade como valor.',
                'Para boleto, fornecedor deve ser o BENEFICIARIO/CEDENTE, nunca o PAGADOR.',
                'Para nota fiscal, extraia fornecedor/emitente, cnpj, numeroDocumento, valorTotal e produtos quando existirem.'
            ].join(' '),
            input: [{
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: JSON.stringify({
                        nomeArquivo,
                        sugestaoLocal,
                        textoDocumento,
                        formatoResposta: {
                            tipo: 'BOLETO|IMPOSTO|NOTA FISCAL|CONTA|COMPROVANTE|DOCUMENTO',
                            descricao: 'texto curto para lista',
                            fornecedor: '',
                            cnpj: '',
                            vencimento: 'yyyy-mm-dd ou vazio',
                            emissao: 'yyyy-mm-dd ou vazio',
                            numeroDocumento: '',
                            valor: 0,
                            produtos: [{ descricao: '', quantidade: '', valor: 0 }],
                            categoriaSugerida: '',
                            pastaSugerida: 'BOLETOS|IMPOSTOS|NOTAS-FISCAIS|COMPROVANTES|IGNORADOS',
                            confianca: 'alta|media|baixa',
                            observacao: ''
                        }
                    })
                }]
            }]
        };

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const rawText = await response.text();
        let data = {};
        try { data = rawText ? JSON.parse(rawText) : {}; } catch { data = {}; }
        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error?.message || rawText || 'Falha ao consultar OpenAI.',
                status: response.status
            });
        }

        const resposta = extrairJson(extrairTextoOpenAI(data));
        return res.status(200).json({
            dados: resposta,
            model: payload.model,
            usage: calcularCustoEstimadoOpenAI(data.usage)
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Erro interno na analise financeira por IA.' });
    }
};
