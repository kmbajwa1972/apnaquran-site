/* Listen — full-surah continuous player (Qari Saud Al-Shuraim)
   Streams from MP3Quran (server7 … /shur/{SSS}.mp3), with a
   /download/ fallback. Remembers position per surah, supports
   playback speed, auto-next, lock-screen media controls. */
(async function () {

  const STREAM_BASE   = 'https://server7.mp3quran.net/shur/';
  const DOWNLOAD_BASE = 'https://server7.mp3quran.net/download/shur/';

  const audio = new Audio();
  audio.preload = 'metadata';

  const SPEEDS = [0.75, 1, 1.25, 1.5];

  let surahs = [];
  let current = 0;                 // surah number, 0 = none
  let usedFallback = false;
  let state = store.get('aq_listen', { last: 0, pos: {}, speed: 1, auto: true });

  const els = {
    nowAr: $('#nowAr'), nowEn: $('#nowEn'), nowMeta: $('#nowMeta'),
    seek: $('#seek'), tCur: $('#tCur'), tDur: $('#tDur'),
    play: $('#playBtn'), prev: $('#prevBtn'), next: $('#nextBtn'),
    b10: $('#back10'), f10: $('#fwd10'),
    speed: $('#speedBtn'), auto: $('#autoBtn'), dl: $('#dlBtn'),
    list: $('#listSlot'), search: $('#searchInput'), resume: $('#resumeSlot')
  };

  /* ---------------- load surah list ---------------- */
  try {
    surahs = await getSurahList();
  } catch {
    els.list.innerHTML = `
      <div class="error-box card" style="padding:50px 20px">
        <b>Could not load the surah list</b>
        Please check your internet connection.
        <div style="margin-top:16px"><button class="btn gold" onclick="location.reload()">Try again</button></div>
      </div>`;
    return;
  }

  applySpeedLabel();
  els.auto.classList.toggle('on', state.auto);
  els.auto.setAttribute('aria-pressed', state.auto);
  renderResume();
  renderList();

  /* ---------------- rendering ---------------- */
  function renderResume() {
    if (!state.last || current) { els.resume.innerHTML = ''; return; }
    const s = surahs.find(x => x.number === state.last);
    if (!s) return;
    const pos = state.pos[state.last] || 0;
    els.resume.innerHTML = `
      <div class="card resume-card">
        <div class="star8"><span>${s.number}</span></div>
        <div class="meta">
          <b>Continue listening — ${esc(s.englishName)}</b>
          <small>From ${fmt(pos)}</small>
        </div>
        <button class="btn gold" id="resumeBtn">Resume</button>
      </div>`;
    $('#resumeBtn').addEventListener('click', () => playSurah(state.last, true));
  }

  function renderList() {
    const q = els.search.value.trim().toLowerCase();
    const filtered = !q ? surahs : surahs.filter(s =>
      String(s.number) === q ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.name.includes(els.search.value.trim())
    );
    if (!filtered.length) {
      els.list.innerHTML = '<p class="empty">No surah matches your search.</p>';
      return;
    }
    els.list.innerHTML = '<div class="track-list">' + filtered.map(s => `
      <button class="track ${s.number === current ? 'current' : ''}" data-n="${s.number}">
        <div class="star8" style="width:38px;height:38px;font-size:12px"><span>${s.number}</span></div>
        <div class="names">
          <b>${esc(s.englishName)}</b>
          <small>${esc(s.englishNameTranslation)} · ${s.numberOfAyahs} ayahs</small>
        </div>
        <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="arname ar">${esc(s.name)}</span>
      </button>`).join('') + '</div>';

    $$('.track', els.list).forEach(btn =>
      btn.addEventListener('click', () => playSurah(+btn.dataset.n, true)));
  }

  els.search.addEventListener('input', renderList);

  /* ---------------- playback ---------------- */
  function playSurah(n, fromSaved) {
    if (n < 1 || n > 114) return;
    current = n;
    usedFallback = false;
    const s = surahs.find(x => x.number === n);

    audio.src = STREAM_BASE + pad3(n) + '.mp3';
    audio.playbackRate = state.speed;
    const saved = fromSaved ? (state.pos[n] || 0) : 0;
    audio.currentTime = 0;
    if (saved > 3) {
      audio.addEventListener('loadedmetadata', function once() {
        audio.removeEventListener('loadedmetadata', once);
        if (saved < audio.duration - 5) audio.currentTime = saved;
      });
    }
    audio.play().catch(() => {});

    els.nowAr.textContent = s.name;
    els.nowEn.textContent = `${s.englishName} · ${s.englishNameTranslation}`;
    els.nowMeta.textContent =
      `Surah ${s.number} of 114 · ${s.numberOfAyahs} ayahs · Qari Saud Al‑Shuraim`;
    els.dl.href = DOWNLOAD_BASE + pad3(n) + '.mp3';
    els.dl.setAttribute('download', `Surah-${pad3(n)}-${s.englishName}-Shuraim.mp3`);

    state.last = n;
    saveState();
    renderResume();
    markCurrent();
    setMediaSession(s);
  }

  /* stream fallback: if the plain path fails, retry the /download/ path */
  audio.addEventListener('error', () => {
    if (!current) return;
    if (!usedFallback) {
      usedFallback = true;
      const t = audio.currentTime || 0;
      audio.src = DOWNLOAD_BASE + pad3(current) + '.mp3';
      audio.currentTime = t;
      audio.play().catch(() => {});
    } else {
      els.nowMeta.textContent = 'Audio could not be loaded — check your connection and tap the surah again.';
    }
  });

  audio.addEventListener('ended', () => {
    delete state.pos[current];
    if (state.auto && current < 114) playSurah(current + 1, false);
    else { paintPlay(false); saveState(); }
  });

  audio.addEventListener('play',  () => { paintPlay(true);  markCurrent(); });
  audio.addEventListener('pause', () => { paintPlay(false); markCurrent(); savePos(); });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    els.seek.value = (audio.currentTime / audio.duration) * 100;
    els.tCur.textContent = fmt(audio.currentTime);
    els.tDur.textContent = fmt(audio.duration);
    if (Math.floor(audio.currentTime) % 5 === 0) savePos();
  });

  els.seek.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (els.seek.value / 100) * audio.duration;
  });

  els.play.addEventListener('click', () => {
    if (!current) { playSurah(state.last || 1, true); return; }
    if (audio.paused) audio.play(); else audio.pause();
  });
  els.prev.addEventListener('click', () => current > 1  && playSurah(current - 1, false));
  els.next.addEventListener('click', () => current < 114 && playSurah(current + 1, false));
  els.b10.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
  els.f10.addEventListener('click', () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); });

  els.speed.addEventListener('click', () => {
    const i = SPEEDS.indexOf(state.speed);
    state.speed = SPEEDS[(i + 1) % SPEEDS.length];
    audio.playbackRate = state.speed;
    applySpeedLabel();
    saveState();
  });

  els.auto.addEventListener('click', () => {
    state.auto = !state.auto;
    els.auto.classList.toggle('on', state.auto);
    els.auto.setAttribute('aria-pressed', state.auto);
    saveState();
  });

  /* ---------------- helpers ---------------- */
  function paintPlay(playing) {
    els.play.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    els.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function markCurrent() {
    $$('.track').forEach(t => {
      const isCur = +t.dataset.n === current;
      t.classList.toggle('current', isCur);
      t.classList.toggle('paused', isCur && audio.paused);
    });
  }

  function savePos() {
    if (current && audio.currentTime > 3) {
      state.pos[current] = Math.floor(audio.currentTime);
      saveState();
    }
  }
  function saveState() { store.set('aq_listen', state); }

  function applySpeedLabel() {
    els.speed.textContent = state.speed.toFixed(2).replace(/0$/, '') + '×';
    els.speed.classList.toggle('on', state.speed !== 1);
  }

  function fmt(sec) {
    sec = Math.floor(sec || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }

  function setMediaSession(s) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${s.number}. Surah ${s.englishName}`,
      artist: 'Qari Saud Al-Shuraim',
      album: 'Al-Quran al-Kareem'
    });
    navigator.mediaSession.setActionHandler('play',  () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => current > 1 && playSurah(current - 1, false));
    navigator.mediaSession.setActionHandler('nexttrack', () => current < 114 && playSurah(current + 1, false));
    try {
      navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
      navigator.mediaSession.setActionHandler('seekforward',  () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); });
    } catch {}
  }

  /* save position when leaving the page */
  window.addEventListener('beforeunload', savePos);
})();
