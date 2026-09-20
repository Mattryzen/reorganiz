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

// Renvoie la date ISO du jour +/- n jours (utile pour le seed de démo).
function addDaysISO(n){
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function uid(prefix){
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// Réglages de la synchronisation Tomuss (flux RSS des notes).
// ueMap : code UE Tomuss -> id de matière locale ; dismissed : notes supprimées à ne pas reproposer.
function defaultTomuss(){
  return { feedUrl: '', proxyUrl: '', ueMap: {}, dismissed: {}, lastSync: null };
}

function seedData(){
  const pereId = uid('prof');
  const mereId = uid('prof');

  const matheId = uid('subj');
  const francaisId = uid('subj');
  const histgeoId = uid('subj');

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
    todos: [
      { id: uid('todo'), name: "Renouveler ma carte d'identité", done: false, createdAt: todayISO(), completedAt: null },
      { id: uid('todo'), name: 'Prendre rendez-vous chez le dentiste', done: false, createdAt: todayISO(), completedAt: null },
    ],
    logs: {},

    /* ---------- Scolaire ---------- */
    subjects: [
      { id: matheId, name: 'Mathématiques', color: SUBJECT_COLORS[0], coefficient: 3, createdAt: todayISO() },
      { id: francaisId, name: 'Français', color: SUBJECT_COLORS[2], coefficient: 2, createdAt: todayISO() },
      { id: histgeoId, name: 'Histoire-Géo', color: SUBJECT_COLORS[1], coefficient: 2, createdAt: todayISO() },
    ],
    homework: [
      {
        id: uid('hw'),
        subjectId: matheId,
        type: 'devoir',
        title: 'Exercices 12 à 18 p.54',
        dueDate: addDaysISO(1),
        done: false,
        createdAt: todayISO(),
      },
      {
        id: uid('hw'),
        subjectId: francaisId,
        type: 'evaluation',
        title: 'Contrôle de lecture',
        dueDate: addDaysISO(5),
        done: false,
        createdAt: todayISO(),
      },
    ],
    grades: [
      {
        id: uid('grade'),
        subjectId: matheId,
        title: 'Devoir surveillé n°1',
        value: 14.5,
        maxPoints: 20,
        coefficient: 2,
        date: addDaysISO(-9),
        createdAt: todayISO(),
      },
      {
        id: uid('grade'),
        subjectId: histgeoId,
        title: 'Interrogation',
        value: 16,
        maxPoints: 20,
        coefficient: 1,
        date: addDaysISO(-4),
        createdAt: todayISO(),
      },
    ],
    tomuss: defaultTomuss(),
  };
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return seedData();
    const parsed = JSON.parse(raw);
    if(!parsed.profiles || !parsed.tasks || !parsed.logs) return seedData();
    if(!Array.isArray(parsed.todos)) parsed.todos = [];
    // Migration : anciennes données sans le module scolaire.
    if(!Array.isArray(parsed.subjects)) parsed.subjects = [];
    if(!Array.isArray(parsed.homework)) parsed.homework = [];
    if(!Array.isArray(parsed.grades)) parsed.grades = [];
    // Migration : anciennes données sans la synchronisation Tomuss.
    parsed.tomuss = Object.assign(defaultTomuss(), parsed.tomuss || {});
    if(!parsed.tomuss.ueMap || typeof parsed.tomuss.ueMap !== 'object') parsed.tomuss.ueMap = {};
    if(!parsed.tomuss.dismissed || typeof parsed.tomuss.dismissed !== 'object') parsed.tomuss.dismissed = {};
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
