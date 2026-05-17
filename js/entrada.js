import { db, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from './firebase-init.js';

// ---- MÓDULO: ENTRADA DE MADEIRA E EMPREITEIROS ----

const formEmpreiteiro = document.getElementById('formEmpreiteiro');
const listaEmpreiteiros = document.getElementById('listaEmpreiteiros');
const selectEmpreiteiro = document.getElementById('entEmpreiteiro');

let empreiteirosAtuais = [];
let empreiteiroEditandoId = null;

async function carregarEmpreiteiros() {
    if(listaEmpreiteiros) listaEmpreiteiros.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, 'empreiteiros'));
        empreiteirosAtuais = [];
        querySnapshot.forEach((doc) => {
            empreiteirosAtuais.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarEmpreiteiros();
        atualizarSelectEmpreiteiros();
    } catch (error) {
        console.error("Erro ao buscar empreiteiros: ", error);
        if(listaEmpreiteiros) listaEmpreiteiros.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Erro ao carregar empreiteiros.</td></tr>';
    }
}

function renderizarEmpreiteiros() {
    if(!listaEmpreiteiros) return;
    listaEmpreiteiros.innerHTML = '';
    
    const filtroInput = document.getElementById('filtroEmpreiteirosBusca');
    const filtro = filtroInput ? filtroInput.value.toLowerCase().trim() : '';
    
    const filtrados = empreiteirosAtuais.filter(emp => {
        return (emp.nome || '').toLowerCase().includes(filtro);
    });

    if(filtrados.length === 0) {
        listaEmpreiteiros.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum empreiteiro encontrado.</td></tr>';
        return;
    }

    filtrados.forEach(emp => {
        const tr = document.createElement('tr');
        const valorFormatado = parseFloat(emp.valorMetro).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        tr.innerHTML = `
            <td><strong>${emp.nome}</strong></td>
            <td>${emp.contato || '-'}</td>
            <td style="color:var(--accent-color); font-weight:bold;">${valorFormatado}</td>
            <td>${emp.pix || '-'}</td>
            <td>
                <div style="display: flex; gap: 6px; align-items: center; white-space: nowrap;">
                    <button class="btn-primary" style="background:#f1c40f; color:#000; padding: 5px 8px; font-size: 0.9rem;" onclick="editarEmpreiteiro('${emp.id}')" title="Alterar">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn-primary" style="background:var(--danger-color); padding: 5px 8px; font-size: 0.9rem;" onclick="deletarEmpreiteiro('${emp.id}')" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaEmpreiteiros.appendChild(tr);
    });
}

function atualizarSelectEmpreiteiros() {
    if(!selectEmpreiteiro) return;
    selectEmpreiteiro.innerHTML = '<option value="">Selecione o Empreiteiro...</option>';
    empreiteirosAtuais.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.nome;
        opt.dataset.valor = emp.valorMetro;
        selectEmpreiteiro.appendChild(opt);
    });
}

window.editarEmpreiteiro = function(id) {
    const emp = empreiteirosAtuais.find(e => e.id === id);
    if(!emp) return;
    empreiteiroEditandoId = id;
    
    document.getElementById('empNome').value = emp.nome || '';
    document.getElementById('empContato').value = emp.contato || '';
    document.getElementById('empValorMetro').value = window.formatCurrencyValue(emp.valorMetro || 0);
    document.getElementById('empPix').value = emp.pix || '';
    
    const btn = formEmpreiteiro.querySelector('button[type="submit"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Empreiteiro';
    
    // Garante que o card de cadastro de empreiteiros fique visível ao editar
    const cardCad = document.getElementById('cardFormEmpreiteiro');
    const btnToggle = document.getElementById('btnToggleCadastroEmpreiteiro');
    if (cardCad && cardCad.style.display === 'none') {
        cardCad.style.display = 'block';
        if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Cadastro';
    }
    
    window.scrollTo({top: formEmpreiteiro.offsetTop - 100, behavior: 'smooth'});
};

if(formEmpreiteiro) {
    formEmpreiteiro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formEmpreiteiro.querySelector('button[type="submit"]');
        const txtOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;

        const dados = {
            nome: document.getElementById('empNome').value.toUpperCase().trim(),
            contato: document.getElementById('empContato').value.trim(),
            valorMetro: window.parseCurrencyValue(document.getElementById('empValorMetro').value),
            pix: document.getElementById('empPix').value.trim(),
            atualizadoEm: new Date().toISOString()
        };

        try {
            if (empreiteiroEditandoId) {
                await updateDoc(doc(db, 'empreiteiros', empreiteiroEditandoId), dados);
                alert('Empreiteiro atualizado com sucesso!');
                empreiteiroEditandoId = null;
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Empreiteiro';
            } else {
                dados.criadoEm = new Date().toISOString();
                await addDoc(collection(db, 'empreiteiros'), dados);
                alert('Empreiteiro cadastrado com sucesso!');
            }
            formEmpreiteiro.reset();
            await carregarEmpreiteiros();
        } catch (error) {
            console.error("Erro ao salvar empreiteiro:", error);
            alert('Erro ao salvar o empreiteiro.');
        } finally {
            if(!empreiteiroEditandoId) btn.innerHTML = txtOriginal;
            btn.disabled = false;
        }
    });
}

window.deletarEmpreiteiro = async function(id) {
    if(confirm("Tem certeza que deseja remover este empreiteiro?")) {
        try {
            await deleteDoc(doc(db, 'empreiteiros', id));
            await carregarEmpreiteiros();
        } catch(e) {
            console.error(e);
            alert("Erro ao remover empreiteiro.");
        }
    }
};


// --- 2. ENTRADA DE TORAS (CÁLCULOS E REGISTRO) ---
const formEntrada = document.getElementById('formEntrada');
const listaEntradas = document.getElementById('listaEntradas');
const filtroEntradasNome = document.getElementById('filtroEntradasNome');

let entradaEditandoId = null;
window.entradasAtuaisLista = [];

const entComp = document.getElementById('entComp');
const entLarg = document.getElementById('entLarg');
const inputsAlt = [
    document.getElementById('entAltEsq1'), document.getElementById('entAltEsq2'), document.getElementById('entAltEsq3'),
    document.getElementById('entAltDir1'), document.getElementById('entAltDir2'), document.getElementById('entAltDir3')
];

const resVolume = document.getElementById('entResultadoVolume');
const resInfo = document.getElementById('entInfoMedia');
const resFinanceiro = document.getElementById('entResultadoFinanceiro');
const infoFinanceira = document.getElementById('entInfoFinanceira');

const entData = document.getElementById('entData');
const entHorario = document.getElementById('entHorario');

function calcularVolumeAtual() {
    const c = parseFloat(entComp?.value) || 0;
    const l = parseFloat(entLarg?.value) || 0;
    
    const valoresAltura = inputsAlt.map(i => parseFloat(i?.value)).filter(v => !isNaN(v) && v > 0);
    
    let mediaAltura = 0;
    let volume = 0;
    
    if (valoresAltura.length > 0) {
        mediaAltura = valoresAltura.reduce((a, b) => a + b, 0) / valoresAltura.length;
    }
    
    if (c > 0 && l > 0 && mediaAltura > 0) {
        volume = c * l * mediaAltura;
    }
    
    if (resVolume) resVolume.textContent = volume.toFixed(3) + ' m³';
    if (resInfo) resInfo.textContent = `Altura média: ${mediaAltura.toFixed(2)} m (${valoresAltura.length} pontos medidos)`;
    
    // Calculo Financeiro
    let valorMetro = 0;
    if(selectEmpreiteiro && selectEmpreiteiro.selectedIndex > 0) {
        valorMetro = parseFloat(selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].dataset.valor) || 0;
    }
    
    const totalFinanceiro = volume * valorMetro;
    if (resFinanceiro) resFinanceiro.textContent = totalFinanceiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    if (infoFinanceira) infoFinanceira.textContent = `Baseado em ${valorMetro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} por m³`;

    return { volume, mediaAltura, pontos: valoresAltura.length, comp: c, larg: l, valorMetro, totalFinanceiro };
}

async function carregarEntradas() {
    if(!listaEntradas) return;
    listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, 'entradas'));
        window.entradasAtuaisLista = [];
        querySnapshot.forEach(doc => window.entradasAtuaisLista.push({ id: doc.id, ...doc.data() }));
        renderizarEntradas();
    } catch (error) {
        console.error(error);
        listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Erro ao carregar entradas.</td></tr>';
    }
}

function renderizarEntradas() {
    if(!listaEntradas) return;
    listaEntradas.innerHTML = '';
    
    const filtro = filtroEntradasNome ? filtroEntradasNome.value.toLowerCase() : '';
    const filtradas = window.entradasAtuaisLista.filter(en => {
        const emp = (en.empreiteiroNome || en.fornecedor || '').toLowerCase();
        const mot = (en.motorista || '').toLowerCase();
        return emp.includes(filtro) || mot.includes(filtro);
    });

    if(filtradas.length === 0) {
        listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma entrada encontrada.</td></tr>';
        return;
    }
    
    filtradas.sort((a,b) => new Date(b.data + 'T' + (b.horario || '00:00')) - new Date(a.data + 'T' + (a.horario || '00:00'))).forEach(en => {
        const tr = document.createElement('tr');
        
        const dtObj = new Date(en.data + 'T12:00:00'); // hack for timezone
        const dtStr = dtObj.toLocaleDateString('pt-BR');
        const valorTotal = en.totalEmpreiteiro ? en.totalEmpreiteiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : 'R$ 0,00';
        
        tr.innerHTML = `
            <td>${dtStr} <br><small style="color:#aaa;">${en.horario || '-'}</small></td>
            <td><strong>${en.empreiteiroNome || en.fornecedor || '-'}</strong><br><small style="color:#aaa;">Mot: ${en.motorista || '-'}</small></td>
            <td><span class="badge" style="background:#555;">${en.placa}</span><br><small style="color:#aaa;">${en.caminhao || '-'}</small></td>
            <td style="font-size: 0.9em;">
                C: ${en.comp.toFixed(2)}m | L: ${en.larg.toFixed(2)}m <br>
                A. Média: ${en.mediaAltura.toFixed(2)}m
            </td>
            <td>
                <div style="font-size:1.1rem; color:var(--accent-color); font-weight:bold;">${en.volume.toFixed(3)} m³</div>
                <div style="color:#3498db; font-size:0.9rem;">${valorTotal}</div>
            </td>
            <td>
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center; white-space: nowrap;">
                    <button class="btn-primary" style="padding: 5px 8px; font-size: 0.9rem; background:var(--primary-color);" onclick="visualizarEntrada('${en.id}')" title="Visualizar">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn-primary" style="padding: 5px 8px; font-size: 0.9rem; background:#f1c40f; color:#000;" onclick="alterarEntrada('${en.id}')" title="Alterar">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn-primary" style="padding: 5px 8px; font-size: 0.9rem; background:#3498db;" onclick="imprimirEntrada('${en.id}')" title="Imprimir">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    <button class="btn-primary" style="padding: 5px 8px; font-size: 0.9rem; background:var(--danger-color);" onclick="deletarEntrada('${en.id}')" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listaEntradas.appendChild(tr);
    });
}

