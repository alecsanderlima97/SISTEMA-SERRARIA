const {
    META_COOKIE,
    parseCookies,
    decodeMeta,
    getOutlookConfig
} = require('./outlook-utils');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const { clientId, redirectUri, targetEmail } = getOutlookConfig();
    const cookies = parseCookies(req);
    const meta = decodeMeta(cookies[META_COOKIE]);
    const configured = Boolean(
        clientId &&
        redirectUri
    );

    return res.status(200).json({
        provider: 'microsoft-outlook',
        accountEmail: targetEmail,
        configured,
        callbackReady: Boolean(redirectUri),
        connected: Boolean(meta?.email),
        connectedEmail: meta?.email || null,
        connectedName: meta?.nome || null,
        connectedAt: meta?.conectadoEm || null,
        scopes: ['offline_access', 'openid', 'profile', 'email', 'Mail.Read']
    });
};
