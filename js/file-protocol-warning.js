(function () {
    if (window.location.protocol !== 'file:') return;

    const showWarning = () => {
        if (document.getElementById('fileProtocolWarning')) return;
        const banner = document.createElement('div');
        banner.id = 'fileProtocolWarning';
        banner.setAttribute('role', 'alert');
        banner.style.cssText = [
            'position:fixed',
            'top:12px',
            'left:50%',
            'transform:translateX(-50%)',
            'z-index:2147483647',
            'max-width:calc(100vw - 32px)',
            'padding:12px 16px',
            'border:1px solid #f2c14e',
            'border-radius:8px',
            'background:#fff8df',
            'box-shadow:0 8px 24px rgba(15,23,42,.18)',
            'color:#3f3200',
            'font:600 14px/1.4 Arial,sans-serif'
        ].join(';');
        banner.innerHTML = 'Abra o sistema pelo servidor para ativar os módulos e os dados: <a href="http://localhost:3000/index.html?modo=teste" style="color:#087f9a;text-decoration:underline">abrir Calculadora Comercial</a>';
        document.body.appendChild(banner);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showWarning, { once: true });
    else showWarning();
})();
