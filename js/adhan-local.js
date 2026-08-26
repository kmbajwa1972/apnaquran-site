/* ============================================================
   AL-QURAN — Local Adhan audio
   Fajr uses Azan_fajr.mp3; the other four prayers use Azan.mp3.
   Audio files are stored locally in /audio/ so playback does not
   depend on an external audio host.
   ============================================================ */

(function () {
  const REGULAR = 'audio/Azan.mp3';
  const FAJR = 'audio/Azan_fajr.mp3';

  function localAdhanUrl(prayer) {
    return prayer === 'Fajr' ? FAJR : REGULAR;
  }

  function applyLocalAdhan() {
    if (!window.adhanAudio) return false;
    window.adhanAudio.src = REGULAR;
    window.adhanAudio.preload = 'auto';
    window.adhanAudio.load();
    return true;
  }

  function playLocalAdhan(prayer) {
    if (!window.adhanAudio) return Promise.reject(new Error('Adhan audio is not ready'));
    const audio = window.adhanAudio;
    const url = localAdhanUrl(prayer);
    if (!audio.src.endsWith(url)) {
      audio.src = url;
      audio.load();
    }
    audio.currentTime = 0;
    return audio.play();
  }

  function install() {
    if (!applyLocalAdhan()) {
      setTimeout(install, 50);
      return;
    }

    /* Replace the scheduled trigger so Fajr gets its own recording. */
    window.maybePlayAdhan = function (cells, now) {
      if (!window.adhanAudio || !window.adhanSettings || !window.adhanSettings().enabled) return;

      for (const c of cells.filter(x => x.key !== 'Sunrise')) {
        const parts = c.time.split(':').map(Number);
        const h = parts[0], m = parts[1];
        if (now.getHours() !== h || now.getMinutes() !== m || now.getSeconds() > 8) continue;

        const key = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${c.key}`;
        if (window.adhanLastPlayedKey === key) return;

        window.adhanLastPlayedKey = key;
        playLocalAdhan(c.key).catch(() => {
          const status = document.querySelector('#adhanStatus');
          if (status) status.textContent = 'Prayer time reached, but the browser blocked automatic audio. Use Test Adhan once to allow sound.';
        });

        const cell = document.querySelector(`.time-cell[data-key="${c.key}"]`);
        if (cell) cell.classList.add('adhan-now');
        setTimeout(() => cell && cell.classList.remove('adhan-now'), 6000);
        return;
      }
    };

    /* Make the existing Test Adhan button use the local regular recording. */
    const test = document.querySelector('#adhanTest');
    if (test) {
      test.onclick = function () {
        playLocalAdhan('Dhuhr').then(() => {
          const status = document.querySelector('#adhanStatus');
          if (status) status.textContent = 'Playing local Adhan…';
        }).catch(() => {
          const status = document.querySelector('#adhanStatus');
          if (status) status.textContent = 'Your browser blocked audio. Tap Enable Adhan first.';
        });
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
