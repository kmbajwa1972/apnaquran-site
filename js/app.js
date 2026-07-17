/* ============================================================
   AL-QURAN — shared app core
   Config, storage, API helper, theme, nav.
   ============================================================ */

const AQ = {
  API: 'https://api.alquran.cloud/v1',

  // Qari Saud Al-Shuraim — verse-by-verse audio (EveryAyah CDN)
  // File pattern: {SSS}{AAA}.mp3  e.g. 001001.mp3
  AUDIO_BASE: 'https://everyayah.com/data/Saood_ash-Shuraym_128kbps/',

  ARABIC_EDITION: 'quran-uthmani',

  URDU_EDITIONS: [
    { id: 'ur.jalandhry', name: 'Fateh Muhammad Jalandhry' },
    { id: 'ur.junagarhi', name: 'Muhammad Junagarhi' },
    { id: 'ur.maududi',   name: 'Abul A\'la Maududi' },
    { id: 'ur.ahmedali',  name: 'Ahmed Ali' }
  ],
  ENGLISH_EDITIONS: [
    { id: 'en.sahih',     name: 'Saheeh International' },
    { id: 'en.pickthall', name: 'Mohammed Pickthall' },
    { id: 'en.yusufali',  name: 'Abdullah Yusuf Ali' }
  ],

  DEFAULTS: {
    urdu: 'ur.jalandhry',
    english: 'en.sahih',
    showUrdu: true,
    showEnglish: true,
    arSize: 30,
    autoNext: true,      // continue to next ayah after audio ends
    tafsir: ''           // resolved dynamically from the API
  },

  /* Standard juz (parah) starting points: [surah, ayah] */
  JUZ_STARTS: [
    [1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],
    [9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],
    [29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]
  ],

  JUZ_NAMES_UR: [
    'الم','سیقول','تلک الرسل','لن تنالوا','والمحصنات','لا یحب اللہ','واذا سمعوا',
    'ولو اننا','قال الملا','واعلموا','یعتذرون','وما من دابۃ','وما ابرئ','ربما',
    'سبحان الذی','قال الم','اقترب للناس','قد افلح','وقال الذین','امن خلق',
    'اتل ما اوحی','ومن یقنت','وما لی','فمن اظلم','الیہ یرد','حم','قال فما خطبکم',
    'قد سمع اللہ','تبارک الذی','عم'
  ]
};

/* ---------------- storage ---------------- */
const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};

function getSettings() {
  return Object.assign({}, AQ.DEFAULTS, store.get('aq_settings', {}));
}
function saveSettings(patch) {
  store.set('aq_settings', Object.assign(getSettings(), patch));
}

/* ---------------- fetch helper ---------------- */
async function fetchJSON(url, { retries = 2, timeout = 15000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json.code && json.code !== 200) throw new Error('API ' + json.code);
      return json;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

/* Surah list, cached for 7 days */
async function getSurahList() {
  const cached = store.get('aq_surahlist');
  if (cached && cached.ts && Date.now() - cached.ts < 7 * 864e5 && Array.isArray(cached.data)) {
    return cached.data;
  }
  const json = await fetchJSON(AQ.API + '/surah');
  store.set('aq_surahlist', { ts: Date.now(), data: json.data });
  return json.data;
}

/* Urdu tafsir editions — discovered from the API, cached 7 days.
   Returns [] gracefully if none are available. */
async function getUrduTafsirs() {
  const cached = store.get('aq_tafsirs_ur');
  if (cached && cached.ts && Date.now() - cached.ts < 7 * 864e5) return cached.data;
  let list = [];
  try {
    const json = await fetchJSON(AQ.API + '/edition?language=ur&type=tafsir', { retries: 1 });
    list = (json.data || []).map(e => ({ id: e.identifier, name: e.name || e.englishName }));
  } catch { /* keep [] */ }
  store.set('aq_tafsirs_ur', { ts: Date.now(), data: list });
  return list;
}

/* ---------------- bookmarks & last read ---------------- */
function getBookmarks() { return store.get('aq_bookmarks', []); }
function isBookmarked(s, a) { return getBookmarks().some(b => b.s === s && b.a === a); }
function toggleBookmark(s, a, name) {
  let list = getBookmarks();
  if (isBookmarked(s, a)) {
    list = list.filter(b => !(b.s === s && b.a === a));
  } else {
    list.unshift({ s, a, name, ts: Date.now() });
    if (list.length > 100) list = list.slice(0, 100);
  }
  store.set('aq_bookmarks', list);
  return isBookmarked(s, a);
}
function setLastRead(s, a, name) {
  store.set('aq_lastread', { s, a, name, ts: Date.now() });
}
function getLastRead() { return store.get('aq_lastread'); }

/* ---------------- misc helpers ---------------- */
const pad3 = n => String(n).padStart(3, '0');
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* Strip the leading Bismillah that the API prepends to ayah 1
   of every surah except Al-Fatiha (1) and At-Tawbah (9).
   Diacritic-tolerant: allows any combining marks between letters. */
function stripBismillah(text) {
  const M = '[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u0640\\u06D6-\\u06ED\\u08D3-\\u08FF]*';
  const rx = new RegExp(
    '^\\s*ب' + M + 'س' + M + 'م' + M + '\\s+' +
    '[\\u0627\\u0671]' + M + 'ل' + M + 'ل' + M + 'ه' + M + '\\s+' +
    '[\\u0627\\u0671]' + M + 'ل' + M + 'ر' + M + 'ح' + M + 'م' + M + '[\\u0670\\u0640]*ن' + M + '\\s+' +
    '[\\u0627\\u0671]' + M + 'ل' + M + 'ر' + M + 'ح' + M + '[\\u064A\\u06CC]' + M + 'م' + M + '\\s*'
  );
  const out = text.replace(rx, '');
  return out.length ? out : text; // never blank an ayah
}

/* ---------------- theme + nav ---------------- */
(function initChrome() {
  const saved = store.get('aq_theme', 'dark');
  document.documentElement.setAttribute('data-theme', saved);

  document.addEventListener('DOMContentLoaded', () => {
    const tBtn = $('#themeToggle');
    if (tBtn) {
      paintThemeBtn(tBtn);
      tBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        store.set('aq_theme', next);
        paintThemeBtn(tBtn);
      });
    }
    const nBtn = $('#navToggle');
    if (nBtn) nBtn.addEventListener('click', () => $('#navLinks').classList.toggle('open'));

    // highlight current page in nav
    const here = location.pathname.split('/').pop() || 'index.html';
    $$('#navLinks a').forEach(a => {
      if (a.getAttribute('href') === here) a.classList.add('active');
    });
  });

  function paintThemeBtn(btn) {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2"/></svg>'
      : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
})();
