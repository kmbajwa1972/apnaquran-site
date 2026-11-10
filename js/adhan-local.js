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

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3] && match[3].toUpperCase();

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    const now = new Date();
    return now.getHours() === hour &&
      now.getMinutes() === minute &&
      now.getSeconds() <= 8;
  }

  function isAdhanAudio(element) {
    const source = element.getAttribute('src') || element.src || '';
    return /commons\.wikimedia\.org/i.test(source) ||
      /(?:^|\/)audio\/Azan(?:_fajr)?\.mp3(?:[?#]|$)/i.test(source);
  }

  /*
   * The prayer page reuses one Audio object for the enable/test action and
   * every scheduled prayer. Re-evaluate the correct local recording on
   * EVERY play call, including after the first redirect has changed its src.
   */
  HTMLMediaElement.prototype.play = function () {
    if (!redirecting && this instanceof HTMLAudioElement && isAdhanAudio(this)) {
      const wanted = fajrIsDueNow() ? FAJR : REGULAR;
      const current = this.getAttribute('src') || '';

      if (current !== wanted) {
        redirecting = true;
        this.src = wanted;
        this.preload = 'auto';
        this.load();
        redirecting = false;
      }
    }
    return originalPlay.call(this);
  };

  /* Keep the existing interface: no separate Test Adhan control is shown. */
  function removeTestButton() {
    const test = document.querySelector('#adhanTest');
    if (test) test.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeTestButton);
  } else {
    removeTestButton();
  }

  /* prayer.js inserts the Adhan panel during DOMContentLoaded. */
  const observer = new MutationObserver(removeTestButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 5000);
})();
