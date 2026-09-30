/* =========================================================
   APP — initialisation, navigation, modales, événements
   ========================================================= */
(function(){
  let currentView = 'today';
  let editingTaskId = null;
  let editingProfileId = null;
  let taskProfileSelection = ['all'];
  let currentRecurrenceType = 'daily';
  let weeklyDaysSelection = [1];

  const taskModalOverlay = document.getElementById('taskModalOverlay');
  const profileModalOverlay = document.getElementById('profileModalOverlay');
  const taskForm = document.getElementById('taskForm');
  const profileForm = document.getElementById('profileForm');

  /* ---------- Navigation ---------- */
  function switchView(view){
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('is-active', btn.dataset.view === view));
    document.querySelectorAll('.view').forEach(sec => sec.classList.toggle('is-active', sec.id === `view-${view}`));
    UI.updateTopbar(view);
    if(view === 'today') UI.renderToday();
    if(view === 'todo') UI.renderTodoView();
    if(view === 'dashboard') UI.renderDashboard();
    if(view === 'tasks') UI.renderTasksView();
    if(view === 'scolaire') UI.renderScolaireView();
  }

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  /* ---------- Vue Aujourd'hui ---------- */
  document.getElementById('profileSelectGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.profile-select-btn');
    if(!btn) return;
    const iso = Store.toISO(new Date());
    Store.setProfileForDate(iso, btn.dataset.profileId);
    UI.renderToday();
    UI.showToast('Programme du jour généré');
  });

  document.getElementById('changeProfileBtn').addEventListener('click', () => {
    UI.showProfilePrompt();
  });

  document.getElementById('todayTaskList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-task]');
    if(!btn) return;
    const iso = Store.toISO(new Date());
    Store.toggleTask(iso, btn.dataset.toggleTask);
    UI.renderToday();
  });

  /* ---------- Vue À faire (tâches ponctuelles) ---------- */
  function addTodoFromInput(){
    const input = document.getElementById('todoInput');
    const name = input.value.trim();
    if(!name) return;
    Store.addTodo({ name });
    input.value = '';
    UI.renderTodoView();
    input.focus();
  }

  document.getElementById('addTodoBtn').addEventListener('click', addTodoFromInput);
  document.getElementById('todoInput').addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      addTodoFromInput();
    }
  });

  function handleTodoListClick(e){
    const toggleBtn = e.target.closest('[data-toggle-todo]');
    if(toggleBtn){
      Store.toggleTodo(toggleBtn.dataset.toggleTodo);
      UI.renderTodoView();
      return;
    }
    const deleteBtn = e.target.closest('[data-delete-todo]');
    if(deleteBtn){
      Store.deleteTodo(deleteBtn.dataset.deleteTodo);
      UI.renderTodoView();
    }
  }

  document.getElementById('todoActiveList').addEventListener('click', handleTodoListClick);
  document.getElementById('todoCompletedList').addEventListener('click', handleTodoListClick);

  document.getElementById('clearCompletedTodosBtn').addEventListener('click', () => {
    if(confirm('Supprimer définitivement les tâches terminées ?')){
      Store.clearCompletedTodos();
      UI.renderTodoView();
      UI.showToast('Tâches terminées supprimées');
    }
  });

  /* ---------- Modale : Tâche ---------- */
  function renderTaskProfileGrid(){
    UI.buildProfileChipGrid(document.getElementById('taskProfileGrid'), taskProfileSelection, (next) => {
      taskProfileSelection = next;
      renderTaskProfileGrid();
    });
  }

  function renderWeeklyDayGrid(){
    UI.buildDayToggleGrid(document.getElementById('weeklyDayGrid'), weeklyDaysSelection, (next) => {
      weeklyDaysSelection = next;
      renderWeeklyDayGrid();
    });
  }

  function setRecurrenceType(type, rec){
    currentRecurrenceType = type;
    document.querySelectorAll('#recurrenceSegmented .segmented-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.recurrence === type);
    });
    document.getElementById('recurrenceWeekly').classList.toggle('hidden', type !== 'weekly');
    document.getElementById('recurrenceMonthly').classList.toggle('hidden', type !== 'monthly');
    document.getElementById('recurrenceInterval').classList.toggle('hidden', type !== 'interval');

    if(type === 'weekly'){
      weeklyDaysSelection = (rec && rec.days && rec.days.length) ? [...rec.days] : [1];
      renderWeeklyDayGrid();
    }
    if(type === 'monthly'){
      document.getElementById('monthlyDay').value = (rec && rec.dayOfMonth) || 1;
    }
    if(type === 'interval'){
      document.getElementById('intervalDays').value = (rec && rec.interval) || 3;
      document.getElementById('intervalStart').value = (rec && rec.startDate) || Store.toISO(new Date());
    }
  }

  document.querySelectorAll('#recurrenceSegmented .segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => setRecurrenceType(btn.dataset.recurrence, null));
  });

  function openTaskModal(taskId){
    editingTaskId = taskId || null;
    const task = taskId ? Store.getTask(taskId) : null;

    document.getElementById('taskModalTitle').textContent = task ? 'Modifier la tâche' : 'Nouvelle tâche';
    document.getElementById('taskId').value = taskId || '';
    document.getElementById('taskName').value = task ? task.name : '';
    document.getElementById('deleteTaskBtn').classList.toggle('hidden', !task);

    const icon = task ? task.icon : 'target';
    document.getElementById('taskIcon').value = icon;
    UI.buildIconGrid(document.getElementById('taskIconGrid'), icon, (val) => {
      document.getElementById('taskIcon').value = val;
    });

    taskProfileSelection = task ? [...task.profileIds] : ['all'];
    renderTaskProfileGrid();

    const rec = task ? task.recurrence : { type: 'daily' };
    setRecurrenceType(rec.type || 'daily', rec);

    taskModalOverlay.classList.remove('hidden');
  }

  function closeTaskModal(){ taskModalOverlay.classList.add('hidden'); }

  document.getElementById('openAddTaskBtn').addEventListener('click', () => {
    if(!Store.getProfiles().length){
      UI.showToast('Ajoute d\'abord un lieu / profil');
      return;
    }
    openTaskModal(null);
  });
  document.getElementById('taskManageList').addEventListener('click', (e) => {
    const row = e.target.closest('.task-manage-row');
    if(row) openTaskModal(row.dataset.taskId);
  });
  document.getElementById('taskModalClose').addEventListener('click', closeTaskModal);
  document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);
  taskModalOverlay.addEventListener('click', (e) => { if(e.target === taskModalOverlay) closeTaskModal(); });

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('taskName').value.trim();
    if(!name) return;

    let recurrence = null;
    if(currentRecurrenceType === 'daily'){
      recurrence = { type: 'daily' };
    }else if(currentRecurrenceType === 'weekly'){
      if(!weeklyDaysSelection.length){ UI.showToast('Choisis au moins un jour'); return; }
      recurrence = { type: 'weekly', days: weeklyDaysSelection };
    }else if(currentRecurrenceType === 'monthly'){
      const day = Math.min(31, Math.max(1, Number(document.getElementById('monthlyDay').value) || 1));
      recurrence = { type: 'monthly', dayOfMonth: day };
    }else if(currentRecurrenceType === 'interval'){
      const interval = Math.max(2, Number(document.getElementById('intervalDays').value) || 2);
      const startDate = document.getElementById('intervalStart').value || Store.toISO(new Date());
      recurrence = { type: 'interval', interval, startDate };
    }

    const payload = {
      name,
      icon: document.getElementById('taskIcon').value,
      profileIds: taskProfileSelection,
      recurrence,
    };

    if(editingTaskId){
      Store.updateTask(editingTaskId, payload);
      UI.showToast('Tâche mise à jour');
    }else{
      Store.addTask(payload);
      UI.showToast('Tâche ajoutée');
    }

    closeTaskModal();
    UI.renderTasksView();
    if(currentView === 'today') UI.renderToday();
  });

  document.getElementById('deleteTaskBtn').addEventListener('click', () => {
    if(!editingTaskId) return;
    if(confirm('Supprimer cette tâche ?')){
      Store.deleteTask(editingTaskId);
      closeTaskModal();
      UI.renderTasksView();
      UI.showToast('Tâche supprimée');
    }
  });

  /* ---------- Modale : Profil ---------- */
  function openProfileModal(profileId){
    editingProfileId = profileId || null;
    const profile = profileId ? Store.getProfile(profileId) : null;

    document.getElementById('profileModalTitle').textContent = profile ? 'Modifier le profil' : 'Nouveau profil';
    document.getElementById('profileId').value = profileId || '';
    document.getElementById('profileName').value = profile ? profile.name : '';
    document.getElementById('deleteProfileBtn').classList.toggle('hidden', !profile);

    const icon = profile ? profile.icon : 'home';
    document.getElementById('profileIcon').value = icon;
    UI.buildIconGrid(document.getElementById('profileIconGrid'), icon, (val) => {
      document.getElementById('profileIcon').value = val;
    });

    profileModalOverlay.classList.remove('hidden');
  }

  function closeProfileModal(){ profileModalOverlay.classList.add('hidden'); }

  document.getElementById('openAddProfileBtn').addEventListener('click', () => openProfileModal(null));
  document.getElementById('profileManageList').addEventListener('click', (e) => {
    const row = e.target.closest('.profile-manage-row');
    if(row) openProfileModal(row.dataset.profileId);
  });
  document.getElementById('profileModalClose').addEventListener('click', closeProfileModal);
  document.getElementById('cancelProfileBtn').addEventListener('click', closeProfileModal);
  profileModalOverlay.addEventListener('click', (e) => { if(e.target === profileModalOverlay) closeProfileModal(); });

  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    if(!name) return;
    const icon = document.getElementById('profileIcon').value;

    if(editingProfileId){
      Store.updateProfile(editingProfileId, { name, icon });
      UI.showToast('Profil mis à jour');
    }else{
      Store.addProfile({ name, icon });
      UI.showToast('Profil ajouté');
    }

    closeProfileModal();
    UI.renderTasksView();
    if(currentView === 'today') UI.renderToday();
  });

  document.getElementById('deleteProfileBtn').addEventListener('click', () => {
    if(!editingProfileId) return;
    if(confirm('Supprimer ce profil ? Les tâches qui lui sont réservées ne seront plus proposées pour ce lieu.')){
      Store.deleteProfile(editingProfileId);
      closeProfileModal();
      UI.renderTasksView();
      UI.showToast('Profil supprimé');
    }
  });

  /* ---------- Réinitialisation générale ---------- */
  document.getElementById('resetDataBtn').addEventListener('click', () => {
    if(confirm('Cette action supprime toutes tes tâches, profils et statistiques. Continuer ?')){
      Store.resetAll();
      switchView('today');
      UI.showToast('Données réinitialisées');
    }
  });

  /* =========================================================
     SCOLAIRE — sous-onglets + modales (Devoirs, Notes, Paramètres)
     ========================================================= */
  let currentScolaireSubview = 'devoirs';
  let editingHomeworkId = null;
  let homeworkSubjectSelection = null;
  let currentHomeworkType = 'devoir';
  let editingGradeId = null;
  let gradeSubjectSelection = null;
  let editingSubjectId = null;

  const homeworkModalOverlay = document.getElementById('homeworkModalOverlay');
  const homeworkForm = document.getElementById('homeworkForm');
  const gradeModalOverlay = document.getElementById('gradeModalOverlay');
  const gradeForm = document.getElementById('gradeForm');
  const subjectModalOverlay = document.getElementById('subjectModalOverlay');
  const subjectForm = document.getElementById('subjectForm');

  /* ---------- Sous-onglets ---------- */
  document.getElementById('scolaireSubtabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.subtab-btn');
    if(!btn) return;
    currentScolaireSubview = btn.dataset.subview;
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('is-active', b === btn));
    document.querySelectorAll('.subview').forEach(sv => sv.classList.toggle('is-active', sv.id === `subview-${currentScolaireSubview}`));
    // Une note Tomuss supprimée depuis l'onglet Notes change le compteur affiché ici.
    if(currentScolaireSubview === 'tomuss') UI.renderScolaireTomuss();
  });

  /* ---------- Modale : Devoir / Évaluation ---------- */
  function renderHomeworkSubjectGrid(){
    UI.buildSingleChipGrid(document.getElementById('homeworkSubjectGrid'), Store.getSubjects(), homeworkSubjectSelection, (id) => {
      homeworkSubjectSelection = id;
      renderHomeworkSubjectGrid();
    });
  }

  function setHomeworkType(type){
    currentHomeworkType = type;
    document.querySelectorAll('#homeworkTypeSegmented .segmented-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.hwtype === type);
    });
  }

  document.querySelectorAll('#homeworkTypeSegmented .segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => setHomeworkType(btn.dataset.hwtype));
  });

  function openHomeworkModal(hwId){
    editingHomeworkId = hwId || null;
    const hw = hwId ? Store.getHomeworkItem(hwId) : null;

    document.getElementById('homeworkModalTitle').textContent = hw ? 'Modifier' : 'Nouveau devoir / évaluation';
    document.getElementById('homeworkId').value = hwId || '';
    document.getElementById('homeworkTitle').value = hw ? hw.title : '';
    document.getElementById('homeworkDueDate').value = hw ? hw.dueDate : Store.toISO(new Date());
    document.getElementById('deleteHomeworkBtn').classList.toggle('hidden', !hw);

    setHomeworkType(hw ? hw.type : 'devoir');

    const subjects = Store.getSubjects();
    homeworkSubjectSelection = hw ? hw.subjectId : (subjects[0] ? subjects[0].id : null);
    renderHomeworkSubjectGrid();

    homeworkModalOverlay.classList.remove('hidden');
  }

  function closeHomeworkModal(){ homeworkModalOverlay.classList.add('hidden'); }

  document.getElementById('openAddHomeworkBtn').addEventListener('click', () => {
    if(!Store.getSubjects().length){
      UI.showToast('Ajoute d\'abord une matière dans Paramètres');
      return;
    }
    openHomeworkModal(null);
  });

  function handleHomeworkListClick(e){
    const toggleBtn = e.target.closest('[data-toggle-hw]');
    if(toggleBtn){
      Store.toggleHomeworkDone(toggleBtn.dataset.toggleHw);
      UI.renderScolaireDevoirs();
      return;
    }
    const editBtn = e.target.closest('[data-edit-hw]');
    if(editBtn) openHomeworkModal(editBtn.dataset.editHw);
  }

  document.getElementById('homeworkActiveList').addEventListener('click', handleHomeworkListClick);
  document.getElementById('homeworkDoneList').addEventListener('click', handleHomeworkListClick);

  document.getElementById('homeworkModalClose').addEventListener('click', closeHomeworkModal);
  document.getElementById('cancelHomeworkBtn').addEventListener('click', closeHomeworkModal);
  homeworkModalOverlay.addEventListener('click', (e) => { if(e.target === homeworkModalOverlay) closeHomeworkModal(); });

  homeworkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('homeworkTitle').value.trim();
    const dueDate = document.getElementById('homeworkDueDate').value;
    if(!title || !dueDate || !homeworkSubjectSelection) return;

    const payload = { subjectId: homeworkSubjectSelection, type: currentHomeworkType, title, dueDate };

    if(editingHomeworkId){
      Store.updateHomework(editingHomeworkId, payload);
      UI.showToast('Mis à jour');
    }else{
      Store.addHomework(payload);
      UI.showToast('Ajouté');
    }
    closeHomeworkModal();
    UI.renderScolaireDevoirs();
  });

  document.getElementById('deleteHomeworkBtn').addEventListener('click', () => {
    if(!editingHomeworkId) return;
    if(confirm('Supprimer cet élément ?')){
      Store.deleteHomework(editingHomeworkId);
      closeHomeworkModal();
      UI.renderScolaireDevoirs();
      UI.showToast('Supprimé');
    }
  });

  document.getElementById('clearDoneHomeworkBtn').addEventListener('click', () => {
    if(confirm('Supprimer définitivement les éléments terminés / passés ?')){
      Store.clearDoneHomework();
      UI.renderScolaireDevoirs();
      UI.showToast('Éléments supprimés');
    }
  });

  /* ---------- Modale : Note ---------- */
  function renderGradeSubjectGrid(){
    UI.buildSingleChipGrid(document.getElementById('gradeSubjectGrid'), Store.getSubjects(), gradeSubjectSelection, (id) => {
      gradeSubjectSelection = id;
      renderGradeSubjectGrid();
    });
  }

  function openGradeModal(gradeId, presetSubjectId){
    editingGradeId = gradeId || null;
    const grade = gradeId ? Store.getGrade(gradeId) : null;

    document.getElementById('gradeModalTitle').textContent = grade ? 'Modifier la note' : 'Nouvelle note';
    document.getElementById('gradeId').value = gradeId || '';
    document.getElementById('gradeTitle').value = grade ? grade.title : '';
    document.getElementById('gradeValue').value = grade ? grade.value : '';
    document.getElementById('gradeMaxPoints').value = grade ? grade.maxPoints : 20;
    document.getElementById('gradeCoefficient').value = grade ? grade.coefficient : 1;
    document.getElementById('gradeDate').value = grade ? grade.date : Store.toISO(new Date());
    document.getElementById('deleteGradeBtn').classList.toggle('hidden', !grade);

    const subjects = Store.getSubjects();
    gradeSubjectSelection = grade ? grade.subjectId : (presetSubjectId || (subjects[0] ? subjects[0].id : null));
    renderGradeSubjectGrid();

    gradeModalOverlay.classList.remove('hidden');
  }

  function closeGradeModal(){ gradeModalOverlay.classList.add('hidden'); }

  document.getElementById('openAddGradeBtn').addEventListener('click', () => {
    if(!Store.getSubjects().length){
      UI.showToast('Ajoute d\'abord une matière dans Paramètres');
      return;
    }
    openGradeModal(null);
  });

  document.getElementById('subjectGradesList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-grade]');
    if(editBtn) openGradeModal(editBtn.dataset.editGrade);
  });

  document.getElementById('gradeModalClose').addEventListener('click', closeGradeModal);
  document.getElementById('cancelGradeBtn').addEventListener('click', closeGradeModal);
  gradeModalOverlay.addEventListener('click', (e) => { if(e.target === gradeModalOverlay) closeGradeModal(); });

  gradeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = Number(document.getElementById('gradeValue').value);
    const maxPoints = Number(document.getElementById('gradeMaxPoints').value) || 20;
    if(Number.isNaN(value) || !gradeSubjectSelection) return;

    const payload = {
      subjectId: gradeSubjectSelection,
      title: document.getElementById('gradeTitle').value.trim(),
      value,
      maxPoints,
      coefficient: Number(document.getElementById('gradeCoefficient').value) || 1,
      date: document.getElementById('gradeDate').value || Store.toISO(new Date()),
    };

    if(editingGradeId){
      Store.updateGrade(editingGradeId, payload);
      UI.showToast('Note mise à jour');
    }else{
      Store.addGrade(payload);
      UI.showToast('Note ajoutée');
    }
    closeGradeModal();
    UI.renderScolaireNotes();
  });

  document.getElementById('deleteGradeBtn').addEventListener('click', () => {
    if(!editingGradeId) return;
    if(confirm('Supprimer cette note ?')){
      Store.deleteGrade(editingGradeId);
      closeGradeModal();
      UI.renderScolaireNotes();
      UI.showToast('Note supprimée');
    }
  });

  /* ---------- Modale : Matière ---------- */
  function renderUeWeightFields(weights){
    let box = document.getElementById('subjectUeBox');
    if(!box){
      box = document.createElement('div');
      box.id = 'subjectUeBox';
      box.className = 'field';
      subjectForm.insertBefore(box, subjectForm.lastElementChild);
    }
    box.innerHTML = '<span class="field-label">Poids dans les UE (%)</span>' + [1, 2].map(sem =>
      `<div class="ue-weights-row"><span class="ue-weights-sem">S${sem}</span>${UES_BY_SEM[sem].map(ue =>
        `<label class="ue-weight"><span>${ue.replace('UE', '')}</span><input type="number" min="0" max="100" step="0.5" data-ue="${ue}" value="${weights[ue] || ''}"></label>`).join('')}</div>`).join('');
  }

  function openSubjectModal(subjectId){
    editingSubjectId = subjectId || null;
    const subject = subjectId ? Store.getSubject(subjectId) : null;

    document.getElementById('subjectModalTitle').textContent = subject ? 'Modifier la matière' : 'Nouvelle matière';
    document.getElementById('subjectId').value = subjectId || '';
    document.getElementById('subjectName').value = subject ? subject.name : '';
    document.getElementById('subjectCoefficient').value = subject ? subject.coefficient : 1;
    renderUeWeightFields(subject ? (subject.ueWeights || {}) : {});
    document.getElementById('deleteSubjectBtn').classList.toggle('hidden', !subject);

    const color = subject ? subject.color : SUBJECT_COLORS[Store.getSubjects().length % SUBJECT_COLORS.length];
    document.getElementById('subjectColor').value = color;
    UI.buildColorGrid(document.getElementById('subjectColorGrid'), color, (val) => {
      document.getElementById('subjectColor').value = val;
    });

    subjectModalOverlay.classList.remove('hidden');
  }

  function closeSubjectModal(){ subjectModalOverlay.classList.add('hidden'); }

  document.getElementById('openAddSubjectBtn').addEventListener('click', () => openSubjectModal(null));
  document.getElementById('subjectManageList').addEventListener('click', (e) => {
    const row = e.target.closest('.profile-manage-row');
    if(row) openSubjectModal(row.dataset.subjectId);
  });
  document.getElementById('subjectModalClose').addEventListener('click', closeSubjectModal);
  document.getElementById('cancelSubjectBtn').addEventListener('click', closeSubjectModal);
  subjectModalOverlay.addEventListener('click', (e) => { if(e.target === subjectModalOverlay) closeSubjectModal(); });

  subjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('subjectName').value.trim();
    if(!name) return;

    const payload = {
      name,
      color: document.getElementById('subjectColor').value,
      coefficient: Number(document.getElementById('subjectCoefficient').value) || 1,
      ueWeights: Object.fromEntries([...document.querySelectorAll('#subjectUeBox input[data-ue]')].map(i => [i.dataset.ue, Number(i.value) || 0])),
    };

    if(editingSubjectId){
      Store.updateSubject(editingSubjectId, payload);
      UI.showToast('Matière mise à jour');
    }else{
      Store.addSubject(payload);
      UI.showToast('Matière ajoutée');
    }
    closeSubjectModal();
    UI.renderScolaireParametres();
    UI.renderScolaireNotes();
  });

  document.getElementById('deleteSubjectBtn').addEventListener('click', () => {
    if(!editingSubjectId) return;
    if(confirm('Supprimer cette matière ? Les devoirs, évaluations et notes associés seront aussi supprimés.')){
      Store.deleteSubject(editingSubjectId);
      closeSubjectModal();
      UI.renderScolaireParametres();
      UI.renderScolaireNotes();
      UI.renderScolaireDevoirs();
      UI.showToast('Matière supprimée');
    }
  });

  document.getElementById('notesSemesterTabs').addEventListener('click', (e) => {
    const b = e.target.closest('.semester-btn');
    if(!b) return;
    UI.setNotesSemester(Number(b.dataset.sem));
    UI.renderScolaireNotes();
  });

  document.getElementById('loadButS1Btn').addEventListener('click', () => {
    const r = Store.applyButPreset();
    UI.renderScolaireParametres();
    UI.renderScolaireNotes();
    UI.showToast(`Tableau S1 : ${r.matched} matière(s) associée(s), ${r.created} créée(s)`);
  });

  /* ---------- Réinitialisation scolaire ---------- */
  document.getElementById('resetSchoolDataBtn').addEventListener('click', () => {
    if(confirm('Cette action supprime toutes tes matières, devoirs, évaluations et notes. Continuer ?')){
      Store.resetSchoolData();
      UI.renderScolaireView();
      UI.showToast('Données scolaires réinitialisées');
    }
  });

  /* =========================================================
     SCOLAIRE — Tomuss : synchronisation des notes (flux RSS)
     Récupération → analyse → vérification par l'utilisateur → import.
     ========================================================= */
  let tomussReport = null;

  const tomussFeedInput = document.getElementById('tomussFeedUrl');
  const tomussProxyInput = document.getElementById('tomussProxyUrl');
  const tomussReviewBox = document.getElementById('tomussReview');

  function setTomussStatus(text, tone){
    const el = document.getElementById('tomussStatus');
    el.textContent = text;
    el.className = 'tomuss-status' + (tone ? ` is-${tone}` : '');
  }

  function saveTomussSettings(){
    Store.setTomussSettings({ feedUrl: tomussFeedInput.value, proxyUrl: tomussProxyInput.value });
  }

  tomussFeedInput.addEventListener('change', saveTomussSettings);
  tomussProxyInput.addEventListener('change', saveTomussSettings);

  // Point d'entrée commun : flux récupéré, collé ou lu depuis un fichier.
  function processTomussText(text){
    let items;
    try{
      items = Tomuss.parseFeed(text);
    }catch(err){
      setTomussStatus(err.message, 'error');
      return;
    }

    Store.markTomussSynced();
    tomussReport = Tomuss.analyse(items);
    UI.renderScolaireTomuss();
    UI.renderTomussReview(tomussReport);

    const pending = tomussReport.groups.reduce((n, g) => n + g.entries.length, 0);
    if(!items.length){
      setTomussStatus('Le flux ne contient encore aucune note.', 'ok');
    }else if(pending){
      setTomussStatus('Flux lu. Vérifie les notes ci-dessous avant de les importer.', 'ok');
    }else{
      setTomussStatus('Flux lu.', 'ok');
    }
  }

  async function runTomussSync(){
    const url = tomussFeedInput.value.trim();
    if(!/^https?:\/\//i.test(url)){
      setTomussStatus('Colle d\'abord le lien du flux RSS (il commence par https://).', 'error');
      tomussFeedInput.focus();
      return;
    }
    saveTomussSettings();

    const btn = document.getElementById('tomussSyncBtn');
    btn.disabled = true;
    btn.textContent = 'Synchronisation…';
    setTomussStatus('Récupération du flux…');

    try{
      const text = await Tomuss.fetchFeed(url, Store.getTomuss().proxyUrl);
      processTomussText(text);
    }catch(err){
      console.error('Tomuss :', err);
      if(err.status){
        setTomussStatus(`Tomuss a répondu avec l'erreur ${err.status}. Vérifie le lien du flux.`, 'error');
      }else{
        setTomussStatus('Le navigateur n\'a pas pu joindre Tomuss (accès bloqué ou hors ligne). Colle le contenu du flux ou charge le fichier ci-dessous.', 'error');
        document.getElementById('tomussManualCard').classList.remove('hidden');
      }
    }finally{
      btn.disabled = false;
      btn.textContent = 'Synchroniser';
    }
  }

  document.getElementById('tomussSyncBtn').addEventListener('click', runTomussSync);

  document.getElementById('tomussManualToggleBtn').addEventListener('click', () => {
    document.getElementById('tomussManualCard').classList.toggle('hidden');
  });

  document.getElementById('tomussAnalysePasteBtn').addEventListener('click', () => {
    const text = document.getElementById('tomussPasteArea').value;
    if(!text.trim()){
      setTomussStatus('Colle d\'abord le contenu du flux.', 'error');
      return;
    }
    processTomussText(text);
  });

  document.getElementById('tomussFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => processTomussText(String(reader.result));
    reader.onerror = () => setTomussStatus('Impossible de lire ce fichier.', 'error');
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('tomussRestoreDismissedBtn').addEventListener('click', () => {
    Store.clearTomussDismissed();
    UI.renderScolaireTomuss();
    UI.showToast('Ces notes seront reproposées à la prochaine synchronisation');
  });

  function importTomussSelection(){
    if(!tomussReport) return;

    const entries = [];
    tomussReport.groups.forEach((g, gi) => {
      const picked = g.entries
        .map((e, ei) => ({ e, ei }))
        .filter(({ ei }) => {
          const box = tomussReviewBox.querySelector(`[data-tomuss-pick="${gi}:${ei}"]`);
          return box && box.checked;
        });
      if(!picked.length) return;

      // La matière n'est créée que si au moins une nouvelle note en a besoin.
      let subjectId = tomussReviewBox.querySelector(`[data-tomuss-subject="${gi}"]`).value;
      const needsSubject = picked.some(({ e }) => e.status === 'new');
      if(subjectId === Tomuss.NEW_SUBJECT){
        if(!needsSubject) return;
        subjectId = Store.addSubject({
          name: g.newSubjectName,
          color: SUBJECT_COLORS[Store.getSubjects().length % SUBJECT_COLORS.length],
          coefficient: 1,
        }).id;
      }
      Store.setTomussSubjectId(g.ue, subjectId);

      picked.forEach(({ e, ei }) => {
        const coefInput = tomussReviewBox.querySelector(`[data-tomuss-coef="${gi}:${ei}"]`);
        entries.push({
          key: e.key, ue: e.ue, value: e.value, max: e.max, date: e.date,
          title: e.column,
          subjectId,
          coefficient: coefInput ? Number(coefInput.value) || 1 : 1,
          existingId: e.existingId,
        });
      });
    });

    if(!entries.length){
      UI.showToast('Aucune note sélectionnée');
      return;
    }

    const { added, updated } = Store.applyTomussImport(entries);
    tomussReport = null;
    UI.renderTomussReview(null);
    UI.renderScolaireView();

    const parts = [];
    if(added) parts.push(`${added} ajoutée${added > 1 ? 's' : ''}`);
    if(updated) parts.push(`${updated} mise${updated > 1 ? 's' : ''} à jour`);
    setTomussStatus(`Import terminé : ${parts.join(', ')}.`, 'ok');
    UI.showToast('Notes Tomuss importées');
  }

  tomussReviewBox.addEventListener('click', (e) => {
    if(e.target.closest('[data-tomuss-import]')){
      importTomussSelection();
    }else if(e.target.closest('[data-tomuss-cancel]')){
      tomussReport = null;
      UI.renderTomussReview(null);
      setTomussStatus('Import annulé.');
    }
  });

  tomussReviewBox.addEventListener('change', (e) => {
    if(e.target.matches('[data-tomuss-pick]')) UI.refreshTomussSelection();
  });

  /* ---------- Raccourcis clavier ---------- */
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      closeTaskModal();
      closeProfileModal();
      closeHomeworkModal();
      closeGradeModal();
      closeSubjectModal();
    }
  });

  /* ---------- Démarrage ---------- */
  switchView('today');
})();
