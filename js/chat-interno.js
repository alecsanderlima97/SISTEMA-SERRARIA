import {
    auth, db, collection, addDoc, doc, getDoc, setDoc,
    query, where, limit, onSnapshot, onAuthStateChanged
} from './firebase-init.js';

const CHAT_PROFILE_COLLECTION = 'chat_perfis';
const CHAT_MESSAGE_COLLECTION = 'chat_mensagens';
const DEFAULT_EMPRESA_ID = 'vanmarte';

const state = {
    user: null,
    profile: null,
    collaborators: [],
    messages: [],
    activeCollaboratorId: null,
    search: '',
    unsubProfiles: null,
    unsubMessages: null
};

function normalizeText(value) {
    return String(value || '').trim();
}

function initials(name) {
    const parts = normalizeText(name).split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : parts[0]?.slice(0, 2) || 'O').toUpperCase();
}

function formatTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function seenKey(peerId) {
    return `orquestra_chat_seen_${state.user?.uid || 'anon'}_${peerId}`;
}

function lastMessageFor(peerId) {
    return state.messages.filter(item => item.participantes?.includes(peerId)).at(-1) || null;
}

function unreadFor(peerId) {
    const seenAt = Number(localStorage.getItem(seenKey(peerId)) || 0);
    return state.messages.filter(item => item.remetenteId === peerId && new Date(item.criadoEm || 0).getTime() > seenAt).length;
}

function totalUnread() {
    return state.collaborators.reduce((total, item) => total + unreadFor(item.uid), 0);
}

function updateUnreadBadges() {
    const total = totalUnread();
    ['chatUnreadBadge', 'chatFloatUnreadBadge'].forEach(id => {
        const badge = document.getElementById(id);
        if (!badge) return;
        badge.textContent = total > 99 ? '99+' : String(total);
        badge.hidden = total === 0;
    });
}

function setChatState(message, icon = 'fa-comments') {
    const list = document.getElementById('chatCollaboratorsList');
    if (!list) return;
    list.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'chat-state';
    const iconElement = document.createElement('i');
    iconElement.className = `fa-solid ${icon}`;
    const text = document.createElement('span');
    text.textContent = message;
    empty.append(iconElement, text);
    list.appendChild(empty);
}

function renderCollaborators() {
    const list = document.getElementById('chatCollaboratorsList');
    const summary = document.getElementById('chatCollaboratorsSummary');
    if (!list) return;

    const term = state.search.toLocaleLowerCase('pt-BR');
    const filtered = state.collaborators.filter(item => `${item.nome} ${item.cargo}`.toLocaleLowerCase('pt-BR').includes(term));
    if (summary) summary.textContent = `${state.collaborators.length} pessoa(s) disponível(is)`;
    list.replaceChildren();

    if (!filtered.length) {
        setChatState(state.search ? 'Nenhum colaborador encontrado.' : 'Os colaboradores aparecerão após acessarem o sistema.', 'fa-user-group');
        updateUnreadBadges();
        return;
    }

    filtered.forEach(collaborator => {
        const last = lastMessageFor(collaborator.uid);
        const unread = unreadFor(collaborator.uid);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `chat-collaborator${state.activeCollaboratorId === collaborator.uid ? ' active' : ''}`;
        button.dataset.collaboratorId = collaborator.uid;

        const avatar = document.createElement('span');
        avatar.className = 'chat-avatar';
        avatar.textContent = initials(collaborator.nome);

        const copy = document.createElement('span');
        copy.className = 'chat-collaborator-copy';
        const name = document.createElement('strong');
        name.textContent = collaborator.nome || 'Colaborador';
        const preview = document.createElement('small');
        preview.textContent = last ? normalizeText(last.texto).slice(0, 54) : (collaborator.cargo || 'Equipe Vanmarte');
        copy.append(name, preview);

        const meta = document.createElement('span');
        meta.className = 'chat-collaborator-meta';
        const time = document.createElement('small');
        time.textContent = last ? formatTime(last.criadoEm) : '';
        meta.appendChild(time);
        if (unread) {
            const badge = document.createElement('span');
            badge.className = 'chat-unread-count';
            badge.textContent = unread > 99 ? '99+' : String(unread);
            meta.appendChild(badge);
        }
        button.append(avatar, copy, meta);
        list.appendChild(button);
    });
    updateUnreadBadges();
}

