import { auth, db, collection, getDocs } from './firebase-init.js';

const DEVELOPER_EMAILS = new Set(['limaalecsander@gmail.com']);
const state = {
    clientes: [],
    usuarios: [],
    expandedId: null,
    editingId: null,
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

function formatDate(value) {
    const date = valueToDate(value);
    return date ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem registro';
}

function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 'R$ 0,00';
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseNumber(value) {
    const normalized = String(value ?? '').replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
}

function clientStatus(client) {
    const status = String(client.status || client.situacao || 'ativo').trim().toLowerCase();
    if (['inativo', 'cancelado', 'bloqueado'].includes(status)) return { label: 'Inativo', className: 'warning' };
    if (['pausado', 'pendente'].includes(status)) return { label: 'Pausado', className: 'warning' };
    return { label: 'Ativo', className: '' };
}

function baseNFLabel(value) {
    const base = String(value || 'INTEIRA').toUpperCase();
    if (base === 'MEIA' || base === '0.5') return 'Meia nota';
    if (base === '1/3') return '1/3 da nota';
    if (base === '1/4') return '1/4 da nota';
    return 'Nota inteira';
}

function getFilteredClients() {
    const query = String(document.getElementById('centralAdminBusca')?.value || '').trim().toLowerCase();
    return [...state.clientes]
        .filter(client => {
            if (!query) return true;
            return [client.nome, client.cnpj, client.cidade, client.contato, client.email]
                .some(value => String(value || '').toLowerCase().includes(query));
        })
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

function detailRow(client) {
    const matchingUsers = state.usuarios.filter(user => client.empresaId && user.empresaId === client.empresaId);
    const usersLabel = matchingUsers.length ? `${matchingUsers.length} usuario(s) vinculado(s)` : 'Nenhum vinculo direto informado';
    return `
        <tr class="central-admin-details-row">
            <td colspan="7">
                <div class="central-admin-details">
                    <div class="central-admin-details-head">
                        <div><strong>Detalhes operacionais</strong><small>${escapeHtml(client.nome || 'Cliente')} · atualizacao ${escapeHtml(formatDate(client.atualizadoEm || client.criadoEm))}</small></div>
                        <span class="central-admin-pill neutral">Abrir detalhes</span>
                    </div>
                    <div class="central-admin-details-grid">
                        <section class="central-admin-detail-card">
                            <h3><i class="fa-solid fa-file-invoice-dollar"></i> Regras comerciais</h3>
                            <dl>
                                <dt>Base da nota</dt><dd>${escapeHtml(baseNFLabel(client.baseNF))}</dd>
                                <dt>Porcentagem NF</dt><dd>${escapeHtml(String(client.porcentagemNF ?? 0).replace('.', ','))}%</dd>
                                <dt>Frete por m3</dt><dd>${escapeHtml(formatMoney(client.valorFrete))}</dd>
                                <dt>Pagamento</dt><dd>${escapeHtml(client.formaPagamento || 'Nao informado')}</dd>
                            </dl>
                        </section>
                        <section class="central-admin-detail-card">
                            <h3><i class="fa-solid fa-address-card"></i> Cadastro e acesso</h3>
                            <dl>
                                <dt>CNPJ / CPF</dt><dd>${escapeHtml(client.cnpj || 'Nao informado')}</dd>
                                <dt>Contato</dt><dd>${escapeHtml(client.contato || 'Nao informado')}</dd>
                                <dt>Cidade</dt><dd>${escapeHtml(client.cidade || 'Nao informado')}</dd>
                                <dt>Usuarios</dt><dd>${escapeHtml(usersLabel)}</dd>
                            </dl>
                        </section>
                    </div>
                </div>
            </td>
        </tr>`;
}

function renderSummary() {
    const total = state.clientes.length;
    const emails = state.clientes.filter(client => String(client.email || '').trim()).length;
    const totalUsers = state.usuarios.length;
    const latest = state.clientes.map(client => valueToDate(client.atualizadoEm || client.criadoEm)).filter(Boolean).sort((a, b) => b - a)[0];
    const totalEl = document.getElementById('centralAdminTotalClientes');
    const emailsEl = document.getElementById('centralAdminTotalEmails');
    const usersEl = document.getElementById('centralAdminTotalUsuarios');
    const latestEl = document.getElementById('centralAdminUltimaAtualizacao');
    const statusEl = document.getElementById('centralAdminStatusResumo');
    if (totalEl) totalEl.textContent = String(total);
    if (emailsEl) emailsEl.textContent = String(emails);
    if (usersEl) usersEl.textContent = String(totalUsers);
    if (latestEl) latestEl.textContent = latest ? latest.toLocaleDateString('pt-BR') : '--';
    if (statusEl) statusEl.textContent = `Atualizado em ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function renderTable() {
    const tbody = document.getElementById('centralAdminClientesBody');
    if (!tbody) return;
    const clients = getFilteredClients();
    if (!clients.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="central-admin-empty">Nenhum cliente encontrado.</td></tr>';
        return;
    }
    tbody.innerHTML = clients.map(client => {
        const id = escapeHtml(client.id);
        const status = clientStatus(client);
        const expanded = state.expandedId === client.id;
        return `
            <tr class="central-admin-client-row">
                <td><span class="central-admin-client-name">${escapeHtml(client.nome || 'Cliente sem nome')}</span><span class="central-admin-secondary">${escapeHtml(client.email || client.cnpj || 'Cadastro sem e-mail')}</span></td>
                <td>${escapeHtml(baseNFLabel(client.baseNF))}<span class="central-admin-secondary">NF: ${escapeHtml(String(client.porcentagemNF ?? 0).replace('.', ','))}%</span></td>
                <td><span class="central-admin-pill ${status.className}">${escapeHtml(status.label)}</span></td>
                <td>${escapeHtml(formatDate(client.criadoEm))}</td>
                <td>${escapeHtml(formatDate(client.atualizadoEm || client.criadoEm))}</td>
                <td>${escapeHtml(client.contato || client.cidade || 'Nao informado')}</td>
                <td><div class="central-admin-row-actions">
                    <button type="button" class="central-admin-icon-button" data-central-action="details" data-client-id="${id}" title="${expanded ? 'Fechar detalhes' : 'Abrir detalhes'}"><i class="fa-solid fa-${expanded ? 'chevron-up' : 'eye'}"></i></button>
                    <button type="button" class="central-admin-icon-button edit" data-central-action="edit" data-client-id="${id}" title="Editar cliente"><i class="fa-solid fa-pen"></i></button>
                </div></td>
            </tr>${expanded ? detailRow(client) : ''}`;
    }).join('');
    tbody.querySelectorAll('[data-central-action]').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.clientId;
            if (button.dataset.centralAction === 'details') window.centralAdminAlternarDetalhes(id);
            if (button.dataset.centralAction === 'edit') window.centralAdminEditar(id);
        });
    });
}

function setFeedback(message, isError = false) {
    const tbody = document.getElementById('centralAdminClientesBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="${isError ? 'central-admin-error' : 'central-admin-loading'}">${escapeHtml(message)}</td></tr>`;
}

async function loadCentralAdmin() {
    if (!isDeveloper()) {
        setFeedback('Acesso restrito ao desenvolvedor do sistema.', true);
        return;
    }
    setFeedback('Carregando dados administrativos...');
    try {
        const [clientsSnap, usersSnap] = await Promise.all([
            getDocs(collection(db, 'clientes')),
            getDocs(collection(db, 'usuarios'))
        ]);
        state.clientes = clientsSnap.docs.map(item => ({ id: item.id, ...item.data() }));
        state.usuarios = usersSnap.docs.map(item => ({ id: item.id, ...item.data() }));
        state.loaded = true;
        renderSummary();
        renderTable();
    } catch (error) {
        console.error('Central Admin: erro ao carregar dados', error);
        setFeedback(error?.code === 'permission-denied' ? 'Acesso negado pelas regras do Firebase.' : 'Nao foi possivel carregar os dados administrativos.', true);
    }
}

function getClientById(id) {
    return state.clientes.find(client => client.id === id);
}

function openEdit(id) {
    if (!isDeveloper()) return alert('Acesso restrito ao desenvolvedor do sistema.');
    const client = getClientById(id);
    if (!client) return;
    state.editingId = id;
    const values = {
        centralAdminNome: client.nome || '',
        centralAdminCnpj: client.cnpj || '',
        centralAdminContato: client.contato || '',
        centralAdminEmail: client.email || '',
        centralAdminCidade: client.cidade || '',
        centralAdminStatus: client.status || client.situacao || 'ativo',
        centralAdminBaseNF: client.baseNF || 'INTEIRA',
        centralAdminPorcentagemNF: client.porcentagemNF ?? '',
        centralAdminFrete: window.formatCurrencyValue ? window.formatCurrencyValue(client.valorFrete) : client.valorFrete || '',
        centralAdminPagamento: client.formaPagamento || '',
        centralAdminObservacao: client.observacao || ''
    };
    Object.entries(values).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) field.value = value;
    });
    document.getElementById('centralAdminModal')?.removeAttribute('hidden');
    document.getElementById('centralAdminNome')?.focus();
}

