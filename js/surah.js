/* Surah reader — Arabic + Urdu + English, Shuraim audio, tafseer,
   bookmarks, last-read tracking, settings drawer. */
(async function () {
  const root = $('#readerRoot');
  const params = new URLSearchParams(location.search);
  let surahNo = parseInt(params.get('s'), 10);
  if (!surahNo || surahNo < 1 || surahNo > 114) surahNo = 1;

  let settings = getSettings();
  let surahData = null;      // { ar, ur, en } aligned ayah arrays + meta
  let tafsirList = [];
  const tafsirCache = {};    // "s:a" -> text

  /* ---------------- SEO: per-surah canonical + meta description ---------------- */
  function setMeta(selector, attr, value) {
    let el = document.querySelector(selector);
    if (!el) return;
    el.setAttribute(attr, value);
  }
  function updateSEO(m) {
    const url = `https://apnaquran.com/surah.html?s=${m.number}`;
    const desc = `Read Surah ${m.englishName} (${m.englishNameTranslation}) — Surah ${m.number} of the Holy Quran — in Uthmani script with Urdu and English translation, Urdu tafseer, and ayah-by-ayah audio recitation by Qari Saud Al-Shuraim.`;
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', document.title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', document.title);
    setMeta('meta[name="twitter:description"]', 'content', desc);
  }

  /* ---------------- audio state ---------------- */
  const audio = new Audio();
  audio.preload = 'none';
  let currentAyah = 0;       // numberInSurah currently playing, 0 = none
  const bar = $('#audioBar');

  /* ---------------- load ---------------- */
  await load();

  async function load() {
    root.innerHTML = '<div class="loader"><div class="star8"></div><span>Loading surah…</span></div>';
    try {
      const ids = [AQ.ARABIC_EDITION, settings.urdu, settings.english].join(',');
      const [json, tafsirs] = await Promise.all([
        fetchJSON(`${AQ.API}/surah/${surahNo}/editions/${ids}`),
        getUrduTafsirs()
      ]);
      tafsirList = tafsirs;
      if (tafsirList.length && !tafsirList.some(t => t.id === settings.tafsir)) {
        settings.tafsir = tafsirList[0].id;
        saveSettings({ tafsir: settings.tafsir });
      }
      const [ar, ur, en] = json.data;
      surahData = { meta: ar, ar: ar.ayahs, ur: ur.ayahs, en: en.ayahs };
      render();
    } catch (err) {
      root.innerHTML = `
        <div class="error-box card" style="padding:50px 20px">
          <b>Could not load this surah</b>
          Please check your internet connection.
          <div style="margin-top:16px"><button class="btn gold" onclick="location.reload()">Try again</button></div>
        </div>`;
    }
  }

  /* ---------------- render ---------------- */
  function render() {
    const m = surahData.meta;
    document.title = `Surah ${m.englishName} (${m.number}) — Al-Quran with Urdu & English Translation`;
    updateSEO(m);
    document.documentElement.style.setProperty('--ar-size', settings.arSize + 'px');

    const showBismillah = m.number !== 9;

    root.innerHTML = `
      <div class="reader-bar">
        <div class="grp">
          <a class="btn" href="read.html">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>
            All surahs
          </a>
        </div>
        <div class="grp">
          <button class="btn" id="playAllBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Play surah
          </button>
          <button class="btn" id="settingsBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>
            Settings
          </button>
        </div>
      </div>

      <header class="card surah-head">
        <div class="arname ar">${esc(m.name)}</div>
        <div class="enname">${esc(m.englishName)} · ${esc(m.englishNameTranslation)}</div>
        <div class="meta">${m.revelationType === 'Meccan' ? 'Makki' : 'Madani'} · ${m.numberOfAyahs} ayahs · Surah ${m.number} of 114</div>
      </header>

      ${showBismillah ? '<div class="bismillah ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>' : ''}

      <section id="ayahList"></section>

      <nav class="surah-nav">
        ${m.number > 1
          ? `<a class="btn" href="surah.html?s=${m.number - 1}">← Previous surah</a>`
          : '<span></span>'}
        ${m.number < 114
          ? `<a class="btn" href="surah.html?s=${m.number + 1}">Next surah →</a>`
          : '<span></span>'}
      </nav>`;

    const listEl = $('#ayahList');
    listEl.innerHTML = surahData.ar.map((a, i) => ayahHTML(a, i)).join('');

    bindReaderEvents();
    observeLastRead();
    jumpToHash();
  }

  function ayahHTML(a, i) {
    const n = a.numberInSurah;
    let text = a.text;
    if (n === 1 && surahNo !== 1 && surahNo !== 9) text = stripBismillah(text);
    const urTxt = surahData.ur[i] ? surahData.ur[i].text : '';
    const enTxt = surahData.en[i] ? surahData.en[i].text : '';
    const bmOn = isBookmarked(surahNo, n);
    return `
    <article class="ayah" id="ayah-${n}" data-n="${n}">
      <div class="arabic ar">${esc(text)} <span class="num">﴿${n.toLocaleString('ar-EG')}﴾</span></div>
      ${settings.showUrdu ? `
      <div class="trans ur">
        <span class="lbl">Urdu</span><br>${esc(urTxt)}
      </div>` : ''}
      ${settings.showEnglish ? `
      <div class="trans en">
        <span class="lbl">English</span><br>${esc(enTxt)}
      </div>` : ''}
      <div class="ayah-tools">
        <button class="tool play" aria-label="Play ayah ${n}">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Play
        </button>
        <button class="tool bm ${bmOn ? 'on' : ''}" aria-label="Bookmark ayah ${n}">
          <svg viewBox="0 0 24 24" fill="${bmOn ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg> ${bmOn ? 'Saved' : 'Bookmark'}
        </button>
        ${tafsirList.length ? `
        <button class="tool tf" aria-label="Tafseer of ayah ${n}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 0-2 2zM12 3h6a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2h-6z"/></svg> Tafseer
        </button>` : ''}
        <span style="margin-left:auto;color:var(--muted);font-size:12.5px">${surahNo}:${n}</span>
      </div>
      <div class="tafsir-panel ur" id="tafsir-${n}"></div>
    </article>`;
  }

  /* ---------------- events ---------------- */
  function bindReaderEvents() {
    $('#settingsBtn').addEventListener('click', openDrawer);
    $('#playAllBtn').addEventListener('click', () => playAyah(1));

    $('#ayahList').addEventListener('click', e => {
      const art = e.target.closest('.ayah');
      if (!art) return;
      const n = +art.dataset.n;
      if (e.target.closest('.tool.play')) playAyah(n);
      else if (e.target.closest('.tool.bm')) onBookmark(art, n);
      else if (e.target.closest('.tool.tf')) onTafsir(art, n);
    });
  }

  function onBookmark(art, n) {
    const on = toggleBookmark(surahNo, n, surahData.meta.englishName);
    const btn = art.querySelector('.tool.bm');
    btn.classList.toggle('on', on);
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg> ${on ? 'Saved' : 'Bookmark'}`;
  }

  async function onTafsir(art, n) {
    const panel = $('#tafsir-' + n);
    if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
    panel.classList.add('open');
    const key = surahNo + ':' + n;
    if (tafsirCache[key]) { panel.innerHTML = tafsirCache[key]; return; }
    panel.innerHTML = '<div class="skeleton" style="height:60px"></div>';
    try {
      const json = await fetchJSON(`${AQ.API}/ayah/${key}/${settings.tafsir}`);
      const src = tafsirList.find(t => t.id === settings.tafsir);
      const html = esc(json.data.text) +
        `<div class="src">Tafseer: ${esc(src ? src.name : settings.tafsir)}</div>`;
      tafsirCache[key] = html;
      panel.innerHTML = html;
    } catch {
      panel.innerHTML = '<span style="direction:ltr;display:block;text-align:left;color:var(--muted)">Tafseer could not be loaded. Tap Tafseer to try again.</span>';
      delete tafsirCache[key];
    }
  }

  /* ---------------- audio ---------------- */
  function ayahAudioURL(n) {
    return AQ.AUDIO_BASE + pad3(surahNo) + pad3(n) + '.mp3';
  }

  function playAyah(n) {
    if (n > surahData.meta.numberOfAyahs) return stopAudio();
    currentAyah = n;
    audio.src = ayahAudioURL(n);
    audio.play().catch(stopAudio);
    markPlaying(n);
    bar.classList.add('show');
    $('#audioLabel').textContent =
      `${surahData.meta.englishName} · Ayah ${n} of ${surahData.meta.numberOfAyahs}`;
    setPP(true);
    const el = $('#ayah-' + n);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  audio.addEventListener('ended', () => {
    if (settings.autoNext && currentAyah < surahData.meta.numberOfAyahs) {
      playAyah(currentAyah + 1);
    } else stopAudio();
  });
  audio.addEventListener('error', () => { if (currentAyah) stopAudio(); });

  function stopAudio() {
    audio.pause();
    audio.removeAttribute('src');
    currentAyah = 0;
    markPlaying(0);
    bar.classList.remove('show');
  }

  function markPlaying(n) {
    $$('.ayah.playing').forEach(el => el.classList.remove('playing'));
    if (n) { const el = $('#ayah-' + n); if (el) el.classList.add('playing'); }
  }

  function setPP(playing) {
    $('#audioPlayPause').innerHTML = playing
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }

  $('#audioPlayPause').addEventListener('click', () => {
    if (!currentAyah) return;
    if (audio.paused) { audio.play(); setPP(true); }
    else { audio.pause(); setPP(false); }
  });
  $('#audioStop').addEventListener('click', stopAudio);

  /* ---------------- last-read tracking ---------------- */
  function observeLastRead() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          setLastRead(surahNo, +en.target.dataset.n, surahData.meta.englishName);
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.ayah').forEach(el => io.observe(el));
  }

  function jumpToHash() {
    if (location.hash) {
      const el = $(location.hash.replace(/[^#\w-]/g, ''));
      if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 100);
    }
  }

  /* ---------------- settings drawer ---------------- */
  const drawer = $('#drawer'), scrim = $('#scrim');

  function openDrawer() {
    fillDrawer();
    drawer.classList.add('open');
    scrim.classList.add('show');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    scrim.classList.remove('show');
  }
  $('#drawerClose').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  function fillDrawer() {
    $('#arSize').value = settings.arSize;
    fillSelect($('#urduSel'), AQ.URDU_EDITIONS, settings.urdu);
    fillSelect($('#engSel'), AQ.ENGLISH_EDITIONS, settings.english);
    if (tafsirList.length) {
      $('#tafsirSet').hidden = false;
      fillSelect($('#tafsirSel'), tafsirList, settings.tafsir);
    }
    $('#showUrdu').checked = settings.showUrdu;
    $('#showEnglish').checked = settings.showEnglish;
    $('#autoNext').checked = settings.autoNext;
  }

  function fillSelect(sel, list, current) {
    sel.innerHTML = list.map(o =>
      `<option value="${o.id}" ${o.id === current ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
  }

  $('#arSize').addEventListener('input', e => {
    settings.arSize = +e.target.value;
    saveSettings({ arSize: settings.arSize });
    document.documentElement.style.setProperty('--ar-size', settings.arSize + 'px');
  });
  $('#urduSel').addEventListener('change', e => {
    settings.urdu = e.target.value; saveSettings({ urdu: settings.urdu });
    stopAudio(); load();
  });
  $('#engSel').addEventListener('change', e => {
    settings.english = e.target.value; saveSettings({ english: settings.english });
    stopAudio(); load();
  });
  $('#tafsirSel').addEventListener('change', e => {
    settings.tafsir = e.target.value; saveSettings({ tafsir: settings.tafsir });
    Object.keys(tafsirCache).forEach(k => delete tafsirCache[k]);
  });
  $('#showUrdu').addEventListener('change', e => {
    settings.showUrdu = e.target.checked; saveSettings({ showUrdu: settings.showUrdu });
    render();
  });
  $('#showEnglish').addEventListener('change', e => {
    settings.showEnglish = e.target.checked; saveSettings({ showEnglish: settings.showEnglish });
    render();
  });
  $('#autoNext').addEventListener('change', e => {
    settings.autoNext = e.target.checked; saveSettings({ autoNext: settings.autoNext });
  });
})();
