import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from './firebase-init.js';

const MAPA_KEY = 'orquestra_mapa_matos';
const MAPA_COLLECTION = 'mapa_matos';
const MAPA_DB_NAME = 'orquestra_mapa_arquivos';
const MAPA_STORE = 'contratos';

let mapaMatos = [];
let mapaEntradas = [];
let mapaContratoTemp = null;
let minhaLocalizacao = null;
let localizacaoSolicitada = false;

function uid() {
    return `mato_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizarTexto(valor = '') {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeHtml(valor = '') {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function moedaNumero(valor) {
    const n = Number(String(valor ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
}

function coordenadasValidas(item) {
    if (!item || typeof item !== 'object') return false;
    if (item.latitude === '' || item.latitude === null || item.latitude === undefined) return false;
    if (item.longitude === '' || item.longitude === null || item.longitude === undefined) return false;
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    return Number.isFinite(latitude)
        && Number.isFinite(longitude)
        && latitude >= -90
        && latitude <= 90
        && longitude >= -180
        && longitude <= 180;
}

function calcularDistanciaKm(origem, destino) {
    if (!coordenadasValidas(origem) || !coordenadasValidas(destino)) return null;
    const raioTerraKm = 6371;
    const paraRadiano = valor => Number(valor) * Math.PI / 180;
    const dLat = paraRadiano(Number(destino.latitude) - Number(origem.latitude));
    const dLon = paraRadiano(Number(destino.longitude) - Number(origem.longitude));
    const lat1 = paraRadiano(origem.latitude);
    const lat2 = paraRadiano(destino.latitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return raioTerraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatarDistancia(valor) {
    if (!Number.isFinite(valor)) return '';
    return valor < 10
        ? `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
        : `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`;
}

function formatarNumero(valor, casas = 2) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function areaEmHectares(item = {}) {
    const valor = Number(item.areaValor || 0);
    if (!valor) return null;
    const fatores = {
        hectares: 1,
        alqueire_paulista: 2.42,
        alqueire_mineiro: 4.84,
        m2: 0.0001,
        km2: 100
    };
    const fator = fatores[item.areaUnidade];
    return fator ? valor * fator : null;
}

function resumoConversaoArea(item = {}) {
    const hectares = areaEmHectares(item);
    if (!Number.isFinite(hectares)) return 'Esta unidade nao possui conversao automatica de area.';
    return `${formatarNumero(hectares)} ha | ${formatarNumero(hectares / 2.42)} alq. paulista | ${formatarNumero(hectares / 4.84)} alq. mineiro`;
}

function entradaPertenceAoMato(entrada = {}, mato = {}) {
    if (entrada.mapaMatoId && mato.id) return String(entrada.mapaMatoId) === String(mato.id);
    return normalizarTexto(entrada.mato || entrada.mapaMatoNome) === normalizarTexto(mato.nome);
}

function indicadoresDoMato(mato = {}) {
    const entradas = mapaEntradas.filter(item => entradaPertenceAoMato(item, mato));
    const volumeExtraido = entradas.reduce((total, item) => total + Number(item.volume || 0), 0);
    const custoExtracao = entradas.reduce((total, item) => total + Number(item.totalEmpreiteiro || 0), 0);
    const estimado = Number(mato.volumeEstimado || 0);
    const saldoEstimado = estimado > 0 ? Math.max(0, estimado - volumeExtraido) : null;
    return { cargas: entradas.length, volumeExtraido, custoExtracao, saldoEstimado };
}

function atualizarConversaoArea() {
    const painel = document.getElementById('mapaConversaoArea');
    if (!painel) return;
    const item = getFormData();
    painel.innerHTML = item.areaValor
        ? `<i class="fa-solid fa-ruler-combined"></i><span>${escapeHtml(resumoConversaoArea(item))}</span>`
        : '<span>Informe a medida para visualizar as conversoes de area.</span>';
}

function atualizarStatusMinhaLocalizacao(estado = 'idle', texto = '') {
    const painel = document.getElementById('mapaMinhaLocalizacao');
    const label = document.getElementById('mapaMinhaLocalizacaoTexto');
    if (painel) painel.dataset.state = estado;
    if (label && texto) label.textContent = texto;
}

