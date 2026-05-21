import { 
    auth, signOut, onAuthStateChanged, db, collection, getDocs,
    doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot
} from './firebase-init.js';


console.log("Core: Inicializando sistema de segurança e navegação...");

const ROLE_PERMISSIONS = {
    'gerente': {
        allowedSections: ['view-dashboard', 'view-romaneio-v2', 'view-historico', 'view-clientes', 'view-transportes', 'view-entrada', 'view-cavaco', 'view-produtos', 'view-estoque', 'view-frotas', 'view-rh', 'view-calculadoras', 'view-agenda', 'view-configuracoes'],
        readOnly: false
    },
    'patrao': {
        allowedSections: ['view-dashboard', 'view-historico', 'view-configuracoes'],
        readOnly: true
    },
    'mecanico': {
        allowedSections: ['view-frotas', 'view-configuracoes'],
        readOnly: false
    },
    'muqueiro': {
        allowedSections: ['view-entrada', 'view-configuracoes'],
        readOnly: false
    },
    'estoquista': {
        allowedSections: ['view-estoque', 'view-configuracoes'],
        readOnly: false
    },
    'PENDENTE': {
        allowedSections: ['view-pendente'],
        readOnly: true
    }
};

const ROLE_NAMES = {
    'gerente': 'Gerente Geral',
    'patrao': 'Patrão',
    'mecanico': 'Mecânico',
    'muqueiro': 'Muqueiro',
    'estoquista': 'Estoquista',
    'PENDENTE': 'Acesso Pendente'
};

const SECTION_PERMISSIONS = [
    { id: 'view-dashboard', label: 'Inicio' },
    { id: 'view-romaneio-v2', label: 'Gerar Romaneio' },
    { id: 'view-historico', label: 'Historico de Cargas' },
    { id: 'view-clientes', label: 'Clientes' },
    { id: 'view-transportes', label: 'Transportadoras' },
    { id: 'view-entrada', label: 'Entrada de Toras' },
    { id: 'view-cavaco', label: 'Venda Cavaco/Po' },
    { id: 'view-produtos', label: 'Madeiras / Estilos' },
    { id: 'view-estoque', label: 'Controle de Estoque' },
    { id: 'view-frotas', label: 'Controle de Frota' },
    { id: 'view-rh', label: 'RH Funcionarios' },
    { id: 'view-calculadoras', label: 'Calculadoras' },
    { id: 'view-agenda', label: 'Agenda / Calendario' },
    { id: 'view-configuracoes', label: 'Configuracoes' }
];

const SUBSECTION_PERMISSIONS = {
    'view-entrada': {
        label: 'Entrada de Toras',
        items: [
            { id: 'registro', label: 'Registrar tora' },
            { id: 'lista', label: 'Ultimas entradas / historico' },
            { id: 'empreiteiros', label: 'Empreiteiros' }
        ]
    }
};

function normalizeRole(role) {
    const value = (role || '').toString().trim();
    if (!value) return 'PENDENTE';
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized === 'pendente') return 'PENDENTE';
    return normalized;
}

function getDefaultRolePermissions(role) {
    const key = normalizeRole(role);
    return ROLE_PERMISSIONS[key] || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.PENDENTE;
}

function getEffectivePermissions(userData = {}) {
    const custom = userData.permissoes || userData.permissions;
    if (custom && Array.isArray(custom.allowedSections)) {
        return {
            allowedSections: custom.allowedSections,
            allowedSubsections: custom.allowedSubsections || {},
            readOnly: !!custom.readOnly
        };
    }
    const defaults = getDefaultRolePermissions(userData.cargo);
    return {
        allowedSections: defaults.allowedSections || [],
        allowedSubsections: {},
        readOnly: !!defaults.readOnly
    };
}

function getRoleDisplayName(role) {
    const key = normalizeRole(role);
    return ROLE_NAMES[key] || ROLE_NAMES[role] || role || 'Acesso Pendente';
}

function permissionOptionHtml(item, checked = false) {
    return `
        <label style="display:flex; align-items:center; gap:8px; padding:9px 10px; border:1px solid rgba(255,255,255,0.06); border-radius:8px; background:rgba(255,255,255,0.025); cursor:pointer;">
            <input type="checkbox" value="${item.id}" ${checked ? 'checked' : ''} style="width:16px; height:16px;">
            <span style="font-size: 0.9rem; color: #f8fafc;">${item.label}</span>
        </label>
    `;
}


// Objeto de compatibilidade para evitar que scripts antigos travem o sistema
window.DB = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