if (formEntrada) {
    formEntrada.addEventListener('submit', async (e) => {
        e.preventDefault();
        const calcData = calcularVolumeAtual();
        
        if (calcData.volume <= 0) {
            alert("O volume calculado é zero. Preencha as medidas.");
            return;
        }
        
        const empreiteiroId = selectEmpreiteiro.value;
        const empreiteiroNome = selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].text;
        
        const novaEntrada = {
            data: document.getElementById('entData').value,
            horario: document.getElementById('entHorario').value,
            empreiteiroId: empreiteiroId,
            empreiteiroNome: empreiteiroNome,
            motorista: document.getElementById('entMotorista').value.toUpperCase().trim(),
            caminhao: document.getElementById('entCaminhao').value.toUpperCase().trim(),
            placa: document.getElementById('entPlaca').value.toUpperCase().trim(),
            comp: calcData.comp,
            larg: calcData.larg,
            mediaAltura: calcData.mediaAltura,
            pontos: calcData.pontos,
            volume: calcData.volume,
            valorMetroEmpreiteiro: calcData.valorMetro,
            totalEmpreiteiro: calcData.totalFinanceiro,
            atualizadoEm: new Date().toISOString()
        };
        
        const submitBtn = formEntrada.querySelector('button[type="submit"]');
        const textoOriginal = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;

        try {
            if (entradaEditandoId) {
                await updateDoc(doc(db, 'entradas', entradaEditandoId), novaEntrada);
                alert(`✅ Entrada de ${calcData.volume.toFixed(3)}m³ atualizada com sucesso!`);
                entradaEditandoId = null;
                submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Registrar Entrada';
            } else {
                novaEntrada.criadoEm = new Date().toISOString();
                await addDoc(collection(db, 'entradas'), novaEntrada);
                alert(`✅ Entrada de ${calcData.volume.toFixed(3)}m³ registrada com sucesso!\nValor a pagar: ${calcData.totalFinanceiro.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}`);
            }
            
            formEntrada.reset();
            if(entData) entData.valueAsDate = new Date();
            if(entHorario) {
                const now = new Date();
                entHorario.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            }
            calcularVolumeAtual();
            await carregarEntradas();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar entrada.");
        } finally {
            if(!entradaEditandoId) submitBtn.innerHTML = textoOriginal;
            submitBtn.disabled = false;
        }
    });
}

