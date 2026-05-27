(function() {
    const html = `            <!-- ====== TELA: TRANSPORTADORAS ====== -->
            <section id="view-transportes" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-truck"></i> Fretistas / Transportadoras</h1>
                    <p>Gerencie seus motoristas e caminhões</p>
                </div>

                <!-- TABS DE TRANSPORTADORAS -->
                <div style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap;">
                    <button type="button" id="btnTabTranspLista" onclick="window.switchTabTransportes('lista')" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-list"></i> Transportadoras Cadastradas
                    </button>
                    <button type="button" id="btnTabTranspForm" onclick="window.switchTabTransportes('form')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-truck-ramp-box"></i> Nova Transportadora
                    </button>
                </div>

                <!-- TAB: LISTA -->
                <div id="tabTranspLista" class="glass-panel" style="margin-bottom: 0;">
                    <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <h2><i class="fa-solid fa-list"></i> Transportadoras Cadastradas</h2>
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                            <input type="text" id="filtroTransportesBusca" placeholder="Buscar por nome, motorista, placa..." style="padding: 8px 12px; font-size: 0.9rem; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--panel-border);">
                            <select id="ordenarTransportes" style="height: 38px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--panel-border); padding: 0 10px;">
                                <option value="nome">Nome A-Z</option>
                                <option value="data-desc">Mais novo</option>
                                <option value="data-asc">Mais velho</option>
                            </select>
                        </div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Empresa/Contratante</th>
                                    <th>Motorista</th>
                                    <th>Modelo</th>
                                    <th>Placa</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="listaTransportes">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- TAB: FORMULÁRIO -->
                <div id="tabTranspForm" class="glass-panel" style="margin-bottom: 0; display: none;">
                    <div class="section-title">
                        <h2><i class="fa-solid fa-truck-ramp-box"></i> Nova Transportadora</h2>
                    </div>
                    <form id="formTransporte" class="grid-form">
                        <div class="input-group">
                            <label>Nome do Contratante / Transportadora *</label>
                            <input type="text" id="transNome" class="text-uppercase-input" required placeholder="Líder Transportes">
                        </div>
                        <div class="input-group">
                            <label>Nome do Motorista Responsável</label>
                            <input type="text" id="transMotorista" class="text-uppercase-input" placeholder="João da Silva">
                        </div>
                        <div class="input-group">
                            <label>Caminhão / Modelo</label>
                            <input type="text" id="transCaminhao" class="text-uppercase-input" placeholder="Scania 113H">
                        </div>
                        <div class="input-group">
                            <label>Placa do Veículo *</label>
                            <input type="text" id="transPlaca" class="text-uppercase-input" required placeholder="ABC-1234">
                        </div>
                        <div class="form-actions" style="grid-column: 1 / -1;">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-save"></i> Salvar Transportadora</button>
                        </div>
                    </form>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
