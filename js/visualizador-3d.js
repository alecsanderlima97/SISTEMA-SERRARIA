// Visualizador 3D da Gestao de Madeira: tabua unica, pacote montado e carga no caminhao.
// Somente visualizacao. Usa as regras de pacote de js/montagem-carga.js (window.MontagemCargaCalc).
// Three.js e carregado sob demanda, so quando o visualizador abre.

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

let carregandoThree = null;
function carregarScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Falha ao carregar ' + src));
        document.head.appendChild(s);
    });
}
function garantirThree() {
    if (window.THREE?.OrbitControls) return Promise.resolve();
    if (!carregandoThree) {
        carregandoThree = (window.THREE ? Promise.resolve() : carregarScript(THREE_URL))
            .then(() => (window.THREE.OrbitControls ? null : carregarScript(ORBIT_URL)))
            .catch(err => { carregandoThree = null; throw err; });
    }
    return carregandoThree;
}

const calc = () => window.MontagemCargaCalc;
const fmt = (n, d = 2) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- produto -> pacote ----------
function numeroClasse(v) {
    const t = String(v || '').toUpperCase();
    if (t.includes('3')) return 3;
    if (t.includes('2')) return 2;
    return 1;
}
function produtoParaPacote(p = {}) {
    const esp = Number(p.espessura) || 0;
    const larg = Number(p.largura) || 0;
    const comp = Number(p.comprimentoReal) || Number(p.comprimentoVenda) || 0;
    let cam = Number(p.larguraPacote) || 0;
    let alt = Number(p.alturas) || 0;
    const am = Number(p.amarras) || 0;
    if (!cam && larg) cam = Math.max(1, Math.floor(120 / larg + 0.001));
    if (!alt && cam) alt = Math.max(1, Math.round(((Number(p.pecasPorPacote) || 0) - am) / cam)) || 1;
    const nome = String(p.tipo || '');
    const tipo = /VIGA|TOCO|CAIBRO/i.test(nome) ? 'viga' : (/TABU|RIPA|SARRAFO/i.test(nome) ? 'tabua' : (esp >= 5 ? 'viga' : 'tabua'));
    return { id: p.id || '', classe: numeroClasse(p.classe || p.qualidade), esp, larg, comp, alt, cam, am, tipo, nome: nome || 'Madeira', especie: p.especie || '' };
}

const COR_CLASSE = { 1: 0x16a34a, 2: 0xeab308, 3: 0xdc2626 };

// ---------- montagem das tabuas de um pacote ----------
// Eixos: x = comprimento da tabua, y = altura, z = largura do pacote. Unidade: metro.
// opts.regra = true: desenha as amarras pela regra (para calcular o padrao), ignorando p.am.
// Senao, usa no maximo p.am amarras: primeiro o pezinho, depois as fiadas de amarra, depois o vao do meio.
// Com 0 amarras o pacote fica todo grudado (sem pezinho e sem fiada de amarra).
function tabuasDoPacote(p, origem = { x: 0, y: 0, z: 0 }, opts = {}) {
    const C = calc();
    const viga = C.ehViga(p);
    if (viga && Number(p.comp) <= 1.21) return vigaCurta(p, origem, opts);
    const e = p.esp / 100, l = p.larg / 100, L = p.comp;
    const W = C.largPacote(p);
    const vao = C.vaoMeio(p);
    const folga = 0.0015; // separa visualmente as pecas
    const out = []; // {x,y,z, sx,sy,sz, tom, k (numero da peca), tipo}
    let tipoAtual = 'amarra';
    const add = (x, y, z, sx, sy, sz, tom = 0) => out.push({ x: origem.x + x, y: origem.y + y, z: origem.z + z, sx, sy, sz, tom, k: out.length, tipo: tipoAtual });
    const porPonta = L < W - 0.01 ? 2 : 1;
    const posFileiras = viga ? 0 : Math.max(0, Math.floor((p.alt - 1) / 10));
    // orcamento de amarras
    let verba = viga || opts.regra ? Infinity : Math.max(0, Math.round(Number(p.am) || 0));
    const nPeRegra = viga ? 1 : 4;
    const nPe = viga ? 1 : Math.min(nPeRegra, Math.floor(verba / 2));
    if (!viga) verba -= nPe * 2;
    const nFileiras = viga ? 0 : Math.min(posFileiras, Math.floor(verba / (2 * porPonta)));
    if (!viga) verba -= nFileiras * 2 * porPonta;

    // pezinho: atravessado (ao longo de z) nas duas pontas; tabua: 4 pecas empilhadas, viga: 1 peca
    [0.04 + l / 2, L - 0.04 - l / 2].forEach(xc => {
        for (let t = 0; t < nPe; t++) add(xc, t * e + e / 2, W / 2, l - folga, e - folga, W, 2);
    });
    let y = nPe * e;

    // posicoes das tabuas na camada (com vao no meio quando 10 x 11 nao fecha 1,20)
    const zs = [];
    if (vao) {
        const metade = Math.floor(p.cam / 2);
        for (let c = 0; c < metade; c++) zs.push(c * l + l / 2);
        const inicio2 = metade * l + vao;
        for (let c = 0; c < p.cam - metade; c++) zs.push(inicio2 + c * l + l / 2);
    } else {
        const usado = p.cam * l, sobra = Math.max(0, W - usado) / 2;
        for (let c = 0; c < p.cam; c++) zs.push(sobra + c * l + l / 2);
    }
    let yGrupoInicio = y;
    let amarras = viga ? 0 : nPe * 2;
    let fileirasFeitas = 0;
    const camadasY = [];
    // vao do meio: 4 tabuinhas em pe em cada bloco de 10 fiadas (contam como amarra)
    const fecharVao = (yIni, yFim) => {
        if (!vao) return;
        const zIni = Math.floor(p.cam / 2) * l;
        const n = Math.min(verba, 4); // sempre 4 por bloco (regra da serraria), mesmo com vao estreito
        if (n <= 0) return;
        verba -= n;
        const passo = vao / n;
        for (let k = 0; k < n; k++) add(L / 2, (yIni + yFim) / 2, zIni + k * passo + passo / 2, L, (yFim - yIni) - folga, e - folga, 1);
        amarras += n;
    };
    // fileira de amarra: tabua atravessada em cada ponta. Se a tabua e mais curta que a largura
    // do pacote (pacote de 1,00 com 1,20 de largura), vao 2 lado a lado em cada ponta.
    const fileiraAmarra = yy => {
        [[0.06 + l / 2, 1], [L - 0.06 - l / 2, -1]].forEach(([xc, dir]) => {
            if (porPonta === 1) add(xc, yy + e / 2, W / 2, l - folga, e - folga, W, 2);
            else {
                add(xc, yy + e / 2, L / 2, l - folga, e - folga, L, 2);
                add(xc + dir * (l + 0.004), yy + e / 2, W - L / 2, l - folga, e - folga, L, 2);
            }
        });
        amarras += 2 * porPonta;
    };
    for (let r = 0; r < p.alt; r++) {
        if (!viga && r > 0 && r % 10 === 0 && fileirasFeitas < nFileiras) {
            tipoAtual = 'amarra';
            fecharVao(yGrupoInicio, y);
            fileiraAmarra(y);
            fileirasFeitas++;
            y += e;
            yGrupoInicio = y;
        }
        camadasY.push(y + e / 2);
        tipoAtual = 'tabua';
        zs.forEach(z => add(L / 2, y + e / 2, z, L, e - folga, l - folga, (r + Math.round(z * 100)) % 3 === 0 ? 1 : 0));
        y += e;
    }
    tipoAtual = 'amarra';
    fecharVao(yGrupoInicio, y);
    // viga: pecas adicionais formam uma camada incompleta por cima
    if (viga && p.am > 0) {
        for (let c = 0; c < Math.min(p.am, zs.length); c++) add(L / 2, y + e / 2, zs[c], L, e - folga, l - folga, 1);
        y += e;
    }
    return { pecas: out, altura: y, largura: W, comprimento: L, amarras, camadasY, zs };
}

// Pacote de viga de 1,20 (viga de 2,40 nao amarra): 1 pezinho em cada ponta, uma camada inteira
// atravessada no meio da altura e, quando 10 x 11 nao fecha 1,20, 3 vigas da mesma medida no vao do meio
// em cada metade (de cutelo, uma em cima da outra).
// Ex.: 12 x 10 + 18 = 2 pezinhos + 10 atravessadas + 3 + 3. Usa no maximo p.am amarras (opts.regra ignora).
// Viga grossa sem amarra suficiente para a camada do meio: amarras inclinadas no vao (ex.: 11 x 10 + 9 = 2 pezinhos + 7 no vao).
function vigaCurta(p, origem, opts = {}) {
    const e = p.esp / 100, l = p.larg / 100, L = p.comp;
    const folga = 0.0015;
    const vao = 1.2 - p.cam * l >= 0.03 ? 1.2 - p.cam * l : 0;
    const W = vao ? 1.2 : Math.min(1.2, p.cam * l);
    const out = [];
    let tipo = 'amarra';
    const add = (x, y, z, sx, sy, sz, tom = 0) => out.push({ x: origem.x + x, y: origem.y + y, z: origem.z + z, sx, sy, sz, tom, k: out.length, tipo });
    let verba = opts.regra ? Infinity : Math.max(0, Math.round(Number(p.am) || 0));
    let amarras = 0;
    // pezinho
    const pe = verba >= 2 ? 1 : 0;
    let y = 0;
    if (pe) { [0.04 + l / 2, L - 0.04 - l / 2].forEach(xc => add(xc, e / 2, W / 2, l - folga, e - folga, W, 2)); verba -= 2; amarras += 2; y = e; }
    // camada do meio atravessada, so quando as amarras fecham a camada inteira; senao (viga grossa,
    // pacote nao pode subir mais) as amarras vao no vao do meio, inclinadas, uma em cima da outra.
    const nMeioRegra = Math.max(1, Math.floor(L / l + 0.001));
    const modoVao = !opts.regra && vao > 0 && verba < nMeioRegra;
    const nMeio = !modoVao && p.alt >= 2 ? Math.min(nMeioRegra, verba) : 0;
    verba -= nMeio;
    const corte = Math.floor(p.alt / 2);
    const zs = [];
    if (vao) {
        const metade = Math.floor(p.cam / 2);
        for (let c = 0; c < metade; c++) zs.push(c * l + l / 2);
        for (let c = 0; c < p.cam - metade; c++) zs.push(metade * l + vao + c * l + l / 2);
    } else {
        const sobra = Math.max(0, W - p.cam * l) / 2;
        for (let c = 0; c < p.cam; c++) zs.push(sobra + c * l + l / 2);
    }
    const camadasY = [];
    let yBloco = y;
    const fecharVao = (y0, y1) => {
        if (!vao || y1 <= y0) return;
        const n = Math.min(3, verba);
        if (n <= 0) return;
        verba -= n; amarras += n;
        tipo = 'amarra';
        // vigas da mesma medida, de cutelo (em pe), uma em cima da outra dentro do vao
        const zMeio = Math.floor(p.cam / 2) * l + vao / 2;
        const passoY = Math.min(l, (y1 - y0) / n);
        for (let k = 0; k < n; k++) add(L / 2, y0 + passoY * k + passoY / 2, zMeio, L, passoY - folga, Math.min(e, vao) - folga, 1);
    };
    for (let r = 0; r < p.alt; r++) {
        if (r === corte && nMeio) {
            fecharVao(yBloco, y);
            tipo = 'amarra';
            const passoX = L / nMeio;
            for (let k = 0; k < nMeio; k++) add(k * passoX + passoX / 2, y + e / 2, W / 2, Math.min(l, passoX) - folga, e - folga, W, 2);
            amarras += nMeio;
            y += e;
            yBloco = y;
        }
        camadasY.push(y + e / 2);
        tipo = 'tabua';
        zs.forEach(z => add(L / 2, y + e / 2, z, L, e - folga, l - folga, (r + Math.round(z * 100)) % 3 === 0 ? 1 : 0));
        y += e;
    }
    if (modoVao) {
        // inclina a viga ate caber na largura do vao (largura horizontal = e*cos + l*sen)
        let ang = 0;
        const alvo = vao - 0.006;
        for (let a = 0; a <= Math.PI / 2; a += 0.01) { if (e * Math.cos(a) + l * Math.sin(a) <= alvo) ang = a; else if (a > 0) break; }
        if (e > alvo) ang = 0;
        const vert = e * Math.sin(ang) + l * Math.cos(ang);
        const zMeio = Math.floor(p.cam / 2) * l + vao / 2;
        const base = pe ? e : 0;
        const n = Math.min(verba, Math.max(0, Math.floor((y - base) / vert + 0.001)));
        tipo = 'amarra';
        for (let k = 0; k < n; k++) {
            out.push({ x: origem.x + L / 2, y: origem.y + base + vert * k + vert / 2, z: origem.z + zMeio, sx: L - folga, sy: l - folga, sz: e - folga, tom: 1, k: out.length, tipo, rx: ang });
        }
        verba -= n; amarras += n;
    } else fecharVao(yBloco, y);
    return { pecas: out, altura: y, largura: W, comprimento: L, amarras, camadasY, zs };
}

// etiqueta do pacote, no mesmo modelo da impressa no Controle de Producao (canto superior esquerdo da ponta)
const texturasEtiqueta = new Map();
function texturaEtiqueta(p) {
    const T = window.THREE;
    const pecas = p.pecasTotal ?? (p.alt * p.cam + (p.am || 0));
    const m3 = (p.esp / 100) * (p.larg / 100) * p.comp * pecas;
    const chave = [p.classe, p.esp, p.larg, p.comp, p.alt, p.cam, p.am, p.especie, pecas].join('|');
    if (texturasEtiqueta.has(chave)) return texturasEtiqueta.get(chave);
    const em = window.dadosSerrariaEmitente || {};
    const marca = String(em.nomeFantasia || 'VANMARTE').replace(/^SERRARIA\s+/i, '').toUpperCase();
    const cidade = String(em.cidade || 'Ribeirão Branco / SP').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s*\/\s*/, ' - ').toUpperCase();
    const contato = `${em.email || ''}${em.email && (em.telefone || em.contato) ? ' - ' : ''}${em.telefone || em.contato || ''}`;
    const c = document.createElement('canvas'); c.width = 300; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 400);
    x.strokeStyle = '#111'; x.lineWidth = 4; x.strokeRect(2, 2, 296, 396);
    x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.font = '900 40px Arial'; x.fillText(marca, 150, 46);
    x.font = 'bold 15px Arial'; x.fillText(`SERRARIA - ${cidade}`, 150, 68);
    x.font = '12px Arial'; x.fillText(contato, 150, 88, 285);
    x.fillRect(12, 98, 276, 2);
    x.textAlign = 'left'; x.font = 'bold 13px Arial'; x.fillText('PRODUTO', 14, 120); x.fillText('CLASSE', 200, 120);
    x.font = '900 24px Arial'; x.fillText(String(p.especie || 'EUCALIPTO').toUpperCase(), 14, 148, 175);
    const cor = { 1: ['#16a34a', '#fff'], 2: ['#facc15', '#111'], 3: ['#dc2626', '#fff'] }[p.classe] || ['#dc2626', '#fff'];
    x.fillStyle = cor[0]; x.fillRect(198, 124, 88, 34);
    x.fillStyle = cor[1]; x.textAlign = 'center'; x.font = '900 26px Arial'; x.fillText(`${p.classe || '-'}ª`, 242, 151);
    x.fillStyle = '#111'; x.textAlign = 'left'; x.font = 'bold 13px Arial'; x.fillText('BITOLAS', 14, 182);
    x.font = '900 26px Arial'; x.fillText(`${fmt(p.esp, 1)} / ${fmt(p.larg, 1)} / ${fmt(p.comp, 2)}`, 14, 212, 272);
    [[p.alt, 'ALTURAS', 'PEÇAS'], [p.cam, 'LARGURA', 'PEÇAS'], [p.am || '-', 'AMARRAS', '']].forEach(([v, t, u], i) => {
        const y = 250 + i * 36;
        x.font = '900 26px Arial'; x.textAlign = 'center'; x.fillText(String(v), 45, y);
        x.fillRect(12, y + 6, 66, 2);
        x.textAlign = 'left'; x.font = 'bold 17px Arial'; x.fillText(t, 92, y);
        x.font = '13px Arial'; x.fillText(u, 200, y);
    });
    x.fillRect(12, 344, 276, 2);
    x.font = '900 22px Arial'; x.textAlign = 'left'; x.fillText(`${pecas} PEÇAS`, 14, 376);
    x.textAlign = 'right'; x.fillText(`${fmt(m3, 3)} M³`, 286, 376);
    const t = new T.CanvasTexture(c);
    t.anisotropy = 4;
    texturasEtiqueta.set(chave, t);
    return t;
}
// tras = true: ponta de tras (-x), a que aparece no caminhao; senao a ponta da frente (+x)
// lado = +1: lateral +z; lado = -1: lateral -z. No caminhao, a lateral que fica para fora.
// A etiqueta vai na lateral do pacote (onde passam as fitas verdes), no canto superior esquerdo
// de quem olha essa lateral, entre a fita da ponta e a do meio.
function colarEtiqueta(dim, origem, p, lado = 1) {
    const T = window.THREE;
    const H = 0.10; // etiqueta real ~7,5 x 10 cm
    const alt = Math.min(H, dim.altura * 0.8);
    const larg = alt * 0.75;
    const geo = new T.PlaneGeometry(larg, alt);
    if (lado < 0) geo.rotateY(Math.PI);
    const mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map: texturaEtiqueta(p) }));
    const y = origem.y + dim.altura - alt / 2 - 0.012;
    const deslocX = dim.comprimento * 0.1 + 0.03 + larg / 2; // logo depois da fita da ponta
    if (lado >= 0) mesh.position.set(origem.x + deslocX, y, origem.z + dim.largura + 0.004);
    else mesh.position.set(origem.x + dim.comprimento - deslocX, y, origem.z - 0.004);
    cena.conteudo.add(mesh);
}

// amarras pela regra da serraria (pezinho + fiadas de amarra + tabuinhas do vao do meio)
function amarrasPadrao(p) { return tabuasDoPacote(p, undefined, { regra: true }).amarras; }
window.amarrasPadraoPacote = p => (calc() ? amarrasPadrao(p) : 0);

// numeros para contar: fiadas (1..alt) na quina da ponta e tabuas da fiada de cima (1..cam)
const texturasNumero = new Map();
function rotuloNumero(n, destaque) {
    const T = window.THREE;
    const chave = n + (destaque === 'amarra' ? 'a' : destaque ? 'd' : '');
    if (!texturasNumero.has(chave)) {
        const c = document.createElement('canvas'); c.width = 64; c.height = 40;
        const x = c.getContext('2d');
        x.fillStyle = destaque === 'amarra' ? '#ea580c' : destaque ? '#1d4ed8' : 'rgba(255,255,255,.92)';
        x.fillRect(0, 0, 64, 40);
        x.fillStyle = destaque ? '#fff' : '#111827';
        x.font = 'bold 28px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(String(n), 32, 21);
        texturasNumero.set(chave, new T.CanvasTexture(c));
    }
    const sp = new T.Sprite(new T.SpriteMaterial({ map: texturasNumero.get(chave) }));
    sp.material.map.needsUpdate = false;
    return sp;
}
function numerarPacote(dim, off, p) {
    const T = window.THREE;
    const e = p.esp / 100, l = p.larg / 100;
    const h = Math.max(0.012, Math.min(0.03, e * 0.9));
    // amarras numeradas em laranja (pezinho, fiadas de amarra e as do meio), na face que a camera ve
    const fora = atual.pecaFora || new Set();
    dim.pecas.filter(b => b.tipo === 'amarra' && !fora.has(b.k)).forEach((b, i) => {
        const sp = rotuloNumero(i + 1, 'amarra');
        const ha = 0.022; // legivel com zoom mesmo na tabua fina
        sp.scale.set(ha * 1.6, ha, 1);
        const cruzada = b.sz >= dim.largura * 0.5; // atravessada: numero na lateral; ao longo: numero na ponta
        if (cruzada) sp.position.set(off.x + b.x, off.y + b.y, off.z + b.z + b.sz / 2 + 0.006);
        else sp.position.set(off.x + b.x + b.sx / 2 + 0.006, off.y + b.y, off.z + b.z);
        cena.conteudo.add(sp);
    });
    const xFace = off.x + dim.comprimento + 0.004;
    dim.camadasY.forEach((y, i) => {
        const sp = rotuloNumero(i + 1, (i + 1) % 10 === 0);
        sp.scale.set(h * 1.6, h, 1);
        sp.position.set(xFace, off.y + y, off.z + dim.largura + h * 1.1);
        cena.conteudo.add(sp);
    });
    const yTopo = off.y + dim.altura + h * 0.9;
    dim.zs.forEach((z, i) => {
        const num = dim.zs.length - i; // conta da esquerda para a direita olhando a ponta
        const sp = rotuloNumero(num, num % 5 === 0);
        const hh = Math.min(h * 1.3, l * 0.55);
        sp.scale.set(hh * 1.6, hh, 1);
        sp.position.set(xFace, yTopo, off.z + z);
        cena.conteudo.add(sp);
    });
    // contorno de cada tabua na ponta, para separar no olho
    const pts = [];
    dim.camadasY.forEach(y => dim.zs.forEach(z => {
        const y0 = off.y + y - e / 2, y1 = y0 + e, z0 = off.z + z - l / 2, z1 = z0 + l;
        pts.push(xFace, y0, z0, xFace, y0, z1, xFace, y0, z1, xFace, y1, z1, xFace, y1, z1, xFace, y1, z0, xFace, y1, z0, xFace, y0, z0);
    }));
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    cena.conteudo.add(new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x5b3a1e, transparent: true, opacity: 0.55 })));
}