function closeModal() {
    state.editingId = null;
    document.getElementById('centralAdminModal')?.setAttribute('hidden', 'hidden');
}

async function saveClient(event) {
    event.preventDefault();
    if (!isDeveloper() || !state.editingId) return;
    const button = document.getElementById('centralAdminSalvarCliente');
    const original = button?.innerHTML || '';
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Salvando...';
    }
    const payload = {
        nome: document.getElementById('centralAdminNome')?.value.trim().toUpperCase() || '',
        cnpj: document.getElementById('centralAdminCnpj')?.value.trim() || '',
        contato: document.getElementById('centralAdminContato')?.value.trim() || '',
        email: document.getElementById('centralAdminEmail')?.value.trim() || '',
        cidade: document.getElementById('centralAdminCidade')?.value.trim() || '',
        status: document.getElementById('centralAdminStatus')?.value || 'ativo',
        baseNF: document.getElementById('centralAdminBaseNF')?.value || 'INTEIRA',
        porcentagemNF: parseNumber(document.getElementById('centralAdminPorcentagemNF')?.value),
        valorFrete: parseNumber(document.getElementById('centralAdminFrete')?.value),
        formaPagamento: document.getElementById('centralAdminPagamento')?.value.trim() || '',
        observacao: document.getElementById('centralAdminObservacao')?.value.trim() || '',
        atualizadoEm: new Date().toISOString()
    };
    try {
      if (typeof window.FS?.updateDoc !== 'function') {
        throw new Error('Serviço de atualização do sistema indisponível.');
      }

      await window.FS.updateDoc('clientes', state.editingId, payload);
        const current = getClientById(state.editingId);
        if (current) Object.assign(current, payload);
        closeModal();
        renderSummary();
        renderTable();
        alert('Cliente atualizado com sucesso.');
    } catch (error) {
        console.error('Central Admin: erro ao atualizar cliente', error);
        alert(error?.code === 'permission-denied' ? 'O Firebase recusou esta alteracao.' : 'Nao foi possivel atualizar o cliente.');
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = original || '<i class="fa-solid fa-floppy-disk"></i> Salvar alteracoes';
        }
    }
}

window.centralAdminCarregar = loadCentralAdmin;
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
    if (!isDeveloper()) return alert('Esta area e exclusiva do desenvolvedor do sistema.');
    if (typeof window.navegarPara === 'function') window.navegarPara('view-central-admin');
    else window.App?.showSection('view-central-admin');
    loadCentralAdmin();
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('centralAdminBusca')?.addEventListener('input', renderTable);
    document.getElementById('centralAdminClienteForm')?.addEventListener('submit', saveClient);
});

window.isOrquestraDeveloper = isDeveloper;
