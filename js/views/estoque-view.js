(function() {
    const html = `        <!-- ====== TELA: CONTROLE DE ESTOQUE ====== -->
        <section id="view-estoque" class="view-section" style="display: none;">
            <div class="main-header">
                <h1><i class="fa-solid fa-boxes-stacked"></i> Estoque</h1>
                <p>Resumo, itens, movimentações e lançamentos manuais do almoxarifado</p>
            </div>

                <!-- TABS DE ESTOQUE -->
                <div class="tabs-container" style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap;">
                    <button type="button" class="btn-tab-estoque active" onclick="window.switchTabEstoque('resumo')" id="btnTabEstoqueResumo" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <i class="fa-solid fa-chart-simple"></i> Resumo
                    </button>
                    <button type="button" class="btn-tab-estoque active" onclick="window.switchTabEstoque('inventario')" id="btnTabEstoqueInventario" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <i class="fa-solid fa-cubes"></i> Itens
                    </button>
                    <button type="button" class="btn-tab-estoque" onclick="window.switchTabEstoque('movimentacoes')" id="btnTabEstoqueMovimentacoes" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <i class="fa-solid fa-right-left"></i> Movimentações
                    </button>
                    <button type="button" class="btn-tab-estoque" onclick="window.switchTabEstoque('tanques')" id="btnTabEstoqueTanques" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <i class="fa-solid fa-gas-pump"></i> Tanques
                    </button>
                    <button type="button" class="btn-tab-estoque" onclick="window.switchTabEstoque('lancar')" id="btnTabEstoqueLancar" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <i class="fa-solid fa-plus-minus"></i> Lançar Movimento
                    </button>
                </div>

                <!-- SUB-VIEW 0: RESUMO OPERACIONAL -->
                <div id="subview-estoque-resumo" class="subview-estoque-section">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="glass-panel" style="padding: 18px; border-radius: 12px;">
                            <small style="color: var(--text-muted);">Diesel no tanque</small>
                            <strong id="estoqueResumoDiesel" style="display:block; color:#eab308; font-size:1.4rem; margin-top:6px;">0 L</strong>
                        </div>
                        <div class="glass-panel" style="padding: 18px; border-radius: 12px;">
                            <small style="color: var(--text-muted);">Itens cadastrados</small>
                            <strong id="estoqueResumoItens" style="display:block; color:var(--accent-color); font-size:1.4rem; margin-top:6px;">0</strong>
                        </div>
                        <div class="glass-panel" style="padding: 18px; border-radius: 12px;">
                            <small style="color: var(--text-muted);">Itens acabando</small>
                            <strong id="estoqueResumoAcabando" style="display:block; color:#f87171; font-size:1.4rem; margin-top:6px;">0</strong>
                        </div>
                        <div class="glass-panel" style="padding: 18px; border-radius: 12px;">
                            <small style="color: var(--text-muted);">Valor estimado</small>
                            <strong id="estoqueResumoValor" style="display:block; color:#60a5fa; font-size:1.4rem; margin-top:6px;">R\$ 0,00</strong>
                        </div>
                    </div>
                    <div class="glass-panel" style="padding: 20px; border-radius: 16px;">
                        <div class="section-title" style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                            <h2><i class="fa-solid fa-triangle-exclamation"></i> Itens que precisam de atenção</h2>
                            <button type="button" class="btn-primary" onclick="window.switchTabEstoque('inventario'); const chk=document.getElementById('chkEstoqueAcabando'); if(chk){chk.checked=true; window.filtrarEstoque();}" style="padding: 8px 14px; border-radius: 8px; font-size: 0.85rem;">Ver itens</button>
                        </div>
                        <div id="estoqueResumoListaBaixa" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px;"></div>
                    </div>
                </div>

                <!-- SUB-VIEW 1: INVENTÁRIO FÍSICO -->
                <div id="subview-estoque-inventario" class="subview-estoque-section" style="display: none;">
                    <!-- Categorias de Atalho Rápido -->
                    <div class="glass-panel" style="margin-bottom: 2rem; padding: 20px;">
                        <div class="section-title" style="margin-bottom: 15px;">
                            <h2><i class="fa-solid fa-filter"></i> Filtrar por Categoria</h2>
                        </div>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; text-align:center;">
                            <div class="category-card-estoque active" onclick="window.filtrarPorCategoriaEstoque('TODAS')" id="catCard_TODAS" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--accent-color); transition: all 0.2s;">
                                <i class="fa-solid fa-border-all" style="font-size: 1.4rem; color: var(--accent-color); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.8rem; font-weight: bold; color: white;">TODAS</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('ESCRITÓRIO')" id="catCard_ESCRITORIO" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-stapler" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.8rem; font-weight: 500;">Escritório</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('EPI\\'S')" id="catCard_EPIS" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-helmet-safety" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.8rem; font-weight: 500;">EPI's</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('CORREIAS INDUSTRIAIS')" id="catCard_CORREIAS" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-gears" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.76rem; font-weight: 500; white-space: nowrap;">Correias</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('SERRAS E FACAS P/ PICADOR')" id="catCard_SERRAS_FACAS" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-scissors" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.72rem; font-weight: 500;">Serras/Facas</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('PEÇAS')" id="catCard_PEÇAS" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-screwdriver-wrench" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.8rem; font-weight: 500;">Peças</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('FILTROS')" id="catCard_FILTROS" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-filter" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.8rem; font-weight: 500;">Filtros</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('LUBRIFICANTES')" id="catCard_LUBRIFICANTES" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-oil-can" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.8rem; font-weight: 500;">Lubrificantes</span>
                            </div>
                            <div class="category-card-estoque" onclick="window.filtrarPorCategoriaEstoque('DIESEL')" id="catCard_DIESEL" style="cursor: pointer; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); transition: all 0.2s;">
                                <i class="fa-solid fa-gas-pump" style="font-size: 1.4rem; color: var(--text-muted); margin-bottom: 6px; display: block;"></i>
                                <span style="font-size: 0.8rem; font-weight: 500;">Diesel</span>
                            </div>
                        </div>
                    </div>

                    <!-- Inventário e Filtros Dinâmicos -->
                    <div class="glass-panel hide-on-print" style="padding: 20px; border-radius: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 15px; margin-bottom: 15px; flex-wrap: wrap; gap: 15px;">
                            <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-cubes" style="color: var(--accent-color);"></i> Itens do Estoque
                            </h3>
                            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                                <!-- Busca -->
                                <input type="text" id="buscaEstoque" placeholder="🔍 Buscar item..." oninput="window.filtrarEstoque()" style="border-radius: 8px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px 12px; font-size: 0.85rem; width: 180px;">
                                <select id="ordenarEstoque" onchange="window.filtrarEstoque()" style="height: 36px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--panel-border); padding: 0 10px;">
                                    <option value="nome">Nome A-Z</option>
                                    <option value="data-desc">Mais novo</option>
                                    <option value="data-asc">Mais velho</option>
                                </select>
                                
                                <!-- Toggle de Acabando -->
                                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; color: #f87171;">
                                    <input type="checkbox" id="chkEstoqueAcabando" onchange="window.filtrarEstoque()" style="accent-color: #ef4444;">
                                    <span>⚠️ Somente Estoque Baixo</span>
                                </label>

                                <button type="button" class="btn-primary" onclick="window.abrirModalNovoItemEstoque()" style="padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                                    <i class="fa-solid fa-plus"></i> Novo Item
                                </button>
                            </div>
                        </div>

                        <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <thead>
                                    <tr style="border-bottom: 1.5px solid var(--panel-border); color: var(--text-muted);">
                                        <th style="padding: 10px 8px;">CATEGORIA</th>
                                        <th style="padding: 10px 8px;">NOME DO ITEM</th>
                                        <th style="padding: 10px 8px; text-align: center;">STATUS</th>
                                        <th style="padding: 10px 8px; text-align: center;">SALDO ATUAL</th>
                                        <th style="padding: 10px 8px; text-align: center;">MÍNIMO ALERTA</th>
                                        <th style="padding: 10px 8px; text-align: right;">VALOR DE COMPRA UN.</th>
                                        <th style="padding: 10px 8px; text-align: right;">VALOR TOTAL</th>
                                        <th style="padding: 10px 8px; text-align: center;">AÇÕES</th>
                                    </tr>
                                </thead>
                                <tbody id="corpoTabelaEstoque">
                                    <!-- Preenchido dinamicamente via estoque.js -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- SUB-VIEW 2: SIMULADOR DE TANQUES (INSUMOS) -->
                <div id="subview-estoque-tanques" class="subview-estoque-section" style="display: none;">
                    <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; align-items: start;">
                        
                        <!-- SIMULADOR TANQUE DE DIESEL (5.000 L) -->
                        <div class="glass-panel" style="padding: 20px; border-radius: 16px; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 14px; align-self: start;">
                            <div class="section-title" style="margin-bottom: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px;">
                                <h3 style="color: white; margin: 0; display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-gas-pump" style="color: #eab308;"></i> Tanque Principal de Diesel
                                </h3>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: minmax(110px, 150px) minmax(0, 1fr); gap: 16px; align-items: end; margin: 8px 0;">
                                <div style="display: grid; grid-template-columns: 34px 1fr; gap: 8px; align-items: stretch;">
                                    <div style="height: 190px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; color: #ef4444; font-size: 0.72rem; font-weight: 800; padding: 2px 0;">
                                        <span>5000</span>
                                        <span>4000</span>
                                        <span>3000</span>
                                        <span>2000</span>
                                        <span>1000</span>
                                        <span>0</span>
                                    </div>
                                    <div style="height: 190px; border-left: 1px solid rgba(255,255,255,0.12); border-bottom: 1px solid rgba(255,255,255,0.18); background: repeating-linear-gradient(to top, rgba(255,255,255,0.08) 0 1px, transparent 1px 8px); position: relative;">
                                        <div id="dieselLiquidLevel" style="position: absolute; bottom: 0; left: 26%; width: 56%; height: 0%; min-height: 2px; background: repeating-linear-gradient(to top, #f97316 0 2px, #fff7ed 2px 3px, #fb923c 3px 5px); border: 1px solid rgba(249,115,22,0.95); box-shadow: 0 0 16px rgba(249,115,22,0.45); transition: height 1s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden;">
                                            <div style="position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: waveAnim 2.2s infinite linear;"></div>
                                        </div>
                                        <div id="dieselLevelNumber" style="position: absolute; left: 50%; transform: translateX(-50%); bottom: 0%; color: #16a34a; font-size: 0.78rem; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.45); transition: bottom 1s cubic-bezier(0.4, 0, 0.2, 1);">0</div>
                                    </div>
                                </div>

                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <div style="border: 1px solid var(--panel-border); background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                                        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">QUANTIDADE REAL NO TANQUE DE DIESEL</span>
                                        <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
                                            <strong style="font-size: clamp(1.8rem, 4vw, 2.4rem); line-height: 1; color: #ef4444;" id="dieselLitersText">0</strong>
                                            <span style="color: white; font-style: italic;">LITROS</span>
                                        </div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
                                        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 8px; padding: 10px;">
                                            <span style="font-size: 0.72rem; color: var(--text-muted);">Volume</span>
                                            <div style="font-size: 1.1rem; font-weight: 800; color: #eab308;" id="dieselPercentText">0%</div>
                                        </div>
                                        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 8px; padding: 10px;">
                                            <span style="font-size: 0.72rem; color: var(--text-muted);">Capacidade</span>
                                            <div style="font-size: 1rem; font-weight: 800; color: white;">5.000 L</div>
                                        </div>
                                        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 8px; padding: 10px;">
                                            <span style="font-size: 0.72rem; color: var(--text-muted);">Vazio</span>
                                            <div style="font-size: 1rem; font-weight: 800; color: #60a5fa;" id="dieselSpaceLeftText">0 L</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Caixa de Sugestão de Compra -->
                            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 12px; border-radius: 8px; font-size: 0.85rem;" id="dieselOrderAdvice">
                                <span style="font-weight: bold; color: #60a5fa; display: block; margin-bottom: 2px;"><i class="fa-solid fa-circle-info"></i> Sugestão de Compra</span>
                                <span id="dieselAdviceText">Aguardando dados...</span>
                            </div>
                        </div>

                        <!-- SIMULADORES DE LUBRIFICANTES (CONVERSÃO DE BALDES 20L) -->
                        <div class="glass-panel" style="padding: 25px; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div class="section-title" style="margin-bottom: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px;">
                                <h3 style="color: white; margin: 0; display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-oil-can" style="color: #60a5fa;"></i> Tanques Virtuais de Lubrificantes
                                </h3>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 15px;" id="containerLubrificantesTanques">
                                <!-- Gerado dinamicamente via JS -->
                            </div>

                            <div style="margin-top: 15px; font-size: 0.78rem; color: var(--text-muted); background: rgba(255,255,255,0.03); border: 1px dashed var(--panel-border); padding: 10px; border-radius: 8px; line-height: 1.4;">
                                <i class="fa-solid fa-circle-question"></i> <strong>Como funciona?</strong> Os lubrificantes e fluidos são comprados comercialmente em baldes de 20 litros. O almoxarifado gerencia as saídas de forma fracionada (litro a litro) e o simulador faz o desdobramento visual do saldo em Baldes Fechados + Litros restantes.
                            </div>
                        </div>

                    </div>
                </div>

                <!-- SUB-VIEW 3: HISTÓRICO DE MOVIMENTAÇÕES -->
                <div id="subview-estoque-movimentacoes" class="subview-estoque-section" style="display: none;">
                    <div class="glass-panel" style="padding: 20px; border-radius: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 15px; margin-bottom: 15px; flex-wrap: wrap; gap: 15px;">
                            <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-right-left" style="color: var(--accent-color);"></i> Log de Entradas & Saídas
                            </h3>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <input type="text" id="buscaMovimentacao" placeholder="🔍 Filtrar item ou frota..." style="border-radius: 8px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px 12px; font-size: 0.85rem; width: 180px;">
                                <select id="filtroMovTipo" style="border-radius: 8px; border: 1px solid var(--panel-border); background: #1e293b; color: white; padding: 8px 12px; font-size: 0.85rem;">
                                    <option value="TODOS">TODOS LANÇAMENTOS</option>
                                    <option value="ENTRADA">📈 ENTRADAS</option>
                                    <option value="SAÍDA">📉 SAÍDAS</option>
                                </select>
                            </div>
                        </div>

                        <div class="table-container" style="max-height: 450px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <thead>
                                    <tr style="border-bottom: 1.5px solid var(--panel-border); color: var(--text-muted);">
                                        <th style="padding: 10px 8px;">DATA / HORA</th>
                                        <th style="padding: 10px 8px; text-align: center;">TIPO</th>
                                        <th style="padding: 10px 8px;">ITEM / INSUMO</th>
                                        <th style="padding: 10px 8px; text-align: center;">QTD</th>
                                        <th style="padding: 10px 8px; text-align: right;">VALOR UN.</th>
                                        <th style="padding: 10px 8px; text-align: right;">TOTAL</th>
                                        <th style="padding: 10px 8px;">DESTINO / FROTA</th>
                                        <th style="padding: 10px 8px;">OBSERVAÇÃO</th>
                                        <th style="padding: 10px 8px; text-align: center;">AÇÕES</th>
                                    </tr>
                                </thead>
                                <tbody id="corpoTabelaMovimentacoesEstoque">
                                    <!-- Preenchido dinamicamente via estoque.js -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- SUB-VIEW 4: LANÇAMENTO MANUAL -->
                <div id="subview-estoque-lancar" class="subview-estoque-section" style="display: none;">
                    <div class="glass-panel" style="padding: 24px; border-radius: 16px; max-width: 760px; margin: 0 auto;">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-plus-minus"></i> Lançar Movimento Manual</h2>
                        </div>
                        <p style="color: var(--text-muted); margin-top: -5px;">Use esta opção para entrada de compra, reposição ou saída manual. Saídas de diesel e lubrificantes de máquinas devem ser lançadas pelo Controle de Frota.</p>
                        <button type="button" class="btn-primary" onclick="window.abrirModalNovaMovimentacao()" style="padding: 12px 18px; border-radius: 8px; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-plus-minus"></i> Abrir Formulário de Movimento
                        </button>
                    </div>
                </div>

            </section>

            <!-- ====== MODAL: NOVO ITEM NO ESTOQUE ====== -->
            <div id="modalNovoItemEstoque" class="modal-v2" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(0,0,0,0.85);">
                <div class="modal-content-v2" style="width: 100%; max-width: 450px; border-radius: 16px; padding: 25px; border: 1px solid var(--panel-border); background: #1e293b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 id="tituloModalEstoque" style="margin: 0; color: white;"><i class="fa-solid fa-box" style="color: var(--accent-color);"></i> Novo Item de Estoque</h2>
                        <button type="button" class="btn-action-card" onclick="window.fecharModalNovoItemEstoque()" style="padding: 8px 12px;"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <form id="formNovoItemEstoque" class="grid-form">
                        <input type="hidden" id="estoqueItemId">
                        
                        <div class="input-group" style="grid-column: span 3;">
                            <label for="estNome">Nome do Item / Descrição</label>
                            <input type="text" id="estNome" required class="text-uppercase-input" placeholder="Ex: FILTRO DE COMBUSTÍVEL VOLVO">
                        </div>

                        <div class="input-group" style="grid-column: span 3;">
                            <label for="estCategoria">Categoria</label>
                            <select id="estCategoria" required>
                                <option value="ESCRITÓRIO">ESCRITÓRIO</option>
                                <option value="EPI'S">EPI'S</option>
                                <option value="CORREIAS INDUSTRIAIS">CORREIAS INDUSTRIAIS</option>
                                <option value="SERRAS E FACAS P/ PICADOR">SERRAS E FACAS P/ PICADOR</option>
                                <option value="PEÇAS">PEÇAS / ACESSÓRIOS</option>
                                <option value="FILTROS">FILTROS</option>
                                <option value="LUBRIFICANTES">LUBRIFICANTES</option>
                                <option value="DIESEL">DIESEL / COMBUSTÍVEIS</option>
                                <option value="HIGIENE">HIGIENE</option>
                            </select>
                        </div>

                        <div class="input-group" style="grid-column: span 1.5;">
                            <label for="estQtd">Quantidade Atual</label>
                            <input type="number" id="estQtd" step="0.01" required placeholder="Ex: 10">
                        </div>

                        <div class="input-group" style="grid-column: span 1.5;">
                            <label for="estUnitario">Valor Unitário (R\$)</label>
                            <input type="text" id="estUnitario" required placeholder="R\$ 0,00" oninput="window.formatCurrencyInput(event)">
                        </div>

                        <div class="input-group" style="grid-column: span 3;">
                            <label for="estAlerta">Mínimo para Alerta (Aviso de Acabando)</label>
                            <input type="number" id="estAlerta" step="0.01" placeholder="Ex: 3 (Vazio assume padrão)">
                        </div>

                        <div style="grid-column: span 3; display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                            <button type="button" class="btn-secondary" onclick="window.fecharModalNovoItemEstoque()" style="padding: 10px 20px;">Cancelar</button>
                            <button type="submit" class="btn-primary" style="padding: 10px 25px;">Salvar Item</button>
                        </div>
                    </form>
                </div>
            </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
