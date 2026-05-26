// Helpers globais pequenos que precisam existir antes/independente dos modulos ES.
window.abrirModalPatio = window.abrirModalPatio || function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (modalPatio) {
        modalPatio.style.display = 'flex';
    }
};

window.fecharModalPatio = window.fecharModalPatio || function() {
    const modalPatio = document.getElementById('modalControleProducao');
    if (modalPatio) {
        modalPatio.style.display = 'none';
    }
};

window.scrollToTopHelper = function() {
    const container = document.querySelector('.main-content');
    if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.scrollToBottomHelper = function() {
    const container = document.querySelector('.main-content');
    if (container) {
        container.scrollBy({ top: container.clientHeight * 0.75, behavior: 'smooth' });
    } else {
        window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
    }
};

function criarBotaoRolagem(title, iconClass, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = title;
    button.className = 'btn-scroll-helper';
    button.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(230, 126, 34, 0.3); background: rgba(0, 0, 0, 0.65); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.5);';
    button.onclick = onClick;

    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.style.fontSize = '0.95rem';
    button.appendChild(icon);

    return button;
}

function inicializarWidgetRolagem() {
    if (document.querySelector('.scroll-helper-widget')) return;

    const widget = document.createElement('div');
    widget.className = 'scroll-helper-widget hide-on-print';
    widget.style.cssText = 'position: fixed; bottom: 25px; right: 25px; display: flex; flex-direction: column; gap: 8px; z-index: 9999;';
    widget.appendChild(criarBotaoRolagem('Subir ao Topo', 'fa-solid fa-chevron-up', window.scrollToTopHelper));
    widget.appendChild(criarBotaoRolagem('Descer Mais', 'fa-solid fa-chevron-down', window.scrollToBottomHelper));
    document.body.appendChild(widget);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarWidgetRolagem);
} else {
    inicializarWidgetRolagem();
}
