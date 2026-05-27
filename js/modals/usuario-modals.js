(function() {
    const html = `    <!-- MODAL: CADASTRAR/EDITAR USUÁRIO -->
    <div id="modalUsuario" class="modal-v2" style="display: none;">
        <div class="modal-content-v2 card-v2" style="max-width: 780px; width: 95%;">
            <div class="modal-header-v2">
                <h2 id="modalUsuarioTitle"><i class="fa-solid fa-user-plus"></i> Pré-Cadastrar/Aprovar Usuário</h2>
                <button onclick="window.fecharModalUsuario()" class="btn-close-v2">&times;</button>
            </div>
            <div class="modal-body-v2">
                <form id="formUsuario" onsubmit="event.preventDefault();">
                    <input type="hidden" id="form-user-id">
                    <div class="input-group" style="margin-bottom: 15px;">
                        <label>Nome Completo *</label>
                        <input type="text" id="form-user-nome" required placeholder="Ex: João da Silva" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                    </div>
                    <div class="input-group" style="margin-bottom: 15px;">
                        <label>E-mail de Acesso *</label>
                        <input type="email" id="form-user-email" required placeholder="Ex: joao@serraria.com" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                    </div>
                    <div class="input-group" style="margin-bottom: 15px;">
                        <label>Funcao / Cargo *</label>
                        <input type="text" id="form-user-cargo" required placeholder="Ex: Operador de Toras" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                    </div>
                    <div class="input-group" style="margin-bottom: 20px;">
                        <label>Abas liberadas no menu lateral *</label>
                        <div id="form-user-permissoes" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; padding: 12px; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; max-height: 240px; overflow-y: auto;"></div>
                    </div>
                    <div class="input-group" id="form-user-subpermissoes-wrap" style="margin-bottom: 20px; display: none;">
                        <label>Telas internas liberadas</label>
                        <div id="form-user-subpermissoes" style="display: grid; gap: 12px; padding: 12px; background: rgba(0,0,0,0.22); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;"></div>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn-secondary" onclick="window.fecharModalUsuario()">Cancelar</button>
                        <button type="submit" class="btn-primary" id="btnSalvarUsuario">Salvar Usuário</button>
                    </div>
                </form>
            </div>
        </div>
    </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
