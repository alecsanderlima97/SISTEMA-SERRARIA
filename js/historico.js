import { db, auth, signInWithEmailAndPassword, collection, getDocs, doc, getDoc, deleteDoc, updateDoc } from './firebase-init.js';

const listaHistorico = document.getElementById('listaHistorico');
const filtroCliente = document.getElementById('filtroHistoricoCliente');
const filtroTipo = document.getElementById('filtroHistoricoTipo');

let romaneiosCache = [];
let subprodutosCache = [];
let acaoPendente = null; // 'editar' ou 'excluir'
let cargaPendenteId = null;
let tipoPendente = 'madeira'; // 'madeira' ou 'subprodutos'

async function renderizarHistorico() {
    if(!listaHistorico) return;
    listaHistorico.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';
    
    const tipoAtivo = filtroTipo ? filtroTipo.value : 'madeira';
    
    try {
        if (tipoAtivo === 'madeira') {
            const snap = await getDocs(collection(db, 'romaneios'));
            romaneiosCache = [];
            snap.forEach((doc) => {
                romaneiosCache.push({ id: doc.id, ...doc.data() });
            });

            // Ordenar mais recentes primeiro
            romaneiosCache.sort((a, b) => new Date(b.dataCriacao || b.criadoEm || b.id) - new Date(a.dataCriacao || a.criadoEm || a.id));
        } else {
            const snap = await getDocs(collection(db, 'vendas_subprodutos'));
            subprodutosCache = [];
            snap.forEach((doc) => {
                subprodutosCache.push({ id: doc.id, ...doc.data() });
            });

            // Ordenar mais recentes primeiro
            subprodutosCache.sort((a, b) => new Date(b.data || b.criadoEm || b.id) - new Date(a.data || a.criadoEm || a.id));
        }

        aplicarFiltro();
    } catch (error) {
        console.error("Erro histórico:", error);
        listaHistorico.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Erro ao carregar dados.</td></tr>';
    }
}