// fitas verdes (3) em volta do pacote
function fitasDoPacote(dim, origem = { x: 0, y: 0, z: 0 }) {
    const out = [];
    [0.1, 0.5, 0.9].forEach(f => {
        const x = origem.x + dim.comprimento * f;
        out.push({ x, y: origem.y + dim.altura + 0.002, z: origem.z + dim.largura / 2, sx: 0.025, sy: 0.004, sz: dim.largura + 0.01 });
        out.push({ x, y: origem.y + dim.altura / 2, z: origem.z - 0.003, sx: 0.025, sy: dim.altura, sz: 0.004 });
        out.push({ x, y: origem.y + dim.altura / 2, z: origem.z + dim.largura + 0.003, sx: 0.025, sy: dim.altura, sz: 0.004 });
    });
    return out;
}

// ---------- cena ----------
let cena = null; // { renderer, scene, camera, controls, conteudo, raf }

function criarCena(container) {
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0xffffff, 1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, 1, 0.01, 200);
    const controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    scene.add(new T.HemisphereLight(0xffffff, 0xb8b0a4, 0.5));
    scene.add(new T.AmbientLight(0xffffff, 0.12));
    const sol = new T.DirectionalLight(0xfff4e6, 0.85);
    sol.position.set(6, 12, 8);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
    sol.shadow.bias = -0.0005;
    scene.add(sol);
    const conteudo = new T.Group();
    scene.add(conteudo);
    cena = { renderer, scene, camera, controls, conteudo, container, raf: 0, sujo: true };
    // so redesenha quando algo muda (evita travar o celular/PC com a cena parada)
    const addOriginal = conteudo.add.bind(conteudo);
    conteudo.add = (...o) => { cena.sujo = true; renderer.shadowMap.needsUpdate = true; return addOriginal(...o); };
    controls.addEventListener('change', () => { cena.sujo = true; });
    const redimensionar = () => {
        const w = container.clientWidth || 600, h = container.clientHeight || 400;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        cena.sujo = true;
    };
    cena.redimensionar = redimensionar;
    redimensionar();
    const loop = () => {
        cena.raf = requestAnimationFrame(loop);
        if (container.offsetParent === null) return; // janela fechada: nao gasta bateria
        const mexeu = controls.update();
        if (!mexeu && !cena.sujo) return;
        cena.sujo = false;
        renderer.render(scene, camera);
    };
    loop();
    window.addEventListener('resize', redimensionar);
}

// ---------- cotas (risquinho com a medida) ----------
const texturasCota = new Map();
function rotuloCota(texto) {
    const T = window.THREE;
    if (!texturasCota.has(texto)) {
        const c = document.createElement('canvas'); c.width = 192; c.height = 56;
        const x = c.getContext('2d');
        x.fillStyle = '#1d4ed8'; x.fillRect(0, 0, 192, 56);
        x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(texto, 96, 29);
        const t = new T.CanvasTexture(c);
        t.compartilhada = true;
        texturasCota.set(texto, t);
    }
    return new T.Sprite(new T.SpriteMaterial({ map: texturasCota.get(texto), depthTest: false }));
}
function caixaDe(lista) {
    const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
    lista.forEach(q => {
        b.x0 = Math.min(b.x0, q.x - q.sx / 2); b.x1 = Math.max(b.x1, q.x + q.sx / 2);
        b.y0 = Math.min(b.y0, q.y - q.sy / 2); b.y1 = Math.max(b.y1, q.y + q.sy / 2);
        b.z0 = Math.min(b.z0, q.z - q.sz / 2); b.z1 = Math.max(b.z1, q.z + q.sz / 2);
    });
    return Number.isFinite(b.x0) ? b : null;
}
// Mostra comprimento (x), largura (z) e altura (y) de uma caixa, do lado que a camera ve (+x, +z).
// textos: { comp, larg, alt } para trocar o texto (ex.: em cm na tabua).
function cotas(b, textos = {}) {
    if (!b) return;
    const T = window.THREE;
    const tam = Math.max(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
    const off = Math.max(0.025, tam * 0.05), tick = off * 0.5;
    const h = Math.min(0.32, Math.max(0.03, tam * 0.06));
    const pts = [];
    const seg = (a, c) => pts.push(a[0], a[1], a[2], c[0], c[1], c[2]);
    const rot = (txt, pos) => { const sp = rotuloCota(txt); sp.scale.set(h * 192 / 56, h, 1); sp.position.set(...pos); sp.renderOrder = 10; cena.conteudo.add(sp); };
    const m = v => `${fmt(v, 2)} m`;
    // comprimento: embaixo, na frente (+z)
    const zc = b.z1 + off, yb = b.y0 + 0.002;
    seg([b.x0, yb, zc], [b.x1, yb, zc]); seg([b.x0, yb, zc - tick], [b.x0, yb, zc + tick]); seg([b.x1, yb, zc - tick], [b.x1, yb, zc + tick]);
    rot(textos.comp || m(b.x1 - b.x0), [(b.x0 + b.x1) / 2, yb + h * 0.7, zc + h * 0.3]);
    // largura: embaixo, na ponta (+x)
    const xc = b.x1 + off;
    seg([xc, yb, b.z0], [xc, yb, b.z1]); seg([xc - tick, yb, b.z0], [xc + tick, yb, b.z0]); seg([xc - tick, yb, b.z1], [xc + tick, yb, b.z1]);
    rot(textos.larg || m(b.z1 - b.z0), [xc + h * 0.4, yb + h * 0.7, (b.z0 + b.z1) / 2]);
    // altura: na quina de tras (-x, +z)
    const xa = b.x0 - off, za = b.z1 + off;
    seg([xa, b.y0, za], [xa, b.y1, za]); seg([xa - tick, b.y0, za], [xa + tick, b.y0, za]); seg([xa - tick, b.y1, za], [xa + tick, b.y1, za]);
    rot(textos.alt || m(b.y1 - b.y0), [xa - h * 0.9, (b.y0 + b.y1) / 2, za]);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    const linhas = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x1d4ed8, depthTest: false }));
    linhas.renderOrder = 9;
    cena.conteudo.add(linhas);
}

// contagem por camada: "12 no assoalho + 10 em cima" (conta por fileira e nivel de altura)
function contagemCamadas(colocados) {
    const niveis = new Map();
    colocados.forEach(c => {
        const chave = c.ci + '|' + c.f;
        if (!niveis.has(chave)) niveis.set(chave, [...new Set(colocados.filter(o => o.ci + '|' + o.f === chave).map(o => Math.round(o.topo * 100)))].sort((a, b) => a - b));
    });
    const cont = [0, 0, 0];
    colocados.forEach(c => { const n = niveis.get(c.ci + '|' + c.f).indexOf(Math.round(c.topo * 100)); cont[Math.min(2, n)]++; });
    return [cont[0] && `${cont[0]} no assoalho`, cont[1] && `${cont[1]} em cima`, cont[2] && `${cont[2]} no chapéu`].filter(Boolean).join(' + ');
}

function limparConteudo() {
    const g = cena.conteudo;
    while (g.children.length) {
        const o = g.children.pop();
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose?.();
    }
}

// fundo gradeado branco: grade fina e grade grossa, com cota da escala
function grade(tamanho, passoFino, passoGrosso) {
    const T = window.THREE;
    const fina = new T.GridHelper(tamanho, Math.round(tamanho / passoFino), 0xe2e8f0, 0xe2e8f0);
    const grossa = new T.GridHelper(tamanho, Math.round(tamanho / passoGrosso), 0x94a3b8, 0xcbd5e1);
    fina.position.y = -0.001;
    cena.conteudo.add(fina, grossa);
}

function malhaInstanciada(lista, cor, variacao = true) {
    const T = window.THREE;
    if (!lista.length) return;
    const geo = new T.BoxGeometry(1, 1, 1);
    const mat = new T.MeshLambertMaterial({ color: 0xffffff, map: cor === COR_MADEIRA ? veioMadeira() : null });
    const mesh = new T.InstancedMesh(geo, mat, lista.length);
    const m = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), esc = new T.Vector3();
    const tons = [new T.Color(cor), new T.Color(cor).offsetHSL(0, -0.05, -0.06), new T.Color(cor).offsetHSL(0.01, 0.02, -0.14)];
    const giro = new T.Euler();
    lista.forEach((b, i) => {
        pos.set(b.x, b.y, b.z);
        esc.set(b.sx, b.sy, b.sz);
        if (b.rx) { giro.set(b.rx, 0, 0); q.setFromEuler(giro); } else q.identity();
        m.compose(pos, q, esc);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, variacao ? tons[b.tom || 0] : tons[0]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cena.conteudo.add(mesh);
    return mesh;
}

function contorno(mesh, cor = 0x6b7280) {
    const T = window.THREE;
    const linhas = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({ color: cor }));
    linhas.position.copy(mesh.position);
    cena.conteudo.add(linhas);
    return mesh;
}

function caixa(x, y, z, sx, sy, sz, cor) {
    const T = window.THREE;
    const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), new T.MeshLambertMaterial({ color: cor }));
    mesh.position.set(x, y, z);
    cena.conteudo.add(mesh);
    return mesh;
}

function roda(x, y, z, r, larg) {
    const T = window.THREE;
    const pneu = new T.Mesh(new T.CylinderGeometry(r, r, larg, 24), new T.MeshLambertMaterial({ color: 0x1c1c1c }));
    pneu.rotation.x = Math.PI / 2;
    pneu.position.set(x, y, z);
    const aro = new T.Mesh(new T.CylinderGeometry(r * 0.55, r * 0.55, larg + 0.01, 20), new T.MeshLambertMaterial({ color: 0xb8bec6 }));
    aro.rotation.x = Math.PI / 2;
    aro.position.set(x, y, z);
    cena.conteudo.add(pneu, aro);
}

function enquadrar(cx, cy, cz, raio, dir = [1, 0.75, 1.15]) {
    const T = window.THREE;
    const asp = cena.camera.aspect || 1;
    const ajuste = asp < 1.2 ? Math.min(3, 1.6 / asp) : 1; // tela em pe: afasta para caber
    const d = new T.Vector3(...dir).normalize().multiplyScalar(raio * 2.6 * ajuste);
    cena.camera.position.set(cx + d.x, cy + d.y, cz + d.z);
    cena.controls.target.set(cx, cy, cz);
    cena.controls.update();
    cena.sujo = true;
}

const COR_MADEIRA = 0xdcb27c;

// textura de veio de madeira (gerada no navegador, sem imagem externa)
let texturaVeio = null;
function veioMadeira() {
    if (texturaVeio) return texturaVeio;
    const T = window.THREE;
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#f2e2cc';
    x.fillRect(0, 0, 256, 64);
    let semente = 7;
    const rnd = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };
    for (let i = 0; i < 26; i++) {
        const y0 = rnd() * 64, amp = 1 + rnd() * 3, fase = rnd() * 6;
        x.strokeStyle = `rgba(${120 + rnd() * 30},${70 + rnd() * 20},${30 + rnd() * 15},${0.18 + rnd() * 0.3})`;
        x.lineWidth = 0.6 + rnd() * 1.6;
        x.beginPath();
        for (let px = 0; px <= 256; px += 8) { const py = y0 + Math.sin(px / 40 + fase) * amp; px ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke();
    }
    for (let i = 0; i < 3; i++) { // nos
        const nx = rnd() * 256, ny = rnd() * 64;
        x.fillStyle = 'rgba(110,62,25,.45)';
        x.beginPath(); x.ellipse(nx, ny, 3 + rnd() * 4, 1.5 + rnd() * 2, 0, 0, Math.PI * 2); x.fill();
    }
    texturaVeio = new T.CanvasTexture(c);
    return texturaVeio;
}

// casca e topo (aneis) da tora
let texturasTora = null;
function texturaTora() {
    if (texturasTora) return texturasTora;
    const T = window.THREE;
    const casca = document.createElement('canvas'); casca.width = 128; casca.height = 128;
    let x = casca.getContext('2d');
    x.fillStyle = '#5a3d24'; x.fillRect(0, 0, 128, 128);
    let semente = 11;
    const rnd = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };
    for (let i = 0; i < 70; i++) {
        x.strokeStyle = `rgba(${rnd() < 0.5 ? '30,18,8' : '120,92,62'},${0.35 + rnd() * 0.4})`;
        x.lineWidth = 1 + rnd() * 2.5;
        const yy = rnd() * 128;
        x.beginPath(); x.moveTo(0, yy); x.lineTo(128, yy + (rnd() - 0.5) * 10); x.stroke();
    }
    const topo = document.createElement('canvas'); topo.width = 128; topo.height = 128;
    x = topo.getContext('2d');
    x.fillStyle = '#4a321d'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#e3bf8c'; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill();
    for (let rr = 6; rr < 58; rr += 4 + rnd() * 3) { x.strokeStyle = `rgba(150,100,55,${0.35 + rnd() * 0.3})`; x.lineWidth = 1 + rnd(); x.beginPath(); x.arc(64 + rnd() * 2, 64 + rnd() * 2, rr, 0, Math.PI * 2); x.stroke(); }
    x.fillStyle = '#9c6a3a'; x.beginPath(); x.arc(64, 64, 4, 0, Math.PI * 2); x.fill();
    const tc = new T.CanvasTexture(casca);
    tc.wrapS = tc.wrapT = T.RepeatWrapping;
    tc.repeat.set(2, 3);
    texturasTora = { casca: tc, topo: new T.CanvasTexture(topo) };
    return texturasTora;
}

function desenharTabua(p) {
    limparConteudo();
    grade(4, 0.1, 0.5);
    const e = p.esp / 100, l = p.larg / 100, L = p.comp;
    malhaInstanciada([{ x: 0, y: e / 2, z: 0, sx: L, sy: e, sz: l, tom: 0 }], COR_MADEIRA, false);
    cotas({ x0: -L / 2, x1: L / 2, y0: 0, y1: e, z0: -l / 2, z1: l / 2 }, { larg: `${fmt(p.larg, 1)} cm`, alt: `${fmt(p.esp, 1)} cm` });
    enquadrar(0, e / 2, 0, Math.max(L, 0.5) / 2, [0.6, 0.55, 1]);
    return `Tábua única: ${fmt(p.esp, 1)} cm × ${fmt(p.larg, 1)} cm × ${fmt(L, 2)} m · ${fmt(e * l * L, 4)} m³ por peça`;
}

// Pacote: da para selecionar peca por peca (clique) e tirar as selecionadas.
// atual.pecaSel = Set de numeros das pecas selecionadas; atual.pecaFora = Set das que foram tiradas.
function desenharPacote(p) {
    limparConteudo();
    const T = window.THREE;
    const C = calc();
    const dim = tabuasDoPacote(p, { x: 0, y: 0, z: 0 });
    grade(Math.max(4, Math.ceil(p.comp + 2)), 0.1, 0.5);
    const off = { x: -dim.comprimento / 2, y: 0, z: -dim.largura / 2 };
    const fora = atual.pecaFora || new Set(), sel = atual.pecaSel || new Set();
    const visiveis = dim.pecas.filter(b => !fora.has(b.k)).map(b => ({ ...b, x: b.x + off.x, z: b.z + off.z }));
    const mesh = malhaInstanciada(visiveis, COR_MADEIRA);
    cena.pacotePick = { mesh, lista: visiveis };
    // selecionadas: contorno azul
    visiveis.filter(b => sel.has(b.k)).forEach(b => {
        const g = new T.EdgesGeometry(new T.BoxGeometry(b.sx + 0.004, b.sy + 0.004, b.sz + 0.004));
        const l = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x1d4ed8 }));
        l.position.set(b.x, b.y, b.z);
        cena.conteudo.add(l);
        const marca = new T.Mesh(new T.BoxGeometry(b.sx + 0.002, b.sy + 0.002, b.sz + 0.002), new T.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.45, depthWrite: false }));
        marca.position.set(b.x, b.y, b.z);
        cena.conteudo.add(marca);
    });
    malhaInstanciada(fitasDoPacote(dim, off), 0x16a34a, false);
    numerarPacote(dim, off, p);
    cotas({ x0: off.x, x1: off.x + dim.comprimento, y0: 0, y1: dim.altura, z0: off.z, z1: off.z + dim.largura });
    const tiradas = dim.pecas.filter(b => fora.has(b.k));
    const tabFora = tiradas.filter(b => b.tipo === 'tabua').length, amFora = tiradas.length - tabFora;
    const pecas = p.alt * p.cam + (p.am || 0) - tiradas.length;
    colarEtiqueta(dim, off, { ...p, pecasTotal: pecas });
    if (!atual.manterCamera) enquadrar(0, dim.altura / 2, 0, Math.max(dim.comprimento, dim.altura, dim.largura) / 1.35, [0.8, 0.45, 1]);
    atual.manterCamera = false;
    atualizarBotoesPecas(sel.size, tiradas.length);
    const m3 = (p.esp / 100) * (p.larg / 100) * p.comp * pecas;
    const menos = tiradas.length ? ` − ${tabFora ? `${tabFora} tábua(s)` : ''}${tabFora && amFora ? ' − ' : ''}${amFora ? `${amFora} amarra(s)` : ''}` : '';
    return `Pacote ${C.ehViga(p) ? 'de viga ' : ''}(${p.alt}×${p.cam})${p.am ? ` + ${p.am}${C.ehViga(p) && p.comp > 1.21 ? ' pç' : ' am'}` : ''}${menos}: ${fmt(dim.comprimento, 2)} × ${fmt(dim.largura, 2)} × ${fmt(dim.altura, 2)} m · ${pecas} peças · ${fmt(m3, 3)} m³${!(C.ehViga(p) && p.comp > 1.21) && dim.amarras !== (p.am || 0) ? ` · desenho tem ${dim.amarras} am (o resto não cabe pela regra)` : ''}${sel.size ? ` · ${sel.size} selecionada(s)` : ''}`;
}

function atualizarBotoesPecas(nSel, nFora) {
    const bt = document.getElementById('v3dPecaTirar'), br = document.getElementById('v3dPecaRepor');
    if (bt) { bt.hidden = !nSel; bt.textContent = `Tirar ${nSel} peça(s) selecionada(s)`; }
    if (br) { br.hidden = !nFora; br.textContent = `Repor ${nFora} peça(s)`; }
}

// clique numa peca do pacote (aba Pacote): seleciona / tira selecao
function instalarSelecaoPecas() {
    if (!cena || cena.selPecasInstalado) return;
    cena.selPecasInstalado = true;
    const T = window.THREE;
    const el = cena.renderer.domElement;
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    let ini = null;
    el.addEventListener('pointerdown', e => { ini = { x: e.clientX, y: e.clientY, b: e.button }; });
    el.addEventListener('pointerup', e => {
        if (!ini || ini.b !== 0 || Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 5) { ini = null; return; }
        ini = null;
        if (atual.modo !== 'madeira' || atual.aba !== 'pacote' || !cena.pacotePick?.mesh) return;
        const r = el.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cena.camera);
        const hit = ray.intersectObject(cena.pacotePick.mesh, false)[0];
        if (!hit || hit.instanceId === undefined) return;
        const peca = cena.pacotePick.lista[hit.instanceId];
        if (!peca) return;
        atual.pecaSel = atual.pecaSel || new Set();
        if (atual.pecaSel.has(peca.k)) atual.pecaSel.delete(peca.k); else atual.pecaSel.add(peca.k);
        atual.manterCamera = true;
        desenhar();
    });
}

const PISO = 1.25, RODA = 0.52, CAB = 2.5;

// ---------- caminhao florestal 6x4 (mesmas medidas, desenho detalhado) ----------
function mat(cor, rough = 0.6, metal = 0.1) {
    return new window.THREE.MeshStandardMaterial({ color: cor, roughness: rough, metalness: metal });
}
function addMesh(geo, material, x, y, z, rot) {
    const T = window.THREE;
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    cena.conteudo.add(m);
    return m;
}
function bloco(x, y, z, sx, sy, sz, material) {
    return addMesh(new window.THREE.BoxGeometry(sx, sy, sz), material, x, y, z);
}

// Pneu com aro de aco, cubo e faixa de banda; o lado de fora fica virado para "lado" (+1 ou -1 em z).
function rodaCaminhao(x, z, lado, larg = 0.28) {
    const T = window.THREE;
    const r = RODA;
    addMesh(new T.CylinderGeometry(r, r, larg, 36), mat(0x161616, 0.95, 0), x, r, z, [Math.PI / 2, 0, 0]);
    addMesh(new T.TorusGeometry(r - 0.02, 0.025, 8, 36), mat(0x0d0d0d, 1, 0), x, r, z + lado * (larg / 2 - 0.02));
    addMesh(new T.CylinderGeometry(r * 0.6, r * 0.6, 0.02, 28), mat(0x5b6370, 0.45, 0.6), x, r, z + lado * (larg / 2 + 0.005), [Math.PI / 2, 0, 0]);
    addMesh(new T.CylinderGeometry(r * 0.22, r * 0.22, 0.05, 16), mat(0xc9ced6, 0.3, 0.8), x, r, z + lado * (larg / 2 + 0.02), [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        addMesh(new T.CylinderGeometry(0.018, 0.018, 0.03, 8), mat(0xe5e7eb, 0.3, 0.8), x + Math.cos(a) * r * 0.36, r + Math.sin(a) * r * 0.36, z + lado * (larg / 2 + 0.02), [Math.PI / 2, 0, 0]);
    }
}

// Chapa perfurada (cabeceira / grade traseira) com furos de verdade via textura com transparencia.
let texturaPerfurada = null;
function chapaPerfurada(x, z, largura, altura) {
    const T = window.THREE;
    if (!texturaPerfurada) {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#3b4250';
        g.fillRect(0, 0, 128, 128);
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.arc(64, 64, 30, 0, Math.PI * 2);
        g.fill();
        texturaPerfurada = new T.CanvasTexture(c);
        texturaPerfurada.wrapS = texturaPerfurada.wrapT = T.RepeatWrapping;
    }
    const tex = texturaPerfurada.clone();
    tex.needsUpdate = true;
    tex.repeat.set(Math.round(largura / 0.28), Math.round(altura / 0.28));
    const m = new T.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.7, metalness: 0.3 });
    addMesh(new T.PlaneGeometry(largura - 0.16, altura - 0.12), m, x, PISO + altura / 2, z, [0, Math.PI / 2, 0]);
    const quadro = mat(0x2f3540, 0.6, 0.3);
    [-1, 1].forEach(l => bloco(x, PISO + altura / 2, z + l * (largura / 2 - 0.05), 0.1, altura, 0.1, quadro));
    bloco(x, PISO + altura - 0.04, z, 0.12, 0.08, largura, mat(0xf5c518, 0.5, 0.1));         // friso amarelo
    bloco(x, PISO + altura * 0.5, z, 0.08, 0.06, largura - 0.1, quadro);                       // travessa do meio
}

