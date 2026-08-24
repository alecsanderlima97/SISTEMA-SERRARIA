(function() {
    const html = `            <section id="view-mapa" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-map-location-dot"></i> Mapa</h1>
                    <p>Locais de compra de matos, contatos, medidas e contratos.</p>
                </div>

                <div class="mapa-layout">
                    <div class="glass-panel mapa-form-card">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-tree-city"></i> Cadastro do Mato</h2>
                        </div>

                        <form id="formMapaMato" class="mapa-form">
                            <input type="hidden" id="mapaMatoId">

                            <div class="input-group mapa-nome">
                                <label for="mapaNomeMato">Nome do mato *</label>
                                <input type="text" id="mapaNomeMato" placeholder="Ex: Mato Sao Judas" required>
                            </div>
                            <div class="input-group">
                                <label for="mapaStatus">Status</label>
                                <select id="mapaStatus">
                                    <option value="EM_ANALISE">Em analise</option>
                                    <option value="NEGOCIANDO">Negociando</option>
                                    <option value="CONTRATADO">Contratado</option>
                                    <option value="FINALIZADO">Finalizado</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label for="mapaProprietario">Dono / proprietario *</label>
                                <input type="text" id="mapaProprietario" placeholder="Nome do dono" required>
                            </div>
                            <div class="input-group">
                                <label for="mapaTelefone">Contato</label>
                                <input type="tel" id="mapaTelefone" inputmode="tel" placeholder="(00) 00000-0000">
                            </div>
                            <div class="input-group">
                                <label for="mapaEmail">E-mail</label>
                                <input type="email" id="mapaEmail" placeholder="email@exemplo.com">
                            </div>

                            <div class="input-group mapa-endereco">
                                <label for="mapaEndereco">Endereco / referencia</label>
                                <input type="text" id="mapaEndereco" placeholder="Estrada, bairro, cidade ou referencia">
                            </div>
                            <div class="input-group">
                                <label for="mapaLatitude">Latitude</label>
                                <input type="number" id="mapaLatitude" inputmode="decimal" step="any" placeholder="-24.000000">
                            </div>
                            <div class="input-group">
                                <label for="mapaLongitude">Longitude</label>
                                <input type="number" id="mapaLongitude" inputmode="decimal" step="any" placeholder="-49.000000">
                            </div>

                            <div class="input-group">
                                <label for="mapaAreaValor">Medida / tamanho</label>
                                <input type="number" id="mapaAreaValor" inputmode="decimal" step="any" placeholder="Ex: 12">
                            </div>
                            <div class="input-group">
                                <label for="mapaAreaUnidade">Unidade</label>
                                <select id="mapaAreaUnidade">
                                    <option value="hectares">Hectares</option>
                                    <option value="alqueire_paulista">Alqueire paulista</option>
                                    <option value="alqueire_mineiro">Alqueire mineiro</option>
                                    <option value="m2">m2</option>
                                    <option value="km2">km2</option>
                                    <option value="km">km</option>
                                    <option value="pe">Pe</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label for="mapaVolumeEstimado">Volume estimado</label>
                                <input type="number" id="mapaVolumeEstimado" inputmode="decimal" step="any" placeholder="m3 ou quantidade">
                            </div>
                            <div class="input-group">
                                <label for="mapaDistanciaKm">Distancia</label>
                                <input type="number" id="mapaDistanciaKm" inputmode="decimal" step="any" placeholder="Km ate a serraria">
                            </div>

                            <div class="input-group mapa-contrato">
                                <label for="mapaContrato">Contrato / documento</label>
                                <input type="file" id="mapaContrato" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/*,application/pdf">
                                <small id="mapaContratoNome">Nenhum contrato anexado</small>
                            </div>
                            <div class="input-group mapa-obs">
                                <label for="mapaObservacoes">Informacoes do mato</label>
                                <textarea id="mapaObservacoes" rows="3" placeholder="Forma de medida, negociacao, estrada, acesso, qualidade, observacoes do dono..."></textarea>
                            </div>

                            <div class="mapa-form-actions">
                                <button type="button" class="btn-secondary" onclick="window.limparMapaMato && window.limparMapaMato()"><i class="fa-solid fa-eraser"></i> Limpar</button>
                                <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Salvar mato</button>
                            </div>
                        </form>
                    </div>

                    <div class="glass-panel mapa-preview-card">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-earth-americas"></i> Localizacao</h2>
                        </div>
                        <div id="mapaMinhaLocalizacao" class="mapa-current-location" data-state="idle">
                            <span class="mapa-current-location-icon"><i class="fa-solid fa-location-crosshairs"></i></span>
                            <span>
                                <strong>Localizacao atual</strong>
                                <small id="mapaMinhaLocalizacaoTexto">Use sua posicao como ponto de partida.</small>
                            </span>
                            <button type="button" class="btn-secondary" onclick="window.obterMinhaLocalizacao && window.obterMinhaLocalizacao()" data-ui-tooltip="Usar a localizacao deste aparelho como origem das rotas.">
                                <i class="fa-solid fa-crosshairs"></i> Minha localizacao
                            </button>
                        </div>
                        <div class="mapa-preview-frame">
                            <iframe id="mapaPreviewFrame" title="Previa do local no Google Maps" loading="lazy"></iframe>
                            <div id="mapaPreviewEmpty" class="mapa-preview-empty">
                                <i class="fa-solid fa-map-pin"></i>
                                <strong>Informe o local do mato</strong>
                                <span>Enquanto isso, o mapa usa sua localizacao atual como base.</span>
                            </div>
                        </div>
                        <div id="mapaDistanciaAtual" class="mapa-distance-summary" hidden></div>
                        <div class="mapa-preview-actions">
                            <button type="button" class="btn-secondary" onclick="window.abrirMapaAtual && window.abrirMapaAtual('maps')"><i class="fa-solid fa-map-location-dot"></i> Abrir Maps</button>
                            <button type="button" class="btn-secondary" onclick="window.abrirMapaAtual && window.abrirMapaAtual('earth')"><i class="fa-solid fa-earth-americas"></i> Abrir Earth</button>
                            <button type="button" class="btn-primary" onclick="window.abrirRotaMapaAtual && window.abrirRotaMapaAtual()"><i class="fa-solid fa-route"></i> Traçar rota</button>
                        </div>
                    </div>
                </div>

                <div class="glass-panel mapa-list-card">
                    <div class="mapa-list-head">
                        <div>
                            <h2><i class="fa-solid fa-location-dot"></i> Matos cadastrados</h2>
                            <small id="mapaResumoLista">0 local(is) cadastrados.</small>
                        </div>
                        <div class="mapa-list-filters">
                            <input type="search" id="mapaBusca" placeholder="Buscar mato, dono ou cidade..." oninput="window.renderMapaMatos && window.renderMapaMatos()">
                            <select id="mapaFiltroStatus" onchange="window.renderMapaMatos && window.renderMapaMatos()">
                                <option value="TODOS">Todos</option>
                                <option value="EM_ANALISE">Em analise</option>
                                <option value="NEGOCIANDO">Negociando</option>
                                <option value="CONTRATADO">Contratado</option>
                                <option value="FINALIZADO">Finalizado</option>
                            </select>
                        </div>
                    </div>
                    <div id="mapaMatosLista" class="mapa-matos-grid"></div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
