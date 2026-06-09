import { db, auth, reautenticarUsuarioAtual, collection, getDocs, doc, getDoc, deleteDoc, updateDoc } from './firebase-init.js';

const listaHistorico = document.getElementById('listaHistorico');
const filtroCliente = document.getElementById('filtroHistoricoCliente');
const filtroTipo = document.getElementById('filtroHistoricoTipo');

let romaneiosCache = [];
let subprodutosCache = [];
let acaoPendente = null; // 'editar' ou 'excluir'
let cargaPendenteId = null;
let tipoPendente = 'madeira'; // 'madeira' ou 'subprodutos'

function gerarHtmlDocumentoSubproduto(r) {
    return `
        <div class="doc-header">
            <div>
                <img src="logo.png" alt="VANMARTE" class="doc-logo" onerror="this.style.display='none'">
                <div style="margin-top:10px; color:#334155; font-size:13px;">
                    <strong>Venda de Subprodutos</strong><br>
                    Cliente: ${r.cliente || '-'}<br>
                    Documento: ${r.documento || '-'}
                </div>
            </div>
            <div class="doc-title">
                <h1>${r.cliente || 'Comprador'} - ${r.romaneio || r.romaneioCliente || '-'}</h1>
                <p><strong>Recibo</strong></p>
            </div>
        </div>
        <div class="doc-grid">
            <div class="doc-card">
                <h3>Dados do Cliente</h3>
                <p><strong>Cliente:</strong> ${r.cliente || '-'}</p>
                <p><strong>CPF/CNPJ:</strong> ${r.documento || '-'}</p>
                <p><strong>IE:</strong> ${r.ie || '-'}</p>
                <p><strong>Endereco:</strong> ${r.logradouro || '-'}</p>
                <p><strong>Cidade/Estado:</strong> ${r.cidadeEstado || '-'}</p>
            </div>
            <div class="doc-card">
                <h3>Transporte</h3>
                <p><strong>Data:</strong> ${r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                <p><strong>Motorista:</strong> ${r.motorista || '-'}</p>
                <p><strong>Caminhao:</strong> ${r.caminhao || '-'}</p>
                <p><strong>Placas:</strong> ${r.placaCaminhao || '-'} ${r.placaCarreta ? `/ ${r.placaCarreta}` : ''}</p>
            </div>
        </div>
        <table class="doc-table">
            <thead><tr><th>Subproduto</th><th>Unidade</th><th>Quantidade</th><th>Valor Unitario</th><th>Total</th></tr></thead>
            <tbody><tr><td><strong>${r.tipo || '-'}</strong></td><td>${r.unidade || '-'}</td><td>${Number(r.quantidade || 0).toLocaleString('pt-BR')}</td><td>R$ ${Number(r.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td class="doc-money">R$ ${Number(r.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr></tbody>
        </table>
        <div class="doc-signatures"><div>Assinatura do Motorista</div><div>Assinatura do Recebedor</div></div>
    `;
}

window.subprodutoDocActions = {
    current: null,
    set(record) { this.current = record; window.modalDetalhesActions = this; },
    print() {
        if (!this.current) return;
        const docName = window.DocActions.buildDocumentName([this.current.cliente, this.current.romaneio || this.current.romaneioCliente]);
        window.DocActions.printHtml({ title: docName, contentHtml: gerarHtmlDocumentoSubproduto(this.current) });
    },
    pdf() {
        if (!this.current) return;
        const docName = window.DocActions.buildDocumentName([this.current.cliente, this.current.romaneio || this.current.romaneioCliente]);
        return window.DocActions.downloadPdf({ title: docName, filename: docName, contentHtml: gerarHtmlDocumentoSubproduto(this.current) });
    },
    whatsapp() {
        if (!this.current) return;
        const docName = window.DocActions.buildDocumentName([this.current.cliente, this.current.romaneio || this.current.romaneioCliente]);
        return window.DocActions.sendWhatsApp({ title: docName, filename: docName, message: `Segue o recibo de subprodutos ${docName}.`, contentHtml: gerarHtmlDocumentoSubproduto(this.current) });
    }
};

