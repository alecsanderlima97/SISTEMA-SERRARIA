const {
    REFRESH_COOKIE,
    META_COOKIE,
    parseCookies,
    decodeMeta,
    serializeCookie,
    refreshOutlookAccessToken
} = require('./outlook-utils');

// Baixa um anexo (PDF, XML ou imagem) de um e-mail do Outlook conectado neste navegador,
// para o Financeiro importar boletos e notas sem precisar salvar o arquivo antes.
const TIPOS_PERMITIDOS = /^(application\/pdf|application\/xml|text\/xml|image\/)/i;
const EXTENSOES_PERMITIDAS = /\.(pdf|xml|png|jpe?g|webp)$/i;
const TAMANHO_MAXIMO = 15 * 1024 * 1024;
const ID_VALIDO = /^[A-Za-z0-9_\-=+/]{10,400}$/;

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const messageId = String(req.query?.messageId || '');
    const attachmentId = String(req.query?.attachmentId || '');
    if (!ID_VALIDO.test(messageId) || !ID_VALIDO.test(attachmentId)) {
        return res.status(400).json({ error: 'Anexo invalido.' });
    }

    try {
        const cookies = parseCookies(req);
        const refreshToken = cookies[REFRESH_COOKIE];
        const meta = decodeMeta(cookies[META_COOKIE]);
        if (!refreshToken || !meta?.email) {
            return res.status(401).json({ error: 'Outlook nao conectado.' });
        }

        const tokenData = await refreshOutlookAccessToken(refreshToken);
        const accessToken = tokenData.access_token;
        const nextRefreshToken = tokenData.refresh_token || refreshToken;

        const url = `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
        const resposta = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        const anexo = await resposta.json();
        if (!resposta.ok) {
            return res.status(502).json({ error: 'Nao foi possivel baixar o anexo no Outlook.' });
        }

        const nome = String(anexo.name || 'anexo');
        const tipo = String(anexo.contentType || 'application/octet-stream');
        const tamanho = Number(anexo.size || 0);
        if (anexo['@odata.type'] !== '#microsoft.graph.fileAttachment' || !anexo.contentBytes) {
            return res.status(415).json({ error: 'Este anexo nao e um arquivo.' });
        }
        if (!TIPOS_PERMITIDOS.test(tipo) && !EXTENSOES_PERMITIDAS.test(nome)) {
            return res.status(415).json({ error: 'Tipo de arquivo nao aceito (somente PDF, XML ou imagem).' });
        }
        if (tamanho > TAMANHO_MAXIMO) {
            return res.status(413).json({ error: 'Anexo maior que 15 MB.' });
        }

        res.setHeader('Set-Cookie', serializeCookie(REFRESH_COOKIE, nextRefreshToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 60 * 60 * 24 * 30
        }));
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ nome, tipo, tamanho, conteudoBase64: anexo.contentBytes });
    } catch (error) {
        return res.status(500).json({ error: 'Falha ao baixar o anexo do Outlook.' });
    }
};
