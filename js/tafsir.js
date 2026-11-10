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
  // Pin the upstream dataset to an immutable commit so commentary cannot change silently.
  const tafsirSourceCommit = 'eb82bb6294efe30ad5c135c03b1864afaa70e855';

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

    const tafsirUrl = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@' + tafsirSourceCommit + '/tafsir/' +
      encodeURIComponent(slug) + '/' + surahNumber + '.json';

    try {
      const requests = [
        fetch(tafsirUrl),
        fetch('https://api.alquran.cloud/v1/surah/' + surahNumber + '/quran-uthmani')
      ];
      const responses = await Promise.all(requests);
      for (const response of responses) {
        if (!response.ok) throw new Error('A text source returned HTTP ' + response.status);
      }

      const data = await responses[0].json();
      const entries = Array.isArray(data) ? data : (Array.isArray(data.ayahs) ? data.ayahs : [data]);
      const arabicData = await responses[1].json();
      if (arabicData.code !== 200 || !Array.isArray(arabicData.data?.ayahs)) {
        throw new Error('Arabic Quran text could not be loaded.');
      }
      const arabicAyahs = new Map(arabicData.data.ayahs.map(item => [Number(item.numberInSurah), item.text]));

      const commentary = entries.map((item, index) => {
        if (typeof item === 'string') return { body: item, ayah: index + 1 };
        return {
          body: item.text || item.tafsir || '',
          ayah: Number(item.ayah) || index + 1
        };
      }).filter(item => item.body);

      // As-Saadi's source repeats the same complete Surah text once per Ayah.
      // Collapse only exact duplicates in that edition; leave all other editions untouched.
      let uniqueCommentary = commentary;
      if (slug === 'ur-tafsir-as-saadi-urdu') {
        const seenCommentary = new Set();
        uniqueCommentary = commentary.filter(item => {
          if (seenCommentary.has(item.body)) return false;
          seenCommentary.add(item.body);
          return true;
        });
      }

      if (!uniqueCommentary.length) throw new Error('No commentary text was found for this Surah.');

      heading.textContent = editionNames[slug] + ' — Surah ' + surahNumber;
      heading.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.lang = language;
      textBox.classList.toggle('is-urdu', language === 'ur');
      textBox.classList.toggle('is-english', language === 'en');

      if (slug !== urduIbnKathir) {
        const arabicBlock = document.createElement('section');
        arabicBlock.className = 'tafsir-surah-arabic';
        arabicBlock.setAttribute('aria-label', 'Arabic Quran text');
        arabicData.data.ayahs.forEach(item => {
          const arabic = document.createElement('p');
          arabic.className = 'tafsir-ayah-arabic';
          arabic.lang = 'ar';
          arabic.dir = 'rtl';
          arabic.textContent = item.text;
          arabicBlock.appendChild(arabic);
        });
        textBox.appendChild(arabicBlock);
      }

      uniqueCommentary.forEach(item => {
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

      // The source itself has no separate [3] footnote: Ayah 3's explanation is already included in [1].
      // Show a clearly separated editorial note rather than inventing or altering Tafseer wording.
      if (slug === 'ur-tafsir-as-saadi-urdu' && surahNumber === 1) {
        const sourceNote = document.createElement('p');
        sourceNote.className = 'small-note tafsir-source-note';
        sourceNote.lang = 'ur';
        sourceNote.dir = 'rtl';
        sourceNote.textContent = 'وضاحتی نوٹ: اصل ماخذ میں حوالہ [3] الگ سے درج نہیں ہے۔ آیت 3 (الرَّحْمَٰنِ الرَّحِيمِ) کی تشریح حوالہ [1] کے متن میں شامل ہے؛ اس لیے اصل تفسیر میں کوئی نیا متن شامل نہیں کیا گیا۔';
        textBox.appendChild(sourceNote);
      }

      result.hidden = false;
      status.textContent = 'Tafseer loaded with Arabic Quran text.';
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