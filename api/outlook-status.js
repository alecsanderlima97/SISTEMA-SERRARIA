module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const accountEmail = process.env.OUTLOOK_TARGET_EMAIL || 'escritoriovanmarte@hotmail.com';
    const configured = Boolean(
        process.env.OUTLOOK_CLIENT_ID &&
        process.env.OUTLOOK_REDIRECT_URI
    );

    return res.status(200).json({
        provider: 'microsoft-outlook',
        accountEmail,
        configured,
        callbackReady: Boolean(process.env.OUTLOOK_REDIRECT_URI),
        scopes: ['offline_access', 'openid', 'profile', 'email', 'Mail.Read']
    });
};
