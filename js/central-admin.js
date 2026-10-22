import { auth, db, collection, getDocs } from './firebase-init.js';

const DEVELOPER_EMAILS = new Set(['orquestracs@gmail.com']);
const DEFAULT_EMPRESA_ID = 'vanmarte';
const PORTAL_ADMIN_URL = 'https://portal.orquestracs.com/central-admin';
const state = {
    client: {
        id: DEFAULT_EMPRESA_ID,
        nome: 'Vanmarte',
        email: 'escritoriovanmarte@gmail.com',
        produto: 'Orquestra MAD360',
        sourceSystem: 'mad360',
        externalTenantId: DEFAULT_EMPRESA_ID
    },
    usuarios: [],
    expandedId: null,
    lastSyncAt: null,
    loaded: false
};

function isDeveloper() {
    return DEVELOPER_EMAILS.has(String(auth.currentUser?.email || '').trim().toLowerCase());
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function valueToDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, fallback = 'Sem registro') {
    const date = valueToDate(value);
    return date ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : fallback;
}

function normalizeRole(value) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function roleLabel(user) {
    const role = normalizeRole(user.cargoNormalizado || user.cargo);
    if (['proprietario', 'dono', 'owner'].includes(role)) return 'Responsável principal';
    if (['admin', 'administrador', 'gerente', 'gerente geral'].includes(role)) return 'Administrador';
    if (role === 'pendente') return 'Convite pendente';
    return user.cargo || 'Usuário do sistema';
}

function isOnline(user) {
    const lastActivity = valueToDate(user.ultimaAtividadeEm || user.ultimoAcessoEm || user.onlineAtualizadoEm);
    return user.online === true && (!lastActivity || Date.now() - lastActivity.getTime() <= 2 * 60 * 1000);
}

function getLatestUserActivity() {
    return state.usuarios
        .map(user => valueToDate(user.ultimaAtividadeEm || user.ultimoAcessoEm || user.onlineAtualizadoEm))
        .filter(Boolean)
        .sort((a, b) => b - a)[0] || null;
}

function getPrimaryUser() {
    return state.usuarios.find(user => String(user.email || '').toLowerCase() === state.client.email)
        || state.usuarios.find(user => ['proprietario', 'dono', 'owner'].includes(normalizeRole(user.cargoNormalizado || user.cargo)))
        || state.usuarios.find(user => ['admin', 'administrador', 'gerente', 'gerente geral'].includes(normalizeRole(user.cargoNormalizado || user.cargo)))
        || state.usuarios[0]
        || null;
}

function getFilteredClient() {
    const query = String(document.getElementById('centralAdminBusca')?.value || '').trim().toLowerCase();
    if (!query) return state.client;
    const fields = [state.client.nome, state.client.email, state.client.produto, state.client.externalTenantId];
    return fields.some(value => String(value || '').toLowerCase().includes(query)) ? state.client : null;
}

function syncStatus() {
    return state.lastSyncAt ? { label: 'Sincronizado', className: '' } : { label: 'Pendente', className: 'warning' };
}

function detailUsersHtml() {
    if (!state.usuarios.length) return '<p class="central-admin-empty-inline">Nenhum usuário vinculado à empresa vanmarte.</p>';
    return `<div class="central-admin-user-list">${state.usuarios.map(user => `
        <div class="central-admin-user-item">
            <span class="central-admin-user-icon"><i class="fa-solid fa-user"></i></span>
            <div class="central-admin-user-copy">
                <strong>${escapeHtml(user.nome || user.displayName || user.email || 'Usuário')}</strong>
                <small>${escapeHtml(roleLabel(user))} · ${escapeHtml(user.email || 'E-mail não informado')}</small>
            </div>
            <span class="central-admin-pill ${isOnline(user) ? '' : 'neutral'}">${isOnline(user) ? 'Online' : 'Offline'}</span>
        </div>`).join('')}</div>`;
}

