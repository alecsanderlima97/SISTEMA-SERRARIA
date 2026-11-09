// Montagem de carga no caminhao (somente visualizacao: nao grava nada).
// Le os pacotes do romaneio aberto e as medidas do caminhao em Frotas (pela placa).
// Logica validada no prototipo com o usuario (pezinho, amarras, viga, camada de cima centralizada).
import { db, collection, getDocs } from './firebase-init.js';

const fmt = (n, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pecas = p => p.alt * p.cam + p.am;
const m3 = p => (p.esp / 100) * (p.larg / 100) * p.comp * pecas(p);
// Tamanho fisico aproximado do pacote: altura = alturas x espessura; largura = camadas x largura da peca.
// Pacote: o pezinho sao 4 tabuas do proprio pacote empilhadas (4 x espessura).
// A cada 10 alturas vai uma fileira de amarra (mais uma tabua de espessura).
// 50 alturas de 1,7: (50 + 4 do pezinho + 4 fileiras de amarra) x 1,7 = ~0,99 m.
// Viga (toco grosso): o pezinho e uma viga so de 1,20 (nao entra na contagem), sem amarras;
// o "+N" sao pecas adicionais, uma camada incompleta por cima.
const ehViga = p => p.tipo ? p.tipo === 'viga' : p.esp >= 5;
const peAlt = p => (ehViga(p) ? 1 : 4) * p.esp / 100;
const fileirasAmarra = p => ehViga(p) ? 0 : Math.max(0, Math.floor((p.alt - 1) / 10));
const camadaExtra = p => ehViga(p) && p.am > 0 ? 1 : 0;
const altPacote = p => ehViga(p)
  ? ((p.alt + 1 + camadaExtra(p)) * p.esp) / 100
  : ((p.alt + 4 + fileirasAmarra(p)) * p.esp) / 100;
const unidadeExtra = p => ehViga(p) ? 'pç' : 'am';
// Largura sai do pezinho (1,20); camadas x largura da tabua nunca passa disso.
// Quando camadas x largura nao fecha 1,20 (ex.: 10 x 11 = 1,10), sobra um vao no meio
// completado com pecas em pe; o pacote fica com a largura do pezinho (1,20).
const vaoMeio = p => { const v = 1.2 - (p.cam * p.larg) / 100; return !ehViga(p) && v >= 0.03 ? v : 0; };
const largPacote = p => vaoMeio(p) ? 1.2 : Math.min(1.2, (p.cam * p.larg) / 100);
// Amarras padrao: 50 alturas = 16, 60 = 18 (4 no pezinho + 1 de cada lado a cada 10 alturas).
const amarrasPadrao = alt => Math.max(4, Math.round(6 + alt / 5));
// Meio pacote: abaixo de 40 alturas de 1,7 (cerca de 68 cm de altura).
const meio = p => p.alt * p.esp < 68;
const corClasse = c => c === 1 ? '#16a34a' : c === 2 ? '#eab308' : '#dc2626';

function montar(listaEntrada, cfg) {
  const L = cfg.comps;
  const largura = cfg.largura || 2.4;
  const altMax = cfg.altMax || 2.6;
  const lista = [...listaEntrada];
  // Vaga de 1,20 (2,40 ocupa duas). Se a carga for toda de 1,00, as vagas viram de 1,00 (cabe mais).
  const VAGA = lista.length && lista.every(p => p.comp <= 1.0 + 0.001) ? 1.0 : 1.2;
  // Primeiro os de 2,40 e os inteiros (base firme); meio pacote por cima.
  lista.sort((a, b) => b.comp - a.comp || (meio(a) - meio(b)) || b.esp - a.esp);
  const fileiras = Math.max(1, Math.min(2, Math.floor(largura / Math.max(...lista.map(largPacote), 1.0))));
  const cacambas = L.map(comp => ({ comp, vagas: Math.floor(comp / VAGA + 0.001), altura: [] }));
  cacambas.forEach(cb => { cb.altura = Array.from({ length: fileiras }, () => Array(cb.vagas).fill(0)); });
  const colocados = [], sobra = [];
  // Escolha da vaga: (1) a mais baixa; (2) a mais perto do meio da caçamba, para o peso
  // nao cair na frente nem atras; (3) a fileira com menos pacotes nessa camada (equilibra os lados);
  // (4) empate de distancia: motorista puxa para a frente, carona para tras (cruzado).
  const comparar = (a, b) => {
    for (let i = 0; i < a.length; i++) { if (Math.abs(a[i] - b[i]) > 0.001) return a[i] - b[i]; }
    return 0;
  };
  lista.forEach(p => {
    const n = Math.max(1, Math.round(p.comp / VAGA));
    let melhor = null;
    cacambas.forEach((cb, ci) => cb.altura.forEach((alts, f) => {
      for (let v = 0; v + n <= cb.vagas; v++) {
        const base = alts.slice(v, v + n);
        const topo = Math.max(...base);
        if (base.some(h => Math.abs(h - topo) > 0.12)) continue; // nao apoia pacote longo em degrau
        if (topo + altPacote(p) > altMax + 0.001) continue;
        const centro = (v + n / 2) - cb.vagas / 2;
        const naCamada = colocados.filter(c => c.ci === ci && c.f === f && Math.abs(c.topo - topo) < 0.05).length;
        const chave = [Math.round(topo * 100), Math.abs(centro), naCamada, f === 0 ? -centro : centro, -ci];
        if (!melhor || comparar(chave, melhor.chave) < 0) melhor = { ci, f, v, n, topo, chave };
      }
    }));
    if (!melhor) { sobra.push(p); return; }
    const alts = cacambas[melhor.ci].altura[melhor.f];
    for (let k = melhor.v; k < melhor.v + melhor.n; k++) alts[k] = melhor.topo + altPacote(p);
    colocados.push({ p, ...melhor });
  });
  centralizarCamadas(colocados, cacambas.map(cb => cb.comp / VAGA), c => altPacote(c.p), cfg.alinhar || {});
  // Ordem de carregamento: camada de baixo primeiro, da cabine para tras.
  colocados.sort((a, b) => a.topo - b.topo || b.ci - a.ci || b.v - a.v || a.f - b.f)
    .forEach((c, i) => { c.ordem = i + 1; });
  return { cacambas, colocados, sobra, fileiras, largura, altMax, VAGA };
}

// Alinhamento de cada nivel da carga, como o caminhoneiro escolhe: base (no assoalho), em cima
// (2a camada) e chapeu (3a em diante). 'tras' encosta na traseira, 'frente' encosta na cabine,
// 'centro' divide a sobra por 2. Os niveis de cima se alinham sobre o nivel de baixo (onde passa a fita).
// O espaco e medido em metros (comprimento da cacamba / vaga), entao a sobra que nao fecha uma vaga
// inteira (ex.: 0,80 m num caminhao de 8,00) tambem entra na conta.
// Se algum pacote de cima ficaria sem apoio, aquela fileira volta como estava.
function centralizarCamadas(colocados, espacoPorCacamba, alturaDe, alinhar = {}) {
  const grupos = new Map();
  colocados.forEach(c => { const k = c.ci + '|' + c.f; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(c); });
  const apoiado = lista => lista.every(c => {
    if (c.topo < 0.01) return true;
    for (let x = c.v + 0.125; x < c.v + c.n; x += 0.25) {
      let sup = 0;
      lista.forEach(o => { if (o !== c && o.topo < c.topo - 0.01 && x > o.v && x < o.v + o.n) sup = Math.max(sup, o.topo + alturaDe(o)); });
      if (Math.abs(sup - c.topo) > 0.12) return false;
    }
    return true;
  });
  grupos.forEach(lista => {
    const espaco = espacoPorCacamba[lista[0].ci] || 0;
    const niveis = [...new Set(lista.map(c => Math.round(c.topo * 100)))].sort((a, b) => a - b)
      .map(k => lista.filter(c => Math.round(c.topo * 100) === k));
    let lo = 0, hi = espaco;
    niveis.forEach((cam, nivel) => {
      const a = Math.min(...cam.map(c => c.v)), b = Math.max(...cam.map(c => c.v + c.n));
      const total = b - a;
      const modo = (nivel === 0 ? alinhar.base : nivel === 1 ? alinhar.cima : alinhar.chapeu) || 'centro';
      let x = modo === 'tras' ? lo : modo === 'frente' ? hi - total : lo + (hi - lo - total) / 2;
      x = total > hi - lo ? lo : Math.max(lo, Math.min(x, hi - total));
      const d = x - a;
      // move este nivel e tudo que esta em cima dele (a pilha anda junto)
      const acima = niveis.slice(nivel).flat();
      acima.forEach(c => { c.v += d; });
      if (!apoiado(lista)) acima.forEach(c => { c.v -= d; }); // ficaria sem apoio: mantem onde estava
      lo = Math.min(...cam.map(c => c.v)); hi = Math.max(...cam.map(c => c.v + c.n));
    });
  });
}

// Desenho do caminhao: cabine, chassi, rodas, assoalho e fueiros. Escala real em metros.
const ESC = 80;            // px por metro
const PISO = 1.25;         // altura do assoalho ao chao (m)
const RODA = 0.52;         // raio do pneu (m)
const CAB = 2.5;           // comprimento da cabine (m)
const GAP_CAB = 0.35, GAP_CACAMBA = 0.55;

function roda(cx, cy) {
  const r = RODA * ESC;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--tire)"/><circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="var(--rim)"/><circle cx="${cx}" cy="${cy}" r="${r * 0.18}" fill="var(--tire)"/>`;
}