function renderConversation() {
    const container = document.getElementById('chatMessages');
    if (!container || !state.user) return;
    const collaborator = state.collaborators.find(item => item.uid === state.activeCollaboratorId);
    const name = document.getElementById('chatConversationName');
    const role = document.getElementById('chatConversationRole');
    const avatar = document.getElementById('chatConversationAvatar');
    const input = document.getElementById('chatInput');
    const submit = document.querySelector('#chatForm button[type="submit"]');

    if (!collaborator) {
        if (name) name.textContent = 'Selecione um colaborador';
        if (role) role.textContent = 'Conversa interna e privada';
        if (avatar) avatar.textContent = 'O';
        if (input) input.disabled = true;
        if (submit) submit.disabled = true;
        container.innerHTML = '<div class="chat-empty-state"><i class="fa-regular fa-comments"></i><strong>Comece uma conversa</strong><span>Escolha uma pessoa da equipe para trocar mensagens.</span></div>';
        return;
    }

    if (name) name.textContent = collaborator.nome || 'Colaborador';
    if (role) role.textContent = collaborator.cargo || 'Equipe Vanmarte';
    if (avatar) avatar.textContent = initials(collaborator.nome);
    if (input) input.disabled = false;
    if (submit) submit.disabled = false;

    const messages = state.messages.filter(item => item.participantes?.includes(collaborator.uid));
    container.replaceChildren();
    if (!messages.length) {
        container.innerHTML = '<div class="chat-empty-state"><i class="fa-regular fa-message"></i><strong>Nenhuma mensagem ainda</strong><span>Envie a primeira mensagem desta conversa.</span></div>';
    } else {
        let lastDay = '';
        messages.forEach(message => {
            const day = formatDay(message.criadoEm);
            if (day && day !== lastDay) {
                const divider = document.createElement('div');
                divider.className = 'chat-day-divider';
                divider.textContent = day;
                container.appendChild(divider);
                lastDay = day;
            }
            const bubble = document.createElement('div');
            bubble.className = `chat-message${message.remetenteId === state.user.uid ? ' mine' : ''}`;
            const text = document.createElement('span');
            text.textContent = message.texto || '';
            const time = document.createElement('small');
            time.textContent = formatTime(message.criadoEm);
            bubble.append(text, time);
            container.appendChild(bubble);
        });
    }
    localStorage.setItem(seenKey(collaborator.uid), String(Date.now()));
    container.scrollTop = container.scrollHeight;
    updateUnreadBadges();
}

function selectCollaborator(uid) {
    state.activeCollaboratorId = uid;
    document.getElementById('communicationMessagesPanel')?.classList.add('conversation-open');
    renderCollaborators();
    renderConversation();
    setTimeout(() => document.getElementById('chatInput')?.focus(), 60);
}

async function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chatInput');
    const text = normalizeText(input?.value);
    if (!text || !state.user || !state.activeCollaboratorId) return;
    const collaborator = state.collaborators.find(item => item.uid === state.activeCollaboratorId);
    if (!collaborator) return;
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
        await addDoc(collection(db, CHAT_MESSAGE_COLLECTION), {
            texto: text,
            remetenteId: state.user.uid,
            destinatarioId: collaborator.uid,
            participantes: [state.user.uid, collaborator.uid].sort(),
            empresaId: state.profile?.empresaId || DEFAULT_EMPRESA_ID,
            criadoEm: new Date().toISOString()
        });
        input.value = '';
    } catch (error) {
        console.error('Não foi possível enviar a mensagem:', error);
        alert('Não foi possível enviar a mensagem agora. Verifique sua conexão e tente novamente.');
    } finally {
        if (submit) submit.disabled = false;
        input?.focus();
    }
}

function subscribeToMessages() {
    state.unsubMessages?.();
    const messagesQuery = query(collection(db, CHAT_MESSAGE_COLLECTION), where('participantes', 'array-contains', state.user.uid), limit(500));
    state.unsubMessages = onSnapshot(messagesQuery, snapshot => {
        state.messages = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => new Date(a.criadoEm || 0) - new Date(b.criadoEm || 0));
        renderCollaborators();
        renderConversation();
    }, error => {
        console.error('Não foi possível carregar as mensagens:', error);
        setChatState('Mensagens indisponíveis até a liberação do acesso.', 'fa-lock');
    });
}

