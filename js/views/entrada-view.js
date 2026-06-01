(function() {
    const html = `            <!-- ====== TELA: ENTRADA DE MADEIRA/TORA ====== -->
            <section id="view-entrada" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-clipboard-check"></i> Conferência de Cargas (M³)</h1>
                    <p>Cadastro de empreiteiros, controle de cubagem de cargas e financeiro de extração.</p>
                </div>

                <!-- TABS DE ENTRADA -->
                <div class="tabs-container hide-on-print" style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap; justify-content: flex-start;">
                    <button type="button" id="btnTabEntradaRegistro" onclick="window.switchTabEntrada('registro')" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-calculator"></i> Registrar M³
                    </button>
                    <button type="button" id="btnTabEntradaLista" onclick="window.switchTabEntrada('lista')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-list"></i> Últimas Entradas
                    </button>
                    <button type="button" id="btnTabEntradaDescarregamento" onclick="window.switchTabEntrada('descarregamento')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-truck-ramp-box"></i> Descarregamento
                    </button>
                    <button type="button" id="btnTabEntradaEmpreiteiros" onclick="window.switchTabEntrada('empreiteiros')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-users-gear"></i> Empreiteiros
                    </button>
                </div>

                <!-- GRID UNIFICADO BILATERAL DE DUAS COLUNAS PARA ENTRADA DE TORAS -->
                <div class="form-table-grid" id="gridEntradasGeralLayout" style="max-width: 1350px; margin: 0 auto; position: relative;">
                    <!-- Coluna da Esquerda: Formulários -->
                    <div class="form-column-left" style="display: flex; flex-direction: column; gap: 2rem; width: 100%;">
                        
                        <!-- Cadastro de Empreiteiros -->
                        <div class="glass-panel" id="cardFormEmpreiteiro" style="margin-bottom: 0; display: none;">
                            <div class="section-title">
                                <h2><i class="fa-solid fa-users-gear"></i> Cadastro de Empreiteiros</h2>
                            </div>
                            <form id="formEmpreiteiro" class="grid-form">
                                <div class="input-group">
                                    <label for="empNome">Nome do Empreiteiro *</label>
                                    <input type="text" id="empNome" class="text-uppercase-input" required placeholder="Ex: José da Silva">
                                </div>
                                <div class="input-group">
                                    <label for="empContato">Contato (Telefone/WhatsApp)</label>
                                    <input type="text" id="empContato" placeholder="(00) 00000-0000">
                                </div>
                                <div class="input-group" style="grid-column: span 2;">
                                    <label for="empMato">Matos</label>
                                    <div style="display: grid; grid-template-columns: minmax(160px, 1fr) 130px auto; gap: 8px;">
                                        <input type="text" id="empMato" class="text-uppercase-input" placeholder="Ex: Mato Santa Rita" style="margin-bottom: 0;">
                                        <input type="text" id="empMatoValor" placeholder="R\$ / m³" style="margin-bottom: 0;">
                                        <button type="button" id="btnAdicionarMatoEmpreiteiro" class="btn-primary" style="width: auto; padding: 0 14px; white-space: nowrap;"><i class="fa-solid fa-plus"></i> Adicionar</button>
                                    </div>
                                    <div id="empMatosLista" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;"></div>
                                </div>
                                <div class="input-group">
                                    <label for="empPix">Chave PIX para Pagamento</label>
                                    <input type="text" id="empPix" placeholder="CPF, Celular ou E-mail">
                                </div>
                                <div class="input-group" style="grid-column: 1 / -1; justify-content: flex-end;">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-save"></i> Salvar Empreiteiro</button>
                                </div>
                            </form>
                        </div>

                        <!-- Calculadora de Cubagem -->
                        <div class="glass-panel" id="cardFormEntrada" style="margin-bottom: 0;">
                            <div class="section-title">
                                <h2><i class="fa-solid fa-calculator"></i> Calculadora de M³</h2>
                            </div>
                            <form id="formEntrada" class="grid-form">
                                <div class="input-group">
                                    <label for="entEmpreiteiro">Empreiteiro *</label>
                                    <select id="entEmpreiteiro" required>
                                        <option value="">Selecione o Empreiteiro...</option>
                                        <!-- Preenchido via JS -->
                                    </select>
                                </div>
                                <div class="input-group">
                                    <label for="entMato">Mato</label>
                                    <select id="entMatoSelect" style="display: none;"></select>
                                    <input type="text" id="entMato" class="text-uppercase-input" placeholder="Ex: Mato Santa Rita">
                                </div>
                                <div class="input-group">
                                    <label for="entRomaneio">Nº Romaneio *</label>
                                    <input type="text" id="entRomaneio" class="text-uppercase-input" required placeholder="Ex: ROM-1004">
                                </div>
                                <div class="input-group">
                                    <label for="entMotorista">Nome do Motorista *</label>
                                    <input type="text" id="entMotorista" class="text-uppercase-input" required placeholder="Ex: Carlos Motorista">
                                </div>
                                <div class="input-group">
                                    <label for="entCaminhao">Modelo do Caminhão</label>
                                    <input type="text" id="entCaminhao" class="text-uppercase-input" placeholder="Ex: Scania 113">
                                </div>
                                <div class="input-group">
                                    <label for="entPlaca">Placa do Caminhão *</label>
                                    <input type="text" id="entPlaca" class="text-uppercase-input" required placeholder="ABC-1234">
                                </div>
                                <div class="input-group">
                                    <label for="entData">Data de Entrada</label>
                                    <input type="date" id="entData" required>
                                </div>
                                <div class="input-group">
                                    <label for="entHorario">Horário da Chegada</label>
                                    <input type="time" id="entHorario" required>
                                </div>

                                <!-- Medidas Base -->
                                <div style="grid-column: 1 / -1; margin-top: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">
                                    <h3 style="color:var(--accent-color); font-size: 0.95rem;"><i class="fa-solid fa-ruler-combined"></i> Medidas da Carroceria / Carga</h3>
                                </div>

                                <div class="input-group">
                                    <label>Comprimento (m) *</label>
                                    <input type="text" id="entComp" inputmode="decimal" required placeholder="Ex: 7,20">
                                </div>
                                <div class="input-group">
                                    <label>Largura Média (m) *</label>
                                    <input type="text" id="entLarg" inputmode="decimal" required placeholder="Ex: 2,40">
                                </div>
                                <div class="input-group" style="grid-column: span 2;">
                                    <label>Cupim adicional (m³)</label>
                                    <input type="text" id="entCupimAdicional" inputmode="decimal" placeholder="Ex: 0,80">
                                </div>
                                <div class="input-group" style="grid-column: span 2;">
                                    <label for="entValorDescarga">Valor descarregamento (R\$ / m³)</label>
                                    <input type="text" id="entValorDescarga" placeholder="R\$ 1,05" value="R\$ 1,05">
                                </div>

                                <!-- Alturas -->
                                <div style="grid-column: 1 / -1; margin-top: 10px;">
                                    <p style="font-size: 0.8rem; color:#aaa; margin-bottom: 5px;">Alturas da carroceria: preencha de 1 a 3 pontos por lado.</p>
                                </div>

                                <div class="input-group" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                                    <label style="color:#2cc990; font-size: 0.75rem;">Lado Esq. 1 (m)</label>
                                    <input type="text" id="entAltEsq1" inputmode="decimal" placeholder="m" style="padding: 8px; font-size: 0.9rem;">
                                </div>
                                <div class="input-group" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                                    <label style="color:#2cc990; font-size: 0.75rem;">Lado Esq. 2 (m)</label>
                                    <input type="text" id="entAltEsq2" inputmode="decimal" placeholder="m" style="padding: 8px; font-size: 0.9rem;">
                                </div>
                                <div class="input-group" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                                    <label style="color:#2cc990; font-size: 0.75rem;">Lado Esq. 3 (m)</label>
                                    <input type="text" id="entAltEsq3" inputmode="decimal" placeholder="m" style="padding: 8px; font-size: 0.9rem;">
                                </div>

                                <div class="input-group" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                                    <label style="color:#3498db; font-size: 0.75rem;">Lado Dir. 1 (m)</label>
                                    <input type="text" id="entAltDir1" inputmode="decimal" placeholder="m" style="padding: 8px; font-size: 0.9rem;">
                                </div>
                                <div class="input-group" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                                    <label style="color:#3498db; font-size: 0.75rem;">Lado Dir. 2 (m)</label>
                                    <input type="text" id="entAltDir2" inputmode="decimal" placeholder="m" style="padding: 8px; font-size: 0.9rem;">
                                </div>
                                <div class="input-group" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                                    <label style="color:#3498db; font-size: 0.75rem;">Lado Dir. 3 (m)</label>
                                    <input type="text" id="entAltDir3" inputmode="decimal" placeholder="m" style="padding: 8px; font-size: 0.9rem;">
                                </div>

                                <!-- Resultado Real-Time -->
                                <div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-top: 15px;">
                                    <div style="text-align: center; padding: 15px; background: rgba(44, 201, 144, 0.1); border: 1px dashed var(--accent-color); border-radius: 8px;">
                                        <h4 style="margin: 0; color:#ccc; font-size: 0.8rem;">Volume M³</h4>
                                        <div id="entResultadoVolume" style="font-size: 1.8rem; font-weight: bold; color:var(--accent-color); margin-top: 5px;">0.000 m³</div>
                                        <small id="entInfoMedia" style="color:#aaa; font-size: 0.75rem;">Média: 0.00m</small>
                                    </div>
                                    <div id="entCardFinanceiroEmpreiteiro" style="text-align: center; padding: 15px; background: rgba(52, 152, 219, 0.1); border: 1px dashed #3498db; border-radius: 8px;">
                                        <h4 style="margin: 0; color:#ccc; font-size: 0.8rem;">Acerto Empreiteiro</h4>
                                        <div id="entResultadoFinanceiro" style="font-size: 1.8rem; font-weight: bold; color:#3498db; margin-top: 5px;">R\$ 0,00</div>
                                        <small id="entInfoFinanceira" style="color:#aaa; font-size: 0.75rem;">Base: R\$ 0,00/m³</small>
                                    </div>
                                    <div id="entCardFinanceiroDescarga" style="text-align: center; padding: 15px; background: rgba(245, 158, 11, 0.1); border: 1px dashed #f59e0b; border-radius: 8px;">
                                        <h4 style="margin: 0; color:#ccc; font-size: 0.8rem;">Total Descarga</h4>
                                        <div id="entResultadoDescarga" style="font-size: 1.8rem; font-weight: bold; color:#f59e0b; margin-top: 5px;">R\$ 0,00</div>
                                        <small id="entInfoDescarga" style="color:#aaa; font-size: 0.75rem;">Base: R\$ 1,05/m³</small>
                                    </div>
                                </div>

                                <div class="input-group" style="grid-column: 1 / -1; justify-content: flex-end; margin-top: 15px;">
                                    <button type="submit" class="btn-primary" style="padding: 12px 24px; font-size: 1rem;"><i class="fa-solid fa-save"></i> Registrar Entrada</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Coluna da Direita: Listas de Dados -->
                    <div class="table-column-right" style="display: flex; flex-direction: column; gap: 2rem; width: 100%;">
                        
                        <!-- Lista de Empreiteiros -->
                        <div class="glass-panel" id="panelListaEmpreiteiros" style="margin-bottom: 0; display: none; width: 100%;">
                            <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                <h2><i class="fa-solid fa-list-ul"></i> Empreiteiros</h2>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <input type="text" id="filtroEmpreiteirosBusca" placeholder="Buscar por Nome ou Mato..." style="padding: 8px 12px; font-size: 0.85rem; width: 190px; margin-bottom: 0;">
                                    <button type="button" id="btnOrdenarEmpreiteiros" class="btn-primary" style="padding: 8px 12px; font-size: 0.85rem; height: 35px; border-radius: 8px;"><i class="fa-solid fa-arrow-down-a-z"></i> A-Z</button>
                                </div>
                            </div>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Contato</th>
                                            <th>Mato</th>
                                            <th>Valor (R\$/m³)</th>
                                            <th>PIX</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="listaEmpreiteiros">
                                        <!-- Preenchido via JS -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Últimas Entradas -->
                        <div class="glass-panel" id="panelListaEntradas" style="margin-bottom: 0; display: none; width: 100%;">
                            <div class="section-title" style="display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 15px;">
                                <h2 style="margin: 0;"><i class="fa-solid fa-list"></i> Últimas Entradas</h2>
                                
                                <!-- Filtros Avançados por Nome e Período -->
                                <div class="filters-row" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; width: 100%;">
                                    <div class="input-group" style="margin-bottom: 0; flex: 1; min-width: 150px;">
                                        <label style="font-size: 0.75rem; color: #ccc; margin-bottom: 4px;">Buscar por Fornecedor / Mato / Romaneio</label>
                                        <input type="text" id="filtroEntradasNome" placeholder="Buscar..." style="padding: 8px 12px; font-size: 0.85rem; margin-bottom: 0; height: 38px;">
                                    </div>
                                    <div class="input-group" style="margin-bottom: 0; width: 140px;">
                                        <label style="font-size: 0.75rem; color: #ccc; margin-bottom: 4px;">Data Início</label>
                                        <input type="date" id="filtroEntradasDataInicio" style="padding: 8px 10px; font-size: 0.85rem; margin-bottom: 0; height: 38px;">
                                    </div>
                                    <div class="input-group" style="margin-bottom: 0; width: 140px;">
                                        <label style="font-size: 0.75rem; color: #ccc; margin-bottom: 4px;">Data Fim</label>
                                        <input type="date" id="filtroEntradasDataFim" style="padding: 8px 10px; font-size: 0.85rem; margin-bottom: 0; height: 38px;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style="width: 40px; text-align: center;"><input type="checkbox" id="checkAllEntradas" style="transform: scale(1.25); cursor: pointer;"></th>
                                            <th>Data/Hora</th>
                                            <th>Fornecedor</th>
                                            <th>Placa</th>
                                            <th>Dimensões</th>
                                            <th>Volume</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="listaEntradas">
                                        <!-- Preenchido via JS -->
                                    </tbody>
                                </table>
                            </div>

                            <!-- Painel de Relatório de Fechamento Consolidado -->
                            <div id="panelRelatorioConsolidado" style="margin-top: 20px; background: rgba(0, 0, 0, 0.25); border: 1px solid var(--panel-border); border-radius: 8px; padding: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.15); padding-bottom: 10px; margin-bottom: 10px;">
                                    <h3 style="margin: 0; color: var(--accent-color); font-size: 1rem;"><i class="fa-solid fa-file-invoice-dollar"></i> Fechamento Financeiro de Extração</h3>
                                    <span class="badge" style="background: var(--primary-color);" id="fechamentoQtdCargas">0 Cargas Selecionadas</span>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px;">
                                    <div style="text-align: center; padding: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                                        <div style="font-size: 0.8rem; color: #ccc;">Registros Selecionados</div>
                                        <div id="fechamentoRegistrosTotal" style="font-size: 1.4rem; font-weight: bold; color: var(--accent-color); margin-top: 5px;">0</div>
                                    </div>
                                    <div style="text-align: center; padding: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                                        <div style="font-size: 0.8rem; color: #ccc;">Volume Consolidado</div>
                                        <div id="fechamentoVolumeTotal" style="font-size: 1.4rem; font-weight: bold; color: var(--accent-color); margin-top: 5px;">0,000 m³</div>
                                    </div>
                                    <div style="text-align: center; padding: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                                        <div style="font-size: 0.8rem; color: #ccc;">Total a Pagar (Empreiteiros)</div>
                                        <div id="fechamentoValorTotal" style="font-size: 1.4rem; font-weight: bold; color: #3498db; margin-top: 5px;">R\$ 0,00</div>
                                    </div>
                                </div>
                                <button type="button" id="btnGerarRelatorioConsolidado" class="btn-primary" style="width: 100%; margin-top: 15px; background: var(--accent-color); color: #000; font-weight: bold; padding: 12px; font-size: 0.95rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <i class="fa-solid fa-file-lines"></i> Gerar Relatório de Fechamento
                                </button>
                            </div>
                        </div>

                        <!-- Descarregamentos -->
                        <div class="glass-panel" id="panelDescarregamentos" style="margin-bottom: 0; display: none; width: 100%;">
                            <div class="section-title" style="display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 15px;">
                                <h2 style="margin: 0;"><i class="fa-solid fa-truck-ramp-box"></i> Descarregamento</h2>
                                <div class="filters-row" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; width: 100%;">
                                    <div class="input-group" style="margin-bottom: 0; flex: 1; min-width: 150px;">
                                        <label style="font-size: 0.75rem; color: #ccc; margin-bottom: 4px;">Buscar por Fornecedor / Mato / Romaneio</label>
                                        <input type="text" id="filtroDescargaNome" placeholder="Buscar..." style="padding: 8px 12px; font-size: 0.85rem; margin-bottom: 0; height: 38px;">
                                    </div>
                                    <div class="input-group" style="margin-bottom: 0; width: 140px;">
                                        <label style="font-size: 0.75rem; color: #ccc; margin-bottom: 4px;">Data Início</label>
                                        <input type="date" id="filtroDescargaDataInicio" style="padding: 8px 10px; font-size: 0.85rem; margin-bottom: 0; height: 38px;">
                                    </div>
                                    <div class="input-group" style="margin-bottom: 0; width: 140px;">
                                        <label style="font-size: 0.75rem; color: #ccc; margin-bottom: 4px;">Data Fim</label>
                                        <input type="date" id="filtroDescargaDataFim" style="padding: 8px 10px; font-size: 0.85rem; margin-bottom: 0; height: 38px;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Data/Hora</th>
                                            <th>Fornecedor</th>
                                            <th>Dimensões</th>
                                            <th>Placa</th>
                                            <th>Volume</th>
                                            <th>Valor/m³</th>
                                            <th>Total</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="listaDescarregamentos">
                                        <!-- Preenchido via JS -->
                                    </tbody>
                                </table>
                            </div>

                            <div style="margin-top: 20px; background: rgba(0, 0, 0, 0.25); border: 1px solid var(--panel-border); border-radius: 8px; padding: 15px;">
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px;">
                                    <div style="text-align: center; padding: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                                        <div style="font-size: 0.8rem; color: #ccc;">Registros</div>
                                        <div id="descargaQtdTotal" style="font-size: 1.4rem; font-weight: bold; color: var(--accent-color); margin-top: 5px;">0</div>
                                    </div>
                                    <div style="text-align: center; padding: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                                        <div style="font-size: 0.8rem; color: #ccc;">Volume Total</div>
                                        <div id="descargaVolumeTotal" style="font-size: 1.4rem; font-weight: bold; color: var(--accent-color); margin-top: 5px;">0,00 m³</div>
                                    </div>
                                    <div style="text-align: center; padding: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                                        <div style="font-size: 0.8rem; color: #ccc;">Total Descarga</div>
                                        <div id="descargaValorTotal" style="font-size: 1.4rem; font-weight: bold; color: #f59e0b; margin-top: 5px;">R\$ 0,00</div>
                                    </div>
                                </div>
                                <button type="button" id="btnGerarRelatorioDescarga" class="btn-primary" style="width: 100%; margin-top: 15px; background: #f59e0b; color: #111827; font-weight: bold; padding: 12px; font-size: 0.95rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <i class="fa-solid fa-print"></i> Imprimir Relatório de Descarregamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
