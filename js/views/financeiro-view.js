(function() {
    const html = `            <!-- ====== TELA: FINANCEIRO ====== -->
            <section id="view-financeiro" class="view-section" style="display: none;">
                <div class="main-header hide-on-print">
                    <h1><i class="fa-solid fa-sack-dollar"></i> Controle financeiro</h1>
                    <p>Organize boletos, impostos, notas, comprovantes e vencimentos em um só lugar.</p>
                </div>

                <div class="financeiro-view-tools hide-on-print">
                    <button type="button" class="financeiro-toggle-btn" onclick="window.toggleFinanceiroBloco('financeiroKpisWrap', this)"><i class="fa-solid fa-chart-simple"></i> Ver indicadores</button>
                    <button type="button" class="financeiro-toggle-btn" onclick="window.toggleFinanceiroBloco('financeiroPastas', this)"><i class="fa-solid fa-folder-tree"></i> Ver pastas</button>
                    <button type="button" class="financeiro-toggle-btn" onclick="window.toggleFinanceiroBloco('financeiroFormBody', this)"><i class="fa-solid fa-plus"></i> Novo registro</button>
                    <button type="button" class="financeiro-toggle-btn" onclick="window.toggleFinanceiroBloco('financeiroListaBody', this)"><i class="fa-solid fa-list"></i> Ver lista</button>
                </div>

                <div id="financeiroKpisWrap" class="dashboard-grid financeiro-kpis financeiro-collapsible hide-on-print" style="margin-bottom: 22px;">
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(239,68,68,0.12); color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="kpi-data"><h3 id="financeiroKpiVencidos">R$ 0,00</h3><p>Atrasado para pagar</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(245,158,11,0.12); color: #f59e0b;"><i class="fa-solid fa-calendar-day"></i></div><div class="kpi-data"><h3 id="financeiroKpiAberto">R$ 0,00</h3><p>Em aberto no mês</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(16,185,129,0.12); color: #10b981;"><i class="fa-solid fa-circle-check"></i></div><div class="kpi-data"><h3 id="financeiroKpiPagoMes">R$ 0,00</h3><p>Pago neste mês</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div><div class="kpi-data"><h3 id="financeiroKpiQtd">0</h3><p>Registros cadastrados</p></div></div>
                    <div class="kpi-card glass-panel"><div class="kpi-icon" style="background: rgba(220,38,38,0.14); color: #dc2626;"><i class="fa-solid fa-arrow-trend-down"></i></div><div class="kpi-data"><h3 id="financeiroKpiDespesas">R$ 0,00</h3><p>Total de despesas</p></div></div>
                </div>

                <div id="financeiroPastas" class="financeiro-folder-board financeiro-collapsible hide-on-print"></div>

                <div class="glass-panel financeiro-form-card hide-on-print">
                    <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px;">
                        <div><h3 id="financeiroTituloForm" style="margin:0;"><i class="fa-solid fa-plus-circle"></i> Novo documento financeiro</h3><small style="color:var(--text-muted);">Preencha os dados principais e anexe o boleto, nota ou comprovante.</small></div>
                        <div class="financeiro-card-tools"><button type="button" class="btn-secondary" onclick="window.limparFinanceiroForm()"><i class="fa-solid fa-eraser"></i> Limpar campos</button><button type="button" class="financeiro-collapse-icon" onclick="window.toggleFinanceiroBloco('financeiroFormBody', this)" title="Ocultar ou mostrar formulário"><i class="fa-solid fa-chevron-up"></i></button></div>
                    </div>

                    <div id="financeiroFormBody" class="financeiro-collapsible">
                    <form id="financeiroForm" class="financeiro-form-grid financeiro-form-clean">
                        <input type="hidden" id="financeiroId">
                        <div class="financeiro-form-section fin-section-documento"><i class="fa-solid fa-file-invoice"></i> Identificação do documento</div>
                        <div class="input-group fin-pasta"><label for="financeiroPasta">Pasta de destino</label><select id="financeiroPasta" onchange="window.atualizarSubpastasFinanceiro()"></select></div>
                        <div class="input-group fin-subpasta"><label for="financeiroSubpasta">Subpasta</label><input type="text" id="financeiroSubpasta" list="financeiroSubpastasList" placeholder="Ex: Receita Federal"><datalist id="financeiroSubpastasList"></datalist></div>
                        <div class="input-group fin-tipo"><label for="financeiroTipo">Tipo do registro</label><input type="text" id="financeiroTipo" list="financeiroClassesList" placeholder="Ex: Imposto" class="text-uppercase-input"><datalist id="financeiroClassesList"></datalist></div>
                        <div class="input-group fin-desc"><label for="financeiroDescricao">Fornecedor / descrição</label><input type="text" id="financeiroDescricao" list="financeiroDescricaoList" autocomplete="off" placeholder="Ex: FGTS, energia, fornecedor" class="text-uppercase-input"><datalist id="financeiroDescricaoList"></datalist></div>
                        <div class="input-group fin-venc"><label for="financeiroVencimento">Data de vencimento</label><input type="date" id="financeiroVencimento"></div>
                        <div class="input-group fin-valor"><label for="financeiroValor">Valor do documento</label><input type="text" id="financeiroValor" placeholder="R$ 0,00"></div>
                        <div class="input-group fin-status"><label>Pagamento</label><label class="financeiro-status-toggle" for="financeiroPago"><input type="checkbox" id="financeiroPago"><span id="financeiroStatusTexto">Não pago</span></label></div>
                        <div class="input-group fin-situacao"><label for="financeiroSituacaoDocumento">Condição do documento</label><select id="financeiroSituacaoDocumento" onchange="window.atualizarSituacaoFinanceiro?.()"><option value="A_PAGAR">A pagar / boleto recebido</option><option value="PAGO_A_VISTA">Pago à vista</option><option value="AGUARDANDO_BOLETO">Nota fiscal sem boleto</option><option value="AGUARDANDO_NOTA">Boleto sem nota fiscal</option></select></div>
                        <div class="financeiro-form-section fin-section-arquivo"><i class="fa-solid fa-paperclip"></i> Arquivo e leitura automática</div>
                        <div class="input-group fin-doc"><label for="financeiroDocumento">Arquivo principal</label><div class="financeiro-file-row"><select id="financeiroDocumentoCategoria" title="Tipo do arquivo"><option value="AUTO">Detectar tipo</option><option value="boleto">Boleto</option><option value="nota_fiscal">Nota fiscal</option><option value="xml">XML</option><option value="outro">Outro</option></select><label class="financeiro-file-compact" for="financeiroDocumento"><i class="fa-solid fa-file-arrow-up"></i> Escolher arquivo</label><input type="file" id="financeiroDocumento" accept=".pdf,.xml,text/xml,application/xml,image/*"><small id="financeiroDocumentoNome">Nenhum arquivo anexado</small><button type="button" id="btnLerDocumentoFinanceiro" class="btn-secondary" title="Ler dados do arquivo automaticamente"><i class="fa-solid fa-wand-magic-sparkles"></i></button></div></div>
                        <div class="financeiro-form-section fin-section-final"><i class="fa-solid fa-clipboard-check"></i> Observação e finalização</div>
                        <div class="input-group financeiro-obs fin-obs"><label for="financeiroObservacao">Observações internas</label><textarea id="financeiroObservacao" rows="2" placeholder="Parcela, referência, origem do boleto ou detalhe importante..."></textarea></div>
                        <div class="input-group fin-comprovante" style="display:none;"><label for="financeiroComprovante">Comprovante de pagamento</label><input type="file" id="financeiroComprovante" accept=".pdf,.xml,text/xml,application/xml,image/*"><small id="financeiroComprovanteNome">Nenhum comprovante anexado</small></div>
                        <div class="financeiro-form-actions fin-save"><button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Salvar registro</button></div>
                    </form>
                    </div>
                </div>

                <div class="glass-panel financeiro-list-card">
                    <div class="financeiro-list-header hide-on-print">
                        <div><h3 id="financeiroTituloLista" style="margin:0;">Documentos financeiros</h3><small id="financeiroResumoLista" style="color:var(--text-muted);">0 registros encontrados</small></div>
                        <div class="financeiro-list-actions">
                            <input type="file" id="financeiroArquivosInput" multiple accept=".pdf,.xml,text/xml,application/xml,image/*" style="display:none;">
                            <input type="file" id="financeiroPastaInput" webkitdirectory directory multiple accept=".pdf,.xml,text/xml,application/xml,image/*" style="display:none;">
                            <input type="file" id="financeiroFilaInput" multiple accept=".json,application/json" style="display:none;">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('financeiroArquivosInput')?.click()"><i class="fa-solid fa-file-arrow-up"></i> Importar arquivos</button>
                            <button type="button" class="btn-secondary" onclick="document.getElementById('financeiroPastaInput')?.click()" title="Importa todos os PDFs/XMLs da pasta selecionada"><i class="fa-solid fa-folder-open"></i> Importar pasta</button>
                            <button type="button" class="btn-secondary" onclick="document.getElementById('financeiroFilaInput')?.click()" title="Importa os arquivos JSON gerados pelo monitor local na pasta FINANCEIRO\\FILA"><i class="fa-solid fa-list-check"></i> Importar fila</button>
                            <button type="button" class="btn-secondary" onclick="window.limparDuplicadosFinanceiros()" title="Mantém o primeiro lançamento e remove cópias repetidas"><i class="fa-solid fa-copy"></i> Limpar duplicados</button>
                            <button type="button" class="btn-danger" id="btnExcluirFinanceiroSelecionados" onclick="window.excluirFinanceiroSelecionados()" style="display:none;"><i class="fa-solid fa-trash-can"></i> Excluir selecionados</button>
                            <button type="button" class="btn-secondary financeiro-btn-report" onclick="window.abrirRelatorioFinanceiro()"><i class="fa-solid fa-file-lines"></i> Gerar relatório</button>
                            <button type="button" class="financeiro-collapse-icon" onclick="window.toggleFinanceiroBloco('financeiroListaBody', this)" title="Ocultar ou mostrar lista"><i class="fa-solid fa-chevron-up"></i></button>
                        </div>
                        <div class="financeiro-filtros"><select id="financeiroFiltroStatus" onchange="window.renderFinanceiro()"><option value="TODOS">Todos os status</option><option value="ABERTO">Não pagos</option><option value="PENDENTE">Pendentes de conferência</option><option value="PAGO">Pagos</option><option value="VENCIDO">Vencidos</option></select><select id="financeiroOrdenacao" onchange="window.renderFinanceiro()"><option value="VENCIMENTO_ASC">Vencimento: mais antigo</option><option value="VENCIMENTO_DESC">Vencimento: mais recente</option><option value="CRIADO_DESC">Cadastro: mais recente</option><option value="CRIADO_ASC">Cadastro: mais antigo</option></select><input type="search" id="financeiroBusca" oninput="window.renderFinanceiro()" placeholder="Buscar por fornecedor, valor ou documento..."></div>
                    </div>
                    <div id="financeiroListaBody" class="table-responsive financeiro-collapsible">
                        <table class="financeiro-table">
                            <thead><tr><th><input type="checkbox" id="financeiroSelecionarTodos" onchange="window.marcarTodosFinanceiro(this.checked)" title="Selecionar todos"></th><th>Tipo</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Anexos</th><th>Ações</th></tr></thead>
                            <tbody id="financeiroLista"></tbody>
                        </table>
                    </div>
                </div>
                <div id="financeiroRelatorioCard" class="glass-panel financeiro-relatorio-card hide-on-print" style="display:none;">
                    <div class="financeiro-list-header">
                        <div><h3 style="margin:0;"><i class="fa-solid fa-file-lines"></i> Fechamento financeiro</h3><small style="color:var(--text-muted);">Filtre o período e selecione os registros que entram no relatório.</small></div>
                        <div class="financeiro-card-tools"><button type="button" class="btn-secondary" onclick="window.fecharRelatorioFinanceiro()"><i class="fa-solid fa-xmark"></i> Fechar</button><button type="button" class="financeiro-collapse-icon" onclick="window.toggleFinanceiroBloco('financeiroRelatorioBody', this)" title="Ocultar ou mostrar relatório"><i class="fa-solid fa-chevron-up"></i></button></div>
                    </div>
                    <div id="financeiroRelatorioBody" class="financeiro-collapsible">
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
                    <div class="financeiro-form-actions" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
                        <button type="button" class="btn-secondary" onclick="window.imprimirRelatorioFinanceiro()"><i class="fa-solid fa-print"></i> Imprimir</button>
                        <button type="button" class="btn-secondary" onclick="window.baixarPdfRelatorioFinanceiro()"><i class="fa-solid fa-file-pdf"></i> Baixar PDF</button>
                        <button type="button" class="btn-secondary" onclick="window.enviarRelatorioFinanceiroWhatsapp()"><i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp</button>
                    </div>
                    </div>
                </div>
            </section>

`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();

