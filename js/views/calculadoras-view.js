(function() {
    const html = `            <!-- ====== TELA: CALCULADORAS ====== -->
            <section id="view-calculadoras" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-calculator"></i> Ferramentas Auxiliares</h1>
                    <p>Utilitários rápidos do dia-a-dia da madeireira</p>
                </div>

                <div class="grid-form" style="grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
                    <!-- Calc de Cubagem -->
                    <div class="glass-panel">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-cube"></i> Cubagem Rápida (Peças)</h2>
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Espessura (cm)</label>
                            <input type="number" id="calcEsp" step="0.1" placeholder="Ex: 2.5">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Largura (cm)</label>
                            <input type="number" id="calcLar" step="0.1" placeholder="Ex: 10">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Comprimento (m)</label>
                            <input type="number" id="calcComp" step="0.1" placeholder="Ex: 3">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Quantidade</label>
                            <input type="number" id="calcQtd" value="1" min="1">
                        </div>
                        <button class="btn-primary" style="width:100%; margin-top:15px;" id="btnCalcCub"><i
                                class="fa-solid fa-equals"></i> Calcular Volume</button>
                        <div id="resultadoCub"
                            style="margin-top:20px; text-align:center; font-size:1.5rem; font-weight:bold; color:var(--accent-color);">
                            0.000 m³
                        </div>
                    </div>

                    <!-- Calc de Fardo Completo -->
                    <div class="glass-panel">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-layer-group"></i> Fardo Completo</h2>
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Medidas da Peça (cm)</label>
                            <div style="display: flex; gap: 5px;">
                                <input type="number" id="fardoEsp" step="0.1" placeholder="Esp.">
                                <input type="number" id="fardoLar" step="0.1" placeholder="Larg.">
                            </div>
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Comprim. da Peça (m)</label>
                            <input type="number" id="fardoComp" step="0.1" placeholder="Ex: 3.0">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Peças por Fardo (A x L)</label>
                            <div style="display: flex; gap: 5px;">
                                <input type="number" id="fardoAltPecas" placeholder="Alt.">
                                <input type="number" id="fardoLarPecas" placeholder="Larg.">
                            </div>
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Peças Amarras (+)</label>
                            <input type="number" id="fardoAmarras" value="0">
                        </div>
                        <button class="btn-primary" style="width:100%; margin-top:15px;" id="btnCalcFardo"><i
                                class="fa-solid fa-equals"></i> Calcular Fardo</button>
                        <div style="margin-top:20px; text-align:center;">
                            <div id="resFardoQtd" style="font-size:1.1rem; color:#ccc;">0 peças</div>
                            <div id="resFardoVol" style="font-size:1.5rem; font-weight:bold; color:var(--accent-color);">0.000 m³</div>
                        </div>
                    </div>

                    <!-- Calc de Diesel -->
                    <div class="glass-panel">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-gas-pump"></i> Consumo de Diesel Base</h2>
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Distância da Viagem (KM)</label>
                            <input type="number" id="calcKm" step="0.1" placeholder="Ex: 150">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Média do Caminhão (Km/L)</label>
                            <input type="number" id="calcMedia" step="0.1" placeholder="Ex: 2.5">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Preço do Litro Diesel (R\$)</label>
                            <input type="text" id="calcPrecoDiesel" placeholder="R\$ 0,00">
                        </div>
                        <button class="btn-primary" style="width:100%; margin-top:15px;" id="btnCalcDiesel"><i
                                class="fa-solid fa-equals"></i> Estimar Custo</button>
                        <div id="resultadoDiesel"
                            style="margin-top:20px; text-align:center; font-size:1.5rem; font-weight:bold; color:var(--danger-color);">
                            R\$ 0,00
                        </div>
                    </div>

                    <!-- Calc de Frete -->
                    <div class="glass-panel">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-truck-ramp-box"></i> Calculadora de Frete</h2>
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Volume Total (m³)</label>
                            <input type="number" id="freteVol" step="0.001" placeholder="Ex: 15.500">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Valor do Frete (R\$/m³)</label>
                            <input type="text" id="freteValor" placeholder="R\$ 0,00">
                        </div>
                        <div class="input-group" style="margin-bottom:10px;">
                            <label>Adicional / Pedágio (R\$)</label>
                            <input type="text" id="freteExtra" placeholder="R\$ 0,00" value="R\$ 0,00">
                        </div>
                        <button class="btn-primary" style="width:100%; margin-top:15px;" id="btnCalcFrete"><i
                                class="fa-solid fa-equals"></i> Calcular Frete</button>
                        <div id="resultadoFrete"
                            style="margin-top:20px; text-align:center; font-size:1.5rem; font-weight:bold; color:var(--accent-color);">
                            R\$ 0,00
                        </div>
                    </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
