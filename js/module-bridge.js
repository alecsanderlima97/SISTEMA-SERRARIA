(function () {
    const nomesProtegidos = [
        'switchTabClientes',
        'switchTabTransportes',
        'switchTabProdutos',
        'switchTabEstoque',
        'switchTabSubprodutos',
        'switchTabFrotas',
        'switchTabRH',
        'switchTabEntrada',
        'processarNotaFiscalEstoque'
    ];

    nomesProtegidos.forEach((nome) => {
        if (typeof window[nome] === 'function') return;

        const ponteEnquantoCarrega = function (...args) {
            const inicio = Date.now();
            const tentarNovamente = () => {
                const funcaoReal = window[nome];
                if (typeof funcaoReal === 'function' && funcaoReal !== ponteEnquantoCarrega) {
                    return funcaoReal.apply(window, args);
                }

                if (Date.now() - inicio < 8000) {
                    window.setTimeout(tentarNovamente, 100);
                    return;
                }

                console.warn(`O modulo responsavel por ${nome} nao terminou de carregar.`);
            };

            tentarNovamente();
        };

        ponteEnquantoCarrega.__orquestraModuleBridge = true;
        window[nome] = ponteEnquantoCarrega;
    });
})();
