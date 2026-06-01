const {
    REFRESH_COOKIE,
    META_COOKIE,
    serializeCookie
} = require('./outlook-utils');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    res.setHeader('Set-Cookie', [
        serializeCookie(REFRESH_COOKIE, '', { path: '/', httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0 }),
        serializeCookie(META_COOKIE, '', { path: '/', secure: true, sameSite: 'Lax', maxAge: 0 })
    ]);

    return res.status(200).json({ ok: true });
};