function aplicarFiltro() {
    const tipoAtivo = filtroTipo ? filtroTipo.value : 'madeira';
    const termo = (filtroCliente ? filtroCliente.value : '').toLowerCase();
    
    if (!listaHistorico) return;
    listaHistorico.innerHTML = '';
    
    if (tipoAtivo === 'madeira') {
        const filtrados = romaneiosCache.filter(r => 
            (r.cliente || '').toLowerCase().includes(termo)
        );

        if(filtrados.length === 0) {
            listaHistorico.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum romaneio de madeira encontrado.</td></tr>`;
            return;
        }

        filtrados.forEach(r => {
            const tr = document.createElement('tr');
            
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
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                        <button onclick="verDetalhesRomaneio('${r.id}')" class="btn-icon" style="color:var(--accent); font-size:1rem; padding: 4px;" title="Ver Detalhes">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button onclick="window.iniciarEditarCarga('${r.id}')" class="btn-icon" style="color:var(--primary-color); font-size:1rem; padding: 4px;" title="Editar Carga">
                            <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button onclick="window.iniciarExcluirCarga('${r.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1rem; padding: 4px;" title="Excluir Carga">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            listaHistorico.appendChild(tr);
        });
    } else {
        const filtrados = subprodutosCache.filter(r => 
            (r.cliente || '').toLowerCase().includes(termo)
        );

        if(filtrados.length === 0) {
            listaHistorico.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma venda de subproduto encontrada.</td></tr>`;
            return;
        }

        filtrados.forEach(r => {
            const tr = document.createElement('tr');
            
            const numero = r.romaneio || r.romaneioCliente || '-';
            const dataStr = r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
            const cliente = r.cliente || '-';
            const tipoSub = r.tipo || '-';
            const volumeStr = `${parseFloat(r.quantidade || 0).toFixed(2)} ${r.unidade || 'm³'}`;
            const valorTotal = r.total || 0;

            tr.innerHTML = `
                <td><strong>${numero}</strong></td>
                <td>${dataStr}</td>
                <td>${cliente} <br><small style="color:#aaa;">(${tipoSub})</small></td>
                <td>${volumeStr}</td>
                <td style="color:#00ff88; font-weight:bold;">R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td>
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
                        <button onclick="verDetalhesRomaneio('${r.id}')" class="btn-icon" style="color:var(--accent); font-size:1rem; padding: 4px;" title="Ver Detalhes">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button onclick="window.iniciarExcluirCarga('${r.id}')" class="btn-icon" style="color:var(--danger-color); font-size:1rem; padding: 4px;" title="Excluir Venda">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            listaHistorico.appendChild(tr);
        });
    }
}

window.verDetalhesRomaneio = async (id) => {
    const tipoAtivo = filtroTipo ? filtroTipo.value : 'madeira';
    const modal = document.getElementById('modalDetalhesRomaneio');
    const conteudo = document.getElementById('conteudoDetalhesRomaneio');
    
    if(!modal || !conteudo) return;

    modal.style.display = 'flex';
    conteudo.innerHTML = '<p>Carregando detalhes...</p>';

    if (tipoAtivo === 'subprodutos') {
        const r = subprodutosCache.find(x => x.id === id);
        if(!r) {
            conteudo.innerHTML = '<p style="color:var(--danger-color);">Registro não encontrado.</p>';
            return;
        }

        conteudo.innerHTML = `
            <div style="border-bottom: 1px dashed var(--border); padding-bottom: 20px;">
                <h3 style="color: var(--accent-color); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-leaf"></i> Venda de Subproduto - Detalhes</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <p><strong>Cliente:</strong> ${r.cliente}</p>
                        <p><strong>Nº Nosso Romaneio:</strong> ${r.romaneio || '-'}</p>
                        <p><strong>Nº Romaneio Cliente:</strong> ${r.romaneioCliente || '-'}</p>
                        <p><strong>CPF/CNPJ:</strong> ${r.documento || '-'}</p>
                        <p><strong>Insc. Estadual:</strong> ${r.ie || '-'}</p>
                        <p><strong>Endereço:</strong> ${r.logradouro || '-'}</p>
                        <p><strong>Cidade/Estado:</strong> ${r.cidadeEstado || '-'}</p>
                    </div>
                    <div>
                        <p><strong>Data da Venda:</strong> ${r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                        <p><strong>Motorista:</strong> ${r.motorista || '-'}</p>
                        <p><strong>Caminhão:</strong> ${r.caminhao || '-'}</p>
                        <p><strong>Placa Caminhão:</strong> ${r.placaCaminhao || '-'}</p>
                        <p><strong>Placa Carreta:</strong> ${r.placaCarreta || '-'}</p>
                        <p><strong>Medidas H x L x C:</strong> ${r.medidas?.alt || 0}m x ${r.medidas?.larg || 0}m x ${r.medidas?.comp || 0}m</p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(0,255,136,0.05); border-radius: 8px; border: 1px solid rgba(0,255,136,0.1);">
                <table style="width:100%; border-collapse: collapse; font-size: 0.95rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left;">
                            <th style="padding: 8px 0;">Subproduto</th>
                            <th>Unidade</th>
                            <th>Quantidade</th>
                            <th>Valor Unitário</th>
                            <th style="text-align: right;">Total Geral</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: var(--accent-color);">${r.tipo}</td>
                            <td>${r.unidade}</td>
                            <td>${parseFloat(r.quantidade || 0).toFixed(2)}</td>
                            <td>R$ ${parseFloat(r.valorUnitario || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td style="text-align: right; font-weight: bold; color: #00ff88;">R$ ${parseFloat(r.total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 25px; display: flex; justify-content: flex-end; gap: 10px;" class="hide-on-print">
                 <button onclick="window.reimprimirReciboSubproduto('${r.id}')" class="btn-primary" style="background: #0ea5e9; border-color: #0ea5e9; font-size: 0.9rem; padding: 10px 18px; display: flex; align-items: center; gap: 8px; justify-content: center;">
                     <i class="fa-solid fa-print"></i> Reimprimir Recibo
                 </button>
            </div>
        `;
        return;
    }

    const r = romaneiosCache.find(x => x.id === id);
    if(!r) {
        conteudo.innerHTML = '<p style="color:var(--danger-color);">Registro não encontrado.</p>';
        return;
    }

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
        ${r.observacaoCarga ? `<div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);"><p style="margin:0; font-weight:bold; color:var(--warning);">Observação da Carga:</p><p style="margin: 5px 0 0 0; font-size:0.9rem; color:#eee; white-space:pre-wrap;">${r.observacaoCarga}</p></div>` : ''}
        <div style="margin-top: 20px; text-align: right; background: rgba(0,255,136,0.1); padding: 15px; border-radius: 8px;">
            <p style="font-size: 1.2rem; color: #00ff88; font-weight: 800; margin: 0;">TOTAL DA CARGA: R$ ${(r.financeiro?.totalGeral || r.valorFinal || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <small>Taxa aplicada: ${r.financeiro?.taxaNF || 0}%</small>
        </div>
    `;
}

window.fecharModalDetalhes = () => {
    document.getElementById('modalDetalhesRomaneio').style.display = 'none';
};

window.reimprimirReciboSubproduto = (id) => {
    const r = subprodutosCache.find(x => x.id === id);
    if (!r) return;

    document.getElementById('printCavRomaneio').textContent = r.romaneio || '';
    document.getElementById('printCavRomaneioCliente').textContent = r.romaneioCliente || '';
    document.getElementById('printCavCliente').textContent = r.cliente || '';
    document.getElementById('printCavDoc').textContent = r.documento || '';
    document.getElementById('printCavIE').textContent = r.ie || '';
    document.getElementById('printCavLogradouro').textContent = r.logradouro || '';
    document.getElementById('printCavCidadeEstado').textContent = r.cidadeEstado || '';
    
    document.getElementById('printCavMotorista').textContent = r.motorista || '';
    document.getElementById('printCavCaminhao').textContent = r.caminhao || '';
    document.getElementById('printCavPlacaCaminhao').textContent = r.placaCaminhao || '';
    document.getElementById('printCavPlacaCarreta').textContent = r.placaCarreta || '';
    
    let medidasStr = '---';
    if (r.medidas && r.medidas.alt > 0 && r.medidas.larg > 0 && r.medidas.comp > 0) {
        medidasStr = `${parseFloat(r.medidas.alt).toFixed(2)}m (Alt) x ${parseFloat(r.medidas.larg).toFixed(2)}m (Larg) x ${parseFloat(r.medidas.comp).toFixed(2)}m (Comp)`;
    }
    document.getElementById('printCavMedidas').textContent = medidasStr;

    const dataVenda = r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    document.getElementById('printCavData').textContent = dataVenda;
    document.getElementById('printCavTipo').textContent = r.tipo || '';
    document.getElementById('printCavQtd').textContent = r.quantidade.toLocaleString('pt-BR');
    document.getElementById('printCavUni').textContent = r.unidade || '';
    document.getElementById('printCavValorUni').textContent = r.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    document.getElementById('printCavTotal').textContent = r.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const printArea = document.getElementById('printAreaSubprodutos');
    if (printArea) {
        printArea.style.display = 'block';
        window.print();
        printArea.style.display = 'none';
    }
};

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
    tipoPendente = 'madeira';

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
    const tipoAtivo = filtroTipo ? filtroTipo.value : 'madeira';
    tipoPendente = tipoAtivo;
    
    let item = null;
    let identificador = '';
    
    if (tipoAtivo === 'subprodutos') {
        item = subprodutosCache.find(x => x.id === id);
        identificador = item ? (item.romaneio || item.romaneioCliente || 'Sem número') : '';
    } else {
        item = romaneiosCache.find(x => x.id === id);
        identificador = item ? (item.numero || item.numeroCarga || 'Sem número') : '';
    }
    
    if (!item) return;

    acaoPendente = 'excluir';
    cargaPendenteId = id;

    const modal = document.getElementById('modalConfirmacaoSeguranca');
    const aviso = document.getElementById('avisoSegurancaTexto');
    const btn = document.getElementById('btnConfirmarSeguranca');

    if (modal && aviso && btn) {
        if (tipoAtivo === 'subprodutos') {
            aviso.innerHTML = `⚠️ AVISO DE CRITICALIDADE MÁXIMA:<br>Você está prestes a EXCLUIR permanentemente a venda de subproduto <strong>${identificador}</strong>.<br>Esta operação é irreversível e apagará o registro correspondente do banco de dados.`;
        } else {
            aviso.innerHTML = `⚠️ AVISO DE CRITICALIDADE MÁXIMA:<br>Você está prestes a EXCLUIR permanentemente a carga finalizada <strong>${identificador}</strong>.<br>Esta operação é irreversível, estornará as quantidades de madeira de volta para o estoque e apagará o registro financeiro correspondente.`;
        }
        btn.style.background = 'var(--danger-color)';
        btn.innerHTML = '<i class="fa-solid fa-trash"></i> Confirmar Exclusão Definitiva';
        document.getElementById('senhaSeguranca').value = '';
        modal.style.display = 'flex';
    }
};

// Inicialização segura do módulo histórico
function inicializarModuloHistorico() {
    if(filtroCliente) {
        filtroCliente.removeEventListener('input', aplicarFiltro);
        filtroCliente.addEventListener('input', aplicarFiltro);
    }
    
    if(filtroTipo) {
        filtroTipo.removeEventListener('change', renderizarHistorico);
        filtroTipo.addEventListener('change', renderizarHistorico);
    }
    
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
                    if (tipoPendente === 'subprodutos') {
                        const r = subprodutosCache.find(x => x.id === cargaPendenteId);
                        if (r) {
                            const docRef = doc(db, "vendas_subprodutos", cargaPendenteId);
                            await deleteDoc(docRef);

                            alert(`Venda de subproduto ${r.romaneio || r.romaneioCliente} excluída com sucesso!`);
                            window.fecharModalSeguranca();
                            await renderizarHistorico(); // Atualizar tabela de histórico
                            
                            // Disparar evento para atualizar dashboard se estiver aberto
                            document.dispatchEvent(new Event('historicoUpdated'));
                        }
                    } else {
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
    
    renderizarHistorico();
}

// Executar de forma segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarModuloHistorico);
} else {
    inicializarModuloHistorico();
}

window.renderizarHistorico = renderizarHistorico;
document.addEventListener('historicoUpdated', renderizarHistorico);
