import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase-init.js';

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('loginError');

// O redirecionamento de quem já está logado agora é feito pelo core.js via onAuthStateChanged

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const em = emailInput.value.trim();
    const pw = passwordInput.value;
    
    if (!em || !pw) return;

    try {
        // Tenta fazer login
        await signInWithEmailAndPassword(auth, em, pw);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Erro no login:", error.code);
        
        // Lógica de "Primeiro Acesso": Se o usuário não existir, cria um novo
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                await createUserWithEmailAndPassword(auth, em, pw);
                window.location.href = 'index.html';
            } catch (createError) {
                showError("Erro ao criar conta ou senha inválida.");
            }
        } else {
            showError("E-mail ou senha incorretos.");
        }
    }
});

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    passwordInput.value = '';
    setTimeout(() => { errorMsg.style.display = 'none'; }, 5000);
}

