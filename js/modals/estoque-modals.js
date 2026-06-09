(function() {
    const html = `    <!-- ====== MODAL: MOVIMENTAÇÃO MANUAL DE ESTOQUE ====== -->
    <div id="modalNovaMovimentacao" class="modal-v2" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(0,0,0,0.85);">
        <div class="modal-content-v2" style="width: 100%; max-width: 650px; border-radius: 14px; padding: 16px 20px; border: 1px solid var(--panel-border); background: #1e293b;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h2 style="margin: 0; color: white; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-right-left" style="color: var(--accent-color);"></i> Registrar Entrada / Saída de Estoque
                </h2>
                <button type="button" class="btn-action-card" onclick="window.fecharModalNovaMovimentacao()" style="padding: 8px 12px;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form id="formNovaMovimentacao" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div style="grid-column: span 3; margin-bottom: 0;">
                    <label for="movTipo" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;">Tipo de Lançamento</label>
                    <select id="movTipo" onchange="window.onChangeMovTipo()" style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: #1e293b; color: white; padding: 8px 10px; font-size: 0.85rem;">
                        <option value="SAÍDA">📉 SAÍDA — Retirada / Consumo / EPI Entregue</option>
                        <option value="ENTRADA">📈 ENTRADA — Compra / Reposição</option>
                    </select>
                </div>
                <div style="grid-column: span 3; margin-bottom: 0;">
                    <label for="movItemId" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;">Item do Estoque *</label>
                    <select id="movItemId" onchange="window.onChangeMovItem()" required style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: #1e293b; color: white; padding: 8px 10px; font-size: 0.85rem;">
                        <option value="">-- SELECIONE O ITEM --</option>
                    </select>
                </div>
                <div style="grid-column: span 3; margin-bottom: 0;">
                    <label for="movRetiradoPor" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #a78bfa;"><i class="fa-solid fa-user"></i> Retirado por / Responsável</label>
                    <input type="text" id="movRetiradoPor" class="text-uppercase-input" placeholder="Ex: JOÃO DA SILVA" style="width: 100%; border-radius: 6px; border: 1px solid rgba(167,139,250,0.4); background: rgba(167,139,250,0.05); color: white; padding: 8px 10px; font-size: 0.85rem;">
                </div>
                <div style="grid-column: span 3; margin-bottom: 0;">
                    <label for="movDestino" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;"><i class="fa-solid fa-location-dot"></i> Destino / Setor</label>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
                        <button type="button" onclick="document.getElementById('movDestino').value='SERRARIA'" style="padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(245,158,11,0.5); background: rgba(245,158,11,0.1); color: #f59e0b; font-size: 0.75rem; cursor: pointer;">🏭 SERRARIA</button>
                        <button type="button" onclick="document.getElementById('movDestino').value='FLORESTAL'" style="padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(74,222,128,0.5); background: rgba(74,222,128,0.1); color: #4ade80; font-size: 0.75rem; cursor: pointer;">🌳 FLORESTAL</button>
                        <button type="button" onclick="document.getElementById('movDestino').value='TERRAPLANAGEM'" style="padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(248,113,113,0.5); background: rgba(248,113,113,0.1); color: #f87171; font-size: 0.75rem; cursor: pointer;">🏗️ TERRAPLANAGEM</button>
                        <button type="button" onclick="document.getElementById('movDestino').value='ESCRITÓRIO'" style="padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(96,165,250,0.5); background: rgba(96,165,250,0.1); color: #60a5fa; font-size: 0.75rem; cursor: pointer;">🏢 ESCRITÓRIO</button>
                        <button type="button" onclick="document.getElementById('movDestino').value='SETOR MECÂNICO'" style="padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(167,139,250,0.5); background: rgba(167,139,250,0.1); color: #a78bfa; font-size: 0.75rem; cursor: pointer;">🔧 MECÂNICA</button>
                    </div>
                    <input type="text" id="movDestino" class="text-uppercase-input" placeholder="Ou digite manualmente..." style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px 10px; font-size: 0.85rem;">
                </div>
                <div style="margin-bottom: 0;">
                    <label for="movData" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;">Data</label>
                    <input type="date" id="movData" style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px 10px; font-size: 0.85rem;">
                </div>
                <div style="margin-bottom: 0;">
                    <label for="movQtd" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;">Quantidade *</label>
                    <input type="number" id="movQtd" step="0.01" min="0.01" placeholder="Ex: 1" required style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px 10px; font-size: 0.85rem;">
                </div>
                <div style="margin-bottom: 0;">
                    <label for="movUnitario" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;">Valor Unit. (R\$) opcional</label>
                    <input type="text" id="movUnitario" placeholder="R\$ 0,00" oninput="window.formatCurrencyInput(event)" style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px 10px; font-size: 0.85rem;">
                </div>
                <div id="containerMovFrota" style="grid-column: span 3; display: none; margin-bottom: 0;">
                    <label for="movFrotaId" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;"><i class="fa-solid fa-truck-pickup"></i> Veículo / Máquina (se consumo de frota)</label>
                    <select id="movFrotaId" onchange="window.onChangeMovFrota()" style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: #1e293b; color: white; padding: 8px 10px; font-size: 0.85rem;">
                        <option value="">-- NENHUM / NÃO SE APLICA --</option>
                    </select>
                </div>
                <div style="grid-column: span 3; margin-bottom: 0;">
                    <label for="movObs" style="font-size: 0.8rem; margin-bottom: 4px; display: block; color: #ccc;">Observação</label>
                    <input type="text" id="movObs" class="text-uppercase-input" placeholder="Ex: CORREIA A27 SUBSTITUÍDA NA SERRA PRINCIPAL..." style="width: 100%; border-radius: 6px; border: 1px solid var(--panel-border); background: rgba(255,255,255,0.05); color: white; padding: 8px 10px; font-size: 0.85rem;">
                </div>
                <div style="grid-column: span 3; display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px;">
                    <button type="button" class="btn-secondary" onclick="window.fecharModalNovaMovimentacao()" style="padding: 8px 16px; border-radius: 6px; font-size: 0.9rem;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="padding: 8px 20px; border-radius: 6px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-check"></i> Confirmar Lançamento</button>
                </div>
            </form>
        </div>
    </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
