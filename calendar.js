// Estado da Agenda
let currentDate = new Date();
let selectedDate = new Date();
let events = JSON.parse(localStorage.getItem('sistema_serraria_events')) || {};

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

    formEvento.addEventListener('submit', (e) => {
        e.preventDefault();
        addEvent();
    });
});

function initCalendar() {
    renderCalendar();
    renderEvents();
}

function renderCalendar() {
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
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

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
    const dateKey = formatDateKey(selectedDate);
    eventListEl.innerHTML = '';
    
    const dayLabel = selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    const header = document.createElement('div');
    header.style.fontWeight = 'bold';
    header.style.color = 'var(--accent-color)';
    header.style.marginBottom = '10px';
    header.textContent = `Compromissos para ${dayLabel}:`;
    eventListEl.appendChild(header);

    const dayEvents = events[dateKey] || [];
    
    if (dayEvents.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Nenhum compromisso agendado.';
        eventListEl.appendChild(empty);
        return;
    }

    dayEvents.forEach((evt, index) => {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `
            <span>${evt}</span>
            <button class="btn-del-event" onclick="deleteEvent('${dateKey}', ${index})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        eventListEl.appendChild(item);
    });
}

function addEvent() {
    const text = eventTextInp.value.trim();
    if (!text) return;

    const dateKey = formatDateKey(selectedDate);
    if (!events[dateKey]) events[dateKey] = [];
    
    events[dateKey].push(text);
    saveEvents();
    eventTextInp.value = '';
    renderEvents();
    renderCalendar();
}

window.deleteEvent = function(dateKey, index) {
    events[dateKey].splice(index, 1);
    if (events[dateKey].length === 0) delete events[dateKey];
    saveEvents();
    renderEvents();
    renderCalendar();
}

function saveEvents() {
    localStorage.setItem('sistema_serraria_events', JSON.stringify(events));
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