// Dados Cadastrais Reais da Serraria Emitente (Vanmarte) - Carregamento dinâmico e fallback robusto
window.dadosSerrariaEmitente = {
    nome: "COMERCIO DE MADEIRAS VANMART LTDA",
    nomeFantasia: "SERRARIA VANMARTE",
    cnpj: "44.215.194/0001-18",
    ie: "ISENTO",
    contato: "15 996297072",
    email: "escritoriovanmarte@hotmai.com",
    cep: "18430-000",
    logradouro: "ESTRADA DO TAQUARI",
    numero: "267",
    cidade: "Ribeirão Branco / SP"
};

// Carrega os dados reais do Firestore caso o cadastro do cliente seja alterado
export async function carregarDadosSerrariaEmitente() {
    try {
        console.log("Core: Buscando dados atualizados da emitente (Vanmarte) no Firestore...");
        const querySnapshot = await getDocs(collection(db, 'clientes'));
        let encontrado = false;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const nome = (data.nome || "").toUpperCase();
            const obs = (data.observacao || "").toUpperCase();
            const email = (data.email || "").toUpperCase();
            
            if (nome.includes("VANMART") || obs.includes("VANMART") || email.includes("VANMARTE")) {
                window.dadosSerrariaEmitente = {
                    nome: data.nome || "COMERCIO DE MADEIRAS VANMART LTDA",
                    nomeFantasia: data.observacao || "SERRARIA VANMARTE",
                    cnpj: data.cnpj || "44.215.194/0001-18",
                    ie: data.ie || "ISENTO",
                    contato: data.contato || "15 996297072",
                    email: data.email || "escritoriovanmarte@hotmai.com",
                    cep: data.cep || "18430-000",
                    logradouro: data.logradouro || "ESTRADA DO TAQUARI",
                    numero: data.numero || "267",
                    cidade: data.cidade || "Ribeirão Branco / SP"
                };
                encontrado = true;
            }
        });
        if (encontrado) {
            console.log("Core: Dados cadastrais da Vanmarte atualizados com sucesso do Firestore:", window.dadosSerrariaEmitente);
            document.dispatchEvent(new Event('emitenteUpdated'));
        }
    } catch (error) {
        console.error("Core: Erro ao carregar dados dinâmicos da emitente, utilizando fallback robusto:", error);
    }
}

// Ouvir atualizações no cadastro de clientes para manter os dados sincronizados
document.addEventListener('clientesUpdated', carregarDadosSerrariaEmitente);

window.parseCurrencyValue = function(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    let cleanVal = val.toString().replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(cleanVal) || 0;
};

window.formatCurrencyValue = function(val) {
    if (val === null || val === undefined || val === '') return '';
    let num = parseFloat(val);
    if (isNaN(num)) return '';
    
    let isNegative = num < 0;
    let value = Math.abs(num).toFixed(2).replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    return "R$ " + (isNegative ? "-" : "") + value;
};

window.formatCurrencyInput = function(e) {
    let value = e.target.value;
    if (!value) {
        e.target.value = "";
        return;
    }
    
    // Suporte a valores negativos
    let isNegative = value.includes('-');
    
    value = value.replace(/\D/g, "");
    if (!value) {
        e.target.value = isNegative ? "R$ -" : "";
        return;
    }
    
    value = (parseInt(value, 10) / 100).toFixed(2) + "";
    value = value.replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = "R$ " + (isNegative ? "-" : "") + value;
};

window.forceUppercaseInput = function(e) {
    let start = e.target.selectionStart;
    let end = e.target.selectionEnd;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(start, end);
};