function cabine(xc, W) {
    const T = window.THREE;
    const largCab = W * 0.98;
    const branco = mat(0xeef0f3, 0.4, 0.05);
    const escuro = mat(0x22262d, 0.7, 0.2);
    const vidro = new T.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.1, metalness: 0.6, side: T.DoubleSide });
    const xw = CAB - 0.8;                                   // eixo dianteiro (relativo ao inicio da cabine)
    const a0 = Math.asin(Math.min(0.99, (0.78 - RODA) / 0.64));
    // silhueta lateral da cabine extrudada na largura
    const s = new T.Shape();
    s.moveTo(0, 0.78);
    s.lineTo(0, 3.08);
    s.quadraticCurveTo(0, 3.22, 0.16, 3.22);
    s.lineTo(CAB - 0.62, 3.22);
    s.quadraticCurveTo(CAB - 0.32, 3.22, CAB - 0.24, 3.0);
    s.lineTo(CAB - 0.05, 2.08);
    s.quadraticCurveTo(CAB, 1.98, CAB, 1.85);
    s.lineTo(CAB, 0.78);
    s.lineTo(xw + 0.64 * Math.cos(a0), 0.78);
    s.absarc(xw, RODA, 0.64, a0, Math.PI - a0, false);       // arco da roda dianteira
    s.lineTo(0, 0.78);
    const geo = new T.ExtrudeGeometry(s, { depth: largCab - 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 18 });
    const corpo = addMesh(geo, branco, xc, 0, -(largCab - 0.08) / 2);
    const arestas = new T.LineSegments(new T.EdgesGeometry(geo, 25), new T.LineBasicMaterial({ color: 0x8b93a1 }));
    arestas.position.copy(corpo.position);
    cena.conteudo.add(arestas);
    // para-brisa inclinado
    const p1 = { x: CAB - 0.26, y: 2.98 }, p2 = { x: CAB - 0.07, y: 2.12 };
    const comp = Math.hypot(p2.x - p1.x, p2.y - p1.y), ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    addMesh(new T.BoxGeometry(comp, 0.025, largCab * 0.86), vidro, xc + (p1.x + p2.x) / 2 + 0.035, (p1.y + p2.y) / 2, 0, [0, 0, ang]);
    bloco(xc + CAB - 0.36, 3.04, 0, 0.26, 0.04, largCab * 0.9, escuro);                        // quebra-sol
    // janelas laterais e porta
    [-1, 1].forEach(l => {
        const zf = l * (largCab / 2 + 0.005);
        const jan = new T.Shape();
        jan.moveTo(CAB - 1.3, 2.05); jan.lineTo(CAB - 0.16, 2.05); jan.lineTo(CAB - 0.32, 2.92); jan.lineTo(CAB - 1.3, 2.92); jan.lineTo(CAB - 1.3, 2.05);
        addMesh(new T.ShapeGeometry(jan), vidro, xc, 0, zf + l * 0.035);
        bloco(xc + CAB - 1.38, 1.85, zf, 0.02, 2.0, 0.012, mat(0x9aa1ac, 0.5, 0.2));            // fresta da porta
        bloco(xc + CAB - 1.25, 1.95, zf + l * 0.01, 0.16, 0.04, 0.02, escuro);                    // macaneta
        bloco(xc + 0.35, 1.9, zf, 0.02, 2.2, 0.012, mat(0x9aa1ac, 0.5, 0.2));                    // fresta traseira
        // espelho com braco
        bloco(xc + CAB - 0.05, 2.55, l * (largCab / 2 + 0.12), 0.04, 0.04, 0.26, escuro);
        bloco(xc + CAB - 0.02, 2.35, l * (largCab / 2 + 0.25), 0.07, 0.48, 0.16, escuro);
        // degraus
        bloco(xc + CAB - 1.55, 0.62, l * (largCab / 2 - 0.08), 0.42, 0.05, 0.28, mat(0x6b7280, 0.5, 0.6));
        bloco(xc + CAB - 1.55, 0.95, l * (largCab / 2 + 0.01), 0.42, 0.05, 0.1, mat(0x6b7280, 0.5, 0.6));
        // farol e seta
        bloco(xc + CAB + 0.02, 1.18, l * largCab * 0.36, 0.04, 0.2, 0.34, new T.MeshStandardMaterial({ color: 0xfff7d6, emissive: 0x332b10, roughness: 0.2 }));
        bloco(xc + CAB + 0.02, 1.18, l * largCab * 0.47, 0.04, 0.12, 0.1, mat(0xf59e0b, 0.3));
    });
    // faixa escura inferior, grade com frisos e para-choque
    bloco(xc + CAB + 0.015, 1.5, 0, 0.04, 0.62, largCab * 0.56, escuro);
    for (let k = 0; k < 5; k++) bloco(xc + CAB + 0.04, 1.26 + k * 0.12, 0, 0.02, 0.03, largCab * 0.54, mat(0x9ca3af, 0.3, 0.7));
    bloco(xc + CAB / 2 + 0.04, 0.86, 0, CAB + 0.02, 0.14, largCab + 0.02, escuro);
    bloco(xc + CAB + 0.1, 0.82, 0, 0.18, 0.34, W, mat(0x1c1f24, 0.6, 0.3));                 // para-choque
    bloco(xc + CAB + 0.2, 0.76, 0, 0.02, 0.08, W * 0.9, mat(0xf5c518, 0.5));                 // faixa refletiva
    // escapamento vertical atras da cabine e tanque com cintas
    addMesh(new T.CylinderGeometry(0.07, 0.07, 2.1, 16), mat(0xd1d5db, 0.25, 0.9), xc - 0.12, 2.35, -(largCab / 2 - 0.25));
    addMesh(new T.CylinderGeometry(0.29, 0.29, 1.0, 28), mat(0xc5cad2, 0.25, 0.85), xc - 0.65, 0.82, largCab / 2 - 0.3, [0, 0, Math.PI / 2]);
    [-0.3, 0.3].forEach(dx => addMesh(new T.TorusGeometry(0.3, 0.02, 6, 24), escuro, xc - 0.65 + dx, 0.82, largCab / 2 - 0.3, [0, Math.PI / 2, 0]));
    // eixo dianteiro (pneu simples)
    [-1, 1].forEach(l => rodaCaminhao(xc + xw, l * (W / 2 - 0.22), l, 0.32));
}

function desenharVeiculo(comps, W, opts = {}) {
    const fueiro = typeof opts === 'number' ? opts : (opts.fueiro || 1.2);
    const florestal = typeof opts === 'object' && !!opts.florestal;
    const semLaterais = typeof opts === 'object' && !!opts.semLaterais;
    const GAP = 0.55;
    const total = comps.reduce((s, c) => s + c, 0) + GAP * (comps.length - 1);
    grade(Math.ceil(total + CAB + 6), 0.5, 1);
    sombraChao(total + CAB + 4, W + 3);
    const z0 = -W / 2;
    let x = -total / 2 - CAB / 2;
    const inicioCacamba = [];
    const aco = mat(0x2f3540, 0.55, 0.4);
    const amarelo = mat(0xf5c518, 0.45, 0.1);
    comps.forEach((comp, ci) => {
        inicioCacamba.push(x);
        bloco(x + comp / 2, PISO - 0.06, 0, comp, 0.12, W, mat(0x4a4f57, 0.8, 0.3));           // assoalho de chapa
        [-1, 1].forEach(l => {
            bloco(x + comp / 2, PISO - 0.2, l * (W / 2 - 0.04), comp, 0.22, 0.08, aco);         // viga lateral
            for (let k = 0.3; k < comp; k += 0.9) bloco(x + k, PISO - 0.2, l * (W / 2 + 0.001), 0.18, 0.05, 0.005, mat(k % 1.8 < 0.9 ? 0xdc2626 : 0xf8fafc, 0.4)); // faixa refletiva
        });
        [-0.38, 0.38].forEach(zz => bloco(x + comp / 2 + (ci === comps.length - 1 ? 0.3 : 0), PISO - 0.38, zz, comp + (ci === comps.length - 1 ? 0.6 : 0), 0.24, 0.1, mat(0x1b1e23, 0.6, 0.3))); // longarinas
        const n = Math.max(2, Math.round(comp / 1.4) + 1);
        for (let i = 0; i < (semLaterais ? 0 : n); i++) {
            const fx = x + 0.07 + (comp - 0.14) * (i / (n - 1));
            [z0 + 0.05, -z0 - 0.05].forEach(fz => {
                bloco(fx, PISO + fueiro / 2, fz, 0.1, fueiro, 0.1, aco);                       // fueiro
                bloco(fx, PISO + fueiro + 0.06, fz, 0.11, 0.12, 0.11, amarelo);                // ponta amarela
                bloco(fx, PISO + 0.12, fz, 0.18, 0.24, 0.14, aco);                             // base do fueiro
            });
        }
        if (ci === comps.length - 1) chapaPerfurada(x + comp + 0.06, 0, W, Math.max(fueiro, 2.0) + 0.15); // cabeceira
        if (florestal && ci === 0) chapaPerfurada(x - 0.06, 0, W, Math.max(1.4, fueiro * 0.85));          // grade traseira
        // tandem com rodado duplo e para-lamas
        [1.15, 2.3].forEach(dx => [-1, 1].forEach(l => {
            rodaCaminhao(x + dx, l * (W / 2 - 0.17), l, 0.26);
            rodaCaminhao(x + dx, l * (W / 2 - 0.47), l, 0.26);
        }));
        [-1, 1].forEach(l => {
            bloco(x + 1.72, RODA * 2 + 0.1, l * (W / 2 - 0.3), 1.95, 0.05, 0.66, mat(0x111418, 0.8, 0.2));
            bloco(x + 0.42, RODA + 0.05, l * (W / 2 - 0.3), 0.02, 0.62, 0.62, mat(0x111418, 0.9, 0));   // apara-barro
        });
        x += comp + GAP;
    });
    cabine(x - GAP + 0.45, W);
    return { total, inicioCacamba, z0, GAP };
}

// Chao que recebe sombra (fica por baixo da grade).
function sombraChao(largura, profundidade) {
    const T = window.THREE;
    const chao = new T.Mesh(new T.PlaneGeometry(largura, profundidade), new T.ShadowMaterial({ opacity: 0.18 }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = 0.001;
    chao.receiveShadow = true;
    cena.conteudo.add(chao);
}

function desenharCaminhao(p, cfg) {
    limparConteudo();
    const C = calc();
    const lista = Array.from({ length: Math.max(0, cfg.qtd) }, () => p);
    const comps = cfg.bitrem ? [cfg.comp1, cfg.comp2] : [cfg.comp1];
    const m = C.montar(lista, { comps, largura: cfg.larg, altMax: cfg.alt, alinhar: atual.alinhar });
    const W = cfg.larg;
    const { total, inicioCacamba, z0 } = desenharVeiculo(comps, W);
    // pacotes
    const pecas = [], fitas = [];
    const faixa = W / m.fileiras;
    m.colocados.forEach(c => {
        const dim0 = tabuasDoPacote(c.p, { x: 0, y: 0, z: 0 });
        const ox = inicioCacamba[c.ci] + c.v * m.VAGA + (c.n * m.VAGA - dim0.comprimento) / 2;
        const oz = z0 + c.f * faixa + (faixa - dim0.largura) / 2;
        const oy = PISO + c.topo;
        const dim = tabuasDoPacote(c.p, { x: ox, y: oy, z: oz });
        colarEtiqueta(dim, { x: ox, y: oy, z: oz }, c.p, m.fileiras > 1 && c.f === 0 ? -1 : 1);
        pecas.push(...dim.pecas);
        fitas.push(...fitasDoPacote(dim, { x: ox, y: oy, z: oz }));
    });
    malhaInstanciada(pecas, COR_MADEIRA);
    cotas(caixaDe(pecas));
    malhaInstanciada(fitas, 0x16a34a, false);
    // limite de altura (linha vermelha nas laterais)
    const T = window.THREE;
    const yLim = PISO + cfg.alt;
    const geo = new T.BufferGeometry().setFromPoints([
        new T.Vector3(-total / 2 - CAB / 2, yLim, z0), new T.Vector3(-total / 2 - CAB / 2 + total, yLim, z0),
        new T.Vector3(-total / 2 - CAB / 2, yLim, -z0), new T.Vector3(-total / 2 - CAB / 2 + total, yLim, -z0)
    ]);
    cena.conteudo.add(new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0xdc2626 })));
    enquadrar(0, 1.6, 0, (total + CAB) / 2.2, [0.9, 0.6, 1.3]);
    const vol = m.colocados.reduce((s, c) => s + (c.p.esp / 100) * (c.p.larg / 100) * c.p.comp * (c.p.alt * c.p.cam + c.p.am), 0);
    let txt = `${m.colocados.length} pacote(s) no caminhão (${contagemCamadas(m.colocados)}) · ${fmt(vol, 3)} m³ · ${m.cacambas.reduce((s, cb) => s + cb.vagas, 0) * m.fileiras} vagas no piso`;
    if (m.sobra.length) txt += ` · ${m.sobra.length} não couberam`;
    return txt;
}

// ---------- carga de tora (Entrada) ----------
// As toras seguem o perfil das 8 alturas medidas (4 de cada lado, da frente para tras).
function alturaNoPonto(alts, t) {
    const v = alts.filter(a => a > 0);
    if (!v.length) return 0;
    if (alts.length < 2) return v[0];
    const pos = t * (alts.length - 1), i = Math.min(alts.length - 2, Math.floor(pos)), f = pos - i;
    const a = alts[i] || v[0], b = alts[i + 1] || a;
    return a + (b - a) * f;
}
function desenharTora(cfg) {
    limparConteudo();
    const T = window.THREE;
    const comp = cfg.comp, W = cfg.larg, d = cfg.diametro || 0.22, r = d / 2;
    const esq = (cfg.altEsq || []).map(Number), dir = (cfg.altDir || []).map(Number);
    const maxAlt = Math.max(0.5, ...esq, ...dir);
    const { inicioCacamba, z0 } = desenharVeiculo([comp], W, { fueiro: Math.max(2.4, Math.min(maxAlt + 0.25, 3.3)), florestal: true, semLaterais: !!cfg.deLado });
    const x0 = inicioCacamba[0];
    if (cfg.deLado) return desenharToraDeLado(cfg, x0, z0, comp, W, d, r, esq, dir);
    const nSeg = Math.max(1, Math.ceil(comp / 3.0));     // toras de ate ~3 m
    const segL = comp / nSeg;
    const colunas = Math.max(1, Math.floor(W / d));
    const lista = [];
    const passoY = d * 0.87;                               // empilhamento intercalado
    for (let s = 0; s < nSeg; s++) {
        const xc = x0 + segL * s + segL / 2;
        const t = (segL * s + segL / 2) / comp;
        // altura medida: o caminhao anda para a direita, medida 1 = frente (perto da cabine)
        const hEsq = alturaNoPonto(esq, 1 - t), hDir = alturaNoPonto(dir, 1 - t);
        for (let linha = 0; ; linha++) {
            const yc = PISO + r + linha * passoY;
            if (yc + r > PISO + Math.max(hEsq, hDir) + 0.001) break;
            const desloc = linha % 2 ? r : 0;
            for (let c = 0; c < colunas - (linha % 2 ? 1 : 0); c++) {
                const zc = z0 + r + desloc + c * d;
                const fz = (zc - z0) / W;                  // 0 = lado esquerdo, 1 = direito
                const hLocal = hEsq + (hDir - hEsq) * fz;
                if (yc + r > PISO + hLocal + 0.001) continue;
                const variacao = 0.9 + ((s * 7 + linha * 3 + c * 5) % 5) * 0.04;
                lista.push({ x: xc, y: yc, z: zc, raio: r * variacao, L: segL - 0.03 });
            }
        }
    }
    if (lista.length) {
        const geo = new T.CylinderGeometry(1, 1, 1, 14);
        geo.rotateZ(Math.PI / 2);
        const tx = texturaTora();
        const mats = [new T.MeshLambertMaterial({ color: 0xffffff, map: tx.casca }), new T.MeshLambertMaterial({ color: 0xffffff, map: tx.topo }), new T.MeshLambertMaterial({ color: 0xffffff, map: tx.topo })];
        const mesh = new T.InstancedMesh(geo, mats, lista.length);
        const m = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), esc = new T.Vector3();
        const giro = new T.Euler();
        lista.forEach((t, i) => { pos.set(t.x, t.y, t.z); esc.set(t.L, t.raio, t.raio); giro.set((i * 2.399) % 6.28, 0, 0); q.setFromEuler(giro); m.compose(pos, q, esc); mesh.setMatrixAt(i, m); });
        q.identity();
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        cena.conteudo.add(mesh);
    }
    // marcas das 8 medidas: poste vermelho na altura medida de cada ponto
    [[esq, z0 - 0.05], [dir, -z0 + 0.05]].forEach(([alts, zz]) => alts.forEach((h, i) => {
        if (!(h > 0)) return;
        const xx = x0 + comp - (comp / alts.length) * (i + 0.5);
        caixa(xx, PISO + h / 2, zz, 0.025, h, 0.025, 0xdc2626);
        caixa(xx, PISO + h, zz, 0.12, 0.025, 0.06, 0xdc2626);
    }));
    cotas({ x0, x1: x0 + comp, y0: PISO, y1: PISO + Math.max(0, ...esq, ...dir), z0, z1: -z0 }, { alt: `${fmt(Math.max(0, ...esq, ...dir), 2)} m (máx.)` });
    enquadrar(0, 1.6, 0, (comp + CAB) / 2.2, [0.9, 0.6, 1.3]);
    const todas = [...esq, ...dir].filter(a => a > 0);
    const media = todas.length ? Math.trunc(todas.reduce((s, a) => s + a, 0) / todas.length * 100) / 100 : 0;
    const vol = comp * W * media;
    return `${cfg.caminhao ? cfg.caminhao + ' · ' : ''}${fmt(comp, 2)} × ${fmt(W, 2)} m · altura média ${fmt(media, 2)} m · ${fmt(vol, 3)} m³ · desenho com toras de ~${Math.round(d * 100)} cm (ilustrativo; o volume vem das medidas)`;
}

// Toras atravessadas: cada tora fica de lado na cacamba (comprimento = largura do caminhao),
// empilhadas ao longo do comprimento. A altura de cada ponto vem das medidas (media esquerda/direita).
function desenharToraDeLado(cfg, x0, z0, comp, W, d, r, esq, dir) {
    const T = window.THREE;
    const colunas = Math.max(1, Math.floor(comp / d));
    const passoY = d * 0.87;
    const lista = [];
    for (let linha = 0; ; linha++) {
        const yc = PISO + r + linha * passoY;
        let algum = false;
        const desloc = linha % 2 ? r : 0;
        for (let c = 0; c < colunas - (linha % 2 ? 1 : 0); c++) {
            const xc = x0 + r + desloc + c * d;
            const t = (xc - x0) / comp;
            const h = (alturaNoPonto(esq, 1 - t) + alturaNoPonto(dir, 1 - t)) / 2;
            if (yc + r > PISO + h + 0.001) continue;
            algum = true;
            const variacao = 0.9 + ((linha * 3 + c * 5) % 5) * 0.04;
            lista.push({ x: xc, y: yc, z: 0, raio: r * variacao, L: W - 0.02 - ((linha + c) % 3) * 0.04 });
        }
        if (!algum || linha > 60) break;
    }
    if (lista.length) {
        const geo = new T.CylinderGeometry(1, 1, 1, 14);
        geo.rotateX(Math.PI / 2); // eixo da tora no z (atravessada)
        const tx = texturaTora();
        const mats = [new T.MeshLambertMaterial({ color: 0xffffff, map: tx.casca }), new T.MeshLambertMaterial({ color: 0xffffff, map: tx.topo }), new T.MeshLambertMaterial({ color: 0xffffff, map: tx.topo })];
        const mesh = new T.InstancedMesh(geo, mats, lista.length);
        const m = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), esc = new T.Vector3();
        lista.forEach((t, i) => { pos.set(t.x, t.y, t.z); esc.set(t.raio, t.raio, t.L); m.compose(pos, q, esc); mesh.setMatrixAt(i, m); });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        cena.conteudo.add(mesh);
    }
    [[esq, z0 - 0.05], [dir, -z0 + 0.05]].forEach(([alts, zz]) => alts.forEach((h, i) => {
        if (!(h > 0)) return;
        const xx = x0 + comp - (comp / alts.length) * (i + 0.5);
        caixa(xx, PISO + h / 2, zz, 0.025, h, 0.025, 0xdc2626);
        caixa(xx, PISO + h, zz, 0.12, 0.025, 0.06, 0xdc2626);
    }));
    cotas({ x0, x1: x0 + comp, y0: PISO, y1: PISO + Math.max(0, ...esq, ...dir), z0, z1: -z0 }, { alt: `${fmt(Math.max(0, ...esq, ...dir), 2)} m (máx.)` });
    enquadrar(0, 1.6, 0, (comp + CAB) / 2.2, [0.9, 0.6, 1.3]);
    const todas = [...esq, ...dir].filter(a => a > 0);
    const media = todas.length ? Math.trunc(todas.reduce((s, a) => s + a, 0) / todas.length * 100) / 100 : 0;
    return `${cfg.caminhao ? cfg.caminhao + ' · ' : ''}Toras de lado · ${fmt(comp, 2)} × ${fmt(W, 2)} m · altura média ${fmt(media, 2)} m · ${fmt(comp * W * media, 3)} m³ · desenho ilustrativo; o volume vem das medidas`;
}

