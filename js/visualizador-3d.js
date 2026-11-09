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
    return { classe: numeroClasse(p.classe || p.qualidade), esp, larg, comp, alt, cam, am, tipo, nome: nome || 'Madeira' };
}

const COR_CLASSE = { 1: 0x16a34a, 2: 0xeab308, 3: 0xdc2626 };

// ---------- montagem das tabuas de um pacote ----------
// Eixos: x = comprimento da tabua, y = altura, z = largura do pacote. Unidade: metro.
function tabuasDoPacote(p, origem = { x: 0, y: 0, z: 0 }) {
    const C = calc();
    const viga = C.ehViga(p);
    const e = p.esp / 100, l = p.larg / 100, L = p.comp;
    const W = C.largPacote(p);
    const vao = C.vaoMeio(p);
    const folga = 0.0015; // separa visualmente as pecas
    const out = []; // {x,y,z, sx,sy,sz, tom}
    const add = (x, y, z, sx, sy, sz, tom = 0) => out.push({ x: origem.x + x, y: origem.y + y, z: origem.z + z, sx, sy, sz, tom });

    // pezinho: atravessado (ao longo de z) nas duas pontas; tabua: 4 pecas empilhadas, viga: 1 peca
    const nPe = viga ? 1 : 4;
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
    const fecharVao = (yIni, yFim) => {
        if (!vao) return;
        const zIni = Math.floor(p.cam / 2) * l;
        const n = Math.max(1, Math.floor(vao / e + 0.001));
        for (let k = 0; k < n; k++) add(L / 2, (yIni + yFim) / 2, zIni + k * e + e / 2, L, (yFim - yIni) - folga, e - folga, 1);
    };
    for (let r = 0; r < p.alt; r++) {
        if (!viga && r > 0 && r % 10 === 0) {
            fecharVao(yGrupoInicio, y);
            // fileira de amarra: 2 tabuas atravessadas nas pontas
            [0.06 + l / 2, L - 0.06 - l / 2].forEach(xc => add(xc, y + e / 2, W / 2, l - folga, e - folga, W, 2));
            y += e;
            yGrupoInicio = y;
        }
        zs.forEach(z => add(L / 2, y + e / 2, z, L, e - folga, l - folga, (r + Math.round(z * 100)) % 3 === 0 ? 1 : 0));
        y += e;
    }
    fecharVao(yGrupoInicio, y);
    // viga: pecas adicionais formam uma camada incompleta por cima
    if (viga && p.am > 0) {
        for (let c = 0; c < Math.min(p.am, zs.length); c++) add(L / 2, y + e / 2, zs[c], L, e - folga, l - folga, 1);
        y += e;
    }
    return { pecas: out, altura: y, largura: W, comprimento: L };
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xffffff, 1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, 1, 0.01, 200);
    const controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene.add(new T.HemisphereLight(0xffffff, 0xd8d2c8, 0.75));
    scene.add(new T.AmbientLight(0xffffff, 0.25));
    const sol = new T.DirectionalLight(0xffffff, 0.95);
    sol.position.set(6, 12, 8);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
    sol.shadow.bias = -0.0005;
    scene.add(sol);
    const conteudo = new T.Group();
    scene.add(conteudo);
    cena = { renderer, scene, camera, controls, conteudo, container, raf: 0 };
    const redimensionar = () => {
        const w = container.clientWidth || 600, h = container.clientHeight || 400;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    cena.redimensionar = redimensionar;
    redimensionar();
    const loop = () => {
        cena.raf = requestAnimationFrame(loop);
        if (container.offsetParent === null) return; // janela fechada: nao gasta bateria
        controls.update();
        renderer.render(scene, camera);
    };
    loop();
    window.addEventListener('resize', redimensionar);
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
    const mat = new T.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new T.InstancedMesh(geo, mat, lista.length);
    const m = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), esc = new T.Vector3();
    const tons = [new T.Color(cor), new T.Color(cor).offsetHSL(0, -0.05, -0.06), new T.Color(cor).offsetHSL(0.01, 0.02, -0.14)];
    lista.forEach((b, i) => {
        pos.set(b.x, b.y, b.z);
        esc.set(b.sx, b.sy, b.sz);
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
}

const COR_MADEIRA = 0xd2a26a;

function desenharTabua(p) {
    limparConteudo();
    grade(4, 0.1, 0.5);
    const e = p.esp / 100, l = p.larg / 100, L = p.comp;
    malhaInstanciada([{ x: 0, y: e / 2, z: 0, sx: L, sy: e, sz: l, tom: 0 }], COR_MADEIRA, false);
    enquadrar(0, e / 2, 0, Math.max(L, 0.5) / 2, [0.6, 0.55, 1]);
    return `Tábua única: ${fmt(p.esp, 1)} cm × ${fmt(p.larg, 1)} cm × ${fmt(L, 2)} m · ${fmt(e * l * L, 4)} m³ por peça`;
}

function desenharPacote(p) {
    limparConteudo();
    const C = calc();
    const dim = tabuasDoPacote(p, { x: 0, y: 0, z: 0 });
    grade(Math.max(4, Math.ceil(p.comp + 2)), 0.1, 0.5);
    const off = { x: -dim.comprimento / 2, y: 0, z: -dim.largura / 2 };
    malhaInstanciada(dim.pecas.map(b => ({ ...b, x: b.x + off.x, z: b.z + off.z })), COR_MADEIRA);
    malhaInstanciada(fitasDoPacote(dim, off), 0x16a34a, false);
    enquadrar(0, dim.altura / 2, 0, Math.max(dim.comprimento, dim.altura, dim.largura) / 1.6);
    const pecas = p.alt * p.cam + p.am;
    const m3 = (p.esp / 100) * (p.larg / 100) * p.comp * pecas;
    return `Pacote ${C.ehViga(p) ? 'de viga ' : ''}(${p.alt}×${p.cam})${p.am ? ` + ${p.am}${C.ehViga(p) ? ' pç' : ' am'}` : ''}: ${fmt(dim.comprimento, 2)} × ${fmt(dim.largura, 2)} × ${fmt(dim.altura, 2)} m · ${pecas} peças · ${fmt(m3, 3)} m³`;
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
        for (let i = 0; i < n; i++) {
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
    const m = C.montar(lista, { comps, largura: cfg.larg, altMax: cfg.alt });
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
        pecas.push(...dim.pecas);
        fitas.push(...fitasDoPacote(dim, { x: ox, y: oy, z: oz }));
    });
    malhaInstanciada(pecas, COR_MADEIRA);
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
    let txt = `${m.colocados.length} pacote(s) no caminhão · ${fmt(vol, 3)} m³ · ${m.cacambas.reduce((s, cb) => s + cb.vagas, 0) * m.fileiras} vagas no piso`;
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
    const { inicioCacamba, z0 } = desenharVeiculo([comp], W, { fueiro: Math.max(2.4, Math.min(maxAlt + 0.25, 3.3)), florestal: true });
    const x0 = inicioCacamba[0];
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
        const mats = [new T.MeshLambertMaterial({ color: 0x6b4a2b }), new T.MeshLambertMaterial({ color: 0xe0b98a }), new T.MeshLambertMaterial({ color: 0xe0b98a })];
        const mesh = new T.InstancedMesh(geo, mats, lista.length);
        const m = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), esc = new T.Vector3();
        lista.forEach((t, i) => { pos.set(t.x, t.y, t.z); esc.set(t.L, t.raio, t.raio); m.compose(pos, q, esc); mesh.setMatrixAt(i, m); });
        mesh.instanceMatrix.needsUpdate = true;
        cena.conteudo.add(mesh);
    }
    // marcas das 8 medidas: poste vermelho na altura medida de cada ponto
    [[esq, z0 - 0.05], [dir, -z0 + 0.05]].forEach(([alts, zz]) => alts.forEach((h, i) => {
        if (!(h > 0)) return;
        const xx = x0 + comp - (comp / alts.length) * (i + 0.5);
        caixa(xx, PISO + h / 2, zz, 0.025, h, 0.025, 0xdc2626);
        caixa(xx, PISO + h, zz, 0.12, 0.025, 0.06, 0xdc2626);
    }));
    enquadrar(0, 1.6, 0, (comp + CAB) / 2.2, [0.9, 0.6, 1.3]);
    const todas = [...esq, ...dir].filter(a => a > 0);
    const media = todas.length ? Math.trunc(todas.reduce((s, a) => s + a, 0) / todas.length * 100) / 100 : 0;
    const vol = comp * W * media;
    return `${cfg.caminhao ? cfg.caminhao + ' · ' : ''}${fmt(comp, 2)} × ${fmt(W, 2)} m · altura média ${fmt(media, 2)} m · ${fmt(vol, 3)} m³ · desenho com toras de ~${Math.round(d * 100)} cm (ilustrativo; o volume vem das medidas)`;
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
    atual.tora = { ...cfg };
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
    // monta da cabine para tras, pilha cheia por pilha
    const vagas = [];
    comps.forEach((c, ci) => { for (let i = o.porLinha[ci] - 1; i >= 0; i--) for (let f = 0; f < o.fileiras; f++) vagas.push({ ci, i, f }); });
    const pecas = [];
    let restante = qtd;
    vagas.forEach(v => {
        const n = Math.min(porPilha, restante);
        restante -= n;
        const sobraX = comps[v.ci] - o.porLinha[v.ci] * o.px, sobraZ = W - o.fileiras * o.pz;
        const ox = inicioCacamba[v.ci] + sobraX / 2 + v.i * o.px;
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
    desenharPregos(p.pregos.map(g => ({ x: g.x - p.L / 2, y: g.y + (g.camada || 0) * sobe + (g.topo ? 0.0015 : -0.0015), z: g.z - p.W / 2 })));
    const alturaVista = p.altura + sobe * 3;
    enquadrar(0, alturaVista / 2, 0, Math.max(p.L, p.W, alturaVista) / 1.7, [1, 0.8, 1.2]);
    const pecas = (m.componentes || []).reduce((s, c) => s + (Number(c.qtd) || 0), 0);
    const m3 = (m.componentes || []).reduce((s, c) => s + (Number(c.qtd) || 0) * (Number(c.esp) / 100) * (Number(c.larg) / 100) * (Number(c.comp) || 0), 0);
    const pregosTxt = m.pregos ? `${m.pregos} pregos` : `${p.pregos.length} pregos no desenho`;
    return `Palete ${fmt(p.W, 2)} × ${fmt(p.L, 2)} m · altura ${fmt(p.altura * 100, 1)} cm · ${pecas} peças · ${fmt(m3, 4)} m³ · ${pregosTxt}${vista === 'explodido' ? ' · peças soltas: de baixo para cima tábuas de baixo, blocos, ligação e tábuas de cima' : ''}`;
}

// ---------- modal ----------
let atual = { modo: 'madeira', palete: null, paleteVista: 'montado', tora: null, caminhaoPalete: { qtd: 216, comp1: 7.2, comp2: 7.2, larg: 2.4, alt: 2.6, bitrem: false }, produto: null, aba: 'pacote', caminhao: { qtd: 22, comp1: 7.2, comp2: 7.2, larg: 2.4, alt: 2.6, bitrem: false } };

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
          <div class="v3d-cfg" id="v3dCfg" hidden>
            <label id="v3dWrapQtd"><span id="v3dQtdRotulo">Pacotes</span><input id="v3dQtd" type="number" min="1" step="1"></label>
            <label>Caçamba (m)<input id="v3dComp1" type="number" step="0.1"></label>
            <label class="v3d-check"><input id="v3dBitrem" type="checkbox"> Bitrem</label>
            <label id="v3dWrapComp2" hidden>Caçamba 2 (m)<input id="v3dComp2" type="number" step="0.1"></label>
            <label>Largura (m)<input id="v3dLarg" type="number" step="0.05"></label>
            <label>Altura máx. (m)<input id="v3dAlt" type="number" step="0.05"></label>
          </div>
        </div>
        <div class="v3d-corpo">
          <aside class="v3d-lista" id="v3dLista" hidden></aside>
          <div class="v3d-palco" id="v3dPalco"><div class="v3d-carregando">Carregando 3D…</div></div>
        </div>
        <p class="v3d-dica">Arraste para girar · role ou pince para aproximar · arraste com dois dedos (ou botão direito) para mover. Grade: quadradinho fino = 10 cm, linha forte = 50 cm (no caminhão: 50 cm e 1 m).</p>
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
        desenhar();
    };
    ['v3dQtd', 'v3dComp1', 'v3dComp2', 'v3dLarg', 'v3dAlt'].forEach(id => $(id).addEventListener('change', lerCfg));
    $('v3dBitrem').addEventListener('change', lerCfg);
    modal.addEventListener('click', e => { if (e.target === modal) window.fecharVisualizador3D(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') window.fecharVisualizador3D(); });
    return modal;
}

function desenhar() {
    const modal = document.getElementById('modalVisualizador3D');
    if (!modal || !cena) return;
    const abas = modal.querySelector('.v3d-abas');
    const vistas = document.getElementById('v3dPalVistas');
    const lista = document.getElementById('v3dLista');
    if (lista) lista.hidden = atual.modo !== 'montar';
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
            const antes = montagem.colocados.map(c2 => c2.u);
            montagem.colocados = [];
            montagem.selecionado = null;
            antes.forEach(colocarUnidade);
            montagem.recalcular = false;
        }
        desenharMontagem();
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
    atual.modo = 'madeira';
    try {
        await garantirThree();
    } catch (_) {
        document.getElementById('v3dPalco').innerHTML = '<div class="v3d-carregando">Não foi possível carregar o 3D. Verifique a internet e tente de novo.</div>';
        return;
    }
    if (!cena) criarCena(document.getElementById('v3dPalco'));
    else if (!document.getElementById('v3dPalco').contains(cena.renderer.domElement)) document.getElementById('v3dPalco').appendChild(cena.renderer.domElement);
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
        if (v >= c.v && v < c.v + c.n) h = Math.max(h, c.topo + g.C.altPacote(c.u.p));
    });
    return h;
}

