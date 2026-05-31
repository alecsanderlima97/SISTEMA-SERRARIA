(function() {
    const html = `            <section id="view-configuracoes" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-gear"></i> Configurações do Sistema</h1>
                    <p>Gerencie seus dados e backups com segurança.</p>
                </div>

                <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
                    
                    <!-- Perfil Administrador -->
                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-user" style="font-size: 24px; color: var(--accent-color);"></i>
                            <h2 style="margin: 0; font-size: 20px;">Perfil do Usuário</h2>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 24px;">
                            <div style="position: relative;">
                                <div style="width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid var(--accent-color);">
                                    <img id="imgPerfilPreview" src="" alt="Perfil" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                                    <i id="imgPerfilIcon" class="fa-solid fa-user" style="font-size: 40px; color: #888;"></i>
                                </div>
                                <label style="position: absolute; bottom: 0; right: 0; background: var(--accent-color); padding: 8px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                                    <input type="file" id="inputFotoPerfil" accept="image/*" style="display: none;" onchange="window.previewFotoPerfil(event)">
                                    <i class="fa-solid fa-camera" style="color: white; font-size: 14px;"></i>
                                </label>
                            </div>

                            <div style="width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">Nome</label>
                                    <input type="text" value="Administrador" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">E-mail</label>
                                    <input type="email" value="admin@orquestra.cs" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">CPF</label>
                                    <input type="text" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">CNPJ</label>
                                    <input type="text" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">Telefone</label>
                                    <input type="text" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">Instagram</label>
                                    <input type="text" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div style="grid-column: span 2;">
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">Endereço Completo</label>
                                    <input type="text" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                            </div>

                            <button class="btn-primary" style="width: 100%; justify-content: center; padding: 14px;" onclick="alert('Configurações de perfil salvas com sucesso!')">
                                <i class="fa-solid fa-floppy-disk" style="margin-right: 8px;"></i>
                                SALVAR CONFIGURAÇÕES
                            </button>
                        </div>
                    </div>

                    <!-- Personalização de Tema -->
                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-palette" style="font-size: 24px; color: var(--accent-color);"></i>
                            <h2 style="margin: 0; font-size: 20px;">Personalização</h2>
                        </div>
                        
                        <p style="color: #ccc; font-size: 14px; margin-bottom: 16px;">Escolha o visual que mais combina com seu estilo:</p>
                        
                        <div style="display: flex; gap: 12px; flex-direction: column;">
                            <button class="btn-theme" onclick="window.changeTheme('original')" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #888; cursor: pointer; text-align: left;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background: #e67e22;"></div>
                                <span>Modo Serraria (Laranja Vibrante)</span>
                            </button>
                            <button class="btn-theme" onclick="window.changeTheme('premium')" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #888; cursor: pointer; text-align: left;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background: #4a5d23;"></div>
                                <span style="font-weight: bold;">Modo Premium (Verde Musgo)</span>
                            </button>
                            <button class="btn-theme" onclick="window.changeTheme('dark')" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #888; cursor: pointer; text-align: left;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background: #0f172a;"></div>
                                <span>Modo Escuro (Moderno)</span>
                            </button>
                            <button class="btn-theme" onclick="window.changeTheme('light')" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #888; cursor: pointer; text-align: left;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background: #f8fafc;"></div>
                                <span>Modo Claro (Clean)</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Backup e Restauração -->
                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-database" style="font-size: 24px; color: var(--accent-color);"></i>
                            <h2 style="margin: 0; font-size: 20px;">Backup de Dados</h2>
                        </div>
                        
                        <p style="color: #ccc; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
                            Exporte ou importe todos os dados do sistema para segurança ou migração.
                        </p>

                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <button class="btn-primary" style="width: 100%; justify-content: center; padding: 16px;" onclick="window.exportarBackup(this)">
                                <i class="fa-solid fa-download"></i> Exportar Backup (Baixar Dados)
                            </button>

                            <div style="position: relative;">
                                <input type="file" accept=".json" style="position: absolute; inset: 0; opacity: 0; cursor: pointer;">
                                <button class="btn-secondary" style="width: 100%; justify-content: center; padding: 16px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">
                                    <i class="fa-solid fa-upload"></i> Restaurar Backup (Enviar Dados)
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Segurança e Senha -->
                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-shield" style="font-size: 24px; color: #0ea5e9;"></i>
                            <h2 style="margin: 0; font-size: 20px;">Segurança</h2>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div>
                                <label style="display: block; font-size: 12px; color: #888; margin-bottom: 6px;">Nova Senha</label>
                                <input type="password" id="perfilNovaSenha" autocomplete="new-password" minlength="6" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; color: #888; margin-bottom: 6px;">Confirmar Senha</label>
                                <input type="password" id="perfilConfirmarSenha" autocomplete="new-password" minlength="6" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                            </div>
                            <button class="btn-primary" id="btnAlterarSenhaPerfil" style="background: #0ea5e9; border-color: #0ea5e9; width: 100%; justify-content: center;" onclick="window.alterarSenhaPerfil && window.alterarSenhaPerfil()">
                                Alterar Senha
                            </button>
                        </div>

                        <div style="margin-top: 24px; padding: 15px; background: rgba(14, 165, 233, 0.05); border-radius: 12px; border: 1px solid rgba(14, 165, 233, 0.1);">
                            <p style="color: #0ea5e9; font-size: 12px; margin: 0;">
                                Sua autenticação é feita com segurança usando Firebase Auth.
                            </p>
                        </div>
                    </div>

                    <!-- Painel Usuários e Permissões -->
                    <div class="glass-panel" id="panelConfigUsuarios" style="grid-column: span 2; display: none;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fa-solid fa-users-gear" style="font-size: 24px; color: var(--accent-color);"></i>
                                <h2 style="margin: 0; font-size: 20px;">Controle de Usuários & Permissões</h2>
                            </div>
                            <button class="btn-primary" onclick="window.abrirModalNovoUsuario()" style="padding: 8px 16px; font-size: 14px;">
                                <i class="fa-solid fa-user-plus"></i> Novo Usuário
                            </button>
                        </div>

                        <div class="table-container">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>E-mail</th>
                                        <th>Perfil / Função</th>
                                        <th>Status</th>
                                        <th style="text-align: right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="tbodyConfigUsuarios">
                                    <tr>
                                        <td colspan="5" style="text-align: center; color: #888;">Carregando usuários...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