function cabineLado(x, yChao) {
  const e = ESC, base = yChao - (RODA + 0.25) * e, topo = yChao - 3.05 * e;
  const w = CAB * e;
  // perfil: frente (direita) arredondada, para-brisa inclinado
  let s = `<path d="M${x} ${base} L${x} ${topo + 0.25 * e} Q${x} ${topo} ${x + 0.3 * e} ${topo} L${x + w - 0.75 * e} ${topo} Q${x + w - 0.45 * e} ${topo} ${x + w - 0.35 * e} ${topo + 0.3 * e} L${x + w - 0.08 * e} ${yChao - 1.55 * e} L${x + w} ${yChao - 1.45 * e} L${x + w} ${base} Z" fill="var(--cab)"/>`;
  // janela lateral e para-brisa
  s += `<path d="M${x + w - 1.25 * e} ${topo + 0.25 * e} L${x + w - 0.62 * e} ${topo + 0.25 * e} L${x + w - 0.38 * e} ${yChao - 1.95 * e} L${x + w - 1.25 * e} ${yChao - 1.95 * e} Z" fill="var(--glass)"/>`;
  // porta, macaneta, degrau, para-choque, farol, tanque
  s += `<rect x="${x + w - 1.32 * e}" y="${topo + 0.18 * e}" width="${1.0 * e}" height="${(yChao - 0.9 * e) - (topo + 0.18 * e)}" fill="none" stroke="var(--cab-line)" stroke-width="1.5" rx="4"/>`;
  s += `<rect x="${x + w - 0.55 * e}" y="${yChao - 1.65 * e}" width="${0.16 * e}" height="${0.05 * e}" fill="var(--rim)"/>`;
  s += `<rect x="${x + w - 0.08 * e}" y="${yChao - 1.0 * e}" width="${0.18 * e}" height="${0.32 * e}" rx="3" fill="var(--rim)"/>`;
  s += `<rect x="${x + w - 0.06 * e}" y="${yChao - 1.38 * e}" width="${0.1 * e}" height="${0.16 * e}" rx="2" fill="#facc15"/>`;
  s += `<rect x="${x + 0.15 * e}" y="${yChao - 1.15 * e}" width="${0.95 * e}" height="${0.42 * e}" rx="${0.2 * e}" fill="var(--rim)"/>`;
  s += `<rect x="${x + 0.05 * e}" y="${topo - 0.45 * e}" width="${0.09 * e}" height="${(base - topo) * 0.45 + 0.45 * e}" rx="2" fill="var(--rim)"/>`;
  s += roda(x + w - 0.75 * e, yChao - RODA * e);
  return s;
}

