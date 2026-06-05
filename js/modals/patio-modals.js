(function() {
    const html = `    <!-- MODAL: CONTROLE DE PRODUÇÃO E CONTAGEM DE PÁTIO -->
    <div id="modalControleProducao" class="modal-v2 patio-wood-theme" style="display: none; overflow-y: auto; background: rgba(0, 0, 0, 0.88); z-index: 9999;">
        <div class="modal-content-v2" style="max-width: 1200px; width: 95%; padding: 25px; border-radius: 16px; border: none; font-family: var(--font-main);">

            <!-- TOPO DA TELA (BOTÕES DE AÇÃO DO MOCKUP) -->
            <div class="patio-header-actions hide-on-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fa-solid fa-boxes-stacked" style="font-size: 2rem; color: #e67e22; filter: drop-shadow(0 2px 8px rgba(230,126,34,0.3));"></i>
                    <div>
                        <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800;">Controle de Producao Geral</h2>
                        <small style="font-weight: 600;">Contagem geral, etiquetas e cubagem da producao</small>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                    <button type="button" id="btnZerarEtiquetas" class="btn-patio-zerar">
                        <i class="fa-solid fa-circle-minus"></i> Zerar Quantidades
                    </button>

                    <button type="button" id="btnImprimirEtiquetas" class="btn-patio-print">
                        <i class="fa-solid fa-print"></i> Imprimir Lista
                    </button>

                    <button type="button" id="btnEtiquetasAvulsasPatio" class="btn-patio-print" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;">
                        <i class="fa-solid fa-tag"></i> Etiquetas Avulsas
                    </button>
                    <button type="button" onclick="window.fecharModalPatio()" class="btn-patio-exit">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Sair
                    </button>
                </div>
            </div>

            <!-- SEÇÃO DE PARÂMETROS GERAIS -->
            <div id="patioUltimaAlteracao" class="hide-on-print patio-status-pulse" style="display:none; margin:-10px 0 18px 0; padding:14px 16px; border-radius:12px; background:rgba(34,197,94,0.14); border:1px solid rgba(74,222,128,0.55); color:#dcfce7; font-size:.95rem; font-weight:900; box-shadow:0 0 22px rgba(34,197,94,.22);"></div>

            <div id="painelEtiquetaAvulsaPatio" class="glass-panel hide-on-print" style="display: none; margin-bottom: 25px; padding: 20px; border-radius: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <h3 style="margin:0; font-size:1.05rem; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-tag" style="color:#2563eb;"></i> Etiqueta avulsa
                    </h3>
                    <button type="button" id="btnFecharEtiquetaAvulsaPatio" class="btn-patio-exit" style="padding:8px 12px;">
                        <i class="fa-solid fa-xmark"></i> Fechar
                    </button>
                </div>

                <div style="display:grid; grid-template-columns:minmax(280px, 360px) 1fr; gap:18px; align-items:start;">
                    <form id="formEtiquetaAvulsaPatio" style="display:grid; gap:10px;">
                        <div class="input-group" style="margin-bottom:0;"><label>Produto</label><input type="text" id="etqAvProduto" data-etiqueta-avulsa value="Eucalipto" class="text-uppercase-input"></div>
                        <div class="input-group" style="margin-bottom:0;"><label>Classificacao</label><input type="text" id="etqAvClassificacao" data-etiqueta-avulsa placeholder="Ex: 1A CLASSE"></div>
                        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                            <div class="input-group" style="margin-bottom:0;"><label>Bitola 1</label><input type="text" id="etqAvBitola1" data-etiqueta-avulsa placeholder="1,8"></div>
                            <div class="input-group" style="margin-bottom:0;"><label>Bitola 2</label><input type="text" id="etqAvBitola2" data-etiqueta-avulsa placeholder="7,0"></div>
                            <div class="input-group" style="margin-bottom:0;"><label>Bitola 3</label><input type="text" id="etqAvBitola3" data-etiqueta-avulsa placeholder="2,40"></div>
                        </div>
                        <div class="input-group" style="margin-bottom:0;"><label>Alturas (pecas)</label><input type="text" id="etqAvAlturas" data-etiqueta-avulsa></div>
                        <div class="input-group" style="margin-bottom:0;"><label>Largura (pecas)</label><input type="text" id="etqAvLargura" data-etiqueta-avulsa></div>
                        <div class="input-group" style="margin-bottom:0;"><label>Amarras pezinhos e meios</label><input type="text" id="etqAvAmarras" data-etiqueta-avulsa></div>
                        <div class="input-group" style="margin-bottom:0;"><label>Total pecas</label><input type="text" id="etqAvTotalPecas" data-etiqueta-avulsa readonly style="background:rgba(0,0,0,0.1) !important; cursor:not-allowed;"></div>
                        <div class="input-group" style="margin-bottom:0;"><label>Total m3 cubicos</label><input type="text" id="etqAvTotalM3" data-etiqueta-avulsa readonly style="background:rgba(0,0,0,0.1) !important; cursor:not-allowed;"></div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
                            <button type="button" id="btnAdicionarEtiquetaAvulsaPatio" class="btn-patio-print" style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%) !important;"><i class="fa-solid fa-plus"></i> Adicionar</button>
                            <button type="button" id="btnImprimirEtiquetaAvulsaPatio" class="btn-patio-print"><i class="fa-solid fa-print"></i> Imprimir</button>
                            <button type="button" id="btnLimparEtiquetaAvulsaPatio" class="btn-patio-zerar"><i class="fa-solid fa-eraser"></i> Limpar</button>
                        </div>
                    </form>

                    <div id="previewEtiquetaAvulsaPatio" style="background:rgba(15,23,42,.55); color:#fff; min-height:180px; border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:12px; font-family:Arial, Helvetica, sans-serif; justify-self:stretch;"></div>
                </div>
            </div>

            <div class="glass-panel hide-on-print patio-params-grid" style="margin-bottom: 25px; padding: 16px; border-radius: 12px;">
                <div class="input-group" style="margin-bottom: 0; display:none;">
                    <label><i class="fa-solid fa-calendar-day"></i> Data da Contagem</label>
                    <input type="date" id="patioData" required>
                </div>
                <div class="input-group" style="margin-bottom: 0; display:none;">
                    <label><i class="fa-solid fa-cloud-sun"></i> Período / Turno</label>
                    <select id="patioPeriodo">
                        <option value="Manhã (Início do Dia)">Manhã (Início do Dia)</option>
                        <option value="Tarde (Fechamento do Pátio)">Tarde (Fechamento do Pátio)</option>
                        <option value="Contagem Especial">Contagem Especial</option>
                    </select>
                </div>
                <div class="input-group" style="margin-bottom: 0; display:none;">
                    <label><i class="fa-solid fa-clock"></i> Horário da Contagem</label>
                    <input type="time" id="patioHorario" required>
                </div>
                <div class="input-group" style="margin-bottom: 0; max-width: 520px;">
                    <label><i class="fa-solid fa-tree"></i> Madeira Serrada no Momento *</label>
                    <input type="text" id="patioSerrando" class="text-uppercase-input" placeholder="Ex: TÁBUA DE 1,7 / 8,5 / 1,20" required>
                </div>
            </div>

            <!-- CARDS DE CONTAGEM / KPIS DO MOCKUP -->
            <div class="patio-kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <!-- TOTAL PCTS -->
                <div class="patio-kpi-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="kpi-label">TOTAL PCTS</span>
                        <i class="fa-solid fa-cubes" style="color: #e67e22; font-size: 1.2rem;"></i>
                    </div>
                    <div id="lblTotalPacotes" class="kpi-value">0</div>
                </div>

                <!-- TOTAL M³ -->
                <div class="patio-kpi-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="kpi-label">TOTAL M³</span>
                        <i class="fa-solid fa-cube" style="color: #f1c40f; font-size: 1.2rem;"></i>
                    </div>
                    <div id="lblTotalVolume" class="kpi-value">0,000</div>
                </div>

                <!-- PCTS HOJE -->
                <div class="patio-kpi-card patio-kpi-blue">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="kpi-label">PCTS HOJE</span>
                        <i class="fa-solid fa-calendar-check" style="color: #60a5fa; font-size: 1.2rem;"></i>
                    </div>
                    <div id="lblPacotesHoje" class="kpi-value">0</div>
                </div>

                <!-- HOJE M³ -->
                <div class="patio-kpi-card patio-kpi-green">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="kpi-label">HOJE M³</span>
                        <i class="fa-solid fa-truck-ramp-box" style="color: #4ade80; font-size: 1.2rem;"></i>
                    </div>
                    <div id="lblVolumeHoje" class="kpi-value">0,000</div>
                </div>
            </div>

            <!-- SEÇÃO DE LANÇAMENTO E TABELA -->
            <div id="resumoPatioRomaneios" class="patio-kpi-grid hide-on-print" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:-8px 0 22px 0;"></div>

            <div class="glass-panel" style="margin-bottom: 25px; padding: 25px;">
                <!-- FORMULÁRIO DE LANÇAMENTO -->
                <div class="hide-on-print" style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed rgba(230,126,34,0.15);">
                    <h3 style="margin: 0 0 15px 0; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-circle-plus" style="color:#e67e22;"></i> Cadastrar Novo Lote no Pátio</h3>

                    <form id="formAdicionarItemPatio" class="patio-form-grid package-entry-grid">
                        <div class="input-group patio-campo-tipo" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-tree"></i> Tipo de Madeira</label>
                            <select id="patioItemTipo">
                                <option value="TÁBUA">TÁBUA</option>
                                <option value="VIGA">VIGA</option>
                                <option value="VIGOTA">VIGOTA</option>
                                <option value="RIPA">RIPA</option>
                                <option value="TABUADO">TABUADO</option>
                                <option value="OUTROS">OUTROS</option>
                            </select>
                        </div>
                        <div class="input-group patio-campo-classe" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-award"></i> Qualidade / Classe</label>
                            <select id="patioItemClasse" class="patio-classe-select patio-classe-1">
                                <option value="1ª CLASSE">1ª Classe</option>
                                <option value="2ª CLASSE">2ª Classe</option>
                                <option value="3ª CLASSE">3ª Classe</option>
                            </select>
                        </div>
                        <div class="input-group patio-especie-compacta" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-seedling"></i> Espécie</label>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; min-height: 42px;">
                                <label style="display:flex; align-items:center; gap:5px; margin:0; font-size:0.8rem; color:#fff;"><input type="radio" name="patioItemEspecie" value="EUCALIPTO" checked> Eucalipto</label>
                                <label style="display:flex; align-items:center; gap:5px; margin:0; font-size:0.8rem; color:#fff;"><input type="radio" name="patioItemEspecie" value="PINOS"> Pinos</label>
                                <label style="display:flex; align-items:center; gap:5px; margin:0; font-size:0.8rem; color:#fff;"><input type="radio" name="patioItemEspecie" value="OUTROS"> Outros</label>
                            </div>
                        </div>
                        <div class="input-group patio-campo-medida" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-ruler-horizontal"></i> Espessura (cm)</label>
                            <input type="text" id="patioItemEsp" placeholder="Ex: 1,8" required>
                        </div>
                        <div class="input-group patio-campo-medida" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-ruler-combined"></i> Largura (cm)</label>
                            <input type="text" id="patioItemLarg" placeholder="Ex: 7,0" required>
                        </div>
                        <div class="input-group patio-campo-medida" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-ruler"></i> Comprimento (m)</label>
                            <input type="text" id="patioItemComp" placeholder="Ex: 2,40" required>
                        </div>
                        <div class="input-group patio-campo-pacotes" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-box"></i> Qtd Pacotes</label>
                            <input type="number" id="patioItemPacotes" min="1" placeholder="Qtd" required style="padding: 8px 6px !important; text-align: center;">
                        </div>
                        <div class="input-group patio-campo-formacao" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-calculator"></i> Alt x Cam + Am.</label>
                            <div class="package-entry-calc">
                                <input type="number" id="patioItemAltura" class="calc-patio" style="width: 100%; padding: 8px 6px !important; text-align: center;" placeholder="Alt">
                                <input type="number" id="patioItemCamada" class="calc-patio" style="width: 100%; padding: 8px 6px !important; text-align: center;" placeholder="Larg">
                                <input type="number" id="patioItemAmarras" class="calc-patio" style="width: 100%; padding: 8px 6px !important; text-align: center;" placeholder="Am">
                            </div>
                        </div>
                        <div class="input-group package-entry-total patio-campo-pecas" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-layer-group"></i> Peças/Pct</label>
                            <input type="number" id="patioItemPecas" min="1" placeholder="Total" required style="background: rgba(0,0,0,0.1) !important; color: #fff !important; cursor: not-allowed; padding: 8px 6px !important; text-align: center;" readonly>
                        </div>
                        <div class="input-group package-entry-total patio-campo-volume" style="margin-bottom: 0;">
                            <label><i class="fa-solid fa-cube"></i> Vol.</label>
                            <input type="text" id="patioItemVolumePreview" placeholder="0,000" readonly style="background: rgba(0,0,0,0.1) !important; color: #4ade80 !important; cursor: not-allowed; padding: 8px 6px !important; text-align: center; max-width: 86px;">
                        </div>
                        <div class="btn-add-lote-col" style="margin-bottom: 0;">
                            <button type="submit" class="btn-patio-print" style="padding: 10px; height: 42px; display: flex; align-items: center; justify-content: center; width: 100%; font-size: 1.2rem; border-radius: 8px; background: linear-gradient(135deg, #e67e22 0%, #c8630b 100%) !important;" title="Adicionar Lote">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- LISTA DE PÁTIO (MOCKUP STYLE) -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-regular fa-file-lines"></i> LISTA DE PÁTIO
                        </h3>
                        <button type="button" id="btnLimparTudoPatio" class="hide-on-print" style="background: none; border: none; color: #f87171; font-weight: bold; font-size: 0.8rem; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;">
                            LIMPAR TUDO
                        </button>
                    </div>

                    <div class="table-container" style="overflow-x: auto;">
                        <table class="patio-lista-areia" style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 1.5px solid #543725;">
                                    <th style="font-size: 0.75rem; padding: 12px 10px; font-weight: bold; text-transform: uppercase;">CLASSE</th>
                                    <th style="font-size: 0.75rem; padding: 12px 10px; font-weight: bold; text-transform: uppercase;">MEDIDAS</th>
                                    <th style="font-size: 0.75rem; padding: 12px 10px; font-weight: bold; text-transform: uppercase; text-align: center;">PACOTES</th>
                                    <th style="font-size: 0.75rem; padding: 12px 10px; font-weight: bold; text-transform: uppercase; text-align: center;">TOTAL PÇS</th>
                                    <th style="font-size: 0.75rem; padding: 12px 10px; font-weight: bold; text-transform: uppercase; text-align: right;">VOLUME (M³)</th>
                                    <th class="hide-on-print" style="font-size: 0.75rem; padding: 12px 10px; font-weight: bold; text-transform: uppercase; text-align: center;">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody id="listaItensPatioTemp">
                                <tr>
                                    <td colspan="6" style="text-align: center; color: #c4a482; padding: 30px; font-size: 0.9rem;">Nenhum pacote na lista de pátio. Adicione ou configure os lotes acima.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- SEÇÃO DE PERSISTÊNCIA -->
            <div class="hide-on-print" style="display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 25px; flex-wrap: wrap;">
                <button type="button" id="btnSalvarRelatorioPatio" class="btn-patio-save" style="padding: 12px 28px; font-weight: bold; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                    <i class="fa-solid fa-floppy-disk"></i> Salvar Lançamento do Pátio
                </button>
            </div>

            <!-- HISTÓRICO DE CONTAGENS -->
            <div class="glass-panel hide-on-print" style="padding: 20px; border-radius: 16px;">
                <h3 style="margin: 0 0 15px 0; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-clock-rotate-left"></i> Histórico de Contagens Recentes (Pátio Diário)
                </h3>

                <div class="table-container" style="max-height: 250px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1.5px solid #e2e8f0;">
                                <th style="color: #64748b; font-size: 0.75rem; padding: 10px 8px; font-weight: bold;">DATA / HORA</th>
                                <th style="color: #64748b; font-size: 0.75rem; padding: 10px 8px; font-weight: bold;">PERÍODO</th>
                                <th style="color: #64748b; font-size: 0.75rem; padding: 10px 8px; font-weight: bold;">MADEIRA SERRANDO</th>
                                <th style="color: #64748b; font-size: 0.75rem; padding: 10px 8px; font-weight: bold; text-align: center;">PACOTES</th>
                                <th style="color: #64748b; font-size: 0.75rem; padding: 10px 8px; font-weight: bold; text-align: center;">PEÇAS</th>
                                <th style="color: #64748b; font-size: 0.75rem; padding: 10px 8px; font-weight: bold; text-align: right;">VOLUME</th>
                                <th style="color: #64748b; font-size: 0.75rem; padding: 10px 8px; font-weight: bold; text-align: center;">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody id="listaHistoricoPatio">
                            <tr>
                                <td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">Carregando histórico...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