function obterMinhaLocalizacao(opcoes = {}) {
    const silencioso = Boolean(opcoes.silencioso);
    if (minhaLocalizacao) return Promise.resolve(minhaLocalizacao);
    if (!navigator.geolocation) {
        atualizarStatusMinhaLocalizacao('error', 'Localizacao nao disponivel neste aparelho.');
        if (!silencioso) alert('Este navegador nao oferece acesso a localizacao.');
        return Promise.resolve(null);
    }

    localizacaoSolicitada = true;
    atualizarStatusMinhaLocalizacao('loading', 'Obtendo sua localizacao com seguranca...');
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(position => {
            minhaLocalizacao = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                precisaoMetros: Math.round(position.coords.accuracy || 0)
            };
            const precisao = minhaLocalizacao.precisaoMetros ? `Precisao aproximada: ${minhaLocalizacao.precisaoMetros} m.` : 'Localizacao pronta.';
            atualizarStatusMinhaLocalizacao('ready', precisao);
            atualizarPreviewMapa();
            renderMapaMatos();
            resolve(minhaLocalizacao);
        }, error => {
            const negado = error?.code === 1;
            atualizarStatusMinhaLocalizacao('error', negado
                ? 'Permissao negada. Voce ainda pode usar endereco ou coordenadas.'
                : 'Nao foi possivel obter sua localizacao agora.');
            if (!silencioso && !negado) alert('Nao foi possivel obter sua localizacao. Verifique o GPS e tente novamente.');
            resolve(null);
        }, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 300000
        });
    });
}

function salvarLocal() {
    try {
        localStorage.setItem(MAPA_KEY, JSON.stringify(mapaMatos));
    } catch (error) {
        console.warn('Nao foi possivel salvar mapa localmente:', error);
    }
}

function lerLocal() {
    try {
        return JSON.parse(localStorage.getItem(MAPA_KEY) || '[]');
    } catch {
        return [];
    }
}

