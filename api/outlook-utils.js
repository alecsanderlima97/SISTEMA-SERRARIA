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

module.exports = {
    REFRESH_COOKIE,
    META_COOKIE,
    parseCookies,
    serializeCookie,
    encodeMeta,
    decodeMeta,
    getOutlookConfig
};
