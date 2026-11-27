(function () {
    const html = `
        <section id="view-calculadora-comercial" class="view-section" style="display:none;">
            <div class="main-header calccom-header">
                <div>
                    <h1><i class="fa-solid fa-chart-line"></i> Calculadora Comercial</h1>
                    <p>Simule preços, taxas, descontos e margem líquida antes de registrar a operação.</p>
                </div>
                <span class="calccom-readonly-note"><i class="fa-solid fa-shield-halved"></i> Simulação sem alterar cadastros</span>
            </div>

            <div class="calccom-toolbar" role="toolbar" aria-label="Ações da calculadora comercial">
                <button type="button" id="btnCalcComNova" class="btn-secondary"><i class="fa-solid fa-rotate-left"></i> Nova simulação</button>
                <button type="button" id="btnCalcComSalvar" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Salvar simulação</button>
                <button type="button" id="btnCalcComWhatsApp" class="calccom-btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> Copiar WhatsApp</button>
                <button type="button" id="btnCalcComPdf" class="btn-secondary"><i class="fa-solid fa-file-pdf"></i> Gerar PDF</button>
            </div>

            <div id="calcComStatus" class="calccom-status" role="status" aria-live="polite" hidden></div>

            <nav class="calccom-tabs" role="tablist" aria-label="Calculadoras">
                <button type="button" id="btnCalcComTabComercial" class="calccom-tab is-active" role="tab" aria-selected="true" aria-controls="calcComComercialPanel"><i class="fa-solid fa-chart-line"></i> Calculadora Comercial</button>
                <button type="button" id="btnCalcComTabAuxiliares" class="calccom-tab" role="tab" aria-selected="false" aria-controls="calcComAuxiliaresPanel"><i class="fa-solid fa-square-root-variable"></i> Calculadoras auxiliares</button>
            </nav>

            <div id="calcComComercialPanel">
            <div class="calccom-layout">
                <div class="calccom-workspace">
                    <section class="calccom-panel calccom-settings-panel">
                        <div class="calccom-panel-head">
                            <div><span class="calccom-eyebrow">Configuração</span><h2>Parâmetros comerciais</h2></div>
                            <i class="fa-solid fa-sliders" aria-hidden="true"></i>
                        </div>
                        <div class="calccom-fields-grid">
                            <div class="calccom-field calccom-field-wide">
                                <label for="calcComTitulo">Nome da simulação</label>
                                <input id="calcComTitulo" type="text" placeholder="Ex.: Orçamento madeira de primeira">
                            </div>
                            <div class="calccom-field">
                                <label for="calcComCliente">Cliente cadastrado</label>
                                <select id="calcComCliente"><option value="">Sem cliente vinculado</option></select>
                            </div>
                            <div class="calccom-field">
                                <label for="calcComModalidade">Modalidade de cálculo</label>
                                <select id="calcComModalidade">
                                    <option value="acrescimo">Acréscimo simples</option>
                                    <option value="preservacao">Preservação do valor líquido</option>
                                    <option value="desconto">Desconto comercial</option>
                                    <option value="reajuste">Reajuste de preço</option>
                                    <option value="reverso">Cálculo reverso</option>
                                </select>
                            </div>
                            <div class="calccom-field">
                                <label for="calcComTaxa">Impostos / taxas (%)</label>
                                <input id="calcComTaxa" type="text" inputmode="decimal" value="9,3" placeholder="0,00">
                            </div>
                            <div class="calccom-field">
                                <label for="calcComDesconto">Desconto comercial (%)</label>
                                <input id="calcComDesconto" type="text" inputmode="decimal" value="0" placeholder="0,00">
                            </div>
                            <div class="calccom-field">
                                <label for="calcComFrete">Frete da operação (R$)</label>
                                <input id="calcComFrete" type="text" inputmode="decimal" value="0,00" placeholder="R$ 0,00">
                            </div>
                            <div class="calccom-field">
                                <label for="calcComOutras">Outras despesas (R$)</label>
                                <input id="calcComOutras" type="text" inputmode="decimal" value="0,00" placeholder="R$ 0,00">
                            </div>
                        </div>
                        <div id="calcComModoExtra" class="calccom-mode-extra" hidden>
                            <div class="calccom-field" data-mode-extra="reajuste">
                                <label for="calcComPrecoAntigo">Preço antigo (R$/m³)</label>
                                <input id="calcComPrecoAntigo" type="text" inputmode="decimal" placeholder="R$ 0,00">
                            </div>
                            <div class="calccom-field" data-mode-extra="reajuste">
                                <label for="calcComPrecoNovo">Preço novo (R$/m³)</label>
                                <input id="calcComPrecoNovo" type="text" inputmode="decimal" placeholder="R$ 0,00">
                            </div>
                            <div class="calccom-field" data-mode-extra="reverso">
                                <label for="calcComPrecoFinalReverso">Preço final informado (R$/m³)</label>
                                <input id="calcComPrecoFinalReverso" type="text" inputmode="decimal" placeholder="R$ 0,00">
                            </div>
                        </div>
                        <p class="calccom-helper"><i class="fa-solid fa-circle-info"></i> Os percentuais são parâmetros de simulação comercial e não substituem a apuração fiscal oficial.</p>
                    </section>

                    <section class="calccom-panel calccom-items-panel">
                        <div class="calccom-panel-head">
                            <div><span class="calccom-eyebrow">Itens da operação</span><h2>Produtos e quantidades</h2></div>
                            <button type="button" id="btnCalcComAddItem" class="calccom-icon-text-btn"><i class="fa-solid fa-plus"></i> Adicionar produto</button>
                        </div>
                        <div id="calcComItens" class="calccom-items-list"></div>
                        <datalist id="calcComProdutosDatalist"></datalist>
                    </section>

                    <details class="calccom-panel calccom-price-panel">
                        <summary><span><i class="fa-solid fa-tags"></i> Tabela de preços cadastrados</span><small>Consultar produtos e valores disponíveis</small></summary>
                        <div class="calccom-table-scroll">
                            <table class="calccom-table"><thead><tr><th>Produto</th><th>Classe / espécie</th><th>Preço m³</th><th></th></tr></thead><tbody id="calcComTabelaPrecos"><tr><td colspan="4">Carregando tabela...</td></tr></tbody></table>
                        </div>
                    </details>
                </div>

                <aside class="calccom-results" aria-label="Resultados da simulação">
                    <div class="calccom-result-head"><div><span class="calccom-eyebrow">Resultado em tempo real</span><h2>Resumo da operação</h2></div><span id="calcComResultadoModo" class="calccom-mode-badge">Acréscimo simples</span></div>
                    <div class="calccom-kpis">
                        <article class="calccom-kpi"><span>Preço original / m³</span><strong id="calcComKpiOriginal">R$ 0,00</strong></article>
                        <article class="calccom-kpi calccom-kpi-danger"><span>Impostos e taxas</span><strong id="calcComKpiImpostos">R$ 0,00</strong></article>
                        <article class="calccom-kpi calccom-kpi-danger"><span>Desconto comercial</span><strong id="calcComKpiDesconto">R$ 0,00</strong></article>
                        <article class="calccom-kpi"><span>Preço final / m³</span><strong id="calcComKpiFinal">R$ 0,00</strong></article>
                        <article class="calccom-kpi calccom-kpi-success"><span>Valor líquido / m³</span><strong id="calcComKpiLiquido">R$ 0,00</strong></article>
                        <article class="calccom-kpi"><span>Volume total</span><strong id="calcComKpiVolume">0,000 m³</strong></article>
                    </div>
                    <div class="calccom-total-block"><span>Valor total da carga</span><strong id="calcComKpiTotal">R$ 0,00</strong><small id="calcComKpiTotalDetail">Produtos + frete + outras despesas</small></div>
                    <div class="calccom-net-block"><span>Valor líquido total da operação</span><strong id="calcComKpiLiquidoTotal">R$ 0,00</strong><small>Após impostos, descontos e despesas informadas</small></div>
                    <div class="calccom-comparison">
                        <div class="calccom-subhead"><strong>Comparação de modalidades</strong><small>Sem alterar os campos atuais</small></div>
                        <div class="calccom-compare-row"><span>Acréscimo simples</span><strong id="calcComCompSimples">R$ 0,00/m³</strong><em id="calcComCompSimplesTotal">R$ 0,00</em></div>
                        <div class="calccom-compare-row"><span>Preservação do valor líquido</span><strong id="calcComCompPreserva">R$ 0,00/m³</strong><em id="calcComCompPreservaTotal">R$ 0,00</em></div>
                    </div>
                    <div id="calcComReajusteResumo" class="calccom-adjustment-summary" hidden>Reajuste calculado: <strong id="calcComReajustePercent">0,00%</strong></div>
                    <div id="calcComErros" class="calccom-errors" hidden></div>
                </aside>
            </div>

            <section class="calccom-panel calccom-history-panel">
                <div class="calccom-panel-head"><div><span class="calccom-eyebrow">Registro comercial</span><h2>Histórico de simulações</h2></div><button type="button" id="btnCalcComAtualizarHistorico" class="calccom-icon-btn" title="Atualizar histórico"><i class="fa-solid fa-rotate"></i></button></div>
                <div id="calcComHistorico" class="calccom-history-list"><div class="calccom-empty-state">Nenhuma simulação salva ainda.</div></div>
            </section>
            </div>

            <div id="calcComAuxiliaresPanel" role="tabpanel" aria-labelledby="btnCalcComTabAuxiliares" hidden></div>
        </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
