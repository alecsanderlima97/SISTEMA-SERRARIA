(function() {
    const html = `            <!-- ====== TELA: RH FUNCIONÁRIOS ====== -->
            <section id="view-rh" class="view-section" style="display: none;">
                <div class="main-header hide-on-print">
                    <h1><i class="fa-solid fa-id-card-clip"></i> Gestão de Pessoas (RH)</h1>
                    <p>Controle de funcionários, salários, férias, vales e horas extras.</p>
                </div>

                <!-- TABS DE RH -->
                <div class="tabs-container hide-on-print" style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap;">
                    <button type="button" id="btnTabRHLista" onclick="window.switchTabRH('lista')" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-users-viewfinder"></i> Quadro de Funcionários
                    </button>
                    <button type="button" id="btnTabRHForm" onclick="window.switchTabRH('form')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-user-plus"></i> <span id="lblTabRHForm">Cadastrar Funcionário</span>
                    </button>
                    <button type="button" id="btnTabRHRegras" data-subsection-permission="view-configuracoes:regras-pagamento" onclick="window.switchTabRH('regras')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Regras de Pagamento
                    </button>
                </div>

                <!-- CARD DE CADASTRO / EDIÇÃO -->
                <div id="cardFormRH" class="glass-panel hide-on-print" style="display: none; margin-bottom: 20px; max-width: 900px; margin: 0 auto 20px auto;">
                    <div class="section-title">
                        <h2 id="tituloFormRH"><i class="fa-solid fa-user-plus"></i> Novo Funcionário</h2>
                    </div>
                    <form id="formFuncionario" onsubmit="event.preventDefault();">
                        <input type="hidden" id="rh-id">
                        
                        <!-- Dados Pessoais -->
                        <h3 style="font-size: 0.9rem; color: var(--accent-color); margin-bottom: 15px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 5px;">
                            <i class="fa-solid fa-user"></i> Informações Pessoais
                        </h3>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div class="input-group rh-photo-group">
                                <label>Foto do funcionário</label>
                                <div class="rh-photo-picker">
                                    <button type="button" id="rhFotoPreview" class="rh-photo-preview" onclick="document.getElementById('rh-foto')?.click()" title="Adicionar ou trocar foto">
                                        <i class="fa-solid fa-camera"></i>
                                    </button>
                                    <div class="rh-photo-actions">
                                        <input type="file" id="rh-foto" accept="image/*" style="display:none;">
                                        <button type="button" class="btn-secondary" onclick="document.getElementById('rh-foto')?.click()"><i class="fa-solid fa-image"></i> Escolher foto</button>
                                        <button type="button" class="btn-secondary" onclick="window.removerFotoRH?.()"><i class="fa-solid fa-xmark"></i> Remover</button>
                                        <small id="rh-foto-nome">Nenhuma foto selecionada</small>
                                    </div>
                                </div>
                            </div>
                            <div class="input-group">
                                <label>Nome Completo *</label>
                                <input type="text" id="rh-nome" class="text-uppercase-input" required placeholder="Ex: JOÃO DA SILVA">
                            </div>
                            <div class="input-group">
                                <label>Data de Nascimento</label>
                                <input type="date" id="rh-nascimento">
                            </div>
                            <div class="input-group">
                                <label>CPF *</label>
                                <input type="text" id="rh-cpf" required inputmode="numeric" placeholder="000.000.000-00">
                            </div>
                            <div class="input-group">
                                <label>RG</label>
                                <input type="text" id="rh-rg" placeholder="Ex: 12.345.678-9">
                            </div>
                            <div class="input-group">
                                <label>Número para Contato *</label>
                                <input type="text" id="rh-contato" required inputmode="tel" placeholder="(00) 00000-0000">
                            </div>
                        </div>

                        <!-- Dados Contratuais e Pagamento -->
                        <h3 style="font-size: 0.9rem; color: var(--accent-color); margin-bottom: 15px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 5px;">
                            <i class="fa-solid fa-briefcase"></i> Contrato & Financeiro
                        </h3>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div class="input-group">
                                <label>Função / Cargo *</label>
                                <input type="text" id="rh-funcao" class="text-uppercase-input" required placeholder="Ex: SERRADOR / EMPILHADEIRISTA">
                            </div>
                            <div class="input-group">
                                <label>Data de Admissão *</label>
                                <input type="date" id="rh-admissao" required>
                            </div>
                            <div class="input-group">
                                <label>Salário Base R$ *</label>
                                <input type="text" id="rh-salario" required inputmode="decimal" placeholder="R$ 0,00">
                            </div>
                            <div class="input-group">
                                <label>Valor do Vale Mensal R$</label>
                                <input type="text" id="rh-vale" inputmode="decimal" placeholder="R$ 0,00">
                            </div>
                            <div class="input-group">
                                <label>Forma de Pagamento *</label>
                                <select id="rh-forma-pagamento" required>
                                    <option value="PIX">PIX</option>
                                    <option value="DINHEIRO">DINHEIRO (ESPÉCIE)</option>
                                    <option value="TRANSFERENCIA">TRANSFERÊNCIA BANCÁRIA</option>
                                </select>
                            </div>
                            <div class="input-group" style="grid-column: span 2;">
                                <label>Chave PIX ou Dados Bancários para Pagamento</label>
                                <input type="text" id="rh-dados-bancarios" placeholder="Ex: Chave PIX (Celular/CPF) ou Banco/Ag/Cc">
                            </div>
                            <div class="input-group" style="grid-column: 1 / -1;">
                                <label>Observação do Funcionário</label>
                                <textarea id="rh-observacao" class="text-uppercase-input" rows="3" placeholder="Ex: INFORMAÇÕES IMPORTANTES, COMBINADOS, RESTRIÇÕES OU OBSERVAÇÕES INTERNAS"></textarea>
                            </div>
                            <div class="input-group">
                                <label>Valor H. Extra Normal R$ *</label>
                                <input type="text" id="rh-valor-he-normal" required inputmode="decimal" placeholder="R$ 0,00">
                            </div>
                            <div class="input-group">
                                <label>Valor H. Extra Sáb/Dom/Fer R$ *</label>
                                <input type="text" id="rh-valor-he-especial" required inputmode="decimal" placeholder="R$ 0,00">
                            </div>
                        </div>

                        <!-- Férias -->
                        <h3 style="font-size: 0.9rem; color: var(--accent-color); margin-bottom: 15px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 5px;">
                            <i class="fa-solid fa-umbrella-beach"></i> Controle de Férias
                        </h3>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div class="input-group">
                                <label>Férias Usufruídas (Dias)</label>
                                <input type="number" id="rh-ferias-dias" inputmode="numeric" min="0" max="60" value="0">
                            </div>
                            <div class="input-group">
                                <label>Início do Período de Férias</label>
                                <input type="date" id="rh-ferias-inicio">
                            </div>
                            <div class="input-group">
                                <label>Fim do Período de Férias</label>
                                <input type="date" id="rh-ferias-fim">
                            </div>
                        </div>

                        <!-- Atestado e CAT -->
                        <h3 style="font-size: 0.9rem; color: var(--accent-color); margin-bottom: 15px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 5px;">
                            <i class="fa-solid fa-file-medical"></i> Atestados e CAT
                        </h3>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div class="input-group">
                                <label>Atestado médico</label>
                                <input type="file" id="rh-atestado-arquivo" accept="image/*,.pdf" style="display:none;">
                                <button type="button" class="btn-secondary" onclick="document.getElementById('rh-atestado-arquivo').click()" style="padding: 10px 14px; border-radius: 8px; justify-content: center;">
                                    <i class="fa-solid fa-file-circle-plus"></i> Adicionar Atestado
                                </button>
                                <small id="rh-atestado-nome" style="color: var(--text-muted); display:block; margin-top:6px;">Nenhum arquivo selecionado</small>
                            </div>
                            <div class="input-group">
                                <label>Registro de CAT</label>
                                <input type="file" id="rh-cat-arquivo" accept="image/*,.pdf" style="display:none;">
                                <button type="button" class="btn-secondary" onclick="document.getElementById('rh-cat-arquivo').click()" style="padding: 10px 14px; border-radius: 8px; justify-content: center;">
                                    <i class="fa-solid fa-kit-medical"></i> Adicionar CAT
                                </button>
                                <small id="rh-cat-nome" style="color: var(--text-muted); display:block; margin-top:6px;">Nenhum arquivo selecionado</small>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" id="btnCancelarRH" class="btn-secondary" style="padding: 12px 24px; border-radius: 8px;">
                                Cancelar
                            </button>
                            <button type="submit" id="btnSalvarRH" class="btn-primary" style="padding: 12px 30px; border-radius: 8px; font-weight: bold; background: #00ff88; color: black; border-color: #00ff88;">
                                <i class="fa-solid fa-floppy-disk"></i> SALVAR FUNCIONÁRIO
                            </button>
                        </div>
                    </form>
                </div>

                <!-- REGRAS DE PAGAMENTO (descargas e diárias) -->
                    <div id="panelRegrasRH" class="glass-panel hide-on-print" style="display:none; max-width:760px; margin:0 auto 20px;">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                            <i class="fa-solid fa-hand-holding-dollar" style="font-size:24px; color:#f59e0b;"></i>
                            <div>
                                <h2 style="margin:0; font-size:20px;">Regras de Pagamento</h2>
                                <p style="margin:4px 0 0; color:var(--text-muted); font-size:12px;">Valores usados em descarregamentos e diárias de fim de semana.</p>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px;">
                            <div class="input-group" style="margin:0;"><label for="configDescargaDiaUtil">Descarga dia útil (R$/m³)</label><input id="configDescargaDiaUtil" type="text" inputmode="decimal" value="1,30"></div>
                            <div class="input-group" style="margin:0;"><label for="configDescargaEspecial">Descarga fim de semana/feriado (R$/m³)</label><input id="configDescargaEspecial" type="text" inputmode="decimal" value="1,50"></div>
                            <div class="input-group" style="margin:0;"><label for="configDiariaFimSemana">Diária integral fim de semana (R$)</label><input id="configDiariaFimSemana" type="text" inputmode="decimal" value="150,00"></div>
                            <div class="input-group" style="margin:0;"><label for="configMeiaDiariaFimSemana">Meia diária fim de semana (R$)</label><input id="configMeiaDiariaFimSemana" type="text" inputmode="decimal" value="75,00"></div>
                            <div class="input-group" style="grid-column:1 / -1; margin:0;"><label for="configLocalizacaoEmpresa">Cidade e estado de referência</label><div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;"><input id="configLocalizacaoEmpresa" type="text" readonly placeholder="Use sua localização para identificar a cidade e o estado" style="flex:1; min-width:220px;"><button type="button" class="btn-secondary" id="btnUsarLocalizacaoEmpresa" onclick="window.identificarLocalizacaoEmpresa && window.identificarLocalizacaoEmpresa()" style="padding:10px 12px;"><i class="fa-solid fa-location-crosshairs"></i> Usar localização atual</button></div><small id="configLocalizacaoEmpresaInfo" style="color:var(--text-muted);">A localização serve apenas para identificar cidade e UF. Coordenadas não são salvas.</small></div>
                            <div class="input-group" style="grid-column:1 / -1; margin:0;"><label for="configFeriadosDescarga">Feriados</label><textarea id="configFeriadosDescarga" rows="5" placeholder="2026-10-12 - Nossa Senhora Aparecida&#10;2026-12-08 - Feriado municipal" style="width:100%; resize:vertical;"></textarea><small style="color:var(--text-muted);">Um por linha, no formato AAAA-MM-DD - descrição. Sábados e domingos são classificados automaticamente.</small></div>
                        </div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
                            <button type="button" class="btn-secondary" id="btnImportarFeriadosNacionais" onclick="window.importarFeriadosNacionais && window.importarFeriadosNacionais()" style="padding:12px 14px;"><i class="fa-solid fa-calendar-plus"></i> Atualizar feriados nacionais</button>
                            <button type="button" class="btn-primary" id="btnSalvarRegrasPagamento" onclick="window.salvarRegrasPagamentoDescarga && window.salvarRegrasPagamentoDescarga()" style="flex:1; min-width:230px; justify-content:center;"><i class="fa-solid fa-floppy-disk"></i> Salvar regras de pagamento</button>
                        </div>
                    </div>

                <!-- PAINEL DA LISTA DE CADASTRADOS -->
                <div id="panelListaRH" class="glass-panel hide-on-print">
                    <div class="rh-kpi-toolbar" style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                        <h3 style="margin:0; color:white; font-size:1rem; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-chart-simple" style="color:var(--accent-color);"></i> Indicadores do RH</h3>
                        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                            <select id="rhFiltroMesIndicadores" onchange="window.alterarMesIndicadoresRH(this.value)" style="height:38px; border-radius:8px; background:rgba(255,255,255,0.05); color:white; border:1px solid var(--panel-border); padding:0 10px; min-width:190px;">
                                <option value="aberto">Mês em aberto</option>
                            </select>
                            <button type="button" id="btnToggleValoresRH" onclick="window.toggleValoresRH()" class="btn-action-card" style="padding:8px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:8px;">
                                <i class="fa-solid fa-eye" id="iconValoresRH"></i> Valores
                            </button>
                        </div>
                    </div>
                    <div class="rh-kpi-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:22px;">
                        <div class="glass-panel" style="padding:14px; border-radius:12px; background:rgba(255,255,255,0.035);">
                            <small style="color:var(--text-muted); font-weight:700;">FUNCIONÁRIOS</small>
                            <div id="rhKpiFuncionarios" style="font-size:1.7rem; font-weight:900; color:white; margin-top:6px;">0</div>
                        </div>
                        <div class="glass-panel" style="padding:14px; border-radius:12px; background:rgba(255,255,255,0.035);">
                            <small style="color:var(--text-muted); font-weight:700;">EM FÉRIAS</small>
                            <div id="rhKpiFerias" style="font-size:1.7rem; font-weight:900; color:#fbbf24; margin-top:6px;">0</div>
                        </div>
                        <div class="glass-panel" style="padding:14px; border-radius:12px; background:rgba(255,255,255,0.035);">
                            <small style="color:var(--text-muted); font-weight:700;">TOTAL SALÁRIOS</small>
                            <div id="rhKpiSalarios" class="rh-kpi-valor" style="font-size:1.35rem; font-weight:900; color:#22c55e; margin-top:8px;">R$ 0,00</div>
                        </div>
                        <div class="glass-panel" style="padding:14px; border-radius:12px; background:rgba(255,255,255,0.035);">
                            <small style="color:var(--text-muted); font-weight:700;">TOTAL VALES</small>
                            <div id="rhKpiVales" class="rh-kpi-valor" style="font-size:1.35rem; font-weight:900; color:#f87171; margin-top:8px;">R$ 0,00</div>
                        </div>
                        <div class="glass-panel" style="padding:14px; border-radius:12px; background:rgba(255,255,255,0.035);">
                            <small style="color:var(--text-muted); font-weight:700;">TOTAL H. EXTRAS</small>
                            <div id="rhKpiHorasExtras" class="rh-kpi-valor" style="font-size:1.35rem; font-weight:900; color:#38bdf8; margin-top:8px;">R$ 0,00</div>
                        </div>
                    </div>
                    <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <h2><i class="fa-solid fa-users-viewfinder"></i> Quadro de Funcionários</h2>
                        <div style="display: flex; gap: 10px; align-items: center; width: 100%; max-width: 560px; flex-wrap: wrap;">
                            <i class="fa-solid fa-magnifying-glass" style="color: var(--accent-color);"></i>
                            <input type="text" id="buscaFuncionario" placeholder="Pesquisar por nome ou função..." style="flex: 1; min-width: 220px; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;">
                            <select id="ordenarFuncionarios" style="height: 38px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--panel-border); padding: 0 10px;">
                                <option value="nome">Nome A-Z</option>
                                <option value="data-desc">Mais novo</option>
                                <option value="data-asc">Mais velho</option>
                            </select>
                        </div>
                    </div>

                    <div style="overflow-x: auto;">
                        <table class="package-table">
                            <thead>
                                <tr>
                                    <th>Funcionário</th>
                                    <th>Função / Admissão</th>
                                    <th>Contato / CPF</th>
                                    <th>Salário / Vale</th>
                                    <th>Férias</th>
                                    <th style="text-align: center;">Painéis e Ações</th>
                                </tr>
                            </thead>
                            <tbody id="listaRH">
                                <tr>
                                    <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
                                        <span class="saw-loader" aria-hidden="true"></span> Carregando funcionários...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
