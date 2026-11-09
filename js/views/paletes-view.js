(function() {
    const html = `            <!-- ====== TELA: MODULO PALETES ====== -->
            <section id="view-paletes" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-pallet"></i> Paletes</h1>
                    <p>Estoque da madeira comprada, montagem e paletes prontos. As medidas dos paletes ficam no Cadastro de Medidas e o romaneio em Gerar Romaneio.</p>
                </div>
                <div class="pal-modulo-abas" role="tablist">
                    <button type="button" role="tab" class="pal-modulo-aba" data-pal-aba="madeira" aria-selected="true"><i class="fa-solid fa-boxes-stacked"></i> Estoque de madeira</button>
                    <button type="button" role="tab" class="pal-modulo-aba" data-pal-aba="prontos" aria-selected="false"><i class="fa-solid fa-hammer"></i> Montagem e paletes prontos</button>
                    <button type="button" role="tab" class="pal-modulo-aba" data-pal-aba="movimentos" aria-selected="false"><i class="fa-solid fa-clock-rotate-left"></i> Movimentos</button>
                </div>
                <div id="paletesEstoque" class="glass-panel pal-painel" style="margin-bottom: 0;"></div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
