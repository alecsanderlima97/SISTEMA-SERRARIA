// Helpers globais pequenos que precisam existir antes/independente dos modulos ES.
window.abrirModalPatio = window.abrirModalPatio || function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (modalPatio) {
        modalPatio.style.display = 'flex';
    }
};

window.fecharModalPatio = window.fecharModalPatio || function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (modalPatio) {
        modalPatio.style.display = 'none';
    }
};

window.scrollToTopHelper = function() {
    const container = document.querySelector('.main-content');
    if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.scrollToBottomHelper = function() {
    const container = document.querySelector('.main-content');
    if (container) {
        container.scrollBy({ top: container.clientHeight * 0.75, behavior: 'smooth' });
    } else {
        window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
    }
};

function elementoVisivelParaAtalho(element) {
    if (!element || element.disabled) return false;
    if (element.type === 'hidden') return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function obterEscopoAtalhoCampo(element) {
    const modalAberto = element.closest('.modal-v2[style*="display: flex"], .modal[style*="display: flex"]');
    return element.closest('form') || modalAberto || element.closest('.view-section') || document;
}

function obterCamposNavegaveis(scope) {
    return Array.from(scope.querySelectorAll('input, select, textarea, button[type="submit"]'))
        .filter(elementoVisivelParaAtalho)
        .filter(element => !element.matches('[readonly], [data-no-enter-nav="true"]'))
        .filter(element => !element.closest('#assistantForm, #assistantHomeInput, .assistant-widget'));
}

function focarCampoRelativo(element, direcao = 1) {
    const scope = obterEscopoAtalhoCampo(element);
    const campos = obterCamposNavegaveis(scope);
    const index = campos.indexOf(element);
    if (index === -1) return false;

    const proximo = campos[index + direcao];
    if (!proximo) return false;

    proximo.focus();
    if (typeof proximo.select === 'function' && proximo.tagName !== 'SELECT') {
        proximo.select();
    }
    return true;
}

function enviarFormularioAtivo(element) {
    const form = element.closest('form');
    if (!form) return false;
    const submit = form.querySelector('button[type="submit"]:not([disabled])');
    if (submit) {
        submit.click();
        return true;
    }
    if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
        return true;
    }
    return false;
}

function inicializarAtalhosCampos() {
    if (window.__atalhosCamposOrquestraAtivos) return;
    window.__atalhosCamposOrquestraAtivos = true;

    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.isComposing) return;
        if (event.key !== 'Enter') return;

        const target = event.target;
        if (!target || !target.matches?.('input, select, textarea')) return;
        if (target.closest('#assistantForm, #assistantHomeInput, .assistant-widget')) return;

        if (event.ctrlKey) {
            event.preventDefault();
            enviarFormularioAtivo(target);
            return;
        }

        if (target.tagName === 'TEXTAREA' && !event.shiftKey) return;

        event.preventDefault();
        focarCampoRelativo(target, event.shiftKey ? -1 : 1);
    });
}

function criarBotaoRolagem(title, iconClass, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = title;
    button.className = 'btn-scroll-helper';
    button.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(230, 126, 34, 0.3); background: rgba(0, 0, 0, 0.65); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.5);';
    button.onclick = onClick;

    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.style.fontSize = '0.95rem';
    button.appendChild(icon);

    return button;
}

function inicializarWidgetRolagem() {
    if (document.querySelector('.scroll-helper-widget')) return;

    const widget = document.createElement('div');
    widget.className = 'scroll-helper-widget hide-on-print';
    widget.style.cssText = 'position: fixed; bottom: 25px; right: 25px; display: flex; flex-direction: column; gap: 8px; z-index: 9999;';
    widget.appendChild(criarBotaoRolagem('Subir ao Topo', 'fa-solid fa-chevron-up', window.scrollToTopHelper));
    widget.appendChild(criarBotaoRolagem('Descer Mais', 'fa-solid fa-chevron-down', window.scrollToBottomHelper));
    document.body.appendChild(widget);
}

function normalizarValorTabelaOrdenavel(texto = '') {
    const valor = String(texto || '').replace(/\s+/g, ' ').trim();
    const dataMatch = valor.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
    if (dataMatch) {
        const [, dia, mes, ano] = dataMatch;
        return { tipo: 'date', valor: new Date(Number(ano), Number(mes) - 1, Number(dia)).getTime() };
    }

    const numeroLimpo = valor
        .replace(/R\$/gi, '')
        .replace(/m³|m3|pçs?|pcts?|un|l\b/gi, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '');
    const numero = Number(numeroLimpo);
    if (numeroLimpo && Number.isFinite(numero)) return { tipo: 'number', valor: numero };
    return { tipo: 'text', valor: valor.toLocaleLowerCase('pt-BR') };
}

function compararValoresTabela(a, b, direcao) {
    if (a.tipo === 'number' || b.tipo === 'number' || a.tipo === 'date' || b.tipo === 'date') {
        const av = Number(a.valor) || 0;
        const bv = Number(b.valor) || 0;
        return direcao === 'asc' ? av - bv : bv - av;
    }
    return direcao === 'asc'
        ? String(a.valor).localeCompare(String(b.valor), 'pt-BR')
        : String(b.valor).localeCompare(String(a.valor), 'pt-BR');
}

