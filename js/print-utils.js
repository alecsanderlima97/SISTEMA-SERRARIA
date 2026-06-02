(function() {
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeFileName(value) {
        return String(value || 'documento')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'documento';
    }

    function buildDocumentName(parts = []) {
        const clean = parts
            .map(part => String(part || '').trim())
            .filter(Boolean);
        return clean.join(' - ') || 'documento';
    }

    function createBaseStyles() {
        return `
            <style>
                body { font-family: Inter, Arial, sans-serif; margin: 0; background: #eef2f7; color: #0f172a; }
                .doc-shell { padding: 24px; }
                .doc-paper { max-width: 1120px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 32px; box-shadow: 0 20px 60px rgba(15,23,42,.12); }
                .doc-header { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; border-bottom:2px solid #dbe4f0; padding-bottom:18px; margin-bottom:24px; }
                .doc-logo { max-height: 96px; max-width: 280px; width: auto; object-fit: contain; display:block; }
                .doc-title { text-align:right; }
                .doc-title h1 { margin:0; font-size: 28px; color:#0f172a; }
                .doc-title p { margin:6px 0 0; color:#475569; }
                .doc-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:20px; }
                .doc-card { border:1px solid #dbe4f0; border-radius:14px; padding:16px; background:#f8fafc; }
                .doc-card h3 { margin:0 0 12px; font-size:14px; text-transform:uppercase; letter-spacing:.08em; color:#334155; }
                .doc-table { width:100%; border-collapse: collapse; margin-top:20px; font-size: 14px; }
                .doc-table th { background:#0f172a; color:#fff; padding:10px 8px; text-align:left; }
                .doc-table td { border-bottom:1px solid #e2e8f0; padding:10px 8px; vertical-align:top; }
                .doc-total { font-weight:800; color:#0f172a; }
                .doc-money { font-weight:800; color:#166534; }
                .doc-muted { color:#64748b; }
                .doc-note { margin-top:20px; padding:14px 16px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; }
                .doc-signatures { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:40px; margin-top:48px; }
                .doc-signatures div { border-top:1px solid #0f172a; padding-top:8px; text-align:center; color:#334155; }
                @media print {
                    body { background:#fff; }
                    .doc-shell { padding: 0; }
                    .doc-paper { max-width:none; border-radius:0; box-shadow:none; padding:0; }
                }
            </style>
        `;
    }

    function buildPrintableHtml({ title, contentHtml }) {
        return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>${createBaseStyles()}</head><body><div class="doc-shell"><div class="doc-paper">${contentHtml}</div></div></body></html>`;
    }

    function printHtml({ title, contentHtml }) {
        const win = window.open('', '_blank');
        if (!win) {
            alert('Libere pop-ups para imprimir o documento.');
            return;
        }
        win.document.write(buildPrintableHtml({ title, contentHtml }));
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 350);
    }

    function waitForDocumentAssets(root) {
        const images = Array.from(root.querySelectorAll('img'));
        const imagePromises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 1200);
            });
        });
        const fontPromise = document.fonts?.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
        return Promise.all([fontPromise, ...imagePromises]);
    }

    async function downloadPdf({ title, contentHtml, filename }) {
        if (typeof window.html2pdf === 'undefined') {
            alert('Biblioteca de PDF ainda nao carregou. Tente novamente em alguns segundos.');
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.width = '1120px';
        wrapper.style.background = '#ffffff';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '0';
        wrapper.innerHTML = `<div class="doc-shell"><div class="doc-paper">${contentHtml}</div></div>${createBaseStyles()}`;
        document.body.appendChild(wrapper);

        try {
            await waitForDocumentAssets(wrapper);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const paper = wrapper.querySelector('.doc-paper') || wrapper;
            await window.html2pdf().set({
                margin: 8,
                filename: `${sanitizeFileName(filename || title)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            }).from(paper).save();
        } finally {
            wrapper.remove();
        }
    }

    async function sendWhatsApp({ title, contentHtml, filename, phone, message }) {
        try {
            await downloadPdf({ title, contentHtml, filename });
        } catch (error) {
            console.error('Erro ao gerar PDF para WhatsApp:', error);
        }

        const phoneDigits = String(phone || '').replace(/\D/g, '');
        const texto = encodeURIComponent(message || `Segue o documento ${title}. O PDF foi baixado no aparelho para anexar no WhatsApp.`);
        const base = phoneDigits ? `https://wa.me/${phoneDigits}` : 'https://wa.me/';
        window.open(`${base}?text=${texto}`, '_blank');
    }

    function actionsHtml(actionBase, payloadExpr = '') {
        const suffix = payloadExpr ? `(${payloadExpr})` : '()';
        return `
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                <button onclick="${actionBase}.print${suffix}" class="btn-v2 btn-secondary-v2"><i class="fa-solid fa-print"></i> Imprimir</button>
                <button onclick="${actionBase}.pdf${suffix}" class="btn-v2" style="background:#16a34a; color:white;"><i class="fa-solid fa-file-pdf"></i> Baixar PDF</button>
                <button onclick="${actionBase}.whatsapp${suffix}" class="btn-v2" style="background:#22c55e; color:white;"><i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp</button>
            </div>
        `;
    }

    window.DocActions = {
        escapeHtml,
        sanitizeFileName,
        buildDocumentName,
        buildPrintableHtml,
        printHtml,
        downloadPdf,
        sendWhatsApp,
        actionsHtml
    };
})();