function subscribeToProfiles() {
    state.unsubProfiles?.();
    const profilesQuery = query(collection(db, CHAT_PROFILE_COLLECTION), where('empresaId', '==', state.profile.empresaId), limit(100));
    state.unsubProfiles = onSnapshot(profilesQuery, snapshot => {
        state.collaborators = snapshot.docs.map(item => ({ uid: item.id, ...item.data() }))
            .filter(item => item.uid !== state.user.uid && normalizeText(item.cargo).toUpperCase() !== 'PENDENTE')
            .sort((a, b) => normalizeText(a.nome).localeCompare(normalizeText(b.nome), 'pt-BR'));
        if (state.activeCollaboratorId && !state.collaborators.some(item => item.uid === state.activeCollaboratorId)) state.activeCollaboratorId = null;
        renderCollaborators();
        renderConversation();
    }, error => {
        console.error('Não foi possível carregar os colaboradores:', error);
        setChatState('Lista da equipe indisponível até a liberação do acesso.', 'fa-lock');
    });
}

async function initializeForUser(user) {
    const userSnapshot = await getDoc(doc(db, 'usuarios', user.uid));
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const cargo = typeof userData.cargo === 'string' ? userData.cargo : 'Colaborador';
    if (normalizeText(cargo).toUpperCase() === 'PENDENTE') {
        setChatState('O chat será liberado após a aprovação do seu acesso.', 'fa-lock');
        return;
    }
    state.profile = {
        uid: user.uid,
        nome: typeof userData.nome === 'string' ? userData.nome : (user.displayName || user.email?.split('@')[0] || 'Colaborador'),
        cargo,
        empresaId: typeof userData.empresaId === 'string' ? userData.empresaId : (window.AppUserContext?.empresaId || DEFAULT_EMPRESA_ID)
    };
    await setDoc(doc(db, CHAT_PROFILE_COLLECTION, user.uid), {
        nome: state.profile.nome,
        cargo: state.profile.cargo,
        empresaId: state.profile.empresaId,
        atualizadoEm: new Date().toISOString()
    }, { merge: true });
    subscribeToProfiles();
    subscribeToMessages();
}

window.switchCommunicationTab = function(tab) {
    const selected = tab === 'ai' ? 'ai' : 'messages';
    const messagesPanel = document.getElementById('communicationMessagesPanel');
    const aiPanel = document.getElementById('communicationAIPanel');
    const messagesTab = document.getElementById('communicationTabMessages');
    const aiTab = document.getElementById('communicationTabAI');
    const isAI = selected === 'ai';
    if (messagesPanel) {
        messagesPanel.hidden = isAI;
        messagesPanel.classList.toggle('active', !isAI);
    }
    if (aiPanel) {
        aiPanel.hidden = !isAI;
        aiPanel.classList.toggle('active', isAI);
    }
    messagesTab?.classList.toggle('active', !isAI);
    aiTab?.classList.toggle('active', isAI);
    messagesTab?.setAttribute('aria-selected', String(!isAI));
    aiTab?.setAttribute('aria-selected', String(isAI));
    setTimeout(() => (isAI ? document.getElementById('assistantInput') : document.getElementById('chatInput'))?.focus(), 60);
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('chatCollaboratorSearch')?.addEventListener('input', event => {
        state.search = event.target.value || '';
        renderCollaborators();
    });
    document.getElementById('chatCollaboratorsList')?.addEventListener('click', event => {
        const button = event.target.closest('[data-collaborator-id]');
        if (button) selectCollaborator(button.dataset.collaboratorId);
    });
    document.getElementById('chatForm')?.addEventListener('submit', sendMessage);
    document.getElementById('chatMobileBack')?.addEventListener('click', () => document.getElementById('communicationMessagesPanel')?.classList.remove('conversation-open'));

    onAuthStateChanged(auth, user => {
        state.unsubProfiles?.();
        state.unsubMessages?.();
        state.user = user;
        state.profile = null;
        state.collaborators = [];
        state.messages = [];
        state.activeCollaboratorId = null;
        if (!user) {
            setChatState('Entre no sistema para acessar as mensagens.', 'fa-lock');
            renderConversation();
            return;
        }
        initializeForUser(user).catch(error => {
            console.error('Falha ao iniciar o chat interno:', error);
            setChatState('Não foi possível iniciar o chat. Tente atualizar o sistema.', 'fa-triangle-exclamation');
        });
    });
});
