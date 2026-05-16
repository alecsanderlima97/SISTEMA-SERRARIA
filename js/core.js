import { auth, signOut, onAuthStateChanged, db, collection, getDocs } from './firebase-init.js';

console.log("Core: Inicializando sistema de segurança e navegação...");

// Objeto de compatibilidade para evitar que scripts antigos travem o sistema
window.DB = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

window.changeTheme = function(themeName) {
    const root = document.documentElement;
    if (themeName === 'premium') {
        root.style.setProperty('--primary-color', '#4a5d23');
        root.style.setProperty('--primary-hover', '#3a4a1c');
        root.style.setProperty('--accent-color', '#6b8e23');
        root.style.setProperty('--bg-color', '#1a1f16');
        root.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.1)');
        root.style.setProperty('--text-color', '#e6edf3');
        root.style.setProperty('--text-muted', '#a1a1a1');
    } else if (themeName === 'dark') {
        root.style.setProperty('--primary-color', '#3b82f6');
        root.style.setProperty('--primary-hover', '#2563eb');
        root.style.setProperty('--accent-color', '#60a5fa');
        root.style.setProperty('--bg-color', '#0f172a');
        root.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.1)');
        root.style.setProperty('--text-color', '#f8fafc');
        root.style.setProperty('--text-muted', '#94a3b8');
    } else if (themeName === 'light') {
        root.style.setProperty('--primary-color', '#2563eb');
        root.style.setProperty('--primary-hover', '#1d4ed8');
        root.style.setProperty('--accent-color', '#3b82f6');
        root.style.setProperty('--bg-color', '#f1f5f9');
        root.style.setProperty('--panel-bg', '#ffffff');
        root.style.setProperty('--panel-border', 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--text-color', '#1e293b');
        root.style.setProperty('--text-muted', '#64748b');
    } else {
        root.style.setProperty('--primary-color', '#e67e22');
        root.style.setProperty('--primary-hover', '#d35400');
        root.style.setProperty('--accent-color', '#f1c40f');
        root.style.setProperty('--bg-color', '#0f0a09');
        root.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.1)');
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
    },

    checkAuth() {
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            if (user) {
                console.log("Core: Autenticado como " + user.email);
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
        
        // Uso de Delegação de Eventos: Mais robusto que querySelectorAll direto
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.sidebar nav ul li a, .dropdown-item[data-target]');
            if (!link) return;

            const targetId = link.getAttribute('data-target');
            
            if (link.id === 'btnLogout') {
                e.preventDefault();
                this.logout();
                return;
            }

            if (targetId) {
                e.preventDefault();
                console.log("Core: Navegando para " + targetId);
                this.showSection(targetId);
                
                // Atualizar classe ativa apenas para os links da sidebar
                document.querySelectorAll('.sidebar nav ul li a').forEach(l => l.classList.remove('active'));
                if (link.closest('.sidebar')) {
                    link.classList.add('active');
                }
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
                found = true;
            } else {
                s.style.display = 'none';
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

export { App };
