// Cadastro de funcionário pelo holerite (PDF).
// A leitura é feita só no navegador (PDF.js): o holerite não é enviado a nenhum serviço
// nem fica salvo. Preenche nome, CPF, função, admissão, salário e dados bancários.

const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const RX_DINHEIRO = /\d{1,3}(?:\.\d{3})*,\d{2}/g;
const PALAVRAS_RUINS = /\b(CNPJ|CPF|EMPRESA|EMPREGADOR|ENDERECO|RECIBO|PAGAMENTO|SALARIO|COMPETENCIA|REFERENCIA|CODIGO|DEPARTAMENTO|SETOR|FILIAL|ADMISSAO|CBO|FOLHA|MENSAL|DESCRICAO|PROVENTOS|DESCONTOS|VENCIMENTOS|LTDA|EIRELI|ME\b|S\/A|SA\b|BANCO|AGENCIA|CONTA)\b/;

function cpfValido(c) {
    const d = String(c).replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
const fmtCpf = d => d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
const dinheiro = s => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0;
const dataIso = s => { const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

function limparNome(s) {
    return semAcento(s).toUpperCase()
        .replace(/^\s*[:\-]?\s*\d+\s*[-–]?\s*/, '')       // código do funcionário na frente
        .replace(/\s+\d[\d\s./-]*$/, '')                    // números no fim (CBO, setor...)
        .replace(/[^A-Z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const nomeOk = n => n && n.split(' ').length >= 2 && n.length >= 6 && n.length <= 70 && !PALAVRAS_RUINS.test(n);

// valor na mesma linha do rótulo, ou na linha de baixo na mesma "coluna" (cabeçalho + valores)
function valorPorRotulo(linhas, rotulo, extrair) {
    for (let i = 0; i < linhas.length; i++) {
        const L = linhas[i];
        const m = L.match(rotulo);
        if (!m) continue;
        const resto = L.slice(m.index + m[0].length);
        const v = extrair(resto, L);
        if (v) return v;
        if (linhas[i + 1]) {
            const v2 = extrair(linhas[i + 1], linhas[i + 1], true);
            if (v2) return v2;
        }
    }
    return '';
}

export function lerHolerite(textoOriginal) {
    const linhas = String(textoOriginal || '').split(/\n+/).map(l => semAcento(l).toUpperCase().replace(/\s+/g, ' ').trim()).filter(Boolean);
    const texto = linhas.join('\n');
    const r = {};

    // CPF (o primeiro CPF válido que não seja parte de CNPJ)
    for (const m of texto.matchAll(/(?<![\d./])(\d{3}\.?\d{3}\.?\d{3}-?\d{2})(?![\d/])/g)) {
        const d = m[1].replace(/\D/g, '');
        if (cpfValido(d)) { r.cpf = fmtCpf(d); break; }
    }

    // Nome
    r.nome = valorPorRotulo(linhas, /\b(?:NOME DO (?:FUNCIONARIO|EMPREGADO|COLABORADOR|TRABALHADOR)|FUNCIONARIO|EMPREGADO|COLABORADOR|TRABALHADOR|NOME)\b\s*:?/, (resto, _l, proxima) => {
        let s = resto;
        if (proxima) s = s.replace(/^\s*\d+\s*/, '');
        s = s.split(/\s{0,}(?:CBO|CARGO|FUNCAO|CPF|ADMISSAO|MATRICULA|CODIGO|DEPARTAMENTO|SETOR|PIS)\b/)[0];
        const n = limparNome(s);
        return nomeOk(n) ? n : '';
    });

    // Função / cargo
    r.funcao = valorPorRotulo(linhas, /\b(?:FUNCAO|CARGO)\b\s*:?/, (resto, _l, proxima) => {
        let s = resto.split(/\b(?:CBO|ADMISSAO|SALARIO|DEPARTAMENTO|SETOR|CPF|MATRICULA|DATA)\b/)[0];
        if (proxima) s = s.replace(/^\s*\d+\s*/, '');
        s = s.replace(/\d+/g, ' ').replace(/[^A-Z /.-]+/g, ' ').replace(/\s+/g, ' ').replace(/^[\s:.-]+|[\s:.-]+$/g, '').trim();
        return s.length >= 3 && s.length <= 50 && !PALAVRAS_RUINS.test(s) ? s : '';
    });
    // layout comum (Domínio/Questor): a função vem na linha logo abaixo do nome, junto do CBO
    if (!r.funcao && r.nome) {
        const i = linhas.findIndex(l => l.includes(r.nome));
        const prox = (linhas[i + 1] || '').split(/\s*\b(?:ADMISSAO|CPF|MATRICULA|DATA|COMPETENCIA|PIS)\b/)[0].trim();
        const m = prox.match(/^([A-Z][A-Z /.-]{2,40}?)\s+\d{4,6}\b/) || prox.match(/^([A-Z][A-Z /.-]{2,40})$/);
        if (i >= 0 && m && !PALAVRAS_RUINS.test(m[1])) r.funcao = m[1].trim();
    }

    // Admissão
    const adm = valorPorRotulo(linhas, /\bADMISSAO\b\s*:?/, s => dataIso(s));
    if (adm) r.admissao = adm;

    // Salário base
    let sal = valorPorRotulo(linhas, /\bSAL(?:ARIO|\.)\s*(?:BASE|CONTRATUAL|NOMINAL)\b\s*:?/, s => { const m = s.match(RX_DINHEIRO); return m ? m[0] : ''; });
    if (!sal) {
        // rubrica "SALARIO" / "HORAS NORMAIS" nos proventos: último valor da linha
        const l = linhas.find(x => /^\d{0,5}\s*(?:SALARIO|SALARIO MENSAL|SALARIO NORMAL|HORAS NORMAIS|DIAS NORMAIS)\b/.test(x) && !/FAMILIA|BASE|MATERNIDADE|LIQUIDO|INSS|FGTS|IRRF/.test(x));
        const m = l && l.match(RX_DINHEIRO);
        if (m) sal = m[m.length - 1];
    }
    if (sal && dinheiro(sal) > 0) r.salario = dinheiro(sal);

    // Dados bancários
    const banco = linhas.find(l => /\bBANCO\b/.test(l) && /\b(?:AG|AGENCIA)\b/.test(l) && /\b(?:C\/C|CC|CONTA)\b/.test(l));
    if (banco) r.dadosBancarios = banco.slice(banco.indexOf('BANCO')).replace(/\s+/g, ' ').slice(0, 120);
    const pix = texto.match(/\bPIX\s*:?\s*([^\n]{5,60})/);
    if (!r.dadosBancarios && pix) r.dadosBancarios = `PIX ${pix[1].trim()}`;

    // Competência (só para mostrar)
    const comp = texto.match(/\b(?:COMPETENCIA|REFERENCIA|MES\/ANO|PERIODO)\b\s*:?\s*(\d{2}\/\d{4}|[A-Z]{3,9}\s*\/?\s*\d{4})/);
    if (comp) r.competencia = comp[1];
    return r;
}

async function textoDoPdf(file) {
    if (!window.pdfjsLib) throw new Error('Leitor de PDF não carregou. Atualize a página.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
    const bytes = new Uint8Array(await file.arrayBuffer());
    let pdf;
    try {
        pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    } catch (err) {
        if (err?.name !== 'PasswordException') throw err;
        const senha = window.prompt('Este holerite tem senha. Digite a senha (geralmente os primeiros dígitos do CPF):');
        if (!senha) throw new Error('PDF protegido por senha.');
        pdf = await window.pdfjsLib.getDocument({ data: bytes, password: senha }).promise;
    }
    const paginas = [];
    for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
        const content = await (await pdf.getPage(p)).getTextContent();
        const linhas = new Map();
        content.items.filter(i => String(i.str || '').trim()).forEach(i => {
            const y = String(Math.round(Number(i.transform?.[5] || 0) / 3) * 3);
            if (!linhas.has(y)) linhas.set(y, []);
            linhas.get(y).push({ x: Number(i.transform?.[4] || 0), t: String(i.str).trim() });
        });
        paginas.push([...linhas.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([, its]) => its.sort((a, b) => a.x - b.x).map(i => i.t).join(' ')).join('\n'));
    }
    return paginas.join('\n');
}

function setCampo(id, valor) {
    const el = document.getElementById(id);
    if (!el || valor === undefined || valor === '') return false;
    el.value = valor;
    el.classList.add('rh-lido-holerite');
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

async function importarHolerite(file) {
    const status = document.getElementById('rhHoleriteStatus');
    const msg = (t, tipo = '') => { if (status) { status.textContent = t; status.dataset.tipo = tipo; } };
    if (!file) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { msg('Envie o holerite em PDF.', 'erro'); return; }
    msg('Lendo o holerite…');
    try {
        const texto = await textoDoPdf(file);
        if (texto.replace(/\s/g, '').length < 40) { msg('Este PDF é uma imagem (escaneado) e não tem texto para ler. Preencha os dados à mão.', 'erro'); return; }
        const d = lerHolerite(texto);
        document.querySelectorAll('.rh-lido-holerite').forEach(el => el.classList.remove('rh-lido-holerite'));
        const ok = [];
        if (setCampo('rh-nome', d.nome)) ok.push('nome');
        if (setCampo('rh-cpf', d.cpf)) ok.push('CPF');
        if (setCampo('rh-funcao', d.funcao)) ok.push('função');
        if (setCampo('rh-admissao', d.admissao)) ok.push('admissão');
        if (d.salario && setCampo('rh-salario', window.formatCurrencyValue ? window.formatCurrencyValue(d.salario) : `R$ ${d.salario.toFixed(2).replace('.', ',')}`)) ok.push('salário');
        const banc = document.getElementById('rh-dados-bancarios');
        if (d.dadosBancarios && banc && !banc.value.trim() && setCampo('rh-dados-bancarios', d.dadosBancarios)) ok.push('dados bancários');
        const faltam = ['nome', 'CPF', 'função', 'admissão', 'salário'].filter(x => !ok.includes(x));
        if (!ok.length) { msg('Não encontrei os dados neste holerite. Preencha à mão.', 'erro'); return; }
        msg(`Preenchido: ${ok.join(', ')}${d.competencia ? ` (holerite ${d.competencia})` : ''}.${faltam.length ? ` Confira e complete: ${faltam.join(', ')}.` : ' Confira antes de salvar.'}`, faltam.length ? 'aviso' : 'ok');
    } catch (err) {
        console.error('Holerite', err);
        msg(err?.message === 'PDF protegido por senha.' ? 'Holerite com senha: informe a senha para ler.' : 'Não foi possível ler este PDF.', 'erro');
    }
}

function instalar() {
    const form = document.getElementById('formFuncionario');
    if (!form || document.getElementById('rhHoleriteBox')) return;
    const box = document.createElement('div');
    box.id = 'rhHoleriteBox';
    box.className = 'rh-holerite-box';
    box.innerHTML = `
      <div class="rh-holerite-texto">
        <strong><i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i> Cadastrar pelo holerite</strong>
        <small>Importe o PDF do holerite e os dados são preenchidos sozinhos. O arquivo é lido só neste computador e não fica salvo.</small>
        <small id="rhHoleriteStatus" role="status" aria-live="polite"></small>
      </div>
      <input type="file" id="rhHoleriteArquivo" accept="application/pdf,.pdf" hidden>
      <button type="button" class="btn-primary" id="rhHoleriteBtn"><i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i> Importar holerite (PDF)</button>`;
    form.insertBefore(box, form.querySelector('h3') || form.firstChild);
    const input = box.querySelector('#rhHoleriteArquivo');
    box.querySelector('#rhHoleriteBtn').addEventListener('click', () => input.click());
    input.addEventListener('change', () => { importarHolerite(input.files[0]); input.value = ''; });
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('arrastando'); });
    box.addEventListener('dragleave', () => box.classList.remove('arrastando'));
    box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('arrastando'); importarHolerite(e.dataTransfer.files[0]); });
    form.addEventListener('reset', () => {
        const st = document.getElementById('rhHoleriteStatus'); if (st) st.textContent = '';
        document.querySelectorAll('.rh-lido-holerite').forEach(el => el.classList.remove('rh-lido-holerite'));
    });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', instalar); else instalar();
}
