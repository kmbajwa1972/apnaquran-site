/* ============================================================
   AL-QURAN — Local Adhan audio
   Fajr uses Azan_fajr.mp3; the other four prayers use Azan.mp3.
   Audio files are stored locally in /audio/.
   ============================================================ */

(function () {
  const REGULAR = 'audio/Azan.mp3';
  const FAJR = 'audio/Azan_fajr.mp3';
  const originalPlay = HTMLMediaElement.prototype.play;
  let redirecting = false;

  function fajrIsDueNow() {
    const cell = document.querySelector('.time-cell[data-key="Fajr"] .t');
    if (!cell) return false;
    const text = cell.textContent.trim();
    const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return false;
    let h = Number(match[1]);
    const m = Number(match[2]);
    const ap = match[3] && match[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    const now = new Date();
    return now.getHours() === h && now.getMinutes() === m && now.getSeconds() <= 8;
  }

  /* The existing prayer code creates an Audio object with an external URL.
     Redirect that playback to our local repo files without changing the
     working prayer/countdown code. */
  HTMLMediaElement.prototype.play = function () {
    const source = this.getAttribute('src') || this.src || '';
    if (!redirecting && /commons\.wikimedia\.org/i.test(source)) {
      const local = fajrIsDueNow() ? FAJR : REGULAR;
      redirecting = true;
      this.src = local;
      this.preload = 'auto';
      this.load();
      const promise = originalPlay.call(this);
      redirecting = false;
      return promise;
    }
    return originalPlay.call(this);
  };

  /* The site should not expose a Test Adhan control. Keep the normal
     Enable Adhan control for the user's one-time browser audio permission. */
  function removeTestButton() {
    const test = document.querySelector('#adhanTest');
    if (test) test.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeTestButton);
  } else {
    removeTestButton();
  }

  /* prayer.js inserts the Adhan panel during DOMContentLoaded, so make sure
     the Test button is removed immediately after that panel is created. */
  const observer = new MutationObserver(removeTestButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 5000);
})();
