(function() {
    const html = `            <!-- ====== TELA: PRODUTOS / MADEIRAS ====== -->
            <section id="view-produtos" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-tree-city"></i> Gestão de Madeira</h1>
                    <p>Cadastre os tipos de madeira e o valor do m³</p>
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
                                    <th>Natureza / Qualidade</th>
                                    <th>Preço Base (m³)</th>
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
                    <form id="formProduto" class="grid-form">
                        <div class="input-group">
                            <label for="prodTipo">Tipo/Nome (ex: Tábua, Caibro)</label>
                            <input type="text" id="prodTipo" class="text-uppercase-input" required>
                        </div>
                        <div class="input-group">
                            <label for="prodNatureza">Natureza / Madeira</label>
                            <input type="text" id="prodNatureza" class="text-uppercase-input" placeholder="Ex: Eucalipto, Pinus, etc" required>
                        </div>
                        <div class="input-group">
                            <label for="prodQualidade">Qualidade</label>
                            <input type="text" id="prodQualidade" class="text-uppercase-input" placeholder="Ex: 1ª Qualidade, BCA, etc">
                        </div>
                        <input type="hidden" id="prodClasse" value="Geral">
                        <div class="input-group">
                            <label for="prodEspessura">Espessura (cm)</label>
                            <input type="number" id="prodEspessura" step="0.1" required placeholder="Ex: 2.5">
                        </div>
                        <div class="input-group">
                            <label for="prodLargura">Largura (cm)</label>
                            <input type="number" id="prodLargura" step="0.1" required placeholder="Ex: 10">
                        </div>
                        <div class="input-group">
                            <label for="prodComprimentoVenda">Comp. Venda (m)</label>
                            <input type="number" id="prodComprimentoVenda" step="0.1" required placeholder="Ex: 1.2">
                        </div>
                        <div class="input-group">
                            <label for="prodComprimentoReal">Comp. Real/Frete (m)</label>
                            <input type="number" id="prodComprimentoReal" step="0.1" placeholder="Vazio = igual Venda">
                        </div>
                        <div class="input-group">
                            <label for="prodPreco">Preço do m³ (R\$)</label>
                            <input type="text" id="prodPreco" required placeholder="R\$ 0,00">
                        </div>
                        <div class="input-group" style="justify-content: flex-end;">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-save"></i> Salvar Madeira</button>
                        </div>
                    </form>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
