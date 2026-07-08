/* =========================================================
   STORAGE — persistance locale (localStorage)
   Toutes les données restent dans le navigateur de l'utilisateur.
   ========================================================= */
const STORAGE_KEY = 'routineAppData_v1';

function todayISO(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function uid(prefix){
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function seedData(){
  const pereId = uid('prof');
  const mereId = uid('prof');

  return {
    profiles: [
      { id: pereId, name: 'Chez mon père', icon: 'home', createdAt: todayISO() },
      { id: mereId, name: 'Chez ma mère', icon: 'home', createdAt: todayISO() },
    ],
    tasks: [
      {
        id: uid('task'),
        name: 'Faire 40 tractions',
        icon: 'dumbbell',
        profileIds: [pereId],
        recurrence: { type: 'daily' },
        createdAt: todayISO(),
      },
      {
        id: uid('task'),
        name: 'Lire 20 minutes',
        icon: 'book',
        profileIds: ['all'],
        recurrence: { type: 'daily' },
        createdAt: todayISO(),
      },
      {
        id: uid('task'),
        name: 'Faire le point sur les finances',
        icon: 'target',
        profileIds: ['all'],
        recurrence: { type: 'monthly', dayOfMonth: 1 },
        createdAt: todayISO(),
      },
      {
        id: uid('task'),
        name: 'Sortir courir',
        icon: 'bike',
        profileIds: ['all'],
        recurrence: { type: 'weekly', days: [1, 3, 5] },
        createdAt: todayISO(),
      },
    ],
    logs: {},
  };
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return seedData();
    const parsed = JSON.parse(raw);
    if(!parsed.profiles || !parsed.tasks || !parsed.logs) return seedData();
    return parsed;
  }catch(e){
    console.error('Erreur de lecture des données locales, réinitialisation.', e);
    return seedData();
  }
}

function saveData(data){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  }catch(e){
    console.error('Impossible de sauvegarder les données locales.', e);
    return false;
  }
}

function clearData(){
  localStorage.removeItem(STORAGE_KEY);
}