window.deletarEntrada = async function(id) {
    if(confirm("Tem certeza que deseja apagar este registro de entrada?")) {
        try {
            await deleteDoc(doc(db, 'entradas', id));
            await carregarEntradas();
        } catch (error) {
            console.error(error);
            alert("Erro ao deletar entrada.");
        }
    }
};

window.visualizarEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if(!en) return;
    alert(`Detalhes da Entrada:
Empreiteiro: ${en.empreiteiroNome || en.fornecedor || 'N/A'}
Motorista: ${en.motorista || 'N/A'}
Data: ${en.data} ${en.horario || ''}
Caminhão/Placa: ${en.caminhao || 'N/A'} / ${en.placa}

--- MEDIDAS ---
Comprimento: ${en.comp}m
Largura: ${en.larg}m
Altura Média: ${en.mediaAltura}m
Volume Total: ${en.volume.toFixed(3)}m³

--- FINANCEIRO ---
Valor/Metro: R$ ${(en.valorMetroEmpreiteiro || 0).toFixed(2)}
Total a Pagar: R$ ${(en.totalEmpreiteiro || 0).toFixed(2)}
`);
};

window.alterarEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if(!en) return;
    entradaEditandoId = id;
    document.getElementById('entData').value = en.data || '';
    document.getElementById('entHorario').value = en.horario || '';
    if(selectEmpreiteiro) selectEmpreiteiro.value = en.empreiteiroId || '';
    document.getElementById('entMotorista').value = en.motorista || '';
    document.getElementById('entCaminhao').value = en.caminhao || '';
    document.getElementById('entPlaca').value = en.placa || '';
    document.getElementById('entComp').value = en.comp || '';
    document.getElementById('entLarg').value = en.larg || '';
    document.getElementById('entAltEsq1').value = '';
    document.getElementById('entAltEsq2').value = '';
    document.getElementById('entAltEsq3').value = '';
    document.getElementById('entAltDir1').value = '';
    document.getElementById('entAltDir2').value = '';
    document.getElementById('entAltDir3').value = '';
    const btn = formEntrada.querySelector('button[type="submit"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-save"></i> Atualizar Entrada';
    
    // Garante que a lista de entradas esteja aberta ao editar
    const panelLista = document.getElementById('panelListaEntradas');
    const gridLayout = document.getElementById('gridEntradasGeralLayout');
    const btnToggle = document.getElementById('btnToggleUltimasEntradas');
    if (panelLista && panelLista.style.display === 'none') {
        panelLista.style.display = 'block';
        if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Entradas';
    }

    // E atualiza a visibilidade do grid geral
    const panelListaEmp = document.getElementById('panelListaEmpreiteiros');
    const cardCad = document.getElementById('cardFormEmpreiteiro');
    const colEsquerda = gridLayout ? gridLayout.querySelector('.form-column-left') : null;
    const colDireita = gridLayout ? gridLayout.querySelector('.table-column-right') : null;
    
    if (gridLayout && colEsquerda && colDireita && panelListaEmp && panelLista) {
        gridLayout.classList.add('form-table-grid');
        colDireita.style.display = 'flex';
        colEsquerda.style.maxWidth = 'none';
        colEsquerda.style.margin = '0';
    }

    window.scrollTo({top: formEntrada.offsetTop - 100, behavior: 'smooth'});
    calcularVolumeAtual();
};

