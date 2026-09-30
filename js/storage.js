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

/* ---------- Semestres & UE (BUT Informatique) ---------- */
const UES_BY_SEM = {
  1: ['UE1.1','UE1.2','UE1.3','UE1.4','UE1.5','UE1.6'],
  2: ['UE2.1','UE2.2','UE2.3','UE2.4','UE2.5','UE2.6'],
};
// S1 : 2 sept -> 24 janv ; S2 : 25 janv -> 25 juin (les rattrapages de l'été comptent pour S2).
function semesterOfDate(iso){
  const md = String(iso || '').slice(5, 10);
  if(!md) return 1;
  return (md >= '01-25' && md < '09-02') ? 2 : 1;
}
// Tableau des pourcentages du semestre 1 : [code, nom, {UE: %}]
const BUT_S1 = [
  ['S1.01','Implémentation',{'UE1.1':40}],
  ['S1.02',"Comparaison d'algo.",{'UE1.2':40}],
  ['S1.03','Installation poste',{'UE1.3':40}],
  ['S1.04','Création BD',{'UE1.4':40}],
  ['S1.05','Recueil de besoins',{'UE1.5':40}],
  ['S1.06','Environnement éco.',{'UE1.6':40}],
  ['R1.01','Initiation au développement',{'UE1.1':41,'UE1.2':24}],
  ['R1.02',"Développement d'interfaces web",{'UE1.1':11,'UE1.5':20,'UE1.6':5}],
  ['R1.03','Introduction archi',{'UE1.2':6,'UE1.3':21}],
  ['R1.04','Introduction systèmes',{'UE1.3':21}],
  ['R1.05','Introduction BD',{'UE1.4':39}],
  ['R1.06','Mathématiques discrètes',{'UE1.2':15,'UE1.4':15}],
  ['R1.07','Outils fondamentaux',{'UE1.2':15}],
  ['R1.08','Intro Gestion organisation',{'UE1.5':25,'UE1.6':11}],
  ['R1.09','Intro Economie',{'UE1.4':6,'UE1.6':11}],
  ['R1.10','Anglais',{'UE1.1':8,'UE1.3':12,'UE1.6':11}],
  ['R1.11','Bases de la communication',{'UE1.3':6,'UE1.5':15,'UE1.6':11}],
  ['R1.12','Projet professionnel et personnel',{'UE1.6':11}],
];
function normKey(t){ return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
// Associe les poids d'UE aux matières existantes (jamais d'écrasement, jamais de suppression).
// create = true : crée aussi les matières manquantes.
function applyButS1Preset(d, create){
  let matched = 0, created = 0;
  BUT_S1.forEach(([code, name, w]) => {
    const kc = normKey(code), kn = normKey(name);
    const s = d.subjects.find(x => { const k = normKey(x.name); return k.includes(kc) || k === kn || (kn.length > 6 && k.includes(kn)); });
    if(s){
      if(!s.ueWeights || !Object.keys(s.ueWeights).length){ s.ueWeights = Object.assign({}, w); matched++; }
    }else if(create){
      d.subjects.push({ id: uid('subj'), name: `${code} · ${name}`, color: SUBJECT_COLORS[d.subjects.length % SUBJECT_COLORS.length],
        coefficient: 1, ueWeights: Object.assign({}, w), createdAt: todayISO() });
      created++;
    }
  });
  return { matched, created };
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
    // Migration : poids d'UE par matière (les matières et notes existantes sont conservées telles quelles).
    parsed.subjects.forEach(x => { if(!x.ueWeights || typeof x.ueWeights !== 'object') x.ueWeights = {}; });
    if(!parsed.butS1Matched){ applyButS1Preset(parsed, false); parsed.butS1Matched = true; }
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