function detailRow() {
    const latest = getLatestUserActivity();
    const online = state.usuarios.filter(isOnline).length;
    const primary = getPrimaryUser();
    const sync = syncStatus();
    const adminCount = state.usuarios.filter(user => ['admin', 'administrador', 'gerente', 'gerente geral'].includes(normalizeRole(user.cargoNormalizado || user.cargo))).length;
    return `
        <tr class="central-admin-details-row">
            <td colspan="10">
                <div class="central-admin-details">
                    <div class="central-admin-details-head">
                        <div><strong>Detalhes operacionais</strong><small>${escapeHtml(state.client.nome)} · fonte ${escapeHtml(state.client.sourceSystem)} · ${escapeHtml(formatDate(latest, 'Sem atividade registrada'))}</small></div>
                        <button type="button" class="central-admin-detail-link" data-central-action="edit" data-client-id="${escapeHtml(state.client.id)}">Abrir dados no Portal</button>
                    </div>
                    <div class="central-admin-details-grid">
                        <section class="central-admin-detail-card">
                            <div class="central-admin-card-heading"><h3><i class="fa-solid fa-arrows-rotate"></i> Sincronização com Portal</h3><span class="central-admin-pill ${sync.className}">${escapeHtml(sync.label)}</span></div>
                            <dl>
                                <dt>Identificador externo</dt><dd>${escapeHtml(state.client.externalTenantId)}</dd>
                                <dt>Sistema de origem</dt><dd>${escapeHtml(state.client.produto)}</dd>
                                <dt>Última sincronização</dt><dd>${escapeHtml(state.lastSyncAt ? formatDate(state.lastSyncAt) : 'Ainda não confirmada')}</dd>
                                <dt>Cobrança e plano</dt><dd>Administrados no Portal Orquestra.cs</dd>
                            </dl>
                        </section>
                        <section class="central-admin-detail-card">
                            <div class="central-admin-card-heading"><h3><i class="fa-solid fa-users"></i> Usuários e acessos</h3><span class="central-admin-detail-count">Administradores: ${adminCount}</span></div>
                            ${primary ? `<div class="central-admin-primary-user"><span class="central-admin-user-icon"><i class="fa-solid fa-crown"></i></span><div><small>Responsável principal</small><strong>${escapeHtml(primary.nome || primary.email || 'Usuário')}</strong><span>${escapeHtml(primary.email || 'E-mail não informado')}</span></div></div>` : ''}
                            ${detailUsersHtml()}
                            <div class="central-admin-access-summary"><span>${state.usuarios.length} usuário(s) vinculado(s)</span><span>${online} online agora</span></div>
                        </section>
                    </div>
                </div>
            </td>
        </tr>`;
}

function renderSummary() {
    const latest = getLatestUserActivity();
    const online = state.usuarios.filter(isOnline).length;
    const sync = syncStatus();
    const values = {
        centralAdminTotalClientes: '1',
        centralAdminTotalEmails: state.usuarios.length.toString(),
        centralAdminTotalUsuarios: online.toString(),
        centralAdminUltimaAtualizacao: sync.label,
        centralAdminStatusResumo: latest ? `Último acesso ${formatDate(latest)}` : 'Aguardando atividade do cliente'
    };
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function renderTable() {
    const tbody = document.getElementById('centralAdminClientesBody');
    if (!tbody) return;
    const client = getFilteredClient();
    if (!client) {
        tbody.innerHTML = '<tr><td colspan="10" class="central-admin-empty">Nenhum cliente encontrado.</td></tr>';
        return;
    }
    const expanded = state.expandedId === client.id;
    const latest = getLatestUserActivity();
    const online = state.usuarios.filter(isOnline).length;
    const sync = syncStatus();
    tbody.innerHTML = `
        <tr class="central-admin-client-row">
            <td><span class="central-admin-client-name">${escapeHtml(client.nome)}</span><span class="central-admin-secondary">${escapeHtml(client.email)}</span><span class="central-admin-secondary">Cliente pagante Orquestra.cs</span></td>
            <td><span class="central-admin-plan">Não informado</span><span class="central-admin-secondary">Configurado no Portal</span></td>
            <td><span class="central-admin-pill">Ativo</span></td>
            <td>Portal<span class="central-admin-secondary">Cadastro comercial</span></td>
            <td>Portal<span class="central-admin-secondary">Vencimento no Portal</span></td>
            <td><span class="central-admin-pill ${sync.className}">${escapeHtml(sync.label)}</span></td>
            <td>${escapeHtml(formatDate(latest))}</td>
            <td><span class="central-admin-pill ${online ? '' : 'neutral'}">${online}/${state.usuarios.length || 0}</span></td>
            <td><span class="central-admin-portal-value">Portal</span><span class="central-admin-secondary">Créditos administrados no Portal</span></td>
            <td><div class="central-admin-row-actions">
                <button type="button" class="central-admin-icon-button" data-central-action="details" data-client-id="${escapeHtml(client.id)}" title="${expanded ? 'Fechar detalhes' : 'Abrir detalhes'}"><i class="fa-solid fa-${expanded ? 'chevron-up' : 'eye'}"></i></button>
                <button type="button" class="central-admin-icon-button edit" data-central-action="edit" data-client-id="${escapeHtml(client.id)}" title="Abrir dados no Portal"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="central-admin-icon-button portal" data-central-action="portal" title="Abrir Central Admin do Portal"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
            </div></td>
        </tr>${expanded ? detailRow() : ''}`;
    tbody.querySelectorAll('[data-central-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.centralAction;
            if (action === 'details') window.centralAdminAlternarDetalhes(button.dataset.clientId);
            if (action === 'edit') window.centralAdminEditar(button.dataset.clientId);
            if (action === 'portal') window.centralAdminAbrirPortal();
        });
    });
}