window.imprimirEntrada = function(id) {
    const en = window.entradasAtuaisLista.find(e => e.id === id);
    if(!en) return;
    const dtObj = new Date(en.data + 'T12:00:00');
    const dtStr = dtObj.toLocaleDateString('pt-BR');
    let win = window.open('', '_blank');
    win.document.write(`
<html><head><title>Imprimir Recibo de Entrada</title>
<style>body{font-family: Arial, sans-serif; padding: 20px;} table{width: 100%; border-collapse: collapse; margin-top: 20px;} th, td{border: 1px solid #ccc; padding: 8px; text-align: left;}</style>
</head><body>
<h2>Recibo de Entrada de Toras</h2>
<p><strong>Empreiteiro:</strong> ${en.empreiteiroNome || en.fornecedor || 'N/A'}</p>
<p><strong>Motorista:</strong> ${en.motorista || 'N/A'}</p>
<p><strong>Data/Hora:</strong> ${dtStr} ${en.horario || ''}</p>
<p><strong>Caminhão:</strong> ${en.caminhao || 'N/A'} - Placa: ${en.placa}</p>
<table><tr><th>Comprimento</th><th>Largura</th><th>Altura Média</th><th>Volume (m³)</th></tr>
<tr><td>${en.comp}m</td><td>${en.larg}m</td><td>${en.mediaAltura}m</td><td><strong>${en.volume.toFixed(3)}</strong></td></tr></table>
<br><p><strong>Valor por M³:</strong> R$ ${(en.valorMetroEmpreiteiro || 0).toFixed(2)}</p>
<h3><strong>TOTAL A PAGAR:</strong> R$ ${(en.totalEmpreiteiro || 0).toFixed(2)}</h3>
<br><br><br>
<div style="text-align:center; width: 300px; border-top: 1px solid #000; margin: 0 auto;">Assinatura</div>
</body></html>
    `);
    win.document.close();
    win.print();
};

