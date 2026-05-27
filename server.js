const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE = '.';
const OPENAI_INPUT_USD_PER_1M = 0.05;
const OPENAI_OUTPUT_USD_PER_1M = 0.40;
const mime = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg'
};

function sendJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 1024) {
                req.destroy();
                reject(new Error('Payload muito grande.'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error('JSON invalido.'));
            }
        });
        req.on('error', reject);
    });
}

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

async function responderAssistente(req, res) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return sendJson(res, 500, {
            error: 'OPENAI_API_KEY nao configurada no servidor.'
        });
    }

    try {
        const body = await readJsonBody(req);
        const pergunta = String(body.pergunta || '').trim();
        if (!pergunta) {
            return sendJson(res, 400, { error: 'Pergunta obrigatoria.' });
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
            return sendJson(res, response.status, {
                error: data.error?.message || rawText || 'Falha ao consultar a OpenAI.',
                status: response.status
            });
        }

        const resposta = extrairTextoOpenAI(data);
        if (!resposta) {
            return sendJson(res, 502, {
                error: 'A OpenAI respondeu, mas nao retornou texto. Tente novamente ou troque o modelo.'
            });
        }

        sendJson(res, 200, {
            resposta,
            model: payload.model,
            usage: calcularCustoEstimadoOpenAI(data.usage)
        });
    } catch (error) {
        sendJson(res, 500, { error: error.message || 'Erro interno no assistente.' });
    }
}

function serveFile(res, file) {
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Arquivo nao encontrado: ' + file);
            return;
        }
        let ext = path.extname(file);
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
        res.end(data);
    });
}

http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];

    if (urlPath === '/api/assistente' && req.method === 'POST') {
        return responderAssistente(req, res);
    }

    // Rota raiz -> index.html
    if (urlPath === '/') {
        return serveFile(res, path.join(BASE, 'index.html'));
    }

    let file = path.join(BASE, urlPath);

    // Se não tem extensão, tenta adicionar .html
    if (!path.extname(file)) {
        file = file + '.html';
    }

    serveFile(res, file);

}).listen(PORT, () => {
    console.log('Servidor rodando em http://localhost:' + PORT);
    console.log('Acesse: http://localhost:' + PORT + '/login.html');
});