window.abrirCargaTora3D = async function(cfg) {
    if (!(cfg?.comp > 0 && cfg?.larg > 0) || ![...(cfg.altEsq || []), ...(cfg.altDir || [])].some(a => a > 0)) {
        alert('Preencha comprimento, largura e as alturas da carga para ver em 3D.');
        return;
    }
    const modal = garantirModal();
    modal.style.display = 'flex';
    document.getElementById('v3dTitulo').textContent = 'Carga de tora';
    atual.modo = 'tora';
    atual.tora = { ...cfg, deLado: cfg.deLado ?? (Number(cfg.comp) >= 7.75) }; // caminhao comprido costuma vir com tora de lado
    try { await garantirThree(); }
    catch (_) { document.getElementById('v3dPalco').innerHTML = '<div class="v3d-carregando">Não foi possível carregar o 3D. Verifique a internet e tente de novo.</div>'; return; }
    if (!cena) criarCena(document.getElementById('v3dPalco'));
    else if (!document.getElementById('v3dPalco').contains(cena.renderer.domElement)) document.getElementById('v3dPalco').appendChild(cena.renderer.domElement);
    desenhar();
};

// ---------- palete montado ----------
// Eixos: x = comprimento do palete, z = largura. Ordem de baixo para cima: tabuas de baixo, blocos, ligacao, tabuas de cima.
function distribuir(n, espaco, tamanho) {
    if (n <= 1) return [(espaco - tamanho) / 2];
    return Array.from({ length: n }, (_, i) => (espaco - tamanho) * i / (n - 1));
}
function pecasDoPalete(m) {
    const L = Number(m.comprimento) || 1.2, W = Number(m.largura) || 1.0, folga = 0.002;
    const por = pos => (m.componentes || []).filter(c => c.posicao === pos && Number(c.qtd) > 0);
    const out = [];       // pecas: {x,y,z,sx,sy,sz,tom,camada}
    const pregos = [];    // cabecas de prego: {x,y,z,camada}
    const pos = { inferior: [], bloco: [], ligacao: [], superior: [] };
    let y = 0, camadaIdx = 0;
    const camada = (nome, lista, desenha) => {
        let altura = 0;
        lista.forEach(c => { const h = (Number(c.esp) || 0) / 100; altura = Math.max(altura, h); desenha(c, h, camadaIdx); });
        pos[nome].y = y;
        pos[nome].h = altura;
        y += altura;
        if (lista.length) camadaIdx++;
    };
    camada('inferior', por('inferior'), (c, h, k) => {
        const l = (Number(c.larg) || 0) / 100, comp = Number(c.comp) || L;
        distribuir(Number(c.qtd), W, l).forEach(z => {
            out.push({ x: (L - comp) / 2 + comp / 2, y: y + h / 2, z: z + l / 2, sx: comp - folga, sy: h - folga, sz: l - folga, tom: 0, camada: k });
            pos.inferior.push({ zc: z + l / 2, l });
        });
    });
    camada('bloco', por('bloco'), (c, h, k) => {
        const n = Number(c.qtd), cols = n === 9 ? 3 : Math.ceil(Math.sqrt(n)), linhas = Math.ceil(n / cols);
        const bx = Number(c.comp) || 0.15, bz = (Number(c.larg) || 0) / 100;
        const xs = distribuir(cols, L, bx), zs = distribuir(linhas, W, bz);
        pos.bloco.xs = xs.map(x => x + bx / 2);
        let i = 0;
        zs.forEach(z => xs.forEach(x => { if (i++ < n) out.push({ x: x + bx / 2, y: y + h / 2, z: z + bz / 2, sx: bx - folga, sy: h - folga, sz: bz - folga, tom: 1, camada: k }); }));
    });
    camada('ligacao', por('ligacao'), (c, h, k) => {
        const l = (Number(c.larg) || 0) / 100, comp = Number(c.comp) || W;
        distribuir(Number(c.qtd), L, l).forEach(x => {
            out.push({ x: x + l / 2, y: y + h / 2, z: (W - comp) / 2 + comp / 2, sx: l - folga, sy: h - folga, sz: comp - folga, tom: 2, camada: k });
            pos.ligacao.push({ xc: x + l / 2 });
        });
    });
    camada('superior', por('superior'), (c, h, k) => {
        const l = (Number(c.larg) || 0) / 100, comp = Number(c.comp) || L;
        distribuir(Number(c.qtd), W, l).forEach(z => {
            out.push({ x: (L - comp) / 2 + comp / 2, y: y + h / 2, z: z + l / 2, sx: comp - folga, sy: h - folga, sz: l - folga, tom: 0, camada: k });
            pos.superior.push({ zc: z + l / 2, l, k });
        });
    });
    // pregos: 2 por cruzamento tabua de cima x ligacao (por cima) e tabua de baixo x coluna de blocos (por baixo)
    const kSup = pos.superior[0]?.k;
    pos.superior.forEach(t => pos.ligacao.forEach(g => [-1, 1].forEach(s => pregos.push({ x: g.xc, y, z: t.zc + s * t.l / 4, camada: kSup, topo: true }))));
    (pos.bloco.xs || []).forEach(xc => pos.inferior.forEach(t => [-1, 1].forEach(s => pregos.push({ x: xc, y: 0, z: t.zc + s * t.l / 4, camada: 0, topo: false }))));
    return { pecas: out, pregos, L, W, altura: y };
}

// Quantidade de pregos que o desenho usa (sugestao para a receita).
window.sugerirPregosPalete = m => pecasDoPalete(m).pregos.length;

function desenharPregos(lista) {
    const T = window.THREE;
    if (!lista.length) return;
    const geo = new T.CylinderGeometry(0.0045, 0.0045, 0.003, 10);
    const mesh = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ color: 0x374151 }), lista.length);
    const mtx = new T.Matrix4();
    lista.forEach((p, i) => { mtx.makeTranslation(p.x, p.y, p.z); mesh.setMatrixAt(i, mtx); });
    mesh.instanceMatrix.needsUpdate = true;
    cena.conteudo.add(mesh);
}

// Corte das pecas: a madeira inteira (ex.: viga de 2,40) dividida nos toquinhos que saem dela.
function desenharCortePalete(m) {
    limparConteudo();
    const comps = (m.componentes || []).filter(c => Number(c.qtd) > 0);
    const pecas = [], sobras = [];
    const linhasInfo = [];
    let z = 0, maxComp = 1.2;
    comps.forEach(c => {
        const e = (Number(c.esp) || 0) / 100, l = (Number(c.larg) || 0) / 100, comp = Number(c.comp) || 0;
        const origem = Number(c.origem?.comp) || 0;
        const rend = origem > comp + 0.001 && comp > 0 ? Math.floor(origem / comp + 0.001) : 1;
        const sobra = rend > 1 ? Math.max(0, origem - rend * comp) : 0;
        const gap = rend > 1 ? 0.035 : 0;
        const total = rend * comp + (rend - 1) * gap + (sobra > 0.005 ? gap + sobra : 0);
        maxComp = Math.max(maxComp, total);
        let x = -total / 2;
        for (let i = 0; i < rend; i++) { pecas.push({ x: x + comp / 2, y: e / 2, z: z + l / 2, sx: comp, sy: e, sz: l, tom: i % 2 }); x += comp + gap; }
        if (sobra > 0.005) sobras.push({ x: x + sobra / 2, y: e / 2, z: z + l / 2, sx: sobra, sy: e, sz: l });
        linhasInfo.push(`${POS_NOME[c.posicao] || 'Peça'}: ${rend > 1 ? `1 peça de ${fmt(origem, 2)} m → ${rend} toquinhos de ${fmt(comp, 2)} m${sobra > 0.005 ? ` (sobra ${fmt(sobra * 100, 0)} cm)` : ''}` : `${fmt(Number(c.esp), 1)} × ${fmt(Number(c.larg), 1)} × ${fmt(comp, 2)} m`} · ${c.qtd} por palete`);
        z += l + 0.25;
    });
    const deslocZ = z / 2;
    grade(Math.max(3, Math.ceil(maxComp + 1)), 0.1, 0.5);
    malhaInstanciada(pecas.map(p => ({ ...p, z: p.z - deslocZ })), COR_MADEIRA);
    malhaInstanciada(sobras.map(p => ({ ...p, z: p.z - deslocZ })), 0x9ca3af, false);
    enquadrar(0, 0.05, 0, Math.max(maxComp, z) / 2.8, [0.3, 0.9, 1]);
    return linhasInfo.join(' · ');
}

const POS_NOME = { superior: 'Tábua de cima', ligacao: 'Tábua de ligação', bloco: 'Bloco', inferior: 'Tábua de baixo', outro: 'Outro' };

function desenharPaletesCaminhao(m, cfg) {
    limparConteudo();
    const comps = cfg.bitrem ? [cfg.comp1, cfg.comp2] : [cfg.comp1];
    const W = cfg.larg;
    const base = pecasDoPalete(m);
    const hPal = base.altura;
    const { inicioCacamba, z0 } = desenharVeiculo(comps, W);
    // escolhe a orientacao que cabe mais pilhas no piso
    const opcoes = [[base.L, base.W, false], [base.W, base.L, true]].map(([px, pz, girado]) => {
        const porLinha = comps.map(c => Math.floor(c / px + 0.001));
        const fileiras = Math.floor(W / pz + 0.001);
        return { px, pz, girado, porLinha, fileiras, pilhas: porLinha.reduce((s, n) => s + n, 0) * fileiras };
    });
    const o = opcoes[0].pilhas >= opcoes[1].pilhas ? opcoes[0] : opcoes[1];
    const porPilha = Math.max(0, Math.floor(cfg.alt / hPal + 0.001));
    const capacidade = o.pilhas * porPilha;
    const qtd = Math.min(Math.max(0, cfg.qtd), capacidade);
    // Colunas (no comprimento) com uma pilha em cada fileira. Pilhas cheias e, no maximo, uma coluna
    // incompleta, dividida entre as fileiras para nao pender de lado. 'Carga' (base) coloca o bloco
    // de colunas atras, no centro ou na frente; 'Pilha incompleta' (em cima) escolhe onde fica a coluna baixa.
    const al = atual.alinhar || {};
    const porColuna = porPilha * o.fileiras;
    const colunasTot = porColuna ? Math.ceil(qtd / porColuna) : 0;
    const ordemCi = comps.map((_, ci) => ci).sort((a, b) => inicioCacamba[b] - inicioCacamba[a]); // da cabine para tras
    const vagas = [];
    let faltamCol = colunasTot, restantePal = qtd;
    ordemCi.forEach(ci => {
        const ncol = Math.min(o.porLinha[ci], faltamCol);
        faltamCol -= ncol;
        if (!ncol) return;
        const livre = comps[ci] - ncol * o.px;
        const ini = al.base === 'tras' ? 0 : al.base === 'frente' ? livre : livre / 2;
        const cols = Array.from({ length: ncol }, (_, k) => ({ ci, x: inicioCacamba[ci] + ini + k * o.px }));
        cols.forEach(c => vagas.push(c));
    });
    const totalCol = vagas.length;
    const incompleta = qtd % porColuna ? (al.cima === 'tras' ? 0 : al.cima === 'frente' ? totalCol - 1 : Math.floor((totalCol - 1) / 2)) : -1;
    const ordem = vagas.map((v, k) => k).sort((a, b) => (a === incompleta) - (b === incompleta));
    const alturas = new Array(totalCol).fill(0);
    ordem.forEach(k => { const n = Math.min(porColuna, restantePal); alturas[k] = n; restantePal -= n; });
    const pilhasPos = [];
    vagas.forEach((v, k) => {
        const n = alturas[k];
        for (let f = 0; f < o.fileiras; f++) {
            const nf = Math.floor(n / o.fileiras) + (f < n % o.fileiras ? 1 : 0);
            pilhasPos.push({ x: v.x, f, n: nf });
        }
    });
    const pecas = [];
    pilhasPos.forEach(v => {
        const n = v.n;
        const sobraZ = W - o.fileiras * o.pz;
        const ox = v.x;
        const oz = z0 + sobraZ / 2 + v.f * o.pz;
        for (let k = 0; k < n; k++) {
            const oy = PISO + k * hPal;
            base.pecas.forEach(b => {
                const bx = o.girado ? b.z : b.x, bz = o.girado ? b.x : b.z;
                pecas.push({ x: ox + bx, y: oy + b.y, z: oz + bz, sx: o.girado ? b.sz : b.sx, sy: b.sy, sz: o.girado ? b.sx : b.sz, tom: b.tom });
            });
        }
    });
    malhaInstanciada(pecas, COR_MADEIRA);
    cotas(caixaDe(pecas));
    const total = comps.reduce((s, c) => s + c, 0);
    enquadrar(0, 1.6, 0, (total + CAB) / 2.2, [0.9, 0.6, 1.3]);
    return `Cabem ${capacidade.toLocaleString('pt-BR')} paletes (${o.pilhas} pilhas × ${porPilha} por pilha, palete de ${fmt(hPal * 100, 1)} cm) · desenhados ${qtd.toLocaleString('pt-BR')}${cfg.qtd > capacidade ? ` · ${(cfg.qtd - capacidade).toLocaleString('pt-BR')} não couberam` : ''}`;
}

function desenharPalete(m, vista = 'montado') {
    if (vista === 'corte') return desenharCortePalete(m);
    if (vista === 'caminhao') return desenharPaletesCaminhao(m, atual.caminhaoPalete);
    limparConteudo();
    grade(3, 0.1, 0.5);
    const p = pecasDoPalete(m);
    const sobe = vista === 'explodido' ? 0.16 : 0; // pecas soltas: separa as camadas
    malhaInstanciada(p.pecas.map(b => ({ ...b, x: b.x - p.L / 2, y: b.y + b.camada * sobe, z: b.z - p.W / 2 })), COR_MADEIRA);
    if (vista !== 'explodido') cotas({ x0: -p.L / 2, x1: p.L / 2, y0: 0, y1: p.altura, z0: -p.W / 2, z1: p.W / 2 }, { alt: `${fmt(p.altura * 100, 1)} cm` });
    desenharPregos(p.pregos.map(g => ({ x: g.x - p.L / 2, y: g.y + (g.camada || 0) * sobe + (g.topo ? 0.0015 : -0.0015), z: g.z - p.W / 2 })));
    const alturaVista = p.altura + sobe * 3;
    enquadrar(0, alturaVista / 2, 0, Math.max(p.L, p.W, alturaVista) / 1.7, [1, 0.8, 1.2]);
    const pecas = (m.componentes || []).reduce((s, c) => s + (Number(c.qtd) || 0), 0);
    const m3 = (m.componentes || []).reduce((s, c) => s + (Number(c.qtd) || 0) * (Number(c.esp) / 100) * (Number(c.larg) / 100) * (Number(c.comp) || 0), 0);
    const pregosTxt = m.pregos ? `${m.pregos} pregos` : `${p.pregos.length} pregos no desenho`;
    return `Palete ${fmt(p.W, 2)} × ${fmt(p.L, 2)} m · altura ${fmt(p.altura * 100, 1)} cm · ${pecas} peças · ${fmt(m3, 4)} m³ · ${pregosTxt}${vista === 'explodido' ? ' · peças soltas: de baixo para cima tábuas de baixo, blocos, ligação e tábuas de cima' : ''}`;
}

// ---------- modal ----------
let atual = { modo: 'madeira', palete: null, paleteVista: 'montado', tora: null, caminhaoPalete: { qtd: 216, comp1: 7.2, comp2: 7.2, larg: 2.4, alt: 2.6, bitrem: false }, produto: null, aba: 'pacote', alinhar: { base: 'centro', cima: 'centro', chapeu: 'centro' }, caminhao: { qtd: 22, comp1: 7.2, comp2: 7.2, larg: 2.4, alt: 2.6, bitrem: false } };

