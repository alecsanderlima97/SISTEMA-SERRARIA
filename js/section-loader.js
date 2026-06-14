(function () {
    const registros = new Map();

    function secaoAtiva(id) {
        return document.getElementById(id)?.classList.contains('active-section') === true;
    }

    function register(sectionId, loader, options = {}) {
        if (!sectionId || typeof loader !== 'function') return null;
        if (registros.has(sectionId)) return registros.get(sectionId);

        let carregado = false;
        let carregadoEm = 0;
        let pendente = null;
        let precisaAtualizar = true;
        const maxAge = Number(options.maxAge ?? 60000);

        const api = {
            async load(force = false) {
                if (pendente) return pendente;
                const cacheValido = carregado && !precisaAtualizar && (maxAge <= 0 || Date.now() - carregadoEm < maxAge);
                if (cacheValido && !force) return;
                pendente = Promise.resolve()
                    .then(() => loader())
                    .then(() => {
                        carregado = true;
                        carregadoEm = Date.now();
                        precisaAtualizar = false;
                    })
                    .finally(() => {
                        pendente = null;
                    });
                return pendente;
            },
            invalidate() {
                precisaAtualizar = true;
            },
            isLoaded() {
                return carregado;
            }
        };

        registros.set(sectionId, api);
        document.addEventListener('app:section-change', event => {
            if (event.detail?.id === sectionId) {
                api.load().catch(error => console.error(`Falha ao carregar a secao ${sectionId}:`, error));
            }
        });
        setTimeout(() => {
            if (secaoAtiva(sectionId)) {
                api.load().catch(error => console.error(`Falha ao carregar a secao ${sectionId}:`, error));
            }
        }, 0);
        return api;
    }

    window.SectionLoader = { register };
})();
