(function() {
    const html = `            <!-- ====== TELA: HISTÓRICO DE CARGAS ====== -->
            <section id="view-historico" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-clock-rotate-left"></i> Histórico de Vendas</h1>
                    <p>Registro de todos os romaneios finalizados</p>
                </div>

                <div class="glass-panel" style="margin-bottom: 20px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
                        <div class="input-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
                            <label><i class="fa-solid fa-magnifying-glass"></i> Cliente ou romaneio</label>
                            <input type="search" id="filtroHistoricoCliente" placeholder="Digite o nome ou numero do romaneio...">
                        </div>
                        <div class="input-group" style="width: 200px; margin-bottom: 0;">
                            <label><i class="fa-solid fa-filter"></i> Tipo de Venda</label>
                            <select id="filtroHistoricoTipo" style="height: 48px;">
                                <option value="madeira">Madeira Serrada (Cargas)</option>
                                <option value="subprodutos">Subprodutos (Cavaco/Pó)</option>
                            </select>
                        </div>
                        <div class="input-group" style="width: 190px; margin-bottom: 0;">
                            <label><i class="fa-solid fa-box"></i> Produto</label>
                            <select id="filtroHistoricoProduto" style="height:48px;"><option value="">Todos os produtos</option></select>
                        </div>
                        <div class="input-group" style="width: 160px; margin-bottom: 0;"><label>Data inicial</label><input type="date" id="histRelDataInicio" style="height:48px;"></div>
                        <div class="input-group" style="width: 160px; margin-bottom: 0;"><label>Data final</label><input type="date" id="histRelDataFim" style="height:48px;"></div>
                        <button onclick="renderizarHistorico()" class="btn-primary" style="margin-top: 25px; height: 48px;"><i class="fa-solid fa-sync"></i> Atualizar</button>
                        <button onclick="window.gerarRelatorioHistoricoMensal && window.gerarRelatorioHistoricoMensal()" class="btn-primary" style="margin-top: 25px; height: 48px; background:#16a34a;"><i class="fa-solid fa-print"></i> Relatorio do Periodo</button>
                        <div id="histRelContador" style="margin-top:25px; height:48px; min-width:145px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(45,212,191,.35); border-radius:8px; color:#5eead4; font-weight:800;">0 selecionados</div>
                    </div>
                </div>

                <div class="glass-panel">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Romaneio Nº</th>
                                    <th>Data</th>
                                    <th>Cliente</th>
                                    <th>Volume Total</th>
                                    <th>Valor Total</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="listaHistorico">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