function cacambaLado(x, comp, yChao, altMax) {
  const e = ESC, w = comp * e, yPiso = yChao - PISO * e;
  let s = '';
  s += `<rect x="${x}" y="${yPiso}" width="${w}" height="${0.16 * e}" fill="var(--deck)"/>`;           // assoalho
  s += `<rect x="${x}" y="${yPiso + 0.16 * e}" width="${w}" height="${0.18 * e}" fill="var(--chassi)"/>`; // longarina
  // fueiros (estacas laterais) a cada ~1,2 m
  const n = Math.max(2, Math.round(comp / 1.2) + 1);
  for (let i = 0; i < n; i++) {
    const fx = x + (w - 0.08 * e) * (i / (n - 1));
    s += `<rect x="${fx}" y="${yPiso - 1.0 * e}" width="${0.08 * e}" height="${1.0 * e}" fill="var(--steel)" opacity=".55"/>`;
  }
  // limite de altura
  s += `<line x1="${x}" y1="${yPiso - altMax * e}" x2="${x + w}" y2="${yPiso - altMax * e}" stroke="var(--warn)" stroke-dasharray="7 5" stroke-width="1.5"/>`;
  s += `<text x="${x + w - 4}" y="${yPiso - altMax * e - 6}" text-anchor="end" font-size="12" fill="var(--warn)" font-family="IBM Plex Sans, sans-serif">altura máx. ${fmt(altMax, 2)} m</text>`;
  // eixo traseiro duplo (tandem)
  const xr = x + w - 1.35 * e;
  s += roda(xr, yChao - RODA * e) + roda(xr + 1.15 * e, yChao - RODA * e);
  return s;
}