function abrirDbArquivos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(MAPA_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const dbLocal = request.result;
            if (!dbLocal.objectStoreNames.contains(MAPA_STORE)) dbLocal.createObjectStore(MAPA_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function salvarContratoLocal(id, file) {
    if (!file) return null;
    const dbLocal = await abrirDbArquivos();
    return new Promise((resolve, reject) => {
        const tx = dbLocal.transaction(MAPA_STORE, 'readwrite');
        tx.objectStore(MAPA_STORE).put({
            name: file.name,
            type: file.type || 'application/octet-stream',
            blob: file,
            updatedAt: new Date().toISOString()
        }, id);
        tx.oncomplete = () => {
            dbLocal.close();
            resolve({ nome: file.name, tipo: file.type || 'arquivo' });
        };
        tx.onerror = () => {
            dbLocal.close();
            reject(tx.error);
        };
    });
}

async function abrirContratoLocal(id) {
    const dbLocal = await abrirDbArquivos();
    return new Promise((resolve, reject) => {
        const tx = dbLocal.transaction(MAPA_STORE, 'readonly');
        const request = tx.objectStore(MAPA_STORE).get(id);
        request.onsuccess = () => {
            dbLocal.close();
            const arquivo = request.result;
            if (!arquivo?.blob) {
                resolve(false);
                return;
            }
            const url = URL.createObjectURL(arquivo.blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            resolve(true);
        };
        request.onerror = () => {
            dbLocal.close();
            reject(request.error);
        };
    });
}

function getFormData() {
    const id = document.getElementById('mapaMatoId')?.value || uid();
    const areaValor = moedaNumero(document.getElementById('mapaAreaValor')?.value);
    const volumeEstimado = moedaNumero(document.getElementById('mapaVolumeEstimado')?.value);
    const distanciaKm = moedaNumero(document.getElementById('mapaDistanciaKm')?.value);
    const custoKm = moedaNumero(document.getElementById('mapaCustoKm')?.value);
    const latitudeValue = document.getElementById('mapaLatitude')?.value;
    const longitudeValue = document.getElementById('mapaLongitude')?.value;
    const latitude = latitudeValue === '' ? null : Number(latitudeValue);
    const longitude = longitudeValue === '' ? null : Number(longitudeValue);

    return {
        id,
        nome: document.getElementById('mapaNomeMato')?.value.trim() || '',
        status: document.getElementById('mapaStatus')?.value || 'EM_ANALISE',
        proprietario: document.getElementById('mapaProprietario')?.value.trim() || '',
        telefone: document.getElementById('mapaTelefone')?.value.trim() || '',
        email: document.getElementById('mapaEmail')?.value.trim() || '',
        endereco: document.getElementById('mapaEndereco')?.value.trim() || '',
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        areaValor,
        areaUnidade: document.getElementById('mapaAreaUnidade')?.value || 'hectares',
        volumeEstimado,
        distanciaKm,
        custoKm,
        observacoes: document.getElementById('mapaObservacoes')?.value.trim() || '',
        contratoNome: mapaContratoTemp?.name || document.getElementById('mapaContratoNome')?.dataset.nome || '',
        atualizadoEm: new Date().toISOString()
    };
}

function preencherForm(item = {}) {
    document.getElementById('mapaMatoId').value = item.id || '';
    document.getElementById('mapaNomeMato').value = item.nome || '';
    document.getElementById('mapaStatus').value = item.status || 'EM_ANALISE';
    document.getElementById('mapaProprietario').value = item.proprietario || '';
    document.getElementById('mapaTelefone').value = item.telefone || '';
    document.getElementById('mapaEmail').value = item.email || '';
    document.getElementById('mapaEndereco').value = item.endereco || '';
    document.getElementById('mapaLatitude').value = item.latitude ?? '';
    document.getElementById('mapaLongitude').value = item.longitude ?? '';
    document.getElementById('mapaAreaValor').value = item.areaValor || '';
    document.getElementById('mapaAreaUnidade').value = item.areaUnidade || 'hectares';
    document.getElementById('mapaVolumeEstimado').value = item.volumeEstimado || '';
    document.getElementById('mapaDistanciaKm').value = item.distanciaKm || '';
    document.getElementById('mapaCustoKm').value = item.custoKm || '';
    document.getElementById('mapaObservacoes').value = item.observacoes || '';
    const contrato = document.getElementById('mapaContratoNome');
    if (contrato) {
        contrato.textContent = item.contratoNome || 'Nenhum contrato anexado';
        contrato.dataset.nome = item.contratoNome || '';
    }
    mapaContratoTemp = null;
    atualizarConversaoArea();
    atualizarPreviewMapa();
}

function queryMapa(item = getFormData()) {
    if (coordenadasValidas(item)) return `${item.latitude},${item.longitude}`;
    return item.endereco || item.nome || '';
}

function mapsUrl(item) {
    const q = encodeURIComponent(queryMapa(item));
    return q ? `https://www.google.com/maps/search/?api=1&query=${q}` : '';
}

function earthUrl(item) {
    const q = encodeURIComponent(queryMapa(item));
    return q ? `https://earth.google.com/web/search/${q}` : '';
}

function embedUrl(item) {
    const q = encodeURIComponent(queryMapa(item));
    return q ? `https://www.google.com/maps?q=${q}&output=embed` : '';
}

function rotaUrl(item, origem = minhaLocalizacao) {
    const destino = queryMapa(item);
    if (!destino || !coordenadasValidas(origem)) return '';
    const pontoPartida = `${origem.latitude},${origem.longitude}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pontoPartida)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;
}

function formatarArea(item) {
    if (!item.areaValor) return 'Sem medida cadastrada';
    const unidade = {
        hectares: 'ha',
        alqueire_paulista: 'alq. paulista',
        alqueire_mineiro: 'alq. mineiro',
        m2: 'm2',
        km2: 'km2',
        km: 'km',
        pe: 'pe',
        outro: 'outro'
    }[item.areaUnidade] || item.areaUnidade;
    return `${Number(item.areaValor).toLocaleString('pt-BR')} ${unidade}`;
}

function statusLabel(status) {
    return {
        EM_ANALISE: 'Em analise',
        NEGOCIANDO: 'Negociando',
        CONTRATADO: 'Contratado',
        EM_CORTE: 'Em corte',
        FINALIZADO: 'Finalizado'
    }[status] || status || 'Em analise';
}

function distanciaDaLocalizacaoAtual(item) {
    const distancia = calcularDistanciaKm(minhaLocalizacao, item);
    return Number.isFinite(distancia) ? formatarDistancia(distancia) : '';
}

async function carregarMapaMatos() {
    mapaMatos = lerLocal().map(item => ({ ...item, sincronizado: item.sincronizado === true }));
    renderMapaMatos();

    try {
        const snap = await getDocs(collection(db, MAPA_COLLECTION));
        const nuvem = snap.docs.map(d => {
            const data = d.data() || {};
            return { ...data, id: data.id || d.id, cloudId: d.id, sincronizado: true };
        }).sort((a, b) => String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')));
        if (nuvem.length) {
            mapaMatos = nuvem;
            salvarLocal();
            renderMapaMatos();
        }
    } catch (error) {
        console.warn('Mapa: usando dados locais. Nuvem indisponivel:', error);
    }

    try {
        mapaEntradas = window.FS?.getCollection
            ? await window.FS.getCollection('entradas')
            : (await getDocs(collection(db, 'entradas'))).docs.map(item => ({ id: item.id, ...item.data() }));
    } catch (error) {
        mapaEntradas = [];
        console.warn('Mapa: nao foi possivel carregar os indicadores das entradas.', error);
    }
    renderMapaMatos();
}

async function salvarMapaMato(event) {
    event?.preventDefault();
    const data = getFormData();
    if (!data.nome || !data.proprietario || (!data.endereco && !coordenadasValidas(data))) {
        alert('Preencha nome do mato, dono/proprietario e informe o endereco ou as coordenadas.');
        return;
    }

    const index = mapaMatos.findIndex(item => item.id === data.id);
    const original = index >= 0 ? mapaMatos[index] : null;
    const payload = {
        ...original,
        ...data,
        sincronizado: false,
        criadoEm: original?.criadoEm || new Date().toISOString()
    };

    try {
        if (mapaContratoTemp) {
            const contrato = await salvarContratoLocal(payload.id, mapaContratoTemp);
            payload.contratoNome = contrato?.nome || payload.contratoNome;
        }
    } catch (error) {
        console.warn('Contrato nao foi salvo localmente:', error);
        alert('Mato salvo, mas nao foi possivel guardar o contrato localmente.');
    }

    if (index >= 0) mapaMatos[index] = payload;
    else mapaMatos.unshift(payload);
    salvarLocal();
    renderMapaMatos();

    try {
        if (original?.cloudId || !String(payload.id).startsWith('mato_')) {
            const docId = original?.cloudId || payload.id;
            if (window.FS?.updateDoc) await window.FS.updateDoc(MAPA_COLLECTION, docId, payload);
            else await updateDoc(doc(db, MAPA_COLLECTION, docId), payload);
            payload.cloudId = docId;
        } else {
            const refId = window.FS?.setDoc
                ? (await window.FS.setDoc(MAPA_COLLECTION, payload.id, payload), payload.id)
                : (await addDoc(collection(db, MAPA_COLLECTION), payload)).id;
            payload.cloudId = refId;
            const localIndex = mapaMatos.findIndex(item => item.id === data.id);
            if (localIndex >= 0) mapaMatos[localIndex] = payload;
            salvarLocal();
        }
        payload.sincronizado = true;
        salvarLocal();
        renderMapaMatos();
    } catch (error) {
        console.warn('Mapa salvo localmente, mas nao sincronizou com a nuvem:', error);
        alert('O mato foi guardado neste computador, mas ainda nao sincronizou com a nuvem. Verifique a internet e sua permissao de edicao no Mapa.');
    }

    limparMapaMato();
    renderMapaMatos();
    document.dispatchEvent(new CustomEvent('mapa:updated'));
}

function renderResumoOperacional() {
    const painel = document.getElementById('mapaResumoOperacional');
    if (!painel) return;
    const ativos = mapaMatos.filter(item => !['FINALIZADO'].includes(item.status)).length;
    const emCorte = mapaMatos.filter(item => item.status === 'EM_CORTE').length;
    const entradasVinculadas = mapaEntradas.filter(entrada => mapaMatos.some(mato => entradaPertenceAoMato(entrada, mato)));
    const volumeExtraido = entradasVinculadas.reduce((total, item) => total + Number(item.volume || 0), 0);
    const custoExtracao = entradasVinculadas.reduce((total, item) => total + Number(item.totalEmpreiteiro || 0), 0);
    const volumeEstimado = mapaMatos.reduce((total, item) => total + Number(item.volumeEstimado || 0), 0);
    const saldoEstimado = Math.max(0, volumeEstimado - volumeExtraido);
    painel.innerHTML = `
        <article><i class="fa-solid fa-map-location-dot"></i><span><strong>${ativos}</strong><small>Matos ativos</small></span></article>
        <article><i class="fa-solid fa-tree"></i><span><strong>${emCorte}</strong><small>Em corte</small></span></article>
        <article><i class="fa-solid fa-truck-ramp-box"></i><span><strong>${entradasVinculadas.length}</strong><small>Cargas vinculadas</small></span></article>
        <article><i class="fa-solid fa-cubes-stacked"></i><span><strong>${formatarNumero(volumeExtraido)} m³</strong><small>Volume extraido</small></span></article>
        <article><i class="fa-solid fa-chart-line"></i><span><strong>${formatarNumero(saldoEstimado)} m³</strong><small>Saldo estimado</small></span></article>
        <article><i class="fa-solid fa-coins"></i><span><strong>${formatarMoeda(custoExtracao)}</strong><small>Custo de extracao</small></span></article>
    `;
}

function renderMapaMatos() {
    const lista = document.getElementById('mapaMatosLista');
    const resumo = document.getElementById('mapaResumoLista');
    if (!lista) return;

    const busca = normalizarTexto(document.getElementById('mapaBusca')?.value || '');
    const status = document.getElementById('mapaFiltroStatus')?.value || 'TODOS';
    const filtrados = mapaMatos
        .filter(item => status === 'TODOS' || item.status === status)
        .filter(item => {
            const texto = normalizarTexto(`${item.nome} ${item.proprietario} ${item.endereco} ${item.telefone}`);
            return !busca || texto.includes(busca);
        })
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

    if (resumo) resumo.textContent = `${filtrados.length} local(is) cadastrado(s).`;
    renderResumoOperacional();

    lista.innerHTML = filtrados.length ? filtrados.map(item => {
        const indicadores = indicadoresDoMato(item);
        const custoRota = Number(item.distanciaKm || 0) * Number(item.custoKm || 0);
        return `
        <article class="mapa-mato-card" data-status="${escapeHtml(item.status || 'EM_ANALISE')}">
            <div class="mapa-mato-top">
                <span class="mapa-status">${escapeHtml(statusLabel(item.status))}</span>
                <strong>${escapeHtml(item.nome || '-')}</strong>
                <span class="mapa-sync-state ${item.sincronizado === false ? 'is-local' : 'is-cloud'}" title="${item.sincronizado === false ? 'Salvo somente neste computador' : 'Sincronizado com a nuvem'}">
                    <i class="fa-solid ${item.sincronizado === false ? 'fa-cloud-arrow-up' : 'fa-cloud'}"></i>
                </span>
            </div>
            <div class="mapa-mato-info">
                <span><i class="fa-solid fa-user"></i> ${escapeHtml(item.proprietario || '-')}</span>
                <span><i class="fa-solid fa-phone"></i> ${escapeHtml(item.telefone || '-')}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.endereco || '-')}</span>
                <span><i class="fa-solid fa-ruler-combined"></i> ${escapeHtml(formatarArea(item))}</span>
                <span><i class="fa-solid fa-arrows-left-right"></i> ${escapeHtml(resumoConversaoArea(item))}</span>
                <span><i class="fa-solid fa-route"></i> ${escapeHtml(item.distanciaKm ? `${Number(item.distanciaKm).toLocaleString('pt-BR')} km` : 'Distancia nao informada')}</span>
                ${distanciaDaLocalizacaoAtual(item) ? `<span class="mapa-live-distance"><i class="fa-solid fa-location-arrow"></i> ${escapeHtml(distanciaDaLocalizacaoAtual(item))} da sua localizacao</span>` : ''}
                <span><i class="fa-solid fa-cubes-stacked"></i> ${escapeHtml(item.volumeEstimado ? `${Number(item.volumeEstimado).toLocaleString('pt-BR')} estimado` : 'Volume nao informado')}</span>
                ${custoRota > 0 ? `<span><i class="fa-solid fa-road"></i> ${escapeHtml(formatarMoeda(custoRota))} por trajeto estimado</span>` : ''}
            </div>
            <div class="mapa-mato-operational">
                <span><strong>${indicadores.cargas}</strong><small>Cargas</small></span>
                <span><strong>${formatarNumero(indicadores.volumeExtraido)} m³</strong><small>Extraido</small></span>
                <span><strong>${indicadores.saldoEstimado === null ? '-' : `${formatarNumero(indicadores.saldoEstimado)} m³`}</strong><small>Saldo estimado</small></span>
                <span><strong>${formatarMoeda(indicadores.custoExtracao)}</strong><small>Custo extracao</small></span>
            </div>
            ${item.observacoes ? `<p>${escapeHtml(item.observacoes)}</p>` : ''}
            <div class="mapa-mato-actions">
                <button type="button" class="btn-secondary" onclick="window.editarMapaMato('${escapeHtml(item.id)}')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
                <button type="button" class="btn-secondary" onclick="window.abrirMapaMato('${escapeHtml(item.id)}', 'maps')"><i class="fa-solid fa-map-location-dot"></i> Maps</button>
                <button type="button" class="btn-secondary" onclick="window.abrirMapaMato('${escapeHtml(item.id)}', 'earth')"><i class="fa-solid fa-earth-americas"></i> Earth</button>
                <button type="button" class="btn-primary" onclick="window.abrirRotaMapaMato('${escapeHtml(item.id)}')"><i class="fa-solid fa-route"></i> Rota</button>
                <button type="button" class="btn-secondary" onclick="window.abrirContratoMapa('${escapeHtml(item.id)}')" ${item.contratoNome ? '' : 'disabled'}><i class="fa-solid fa-file-contract"></i> Contrato</button>
                <button type="button" class="btn-danger" onclick="window.excluirMapaMato('${escapeHtml(item.id)}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </article>`;
    }).join('') : '<div class="mapa-empty">Nenhum mato cadastrado ainda.</div>';
}

