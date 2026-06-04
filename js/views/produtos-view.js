(function() {
    const html = `            <!-- ====== TELA: PRODUTOS / MADEIRAS ====== -->
            <section id="view-produtos" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-tree-city"></i> Gestão de Madeira</h1>
                    <p>Cadastre as madeiras, classes e configuracoes de pacote</p>
                </div>

                <!-- TABS DE MADEIRAS -->
                <div style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap;">
                    <button type="button" id="btnTabProdLista" onclick="window.switchTabProdutos('lista')" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-list-check"></i> Madeiras Cadastradas
                    </button>
                    <button type="button" id="btnTabProdForm" onclick="window.switchTabProdutos('form')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-plus-circle"></i> Nova Madeira
                    </button>
                </div>

                <!-- TAB: LISTA -->
                <div id="tabProdLista" class="glass-panel" style="margin-bottom: 0;">
                    <div class="section-title">
                        <h2><i class="fa-solid fa-list-check"></i> Madeiras Cadastradas</h2>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Descrição / Tipo</th>
                                    <th>Classe / Especie</th>
                                    <th>Configuracao</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="listaProdutos">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- TAB: FORMULÁRIO -->
                <div id="tabProdForm" class="glass-panel" style="margin-bottom: 0; display: none;">
                    <div class="section-title">
                        <h2><i class="fa-solid fa-plus-circle"></i> Nova Madeira / Estilo</h2>
                    </div>
                    <form id="formProduto" class="package-entry-grid">
                        <div class="input-group">
                            <label for="prodTipo">Madeira cadastrada</label>
                            <input type="text" id="prodTipo" class="text-uppercase-input" placeholder="Ex: TABUA" required>
                        </div>
                        <div class="input-group">
                            <label for="prodClasse">Classe</label>
                            <select id="prodClasse" class="patio-classe-select patio-classe-1" required>
                                <option value="1a CLASSE">1a Classe</option>
                                <option value="2a CLASSE">2a Classe</option>
                                <option value="3a CLASSE">3a Classe</option>
                                <option value="OUTRO">Outro</option>
                            </select>
                        </div>
                        <div class="input-group" id="grupoProdClasseOutro" style="display:none;">
                            <label for="prodClasseOutro">Nome da classe</label>
                            <input type="text" id="prodClasseOutro" class="text-uppercase-input" placeholder="Ex: EXTRA">
                        </div>
                        <div class="input-group">
                            <label for="prodNatureza">Especie</label>
                            <select id="prodNatureza" required>
                                <option value="EUCALIPTO">Eucalipto</option>
                                <option value="PINOS">Pinos</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="prodEspessura">Espessura (cm)</label>
                            <input type="text" id="prodEspessura" inputmode="decimal" required placeholder="Ex: 2,5">
                        </div>
                        <div class="input-group">
                            <label for="prodLargura">Largura (cm)</label>
                            <input type="text" id="prodLargura" inputmode="decimal" required placeholder="Ex: 10">
                        </div>
                        <div class="input-group">
                            <label for="prodComprimentoVenda">Comp. Venda (m)</label>
                            <input type="text" id="prodComprimentoVenda" inputmode="decimal" required placeholder="Ex: 1,35">
                        </div>
                        <div class="input-group">
                            <label for="prodComprimentoReal">Comp. Real/Frete (m)</label>
                            <input type="text" id="prodComprimentoReal" inputmode="decimal" placeholder="Vazio = igual Venda">
                        </div>
                        <div class="input-group">
                            <label>Alt x Larg + Am.</label>
                            <div class="package-entry-calc">
                                <input type="number" id="prodAlturas" min="1" placeholder="Alt">
                                <input type="number" id="prodLarguraPacote" min="1" placeholder="Larg">
                                <input type="number" id="prodAmarras" min="0" value="0" placeholder="Am">
                            </div>
                        </div>
                        <div class="package-entry-total">
                            <span>Pecas do pacote</span>
                            <strong id="prodTotalPecas">0 pc</strong>
                        </div>
                        <div class="package-entry-total">
                            <span>Volume por pacote</span>
                            <strong id="prodVolumePacote">0,000 m3</strong>
                        </div>
                        <div class="input-group" style="justify-content: flex-end;">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-save"></i> Salvar Madeira</button>
                        </div>
                    </form>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
