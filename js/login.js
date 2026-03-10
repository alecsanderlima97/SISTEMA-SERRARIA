// Configuração simplificada de Login
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('loginError');

// Checar se já está logado
if(localStorage.getItem('vanmarte_logged') === 'true') {
    window.location.href = 'index.html';
}

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const em = emailInput.value.trim();
    const pw = passwordInput.value;
    
    // Verificando se existe senha cadastrada no sistema
    let senhaSalva = localStorage.getItem('vanmarte_password');
    let emailSalvo = localStorage.getItem('vanmarte_email');

    // Primeiro acesso cadastra a senha
    if(!senhaSalva) {
        localStorage.setItem('vanmarte_email', em);
        localStorage.setItem('vanmarte_password', pw);
        localStorage.setItem('vanmarte_logged', 'true');
        window.location.href = 'index.html';
        return;
    }

    // Acessos subsequentes validam a senha
    if(em === emailSalvo && pw === senhaSalva) {
        localStorage.setItem('vanmarte_logged', 'true');
        window.location.href = 'index.html';
    } else {
        errorMsg.style.display = 'block';
        passwordInput.value = '';
        setTimeout(() => { errorMsg.style.display = 'none'; }, 3000);
    }
});
