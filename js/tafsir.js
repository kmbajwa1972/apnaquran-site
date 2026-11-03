(() => {
  const edition = document.getElementById('tafsirEdition');
  const surah = document.getElementById('surahNumber');
  const loadButton = document.getElementById('loadTafsir');
  const status = document.getElementById('tafsirStatus');
  const result = document.getElementById('tafsirResult');
  const heading = document.getElementById('tafsirHeading');
  const textBox = document.getElementById('tafsirText');

  const editionNames = {
    'en-tafisr-ibn-kathir': 'Tafseer Ibn Kathir — English',
    'ur-tafseer-ibn-e-kaseer': 'تفسیر ابنِ کثیر — اردو',
    'ur-tafsir-as-saadi-urdu': 'تفسیر السعدی — اردو',
    'en-tafsir-maarif-ul-quran': "Ma'ariful Quran — English"
  };

  async function loadTafsir() {
    const surahNumber = Math.min(114, Math.max(1, Number(surah.value) || 1));
    const slug = edition.value;
    const language = edition.selectedOptions[0].dataset.lang;
    surah.value = surahNumber;
    loadButton.disabled = true;
    result.hidden = true;
    status.textContent = 'Loading Tafseer…';
    status.dir = 'ltr';
    textBox.replaceChildren();

    const url = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/' +
      encodeURIComponent(slug) + '/' + surahNumber + '.json';

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('The source returned HTTP ' + response.status);
      const data = await response.json();
      const entries = Array.isArray(data) ? data : (Array.isArray(data.ayahs) ? data.ayahs : [data]);
      const commentary = entries.map(item => {
        if (typeof item === 'string') return item;
        const body = item.text || item.tafsir || '';
        return body && item.ayah ? 'Ayah ' + item.ayah + '\\n\\n' + body : body;
      }).filter(Boolean);
      if (!commentary.length) throw new Error('No commentary text was found for this Surah.');

      heading.textContent = editionNames[slug] + ' — Surah ' + surahNumber;
      heading.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.lang = language;
      textBox.classList.toggle('is-urdu', language === 'ur');
      commentary.forEach((part, index) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = part;
        textBox.appendChild(paragraph);
      });
      result.hidden = false;
      status.textContent = 'Tafseer loaded. The source text is shown unchanged.';
    } catch (error) {
      status.textContent = 'Unable to load this Tafseer right now. Please check your connection and try again. (' + error.message + ')';
    } finally {
      loadButton.disabled = false;
    }
  }

  loadButton.addEventListener('click', loadTafsir);
  surah.addEventListener('keydown', event => {
    if (event.key === 'Enter') loadTafsir();
  });
})();