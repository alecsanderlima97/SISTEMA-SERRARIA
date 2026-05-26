(function() {
    function exibirErroNaTela(titulo, detalhe) {
        let banner = document.getElementById('orquestra-error-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'orquestra-error-banner';
            banner.style.position = 'fixed';
            banner.style.bottom = '20px';
            banner.style.right = '20px';
            banner.style.background = 'rgba(239, 68, 68, 0.95)';
            banner.style.color = '#fff';
            banner.style.padding = '16px 20px';
            banner.style.borderRadius = '8px';
            banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            banner.style.zIndex = '999999';
            banner.style.maxWidth = '380px';
            banner.style.fontFamily = 'sans-serif';
            banner.style.fontSize = '12px';
            banner.style.border = '1px solid rgba(255,255,255,0.2)';
            banner.style.backdropFilter = 'blur(8px)';
            banner.style.transition = 'all 0.3s ease';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '8px';

            const titleEl = document.createElement('strong');
            titleEl.style.color = '#ffe4e6';
            titleEl.style.fontSize = '13px';
            titleEl.textContent = titulo;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = '#fff';
            closeBtn.style.fontSize = '18px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = () => banner.remove();

            header.appendChild(titleEl);
            header.appendChild(closeBtn);
            banner.appendChild(header);

            const content = document.createElement('div');
            content.id = 'orquestra-error-content';
            content.style.lineHeight = '1.4';
            content.style.wordBreak = 'break-word';
            content.innerHTML = detalhe;
            banner.appendChild(content);

            document.body.appendChild(banner);
        } else {
            const content = document.getElementById('orquestra-error-content');
            if (content) {
                content.innerHTML += '<br><br>' + detalhe;
            }
        }
    }

    function autocorrigirEstruturaDOM() {
        console.log("Orquestra.cs: Iniciando verificacao estrutural do DOM...");
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error("Orquestra.cs: Container .main-content nao encontrado!");
            return;
        }

        const sections = document.querySelectorAll('.view-section');
        let corrigidos = 0;
        sections.forEach(section => {
            if (section.parentElement !== mainContent) {
                console.warn(`Orquestra.cs: Secao "${section.id}" estava incorretamente aninhada. Corrigindo...`);
                mainContent.appendChild(section);
                corrigidos++;
            }
        });

        if (corrigidos > 0) {
            console.log(`Orquestra.cs: ${corrigidos} secoes foram corrigidas estruturalmente no DOM em tempo real.`);
        }
    }

    window.addEventListener('error', function(event) {
        console.error("Erro capturado:", event.message);
        const file = event.filename ? event.filename.split('/').pop() : 'desconhecido';
        exibirErroNaTela("Erro de Codigo Detectado", `${event.message}<br><small style="opacity:0.8;">Arquivo: ${file} (Linha ${event.lineno})</small>`);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error("Rejeicao de promessa:", event.reason);
        const msg = event.reason ? (event.reason.message || event.reason) : 'Erro desconhecido de rede/Firebase';
        exibirErroNaTela("Erro no Banco/Rede", msg);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autocorrigirEstruturaDOM);
    } else {
        autocorrigirEstruturaDOM();
    }

    window.App = window.App || {
        showSection: function(id) {
            autocorrigirEstruturaDOM();

            const sections = document.querySelectorAll('.view-section');
            let found = false;
            sections.forEach(section => {
                if (section.id === id) {
                    section.style.display = 'block';
                    section.classList.add('active-section');
                    found = true;
                } else {
                    section.style.display = 'none';
                    section.classList.remove('active-section');
                }
            });
            if (!found && id !== 'view-dashboard') {
                console.warn("Fallback: Secao nao encontrada: " + id);
            }
        }
    };

    window.navegarPara = window.navegarPara || function(targetId) {
        console.log("Navegando via Fallback para:", targetId);
        if (window.App && typeof window.App.showSection === 'function') {
            window.App.showSection(targetId);

            document.querySelectorAll('.sidebar nav ul li a').forEach(link => link.classList.remove('active'));
            const activeLink = document.querySelector(`.sidebar nav ul li a[data-target="${targetId}"]`);
            if (activeLink) activeLink.classList.add('active');

            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) dropdown.style.display = 'none';

            if (window.innerWidth <= 768) {
                const appWrapper = document.querySelector('.app-wrapper');
                if (appWrapper && !appWrapper.classList.contains('sidebar-collapsed')) {
                    const btnToggle = document.getElementById('btnToggleSidebar');
                    if (btnToggle) btnToggle.click();
                }
            }
        }
    };
})();
