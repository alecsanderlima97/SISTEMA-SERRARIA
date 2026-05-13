// Gerenciador de Banco de Dados Local Fake
const DB = {
    // Inicializar e pegar do localStorage
    get: (key) => JSON.parse(localStorage.getItem(`vanmarte_${key}`)) || [],
    set: (key, data) => localStorage.setItem(`vanmarte_${key}`, JSON.stringify(data)),
    
    // Auth Check
    checkAuth: () => {
        if(localStorage.getItem('vanmarte_logged') !== 'true') {
            window.location.href = 'login.html';
        }
    },
    logout: () => {
        localStorage.setItem('vanmarte_logged', 'false');
        window.location.href = 'login.html';
    }
};

window.DB = DB;

DB.checkAuth();

// ---- Controle de Rotas / Sidebar ----
const navLinks = document.querySelectorAll('.sidebar nav ul li a');
const sections = document.querySelectorAll('.view-section');

// Oculta todas e mostra dashboard padrão
sections.forEach(s => s.style.display = 'none');
if(document.getElementById('view-dashboard')) {
  document.getElementById('view-dashboard').style.display = 'block';
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        if(link.id === 'btnLogout') {
            e.preventDefault();
            DB.logout();
            return;
        }

        e.preventDefault();
        
        // Remove active class de todos
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Pega o target e mostra
        const targetId = link.getAttribute('data-target');
        sections.forEach(s => s.style.display = 'none');
        document.getElementById(targetId).style.display = 'block';
    });
});