function garantirModal() {
    let modal = document.getElementById('modalVisualizador3D');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'modalVisualizador3D';
    modal.className = 'v3d-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'v3dTitulo');
    modal.innerHTML = `
      <div class="v3d-caixa">
        <header class="v3d-topo">
          <div><h3 id="v3dTitulo">Visualização 3D</h3><p id="v3dInfo"></p></div>
          <button type="button" class="v3d-fechar" aria-label="Fechar" onclick="window.fecharVisualizador3D()">×</button>
        </header>
        <div class="v3d-barra">
          <div class="v3d-abas" role="tablist">
            <button type="button" role="tab" data-aba="tabua">Tábua</button>
            <button type="button" role="tab" data-aba="pacote">Pacote</button>
            <button type="button" role="tab" data-aba="caminhao">Caminhão</button>
          </div>
          <div class="v3d-abas" id="v3dPalVistas" role="tablist" hidden>
            <button type="button" role="tab" data-pvista="montado">Montado</button>
            <button type="button" role="tab" data-pvista="explodido">Peças soltas</button>
            <button type="button" role="tab" data-pvista="corte">Corte das peças</button>
            <button type="button" role="tab" data-pvista="caminhao">No caminhão</button>
          </div>
          <div class="v3d-cfg" id="v3dPac" hidden>
            <label>Fiadas<input id="v3dPacAlt" type="number" min="1" step="1"></label>
            <label>Por fiada<input id="v3dPacCam" type="number" min="1" step="1"></label>
            <label><span id="v3dPacAmRot">Amarras</span><input id="v3dPacAm" type="number" min="0" step="1"></label>
            <button type="button" class="v3d-pac-orig" id="v3dPacOrig">Voltar ao cadastro</button>
            <button type="button" class="v3d-pac-orig v3d-pac-salvar" id="v3dPacSalvar" hidden>Salvar no cadastro</button>
            <button type="button" class="v3d-pac-orig v3d-peca-tirar" id="v3dPecaTirar" hidden>Tirar peças</button>
            <button type="button" class="v3d-pac-orig" id="v3dPecaRepor" hidden>Repor peças</button>
          </div>
          <div class="v3d-cfg" id="v3dToraCfg" hidden>
            <label class="v3d-check"><input id="v3dToraLado" type="checkbox"> Toras atravessadas (de lado, sem fueiros laterais)</label>
          </div>
          <div class="v3d-cfg" id="v3dCfg" hidden>
            <label id="v3dWrapQtd"><span id="v3dQtdRotulo">Pacotes</span><input id="v3dQtd" type="number" min="1" step="1"></label>
            <label>Caçamba (m)<input id="v3dComp1" type="number" step="0.1"></label>
            <label class="v3d-check"><input id="v3dBitrem" type="checkbox"> Bitrem</label>
            <label id="v3dWrapComp2" hidden>Caçamba 2 (m)<input id="v3dComp2" type="number" step="0.1"></label>
            <label>Largura (m)<input id="v3dLarg" type="number" step="0.05"></label>
            <label>Altura máx. (m)<input id="v3dAlt" type="number" step="0.05"></label>
            <label class="v3d-al"><span id="v3dRotAlBase">Base</span><select id="v3dAlBase"><option value="tras">Trás</option><option value="centro">Centro</option><option value="frente">Frente</option></select></label>
            <label class="v3d-al"><span id="v3dRotAlCima">Em cima</span><select id="v3dAlCima"><option value="tras">Trás</option><option value="centro">Centro</option><option value="frente">Frente</option></select></label>
            <label class="v3d-al" id="v3dWrapAlChapeu">Chapéu<select id="v3dAlChapeu"><option value="tras">Trás</option><option value="centro">Centro</option><option value="frente">Frente</option></select></label>
          </div>
        </div>
        <div class="v3d-corpo">
          <aside class="v3d-lista" id="v3dLista" hidden></aside>
          <div class="v3d-palco" id="v3dPalco"><div class="v3d-carregando">Carregando 3D…</div></div>
        </div>
        <p class="v3d-dica">Arraste para girar · role ou pince para aproximar · arraste com dois dedos (ou botão direito fora do pacote) para mover. Na carga: arraste o pacote com a mãozinha; botão direito abre as opções. Na aba Pacote: clique numa tábua ou amarra para selecionar e tirar. Grade: quadradinho fino = 10 cm, linha forte = 50 cm (no caminhão: 50 cm e 1 m).</p>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => { atual.aba = b.dataset.aba; desenhar(); }));
    modal.querySelectorAll('[data-pvista]').forEach(b => b.addEventListener('click', () => { atual.paleteVista = b.dataset.pvista; desenhar(); }));
    const $ = id => document.getElementById(id);
    const lerCfg = () => {
        const alvo = atual.modo === 'palete' ? 'caminhaoPalete' : 'caminhao';
        if (atual.modo === 'montar' && montagem) montagem.recalcular = true;
        atual[alvo] = {
            qtd: Math.max(1, parseInt($('v3dQtd').value, 10) || (atual[alvo]?.qtd || 1)),
            comp1: Number($('v3dComp1').value) || 7.2,
            comp2: Number($('v3dComp2').value) || 7.2,
            larg: Number($('v3dLarg').value) || 2.4,
            alt: Number($('v3dAlt').value) || 2.6,
            bitrem: $('v3dBitrem').checked
        };
        $('v3dWrapComp2').hidden = !atual[alvo].bitrem;
        atual.alinhar = { base: $('v3dAlBase').value, cima: $('v3dAlCima').value, chapeu: $('v3dAlChapeu').value };
        desenhar();
    };
    ['v3dAlBase', 'v3dAlCima', 'v3dAlChapeu'].forEach(id => $(id).addEventListener('change', lerCfg));
    $('v3dToraLado').addEventListener('change', () => { if (atual.tora) { atual.tora.deLado = $('v3dToraLado').checked; desenhar(); } });
    ['v3dQtd', 'v3dComp1', 'v3dComp2', 'v3dLarg', 'v3dAlt'].forEach(id => $(id).addEventListener('change', lerCfg));
    // mudar a configuracao do pacote (so no 3D, nao grava no cadastro)
    const lerPac = e => {
        if (!atual.produto) return;
        const alt = Math.max(1, parseInt($('v3dPacAlt').value, 10) || atual.produto.alt);
        const cam = Math.max(1, parseInt($('v3dPacCam').value, 10) || atual.produto.cam);
        let am = Math.max(0, parseInt($('v3dPacAm').value, 10) || 0);
        const novo = { ...atual.produto, alt, cam };
        if (e?.target?.id !== 'v3dPacAm' && (!calc().ehViga(novo) || Number(novo.comp) <= 1.21)) am = amarrasPadrao(novo);
        atual.produto = { ...novo, am };
        atual.pecaSel = new Set(); atual.pecaFora = new Set();
        atual.manterCamera = true;
        desenhar();
    };
    // muda enquanto digita (com uma pausinha para nao redesenhar a cada tecla)
    let esperaPac = null;
    ['v3dPacAlt', 'v3dPacCam', 'v3dPacAm'].forEach(id => $(id).addEventListener('input', e => {
        clearTimeout(esperaPac);
        esperaPac = setTimeout(() => { if (String(e.target.value).trim() !== '') lerPac(e); }, 250);
    }));
    $('v3dPecaTirar').addEventListener('click', () => {
        atual.pecaFora = atual.pecaFora || new Set();
        (atual.pecaSel || new Set()).forEach(k => atual.pecaFora.add(k));
        atual.pecaSel = new Set();
        atual.manterCamera = true;
        desenhar();
    });
    // grava a configuracao do pacote no Cadastro de Medidas (com auditoria, pelo FS.updateDoc)
    $('v3dPacSalvar').addEventListener('click', async () => {
        const p = atual.produto;
        if (!p?.id) return;
        const pecas = p.alt * p.cam + (p.am || 0);
        if (!confirm(`Salvar no cadastro: ${p.alt} × ${p.cam}${p.am ? ` + ${p.am}` : ''} = ${pecas} peças por pacote?`)) return;
        const bt = $('v3dPacSalvar');
        bt.disabled = true;
        try {
            await window.FS.updateDoc('produtos', p.id, { alturas: p.alt, larguraPacote: p.cam, amarras: p.am || 0, pecasPorPacote: pecas });
            atual.produtoOriginal = { ...p };
            document.dispatchEvent(new Event('produtosAlteradosNo3D'));
            desenhar();
            $('v3dInfo').textContent = 'Configuração salva no Cadastro de Medidas. ' + $('v3dInfo').textContent;
        } catch (e) {
            alert(e?.code === 'permission-denied' ? 'Sem permissão para alterar o cadastro.' : 'Não foi possível salvar. Tente de novo.');
        } finally { bt.disabled = false; }
    });
    $('v3dPecaRepor').addEventListener('click', () => { atual.pecaFora = new Set(); atual.pecaSel = new Set(); atual.manterCamera = true; desenhar(); });
    $('v3dPacOrig').addEventListener('click', () => { if (atual.produtoOriginal) { atual.produto = { ...atual.produtoOriginal }; atual.pecaSel = new Set(); atual.pecaFora = new Set(); desenhar(); } });
    $('v3dBitrem').addEventListener('change', lerCfg);
    // nao fecha ao clicar fora: so pelo X (o 3D ocupa a tela toda)
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') window.fecharVisualizador3D(); });
    return modal;
}

function desenhar() {
    const modal = document.getElementById('modalVisualizador3D');
    if (!modal || !cena) return;
    const abas = modal.querySelector('.v3d-abas');
    const vistas = document.getElementById('v3dPalVistas');
    const lista = document.getElementById('v3dLista');
    if (lista) lista.hidden = atual.modo !== 'montar' && atual.modo !== 'patio';
    if (atual.modo !== 'patio' && cena.scene) ajustarSombra(12);
    // alinhamento da carga: so na madeira serrada (caminhao do cadastro e montador)
    const palCam = atual.modo === 'palete' && atual.paleteVista === 'caminhao';
    const mostrarAl = palCam || atual.modo === 'montar' || (atual.modo === 'madeira' && atual.aba === 'caminhao');
    modal.querySelectorAll('.v3d-al').forEach(l => { l.hidden = !mostrarAl; });
    document.getElementById('v3dWrapAlChapeu').hidden = !mostrarAl || palCam;
    document.getElementById('v3dRotAlBase').textContent = palCam ? 'Carga' : 'Base';
    document.getElementById('v3dRotAlCima').textContent = palCam ? 'Pilha incompleta' : 'Em cima';
    document.getElementById('v3dToraCfg').hidden = atual.modo !== 'tora';
    if (atual.tora) document.getElementById('v3dToraLado').checked = !!atual.tora.deLado;
    document.getElementById('v3dAlBase').value = atual.alinhar.base;
    document.getElementById('v3dAlCima').value = atual.alinhar.cima;
    document.getElementById('v3dAlChapeu').value = atual.alinhar.chapeu;
    if (atual.modo !== 'madeira') document.getElementById('v3dPac').hidden = true;
    document.getElementById('v3dWrapQtd').hidden = atual.modo === 'montar';
    if (atual.modo === 'montar') {
        if (abas) abas.hidden = true;
        if (vistas) vistas.hidden = true;
        document.getElementById('v3dCfg').hidden = false;
        const c = atual.caminhao;
        document.getElementById('v3dComp1').value = c.comp1;
        document.getElementById('v3dComp2').value = c.comp2;
        document.getElementById('v3dLarg').value = c.larg;
        document.getElementById('v3dAlt').value = c.alt;
        document.getElementById('v3dBitrem').checked = c.bitrem;
        document.getElementById('v3dWrapComp2').hidden = !c.bitrem;
        cena.redimensionar();
        if (montagem?.recalcular) {
            // mudou o caminhao: recoloca os mesmos pacotes nas vagas novas
            montarAutomatico(montagem.colocados.map(c2 => c2.u));
            montagem.recalcular = false;
        }
        desenharMontagem();
        return;
    }
    if (atual.modo === 'patio') {
        if (abas) abas.hidden = true;
        if (vistas) vistas.hidden = true;
        document.getElementById('v3dCfg').hidden = true;
        cena.redimensionar();
        desenharPatio();
        return;
    }
    if (atual.modo === 'tora') {
        if (abas) abas.hidden = true;
        if (vistas) vistas.hidden = true;
        document.getElementById('v3dCfg').hidden = true;
        cena.redimensionar();
        document.getElementById('v3dInfo').textContent = desenharTora(atual.tora);
        return;
    }
    if (atual.modo === 'palete') {
        if (abas) abas.hidden = true;
        if (vistas) vistas.hidden = false;
        modal.querySelectorAll('[data-pvista]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pvista === atual.paleteVista)));
        const cfgEl = document.getElementById('v3dCfg');
        cfgEl.hidden = atual.paleteVista !== 'caminhao';
        document.getElementById('v3dQtdRotulo').textContent = 'Paletes';
        if (atual.paleteVista === 'caminhao') {
            const c = atual.caminhaoPalete;
            document.getElementById('v3dQtd').value = c.qtd;
            document.getElementById('v3dComp1').value = c.comp1;
            document.getElementById('v3dComp2').value = c.comp2;
            document.getElementById('v3dLarg').value = c.larg;
            document.getElementById('v3dAlt').value = c.alt;
            document.getElementById('v3dBitrem').checked = c.bitrem;
            document.getElementById('v3dWrapComp2').hidden = !c.bitrem;
        }
        cena.redimensionar();
        document.getElementById('v3dInfo').textContent = desenharPalete(atual.palete, atual.paleteVista);
        return;
    }
    if (abas) abas.hidden = false;
    if (vistas) vistas.hidden = true;
    document.getElementById('v3dQtdRotulo').textContent = 'Pacotes';
    if (!atual.produto) return;
    modal.querySelectorAll('[data-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === atual.aba)));
    const pac = document.getElementById('v3dPac');
    pac.hidden = atual.aba === 'tabua';
    document.getElementById('v3dPacAlt').value = atual.produto.alt;
    document.getElementById('v3dPacCam').value = atual.produto.cam;
    document.getElementById('v3dPacAm').value = atual.produto.am || 0;
    document.getElementById('v3dPacAmRot').textContent = calc().ehViga(atual.produto) && atual.produto.comp > 1.21 ? 'Peças a mais' : 'Amarras';
    const o = atual.produtoOriginal;
    const mudou = !!o && !(o.alt === atual.produto.alt && o.cam === atual.produto.cam && (o.am || 0) === (atual.produto.am || 0));
    document.getElementById('v3dPacOrig').hidden = !mudou;
    document.getElementById('v3dPacSalvar').hidden = !mudou || !atual.produto.id;
    const cfg = document.getElementById('v3dCfg');
    cfg.hidden = atual.aba !== 'caminhao';
    const c = atual.caminhao;
    document.getElementById('v3dQtd').value = c.qtd;
    document.getElementById('v3dComp1').value = c.comp1;
    document.getElementById('v3dComp2').value = c.comp2;
    document.getElementById('v3dLarg').value = c.larg;
    document.getElementById('v3dAlt').value = c.alt;
    document.getElementById('v3dBitrem').checked = c.bitrem;
    document.getElementById('v3dWrapComp2').hidden = !c.bitrem;
    cena.redimensionar();
    const p = atual.produto;
    let info = '';
    if (atual.aba === 'tabua') info = desenharTabua(p);
    else if (atual.aba === 'pacote') info = desenharPacote(p);
    else info = desenharCaminhao(p, c);
    document.getElementById('v3dInfo').textContent = info;
}

async function abrir(produto) {
    const p = produtoParaPacote(produto);
    if (!(p.esp > 0 && p.larg > 0 && p.comp > 0)) {
        alert('Preencha espessura, largura e comprimento da madeira para ver em 3D.');
        return;
    }
    if (!calc()) { alert('Módulo de montagem ainda carregando. Tente novamente em instantes.'); return; }
    const modal = garantirModal();
    modal.style.display = 'flex';
    document.getElementById('v3dTitulo').textContent = `${p.nome} · ${p.classe}ª classe · ${fmt(p.esp, 1)} × ${fmt(p.larg, 1)} × ${fmt(p.comp, 2)}`;
    atual.produto = p;
    atual.produtoOriginal = { ...p };
    atual.pecaSel = new Set(); atual.pecaFora = new Set();
    atual.modo = 'madeira';
    try {
        await garantirThree();
    } catch (_) {
        document.getElementById('v3dPalco').innerHTML = '<div class="v3d-carregando">Não foi possível carregar o 3D. Verifique a internet e tente de novo.</div>';
        return;
    }
    if (!cena) criarCena(document.getElementById('v3dPalco'));
    else if (!document.getElementById('v3dPalco').contains(cena.renderer.domElement)) document.getElementById('v3dPalco').appendChild(cena.renderer.domElement);
    instalarSelecaoPecas();
    desenhar();
}

window.abrirVisualizador3D = abrir;
window.abrirPalete3D = async function(modelo) {
    if (!modelo?.componentes?.length) { alert('Adicione os componentes do palete para ver em 3D.'); return; }
    const modal = garantirModal();
    modal.style.display = 'flex';
    document.getElementById('v3dTitulo').textContent = modelo.nome || 'Palete';
    atual.modo = 'palete';
    atual.paleteVista = 'montado';
    atual.palete = JSON.parse(JSON.stringify(modelo));
    try { await garantirThree(); }
    catch (_) { document.getElementById('v3dPalco').innerHTML = '<div class="v3d-carregando">Não foi possível carregar o 3D. Verifique a internet e tente de novo.</div>'; return; }
    if (!cena) criarCena(document.getElementById('v3dPalco'));
    else if (!document.getElementById('v3dPalco').contains(cena.renderer.domElement)) document.getElementById('v3dPalco').appendChild(cena.renderer.domElement);
    desenhar();
};
window.fecharVisualizador3D = function() {
    const modal = document.getElementById('modalVisualizador3D');
    if (modal) modal.style.display = 'none';
};

// ---------- montador de carga (arrastar pacotes no caminhao) ----------
// Somente planejamento: nada e gravado. Os pacotes vem do romaneio ou do Controle de Producao.
let montagem = null;

function grupoChave(p) { return [p.classe, p.esp, p.larg, p.comp, p.alt, p.cam, p.am].join('|'); }

function geometriaMontagem() {
    const C = calc();
    const c = atual.caminhao;
    const comps = c.bitrem ? [c.comp1, c.comp2] : [c.comp1];
    const unidades = montagem.unidades;
    const VAGA = unidades.length && unidades.every(u => u.p.comp <= 1.0 + 0.001) ? 1.0 : 1.2;
    const maiorLarg = Math.max(1.0, ...unidades.map(u => C.largPacote(u.p)));
    const fileiras = Math.max(1, Math.min(2, Math.floor(c.larg / maiorLarg)));
    return { C, comps, VAGA, fileiras, largura: c.larg, altMax: c.alt, vagas: comps.map(cp => Math.floor(cp / VAGA + 0.001)) };
}

function nVagas(u, g) { return Math.max(1, Math.round(u.p.comp / g.VAGA)); }

// altura do topo de cada vaga, ignorando um pacote (o que esta sendo arrastado)
function alturaVaga(g, ci, f, v, ignorar) {
    let h = 0;
    montagem.colocados.forEach(c => {
        if (c === ignorar || c.ci !== ci || c.f !== f) return;
        if (v > c.v - 0.001 && v < c.v + c.n - 0.001) h = Math.max(h, c.topo + g.C.altPacote(c.u.p));
    });
    return h;
}

function avaliarVaga(g, u, ci, f, v, ignorar) {
    const n = nVagas(u, g);
    if (ci < 0 || ci >= g.comps.length || f < 0 || f >= g.fileiras || v < -0.001 || v + n > g.comps[ci] / g.VAGA + 0.001) return null;
    const base = Array.from({ length: n * 4 }, (_, k) => alturaVaga(g, ci, f, v + 0.125 + k * 0.25, ignorar));
    const topo = Math.max(...base);
    if (base.some(h => Math.abs(h - topo) > 0.12)) return null;           // pacote longo nao apoia em degrau
    // 2,40 nao vai em cima de pacotes de 1,20 (so no assoalho ou sobre outro 2,40)
    if (n > 1 && topo > 0.01 && montagem.colocados.some(c => c !== ignorar && c.ci === ci && c.f === f && c.v < v + n && v < c.v + c.n
        && Math.abs(c.topo + g.C.altPacote(c.u.p) - topo) < 0.12 && c.n < n)) return null;
    if (topo + g.C.altPacote(u.p) > g.altMax + 0.001) return null;        // passa da altura maxima
    return { ci, f, v, n, topo };
}

// mesma regra do automatico: mais baixo, mais no meio, equilibra lados, cruzado
function melhorVaga(g, u) {
    let melhor = null, chaveMelhor = null;
    const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 0.001) return a[i] - b[i]; return 0; };
    g.comps.forEach((_, ci) => { for (let f = 0; f < g.fileiras; f++) for (let v = 0; v < g.vagas[ci]; v += 0.5) {
        const r = avaliarVaga(g, u, ci, f, v);
        if (!r) continue;
        const centro = (v + r.n / 2) - g.vagas[ci] / 2;
        const naCamada = montagem.colocados.filter(c => c.ci === ci && c.f === f && Math.abs(c.topo - r.topo) < 0.05).length;
        // no assoalho carrega da cabine para tras (os de 2,40 vao primeiro, encostados na frente)
        const chave = [Math.round(r.topo * 100), r.topo < 0.01 ? -(v + r.n) : Math.abs(centro), naCamada, f === 0 ? -centro : centro, -ci];
        if (!melhor || cmp(chave, chaveMelhor) < 0) { melhor = r; chaveMelhor = chave; }
    } });
    return melhor;
}

// automatico: mesma montagem do romaneio (vagas inteiras) e depois centraliza cada camada
function montarAutomatico(lista = montagem.unidades) {
    const C = calc();
    montagem.colocados = [];
    montagem.selecionado = null;
    [...lista].sort((a, c) => c.p.comp - a.p.comp || (C.meio(a.p) - C.meio(c.p)) || c.p.esp - a.p.esp).forEach(u => {
        const g = geometriaMontagem();
        const r = melhorVagaInteira(g, u);
        if (r) montagem.colocados.push({ u, ...r });
    });
    const g = geometriaMontagem();
    C.centralizarCamadas?.(montagem.colocados, g.comps.map(cp => cp / g.VAGA), c => C.altPacote(c.u.p), atual.alinhar);
}

function melhorVagaInteira(g, u) {
    let melhor = null, chaveMelhor = null;
    const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 0.001) return a[i] - b[i]; return 0; };
    g.comps.forEach((_, ci) => { for (let f = 0; f < g.fileiras; f++) for (let v = 0; v < g.vagas[ci]; v++) {
        const r = avaliarVaga(g, u, ci, f, v);
        if (!r) continue;
        const centro = (v + r.n / 2) - g.vagas[ci] / 2;
        const naCamada = montagem.colocados.filter(c => c.ci === ci && c.f === f && Math.abs(c.topo - r.topo) < 0.05).length;
        // no assoalho carrega da cabine para tras (os de 2,40 vao primeiro, encostados na frente)
        const chave = [Math.round(r.topo * 100), r.topo < 0.01 ? -(v + r.n) : Math.abs(centro), naCamada, f === 0 ? -centro : centro, -ci];
        if (!melhor || cmp(chave, chaveMelhor) < 0) { melhor = r; chaveMelhor = chave; }
    } });
    return melhor;
}

function temAlgoEmCima(c) {
    const g = geometriaMontagem();
    const topo = c.topo + g.C.altPacote(c.u.p);
    return montagem.colocados.some(o => o !== c && o.ci === c.ci && o.f === c.f && o.topo >= topo - 0.01 && o.v < c.v + c.n && c.v < o.v + o.n);
}

function colocarUnidade(u) {
    const g = geometriaMontagem();
    const r = melhorVaga(g, u);
    if (!r) return false;
    montagem.colocados.push({ u, ...r });
    return true;
}

function renderListaMontagem() {
    const el = document.getElementById('v3dLista');
    if (!el || !montagem) return;
    const grupos = new Map();
    montagem.unidades.forEach(u => {
        const k = grupoChave(u.p);
        if (!grupos.has(k)) grupos.set(k, { p: u.p, rotulo: u.rotulo, total: 0, noCaminhao: 0 });
        grupos.get(k).total++;
    });
    montagem.colocados.forEach(c => { grupos.get(grupoChave(c.u.p)).noCaminhao++; });
    const C = calc();
    const linhas = [...grupos.entries()].map(([k, gr]) => {
        const resta = gr.total - gr.noCaminhao;
        const cor = gr.p.classe === 1 ? '#16a34a' : gr.p.classe === 2 ? '#eab308' : '#dc2626';
        return `<div class="v3d-item" style="--cor:${cor}">
          <div class="v3d-item-txt"><b>${fmt(gr.p.esp, 1)} × ${fmt(gr.p.larg, 1)} × ${fmt(gr.p.comp, 2)}</b>
            <span>${gr.p.classe}ª · (${gr.p.alt}×${gr.p.cam})${gr.p.am ? ` + ${gr.p.am}` : ''} · ${fmt(C.altPacote(gr.p), 2)} m</span>
            <span class="v3d-item-qtd">${gr.noCaminhao} no caminhão · ${resta} fora</span>
            <span class="v3d-item-cfg"><input type="number" min="1" step="1" data-cfg="alt" data-grupo="${k}" value="${gr.p.alt}" aria-label="Fiadas">×<input type="number" min="1" step="1" data-cfg="cam" data-grupo="${k}" value="${gr.p.cam}" aria-label="Tábuas por fiada">+<input type="number" min="0" step="1" data-cfg="am" data-grupo="${k}" value="${gr.p.am || 0}" aria-label="Amarras"></span></div>
          <div class="v3d-item-btns">
            <button type="button" data-menos="${k}" ${gr.noCaminhao ? '' : 'disabled'} aria-label="Tirar 1 do caminhão">−1</button>
            <button type="button" data-mais="${k}" ${resta ? '' : 'disabled'} aria-label="Pôr 1 no caminhão">+1</button>
          </div></div>`;
    }).join('');
    const sel = montagem.selecionado;
    el.innerHTML = `
      <div class="v3d-lista-topo">
        <b>${montagem.origem}</b>
        <div class="v3d-lista-acoes">
          <button type="button" id="v3dAuto">Montar automático</button>
          <button type="button" id="v3dLimpar">Limpar</button>
        </div>
        <div class="v3d-lista-acoes">
          <button type="button" id="v3dPlano"><i class="fa-solid fa-print"></i> Imprimir plano</button>
          ${montagem.aoSalvar ? `<button type="button" id="v3dSalvarArranjo" class="v3d-salvar-arranjo"><i class="fa-solid fa-floppy-disk"></i> Salvar no romaneio</button>` : ''}
        </div>
        ${montagem.salvoMsg ? `<p class="v3d-dica-lista v3d-salvo">${montagem.salvoMsg}</p>` : ''}
        ${sel ? fichaSelecionado(sel) : ''}
        ${sel ? `<div class="v3d-sel-acoes"><button type="button" id="v3dTrocarSel"><i class="fa-solid fa-right-left"></i> Trocar com outro</button><button type="button" id="v3dLadoSel"><i class="fa-solid fa-arrows-left-right"></i> Outro lado</button><button type="button" id="v3dRemoverSel" class="v3d-remover"><i class="fa-solid fa-arrow-down"></i> Descer do caminhão</button></div>` : '<p class="v3d-dica-lista">Arraste um pacote (mãozinha) para mudar de lugar: ele anda no comprimento e encaixa na medida. Botão direito no pacote: trocar, outro lado ou descer.</p>'}
      </div>
      <div class="v3d-itens">${linhas || '<p class="v3d-dica-lista">Nenhum pacote para montar.</p>'}</div>`;
    // no celular a lista fica acima do 3D: repete a ficha resumida em cima do caminhao
    const palco = document.getElementById('v3dPalco');
    let flut = palco?.querySelector('.v3d-ficha-flutua');
    if (palco && !flut) { flut = document.createElement('div'); flut.className = 'v3d-ficha-flutua'; flut.setAttribute('aria-live', 'polite'); palco.appendChild(flut); }
    if (flut) {
        if (sel) {
            const p = sel.u.p, pecas = p.alt * p.cam + (p.am || 0);
            flut.innerHTML = `<b>${p.classe}ª · ${fmt(p.esp, 1)} × ${fmt(p.larg, 1)} × ${fmt(p.comp, 2)}</b> · (${p.alt}×${p.cam})${p.am ? ` + ${p.am}` : ''} · ${pecas} pç · ${fmt((p.esp / 100) * (p.larg / 100) * p.comp * pecas, 3)} m³`;
            flut.hidden = false;
        } else flut.hidden = true;
    }
}

function mundoParaVaga(g, ponto, u) {
    // pacote centrado no ponteiro: vaga inicial = posicao - metade do pacote
    const n = nVagas(u, g);
    let ci = -1;
    montagem.geo.inicioCacamba.forEach((ini, i) => { if (ponto.x >= ini - 0.6 && ponto.x <= ini + g.comps[i] + 0.6) ci = i; });
    if (ci < 0) return null;
    const v = Math.round(((ponto.x - montagem.geo.inicioCacamba[ci]) / g.VAGA - n / 2) * 2) / 2; // passo de meia vaga
    const faixa = g.largura / g.fileiras;
    const f = Math.floor((ponto.z - montagem.geo.z0) / faixa);
    return { ci, v: Math.max(0, Math.min(g.vagas[ci] - n, v)), f: Math.max(0, Math.min(g.fileiras - 1, f)) };
}

function posicaoMundo(g, c) {
    const C = g.C;
    const faixa = g.largura / g.fileiras;
    const comp = c.u.p.comp, largP = C.largPacote(c.u.p);
    return {
        x: montagem.geo.inicioCacamba[c.ci] + c.v * g.VAGA + (c.n * g.VAGA - comp) / 2,
        y: PISO + c.topo,
        z: montagem.geo.z0 + c.f * faixa + (faixa - largP) / 2
    };
}

function desenharMontagem() {
    limparConteudo();
    const T = window.THREE;
    const g = geometriaMontagem();
    montagem.geo = desenharVeiculo(g.comps, g.largura, { fueiro: 1.2 });
    const pecas = [], fitas = [];
    montagem.alvos = [];
    montagem.colocados.forEach((c, i) => {
        const o = posicaoMundo(g, c);
        const dim = tabuasDoPacote(c.u.p, o);
        colarEtiqueta(dim, o, c.u.p, g.fileiras > 1 && c.f === 0 ? -1 : 1);
        pecas.push(...dim.pecas);
        fitas.push(...fitasDoPacote(dim, o));
        // caixa invisivel para clicar/arrastar
        const alvo = new T.Mesh(new T.BoxGeometry(dim.comprimento, dim.altura, dim.largura), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        alvo.position.set(o.x + dim.comprimento / 2, o.y + dim.altura / 2, o.z + dim.largura / 2);
        alvo.userData.colocado = c;
        cena.conteudo.add(alvo);
        montagem.alvos.push(alvo);
        if (c === montagem.selecionado) {
            const borda = new T.LineSegments(new T.EdgesGeometry(alvo.geometry), new T.LineBasicMaterial({ color: 0x1d4ed8 }));
            borda.position.copy(alvo.position);
            borda.scale.set(1.02, 1.02, 1.02);
            cena.conteudo.add(borda);
        }
    });
    malhaInstanciada(pecas, COR_MADEIRA);
    cotas(caixaDe(pecas));
    malhaInstanciada(fitas, 0x16a34a, false);
    // linha da altura maxima
    const yLim = PISO + g.altMax, xa = montagem.geo.inicioCacamba[0], xb = xa + montagem.geo.total;
    const lg = new T.BufferGeometry().setFromPoints([new T.Vector3(xa, yLim, montagem.geo.z0), new T.Vector3(xb, yLim, montagem.geo.z0), new T.Vector3(xa, yLim, -montagem.geo.z0), new T.Vector3(xb, yLim, -montagem.geo.z0)]);
    cena.conteudo.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xdc2626 })));
    // fantasma usado durante o arraste
    montagem.fantasma = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.35, depthWrite: false }));
    montagem.fantasma.visible = false;
    cena.conteudo.add(montagem.fantasma);
    const vol = montagem.colocados.reduce((s, c) => s + (c.u.p.esp / 100) * (c.u.p.larg / 100) * c.u.p.comp * (c.u.p.alt * c.u.p.cam + c.u.p.am), 0);
    const fora = montagem.unidades.length - montagem.colocados.length;
    document.getElementById('v3dInfo').textContent = `${montagem.colocados.length} de ${montagem.unidades.length} pacote(s) no caminhão (${contagemCamadas(montagem.colocados)}) · ${fmt(vol, 3)} m³ · ${g.vagas.reduce((s, n) => s + n, 0) * g.fileiras} vagas no piso${fora ? ` · ${fora} fora do caminhão` : ''}`;
    renderListaMontagem();
}

// ---- acoes rapidas: trocar, outro lado, descer ----
function msgMontagem(t) { const el = document.getElementById('v3dInfo'); if (el) el.textContent = t; }

// recalcula a altura de cada pacote a partir do que esta embaixo; false se algo ficar sem apoio ou alto demais
function reassentar(g) {
    const lista = [...montagem.colocados].sort((a, b) => a.topo - b.topo);
    const prontos = [];
    for (const c of lista) {
        let sup = 0, min = Infinity;
        for (let x = c.v + 0.125; x < c.v + c.n; x += 0.25) {
            let h = 0;
            prontos.forEach(o => { if (o.ci === c.ci && o.f === c.f && x > o.v && x < o.v + o.n) h = Math.max(h, o.topo + g.C.altPacote(o.u.p)); });
            sup = Math.max(sup, h); min = Math.min(min, h);
        }
        if (sup - min > 0.12) return false;
        c.topo = sup;
        if (c.topo + g.C.altPacote(c.u.p) > g.altMax + 0.001) return false;
        prontos.push(c);
    }
    return true;
}
function guardarPosicoes() { return montagem.colocados.map(c => ({ c, u: c.u, ci: c.ci, f: c.f, v: c.v, topo: c.topo })); }
function voltarPosicoes(b) { b.forEach(x => Object.assign(x.c, { u: x.u, ci: x.ci, f: x.f, v: x.v, topo: x.topo })); }

function trocarPacotes(a, b) {
    const g = geometriaMontagem();
    if (a === b) return;
    if (a.n !== b.n) { msgMontagem('Só dá para trocar pacotes do mesmo comprimento.'); return; }
    const bk = guardarPosicoes();
    const ua = a.u; a.u = b.u; b.u = ua;
    if (!reassentar(g)) { voltarPosicoes(bk); msgMontagem('Não dá para trocar: algum pacote ficaria sem apoio ou passaria da altura máxima.'); return; }
    montagem.selecionado = a;
    desenharMontagem();
    msgMontagem('Pacotes trocados.');
}
function outroLado(c) {
    const g = geometriaMontagem();
    if (g.fileiras < 2) { msgMontagem('Este caminhão tem uma fileira só.'); return; }
    if (temAlgoEmCima(c)) { msgMontagem('Tire primeiro o pacote de cima.'); return; }
    const r = avaliarVaga(g, c.u, c.ci, 1 - c.f, c.v, c);
    if (!r) { msgMontagem('Não há lugar livre no outro lado nessa posição.'); return; }
    Object.assign(c, r);
    desenharMontagem();
}
function descerPacote(c) {
    if (temAlgoEmCima(c)) { msgMontagem('Tire primeiro o pacote de cima.'); return; }
    montagem.colocados.splice(montagem.colocados.indexOf(c), 1);
    montagem.selecionado = null;
    desenharMontagem();
}
function fecharMenuMontagem() { document.getElementById('v3dMenu')?.remove(); }
function abrirMenuMontagem(c, x, y) {
    fecharMenuMontagem();
    const palco = document.getElementById('v3dPalco');
    const r = palco.getBoundingClientRect();
    const m = document.createElement('div');
    m.id = 'v3dMenu';
    m.className = 'v3d-menu';
    m.setAttribute('role', 'menu');
    m.innerHTML = `<button type="button" data-acao="trocar" role="menuitem"><i class="fa-solid fa-right-left"></i> Trocar com outro pacote</button>
      <button type="button" data-acao="lado" role="menuitem"><i class="fa-solid fa-arrows-left-right"></i> Passar para o outro lado</button>
      <button type="button" data-acao="descer" role="menuitem"><i class="fa-solid fa-arrow-down"></i> Descer do caminhão</button>
      <button type="button" data-acao="fechar" role="menuitem">Cancelar</button>`;
    m.style.left = Math.min(x - r.left, r.width - 230) + 'px';
    m.style.top = Math.min(y - r.top, r.height - 180) + 'px';
    m.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        fecharMenuMontagem();
        if (b.dataset.acao === 'trocar') iniciarTroca(c);
        else if (b.dataset.acao === 'lado') outroLado(c);
        else if (b.dataset.acao === 'descer') descerPacote(c);
    });
    palco.appendChild(m);
}
function iniciarTroca(c) {
    montagem.trocando = c;
    montagem.selecionado = c;
    desenharMontagem();
    msgMontagem('Agora clique no pacote que vai trocar de lugar com o selecionado (Esc cancela).');
}

function instalarArraste() {
    if (!cena || cena.arrasteInstalado) return;
    cena.arrasteInstalado = true;
    const T = window.THREE;
    const palco = document.getElementById('v3dPalco');
    const el = cena.renderer.domElement;
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    let arraste = null;
    const lerPonteiro = e => {
        const r = el.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cena.camera);
    };
    const acertar = e => { lerPonteiro(e); return ray.intersectObjects(montagem?.alvos || [], false)[0]; };
    const ativo = () => atual.modo === 'montar' && montagem && document.getElementById('modalVisualizador3D')?.style.display === 'flex';

    // mãozinha ao passar sobre um pacote
    let pendente = false;
    palco.addEventListener('pointermove', e => {
        if (!ativo() || arraste || e.buttons || pendente) return;
        pendente = true;
        requestAnimationFrame(() => {
            pendente = false;
            el.style.cursor = acertar(e) ? (montagem.trocando ? 'copy' : 'grab') : '';
        });
    });
    palco.addEventListener('contextmenu', e => { if (ativo()) e.preventDefault(); });

    // captura no palco: o pacote recebe o clique antes do giro da camera
    palco.addEventListener('pointerdown', e => {
        if (!ativo() || e.target.closest('.v3d-menu')) return;
        fecharMenuMontagem();
        const hit = acertar(e);
        if (!hit) return;
        e.stopPropagation();
        e.preventDefault();
        const c = hit.object.userData.colocado;
        if (montagem.trocando) { const a = montagem.trocando; montagem.trocando = null; trocarPacotes(a, c); return; }
        montagem.selecionado = c;
        if (e.button === 2) { desenharMontagem(); abrirMenuMontagem(c, e.clientX, e.clientY); return; }
        if (e.button !== 0) return;
        if (temAlgoEmCima(c)) { desenharMontagem(); msgMontagem('Este pacote tem outro por cima: tire o de cima primeiro.'); return; }
        const g = geometriaMontagem();
        const o = posicaoMundo(g, c);
        arraste = {
            c, g, moveu: false, alvo: null, chave: '', x0: e.clientX, y0: e.clientY,
            plano: new T.Plane(new T.Vector3(0, 1, 0), -hit.point.y),
            xIni: hit.point.x, centroIni: o.x + c.u.p.comp / 2
        };
        el.style.cursor = 'grabbing';
        window.addEventListener('pointermove', mover);
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
    }, true);

    // so anda no comprimento, na mesma fileira, de meia em meia vaga (encaixa na medida)
    const mover = e => {
        if (!arraste) return;
        if (!arraste.moveu && Math.hypot(e.clientX - arraste.x0, e.clientY - arraste.y0) < 5) return;
        arraste.moveu = true;
        lerPonteiro(e);
        const p = new T.Vector3();
        if (!ray.ray.intersectPlane(arraste.plano, p)) return;
        const { g, c } = arraste;
        const centro = arraste.centroIni + (p.x - arraste.xIni);
        let ci = c.ci;
        montagem.geo.inicioCacamba.forEach((ini, i) => { if (centro >= ini && centro <= ini + g.comps[i]) ci = i; });
        const n = c.n, espaco = g.comps[ci] / g.VAGA;
        let v = Math.round(((centro - montagem.geo.inicioCacamba[ci]) / g.VAGA - n / 2) * 2) / 2;
        v = Math.max(0, Math.min(Math.floor((espaco - n) * 2) / 2, v));
        const chave = ci + ':' + v;
        if (chave === arraste.chave) return;
        arraste.chave = chave;
        const r = avaliarVaga(g, c.u, ci, c.f, v, c);
        arraste.alvo = r;
        const base = r || { ci, f: c.f, v, n, topo: c.topo };
        const o = posicaoMundo(g, { ...base, u: c.u });
        const L = c.u.p.comp, H = g.C.altPacote(c.u.p), Wp = g.C.largPacote(c.u.p);
        const f = montagem.fantasma;
        f.scale.set(L, H, Wp);
        f.position.set(o.x + L / 2, o.y + H / 2, o.z + Wp / 2);
        f.material.color.set(r ? 0x16a34a : 0xdc2626);
        f.visible = true;
        cena.sujo = true;
        msgMontagem(r ? `Solte para colocar a ${fmt(v * g.VAGA, 2)} m da traseira${r.topo > 0.01 ? ' (em cima)' : ''}.` : 'Aqui não cabe (sem apoio ou passa da altura).');
    };
    const soltar = () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        window.removeEventListener('pointercancel', soltar);
        if (!arraste) return;
        const { c, moveu, alvo } = arraste;
        arraste = null;
        el.style.cursor = '';
        if (moveu && alvo) Object.assign(c, alvo);
        desenharMontagem();
    };
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && montagem?.trocando) { montagem.trocando = null; fecharMenuMontagem(); desenharMontagem(); }
    });
}

function instalarListaEventos() {
    const el = document.getElementById('v3dLista');
    if (!el || el.dataset.ok) return;
    el.dataset.ok = '1';
    // mudar fiadas x por fiada + amarras de um grupo: refaz a carga com o pacote novo
    el.addEventListener('change', e => {
        const inp = e.target.closest('input[data-cfg]');
        if (!inp || !montagem) return;
        const k = inp.dataset.grupo;
        const u0 = montagem.unidades.find(u => grupoChave(u.p) === k);
        if (!u0) return;
        const C = calc();
        const val = Math.max(inp.dataset.cfg === 'am' ? 0 : 1, parseInt(inp.value, 10) || 0);
        const novo = { ...u0.p, [inp.dataset.cfg]: val };
        if (inp.dataset.cfg !== 'am' && !C.ehViga(novo)) novo.am = amarrasPadrao(novo);
        montagem.unidades.forEach(u => { if (grupoChave(u.p) === k) u.p = novo; });
        montarAutomatico(montagem.colocados.length ? montagem.unidades.filter(u => montagem.colocados.some(c => c.u === u)) : []);
        desenharMontagem();
    });
    el.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b || !montagem) return;
        if (b.dataset.mais) {
            const u = montagem.unidades.find(x => grupoChave(x.p) === b.dataset.mais && !montagem.colocados.some(c => c.u === x));
            if (u && !colocarUnidade(u)) document.getElementById('v3dInfo').textContent = 'Não há vaga para este pacote (altura máxima ou falta de apoio).';
            else desenharMontagem();
            return;
        }
        if (b.dataset.menos) {
            const lista = montagem.colocados.filter(c => grupoChave(c.u.p) === b.dataset.menos && !temAlgoEmCima(c));
            const c = lista[lista.length - 1];
            if (!c) { document.getElementById('v3dInfo').textContent = 'Os pacotes deste tipo têm outros por cima.'; return; }
            montagem.colocados.splice(montagem.colocados.indexOf(c), 1);
            if (montagem.selecionado === c) montagem.selecionado = null;
            desenharMontagem();
            return;
        }
        if (b.id === 'v3dAuto') {
            montagem.colocados = [];
            montagem.selecionado = null;
            const C = calc();
            montarAutomatico();
            desenharMontagem();
            return;
        }
        if (b.id === 'v3dPlano') { imprimirPlanoCarga(); return; }
        if (b.id === 'v3dSalvarArranjo' && montagem.aoSalvar) {
            montagem.aoSalvar(arranjoAtual());
            montagem.salvoMsg = 'Montagem guardada. Ela é gravada junto quando você finalizar o romaneio.';
            renderListaMontagem();
            return;
        }
        if (b.id === 'v3dLimpar') { montagem.colocados = []; montagem.selecionado = null; desenharMontagem(); return; }
        if (b.id === 'v3dTrocarSel' && montagem.selecionado) { iniciarTroca(montagem.selecionado); return; }
        if (b.id === 'v3dLadoSel' && montagem.selecionado) { outroLado(montagem.selecionado); return; }
        if (b.id === 'v3dRemoverSel' && montagem.selecionado) {
            if (temAlgoEmCima(montagem.selecionado)) { document.getElementById('v3dInfo').textContent = 'Tire primeiro o pacote de cima.'; return; }
            montagem.colocados.splice(montagem.colocados.indexOf(montagem.selecionado), 1);
            montagem.selecionado = null;
            desenharMontagem();
        }
    });
}

// ---- arranjo salvo e plano de carregamento impresso ----
function arranjoAtual() {
    return {
        caminhao: { ...atual.caminhao }, alinhar: { ...atual.alinhar }, salvoEm: new Date().toISOString(),
        pacotes: montagem.colocados.map(c => ({ chave: grupoChave(c.u.p), ci: c.ci, f: c.f, v: c.v, n: c.n, topo: c.topo }))
    };
}
function restaurarArranjo(arr) {
    if (!arr?.pacotes?.length) return 0;
    const livres = [...montagem.unidades];
    montagem.colocados = [];
    arr.pacotes.forEach(a => {
        const i = livres.findIndex(u => grupoChave(u.p) === a.chave);
        if (i < 0) return;
        const u = livres.splice(i, 1)[0];
        montagem.colocados.push({ u, ci: a.ci, f: a.f, v: a.v, n: a.n, topo: a.topo });
    });
    return montagem.colocados.length;
}
function fotoDaCarga(dir) {
    const cam = cena.camera, ctr = cena.controls;
    const pos = cam.position.clone(), alvo = ctr.target.clone();
    if (dir) enquadrar(0, 1.6, 0, (montagem.geo.total + CAB) / 1.45, dir);
    cena.renderer.render(cena.scene, cam);
    const url = cena.renderer.domElement.toDataURL('image/png');
    cam.position.copy(pos); ctr.target.copy(alvo); ctr.update(); cena.sujo = true;
    return url;
}
function ordemCarga() {
    const nomesNivel = ['Assoalho', 'Em cima', 'Chapéu'];
    const niveis = new Map();
    montagem.colocados.forEach(c => { const k = c.ci + '|' + c.f; if (!niveis.has(k)) niveis.set(k, [...new Set(montagem.colocados.filter(o => o.ci + '|' + o.f === k).map(o => Math.round(o.topo * 100)))].sort((a, b) => a - b)); });
    // ordem: assoalho do motorista, assoalho do passageiro, em cima do motorista, em cima do passageiro...
    // sempre da cabine para tras
    const nivelDe = c => Math.min(2, niveis.get(c.ci + '|' + c.f).indexOf(Math.round(c.topo * 100)));
    const ordem = [...montagem.colocados].sort((a, b) => nivelDe(a) - nivelDe(b) || (a.f - b.f) || (b.ci - a.ci) || (b.v - a.v));
    return { nomesNivel, nivelDe, ordem };
}
// Especificacoes do pacote selecionado no caminhao
function fichaSelecionado(c) {
    const g = geometriaMontagem();
    const p = c.u.p;
    const { nomesNivel, nivelDe, ordem } = ordemCarga();
    const pecas = p.alt * p.cam + (p.am || 0);
    const vol = (p.esp / 100) * (p.larg / 100) * p.comp * pecas;
    const cabine = Math.max(0, g.comps[c.ci] - (c.v + c.n) * g.VAGA);
    const lado = g.fileiras > 1 ? (c.f === 0 ? 'Motorista' : 'Passageiro') : 'Centro';
    const tipo = g.C.ehViga?.(p) ? 'Viga' : 'Tábua';
    const linha = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<div class="v3d-ficha" role="region" aria-label="Pacote selecionado">
      <b class="v3d-ficha-tit">Pacote ${ordem.indexOf(c) + 1} · ${tipo} ${p.classe}ª</b>
      <dl>
        ${linha('Medida', `${fmt(p.esp, 1)} × ${fmt(p.larg, 1)} cm × ${fmt(p.comp, 2)} m`)}
        ${linha('Configuração', `(${p.alt}×${p.cam})${p.am ? ` + ${p.am}` : ''}`)}
        ${linha('Peças', pecas)}
        ${linha('Volume', `${fmt(vol, 3)} m³`)}
        ${linha('Altura do pacote', `${fmt(g.C.altPacote(p), 2)} m`)}
        ${linha('Posição', `${nomesNivel[nivelDe(c)]} · ${lado}`)}
        ${linha('Da frente', `${g.comps.length > 1 ? `Caçamba ${c.ci + 1} · ` : ''}${fmt(cabine, 2)} m`)}
      </dl></div>`;
}
function imprimirPlanoCarga() {
    const g = geometriaMontagem();
    const C = g.C;
    const { nomesNivel, nivelDe, ordem } = ordemCarga();
    // o que separar do patio (o empilhadeirista pega o pacote dessa medida que estiver mais perto)
    const separar = new Map();
    ordem.forEach(c => { const p = c.u.p; const k = `${p.classe}ª · ${fmt(p.esp, 1)} × ${fmt(p.larg, 1)} × ${fmt(p.comp, 2)} · (${p.alt}×${p.cam})${p.am ? ` + ${p.am}` : ''}`; separar.set(k, (separar.get(k) || 0) + 1); });
    const listaSeparar = [...separar.entries()].map(([k, n]) => `<li><b>${n}</b> pacote(s) ${k}</li>`).join('');
    const linhas = ordem.map((c, i) => {
        const p = c.u.p;
        const nivel = nivelDe(c);
        const cabine = g.comps[c.ci] - (c.v + c.n) * g.VAGA;
        return `<tr><td><b>${i + 1}</b></td><td>${nomesNivel[nivel]}</td><td>${g.fileiras > 1 ? (c.f === 0 ? 'Motorista' : 'Passageiro') : 'Centro'}</td><td>${g.comps.length > 1 ? `Caçamba ${c.ci + 1} · ` : ''}${fmt(Math.max(0, cabine), 2)} m da frente</td><td>${p.classe}ª · ${fmt(p.esp, 1)} × ${fmt(p.larg, 1)} × ${fmt(p.comp, 2)}</td><td>(${p.alt}×${p.cam})${p.am ? ` + ${p.am}` : ''}</td></tr>`;
    }).join('');
    const vol = montagem.colocados.reduce((s, c) => s + (c.u.p.esp / 100) * (c.u.p.larg / 100) * c.u.p.comp * (c.u.p.alt * c.u.p.cam + (c.u.p.am || 0)), 0);
    const img1 = fotoDaCarga(null), img2 = fotoDaCarga([0.001, 1, 0.0001]);
    const cam = atual.caminhao;
    const titulo = `Plano de carregamento${montagem.numero ? ' · ' + montagem.numero : ''}`;
    const html = `<div class="doc-header"><div class="doc-title"><h1>${titulo}</h1>
        <p>${montagem.colocados.length} pacote(s) (${contagemCamadas(montagem.colocados)}) · ${fmt(vol, 3)} m³ · caçamba ${fmt(cam.comp1, 2)}${cam.bitrem ? ` + ${fmt(cam.comp2, 2)}` : ''} × ${fmt(cam.larg, 2)} m · altura máx. ${fmt(cam.alt, 2)} m</p></div></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0;"><img src="${img1}" style="width:100%; border:1px solid #ccc;" alt="Carga em 3D"><img src="${img2}" style="width:100%; border:1px solid #ccc;" alt="Carga vista de cima"></div>
      <div style="margin:8px 0;"><b>Separar do pátio</b> (pegue o pacote dessa medida que estiver mais perto):<ul style="margin:4px 0 0 18px;">${listaSeparar}</ul></div>
      <table class="doc-table"><thead><tr><th>Ordem</th><th>Camada</th><th>Lado</th><th>Posição</th><th>Pacote</th><th>Config.</th></tr></thead><tbody>${linhas}</tbody></table>
      <p style="margin-top:10px; font-size:12px;">Ordem: assoalho do motorista, assoalho do passageiro, depois em cima do motorista e em cima do passageiro, sempre da cabine para trás. Em cada posição vai um pacote da medida indicada (o mais perto no pátio). Conferir as fitas antes de sair.</p>`;
    if (window.DocActions?.printHtml) window.DocActions.printHtml({ title: titulo, contentHtml: html });
    else { const w = window.open('', '_blank'); if (w) { w.document.write(`<html><body>${html}</body></html>`); w.document.close(); w.print(); } }
}