function inicializarTogglesEntrada() {
    const btnToggleCad = document.getElementById('btnToggleCadastroEmpreiteiro');
    const btnToggleEmp = document.getElementById('btnToggleListaEmpreiteiros');
    const btnToggleEnt = document.getElementById('btnToggleUltimasEntradas');
    
    const cardCad = document.getElementById('cardFormEmpreiteiro');
    const panelListaEmp = document.getElementById('panelListaEmpreiteiros');
    const panelListaEnt = document.getElementById('panelListaEntradas');
    
    const gridLayout = document.getElementById('gridEntradasGeralLayout');
    const colEsquerda = gridLayout ? gridLayout.querySelector('.form-column-left') : null;
    const colDireita = gridLayout ? gridLayout.querySelector('.table-column-right') : null;

    if (!btnToggleCad || !btnToggleEmp || !btnToggleEnt || !cardCad || !panelListaEmp || !panelListaEnt || !gridLayout || !colEsquerda || !colDireita) return;

    // Função interna para atualizar o estado visual do grid
    function atualizarGridGeral() {
        const empVisivel = panelListaEmp.style.display !== 'none';
        const entVisivel = panelListaEnt.style.display !== 'none';

        if (empVisivel || entVisivel) {
            // Se pelo menos uma tabela da direita estiver aberta, ativa o grid de 2 colunas
            gridLayout.classList.add('form-table-grid');
            colDireita.style.display = 'flex';
            colEsquerda.style.maxWidth = 'none';
            colEsquerda.style.margin = '0';
        } else {
            // Se ambas tabelas estiverem fechadas, centraliza o formulário principal na esquerda
            gridLayout.classList.remove('form-table-grid');
            colDireita.style.display = 'none';
            colEsquerda.style.maxWidth = '650px';
            colEsquerda.style.margin = '0 auto';
        }
    }

    // Inicialização - O cadastro de empreiteiro e as tabelas iniciam ocultos por padrão
    cardCad.style.display = 'none';
    panelListaEmp.style.display = 'none';
    panelListaEnt.style.display = 'none';
    atualizarGridGeral();

    // Evento para toggle do cadastro de empreiteiro
    btnToggleCad.addEventListener('click', () => {
        if (cardCad.style.display === 'none') {
            cardCad.style.display = 'block';
            btnToggleCad.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Cadastro';
        } else {
            cardCad.style.display = 'none';
            btnToggleCad.innerHTML = '<i class="fa-solid fa-user-plus"></i> Cadastrar Empreiteiro';
            if (empreiteiroEditandoId) {
                empreiteiroEditandoId = null;
                const btn = formEmpreiteiro.querySelector('button[type="submit"]');
                if (btn) btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Empreiteiro';
                formEmpreiteiro.reset();
            }
        }
        atualizarGridGeral();
    });

    // Evento de clique para o toggle de empreiteiros
    btnToggleEmp.addEventListener('click', () => {
        if (panelListaEmp.style.display === 'none') {
            panelListaEmp.style.display = 'block';
            btnToggleEmp.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Empreiteiros';
        } else {
            panelListaEmp.style.display = 'none';
            btnToggleEmp.innerHTML = '<i class="fa-solid fa-users"></i> Gerenciar Empreiteiros';
        }
        atualizarGridGeral();
    });

    // Evento de clique para o toggle de últimas entradas
    btnToggleEnt.addEventListener('click', () => {
        if (panelListaEnt.style.display === 'none') {
            panelListaEnt.style.display = 'block';
            btnToggleEnt.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar Entradas';
        } else {
            panelListaEnt.style.display = 'none';
            btnToggleEnt.innerHTML = '<i class="fa-solid fa-list"></i> Ver Últimas Entradas';
        }
        atualizarGridGeral();
    });
}

