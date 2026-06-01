(function() {
    const html = `    <!-- MODAL: DETALHES DO ROMANEIO -->
    <div id="modalDetalhesRomaneio" class="modal-v2" style="display: none;">
        <div class="modal-content-v2 card-v2">
            <div class="modal-header-v2">
                <h2><i class="fa-solid fa-file-invoice"></i> Detalhes da Carga</h2>
                <button onclick="fecharModalDetalhes()" class="btn-close-v2">&times;</button>
            </div>
            <div id="conteudoDetalhesRomaneio" class="modal-body-v2">
                <!-- Preenchido via JS -->
            </div>
            <div class="modal-footer-v2 hide-on-print">
                <button onclick="window.modalDetalhesActions.print()" class="btn-v2 btn-secondary-v2"><i class="fa-solid fa-print"></i> Imprimir</button>
                <button onclick="window.modalDetalhesActions.pdf()" class="btn-v2" style="background:#16a34a; color:white;"><i class="fa-solid fa-file-pdf"></i> Baixar PDF</button>
                <button onclick="window.modalDetalhesActions.whatsapp()" class="btn-v2" style="background:#22c55e; color:white;"><i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp</button>
                <button onclick="fecharModalDetalhes()" class="btn-v2" style="background: var(--border); color: white;">Fechar</button>
            </div>
        </div>
    </div>

    <!-- MODAL: CONFIRMAÇÃO DE SEGURANÇA (EDITAR / EXCLUIR ROMANEIO) -->
    <div id="modalConfirmacaoSeguranca" class="modal-v2" style="display: none;">
        <div class="modal-content-v2 card-v2" style="max-width: 480px;">
            <div class="modal-header-v2">
                <h2 style="color: var(--danger-color);"><i class="fa-solid fa-shield-halved"></i> Operação Crítica</h2>
                <button onclick="fecharModalSeguranca()" class="btn-close-v2">&times;</button>
            </div>
            <div class="modal-body-v2" style="padding: 20px;">
                <div style="background: rgba(248, 81, 73, 0.1); border: 1px solid var(--danger-color); border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: center;">
                    <p id="avisoSegurancaTexto" style="color: #ff7b72; font-size: 0.95rem; font-weight: bold; margin: 0; line-height: 1.5;">
                        <!-- Preenchido via JS -->
                    </p>
                </div>
                <div class="input-group" style="margin-bottom: 15px;">
                    <label style="color: var(--text-muted); font-size: 0.85rem;">Confirme sua Senha de Login para Prosseguir:</label>
                    <input type="password" id="senhaSeguranca" placeholder="Digite sua senha de acesso" required style="width: 100%; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--panel-border); border-radius: 8px; color: white;">
                </div>
            </div>
            <div class="modal-footer-v2">
                <button id="btnConfirmarSeguranca" class="btn-v2" style="background: var(--danger-color); color: white; font-weight: bold; flex: 1;">
                    Confirmar Ação
                </button>
                <button onclick="fecharModalSeguranca()" class="btn-v2 btn-secondary-v2" style="flex: 1;">Cancelar</button>
            </div>
        </div>
    </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
