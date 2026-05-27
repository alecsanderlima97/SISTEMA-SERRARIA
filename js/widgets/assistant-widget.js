(function() {
    const html = `    <button type="button" id="assistantFloatButton" class="assistant-float-button hide-on-print" onclick="window.toggleAssistenteIA()" title="Assistente IA">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
    </button>

    <aside id="assistantPanel" class="assistant-panel hide-on-print" aria-hidden="true">
        <div class="assistant-panel-header">
            <div>
                <strong>Assistente IA</strong>
                <small>Analise local do sistema</small>
            </div>
            <button type="button" onclick="window.toggleAssistenteIA(false)" title="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="assistant-quick-actions">
            <button type="button" onclick="window.perguntarAssistente('resumo geral')">Resumo geral</button>
            <button type="button" onclick="window.perguntarAssistente('analisar frotas')">Frotas</button>
            <button type="button" onclick="window.perguntarAssistente('analisar estoque')">Estoque</button>
            <button type="button" onclick="window.perguntarAssistente('analisar financeiro')">Financeiro</button>
        </div>
        <div id="assistantMessages" class="assistant-messages">
            <div class="assistant-msg assistant-msg-bot">OlÃƒÆ’Ã‚Â¡! Posso analisar estoque, frotas, financeiro e relatos pendentes com os dados do sistema.</div>
        </div>
        <form id="assistantForm" class="assistant-input-row">
            <input type="text" id="assistantInput" placeholder="Pergunte ao assistente">
            <button type="submit" title="Enviar"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
    </aside>

`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();

