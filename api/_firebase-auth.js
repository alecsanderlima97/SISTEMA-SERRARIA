// Confere no servidor se a requisicao vem de um usuario logado no Firebase deste sistema.
// Usa o endpoint publico accounts:lookup: o token so e aceito se foi emitido para este projeto e nao expirou.
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyBJBUSmLTTvBriPk4R_Mt4zQq4w9CoP-pk';

function extrairIdToken(req, body) {
    const header = String(req.headers?.authorization || '');
    if (/^Bearer\s+/i.test(header)) return header.replace(/^Bearer\s+/i, '').trim();
    return typeof body?.idToken === 'string' ? body.idToken : '';
}

async function validarUsuarioFirebase(idToken) {
    if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) return null;
    try {
        const resposta = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });
        if (!resposta.ok) return null;
        const dados = await resposta.json().catch(() => ({}));
        const usuario = dados.users?.[0];
        if (!usuario?.localId || usuario.disabled) return null;
        return { uid: usuario.localId, email: usuario.email || '' };
    } catch (_) {
        return null;
    }
}

async function exigirUsuario(req, body) {
    return validarUsuarioFirebase(extrairIdToken(req, body));
}

module.exports = { exigirUsuario, validarUsuarioFirebase };
