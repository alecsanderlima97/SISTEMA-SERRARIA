(function() {
    const html = `            <!-- ====== TELA: CONTROLE DE FROTAS ====== -->
            <section id="view-frotas" class="view-section" style="display: none;">
                <div class="main-header hide-on-print">
                    <h1><i class="fa-solid fa-truck-pickup"></i> Controle de Frota &amp; Equipamentos</h1>
                    <p>Gestão de veículos por setor, abastecimentos e manutenções com integração de estoque.</p>
                </div>

                <!-- KPI / Contadores da Frota -->
                <div class="dashboard-grid hide-on-print" style="margin-bottom: 25px;">
                    <div class="kpi-card glass-panel" style="padding: 15px;">
                        <div class="kpi-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;"><i class="fa-solid fa-truck-moving"></i></div>
                        <div class="kpi-data">
                            <h3 id="frota-kpi-total">0</h3>
                            <p>Frota Cadastrada</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" style="padding: 15px;">
                        <div class="kpi-icon" style="background: rgba(16,185,129,0.1); color: #10b981;"><i class="fa-solid fa-industry"></i></div>
                        <div class="kpi-data">
                            <h3 id="frota-kpi-serraria">0</h3>
                            <p>Setor Serraria</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" style="padding: 15px;">
                        <div class="kpi-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b;"><i class="fa-solid fa-tree"></i></div>
                        <div class="kpi-data">
                            <h3 id="frota-kpi-florestal">0</h3>
                            <p>Setor Florestal</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" style="padding: 15px;">
                        <div class="kpi-icon" style="background: rgba(239,68,68,0.1); color: #ef4444;"><i class="fa-solid fa-person-digging"></i></div>
                        <div class="kpi-data">
                            <h3 id="frota-kpi-terraplanagem">0</h3>
                            <p>Terraplanagem</p>
                        </div>
                    </div>
                </div>

                <!-- TABS DE FROTAS -->
                <div class="tabs-container hide-on-print" style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap;">
                    <button type="button" class="btn-tab-frota active" onclick="window.switchTabFrotas('lista')" id="btnTabFrotaLista" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-truck-moving"></i> Veículos &amp; Máquinas
                    </button>
                    <button type="button" class="btn-tab-frota" onclick="window.switchTabFrotas('form')" id="btnTabFrotaForm" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-plus-circle"></i> <span id="lblTabFrotaForm">Novo Veículo / Máquina</span>
                    </button>
                </div>

                <!-- TAB: LISTA (Setor Filtros + Grid) -->
                <div id="panelListaFrotas" style="width: 100%;">
                    <!-- Barra de Filtros -->
                    <div class="hide-on-print" style="display: flex; justify-content: flex-start; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                        <!-- Setor Filtros Tabs -->
                        <div style="display: flex; gap: 8px; background: rgba(255,255,255,0.03); padding: 5px; border-radius: 10px; border: 1px solid var(--panel-border);">
                            <button type="button" class="btn-action-card active" onclick="window.filtrarFrota('TODOS')" id="btn-frota-todos" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 6px;">Todos</button>
                            <button type="button" class="btn-action-card" onclick="window.filtrarFrota('SERRARIA')" id="btn-frota-serraria" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 6px;">Serraria</button>
                            <button type="button" class="btn-action-card" onclick="window.filtrarFrota('FLORESTAL')" id="btn-frota-florestal" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 6px;">Florestal</button>
                            <button type="button" class="btn-action-card" onclick="window.filtrarFrota('TERRAPLANAGEM')" id="btn-frota-terraplanagem" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 6px;">Terraplanagem</button>
                        </div>
                        <input type="text" id="buscaFrota" placeholder="Buscar veículo, máquina ou placa..." style="padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--panel-border); min-width: 230px;">
                        <select id="ordenarFrota" style="height: 36px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--panel-border); padding: 0 10px;">
                            <option value="nome">Nome A-Z</option>
                            <option value="data-desc">Mais novo</option>
                            <option value="data-asc">Mais velho</option>
                        </select>
                    </div>

                <!-- TAB: FORMULÁRIO -->
                <div class="glass-panel hide-on-print" id="cardFormFrota" style="display: none; margin-bottom: 20px; padding: 20px; max-width: 800px; margin: 0 auto 20px auto;">
                    <h3 style="margin: 0 0 15px 0;" id="formFrotaTitulo"><i class="fa-solid fa-truck-pickup"></i> Novo Veículo</h3>
                    <form id="formFrota" class="grid-form">
                        <input type="hidden" id="veiculoId">
                        
                        <div class="input-group">
                            <label for="veicModelo">Modelo / Descrição</label>
                            <input type="text" id="veicModelo" placeholder="Ex: CAMINHÃO VOLVO VM 270" class="text-uppercase-input">
                        </div>

                        <div class="input-group">
                            <label for="veicCodigo">Código da Máquina</label>
                            <input type="text" id="veicCodigo" placeholder="Gerado automaticamente" class="text-uppercase-input">
                        </div>

                        <div class="input-group">
                            <label for="veicPlaca">Placa / Prefixo</label>
                            <input type="text" id="veicPlaca" placeholder="Ex: ABC-1234 ou MAQ-02" class="text-uppercase-input">
                        </div>

                        <div class="input-group">
                            <label for="veicGrupo">Setor / Grupo</label>
                            <select id="veicGrupo">
                                <option value="SERRARIA">SERRARIA</option>
                                <option value="FLORESTAL">FLORESTAL</option>
                                <option value="TERRAPLANAGEM">TERRAPLANAGEM</option>
                            </select>
                        </div>

                        <div class="input-group">
                            <label for="veicStatus">Status Operacional</label>
                            <select id="veicStatus">
                                <option value="OK">OK</option>
                                <option value="AGUARDANDO">AGUARDANDO</option>
                                <option value="MANUTENCAO">EM MANUTENCAO</option>
                            </select>
                        </div>

                        <div class="input-group">
                            <label for="veicAno">Ano de Fabricação</label>
                            <input type="number" id="veicAno" min="1980" max="2030" placeholder="Ex: 2021">
                        </div>

                        <!-- Anexar Documento do Veículo -->
                        <div class="input-group" style="grid-column: span 2;">
                            <label for="veicDocumento">Documento do Veículo (PDF / Imagem)</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="file" id="veicDocumento" style="display: none;" onchange="window.handleDocumentoUpload(event)">
                                <button type="button" class="btn-secondary" onclick="document.getElementById('veicDocumento').click()" style="padding: 10px 16px; border-radius: 8px;">
                                    <i class="fa-solid fa-paperclip"></i> Anexar Documento
                                </button>
                                <span id="lblDocumentoNome" style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Nenhum arquivo anexado</span>
                                <input type="hidden" id="veicDocumentoBase64">
                            </div>
                        </div>

                        <div style="grid-column: span 3; display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                            <button type="button" class="btn-secondary" id="btnCancelarFrota" style="padding: 10px 20px;">Cancelar</button>
                            <button type="submit" class="btn-primary" style="padding: 10px 25px;">Salvar Veículo</button>
                        </div>
                    </form>
                </div>

                    <!-- Grid de Veículos / Máquinas Cadastradas -->
                    <div class="grid-form" id="gridVeiculosFrota" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; display: grid;">
                        <!-- Preenchido dinamicamente via JS -->
                    </div>
                </div> <!-- Fim de panelListaFrotas -->
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
