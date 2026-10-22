(function() {
    const html = `
        <section id="view-central-admin" class="view-section central-admin-view" style="display: none;">
            <div class="main-header">
                <div>
                    <h1><i class="fa-solid fa-shield-halved"></i> Central Admin Orquestra MAD360</h1>
                    <p>Area exclusiva do desenvolvedor para acompanhar clientes, configuracoes comerciais e acessos do sistema.</p>
                </div>
                <span class="central-admin-dev-badge"><i class="fa-solid fa-code"></i> Acesso do desenvolvedor</span>
            </div>

            <div class="central-admin-toolbar">
                <div class="central-admin-toolbar-copy">
                    <strong>Administracao central da serraria</strong>
                    <small>Os dados abaixo sao carregados do Firestore e podem ser revisados sem alterar a operacao diaria.</small>
                </div>
                <div class="central-admin-toolbar-actions">
                    <button type="button" class="btn-secondary" onclick="window.centralAdminVoltarConfiguracoes()">
                        <i class="fa-solid fa-arrow-left"></i> Configuracoes
                    </button>
                    <button type="button" class="btn-primary" onclick="window.centralAdminCarregar(true)">
                        <i class="fa-solid fa-rotate"></i> Atualizar
                    </button>
                </div>
            </div>

            <div class="central-admin-summary" aria-label="Resumo administrativo">
                <div class="central-admin-stat"><small>Clientes cadastrados</small><strong id="centralAdminTotalClientes">0</strong><span>Registros na colecao de clientes</span></div>
                <div class="central-admin-stat"><small>Clientes com e-mail</small><strong id="centralAdminTotalEmails">0</strong><span>Contatos comerciais preenchidos</span></div>
                <div class="central-admin-stat"><small>Usuarios do sistema</small><strong id="centralAdminTotalUsuarios">0</strong><span>Perfis registrados no acesso</span></div>
                <div class="central-admin-stat"><small>Ultima atualizacao</small><strong id="centralAdminUltimaAtualizacao">--</strong><span id="centralAdminStatusResumo">Aguardando carregamento</span></div>
            </div>

            <section class="central-admin-list-panel" aria-label="Clientes cadastrados">
                <div class="central-admin-list-head">
                    <div>
                        <h2><i class="fa-solid fa-building"></i> Clientes cadastrados</h2>
                        <p>Abra os detalhes operacionais ou edite os dados comerciais do cliente.</p>
                    </div>
                    <div class="central-admin-list-actions">
                        <input id="centralAdminBusca" class="central-admin-search" type="search" placeholder="Buscar por nome, CNPJ ou cidade..." autocomplete="off">
                    </div>
                </div>
                <div class="central-admin-table-wrap">
                    <table class="central-admin-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Base NF</th>
                                <th>Status</th>
                                <th>Cadastro</th>
                                <th>Ultima atualizacao</th>
                                <th>Contato</th>
                                <th>Acao</th>
                            </tr>
                        </thead>
                        <tbody id="centralAdminClientesBody">
                            <tr><td colspan="7" class="central-admin-loading"><span class="saw-loader" aria-hidden="true"></span> Carregando dados...</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <div id="centralAdminModal" class="central-admin-modal-backdrop" hidden>
                <div class="central-admin-modal" role="dialog" aria-modal="true" aria-labelledby="centralAdminModalTitle">
                    <div class="central-admin-modal-head">
                        <div>
                            <h2 id="centralAdminModalTitle">Editar cliente</h2>
                            <p>Atualize somente os dados comerciais necessarios.</p>
                        </div>
                        <button type="button" class="central-admin-modal-close" title="Fechar" onclick="window.centralAdminFecharModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <form id="centralAdminClienteForm" class="central-admin-form">
                        <div class="input-group"><label for="centralAdminNome">Nome do cliente</label><input id="centralAdminNome" name="nome" required></div>
                        <div class="input-group"><label for="centralAdminCnpj">CNPJ / CPF</label><input id="centralAdminCnpj" name="cnpj"></div>
                        <div class="input-group"><label for="centralAdminContato">Contato</label><input id="centralAdminContato" name="contato"></div>
                        <div class="input-group"><label for="centralAdminEmail">E-mail</label><input id="centralAdminEmail" name="email" type="email"></div>
                        <div class="input-group"><label for="centralAdminCidade">Cidade</label><input id="centralAdminCidade" name="cidade"></div>
                        <div class="input-group"><label for="centralAdminStatus">Status</label><select id="centralAdminStatus" name="status"><option value="ativo">Ativo</option><option value="pausado">Pausado</option><option value="inativo">Inativo</option></select></div>
                        <div class="input-group"><label for="centralAdminBaseNF">Base da nota</label><select id="centralAdminBaseNF" name="baseNF"><option value="INTEIRA">Nota inteira</option><option value="MEIA">Meia nota</option><option value="1/3">1/3 da nota</option><option value="1/4">1/4 da nota</option></select></div>
                        <div class="input-group"><label for="centralAdminPorcentagemNF">Porcentagem NF</label><input id="centralAdminPorcentagemNF" name="porcentagemNF" inputmode="decimal" placeholder="9,3"></div>
                        <div class="input-group"><label for="centralAdminFrete">Frete por m3</label><input id="centralAdminFrete" name="valorFrete" inputmode="decimal" placeholder="R$ 0,00"></div>
                        <div class="input-group"><label for="centralAdminPagamento">Forma de pagamento</label><input id="centralAdminPagamento" name="formaPagamento"></div>
                        <div class="input-group full"><label for="centralAdminObservacao">Observacoes internas</label><textarea id="centralAdminObservacao" name="observacao"></textarea></div>
                    </form>
                    <div class="central-admin-modal-actions">
                        <button type="button" class="btn-secondary" onclick="window.centralAdminFecharModal()">Cancelar</button>
                        <button type="submit" form="centralAdminClienteForm" class="btn-primary" id="centralAdminSalvarCliente"><i class="fa-solid fa-floppy-disk"></i> Salvar alteracoes</button>
                    </div>
                </div>
            </div>
        </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
