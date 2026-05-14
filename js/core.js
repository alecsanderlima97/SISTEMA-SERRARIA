import { auth, signOut, onAuthStateChanged } from './firebase-init.js';

// Gerenciador de Estado Global
const App = {
    user: null,

    init() {
        this.checkAuth();
        this.initNavigation();
    },

    // Auth Check Realtime
    checkAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                console.log("Usuário logado:", user.email);
                // Se estiver na página de login, vai para o index
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'index.html';
                }
            } else {
                this.user = null;
                // Se não estiver na página de login, redireciona para lá
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
            console.error("Erro ao deslogar:", error);
        }
    },

    initNavigation() {
        const navLinks = document.querySelectorAll('.sidebar nav ul li a');
        const sections = document.querySelectorAll('.view-section');

        // Oculta todas e mostra dashboard padrão (se existir na página)
        sections.forEach(s => s.style.display = 'none');
        const defaultView = document.getElementById('view-dashboard');
        if (defaultView) defaultView.style.display = 'block';

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.id === 'btnLogout') {
                    e.preventDefault();
                    this.logout();
                    return;
                }

                const targetId = link.getAttribute('data-target');
                if (!targetId) return;

                e.preventDefault();
                
                // Navegação entre seções na mesma página
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                sections.forEach(s => s.style.display = 'none');
                const targetSection = document.getElementById(targetId);
                if (targetSection) targetSection.style.display = 'block';
            });
        });
    }
};

// Inicia o App
App.init();

// Exporta para uso em outros módulos se necessário
export { App };

