(function() {
    const html = `            <!-- ====== TELA: CALCULADORAS ====== -->
            <section id="view-calculadoras" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-calculator"></i> Ferramentas Auxiliares</h1>
                    <p>Utilitários rápidos do dia-a-dia da madeireira</p>
                </div>

                <style>
                    #view-calculadoras .grid-form { width: 100% !important; max-width: 1180px; margin: 0 auto; grid-template-columns: repeat(auto-fit, minmax(235px, 1fr)) !important; gap: 14px !important; align-items: stretch; }
                    #view-calculadoras .glass-panel { min-width: 0; height: 100%; padding: 16px !important; border-radius: 10px !important; display: flex; flex-direction: column; }
                    #view-calculadoras .section-title { margin-bottom: 10px !important; }
                    #view-calculadoras .section-title h2 { font-size: 0.98rem !important; }
                    #view-calculadoras .input-group { margin-bottom: 7px !important; }
                    #view-calculadoras label { font-size: 0.78rem !important; }
                    #view-calculadoras input { width: 100%; min-width: 0; box-sizing: border-box; min-height: 34px !important; padding: 7px 9px !important; font-size: 0.86rem !important; }
                    #view-calculadoras .input-group > div { min-width: 0; }
                    #view-calculadoras .input-group > div input { flex: 1 1 0; min-width: 0; }
                    #view-calculadoras .btn-primary { min-height: 36px !important; padding: 8px 10px !important; margin-top: 8px !important; font-size: 0.86rem !important; }
                    #view-calculadoras [id^="resultado"], #view-calculadoras #resFardoVol { margin-top: auto !important; padding-top: 10px; min-height: 34px; font-size: 1.08rem !important; display: flex; align-items: center; justify-content: center; }
                    #view-calculadoras #resFardoQtd { font-size: 0.9rem !important; }
                    @media (max-width: 680px) { #view-calculadoras .grid-form { grid-template-columns: 1fr !important; } }
                </style>
                <div class="grid-form">
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
