/* =========================================================
   RECURRENCE — calcule si une tâche est prévue à une date donnée
   ========================================================= */
const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
// Ordre d'affichage type semaine européenne : Lun -> Dim
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function parseISODate(iso){
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isTaskScheduledForDate(task, dateISO){
  const date = parseISODate(dateISO);
  const rec = task.recurrence || { type: 'daily' };

  switch(rec.type){
    case 'daily':
      return true;

    case 'weekly':
      return Array.isArray(rec.days) && rec.days.includes(date.getDay());

    case 'monthly': {
      const day = Number(rec.dayOfMonth) || 1;
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      // si le mois est plus court que le jour choisi, on programme le dernier jour du mois
      const effectiveDay = Math.min(day, lastDayOfMonth);
      return date.getDate() === effectiveDay;
    }

    case 'interval': {
      if(!rec.startDate || !rec.interval) return false;
      const start = parseISODate(rec.startDate);
      start.setHours(0, 0, 0, 0);
      const cur = new Date(date);
      cur.setHours(0, 0, 0, 0);
      if(cur < start) return false;
      const diffDays = Math.round((cur - start) / 86400000);
      return diffDays % Number(rec.interval) === 0;
    }

    default:
      return false;
  }
}

function isTaskAvailableForProfile(task, profileId){
  return Array.isArray(task.profileIds) &&
    (task.profileIds.includes('all') || task.profileIds.includes(profileId));
}

function recurrenceLabel(rec){
  if(!rec) return '';
  switch(rec.type){
    case 'daily':
      return 'Tous les jours';
    case 'weekly': {
      if(!rec.days || !rec.days.length) return 'Chaque semaine';
      const ordered = WEEKDAY_ORDER.filter(d => rec.days.includes(d));
      return ordered.map(d => WEEKDAY_LABELS[d]).join(', ');
    }
    case 'monthly':
      return `Le ${rec.dayOfMonth} du mois`;
    case 'interval':
      return `Tous les ${rec.interval} jours`;
    default:
      return '';
  }
}
