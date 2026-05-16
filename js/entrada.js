import { db, collection, addDoc, getDocs, doc, deleteDoc } from './firebase-init.js';

// ---- MÓDULO: ENTRADA DE MADEIRA E EMPREITEIROS ----

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GESTÃO DE EMPREITEIROS ---
    const formEmpreiteiro = document.getElementById('formEmpreiteiro');
    const listaEmpreiteiros = document.getElementById('listaEmpreiteiros');
    const selectEmpreiteiro = document.getElementById('entEmpreiteiro');
    
    let empreiteirosAtuais = [];

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
        if(empreiteirosAtuais.length === 0) {
            listaEmpreiteiros.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum empreiteiro cadastrado.</td></tr>';
            return;
        }

        empreiteirosAtuais.forEach(emp => {
            const tr = document.createElement('tr');
            const valorFormatado = parseFloat(emp.valorMetro).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
            tr.innerHTML = `
                <td><strong>${emp.nome}</strong></td>
                <td>${emp.contato || '-'}</td>
                <td style="color:var(--accent-color); font-weight:bold;">${valorFormatado}</td>
                <td>${emp.pix || '-'}</td>
                <td>
                    <button class="btn-primary" style="background:var(--danger-color); padding: 5px;" onclick="deletarEmpreiteiro('${emp.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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

    if(formEmpreiteiro) {
        formEmpreiteiro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formEmpreiteiro.querySelector('button[type="submit"]');
            const txtOriginal = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
            btn.disabled = true;

            try {
                await addDoc(collection(db, 'empreiteiros'), {
                    nome: document.getElementById('empNome').value.trim(),
                    contato: document.getElementById('empContato').value.trim(),
                    valorMetro: parseFloat(document.getElementById('empValorMetro').value) || 0,
                    pix: document.getElementById('empPix').value.trim(),
                    criadoEm: new Date().toISOString()
                });
                formEmpreiteiro.reset();
                await carregarEmpreiteiros();
                alert('Empreiteiro cadastrado com sucesso!');
            } catch (error) {
                console.error("Erro ao salvar empreiteiro:", error);
                alert('Erro ao salvar empreiteiro.');
            } finally {
                btn.innerHTML = txtOriginal;
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
    if(entData) entData.valueAsDate = new Date();
    if(entHorario) {
        const now = new Date();
        entHorario.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }

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
        
        resVolume.textContent = volume.toFixed(3) + ' m³';
        resInfo.textContent = `Altura média: ${mediaAltura.toFixed(2)} m (${valoresAltura.length} pontos medidos)`;
        
        // Calculo Financeiro
        let valorMetro = 0;
        if(selectEmpreiteiro && selectEmpreiteiro.selectedIndex > 0) {
            valorMetro = parseFloat(selectEmpreiteiro.options[selectEmpreiteiro.selectedIndex].dataset.valor) || 0;
        }
        
        const totalFinanceiro = volume * valorMetro;
        resFinanceiro.textContent = totalFinanceiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        infoFinanceira.textContent = `Baseado em ${valorMetro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} por m³`;

        return { volume, mediaAltura, pontos: valoresAltura.length, comp: c, larg: l, valorMetro, totalFinanceiro };
    }
    
    if(selectEmpreiteiro) selectEmpreiteiro.addEventListener('change', calcularVolumeAtual);
    [entComp, entLarg, ...inputsAlt].forEach(input => {
        if(input) input.addEventListener('input', calcularVolumeAtual);
    });

    async function renderizarEntradas() {
        if(!listaEntradas) return;
        listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';
        
        let entradas = [];
        try {
            const querySnapshot = await getDocs(collection(db, 'entradas'));
            querySnapshot.forEach(doc => entradas.push({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error(error);
            listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Erro ao carregar entradas.</td></tr>';
            return;
        }

        listaEntradas.innerHTML = '';
        if(entradas.length === 0) {
            listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma entrada registrada.</td></tr>';
            return;
        }
        
        entradas.sort((a,b) => new Date(b.data + 'T' + (b.horario || '00:00')) - new Date(a.data + 'T' + (a.horario || '00:00'))).forEach(en => {
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
                    <button class="btn-primary" style="background:var(--danger-color); padding: 5px 10px; font-size: 0.8rem;" onclick="deletarEntrada('${en.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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
                motorista: document.getElementById('entMotorista').value.trim(),
                caminhao: document.getElementById('entCaminhao').value.trim(),
                placa: document.getElementById('entPlaca').value.trim(),
                comp: calcData.comp,
                larg: calcData.larg,
                mediaAltura: calcData.mediaAltura,
                pontos: calcData.pontos,
                volume: calcData.volume,
                valorMetroEmpreiteiro: calcData.valorMetro,
                totalEmpreiteiro: calcData.totalFinanceiro,
                criadoEm: new Date().toISOString()
            };
            
            const submitBtn = formEntrada.querySelector('button[type="submit"]');
            const textoOriginal = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
            submitBtn.disabled = true;

            try {
                await addDoc(collection(db, 'entradas'), novaEntrada);
                formEntrada.reset();
                if(entData) entData.valueAsDate = new Date();
                if(entHorario) {
                    const now = new Date();
                    entHorario.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                }
                calcularVolumeAtual();
                await renderizarEntradas();
                alert(`✅ Entrada de ${calcData.volume.toFixed(3)}m³ registrada com sucesso!\nValor a pagar: ${calcData.totalFinanceiro.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}`);
            } catch (error) {
                console.error(error);
                alert("Erro ao salvar entrada.");
            } finally {
                submitBtn.innerHTML = textoOriginal;
                submitBtn.disabled = false;
            }
        });
    }

    window.deletarEntrada = async function(id) {
        if(confirm("Tem certeza que deseja apagar este registro de entrada?")) {
            try {
                await deleteDoc(doc(db, 'entradas', id));
                await renderizarEntradas();
            } catch (error) {
                console.error(error);
                alert("Erro ao deletar entrada.");
            }
        }
    };

    // Inicialização
    carregarEmpreiteiros();
    renderizarEntradas();
});
