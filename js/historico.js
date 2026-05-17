import { db, auth, signInWithEmailAndPassword, collection, getDocs, doc, getDoc, deleteDoc, updateDoc } from './firebase-init.js';

const listaHistorico = document.getElementById('listaHistorico');
const filtroCliente = document.getElementById('filtroHistoricoCliente');

let romaneiosCache = [];

async function renderizarHistorico() {
    if(!listaHistorico) return;
    listaHistorico.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';
    
    try {
        // Buscamos da coleção 'romaneios' que é onde o V2 salva
        const snap = await getDocs(collection(db, 'romaneios'));
        romaneiosCache = [];
        snap.forEach((doc) => {
            romaneiosCache.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar mais recentes primeiro
        romaneiosCache.sort((a, b) => new Date(b.dataCriacao || b.criadoEm || b.id) - new Date(a.dataCriacao || a.criadoEm || a.id));

        aplicarFiltro();
    } catch (error) {
        console.error("Erro histórico:", error);
        listaHistorico.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Erro ao carregar dados.</td></tr>';
    }
}

function aplicarFiltro() {
    const termo = filtroCliente.value.toLowerCase();
    const filtrados = romaneiosCache.filter(r => 
        (r.cliente || '').toLowerCase().includes(termo)
    );

    listaHistorico.innerHTML = '';

    if(filtrados.length === 0) {
        listaHistorico.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum romaneio encontrado.</td></tr>`;
        return;
    }

    filtrados.forEach(r => {
        const tr = document.createElement('tr');
        
        // Tratar diferenças entre V1 e V2
        const numero = r.numero || r.numeroCarga || '-';
        const data = r.logistica?.dataCarregamento || r.data || '-';
        const cliente = r.cliente || '-';
        
        let volume = 0;
        if(r.pacotes) {
            volume = r.pacotes.reduce((acc, p) => acc + (p.m3VendaTotal || 0), 0);
        } else {
            volume = r.volumeTotalItem || 0;
        }

        let valor = 0;
        if(r.financeiro) {
            valor = r.financeiro.totalGeral || 0;
        } else {
            valor = r.valorFinal || 0;
        }

        tr.innerHTML = `
            <td><strong>${numero}</strong></td>
            <td>${data}</td>
            <td>${cliente}</td>
            <td>${volume.toFixed(3)} m³</td>
            <td style="color:#00ff88; font-weight:bold;">R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>
                <button onclick="verDetalhesRomaneio('${r.id}')" class="btn-icon" style="color:var(--accent); font-size:1.2rem;" title="Ver Detalhes">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button onclick="window.iniciarEditarCarga('${r.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1.2rem; margin-left: 10px;" title="Editar Carga">
                    <i class="fa-solid fa-pencil"></i>
                </button>
                <button onclick="window.iniciarExcluirCarga('${r.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1.2rem; margin-left: 10px;" title="Excluir Carga">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        listaHistorico.appendChild(tr);
    });
}

window.verDetalhesRomaneio = async (id) => {
    const r = romaneiosCache.find(x => x.id === id);
    if(!r) return;

    const modal = document.getElementById('modalDetalhesRomaneio');
    const conteudo = document.getElementById('conteudoDetalhesRomaneio');
    
    modal.style.display = 'flex';
    conteudo.innerHTML = '<p>Carregando detalhes...</p>';

    // Gerar HTML dos detalhes
    let pacotesHtml = '';
    if(r.pacotes) {
        pacotesHtml = `
            <table class="package-table" style="margin-top:20px;">
                <thead>
                    <tr>
                        <th>Qualidade</th>
                        <th>Madeira</th>
                        <th>Qtd</th>
                        <th>Pçs/Pct</th>
                        <th>m³ Venda</th>
                        <th>Total Wood</th>
                    </tr>
                </thead>
                <tbody>
                    ${r.pacotes.map(p => `
                        <tr>
                            <td><span style="color:#00ff88; font-weight:bold;">${p.qualidade || 'PADRÃO'}</span></td>
                            <td>${p.produtoNome}<br><small>${p.medidas}</small></td>
                            <td>${p.qtdPacotes}</td>
                            <td>${p.pecasPorPacote}</td>
                            <td>${p.m3VendaTotal.toFixed(3)}</td>
                            <td>R$ ${p.valorTotalWood.toLocaleString('pt-BR')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    conteudo.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-bottom: 1px dashed var(--border); padding-bottom: 20px;">
            <div>
                <p><strong>Cliente:</strong> ${r.cliente}</p>
                <p><strong>Nº Ordem:</strong> ${r.numero || r.numeroCarga}</p>
                <p><strong>Data Carreg.:</strong> ${r.logistica?.dataCarregamento || r.data}</p>
            </div>
            <div>
                <p><strong>Motorista:</strong> ${r.logistica?.motorista || '-'}</p>
                <p><strong>Placa:</strong> ${r.logistica?.placa || '-'}</p>
                <p><strong>Frete:</strong> R$ ${r.logistica?.valorFrete || 0} / m³</p>
            </div>
        </div>
        ${pacotesHtml}
        <div style="margin-top: 20px; text-align: right; background: rgba(0,255,136,0.1); padding: 15px; border-radius: 8px;">
            <p style="font-size: 1.2rem; color: #00ff88; font-weight: 800; margin: 0;">TOTAL DA CARGA: R$ ${(r.financeiro?.totalGeral || r.valorFinal || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <small>Taxa aplicada: ${r.financeiro?.taxaNF || 0}%</small>
        </div>
    `;
};

window.fecharModalDetalhes = () => {
    document.getElementById('modalDetalhesRomaneio').style.display = 'none';
};

if(filtroCliente) {
    filtroCliente.addEventListener('input', aplicarFiltro);
}

// Iniciar
renderizarHistorico();
window.renderizarHistorico = renderizarHistorico;

// --- Lógica de Segurança (Editar/Excluir Cargas com Senha) ---

let acaoPendente = null; // 'editar' ou 'excluir'
let cargaPendenteId = null;

window.fecharModalSeguranca = () => {
    document.getElementById('modalConfirmacaoSeguranca').style.display = 'none';
    document.getElementById('senhaSeguranca').value = '';
    acaoPendente = null;
    cargaPendenteId = null;
};

window.iniciarEditarCarga = (id) => {
    const r = romaneiosCache.find(x => x.id === id);
    if (!r) return;

    acaoPendente = 'editar';
    cargaPendenteId = id;

    const modal = document.getElementById('modalConfirmacaoSeguranca');
    const aviso = document.getElementById('avisoSegurancaTexto');
    const btn = document.getElementById('btnConfirmarSeguranca');

    if (modal && aviso && btn) {
        aviso.innerHTML = `⚠️ AVISO DE SEGURANÇA:<br>Você está prestes a EDITAR a carga finalizada <strong>${r.numero || r.numeroCarga}</strong>.<br>Esta operação reabrirá a carga no editor de romaneios. Ao finalizá-la novamente, as alterações atualizarão este registro e recalcularão o estoque e as contas.`;
        btn.style.background = 'var(--primary-color)';
        btn.innerHTML = '<i class="fa-solid fa-pencil"></i> Autorizar Edição';
        document.getElementById('senhaSeguranca').value = '';
        modal.style.display = 'flex';
    }
};

window.iniciarExcluirCarga = (id) => {
    const r = romaneiosCache.find(x => x.id === id);
    if (!r) return;

    acaoPendente = 'excluir';
    cargaPendenteId = id;

    const modal = document.getElementById('modalConfirmacaoSeguranca');
    const aviso = document.getElementById('avisoSegurancaTexto');
    const btn = document.getElementById('btnConfirmarSeguranca');

    if (modal && aviso && btn) {
        aviso.innerHTML = `⚠️ AVISO DE CRITICALIDADE MÁXIMA:<br>Você está prestes a EXCLUIR permanentemente a carga finalizada <strong>${r.numero || r.numeroCarga}</strong>.<br>Esta operação é irreversível, estornará as quantidades de madeira de volta para o estoque e apagará o registro financeiro correspondente.`;
        btn.style.background = 'var(--danger-color)';
        btn.innerHTML = '<i class="fa-solid fa-trash"></i> Confirmar Exclusão Definitiva';
        document.getElementById('senhaSeguranca').value = '';
        modal.style.display = 'flex';
    }
};

// Vinculação do clique de confirmação de segurança
const btnConfirmarSeguranca = document.getElementById('btnConfirmarSeguranca');
if (btnConfirmarSeguranca) {
    btnConfirmarSeguranca.onclick = async () => {
        const senha = document.getElementById('senhaSeguranca').value;
        if (!senha) {
            alert("Por favor, digite a senha!");
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert("Usuário não autenticado ou sessão expirada.");
            return;
        }

        btnConfirmarSeguranca.disabled = true;
        const textoOriginal = btnConfirmarSeguranca.innerHTML;
        btnConfirmarSeguranca.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validando senha...';

        try {
            // Validar senha fazendo login em background com a mesma conta ativa
            await signInWithEmailAndPassword(auth, user.email, senha);
            
            // Se chegou aqui, a senha está correta!
            if (acaoPendente === 'editar') {
                const r = romaneiosCache.find(x => x.id === cargaPendenteId);
                if (r) {
                    if (window.carregarRomaneioParaEdicao) {
                        window.carregarRomaneioParaEdicao(r);
                        window.fecharModalSeguranca();
                    } else {
                        alert("Módulo Romaneio V2 não está carregado ou pronto.");
                    }
                }
            } else if (acaoPendente === 'excluir') {
                const r = romaneiosCache.find(x => x.id === cargaPendenteId);
                if (r) {
                    // 1. Estornar Estoque das Madeiras do Romaneio antes de deletar
                    if (r.pacotes) {
                        for (const p of r.pacotes) {
                            if (p.produtoId) {
                                const totalPecasVendidas = (p.pecasPorPacote || 0) * (p.qtdPacotes || 1);
                                const prodRef = doc(db, "produtos", p.produtoId);
                                const prodSnap = await getDoc(prodRef);
                                if (prodSnap.exists()) {
                                    const estoqueEstornado = (prodSnap.data().quantidade || 0) + totalPecasVendidas;
                                    await updateDoc(prodRef, { quantidade: estoqueEstornado });
                                }
                            }
                        }
                    }

                    // 2. Excluir o documento do Romaneio no Firestore
                    const docRef = doc(db, "romaneios", cargaPendenteId);
                    await deleteDoc(docRef);

                    alert(`Carga ${r.numero || r.numeroCarga} excluída e estoque estornado com sucesso!`);
                    window.fecharModalSeguranca();
                    await renderizarHistorico(); // Atualizar tabela de histórico
                    
                    // Disparar evento para atualizar dashboard se estiver aberto
                    document.dispatchEvent(new Event('historicoUpdated'));
                }
            }
        } catch (error) {
            console.error("Erro na validação de segurança:", error);
            alert("Senha incorreta! Operação de segurança negada.");
        } finally {
            btnConfirmarSeguranca.disabled = false;
            btnConfirmarSeguranca.innerHTML = textoOriginal;
        }
    };
}

document.addEventListener('historicoUpdated', renderizarHistorico);
