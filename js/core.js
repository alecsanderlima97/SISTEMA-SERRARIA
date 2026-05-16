import { auth, signOut, onAuthStateChanged } from './firebase-init.js';

console.log("Core: Inicializando sistema de segurança e navegação...");

// Objeto de compatibilidade para evitar que scripts antigos travem o sistema
window.DB = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

const App = {
    user: null,

    init() {
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
