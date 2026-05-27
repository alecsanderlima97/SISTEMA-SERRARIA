import { 
    auth, db, doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc, updateDoc,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    GoogleAuthProvider, signInWithRedirect, getRedirectResult
} from './firebase-init.js';

// ======================================================
// LISTA DE E-MAILS COM CARGO GERENTE AUTOMÁTICO
// Adicione aqui os e-mails que devem ser Gerentes
// ======================================================
const ADMIN_EMAILS = [
    'limaalecsander@gmail.com'
];
const DEFAULT_EMPRESA_ID = 'vanmarte';
const LOGIN_SOUND_PATH = 'assets/audio/login_sound.mp3';
const MIN_LOGIN_SOUND_MS = 3500;

function getCargoInicial(email) {
    if (ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
        return 'gerente';
    }
    return 'PENDENTE';
}

function playLoginSound() {
    const audio = new Audio(`${LOGIN_SOUND_PATH}?v=${Date.now()}`);
    audio.volume = 0.7;
    return new Promise((resolve, reject) => {
        audio.addEventListener('ended', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        audio.play().catch(reject);
    });
}

function goToSystemWithEntranceSound() {
    const startedAt = Date.now();
    playLoginSound()
        .catch((error) => console.warn('Som de entrada bloqueado ou indisponivel:', error))
        .finally(() => {
            const remaining = Math.max(250, MIN_LOGIN_SOUND_MS - (Date.now() - startedAt));
            setTimeout(() => {
                window.location.href = 'index.html';
            }, remaining);
        });
}

// DOM Elements - Formulário de Login
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('loginError');

// DOM Elements - Formulário de Cadastro (Novo)
const registerForm = document.getElementById('registerForm');
const regNomeInput = document.getElementById('regNome');
const regEmailInput = document.getElementById('regEmail');
const regPasswordInput = document.getElementById('regPassword');
const regConfirmPasswordInput = document.getElementById('regConfirmPassword');
const registerErrorMsg = document.getElementById('registerError');

// DOM Elements - Abas e Botões
const tabBtnLogin = document.getElementById('tabBtnLogin');
const tabBtnRegister = document.getElementById('tabBtnRegister');
const btnGoogleLogin = document.getElementById('btnGoogleLogin');

// 1. ALTERNÂNCIA DE ABAS DE LOGIN / CADASTRO
if (tabBtnLogin && tabBtnRegister && loginForm && registerForm) {
    tabBtnLogin.addEventListener('click', () => {
        // Estilo abas
        tabBtnLogin.classList.add('active');
        tabBtnLogin.style.color = 'var(--accent-color)';
        tabBtnLogin.style.borderBottom = '3px solid var(--accent-color)';
        
        tabBtnRegister.classList.remove('active');
        tabBtnRegister.style.color = 'var(--text-muted)';
        tabBtnRegister.style.borderBottom = '3px solid transparent';
        
        // Exibição form
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        
        // Ocultar erros
        errorMsg.style.display = 'none';
        registerErrorMsg.style.display = 'none';
    });

    tabBtnRegister.addEventListener('click', () => {
        // Estilo abas
        tabBtnRegister.classList.add('active');
        tabBtnRegister.style.color = 'var(--accent-color)';
        tabBtnRegister.style.borderBottom = '3px solid var(--accent-color)';
        
        tabBtnLogin.classList.remove('active');
        tabBtnLogin.style.color = 'var(--text-muted)';
        tabBtnLogin.style.borderBottom = '3px solid transparent';
        
        // Exibição form
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
        
        // Ocultar erros
        errorMsg.style.display = 'none';
        registerErrorMsg.style.display = 'none';
    });
}

// 2. TRATAMENTO DO REDIRECIONAMENTO E LOGIN COM GOOGLE
async function checkGoogleRedirectResult() {
    try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            const user = result.user;
            
            // Verifica se o usuário já tem registro de cargo no Firestore
            const userRef = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                // Verifica se há pré-cadastro por email
                const usersColl = collection(db, 'usuarios');
                const q = query(usersColl, where('email', '==', user.email));
                const qSnap = await getDocs(q);
                
                if (!qSnap.empty) {
                    const docExistente = qSnap.docs[0];
                    const dadosExistentes = docExistente.data();
                    
                    await setDoc(userRef, {
                        ...dadosExistentes,
                        uid: user.uid,
                        empresaId: dadosExistentes.empresaId || DEFAULT_EMPRESA_ID,
                        atualizadoEm: new Date().toISOString()
                    });
                    
                    if (docExistente.id !== user.uid) {
                        await deleteDoc(doc(db, 'usuarios', docExistente.id));
                    }
                } else {
                    // Usuário totalmente novo cadastrando com Google
                    const cargoGoogle = getCargoInicial(user.email);
                    await setDoc(userRef, {
                        nome: (user.displayName || user.email.split('@')[0]).toUpperCase(),
                        email: user.email.toLowerCase(),
                        cargo: cargoGoogle,
                        empresaId: DEFAULT_EMPRESA_ID,
                        criadoEm: new Date().toISOString()
                    });
                    if (cargoGoogle === 'PENDENTE') {
                        alert("Seu cadastro foi realizado com sucesso! Aguarde a aprovação do Gerente para acessar o sistema.");
                    }
                }
            }
            goToSystemWithEntranceSound();
        }
    } catch (error) {
        console.error("Erro no redirecionamento do Google:", error);
        showError("Falha na autenticação com o Google. Tente novamente.");
    }
}

