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
    scene.add(new T.HemisphereLight(0xffffff, 0xcfc6b8, 0.85));
    const sol = new T.DirectionalLight(0xffffff, 0.75);
    sol.position.set(4, 8, 6);
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
    cena.conteudo.add(mesh);
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

function desenharCaminhao(p, cfg) {
    limparConteudo();
    const C = calc();
    const lista = Array.from({ length: Math.max(0, cfg.qtd) }, () => p);
    const comps = cfg.bitrem ? [cfg.comp1, cfg.comp2] : [cfg.comp1];
    const m = C.montar(lista, { comps, largura: cfg.larg, altMax: cfg.alt });
    const GAP = 0.55;
    const total = comps.reduce((s, c) => s + c, 0) + GAP * (comps.length - 1);
    grade(Math.ceil(total + CAB + 6), 0.5, 1);
    const W = cfg.larg;
    const z0 = -W / 2;
    // carrocerias
    let x = -total / 2 - CAB / 2;
    const inicioCacamba = [];
    comps.forEach((comp, ci) => {
        inicioCacamba.push(x);
        caixa(x + comp / 2, PISO - 0.08, 0, comp, 0.16, W, 0x8a5a2b);                 // assoalho
        caixa(x + comp / 2, PISO - 0.25, 0, comp, 0.18, 0.9, 0x2b2f36);               // longarina
        const n = Math.max(2, Math.round(comp / 1.2) + 1);
        for (let i = 0; i < n; i++) {
            const fx = x + 0.04 + (comp - 0.08) * (i / (n - 1));
            [z0 + 0.03, -z0 - 0.03].forEach(fz => caixa(fx, PISO + 0.5, fz, 0.07, 1.0, 0.06, 0x6b7280));
        }
        [1.2, 2.35].forEach(dx => [z0 + 0.25, -z0 - 0.25].forEach(rz => roda(x + dx, RODA, rz, RODA, 0.4)));  // eixo duplo atras
        x += comp + GAP;
    });
    // cabine na frente (x positivo)
    const xc = x - GAP + 0.35;
    caixa(xc + CAB / 2, (RODA + 0.25 + 3.05) / 2, 0, CAB, 3.05 - (RODA + 0.25), W * 0.95, 0x24507a);
    caixa(xc + CAB - 0.02, 2.25, 0, 0.04, 0.8, W * 0.8, 0xa9cbe3);                // para-brisa
    [z0 * 0.95 - 0.01, -z0 * 0.95 + 0.01].forEach(fz => caixa(xc + CAB - 0.8, 2.25, fz, 0.9, 0.7, 0.02, 0xa9cbe3));
    caixa(xc + CAB + 0.05, 0.85, 0, 0.12, 0.3, W * 0.98, 0xb8bec6);                 // para-choque
    [z0 + 0.25, -z0 - 0.25].forEach(rz => roda(xc + CAB - 0.75, RODA, rz, RODA, 0.35));
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

function desenharPalete(m, vista = 'montado') {
    if (vista === 'corte') return desenharCortePalete(m);
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
let atual = { modo: 'madeira', palete: null, paleteVista: 'montado', produto: null, aba: 'pacote', caminhao: { qtd: 22, comp1: 7.2, comp2: 7.2, larg: 2.4, alt: 2.6, bitrem: false } };

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
          </div>
          <div class="v3d-cfg" id="v3dCfg" hidden>
            <label>Pacotes<input id="v3dQtd" type="number" min="1" step="1"></label>
            <label>Caçamba (m)<input id="v3dComp1" type="number" step="0.1"></label>
            <label class="v3d-check"><input id="v3dBitrem" type="checkbox"> Bitrem</label>
            <label id="v3dWrapComp2" hidden>Caçamba 2 (m)<input id="v3dComp2" type="number" step="0.1"></label>
            <label>Largura (m)<input id="v3dLarg" type="number" step="0.05"></label>
            <label>Altura máx. (m)<input id="v3dAlt" type="number" step="0.05"></label>
          </div>
        </div>
        <div class="v3d-palco" id="v3dPalco"><div class="v3d-carregando">Carregando 3D…</div></div>
        <p class="v3d-dica">Arraste para girar · role ou pince para aproximar · arraste com dois dedos (ou botão direito) para mover. Grade: quadradinho fino = 10 cm, linha forte = 50 cm (no caminhão: 50 cm e 1 m).</p>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => { atual.aba = b.dataset.aba; desenhar(); }));
    modal.querySelectorAll('[data-pvista]').forEach(b => b.addEventListener('click', () => { atual.paleteVista = b.dataset.pvista; desenhar(); }));
    const $ = id => document.getElementById(id);
    const lerCfg = () => {
        atual.caminhao = {
            qtd: Math.max(1, parseInt($('v3dQtd').value, 10) || 1),
            comp1: Number($('v3dComp1').value) || 7.2,
            comp2: Number($('v3dComp2').value) || 7.2,
            larg: Number($('v3dLarg').value) || 2.4,
            alt: Number($('v3dAlt').value) || 2.6,
            bitrem: $('v3dBitrem').checked
        };
        $('v3dWrapComp2').hidden = !atual.caminhao.bitrem;
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
    if (atual.modo === 'palete') {
        if (abas) abas.hidden = true;
        if (vistas) vistas.hidden = false;
        modal.querySelectorAll('[data-pvista]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pvista === atual.paleteVista)));
        document.getElementById('v3dCfg').hidden = true;
        cena.redimensionar();
        document.getElementById('v3dInfo').textContent = desenharPalete(atual.palete, atual.paleteVista);
        return;
    }
    if (abas) abas.hidden = false;
    if (vistas) vistas.hidden = true;
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
