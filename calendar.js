import { db, collection, addDoc, getDocs, query, where, deleteDoc, doc, onAuthStateChanged, auth } from './js/firebase-init.js';

// Estado da Agenda
let currentDate = new Date();
let selectedDate = new Date();
let events = {}; // Objeto local para cache/renderização: { "YYYY-MM-DD": ["evento1", ...] }
let eventsFullData = []; // Array com {id, dateKey, text} para facilitar deleção

// Elementos DOM
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthEl = document.getElementById('currentMonth');
const eventListEl = document.getElementById('eventList');
const formEvento = document.getElementById('formEvento');
const eventTextInp = document.getElementById('eventText');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    if (formEvento) {
        formEvento.addEventListener('submit', (e) => {
            e.preventDefault();
            addEvent();
        });
    }
});

async function initCalendar() {
    await carregarEventosFirestore();
    renderCalendar();
    renderEvents();
}

async function carregarEventosFirestore() {
    try {
        const snap = await getDocs(collection(db, "agenda"));
        events = {};
        eventsFullData = [];
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const dateKey = data.dateKey;
            const text = data.text;
            
            if (!events[dateKey]) events[dateKey] = [];
            events[dateKey].push(text);
            
            eventsFullData.push({
                id: docSnap.id,
                dateKey: dateKey,
                text: text
            });
        });
        console.log("Agenda: Eventos carregados do Firebase");
    } catch (e) {
        console.error("Erro ao carregar agenda:", e);
    }
}

function renderCalendar() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';
    
    // Cabeçalho dias da semana
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    days.forEach(day => {
        const dayHead = document.createElement('div');
        dayHead.className = 'calendar-day-head';
        dayHead.textContent = day;
        calendarGrid.appendChild(dayHead);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Nome do mês
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    if (currentMonthEl) currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Primeiro dia do mês e total de dias
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Dias do mês anterior para preencher o grid inicial
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay; i > 0; i--) {
        createDayElement(prevMonthDays - i + 1, 'other-month');
    }

    // Dias do mês atual
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        let className = '';
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            className = 'today';
        }
        if (i === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
            className += ' selected';
        }
        createDayElement(i, className, new Date(year, month, i));
    }
}

function createDayElement(day, className, dateObj) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day ${className}`;
    dayEl.textContent = day;

    if (dateObj) {
        const dateKey = formatDateKey(dateObj);
        if (events[dateKey] && events[dateKey].length > 0) {
            const dot = document.createElement('div');
            dot.className = 'day-dot';
            dayEl.appendChild(dot);
        }

        dayEl.addEventListener('click', () => {
            selectedDate = dateObj;
            renderCalendar();
            renderEvents();
        });
    }

    calendarGrid.appendChild(dayEl);
}

function renderEvents() {
    if (!eventListEl) return;
    const dateKey = formatDateKey(selectedDate);
    eventListEl.innerHTML = '';
    
    const dayLabel = selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    const header = document.createElement('div');
    header.style.fontWeight = 'bold';
    header.style.color = 'var(--accent-color)';
    header.style.marginBottom = '10px';
    header.textContent = `Compromissos para ${dayLabel}:`;
    eventListEl.appendChild(header);

    // Filtrar da lista completa para ter acesso aos IDs
    const dayEvents = eventsFullData.filter(e => e.dateKey === dateKey);
    
    if (dayEvents.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Nenhum compromisso agendado.';
        eventListEl.appendChild(empty);
        return;
    }

    dayEvents.forEach((evt) => {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `
            <span>${evt.text}</span>
            <button class="btn-del-event" onclick="deleteEventFirebase('${evt.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        eventListEl.appendChild(item);
    });
}

async function addEvent() {
    const text = eventTextInp.value.trim();
    if (!text) return;

    const dateKey = formatDateKey(selectedDate);
    
    try {
        const docRef = await addDoc(collection(db, "agenda"), {
            dateKey: dateKey,
            text: text,
            criadoEm: new Date().toISOString()
        });
        
        // Atualizar localmente
        if (!events[dateKey]) events[dateKey] = [];
        events[dateKey].push(text);
        eventsFullData.push({ id: docRef.id, dateKey, text });
        
        eventTextInp.value = '';
        renderEvents();
        renderCalendar();
    } catch (e) {
        console.error("Erro ao salvar evento:", e);
        alert("Erro ao salvar compromisso.");
    }
}

window.deleteEventFirebase = async function(id) {
    if (!confirm("Excluir este compromisso?")) return;
    try {
        await deleteDoc(doc(db, "agenda", id));
        
        // Remover do cache local
        const evt = eventsFullData.find(e => e.id === id);
        if (evt) {
            const dateKey = evt.dateKey;
            events[dateKey] = events[dateKey].filter(t => t !== evt.text);
            if (events[dateKey].length === 0) delete events[dateKey];
            eventsFullData = eventsFullData.filter(e => e.id !== id);
        }
        
        renderEvents();
        renderCalendar();
    } catch (e) {
        console.error("Erro ao excluir evento:", e);
        alert("Erro ao excluir.");
    }
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

