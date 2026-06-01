const {
    REFRESH_COOKIE,
    META_COOKIE,
    serializeCookie,
    encodeMeta,
    getOutlookConfig
} = require('./outlook-utils');

function responderHtml(res, html, status = 200, cookies = []) {
    if (cookies.length) {
        res.setHeader('Set-Cookie', cookies);
    }
    res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
}

function redirectPage(target) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${target}">
  <title>Conectando Outlook</title>
</head>
<body style="font-family: Arial, sans-serif; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh;">
  <div>Concluindo conexao com Outlook...</div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const { code, error, error_description: errorDescription, state } = req.query || {};
    const { clientId, clientSecret, redirectUri, tenantId, targetEmail } = getOutlookConfig();

    if (error) {
        return responderHtml(res, redirectPage(`/index.html?outlook=erro&motivo=${encodeURIComponent(error)}`), 200);
    }

    if (!clientId || !clientSecret || !redirectUri) {
        return responderHtml(res, redirectPage('/index.html?outlook=erro&motivo=configuracao'), 200);
    }

    if (!code || state !== 'orquestracs-outlook') {
        return responderHtml(res, redirectPage('/index.html?outlook=erro&motivo=retorno-invalido'), 200);
    }

    try {
        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: String(code),
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                scope: 'offline_access openid profile email Mail.Read'
            })
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.refresh_token || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Falha ao obter token Microsoft.');
        }

        const meResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const meData = await meResponse.json();
        if (!meResponse.ok) {
            throw new Error(meData.error?.message || 'Falha ao validar a conta conectada.');
        }

        const connectedEmail = String(meData.mail || meData.userPrincipalName || '').trim().toLowerCase();
        if (!connectedEmail) {
            throw new Error('A Microsoft nao retornou o e-mail da conta conectada.');
        }

        if (targetEmail && connectedEmail !== targetEmail) {
            return responderHtml(
                res,
                redirectPage(`/index.html?outlook=erro&motivo=conta-diferente&email=${encodeURIComponent(connectedEmail)}`),
                200,
                [
                    serializeCookie(REFRESH_COOKIE, '', { path: '/', httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0 }),
                    serializeCookie(META_COOKIE, '', { path: '/', secure: true, sameSite: 'Lax', maxAge: 0 })
                ]
            );
        }

        const refreshCookie = serializeCookie(REFRESH_COOKIE, tokenData.refresh_token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 60 * 60 * 24 * 30
        });

        const metaCookie = serializeCookie(META_COOKIE, encodeMeta({
            email: connectedEmail,
            nome: meData.displayName || '',
            conectadoEm: new Date().toISOString()
        }), {
            path: '/',
            secure: true,
            sameSite: 'Lax',
            maxAge: 60 * 60 * 24 * 30
        });

        return responderHtml(res, redirectPage('/index.html?outlook=conectado'), 200, [refreshCookie, metaCookie]);
    } catch (err) {
        return responderHtml(
            res,
            redirectPage(`/index.html?outlook=erro&motivo=${encodeURIComponent(err.message || errorDescription || 'falha')}`),
            200
        );
    }
};
