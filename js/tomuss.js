/* =========================================================
   TOMUSS — lecture du flux RSS des notes et comparaison avec les notes locales
   Ce module ne modifie rien : il récupère, analyse et prépare la liste à vérifier.
   L'enregistrement passe ensuite par Store.applyTomussImport().

   Format d'un élément du flux :
     <title>UE-C4BR111 : Interro1 : 2.0/5</title>   →  UE : colonne : valeur
     <description>Nom de l'UE,<br>Valeur modifiée par …,<br>09h58.43 le 18/09/2026<br></description>
     <guid>UE-C4BR111 4_2</guid>                     →  identifiant stable de la colonne
   Seules les valeurs de la forme « note/maximum » sont des notes ; le reste
   (« Groupe : 3.1 », absences, etc.) est ignoré.
   ========================================================= */
const Tomuss = (function(){

  const NEW_SUBJECT = '__new__';

  const GRADE_RE = /^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/;
  const STAMP_RE = /(\d{1,2})h(\d{2})(?:\.(\d{2}))?\s+le\s+(\d{2})\/(\d{2})\/(\d{4})/;

  function toNumber(str){ return Number(String(str).replace(',', '.')); }

  function stripTags(html){ return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

  function childText(node, tag){
    const el = node.getElementsByTagName(tag)[0];
    return el ? (el.textContent || '').trim() : '';
  }

  /* ---------- Récupération ---------- */
  // proxyUrl (facultatif) : adresse d'un proxy CORS personnel, à laquelle on ajoute le lien du flux.
  async function fetchFeed(feedUrl, proxyUrl){
    const target = proxyUrl ? proxyUrl + encodeURIComponent(feedUrl) : feedUrl;
    const res = await fetch(target, { cache: 'no-store' });
    if(!res.ok){
      const err = new Error(`Réponse HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.text();
  }

  /* ---------- Lecture du XML ---------- */
  function parseItem(node){
    const title = childText(node, 'title');
    const guid = childText(node, 'guid');
    const description = childText(node, 'description');
    const pubDate = childText(node, 'pubDate');

    const parts = title.split(' : ');
    if(parts.length < 3) return null;

    const ue = parts[0].trim();
    const column = parts.slice(1, -1).join(' : ').trim();
    const raw = parts[parts.length - 1].trim();

    // Le nom de l'UE est la première ligne de la description.
    const firstLine = description.split(/<br\s*\/?>/i)[0];
    const ueName = stripTags(firstLine).replace(/,\s*$/, '') || ue;

    // Date de saisie : lue dans la description (heure locale), sinon pubDate.
    let date = null;
    let stamp = 0;
    const m = STAMP_RE.exec(stripTags(description));
    if(m){
      const [, hh, mm, ss, dd, mo, yyyy] = m;
      date = `${yyyy}-${mo}-${dd}`;
      stamp = Number(`${yyyy}${mo}${dd}${hh.padStart(2, '0')}${mm}${ss || '00'}`);
    }else if(pubDate && !Number.isNaN(Date.parse(pubDate))){
      date = Store.toISO(new Date(pubDate));
      stamp = Number(`${date.replace(/-/g, '')}000000`);
    }

    const g = GRADE_RE.exec(raw);
    const value = g ? toNumber(g[1]) : null;
    const max = g ? toNumber(g[2]) : null;
    const isGrade = Boolean(g) && Number.isFinite(value) && Number.isFinite(max) && max > 0;

    return {
      key: guid || `${ue}|${column}`,
      ue, ueName, column, raw,
      kind: isGrade ? 'grade' : 'other',
      value: isGrade ? value : null,
      max: isGrade ? max : null,
      date: date || todayISO(),
      stamp,
    };
  }

  // Lève une Error (message affichable) si le contenu n'est pas un flux RSS.
  function parseFeed(text){
    const doc = new DOMParser().parseFromString(String(text).trim(), 'application/xml');
    if(doc.getElementsByTagName('parsererror').length || !doc.getElementsByTagName('channel').length){
      throw new Error('Ce contenu n\'est pas un flux RSS lisible. Vérifie le lien du flux.');
    }
    return Array.from(doc.getElementsByTagName('item')).map(parseItem).filter(Boolean);
  }

  /* ---------- Comparaison avec les notes locales ---------- */
  // Renvoie { read, upToDate, dismissed, ignored[], groups[] }.
  // groups[] = une entrée par UE, avec les notes « new » ou « updated » à vérifier.
  function analyse(items){
    // Un même identifiant peut apparaître plusieurs fois : on garde la saisie la plus récente.
    const latest = new Map();
    items.forEach(it => {
      const prev = latest.get(it.key);
      if(!prev || it.stamp >= prev.stamp) latest.set(it.key, it);
    });

    const report = { read: items.length, upToDate: 0, dismissed: 0, ignored: [], groups: [] };
    const byUe = new Map();

    latest.forEach(it => {
      if(it.kind !== 'grade'){
        report.ignored.push(it);
        return;
      }

      const existing = Store.findGradeByTomussKey(it.key);
      let status = 'new';
      let previous = null;

      if(existing){
        if(existing.tomuss.value === it.value && existing.tomuss.max === it.max){
          report.upToDate++;
          return;
        }
        status = 'updated';
        previous = { value: existing.tomuss.value, max: existing.tomuss.max };
      }else if(Store.isTomussDismissed(it.key, `${it.value}/${it.max}`)){
        report.dismissed++;
        return;
      }

      if(!byUe.has(it.ue)) byUe.set(it.ue, { ue: it.ue, ueName: it.ueName, entries: [] });
      byUe.get(it.ue).entries.push(Object.assign({}, it, {
        status,
        previous,
        existingId: existing ? existing.id : null,
      }));
    });

    report.groups = Array.from(byUe.values());
    report.groups.forEach(g => g.entries.sort((a, b) => a.date.localeCompare(b.date) || a.column.localeCompare(b.column)));

    // Matière proposée pour chaque UE : celle déjà associée, sinon une matière du même nom, sinon une nouvelle.
    // Deux UE peuvent porter le même nom : le code est alors ajouté au nom de la nouvelle matière.
    const subjects = Store.getSubjects();
    const nameCount = {};
    report.groups.forEach(g => {
      const k = g.ueName.toLowerCase();
      nameCount[k] = (nameCount[k] || 0) + 1;
    });
    report.groups.forEach(g => {
      const k = g.ueName.toLowerCase();
      const sameName = subjects.find(s => s.name.toLowerCase() === k);
      g.subjectId = Store.getTomussSubjectId(g.ue) || (sameName ? sameName.id : NEW_SUBJECT);
      g.newSubjectName = (sameName || nameCount[k] > 1)
        ? `${g.ueName} (${g.ue.replace(/^UE-/, '')})`
        : g.ueName;
    });

    return report;
  }

  return { NEW_SUBJECT, fetchFeed, parseFeed, analyse };
})();