// itens: [{ p: {classe, esp, larg, comp, alt, cam, am}, qtd }]
window.abrirMontadorCarga3D = async function(itens, opcoes = {}) {
    const unidades = [];
    (itens || []).forEach((it, i) => { for (let k = 0; k < (Number(it.qtd) || 0); k++) unidades.push({ uid: `${i}-${k}`, p: it.p }); });
    if (!unidades.length) { alert('Não há pacotes para montar a carga.'); return; }
    if (!calc()) { alert('Módulo de montagem ainda carregando. Tente novamente em instantes.'); return; }
    const modal = garantirModal();
    modal.style.display = 'flex';
    document.getElementById('v3dTitulo').textContent = opcoes.titulo || 'Montar carga';
    atual.modo = 'montar';
    if (opcoes.caminhao) atual.caminhao = { ...atual.caminhao, ...opcoes.caminhao };
    montagem = { unidades, colocados: [], selecionado: null, origem: opcoes.origem || 'Pacotes', aoSalvar: opcoes.aoSalvar || null, numero: opcoes.numero || '', salvoMsg: '' };
    if (opcoes.arranjo?.caminhao) atual.caminhao = { ...atual.caminhao, ...opcoes.arranjo.caminhao };
    if (opcoes.arranjo?.alinhar) atual.alinhar = { ...atual.alinhar, ...opcoes.arranjo.alinhar };
    try { await garantirThree(); }
    catch (_) { document.getElementById('v3dPalco').innerHTML = '<div class="v3d-carregando">Não foi possível carregar o 3D. Verifique a internet e tente de novo.</div>'; return; }
    if (!cena) criarCena(document.getElementById('v3dPalco'));
    else if (!document.getElementById('v3dPalco').contains(cena.renderer.domElement)) document.getElementById('v3dPalco').appendChild(cena.renderer.domElement);
    instalarArraste();
    instalarListaEventos();
    // usa a montagem salva no romaneio; senao comeca com a automatica e o usuario ajusta arrastando
    if (restaurarArranjo(opcoes.arranjo)) montagem.salvoMsg = 'Montagem salva carregada.';
    else montarAutomatico();
    desenhar();
    const g = geometriaMontagem();
    enquadrar(0, 1.6, 0, (montagem.geo.total + CAB) / 2.2, [0.9, 0.7, 1.3]);
};

