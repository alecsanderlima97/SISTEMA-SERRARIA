(function() {
    const html = `            <!-- ====== TELA: MODULO PALETES ====== -->
            <section id="view-paletes" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-pallet"></i> Paletes</h1>
                    <p>Modelos de palete, estoque, montagem e venda</p>
                </div>
                <div class="pal-modulo-abas" role="tablist">
                    <button type="button" role="tab" class="pal-modulo-aba" data-pal-aba="modelos" aria-selected="true"><i class="fa-solid fa-ruler-combined"></i> Modelos de palete</button>
                </div>
                <div id="paletesModelos" class="glass-panel pal-painel" style="margin-bottom: 0;"></div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
