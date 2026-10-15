(() => {
    const STORAGE_PREFIX = 'orquestra:table-column-widths:v1:';
    const MOBILE_BREAKPOINT = 760;
    const DEFAULT_MIN_WIDTH = 72;
    const SELECTION_MIN_WIDTH = 54;
    const ACTION_MIN_WIDTH = 128;
    const tables = new WeakMap();
    let observerScheduled = false;

    function normalizarTitulo(texto = '') {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function obterLinhaCabecalho(table) {
        const linhas = table?.tHead?.rows;
        return linhas?.length ? linhas[linhas.length - 1] : null;
    }

    function obterCabecalhos(table) {
        const linha = obterLinhaCabecalho(table);
        if (!linha) return [];
        return Array.from(linha.children).filter(cell => cell.tagName === 'TH');
    }

    function textoCabecalho(th) {
        return String(th?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function assinaturaTabela(table, headers = obterCabecalhos(table)) {
        return headers.map(textoCabecalho).join('|');
    }

    function tabelaElegivel(table) {
        if (!table || table.closest('.print-area, #printArea, [data-print-only="true"]')) return false;
        if (table.matches('.rom-doc-table, .doc-table')) return false;
        if (table.dataset.noColumnResize === 'true') return false;

        const headers = obterCabecalhos(table);
        if (headers.length < 2) return false;
        return headers.every(header => Number(header.colSpan || 1) === 1 && Number(header.rowSpan || 1) === 1);
    }

    function hashTexto(texto) {
        let hash = 2166136261;
        for (let indice = 0; indice < texto.length; indice += 1) {
            hash ^= texto.charCodeAt(indice);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function obterEscopoTabela(table) {
        return table.closest('.view-section, .modal-v2, .modal, [role="dialog"]') || document.querySelector('main') || document.body;
    }

    function obterChaveTabela(table, headers) {
        if (table.dataset.orqResizeKey) return table.dataset.orqResizeKey;

        const escopo = obterEscopoTabela(table);
        const tabelasDoEscopo = Array.from(escopo.querySelectorAll('table'));
        const assinatura = assinaturaTabela(table, headers);
        const mesmaTabela = tabelasDoEscopo.filter(item => {
            if (item === table) return true;
            return item.className === table.className && assinaturaTabela(item) === assinatura;
        });
        const indice = Math.max(0, mesmaTabela.indexOf(table));
        const identificador = [
            escopo.id || escopo.dataset.section || '',
            table.id || '',
            table.className || '',
            assinatura,
            indice
        ].join('::');

        table.dataset.orqResizeKey = hashTexto(identificador);
        return table.dataset.orqResizeKey;
    }

    function capturarEstadoOriginal(table) {
        if (tables.has(table)) return tables.get(table);

        const colgroup = Array.from(table.children).find(child => child.tagName === 'COLGROUP') || null;
        const estado = {
            tableLayout: table.style.tableLayout,
            width: table.style.width,
            colgroup,
            colWidths: colgroup ? Array.from(colgroup.children).map(col => col.style.width) : null,
            createdColgroup: false
        };
        tables.set(table, estado);
        return estado;
    }

    function obterColgroup(table, quantidade) {
        const estado = capturarEstadoOriginal(table);
        let colgroup = estado.colgroup;

        if (!colgroup || !colgroup.isConnected) {
            colgroup = document.createElement('colgroup');
            colgroup.dataset.orqResizeGenerated = 'true';
            table.insertBefore(colgroup, table.tHead || table.firstChild);
            if (!estado.colgroup) {
                estado.colgroup = colgroup;
                estado.createdColgroup = true;
                estado.colWidths = [];
            }
        }

        while (colgroup.children.length < quantidade) colgroup.appendChild(document.createElement('col'));
        return Array.from(colgroup.children).slice(0, quantidade);
    }

    function obterLargurasVisuais(table, headers) {
        const larguraTabela = table.getBoundingClientRect?.().width || table.clientWidth || 0;
        const larguras = headers.map(header => header.getBoundingClientRect?.().width || header.offsetWidth || 0);
        const fallback = Math.max(DEFAULT_MIN_WIDTH, larguraTabela / Math.max(headers.length, 1));
        const normalizadas = larguras.map(largura => largura > 0 ? largura : fallback);
        return normalizadas.map((largura, indice) => Math.max(largura, obterLarguraMinima(headers[indice], indice)));
    }

    function obterLarguraMinima(header, indice) {
        const titulo = normalizarTitulo(textoCabecalho(header));
        const valorExplicito = Number(header.dataset.orqResizeMin);
        if (Number.isFinite(valorExplicito) && valorExplicito > 0) return valorExplicito;
        if (titulo === 'acoes' || titulo === 'acao' || header.classList.contains('orq-coluna-acoes-fixa')) return ACTION_MIN_WIDTH;
        if (/^(sel\.?|selecionar|checkbox)$/.test(titulo)) return SELECTION_MIN_WIDTH;
        if (indice === 0 && header.querySelector('input[type="checkbox"]')) return SELECTION_MIN_WIDTH;
        return DEFAULT_MIN_WIDTH;
    }

    function lerLargurasSalvas(key, quantidade) {
        try {
            const salvo = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${key}`) || 'null');
            const larguras = Array.isArray(salvo?.widths) ? salvo.widths : [];
            if (larguras.length !== quantidade) return null;
            if (larguras.some(largura => !Number.isFinite(Number(largura)) || Number(largura) <= 0)) return null;
            return larguras.map(Number);
        } catch (error) {
            return null;
        }
    }

    function salvarLarguras(key, larguras) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify({
                widths: larguras.map(largura => Math.round(largura)),
                savedAt: new Date().toISOString()
            }));
        } catch (error) {
            // O redimensionamento continua funcionando mesmo quando o navegador bloqueia o armazenamento local.
        }
    }

    function aplicarLarguras(table, headers, larguras, definirComoManual = false) {
        const cols = obterColgroup(table, headers.length);
        const ajustadas = larguras.map((largura, indice) => Math.max(Number(largura) || 0, obterLarguraMinima(headers[indice], indice)));
        const soma = ajustadas.reduce((total, largura) => total + largura, 0);

        cols.forEach((col, indice) => {
            col.style.width = `${Math.round(ajustadas[indice])}px`;
        });
        table.classList.add('orq-colunas-redimensionaveis');
        table.style.tableLayout = 'fixed';

        const larguraAtual = table.getBoundingClientRect?.().width || table.clientWidth || 0;
        if (definirComoManual || table.dataset.orqResizeStored === 'true') {
            table.style.width = `${Math.max(Math.round(larguraAtual), Math.round(soma))}px`;
        }
        return ajustadas;
    }

    function removerHandles(table) {
        table.querySelectorAll('.orq-col-resize-handle').forEach(handle => handle.remove());
    }

    function atualizarAria(handle, table, indice, largura) {
        const headers = obterCabecalhos(table);
        const tituloAtual = textoCabecalho(headers[indice]);
        const tituloSeguinte = textoCabecalho(headers[indice + 1]);
        handle.setAttribute('aria-label', `Redimensionar coluna ${tituloAtual || indice + 1} e ${tituloSeguinte || indice + 2}`);
        handle.setAttribute('aria-valuenow', String(Math.round(largura)));
    }

    function ajustarLimite(table, indice, deslocamento) {
        const headers = obterCabecalhos(table);
        if (indice < 0 || indice >= headers.length - 1) return;
        const inicio = obterLargurasVisuais(table, headers);
        const minimoAtual = obterLarguraMinima(headers[indice], indice);
        const minimoSeguinte = obterLarguraMinima(headers[indice + 1], indice + 1);
        const limiteInferior = minimoAtual - inicio[indice];
        const limiteSuperior = inicio[indice + 1] - minimoSeguinte;
        const delta = Math.min(Math.max(deslocamento, limiteInferior), limiteSuperior);
        const finais = inicio.slice();
        finais[indice] += delta;
        finais[indice + 1] -= delta;
        const ajustadas = aplicarLarguras(table, headers, finais, true);
        salvarLarguras(obterChaveTabela(table, headers), ajustadas);
        table.dataset.orqResizeStored = 'true';
        return ajustadas;
    }

    function iniciarArraste(event, table, indice, handle) {
        if (event.button !== 0 || window.innerWidth <= MOBILE_BREAKPOINT) return;
        event.preventDefault();
        event.stopPropagation();

        const headers = obterCabecalhos(table);
        const largurasIniciais = obterLargurasVisuais(table, headers);
        const minimoAtual = obterLarguraMinima(headers[indice], indice);
        const minimoSeguinte = obterLarguraMinima(headers[indice + 1], indice + 1);
        const inicioX = event.clientX;
        let moveu = false;

        table.classList.add('orq-coluna-em-ajuste');
        document.body.classList.add('orq-redimensionando-coluna');
        handle.classList.add('is-dragging');
        handle.setPointerCapture?.(event.pointerId);

        const mover = moveEvent => {
            moveEvent.preventDefault();
            const limiteInferior = minimoAtual - largurasIniciais[indice];
            const limiteSuperior = largurasIniciais[indice + 1] - minimoSeguinte;
            const delta = Math.min(Math.max(moveEvent.clientX - inicioX, limiteInferior), limiteSuperior);
            const larguras = largurasIniciais.slice();
            larguras[indice] += delta;
            larguras[indice + 1] -= delta;
            const ajustadas = aplicarLarguras(table, headers, larguras, true);
            atualizarAria(handle, table, indice, ajustadas[indice]);
            moveu = true;
        };

        const finalizar = () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', finalizar);
            window.removeEventListener('pointercancel', finalizar);
            table.classList.remove('orq-coluna-em-ajuste');
            document.body.classList.remove('orq-redimensionando-coluna');
            handle.classList.remove('is-dragging');
            if (moveu) {
                const finais = obterLargurasVisuais(table, headers);
                salvarLarguras(obterChaveTabela(table, headers), finais);
                table.dataset.orqResizeStored = 'true';
            }
        };

        window.addEventListener('pointermove', mover, { passive: false });
        window.addEventListener('pointerup', finalizar, { once: true });
        window.addEventListener('pointercancel', finalizar, { once: true });
    }

    function restaurarTabela(table) {
        const headers = obterCabecalhos(table);
        const estado = capturarEstadoOriginal(table);
        if (!headers.length) return;

        try {
            localStorage.removeItem(`${STORAGE_PREFIX}${obterChaveTabela(table, headers)}`);
        } catch (error) {}

        if (estado.createdColgroup && estado.colgroup?.isConnected) {
            estado.colgroup.remove();
        } else if (estado.colgroup) {
            Array.from(estado.colgroup.children).forEach((col, indice) => {
                col.style.width = estado.colWidths?.[indice] || '';
            });
        }

        table.style.tableLayout = estado.tableLayout || '';
        table.style.width = estado.width || '';
        table.dataset.orqResizeStored = 'false';
        table.classList.remove('orq-coluna-em-ajuste');
    }

    function criarHandle(table, header, indice) {
        const handle = document.createElement('span');
        handle.className = 'orq-col-resize-handle';
        handle.dataset.orqResizeIndex = String(indice);
        handle.dataset.tooltip = 'Arraste para ajustar. Duplo clique restaura as colunas.';
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'vertical');
        handle.tabIndex = 0;
        header.appendChild(handle);

        atualizarAria(handle, table, indice, obterLargurasVisuais(table, obterCabecalhos(table))[indice]);
        handle.addEventListener('pointerdown', event => iniciarArraste(event, table, indice, handle));
        handle.addEventListener('dblclick', event => {
            event.preventDefault();
            event.stopPropagation();
            restaurarTabela(table);
        });
        handle.addEventListener('keydown', event => {
            if (event.key === 'Home' || event.key === 'Delete') {
                event.preventDefault();
                restaurarTabela(table);
                return;
            }
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            event.stopPropagation();
            const passo = event.shiftKey ? 24 : 8;
            const deslocamento = event.key === 'ArrowRight' ? passo : -passo;
            const larguras = ajustarLimite(table, indice, deslocamento);
            if (larguras) atualizarAria(handle, table, indice, larguras[indice]);
        });
    }

    function decorarTabela(table) {
        if (!tabelaElegivel(table)) return;
        const headers = obterCabecalhos(table);
        capturarEstadoOriginal(table);
        const chave = obterChaveTabela(table, headers);
        const salvo = lerLargurasSalvas(chave, headers.length);
        const handlesAtuais = Array.from(table.querySelectorAll('.orq-col-resize-handle'));
        const handlesValidos = handlesAtuais.length === headers.length - 1
            && handlesAtuais.every(handle => handle.parentElement === headers[Number(handle.dataset.orqResizeIndex)]);

        if (!handlesValidos) {
            removerHandles(table);
            headers.slice(0, -1).forEach((header, indice) => criarHandle(table, header, indice));
        }

        table.classList.add('orq-colunas-redimensionaveis');
        table.title = table.title || 'Arraste as divisorias do cabecalho para ajustar as colunas. Duplo clique na divisoria restaura o padrao.';
        if (salvo && table.dataset.orqResizeStored !== 'true') {
            aplicarLarguras(table, headers, salvo);
            table.dataset.orqResizeStored = 'true';
        }
        table.dataset.orqResizeReady = 'true';
    }

    function aplicarEmTodasAsTabelas() {
        document.querySelectorAll('table').forEach(decorarTabela);
    }

    function agendarAplicacao() {
        if (observerScheduled) return;
        observerScheduled = true;
        window.requestAnimationFrame(() => {
            observerScheduled = false;
            aplicarEmTodasAsTabelas();
        });
    }

    window.resetarLargurasTabelaOrquestra = restaurarTabela;

    if (window.__orqRedimensionamentoColunasAtivo) return;
    window.__orqRedimensionamentoColunasAtivo = true;
    aplicarEmTodasAsTabelas();

    const observer = new MutationObserver(agendarAplicacao);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', agendarAplicacao, { passive: true });
})();