// Inicialização segura
function inicializarModuloEntrada() {
    // Forçar letras maiúsculas em tempo real nos campos de Entrada de Toras
    ['empNome', 'entMotorista', 'entCaminhao', 'entPlaca'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', window.forceUppercaseInput);
        }
    });
    
    const empValorMetroInput = document.getElementById('empValorMetro');
    if (empValorMetroInput) {
        empValorMetroInput.addEventListener('input', window.formatCurrencyInput);
    }

    if(selectEmpreiteiro) selectEmpreiteiro.addEventListener('change', calcularVolumeAtual);
    [entComp, entLarg, ...inputsAlt].forEach(input => {
        if(input) input.addEventListener('input', calcularVolumeAtual);
    });

    if(filtroEntradasNome) filtroEntradasNome.addEventListener('input', renderizarEntradas);
    const btnFiltrarEntradas = document.getElementById('btnFiltrarEntradas');
    if(btnFiltrarEntradas) btnFiltrarEntradas.addEventListener('click', renderizarEntradas);

    const filtroEmpreiteirosBusca = document.getElementById('filtroEmpreiteirosBusca');
    if(filtroEmpreiteirosBusca) {
        filtroEmpreiteirosBusca.addEventListener('input', renderizarEmpreiteiros);
    }
    const btnFiltrarEmpreiteiros = document.getElementById('btnFiltrarEmpreiteiros');
    if(btnFiltrarEmpreiteiros) btnFiltrarEmpreiteiros.addEventListener('click', renderizarEmpreiteiros);

    if(entData) entData.valueAsDate = new Date();
    if(entHorario) {
        const now = new Date();
        entHorario.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }

    inicializarTogglesEntrada();

    carregarEmpreiteiros();
    carregarEntradas();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarModuloEntrada);
} else {
    inicializarModuloEntrada();
}