function atualizarPreviewMapa() {
    const frame = document.getElementById('mapaPreviewFrame');
    const empty = document.getElementById('mapaPreviewEmpty');
    const resumoDistancia = document.getElementById('mapaDistanciaAtual');
    if (!frame) return;
    const destino = getFormData();
    const temDestino = Boolean(queryMapa(destino));
    const pontoExibido = temDestino ? destino : minhaLocalizacao;
    const url = pontoExibido ? embedUrl(pontoExibido) : '';
    if (url) {
        frame.src = url;
        frame.style.display = 'block';
        if (empty) empty.style.display = 'none';
    } else {
        frame.removeAttribute('src');
        frame.style.display = 'none';
        if (empty) empty.style.display = 'grid';
    }

    const distancia = temDestino ? calcularDistanciaKm(minhaLocalizacao, destino) : null;
    if (resumoDistancia) {
        if (Number.isFinite(distancia)) {
            resumoDistancia.hidden = false;
            resumoDistancia.innerHTML = `<i class="fa-solid fa-route"></i><span><strong>${escapeHtml(formatarDistancia(distancia))}</strong> em linha reta a partir da sua localizacao. Use Traçar rota para ver o caminho por estrada.</span>`;
        } else if (!temDestino && minhaLocalizacao) {
            resumoDistancia.hidden = false;
            resumoDistancia.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>O mapa esta usando sua localizacao atual como ponto de partida.</span>';
        } else {
            resumoDistancia.hidden = true;
            resumoDistancia.textContent = '';
        }
    }
}