window.changeTheme = function(themeName) {
    const root = document.documentElement;
    if (themeName === 'premium') {
        root.style.setProperty('--primary-color', '#4a5d23');
        root.style.setProperty('--primary-hover', '#3a4a1c');
        root.style.setProperty('--accent-color', '#6b8e23');
        root.style.setProperty('--bg-color', '#1a1f16');
        root.style.setProperty('--panel-bg', 'rgba(20, 25, 17, 0.88)');
        root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--text-color', '#e6edf3');
        root.style.setProperty('--text-muted', '#a1a1a1');
    } else if (themeName === 'dark') {
        root.style.setProperty('--primary-color', '#3b82f6');
        root.style.setProperty('--primary-hover', '#2563eb');
        root.style.setProperty('--accent-color', '#60a5fa');
        root.style.setProperty('--bg-color', '#0f172a');
        root.style.setProperty('--panel-bg', 'rgba(15, 23, 42, 0.88)');
        root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--text-color', '#f8fafc');
        root.style.setProperty('--text-muted', '#94a3b8');
    } else if (themeName === 'light') {
        root.style.setProperty('--primary-color', '#2563eb');
        root.style.setProperty('--primary-hover', '#1d4ed8');
        root.style.setProperty('--accent-color', '#3b82f6');
        root.style.setProperty('--bg-color', '#f1f5f9');
        root.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.95)');
        root.style.setProperty('--panel-border', 'rgba(0, 0, 0, 0.08)');
        root.style.setProperty('--text-color', '#1e293b');
        root.style.setProperty('--text-muted', '#64748b');
    } else {
        root.style.setProperty('--primary-color', '#e67e22');
        root.style.setProperty('--primary-hover', '#d35400');
        root.style.setProperty('--accent-color', '#f1c40f');
        root.style.setProperty('--bg-color', '#0f0a09');
        root.style.setProperty('--panel-bg', 'rgba(18, 12, 10, 0.88)');
        root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--text-color', '#e6edf3');
        root.style.setProperty('--text-muted', '#a1a1a1');
    }
    localStorage.setItem('orquestrasis_theme', themeName);
};

window.exportarBackup = async function(btnElement) {
    const textoOriginal = btnElement ? btnElement.innerHTML : null;
    if (btnElement) {
        btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Backup...';
        btnElement.disabled = true;
    }

    try {
        const backupData = {
            produtos: [],
            clientes: [],
            romaneios: [],
            entradas: [],
            empreiteiros: [],
            dataExportacao: new Date().toISOString()
        };

        // 1. Puxar Produtos
        const prodSnap = await getDocs(collection(db, 'produtos'));
        prodSnap.forEach(doc => backupData.produtos.push({ id: doc.id, ...doc.data() }));

        // 2. Puxar Clientes
        const cliSnap = await getDocs(collection(db, 'clientes'));
        cliSnap.forEach(doc => backupData.clientes.push({ id: doc.id, ...doc.data() }));

        // 3. Puxar Romaneios
        const romSnap = await getDocs(collection(db, 'romaneios'));
        romSnap.forEach(doc => backupData.romaneios.push({ id: doc.id, ...doc.data() }));

        // 4. Puxar Entradas de Tora
        const entSnap = await getDocs(collection(db, 'entradas'));
        entSnap.forEach(doc => backupData.entradas.push({ id: doc.id, ...doc.data() }));

        // 5. Puxar Empreiteiros
        const empSnap = await getDocs(collection(db, 'empreiteiros'));
        empSnap.forEach(doc => backupData.empreiteiros.push({ id: doc.id, ...doc.data() }));

        // Gerar arquivo JSON e fazer o download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `backup_serraria_${new Date().getTime()}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        if (!btnElement) alert('Backup concluído e baixado com sucesso!');

    } catch (error) {
        console.error("Erro ao gerar backup:", error);
        alert('Erro ao gerar o backup. Verifique sua conexão com a internet e tente novamente.');
    } finally {
        if (btnElement) {
            btnElement.innerHTML = textoOriginal;
            btnElement.disabled = false;
        }
    }
};

