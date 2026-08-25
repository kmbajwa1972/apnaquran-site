/* ============================================================
   AL-QURAN — Prayer Times page
   Aladhan API: timings by coords or by city, calendar by month.
   ============================================================ */

const PT_API = 'https://api.aladhan.com/v1';

const PT_METHODS = [
  { id: 3,  name: 'Muslim World League' },
  { id: 2,  name: 'ISNA (North America)' },
  { id: 4,  name: 'Umm al-Qura, Makkah' },
  { id: 5,  name: 'Egyptian General Authority' },
  { id: 1,  name: 'University of Karachi' },
  { id: 7,  name: 'Institute of Geophysics, Tehran' },
  { id: 8,  name: 'Gulf Region' },
  { id: 9,  name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Majlis Ugama Islam Singapura' },
  { id: 12, name: 'Union Organization Islamic de France' },
  { id: 13, name: 'Diyanet, Turkey' },
  { id: 14, name: 'Spiritual Administration of Muslims, Russia' }
];

const PRAYER_NAMES = [
  { key: 'Fajr',    en: 'Fajr',    ur: 'فجر' },
  { key: 'Sunrise', en: 'Sunrise', ur: 'طلوع' },
  { key: 'Dhuhr',   en: 'Dhuhr',   ur: 'ظہر' },
  { key: 'Asr',     en: 'Asr',     ur: 'عصر' },
  { key: 'Maghrib', en: 'Maghrib', ur: 'مغرب' },
  { key: 'Isha',    en: 'Isha',    ur: 'عشاء' }
];

function ptSettings() {
  return Object.assign(
    { method: 1, school: 1, clock: 12, place: null },
    store.get('aq_pt_settings', {})
  );
}
function savePtSettings(patch) {
  store.set('aq_pt_settings', Object.assign(ptSettings(), patch));
}

function fmtClock(hhmm, clock24) {
  // hhmm like "05:12"
  const [h, m] = hhmm.split(':').map(Number);
  if (clock24) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return h12 + ':' + String(m).padStart(2, '0') + ' ' + period;
}

/* Strip any "(...)" timezone suffix Aladhan sometimes appends */
function cleanTime(t) { return (t || '').split(' ')[0]; }

/* The device's own IANA timezone (e.g. "Asia/Karachi"). Passing this explicitly
   stops Aladhan from ever falling back to UTC, which was making every prayer
   look like it had already passed and the countdown always show "Fajr". */
function localTZ() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

let ptCountdownTimer = null;

/* ---------- Adhan audio ---------- */
/* Public-domain (CC0) Adhan recording hosted by Wikimedia Commons. */
const ADHAN_AUDIO_URL = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Adhan.ogg';
let adhanAudio = null;
let adhanLastPlayedKey = null;

function adhanSettings() {
  return { enabled: store.get('aq_adhan_enabled', false) === true };
}

function setupAdhan() {
  const settings = adhanSettings();
  adhanAudio = new Audio(ADHAN_AUDIO_URL);
  adhanAudio.preload = 'auto';
  adhanAudio.volume = 0.9;

  const host = $('#todaySlot');
  if (!host || $('#adhanPanel')) return;

  const panel = document.createElement('section');
  panel.id = 'adhanPanel';
  panel.className = 'card adhan-panel';
  panel.innerHTML = `
    <div class="adhan-copy">
      <div class="adhan-ar">حَيَّ عَلَى الصَّلَاةِ</div>
      <div class="adhan-title">Adhan Reminder</div>
      <div class="adhan-note">Play one Adhan automatically when each prayer time begins.</div>
    </div>
    <div class="adhan-actions">
      <button class="btn gold" id="adhanToggle" type="button"></button>
      <button class="btn" id="adhanTest" type="button">Test Adhan</button>
    </div>
    <div class="adhan-status" id="adhanStatus"></div>
  `;
  host.parentNode.insertBefore(panel, host);

  const toggle = $('#adhanToggle');
  const test = $('#adhanTest');
  const status = $('#adhanStatus');

  function paint() {
    const on = adhanSettings().enabled;
    toggle.textContent = on ? 'Adhan Enabled' : 'Enable Adhan';
    status.textContent = on
      ? 'Adhan is armed for the prayer times shown below.'
      : 'Tap Enable Adhan once so your browser permits scheduled audio.';
  }

  toggle.addEventListener('click', async () => {
    const next = !adhanSettings().enabled;
    store.set('aq_adhan_enabled', next);
    if (next) {
      try {
        await adhanAudio.play();
        adhanAudio.pause();
        adhanAudio.currentTime = 0;
        status.textContent = 'Adhan enabled. It will play at each prayer time.';
      } catch {
        status.textContent = 'Adhan is enabled. Tap Test Adhan once if your browser requires audio permission.';
      }
    }
    paint();
  });

  test.addEventListener('click', async () => {
    try {
      await adhanAudio.play();
      status.textContent = 'Playing Adhan…';
    } catch {
      status.textContent = 'Your browser blocked audio. Please tap Enable Adhan first.';
    }
  });

  paint();
}

function maybePlayAdhan(cells, now) {
  if (!adhanAudio || !adhanSettings().enabled) return;

  for (const c of cells.filter(x => x.key !== 'Sunrise')) {
    const [h, m] = c.time.split(':').map(Number);
    if (now.getHours() !== h || now.getMinutes() !== m || now.getSeconds() > 8) continue;

    const key = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${c.key}`;
    if (adhanLastPlayedKey === key) return;

    adhanLastPlayedKey = key;
    adhanAudio.currentTime = 0;
    adhanAudio.play().catch(() => {
      const status = $('#adhanStatus');
      if (status) status.textContent = 'Prayer time reached, but the browser blocked automatic audio. Tap Test Adhan to allow sound.';
    });
    const cell = document.querySelector(`.time-cell[data-key="${c.key}"]`);
    if (cell) cell.classList.add('adhan-now');
    setTimeout(() => cell && cell.classList.remove('adhan-now'), 6000);
    return;
  }
}

async function loadToday(place) {
  const slot = $('#todaySlot');
  slot.innerHTML = '<div class="loader"><div class="star8">' + starSVG() + '</div><span>Getting prayer times…</span></div>';
  const s = ptSettings();
  const tz = encodeURIComponent(localTZ());

  try {
    const url = place.lat != null
      ? `${PT_API}/timings/${Math.floor(Date.now()/1000)}?latitude=${place.lat}&longitude=${place.lng}&method=${s.method}&school=${s.school}&timezonestring=${tz}`
      : `${PT_API}/timingsByCity/${Math.floor(Date.now()/1000)}?city=${encodeURIComponent(place.city)}&country=${encodeURIComponent(place.country)}&method=${s.method}&school=${s.school}&timezonestring=${tz}`;

    const json = await fetchJSON(url);
    renderToday(json.data, place);
  } catch (err) {
    slot.innerHTML = `<div class="error-box"><b>Couldn't get prayer times</b>Check the city/country spelling, or try "Use my location". ${err.message ? '(' + esc(err.message) + ')' : ''}</div>`;
  }
}

function renderToday(data, place) {
  const s = ptSettings();
  const clock24 = s.clock == 24;
  const t = data.timings;
  const hij = data.date.hijri;
  const grd = data.date.gregorian;

  const label = place.label || (place.city ? `${place.city}, ${place.country}` : 'Your location');

  const cells = PRAYER_NAMES.map(p => {
    const raw = cleanTime(t[p.key]);
    return { ...p, time: raw };
  });

  const html = `
    <div class="card today-card">
      <div class="place">${esc(label)}</div>
      <div class="dates">${esc(grd.weekday.en)}, ${esc(grd.day)} ${esc(grd.month.en)} ${esc(grd.year)}
        &nbsp;·&nbsp;<span class="hijri">${esc(hij.day)} ${esc(hij.month.en)} ${esc(hij.year)} AH</span></div>

      <div class="countdown" id="ptCountdown"></div>

      <div class="times-grid">
        ${cells.map(c => `
          <div class="time-cell" data-key="${c.key}">
            <div class="p">${c.en}<span class="ur-name">${c.ur}</span></div>
            <div class="t">${fmtClock(c.time, clock24)}</div>
          </div>`).join('')}
      </div>
    </div>`;

  $('#todaySlot').innerHTML = html;
  startCountdown(cells);
  saveLastPlace(place);
  loadMonth(place, grd.month.number, grd.year);
}

function startCountdown(cells) {
  if (ptCountdownTimer) clearInterval(ptCountdownTimer);

  // Build today's Date objects for Fajr..Isha (skip Sunrise for "next prayer" purposes,
  // but keep it in the grid)
  const order = cells.filter(c => c.key !== 'Sunrise');

  function toToday(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  function tick() {
    const now = new Date();
    maybePlayAdhan(cells, now);
    let next = null;
    for (const c of order) {
      const d = toToday(c.time);
      if (d > now) { next = { ...c, d }; break; }
    }
    if (!next) {
      // after Isha — next is tomorrow's Fajr, just show a generic message
      $('#ptCountdown').innerHTML = `<div class="label">Next Prayer</div>
        <div class="prayer">Fajr (tomorrow)</div>
        <div class="timer">—:—:—</div>`;
      $$('.time-cell').forEach(el => el.classList.remove('next'));
      return;
    }
    const diff = Math.max(0, next.d - now);
    const hh = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

    $('#ptCountdown').innerHTML = `<div class="label">Next Prayer</div>
      <div class="prayer">${next.en} <span style="opacity:.6">${next.ur}</span></div>
      <div class="timer">${hh}:${mm}:${ss}</div>`;

    $$('.time-cell').forEach(el => el.classList.toggle('next', el.dataset.key === next.key));
  }

  tick();
  ptCountdownTimer = setInterval(tick, 1000);
}

async function loadMonth(place, month, year) {
  const slot = $('#monthSlot');
  slot.innerHTML = '<div class="loader"><div class="star8">' + starSVG() + '</div><span>Loading timetable…</span></div>';
  const s = ptSettings();
  const tz = encodeURIComponent(localTZ());

  try {
    const url = place.lat != null
      ? `${PT_API}/calendar/${year}/${month}?latitude=${place.lat}&longitude=${place.lng}&method=${s.method}&school=${s.school}&timezonestring=${tz}`
      : `${PT_API}/calendarByCity/${year}/${month}?city=${encodeURIComponent(place.city)}&country=${encodeURIComponent(place.country)}&method=${s.method}&school=${s.school}&timezonestring=${tz}`;

    const json = await fetchJSON(url);
    renderMonth(json.data);
  } catch (err) {
    slot.innerHTML = `<div class="error-box"><b>Couldn't load the monthly timetable</b>${esc(err.message || '')}</div>`;
  }
}

function renderMonth(days) {
  const clock24 = ptSettings().clock == 24;
  const todayStr = new Date().getDate();
  const rows = days.map(d => {
    const g = d.date.gregorian, h = d.date.hijri;
    const isToday = Number(g.day) === todayStr;
    return `<tr class="${isToday ? 'today' : ''}">
      <td>${esc(g.day)} ${esc(g.month.en.slice(0,3))}<span class="hj">${esc(h.day)} ${esc(h.month.en)}</span></td>
      <td>${fmtClock(cleanTime(d.timings.Fajr), clock24)}</td>
      <td>${fmtClock(cleanTime(d.timings.Sunrise), clock24)}</td>
      <td>${fmtClock(cleanTime(d.timings.Dhuhr), clock24)}</td>
      <td>${fmtClock(cleanTime(d.timings.Asr), clock24)}</td>
      <td>${fmtClock(cleanTime(d.timings.Maghrib), clock24)}</td>
      <td>${fmtClock(cleanTime(d.timings.Isha), clock24)}</td>
    </tr>`;
  }).join('');

  $('#monthSlot').innerHTML = `
    <div class="month-wrap">
      <table class="month">
        <thead><tr><th>Date</th><th>Fajr</th><th>Sunrise</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Isha</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function starSVG() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="14" height="14" rx="1.5"/><rect x="5" y="5" width="14" height="14" rx="1.5" transform="rotate(45 12 12)"/></svg>';
}

function saveLastPlace(place) { savePtSettings({ place }); }

function useGeolocation() {
  if (!navigator.geolocation) {
    alert('Your browser does not support location access — please search by city instead.');
    return;
  }
  const btn = $('#geoBtn');
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    pos => {
      btn.disabled = false;
      const place = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your current location' };
      loadToday(place);
    },
    () => {
      btn.disabled = false;
      alert('Location access was blocked. Please allow it, or search for your city below.');
    },
    { timeout: 10000 }
  );
}

function searchCity() {
  const city = $('#cityInput').value.trim();
  const country = $('#countryInput').value.trim();
  if (!city || !country) { alert('Please enter both a city and a country.'); return; }
  loadToday({ city, country, label: `${city}, ${country}` });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAdhan();
  const s = ptSettings();

  // populate method select
  const methodSel = $('#methodSel');
  methodSel.innerHTML = PT_METHODS.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  methodSel.value = s.method;
  $('#schoolSel').value = s.school;
  $('#clockSel').value = s.clock;

  methodSel.addEventListener('change', () => { savePtSettings({ method: Number(methodSel.value) }); reload(); });
  $('#schoolSel').addEventListener('change', e => { savePtSettings({ school: Number(e.target.value) }); reload(); });
  $('#clockSel').addEventListener('change', e => { savePtSettings({ clock: Number(e.target.value) }); reload(); });

  $('#geoBtn').addEventListener('click', useGeolocation);
  $('#cityBtn').addEventListener('click', searchCity);
  $('#cityInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchCity(); });
  $('#countryInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchCity(); });

  function reload() {
    const place = ptSettings().place;
    if (place) loadToday(place); else useGeolocation();
  }

  // Prefill city inputs if we have a remembered place
  if (s.place && s.place.city) {
    $('#cityInput').value = s.place.city;
    $('#countryInput').value = s.place.country;
  }

  if (s.place) loadToday(s.place); else useGeolocation();
});
