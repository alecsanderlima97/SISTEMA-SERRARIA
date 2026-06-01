const REFRESH_COOKIE = 'orq_outlook_refresh';
const META_COOKIE = 'orq_outlook_meta';

function parseCookies(req) {
    const cookieHeader = req.headers.cookie || '';
    return cookieHeader.split(';').reduce((acc, part) => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) return acc;
        acc[rawKey] = decodeURIComponent(rawValue.join('=') || '');
        return acc;
    }, {});
}

function serializeCookie(name, value, options = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.httpOnly) parts.push('HttpOnly');
    if (options.secure) parts.push('Secure');
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
    return parts.join('; ');
}

function encodeMeta(meta) {
    return Buffer.from(JSON.stringify(meta), 'utf8').toString('base64url');
}

function decodeMeta(value) {
    if (!value) return null;
    try {
        return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

function getOutlookConfig() {
    return {
        clientId: process.env.OUTLOOK_CLIENT_ID || '',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirectUri: process.env.OUTLOOK_REDIRECT_URI || '',
        tenantId: process.env.OUTLOOK_TENANT_ID || 'common',
        targetEmail: (process.env.OUTLOOK_TARGET_EMAIL || 'escritoriovanmarte@hotmail.com').trim().toLowerCase()
    };
}

async function refreshOutlookAccessToken(refreshToken) {
    const { clientId, clientSecret, tenantId } = getOutlookConfig();
    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Credenciais Outlook incompletas para renovar acesso.');
    }

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: 'offline_access openid profile email Mail.Read'
        })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Falha ao renovar acesso Outlook.');
    }

    return tokenData;
}

module.exports = {
    REFRESH_COOKIE,
    META_COOKIE,
    parseCookies,
    serializeCookie,
    encodeMeta,
    decodeMeta,
    getOutlookConfig,
    refreshOutlookAccessToken
};