const App = {
    user: null,
    userRole: 'PENDENTE',
    userPermissions: { allowedSections: ['view-pendente'], allowedSubsections: {}, readOnly: true },
    usuariosConfigById: {},
    userUnsubscribe: null, // Guarda a função de desinscrição do onSnapshot
    usuariosUnsubscribe: null, // Guarda a função de desinscrição da lista de usuários

    init() {
        const savedTheme = localStorage.getItem('orquestrasis_theme') || 'original';
        window.changeTheme(savedTheme);
        this.checkAuth();
        this.setupNavigation();
        this.setupSidebarCollapse();
        this.loadProfilePic();
        
        const btnSalvar = document.getElementById('btnSalvarUsuario');
        if (btnSalvar) {
            btnSalvar.addEventListener('click', (e) => {
                e.preventDefault();
                window.salvarUsuario();
            });
        }
        this.renderPermissionEditor();
    },

    getCurrentPermissions() {
        return this.userPermissions || getEffectivePermissions({ cargo: this.userRole });
    },

    canAccessSection(sectionId) {
        const permissions = this.getCurrentPermissions();
        return (permissions.allowedSections || []).includes(sectionId);
    },

    canAccessSubsection(sectionId, subId) {
        const permissions = this.getCurrentPermissions();
        const allowed = permissions.allowedSubsections || {};
        if (!SUBSECTION_PERMISSIONS[sectionId]) return true;
        if (!Object.prototype.hasOwnProperty.call(allowed, sectionId)) return true;
        const list = allowed[sectionId];
        return Array.isArray(list) && list.includes(subId);
    },

    applyPermissionVisibility() {
        const permissions = this.getCurrentPermissions();
        const allowedSections = permissions.allowedSections || [];
        document.querySelectorAll('.sidebar nav ul li a[data-target]').forEach(link => {
            const target = link.getAttribute('data-target');
            const li = link.closest('li');
            if (li) li.style.display = allowedSections.includes(target) ? '' : 'none';
        });

        Object.entries(SUBSECTION_PERMISSIONS).forEach(([sectionId, group]) => {
            group.items.forEach(item => {
                const suffix = item.id.charAt(0).toUpperCase() + item.id.slice(1);
                const el = document.getElementById(`btnTabEntrada${suffix}`);
                if (el && sectionId === 'view-entrada') {
                    el.style.display = this.canAccessSubsection(sectionId, item.id) ? 'flex' : 'none';
                }
            });
        });
        if (typeof window.atualizarPermissoesEntrada === 'function') {
            window.atualizarPermissoesEntrada();
        }
    },

    renderPermissionEditor(selected = {}) {
        const container = document.getElementById('form-user-permissoes');
        if (!container) return;
        const allowedSections = selected.allowedSections || [];
        container.innerHTML = SECTION_PERMISSIONS.map(item => permissionOptionHtml(item, allowedSections.includes(item.id))).join('');
        container.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', () => this.renderSubPermissionEditor(this.getPermissionsFromForm()));
        });
        this.renderSubPermissionEditor(selected);
    },

    renderSubPermissionEditor(selected = {}) {
        const wrap = document.getElementById('form-user-subpermissoes-wrap');
        const container = document.getElementById('form-user-subpermissoes');
        if (!wrap || !container) return;

        const allowedSections = selected.allowedSections || [];
        const allowedSubsections = selected.allowedSubsections || {};
        const groups = Object.entries(SUBSECTION_PERMISSIONS).filter(([sectionId]) => allowedSections.includes(sectionId));

        if (groups.length === 0) {
            wrap.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        wrap.style.display = 'block';
        container.innerHTML = groups.map(([sectionId, group]) => {
            const selectedItems = allowedSubsections[sectionId] || group.items.map(item => item.id);
            const options = group.items.map(item => permissionOptionHtml(item, selectedItems.includes(item.id))).join('');
            return `
                <div data-subsection-group="${sectionId}">
                    <div style="font-size:0.85rem; color:var(--accent-color); font-weight:700; margin-bottom:8px;">${group.label}</div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap:8px;">${options}</div>
                </div>
            `;
        }).join('');
    },

    getPermissionsFromForm() {
        const sectionInputs = Array.from(document.querySelectorAll('#form-user-permissoes input[type="checkbox"]:checked'));
        const allowedSections = sectionInputs.map(input => input.value);
        const allowedSubsections = {};

        document.querySelectorAll('#form-user-subpermissoes [data-subsection-group]').forEach(group => {
            const sectionId = group.getAttribute('data-subsection-group');
            allowedSubsections[sectionId] = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
        });

        return { allowedSections, allowedSubsections, readOnly: false };
    },


    loadProfilePic() {
        const savedPic = localStorage.getItem('orquestrasis_profile_pic');
        if (savedPic) {
            const imgPreview = document.getElementById('imgPerfilPreview');
            const icon = document.getElementById('imgPerfilIcon');
            if (imgPreview && icon) {
                imgPreview.src = savedPic;
                imgPreview.style.display = 'block';
                icon.style.display = 'none';
            }
            // Atualizar o avatar da barra superior também
            const imgHeader = document.getElementById('imgHeaderAvatar');
            const iconHeader = document.getElementById('iconHeaderAvatar');
            if (imgHeader && iconHeader) {
                imgHeader.src = savedPic;
                imgHeader.style.display = 'block';
                iconHeader.style.display = 'none';
            }
        }
    },

    setupSidebarCollapse() {
        const btnToggleSidebar = document.getElementById('btnToggleSidebar');
        const appWrapper = document.querySelector('.app-wrapper');
        if (btnToggleSidebar && appWrapper) {
            // Se for dispositivo móvel (celular), inicia sempre recolhido para carregamento limpo
            const isMobile = window.innerWidth <= 768;
            const isCollapsed = isMobile || localStorage.getItem('sidebar_collapsed') === 'true';
            
            if (isCollapsed) {
                appWrapper.classList.add('sidebar-collapsed');
                const btnIcon = btnToggleSidebar.querySelector('i');
                if (btnIcon) {
                    btnIcon.classList.remove('fa-chevron-left');
                    btnIcon.classList.add('fa-chevron-right');
                }
            }

            btnToggleSidebar.addEventListener('click', () => {
                appWrapper.classList.toggle('sidebar-collapsed');
                const collapsed = appWrapper.classList.contains('sidebar-collapsed');
                if (!isMobile) {
                    localStorage.setItem('sidebar_collapsed', collapsed);
                }
                
                const btnIcon = btnToggleSidebar.querySelector('i');
                if (btnIcon) {
                    if (collapsed) {
                        btnIcon.classList.remove('fa-chevron-left');
                        btnIcon.classList.add('fa-chevron-right');
                    } else {
                        btnIcon.classList.remove('fa-chevron-right');
                        btnIcon.classList.add('fa-chevron-left');
                    }
                }
            });
        }
    },

    checkAuth() {
        onAuthStateChanged(auth, async (user) => {
            // Cancelar escuta anterior em tempo real caso o usuário mude ou deslogue
            if (this.userUnsubscribe) {
                console.log("Core: Cancelando escuta em tempo real anterior...");
                this.userUnsubscribe();
                this.userUnsubscribe = null;
            }
            if (this.usuariosUnsubscribe) {
                console.log("Core: Cancelando escuta de lista de usuários anterior...");
                this.usuariosUnsubscribe();
                this.usuariosUnsubscribe = null;
            }

            this.user = user;
            if (user) {
                console.log("Core: Autenticado como " + user.email);
                
                try {
                    const userRef = doc(db, 'usuarios', user.uid);
                    let userSnap = await getDoc(userRef);
                    
                    if (!userSnap.exists()) {
                        // Tenta buscar pré-cadastro por email
                        const usersColl = collection(db, 'usuarios');
                        const q = query(usersColl, where('email', '==', user.email));
                        const qSnap = await getDocs(q);
                        
                        if (!qSnap.empty) {
                            const preDoc = qSnap.docs[0];
                            const preData = preDoc.data();
                            await setDoc(userRef, {
                                ...preData,
                                uid: user.uid,
                                atualizadoEm: new Date().toISOString()
                            });
                            if (preDoc.id !== user.uid) {
                                await deleteDoc(doc(db, 'usuarios', preDoc.id));
                            }
                        } else {
                            await setDoc(userRef, {
                                nome: (user.displayName || user.email.split('@')[0]).toUpperCase(),
                                email: user.email,
                                cargo: 'PENDENTE',
                                criadoEm: new Date().toISOString()
                            });
                        }
                    }
                    
                    // ESCUTA ATUALIZAÇÕES EM TEMPO REAL NO DOCUMENTO DO USUÁRIO LOGADO (Firestore Realtime)
                    console.log("Core: Iniciando escuta em tempo real para cargo e permissões...");
                    this.userUnsubscribe = onSnapshot(userRef, (snapshot) => {
                        if (!snapshot.exists()) {
                            console.warn("Core: Perfil do usuário não encontrado no Firestore. Forçando logout...");
                            this.logout();
                            return;
                        }
                        
                        const userData = snapshot.data();
                        const novoCargo = userData.cargo || 'PENDENTE';
                        const novoNome = userData.nome || user.email.split('@')[0].toUpperCase();
                        const novasPermissoes = getEffectivePermissions(userData);
                        
                        console.log(`Core [Sincronização em Tempo Real]: Nome: ${novoNome} | Cargo: ${novoCargo}`);
                        
                        const cargoMudou = this.userRole !== novoCargo;
                        
                        // Cancelar escuta da lista de usuários se o cargo do próprio usuário logado deixar de ser gerente
                        if (normalizeRole(novoCargo) !== 'gerente' && this.usuariosUnsubscribe) {
                            console.log("Core: Cancelando escuta de lista de usuários pois cargo mudou...");
                            this.usuariosUnsubscribe();
                            this.usuariosUnsubscribe = null;
                        }
                        
                        // Atualiza as variáveis globais da aplicação
                        this.userRole = novoCargo;
                        this.userPermissions = novasPermissoes;
                        this.userName = novoNome;
                        
                        // Aplicar classe de perfil dinamicamente no body para controle CSS
                        document.body.className = `role-${this.userRole.toLowerCase()}`;
                        
                        // Atualizar nome e cargo nos cabeçalhos da página
                        const nameHeader = document.getElementById('userNameHeader');
                        const roleHeader = document.querySelector('.header-user-role');
                        if (nameHeader) nameHeader.textContent = this.userName;
                        if (roleHeader) roleHeader.textContent = getRoleDisplayName(this.userRole);
                        this.applyPermissionVisibility();
                        
                        // Direcionar telas de acordo com a permissão atômica atualizada
                        if (normalizeRole(this.userRole) === 'PENDENTE') {
                            const pendNome = document.getElementById('pendente-user-name');
                            const pendEmail = document.getElementById('pendente-user-email');
                            if (pendNome) pendNome.textContent = this.userName;
                            if (pendEmail) pendEmail.textContent = user.email;
                            
                            this.showSection('view-pendente');
                        } else {
                            if (window.location.pathname.includes('login.html')) {
                                window.location.href = 'index.html';
                            } else {
                                const currentSection = document.querySelector('.view-section.active-section')?.id || 'view-dashboard';
                                const perms = this.getCurrentPermissions();
                                
                                // Se o cargo mudou ou se o usuário estiver em uma tela proibida, redireciona dinamicamente
                                if (cargoMudou || (perms && !perms.allowedSections.includes(currentSection))) {
                                    if (perms && perms.allowedSections.length > 0) {
                                        console.log(`Core: Redirecionando para a seção permitida "${perms.allowedSections[0]}"`);
                                        const savedSection = localStorage.getItem('appActiveSection');
                                        const nextSection = savedSection && perms.allowedSections.includes(savedSection)
                                            ? savedSection
                                            : perms.allowedSections[0];
                                        this.showSection(nextSection);
                                        document.querySelectorAll('.sidebar nav ul li a').forEach(l => l.classList.remove('active'));
                                        const link = document.querySelector(`.sidebar nav ul li a[data-target="${nextSection}"]`);
                                        if (link) link.classList.add('active');
                                    }
                                }
                            }
                        }
                        
                        // Se for gerente, renderiza e libera o painel de administração de usuários nas configurações
                        const panel = document.getElementById('panelConfigUsuarios');
                        if (normalizeRole(this.userRole) === 'gerente') {
                            if (panel) {
                                panel.style.display = 'block';
                                this.carregarTabelaUsuarios();
                            }
                        } else {
                            if (panel) panel.style.display = 'none';
                        }
                    }, (error) => {
                        console.error("Core [Realtime Error]: Erro na sincronização em tempo real:", error);
                    });
                    
                } catch (err) {
                    console.error("Core [Auth Exception]: Erro ao carregar perfil do Firestore:", err);
                }
                
                carregarDadosSerrariaEmitente();
                
            } else {
                console.warn("Core: Usuário desautenticado ou desconectado.");
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }
        });
    },

    async logout() {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Erro no logout:", error);
        }
    },

    setupNavigation() {
        console.log("Core: Ativando escuta de navegação...");
        
        document.addEventListener('click', (e) => {
            const link = e.target.closest('#btnLogout');
            const btnPendenteLogout = e.target.closest('#btnPendenteLogout');
            if (link || btnPendenteLogout) {
                e.preventDefault();
                console.log("Core: Efetuando logout do sistema...");
                this.logout();
            }
        });

        // Mostrar primeira seção permitida por padrão ao carregar
        const permissions = this.getCurrentPermissions();
        const savedSection = localStorage.getItem('appActiveSection');
        const startSection = savedSection && (permissions.allowedSections || []).includes(savedSection)
            ? savedSection
            : (permissions.allowedSections[0] || 'view-dashboard');
            
        this.showSection(startSection);
    },

    showSection(id) {
        const currentRole = this.userRole || 'PENDENTE';
        const permissions = this.getCurrentPermissions();
        
        if (permissions && !permissions.allowedSections.includes(id)) {
            console.warn(`Core: Acesso negado à seção ${id} para o cargo ${currentRole}`);
            if (permissions.allowedSections.length > 0) {
                id = permissions.allowedSections[0];
            } else {
                id = 'view-pendente';
            }
        }

        const sections = document.querySelectorAll('.view-section');
        let found = false;
        sections.forEach(s => {
            if (s.id === id) {
                s.style.display = 'block';
                s.classList.add('active-section');
                found = true;
            } else {
                s.style.display = 'none';
                s.classList.remove('active-section');
            }
        });
        
        if (!found && id !== 'view-dashboard' && id !== 'view-pendente') {
            console.error("Core: Seção não encontrada: " + id);
        }
        if (found && id !== 'view-pendente') {
            localStorage.setItem('appActiveSection', id);
        }
        this.applyPermissionVisibility();
        return id;
    },

    carregarTabelaUsuarios() {
        const tbody = document.getElementById('tbodyConfigUsuarios');
        if (!tbody) return;
        
        // Se já existe um listener ativo para a lista de usuários, não recriamos
        if (this.usuariosUnsubscribe) {
            return;
        }
        
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando lista...</td></tr>`;
        
        try {
            const usersColl = collection(db, 'usuarios');
            const q = query(usersColl, orderBy('criadoEm', 'desc'));
            
            console.log("Core: Iniciando escuta em tempo real da lista de usuários para painel do Gerente...");
            this.usuariosUnsubscribe = onSnapshot(q, (qSnap) => {
                if (qSnap.empty) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">Nenhum usuário cadastrado.</td></tr>`;
                    return;
                }
                
                let html = '';
                this.usuariosConfigById = {};
                qSnap.forEach(doc => {
                    const u = doc.data();
                    const id = doc.id;
                    this.usuariosConfigById[id] = { id, ...u };
                    const permissions = getEffectivePermissions(u);
                    const cargoFormatado = getRoleDisplayName(u.cargo);
                    const isPending = normalizeRole(u.cargo) === 'PENDENTE' || (permissions.allowedSections || []).length === 0;
                    const statusBadge = isPending 
                        ? `<span style="background: rgba(230,126,34,0.15); color: #e67e22; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid rgba(230,126,34,0.3);">Pendente</span>`
                        : `<span style="background: rgba(46,204,113,0.15); color: #2ecc71; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid rgba(46,204,113,0.3);">Ativo</span>`;
                    
                    html += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
                            <td><strong style="color: white;">${u.nome}</strong></td>
                            <td>${u.email}</td>
                            <td><span style="color: var(--accent-color); font-weight: 500;">${cargoFormatado}</span></td>
                            <td>${statusBadge}</td>
                            <td style="text-align: right;">
                                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                    <button onclick="window.abrirEditarUsuario('${id}')" class="btn-primary" style="padding: 6px 12px; font-size: 12px; background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2);">
                                        <i class="fa-solid fa-pen"></i> Alterar
                                    </button>
                                    <button onclick="window.excluirUsuario('${id}')" class="btn-danger" style="padding: 6px 10px; font-size: 12px;">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            }, (error) => {
                console.error("Erro na escuta da lista de usuários em tempo real:", error);
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Erro ao carregar usuários.</td></tr>`;
            });
        } catch (err) {
            console.error("Erro ao carregar tabela de usuários:", err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Erro ao carregar usuários.</td></tr>`;
        }
    }

};

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

