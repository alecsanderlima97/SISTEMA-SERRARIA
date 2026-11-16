// Modulos do sistema: cada instalacao liga Serraria, Paletes ou os dois.
// Fica em configuracoes_sistema/modulos (leitura: usuarios aprovados; gravacao: gerente/admin, regra ja existente).
// Desligar um modulo so esconde o menu; nenhum dado e apagado.
import { db, doc, getDoc, setDoc } from './firebase-init.js';

// Telas que pertencem a um modulo so. As demais (Clientes, Cadastro de Medidas, Financeiro, Frotas...) sao comuns.
const TELAS_POR_MODULO = {
    serraria: ['view-cavaco', 'view-historico', 'view-entrada', 'view-mapa'],
    paletes: ['view-paletes']
};
const PADRAO = { serraria: true, paletes: true };
let modulos = { ...PADRAO };

function aplicarModulos() {
    Object.entries(TELAS_POR_MODULO).forEach(([modulo, telas]) => {
        telas.forEach(id => {
            const li = document.querySelector(`.sidebar nav ul li a[data-target="${id}"]`)?.closest('li');
            if (li) li.classList.toggle('modulo-desligado', modulos[modulo] === false);
        });
    });
    // Inicio: os paineis do patio pertencem a serraria
    document.body.classList.toggle('modulo-serraria-desligado', modulos.serraria === false);
    document.body.classList.toggle('modulo-paletes-desligado', modulos.paletes === false);
    // Gerar Romaneio: Madeira serrada (serraria) e/ou Paletes
    const abasRom = document.querySelector('#secao-romaneio-v2 .rom-tipo-abas');
    if (abasRom) abasRom.hidden = modulos.paletes === false || modulos.serraria === false;
    if (modulos.serraria === false && document.getElementById('secao-romaneio-v2') && !document.getElementById('secao-romaneio-v2').classList.contains('modo-paletes')) window.trocarTipoRomaneio?.('paletes');
    const chkS = document.getElementById('cfgModuloSerraria');
    const chkP = document.getElementById('cfgModuloPaletes');
    if (chkS) chkS.checked = modulos.serraria !== false;
    if (chkP) chkP.checked = modulos.paletes !== false;
}

async function carregarModulos() {
    try {
        const snap = await getDoc(doc(db, 'configuracoes_sistema', 'modulos'));
        modulos = { ...PADRAO, ...(snap.exists() ? snap.data() : {}) };
    } catch (_) {
        modulos = { ...PADRAO };
    }
    aplicarModulos();
}

window.modulosSistema = () => ({ ...modulos });

window.salvarModulosSistema = async function() {
    const serraria = !!document.getElementById('cfgModuloSerraria')?.checked;
    const paletes = !!document.getElementById('cfgModuloPaletes')?.checked;
    const aviso = document.getElementById('cfgModulosAviso');
    if (!serraria && !paletes) {
        if (aviso) aviso.textContent = 'Deixe pelo menos um módulo ligado.';
        aplicarModulos();
        return;
    }
    try {
        await setDoc(doc(db, 'configuracoes_sistema', 'modulos'), { serraria, paletes, atualizadoEm: new Date().toISOString() }, { merge: true });
        modulos = { ...modulos, serraria, paletes };
        aplicarModulos();
        if (aviso) aviso.textContent = 'Módulos salvos.';
    } catch (error) {
        if (aviso) aviso.textContent = error?.code === 'permission-denied' ? 'Somente gerente ou admin podem mudar os módulos.' : 'Não foi possível salvar. Tente de novo.';
        aplicarModulos();
    }
};

// O menu e montado antes do login terminar; reaplica quando o usuario entra e quando as permissoes mudam.
carregarModulos();
document.addEventListener('DOMContentLoaded', aplicarModulos);
setTimeout(carregarModulos, 3000);
