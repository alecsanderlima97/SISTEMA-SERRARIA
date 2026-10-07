const crypto = require('node:crypto');

const FIREBASE_PROJECT_ID = 'serraria-bcf36';
const DEFAULT_EMPRESA_ID = 'vanmarte';
const PORTAL_URL = process.env.ORQUESTRA_PORTAL_URL || 'https://portal.orquestracs.com';
const ADMIN_ROLES = new Set(['admin', 'administrador', 'gerente', 'gerente geral']);
const MAX_BODY_BYTES = 12 * 1024;
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeRole(value) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function firestoreValue(field) {
    if (!field || typeof field !== 'object') return null;
    if ('stringValue' in field) return field.stringValue;
    if ('booleanValue' in field) return field.booleanValue === true;
    if ('integerValue' in field) return Number(field.integerValue);
    if ('doubleValue' in field) return Number(field.doubleValue);
    if ('timestampValue' in field) return field.timestampValue;
    return null;
}

function fieldsOf(document) {
    return document && document.fields && typeof document.fields === 'object' ? document.fields : {};
}

function fieldValue(document, name) {
    return firestoreValue(fieldsOf(document)[name]);
}

function parseDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function decodeTokenSubject(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const subject = typeof payload.user_id === 'string' ? payload.user_id : payload.sub;
        return typeof subject === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(subject) ? subject : null;
    } catch {
        return null;
    }
}

