/* =========================================================
   UI — rendu du DOM pour les vues + composants partagés
   ========================================================= */
const UI = (function(){

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatDateLong(date){
    const label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatDateShort(iso){
    return parseISODate(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /* ---------- Toast ---------- */
  let toastTimeout;
  function showToast(message){
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  /* ---------- Topbar ---------- */
  function updateTopbar(view){
    document.getElementById('topbarDate').textContent = formatDateLong(new Date());
    const titles = { today: "Aujourd'hui", todo: 'À faire', dashboard: 'Dashboard', tasks: 'Mes tâches', scolaire: 'Scolaire' };
    document.getElementById('topbarTitle').textContent = titles[view] || '';
    if(view !== 'today'){
      document.getElementById('topbarProfileBadge').classList.add('hidden');
    }
  }

  /* ---------- Vue : Aujourd'hui ---------- */
  function renderToday(){
    const iso = Store.toISO(new Date());
    const log = Store.getLog(iso);
    const prompt = document.getElementById('profileSelectPrompt');
    const content = document.getElementById('todayContent');

    if(!log){
      prompt.classList.remove('hidden');
      content.classList.add('hidden');
      renderProfileSelectGrid();
      document.getElementById('topbarProfileBadge').classList.add('hidden');
      return;
    }
    prompt.classList.add('hidden');
    content.classList.remove('hidden');
    renderTodayContent(iso, log);
  }

  function renderProfileSelectGrid(){
    const grid = document.getElementById('profileSelectGrid');
    const profiles = Store.getProfiles();
    if(!profiles.length){
      grid.innerHTML = '<p class="empty-state">Ajoute un premier lieu dans l\'onglet Tâches pour commencer.</p>';
      return;
    }
    grid.innerHTML = profiles.map(p => `
      <button type="button" class="profile-select-btn" data-profile-id="${p.id}">
        <span class="icon-wrap">${iconSvg(p.icon)}</span>
        <span>${escapeHtml(p.name)}</span>
      </button>
    `).join('');
  }

  function renderTodayContent(iso, log){
    const profile = Store.getProfile(log.profileId);
    const tasks = Object.keys(log.taskStates).map(id => Store.getTask(id)).filter(Boolean);
    const total = tasks.length;
    const done = tasks.filter(t => log.taskStates[t.id]).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const circumference = 264; // ~ 2 * PI * 42
    const circle = document.getElementById('todayRingCircle');
    circle.style.strokeDashoffset = String(circumference - (pct / 100) * circumference);
    circle.style.stroke = (pct === 100 && total > 0) ? 'var(--color-success)' : 'var(--color-primary)';
    document.getElementById('todayProgressText').textContent = `${pct}%`;

    document.getElementById('todayProfileLine').textContent = profile ? profile.name : 'Profil supprimé';
    document.getElementById('todayCountLine').textContent = total > 0
      ? `${done} / ${total} tâches faites`
      : 'Aucune tâche prévue ici aujourd\'hui';

    const badge = document.getElementById('topbarProfileBadge');
    if(profile){
      badge.classList.remove('hidden');
      badge.innerHTML = `${iconSvg(profile.icon)}<span>${escapeHtml(profile.name)}</span>`;
    }else{
      badge.classList.add('hidden');
    }

    const list = document.getElementById('todayTaskList');
    const emptyState = document.getElementById('todayEmptyState');

    if(total === 0){
      list.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    const sorted = [...tasks].sort((a, b) => (log.taskStates[a.id] ? 1 : 0) - (log.taskStates[b.id] ? 1 : 0));

    list.innerHTML = sorted.map(t => {
      const isDone = Boolean(log.taskStates[t.id]);
      return `
        <div class="task-row ${isDone ? 'is-done' : ''}" data-task-id="${t.id}">
          <button type="button" class="task-check" data-toggle-task="${t.id}" aria-label="Marquer la tâche comme faite">${iconSvg('check')}</button>
          <span class="task-icon">${iconSvg(t.icon)}</span>
          <div class="task-row-body">
            <p class="task-row-name">${escapeHtml(t.name)}</p>
            <span class="task-badge">${escapeHtml(recurrenceLabel(t.recurrence))}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ---------- Vue : À faire (tâches ponctuelles) ---------- */
  function renderTodoRow(t){
    return `
      <div class="todo-row ${t.done ? 'is-done' : ''}" data-todo-id="${t.id}">
        <button type="button" class="task-check" data-toggle-todo="${t.id}" aria-label="Marquer la tâche comme faite">${iconSvg('check')}</button>
        <p class="todo-row-name">${escapeHtml(t.name)}</p>
        <button type="button" class="todo-delete" data-delete-todo="${t.id}" aria-label="Supprimer la tâche">${iconSvg('trash')}</button>
      </div>
    `;
  }

  function renderTodoView(){
    const todos = Store.getTodos();
    const active = todos.filter(t => !t.done).reverse();
    const completed = todos.filter(t => t.done).reverse();

    const activeList = document.getElementById('todoActiveList');
    const emptyState = document.getElementById('todoEmptyState');
    if(!active.length){
      activeList.innerHTML = '';
      emptyState.classList.remove('hidden');
    }else{
      emptyState.classList.add('hidden');
      activeList.innerHTML = active.map(renderTodoRow).join('');
    }

    const completedSection = document.getElementById('todoCompletedSection');
    const completedList = document.getElementById('todoCompletedList');
    if(!completed.length){
      completedSection.classList.add('hidden');
      completedList.innerHTML = '';
    }else{
      completedSection.classList.remove('hidden');
      completedList.innerHTML = completed.map(renderTodoRow).join('');
    }
  }

  /* ---------- Vue : Dashboard ---------- */
  function renderDashboard(){
    const stats = Store.computeStats();

    document.getElementById('statCompletionRate').textContent =
      stats.completionRate30 === null ? '—' : `${stats.completionRate30}%`;

    document.getElementById('statMissed').textContent = stats.missedThisMonth;

    const trendEl = document.getElementById('statTrend');
    trendEl.classList.remove('is-up', 'is-down');
    if(stats.trend === null){
      trendEl.textContent = '—';
    }else if(stats.trend === 0){
      trendEl.textContent = '0 pt';
    }else{
      trendEl.textContent = `${stats.trend > 0 ? '+' : ''}${stats.trend} pt`;
      trendEl.classList.add(stats.trend > 0 ? 'is-up' : 'is-down');
    }

    document.getElementById('statStreak').textContent = stats.streak;

    renderCompletionChart(stats.series14);

    const missedList = document.getElementById('missedTasksList');
    const missedEmpty = document.getElementById('missedEmptyState');
    if(!stats.topMissed.length){
      missedList.innerHTML = '';
      missedEmpty.classList.remove('hidden');
    }else{
      missedEmpty.classList.add('hidden');
      missedList.innerHTML = stats.topMissed.map(m => `
        <li class="missed-row">
          <span class="missed-row-name">${iconSvg(m.icon, 'nav-icon')}${escapeHtml(m.name)}</span>
          <span class="missed-row-count">${m.count}×</span>
        </li>
      `).join('');
    }
  }

  /* ---------- Vue : Tâches ---------- */
  function renderTasksView(){
    renderTaskManageList();
    renderProfileManageList();
  }

  function renderTaskManageList(){
    const container = document.getElementById('taskManageList');
    const emptyState = document.getElementById('tasksEmptyState');
    const tasks = Store.getTasks();

    if(!tasks.length){
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    const profiles = Store.getProfiles();
    container.innerHTML = tasks.map(t => {
      const profileTags = t.profileIds.includes('all')
        ? '<span class="tag tag-primary">Tous les profils</span>'
        : t.profileIds.map(pid => {
            const p = profiles.find(pp => pp.id === pid);
            return p ? `<span class="tag tag-primary">${escapeHtml(p.name)}</span>` : '';
          }).join('');

      return `
        <div class="task-manage-row" data-task-id="${t.id}">
          <span class="task-icon">${iconSvg(t.icon)}</span>
          <div class="task-manage-body">
            <p class="task-manage-name">${escapeHtml(t.name)}</p>
            <div class="tag-row">
              <span class="tag">${escapeHtml(recurrenceLabel(t.recurrence))}</span>
              ${profileTags}
            </div>
          </div>
          <span class="chevron">${iconSvg('pencil')}</span>
        </div>
      `;
    }).join('');
  }

  function renderProfileManageList(){
    const container = document.getElementById('profileManageList');
    const profiles = Store.getProfiles();

    if(!profiles.length){
      container.innerHTML = '<p class="empty-state">Aucun profil pour le moment.</p>';
      return;
    }
    container.innerHTML = profiles.map(p => `
      <div class="profile-manage-row" data-profile-id="${p.id}">
        <span class="task-icon">${iconSvg(p.icon)}</span>
        <div class="profile-manage-body">
          <p class="profile-manage-name">${escapeHtml(p.name)}</p>
        </div>
        <span class="chevron">${iconSvg('pencil')}</span>
      </div>
    `).join('');
  }

  /* ---------- Vue : Scolaire — Devoirs & évaluations ---------- */

  // Renvoie un libellé relatif ("En retard", "Aujourd'hui", "Demain", "Dans X jours"…)
  // et une classe CSS associée pour une date d'échéance donnée.
  function dueDateLabel(dateISO){
    const todayIso = Store.toISO(new Date());
    if(dateISO < todayIso) return { text: 'En retard', cls: 'is-overdue' };
    if(dateISO === todayIso) return { text: "Aujourd'hui", cls: 'is-today' };

    const diffDays = Math.round((parseISODate(dateISO) - parseISODate(todayIso)) / 86400000);
    if(diffDays === 1) return { text: 'Demain', cls: '' };
    if(diffDays <= 6) return { text: `Dans ${diffDays} jours`, cls: '' };
    return { text: formatDateShort(dateISO), cls: '' };
  }

  function renderHomeworkRow(h){
    const subject = Store.getSubject(h.subjectId);
    const color = subject ? subject.color : '#93A0B8';
    const isDoneVisual = !Store.isHomeworkActive(h);
    const due = dueDateLabel(h.dueDate);

    const leadEl = h.type === 'devoir'
      ? `<button type="button" class="task-check" data-toggle-hw="${h.id}" aria-label="Marquer comme fait">${iconSvg('check')}</button>`
      : `<span class="task-icon" style="background:${color};color:#fff;">${iconSvg('star')}</span>`;

    return `
      <div class="hw-row ${isDoneVisual ? 'is-done' : ''}" data-hw-id="${h.id}" style="--subject-color:${color}">
        ${leadEl}
        <div class="hw-row-body">
          <p class="hw-row-subject"><span class="dot-sm" style="background:${color}"></span>${escapeHtml(subject ? subject.name : 'Matière supprimée')}</p>
          <p class="hw-row-title">${escapeHtml(h.title)}</p>
          <span class="hw-row-due ${due.cls}">${due.text}</span>
        </div>
        <span class="hw-type-badge type-${h.type}">${h.type === 'evaluation' ? 'Éval.' : 'Devoir'}</span>
        <button type="button" class="todo-delete" data-edit-hw="${h.id}" aria-label="Modifier">${iconSvg('pencil')}</button>
      </div>
    `;
  }

  function renderScolaireDevoirs(){
    const all = Store.getHomework();
    const active = all.filter(h => Store.isHomeworkActive(h)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const done = all.filter(h => !Store.isHomeworkActive(h)).sort((a, b) => b.dueDate.localeCompare(a.dueDate));

    const list = document.getElementById('homeworkActiveList');
    const emptyState = document.getElementById('homeworkEmptyState');
    if(!active.length){
      list.innerHTML = '';
      emptyState.classList.remove('hidden');
    }else{
      emptyState.classList.add('hidden');
      list.innerHTML = active.map(renderHomeworkRow).join('');
    }

    const doneSection = document.getElementById('homeworkDoneSection');
    const doneList = document.getElementById('homeworkDoneList');
    if(!done.length){
      doneSection.classList.add('hidden');
      doneList.innerHTML = '';
    }else{
      doneSection.classList.remove('hidden');
      doneList.innerHTML = done.map(renderHomeworkRow).join('');
    }
  }

  /* ---------- Vue : Scolaire — Notes ---------- */
  function renderScolaireNotes(){
    const subjects = Store.getSubjects();
    const overall = Store.overallAverage();
    document.getElementById('overallAverageValue').textContent = overall === null ? '—' : `${overall.toFixed(2)}/20`;

    const container = document.getElementById('subjectGradesList');
    const emptyState = document.getElementById('notesEmptyState');

    if(!subjects.length){
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    container.innerHTML = subjects.map(s => {
      const grades = Store.gradesForSubject(s.id).slice().sort((a, b) => b.date.localeCompare(a.date));
      const avg = Store.subjectAverage(s.id);

      const gradesHtml = grades.length
        ? grades.map(g => {
            const converted = g.maxPoints !== 20
              ? `<div class="grade-row-value-conv">≈ ${((g.value / g.maxPoints) * 20).toFixed(1)}/20</div>`
              : '';
            const coeffLabel = g.coefficient !== 1 ? ` · coeff. ${g.coefficient}` : '';
            return `
              <div class="grade-row" data-grade-id="${g.id}">
                <div class="grade-row-body">
                  <p class="grade-row-title">${escapeHtml(g.title || 'Note')}</p>
                  <p class="grade-row-meta">${formatDateShort(g.date)}${coeffLabel}</p>
                </div>
                <div class="grade-row-value-wrap">
                  <div class="grade-row-value">${g.value}/${g.maxPoints}</div>
                  ${converted}
                </div>
                <button type="button" class="todo-delete" data-edit-grade="${g.id}" aria-label="Modifier">${iconSvg('pencil')}</button>
              </div>
            `;
          }).join('')
        : '<p class="empty-state">Aucune note pour le moment.</p>';

      return `
        <div class="subject-card" style="--subject-color:${s.color}">
          <div class="subject-card-head">
            <div class="subject-card-title"><span class="subject-dot" style="background:${s.color}"></span>${escapeHtml(s.name)}</div>
            <div class="subject-avg-wrap">
              <div class="subject-avg">${avg === null ? '–' : avg.toFixed(2)}</div>
              <div class="subject-avg-sub">${avg === null ? '' : '/20'}</div>
            </div>
          </div>
          <div class="grade-list">${gradesHtml}</div>
        </div>
      `;
    }).join('');
  }

  /* ---------- Vue : Scolaire — Paramètres (matières) ---------- */
  function renderScolaireParametres(){
    const container = document.getElementById('subjectManageList');
    const emptyState = document.getElementById('subjectsEmptyState');
    const subjects = Store.getSubjects();

    if(!subjects.length){
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    container.innerHTML = subjects.map(s => `
      <div class="profile-manage-row" data-subject-id="${s.id}">
        <span class="subject-dot subject-dot-lg" style="background:${s.color}"></span>
        <div class="profile-manage-body">
          <p class="profile-manage-name">${escapeHtml(s.name)}</p>
          <div class="tag-row"><span class="tag">Coefficient ${s.coefficient}</span></div>
        </div>
        <span class="chevron">${iconSvg('pencil')}</span>
      </div>
    `).join('');
  }

  function renderScolaireView(){
    renderScolaireDevoirs();
    renderScolaireNotes();
    renderScolaireParametres();
  }

  /* ---------- Composants partagés (modales) ---------- */
  function buildIconGrid(containerEl, selected, onChange){
    containerEl.innerHTML = ICON_KEYS.map(key => `
      <button type="button" class="icon-choice ${key === selected ? 'is-active' : ''}" data-icon="${key}">${iconSvg(key)}</button>
    `).join('');
    containerEl.querySelectorAll('.icon-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.icon-choice').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        onChange(btn.dataset.icon);
      });
    });
  }

  function buildProfileChipGrid(containerEl, selectedIds, onChange){
    const profiles = Store.getProfiles();
    const chips = [{ id: 'all', name: 'Tous les profils' }, ...profiles];
    containerEl.innerHTML = chips.map(p => `
      <button type="button" class="chip-toggle ${selectedIds.includes(p.id) ? 'is-active' : ''}" data-id="${p.id}">${escapeHtml(p.name)}</button>
    `).join('');
    containerEl.querySelectorAll('.chip-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        let next;
        if(id === 'all'){
          next = ['all'];
        }else{
          const withoutAll = selectedIds.filter(x => x !== 'all');
          next = withoutAll.includes(id) ? withoutAll.filter(x => x !== id) : [...withoutAll, id];
          if(next.length === 0) next = ['all'];
        }
        onChange(next);
      });
    });
  }

  // Grille de sélection à choix unique (une matière pour un devoir / une note).
  function buildSingleChipGrid(containerEl, items, selectedId, onChange){
    if(!items.length){
      containerEl.innerHTML = '<p class="empty-state">Aucune matière disponible.</p>';
      return;
    }
    containerEl.innerHTML = items.map(it => `
      <button type="button" class="chip-toggle ${it.id === selectedId ? 'is-active' : ''}" data-id="${it.id}">
        ${it.color ? `<span class="chip-dot" style="background:${it.color}"></span>` : ''}${escapeHtml(it.name)}
      </button>
    `).join('');
    containerEl.querySelectorAll('.chip-toggle').forEach(btn => {
      btn.addEventListener('click', () => onChange(btn.dataset.id));
    });
  }

  function buildDayToggleGrid(containerEl, selectedDays, onChange){
    containerEl.innerHTML = WEEKDAY_ORDER.map(d => `
      <button type="button" class="day-toggle ${selectedDays.includes(d) ? 'is-active' : ''}" data-day="${d}">${WEEKDAY_LABELS[d]}</button>
    `).join('');
    containerEl.querySelectorAll('.day-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = Number(btn.dataset.day);
        const next = selectedDays.includes(day) ? selectedDays.filter(x => x !== day) : [...selectedDays, day];
        onChange(next);
      });
    });
  }

  function buildColorGrid(containerEl, selectedColor, onChange){
    containerEl.innerHTML = SUBJECT_COLORS.map(c => `
      <button type="button" class="color-choice ${c === selectedColor ? 'is-active' : ''}" data-color="${c}" style="background:${c}" aria-label="Choisir cette couleur"></button>
    `).join('');
    containerEl.querySelectorAll('.color-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.color-choice').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        onChange(btn.dataset.color);
      });
    });
  }

  function showProfilePrompt(){
    document.getElementById('profileSelectPrompt').classList.remove('hidden');
    document.getElementById('todayContent').classList.add('hidden');
    renderProfileSelectGrid();
  }

  return {
    escapeHtml, updateTopbar, showToast,
    renderToday, renderTodoView, renderDashboard, renderTasksView, showProfilePrompt,
    renderScolaireView, renderScolaireDevoirs, renderScolaireNotes, renderScolaireParametres,
    buildIconGrid, buildProfileChipGrid, buildSingleChipGrid, buildDayToggleGrid, buildColorGrid,
  };
})();
