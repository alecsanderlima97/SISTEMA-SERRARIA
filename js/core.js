// Configuração de Persistência: 'local' para testar no navegador, 'supabase' para nuvem
const DB_STORAGE_MODE = 'local'; 
const sb = window.supabaseClient;

const DB = {
    // Helper para LocalStorage
    _getLocal: (table) => JSON.parse(localStorage.getItem(`sistema_serraria_${table}`)) || [],
    _setLocal: (table, data) => localStorage.setItem(`sistema_serraria_${table}`, JSON.stringify(data)),

    // Buscar lista (Assíncrono para manter compatibilidade)
    list: async (table) => {
        if (DB_STORAGE_MODE === 'supabase' && sb) {
            const { data, error } = await sb
                .from(table)
                .select('*')
                .order('created_at', { ascending: false });
            if (error) { console.error(`Erro ao listar ${table}:`, error); return []; }
            return data;
        } else {
            // Lógica LocalStorage
            let data = DB._getLocal(table);
            // Ordenar por data (simulado)
            return data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }
    },

    // Buscar único por ID
    getById: async (table, id) => {
        if (DB_STORAGE_MODE === 'supabase' && sb) {
            const { data, error } = await sb
                .from(table)
                .select('*')
                .eq('id', id)
                .single();
            if (error) { console.error(`Erro ao buscar id ${id} em ${table}:`, error); return null; }
            return data;
        } else {
            let data = DB._getLocal(table);
            return data.find(item => item.id == id) || null;
        }
    },

    // Inserir
    insert: async (table, obj) => {
        if (DB_STORAGE_MODE === 'supabase' && sb) {
            if (obj.id && typeof obj.id === 'number') delete obj.id;
            const { data, error } = await sb
                .from(table)
                .insert([obj])
                .select();
            if (error) { console.error(`Erro ao inserir em ${table}:`, error); return null; }
            return data[0];
        } else {
            let data = DB._getLocal(table);
            // Simular ID e CreatedAt
            const newObj = {
                ...obj,
                id: Date.now(), // ID único simplificado
                created_at: new Date().toISOString()
            };
            data.push(newObj);
            DB._setLocal(table, data);
            return newObj;
        }
    },

    // Atualizar
    update: async (table, id, obj) => {
        if (DB_STORAGE_MODE === 'supabase' && sb) {
            const { data, error } = await sb
                .from(table)
                .update(obj)
                .eq('id', id)
                .select();
            if (error) { console.error(`Erro ao atualizar ${table}:`, error); return null; }
            return data[0];
        } else {
            let data = DB._getLocal(table);
            const index = data.findIndex(item => item.id == id);
            if (index === -1) return null;
            
            data[index] = { ...data[index], ...obj };
            DB._setLocal(table, data);
            return data[index];
        }
    },

    // Deletar
    delete: async (table, id) => {
        if (DB_STORAGE_MODE === 'supabase' && sb) {
            const { error } = await sb
                .from(table)
                .delete()
                .eq('id', id);
            if (error) { console.error(`Erro ao deletar de ${table}:`, error); return false; }
            return true;
        } else {
            let data = DB._getLocal(table);
            const newData = data.filter(item => item.id != id);
            DB._setLocal(table, newData);
            return true;
        }
    },

    // Auth Check (Simplificado para LocalStorage)
    checkAuth: () => {
        if(localStorage.getItem('vanmarte_logged') !== 'true') {
            window.location.href = 'login.html';
        }
    },
    logout: () => {
        localStorage.setItem('vanmarte_logged', 'false');
        window.location.href = 'login.html';
    }
};

// ---- UTILITÁRIOS GLOBAIS ----