function formatarDataHistorico(valor) {
    if (!valor) return '-';
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return new Date(`${valor}T12:00:00`).toLocaleDateString('pt-BR');
    }
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '-' : data.toLocaleDateString('pt-BR');
}

async function renderizarHistorico() {
    if(!listaHistorico) return;
    const tipoAtivo = filtroTipo ? filtroTipo.value : 'madeira';
    atualizarCabecalhoHistorico(tipoAtivo);
    listaHistorico.innerHTML = `<tr><td colspan="${tipoAtivo === 'subprodutos' ? 7 : 6}" style="text-align:center;"><span class="saw-loader" aria-hidden="true"></span> Carregando...</td></tr>`;
    
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

function atualizarCabecalhoHistorico(tipoAtivo) {
    const header = listaHistorico?.closest('table')?.querySelector('thead tr');
    if (!header) return;
    if (tipoAtivo === 'subprodutos') {
        header.innerHTML = `
            <th>Romaneio Nº</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Caminhão / Motorista</th>
            <th>Volume Total</th>
            <th>Valor Total</th>
            <th>Ações</th>
        `;
        return;
    }
    header.innerHTML = `
        <th>Romaneio Nº</th>
        <th>Data</th>
        <th>Cliente</th>
        <th>Volume Total</th>
        <th>Valor Total</th>
        <th>Ações</th>
    `;
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
            const data = formatarDataHistorico(r.logistica?.dataCarregamento || r.data || r.dataCriacao || r.criadoEm);
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
            listaHistorico.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhuma venda de subproduto encontrada.</td></tr>`;
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
            const transporteHtml = `
                <strong>${r.caminhao || '-'}</strong><br>
                <small style="color:#aaa;">Motorista: ${r.motorista || '-'}</small><br>
                <small style="color:#aaa;">Placa caminhão: ${r.placaCaminhao || '-'}</small><br>
                <small style="color:#aaa;">Placa carreta: ${r.placaCarreta || '-'}</small>
                ${r.dimensoesCaminhao ? `<br><small style="color:#aaa;">Dimensões: ${r.dimensoesCaminhao}</small>` : ''}
            `;

            tr.innerHTML = `
                <td><strong>${numero}</strong></td>
                <td>${dataStr}</td>
                <td>${cliente} <br><small style="color:#aaa;">(${tipoSub})</small></td>
                <td>${transporteHtml}</td>
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
        `;
        window.subprodutoDocActions.set(r);
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
    if (typeof window.definirDocumentoRomaneioAtual === 'function') {
        window.definirDocumentoRomaneioAtual(r, { cidade: r.cidade || '', contato: r.telefone || '' });
        window.modalDetalhesActions = window.romaneioDocActions;
    }
}

window.gerarRelatorioHistoricoMensal = function() {
    const tipoAtivo = filtroTipo ? filtroTipo.value : 'madeira';
    const inicio = document.getElementById('histRelDataInicio')?.value || '';
    const fim = document.getElementById('histRelDataFim')?.value || '';
    const termo = (filtroCliente ? filtroCliente.value : '').toLowerCase();
    const periodo = `${inicio ? new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'Inicio'} a ${fim ? new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}`;

    if (tipoAtivo === 'subprodutos') {
        const itens = subprodutosCache.filter(r => {
            const dataOk = (!inicio || r.data >= inicio) && (!fim || r.data <= fim);
            const clienteOk = !termo || (r.cliente || '').toLowerCase().includes(termo);
            return dataOk && clienteOk;
        });
        if (!itens.length) return alert('Nenhuma venda de subproduto encontrada no periodo.');
        const total = itens.reduce((acc, r) => acc + Number(r.total || 0), 0);
        const linhas = itens.map(r => `<tr><td>${r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td><td>${r.romaneio || '-'}</td><td>${r.cliente || '-'}</td><td>${r.tipo || '-'}</td><td style="text-align:right;">${Number(r.quantidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${r.unidade || 'm3'}</td><td style="text-align:right;">R$ ${Number(r.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`).join('');
        return window.DocActions.printHtml({ title: `Relatorio Subprodutos - ${periodo}`, contentHtml: `<div class="doc-title"><h1>Relatorio de Subprodutos</h1><p>${periodo}</p></div><table class="doc-table"><thead><tr><th>Data</th><th>Rom.</th><th>Cliente</th><th>Material</th><th>Qtd</th><th>Total</th></tr></thead><tbody>${linhas}</tbody></table><h2 style="text-align:right;">TOTAL: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>` });
    }

    const itens = romaneiosCache.filter(r => {
        const data = r.logistica?.dataCarregamento || r.data || '';
        const dataOk = (!inicio || data >= inicio) && (!fim || data <= fim);
        const clienteOk = !termo || (r.cliente || '').toLowerCase().includes(termo);
        return dataOk && clienteOk;
    });
    if (!itens.length) return alert('Nenhuma venda de madeira serrada encontrada no periodo.');
    const resumo = {};
    let totalVolume = 0;
    let totalValor = 0;
    itens.forEach(r => {
        const volume = (r.pacotes || []).reduce((acc, p) => acc + Number(p.m3VendaTotal || 0), 0);
        const valor = Number(r.financeiro?.totalGeral || r.valorFinal || 0);
        totalVolume += volume;
        totalValor += valor;
        (r.pacotes || []).forEach(p => {
            const key = p.qualidade || 'SEM CLASSE';
            if (!resumo[key]) resumo[key] = { volume: 0, valor: 0, pacotes: 0 };
            resumo[key].volume += Number(p.m3VendaTotal || 0);
            resumo[key].valor += Number(p.valorTotalWood || 0);
            resumo[key].pacotes += Number(p.qtdPacotes || 0);
        });
    });
    const linhas = itens.map(r => {
        const volume = (r.pacotes || []).reduce((acc, p) => acc + Number(p.m3VendaTotal || 0), 0);
        const valor = Number(r.financeiro?.totalGeral || r.valorFinal || 0);
        return `<tr><td>${formatarDataHistorico(r.logistica?.dataCarregamento || r.data || r.dataCriacao)}</td><td><strong>${r.numero || r.numeroCarga || '-'}</strong></td><td>${r.cliente || '-'}</td><td style="text-align:right;">${volume.toFixed(3)} m3</td><td style="text-align:right;">R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`;
    }).join('');
    const resumoHtml = Object.entries(resumo).map(([classe, r]) => `<tr><td>${classe}</td><td style="text-align:center;">${r.pacotes}</td><td style="text-align:right;">${r.volume.toFixed(3)} m3</td><td style="text-align:right;">R$ ${r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`).join('');
    window.DocActions.printHtml({ title: `Relatorio Madeira Serrada - ${periodo}`, contentHtml: `<div class="doc-title"><h1>Relatorio de Madeira Serrada</h1><p>${periodo}</p></div><h3>Resumo por classe</h3><table class="doc-table"><thead><tr><th>Classe</th><th>Pacotes</th><th>Volume</th><th>Valor Madeira</th></tr></thead><tbody>${resumoHtml}</tbody></table><h3>Cargas</h3><table class="doc-table"><thead><tr><th>Data</th><th>Romaneio</th><th>Cliente</th><th>Volume</th><th>Total</th></tr></thead><tbody>${linhas}</tbody></table><h2 style="text-align:right;">${itens.length} viagem(ns) | ${totalVolume.toFixed(3)} m3 | R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>` });
};

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
            btnConfirmarSeguranca.innerHTML = '<span class="saw-loader" aria-hidden="true"></span> Validando senha...';

            try {
                // Validar senha fazendo login em background com a mesma conta ativa
                await reautenticarUsuarioAtual(senha);
                
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
                                        await window.FS.ajustarQuantidadeProduto(p.produtoId, totalPecasVendidas);
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
