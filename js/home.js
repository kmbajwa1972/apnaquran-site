/* ============================================================
   AL-QURAN — Home page
   Ayah of the day, mini next-prayer countdown, resume-last-read.
   ============================================================ */

/* Deterministic "ayah of the day" — same for everyone, all day, changes daily */
function dailyAyahNumber() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 864e5);
  return (dayOfYear % 6236) + 1; // 1..6236 = total ayahs in the Quran
}

async function loadDailyAyah() {
  const card = $('#ayahCard');
  try {
    const num = dailyAyahNumber();
    const s = getSettings();
    const json = await fetchJSON(
      `${AQ.API}/ayah/${num}/editions/${AQ.ARABIC_EDITION},${s.urdu},${s.english}`
    );
    const [ar, ur, en] = json.data;
    card.innerHTML = `
      <div class="label">Ayah of the Day</div>
      <div class="ar">${ar.text}</div>
      <div class="ur">${ur.text}</div>
      <div class="en">${esc(en.text)}</div>
      <div class="ref">${esc(ar.surah.englishName)} (${ar.surah.number}:${ar.numberInSurah})</div>
      <div class="actions">
        <a href="surah.html?s=${ar.surah.number}#ayah-${ar.numberInSurah}">Read in context</a>
        <button id="copyAyahBtn">Copy</button>
      </div>`;
    $('#copyAyahBtn').addEventListener('click', () => {
      const text = `${ar.text}\n\n${ur.text}\n\n${en.text}\n(${ar.surah.englishName} ${ar.surah.number}:${ar.numberInSurah})`;
      navigator.clipboard.writeText(text).then(() => {
        const b = $('#copyAyahBtn'); const old = b.textContent;
        b.textContent = 'Copied!'; setTimeout(() => b.textContent = old, 1400);
      }).catch(() => {});
    });
  } catch {
    card.innerHTML = `<div class="label">Ayah of the Day</div>
      <p style="color:var(--muted)">Couldn't load today's ayah — check your connection and refresh.</p>`;
  }
}

async function loadMiniPrayer() {
  const strip = $('#miniPrayer');
  const pt = store.get('aq_pt_settings', {});
  const place = pt.place;
  if (!place) {
    strip.innerHTML = `<span class="who">Prayer times</span>
      <a href="prayer-times.html" class="btn" style="padding:7px 14px">Set your location →</a>`;
    return;
  }
  try {
    const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const url = place.lat != null
      ? `https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=${place.lat}&longitude=${place.lng}&method=${pt.method||1}&school=${pt.school||1}&timezonestring=${tz}`
      : `https://api.aladhan.com/v1/timingsByCity/${Math.floor(Date.now()/1000)}?city=${encodeURIComponent(place.city)}&country=${encodeURIComponent(place.country)}&method=${pt.method||1}&school=${pt.school||1}&timezonestring=${tz}`;
    const json = await fetchJSON(url);
    const t = json.data.timings;
    const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    const now = new Date();
    let next = null;
    for (const key of order) {
      const [h, m] = t[key].split(' ')[0].split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      if (d > now) { next = { key, d }; break; }
    }
    const label = place.label || (place.city ? `${place.city}, ${place.country}` : 'Your location');
    if (!next) {
      strip.innerHTML = `<span class="who">${esc(label)}</span>
        <div class="next"><div class="p">Fajr</div><div class="t">Tomorrow</div></div>`;
    } else {
      const diff = next.d - now;
      const hh = Math.floor(diff / 3600000), mm = Math.floor((diff % 3600000) / 60000);
      strip.innerHTML = `<span class="who">${esc(label)}</span>
        <div class="next"><div class="p">${next.key} in</div><div class="t">${hh}h ${mm}m</div></div>`;
    }
  } catch {
    strip.innerHTML = `<span class="who">Prayer times</span>
      <a href="prayer-times.html" class="btn" style="padding:7px 14px">View prayer times →</a>`;
  }
}

function loadResumeCard() {
  const lr = getLastRead();
  const slot = $('#resumeSlot');
  if (!lr) { slot.remove(); return; }
  slot.innerHTML = `<div class="card">
    <div class="txt">Continue reading <b>${esc(lr.name)}</b>, Ayah ${lr.a}</div>
    <a class="btn gold" href="surah.html?s=${lr.s}#ayah-${lr.a}">Resume →</a>
  </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadDailyAyah();
  loadMiniPrayer();
  loadResumeCard();
});
