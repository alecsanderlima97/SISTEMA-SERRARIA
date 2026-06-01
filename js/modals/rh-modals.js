(function() {
    const html = `    <!-- MODAL: CONTROLE DE HORAS EXTRAS -->
    <div id="modalHorasExtras" class="modal-v2" style="display: none;">
        <div class="modal-content-v2 card-v2" style="max-width: 700px; width: 95%;">
            <div class="modal-header-v2">
                <h2><i class="fa-solid fa-clock"></i> Controle de Horas Extras e Lançamentos Diários</h2>
                <button onclick="window.fecharModalHE()" class="btn-close-v2">&times;</button>
            </div>
            <div class="modal-body-v2">
                <p>Funcionário: <strong id="he-funcionario-nome" style="color: var(--accent-color);">...</strong></p>
                <input type="hidden" id="he-funcionario-id">

                <!-- Formulário rápido para adicionar HE -->
                <form id="formHE" onsubmit="event.preventDefault();" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Data *</label>
                            <input type="date" id="he-data" required>
                        </div>
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Quantidade de Horas</label>
                            <input type="number" id="he-horas" step="0.5" min="0" max="24" placeholder="Ex: 2">
                        </div>
                    </div>
                    <div class="input-group" style="margin-bottom: 12px;">
                        <label>Valor Fixo / Diária Especial (Presets)</label>
                        <select id="he-preset" onchange="window.aplicarPresetHE(this.value)">
                            <option value="NENHUM">-- Nenhum (Lançar Horas Trabalhadas) --</option>
                            <option value="MEIO">Meio Período / Fim de Semana (R\$ 50,00 fixo)</option>
                            <option value="INTEGRAL">Período Integral / Fim de Semana (R\$ 100,00 fixo)</option>
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 10px; margin-bottom: 12px;">
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Acréscimo/Desconto R\$</label>
                            <input type="text" id="he-adicional" placeholder="Ex: 50,00 ou -20,00">
                        </div>
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Observação / Comentário</label>
                            <input type="text" id="he-observacao" class="text-uppercase-input" placeholder="Ex: BÔNUS PRODUÇÃO ou AJUSTE">
                        </div>
                    </div>
                    <input type="hidden" id="he-tipo-dia" value="NORMAL">
                    <button type="submit" class="btn-primary" style="width: 100%; justify-content: center; background: #00ff88; color: black; font-weight: bold; border-color: #00ff88;">
                        <i class="fa-solid fa-plus"></i> ADICIONAR REGISTRO DIÁRIO
                    </button>
                </form>

                <!-- Tabela de Lançamentos de Horas Extras -->
                <div style="max-height: 250px; overflow-y: auto;">
                    <table class="package-table" style="font-size: 0.85rem;">
                        <thead>
                            <tr>
                                <th>Data / Dia</th>
                                <th>Horas</th>
                                <th>Tipo</th>
                                <th>Adic/Desc</th>
                                <th>Observação</th>
                                <th>Valor a Receber</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="listaHE">
                            <!-- Preenchido via JS -->
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer-v2" style="justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 15px;">
                <div style="font-size: 1.05rem; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span>Horas: <strong id="he-total-soma" style="color: #00ff88;">0h</strong></span>
                    <span style="color: rgba(255,255,255,0.3);">|</span>
                    <span>Total a Receber: <strong id="he-total-valor" style="color: #00ff88;">R\$ 0,00</strong></span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.abrirRelatorioMensalHE()" class="btn-v2" style="background: #2563eb; color: white; font-weight: bold;"><i class="fa-solid fa-file-invoice"></i> Relatório Fiscal</button>
                    <button onclick="window.fecharModalHE()" class="btn-v2" style="background: var(--border); color: white;">Fechar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: CONTROLE DE FALTAS -->
    <div id="modalFaltas" class="modal-v2" style="display: none;">
        <div class="modal-content-v2 card-v2" style="max-width: 600px; width: 95%;">
            <div class="modal-header-v2">
                <h2><i class="fa-solid fa-user-slash"></i> Controle de Faltas</h2>
                <button onclick="window.fecharModalFaltas()" class="btn-close-v2">&times;</button>
            </div>
            <div class="modal-body-v2">
                <p>Funcionário: <strong id="falta-funcionario-nome" style="color: var(--accent-color);">...</strong></p>
                <input type="hidden" id="falta-funcionario-id">

                <!-- Formulário para adicionar Falta -->
                <form id="formFalta" onsubmit="event.preventDefault();" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Data da Falta *</label>
                            <input type="date" id="falta-data" required>
                        </div>
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Valor a Descontar R\$ (Opcional)</label>
                            <input type="text" id="falta-valor" placeholder="R\$ 0,00">
                        </div>
                    </div>
                    <button type="submit" class="btn-primary" style="width: 100%; justify-content: center; background: #f43f5e; color: white; font-weight: bold; border-color: #f43f5e;">
                        <i class="fa-solid fa-plus"></i> REGISTRAR FALTA
                    </button>
                </form>

                <!-- Tabela de Faltas -->
                <div style="max-height: 250px; overflow-y: auto;">
                    <table class="package-table" style="font-size: 0.85rem;">
                        <thead>
                            <tr>
                                <th>Data da Falta</th>
                                <th>Valor a Descontar</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="listaFaltas">
                            <!-- Preenchido via JS -->
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer-v2" style="justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 15px;">
                <div style="font-size: 1.05rem; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span>Faltas: <strong id="falta-total-qtd" style="color: #f43f5e;">0</strong></span>
                    <span style="color: rgba(255,255,255,0.3);">|</span>
                    <span>Total Desconto: <strong id="falta-total-valor" style="color: #f43f5e;">R\$ 0,00</strong></span>
                </div>
                <button onclick="window.fecharModalFaltas()" class="btn-v2" style="background: var(--border); color: white;">Fechar</button>
            </div>
        </div>
    </div>

    <!-- MODAL: FICHA / HOLERITE DE PAGAMENTO -->
    <div id="modalHolerite" class="modal-v2" style="display: none; background: rgba(0,0,0,0.85);">
        <div class="modal-content-v2 card-v2" style="max-width: 800px; width: 95%; background: white; color: black; padding: 25px; border-radius: 12px; border: 1px solid #ccc; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div class="modal-header-v2 hide-on-print" style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 15px;">
                <h2 style="color: black;"><i class="fa-solid fa-file-invoice-dollar"></i> Recibo de Pagamento</h2>
                <button onclick="window.fecharModalHolerite()" class="btn-close-v2" style="color: black;">&times;</button>
            </div>
            
            <!-- Recibo Impresso -->
            <div id="conteudoHolerite" style="font-family: 'Courier New', Courier, monospace; color: black; font-size: 0.85rem; line-height: 1.4;">
                <!-- Conteúdo dinâmico gerado via JS -->
            </div>

            <div class="modal-footer-v2 hide-on-print" style="margin-top: 20px; border-top: 2px solid #ccc; padding-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="window.rhDocumentoActions.print('holerite')" class="btn-v2" style="background: #0ea5e9; color: white;"><i class="fa-solid fa-print"></i> Imprimir Recibo</button>
                <button onclick="window.rhDocumentoActions.pdf('holerite')" class="btn-v2" style="background: #16a34a; color: white;"><i class="fa-solid fa-file-pdf"></i> Baixar PDF</button>
                <button onclick="window.rhDocumentoActions.whatsapp('holerite')" class="btn-v2" style="background: #22c55e; color: white;"><i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp</button>
                <button onclick="window.fecharModalHolerite()" class="btn-v2" style="background: #94a3b8; color: black;">Fechar</button>
            </div>
        </div>
    </div>

    <!-- MODAL: RELATÓRIO MENSAL OPERACIONAL DE HORAS EXTRAS (FISCAL / FECHAMENTO) -->
    <div id="modalRelatorioHE" class="modal-v2" style="display: none; background: rgba(0,0,0,0.85);">
        <div class="modal-content-v2 card-v2" style="max-width: 850px; width: 95%; background: white; color: black; padding: 25px; border-radius: 12px; border: 1px solid #ccc; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div class="modal-header-v2 hide-on-print" style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 15px;">
                <h2 style="color: black;"><i class="fa-solid fa-file-shield"></i> Relatório Mensal Fiscal - Horas Extras</h2>
                <button onclick="window.fecharModalRelatorioHE()" class="btn-close-v2" style="color: black;">&times;</button>
            </div>
            
            <!-- Relatório Impresso -->
            <div id="conteudoRelatorioHE" style="color: black; font-size: 0.9rem; line-height: 1.4;">
                <!-- Conteúdo dinâmico gerado via JS -->
            </div>

            <div class="modal-footer-v2 hide-on-print" style="margin-top: 20px; border-top: 2px solid #ccc; padding-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="window.rhDocumentoActions.print('relatorio')" class="btn-v2" style="background: #2563eb; color: white;"><i class="fa-solid fa-print"></i> Imprimir Relatório</button>
                <button onclick="window.rhDocumentoActions.pdf('relatorio')" class="btn-v2" style="background: #16a34a; color: white;"><i class="fa-solid fa-file-pdf"></i> Baixar PDF</button>
                <button onclick="window.rhDocumentoActions.whatsapp('relatorio')" class="btn-v2" style="background: #22c55e; color: white;"><i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp</button>
                <button onclick="window.fecharModalRelatorioHE()" class="btn-v2" style="background: #94a3b8; color: black;">Fechar</button>
            </div>
        </div>
    </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
