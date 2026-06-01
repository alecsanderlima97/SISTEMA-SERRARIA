const {
    REFRESH_COOKIE,
    META_COOKIE,
    parseCookies,
    decodeMeta,
    serializeCookie,
    refreshOutlookAccessToken
} = require('./outlook-utils');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
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

        const graphUrl = new URL('https://graph.microsoft.com/v1.0/me/messages');
        graphUrl.searchParams.set('$top', '12');
        graphUrl.searchParams.set('$orderby', 'receivedDateTime desc');
        graphUrl.searchParams.set('$select', 'id,subject,from,receivedDateTime,hasAttachments,bodyPreview');

        const messagesResponse = await fetch(graphUrl.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const messagesData = await messagesResponse.json();
        if (!messagesResponse.ok) {
            throw new Error(messagesData.error?.message || 'Falha ao buscar mensagens no Outlook.');
        }

        const messages = await Promise.all((messagesData.value || []).map(async (message) => {
            let attachments = [];
            if (message.hasAttachments) {
                const attachmentsResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${message.id}/attachments?$select=id,name,contentType,size,isInline`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const attachmentsData = await attachmentsResponse.json();
                if (attachmentsResponse.ok) {
                    attachments = (attachmentsData.value || []).map((attachment) => ({
                        id: attachment.id,
                        nome: attachment.name || 'Anexo',
                        tipo: attachment.contentType || 'application/octet-stream',
                        tamanho: Number(attachment.size || 0),
                        inline: !!attachment.isInline
                    }));
                }
            }

            return {
                id: message.id,
                assunto: message.subject || '(Sem assunto)',
                remetente: message.from?.emailAddress?.address || '',
                remetenteNome: message.from?.emailAddress?.name || '',
                recebidoEm: message.receivedDateTime || null,
                possuiAnexos: !!message.hasAttachments,
                resumo: message.bodyPreview || '',
                anexos: attachments.filter((item) => !item.inline)
            };
        }));

        res.setHeader('Set-Cookie', serializeCookie(REFRESH_COOKIE, nextRefreshToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 60 * 60 * 24 * 30
        }));

        return res.status(200).json({
            connectedEmail: meta.email,
            messages
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Falha ao listar mensagens Outlook.' });
    }
};
