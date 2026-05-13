import { db, collection, addDoc, getDocs, doc, deleteDoc } from './firebase-init.js';

// ---- MÓDULO: ENTRADA DE MADEIRA (CUBAGEM DE CAMINHÃO) ----

document.addEventListener('DOMContentLoaded', () => {
    const formEntrada = document.getElementById('formEntrada');
    const listaEntradas = document.getElementById('listaEntradas');
    
    // Inputs de Cálculo
    const entComp = document.getElementById('entComp');
    const entLarg = document.getElementById('entLarg');
    
    // Alturas Esquerda
    const altE1 = document.getElementById('entAltEsq1');
    const altE2 = document.getElementById('entAltEsq2');
    const altE3 = document.getElementById('entAltEsq3');
    
    // Alturas Direita
    const altD1 = document.getElementById('entAltDir1');
    const altD2 = document.getElementById('entAltDir2');
    const altD3 = document.getElementById('entAltDir3');
    
    // Resultados
    const resVolume = document.getElementById('entResultadoVolume');
    const resInfo = document.getElementById('entInfoMedia');
    
    // Preenche a data de hoje por padrão
    const entData = document.getElementById('entData');
    if(entData) {
        entData.valueAsDate = new Date();
    }

    // Função de Cálculo em Tempo Real
    function calcularVolumeAtual() {
        const c = parseFloat(entComp.value) || 0;
        const l = parseFloat(entLarg.value) || 0;
        
        // Reunir todas as alturas preenchidas
        const inputsAltura = [altE1, altE2, altE3, altD1, altD2, altD3];
        const valoresAltura = [];
        
        inputsAltura.forEach(input => {
            const v = parseFloat(input.value);
            if (!isNaN(v) && v > 0) {
                valoresAltura.push(v);
            }
        });
        
        let mediaAltura = 0;
        let volume = 0;
        
        if (valoresAltura.length > 0) {
            const soma = valoresAltura.reduce((acc, curr) => acc + curr, 0);
            mediaAltura = soma / valoresAltura.length;
        }
        
        if (c > 0 && l > 0 && mediaAltura > 0) {
            volume = c * l * mediaAltura;
        }
        
        // Atualizar UI
        resVolume.textContent = volume.toFixed(3) + ' m³';
        resInfo.textContent = `Altura média: ${mediaAltura.toFixed(2)} m (${valoresAltura.length} pontos medidos)`;
        
        return { volume, mediaAltura, pontos: valoresAltura.length, comp: c, larg: l };
    }
    
    // Adicionar eventos de input para todos os campos que afetam o cálculo
    const calcInputs = [entComp, entLarg, altE1, altE2, altE3, altD1, altD2, altD3];
    calcInputs.forEach(input => {
        if(input) {
            input.addEventListener('input', calcularVolumeAtual);
        }
    });

    // Renderizar Tabela de Histórico
    async function renderizarEntradas() {
        if(!listaEntradas) return;
        listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando do Firebase...</td></tr>';
        
        let entradas = [];
        try {
            const entradasCol = collection(db, 'entradas');
            const querySnapshot = await getDocs(entradasCol);
            querySnapshot.forEach((doc) => {
                entradas.push({ id: doc.id, ...doc.data() });
            });
        } catch (error) {
            console.error("Erro ao buscar entradas: ", error);
            listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Erro ao conectar com Firebase.</td></tr>';
            return;
        }

        listaEntradas.innerHTML = '';
        
        if(entradas.length === 0) {
            listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#aaa;">Nenhuma entrada registrada ainda.</td></tr>';
            return;
        }
        
        // Odenar por data mais recente primeiro
        entradas.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(en => {
            const tr = document.createElement('tr');
            
            // Formatar data para exibição PT-BR (UTC handle)
            const dtObj = new Date(en.data);
            const dtLocal = new Date(dtObj.getTime() + dtObj.getTimezoneOffset() * 60000);
            const dtStr = dtLocal.toLocaleDateString('pt-BR');
            
            tr.innerHTML = `
                <td>${dtStr}</td>
                <td><strong>${en.fornecedor}</strong></td>
                <td><span class="badge" style="background:#555;">${en.placa}</span></td>
                <td style="font-size: 0.9em;">
                    C: ${en.comp.toFixed(2)}m <br>
                    L: ${en.larg.toFixed(2)}m <br>
                    A. Média: ${en.mediaAltura.toFixed(2)}m (${en.pontos} pt)
                </td>
                <td style="color:var(--accent-color); font-weight:bold; font-size:1.1rem;">${en.volume.toFixed(3)}</td>
                <td>
                    <button class="btn-primary" style="background:var(--danger-color); padding: 5px 10px; font-size: 0.8rem;" onclick="deletarEntrada('${en.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            listaEntradas.appendChild(tr);
        });
    }

    // Salvar Entrada
    if (formEntrada) {
        formEntrada.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const calcData = calcularVolumeAtual();
            
            if (calcData.volume <= 0) {
                alert("O volume calculado é zero. Preencha as medidas corretamente para registrar.");
                return;
            }
            
            const fornecedor = document.getElementById('entFornecedor').value.trim();
            const placa = document.getElementById('entPlaca').value.trim();
            const dataStr = document.getElementById('entData').value;
            
            const novaEntrada = {
                data: dataStr,
                fornecedor: fornecedor,
                placa: placa,
                comp: calcData.comp,
                larg: calcData.larg,
                mediaAltura: calcData.mediaAltura,
                pontos: calcData.pontos,
                volume: calcData.volume,
                criadoEm: new Date().toISOString()
            };
            
            const submitBtn = formEntrada.querySelector('button[type="submit"]');
            const textoOriginal = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
            submitBtn.disabled = true;

            try {
                const entradasCol = collection(db, 'entradas');
                await addDoc(entradasCol, novaEntrada);
                
                // Limpar form
                formEntrada.reset();
                // Volta data para hoje
                if(entData) entData.valueAsDate = new Date();
                // Resetar label
                calcularVolumeAtual();
                
                // Atualizar lista
                await renderizarEntradas();
                
                // Notification simples simulada
                alert(`✅ Entrada de ${calcData.volume.toFixed(3)}m³ registrada com sucesso!`);
            } catch (error) {
                console.error("Erro ao salvar entrada: ", error);
                alert("Erro ao salvar entrada. Verifique o console.");
            } finally {
                submitBtn.innerHTML = textoOriginal;
                submitBtn.disabled = false;
            }
        });
    }

    // Função global para deletar
    window.deletarEntrada = async function(id) {
        if(confirm("Tem certeza que deseja apagar este registro de entrada?")) {
            try {
                const docRef = doc(db, 'entradas', id);
                await deleteDoc(docRef);
                await renderizarEntradas();
            } catch (error) {
                console.error("Erro ao deletar entrada: ", error);
                alert("Erro ao deletar entrada.");
            }
        }
    };

    // Inicialização
    renderizarEntradas();
});
