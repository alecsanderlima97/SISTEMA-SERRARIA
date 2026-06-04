(function() {
    const html = `            <section id="view-romaneio-v2" class="view-section" style="display: none;">
                <div id="secao-romaneio-v2">
                    <div class="main-header">
                        <h1><i class="fa-solid fa-file-invoice"></i> Gerar Romaneio</h1>
                        <p>Sistema profissional agrupado por classes e logística detalhada.</p>
                    </div>

                    <!-- 1. Cabeçalho Logístico -->
                    <div class="logistics-grid">
                        <div class="card-v2">
                            <span class="card-title">Dados da Carga</span>
                            <div class="input-group-v2">
                                <label>Selecionar Cliente</label>
                                <select id="v2-select-cliente" class="input-v2">
                                    <option value="">Selecione um cliente...</option>
                                </select>
                            </div>
                            <input type="hidden" id="v2-cliente">
                            
                            <!-- Novo painel de info do cliente -->
                            <div id="v2-info-cliente-box" style="display: none; background: rgba(0, 255, 136, 0.1); border: 1px solid var(--accent-color); border-radius: 8px; padding: 10px; margin-top: 10px;">
                                <h4 style="margin: 0 0 5px 0; color: var(--accent-color); font-size: 0.9rem;"><i class="fa-solid fa-circle-info"></i> Condições Comerciais do Cliente</h4>
                                <div id="v2-info-cliente-texto" style="font-size: 0.85rem; color: #eee; line-height: 1.4;"></div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                                <div class="input-group-v2">
                                    <label>Data Carreg.</label>
                                    <input type="date" id="v2-data-carreg" class="input-v2">
                                </div>
                                <div class="input-group-v2">
                                    <label>Nº Romaneio (Ordem)</label>
                                    <input type="number" id="v2-numero-ordem" class="input-v2" placeholder="000">
                                </div>
                            </div>
                            <div class="input-group-v2" style="margin-top: 10px;">
                                <label>Data Descarreg.</label>
                                <input type="date" id="v2-data-descarreg" class="input-v2">
                            </div>
                        </div>

                        <div class="card-v2">
                            <span class="card-title">Transporte e Logística</span>
                            
                            <div class="input-group-v2">
                                <label>1. Transportadora / Responsável</label>
                                <select id="v2-select-transporte" class="input-v2">
                                    <option value="">Selecione uma transportadora...</option>
                                </select>
                            </div>

                            <div class="input-group-v2" style="margin-top: 15px;">
                                <label>2. Motorista</label>
                                <input type="text" id="v2-motorista" class="input-v2 text-uppercase-input" placeholder="Nome do Motorista">
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                                <div class="input-group-v2">
                                    <label>3. Caminhão</label>
                                    <input type="text" id="v2-caminhao" class="input-v2 text-uppercase-input" placeholder="Modelo">
                                </div>
                                <div class="input-group-v2">
                                    <label>4. Placa</label>
                                    <input type="text" id="v2-placa" class="input-v2 text-uppercase-input" placeholder="ABC-1234">
                                </div>
                            </div>

                            <div class="input-group-v2" style="margin-top: 15px; background: rgba(245, 158, 11, 0.1); padding: 10px; border-radius: 8px; border: 1px solid var(--warning);">
                                <label style="color: var(--warning); font-weight: 800;">5. VALOR DO FRETE (R\$/m³)</label>
                                <input type="text" id="v2-valor-frete" class="input-v2" placeholder="0,00" style="border-color: var(--warning); font-weight: bold; font-size: 1.2rem; color: var(--warning);">
                            </div>
                        </div>

                    </div>

                    <!-- 2. Adicionar Pacotes (Entrada de Dados) -->
                    <div class="card-v2 package-entry-card" style="margin-bottom: 30px;">
                        <span class="card-title" style="color: var(--accent);">Adicionar Pacotes à Carga</span>
                        <div class="entry-form package-entry-grid">
                            <div class="input-group-v2">
                                <label>Madeira Cadastrada</label>
                                <select id="v2-select-produto" class="input-v2">
                                    <option value="">Selecione uma madeira...</option>
                                </select>
                            </div>
                            <div class="input-group-v2" id="grupoV2MadeiraManual" style="display:none;">
                                <label>Nome da madeira</label>
                                <input type="text" id="v2-produto-manual" class="input-v2 text-uppercase-input" placeholder="Ex: TABUA">
                            </div>
                            <div class="input-group-v2">
                                <label>Classe</label>
                                <select id="v2-qualidade" class="input-v2 patio-classe-select patio-classe-1">
                                    <option value="1a CLASSE">1a Classe</option>
                                    <option value="2a CLASSE">2a Classe</option>
                                    <option value="3a CLASSE">3a Classe</option>
                                    <option value="OUTRO">Outro</option>
                                </select>
                            </div>
                            <div class="input-group-v2" id="grupoV2ClasseOutro" style="display:none;">
                                <label>Nome da classe</label>
                                <input type="text" id="v2-classe-outro" class="input-v2 text-uppercase-input" placeholder="Ex: EXTRA">
                            </div>
                            <div class="input-group-v2">
                                <label>Especie</label>
                                <select id="v2-especie" class="input-v2">
                                    <option value="EUCALIPTO">Eucalipto</option>
                                    <option value="PINOS">Pinos</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>
                            <div class="input-group-v2">
                                <label>Preco m3 (R$)</label>
                                <input type="text" id="v2-preco-m3-item" class="input-v2" placeholder="R$ 0,00">
                            </div>
                            <div class="input-group-v2">
                                <label>Espessura (cm)</label>
                                <input type="text" id="v2-espessura" class="input-v2" inputmode="decimal" placeholder="0,0">
                            </div>
                            <div class="input-group-v2">
                                <label>Largura (cm)</label>
                                <input type="text" id="v2-largura" class="input-v2" inputmode="decimal" placeholder="0,0">
                            </div>
                            <div class="input-group-v2">
                                <label>Comp. Venda (m)</label>
                                <input type="text" id="v2-comprimento" class="input-v2" inputmode="decimal" placeholder="0,00">
                            </div>
                            <div class="input-group-v2">
                                <label>Comp. Real (Frete)</label>
                                <input type="text" id="v2-comprimento-real" class="input-v2" inputmode="decimal" placeholder="0,00">
                            </div>

                            
                            <!-- Calculadora de Peças Interna -->
                            <div class="input-group-v2">
                                <label>Alt x Cam + Am.</label>
                                <div class="package-entry-calc">
                                    <input type="number" id="v2-altura" class="input-v2" style="padding: 5px; text-align:center;" placeholder="Alt">
                                    <input type="number" id="v2-camada" class="input-v2" style="padding: 5px; text-align:center;" placeholder="Cam">
                                    <input type="number" id="v2-amarras" class="input-v2" style="padding: 5px; text-align:center;" placeholder="Am">
                                </div>
                            </div>

                             <div class="input-group-v2">
                                <label>Qtd Peças/Pacote</label>
                                <input type="number" id="v2-quantidade" class="input-v2" placeholder="0">
                            </div>
                             <div class="input-group-v2">
                                <label>Qtd Pacotes</label>
                                <input type="number" id="v2-qtd-pacotes" class="input-v2" value="1" min="1">
                            </div>
                             <div class="input-group-v2 package-entry-wide">
                                <label style="color: var(--accent); font-weight: 700;"><i class="fa-solid fa-cube" style="margin-right:5px;"></i>Volume do Item (m³) — calculado automaticamente</label>
                                <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,255,136,0.05); border: 1px solid var(--accent); border-radius: 8px; padding: 10px 16px; flex-wrap:wrap;">
                                    <span style="color: var(--text-muted); font-size: 0.85rem;">Por pacote:</span>
                                    <strong id="v2-volume-unit" style="color: var(--accent); font-size: 1.1rem;">0,000 m³</strong>
                                    <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 20px;">Total (todos os pacotes):</span>
                                    <strong id="v2-volume-total" style="color: #00ff88; font-size: 1.2rem;">0,000 m³</strong>
                                </div>
                            </div>

                            <div class="package-entry-wide" style="display: flex; gap: 10px; align-items: flex-end;">
                                <button id="btn-add-pacote-v2" class="btn-v2 btn-primary-v2" style="flex: 1;">
                                    <i class="fa-solid fa-plus"></i> Adicionar Pacote
                                </button>
                                <button id="btn-update-pacote-v2" class="btn-v2 btn-secondary-v2" style="display: none; flex: 1; background: var(--warning); color: black;">
                                    <i class="fa-solid fa-save"></i> Atualizar Pacote
                                </button>
                                <button id="btn-limpar-romaneio-v2" class="btn-v2" style="background: var(--danger); color: white;">
                                    <i class="fa-solid fa-trash-can"></i> Limpar Tudo
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 3. Lista de Pacotes Agrupados -->
                    <div id="v2-lista-classes">
                        <!-- Gerado dinamicamente pelo JS -->
                        <p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhum pacote adicionado ainda.</p>
                    </div>

                    <!-- 4. Resumo Financeiro -->
                    <div style="margin-top: 40px; background: rgba(245, 158, 11, 0.05); padding: 15px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.2); display: flex; flex-wrap: wrap; align-items: flex-end; gap: 15px;">
                        <div class="input-group-v2">
                            <label style="color: var(--warning);">Taxa NF (%)</label>
                            <input type="number" id="v2-taxa-nf" class="input-v2" style="width: 90px; border-color: var(--warning);" value="9.3" step="0.1">
                        </div>
                        <div class="input-group-v2">
                            <label style="color: var(--accent);">Ajuste Madeira (R\$)</label>
                            <input type="text" id="v2-adicional-madeira" class="input-v2" style="width: 130px;" value="0" placeholder="Ex: -50 ou 100">
                        </div>
                        <div class="input-group-v2" style="flex: 1; min-width: 200px;">
                            <label>Obs. Ajuste Madeira</label>
                            <input type="text" id="v2-obs-madeira" class="input-v2" placeholder="Motivo do desconto/adicional">
                        </div>
                        <div class="input-group-v2">
                            <label style="color: var(--warning);">Ajuste Frete (R\$)</label>
                            <input type="text" id="v2-adicional-frete" class="input-v2" style="width: 130px;" value="0" placeholder="Ex: -50 ou 100">
                        </div>
                        <div class="input-group-v2" style="flex: 1; min-width: 200px;">
                            <label>Obs. Ajuste Frete</label>
                            <input type="text" id="v2-obs-frete" class="input-v2" placeholder="Motivo do desconto/adicional frete">
                        </div>
                    </div>

                    <!-- Observação Geral da Carga -->
                    <div class="card-v2" style="margin-top: 15px;">
                        <span class="card-title">Observação da Carga</span>
                        <div class="input-group-v2">
                            <textarea id="v2-obs-carga" class="input-v2" style="width: 100%; min-height: 80px; resize: vertical; padding: 10px;" placeholder="Adicione informações importantes sobre a carga, cliente ou motorista..."></textarea>
                        </div>
                    </div>

                    <div class="finance-footer" style="margin-top: 15px;">
                        <!-- O conteúdo detalhado e cálculos são gerados pelo js/romaneio_v2.js -->
                        <p style="text-align: center; width: 100%;">Carregando cálculos...</p>
                    </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
