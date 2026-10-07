(function () {
    function atualizarBotoes(theme) {
        document.querySelectorAll('[data-theme-option]').forEach(function (button) {
            var ativo = button.dataset.themeOption === theme;
            button.classList.toggle('active', ativo);
            button.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        });
    }

    function aplicarVariaveis(root, theme) {
        var temas = {
            premium: {
                '--primary-color': '#111827',
                '--primary-hover': '#0f172a',
                '--accent-color': '#0f8fa6',
                '--bg-color': '#ece8dc',
                '--panel-bg': '#fffdf7',
                '--panel-border': '#ddd3c4',
                '--text-color': '#111827',
                '--text-muted': '#64748b'
            },
            musgo: {
                '--primary-color': '#4a5d23',
                '--primary-hover': '#3a4a1c',
                '--accent-color': '#6b8e23',
                '--bg-color': '#1a1f16',
                '--panel-bg': 'rgba(20, 25, 17, 0.88)',
                '--panel-border': 'rgba(255, 255, 255, 0.08)',
                '--text-color': '#e6edf3',
                '--text-muted': '#a1a1a1'
            },
            dark: {
                '--primary-color': '#3b82f6',
                '--primary-hover': '#2563eb',
                '--accent-color': '#60a5fa',
                '--bg-color': '#0f172a',
                '--panel-bg': 'rgba(15, 23, 42, 0.88)',
                '--panel-border': 'rgba(255, 255, 255, 0.08)',
                '--text-color': '#f8fafc',
                '--text-muted': '#94a3b8'
            },
            light: {
                '--primary-color': '#2563eb',
                '--primary-hover': '#1d4ed8',
                '--accent-color': '#3b82f6',
                '--bg-color': '#f1f5f9',
                '--panel-bg': 'rgba(255, 255, 255, 0.95)',
                '--panel-border': 'rgba(0, 0, 0, 0.08)',
                '--text-color': '#1e293b',
                '--text-muted': '#64748b'
            },
            original: {
                '--primary-color': '#e67e22',
                '--primary-hover': '#d35400',
                '--accent-color': '#f1c40f',
                '--bg-color': '#0f0a09',
                '--panel-bg': 'rgba(18, 12, 10, 0.88)',
                '--panel-border': 'rgba(255, 255, 255, 0.08)',
                '--text-color': '#e6edf3',
                '--text-muted': '#a1a1a1'
            }
        };
        var variaveis = temas[theme] || temas.original;
        Object.keys(variaveis).forEach(function (nome) {
            root.style.setProperty(nome, variaveis[nome]);
        });
    }

    window.changeTheme = function (themeName) {
        var theme = themeName || 'original';
        var root = document.documentElement;
        var premiumAtivo = theme === 'premium';

        document.body.classList.toggle('orquestra-theme', premiumAtivo);
        root.dataset.theme = theme;
        aplicarVariaveis(root, theme);
        localStorage.setItem('orquestrasis_theme', theme);
        atualizarBotoes(theme);
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
    };
}());
