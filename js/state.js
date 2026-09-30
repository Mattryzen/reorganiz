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

  /* ---------- To-do (tâches ponctuelles, indépendantes des profils) ---------- */
  function getTodos(){ return data.todos; }

  function addTodo({ name }){
    const todo = { id: uid('todo'), name: name.trim(), done: false, createdAt: todayISO(), completedAt: null };
    data.todos.push(todo);
    persist();
    return todo;
  }

  function toggleTodo(id){
    const t = data.todos.find(x => x.id === id);
    if(!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? todayISO() : null;
    persist();
  }

  function deleteTodo(id){
    data.todos = data.todos.filter(x => x.id !== id);
    persist();
  }

  function clearCompletedTodos(){
    data.todos = data.todos.filter(x => !x.done);
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

  /* ---------- Scolaire : matières ---------- */
  function getSubjects(){ return data.subjects; }

  function getSubject(id){ return data.subjects.find(s => s.id === id) || null; }

  function cleanWeights(w){
    const out = {};
    Object.keys(w || {}).forEach(k => { const v = Number(w[k]); if(v > 0) out[k] = v; });
    return out;
  }

  function addSubject({ name, color, coefficient, ueWeights }){
    const subject = {
      id: uid('subj'),
      name: name.trim(),
      color: color || SUBJECT_COLORS[0],
      coefficient: coefficient || 1,
      ueWeights: cleanWeights(ueWeights),
      createdAt: todayISO(),
    };
    data.subjects.push(subject);
    persist();
    return subject;
  }

  function updateSubject(id, { name, color, coefficient, ueWeights }){
    const s = getSubject(id);
    if(!s) return null;
    s.name = name.trim();
    s.color = color || s.color;
    s.coefficient = coefficient || 1;
    if(ueWeights) s.ueWeights = cleanWeights(ueWeights);
    persist();
    return s;
  }

  function deleteSubject(id){
    data.subjects = data.subjects.filter(s => s.id !== id);
    data.homework = data.homework.filter(h => h.subjectId !== id);
    data.grades = data.grades.filter(g => g.subjectId !== id);
    Object.keys(data.tomuss.ueMap).forEach(ue => {
      if(data.tomuss.ueMap[ue] === id) delete data.tomuss.ueMap[ue];
    });
    persist();
  }

  /* ---------- Scolaire : devoirs / évaluations ---------- */
  function getHomework(){ return data.homework; }

  function getHomeworkItem(id){ return data.homework.find(h => h.id === id) || null; }

  function addHomework({ subjectId, type, title, dueDate }){
    const hw = {
      id: uid('hw'),
      subjectId,
      type: type === 'evaluation' ? 'evaluation' : 'devoir',
      title: title.trim(),
      dueDate,
      done: false,
      createdAt: todayISO(),
    };
    data.homework.push(hw);
    persist();
    return hw;
  }

  function updateHomework(id, { subjectId, type, title, dueDate }){
    const h = getHomeworkItem(id);
    if(!h) return null;
    h.subjectId = subjectId;
    h.type = type === 'evaluation' ? 'evaluation' : 'devoir';
    h.title = title.trim();
    h.dueDate = dueDate;
    persist();
    return h;
  }

  function toggleHomeworkDone(id){
    const h = getHomeworkItem(id);
    if(!h) return;
    h.done = !h.done;
    persist();
  }

  function deleteHomework(id){
    data.homework = data.homework.filter(h => h.id !== id);
    persist();
  }

  // Un devoir est "actif" tant qu'il n'est pas coché fait ;
  // une évaluation est "active" tant que sa date n'est pas passée.
  function isHomeworkActive(h){
    return h.type === 'devoir' ? !h.done : h.dueDate >= todayISO();
  }

  function clearDoneHomework(){
    data.homework = data.homework.filter(h => isHomeworkActive(h));
    persist();
  }

  /* ---------- Scolaire : notes ---------- */
  function getGrades(){ return data.grades; }

  function getGrade(id){ return data.grades.find(g => g.id === id) || null; }

  // semester (1 ou 2) facultatif : ne garde que les notes datées dans ce semestre.
  function gradesForSubject(subjectId, semester){
    return data.grades.filter(g => g.subjectId === subjectId && (!semester || semesterOfDate(g.date) === semester));
  }

  function addGrade({ subjectId, title, value, maxPoints, coefficient, date }){
    const grade = {
      id: uid('grade'),
      subjectId,
      title: (title || '').trim(),
      value: Number(value),
      maxPoints: Number(maxPoints) || 20,
      coefficient: Number(coefficient) || 1,
      date: date || todayISO(),
      createdAt: todayISO(),
    };
    data.grades.push(grade);
    persist();
    return grade;
  }

  function updateGrade(id, { subjectId, title, value, maxPoints, coefficient, date }){
    const g = getGrade(id);
    if(!g) return null;
    g.subjectId = subjectId;
    g.title = (title || '').trim();
    g.value = Number(value);
    g.maxPoints = Number(maxPoints) || 20;
    g.coefficient = Number(coefficient) || 1;
    g.date = date || g.date;
    persist();
    return g;
  }

  function deleteGrade(id){
    const g = getGrade(id);
    // Une note venue de Tomuss qu'on supprime ne doit pas revenir à chaque synchronisation.
    if(g && g.tomuss){
      data.tomuss.dismissed[g.tomuss.key] = tomussSignature(g.tomuss.value, g.tomuss.max);
    }
    data.grades = data.grades.filter(x => x.id !== id);
    persist();
  }

  // Moyenne d'une matière : chaque note est ramenée sur 20, puis pondérée par son coefficient.
  function subjectAverage(subjectId, semester){
    const grades = gradesForSubject(subjectId, semester);
    if(!grades.length) return null;
    let weightedSum = 0, coeffSum = 0;
    grades.forEach(g => {
      if(!g.maxPoints) return;
      const normalized = (g.value / g.maxPoints) * 20;
      weightedSum += normalized * g.coefficient;
      coeffSum += g.coefficient;
    });
    if(coeffSum === 0) return null;
    return weightedSum / coeffSum;
  }

  // Moyenne générale : moyenne de chaque matière, pondérée par le coefficient de la matière.
  function overallAverage(){
    let weightedSum = 0, coeffSum = 0;
    data.subjects.forEach(s => {
      const avg = subjectAverage(s.id);
      if(avg === null) return;
      const coeff = s.coefficient || 1;
      weightedSum += avg * coeff;
      coeffSum += coeff;
    });
    if(coeffSum === 0) return null;
    return weightedSum / coeffSum;
  }

  // Moyenne d'une UE : moyenne des matières/SAÉ pondérées par leur poids dans l'UE (tableau du BUT).
  // Seules les matières déjà notées comptent ; coverage = part du poids total de l'UE déjà notée.
  function ueAverage(ue, semester){
    let sum = 0, wSum = 0, wTotal = 0;
    data.subjects.forEach(s => {
      const w = Number((s.ueWeights || {})[ue]) || 0;
      if(w <= 0) return;
      wTotal += w;
      const avg = subjectAverage(s.id, semester);
      if(avg === null) return;
      sum += avg * w;
      wSum += w;
    });
    return { avg: wSum ? sum / wSum : null, coverage: wTotal ? wSum / wTotal : 0, hasSubjects: wTotal > 0 };
  }

  function applyButPreset(){
    const r = applyButS1Preset(data, true);
    persist();
    return r;
  }

  /* ---------- Scolaire : synchronisation Tomuss ---------- */
  function tomussSignature(value, max){ return `${value}/${max}`; }

  function getTomuss(){ return data.tomuss; }

  function setTomussSettings({ feedUrl, proxyUrl }){
    if(typeof feedUrl === 'string') data.tomuss.feedUrl = feedUrl.trim();
    if(typeof proxyUrl === 'string') data.tomuss.proxyUrl = proxyUrl.trim();
    persist();
  }

  function markTomussSynced(){
    data.tomuss.lastSync = new Date().toISOString();
    persist();
  }

  // Matière associée à un code UE Tomuss (null si jamais associée ou si la matière a été supprimée).
  function getTomussSubjectId(ue){
    const id = data.tomuss.ueMap[ue];
    return id && getSubject(id) ? id : null;
  }

  function setTomussSubjectId(ue, subjectId){
    data.tomuss.ueMap[ue] = subjectId;
    persist();
  }

  function findGradeByTomussKey(key){
    return data.grades.find(g => g.tomuss && g.tomuss.key === key) || null;
  }

  function isTomussDismissed(key, signature){
    return data.tomuss.dismissed[key] === signature;
  }

  function countTomussDismissed(){ return Object.keys(data.tomuss.dismissed).length; }

  function clearTomussDismissed(){
    data.tomuss.dismissed = {};
    persist();
  }

  // Applique les notes validées à l'écran de vérification.
  // entry = { key, ue, value, max, date, title, subjectId, coefficient, existingId }
  // - sans existingId : nouvelle note ; avec existingId : la note locale est mise à jour
  //   (matière, intitulé et coefficient choisis par l'utilisateur sont conservés).
  function applyTomussImport(entries){
    let added = 0, updated = 0;
    const now = new Date().toISOString();

    entries.forEach(e => {
      const meta = { key: e.key, ue: e.ue, value: e.value, max: e.max, syncedAt: now };
      if(e.existingId){
        const g = getGrade(e.existingId);
        if(!g) return;
        g.value = e.value;
        g.maxPoints = e.max;
        g.date = e.date || g.date;
        g.tomuss = meta;
        updated++;
      }else{
        data.grades.push({
          id: uid('grade'),
          subjectId: e.subjectId,
          title: e.title,
          value: e.value,
          maxPoints: e.max,
          coefficient: Number(e.coefficient) || 1,
          date: e.date || todayISO(),
          createdAt: todayISO(),
          tomuss: meta,
        });
        added++;
      }
      delete data.tomuss.dismissed[e.key];
    });

    persist();
    return { added, updated };
  }

  function resetSchoolData(){
    data.subjects = [];
    data.homework = [];
    data.grades = [];
    // Le lien du flux est conservé ; les associations UE -> matière ne veulent plus rien dire.
    data.tomuss.ueMap = {};
    data.tomuss.dismissed = {};
    data.tomuss.lastSync = null;
    persist();
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
    getTodos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos,
    getLog, getScheduledTasksForDate, setProfileForDate, toggleTask,
    computeStats,
    getSubjects, getSubject, addSubject, updateSubject, deleteSubject,
    getHomework, getHomeworkItem, addHomework, updateHomework, toggleHomeworkDone,
    deleteHomework, isHomeworkActive, clearDoneHomework,
    getGrades, getGrade, gradesForSubject, addGrade, updateGrade, deleteGrade,
    subjectAverage, overallAverage, ueAverage, applyButPreset, resetSchoolData,
    getTomuss, setTomussSettings, markTomussSynced, getTomussSubjectId, setTomussSubjectId,
    findGradeByTomussKey, isTomussDismissed, countTomussDismissed, clearTomussDismissed, applyTomussImport,
    resetAll,
  };
})();