async function firebaseRequest(path, idToken, options = {}) {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
    const url = path === 'documents:runQuery' ? `${baseUrl}/documents:runQuery` : `${baseUrl}/documents/${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
        const error = new Error('Falha ao consultar o sistema de origem.');
        error.status = response.status;
        throw error;
    }
    return data;
}

async function getUserProfile(uid, idToken) {
    try {
        return await firebaseRequest(`usuarios/${encodeURIComponent(uid)}`, idToken);
    } catch (error) {
        if (error.status === 404) return null;
        throw error;
    }
}

async function runQuery(collectionId, fieldPath, value, idToken, limit = 500) {
    const query = {
        structuredQuery: {
            from: [{ collectionId }],
            where: {
                fieldFilter: {
                    field: { fieldPath },
                    op: 'EQUAL',
                    value: { stringValue: value }
                }
            },
            limit
        }
    };
    const result = await firebaseRequest('documents:runQuery', idToken, {
        method: 'POST',
        body: JSON.stringify(query)
    });
    if (!Array.isArray(result)) return [];
    return result.filter((row) => row && row.document).map((row) => row.document);
}

async function runAuditQuery(empresaId, cutoffEpoch, idToken) {
    const query = {
        structuredQuery: {
            from: [{ collectionId: 'auditoria_logs' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        { fieldFilter: { field: { fieldPath: 'empresaId' }, op: 'EQUAL', value: { stringValue: empresaId } } },
                        { fieldFilter: { field: { fieldPath: 'dataHoraEpoch' }, op: 'GREATER_THAN_OR_EQUAL', value: { integerValue: String(cutoffEpoch) } } }
                    ]
                }
            },
            orderBy: [{ field: { fieldPath: 'dataHoraEpoch' }, direction: 'DESCENDING' }],
            limit: 500
        }
    };
    try {
        const result = await firebaseRequest('documents:runQuery', idToken, {
            method: 'POST',
            body: JSON.stringify(query)
        });
        return Array.isArray(result) ? result.filter((row) => row && row.document).map((row) => row.document) : [];
    } catch {
        // Older audit records may not have the same indexable fields. A missing
        // audit count must never block the user/access summary.
        return [];
    }
}

function isPending(profile) {
    const role = normalizeRole(fieldValue(profile, 'cargoNormalizado') || fieldValue(profile, 'cargo'));
    const permissions = fieldsOf(profile).permissoes?.mapValue?.fields || null;
    const allowedSections = permissions && typeof permissions === 'object'
        ? permissions.allowedSections?.arrayValue?.values || []
        : [];
    return role === 'pendente' || allowedSections.length === 0;
}

function summarizeUsers(documents, cutoffMs) {
    const summary = {
        totalUsers: documents.length,
        owners: 0,
        administrators: 0,
        staff: 0,
        endUsers: 0,
        onlineUsers: 0,
        pendingInvitations: 0,
        recentChangesLast30Days: 0,
        activeUsersLast30Days: 0,
        lastActivityAt: null
    };
    let latestActivityMs = 0;
    documents.forEach((profile) => {
        const cargo = normalizeRole(fieldValue(profile, 'cargoNormalizado') || fieldValue(profile, 'cargo'));
        if (isPending(profile)) summary.pendingInvitations += 1;
        if (cargo === 'proprietario' || cargo === 'dono' || cargo === 'owner') summary.owners += 1;
        else if (ADMIN_ROLES.has(cargo)) summary.administrators += 1;
        else if (cargo === 'cliente' || cargo === 'aluno' || cargo === 'membro' || cargo === 'usuario final') summary.endUsers += 1;
        else if (!isPending(profile)) summary.staff += 1;

        const activity = parseDate(fieldValue(profile, 'ultimaAtividadeEm') || fieldValue(profile, 'ultimoAcessoEm'));
        const activityMs = activity ? activity.getTime() : 0;
        if (activityMs >= cutoffMs - THIRTY_DAYS_MS) summary.activeUsersLast30Days += 1;
        if (activityMs >= Date.now() - ACTIVE_WINDOW_MS && fieldValue(profile, 'online') === true) summary.onlineUsers += 1;
        if (activityMs > latestActivityMs) {
            latestActivityMs = activityMs;
            summary.lastActivityAt = activity.toISOString();
        }
    });
    return summary;
}

function jsonBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
            raw += chunk;
            if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
                reject(new Error('body_too_large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid_json')); }
        });
        req.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (!process.env.ORQUESTRA_PORTAL_CONNECTOR_SECRET) return res.status(503).json({ error: 'Ponte do Portal não configurada.' });

    try {
        const body = await jsonBody(req);
        const idToken = typeof body.idToken === 'string' && body.idToken.length <= 5000 ? body.idToken.trim() : '';
        if (!idToken) return res.status(400).json({ error: 'Sessão do sistema não informada.' });

        const uid = decodeTokenSubject(idToken);
        if (!uid) return res.status(401).json({ error: 'Sessão inválida.' });
        const profile = await getUserProfile(uid, idToken);
        if (!profile) return res.status(403).json({ error: 'Perfil do sistema não encontrado.' });

        const role = normalizeRole(fieldValue(profile, 'cargoNormalizado') || fieldValue(profile, 'cargo'));
        if (!ADMIN_ROLES.has(role)) return res.status(403).json({ error: 'Apenas o administrador do sistema pode sincronizar o resumo.' });

        const empresaId = String(fieldValue(profile, 'empresaId') || DEFAULT_EMPRESA_ID).trim();
        if (!empresaId || empresaId.length > 120) return res.status(422).json({ error: 'Empresa do sistema não identificada.' });
        const userDocuments = await runQuery('usuarios', 'empresaId', empresaId, idToken);
        const summary = summarizeUsers(userDocuments, Date.now());
        const auditDocuments = await runAuditQuery(empresaId, Date.now() - THIRTY_DAYS_MS, idToken);
        summary.recentChangesLast30Days = auditDocuments.length;

        const eventId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        const portalResponse = await fetch(`${PORTAL_URL.replace(/\/$/, '')}/api/connectors/mad360/events`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-orquestra-connector-secret': process.env.ORQUESTRA_PORTAL_CONNECTOR_SECRET
            },
            body: JSON.stringify({
                eventId,
                sourceSystem: 'mad360',
                externalTenantId: empresaId,
                status: 'online',
                generatedAt: new Date().toISOString(),
                usageSummary: summary
            })
        });
        if (!portalResponse.ok) return res.status(502).json({ error: 'O Portal não confirmou o resumo.' });
        return res.status(200).json({ ok: true, sent: true });
    } catch (error) {
        if (error?.message === 'body_too_large') return res.status(413).json({ error: 'Solicitação acima do limite permitido.' });
        if (error?.message === 'invalid_json') return res.status(400).json({ error: 'Solicitação inválida.' });
        return res.status(500).json({ error: 'Não foi possível sincronizar o resumo agora.' });
    }
};