window.App = App;
window.hasSectionPermission = (sectionId) => App.canAccessSection(sectionId);
window.hasSubsectionPermission = (sectionId, subId) => App.canAccessSubsection(sectionId, subId);
window.navegarPara = function(targetId) {
    if (App && typeof App.showSection === 'function') {
        targetId = App.showSection(targetId);
        
        // Atualizar classe ativa na sidebar
        document.querySelectorAll('.sidebar nav ul li a').forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.sidebar nav ul li a[data-target="${targetId}"]`);
        if (link) link.classList.add('active');
        
        // Esconder dropdown de perfil se estiver aberto
        const d = document.getElementById('profile-dropdown');
        if (d) d.style.display = 'none';
        
        // Em telas pequenas, recolher a sidebar ao clicar em um link
        if (window.innerWidth <= 768) {
            const appWrapper = document.querySelector('.app-wrapper');
            if (appWrapper && !appWrapper.classList.contains('sidebar-collapsed')) {
                document.getElementById('btnToggleSidebar')?.click();
            }
        }
    }
};

window.previewFotoPerfil = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgPreview = document.getElementById('imgPerfilPreview');
            const icon = document.getElementById('imgPerfilIcon');
            if (imgPreview && icon) {
                imgPreview.src = e.target.result;
                imgPreview.style.display = 'block';
                icon.style.display = 'none';
            }
            // Atualizar o avatar da barra superior também
            const imgHeader = document.getElementById('imgHeaderAvatar');
            const iconHeader = document.getElementById('iconHeaderAvatar');
            if (imgHeader && iconHeader) {
                imgHeader.src = e.target.result;
                imgHeader.style.display = 'block';
                iconHeader.style.display = 'none';
            }
            // Salvar base64 no localStorage ou preparar para Firebase
            localStorage.setItem('orquestrasis_profile_pic', e.target.result);
        };
        reader.readAsDataURL(file);
    }
};

// Expor funções globais para controle de usuários e permissões
window.abrirModalNovoUsuario = function() {
    const modal = document.getElementById('modalUsuario');
    const title = document.getElementById('modalUsuarioTitle');
    const form = document.getElementById('formUsuario');
    
    if (modal && title && form) {
        form.reset();
        document.getElementById('form-user-id').value = '';
        document.getElementById('form-user-email').disabled = false;
        document.getElementById('form-user-cargo').value = '';
        App.renderPermissionEditor({ allowedSections: [], allowedSubsections: {}, readOnly: false });
        title.innerHTML = `<i class="fa-solid fa-user-plus"></i> Pré-Cadastrar Usuário`;
        modal.style.display = 'flex';
    }
};

window.fecharModalUsuario = function() {
    const modal = document.getElementById('modalUsuario');
    if (modal) modal.style.display = 'none';
};

window.abrirEditarUsuario = function(id, nome, email, cargo) {
    const modal = document.getElementById('modalUsuario');
    const title = document.getElementById('modalUsuarioTitle');
    const usuario = App.usuariosConfigById[id] || { id, nome, email, cargo };
    
    if (modal && title) {
        document.getElementById('form-user-id').value = id;
        document.getElementById('form-user-nome').value = usuario.nome || '';
        document.getElementById('form-user-email').value = usuario.email || '';
        document.getElementById('form-user-email').disabled = true; // Email não muda
        document.getElementById('form-user-cargo').value = usuario.cargo || '';
        App.renderPermissionEditor(getEffectivePermissions(usuario));
        
        title.innerHTML = `<i class="fa-solid fa-user-pen"></i> Alterar Permissões de Usuário`;
        modal.style.display = 'flex';
    }
};

window.salvarUsuario = async function() {
    const id = document.getElementById('form-user-id').value;
    const nome = document.getElementById('form-user-nome').value.trim();
    const email = document.getElementById('form-user-email').value.trim().toLowerCase();
    const cargo = document.getElementById('form-user-cargo').value.trim();
    const permissoes = App.getPermissionsFromForm();
    
    if (!nome || !email || !cargo) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    if (normalizeRole(cargo) !== 'PENDENTE' && permissoes.allowedSections.length === 0) {
        alert("Selecione ao menos uma aba para liberar o acesso deste usuário.");
        return;
    }

    for (const sectionId of permissoes.allowedSections) {
        if (SUBSECTION_PERMISSIONS[sectionId] && (permissoes.allowedSubsections[sectionId] || []).length === 0) {
            alert("Selecione ao menos uma tela interna para cada aba liberada.");
            return;
        }
    }
    
    const btnSalvar = document.getElementById('btnSalvarUsuario');
    const origText = btnSalvar ? btnSalvar.innerHTML : 'Salvar';
    if (btnSalvar) {
        btnSalvar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
        btnSalvar.disabled = true;
    }
    
    try {
        if (id) {
            // Edição
            const userRef = doc(db, 'usuarios', id);
            await updateDoc(userRef, {
                nome: nome,
                cargo: cargo,
                cargoNormalizado: normalizeRole(cargo),
                permissoes: permissoes,
                atualizadoEm: new Date().toISOString()
            });
            alert("Permissões do usuário atualizadas com sucesso!");
        } else {
            // Pré-cadastro
            const userRef = doc(collection(db, 'usuarios'));
            await setDoc(userRef, {
                nome: nome,
                email: email,
                cargo: cargo,
                cargoNormalizado: normalizeRole(cargo),
                permissoes: permissoes,
                criadoEm: new Date().toISOString()
            });
            alert("Pré-cadastro realizado com sucesso! Quando o funcionário acessar com este e-mail, ele já terá o cargo definido.");
        }
        window.fecharModalUsuario();
        if (App && typeof App.carregarTabelaUsuarios === 'function') {
            App.carregarTabelaUsuarios();
        }
    } catch (err) {
        console.error("Erro ao salvar usuário:", err);
        alert("Erro ao salvar dados do usuário.");
    } finally {
        if (btnSalvar) {
            btnSalvar.innerHTML = origText;
            btnSalvar.disabled = false;
        }
    }
};

window.excluirUsuario = async function(id) {
    if (!confirm("Tem certeza que deseja excluir o cadastro e acesso deste usuário?")) return;
    try {
        await deleteDoc(doc(db, 'usuarios', id));
        alert("Usuário excluído com sucesso!");
        if (App && typeof App.carregarTabelaUsuarios === 'function') {
            App.carregarTabelaUsuarios();
        }
    } catch (err) {
        console.error("Erro ao excluir usuário:", err);
        alert("Erro ao excluir usuário.");
    }
};

export { App };

