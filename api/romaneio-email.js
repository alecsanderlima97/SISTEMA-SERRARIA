const { REFRESH_COOKIE, parseCookies, refreshOutlookAccessToken } = require('./_outlook-utils');

function responderErro(res, status, error) {
    return res.status(status).json({ ok: false, error });
}

function lerCorpo(req) {
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
    return req.body || {};
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return responderErro(res, 405, 'Metodo nao permitido.');

    try {
        const body = lerCorpo(req);
        const destinatario = String(body.destinatario || '').trim().toLowerCase();
        const assunto = String(body.assunto || 'Romaneio de carga').trim().slice(0, 180);
        const mensagem = String(body.mensagem || '').trim().slice(0, 4000);
        // Também usado para pedido de compra (formulário .html / planilha .xls) e cobrança (sem anexo).
        const TIPOS = { pdf: 'application/pdf', html: 'text/html', xls: 'application/vnd.ms-excel' };
        const semAnexo = body.semAnexo === true;
        const arquivoBase64 = String(body.arquivoBase64 || '').replace(/^data:[^;]+;base64,/, '');
        const arquivoNome = String(body.arquivoNome || 'romaneio.pdf').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
        const extensao = (arquivoNome.match(/\.(pdf|html|xls)$/i) || [, 'pdf'])[1].toLowerCase();
        const arquivoTipo = TIPOS[extensao];

        if (!emailValido(destinatario)) return responderErro(res, 400, 'Informe um e-mail de destino valido.');
        if (!semAnexo && (!arquivoBase64 || arquivoBase64.length > 10 * 1024 * 1024)) {
            return responderErro(res, 400, 'O arquivo nao foi gerado corretamente ou excede o limite de envio.');
        }
        if (!mensagem && semAnexo) return responderErro(res, 400, 'Mensagem vazia.');

        const refreshToken = parseCookies(req)[REFRESH_COOKIE];
        if (!refreshToken) {
            return responderErro(res, 401, 'Conecte o Outlook nas Configuracoes antes de enviar romaneios por e-mail.');
        }

        const token = await refreshOutlookAccessToken(refreshToken);
        const respostaMicrosoft = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    subject: assunto,
                    body: {
                        contentType: 'HTML',
                        content: `<p>${mensagem.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`
                    },
                    toRecipients: [{ emailAddress: { address: destinatario } }],
                    attachments: semAnexo ? [] : [{
                        '@odata.type': '#microsoft.graph.fileAttachment',
                        name: arquivoNome,
                        contentType: arquivoTipo,
                        contentBytes: arquivoBase64
                    }]
                },
                saveToSentItems: true
            })
        });

        if (!respostaMicrosoft.ok) {
            const detalhe = await respostaMicrosoft.json().catch(() => ({}));
            return responderErro(res, respostaMicrosoft.status, detalhe.error?.message || 'A Microsoft nao conseguiu enviar o e-mail.');
        }

        return res.status(200).json({ ok: true, enviadoEm: new Date().toISOString() });
    } catch (error) {
        return responderErro(res, 500, error.message || 'Falha ao enviar o e-mail.');
    }
};
