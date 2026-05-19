import { auth, signOut, onAuthStateChanged, db, collection, getDocs } from './firebase-init.js';

console.log("Core: Inicializando sistema de segurança e navegação...");

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

    init() {
        const savedTheme = localStorage.getItem('orquestrasis_theme') || 'original';
        window.changeTheme(savedTheme);
        this.checkAuth();
        this.setupNavigation();
        this.setupSidebarCollapse();
        this.loadProfilePic();
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
            const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
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
                localStorage.setItem('sidebar_collapsed', collapsed);
                
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
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            if (user) {
                console.log("Core: Autenticado como " + user.email);
                carregarDadosSerrariaEmitente();
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'index.html';
                }
            } else {
                console.warn("Core: Usuário não autenticado.");
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
        
        // Escuta de cliques para ações específicas como Logout
        document.addEventListener('click', (e) => {
            const link = e.target.closest('#btnLogout');
            if (link) {
                e.preventDefault();
                console.log("Core: Efetuando logout do sistema...");
                this.logout();
            }
        });

        // Mostrar dashboard por padrão ao carregar
        this.showSection('view-dashboard');
    },

    showSection(id) {
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
        
        if (!found && id !== 'view-dashboard') {
            console.error("Core: Seção não encontrada: " + id);
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
window.navegarPara = function(targetId) {
    if (App && typeof App.showSection === 'function') {
        App.showSection(targetId);
        
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

export { App };
