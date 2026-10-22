(function() {
    const html = `
        <section id="view-central-admin" class="view-section central-admin-view" style="display: none;">
            <div class="main-header">
                <div>
                    <h1><i class="fa-solid fa-shield-halved"></i> Central Admin Orquestra.cs</h1>
                    <p>Central exclusiva da Orquestra.cs para clientes pagantes, planos, acessos e sincronização.</p>
                </div>
                <span class="central-admin-dev-badge"><i class="fa-solid fa-code"></i> Acesso do desenvolvedor</span>
            </div>

            <div class="central-admin-toolbar">
                <div class="central-admin-toolbar-copy">
                    <strong>Admin Orquestra.cs</strong>
                    <small>Controle comercial dos clientes, convites, planos e status de assinatura.</small>
                    <span class="central-admin-notice"><i class="fa-solid fa-circle-info"></i> O cliente pagante atual é Vanmarte. Dados de cobrança ficam no Portal Orquestra.cs.</span>
                </div>
                <div class="central-admin-toolbar-actions">
                    <button type="button" class="btn-secondary" onclick="window.centralAdminVoltarConfiguracoes()">
                        <i class="fa-solid fa-arrow-left"></i> Configurações
                    </button>
                    <button type="button" class="btn-secondary" onclick="window.centralAdminAbrirPortal()">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Portal
                    </button>
                    <button type="button" class="btn-primary" id="centralAdminSincronizar" onclick="window.centralAdminSincronizarPortal()">
                        <i class="fa-solid fa-arrows-rotate"></i> Sincronizar Portal
                    </button>
                </div>
            </div>

            <div class="central-admin-summary" aria-label="Resumo administrativo">
                <div class="central-admin-stat"><small>Cliente pagante</small><strong id="centralAdminTotalClientes">1</strong><span>Empresa administrada pela Orquestra.cs</span></div>
                <div class="central-admin-stat"><small>Usuários vinculados</small><strong id="centralAdminTotalEmails">0</strong><span>Usuários da empresa Vanmarte</span></div>
                <div class="central-admin-stat"><small>Online agora</small><strong id="centralAdminTotalUsuarios">0</strong><span>Presença registrada no MAD360</span></div>
                <div class="central-admin-stat"><small>Sincronização</small><strong id="centralAdminUltimaAtualizacao">Pendente</strong><span id="centralAdminStatusResumo">Aguardando carregamento</span></div>
            </div>

            <section class="central-admin-list-panel" aria-label="Clientes Orquestra.cs">
                <div class="central-admin-list-head">
                    <div>
                        <h2><i class="fa-solid fa-building"></i> Clientes Orquestra.cs</h2>
                        <p>Os clientes comerciais da serraria não aparecem aqui. Esta tela administra apenas o vínculo com a plataforma Orquestra.cs.</p>
                    </div>
                    <div class="central-admin-list-actions">
                        <input id="centralAdminBusca" class="central-admin-search" type="search" placeholder="Buscar por nome ou e-mail..." autocomplete="off">
                    </div>
                </div>
                <div class="central-admin-table-wrap">
                    <table class="central-admin-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Plano</th>
                                <th>Status</th>
                                <th>Inscrição</th>
                                <th>Vencimento</th>
                                <th>Situação calculada</th>
                                <th>Último acesso</th>
                                <th>Online</th>
                                <th>Créditos IA</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody id="centralAdminClientesBody">
                            <tr><td colspan="10" class="central-admin-loading"><span class="saw-loader" aria-hidden="true"></span> Carregando dados de Vanmarte...</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <div id="centralAdminModal" class="central-admin-modal-backdrop" hidden>
                <div class="central-admin-modal" role="dialog" aria-modal="true" aria-labelledby="centralAdminModalTitle">
                    <div class="central-admin-modal-head">
                        <div>
                            <small class="central-admin-modal-eyebrow">CADASTRO COMPLETO DO CLIENTE</small>
                            <h2 id="centralAdminModalTitle">Dados de Vanmarte</h2>
                            <p>O cadastro comercial, plano e cobrança são editados na Central Admin do Portal.</p>
                        </div>
                        <button type="button" class="central-admin-modal-close" title="Fechar" onclick="window.centralAdminFecharModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="central-admin-form">
                        <div class="input-group"><label for="centralAdminEmpresaNome">Nome da empresa</label><input id="centralAdminEmpresaNome" readonly></div>
                        <div class="input-group"><label for="centralAdminEmpresaEmail">E-mail comercial</label><input id="centralAdminEmpresaEmail" type="email" readonly></div>
                        <div class="input-group"><label for="centralAdminEmpresaProduto">Produto conectado</label><input id="centralAdminEmpresaProduto" readonly></div>
                        <div class="input-group"><label for="centralAdminEmpresaId">Identificador externo</label><input id="centralAdminEmpresaId" readonly></div>
                        <div class="input-group"><label for="centralAdminEmpresaStatus">Status do acesso</label><input id="centralAdminEmpresaStatus" readonly></div>
                        <div class="input-group"><label for="centralAdminEmpresaPlano">Plano comercial</label><input id="centralAdminEmpresaPlano" readonly></div>
                        <div class="input-group full"><label for="centralAdminEmpresaCobranca">Área responsável pela cobrança</label><input id="centralAdminEmpresaCobranca" readonly></div>
                    </div>
                    <div class="central-admin-modal-actions">
                        <button type="button" class="btn-secondary" onclick="window.centralAdminFecharModal()">Fechar</button>
                        <button type="button" class="btn-primary" onclick="window.centralAdminFecharModal(); window.centralAdminAbrirPortal()"><i class="fa-solid fa-arrow-up-right-from-square"></i> Editar no Portal</button>
                    </div>
                </div>
            </div>
        </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
