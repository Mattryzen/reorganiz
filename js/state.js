/* =========================================================
   STATE — modèle de données central + calculs de statistiques
   ========================================================= */
const Store = (function(){
  let data = loadData();

  function persist(){ saveData(data); }

  function toISO(d){
    const c = new Date(d);
    c.setMinutes(c.getMinutes() - c.getTimezoneOffset());
    return c.toISOString().slice(0, 10);
  }

  /* ---------- Profils ---------- */
  function getProfiles(){ return data.profiles; }

  function getProfile(id){ return data.profiles.find(p => p.id === id) || null; }

  function addProfile({ name, icon }){
    const profile = { id: uid('prof'), name: name.trim(), icon: icon || 'home', createdAt: todayISO() };
    data.profiles.push(profile);
    persist();
    return profile;
  }

  function updateProfile(id, { name, icon }){
    const p = getProfile(id);
    if(!p) return null;
    p.name = name.trim();
    p.icon = icon || p.icon;
    persist();
    return p;
  }

  function deleteProfile(id){
    data.profiles = data.profiles.filter(p => p.id !== id);
    data.tasks.forEach(t => { t.profileIds = t.profileIds.filter(pid => pid !== id); });
    persist();
  }

  /* ---------- Tâches ---------- */
  function getTasks(){ return data.tasks; }

  function getTask(id){ return data.tasks.find(t => t.id === id) || null; }

  function addTask(taskInput){
    const task = {
      id: uid('task'),
      name: taskInput.name.trim(),
      icon: taskInput.icon || 'target',
      profileIds: taskInput.profileIds,
      recurrence: taskInput.recurrence,
      createdAt: todayISO(),
    };
    data.tasks.push(task);
    persist();
    return task;
  }

  function updateTask(id, taskInput){
    const t = getTask(id);
    if(!t) return null;
    t.name = taskInput.name.trim();
    t.icon = taskInput.icon || t.icon;
    t.profileIds = taskInput.profileIds;
    t.recurrence = taskInput.recurrence;
    persist();
    return t;
  }

  function deleteTask(id){
    data.tasks = data.tasks.filter(t => t.id !== id);
    persist();
  }

  /* ---------- Journaux quotidiens ---------- */
  function getLog(dateISO){ return data.logs[dateISO] || null; }

  function getScheduledTasksForDate(dateISO, profileId){
    return data.tasks.filter(t =>
      isTaskScheduledForDate(t, dateISO) && isTaskAvailableForProfile(t, profileId)
    );
  }

  // Définit (ou redéfinit) le profil du jour : régénère la liste de tâches.
  // Si le profil ne change pas, les tâches déjà cochées restent cochées.
  function setProfileForDate(dateISO, profileId){
    const scheduled = getScheduledTasksForDate(dateISO, profileId);
    const existing = data.logs[dateISO];
    const taskStates = {};
    scheduled.forEach(t => {
      const keepState = existing && existing.profileId === profileId && existing.taskStates[t.id];
      taskStates[t.id] = Boolean(keepState);
    });
    data.logs[dateISO] = { profileId, taskStates };
    persist();
    return data.logs[dateISO];
  }

  function toggleTask(dateISO, taskId){
    const log = data.logs[dateISO];
    if(!log || !(taskId in log.taskStates)) return;
    log.taskStates[taskId] = !log.taskStates[taskId];
    persist();
  }

  /* ---------- Statistiques ---------- */
  function dayCounts(dateISO){
    const log = data.logs[dateISO];
    if(!log) return null;
    const ids = Object.keys(log.taskStates);
    const total = ids.length;
    const done = ids.filter(id => log.taskStates[id]).length;
    return { total, done };
  }

  function rateForPrefix(prefix){
    let total = 0, done = 0;
    Object.keys(data.logs).forEach(dateISO => {
      if(!dateISO.startsWith(prefix)) return;
      const counts = dayCounts(dateISO);
      if(!counts) return;
      total += counts.total;
      done += counts.done;
    });
    if(total === 0) return null;
    return Math.round((done / total) * 100);
  }

  function rateForLastNDays(n){
    let total = 0, done = 0;
    const cursor = new Date();
    for(let i = 0; i < n; i++){
      const iso = toISO(cursor);
      const counts = dayCounts(iso);
      if(counts){ total += counts.total; done += counts.done; }
      cursor.setDate(cursor.getDate() - 1);
    }
    if(total === 0) return null;
    return Math.round((done / total) * 100);
  }

  function missedCountForPrefix(prefix){
    let missed = 0;
    Object.keys(data.logs).forEach(dateISO => {
      if(!dateISO.startsWith(prefix)) return;
      const log = data.logs[dateISO];
      Object.values(log.taskStates).forEach(done => { if(!done) missed++; });
    });
    return missed;
  }

  function currentStreak(){
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    const todayCounts = dayCounts(toISO(cursor));
    if(todayCounts && todayCounts.total > 0 && todayCounts.done === todayCounts.total){
      streak++;
    }
    cursor.setDate(cursor.getDate() - 1);

    while(true){
      const iso = toISO(cursor);
      const counts = dayCounts(iso);
      if(!counts) break;
      if(counts.total === 0){ cursor.setDate(cursor.getDate() - 1); continue; }
      if(counts.done === counts.total){
        streak++;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    return streak;
  }

  function last14DaysSeries(){
    const days = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 13);
    for(let i = 0; i < 14; i++){
      const iso = toISO(cursor);
      const counts = dayCounts(iso);
      const rate = counts && counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : null;
      days.push({
        iso,
        label: cursor.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        rate,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  function topMissedTasks(limit){
    const tally = {};
    Object.values(data.logs).forEach(log => {
      Object.entries(log.taskStates).forEach(([taskId, done]) => {
        if(done) return;
        tally[taskId] = (tally[taskId] || 0) + 1;
      });
    });
    return Object.entries(tally)
      .map(([taskId, count]) => {
        const task = getTask(taskId);
        return { taskId, count, name: task ? task.name : 'Tâche supprimée', icon: task ? task.icon : 'target' };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit || 3);
  }

  function computeStats(){
    const now = new Date();
    const curPrefix = toISO(now).slice(0, 7);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevPrefix = toISO(prevDate).slice(0, 7);

    const completionRate30 = rateForLastNDays(30);
    const curMonthRate = rateForPrefix(curPrefix);
    const prevMonthRate = rateForPrefix(prevPrefix);

    let trend = null;
    if(curMonthRate !== null && prevMonthRate !== null){
      trend = curMonthRate - prevMonthRate;
    }

    return {
      completionRate30,
      missedThisMonth: missedCountForPrefix(curPrefix),
      trend,
      curMonthRate,
      prevMonthRate,
      streak: currentStreak(),
      series14: last14DaysSeries(),
      topMissed: topMissedTasks(3),
    };
  }

  function resetAll(){
    clearData();
    data = seedData();
    persist();
  }

  return {
    toISO,
    getProfiles, getProfile, addProfile, updateProfile, deleteProfile,
    getTasks, getTask, addTask, updateTask, deleteTask,
    getLog, getScheduledTasksForDate, setProfileForDate, toggleTask,
    computeStats,
    resetAll,
  };
})();
