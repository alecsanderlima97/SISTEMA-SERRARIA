import { auth, db, doc, getDoc, onAuthStateChanged } from './firebase-init.js';

const ADMIN_ROLES = new Set(['admin', 'administrador', 'gerente', 'gerente geral']);
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let lastSyncAt = 0;

function normalizeRole(value) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

async function sendPortalSummary(user) {
    if (!user || Date.now() - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;
    const profileSnapshot = await getDoc(doc(db, 'usuarios', user.uid));
    if (!profileSnapshot.exists()) return;
    const profile = profileSnapshot.data() || {};
    const role = normalizeRole(profile.cargoNormalizado || profile.cargo);
    if (!ADMIN_ROLES.has(role)) return;
    const idToken = await user.getIdToken();
    const response = await fetch('/api/portal-bridge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken })
    });
    if (!response.ok) return;
    lastSyncAt = Date.now();
}

onAuthStateChanged(auth, (user) => {
    sendPortalSummary(user).catch(() => {
        // A bridge failure cannot interrupt the Mad360 login or operation.
    });
});
