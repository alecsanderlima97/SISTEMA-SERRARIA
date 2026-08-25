(function() {
    const UI_PREFS = {
        help: 'orquestra_help_enabled',
        guide: 'orquestra_screen_guide_enabled',
        assistant: 'orquestra_assistant_float_enabled',
        companion: 'orquestra_assistant_companion_enabled',
        motion: 'orquestra_background_motion_enabled',
        compact: 'orquestra_compact_mode_enabled'
    };

    function lerPreferencia(key, defaultValue = true) {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value !== 'false';
    }

    function salvarPreferencia(key, value) {
        localStorage.setItem(key, value ? 'true' : 'false');
    }

    function sincronizarCamposPreferencias() {
        const mapa = [
            ['configAjudaVisual', UI_PREFS.help],
            ['configGuiaAutomatico', UI_PREFS.guide],
            ['configAssistenteFlutuante', UI_PREFS.assistant],
            ['configAssistenteCompanion', UI_PREFS.companion],
            ['configMovimentoFundo', UI_PREFS.motion],
            ['configModoCompacto', UI_PREFS.compact]
        ];
        mapa.forEach(([id, key]) => {
            const campo = document.getElementById(id);
            if (campo) campo.checked = lerPreferencia(key, true);
        });
    }

    function aplicarPreferenciasInterface() {
        const ajuda = lerPreferencia(UI_PREFS.help, true);
        const guia = ajuda && lerPreferencia(UI_PREFS.guide, true);
        const assistente = lerPreferencia(UI_PREFS.assistant, true);
        const companion = ajuda && lerPreferencia(UI_PREFS.companion, true);
        const movimento = lerPreferencia(UI_PREFS.motion, true);
        const compacto = lerPreferencia(UI_PREFS.compact, false);

        document.body.classList.toggle('ui-help-disabled', !ajuda);
        document.body.classList.toggle('ui-guide-disabled', !guia);
        document.body.classList.toggle('ui-assistant-disabled', !assistente);
        document.body.classList.toggle('ui-companion-disabled', !companion);
        document.body.classList.toggle('ui-motion-disabled', !movimento);
        document.body.classList.toggle('ui-compact-mode', compacto);
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
