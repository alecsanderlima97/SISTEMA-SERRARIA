function buildAuthUrl() {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI;
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';

    if (!clientId || !redirectUri) {
        return null;
    }

    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('scope', 'offline_access openid profile email Mail.Read');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('state', 'orquestracs-outlook');

    return authUrl.toString();
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const url = buildAuthUrl();
    if (!url) {
        return res.status(500).json({
            error: 'Integracao Outlook ainda nao configurada na Vercel.',
            missing: ['OUTLOOK_CLIENT_ID', 'OUTLOOK_REDIRECT_URI']
        });
    }

    return res.status(200).json({ url });
};
