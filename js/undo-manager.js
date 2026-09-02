(function() {
    let ultimaAcao = null;
    let timerExpiracao = null;

    function obterBarraDesfazer() {
        let barra = document.getElementById('undoActionBar');
        if (barra) return barra;
        barra = document.createElement('div');
        barra.id = 'undoActionBar';
        barra.className = 'undo-action-bar hide-on-print';
        barra.hidden = true;
        barra.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i><span id="undoActionText"></span><button type="button" id="btnUndoLastAction"><i class="fa-solid fa-rotate-left"></i> Desfazer</button><button type="button" id="btnDismissUndoAction" title="Fechar aviso"><i class="fa-solid fa-xmark"></i></button>';
        document.body.appendChild(barra);
        document.getElementById('btnUndoLastAction')?.addEventListener('click', executarDesfazer);
        document.getElementById('btnDismissUndoAction')?.addEventListener('click', ocultarDesfazer);
        return barra;
    }

    function ocultarDesfazer() {
        if (timerExpiracao) window.clearTimeout(timerExpiracao);
        timerExpiracao = null;
        ultimaAcao = null;
        const barra = document.getElementById('undoActionBar');
        if (barra) barra.hidden = true;
    }

    async function executarDesfazer() {
        const acao = ultimaAcao;
        if (!acao) return;
        const botao = document.getElementById('btnUndoLastAction');
        if (botao) botao.disabled = true;
        try {
            await acao.desfazer();
            ocultarDesfazer();
        } catch (error) {
            console.error('Nao foi possivel desfazer a ultima acao:', error);
            alert('Nao foi possivel desfazer esta alteracao. Atualize a tela e tente novamente.');
            if (botao) botao.disabled = false;
        }
    }

    window.registrarAcaoDesfazivel = function({ descricao, desfazer, duracao = 12000 }) {
        if (typeof desfazer !== 'function') return;
        ultimaAcao = { descricao: descricao || 'Alteracao realizada.', desfazer };
        const barra = obterBarraDesfazer();
        const texto = document.getElementById('undoActionText');
        if (texto) texto.textContent = ultimaAcao.descricao;
        barra.hidden = false;
        if (timerExpiracao) window.clearTimeout(timerExpiracao);
        timerExpiracao = window.setTimeout(ocultarDesfazer, duracao);
    };

    window.addEventListener('keydown', event => {
        const digitando = event.target?.matches?.('input, textarea, select, [contenteditable="true"]');
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !digitando && ultimaAcao) {
            event.preventDefault();
            executarDesfazer();
        }
    });
})();
