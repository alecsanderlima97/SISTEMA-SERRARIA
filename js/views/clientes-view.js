(function() {
    const html = `            <!-- ====== TELA: CLIENTES ====== -->
            <section id="view-clientes" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-users"></i> Gestão de Clientes</h1>
                    <p>Cadastre e gerencie os parceiros</p>
                </div>

                <!-- TABS DE CLIENTES -->
                <div style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap;">
                    <button type="button" id="btnTabClienteForm" onclick="window.switchTabClientes('form')" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-user-plus"></i> Cadastrar Cliente
                    </button>
                    <button type="button" id="btnTabClienteLista" onclick="window.switchTabClientes('lista')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-users"></i> Gerenciar Clientes
                    </button>
                </div>

                <!-- TAB: FORMULÁRIO -->
                <div id="tabClienteForm" class="glass-panel" style="margin-bottom: 0;">
                    <div class="section-title">
                        <h2><i class="fa-solid fa-user-plus"></i> Novo Cliente</h2>
                    </div>
                    <form id="formCliente">
                        <div style="margin-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.12); padding-bottom: 6px;">
                            <h3 style="font-size: 0.92rem; color:var(--accent-color); margin:0;"><i class="fa-solid fa-address-card"></i> Dados Cadastrais</h3>
                        </div>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="input-group">
                            <label for="cliNome">Nome / Razão Social</label>
                            <input type="text" id="cliNome" class="text-uppercase-input" required>
                        </div>
                        <div class="input-group">
                            <label for="cliCnpj">CNPJ / CPF</label>
                            <input type="text" id="cliCnpj" required>
                        </div>
                        <div class="input-group">
                            <label for="cliIe">Inscrição Estadual</label>
                            <input type="text" id="cliIe">
                        </div>
                        <div class="input-group">
                            <label for="cliContato">Número para Contato</label>
                            <input type="text" id="cliContato" required placeholder="(00) 00000-0000">
                        </div>
                        <div class="input-group">
                            <label for="cliEmail">E-mail</label>
                            <input type="email" id="cliEmail">
                        </div>
                        </div>
                        <div style="margin-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.12); padding-bottom: 6px;">
                            <h3 style="font-size: 0.92rem; color:var(--accent-color); margin:0;"><i class="fa-solid fa-location-dot"></i> Endereço de Entrega</h3>
                        </div>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="input-group">
                            <label for="cliCep">CEP <span class="badge" id="cepStatus"></span></label>
                            <input type="text" id="cliCep" required placeholder="00000-000" maxlength="9">
                        </div>
                        <div class="input-group">
                            <label for="cliLogradouro">Logradouro (Rua/Estrada) *</label>
                            <input type="text" id="cliLogradouro" class="text-uppercase-input" required placeholder="Rua das Flores">
                        </div>
                        <div class="input-group">
                            <label for="cliNumero">Número / KM</label>
                            <input type="text" id="cliNumero" placeholder="Ex: 123 ou Km 4">
                        </div>
                        <div class="input-group">
                            <label for="cliCidade">Cidade / Estado</label>
                            <input type="text" id="cliCidade" required readonly>
                        </div>
                        </div>
                        <div style="margin-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.12); padding-bottom: 6px;">
                            <h3 style="color:var(--accent-color);"><i class="fa-solid fa-handshake"></i> Informações Comerciais / Preços Acordados</h3>
                        </div>
                        <div class="grid-form" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="input-group">
                            <label for="cliValorFrete">Valor do Frete (R\$)</label>
                            <input type="text" id="cliValorFrete" placeholder="R\$ 0,00">
                        </div>
                        <div class="input-group">
                            <label for="cliPorcentagemNF">Valor da % da Nota Fiscal</label>
                            <input type="number" step="0.01" id="cliPorcentagemNF" placeholder="Ex: 9.3">
                        </div>
                        <div class="input-group">
                            <label for="cliBaseNF">Base de calculo da NF</label>
                            <select id="cliBaseNF">
                                <option value="INTEIRA">Carga inteira</option>
                                <option value="MEIA">Meia carga / meia nota</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="cliFormaPagamento">Forma de Pagamento</label>
                            <select id="cliFormaPagamento" onchange="document.getElementById('containerPrazo').style.display = this.value === 'A Prazo' ? 'flex' : 'none'">
                                <option value="">Selecione...</option>
                                <option value="A Vista">A Vista</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Boleto">Boleto</option>
                                <option value="A Prazo">A Prazo</option>
                            </select>
                        </div>
                        <div class="input-group" id="containerPrazo" style="display: none;">
                            <label for="cliPrazoPagamento">Prazo (Ex: 15 dias)</label>
                            <input type="text" id="cliPrazoPagamento" class="text-uppercase-input" placeholder="Ex: 15 dias">
                        </div>
                        <div class="input-group">
                            <label for="cliMadeira1">Madeira de 1ª (R\$ / m³)</label>
                            <input type="text" id="cliMadeira1" placeholder="R\$ 0,00">
                        </div>
                        <div class="input-group">
                            <label for="cliMadeira2">Madeira de 2ª (R\$ / m³)</label>
                            <input type="text" id="cliMadeira2" placeholder="R\$ 0,00">
                        </div>
                        <div class="input-group">
                            <label for="cliMadeira3">Madeira de 3ª (R\$ / m³)</label>
                            <input type="text" id="cliMadeira3" placeholder="R\$ 0,00">
                        </div>
                        <div class="input-group">
                            <label for="cliMadeiraPinus">Madeira de Pinus (R\$ / m³)</label>
                            <input type="text" id="cliMadeiraPinus" placeholder="R\$ 0,00">
                        </div>
                        <div class="input-group">
                            <label for="cliNomeMadeiraExtra">Nome Madeira Extra</label>
                            <input type="text" id="cliNomeMadeiraExtra" class="text-uppercase-input" placeholder="Ex: Eucalipto">
                        </div>
                        <div class="input-group">
                            <label for="cliValorMadeiraExtra">Valor Madeira Extra (R\$ / m³)</label>
                            <input type="text" id="cliValorMadeiraExtra" placeholder="R\$ 0,00">
                        </div>
                        </div>
                        <div class="input-group" style="margin-bottom: 18px;">
                            <label for="cliObservacao">Observações Importantes do Cliente</label>
                            <textarea id="cliObservacao" rows="3" placeholder="Ex: Ligar antes de entregar, horário de recebimento, etc." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white;"></textarea>
                        </div>
                        <div class="input-group" style="align-items: flex-end; margin-top: 15px;">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-save"></i> Salvar Cliente</button>
                        </div>
                    </form>
                </div>

                <!-- TAB: LISTA -->
                <div id="tabClienteLista" class="glass-panel" style="margin-bottom: 0; display: none;">
                    <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <h2><i class="fa-solid fa-list"></i> Clientes Cadastrados</h2>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <div class="input-group" style="margin-bottom: 0; width: 250px;">
                            <input type="text" id="filtroClientesBusca" placeholder="Buscar por Nome, CPF/CNPJ..." style="padding: 8px 12px; font-size: 0.9rem;">
                        </div>
                        <select id="ordenarClientes" style="height: 38px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--panel-border); padding: 0 10px;">
                            <option value="nome">Nome A-Z</option>
                            <option value="data-desc">Mais novo</option>
                            <option value="data-asc">Mais velho</option>
                        </select>
                        </div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CNPJ</th>
                                    <th>Cidade/US</th>
                                    <th>Contato</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="listaClientes">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
