/* =========================================================
   ICONS — petite bibliothèque d'icônes SVG (traits simples)
   Chaque entrée est le contenu interne d'un <svg viewBox="0 0 24 24">
   ========================================================= */
const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="5" stroke="currentColor" stroke-width="1.8" fill="none"/>',

  dumbbell: '<rect x="2" y="10" width="3" height="4" rx=".5" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="19" y="10" width="3" height="4" rx=".5" stroke="currentColor" stroke-width="1.6" fill="none"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.8"/><rect x="7" y="8" width="2.2" height="8" rx=".5" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="14.8" y="8" width="2.2" height="8" rx=".5" stroke="currentColor" stroke-width="1.6" fill="none"/>',

  book: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5C4.7 20 4 19.3 4 18.5V5.5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M20 5.5C20 4.7 19.3 4 18.5 4H12v16h6.5c.8 0 1.5-.7 1.5-1.5V5.5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',

  briefcase: '<rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.7" fill="none"/><line x1="3" y1="13.5" x2="21" y2="13.5" stroke="currentColor" stroke-width="1.7"/>',

  laptop: '<rect x="4" y="5" width="16" height="10" rx="1.2" stroke="currentColor" stroke-width="1.7" fill="none"/><line x1="2" y1="19" x2="22" y2="19" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',

  heart: '<path d="M12 20s-7.2-4.4-9.6-8.9C1 8.2 2.2 4.6 5.8 4c2.1-.3 3.9.9 4.8 2.4C11.5 4.9 13.3 3.7 15.4 4c3.6.6 4.8 4.2 3.4 7.1C16.4 15.6 12 20 12 20Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',

  music: '<circle cx="6.5" cy="17" r="2.8" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="17.5" cy="15" r="2.8" stroke="currentColor" stroke-width="1.6" fill="none"/><line x1="9.3" y1="17" x2="9.3" y2="4.5" stroke="currentColor" stroke-width="1.6"/><line x1="20.3" y1="15" x2="20.3" y2="2.5" stroke="currentColor" stroke-width="1.6"/><line x1="9.3" y1="6.5" x2="20.3" y2="4.2" stroke="currentColor" stroke-width="1.6"/>',

  utensils: '<line x1="6" y1="3" x2="6" y2="21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="4" y1="3" x2="4" y2="8.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="8" y1="3" x2="8" y2="8.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M17 3c-1.8 0-3.2 2.1-3.2 5.2S15.2 13 17 13v8" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',

  bike: '<circle cx="6" cy="17" r="3.4" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="18" cy="17" r="3.4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M6 17 10.2 8h4l3.8 9" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 8 7.8 5H6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><line x1="10.2" y1="8" x2="14" y2="17" stroke="currentColor" stroke-width="1.6"/>',

  moon: '<path d="M20 14.2A8.4 8.4 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',

  sun: '<circle cx="12" cy="12" r="3.8" stroke="currentColor" stroke-width="1.6" fill="none"/><line x1="12" y1="2.2" x2="12" y2="5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="21.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="2.2" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="19" y1="12" x2="21.8" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="4.7" y1="4.7" x2="6.7" y2="6.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="17.3" y1="17.3" x2="19.3" y2="19.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="4.7" y1="19.3" x2="6.7" y2="17.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="17.3" y1="6.7" x2="19.3" y2="4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',

  star: '<path d="M12 2.7 14.6 9h6.6l-5.4 4 2.1 6.6L12 15.8 5.9 19.6 8 13 2.6 9h6.6Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',

  droplet: '<path d="M12 3s6.2 6.9 6.2 11.5A6.2 6.2 0 1 1 5.8 14.5C5.8 9.9 12 3 12 3Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',

  leaf: '<path d="M20 4C10 4 4 10 4 18c8 0 14-6 14-14Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><line x1="4.5" y1="19.5" x2="12" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',

  phone: '<rect x="6.5" y="2" width="11" height="20" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><line x1="10.2" y1="18" x2="13.8" y2="18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',

  pencil: '<path d="M4 20l1-4.2L15.8 4.9l3.3 3.3L8.2 19.1 4 20Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><line x1="14" y1="6.8" x2="17.2" y2="10" stroke="currentColor" stroke-width="1.6"/>',

  target: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="12" cy="12" r="4.3" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',

  check: '<polyline points="4 12 9 17 20 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',

  trash: '<path d="M4 7h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M9.5 7V4.8c0-.4.4-.8.9-.8h3.2c.5 0 .9.4.9.8V7" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.3 7l.9 12c.1.5.5.9 1 .9h7.6c.5 0 .9-.4 1-.9l.9-12" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="10" y1="11" x2="10" y2="16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><line x1="14" y1="11" x2="14" y2="16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
};

// Liste réduite utilisée par les sélecteurs d'icônes (tâches / profils).
// Les icônes utilitaires (check, trash…) ne sont volontairement pas incluses.
const ICON_KEYS = [
  'home', 'dumbbell', 'book', 'briefcase', 'laptop', 'heart', 'music',
  'utensils', 'bike', 'moon', 'sun', 'star', 'droplet', 'leaf', 'phone',
  'pencil', 'target',
];

function iconSvg(name, extraClass){
  const inner = ICONS[name] || ICONS.target;
  return `<svg viewBox="0 0 24 24" class="${extraClass || ''}">${inner}</svg>`;
}
