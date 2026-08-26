(function() {
    const html = `
    <button type="button" id="assistantFloatButton" class="assistant-float-button hide-on-print" onclick="window.toggleAssistenteIA()" title="Abrir central de comunicação">
        <span class="assistant-orquestra-avatar" aria-hidden="true"><span class="assistant-orquestra-orb">O</span><span class="assistant-orquestra-baton"></span></span>
        <span id="chatFloatUnreadBadge" class="communication-float-badge" hidden>0</span>
    </button>

    <button type="button" id="assistantCompanion" class="assistant-companion hide-on-print" onclick="window.mostrarGuiaDaTelaAtual && window.mostrarGuiaDaTelaAtual(true)" title="Abrir guia da tela atual">
        <span class="assistant-companion-avatar" aria-hidden="true"><span>O</span></span>
        <span class="assistant-companion-text"><strong id="assistantCompanionTitle">Guia da tela</strong><small id="assistantCompanionHint">Clique para ver orientações rápidas.</small></span>
    </button>

    <aside id="assistantPanel" class="assistant-panel communication-center hide-on-print" aria-hidden="true">
        <div class="assistant-panel-header">
            <div><strong>Central de Comunicação</strong><small id="assistantConnectionStatus">Mensagens e assistência em um só lugar</small></div>
            <button type="button" class="assistant-close-btn" onclick="window.toggleAssistenteIA(false)" title="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="communication-tabs" role="tablist" aria-label="Central de comunicação">
            <button type="button" id="communicationTabMessages" class="communication-tab active" role="tab" aria-selected="true" onclick="window.switchCommunicationTab('messages')"><i class="fa-solid fa-comments"></i><span>Mensagens</span><span id="chatUnreadBadge" class="communication-tab-badge" hidden>0</span></button>
            <button type="button" id="communicationTabAI" class="communication-tab" role="tab" aria-selected="false" onclick="window.switchCommunicationTab('ai')"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Assistente IA</span></button>
        </div>

        <section id="communicationMessagesPanel" class="communication-panel active" role="tabpanel">
            <div class="chat-layout">
                <div class="chat-collaborators">
                    <div class="chat-section-heading"><div><strong>Colaboradores</strong><small id="chatCollaboratorsSummary">Carregando equipe...</small></div></div>
                    <label class="chat-search" for="chatCollaboratorSearch"><i class="fa-solid fa-magnifying-glass"></i><input id="chatCollaboratorSearch" type="search" placeholder="Buscar colaborador" autocomplete="off"></label>
                    <div id="chatCollaboratorsList" class="chat-collaborators-list"><div class="chat-state"><i class="fa-solid fa-circle-notch fa-spin"></i><span>Buscando colaboradores...</span></div></div>
                </div>

                <div id="chatConversation" class="chat-conversation">
                    <div class="chat-conversation-head">
                        <button type="button" id="chatMobileBack" class="chat-mobile-back" title="Voltar para colaboradores"><i class="fa-solid fa-chevron-left"></i></button>
                        <span id="chatConversationAvatar" class="chat-avatar">O</span>
                        <div><strong id="chatConversationName">Selecione um colaborador</strong><small id="chatConversationRole">Conversa interna e privada</small></div>
                    </div>
                    <div id="chatMessages" class="chat-messages"><div class="chat-empty-state"><i class="fa-regular fa-comments"></i><strong>Comece uma conversa</strong><span>Escolha uma pessoa da equipe para trocar mensagens.</span></div></div>
                    <form id="chatForm" class="chat-input-row"><input id="chatInput" type="text" maxlength="1500" placeholder="Escreva uma mensagem" autocomplete="off" disabled><button type="submit" title="Enviar mensagem" disabled><i class="fa-solid fa-paper-plane"></i></button></form>
                </div>
            </div>
        </section>

        <section id="communicationAIPanel" class="communication-panel" role="tabpanel" hidden>
            <div class="assistant-usage-card">
                <div><strong id="assistantUsageCost">US$ 0.0000</strong><small>gasto estimado</small></div>
                <div><strong id="assistantUsageTokens">0</strong><small>tokens</small></div>
                <div><label for="assistantBudgetInput">Cota US$</label><input id="assistantBudgetInput" type="number" min="0" step="0.01" value="1.00"></div>
                <div class="assistant-usage-bar"><span id="assistantUsageBar"></span></div>
            </div>
            <div class="assistant-quick-actions">
                <button type="button" onclick="window.mostrarGuiaDaTelaAtual && window.mostrarGuiaDaTelaAtual(true)">Me guie nesta tela</button>
                <button type="button" onclick="window.perguntarAssistente('resumo geral')">Resumo geral</button>
                <button type="button" onclick="window.perguntarAssistente('analisar frotas')">Frotas</button>
                <button type="button" onclick="window.perguntarAssistente('analisar estoque')">Estoque</button>
                <button type="button" onclick="window.perguntarAssistente('analisar financeiro')">Financeiro</button>
            </div>
            <div id="assistantGuideCard" class="assistant-guide-card">
                <div class="assistant-guide-head"><strong>Guia da tela</strong><button type="button" onclick="window.fecharGuiaAssistente && window.fecharGuiaAssistente()" title="Fechar guia"><i class="fa-solid fa-xmark"></i></button></div>
                <div id="assistantGuideContent">Abra uma tela do sistema para ver orientações rápidas.</div>
            </div>
            <div id="assistantMessages" class="assistant-messages"><div class="assistant-msg assistant-msg-bot">Olá! Posso analisar estoque, frotas, financeiro e relatos pendentes com os dados do sistema.</div></div>
            <form id="assistantForm" class="assistant-input-row"><input type="text" id="assistantInput" placeholder="Pergunte ao assistente"><button type="submit" title="Enviar"><i class="fa-solid fa-paper-plane"></i></button></form>
        </section>
    </aside>
`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
