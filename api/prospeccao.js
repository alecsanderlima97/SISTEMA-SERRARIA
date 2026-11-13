// Radar de clientes novos: busca empresas no Google Maps (Places API, Text Search).
// A chave do Google fica so no servidor (GOOGLE_PLACES_API_KEY na Vercel) e so
// usuario logado no sistema pode buscar. Nada e gravado aqui.

const { exigirUsuario } = require('./_firebase-auth');

const CAMPOS = [
    'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
    'places.internationalPhoneNumber', 'places.websiteUri', 'places.location', 'places.rating',
    'places.userRatingCount', 'places.businessStatus', 'places.googleMapsUri', 'places.primaryTypeDisplayName',
    'places.photos', 'nextPageToken'
].join(',');

// limite simples por usuario (protege a cota do Google contra uso exagerado)
const usoPorUsuario = new Map();
const LIMITE_POR_HORA = 120;
function dentroDoLimite(uid) {
    const agora = Date.now();
    const lista = (usoPorUsuario.get(uid) || []).filter(t => agora - t < 3600000);
    if (lista.length >= LIMITE_POR_HORA) return false;
    lista.push(agora);
    usoPorUsuario.set(uid, lista);
    return true;
}

// retangulo em volta do centro (Text Search aceita restricao por retangulo)
function retangulo(lat, lng, raioKm) {
    const dLat = raioKm / 111.32;
    const dLng = raioKm / (111.32 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    return {
        low: { latitude: Math.max(-90, lat - dLat), longitude: Math.max(-180, lng - dLng) },
        high: { latitude: Math.min(90, lat + dLat), longitude: Math.min(180, lng + dLng) }
    };
}

// foto do Google: devolve so o endereco publico da imagem (a chave nao sai do servidor)
async function fotoPlace(chave, nome, largura) {
    const url = `https://places.googleapis.com/v1/${nome}/media?maxWidthPx=${largura}&skipHttpRedirect=true`;
    const r = await fetch(url, { headers: { 'X-Goog-Api-Key': chave } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.photoUri) { const e = new Error(d?.error?.message || `HTTP ${r.status}`); e.status = r.status; throw e; }
    return d.photoUri;
}

// distancia por estrada (Routes API). Se a API nao estiver ativa, devolve null e a tela usa estimativa.
async function rotaKm(chave, o, d) {
    const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': chave, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' },
        body: JSON.stringify({
            origin: { location: { latLng: { latitude: o.lat, longitude: o.lng } } },
            destination: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
            travelMode: 'DRIVE', languageCode: 'pt-BR', units: 'METRIC'
        })
    });
    const j = await r.json().catch(() => ({}));
    const rota = j.routes?.[0];
    if (!r.ok || !rota?.distanceMeters) return null;
    return { km: rota.distanceMeters / 1000, minutos: Math.round(parseInt(String(rota.duration || '0'), 10) / 60) };
}

// dados publicos do CNPJ (Receita Federal via BrasilAPI). Sem dados de socios.
async function consultaCnpj(cnpj) {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { headers: { 'Accept': 'application/json' } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 404) return null;
    if (!r.ok) { const e = new Error('cnpj'); e.status = 502; throw e; }
    return {
        cnpj, razaoSocial: d.razao_social || '', nomeFantasia: d.nome_fantasia || '',
        situacao: d.descricao_situacao_cadastral || '', dataSituacao: d.data_situacao_cadastral || '',
        abertura: d.data_inicio_atividade || '', porte: d.porte || d.descricao_porte || '',
        capitalSocial: Number(d.capital_social || 0), naturezaJuridica: d.natureza_juridica || '',
        cnae: d.cnae_fiscal ? `${d.cnae_fiscal} - ${d.cnae_fiscal_descricao || ''}` : '',
        municipio: d.municipio || '', uf: d.uf || '',
        endereco: [d.descricao_tipo_de_logradouro, d.logradouro, d.numero, d.bairro].filter(Boolean).join(' '),
        cep: d.cep || '', simples: d.opcao_pelo_simples === true, mei: d.opcao_pelo_mei === true
    };
}

