(function() {
    const html = `            <section id="view-configuracoes" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-gear"></i> Configuracoes do Sistema</h1>
                    <p>Gerencie seus dados e backups com seguranca.</p>
                </div>

                <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
                    
                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-user" style="font-size: 24px; color: var(--accent-color);"></i>
                            <h2 style="margin: 0; font-size: 20px;">Perfil do Usuario</h2>
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
                                    <input type="text" id="perfilNome" value="Administrador" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">E-mail</label>
                                    <input type="email" id="perfilEmail" value="admin@orquestra.cs" readonly style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white; opacity: 0.75;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">CPF</label>
                                    <input type="text" id="perfilCpf" placeholder="000.000.000-00" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">CNPJ</label>
                                    <input type="text" id="perfilCnpj" placeholder="00.000.000/0000-00" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">Telefone</label>
                                    <input type="text" id="perfilTelefone" placeholder="(00) 00000-0000" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">Instagram</label>
                                    <input type="text" id="perfilInstagram" placeholder="@seuinstagram" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                                <div style="grid-column: span 2;">
                                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase;">Endereco Completo</label>
                                    <input type="text" id="perfilEndereco" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: white;">
                                </div>
                            </div>

                            <button class="btn-primary" id="btnSalvarPerfil" style="width: 100%; justify-content: center; padding: 14px;" onclick="window.salvarPerfilUsuario && window.salvarPerfilUsuario()">
                                <i class="fa-solid fa-floppy-disk" style="margin-right: 8px;"></i>
                                SALVAR CONFIGURACOES
                            </button>
                        </div>
                    </div>

                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-palette" style="font-size: 24px; color: var(--accent-color);"></i>
                            <h2 style="margin: 0; font-size: 20px;">Personalizacao</h2>
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
                    
                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-database" style="font-size: 24px; color: var(--accent-color);"></i>
                            <h2 style="margin: 0; font-size: 20px;">Backup de Dados</h2>
                        </div>
                        
                        <p style="color: #ccc; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
                            Exporte ou importe todos os dados do sistema para seguranca ou migracao.
                        </p>
                        <div id="backupInfoResumo" style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 18px;">
                            O backup inclui os principais cadastros e movimentos salvos no Firestore, mais algumas preferencias locais do navegador.
                        </div>

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

                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-envelope-open-text" style="font-size: 24px; color: #60a5fa;"></i>
                            <h2 style="margin: 0; font-size: 20px;">Integracao de E-mail</h2>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:14px;">
                            <div style="padding:14px; border:1px solid rgba(255,255,255,0.06); border-radius:12px; background:rgba(255,255,255,0.02);">
                                <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Conta monitorada</div>
                                <strong id="outlookAccountEmail" style="font-size:16px; color:#f8fafc;">escritoriovanmarte@hotmail.com</strong>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                <div style="padding:14px; border:1px solid rgba(255,255,255,0.06); border-radius:12px; background:rgba(255,255,255,0.02);">
                                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Status</div>
                                    <strong id="outlookIntegrationStatus" style="font-size:16px; color:#f59e0b;">Preparando</strong>
                                </div>
                                <div style="padding:14px; border:1px solid rgba(255,255,255,0.06); border-radius:12px; background:rgba(255,255,255,0.02);">
                                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Escopo inicial</div>
                                    <strong style="font-size:16px; color:#f8fafc;">Leitura de e-mails</strong>
                                </div>
                            </div>

                            <p id="outlookIntegrationHint" style="color:#cbd5e1; font-size:13px; line-height:1.6; margin:0;">
                                Vamos usar a conta Outlook/Hotmail para receber documentos e mandar para fila de conferencia antes da importacao.
                            </p>

                            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                                <button class="btn-primary" type="button" style="padding: 12px 16px;" onclick="window.iniciarConexaoOutlook && window.iniciarConexaoOutlook()">
                                    <i class="fa-solid fa-link"></i> Conectar Outlook
                                </button>
                                <button class="btn-secondary" type="button" style="padding: 12px 16px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);" onclick="window.verificarIntegracaoOutlook && window.verificarIntegracaoOutlook()">
                                    <i class="fa-solid fa-rotate-right"></i> Atualizar Status
                                </button>
                                <button class="btn-secondary" type="button" style="padding: 12px 16px; background: rgba(239,68,68,0.08); color: #fecaca; border: 1px solid rgba(239,68,68,0.22);" onclick="window.desconectarOutlook && window.desconectarOutlook()">
                                    <i class="fa-solid fa-link-slash"></i> Desconectar
                                </button>
                            </div>

                            <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:16px;">
                                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
                                    <strong style="font-size:15px; color:#f8fafc;">Documentos recebidos</strong>
                                    <button class="btn-secondary" type="button" style="padding: 10px 14px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);" onclick="window.carregarMensagensOutlook && window.carregarMensagensOutlook()">
                                        <i class="fa-solid fa-inbox"></i> Atualizar Caixa
                                    </button>
                                </div>
                                <div id="outlookMessagesInfo" style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
                                    Conecte o Outlook para listar os ultimos e-mails com anexos.
                                </div>
                                <div id="outlookMessagesList" style="display:flex; flex-direction:column; gap:10px;">
                                    <div style="padding:12px; border:1px dashed rgba(255,255,255,0.12); border-radius:10px; color:#94a3b8;">
                                        Nenhum documento carregado ainda.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="glass-panel">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <i class="fa-solid fa-shield" style="font-size: 24px; color: #0ea5e9;"></i>
                            <h2 style="margin: 0; font-size: 20px;">Seguranca</h2>
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
                                Sua autenticacao e feita com seguranca usando Firebase Auth.
                            </p>
                        </div>
                    </div>

                    <div class="glass-panel" id="panelConfigUsuarios" style="grid-column: span 2; display: none;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fa-solid fa-users-gear" style="font-size: 24px; color: var(--accent-color);"></i>
                                <h2 style="margin: 0; font-size: 20px;">Controle de Usuarios e Permissoes</h2>
                            </div>
                            <button class="btn-primary" onclick="window.abrirModalNovoUsuario()" style="padding: 8px 16px; font-size: 14px;">
                                <i class="fa-solid fa-user-plus"></i> Novo Usuario
                            </button>
                        </div>

                        <div id="usuariosPresenceResumo" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:16px;">
                            <div style="padding:14px; border:1px solid rgba(255,255,255,0.06); border-radius:8px; background:rgba(255,255,255,0.02);">
                                <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Online agora</div>
                                <strong id="usuariosOnlineAgora" style="font-size:22px; color:#4ade80;">0</strong>
                            </div>
                            <div style="padding:14px; border:1px solid rgba(255,255,255,0.06); border-radius:8px; background:rgba(255,255,255,0.02);">
                                <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Usuarios ativos</div>
                                <strong id="usuariosAtivosTotal" style="font-size:22px; color:#f8fafc;">0</strong>
                            </div>
                            <div style="padding:14px; border:1px solid rgba(255,255,255,0.06); border-radius:8px; background:rgba(255,255,255,0.02);">
                                <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Pendentes</div>
                                <strong id="usuariosPendentesTotal" style="font-size:22px; color:#f59e0b;">0</strong>
                            </div>
                        </div>

                        <div class="table-container">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>E-mail</th>
                                        <th>Perfil / Funcao</th>
                                        <th>Status / Presenca</th>
                                        <th style="text-align: right;">Acoes</th>
                                    </tr>
                                </thead>
                                <tbody id="tbodyConfigUsuarios">
                                    <tr>
                                        <td colspan="5" style="text-align: center; color: #888;">Carregando usuarios...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
