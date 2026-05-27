(function() {
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
            refreshLink.addEventListener('click', event => {
                event.preventDefault();
                window.location.reload();
            });
        }

        const assistantHomeButton = document.getElementById('btnAssistantHomeSubmit');
        if (assistantHomeButton) {
            assistantHomeButton.addEventListener('click', () => {
                if (typeof window.enviarPerguntaAssistenteHome === 'function') {
                    window.enviarPerguntaAssistenteHome();
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarEventosShell);
    } else {
        iniciarEventosShell();
    }
})();
