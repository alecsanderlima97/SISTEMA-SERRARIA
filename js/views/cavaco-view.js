(function() {
    const html = `            <!-- ====== TELA: VENDA DE SUBPRODUTOS ====== -->
            <section id="view-cavaco" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-recycle"></i> Venda de Subprodutos</h1>
                    <p>Gerencie clientes e emita recibos automatizados para venda de Cavaco, Pó de Serra e Cascas.</p>
                </div>

                <!-- TABS DE SUBPRODUTOS -->
                <div class="tabs-container hide-on-print" style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1.5px solid var(--panel-border); padding-bottom: 12px; flex-wrap: wrap; justify-content: flex-start;">
                    <button type="button" id="btnTabSubRecibo" onclick="window.switchTabSubprodutos('recibo')" style="background: none; border: none; color: var(--accent-color); border-bottom: 3px solid var(--accent-color); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-file-invoice-dollar"></i> Emitir Recibo
                    </button>
                    <button type="button" id="btnTabSubClientes" onclick="window.switchTabSubprodutos('clientes')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-user-plus"></i> Cadastrar Clientes
                    </button>
                    <button type="button" id="btnTabSubListaClientes" onclick="window.switchTabSubprodutos('lista-clientes')" style="background: none; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.95rem;">
                        <i class="fa-solid fa-users-gear"></i> Gerenciar Clientes
                    </button>
                </div>

                <div class="subprodutos-container" id="subprodutosContainer" style="max-width: 900px; margin: 0 auto; position: relative;">
                    
                    <!-- COLUNA 1: CADASTRO DE CLIENTES (CAVACO/PÓ) [OCULTO POR PADRÃO] -->
                    <div class="glass-panel" id="panelCadastroClientesSub" style="display: none;">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-users"></i> Clientes de Subprodutos</h2>
                        </div>
                        <form id="formClienteSubproduto" class="grid-form-fixed-2" style="margin-bottom: 20px;">
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Nome / Razão Social *</label>
                                <input type="text" id="subCliNome" class="text-uppercase-input" required placeholder="Nome do Cliente">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>CPF / CNPJ *</label>
                                <input type="text" id="subCliDoc" required placeholder="Digite CPF ou CNPJ">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Inscrição Estadual (IE)</label>
                                <input type="text" id="subCliIE" class="text-uppercase-input" placeholder="ISENTO ou número">
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Logradouro / Endereço</label>
                                <input type="text" id="subCliLogradouro" class="text-uppercase-input" placeholder="Ex: Av. Principal, 100">
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:15px;">
                                <label>Cidade / Estado</label>
                                <input type="text" id="subCliCidadeEstado" class="text-uppercase-input" placeholder="Ex: Curitiba / PR">
                            </div>
                            
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>R\$ m³ Cavaco *</label>
                                <input type="text" id="subCliValorCavaco" required placeholder="R\$ 0,00">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>R\$ m³ Pó *</label>
                                <input type="text" id="subCliValorPo" required placeholder="R\$ 0,00">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>R\$ m³ Cavaco "Carregamento Particular"</label>
                                <input type="text" id="subCliValorCavacoParticular" placeholder="R\$ 0,00">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>R\$ m³ Pó "Carregamento Particular"</label>
                                <input type="text" id="subCliValorPoParticular" placeholder="R\$ 0,00">
                            </div>

                            <div class="section-title col-span-2" style="margin: 15px 0 10px 0; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px;">
                                <h3 style="font-size: 0.9rem; margin: 0; color: var(--accent-color);"><i class="fa-solid fa-truck"></i> Dados de Logística do Cliente (Opcional)</h3>
                            </div>
                            
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Modelo Caminhão</label>
                                <input type="text" id="subCliCaminhao" class="text-uppercase-input" placeholder="Ex: Scania R440">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Placa Caminhão</label>
                                <input type="text" id="subCliPlacaCaminhao" class="text-uppercase-input" placeholder="Ex: ABC-1234">
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Placa Carreta / Reboque</label>
                                <input type="text" id="subCliPlacaCarreta" class="text-uppercase-input" placeholder="Ex: XYZ-9876">
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <button type="button" id="btnAdicionarCaminhaoSub" class="btn-secondary" style="padding: 10px 14px;">
                                    <i class="fa-solid fa-plus"></i> Adicionar Caminhão
                                </button>
                                <div id="subCliListaCaminhoes" style="display:flex; flex-direction:column; gap:8px; margin-top:10px;"></div>
                            </div>
                            
                            <div class="col-span-2" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 15px; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px;">
                                <div class="input-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; color: #ccc;">Altura (m)</label>
                                    <input type="number" id="subCliAlt" step="0.01" placeholder="m" style="padding: 8px; font-size: 0.85rem;">
                                </div>
                                <div class="input-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; color: #ccc;">Largura (m)</label>
                                    <input type="number" id="subCliLarg" step="0.01" placeholder="m" style="padding: 8px; font-size: 0.85rem;">
                                </div>
                                <div class="input-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; color: #ccc;">Compr. (m)</label>
                                    <input type="number" id="subCliComp" step="0.01" placeholder="m" style="padding: 8px; font-size: 0.85rem;">
                                </div>
                            </div>

                            <button type="submit" class="btn-primary col-span-2" style="padding: 12px;" id="btnSalvarClienteSub">
                                <i class="fa-solid fa-save"></i> Salvar Cliente
                            </button>
                        </form>
                    </div>

                    <div class="glass-panel" id="panelListaClientesSub" style="display: none;">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-users-gear"></i> Gerenciar Clientes</h2>
                        </div>
                        <div style="max-height: 430px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                                <thead>
                                    <tr style="background: rgba(0,0,0,0.2); color: var(--text-muted);">
                                        <th style="padding: 10px; text-align: left;">Nome</th>
                                        <th style="padding: 10px; text-align: left;">Acordado</th>
                                        <th style="padding: 10px; text-align: right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="listaClientesSubprodutos">
                                    <!-- Preenchido via JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- COLUNA 2: EMISSÃO DE RECIBOS [CENTRALIZADA POR PADRÃO] -->
                    <div class="glass-panel" id="panelEmissaoCavaco" style="max-width: 600px; margin: 0 auto; display: block;">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-file-invoice-dollar"></i> Emitir Recibo</h2>
                        </div>
                        <form id="formCavaco" class="grid-form-fixed-2">
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Selecionar Cliente Cadastrado</label>
                                <select id="calcCavSelectCliente" style="width: 100%;">
                                    <option value="">Preenchimento Manual / Cliente Avulso</option>
                                </select>
                            </div>
                            
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Cliente / Empresa Compradora *</label>
                                <input type="text" id="calcCavCliente" class="text-uppercase-input" required placeholder="Ex: Móveis Silva Ltda">
                            </div>

                            <div class="input-group" style="margin-bottom:10px;">
                                <label>CPF / CNPJ</label>
                                <input type="text" id="calcCavDoc" placeholder="CPF/CNPJ Comprador">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Inscrição Estadual (IE)</label>
                                <input type="text" id="calcCavIE" class="text-uppercase-input" placeholder="IE do Comprador">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Logradouro / Endereço</label>
                                <input type="text" id="calcCavLogradouro" class="text-uppercase-input" placeholder="Logradouro">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Cidade / Estado</label>
                                <input type="text" id="calcCavCidadeEstado" class="text-uppercase-input" placeholder="Cidade / UF">
                            </div>

                            <div class="section-title col-span-2" style="margin: 15px 0 10px 0; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px;">
                                <h3 style="font-size: 0.9rem; margin: 0; color: var(--accent-color);"><i class="fa-solid fa-truck"></i> Dados de Transporte e Cubagem</h3>
                            </div>

                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Nosso Romaneio *</label>
                                <input type="text" id="calcCavRomaneio" class="text-uppercase-input" required placeholder="Ex: 00123">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Romaneio do Cliente (Deles)</label>
                                <input type="text" id="calcCavRomaneioCliente" class="text-uppercase-input" placeholder="Ex: ROM-987">
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Motorista do Caminhão</label>
                                <input type="text" id="calcCavMotorista" class="text-uppercase-input" placeholder="Nome do motorista">
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Caminhão do Cliente</label>
                                <select id="calcCavCaminhaoSelecionado" style="width: 100%;">
                                    <option value="">Selecionar caminhão cadastrado</option>
                                </select>
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label style="display:flex; align-items:center; gap:8px;">
                                    <input type="checkbox" id="calcCavCarregamentoParticular" style="width:auto; margin:0;">
                                    Carregamento particular
                                </label>
                            </div>

                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Modelo Caminhão</label>
                                <input type="text" id="calcCavCaminhao" class="text-uppercase-input" placeholder="Modelo do caminhão">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Placa Caminhão</label>
                                <input type="text" id="calcCavPlacaCaminhao" class="text-uppercase-input" placeholder="ABC-1234">
                            </div>
                            <div class="input-group col-span-2" style="margin-bottom:10px;">
                                <label>Placa Carreta / Reboque</label>
                                <input type="text" id="calcCavPlacaCarreta" class="text-uppercase-input" placeholder="XYZ-9876">
                            </div>

                            <!-- 3 Medidas para Calcular Volume em m3 -->
                            <div class="col-span-2" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 15px; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px;">
                                <div class="input-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; color: #ccc;">Alt (ALT)</label>
                                    <input type="number" id="calcCavAlt" step="0.01" placeholder="m" style="padding: 8px; font-size: 0.85rem;">
                                </div>
                                <div class="input-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; color: #ccc;">Larg (LARG)</label>
                                    <input type="number" id="calcCavLarg" step="0.01" placeholder="m" style="padding: 8px; font-size: 0.85rem;">
                                </div>
                                <div class="input-group" style="margin-bottom: 0;">
                                    <label style="font-size: 0.75rem; color: #ccc;">Comp (COMP)</label>
                                    <input type="number" id="calcCavComp" step="0.01" placeholder="m" style="padding: 8px; font-size: 0.85rem;">
                                </div>
                            </div>
                            
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Tipo de Subproduto</label>
                                <select id="calcCavTipo">
                                    <option value="Cavaco / Maravalha">Cavaco / Maravalha</option>
                                    <option value="Pó de Serra">Pó de Serra</option>
                                    <option value="Casca">Casca</option>
                                    <option value="Lenha">Lenha de Refugo</option>
                                </select>
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Unidade de Medida</label>
                                <select id="calcCavUnidade">
                                    <option value="m³">Metros Cúbicos (m³)</option>
                                    <option value="Tonelada">Toneladas (ton)</option>
                                    <option value="Carga">Carga / Caminhão</option>
                                    <option value="Saco">Saco</option>
                                </select>
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Quantidade (m³ / un)</label>
                                <input type="number" id="calcCavQtd" step="0.01" placeholder="Ex: 15">
                            </div>
                            <div class="input-group" style="margin-bottom:10px;">
                                <label>Valor Unitário R\$ / m³ *</label>
                                <input type="text" id="calcCavValor" placeholder="R\$ 0,00">
                            </div>
                            
                            <button type="button" class="btn-primary col-span-2"
                                style="padding: 15px; font-size: 1.1rem; margin-top:15px;"
                                id="btnCalcCavaco">
                                <i class="fa-solid fa-print"></i> Gerar e Imprimir Recibo
                            </button>
                        </form>
                    </div>

                </div>

                <!-- Recibo de Impressão Temporário de Subprodutos -->
                <div id="printAreaSubprodutos" class="show-on-print"
                    style="display:none; padding: 20px; border: 2px dashed #000; margin-top: 20px; color: black; font-family: monospace; line-height: 1.6;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px;">
                        <div>
                            <img src="logo.png" alt="VANMARTE - Madeiras serradas para embalagens" style="max-height: 80px; max-width: 250px; display: block;" onerror="this.style.display='none'">
                        </div>
                        <div style="text-align:right;">
                            <h2 style="margin:0; font-size: 1.5rem; text-transform: uppercase;">RECIBO DE VENDA</h2>
                            <h3 style="margin:5px 0 0 0; font-size: 1.2rem; color: #444;">Subprodutos</h3>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div>
                            <p><strong>Nº Nosso Romaneio:</strong> <span id="printCavRomaneio"></span></p>
                            <p><strong>Nº Romaneio Cliente:</strong> <span id="printCavRomaneioCliente"></span></p>
                            <p><strong>Data:</strong> <span id="printCavData"></span></p>
                        </div>
                        <div style="text-align: right;">
                            <p><strong>Cliente/Empresa:</strong> <span id="printCavCliente"></span></p>
                            <p><strong>CNPJ/CPF:</strong> <span id="printCavDoc"></span></p>
                            <p><strong>Insc. Estadual:</strong> <span id="printCavIE"></span></p>
                        </div>
                    </div>
                    <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 0.95rem;">
                        <p><strong>Endereço:</strong> <span id="printCavLogradouro"></span> | <strong>Cidade/Estado:</strong> <span id="printCavCidadeEstado"></span></p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; background: #eee; padding: 10px; border-radius: 5px;">
                        <div>
                            <p><strong>Motorista:</strong> <span id="printCavMotorista"></span></p>
                            <p><strong>Caminhão:</strong> <span id="printCavCaminhao"></span></p>
                        </div>
                        <div style="text-align: right;">
                            <p><strong>Placa Caminhão:</strong> <span id="printCavPlacaCaminhao"></span></p>
                            <p><strong>Placa Carreta:</strong> <span id="printCavPlacaCarreta"></span></p>
                            <p><strong>Medidas:</strong> <span id="printCavMedidas"></span></p>
                        </div>
                    </div>
                    <hr style="margin: 15px 0; border: 0; border-top: 2px solid #000;">
                    <p><strong>Produto:</strong> <span id="printCavTipo"></span></p>
                    <p><strong>Quantidade:</strong> <span id="printCavQtd"></span> <span id="printCavUni"></span></p>
                    <p><strong>Valor Unitário:</strong> R\$ <span id="printCavValorUni"></span></p>
                    <h2 style="text-align:right; margin-top: 20px; font-size: 1.8rem; border-top: 2px solid #000; padding-top: 10px;">TOTAL: R\$ <span id="printCavTotal"></span>
                    </h2>
                    <div style="margin-top: 60px; text-align:center;">
                        ______________________________________________<br>
                        Assinatura Responsável / Conferente
                    </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
