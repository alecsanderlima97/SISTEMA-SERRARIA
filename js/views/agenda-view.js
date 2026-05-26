(function() {
    const html = `            <!-- ====== TELA: AGENDA / CALENDÁRIO ====== -->
            <section id="view-agenda" class="view-section" style="display: none;">
                <div class="main-header">
                    <h1><i class="fa-solid fa-calendar-days"></i> Agenda e Compromissos</h1>
                    <p>Organize suas entregas e agendamentos</p>
                </div>

                <div class="grid-form" style="grid-template-columns: 2fr 1fr; gap: 2rem;">
                    <!-- Calendário -->
                    <div class="glass-panel">
                        <div class="calendar-header"
                            style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h2 id="currentMonth" style="margin:0; font-family: var(--font-heading);">Março 2026</h2>
                            <div class="calendar-nav">
                                <button class="btn-secondary" id="prevMonth" style="padding: 5px 10px;"><i
                                        class="fa-solid fa-chevron-left"></i></button>
                                <button class="btn-secondary" id="nextMonth" style="padding: 5px 10px;"><i
                                        class="fa-solid fa-chevron-right"></i></button>
                            </div>
                        </div>
                        <div id="calendarGrid" class="calendar-grid">
                            <!-- Preenchido via JS -->
                        </div>
                    </div>

                    <!-- Lista de Eventos / Lembretes -->
                    <div class="glass-panel">
                        <div class="section-title">
                            <h2><i class="fa-solid fa-list-ul"></i> Lembretes do Dia</h2>
                        </div>
                        <div id="eventList" class="event-list">
                            <p class="empty-state">Selecione um dia para ver ou adicionar lembretes.</p>
                        </div>
                        <hr style="margin: 1.5rem 0; border: 0; border-top: 1px solid var(--panel-border);">
                        <form id="formEvento">
                            <div class="input-group" style="margin-bottom: 1rem;">
                                <label>Novo Compromisso</label>
                                <input type="text" id="eventText" placeholder="Ex: Entrega Cliente X" required>
                            </div>
                            <button type="submit" class="btn-primary" style="width:100%;">
                                <i class="fa-solid fa-plus"></i> Adicionar
                            </button>
                        </form>
                    </div>
                </div>
            </section>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
})();