// ---------- Patio 3D (galpao da serraria visto como no croqui) ----------
// Base do Laboratorio (serraria em 3D). So mostra: nada e gravado.
// Galpao: tora na ponta esquerda, linha de producao no lado de baixo, patio de 2a perto da tora,
// paletes no meio, patio de 1a na outra ponta, carregamento no meio do lado de cima.
// Cada fileira guarda uma medida; no maximo 4 pacotes empilhados. 3a classe fica num patio separado,
// do lado de fora, do outro lado do galpao (acima, a esquerda do carregamento).
let patio = null;
const MAX_PILHA = 4;

function ajustarSombra(raio) {
    const sol = cena.scene.children.find(o => o.isDirectionalLight);
    if (!sol) return;
    Object.assign(sol.shadow.camera, { left: -raio, right: raio, top: raio, bottom: -raio, far: raio * 4 });
    sol.position.set(raio * 0.5, raio, raio * 0.66);
    sol.shadow.camera.updateProjectionMatrix();
}
function rotuloTexto(texto, x, y, z, h = 1.1, cor = '#1f2937') {
    const T = window.THREE;
    const c = document.createElement('canvas');
    const x2 = c.getContext('2d');
    x2.font = 'bold 44px sans-serif';
    c.width = Math.ceil(x2.measureText(texto).width) + 40; c.height = 64;
    const k = c.getContext('2d');
    k.fillStyle = 'rgba(255,255,255,.92)'; k.fillRect(0, 0, c.width, c.height);
    k.fillStyle = cor; k.font = 'bold 44px sans-serif'; k.textAlign = 'center'; k.textBaseline = 'middle';
    k.fillText(texto, c.width / 2, 34);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }));
    sp.scale.set(h * c.width / c.height, h, 1);
    sp.position.set(x, y, z);
    sp.renderOrder = 10;
    cena.conteudo.add(sp);
    return sp;
}
// marca no chao (faixa pintada)
function faixaChao(x0, z0, x1, z1, cor, y = 0.012) {
    caixa((x0 + x1) / 2, y, (z0 + z1) / 2, Math.abs(x1 - x0), 0.01, Math.abs(z1 - z0), cor);
}
// ---- layout do patio (conforme o dono da serraria) ----
// Caminhao entra de re e fica NO MEIO: de um lado o patio de 2a (com o munk florestal e as toras atras),
// do outro a esteira de montagem de pacotes e o patio de 1a encostado no muro do fundo.
// 1a: um bloco de 4 fileiras (de fundo) x 3 pilhas (de lado).
// 2a: um bloco de 3 fileiras x 4 pilhas. 3a: fora, atras do galpao. Ate 4 pacotes por pilha.
// 50 cm entre pilhas para uma pessoa passar etiquetando. Fileira enche a partir do muro.
const PASSO = 1.2 + 0.5;   // pacote de 1,20 + 50 cm de corredor
// "1ª 17/85/120" e "(50X14)+16": o mesmo texto na etiqueta do pacote e ao passar o mouse
function textoPacotePatio(p) {
    return [`${p.classe}ª ${Math.round(p.esp * 10)}/${Math.round(p.larg * 10)}/${Math.round(p.comp * 100)}`, `(${p.alt}X${p.cam})${p.am ? `+${p.am}` : ''}`];
}
const texEtiqPatio = new Map();
function etiquetaPatio(p, x, y, z, larg, dir = -1) {
    const T = window.THREE;
    const [l1, l2] = textoPacotePatio(p);
    const chave = l1 + '|' + l2;
    if (!texEtiqPatio.has(chave)) {
        const c = document.createElement('canvas'); c.width = 256; c.height = 160;
        const k = c.getContext('2d');
        k.fillStyle = '#ffffff'; k.fillRect(0, 0, 256, 160);
        k.strokeStyle = '#111827'; k.lineWidth = 6; k.strokeRect(3, 3, 250, 154);
        k.fillStyle = '#111827'; k.textAlign = 'center'; k.textBaseline = 'middle';
        k.font = 'bold 46px sans-serif'; k.fillText(l1, 128, 56, 236);
        k.font = 'bold 40px sans-serif'; k.fillText(l2, 128, 112, 236);
        const t = new T.CanvasTexture(c); t.compartilhada = true;
        texEtiqPatio.set(chave, t);
    }
    const w = Math.min(0.62, larg * 0.9), h = w * 0.625;
    const geo = new T.PlaneGeometry(w, h);
    geo.rotateY(dir < 0 ? -Math.PI / 2 : Math.PI / 2); // de frente para o caminhao (cabeca do pacote)
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: texEtiqPatio.get(chave) }));
    m.position.set(x, y, z);
    cena.conteudo.add(m);
}
function bloco3(lado, nome, x0, z0, fundo, deLado, primeiroN, doFim) {
    // fileiras correm ao longo de z (de lado); a profundidade (uma na frente da outra) e ao longo de x
    return { lado, nome, x0, z0, fundo, deLado, primeiroN, doFim, livre: Array.from({ length: fundo }, () => Array(deLado).fill(true)) };
}
const CFG_PATIO_PADRAO = { b1: { fundo: 4, lado: 3 }, b2: { fundo: 3, lado: 4 }, b3: { fundo: 3, lado: 4 } };
function layoutPatio(cfg = CFG_PATIO_PADRAO) {
    const c1 = cfg.b1, c2 = cfg.b2, c3 = cfg.b3;
    const margem = 1, folga = 0.9, faixa = 4.4, esteiraL = 3.2, munk = 4.2;
    const x2 = margem;                            // 2a encostada na parede da esquerda (munk e tora do lado de fora)
    const x2f = x2 + c2.fundo * PASSO;
    const laneA = x2f + folga, laneB = laneA + faixa;
    const xe = laneB + folga, xef = xe + esteiraL; // esteira de montagem de pacotes
    const x1 = xef + folga, x1f = x1 + c1.fundo * PASSO;  // 1a encostada no muro
    const L = x1f + margem;
    const zTopo = 1.2;
    const fimPatio = Math.max(zTopo + c1.lado * PASSO, zTopo + 4 + c2.lado * PASSO, zTopo + 4 * PASSO + 4);
    const linhaZ0 = fimPatio + 1.2;
    const W = linhaZ0 + 3.6;
    const ox = -L / 2, oz = -W / 2;
    const b11 = bloco3(1, '', ox + x1, oz + zTopo, c1.fundo, c1.lado, 1, true);
    const b2 = bloco3(2, '', ox + x2, oz + zTopo + 4, c2.fundo, c2.lado, 1, false);   // 2a mais para o fundo, ao lado da carroceria
    const b3 = bloco3(3, '', ox + x1, oz + W + 3.2, c3.fundo, c3.lado, 1, false);     // 3a atras do galpao
    return { L, W, ox, oz, laneA: ox + laneA, laneB: ox + laneB, munkX: ox - munk / 2 - 0.4,
        esteira: { x0: ox + xe, x1: ox + xef, z0: oz + linhaZ0 - 5.6, z1: oz + linhaZ0 },  // esteira curta, saindo da linha
        linhaZ0: oz + linhaZ0, b11, b2, b3 };
}
// x da fileira r (0 = encostada no muro) e z da pilha c
function posBloco(b, r, c) {
    const x = b.doFim ? b.x0 + (b.fundo - 1 - r) * PASSO : b.x0 + r * PASSO;
    return { x, z: b.z0 + c * PASSO };
}
// Fileira = uma coluna de pilhas (uma na frente da outra, a partir do muro). Cada medida ocupa sua
// fileira (ex.: uma de 11 cm e do lado uma de 8,5). Primeiro respeita as posicoes salvas/arrastadas.
function encherPatio(grupos, blocos, salvos = {}) {
    const C = calc();
    const pilhas = [];
    blocos.forEach(b => { b.dono = Array(b.deLado).fill(null); });
    const livre = (b, r, c, f) => { for (let k = 0; k < f; k++) if (r + k >= b.fundo || !b.livre[r + k][c]) return false; return true; };
    const colocar = (gr, b, r, c, f) => {
        for (let k = 0; k < f; k++) b.livre[r + k][c] = false;
        if (!b.dono[c]) b.dono[c] = gr.k;
        const p = gr.p, n = Math.min(MAX_PILHA, gr.resta);
        const larg = Math.min(C.largPacote(p), 1.4);
        const a0 = posBloco(b, r, c), a1 = posBloco(b, r + f - 1, c);
        pilhas.push({ k: gr.k, p, x: Math.min(a0.x, a1.x) + (f * PASSO - 0.5 - p.comp) / 2, z: a0.z + (1.2 - larg) / 2, comp: p.comp, larg, alt: C.altPacote(p), n,
            lado: b.lado, c, r, ocupa: f, fileira: b.primeiroN + c, posicao: r + 1 });
        gr.resta -= n;
    };
    grupos.forEach(gr => { gr.resta = gr.qtd; gr.f = gr.p.comp > 1.3 ? 2 : 1; });
    // 1) posicoes salvas
    grupos.forEach(gr => (salvos[gr.k] || []).forEach(sv => {
        if (gr.resta <= 0) return;
        const b = blocos.find(x => x.lado === sv.l);
        if (b && sv.c < b.deLado && livre(b, sv.r, sv.c, gr.f)) colocar(gr, b, sv.r, sv.c, gr.f);
    }));
    // 2) o resto: fileira da mesma medida, depois fileira vazia, depois qualquer vaga do bloco da classe
    grupos.forEach(gr => {
        const lado = gr.p.classe === 1 ? 1 : gr.p.classe === 2 ? 2 : 3;
        const b = blocos.find(x => x.lado === lado);
        if (!b) return;
        const cols = c => b.livre.every(l => l[c]);
        const passes = [c => b.dono[c] === gr.k, c => cols(c), () => true];
        for (const ok of passes) {
            for (let c = 0; c < b.deLado && gr.resta > 0; c++) {
                if (!ok(c)) continue;
                for (let r = 0; r < b.fundo && gr.resta > 0; r++) if (livre(b, r, c, gr.f)) colocar(gr, b, r, c, gr.f);
            }
            if (gr.resta <= 0) break;
        }
        gr.fora = Math.max(0, gr.resta);
    });
    // fileiras para a lista
    const porLado = { 1: [], 2: [], 3: [] };
    const fil = new Map();
    pilhas.forEach(pl => {
        const id = pl.lado + '|' + pl.c;
        if (!fil.has(id)) { const f = { lado: pl.lado, n: pl.fileira, p: pl.p, pacotes: 0, pilhas: 0, medidas: new Set() }; fil.set(id, f); porLado[pl.lado].push(f); }
        const f = fil.get(id); f.pacotes += pl.n; f.pilhas++; f.medidas.add(pl.k);
    });
    const res = l => {
        const b = blocos.find(x => x.lado === l);
        return { pilhas: pilhas.filter(x => x.lado === l), fileiras: porLado[l].sort((a, b2) => a.n - b2.n), capacidade: b ? b.fundo * b.deLado * MAX_PILHA : 0, total: b ? b.deLado : 0 };
    };
    // posicoes atuais (para salvar)
    const pos = {};
    pilhas.forEach(pl => { (pos[pl.k] = pos[pl.k] || []).push({ l: pl.lado, c: pl.c, r: pl.r }); });
    return { d1: res(1), d2: res(2), d3: res(3), pos };
}
function desenharMunk(x, z) {
    const T = window.THREE;
    const amarelo = mat(0xeab308, 0.5, 0.2), preto = mat(0x1f2937, 0.7, 0.3);
    bloco(x, 1.1, z, 2.2, 1.0, 4.0, amarelo);                  // chassi
    bloco(x, 2.2, z - 1.1, 1.8, 1.3, 1.4, mat(0xf8fafc, 0.4, 0.1)); // cabine
    bloco(x, 2.25, z - 1.1, 1.82, 0.7, 1.2, mat(0x0f172a, 0.2, 0.6)); // vidro
    [-1.3, 1.3].forEach(dz => [-1, 1].forEach(l => {
        const r = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.5, 18), new T.MeshLambertMaterial({ color: 0x111111 }));
        r.rotation.x = Math.PI / 2; r.rotation.y = Math.PI / 2; r.rotation.z = Math.PI / 2;
        r.position.set(x + l * 1.15, 0.62, z + dz); r.castShadow = true; cena.conteudo.add(r);
    }));
    bloco(x, 2.0, z + 1.0, 0.5, 1.2, 0.5, amarelo);            // coluna do guindaste
    const lanca = new T.Mesh(new T.BoxGeometry(0.32, 0.32, 4.2), amarelo);
    lanca.position.set(x, 3.4, z + 2.4); lanca.rotation.x = -0.55; lanca.castShadow = true; cena.conteudo.add(lanca);
    const braco = new T.Mesh(new T.BoxGeometry(0.26, 0.26, 2.6), amarelo);
    braco.position.set(x, 3.6, z + 4.8); braco.rotation.x = 0.5; cena.conteudo.add(braco);
    bloco(x, 2.4, z + 5.6, 0.7, 0.6, 0.5, preto);              // garra
    rotuloTexto('MUNK FLORESTAL', x, 4.8, z, 0.6);
}
function desenharPatio() {
    limparConteudo();
    const T = window.THREE;
    const G = layoutPatio(patio.cfg);
    const L = G.L, W = G.W;
    patio.comp = L; patio.larg = W;
    patio.G = G;
    ajustarSombra(Math.max(L, W) * 0.8);
    const terra = new T.Mesh(new T.PlaneGeometry(L + 40, W + 30), new T.MeshLambertMaterial({ color: 0xc8a27a }));
    terra.rotation.x = -Math.PI / 2; terra.position.set(0, -0.01, 0); terra.receiveShadow = true;
    cena.conteudo.add(terra);
    const piso = new T.Mesh(new T.PlaneGeometry(L, W), new T.MeshLambertMaterial({ color: 0xa8a29e }));
    piso.rotation.x = -Math.PI / 2; piso.position.y = 0.002; piso.receiveShadow = true;
    cena.conteudo.add(piso);
    // galpao aberto: colunas e tesouras
    const H = 5.5, aco = mat(0x475569, 0.5, 0.4);
    const nCol = Math.max(2, Math.round(L / 6));
    for (let i = 0; i <= nCol; i++) {
        const x = -L / 2 + (L * i) / nCol;
        [-W / 2, W / 2].forEach(z => bloco(x, H / 2, z, 0.25, H, 0.25, aco));
        bloco(x, H, 0, 0.18, 0.3, W, aco);
    }
    [-W / 2, W / 2].forEach(z => bloco(0, H, z, L, 0.25, 0.18, aco));
    // chao de cada bloco + marca de cada pilha (com corredor de 50 cm)
    const corBloco = { 1: 0xbbf7d0, 2: 0xfde68a, 3: 0xfecaca };
    const marcas = [];
    [G.b11, G.b2, G.b3].forEach(b => {
        faixaChao(b.x0 - 0.3, b.z0 - 0.3, b.x0 + b.fundo * PASSO - 0.2, b.z0 + b.deLado * PASSO - 0.2, corBloco[b.lado]);
        for (let r = 0; r < b.fundo; r++) for (let c = 0; c < b.deLado; c++) {
            const q = posBloco(b, r, c);
            marcas.push({ x: q.x + 0.6, y: 0.017, z: q.z + 0.6, sx: 1.2, sy: 0.006, sz: 1.2 });
        }
    });
    malhaInstanciada(marcas, 0xe2e8f0, false);
    faixaChao(G.laneA, -W / 2, G.laneB, G.linhaZ0 - 0.6, 0xfef9c3);
    // linha de producao
    const azul = mat(0x1d4ed8, 0.5, 0.3);
    const zl = G.linhaZ0 + 1.5;
    bloco(0, 0.45, zl, L - 3, 0.9, 1.2, mat(0x334155, 0.6, 0.3));
    for (let i = 0; i < 5; i++) bloco(-L / 2 + 3 + i * ((L - 6) / 4), 1.1, zl, 2.2, 2.2, 2.2, azul);
    rotuloTexto('LINHA DE PRODUÇÃO', 0, 2.9, zl, 0.7);
    // esteira de montagem de pacotes: 3 pacotes sendo montados de cada lado (1 de 1a e 2 de 2a: comeco, meio e fim)
    const E = G.esteira, ex = (E.x0 + E.x1) / 2, ez = (E.z0 + E.z1) / 2;
    bloco(ex, 0.45, ez, 0.8, 0.9, E.z1 - E.z0 - 0.2, mat(0x2563eb, 0.5, 0.3));
    const emMontagem = [];
    [-1, 1].forEach(lado => [[E.z1 - 0.9, 1], [ez, 2], [E.z0 + 0.9, 2]].forEach(([z, cl]) => {
        const x = ex + lado * 1.15;
        emMontagem.push({ x, y: 0.28, z, sx: 1.0, sy: 0.5, sz: 1.2, tom: cl });
        rotuloTexto(`${cl}ª`, x, 0.85, z, 0.32, cl === 1 ? '#15803d' : '#a16207');
    }));
    malhaInstanciada(emMontagem, COR_MADEIRA);
    rotuloTexto('MONTAGEM DE PACOTES', ex, 2.4, ez, 0.55);
    // munk florestal entre o patio de 2a e as toras; toras mais para fora
    desenharMunk(G.munkX, G.b2.z0 + 2);
    const toraX = G.munkX - 4.2;
    const geoTora = new T.CylinderGeometry(0.16, 0.16, 3, 10);
    const nTora = 3 * 30;
    const toras = new T.InstancedMesh(geoTora, new T.MeshLambertMaterial({ color: 0x9a6b3f }), nTora);
    const m4 = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(0, 0, Math.PI / 2));
    let it = 0;
    for (let pilha = 0; pilha < 3; pilha++) for (let cam2 = 0; cam2 < 5; cam2++) for (let k = 0; k < 8 - cam2 && it < nTora; k++) {
        const zc = -W / 3 + pilha * (W / 3);
        m4.compose(new T.Vector3(toraX, 0.16 + cam2 * 0.29, zc - 1.2 + k * 0.34 + cam2 * 0.17), q, new T.Vector3(1, 1, 1));
        toras.setMatrixAt(it++, m4);
    }
    toras.count = it; toras.castShadow = true;
    cena.conteudo.add(toras);
    rotuloTexto('TORA', toraX, 2.6, 0, 0.8);
    // esteira de po e cavaco ate os montes
    bloco(L * 0.1, 0.6, W / 2 + 1.5, L * 0.85, 0.3, 0.6, mat(0x64748b, 0.6, 0.3));
    const monte = (x, z, cor, nome) => {
        const cone = new T.Mesh(new T.ConeGeometry(2.4, 2.4, 24), new T.MeshLambertMaterial({ color: cor }));
        cone.position.set(x, 1.2, z); cone.castShadow = true; cena.conteudo.add(cone);
        rotuloTexto(nome, x, 3.3, z, 0.8);
    };
    monte(L / 2 + 4, W / 2 + 2.5, 0xe7d3a8, 'PÓ');
    monte(L / 2 + 10, W / 2 + 1, 0xb98b56, 'CAVACO');
    rotuloTexto('ESTEIRA DE PÓ E CAVACO', L * 0.1, 1.5, W / 2 + 1.5, 0.6);
    // caminhao no meio, de re, cabine para fora
    const n0 = cena.conteudo.children.length;
    desenharVeiculo([7.2], 2.4, { fueiro: 1.2 });
    const ehGradeOuSombra = o => o.type === 'GridHelper' || !!(o.material && o.material.isShadowMaterial);
    cena.conteudo.children.slice(n0).filter(ehGradeOuSombra).forEach(o => cena.conteudo.remove(o));
    const novos = cena.conteudo.children.slice(n0);
    const caminhao = new T.Group();
    novos.forEach(o => { cena.conteudo.remove(o); caminhao.add(o); });
    caminhao.rotation.y = Math.PI / 2;
    const cx = (G.laneA + G.laneB) / 2;
    caminhao.position.set(cx, 0, -W / 2 + 4.4);
    cena.conteudo.add(caminhao);
    rotuloTexto('CARREGAMENTO', cx, 4.6, -W / 2 + 2, 0.7);
    // pacotes
    const cheio = encherPatio(patio.grupos, [G.b11, G.b2, G.b3], patio.pos || {});
    const { d1, d2, d3 } = cheio;
    patio.posAtual = cheio.pos;
    patio.alvos = [];
    const caixas = [], tampas = [], fitas = [];
    const desenharLado = (d, lado) => {
        d.pilhas.forEach(pl => {
            for (let k = 0; k < pl.n; k++) {
                const y = k * (pl.alt + 0.08);
                caixas.push({ x: pl.x + pl.comp / 2, y: y + pl.alt / 2 + 0.08, z: pl.z + pl.larg / 2, sx: pl.comp, sy: pl.alt, sz: pl.larg, tom: k % 3 });
                tampas.push({ x: pl.x + pl.comp / 2, y: y + 0.04, z: pl.z + pl.larg / 2, sx: pl.comp * 0.9, sy: 0.08, sz: pl.larg * 0.9 });
                fitas.push(...fitasDoPacote({ comprimento: pl.comp, largura: pl.larg, altura: pl.alt }, { x: pl.x, y: y + 0.08, z: pl.z }));
                // etiqueta na cabeca do pacote, virada para o caminhao (2a fica a esquerda do caminhao, 1a e 3a a direita)
                const dir = pl.lado === 2 ? 1 : -1;
                etiquetaPatio(pl.p, dir > 0 ? pl.x + pl.comp + 0.006 : pl.x - 0.006, y + 0.08 + pl.alt / 2, pl.z + pl.larg / 2, Math.min(pl.larg, pl.alt * 1.6), dir);
            }
            const alto = pl.n * (pl.alt + 0.08);
            const alvo = new T.Mesh(new T.BoxGeometry(pl.comp, alto, pl.larg), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
            alvo.position.set(pl.x + pl.comp / 2, alto / 2, pl.z + pl.larg / 2);
            alvo.userData.pilha = { ...pl, lado };
            cena.conteudo.add(alvo);
            patio.alvos.push(alvo);
            if (patio.sel && patio.sel.lado === lado && patio.sel.c === pl.c && patio.sel.r === pl.r) {
                const borda = new T.LineSegments(new T.EdgesGeometry(alvo.geometry), new T.LineBasicMaterial({ color: 0x1d4ed8 }));
                borda.position.copy(alvo.position); borda.scale.set(1.03, 1.03, 1.03);
                cena.conteudo.add(borda);
            }
        });
    };
    desenharLado(d2, 2); desenharLado(d1, 1); desenharLado(d3, 3);
    malhaInstanciada(caixas, COR_MADEIRA);
    malhaInstanciada(tampas, 0x6b4f2a, false);
    malhaInstanciada(fitas, 0x16a34a, false);
    // numero das fileiras ao lado de cada bloco
    // F1, F2... na frente de cada fileira (lado do corredor)
    [G.b11, G.b2, G.b3].forEach(b => { for (let c = 0; c < b.deLado; c++) { const q = posBloco(b, b.fundo - 1, c); const xf = b.doFim ? q.x - 0.45 : q.x + 1.65; rotuloTexto(`F${b.primeiroN + c}`, xf, 0.35, q.z + 0.6, 0.4, '#1d4ed8'); } });
    // fantasma do arraste
    patio.fantasma = new T.Mesh(new T.BoxGeometry(1.2, 0.6, 1.2), new T.MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.45, depthWrite: false }));
    patio.fantasma.visible = false;
    cena.conteudo.add(patio.fantasma);
    rotuloTexto('PÁTIO 1ª', G.b11.x0 + 2 * PASSO, 0.6, G.b11.z0 - 0.9, 0.7, '#15803d');
    rotuloTexto('PÁTIO 2ª', G.b2.x0 + 1.5 * PASSO, 0.6, G.b2.z0 - 0.9, 0.7, '#a16207');
    rotuloTexto('PÁTIO 3ª', G.b3.x0 + 1.5 * PASSO, 0.6, G.b3.z0 - 0.9, 0.7, '#b91c1c');
    patio.d1 = d1; patio.d2 = d2; patio.d3 = d3;
    const total = patio.grupos.reduce((s, g) => s + g.qtd, 0);
    const fora = patio.grupos.reduce((s, g) => s + (g.fora || 0), 0);
    const vol = patio.grupos.reduce((s, g) => s + g.qtd * (g.p.esp / 100) * (g.p.larg / 100) * g.p.comp * (g.p.alt * g.p.cam + (g.p.am || 0)), 0);
    document.getElementById('v3dInfo').textContent = `${total} pacote(s) no pátio · ${fmt(vol, 3)} m³ · 1ª: ${d1.fileiras.length} de ${d1.total} fileiras · 2ª: ${d2.fileiras.length} de ${d2.total} fileiras · até ${MAX_PILHA} por pilha${fora ? ` · ${fora} não cabem` : ''}`;
    renderListaPatio();
}
function renderListaPatio() {
    const el = document.getElementById('v3dLista');
    if (!el) return;
    const linhaFil = (f, lado) => {
        const p = f.p;
        const ativo = patio.sel && patio.sel.lado === lado && patio.sel.fileira === f.n;
        const cor = p.classe === 1 ? '#16a34a' : p.classe === 2 ? '#eab308' : '#dc2626';
        return `<button type="button" class="v3d-item v3d-item-patio${ativo ? ' ativo' : ''}" style="--cor:${cor}" data-pfil="${lado}|${f.n}">
          <span class="v3d-item-txt"><b>F${f.n}${f.bloco ? ` (${f.bloco})` : ''} · ${p.classe}ª · ${fmt(p.esp, 1)} × ${fmt(p.larg, 1)} × ${fmt(p.comp, 2)}</b>
          <span>(${p.alt}×${p.cam})${p.am ? ` + ${p.am}` : ''} · ${f.pacotes} pacote(s) em ${f.pilhas} pilha(s)${f.medidas && f.medidas.size > 1 ? ' · fileira misturada' : ''}</span></span></button>`;
    };
    const sel = patio.sel;
    let ficha = '';
    if (sel) {
        const p = sel.p, pecas = p.alt * p.cam + (p.am || 0);
        ficha = `<div class="v3d-ficha"><b class="v3d-ficha-tit">Pátio ${sel.lado}ª${sel.lado === 3 ? ' (fora)' : ''} · Fileira F${sel.fileira}</b><dl>
          <div><dt>Medida</dt><dd>${fmt(p.esp, 1)} × ${fmt(p.larg, 1)} cm × ${fmt(p.comp, 2)} m</dd></div>
          <div><dt>Classe</dt><dd>${p.classe}ª</dd></div>
          <div><dt>Configuração</dt><dd>(${p.alt}×${p.cam})${p.am ? ` + ${p.am}` : ''}</dd></div>
          <div><dt>Peças por pacote</dt><dd>${pecas}</dd></div>
          <div><dt>Volume por pacote</dt><dd>${fmt((p.esp / 100) * (p.larg / 100) * p.comp * pecas, 3)} m³</dd></div>
          <div><dt>Posição</dt><dd>${sel.posicao}ª pilha a partir do muro</dd></div>
          <div><dt>Pacotes nesta pilha</dt><dd>${sel.n}</dd></div>
        </dl></div>`;
    }
    el.innerHTML = `<div class="v3d-lista-topo"><b>Pátio de pacotes</b>
        <p class="v3d-dica-lista">Visto da entrada: 1ª à esquerda (encostada no muro), caminhão no meio, 2ª e tora à direita.</p>
        <p class="v3d-dica-lista">Arraste uma pilha (segure e solte noutra vaga) para mudar de lugar. Toque para ver o pacote.</p>
        <div class="v3d-lista-acoes">
          ${patio.aoSalvar ? `<button type="button" id="v3dPatioSalvar" class="v3d-salvar-arranjo"${patio.alterado ? '' : ' disabled'}><i class="fa-solid fa-floppy-disk"></i> Salvar arrumação</button>` : ''}
          <button type="button" id="v3dPatioAuto">Arrumar automático</button>
        </div>
        ${patio.msg ? `<p class="v3d-dica-lista v3d-salvo">${patio.msg}</p>` : ''}
        <details class="v3d-patio-cfg"><summary>Configurar pátios</summary>
          ${[['b1', '1ª'], ['b2', '2ª'], ['b3', '3ª']].map(([k, nome]) => `<label class="v3d-patio-medida">Pátio ${nome}: <input type="number" min="1" max="12" data-pcfg="${k}|fundo" value="${patio.cfg[k].fundo}" aria-label="Pilhas de fundo do pátio ${nome}"> de fundo × <input type="number" min="1" max="12" data-pcfg="${k}|lado" value="${patio.cfg[k].lado}" aria-label="Fileiras do pátio ${nome}"> fileiras</label>`).join('')}
          <p class="v3d-dica-lista">Até ${MAX_PILHA} pacotes por pilha · 50 cm entre pilhas.</p>
        </details>
        ${ficha}</div>
      <div class="v3d-itens">
        <b class="v3d-lado-tit">Pátio 1ª</b>${patio.d1.fileiras.map(f => linhaFil(f, 1)).join('') || '<p class="v3d-dica-lista">Sem pacotes de 1ª.</p>'}
        <b class="v3d-lado-tit">Pátio 2ª</b>${patio.d2.fileiras.map(f => linhaFil(f, 2)).join('') || '<p class="v3d-dica-lista">Sem pacotes de 2ª.</p>'}
        <b class="v3d-lado-tit">Pátio 3ª (fora do galpão)</b>${patio.d3.fileiras.map(f => linhaFil(f, 3)).join('') || '<p class="v3d-dica-lista">Sem pacotes de 3ª.</p>'}
      </div>`;
}
function selecionarFileira(lado, n) {
    const d = lado === 1 ? patio.d1 : lado === 3 ? patio.d3 : patio.d2;
    const pl = d.pilhas.find(x => x.fileira === n);
    patio.sel = pl ? { ...pl, lado } : null;
    desenharPatio();
}
function raioPatio(e) {
    const T = window.THREE;
    const r = cena.renderer.domElement.getBoundingClientRect();
    const ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cena.camera);
    return ray;
}
// vaga mais perto do ponto do chao (qualquer patio), livre para a pilha que esta sendo arrastada
function vagaPerto(ponto, pl) {
    const G = patio.G;
    let melhor = null;
    [G.b11, G.b2, G.b3].forEach(b => {
        for (let r = 0; r + pl.ocupa <= b.fundo; r++) for (let c = 0; c < b.deLado; c++) {
            const q0 = posBloco(b, r, c), q1 = posBloco(b, r + pl.ocupa - 1, c);
            const cx = (Math.min(q0.x, q1.x) + Math.max(q0.x, q1.x) + 1.2) / 2, cz = q0.z + 0.6;
            const d = Math.hypot(ponto.x - cx, ponto.z - cz);
            if (d > 1.3 || (melhor && d >= melhor.d)) continue;
            let ok = true;
            for (let k = 0; k < pl.ocupa; k++) {
                const ocupada = !b.livre[r + k][c];
                const propria = pl.lado === b.lado && pl.c === c && r + k >= pl.r && r + k < pl.r + pl.ocupa;
                if (ocupada && !propria) ok = false;
            }
            if (ok) melhor = { b, r, c, d, cx, cz };
        }
    });
    return melhor;
}
function instalarPatioEventos() {
    const el = document.getElementById('v3dLista');
    if (el && !el.dataset.patioOk) {
        el.dataset.patioOk = '1';
        el.addEventListener('click', async e => {
            if (atual.modo !== 'patio' || !patio) return;
            const b = e.target.closest('[data-pfil]');
            if (b) { const [lado, n] = b.dataset.pfil.split('|').map(Number); selecionarFileira(lado, n); return; }
            if (e.target.closest('#v3dPatioAuto')) {
                patio.pos = {}; patio.alterado = true; patio.sel = null; patio.msg = 'Arrumado automático. Salve para guardar.';
                desenharPatio(); return;
            }
            const sv = e.target.closest('#v3dPatioSalvar');
            if (sv && patio.aoSalvar) {
                sv.disabled = true;
                try {
                    await patio.aoSalvar({ pos: patio.posAtual || {}, cfg: patio.cfg, salvoEm: new Date().toISOString() });
                    patio.alterado = false; patio.msg = 'Arrumação do pátio salva.';
                } catch (_) { patio.msg = 'Não foi possível salvar. Tente de novo.'; }
                renderListaPatio();
            }
        });
        el.addEventListener('change', e => {
            if (atual.modo !== 'patio' || !patio) return;
            const inp = e.target.closest('[data-pcfg]');
            if (!inp) return;
            const [k, campo] = inp.dataset.pcfg.split('|');
            const v = Math.min(12, Math.max(1, parseInt(inp.value, 10) || 1));
            patio.cfg = { ...patio.cfg, [k]: { ...patio.cfg[k], [campo]: v } };
            patio.alterado = true; patio.msg = 'Tamanho do pátio alterado. Salve para guardar.';
            desenharPatio();
        });
    }
    const palco = document.getElementById('v3dPalco');
    if (palco && !palco.dataset.patioOk) {
        palco.dataset.patioOk = '1';
        let ini = null, arr = null;
        const chao = () => new window.THREE.Plane(new window.THREE.Vector3(0, 1, 0), 0);
        palco.addEventListener('pointerdown', e => {
            if (atual.modo !== 'patio' || !patio || e.button > 0) return;
            ini = { x: e.clientX, y: e.clientY };
            const hit = raioPatio(e).intersectObjects(patio.alvos || [])[0];
            if (hit) {
                arr = { pl: hit.object.userData.pilha, vaga: null, moveu: false };
                cena.controls.enabled = false;
                e.stopPropagation();
            }
        }, true);
        const dica = document.createElement('div');
        dica.className = 'v3d-dica-pacote'; dica.hidden = true;
        palco.appendChild(dica);
        palco.addEventListener('pointermove', e => {
            if (atual.modo !== 'patio' || !patio) { dica.hidden = true; return; }
            if (!arr) {
                const hit = e.pointerType === 'mouse' ? raioPatio(e).intersectObjects(patio.alvos || [])[0] : null;
                if (hit) {
                    const [l1, l2] = textoPacotePatio(hit.object.userData.pilha.p);
                    dica.innerHTML = `<b>${l1}</b><span>${l2}</span>`;
                    const r = palco.getBoundingClientRect();
                    dica.style.left = (e.clientX - r.left + 14) + 'px';
                    dica.style.top = (e.clientY - r.top + 14) + 'px';
                    dica.hidden = false;
                    palco.style.cursor = 'grab';
                } else { dica.hidden = true; palco.style.cursor = ''; }
                return;
            }
            dica.hidden = true;
            if (Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 6) arr.moveu = true;
            if (!arr.moveu) return;
            palco.style.cursor = 'grabbing';
            const pt = new window.THREE.Vector3();
            if (!raioPatio(e).ray.intersectPlane(chao(), pt)) return;
            arr.vaga = vagaPerto(pt, arr.pl);
            const f = patio.fantasma;
            if (arr.vaga) {
                f.scale.set(arr.pl.ocupa * PASSO - 0.5, Math.max(0.3, arr.pl.n * (arr.pl.alt + 0.08)) / 0.6, 1.2);
                f.position.set(arr.vaga.cx, f.scale.y * 0.3, arr.vaga.cz);
                f.visible = true;
            } else f.visible = false;
            cena.sujo = true;
        }, true);
        palco.addEventListener('pointerup', e => {
            if (atual.modo !== 'patio' || !patio) return;
            cena.controls.enabled = true;
            palco.style.cursor = '';
            if (arr) {
                const a = arr; arr = null; ini = null;
                if (a.moveu) {
                    if (a.vaga) {
                        // troca a posicao desta pilha nas posicoes atuais e redesenha
                        const pos = JSON.parse(JSON.stringify(patio.posAtual || {}));
                        const lista = pos[a.pl.k] || [];
                        const i = lista.findIndex(x => x.l === a.pl.lado && x.c === a.pl.c && x.r === a.pl.r);
                        const nova = { l: a.vaga.b.lado, c: a.vaga.c, r: a.vaga.r };
                        if (i >= 0) lista[i] = nova; else lista.push(nova);
                        pos[a.pl.k] = lista;
                        patio.pos = pos; patio.alterado = true;
                        patio.msg = 'Pilha movida. Salve para guardar a arrumação.';
                        patio.sel = null;
                    } else patio.msg = 'Sem vaga livre ali. Solte a pilha numa vaga vazia.';
                    desenharPatio();
                    return;
                }
                patio.sel = a.pl;
                desenharPatio();
                return;
            }
            if (!ini) return;
            const moveu = Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 6;
            ini = null;
            if (moveu) return; // girou a camera
            patio.sel = null;
            desenharPatio();
        }, true);
    }
}
window.abrirPatio3D = async function(itens, opcoes = {}) {
    if (!calc()) { alert('Módulo de montagem ainda carregando. Tente novamente em instantes.'); return; }
    const mapa = new Map();
    (itens || []).forEach(it => {
        const k = grupoChave(it.p);
        if (!mapa.has(k)) mapa.set(k, { k, p: it.p, qtd: 0 });
        mapa.get(k).qtd += Number(it.qtd) || 0;
    });
    const med = { comp: 0, larg: 0 };
    const salvo = opcoes.layout || {};
    const cfg = JSON.parse(JSON.stringify(CFG_PATIO_PADRAO));
    ['b1', 'b2', 'b3'].forEach(k => ['fundo', 'lado'].forEach(c => { const v = Number(salvo.cfg?.[k]?.[c]); if (v >= 1 && v <= 12) cfg[k][c] = v; }));
    // mais pacotes primeiro: fica mais perto do carregamento
    patio = { grupos: [...mapa.values()].filter(g => g.qtd > 0).sort((a, b) => b.qtd - a.qtd), comp: med.comp, larg: med.larg, sel: null, alvos: [], d1: { fileiras: [], pilhas: [] }, d2: { fileiras: [], pilhas: [] }, d3: { fileiras: [], pilhas: [] }, cfg, pos: salvo.pos || {}, aoSalvar: opcoes.aoSalvar || null, alterado: false, msg: salvo.pos ? 'Arrumação salva carregada.' : '' };
    const modal = garantirModal();
    modal.style.display = 'flex';
    document.getElementById('v3dTitulo').textContent = opcoes.titulo || 'Pátio em 3D';
    atual.modo = 'patio';
    try { await garantirThree(); }
    catch (_) { document.getElementById('v3dPalco').innerHTML = '<div class="v3d-carregando">Não foi possível carregar o 3D. Verifique a internet e tente de novo.</div>'; return; }
    if (!cena) criarCena(document.getElementById('v3dPalco'));
    else if (!document.getElementById('v3dPalco').contains(cena.renderer.domElement)) document.getElementById('v3dPalco').appendChild(cena.renderer.domElement);
    instalarPatioEventos();
    desenhar();
    // visto de quem chega pela entrada (como na foto): 1a a esquerda, 2a e tora a direita
    enquadrar(-patio.comp * 0.06, 0, 0, Math.max(patio.comp, patio.larg) * 0.62, [-0.3, 1, -0.95]);
};