function avaliarVaga(g, u, ci, f, v, ignorar) {
    const n = nVagas(u, g);
    if (ci < 0 || ci >= g.comps.length || f < 0 || f >= g.fileiras || v < 0 || v + n > g.vagas[ci]) return null;
    const base = Array.from({ length: n }, (_, k) => alturaVaga(g, ci, f, v + k, ignorar));
    const topo = Math.max(...base);
    if (base.some(h => Math.abs(h - topo) > 0.12)) return null;           // pacote longo nao apoia em degrau
    if (topo + g.C.altPacote(u.p) > g.altMax + 0.001) return null;        // passa da altura maxima
    return { ci, f, v, n, topo };
}

// mesma regra do automatico: mais baixo, mais no meio, equilibra lados, cruzado
function melhorVaga(g, u) {
    let melhor = null, chaveMelhor = null;
    const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 0.001) return a[i] - b[i]; return 0; };
    g.comps.forEach((_, ci) => { for (let f = 0; f < g.fileiras; f++) for (let v = 0; v < g.vagas[ci]; v++) {
        const r = avaliarVaga(g, u, ci, f, v);
        if (!r) continue;
        const centro = (v + r.n / 2) - g.vagas[ci] / 2;
        const naCamada = montagem.colocados.filter(c => c.ci === ci && c.f === f && Math.abs(c.topo - r.topo) < 0.05).length;
        const chave = [Math.round(r.topo * 100), Math.abs(centro), naCamada, f === 0 ? -centro : centro, -ci];
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
            <span class="v3d-item-qtd">${gr.noCaminhao} no caminhão · ${resta} fora</span></div>
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
        ${sel ? `<button type="button" id="v3dRemoverSel" class="v3d-remover">Tirar o pacote selecionado</button>` : '<p class="v3d-dica-lista">Toque num pacote do caminhão para selecionar. Arraste para mudar de lugar.</p>'}
      </div>
      <div class="v3d-itens">${linhas || '<p class="v3d-dica-lista">Nenhum pacote para montar.</p>'}</div>`;
}

function mundoParaVaga(g, ponto, u) {
    // pacote centrado no ponteiro: vaga inicial = posicao - metade do pacote
    const n = nVagas(u, g);
    let ci = -1;
    montagem.geo.inicioCacamba.forEach((ini, i) => { if (ponto.x >= ini - 0.6 && ponto.x <= ini + g.comps[i] + 0.6) ci = i; });
    if (ci < 0) return null;
    const v = Math.round((ponto.x - montagem.geo.inicioCacamba[ci]) / g.VAGA - n / 2);
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
    document.getElementById('v3dInfo').textContent = `${montagem.colocados.length} de ${montagem.unidades.length} pacote(s) no caminhão · ${fmt(vol, 3)} m³ · ${g.vagas.reduce((s, n) => s + n, 0) * g.fileiras} vagas no piso${fora ? ` · ${fora} fora do caminhão` : ''}`;
    renderListaMontagem();
}

function instalarArraste() {
    if (!cena || cena.arrasteInstalado) return;
    cena.arrasteInstalado = true;
    const T = window.THREE;
    const el = cena.renderer.domElement;
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    const plano = new T.Plane(new T.Vector3(0, 1, 0), -PISO);
    let arraste = null;
    const lerPonteiro = e => {
        const r = el.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cena.camera);
    };
    el.addEventListener('pointerdown', e => {
        if (atual.modo !== 'montar' || !montagem || e.button > 0) return;
        lerPonteiro(e);
        const hit = ray.intersectObjects(montagem.alvos || [], false)[0];
        if (!hit) return;
        const c = hit.object.userData.colocado;
        montagem.selecionado = c;
        if (temAlgoEmCima(c)) {
            document.getElementById('v3dInfo').textContent = 'Este pacote tem outro por cima: tire o de cima primeiro.';
            desenharMontagem();
            return;
        }
        cena.controls.enabled = false;
        arraste = { c, moveu: false, alvo: null, x0: e.clientX, y0: e.clientY };
        el.setPointerCapture?.(e.pointerId);
        e.stopPropagation();
    }, true);
    el.addEventListener('pointermove', e => {
        if (!arraste) return;
        if (Math.hypot(e.clientX - arraste.x0, e.clientY - arraste.y0) > 4) arraste.moveu = true;
        if (!arraste.moveu) return;
        lerPonteiro(e);
        const p = new T.Vector3();
        if (!ray.ray.intersectPlane(plano, p)) return;
        const g = geometriaMontagem();
        const cand = mundoParaVaga(g, p, arraste.c.u);
        const r = cand && avaliarVaga(g, arraste.c.u, cand.ci, cand.f, cand.v, arraste.c);
        arraste.alvo = r;
        const f = montagem.fantasma;
        const base = r || (cand ? { ci: cand.ci, f: cand.f, v: cand.v, n: nVagas(arraste.c.u, g), topo: 0 } : null);
        if (!base) { f.visible = false; return; }
        const o = posicaoMundo(g, { ...base, u: arraste.c.u });
        const L = arraste.c.u.p.comp, H = g.C.altPacote(arraste.c.u.p), Wp = g.C.largPacote(arraste.c.u.p);
        f.scale.set(L, H, Wp);
        f.position.set(o.x + L / 2, o.y + H / 2, o.z + Wp / 2);
        f.material.color.set(r ? 0x16a34a : 0xdc2626);
        f.visible = true;
    });
    const soltar = () => {
        if (!arraste) return;
        const { c, moveu, alvo } = arraste;
        arraste = null;
        cena.controls.enabled = true;
        if (moveu && alvo) Object.assign(c, alvo);
        desenharMontagem();
    };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
}

function instalarListaEventos() {
    const el = document.getElementById('v3dLista');
    if (!el || el.dataset.ok) return;
    el.dataset.ok = '1';
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
            [...montagem.unidades].sort((a, c) => c.p.comp - a.p.comp || (C.meio(a.p) - C.meio(c.p)) || c.p.esp - a.p.esp).forEach(colocarUnidade);
            desenharMontagem();
            return;
        }
        if (b.id === 'v3dLimpar') { montagem.colocados = []; montagem.selecionado = null; desenharMontagem(); return; }
        if (b.id === 'v3dRemoverSel' && montagem.selecionado) {
            if (temAlgoEmCima(montagem.selecionado)) { document.getElementById('v3dInfo').textContent = 'Tire primeiro o pacote de cima.'; return; }
            montagem.colocados.splice(montagem.colocados.indexOf(montagem.selecionado), 1);
            montagem.selecionado = null;
            desenharMontagem();
        }
    });
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
    montagem = { unidades, colocados: [], selecionado: null, origem: opcoes.origem || 'Pacotes' };
    try { await garantirThree(); }
    catch (_) { document.getElementById('v3dPalco').innerHTML = '<div class="v3d-carregando">Não foi possível carregar o 3D. Verifique a internet e tente de novo.</div>'; return; }
    if (!cena) criarCena(document.getElementById('v3dPalco'));
    else if (!document.getElementById('v3dPalco').contains(cena.renderer.domElement)) document.getElementById('v3dPalco').appendChild(cena.renderer.domElement);
    instalarArraste();
    instalarListaEventos();
    // comeca com a montagem automatica; o usuario ajusta arrastando
    const C = calc();
    [...unidades].sort((a, c) => c.p.comp - a.p.comp || (C.meio(a.p) - C.meio(c.p)) || c.p.esp - a.p.esp).forEach(colocarUnidade);
    desenhar();
    const g = geometriaMontagem();
    enquadrar(0, 1.6, 0, (montagem.geo.total + CAB) / 2.2, [0.9, 0.7, 1.3]);
};