function ordenarTabelaPorColuna(table, index, th) {
    const tbody = table.tBodies?.[0];
    if (!tbody) return;
    const linhas = Array.from(tbody.rows);
    if (linhas.length < 2) return;

    const direcaoAtual = th.dataset.sortDirection === 'asc' ? 'desc' : 'asc';
    table.querySelectorAll('th[data-orq-sortable="true"]').forEach(header => {
        header.dataset.sortDirection = '';
        header.classList.remove('orq-sort-asc', 'orq-sort-desc');
    });
    th.dataset.sortDirection = direcaoAtual;
    th.classList.add(direcaoAtual === 'asc' ? 'orq-sort-asc' : 'orq-sort-desc');

    linhas
        .map((row, posicao) => ({
            row,
            posicao,
            valor: normalizarValorTabelaOrdenavel(row.cells[index]?.innerText || row.cells[index]?.textContent || '')
        }))
        .sort((a, b) => compararValoresTabela(a.valor, b.valor, direcaoAtual) || a.posicao - b.posicao)
        .forEach(item => tbody.appendChild(item.row));
}

function tornarTabelaOrdenavel(table) {
    if (!table || table.dataset.orqSortableReady === 'true' || table.dataset.noAutoSort === 'true') return;
    const headers = Array.from(table.querySelectorAll('thead th'));
    if (!headers.length) return;
    table.dataset.orqSortableReady = 'true';
    table.classList.add('orq-sortable-table-ready');
    headers.forEach((th, index) => {
        const texto = (th.textContent || '').trim();
        if (!texto || th.querySelector('input, button, select') || /^(acoes|ações|sel\.?|selecionar)$/i.test(texto)) return;
        th.dataset.orqSortable = 'true';
        th.title = th.title || `Ordenar por ${texto}`;
        th.addEventListener('click', (event) => {
            if (event.target.closest('button, input, select, a')) return;
            ordenarTabelaPorColuna(table, index, th);
        });
    });
}

function injetarEstilosTabelaOrdenavel() {
    if (document.getElementById('orqTabelaOrdenavelStyle')) return;
    const style = document.createElement('style');
    style.id = 'orqTabelaOrdenavelStyle';
    style.textContent = `
        table.orq-sortable-table-ready th[data-orq-sortable="true"] {
            cursor: pointer;
            user-select: none;
            position: relative;
        }
        table.orq-sortable-table-ready th[data-orq-sortable="true"]::after {
            content: "\\f0dc";
            font-family: "Font Awesome 6 Free";
            font-weight: 900;
            margin-left: 6px;
            opacity: .28;
            font-size: .68em;
        }
        table.orq-sortable-table-ready th.orq-sort-asc::after {
            content: "\\f0de";
            opacity: .78;
        }
        table.orq-sortable-table-ready th.orq-sort-desc::after {
            content: "\\f0dd";
            opacity: .78;
        }
    `;
    document.head.appendChild(style);
}

function normalizarTituloColuna(texto) {
    return (texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function fixarColunaAcoesTabela(table) {
    if (!table || table.closest('.print-area')) return;

    const cabecalhos = Array.from(table.querySelectorAll('thead tr:last-child > th'));
    const indiceAcoes = cabecalhos.findIndex(cabecalho => {
        const titulo = normalizarTituloColuna(cabecalho.textContent);
        return titulo === 'acoes' || titulo === 'acao';
    });

    if (indiceAcoes < 0) return;

    table.classList.add('orq-tabela-acoes-fixas');
    table.querySelectorAll('thead tr, tbody tr, tfoot tr').forEach(linha => {
        const celulas = Array.from(linha.children).filter(celula => /^(TH|TD)$/.test(celula.tagName));
        const celulaAcao = celulas[indiceAcoes];
        if (celulaAcao) celulaAcao.classList.add('orq-coluna-acoes-fixa');
    });
}

function aplicarColunasAcoesFixas() {
    document.querySelectorAll('table').forEach(fixarColunaAcoesTabela);
}

function inicializarTabelasOrdenaveis() {
    if (window.__orqTabelasOrdenaveisAtivas) return;
    window.__orqTabelasOrdenaveisAtivas = true;
    injetarEstilosTabelaOrdenavel();
    const aplicar = () => {
        document.querySelectorAll('table').forEach(tornarTabelaOrdenavel);
        aplicarColunasAcoesFixas();
    };
    aplicar();
    const observer = new MutationObserver(() => aplicar());
    observer.observe(document.body, { childList: true, subtree: true });
}

window.reinicializarTabelasOrdenaveis = function() {
    document.querySelectorAll('table').forEach(table => {
        table.dataset.orqSortableReady = '';
        tornarTabelaOrdenavel(table);
    });
    aplicarColunasAcoesFixas();
};

window.aplicarColunasAcoesFixas = aplicarColunasAcoesFixas;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        inicializarWidgetRolagem();
        inicializarAtalhosCampos();
        inicializarTabelasOrdenaveis();
    });
} else {
    inicializarWidgetRolagem();
    inicializarAtalhosCampos();
    inicializarTabelasOrdenaveis();
}
