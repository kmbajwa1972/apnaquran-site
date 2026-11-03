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
  const urduIbnKathir = 'ur-tafseer-ibn-e-kaseer';

  function isEnglishSubheading(text) {
    const value = text.trim();
    if (!value || value.length > 100) return false;
    if (/[.!;,:]$/.test(value)) return false;
    return value.split(/\s+/).length <= 13;
  }

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

    const tafsirUrl = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/' +
      encodeURIComponent(slug) + '/' + surahNumber + '.json';

    try {
      const requests = [fetch(tafsirUrl)];
      if (slug === urduIbnKathir) {
        requests.push(fetch('https://api.alquran.cloud/v1/surah/' + surahNumber + '/quran-uthmani'));
      }
      const responses = await Promise.all(requests);
      for (const response of responses) {
        if (!response.ok) throw new Error('A text source returned HTTP ' + response.status);
      }

      const data = await responses[0].json();
      const entries = Array.isArray(data) ? data : (Array.isArray(data.ayahs) ? data.ayahs : [data]);
      let arabicAyahs = new Map();
      if (slug === urduIbnKathir) {
        const arabicData = await responses[1].json();
        if (arabicData.code !== 200 || !Array.isArray(arabicData.data?.ayahs)) {
          throw new Error('Arabic Quran text could not be loaded.');
        }
        arabicAyahs = new Map(arabicData.data.ayahs.map(item => [Number(item.numberInSurah), item.text]));
      }

      const commentary = entries.map((item, index) => {
        if (typeof item === 'string') return { body: item, ayah: index + 1 };
        return {
          body: item.text || item.tafsir || '',
          ayah: Number(item.ayah) || index + 1
        };
      }).filter(item => item.body);

      if (!commentary.length) throw new Error('No commentary text was found for this Surah.');

      heading.textContent = editionNames[slug] + ' — Surah ' + surahNumber;
      heading.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.lang = language;
      textBox.classList.toggle('is-urdu', language === 'ur');
      textBox.classList.toggle('is-english', language === 'en');

      commentary.forEach(item => {
        const section = document.createElement('section');
        section.className = 'tafsir-verse';
        if (slug === urduIbnKathir) {
          const arabicText = arabicAyahs.get(item.ayah);
          if (!arabicText) throw new Error('Arabic ayah ' + item.ayah + ' could not be matched with the Urdu commentary.');
          const arabic = document.createElement('p');
          arabic.className = 'tafsir-ayah-arabic';
          arabic.lang = 'ar';
          arabic.dir = 'rtl';
          arabic.textContent = arabicText;
          section.appendChild(arabic);
        }
        const paragraph = document.createElement('p');
        paragraph.textContent = item.body;
        if (language === 'en' && isEnglishSubheading(item.body)) {
          paragraph.className = 'tafsir-subheading';
        }
        section.appendChild(paragraph);
        textBox.appendChild(section);
      });

      result.hidden = false;
      status.textContent = 'Tafseer loaded. Arabic ayahs are shown with the Urdu Ibn Kathir commentary.';
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