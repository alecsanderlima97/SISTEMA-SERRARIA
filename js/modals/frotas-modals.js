(function() {
    const html = `            <!-- ====== MODAL: LANÇAMENTO DE ABASTECIMENTO (DIESEL / LUBRIFICANTES) ====== -->
            <div id="modalAbastecimento" class="modal-v2" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(0,0,0,0.85);">
                <div class="modal-content-v2" style="width: 100%; max-width: 650px; border-radius: 16px; padding: 25px; border: 1px solid var(--panel-border); background: #1e293b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 id="tituloModalAbastecimento" style="margin: 0; color: white;"><i class="fa-solid fa-gas-pump" style="color: var(--danger-color);"></i> Lancar Abastecimento</h2>
                        <button type="button" class="btn-action-card" onclick="window.fecharModalAbastecimento()" style="padding: 8px 12px;"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div id="abastVeiculoCard" style="border: 1px solid var(--panel-border); border-radius: 8px; padding: 12px; margin-bottom: 20px; background: rgba(255,255,255,0.03); display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <!-- Preenchido via JS -->
                    </div>

                    <form id="formAbastecimento" class="grid-form" style="margin-bottom: 20px;">
                        <input type="hidden" id="abastVeiculoId">

                        <div class="input-group">
                            <label for="abastData">Data do Lançamento</label>
                            <input type="date" id="abastData">
                        </div>

                        <div class="input-group">
                            <label for="abastTipo">Insumo / Combustível</label>
                            <select id="abastTipo" onchange="window.atualizarPrecoUnitarioEstoque()">
                                <option value="DIESEL">DIESEL COMUM - SERRARIA</option>
                                <option value="DIESEL_POSTO">DIESEL POSTO - CIDADE</option>
                                <option value="LUBRIFICANTE">LUBRIFICANTE / OLEO</option>
                            </select>
                        </div>

                        <div class="input-group">
                            <label for="abastQtd">Quantidade (Litros)</label>
                            <input type="number" id="abastQtd" step="0.01" placeholder="Ex: 50" oninput="window.calcularTotalAbastecimento()">
                        </div>

                        <div class="input-group" id="grupoAbastRequisicao" style="display: none; min-width: 0;">
                            <label for="abastRequisicao">Numero da Requisicao</label>
                            <input type="text" id="abastRequisicao" class="text-uppercase-input" placeholder="Ex: REQ-001" style="width: 100%; min-width: 0;">
                        </div>

                        <div class="input-group">
                            <label for="abastPreco">Preço Unitário (R\$)</label>
                            <input type="text" id="abastPreco" placeholder="R\$ 0,00" oninput="window.calcularTotalAbastecimento()">
                        </div>

                        <div class="input-group">
                            <label for="abastTotal">Valor Total Calculado</label>
                            <input type="text" id="abastTotal" placeholder="R\$ 0,00" readonly style="background: rgba(255,255,255,0.05); font-weight: bold; color: var(--accent-color);">
                        </div>

                        <div class="input-group">
                            <label for="abastHorimetro">Horímetro / KM Atual</label>
                            <input type="number" id="abastHorimetro" placeholder="Ex: 154200">
                        </div>

                        <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                            <button type="button" class="btn-secondary" onclick="window.fecharModalAbastecimento()" style="padding: 10px 20px;">Fechar</button>
                            <button type="submit" class="btn-primary" style="padding: 10px 25px; background: var(--danger-color) !important; box-shadow: 0 0 10px rgba(239,68,68,0.25);">Registrar Consumo</button>
                        </div>
                    </form>

                    <!-- Histórico de Consumo do Veículo -->
                    <h3 style="font-size: 0.95rem; border-bottom: 1px solid var(--panel-border); padding-bottom: 5px; margin-bottom: 10px; color: white;">Historico de Consumo Recente</h3>
                    <div class="table-container" style="max-height: 180px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--panel-border);">
                                    <th style="padding: 6px; color: var(--text-muted);">Data</th>
                                    <th style="padding: 6px; color: var(--text-muted);">Tipo</th>
                                    <th style="padding: 6px; text-align: center; color: var(--text-muted);">Qtd</th>
                                    <th style="padding: 6px; text-align: right; color: var(--text-muted);">Total</th>
                                    <th style="padding: 6px; text-align: center; color: var(--text-muted);">Horímetro</th>
                                    <th style="padding: 6px; text-align: center; color: var(--text-muted);">Ação</th>
                                </tr>
                            </thead>
                            <tbody id="listaAbastecimentosVeiculo">
                                <!-- Preenchido dinamicamente via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ====== MODAL: CHECKLIST & MANUTENÇÃO (ESTOQUE DE PEÇAS LINKED) ====== -->
            <div id="modalManutencao" class="modal-v2" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(0,0,0,0.85);">
                <div class="modal-content-v2" style="width: 100%; max-width: 750px; border-radius: 16px; padding: 25px; border: 1px solid var(--panel-border); background: #1e293b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: white;"><i class="fa-solid fa-screwdriver-wrench" style="color: var(--accent-color);"></i> Manutenção & Checklist</h2>
                        <button type="button" class="btn-action-card" onclick="window.fecharModalManutencao()" style="padding: 8px 12px;"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div id="manutVeiculoCard" style="border: 1px solid var(--panel-border); border-radius: 8px; padding: 12px; margin-bottom: 20px; background: rgba(255,255,255,0.03); display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <!-- Preenchido via JS -->
                    </div>

                    <form id="formManutencao" class="grid-form" style="margin-bottom: 20px;">
                        <input type="hidden" id="manutVeiculoId">

                        <div class="input-group">
                            <label for="manutData">Data da Manutenção</label>
                            <input type="date" id="manutData">
                        </div>

                        <div class="input-group">
                            <label for="manutTipo">Tipo de Serviço</label>
                            <select id="manutTipo">
                                <option value="CORRETIVA">CORRETIVA</option>
                                <option value="PREVENTIVA">PREVENTIVA / REVISÃO</option>
                                <option value="CHECKLIST">CHECKLIST PERIÓDICO</option>
                            </select>
                        </div>

                        <div class="input-group">
                            <label for="manutHorimetro">Horímetro / KM Atual</label>
                            <input type="number" id="manutHorimetro" placeholder="Ex: 154200">
                        </div>

                        <!-- Itens do Checklist Rápido -->
                        <div style="grid-column: span 3; border: 1px solid var(--panel-border); border-radius: 8px; padding: 15px; background: rgba(255,255,255,0.02);">
                            <h4 style="margin: 0 0 10px 0; color: white; font-size: 0.9rem;"><i class="fa-solid fa-list-check"></i> Checklist de Inspeção Visual</h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #cbd5e1; cursor: pointer;">
                                    <input type="checkbox" id="chkOleo" value="Óleo e Filtros"> Óleo & Filtros Ok
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #cbd5e1; cursor: pointer;">
                                    <input type="checkbox" id="chkFreios" value="Sistema de Freios"> Sistema de Freios Ok
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #cbd5e1; cursor: pointer;">
                                    <input type="checkbox" id="chkPneus" value="Pneus / Lagartas"> Pneus / Rodagem Ok
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #cbd5e1; cursor: pointer;">
                                    <input type="checkbox" id="chkEletrica" value="Elétrica e Faróis"> Sistema Elétrico Ok
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #cbd5e1; cursor: pointer;">
                                    <input type="checkbox" id="chkArrefecimento" value="Arrefecimento"> Arrefecimento Ok
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #cbd5e1; cursor: pointer;">
                                    <input type="checkbox" id="chkEstrutural" value="Chassi / Implementos"> Chassi / Caçamba Ok
                                </label>
                            </div>
                        </div>

                        <!-- Peças do Estoque Utilizadas -->
                        <div style="grid-column: span 3; border: 1.5px solid var(--panel-border); border-radius: 8px; padding: 15px; background: rgba(255,255,255,0.02);">
                            <h4 style="margin: 0 0 10px 0; color: white; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                                <span><i class="fa-solid fa-cubes"></i> Peças Utilizadas (Dedução Automática do Estoque)</span>
                                <small style="color: var(--accent-color); font-size: 0.75rem; font-style: italic;">* Vinculado ao almoxarifado</small>
                            </h4>
                            <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: flex-end;">
                                <div style="flex: 2;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label id="lblManutItemEstoque" style="font-size: 0.75rem; color: var(--text-muted); display: block; margin: 0;">Selecionar Peça / Item do Estoque</label>
                                        <label style="font-size: 0.72rem; color: var(--accent-color); display: flex; align-items: center; gap: 4px; cursor: pointer; margin: 0;">
                                            <input type="checkbox" id="chkPecaManual" onchange="window.togglePecaManual(this.checked)" style="margin: 0;"> Peça Fora de Estoque
                                        </label>
                                    </div>
                                    <select id="manutItemEstoque" style="width: 100%; border-radius: 6px; padding: 8px;" onchange="window.atualizarPrecoPecaDinamica()">
                                        <!-- Carregado do Estoque via JS -->
                                    </select>
                                    <input type="text" id="manutItemManual" class="text-uppercase-input" placeholder="Digite o nome da peça..." style="display: none; width: 100%; border-radius: 6px; padding: 8px; border: 1px solid var(--panel-border); background: rgba(0,0,0,0.25); color: white;">
                                </div>
                                <div style="flex: 0.8;">
                                    <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Quantidade</label>
                                    <input type="number" id="manutItemQtd" min="1" value="1" style="width: 100%; border-radius: 6px; padding: 8px;">
                                </div>
                                <div style="flex: 1.2;">
                                    <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Preço Unitário (R\$)</label>
                                    <input type="text" id="manutItemPreco" placeholder="R\$ 0,00" style="width: 100%; border-radius: 6px; padding: 8px;">
                                </div>
                                <button type="button" class="btn-primary" onclick="window.adicionarPecaManutencao()" style="padding: 10px 16px; border-radius: 6px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-plus"></i></button>
                            </div>

                            <!-- Lista de Peças Selecionadas -->
                            <div style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px; max-height: 100px; overflow-y: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);">
                                            <th style="padding: 4px;">Item / Peça</th>
                                            <th style="padding: 4px; text-align: center;">Qtd</th>
                                            <th style="padding: 4px; text-align: right;">Unitário</th>
                                            <th style="padding: 4px; text-align: right;">Subtotal</th>
                                            <th style="padding: 4px; text-align: center;">Remover</th>
                                        </tr>
                                    </thead>
                                    <tbody id="listaPecasManutencaoTemp">
                                        <tr>
                                            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 8px;">Nenhuma peça selecionada ainda.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="input-group" style="grid-column: span 3;">
                            <label for="manutObs">Descrição dos Serviços / Diagnóstico</label>
                            <textarea id="manutObs" placeholder="Ex: Substituição de pastilhas de freio dianteiras, troca de filtros de óleo e diesel..." rows="2" style="width: 100%; border-radius: 8px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px;" class="text-uppercase-input"></textarea>
                        </div>

                        <div style="grid-column: span 3; display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px;">
                            <button type="button" class="btn-secondary" onclick="window.fecharModalManutencao()" style="padding: 10px 20px;">Fechar</button>
                            <button type="submit" class="btn-primary" style="padding: 10px 25px; background: var(--accent-color) !important;">Salvar Registro</button>
                        </div>
                    </form>

                    <!-- Histórico de Manutenções do Veículo -->
                    <h3 style="font-size: 0.95rem; border-bottom: 1px solid var(--panel-border); padding-bottom: 5px; margin-bottom: 10px; color: white;">Histórico de Manutenções</h3>
                    <div class="table-container" style="max-height: 180px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--panel-border);">
                                    <th style="padding: 6px; color: var(--text-muted);">Data</th>
                                    <th style="padding: 6px; color: var(--text-muted);">Tipo</th>
                                    <th style="padding: 6px; color: var(--text-muted);">Checklist</th>
                                    <th style="padding: 6px; color: var(--text-muted);">Peças Utilizadas</th>
                                    <th style="padding: 6px; text-align: center; color: var(--text-muted);">Horímetro</th>
                                    <th style="padding: 6px; text-align: center; color: var(--text-muted);">Ação</th>
                                </tr>
                            </thead>
                            <tbody id="listaManutencoesVeiculo">
                                <!-- Preenchido dinamicamente via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
