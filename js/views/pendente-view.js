(function() {
    const html = `            <!-- ====== TELA: AGUARDANDO APROVAÇÃO (PENDENTE) ====== -->
            <section id="view-pendente" class="view-section" style="display: none;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; text-align: center; padding: 20px;">
                    <div style="font-size: 80px; color: var(--accent-color); margin-bottom: 20px; animation: float 3s infinite ease-in-out;">
                        <i class="fa-solid fa-hourglass-half"></i>
                    </div>
                    <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px; color: white;">Acesso em Análise</h1>
                    <p style="color: #ccc; max-width: 500px; line-height: 1.6; margin-bottom: 30px;">
                        Olá, <strong id="pendente-user-name" style="color: var(--accent-color);">Usuário</strong>! Seu cadastro foi realizado, porém seu perfil está aguardando liberação do **Gerente Geral** para liberação das abas.
                    </p>
                    <div style="padding: 15px 25px; background: rgba(230, 126, 34, 0.1); border: 1px solid rgba(230, 126, 34, 0.2); border-radius: 12px; margin-bottom: 20px;">
                        <span style="color: var(--accent-color); font-size: 14px; font-weight: 500;">Seu E-mail: <span id="pendente-user-email">...</span></span>
                    </div>
                    <button class="btn-secondary" id="btnPendenteLogout" style="display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-right-from-bracket"></i> Sair do Sistema
                    </button>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
