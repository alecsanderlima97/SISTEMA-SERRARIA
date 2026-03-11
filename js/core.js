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

// ---- UTILITÁRIOS E MÁSCARAS ----

window.applyMask = function(input, decimals) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ""); // Remove não-dígitos
        if (value === "") {
            e.target.value = "";
            return;
        }
        let number = parseFloat(value) / Math.pow(10, decimals);
        e.target.value = number.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    });
};

window.maskCnpj = function(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 14) v = v.substring(0, 14);
        if (v.length > 12) {
            v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
        } else if (v.length > 8) {
            v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4}).*/, "$1.$2.$3/$4");
        } else if (v.length > 5) {
            v = v.replace(/^(\d{2})(\d{3})(\d{3}).*/, "$1.$2.$3");
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{3}).*/, "$1.$2");
        }
        e.target.value = v;
    });
};

window.maskPhone = function(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 10) {
            v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else if (v.length > 5) {
            v = v.replace(/^(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
        } else if (v.length > 0) {
            v = v.replace(/^(\d{0,2}).*/, "($1");
        }
        e.target.value = v;
    });
};

window.parseLocalFloat = function(value) {
    if (typeof value !== 'string') return parseFloat(value) || 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

// ---- BARRA DE STATUS (USUÁRIO, DATA, HORA) ----

window.updateStatusBar = function() {
    const statusUser = document.getElementById('statusUser');
    const statusDate = document.getElementById('statusDate');
    const statusTime = document.getElementById('statusTime');

    // Tentar pegar login salvo ou usar padrão
    const loggedUser = localStorage.getItem('vanmarte_logged_user') || 'Administrador';
    if (statusUser) statusUser.textContent = loggedUser;
    
    const agora = new Date();
    if (statusDate) statusDate.textContent = agora.toLocaleDateString('pt-BR');
    if (statusTime) statusTime.textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Iniciar após DOM carregado
document.addEventListener('DOMContentLoaded', () => {
    window.updateStatusBar();
    setInterval(window.updateStatusBar, 1000 * 60); // Atualiza a cada minuto
});
