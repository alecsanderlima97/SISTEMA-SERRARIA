// Le a foto da contagem do patio escrita a mao e devolve as linhas estruturadas.
// Nada e gravado aqui: a tela mostra uma previa para o usuario conferir antes de lancar.

const TAMANHO_MAXIMO_IMAGEM = 6 * 1024 * 1024; // data URL (base64)
const { exigirUsuario } = require('./_firebase-auth');

const INSTRUCOES = `Voce le a folha de contagem do patio de uma serraria, escrita a mao, e devolve SOMENTE JSON valido.

Formato da folha:
- Cada linha e uma cubagem: "ESP/LARG/COMP" em milimetros, ex.: "72/110/2400" = 7,2 cm x 11,0 cm x 2,40 m; "17/85/1200" = 1,7 x 8,5 x 1,20.
- Depois vem uma ou mais configuracoes de pacote entre parenteses: "(50x10)+36" = 50 alturas x 10 de largura + 36 amarras. As amarras podem estar escritas como expoente "+36" logo apos o parentese. Sem "+N" = 0 amarras.
- Acima de cada configuracao pode haver uma contagem em tracos (estilo quadradinho): "1" ou "|" = 1, "П" (tres lados) = 3, "□" (quadrado) = 4, quadrado com diagonal = 5, quadrado com diagonal + "|" = 6, e assim por diante (cada quadrado com diagonal vale 5). Essa contagem e o numero de pacotes daquela configuracao.
- Configuracao SEM contagem acima = 1 pacote.
- O numero na margem direita da linha e o total de pacotes da linha.
- Um numero dentro de um circulo e o total de pacotes da classe.
- Um risco horizontal separa as classes: acima do primeiro risco e 1a classe, abaixo e 2a classe, abaixo de um segundo risco 3a classe. Marcas como "2o", "2°" ou "3o" no inicio da linha tambem indicam a classe.

Regras:
- Transcreva exatamente o que esta escrito. Nao corrija numeros para fechar totais e nao invente linhas.
- Se um numero estiver ilegivel, use null e explique em "observacao" da linha.
- "duvida": true quando nao tiver certeza de algum valor da linha.

Formato de resposta:
{"classes":[{"classe":1,"totalCirculo":18,"linhas":[{"medida":"72/110/2400","totalLinha":4,"duvida":false,"observacao":"","configuracoes":[{"pacotes":3,"alturas":11,"largura":10,"amarras":0}]}]}],"observacao":""}`;

function extrairJson(texto) {
    const limpo = String(texto || '').replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    const inicio = limpo.indexOf('{');
    const fim = limpo.lastIndexOf('}');
    if (inicio >= 0 && fim > inicio) return JSON.parse(limpo.slice(inicio, fim + 1));
    return JSON.parse(limpo);
}

async function lerComClaude(imagem, apiKey) {
    const [, mediaType, base64] = imagem.match(/^data:(image\/[a-z+]+);base64,(.+)$/i) || [];
    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-5-5',
            max_tokens: 4000,
            system: INSTRUCOES,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                    { type: 'text', text: 'Transcreva esta folha de contagem do patio no formato JSON pedido.' }
                ]
            }]
        })
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.error?.message || 'Falha ao consultar a IA (Anthropic).');
    const texto = (dados.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    return { resultado: extrairJson(texto), modelo: dados.model || 'claude' };
}

async function lerComOpenAI(imagem, apiKey) {
    const modelo = process.env.OPENAI_VISION_MODEL || 'gpt-5-mini';
    const resposta = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelo,
            instructions: INSTRUCOES,
            input: [{
                role: 'user',
                content: [
                    { type: 'input_text', text: 'Transcreva esta folha de contagem do patio no formato JSON pedido.' },
                    { type: 'input_image', image_url: imagem, detail: 'high' }
                ]
            }]
        })
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.error?.message || 'Falha ao consultar a IA (OpenAI).');
    let texto = typeof dados.output_text === 'string' ? dados.output_text : '';
    if (!texto) {
        texto = (dados.output || []).flatMap(item => item.content || []).map(c => c.text || '').join('\n');
    }
    return { resultado: extrairJson(texto), modelo };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido.' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const usuario = await exigirUsuario(req, body);
        if (!usuario) return res.status(401).json({ error: 'Sessao invalida. Entre novamente no sistema.' });

        const imagem = String(body.imagem || '');
        if (!/^data:image\/(jpeg|png|webp);base64,/i.test(imagem)) {
            return res.status(400).json({ error: 'Envie uma foto (JPG, PNG ou WEBP).' });
        }
        if (imagem.length > TAMANHO_MAXIMO_IMAGEM) {
            return res.status(413).json({ error: 'Foto muito grande. Tente novamente.' });
        }

        const chaveAnthropic = process.env.ANTHROPIC_API_KEY;
        const chaveOpenAI = process.env.OPENAI_API_KEY;
        if (!chaveAnthropic && !chaveOpenAI) {
            return res.status(500).json({ error: 'Leitura de foto indisponivel: chave da IA nao configurada no servidor.' });
        }

        const { resultado, modelo } = chaveAnthropic
            ? await lerComClaude(imagem, chaveAnthropic)
            : await lerComOpenAI(imagem, chaveOpenAI);

        return res.status(200).json({ dados: resultado, modelo });
    } catch (error) {
        console.error('patio-foto:', error?.message || error);
        return res.status(500).json({ error: 'Nao foi possivel ler a foto agora. Tente de novo ou lance manualmente.' });
    }
};
