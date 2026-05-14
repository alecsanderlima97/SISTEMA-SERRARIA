const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE = '.';
const mime = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

function serveFile(res, file) {
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Arquivo nao encontrado: ' + file);
            return;
        }
        let ext = path.extname(file);
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
        res.end(data);
    });
}

http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];

    // Rota raiz -> index.html
    if (urlPath === '/') {
        return serveFile(res, path.join(BASE, 'index.html'));
    }

    let file = path.join(BASE, urlPath);

    // Se não tem extensão, tenta adicionar .html
    if (!path.extname(file)) {
        file = file + '.html';
    }

    serveFile(res, file);

}).listen(PORT, () => {
    console.log('Servidor rodando em http://localhost:' + PORT);
    console.log('Acesse: http://localhost:' + PORT + '/login.html');
});
