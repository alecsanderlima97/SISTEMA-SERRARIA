(function() {
    const html = `    <!-- BOTÃƒÆ’Ã†â€™O FLUTUANTE DE ROLAGEM RÃƒÆ’Ã‚ÂPIDA (Subir / Descer) -->
    <div class="scroll-helper-widget hide-on-print" style="position: fixed; bottom: 25px; right: 25px; display: flex; flex-direction: column; gap: 8px; z-index: 9999;">
        <button onclick="window.scrollToTopHelper()" title="Subir ao Topo" class="btn-scroll-helper" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(230, 126, 34, 0.3); background: rgba(0, 0, 0, 0.65); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <i class="fa-solid fa-chevron-up" style="font-size: 0.95rem;"></i>
        </button>
        <button onclick="window.scrollToBottomHelper()" title="Descer Mais" class="btn-scroll-helper" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(230, 126, 34, 0.3); background: rgba(0, 0, 0, 0.65); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <i class="fa-solid fa-chevron-down" style="font-size: 0.95rem;"></i>
        </button>
    </div>

`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();