async function buscarPlaces(chave, corpo) {
    const resposta = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': chave, 'X-Goog-FieldMask': CAMPOS },
        body: JSON.stringify(corpo)
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
        const msg = dados?.error?.message || `HTTP ${resposta.status}`;
        const erro = new Error(msg);
        erro.status = resposta.status;
        throw erro;
    }
    return dados;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido.' });
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const usuario = await exigirUsuario(req, body);
        if (!usuario) return res.status(401).json({ error: 'Sessao invalida. Entre novamente no sistema.' });

        // CNPJ nao depende da chave do Google
        if (body.modo === 'cnpj') {
            const cnpj = String(body.cnpj || '').replace(/\D/g, '');
            if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ deve ter 14 números.' });
            if (!dentroDoLimite(usuario.uid)) return res.status(429).json({ error: 'Muitas consultas em pouco tempo. Aguarde alguns minutos.' });
            const dados = await consultaCnpj(cnpj);
            if (!dados) return res.status(404).json({ error: 'CNPJ não encontrado na Receita.' });
            return res.status(200).json({ cnpj: dados });
        }

        const chave = process.env.GOOGLE_PLACES_API_KEY;
        if (!chave) return res.status(503).json({ error: 'Busca no Google Maps ainda nao configurada: falta a chave GOOGLE_PLACES_API_KEY na Vercel.', semChave: true });
        if (!dentroDoLimite(usuario.uid)) return res.status(429).json({ error: 'Muitas buscas em pouco tempo. Aguarde alguns minutos.' });

        if (body.modo === 'foto') {
            const nome = String(body.foto || '');
            if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(nome)) return res.status(400).json({ error: 'Foto inválida.' });
            const largura = Math.min(800, Math.max(120, Number(body.largura) || 400));
            return res.status(200).json({ url: await fotoPlace(chave, nome, largura) });
        }
        if (body.modo === 'rota') {
            const o = { lat: Number(body.origem?.lat), lng: Number(body.origem?.lng) };
            const d = { lat: Number(body.destino?.lat), lng: Number(body.destino?.lng) };
            if (![o.lat, o.lng, d.lat, d.lng].every(Number.isFinite)) return res.status(400).json({ error: 'Pontos inválidos.' });
            return res.status(200).json({ rota: await rotaKm(chave, o, d) });
        }

        // modo "local": acha as coordenadas de uma cidade (ponto de partida da busca)
        if (body.modo === 'local') {
            const cidade = String(body.cidade || '').trim().slice(0, 120);
            if (cidade.length < 2) return res.status(400).json({ error: 'Informe a cidade.' });
            const dados = await buscarPlaces(chave, { textQuery: cidade, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 1 });
            const p = dados.places?.[0];
            if (!p?.location) return res.status(404).json({ error: 'Cidade nao encontrada.' });
            return res.status(200).json({ local: { nome: p.formattedAddress || cidade, lat: p.location.latitude, lng: p.location.longitude } });
        }

        const texto = String(body.texto || '').trim().slice(0, 100);
        const lat = Number(body.lat), lng = Number(body.lng);
        const raioKm = Math.min(600, Math.max(5, Number(body.raioKm) || 150));
        if (texto.length < 3) return res.status(400).json({ error: 'Digite o que procurar (ex.: fabrica de paletes).' });
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return res.status(400).json({ error: 'Ponto de partida invalido.' });
        }
        const corpo = {
            textQuery: texto,
            languageCode: 'pt-BR',
            regionCode: 'BR',
            pageSize: 20,
            locationRestriction: { rectangle: retangulo(lat, lng, raioKm) }
        };
        const pageToken = String(body.pageToken || '').slice(0, 2000);
        if (pageToken) corpo.pageToken = pageToken;
        const dados = await buscarPlaces(chave, corpo);
        const empresas = (dados.places || []).map(p => ({
            placeId: p.id,
            nome: p.displayName?.text || '',
            endereco: p.formattedAddress || '',
            telefone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
            site: p.websiteUri || '',
            lat: p.location?.latitude ?? null,
            lng: p.location?.longitude ?? null,
            nota: p.rating ?? null,
            avaliacoes: p.userRatingCount ?? 0,
            situacao: p.businessStatus || '',
            mapsUrl: p.googleMapsUri || '',
            tipo: p.primaryTypeDisplayName?.text || '',
            fotos: (p.photos || []).slice(0, 4).map(f => f.name).filter(Boolean)
        }));
        return res.status(200).json({ empresas, nextPageToken: dados.nextPageToken || '' });
    } catch (error) {
        console.error('prospeccao:', error?.message || error);
        if (error?.message === 'cnpj') return res.status(502).json({ error: 'Consulta de CNPJ indisponível agora. Tente de novo.' });
        const status = error?.status === 403 ? 503 : 500;
        return res.status(status).json({ error: status === 503 ? 'O Google recusou a chave. Confira se a Places API (New) esta ativada e a chave esta correta.' : 'Nao foi possivel buscar agora. Tente de novo.' });
    }
};
