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

    // Inicializar Máscaras (Todas em metros = 2 casas decimais)
    const inputsComMascara = [entComp, entLarg, altE1, altE2, altE3, altD1, altD2, altD3];
    inputsComMascara.forEach(input => {
        if (input) applyMask(input, 2);
    });
    
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
        const c = parseLocalFloat(entComp.value) || 0;
        const l = parseLocalFloat(entLarg.value) || 0;
        
        // Reunir todas as alturas preenchidas
        const inputsAltura = [altE1, altE2, altE3, altD1, altD2, altD3];
        const valoresAltura = [];
        
        inputsAltura.forEach(input => {
            const v = parseLocalFloat(input.value);
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

    // Renderizar Tabela de Histórico (Assíncrono)
    async function renderizarEntradas() {
        if(!listaEntradas) return;
        listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando entradas...</td></tr>';
        
        const entradas = await DB.list('entradas');
        listaEntradas.innerHTML = '';
        
        if(!entradas || entradas.length === 0) {
            listaEntradas.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#aaa;">Nenhuma entrada registrada ainda.</td></tr>';
            return;
        }
        
        // Ordenar por data mais recente primeiro se não vier do DB
        const sortedEntradas = [...entradas].sort((a,b) => new Date(b.data || b.data_carga) - new Date(a.data || a.data_carga));
        
        sortedEntradas.forEach(en => {
            const tr = document.createElement('tr');
            
            // Formatar data para exibição PT-BR
            const dtObj = new Date(en.data || en.data_carga);
            const dtStr = dtObj.toLocaleDateString('pt-BR');
            
            tr.innerHTML = `
                <td>${dtStr}</td>
                <td><strong>${en.fornecedor}</strong></td>
                <td><span class="badge" style="background:#555;">${en.placa}</span></td>
                <td style="font-size: 0.9em;">
                    C: ${(en.comp || 0).toFixed(2)}m <br>
                    L: ${(en.larg || 0).toFixed(2)}m <br>
                    A. Média: ${(en.mediaAltura || 0).toFixed(2)}m (${en.pontos || 0} pt)
                </td>
                <td style="color:var(--accent-color); font-weight:bold; font-size:1.1rem;">${(en.volume || 0).toFixed(3)}</td>
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
                volume: calcData.volume
            };
            
            try {
                await DB.insert('entradas', novaEntrada);
                
                // Limpar form
                formEntrada.reset();
                if(entData) entData.valueAsDate = new Date();
                calcularVolumeAtual();
                
                // Atualizar lista
                await renderizarEntradas();
                alert(`✅ Entrada de ${calcData.volume.toFixed(3)}m³ registrada com sucesso!`);
            } catch (err) {
                console.error(err);
                alert('Erro ao salvar entrada no Supabase.');
            }
        });
    }

    // Função global para deletar
    window.deletarEntrada = async function(id) {
        if(confirm("Tem certeza que deseja apagar este registro de entrada?")) {
            const sucesso = await DB.delete('entradas', id);
            if (sucesso) {
                await renderizarEntradas();
            }
        }
    };

    // Inicialização
    renderizarEntradas();
});