function cabineTopo(x, y, larg) {
  const e = ESC, w = CAB * e, h = larg * 0.92 * e, y0 = y + (larg * e - h) / 2;
  let s = `<rect x="${x}" y="${y0}" width="${w}" height="${h}" rx="${0.3 * e}" fill="var(--cab)"/>`;
  s += `<rect x="${x + w - 0.55 * e}" y="${y0 + 0.12 * e}" width="${0.32 * e}" height="${h - 0.24 * e}" rx="6" fill="var(--glass)"/>`;
  s += `<rect x="${x + w - 0.9 * e}" y="${y0 - 0.22 * e}" width="${0.14 * e}" height="${0.22 * e}" fill="var(--rim)"/><rect x="${x + w - 0.9 * e}" y="${y0 + h}" width="${0.14 * e}" height="${0.22 * e}" fill="var(--rim)"/>`;
  return s;
}

// Pacote visto de lado: tabuas empilhadas, amarra a cada 10 alturas e o pezinho embaixo.
function desenharPacoteLado(p, px, py, pw, ph, cor) {
  const pe = peAlt(p) * ESC;
  const hMad = ph - pe;
  const tabua = Math.max(4, (p.larg / 100) * ESC);
  let s = `<rect x="${px}" y="${py}" width="${pw}" height="${hMad}" rx="2" fill="var(--wood)" stroke="${cor}" stroke-width="3"/>`;
  const viga = ehViga(p);
  if (viga && p.am > 0) {
    const hx = (p.esp / 100) * ESC;
    s += `<rect x="${px + 2}" y="${py + 1}" width="${pw - 4}" height="${hx - 1}" fill="#e3bb84" stroke="rgba(60,35,10,.5)" stroke-dasharray="4 3"/>`;
  }
  const passo = viga ? 1e9 : 10;
  for (let k = passo; k < p.alt; k += passo) {
    const yy = py + hMad - (k / p.alt) * hMad;
    s += `<rect x="${px + 2}" y="${yy - 1.5}" width="7" height="3" fill="#5b3a1a"/><rect x="${px + pw - 9}" y="${yy - 1.5}" width="7" height="3" fill="#5b3a1a"/>`;
    s += `<line x1="${px + 10}" y1="${yy}" x2="${px + pw - 10}" y2="${yy}" stroke="rgba(80,50,20,.28)"/>`;
  }
  [0.1, 0.5, 0.9].forEach(f => { s += `<rect x="${px + pw * f - 1}" y="${py}" width="2" height="${ph - 2}" fill="#16a34a" opacity=".45"/>`; });
  // pezinho: 4 tabuas do proprio pacote empilhadas nas duas pontas
  [px + 4, px + pw - 4 - tabua].forEach(xx => {
    const nPe = viga ? 1 : 4;
    for (let t = 0; t < nPe; t++) s += `<rect x="${xx}" y="${py + hMad + t * pe / nPe}" width="${tabua}" height="${Math.max(1, pe / nPe - 0.6)}" fill="#6b4421"/>`;
  });
  return s;
}

