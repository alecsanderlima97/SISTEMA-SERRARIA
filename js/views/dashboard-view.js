(function() {
    const html = `            <!-- ====== HOME DASHBOARD ====== -->
            <section id="view-dashboard" class="view-section">
                <div class="main-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
                    <div>
                        <h1><i class="fa-solid fa-gauge-high"></i> Painel de Controle</h1>
                        <p>Visão geral do sistema e indicadores de desempenho</p>
                    </div>
                    <div class="hide-on-print" style="margin: 0; display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end;">
                        <button type="button" class="btn-action-card" id="btnAbrirControleProducao" onclick="window.abrirModalPatio()" style="padding: 12px 24px; gap: 10px;">
                            <i class="fa-solid fa-industry" style="font-size: 1.15rem;"></i> Controle de Produção
                        </button>
                        <button type="button" class="btn-action-card" id="btnAbrirFluxoPatio" onclick="window.abrirFluxoPatio()" style="padding: 12px 24px; gap: 10px; background: rgba(44,201,144,0.12); border-color: rgba(44,201,144,0.35);">
                            <i class="fa-solid fa-warehouse" style="font-size: 1.15rem;"></i> Fluxo do Patio
                        </button>
                    </div>
                </div>

                <div id="panelFluxoPatio" class="glass-panel" style="display: none; margin-bottom: 25px; padding: 22px; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px; margin-bottom: 16px;">
                        <div>
                            <h2 style="margin: 0; font-size: 1.25rem;"><i class="fa-solid fa-warehouse" style="color: var(--accent-color);"></i> Fluxo do Patio</h2>
                            <p id="fluxoPatioInfo" style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">Visao rapida do ultimo controle de producao salvo.</p>
                        </div>
                        <button type="button" class="btn-secondary" onclick="window.fecharFluxoPatio()" style="padding: 8px 14px; border-radius: 8px;"><i class="fa-solid fa-xmark"></i> Fechar</button>
                    </div>
                    <div id="fluxoPatioResumo" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px;"></div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Classe</th>
                                    <th>Cubagem</th>
                                    <th>Pacotes</th>
                                    <th>Volume</th>
                                </tr>
                            </thead>
                            <tbody id="fluxoPatioLista">
                                <tr><td colspan="4" style="text-align:center; padding: 18px; color: var(--text-muted);">Abra o fluxo para carregar os dados do patio.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div id="fluxoPatioClasses" style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;"></div>
                </div>

                <!-- Cards de Resumo -->
                <div class="dashboard-grid">
                    <div class="kpi-card glass-panel" data-dashboard-view="madeira">
                        <div class="kpi-icon"><i class="fa-solid fa-truck-moving"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-total-cargas">0</h3>
                            <p>Total de Cargas</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="madeira">
                        <div class="kpi-icon"><i class="fa-solid fa-layer-group"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-volume-total">0 m³</h3>
                            <p>Madeira Vendida</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="toras">
                        <div class="kpi-icon"><i class="fa-solid fa-tree"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-entrada-toras">0 m³</h3>
                            <p>Conferência de Cargas</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="madeira">
                        <div class="kpi-icon"><i class="fa-solid fa-dollar-sign"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-faturamento-madeira">R\$ 0,00</h3>
                            <p>Faturamento Madeira</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="subprodutos">
                        <div class="kpi-icon"><i class="fa-solid fa-leaf"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-faturamento-sub">R\$ 0,00</h3>
                            <p>Fat. Cavaco/Pó</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="subprodutos">
                        <div class="kpi-icon"><i class="fa-solid fa-fill-drip"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-volume-sub">0 m³</h3>
                            <p>Vol. Cavaco/Pó</p>
                        </div>
                    </div>
	                    <div class="kpi-card glass-panel" data-dashboard-view="rendimento">
	                        <div class="kpi-icon"><i class="fa-solid fa-industry"></i></div>
	                        <div class="kpi-data">
	                            <h3 id="dash-rendimento-serraria">0%</h3>
	                            <p>Rendimento Serraria</p>
	                        </div>
	                    </div>
	                    <div class="kpi-card glass-panel">
	                        <div class="kpi-icon"><i class="fa-solid fa-user-tie"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-total-clientes">0</h3>
                            <p>Clientes Ativos</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="estoque">
                        <div class="kpi-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-total-estoque">0</h3>
                            <p>Itens Acabando</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="despesas">
                        <div class="kpi-icon" style="color:#ef4444;"><i class="fa-solid fa-arrow-trend-down"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-despesas-mes">R\$ 0,00</h3>
                            <p>Despesas</p>
                        </div>
                    </div>
                    <div class="kpi-card glass-panel" data-dashboard-view="financeiro">
                        <div class="kpi-icon" style="color:#16a34a;"><i class="fa-solid fa-scale-balanced"></i></div>
                        <div class="kpi-data">
                            <h3 id="dash-comparativo-financeiro">R\$ 0,00</h3>
                            <p>Comparativo Financeiro</p>
                        </div>
                    </div>
                </div>

                <!-- Gráficos -->
                <div class="charts-container">
                    <div class="chart-box glass-panel" style="min-height: 360px; padding-bottom: 28px;">
	                        <h3 id="chartDashboardBarTitle"><i class="fa-solid fa-chart-bar"></i> Volume por Espessura</h3>
                        <canvas id="chartVolumeEspessura"></canvas>
                    </div>
                    <div class="chart-box glass-panel" style="min-height: 360px; padding-bottom: 28px;">
                        <h3><i class="fa-solid fa-chart-line"></i> Vendas por Período</h3>
	                        <canvas id="chartVendasPeriodo"></canvas>
	                </div>
                <div id="dashboardResumoAnalitico" class="glass-panel" style="margin-top: 20px; padding: 18px; border-radius: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                    <div><small style="color: var(--text-muted);">Maior carga</small><strong id="dash-resumo-maior-carga" style="display:block; color: var(--accent-color); margin-top: 4px;">-</strong></div>
                    <div><small style="color: var(--text-muted);">Dia mais vendido</small><strong id="dash-resumo-melhor-dia" style="display:block; color: var(--accent-color); margin-top: 4px;">-</strong></div>
                    <div><small style="color: var(--text-muted);">Mais vendidas</small><strong id="dash-resumo-madeiras" style="display:block; color: var(--accent-color); margin-top: 4px;">-</strong></div>
                </div>
                <div id="dashboardRelatorioMensal" class="glass-panel" style="margin-top: 14px; padding: 14px 16px; border-radius: 8px; display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap; opacity:0.92;">
                    <div>
                        <strong style="display:block;">Relatório mensal painel de controle</strong>
                        <small id="dash-relatorio-mensal-info" style="color: var(--text-muted);">Fechamento mensal ainda não salvo.</small>
                    </div>
                    <button type="button" class="btn-secondary" onclick="window.salvarRelatorioMensalDashboard && window.salvarRelatorioMensalDashboard()" style="padding:8px 12px;"><i class="fa-solid fa-floppy-disk"></i> Salvar mês</button>
                </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