// Inicializa a escuta do redirect do Google
checkGoogleRedirectResult();

// Login com Google
if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    });
}

// 3. LOGIN COM E-MAIL E SENHA LOCAL
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const em = emailInput.value.trim().toLowerCase();
    const pw = passwordInput.value;
    
    if (!em || !pw) return;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const origText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Acessando...';
    submitBtn.disabled = true;

    try {
        // Tenta fazer login no Firebase Auth
        const credential = await signInWithEmailAndPassword(auth, em, pw);
        const user = credential.user;

        // Auto-promover gerentes caso ainda estejam como PENDENTE
        if (ADMIN_EMAILS.includes(em)) {
            const userRef = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().cargo !== 'gerente') {
                await updateDoc(userRef, { cargo: 'gerente' });
            } else if (!userSnap.exists()) {
                await setDoc(userRef, {
                    nome: (user.displayName || em.split('@')[0]).toUpperCase(),
                    email: em,
                    cargo: 'gerente',
                    empresaId: DEFAULT_EMPRESA_ID,
                    criadoEm: new Date().toISOString()
                });
            }
        }

        goToSystemWithEntranceSound();
    } catch (error) {
        console.error("Erro no login:", error.code);
        let msg = "E-mail ou senha incorretos.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = "E-mail ou senha incorretos. Caso seja novo, realize seu cadastro na aba 'Cadastrar-se' ao lado.";
        } else if (error.code === 'auth/too-many-requests') {
            msg = "Muitas tentativas falhas. Sua conta foi temporariamente bloqueada. Tente novamente mais tarde.";
        }
        showError(msg);
    } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
    }
});

// 4. CADASTRO DE NOVO USUÁRIO LOCAL (E-MAIL E SENHA)
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nome = regNomeInput.value.trim().toUpperCase();
        const email = regEmailInput.value.trim().toLowerCase();
        const pw = regPasswordInput.value;
        const cpw = regConfirmPasswordInput.value;
        
        if (!nome || !email || !pw || !cpw) {
            showRegisterError("Preencha todos os campos obrigatórios.");
            return;
        }
        
        if (pw.length < 6) {
            showRegisterError("A senha deve ter no mínimo 6 caracteres.");
            return;
        }
        
        if (pw !== cpw) {
            showRegisterError("As senhas digitadas não coincidem.");
            return;
        }
        
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Cadastrando...';
        submitBtn.disabled = true;
        
        try {
            // Cria o usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, pw);
            const user = userCredential.user;
            
            // Grava os dados do usuário no Firestore (cargo automático para admins)
            const userRef = doc(db, 'usuarios', user.uid);
            const cargoInicial = getCargoInicial(email);
            await setDoc(userRef, {
                nome: nome,
                email: email,
                cargo: cargoInicial,
                empresaId: DEFAULT_EMPRESA_ID,
                criadoEm: new Date().toISOString()
            });
            
            const msgCadastro = cargoInicial === 'gerente'
                ? "Conta de Gerente criada com sucesso! Você já pode acessar o sistema."
                : "Cadastro realizado com sucesso! Aguarde a aprovação do Gerente Geral para liberar seu acesso às abas do sistema.";
            alert(msgCadastro);
            
            // Limpa o formulário de cadastro, preenche o email na tela de login e clica na aba de Entrar
            registerForm.reset();
            emailInput.value = email;
            passwordInput.value = '';
            tabBtnLogin.click();
            
        } catch (error) {
            console.error("Erro ao criar cadastro local:", error);
            let msg = "Erro ao criar conta. Tente novamente.";
            if (error.code === 'auth/email-already-in-use') {
                msg = "Este endereço de e-mail já está em uso por outra conta.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "O formato do e-mail digitado é inválido.";
            } else if (error.code === 'auth/weak-password') {
                msg = "A senha digitada é muito fraca. Escolha uma senha mais forte.";
            }
            showRegisterError(msg);
        } finally {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
        }
    });
}

// 5. FUNÇÕES AUXILIARES DE EXIBIÇÃO DE ERRO
function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    passwordInput.value = '';
    setTimeout(() => { errorMsg.style.display = 'none'; }, 6000);
}

function showRegisterError(msg) {
    registerErrorMsg.textContent = msg;
    registerErrorMsg.style.display = 'block';
    setTimeout(() => { registerErrorMsg.style.display = 'none'; }, 6000);
}