function svgCarroceria(m, modo) {
  const e = ESC;
  const totalL = CAB + GAP_CAB + m.cacambas.reduce((s, c) => s + c.comp, 0) + GAP_CACAMBA * (m.cacambas.length - 1);
  const W = totalL * e + 40;
  const topo = modo === 'topo';
  const H = topo ? (m.largura + 0.9) * e : (PISO + m.altMax + 0.7) * e;
  const yChao = H - 6;
  const yTopo = 0.45 * e;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${topo ? 'Vista de cima da carga no caminhão' : 'Vista lateral da carga no caminhão'}">`;
  s += `<defs><pattern id="hach-${modo}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="rgba(255,255,255,.55)"/></pattern></defs>`;
  // caminhao virado para a direita: carroceria a esquerda, cabine na frente (direita)
  let x0 = 20;
  if (!topo) s += `<line x1="0" y1="${yChao}" x2="${W}" y2="${yChao}" stroke="var(--line)" stroke-width="2"/>`;
  m.cacambas.forEach((cb, ci) => {
    const cw = cb.comp * e;
    if (topo) {
      s += `<rect x="${x0}" y="${yTopo}" width="${cw}" height="${m.largura * e}" fill="var(--deck)" opacity=".35" stroke="var(--steel)" stroke-width="3"/>`;
      const xr = x0 + cw - 1.35 * e;
      [xr, xr + 1.15 * e].forEach(xx => { s += `<rect x="${xx - 0.45 * e}" y="${yTopo - 0.16 * e}" width="${0.9 * e}" height="${0.14 * e}" rx="3" fill="var(--tire)"/><rect x="${xx - 0.45 * e}" y="${yTopo + m.largura * e + 0.02 * e}" width="${0.9 * e}" height="${0.14 * e}" rx="3" fill="var(--tire)"/>`; });
      for (let v = 1; v < cb.vagas; v++) { const xv = x0 + v * m.VAGA * e; s += `<line x1="${xv}" y1="${yTopo}" x2="${xv}" y2="${yTopo + m.largura * e}" stroke="var(--steel)" stroke-dasharray="3 4" opacity=".5"/>`; }
    } else {
      s += cacambaLado(x0, cb.comp, yChao, m.altMax);
      if (ci < m.cacambas.length - 1) s += `<rect x="${x0 + cw}" y="${yChao - (PISO - 0.2) * e}" width="${GAP_CACAMBA * e}" height="${0.12 * e}" fill="var(--chassi)"/>`;
    }
    const lado = modo === 'lado2' ? 1 : 0;
    const itens = m.colocados.filter(c => c.ci === ci && (topo || c.f === lado));
    const desenhar = topo ? itens.filter(c => !itens.some(o => o !== c && o.f === c.f && o.topo > c.topo && o.v < c.v + c.n && c.v < o.v + o.n)) : itens;
    desenhar.forEach(c => {
      const pw = c.p.comp * e - 4, px = x0 + c.v * m.VAGA * e + 2;
      let py, ph;
      if (topo) {
        const faixa = m.largura / m.fileiras, lp = Math.min(largPacote(c.p), faixa) * e - 4;
        py = yTopo + c.f * faixa * e + (faixa * e - lp) / 2; ph = lp;
      } else {
        ph = altPacote(c.p) * e - 2; py = yChao - PISO * e - c.topo * e - ph - 1;
      }
      const cor = corClasse(c.p.classe);
      if (topo) {
        s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="3" fill="var(--wood)" stroke="${cor}" stroke-width="3"/>`;
      } else {
        s += desenharPacoteLado(c.p, px, py, pw, ph, cor);
      }
      if (meio(c.p)) s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="3" fill="url(#hach-${modo})"/>`;
      s += `<text x="${px + pw / 2}" y="${py + ph / 2 + (topo ? 5 : 0)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="14" font-weight="600" fill="#1f1c18">${c.ordem}</text>`;
      if (!topo) s += `<text x="${px + pw / 2}" y="${py + ph / 2 + 15}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#3b2a18">${c.p.alt} alt</text>`;
    });
    if (topo) s += `<text x="${x0 + cw / 2}" y="${H - 8}" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="13" fill="var(--muted)">${m.cacambas.length > 1 ? `Caçamba ${ci + 1} · ` : ''}${fmt(cb.comp, 2)} m × ${fmt(m.largura, 2)} m</text>`;
    x0 += cw + (ci < m.cacambas.length - 1 ? GAP_CACAMBA * e : 0);
  });
  x0 += GAP_CAB * e;
  s += topo ? cabineTopo(x0, yTopo, m.largura) : cabineLado(x0, yChao);
  if (topo) s += `<text x="${x0 + CAB * e / 2}" y="${H - 8}" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="13" fill="var(--muted)">frente</text>`;
  s += '</svg>';
  return s;
}


const PADRAO = { comp: 7.2, larg: 2.4, alt: 2.6 };
let frotaCache = null;
let estado = { bitrem: false, comp1: PADRAO.comp, comp2: PADRAO.comp, larg: PADRAO.larg, alt: PADRAO.alt, origem: '' };

function numeroClasse(q) {
  const t = String(q || '').toUpperCase();
  if (t.includes('3')) return 3;
  if (t.includes('2')) return 2;
  return 1;
}

// Converte os pacotes do romaneio para o formato do desenho (1 item por pacote fisico).
function pacotesDoRomaneio(pacotes = []) {
  const lista = [];
  pacotes.forEach(p => {
    const esp = Number(p.esp) || 0, larg = Number(p.larg) || 0;
    const comp = Number(p.compR) || Number(p.compV) || 0;
    if (!(esp > 0 && larg > 0 && comp > 0)) return;
    let cam = Number(p.cam) || 0, alt = Number(p.alt) || 0, am = Number(p.amarras) || 0;
    if (!cam) cam = Math.max(1, Math.floor(120 / larg + 0.001));
    if (!alt) { alt = Math.max(1, Math.round((Number(p.pecasPorPacote) || cam) / cam)); am = 0; }
    const item = { id: String(p.id), classe: numeroClasse(p.qualidade), esp, larg, comp, alt, cam, am };
    for (let i = 0; i < (Number(p.qtdPacotes) || 1); i++) lista.push(item);
  });
  return lista;
}

async function carregarFrota() {
  if (frotaCache) return frotaCache;
  let registros = [];
  try {
    const snap = await getDocs(collection(db, 'frotas'));
    registros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) { registros = []; }
  try { registros = registros.concat(JSON.parse(localStorage.getItem('orquestra_frota') || '[]')); } catch (_) {}
  frotaCache = registros;
  return registros;
}

const normPlaca = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function medidasDoCaminhao(placa) {
  const alvo = normPlaca(placa);
  if (!alvo) return null;
  const frota = await carregarFrota();
  const v = frota.find(r => normPlaca(r.placa) === alvo);
  if (!v) return null;
  const m = window.OrquestraCaminhoes?.medidas(v) || {};
  const metro = n => (n > 30 ? n / 100 : n); // aceita cm por engano
  const comp = metro(Number(m.comp) || 0), larg = metro(Number(m.larg) || 0), alt = metro(Number(m.alt) || 0);
  if (!comp) return null;
  return { comp, larg: larg || PADRAO.larg, alt: alt || PADRAO.alt, nome: v.modelo || v.caminhao || '' };
}

function garantirModal() {
  let modal = document.getElementById('modalMontagemCarga');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'modalMontagemCarga';
  modal.className = 'mc-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'mcTitulo');
  modal.innerHTML = `
    <div class="mc-caixa">
      <header class="mc-topo">
        <div><h3 id="mcTitulo">Montagem no caminhão</h3><p id="mcOrigem"></p></div>
        <button type="button" class="mc-fechar" aria-label="Fechar" onclick="window.fecharMontagemCarga()">×</button>
      </header>
      <div class="mc-conteudo">
        <div class="mc-cfg">
          <div class="mc-seg" role="group" aria-label="Tipo de veículo">
            <button type="button" id="mcBtnTruck" aria-pressed="true">Caminhão</button>
            <button type="button" id="mcBtnBitrem" aria-pressed="false">Bitrem</button>
          </div>
          <label>Caçamba 1 (m)<input id="mcComp1" type="number" step="0.1"></label>
          <label id="mcWrapComp2" hidden>Caçamba 2 (m)<input id="mcComp2" type="number" step="0.1"></label>
          <label>Largura (m)<input id="mcLarg" type="number" step="0.05"></label>
          <label>Altura máx. (m)<input id="mcAlt" type="number" step="0.05"></label>
        </div>
        <button type="button" class="mc-btn-3d" onclick="window.montarCargaRomaneio3D()"><i class="fa-solid fa-cube"></i> Montar em 3D (arrastar pacotes)</button>
        <div id="mcResumo" class="mc-resumo"></div>
        <div id="mcStatus"></div>
        <h4>Vista de cima</h4><div class="mc-draw" id="mcTopo"></div>
        <h4>Lateral · fileira do motorista</h4><div class="mc-draw" id="mcLado1"></div>
        <h4>Lateral · fileira do carona</h4><div class="mc-draw" id="mcLado2"></div>
        <p class="mc-nota">Número no pacote = ordem de carregamento (camada de baixo primeiro, da cabine para trás). A camada de cima vai centralizada para o peso ficar no meio. Listrado = meio pacote. Apenas visualização: nada aqui altera o romaneio.</p>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const $ = id => document.getElementById(id);
  const ler = () => {
    estado.comp1 = Number($('mcComp1').value) || PADRAO.comp;
    estado.comp2 = Number($('mcComp2').value) || PADRAO.comp;
    estado.larg = Number($('mcLarg').value) || PADRAO.larg;
    estado.alt = Number($('mcAlt').value) || PADRAO.alt;
    renderizar();
  };
  ['mcComp1', 'mcComp2', 'mcLarg', 'mcAlt'].forEach(id => $(id).addEventListener('input', ler));
  const setBitrem = b => {
    estado.bitrem = b;
    $('mcBtnTruck').setAttribute('aria-pressed', String(!b));
    $('mcBtnBitrem').setAttribute('aria-pressed', String(b));
    $('mcWrapComp2').hidden = !b;
    renderizar();
  };
  $('mcBtnTruck').onclick = () => setBitrem(false);
  $('mcBtnBitrem').onclick = () => setBitrem(true);
  modal.addEventListener('click', e => { if (e.target === modal) window.fecharMontagemCarga(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display !== 'none') window.fecharMontagemCarga(); });
  return modal;
}

function preencherCampos() {
  const $ = id => document.getElementById(id);
  $('mcComp1').value = estado.comp1; $('mcComp2').value = estado.comp2; $('mcLarg').value = estado.larg; $('mcAlt').value = estado.alt;
  $('mcBtnTruck').setAttribute('aria-pressed', String(!estado.bitrem));
  $('mcBtnBitrem').setAttribute('aria-pressed', String(estado.bitrem));
  $('mcWrapComp2').hidden = !estado.bitrem;
  $('mcOrigem').textContent = estado.origem;
}

function renderizar() {
  const modal = document.getElementById('modalMontagemCarga');
  if (!modal || modal.style.display === 'none') return;
  const dados = window.obterRomaneioParaMontagem?.() || { pacotes: [] };
  const lista = pacotesDoRomaneio(dados.pacotes);
  const comps = estado.bitrem ? [estado.comp1, estado.comp2] : [estado.comp1];
  const m = montar(lista, { comps, largura: estado.larg, altMax: estado.alt });
  const vol = m.colocados.reduce((s, c) => s + m3(c.p), 0);
  const inteiros = m.colocados.filter(c => !meio(c.p)).length;
  const meios = m.colocados.length - inteiros;
  document.getElementById('mcResumo').innerHTML = `
    <div><b>${m.colocados.length}</b><span>pacotes no caminhão</span></div>
    <div><b>${inteiros}${meios ? ` + ${meios}½` : ''}</b><span>inteiros + meios</span></div>
    <div><b>${fmt(vol, 3)}</b><span>m³</span></div>
    <div><b>${m.cacambas.reduce((s, c) => s + c.vagas, 0) * m.fileiras}</b><span>vagas no piso</span></div>`;
  document.getElementById('mcStatus').innerHTML = !lista.length
    ? '<p class="mc-nota">Adicione pacotes ao romaneio para ver a montagem.</p>'
    : m.sobra.length
      ? `<p class="mc-alerta">${m.sobra.length} pacote(s) não couberam: passaria da altura máxima ou não há apoio plano.</p>`
      : `<p class="mc-ok">Todos os ${m.colocados.length} pacotes couberam.</p>`;
  document.getElementById('mcTopo').innerHTML = svgCarroceria(m, 'topo');
  document.getElementById('mcLado1').innerHTML = svgCarroceria(m, 'lado1');
  document.getElementById('mcLado2').innerHTML = m.fileiras > 1 ? svgCarroceria(m, 'lado2') : '<p class="mc-nota">Só uma fileira cabe nesta largura.</p>';
}

window.abrirMontagemCarga = async function() {
  const modal = garantirModal();
  modal.style.display = 'flex';
  const dados = window.obterRomaneioParaMontagem?.() || {};
  const medidas = await medidasDoCaminhao(dados.placa);
  if (medidas) {
    const bitrem = medidas.comp > 9.5;
    const metade = +(medidas.comp / 2).toFixed(2);
    estado = {
      ...estado, bitrem,
      comp1: bitrem ? metade : medidas.comp,
      comp2: bitrem ? metade : PADRAO.comp,
      larg: medidas.larg, alt: medidas.alt,
      origem: `Medidas de Frotas: ${medidas.nome || 'caminhão'} · placa ${dados.placa}`
    };
  } else {
    estado.origem = dados.placa
      ? `Placa ${dados.placa} sem medidas em Frotas: usando 7,20 × 2,40 (ajuste abaixo).`
      : 'Sem caminhão selecionado: usando 7,20 × 2,40 (ajuste abaixo).';
  }
  preencherCampos();
  renderizar();
};

window.fecharMontagemCarga = function() {
  const modal = document.getElementById('modalMontagemCarga');
  if (modal) modal.style.display = 'none';
};

// Atualiza o desenho quando o romaneio muda com a janela aberta.
document.addEventListener('romaneioPacotesAlterados', renderizar);

// Regras do pacote compartilhadas com o visualizador 3D (Gestao de Madeira).
window.MontagemCargaCalc = { montar, centralizarCamadas, altPacote, largPacote, peAlt, fileirasAmarra, ehViga, vaoMeio, camadaExtra, meio };


// Montador 3D com os pacotes do romaneio (so os selecionados no romaneio).
window.montarCargaRomaneio3D = function() {
  const dados = window.obterRomaneioParaMontagem?.() || { pacotes: [] };
  const itens = [];
  (dados.pacotes || []).forEach(p => {
    const unidades = pacotesDoRomaneio([{ ...p, qtdPacotes: 1 }]);
    if (unidades.length) itens.push({ p: unidades[0], qtd: Number(p.qtdPacotes) || 1 });
  });
  window.abrirMontadorCarga3D?.(itens, {
    titulo: 'Montar carga do romaneio',
    origem: 'Pacotes do romaneio',
    caminhao: { comp1: estado.comp1, comp2: estado.comp2, larg: estado.larg, alt: estado.alt, bitrem: estado.bitrem }
  });
};
