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
                            <label><i class="fa-solid fa-magnifying-glass"></i> Filtrar por Cliente</label>
                            <input type="text" id="filtroHistoricoCliente" placeholder="Digite o nome do cliente para buscar...">
                        </div>
                        <div class="input-group" style="width: 200px; margin-bottom: 0;">
                            <label><i class="fa-solid fa-filter"></i> Tipo de Venda</label>
                            <select id="filtroHistoricoTipo" style="height: 48px;">
                                <option value="madeira">Madeira Serrada (Cargas)</option>
                                <option value="subprodutos">Subprodutos (Cavaco/Pó)</option>
                            </select>
                        </div>
                        <button onclick="renderizarHistorico()" class="btn-primary" style="margin-top: 25px; height: 48px;"><i class="fa-solid fa-sync"></i> Atualizar</button>
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