function limparMapaMato() {
    document.getElementById('formMapaMato')?.reset();
    document.getElementById('mapaMatoId').value = '';
    const contrato = document.getElementById('mapaContratoNome');
    if (contrato) {
        contrato.textContent = 'Nenhum contrato anexado';
        contrato.dataset.nome = '';
    }
    mapaContratoTemp = null;
    atualizarConversaoArea();
    atualizarPreviewMapa();
}

function editarMapaMato(id) {
    const item = mapaMatos.find(mato => mato.id === id);
    if (!item) return;
    preencherForm(item);
    document.getElementById('view-mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function excluirMapaMato(id) {
    const podeExcluir = window.confirmarExclusaoComSenha
        ? await window.confirmarExclusaoComSenha('Excluir este mato cadastrado?')
        : confirm('Excluir este mato cadastrado?');
    if (!podeExcluir) return;
    const item = mapaMatos.find(mato => mato.id === id);
    try {
        if (item?.cloudId || !String(id).startsWith('mato_')) {
            const docId = item?.cloudId || id;
            if (window.FS?.deleteDoc) await window.FS.deleteDoc(MAPA_COLLECTION, docId);
            else await deleteDoc(doc(db, MAPA_COLLECTION, docId));
        }
        mapaMatos = mapaMatos.filter(mato => mato.id !== id);
        salvarLocal();
        renderMapaMatos();
        document.dispatchEvent(new CustomEvent('mapa:updated'));
    } catch (error) {
        console.warn('Nao foi possivel excluir na nuvem agora:', error);
        alert('Nao foi possivel excluir na nuvem. O cadastro foi mantido para evitar divergencia.');
    }
}

function abrirMapaMato(id, tipo = 'maps') {
    const item = mapaMatos.find(mato => mato.id === id);
    if (!item) return;
    const url = tipo === 'earth' ? earthUrl(item) : mapsUrl(item);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function abrirMapaAtual(tipo = 'maps') {
    const data = getFormData();
    const url = tipo === 'earth' ? earthUrl(data) : mapsUrl(data);
    if (!url) {
        alert('Informe endereco ou coordenadas para abrir o mapa.');
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

async function abrirRotaComItem(item) {
    if (!queryMapa(item)) {
        alert('Informe endereco ou coordenadas do mato para tracar a rota.');
        return;
    }

    const janela = window.open('', '_blank');
    const origem = minhaLocalizacao || await obterMinhaLocalizacao();
    const url = rotaUrl(item, origem);
    if (!url) {
        janela?.close();
        alert('Ative a localizacao deste aparelho para usar a rota ate o mato.');
        return;
    }
    if (janela) janela.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
}

function abrirRotaMapaMato(id) {
    const item = mapaMatos.find(mato => mato.id === id);
    if (item) abrirRotaComItem(item);
}

function abrirRotaMapaAtual() {
    abrirRotaComItem(getFormData());
}

async function abrirContratoMapa(id) {
    try {
        const ok = await abrirContratoLocal(id);
        if (!ok) alert('Contrato nao encontrado neste computador. Se ele foi cadastrado em outro navegador, sera preciso anexar novamente.');
    } catch (error) {
        console.warn('Falha ao abrir contrato:', error);
        alert('Nao foi possivel abrir o contrato.');
    }
}

function bindMapa() {
    document.getElementById('formMapaMato')?.addEventListener('submit', salvarMapaMato);
    document.getElementById('mapaContrato')?.addEventListener('change', event => {
        mapaContratoTemp = event.target.files?.[0] || null;
        const label = document.getElementById('mapaContratoNome');
        if (label) label.textContent = mapaContratoTemp?.name || 'Nenhum contrato anexado';
    });
    ['mapaEndereco', 'mapaLatitude', 'mapaLongitude', 'mapaNomeMato'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', atualizarPreviewMapa);
    });
    ['mapaAreaValor', 'mapaAreaUnidade'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', atualizarConversaoArea);
        document.getElementById(id)?.addEventListener('change', atualizarConversaoArea);
    });
}

window.renderMapaMatos = renderMapaMatos;
window.limparMapaMato = limparMapaMato;
window.editarMapaMato = editarMapaMato;
window.excluirMapaMato = excluirMapaMato;
window.abrirMapaMato = abrirMapaMato;
window.abrirMapaAtual = abrirMapaAtual;
window.abrirRotaMapaMato = abrirRotaMapaMato;
window.abrirRotaMapaAtual = abrirRotaMapaAtual;
window.obterMinhaLocalizacao = obterMinhaLocalizacao;
window.abrirContratoMapa = abrirContratoMapa;

document.addEventListener('DOMContentLoaded', () => {
    bindMapa();
    carregarMapaMatos();
    atualizarPreviewMapa();
    atualizarConversaoArea();
    document.querySelectorAll('[data-target="view-mapa"]').forEach(link => {
        link.addEventListener('click', () => {
            if (localizacaoSolicitada || minhaLocalizacao) return;
            setTimeout(() => obterMinhaLocalizacao({ silencioso: true }), 250);
        });
    });
    document.addEventListener('app:section-change', event => {
        if (event.detail?.id === 'view-mapa') carregarMapaMatos();
    });
});
