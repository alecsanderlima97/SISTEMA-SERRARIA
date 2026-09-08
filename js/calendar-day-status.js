import { auth, db, doc, getDoc, onAuthStateChanged } from './firebase-init.js';

let feriados = [];

function dataEspecial(value) {
    if (!value) return null;
    const feriado = feriados.find(item => (typeof item === 'string' ? item : item?.data) === value);
    if (feriado) return { tipo: 'holiday', nome: typeof feriado === 'string' ? 'Feriado cadastrado' : (feriado.nome || 'Feriado cadastrado') };
    const data = new Date(`${value}T12:00:00`);
    if (Number.isNaN(data.getTime())) return null;
    if (data.getDay() === 0) return { tipo: 'weekend', nome: 'Domingo' };
    if (data.getDay() === 6) return { tipo: 'weekend', nome: 'Sábado' };
    return null;
}

function atualizarCampoData(input) {
    const especial = dataEspecial(input.value);
    const tinhaStatus = Boolean(input.dataset.calendarStatus);
    input.classList.remove('calendar-date-weekend', 'calendar-date-holiday');
    delete input.dataset.calendarStatus;
    if (!especial) {
        if (tinhaStatus) input.removeAttribute('title');
        return;
    }
    input.classList.add(especial.tipo === 'holiday' ? 'calendar-date-holiday' : 'calendar-date-weekend');
    input.dataset.calendarStatus = especial.nome;
    input.title = `${especial.nome}: regra especial de fim de semana/feriado.`;
}

function observarCamposData() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input.dataset.calendarBound) return;
        input.dataset.calendarBound = 'true';
        atualizarCampoData(input);
        input.addEventListener('change', () => atualizarCampoData(input));
        input.addEventListener('input', () => atualizarCampoData(input));
    });
}

async function carregarFeriados() {
    try {
        const regrasDaTela = window.regrasPagamentoDescargaAtual?.();
        if (regrasDaTela) {
            feriados = Array.isArray(regrasDaTela.feriados) ? regrasDaTela.feriados : [];
        } else {
            if (!auth.currentUser) return;
            const snap = await getDoc(doc(db, 'configuracoes_sistema', 'regras_pagamento_descarga'));
            feriados = snap.exists() && Array.isArray(snap.data().feriados) ? snap.data().feriados : [];
        }
        document.querySelectorAll('input[type="date"]').forEach(atualizarCampoData);
    } catch (error) {
        console.warn('Não foi possível carregar a sinalização de feriados nos campos de data.', error);
    }
}

window.addEventListener('feriados:updated', event => {
    feriados = Array.isArray(event.detail?.feriados) ? event.detail.feriados : [];
    document.querySelectorAll('input[type="date"]').forEach(atualizarCampoData);
});

onAuthStateChanged(auth, user => {
    if (user) carregarFeriados();
});

window.abrirRegrasCalendario = function() {
    window.App?.showSection?.('view-configuracoes');
    window.setTimeout(() => {
        const painel = document.querySelector('[data-subsection-permission="view-configuracoes:regras-pagamento"]');
        if (!painel || getComputedStyle(painel).display === 'none') {
            alert('Seu perfil não possui acesso às regras de pagamento e feriados. Solicite a liberação ao administrador.');
            return;
        }
        painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        painel.classList.add('calendar-rules-highlight');
        window.setTimeout(() => painel.classList.remove('calendar-rules-highlight'), 1800);
    }, 80);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        observarCamposData();
        new MutationObserver(observarCamposData).observe(document.body, { childList: true, subtree: true });
        carregarFeriados();
    }, { once: true });
} else {
    observarCamposData();
    new MutationObserver(observarCamposData).observe(document.body, { childList: true, subtree: true });
    carregarFeriados();
}
