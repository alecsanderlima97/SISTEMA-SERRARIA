(function () {
    const textoNormalizado = valor => String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();

    function ehCaminhao(registro = {}) {
        const texto = textoNormalizado([
            registro.modelo,
            registro.caminhao,
            registro.tipoVeiculo,
            registro.tipo,
            registro.categoria,
            registro.grupo
        ].filter(Boolean).join(' '));

        const termosNaoCaminhao = [
            'MOTO', 'BROS', 'MOTOCICLETA', 'CARREGADEIRA', 'ESCAVADEIRA',
            'TRATOR', 'MAQUINA', 'ESTEIRA', 'EMPILHADEIRA', 'MOTONIVELADORA',
            'ROLO COMPACTADOR', 'MUNK', 'MUNCK', 'MF 292', 'AGRALE', 'BERCO',
            'FORD 4610'
        ];
        if (termosNaoCaminhao.some(termo => texto.includes(textoNormalizado(termo)))) return false;

        const termosCaminhao = [
            'CAMINHAO', 'CONSTELLATION', 'AXOR', 'VOLVO', 'SCANIA', 'MERCEDES',
            'CARGO', 'ATEGO', 'IVECO', 'DAF', 'HILUX', 'CARRETA', 'CAVALO',
            'TRUCK', 'TOCO', 'CACAMBA', 'F-250', 'F250', 'F-350', 'F350',
            'F-4000', 'F4000'
        ];
        if (termosCaminhao.some(termo => texto.includes(textoNormalizado(termo)))) return true;

        return Boolean(
            (registro.placa || registro.placaCaminhao)
            && (registro.modelo || registro.caminhao)
        );
    }

    function medidas(registro = {}) {
        const origem = registro.medidas || registro.dimensoes || {};
        const numero = valor => {
            const normalizado = String(valor ?? '').replace(',', '.');
            const resultado = Number(normalizado);
            return Number.isFinite(resultado) ? resultado : 0;
        };
        return {
            alt: numero(origem.alt ?? origem.altura ?? origem.alturaCarga ?? registro.alt ?? registro.altura ?? registro.alturaCarga),
            larg: numero(origem.larg ?? origem.largura ?? origem.larguraCarga ?? registro.larg ?? registro.largura ?? registro.larguraCarga),
            comp: numero(origem.comp ?? origem.comprimento ?? origem.comprimentoCarga ?? registro.comp ?? registro.comprimento ?? registro.comprimentoCarga)
        };
    }

    window.OrquestraCaminhoes = {
        textoNormalizado,
        ehCaminhao,
        medidas
    };
})();
