const CNPJ_ENDPOINT = 'https://brasilapi.com.br/api/cnpj/v1';
const CNPJ_FALLBACK_ENDPOINT = 'https://open.cnpja.com/office';
const CNPJ_SELECTOR = 'input[data-cnpj-autofill="true"]';
const cnpjCache = new Map();
const consultasEmAndamento = new Map();
const temporizadores = new WeakMap();

function somenteDigitos(valor = '') {
    return String(valor).replace(/\D/g, '');
}

function formatarCpfCnpj(valor = '') {
    const digitos = somenteDigitos(valor).slice(0, 14);

    if (digitos.length <= 11) {
        return digitos
            .replace(/^(\d{3})(\d)/, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    }

    return digitos
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
}

function validarCnpj(cnpj) {
    const digitos = somenteDigitos(cnpj);
    if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) return false;

    const calcularDigito = (base, pesos) => {
        const soma = base.split('').reduce((total, numero, indice) => total + Number(numero) * pesos[indice], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const primeiro = calcularDigito(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const segundo = calcularDigito(`${digitos.slice(0, 12)}${primeiro}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digitos.endsWith(`${primeiro}${segundo}`);
}

function formatarTelefone(valor = '') {
    const digitos = somenteDigitos(valor).slice(0, 11);
    if (digitos.length < 10) return valor;
    if (digitos.length === 11) return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
}

function formatarCep(valor = '') {
    const digitos = somenteDigitos(valor).slice(0, 8);
    return digitos.length === 8 ? digitos.replace(/^(\d{5})(\d{3})$/, '$1-$2') : valor;
}

function obterStatus(input) {
    const id = `${input.id || 'cnpj'}-lookup-status`;
    let status = document.getElementById(id);
    if (status) return status;

    status = document.createElement('small');
    status.id = id;
    status.className = 'cnpj-lookup-status';
    status.setAttribute('aria-live', 'polite');
    input.insertAdjacentElement('afterend', status);
    return status;
}

function mostrarStatus(input, mensagem = '', tipo = '') {
    const status = obterStatus(input);
    status.textContent = mensagem;
    status.dataset.status = tipo;
    status.hidden = !mensagem;
    input.classList.toggle('cnpj-consultando', tipo === 'loading');
    input.classList.toggle('cnpj-consulta-ok', tipo === 'success');
    input.classList.toggle('cnpj-consulta-erro', tipo === 'error');
}

function podePreencher(campo) {
    if (!campo) return false;
    if (!String(campo.value || '').trim()) return true;
    return campo.dataset.cnpjAutofillValue === campo.value;
}

function preencherCampo(id, valor, transformador = value => value) {
    if (!id || valor === undefined || valor === null || String(valor).trim() === '') return false;
    const campo = document.getElementById(id);
    if (!podePreencher(campo)) return false;

    const valorFinal = transformador(String(valor).trim());
    if (!valorFinal) return false;
    campo.value = valorFinal;
    campo.dataset.cnpjAutofillValue = valorFinal;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function obterInscricaoEstadual(dados) {
    if (dados.inscricao_estadual) return dados.inscricao_estadual;
    if (!Array.isArray(dados.inscricoes_estaduais)) return '';
    const inscricao = dados.inscricoes_estaduais.find(item => item?.ativo !== false) || dados.inscricoes_estaduais[0];
    return inscricao?.inscricao_estadual || inscricao?.numero || '';
}

function montarEndereco(dados, completo = false) {
    const partes = [];
    const logradouro = [dados.descricao_tipo_de_logradouro, dados.logradouro].filter(Boolean).join(' ').trim();
    if (logradouro) partes.push(logradouro);
    const numero = String(dados.numero || '').trim();
    const ultimoTrecho = logradouro.split(/\s+/).at(-1)?.replace(/[^A-Z0-9]/gi, '') || '';
    const numeroNormalizado = numero.replace(/[^A-Z0-9]/gi, '');
    if (numero && ultimoTrecho !== numeroNormalizado) partes.push(numero);
    if (dados.complemento) partes.push(dados.complemento);
    if (dados.bairro) partes.push(dados.bairro);
    if (completo && dados.municipio) partes.push(`${dados.municipio}${dados.uf ? ` / ${dados.uf}` : ''}`);
    if (completo && dados.cep) partes.push(`CEP ${formatarCep(dados.cep)}`);
    return partes.join(' - ').toUpperCase();
}

function preencherDados(input, dados) {
    const upper = valor => valor.toUpperCase();
    const cidadeEstado = [dados.municipio, dados.uf].filter(Boolean).join(' / ').toUpperCase();
    const razaoSocial = dados.razao_social || dados.nome_fantasia || '';

    preencherCampo(input.dataset.cnpjName, razaoSocial, upper);
    preencherCampo(input.dataset.cnpjFantasyName, dados.nome_fantasia, upper);
    preencherCampo(input.dataset.cnpjEmail, dados.email, value => value.toLowerCase());
    preencherCampo(input.dataset.cnpjPhone, dados.ddd_telefone_1 || dados.ddd_telefone_2, formatarTelefone);
    preencherCampo(input.dataset.cnpjCep, dados.cep, formatarCep);
    preencherCampo(input.dataset.cnpjStreet, montarEndereco(dados, false), upper);
    preencherCampo(input.dataset.cnpjFullAddress, montarEndereco(dados, true), upper);
    preencherCampo(input.dataset.cnpjNumber, dados.numero, upper);
    preencherCampo(input.dataset.cnpjCity, cidadeEstado, upper);
    preencherCampo(input.dataset.cnpjIe, obterInscricaoEstadual(dados), upper);
}

function normalizarDadosCnpja(dados = {}) {
    const endereco = dados.address || {};
    const telefone = Array.isArray(dados.phones) ? dados.phones[0] : null;
    const email = Array.isArray(dados.emails) ? dados.emails[0] : null;
    const inscricoes = Array.isArray(dados.registrations)
        ? dados.registrations.map(item => ({
            numero: item.number,
            ativo: item.enabled !== false && item.status?.text !== 'Baixada'
        }))
        : [];

    return {
        razao_social: dados.company?.name || '',
        nome_fantasia: dados.alias || '',
        descricao_situacao_cadastral: dados.status?.text || '',
        logradouro: endereco.street || '',
        numero: endereco.number || '',
        complemento: endereco.details || '',
        bairro: endereco.district || '',
        municipio: endereco.city || '',
        uf: endereco.state || '',
        cep: endereco.zip || '',
        ddd_telefone_1: telefone ? `${telefone.area || ''}${telefone.number || ''}` : '',
        email: email?.address || '',
        inscricoes_estaduais: inscricoes
    };
}

async function requisitarCnpj(url, normalizador = dados => dados) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
        const resposta = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
        const dados = await resposta.json().catch(() => ({}));
        if (!resposta.ok) {
            const erro = new Error(dados.message || 'CNPJ não encontrado.');
            erro.status = resposta.status;
            throw erro;
        }
        return normalizador(dados);
    } finally {
        window.clearTimeout(timeout);
    }
}

async function buscarCnpj(cnpj) {
    if (cnpjCache.has(cnpj)) return cnpjCache.get(cnpj);
    if (consultasEmAndamento.has(cnpj)) return consultasEmAndamento.get(cnpj);

    const consulta = (async () => {
        try {
            let dados;
            try {
                dados = await requisitarCnpj(`${CNPJ_ENDPOINT}/${cnpj}`);
            } catch (erroPrincipal) {
                if (erroPrincipal.status === 400) throw erroPrincipal;
                dados = await requisitarCnpj(
                    `${CNPJ_FALLBACK_ENDPOINT}/${cnpj}`,
                    normalizarDadosCnpja
                );
            }
            cnpjCache.set(cnpj, dados);
            return dados;
        } finally {
            consultasEmAndamento.delete(cnpj);
        }
    })();

    consultasEmAndamento.set(cnpj, consulta);
    return consulta;
}

async function consultarEPreencher(input) {
    const cnpj = somenteDigitos(input.value);
    if (cnpj.length !== 14) return;

    if (!validarCnpj(cnpj)) {
        mostrarStatus(input, 'CNPJ inválido. Confira os números informados.', 'error');
        return;
    }

    if (input.dataset.cnpjConsultado === cnpj) return;
    mostrarStatus(input, 'Consultando dados públicos do CNPJ...', 'loading');

    try {
        const dados = await buscarCnpj(cnpj);
        if (somenteDigitos(input.value) !== cnpj) return;

        preencherDados(input, dados);
        input.value = formatarCpfCnpj(cnpj);
        input.dataset.cnpjConsultado = cnpj;

        const situacao = String(dados.descricao_situacao_cadastral || '').toUpperCase();
        const nome = dados.razao_social || dados.nome_fantasia || 'Empresa localizada';
        const avisoSituacao = situacao && situacao !== 'ATIVA' ? ` Situação: ${situacao}.` : '';
        mostrarStatus(input, `Dados encontrados: ${nome}.${avisoSituacao}`, situacao && situacao !== 'ATIVA' ? 'warning' : 'success');
    } catch (error) {
        const mensagem = error.name === 'AbortError'
            ? 'A consulta demorou demais. Você pode preencher manualmente ou tentar novamente.'
            : (error.status === 404 ? 'CNPJ não encontrado na base pública.' : 'Não foi possível consultar agora. O preenchimento manual continua disponível.');
        mostrarStatus(input, mensagem, 'error');
        console.warn('Falha na consulta automática de CNPJ:', error);
    }
}

function prepararCampo(input) {
    if (!input || input.dataset.cnpjAutofillReady === 'true') return;
    input.dataset.cnpjAutofillReady = 'true';
    input.maxLength = 18;

    input.addEventListener('input', () => {
        input.value = formatarCpfCnpj(input.value);
        input.dataset.cnpjConsultado = '';
        window.clearTimeout(temporizadores.get(input));

        const tamanho = somenteDigitos(input.value).length;
        if (tamanho !== 14) {
            mostrarStatus(input);
            return;
        }

        temporizadores.set(input, window.setTimeout(() => consultarEPreencher(input), 450));
    });

    input.addEventListener('blur', () => {
        window.clearTimeout(temporizadores.get(input));
        consultarEPreencher(input);
    });
}

function iniciarCnpjAutofill(raiz = document) {
    raiz.querySelectorAll?.(CNPJ_SELECTOR).forEach(prepararCampo);
    if (raiz.matches?.(CNPJ_SELECTOR)) prepararCampo(raiz);
}

iniciarCnpjAutofill();

const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node instanceof Element) iniciarCnpjAutofill(node);
    }));
});
observer.observe(document.body, { childList: true, subtree: true });

window.CNPJAutofill = {
    consultar: id => {
        const input = document.getElementById(id);
        return input ? consultarEPreencher(input) : Promise.resolve();
    },
    formatar: formatarCpfCnpj,
    validar: validarCnpj
};
