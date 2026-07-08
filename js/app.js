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
    if(view === 'dashboard') UI.renderDashboard();
    if(view === 'tasks') UI.renderTasksView();
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
    document.getElementById('recurrenceWeekly').hidden = type !== 'weekly';
    document.getElementById('recurrenceMonthly').hidden = type !== 'monthly';
    document.getElementById('recurrenceInterval').hidden = type !== 'interval';

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
    document.getElementById('deleteTaskBtn').hidden = !task;

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
    document.getElementById('deleteProfileBtn').hidden = !profile;

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

  /* ---------- Réinitialisation ---------- */
  document.getElementById('resetDataBtn').addEventListener('click', () => {
    if(confirm('Cette action supprime toutes tes tâches, profils et statistiques. Continuer ?')){
      Store.resetAll();
      switchView('today');
      UI.showToast('Données réinitialisées');
    }
  });

  /* ---------- Raccourcis clavier ---------- */
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      closeTaskModal();
      closeProfileModal();
    }
  });

  /* ---------- Démarrage ---------- */
  switchView('today');
})();
