/* ApnaQuran footer install prompt. No install prompt is forced on visitors. */
(() => {
  let installEvent = null;
  const button = document.getElementById('aqInstallButton');
  const help = document.getElementById('aqInstallHelp');
  if (!button || !help) return;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installEvent = event;
    button.hidden = false;
    help.textContent = 'Add ApnaQuran to your device for quick home-screen access.';
  });

  button.addEventListener('click', async () => {
    if (installEvent) {
      installEvent.prompt();
      const choice = await installEvent.userChoice;
      help.textContent = choice.outcome === 'accepted'
        ? 'ApnaQuran installation accepted.'
        : 'You can install ApnaQuran later from your browser menu.';
      installEvent = null;
      button.hidden = true;
      return;
    }
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) {
      help.textContent = 'In Chrome, open the browser menu (⋮) and choose Install app or Add to Home screen.';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      help.textContent = 'In Safari, tap Share and choose Add to Home Screen.';
    } else {
      help.textContent = 'Open your browser menu and look for Install ApnaQuran or Install this site as an app. Availability depends on your browser.';
    }
  });

  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    button.hidden = true;
    help.textContent = 'ApnaQuran is already installed on this device.';
  }
})();