function setFeedback(message, isError = false) {
    const tbody = document.getElementById('centralAdminClientesBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="${isError ? 'central-admin-error' : 'central-admin-loading'}">${escapeHtml(message)}</td></tr>`;
}

async function loadCentralAdmin() {
    if (!isDeveloper()) {
        setFeedback('Acesso restrito ao desenvolvedor do sistema.', true);
        return;
    }
    setFeedback('Carregando usuários vinculados a Vanmarte...');
    try {
        const usersSnap = await getDocs(collection(db, 'usuarios'));
        state.usuarios = usersSnap.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(user => String(user.empresaId || '').trim().toLowerCase() === DEFAULT_EMPRESA_ID);
        state.loaded = true;
        renderSummary();
        renderTable();
    } catch (error) {
        console.error('Central Admin: erro ao carregar usuários do cliente pagante', error);
        setFeedback(error?.code === 'permission-denied' ? 'Acesso negado pelas regras do Firebase.' : 'Não foi possível carregar os usuários de Vanmarte.', true);
    }
}

function openEdit(id) {
    if (!isDeveloper()) return alert('Acesso restrito ao desenvolvedor do sistema.');
    if (id !== state.client.id) return;
    const values = {
        centralAdminEmpresaNome: state.client.nome,
        centralAdminEmpresaEmail: state.client.email,
        centralAdminEmpresaProduto: state.client.produto,
        centralAdminEmpresaId: state.client.externalTenantId,
        centralAdminEmpresaStatus: 'Ativo no MAD360',
        centralAdminEmpresaPlano: 'Administrado no Portal',
        centralAdminEmpresaCobranca: 'Acessar Central Admin do Portal'
    };
    Object.entries(values).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) field.value = value;
    });
    document.getElementById('centralAdminModal')?.removeAttribute('hidden');
    document.getElementById('centralAdminEmpresaNome')?.focus();
}

function closeModal() {
    document.getElementById('centralAdminModal')?.setAttribute('hidden', 'hidden');
}

function openPortal() {
    if (!isDeveloper()) return alert('Acesso restrito ao desenvolvedor do sistema.');
    window.open(PORTAL_ADMIN_URL, '_blank', 'noopener,noreferrer');
}

async function syncPortal() {
    if (!isDeveloper()) return alert('Acesso restrito ao desenvolvedor do sistema.');
    const user = auth.currentUser;
    if (!user) return alert('Sessão do desenvolvedor não encontrada. Faça login novamente.');
    const button = document.getElementById('centralAdminSincronizar');
    const original = button?.innerHTML || '';
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Sincronizando...';
    }
    try {
        const response = await fetch('/api/portal-bridge', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ idToken: await user.getIdToken(true) })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'O Portal não confirmou a sincronização.');
        state.lastSyncAt = new Date();
        renderSummary();
        renderTable();
        alert(`Sincronização confirmada para Vanmarte. ${result.users || state.usuarios.length} usuário(s) enviados.`);
    } catch (error) {
        console.error('Central Admin: sincronização com Portal falhou', error);
        alert(error.message || 'Não foi possível sincronizar com o Portal agora.');
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = original || '<i class="fa-solid fa-arrows-rotate"></i> Sincronizar Portal';
        }
    }
}

window.centralAdminCarregar = loadCentralAdmin;
window.centralAdminSincronizarPortal = syncPortal;
window.centralAdminAbrirPortal = openPortal;
window.centralAdminAlternarDetalhes = function(id) {
    if (!isDeveloper()) return alert('Acesso restrito ao desenvolvedor do sistema.');
    state.expandedId = state.expandedId === id ? null : id;
    renderTable();
};
window.centralAdminEditar = openEdit;
window.centralAdminFecharModal = closeModal;
window.centralAdminVoltarConfiguracoes = function() {
    closeModal();
    if (typeof window.navegarPara === 'function') window.navegarPara('view-configuracoes');
    else window.App?.showSection('view-configuracoes');
};
window.abrirCentralAdminDev = function() {
    if (!isDeveloper()) return alert('Esta área é exclusiva do desenvolvedor do sistema.');
    if (typeof window.navegarPara === 'function') window.navegarPara('view-central-admin');
    else window.App?.showSection('view-central-admin');
    loadCentralAdmin();
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('centralAdminBusca')?.addEventListener('input', renderTable);
});

window.isOrquestraDeveloper = isDeveloper;
