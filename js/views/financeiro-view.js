(function() {
    const html = `            <!-- ====== TELA: FINANCEIRO ====== -->
            <section id="view-financeiro" class="view-section" style="display: none;">
                <div class="main-header hide-on-print">
                    <h1><i class="fa-solid fa-sack-dollar"></i> Financeiro</h1>
                    <p>Controle de despesas, boletos, impostos e contas fixas com anexos e status de pagamento.</p>
                </div>

                <div class="dashboard-grid financeiro-kpis hide-on-print" style="margin-bottom: 22px;">
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(239,68,68,0.12); color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="kpi-data"><h3 id="financeiroKpiVencidos">R$ 0,00</h3><p>Vencidos / atrasados</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(245,158,11,0.12); color: #f59e0b;"><i class="fa-solid fa-calendar-day"></i></div><div class="kpi-data"><h3 id="financeiroKpiAberto">R$ 0,00</h3><p>Em aberto</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(16,185,129,0.12); color: #10b981;"><i class="fa-solid fa-circle-check"></i></div><div class="kpi-data"><h3 id="financeiroKpiPagoMes">R$ 0,00</h3><p>Pago no mês</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(37,99,235,0.12); color: #2563eb;"><i class="fa-solid fa-file-invoice-dollar"></i></div><div class="kpi-data"><h3 id="financeiroKpiQtd">0</h3><p>Registros financeiros</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(220,38,38,0.14); color: #dc2626;"><i class="fa-solid fa-arrow-trend-down"></i></div><div class="kpi-data"><h3 id="financeiroKpiDespesas">R$ 0,00</h3><p>Despesas</p></div></div>
                </div>

                <div class="tabs-container hide-on-print financeiro-tabs">
                    <button type="button" class="btn-tab-financeiro active" onclick="window.switchFinanceiroAba('despesas-gerais')" data-fin-tab="despesas-gerais"><i class="fa-solid fa-receipt"></i> Despesas Gerais</button>
                    <button type="button" class="btn-tab-financeiro" onclick="window.switchFinanceiroAba('boletos')" data-fin-tab="boletos"><i class="fa-solid fa-barcode"></i> Boletos Aleatórios</button>
                    <button type="button" class="btn-tab-financeiro" onclick="window.switchFinanceiroAba('impostos')" data-fin-tab="impostos"><i class="fa-solid fa-landmark"></i> Impostos</button>
                    <button type="button" class="btn-tab-financeiro" onclick="window.switchFinanceiroAba('despesas-fixas')" data-fin-tab="despesas-fixas"><i class="fa-solid fa-repeat"></i> Despesas Fixas</button>
                </div>

                <div class="glass-panel financeiro-form-card hide-on-print">
                    <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px;">
                        <div><h3 id="financeiroTituloForm" style="margin:0;"><i class="fa-solid fa-plus-circle"></i> Novo lançamento financeiro</h3><small style="color:var(--text-muted);">Cadastre contas, impostos, boletos e despesas com comprovantes.</small></div>
                        <button type="button" class="btn-secondary" onclick="window.limparFinanceiroForm()"><i class="fa-solid fa-eraser"></i> Limpar</button>
                    </div>

                    <form id="financeiroForm" class="financeiro-form-grid">
                        <input type="hidden" id="financeiroId">
                        <div class="input-group"><label for="financeiroTipo">Tipo / Classe</label><input type="text" id="financeiroTipo" list="financeiroClassesList" placeholder="Ex: IMPOSTO, BOLETO, MULTA" class="text-uppercase-input"><datalist id="financeiroClassesList"></datalist></div>
                        <div class="input-group"><label for="financeiroDescricao">Descrição</label><input type="text" id="financeiroDescricao" list="financeiroDescricaoList" placeholder="Ex: FGTS, ENERGIA, INTERNET" class="text-uppercase-input"><datalist id="financeiroDescricaoList"></datalist></div>
                        <div class="input-group"><label for="financeiroVencimento">Data de vencimento</label><input type="date" id="financeiroVencimento"></div>
                        <div class="input-group"><label for="financeiroValor">Valor</label><input type="text" id="financeiroValor" placeholder="R$ 0,00"></div>
                        <div class="input-group"><label>Status</label><label class="financeiro-status-toggle" for="financeiroPago"><input type="checkbox" id="financeiroPago"><span id="financeiroStatusTexto">Não pago</span></label></div>
                        <div class="input-group financeiro-obs"><label for="financeiroObservacao">Observação</label><textarea id="financeiroObservacao" rows="2" placeholder="Referência, parcela, fornecedor ou detalhe importante..."></textarea></div>
                        <div class="input-group"><label for="financeiroDocumento">Documento</label><input type="file" id="financeiroDocumento" accept=".pdf,image/*"><small id="financeiroDocumentoNome">Nenhum documento anexado</small></div>
                        <div class="input-group"><label for="financeiroComprovante">Comprovante PG</label><input type="file" id="financeiroComprovante" accept=".pdf,image/*"><small id="financeiroComprovanteNome">Nenhum comprovante anexado</small></div>
                        <div class="financeiro-form-actions"><button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Salvar lançamento</button></div>
                    </form>
                </div>

                <div class="glass-panel financeiro-list-card">
                    <div class="financeiro-list-header hide-on-print">
                        <div><h3 id="financeiroTituloLista" style="margin:0;">Despesas Gerais</h3><small id="financeiroResumoLista" style="color:var(--text-muted);">0 registros</small></div>
                        <button type="button" class="btn-primary" onclick="window.abrirRelatorioFinanceiro()"><i class="fa-solid fa-file-lines"></i> Gerar relatório</button>
                        <div class="financeiro-filtros"><select id="financeiroFiltroStatus" onchange="window.renderFinanceiro()"><option value="TODOS">Todos</option><option value="ABERTO">Não pagos</option><option value="PAGO">Pagos</option><option value="VENCIDO">Vencidos</option></select><input type="search" id="financeiroBusca" oninput="window.renderFinanceiro()" placeholder="Buscar lançamento..."></div>
                    </div>
                    <div class="table-responsive">
                        <table class="financeiro-table">
                            <thead><tr><th>Tipo</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Anexos</th><th>Ações</th></tr></thead>
                            <tbody id="financeiroLista"></tbody>
                        </table>
                    </div>
                </div>
                <div id="financeiroRelatorioCard" class="glass-panel financeiro-relatorio-card hide-on-print" style="display:none;">
                    <div class="financeiro-list-header">
                        <div><h3 style="margin:0;"><i class="fa-solid fa-file-lines"></i> Relatório financeiro</h3><small style="color:var(--text-muted);">Escolha o período e marque os lançamentos desejados.</small></div>
                        <button type="button" class="btn-secondary" onclick="window.fecharRelatorioFinanceiro()"><i class="fa-solid fa-xmark"></i> Fechar</button>
                    </div>
                    <div class="financeiro-relatorio-filtros">
                        <div class="input-group"><label for="financeiroRelatorioInicio">Início</label><input type="date" id="financeiroRelatorioInicio"></div>
                        <div class="input-group"><label for="financeiroRelatorioFim">Fim</label><input type="date" id="financeiroRelatorioFim"></div>
                        <div class="input-group"><label for="financeiroRelatorioStatus">Status</label><select id="financeiroRelatorioStatus"><option value="TODOS">Todos</option><option value="ABERTO">Não pagos</option><option value="PAGO">Pagos</option><option value="VENCIDO">Vencidos</option></select></div>
                        <div class="financeiro-form-actions"><button type="button" class="btn-secondary" onclick="window.prepararRelatorioFinanceiro()"><i class="fa-solid fa-filter"></i> Filtrar</button></div>
                    </div>
                    <div id="financeiroRelatorioResumo" class="financeiro-relatorio-resumo"></div>
                    <div class="table-responsive">
                        <table class="financeiro-table">
                            <thead><tr><th><input type="checkbox" id="financeiroRelatorioTodos" onchange="window.marcarTodosRelatorioFinanceiro(this.checked)"></th><th>Tipo</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
                            <tbody id="financeiroRelatorioLista"></tbody>
                        </table>
                    </div>
                    <div class="financeiro-form-actions" style="margin-top:14px;"><button type="button" class="btn-primary" onclick="window.imprimirRelatorioFinanceiro()"><i class="fa-solid fa-print"></i> Imprimir relatório</button></div>
                </div>
            </section>

`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();