window.formatarMoeda = function(valor) {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Arredondamento financeiro preciso para centavos
 */
window.roundTo = function(val, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
};

/**
 * Converte qualquer string (BR ou US) para float com segurança.
 * Lida com '1.234,56' -> 1234.56 e '1234.56' -> 1234.56
 */
window.parseLocalFloat = function(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    
    // Se contém vírgula, assume formato BR
    if (value.includes(',')) {
        // Remove pontos de milhar e troca vírgula por ponto decimal
        const clean = value.replace(/\./g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    }
    
    // Se não tem vírgula, assume formato US/Programação
    return parseFloat(value) || 0;
};

DB.checkAuth();

// ---- Controle de Rotas / Sidebar ----
const navLinks = document.querySelectorAll('.sidebar nav ul li a');
const sections = document.querySelectorAll('.view-section');

// Oculta todas e mostra dashboard padrão
sections.forEach(s => s.style.display = 'none');
if(document.getElementById('view-dashboard')) {
  document.getElementById('view-dashboard').style.display = 'block';
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        if(link.id === 'btnLogout') {
            e.preventDefault();
            DB.logout();
            return;
        }

        e.preventDefault();
        
        // Remove active class de todos
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Pega o target e mostra
        const targetId = link.getAttribute('data-target');
        sections.forEach(s => s.style.display = 'none');
        document.getElementById(targetId).style.display = 'block';
    });
});

// ---- UTILITÁRIOS E MÁSCARAS ----

window.applyMask = function(input, decimals) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ""); // Remove não-dígitos
        if (value === "") {
            e.target.value = "";
            return;
        }
        let number = parseFloat(value) / Math.pow(10, decimals);
        e.target.value = number.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    });
    // Formatar valor inicial se houver
    if (input.value) {
        let val = input.value.replace(',', '.');
        let num = parseFloat(val);
        if (!isNaN(num)) {
            input.value = num.toLocaleString('pt-BR', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        }
    }
};

window.maskCnpj = function(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 14) v = v.substring(0, 14);
        if (v.length > 12) {
            v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
        } else if (v.length > 8) {
            v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4}).*/, "$1.$2.$3/$4");
        } else if (v.length > 5) {
            v = v.replace(/^(\d{2})(\d{3})(\d{3}).*/, "$1.$2.$3");
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{3}).*/, "$1.$2");
        }
        e.target.value = v;
    });
};

window.maskPhone = function(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 10) {
            v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else if (v.length > 5) {
            v = v.replace(/^(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
        } else if (v.length > 0) {
            v = v.replace(/^(\d{0,2}).*/, "($1");
        }
        e.target.value = v;
    });
};

window.parseLocalFloat = function(value) {
    if (typeof value !== 'string') return parseFloat(value) || 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

// ---- BARRA DE STATUS (USUÁRIO, DATA, HORA) ----

window.updateStatusBar = function() {
    const statusUser = document.getElementById('statusUser');
    const statusDate = document.getElementById('statusDate');
    const statusTime = document.getElementById('statusTime');

    // Tentar pegar login salvo ou usar padrão
    const loggedUser = localStorage.getItem('vanmarte_logged_user') || 'Administrador';
    if (statusUser) statusUser.textContent = loggedUser;
    
    const agora = new Date();
    if (statusDate) statusDate.textContent = agora.toLocaleDateString('pt-BR');
    if (statusTime) statusTime.textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Iniciar após DOM carregado
document.addEventListener('DOMContentLoaded', () => {
    window.updateStatusBar();
    setInterval(window.updateStatusBar, 1000 * 60); // Atualiza a cada minuto

    // Global: Capitalizar primeira letra de campos de texto
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (el.tagName === 'INPUT' && ['text', 'search'].includes(el.type) && !el.readOnly) {
            // Ignorar campos que já são forçados para Uppercase (como Placa) ou específicos do sistema
            if (el.id.includes('Placa')) return;

            let val = el.value;
            if (val.length > 0) {
                // Capitalizar apenas a primeira letra se ela for minúscula
                const firstChar = val.charAt(0);
                if (firstChar !== firstChar.toUpperCase()) {
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    
                    el.value = firstChar.toUpperCase() + val.slice(1);
                    
                    // Restaurar posição do cursor
                    if (el.setSelectionRange) {
                        el.setSelectionRange(start, end);
                    }
                }
            }
        }
    });
});
