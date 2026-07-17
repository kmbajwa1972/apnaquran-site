/* Read index — surah & juz browsing, search, resume, bookmarks */
(async function () {
  const listSlot = $('#listSlot');
  const searchInput = $('#searchInput');
  const tabSurah = $('#tabSurah');
  const tabJuz = $('#tabJuz');
  let surahs = [];
  let mode = 'surah';

  /* Resume reading card */
  const last = getLastRead();
  if (last) {
    $('#resumeSlot').innerHTML = `
      <div class="card resume-card">
        <div class="star8"><span>۞</span></div>
        <div class="meta">
          <b>Continue reading — ${esc(last.name)}</b>
          <small>Surah ${last.s}, Ayah ${last.a}</small>
        </div>
        <a class="btn gold" href="surah.html?s=${last.s}#ayah-${last.a}">Resume</a>
      </div>`;
  }

  /* Bookmarks */
  renderBookmarks();
  function renderBookmarks() {
    const list = getBookmarks();
    const sec = $('#bmSection');
    if (!list.length) { sec.hidden = true; return; }
    sec.hidden = false;
    $('#bmList').innerHTML = list.map(b => `
      <div class="card bm-item" data-s="${b.s}" data-a="${b.a}">
        <div class="star8" style="width:36px;height:36px;font-size:12px"><span>${b.s}</span></div>
        <a href="surah.html?s=${b.s}#ayah-${b.a}">${esc(b.name)} — Ayah ${b.a}</a>
        <button class="x" aria-label="Remove bookmark">✕</button>
      </div>`).join('');
    $$('#bmList .x').forEach(btn => btn.addEventListener('click', e => {
      const item = e.target.closest('.bm-item');
      toggleBookmark(+item.dataset.s, +item.dataset.a, '');
      renderBookmarks();
    }));
  }

  /* Load surah list */
  try {
    surahs = await getSurahList();
    render();
  } catch {
    listSlot.innerHTML = `
      <div class="error-box card" style="padding:50px 20px">
        <b>Could not load the surah list</b>
        Please check your internet connection.
        <div style="margin-top:16px"><button class="btn gold" onclick="location.reload()">Try again</button></div>
      </div>`;
    return;
  }

  tabSurah.addEventListener('click', () => switchTab('surah'));
  tabJuz.addEventListener('click', () => switchTab('juz'));
  searchInput.addEventListener('input', render);

  function switchTab(m) {
    mode = m;
    tabSurah.classList.toggle('active', m === 'surah');
    tabJuz.classList.toggle('active', m === 'juz');
    tabSurah.setAttribute('aria-selected', m === 'surah');
    tabJuz.setAttribute('aria-selected', m === 'juz');
    render();
  }

  function render() {
    if (mode === 'juz') return renderJuz();
    const q = searchInput.value.trim().toLowerCase();
    const filtered = !q ? surahs : surahs.filter(s =>
      String(s.number) === q ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.name.includes(searchInput.value.trim())
    );
    if (!filtered.length) {
      listSlot.innerHTML = '<p class="empty">No surah matches your search.</p>';
      return;
    }
    listSlot.innerHTML = '<div class="surah-grid">' + filtered.map(s => `
      <a class="card surah-card" href="surah.html?s=${s.number}">
        <div class="star8"><span>${s.number}</span></div>
        <div class="names">
          <b>${esc(s.englishName)}</b>
          <small>${esc(s.englishNameTranslation)} · ${s.revelationType === 'Meccan' ? 'Makki' : 'Madani'}</small>
        </div>
        <div>
          <span class="arname ar">${esc(s.name)}</span>
          <small class="count">${s.numberOfAyahs} ayahs</small>
        </div>
      </a>`).join('') + '</div>';
  }

  function renderJuz() {
    listSlot.innerHTML = '<div class="juz-grid">' + AQ.JUZ_STARTS.map(([s, a], i) => {
      const surah = surahs.find(x => x.number === s);
      return `
      <a class="card surah-card" href="surah.html?s=${s}#ayah-${a}">
        <div class="star8"><span>${i + 1}</span></div>
        <div class="names">
          <b>Parah ${i + 1}</b>
          <small>Starts: ${surah ? esc(surah.englishName) : 'Surah ' + s} ${s}:${a}</small>
        </div>
        <span class="arname ur" style="font-size:17px">${AQ.JUZ_NAMES_UR[i]}</span>
      </a>`;
    }).join('') + '</div>';
  }
})();
