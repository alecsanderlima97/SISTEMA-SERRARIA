(function() {
    const UI_PREFS = {
        help: 'orquestra_help_enabled',
        guide: 'orquestra_screen_guide_enabled',
        assistant: 'orquestra_assistant_float_enabled',
        companion: 'orquestra_assistant_companion_enabled',
        motion: 'orquestra_background_motion_enabled',
        backgroundImage: 'orquestra_background_image_enabled',
        backgroundCarousel: 'orquestra_background_carousel_enabled',
        compact: 'orquestra_compact_mode_enabled'
    };

    const BACKGROUND_PREF_KEY = 'orquestra_background_theme';
    const BACKGROUND_DEFAULT = 'florestal-1';
    const BACKGROUND_CAROUSEL_LAST_KEY = 'orquestra_background_carousel_last_at';
    const BACKGROUND_CAROUSEL_INTERVAL = 60 * 60 * 1000;
    let backgroundCarouselTimer = null;
    const BACKGROUND_OPTIONS = [
        { id: 'florestal-1', label: 'Florestal 1', category: 'Florestal' },
        { id: 'florestal-2', label: 'Florestal 2', category: 'Florestal' },
        { id: 'florestal-3', label: 'Florestal 3', category: 'Florestal' },
        { id: 'industrial-1', label: 'Industrial 1', category: 'Industrial' },
        { id: 'industrial-2', label: 'Industrial 2', category: 'Industrial' },
        { id: 'industrial-3', label: 'Industrial 3', category: 'Industrial' },
        { id: 'tecnologico-1', label: 'Tecnologico 1', category: 'Tecnologico' },
        { id: 'tecnologico-2', label: 'Tecnologico 2', category: 'Tecnologico' },
        { id: 'tecnologico-3', label: 'Tecnologico 3', category: 'Tecnologico' },
        { id: 'abstrato-1', label: 'Abstrato 1', category: 'Abstrato' },
        { id: 'abstrato-2', label: 'Abstrato 2', category: 'Abstrato' },
        { id: 'abstrato-3', label: 'Abstrato 3', category: 'Abstrato' }
    ];

    function lerPreferencia(key, defaultValue = true) {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value !== 'false';
    }

    function salvarPreferencia(key, value) {
        localStorage.setItem(key, value ? 'true' : 'false');
    }

    function obterFundoSelecionado() {
        const salvo = localStorage.getItem(BACKGROUND_PREF_KEY) || BACKGROUND_DEFAULT;
        return BACKGROUND_OPTIONS.some(item => item.id === salvo) ? salvo : BACKGROUND_DEFAULT;
    }

    function renderizarGaleriaFundos() {
        const galeria = document.getElementById('configBackgroundGallery');
        if (!galeria) return;

        const selecionado = obterFundoSelecionado();
        galeria.innerHTML = BACKGROUND_OPTIONS.map(item => `
            <button type="button" class="config-background-option${item.id === selecionado ? ' active' : ''}"
                data-background-option="${item.id}"
                onclick="window.selecionarFundoSistema('${item.id}')"
                aria-pressed="${item.id === selecionado ? 'true' : 'false'}">
                <span class="config-background-preview" style="background-image:url('assets/themes/${item.id}-thumb.jpg')"></span>
                <span><strong>${item.label}</strong><small>${item.category}</small></span>
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            </button>
        `).join('');
    }

    function aplicarFundoSelecionado() {
        const selecionado = obterFundoSelecionado();
        document.body.dataset.backgroundTheme = selecionado;
        document.querySelectorAll('[data-background-option]').forEach(button => {
            const ativo = button.dataset.backgroundOption === selecionado;
            button.classList.toggle('active', ativo);
            button.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        });
    }

    window.selecionarFundoSistema = function(backgroundId) {
        if (!BACKGROUND_OPTIONS.some(item => item.id === backgroundId)) return;
        localStorage.setItem(BACKGROUND_PREF_KEY, backgroundId);
        localStorage.setItem(UI_PREFS.backgroundImage, 'true');
        localStorage.setItem(BACKGROUND_CAROUSEL_LAST_KEY, String(Date.now()));
        renderizarGaleriaFundos();
        aplicarPreferenciasInterface();
    };

    function sincronizarCamposPreferencias() {
        const mapa = [
            ['configAjudaVisual', UI_PREFS.help, true],
            ['configGuiaAutomatico', UI_PREFS.guide, true],
            ['configAssistenteFlutuante', UI_PREFS.assistant, true],
            ['configAssistenteCompanion', UI_PREFS.companion, true],
            ['configMovimentoFundo', UI_PREFS.motion, true],
            ['configImagemFundo', UI_PREFS.backgroundImage, true],
            ['configCarrosselFundo', UI_PREFS.backgroundCarousel, false],
            ['configModoCompacto', UI_PREFS.compact, false]
        ];
        mapa.forEach(([id, key, defaultValue]) => {
            const campo = document.getElementById(id);
            if (campo) campo.checked = lerPreferencia(key, defaultValue);
        });
    }

    function avancarFundoCarrossel() {
        const atual = obterFundoSelecionado();
        const indice = BACKGROUND_OPTIONS.findIndex(item => item.id === atual);
        const proximo = BACKGROUND_OPTIONS[(indice + 1) % BACKGROUND_OPTIONS.length];
        localStorage.setItem(BACKGROUND_PREF_KEY, proximo.id);
        localStorage.setItem(BACKGROUND_CAROUSEL_LAST_KEY, String(Date.now()));
        aplicarFundoSelecionado();
        renderizarGaleriaFundos();
    }

    function iniciarCarrosselFundos() {
        if (backgroundCarouselTimer) clearTimeout(backgroundCarouselTimer);
        backgroundCarouselTimer = null;
        if (!lerPreferencia(UI_PREFS.backgroundCarousel, false) || !lerPreferencia(UI_PREFS.backgroundImage, true)) return;

        const ultimaTroca = Number(localStorage.getItem(BACKGROUND_CAROUSEL_LAST_KEY) || Date.now());
        const decorrido = Math.max(0, Date.now() - ultimaTroca);
        if (!localStorage.getItem(BACKGROUND_CAROUSEL_LAST_KEY)) {
            localStorage.setItem(BACKGROUND_CAROUSEL_LAST_KEY, String(Date.now()));
        }
        if (decorrido >= BACKGROUND_CAROUSEL_INTERVAL) avancarFundoCarrossel();
        const espera = Math.max(1000, BACKGROUND_CAROUSEL_INTERVAL - Math.min(decorrido, BACKGROUND_CAROUSEL_INTERVAL));
        backgroundCarouselTimer = setTimeout(() => {
            avancarFundoCarrossel();
            iniciarCarrosselFundos();
        }, espera);
    }

    function aplicarPreferenciasInterface() {
        const ajuda = lerPreferencia(UI_PREFS.help, true);
        const guia = ajuda && lerPreferencia(UI_PREFS.guide, true);
        const assistente = lerPreferencia(UI_PREFS.assistant, true);
        const companion = ajuda && lerPreferencia(UI_PREFS.companion, true);
        const movimento = lerPreferencia(UI_PREFS.motion, true);
        const imagemFundo = lerPreferencia(UI_PREFS.backgroundImage, true);
        const compacto = lerPreferencia(UI_PREFS.compact, false);

        document.body.classList.toggle('ui-help-disabled', !ajuda);
        document.body.classList.toggle('ui-guide-disabled', !guia);
        document.body.classList.toggle('ui-assistant-disabled', !assistente);
        document.body.classList.toggle('ui-companion-disabled', !companion);
        document.body.classList.toggle('ui-motion-disabled', !movimento);
        document.body.classList.toggle('ui-background-image-disabled', !imagemFundo);
        document.body.classList.toggle('ui-compact-mode', compacto);
        aplicarFundoSelecionado();
        iniciarCarrosselFundos();
        if (!ajuda) document.getElementById('orquestraTooltip')?.classList.remove('is-visible');
        sincronizarCamposPreferencias();

        if (typeof window.atualizarPreferenciasAssistente === 'function') {
            window.atualizarPreferenciasAssistente();
        }
    }

    window.salvarPreferenciaInterface = function(key, value) {
        if (!Object.values(UI_PREFS).includes(key)) return;
        salvarPreferencia(key, Boolean(value));
        aplicarPreferenciasInterface();
    };

    window.restaurarPreferenciasInterfacePadrao = function() {
        Object.values(UI_PREFS).forEach(key => localStorage.removeItem(key));
        localStorage.removeItem(BACKGROUND_PREF_KEY);
        localStorage.removeItem(BACKGROUND_CAROUSEL_LAST_KEY);
        renderizarGaleriaFundos();
        aplicarPreferenciasInterface();
        alert('Preferencias visuais restauradas para o padrao.');
    };

    function fecharDropdownPerfil() {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    function alternarDropdownPerfil() {
        const dropdown = document.getElementById('profile-dropdown');
        if (!dropdown) return;
        dropdown.style.display = dropdown.style.display === 'none' || dropdown.style.display === '' ? 'block' : 'none';
    }

    function atualizarSistema(event) {
        event?.preventDefault();
        const botao = event?.currentTarget || document.getElementById('btnProfileRefresh');
        if (botao) {
            botao.classList.add('is-loading');
            botao.setAttribute('aria-busy', 'true');
        }

        const url = new URL(window.location.href);
        url.searchParams.set('v', Date.now().toString());
        window.location.href = url.toString();
    }

    const SECTION_HINTS = {
        'view-dashboard': 'Visão geral da operação',
        'view-romaneio': 'Cargas e madeira serrada',
        'view-subprodutos': 'Cavaco, pó e outros produtos',
        'view-historico': 'Vendas e romaneios concluídos',
        'view-clientes': 'Cadastro e condições comerciais',
        'view-transportes': 'Transportadoras e veículos',
        'view-entrada': 'Entradas, descarga e empreiteiros',
        'view-produtos': 'Classes, medidas e configurações',
        'view-estoque': 'Itens, tanques e movimentações',
        'view-frotas': 'Veículos, máquinas e manutenção',
        'view-financeiro': 'Contas, documentos e vencimentos',
        'view-rh': 'Funcionários e lançamentos mensais',
        'view-mapa': 'Matos, contratos e localização',
        'view-calculadoras': 'Cálculos operacionais',
        'view-agenda': 'Agenda e compromissos',
        'view-configuracoes': 'Preferências e controle do sistema'
    };

    function atualizarContextoCabecalho(targetId) {
        const link = document.querySelector(`.sidebar a[data-target="${targetId}"]`);
        const name = document.getElementById('globalHeaderSectionName');
        const hint = document.getElementById('globalHeaderSectionHint');
        const label = link?.textContent?.replace(/\s+/g, ' ').trim() || 'Sistema Vanmarte';
        if (name) name.textContent = label;
        if (hint) hint.textContent = SECTION_HINTS[targetId] || 'Operação integrada da serraria';
    }

    window.atualizarContextoCabecalho = atualizarContextoCabecalho;

    function iniciarContextoCabecalho() {
        const sidebar = document.querySelector('.sidebar');
        const sync = () => {
            const active = document.querySelector('.sidebar a[data-target].active');
            atualizarContextoCabecalho(active?.dataset.target || localStorage.getItem('appActiveSection') || 'view-dashboard');
        };
        sync();
        if (sidebar) new MutationObserver(sync).observe(sidebar, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    function iniciarNotificacoesCabecalho() {
        const center = document.querySelector('.header-notification-center');
        const button = document.getElementById('btnHeaderNotifications');
        const panel = document.getElementById('headerNotificationPanel');
        const close = document.getElementById('btnCloseHeaderNotifications');
        if (!center || !button || !panel || button.dataset.notificationsReady) return;
        button.dataset.notificationsReady = 'true';
        button.addEventListener('click', event => {
            event.stopPropagation();
            if (panel.hidden) window.marcarNotificacoesFinanceirasComoLidas?.();
            panel.hidden = !panel.hidden;
            button.setAttribute('aria-expanded', String(!panel.hidden));
        });
        close?.addEventListener('click', event => {
            event.stopPropagation();
            panel.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        });
        document.addEventListener('click', event => {
            if (panel.hidden || event.target.closest('.header-notification-center')) return;
            panel.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        });
    }

    function iniciarTooltipsOrquestra() {
        if (document.getElementById('orquestraTooltip')) return;

        const tooltip = document.createElement('div');
        tooltip.id = 'orquestraTooltip';
        tooltip.className = 'orquestra-tooltip hide-on-print';
        tooltip.setAttribute('role', 'tooltip');
        document.body.appendChild(tooltip);

        let alvoAtual = null;

        function obterTextoTooltip(elemento) {
            const manual = elemento.dataset.uiTooltip || elemento.getAttribute('title') || elemento.getAttribute('aria-label');
            if (manual && manual.trim().length >= 2) return manual.trim();

            const ehComando = elemento.matches('button, a, [role="button"], .kpi-card');
            if (!ehComando) return '';

            const texto = (elemento.innerText || elemento.textContent || '').replace(/\s+/g, ' ').trim();
            if (texto.length >= 2) return texto.length > 90 ? texto.slice(0, 87) + '...' : texto;
            return '';
        }

        function prepararAlvo(elemento) {
            if (!lerPreferencia(UI_PREFS.help, true)) return null;
            if (!elemento || elemento.dataset.tooltipDisabled === 'true') return null;
            const texto = obterTextoTooltip(elemento);
            if (!texto || texto.trim().length < 2) return null;
            if (!elemento.dataset.uiTooltip) elemento.dataset.uiTooltip = texto.trim();
            elemento.removeAttribute('title');
            return elemento;
        }

        function posicionar(clientX, clientY) {
            const margem = 14;
            const largura = tooltip.offsetWidth || 260;
            const altura = tooltip.offsetHeight || 42;
            const x = Math.max(margem + largura / 2, Math.min(window.innerWidth - margem - largura / 2, clientX));
            const y = Math.max(margem, Math.min(window.innerHeight - margem - altura, clientY + 18));
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        }

        function mostrar(elemento, clientX, clientY) {
            alvoAtual = prepararAlvo(elemento);
            if (!alvoAtual) return;
            tooltip.textContent = alvoAtual.dataset.uiTooltip;
            tooltip.classList.add('is-visible');
            posicionar(clientX, clientY);
        }

        function esconder() {
            alvoAtual = null;
            tooltip.classList.remove('is-visible');
        }

        document.addEventListener('mouseover', event => {
            if (!(event.target instanceof Element)) return;
            const alvo = event.target.closest('[title], [data-ui-tooltip], button, a, [role="button"], .kpi-card');
            if (!alvo || alvo.contains(event.relatedTarget)) return;
            mostrar(alvo, event.clientX, event.clientY);
        });

        document.addEventListener('mousemove', event => {
            if (!alvoAtual) return;
            posicionar(event.clientX, event.clientY);
        });

        document.addEventListener('mouseout', event => {
            if (!alvoAtual || alvoAtual.contains(event.relatedTarget)) return;
            esconder();
        });

        document.addEventListener('focusin', event => {
            if (!(event.target instanceof Element)) return;
            const alvo = event.target.closest('[title], [data-ui-tooltip], button, a, [role="button"], .kpi-card');
            if (!alvo) return;
            const rect = alvo.getBoundingClientRect();
            mostrar(alvo, rect.left + rect.width / 2, rect.bottom);
        });

        document.addEventListener('focusout', esconder);
    }

    function iniciarEventosShell() {
        document.querySelectorAll('.sidebar a[data-target], .profile-dropdown a[data-target]').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                const target = link.getAttribute('data-target');
                if (target && typeof window.navegarPara === 'function') {
                    window.navegarPara(target);
                    atualizarContextoCabecalho(target);
                }
            });
        });

        const headerUser = document.querySelector('.header-user-group');
        if (headerUser) {
            headerUser.addEventListener('click', event => {
                if (event.target.closest('.profile-dropdown')) return;
                alternarDropdownPerfil();
            });
        }

        const backupLink = document.getElementById('btnProfileBackup');
        if (backupLink) {
            backupLink.addEventListener('click', event => {
                event.preventDefault();
                fecharDropdownPerfil();
                if (typeof window.exportarBackup === 'function') {
                    window.exportarBackup(null);
                }
            });
        }

        const refreshLink = document.getElementById('btnProfileRefresh');
        if (refreshLink) {
            refreshLink.addEventListener('click', atualizarSistema);
        }

        const assistantHomeButton = document.getElementById('btnAssistantHomeSubmit');
        if (assistantHomeButton) {
            assistantHomeButton.addEventListener('click', () => {
                if (typeof window.enviarPerguntaAssistenteHome === 'function') {
                    window.enviarPerguntaAssistenteHome();
                }
            });
        }

        iniciarTooltipsOrquestra();
        iniciarContextoCabecalho();
        iniciarNotificacoesCabecalho();
        renderizarGaleriaFundos();
        aplicarPreferenciasInterface();

        document.addEventListener('change', event => {
            const campo = event.target;
            if (!(campo instanceof HTMLInputElement)) return;
            const prefKey = campo.dataset.prefKey;
            if (!prefKey) return;
            window.salvarPreferenciaInterface(prefKey, campo.checked);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarEventosShell);
    } else {
        iniciarEventosShell();
    }
})();
