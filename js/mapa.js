import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from './firebase-init.js';

const MAPA_KEY = 'orquestra_mapa_matos';
const MAPA_COLLECTION = 'mapa_matos';
const MAPA_DB_NAME = 'orquestra_mapa_arquivos';
const MAPA_STORE = 'contratos';

let mapaMatos = [];
let mapaContratoTemp = null;

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
    document.getElementById('mapaObservacoes').value = item.observacoes || '';
    const contrato = document.getElementById('mapaContratoNome');
    if (contrato) {
        contrato.textContent = item.contratoNome || 'Nenhum contrato anexado';
        contrato.dataset.nome = item.contratoNome || '';
    }
    mapaContratoTemp = null;
    atualizarPreviewMapa();
}

function queryMapa(item = getFormData()) {
    if (item.latitude !== null && item.longitude !== null) return `${item.latitude},${item.longitude}`;
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
        FINALIZADO: 'Finalizado'
    }[status] || status || 'Em analise';
}

async function carregarMapaMatos() {
    mapaMatos = lerLocal();
    renderMapaMatos();

    try {
        const snap = await getDocs(query(collection(db, MAPA_COLLECTION), orderBy('atualizadoEm', 'desc')));
        const nuvem = snap.docs.map(d => {
            const data = d.data() || {};
            return { ...data, id: data.id || d.id, cloudId: d.id };
        });
        if (nuvem.length) {
            mapaMatos = nuvem;
            salvarLocal();
            renderMapaMatos();
        }
    } catch (error) {
        console.warn('Mapa: usando dados locais. Nuvem indisponivel:', error);
    }
}

async function salvarMapaMato(event) {
    event?.preventDefault();
    const data = getFormData();
    if (!data.nome || !data.proprietario || !data.endereco) {
        alert('Preencha nome do mato, dono/proprietario e endereco/referencia.');
        return;
    }

    const index = mapaMatos.findIndex(item => item.id === data.id);
    const original = index >= 0 ? mapaMatos[index] : null;
    const payload = {
        ...original,
        ...data,
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
            await updateDoc(doc(db, MAPA_COLLECTION, docId), payload);
            payload.cloudId = docId;
        } else {
            const ref = await addDoc(collection(db, MAPA_COLLECTION), payload);
            payload.cloudId = ref.id;
            const localIndex = mapaMatos.findIndex(item => item.id === data.id);
            if (localIndex >= 0) mapaMatos[localIndex] = payload;
            salvarLocal();
        }
    } catch (error) {
        console.warn('Mapa salvo localmente, mas nao sincronizou com a nuvem:', error);
    }

    limparMapaMato();
    renderMapaMatos();
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

    lista.innerHTML = filtrados.length ? filtrados.map(item => `
        <article class="mapa-mato-card" data-status="${escapeHtml(item.status || 'EM_ANALISE')}">
            <div class="mapa-mato-top">
                <span class="mapa-status">${escapeHtml(statusLabel(item.status))}</span>
                <strong>${escapeHtml(item.nome || '-')}</strong>
            </div>
            <div class="mapa-mato-info">
                <span><i class="fa-solid fa-user"></i> ${escapeHtml(item.proprietario || '-')}</span>
                <span><i class="fa-solid fa-phone"></i> ${escapeHtml(item.telefone || '-')}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.endereco || '-')}</span>
                <span><i class="fa-solid fa-ruler-combined"></i> ${escapeHtml(formatarArea(item))}</span>
                <span><i class="fa-solid fa-route"></i> ${escapeHtml(item.distanciaKm ? `${Number(item.distanciaKm).toLocaleString('pt-BR')} km` : 'Distancia nao informada')}</span>
                <span><i class="fa-solid fa-cubes-stacked"></i> ${escapeHtml(item.volumeEstimado ? `${Number(item.volumeEstimado).toLocaleString('pt-BR')} estimado` : 'Volume nao informado')}</span>
            </div>
            ${item.observacoes ? `<p>${escapeHtml(item.observacoes)}</p>` : ''}
            <div class="mapa-mato-actions">
                <button type="button" class="btn-secondary" onclick="window.editarMapaMato('${escapeHtml(item.id)}')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
                <button type="button" class="btn-secondary" onclick="window.abrirMapaMato('${escapeHtml(item.id)}', 'maps')"><i class="fa-solid fa-map-location-dot"></i> Maps</button>
                <button type="button" class="btn-secondary" onclick="window.abrirMapaMato('${escapeHtml(item.id)}', 'earth')"><i class="fa-solid fa-earth-americas"></i> Earth</button>
                <button type="button" class="btn-secondary" onclick="window.abrirContratoMapa('${escapeHtml(item.id)}')" ${item.contratoNome ? '' : 'disabled'}><i class="fa-solid fa-file-contract"></i> Contrato</button>
                <button type="button" class="btn-danger" onclick="window.excluirMapaMato('${escapeHtml(item.id)}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </article>
    `).join('') : '<div class="mapa-empty">Nenhum mato cadastrado ainda.</div>';
}

function atualizarPreviewMapa() {
    const frame = document.getElementById('mapaPreviewFrame');
    const empty = document.getElementById('mapaPreviewEmpty');
    if (!frame) return;
    const url = embedUrl(getFormData());
    if (url) {
        frame.src = url;
        frame.style.display = 'block';
        if (empty) empty.style.display = 'none';
    } else {
        frame.removeAttribute('src');
        frame.style.display = 'none';
        if (empty) empty.style.display = 'grid';
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
    mapaMatos = mapaMatos.filter(mato => mato.id !== id);
    salvarLocal();
    renderMapaMatos();
    try {
        if (item?.cloudId || !String(id).startsWith('mato_')) await deleteDoc(doc(db, MAPA_COLLECTION, item?.cloudId || id));
    } catch (error) {
        console.warn('Nao foi possivel excluir na nuvem agora:', error);
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
}

window.renderMapaMatos = renderMapaMatos;
window.limparMapaMato = limparMapaMato;
window.editarMapaMato = editarMapaMato;
window.excluirMapaMato = excluirMapaMato;
window.abrirMapaMato = abrirMapaMato;
window.abrirMapaAtual = abrirMapaAtual;
window.abrirContratoMapa = abrirContratoMapa;

document.addEventListener('DOMContentLoaded', () => {
    bindMapa();
    carregarMapaMatos();
    atualizarPreviewMapa();
});
