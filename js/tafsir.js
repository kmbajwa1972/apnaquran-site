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

      let uniqueCommentary = commentary;
      if (slug === 'ur-tafsir-as-saadi-urdu' ||
          (slug === urduIbnKathir && surahNumber === 112)) {
        const seenCommentary = new Set();
        uniqueCommentary = commentary.filter(item => {
          if (seenCommentary.has(item.body)) return false;
          seenCommentary.add(item.body);
          return true;
        });
      }

      if (!uniqueCommentary.length) throw new Error('No commentary text was found for this Surah.');

      // In the Urdu source, the Ayah 3 explanation is embedded inside [1].
      // Move that exact original wording to [3], in verse order, without rewriting it.
      let displayCommentary = uniqueCommentary;
      if (slug === 'ur-tafsir-as-saadi-urdu' && surahNumber === 1) {
        const sourceBody = uniqueCommentary[0].body;
        const passageStartMarker = '﴿الرَّحۡمٰنِ الرَّحِيۡمِ﴾';
        const passageEndMarker = 'حصہ ہے۔';
        const passageStart = sourceBody.indexOf(passageStartMarker);
        const passageEndStart = passageStart < 0 ? -1 : sourceBody.indexOf(passageEndMarker, passageStart);
        if (passageStart < 0 || passageEndStart < 0 || sourceBody.indexOf('[4]', passageEndStart) < 0) {
          throw new Error('The original As-Saadi Ayah 3 text could not be safely separated.');
        }
        const passageEnd = passageEndStart + passageEndMarker.length;
        const ayahThreeText = sourceBody.slice(passageStart, passageEnd).trim();
        const bodyWithoutAyahThree = sourceBody.slice(0, passageStart) + sourceBody.slice(passageEnd);
        const insertAt = bodyWithoutAyahThree.indexOf('[4]');
        const bodyWithReferenceThree =
          bodyWithoutAyahThree.slice(0, insertAt) +
          '\n\n[3] ' + ayahThreeText + '\n\n' +
          bodyWithoutAyahThree.slice(insertAt);
        displayCommentary = [{ ...uniqueCommentary[0], body: bodyWithReferenceThree }];
      }

      heading.textContent = editionNames[slug] + ' — Surah ' + surahNumber;
      heading.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.dir = language === 'ur' ? 'rtl' : 'ltr';
      textBox.lang = language;
      textBox.classList.toggle('is-urdu', language === 'ur');
      textBox.classList.toggle('is-english', language === 'en');

      if (slug !== urduIbnKathir || surahNumber === 112) {
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

      displayCommentary.forEach(item => {
        const section = document.createElement('section');
        section.className = 'tafsir-verse';
        if (slug === urduIbnKathir && surahNumber !== 112) {
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