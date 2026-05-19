const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost:3000/"
});

dom.window.console.log = (...args) => console.log('BROWSER LOG:', ...args);
dom.window.console.error = (...args) => console.error('BROWSER ERROR:', ...args);
dom.window.console.warn = (...args) => console.warn('BROWSER WARN:', ...args);

// Mock Firebase and other globals to prevent immediate crashes
dom.window.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

setTimeout(() => {
    console.log("DOM Loaded. Triggering clicks...");
    
    // Simulate clicking the "Configurações" dropdown item
    const configBtn = dom.window.document.querySelector('.dropdown-item[data-target="view-configuracoes"]');
    if (configBtn) {
        console.log("Config button found, clicking...");
        configBtn.click();
        const section = dom.window.document.getElementById('view-configuracoes');
        console.log("Config section display:", section ? section.style.display : "Not Found");
    } else {
        console.error("Config button NOT FOUND!");
    }

    // Check sidebar tabs
    const frotasBtn = dom.window.document.querySelector('.sidebar a[data-target="view-frotas"]');
    if (frotasBtn) {
        console.log("Frotas button found, clicking...");
        frotasBtn.click();
        const frotasSection = dom.window.document.getElementById('view-frotas');
        console.log("Frotas section display:", frotasSection ? frotasSection.style.display : "Not Found");
    }

    // Close process
    setTimeout(() => {
        console.log("Done testing.");
        process.exit(0);
    }, 1000);

}, 3000);
