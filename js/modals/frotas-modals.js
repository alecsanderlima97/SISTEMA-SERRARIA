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

                        <div class="input-group" id="grupoAbastLubrificante" style="display: none;">
                            <label for="abastLubrificanteItem">Lubrificante do Estoque</label>
                            <select id="abastLubrificanteItem" onchange="window.atualizarPrecoUnitarioEstoque()">
                                <option value="">Selecione o lubrificante...</option>
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

            <!-- ====== MODAL: CHECKLIST & MANUTENCAO (ESTOQUE DE PECAS LINKED) ====== -->
            <div id="modalManutencao" class="modal-v2" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(0,0,0,0.85); overflow-y:auto;">
                <div class="modal-content-v2" style="width: 100%; max-width: 1080px; max-height: 94vh; overflow-y: auto; border-radius: 16px; padding: 22px; border: 1px solid var(--panel-border); background: #1e293b;">
                    <style>
                        #modalManutencao .manut-topo { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:16px; position:sticky; top:0; z-index:2; background:#1e293b; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); }
                        #modalManutencao .manut-shell { display:grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, .75fr); gap:16px; align-items:start; }
                        #modalManutencao .manut-card { border:1px solid rgba(255,255,255,0.08); border-radius:12px; background:rgba(15,23,42,0.34); padding:14px; min-width:0; }
                        #modalManutencao .manut-card h3 { margin:0 0 12px 0; color:var(--accent-color); font-size:.95rem; display:flex; align-items:center; gap:8px; }
                        #modalManutencao .manut-grid-3 { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10px; }
                        #modalManutencao .manut-grid-2 { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
                        #modalManutencao .input-group { margin-bottom:0 !important; min-width:0; }
                        #modalManutencao input, #modalManutencao select, #modalManutencao textarea { width:100%; min-width:0; box-sizing:border-box; }
                        #modalManutencao .checklist-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:8px; }
                        #modalManutencao .check-item { display:flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:9px; color:#cbd5e1; background:rgba(255,255,255,0.025); font-size:.84rem; cursor:pointer; }
                        #modalManutencao .peca-linha { display:grid; grid-template-columns: minmax(0, 1.8fr) .62fr .85fr auto; gap:10px; align-items:end; margin-bottom:12px; }
                        #modalManutencao details summary { cursor:pointer; color:#fff; font-weight:800; display:flex; align-items:center; gap:8px; }
                        @media (max-width: 980px) { #modalManutencao .manut-shell { grid-template-columns:1fr; } #modalManutencao .peca-linha { grid-template-columns:1fr 1fr; } }
                        @media (max-width: 620px) { #modalManutencao .manut-grid-3, #modalManutencao .manut-grid-2, #modalManutencao .checklist-grid, #modalManutencao .peca-linha { grid-template-columns:1fr; } }
                    </style>

                    <div class="manut-topo">
                        <h2 style="margin: 0; color: white;"><i class="fa-solid fa-screwdriver-wrench" style="color: var(--accent-color);"></i> Manutencao & Checklist</h2>
                        <button type="button" class="btn-action-card" onclick="window.fecharModalManutencao()" style="padding: 8px 12px;"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div id="manutVeiculoCard" style="border: 1px solid var(--panel-border); border-radius: 10px; padding: 12px; margin-bottom: 16px; background: rgba(255,255,255,0.03); display: flex; justify-content: space-between; gap:12px; font-size: 0.9rem; flex-wrap:wrap;"></div>

                    <form id="formManutencao" style="margin-bottom: 16px;">
                        <input type="hidden" id="manutVeiculoId">
                        <div class="manut-shell">
                            <div style="display:grid; gap:14px;">
                                <div class="manut-card">
                                    <h3><i class="fa-solid fa-clipboard-list"></i> Dados do Servico</h3>
                                    <div class="manut-grid-3">
                                        <div class="input-group"><label for="manutData">Data</label><input type="date" id="manutData"></div>
                                        <div class="input-group"><label for="manutTipo">Tipo</label><select id="manutTipo"><option value="CORRETIVA">CORRETIVA</option><option value="PREVENTIVA">PREVENTIVA / REVISAO</option><option value="CHECKLIST">CHECKLIST PERIODICO</option></select></div>
                                        <div class="input-group"><label for="manutHorimetro">Horimetro / KM</label><input type="number" id="manutHorimetro" placeholder="Ex: 154200"></div>
                                    </div>
                                    <div class="input-group" style="margin-top:10px !important;"><label for="manutObs">Descricao dos Servicos / Diagnostico</label><textarea id="manutObs" placeholder="Ex: troca de filtros, ajuste, vazamento encontrado..." rows="3" style="border-radius: 8px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px;" class="text-uppercase-input"></textarea></div>
                                </div>

                                <div class="manut-card manut-pecas-card">
                                    <h3><i class="fa-solid fa-cubes"></i> Pecas e Insumos Utilizados</h3>
                                    <div class="peca-linha">
                                        <div>
                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:8px;">
                                                <label id="lblManutItemEstoque" style="font-size:0.75rem; color:var(--text-muted); margin:0;">Selecionar item do estoque</label>
                                                <label style="font-size:0.72rem; color:var(--accent-color); display:flex; align-items:center; gap:4px; cursor:pointer; margin:0;"><input type="checkbox" id="chkPecaManual" onchange="window.togglePecaManual(this.checked)" style="margin:0; width:auto;"> Fora de estoque</label>
                                            </div>
                                            <select id="manutItemEstoque" style="border-radius:6px; padding:8px;" onchange="window.atualizarPrecoPecaDinamica()"></select>
                                            <input type="text" id="manutItemManual" class="text-uppercase-input" placeholder="Digite o nome da peca..." style="display:none; border-radius:6px; padding:8px; border:1px solid var(--panel-border); background:rgba(0,0,0,0.25); color:white;">
                                        </div>
                                        <div><label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Quantidade</label><input type="number" id="manutItemQtd" min="1" value="1" style="border-radius:6px; padding:8px;"></div>
                                        <div><label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:4px;">Unitario R$</label><input type="text" id="manutItemPreco" placeholder="R$ 0,00" style="border-radius:6px; padding:8px;"></div>
                                        <button type="button" class="btn-primary" onclick="window.adicionarPecaManutencao()" style="padding:10px 16px; border-radius:6px; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-plus"></i></button>
                                    </div>

                                    <div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:10px; max-height:260px; overflow-y:auto;">
                                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                            <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted);"><th style="padding:4px;">Item</th><th style="padding:4px; text-align:center;">Qtd</th><th style="padding:4px; text-align:right;">Unit.</th><th style="padding:4px; text-align:right;">Subtotal</th><th style="padding:4px; text-align:center;">Remover</th></tr></thead>
                                            <tbody id="listaPecasManutencaoTemp"><tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:8px;">Nenhuma peca selecionada ainda.</td></tr></tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="manut-card">
                                <h3><i class="fa-solid fa-list-check"></i> Checklist Visual</h3>
                                <div class="checklist-grid">
                                    <label class="check-item"><input type="checkbox" id="chkOleo" value="Oleo e Filtros"> Oleo & Filtros Ok</label>
                                    <label class="check-item"><input type="checkbox" id="chkFreios" value="Sistema de Freios"> Sistema de Freios Ok</label>
                                    <label class="check-item"><input type="checkbox" id="chkPneus" value="Pneus / Lagartas"> Pneus / Rodagem Ok</label>
                                    <label class="check-item"><input type="checkbox" id="chkEletrica" value="Eletrica e Farois"> Sistema Eletrico Ok</label>
                                    <label class="check-item"><input type="checkbox" id="chkArrefecimento" value="Arrefecimento"> Arrefecimento Ok</label>
                                    <label class="check-item"><input type="checkbox" id="chkEstrutural" value="Chassi / Implementos"> Chassi / Cacamba Ok</label>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px; flex-wrap:wrap;">
                            <button type="button" class="btn-secondary" onclick="window.fecharModalManutencao()" style="padding:10px 20px;">Fechar</button>
                            <button type="submit" class="btn-primary" style="padding:10px 25px; background:var(--accent-color) !important;">Salvar Registro</button>
                        </div>
                    </form>

                    <details class="manut-card" style="padding:12px;">
                        <summary><i class="fa-solid fa-clock-rotate-left"></i> Ver historico de manutencoes</summary>
                        <div class="table-container" style="max-height:220px; overflow-y:auto; margin-top:12px;">
                            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem;">
                                <thead><tr style="border-bottom:1px solid var(--panel-border);"><th style="padding:6px; color:var(--text-muted);">Data</th><th style="padding:6px; color:var(--text-muted);">Tipo</th><th style="padding:6px; color:var(--text-muted);">Checklist</th><th style="padding:6px; color:var(--text-muted);">Pecas Utilizadas</th><th style="padding:6px; text-align:center; color:var(--text-muted);">Horimetro</th><th style="padding:6px; text-align:center; color:var(--text-muted);">Acao</th></tr></thead>
                                <tbody id="listaManutencoesVeiculo"></tbody>
                            </table>
                        </div>
                    </details>
                </div>
            </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
