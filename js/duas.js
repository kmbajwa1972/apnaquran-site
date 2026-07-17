/* ============================================================
   AL-QURAN — Daily Duas (masnoon duas)
   ============================================================ */

const DUAS = [
  {
    cat: 'Morning & Evening', title: 'Upon Waking Up',
    ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    ur: 'تمام تعریفیں اللہ کے لیے ہیں جس نے ہمیں مارنے (سلانے) کے بعد زندہ کیا، اور اسی کی طرف اٹھ کر جانا ہے۔',
    en: 'All praise is for Allah who gave us life after having taken it (in sleep), and to Him is the return.',
    ref: 'Sahih al-Bukhari'
  },
  {
    cat: 'Morning & Evening', title: 'Morning Remembrance',
    ar: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    ur: 'ہم نے صبح کی اور بادشاہت اللہ ہی کے لیے ہے، اور تمام تعریفیں اللہ ہی کے لیے ہیں۔',
    en: 'We have entered the morning and with it all dominion belongs to Allah, and all praise is for Allah.',
    ref: 'Sahih Muslim'
  },
  {
    cat: 'Morning & Evening', title: 'Evening Remembrance',
    ar: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    ur: 'ہم نے شام کی اور بادشاہت اللہ ہی کے لیے ہے، اور تمام تعریفیں اللہ ہی کے لیے ہیں۔',
    en: 'We have entered the evening and with it all dominion belongs to Allah, and all praise is for Allah.',
    ref: 'Sahih Muslim'
  },
  {
    cat: 'Daily Life', title: 'Entering the Home',
    ar: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا',
    ur: 'اللہ کے نام کے ساتھ ہم داخل ہوئے، اور اللہ کے نام کے ساتھ ہم نکلے، اور اپنے رب پر ہی ہم نے بھروسہ کیا۔',
    en: 'In the name of Allah we enter, and in the name of Allah we leave, and upon our Lord we place our trust.',
    ref: 'Sunan Abi Dawud'
  },
  {
    cat: 'Daily Life', title: 'Leaving the Home',
    ar: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    ur: 'اللہ کے نام کے ساتھ، میں نے اللہ پر بھروسہ کیا، اور کوئی طاقت اور قوت نہیں مگر اللہ کی مدد سے۔',
    en: 'In the name of Allah, I place my trust in Allah, and there is no power or strength except through Allah.',
    ref: 'Sunan Abi Dawud, At-Tirmidhi'
  },
  {
    cat: 'Daily Life', title: 'Entering the Masjid',
    ar: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    ur: 'اے اللہ! میرے لیے اپنی رحمت کے دروازے کھول دے۔',
    en: 'O Allah, open for me the doors of Your mercy.',
    ref: 'Sahih Muslim'
  },
  {
    cat: 'Daily Life', title: 'Leaving the Masjid',
    ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    ur: 'اے اللہ! میں تجھ سے تیرے فضل کا سوال کرتا ہوں۔',
    en: 'O Allah, I ask You from Your bounty.',
    ref: 'Sahih Muslim'
  },
  {
    cat: 'Food', title: 'Before Eating',
    ar: 'بِسْمِ اللَّهِ',
    ur: 'اللہ کے نام کے ساتھ۔',
    en: 'In the name of Allah.',
    ref: 'Sunan Abi Dawud'
  },
  {
    cat: 'Food', title: 'After Eating',
    ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    ur: 'تمام تعریفیں اللہ کے لیے ہیں جس نے مجھے یہ کھلایا اور بغیر میری کسی طاقت اور قوت کے مجھے یہ رزق دیا۔',
    en: 'All praise is for Allah who fed me this and provided it for me without any power or might on my part.',
    ref: 'Sunan Abi Dawud, At-Tirmidhi'
  },
  {
    cat: 'Travel', title: 'Setting Out on a Journey',
    ar: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    ur: 'پاک ہے وہ ذات جس نے اس سواری کو ہمارے لیے مسخر کیا، ورنہ ہم اسے قابو میں نہیں لا سکتے تھے، اور بیشک ہم اپنے رب کی طرف لوٹنے والے ہیں۔',
    en: 'Glory to Him who has subjected this to us, for we could never have accomplished this by ourselves, and to our Lord we shall surely return.',
    ref: 'Sahih Muslim (from Surah Az-Zukhruf 43:13-14)'
  },
  {
    cat: 'Distress & Protection', title: 'In Times of Anxiety or Grief',
    ar: 'اللَّهُمَّ إِنِّي عَبْدُكَ ابْنُ عَبْدِكَ ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ',
    ur: 'اے اللہ! میں تیرا بندہ ہوں، تیرے بندے کا بیٹا، تیری بندی کا بیٹا، میری پیشانی تیرے ہاتھ میں ہے، مجھ پر تیرا فیصلہ نافذ ہے، مجھ پر تیرا فیصلہ عدل والا ہے۔',
    en: 'O Allah, I am Your servant, son of Your servant, son of Your maidservant. My forelock is in Your hand, Your command over me is forever executed, and Your decree over me is just.',
    ref: 'Musnad Ahmad'
  },
  {
    cat: 'Distress & Protection', title: 'Seeking Refuge from Harm',
    ar: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    ur: 'اللہ کے نام کے ساتھ جس کے نام کے ساتھ زمین و آسمان کی کوئی چیز نقصان نہیں پہنچا سکتی، اور وہ سب کچھ سننے اور جاننے والا ہے۔',
    en: 'In the name of Allah, with whose name nothing on earth or in the heaven can cause harm, and He is the All-Hearing, the All-Knowing.',
    ref: 'Sunan Abi Dawud, At-Tirmidhi'
  },
  {
    cat: 'Forgiveness', title: 'Sayyidul Istighfar (Master of Seeking Forgiveness)',
    ar: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ',
    ur: 'اے اللہ! تو میرا رب ہے، تیرے سوا کوئی معبود نہیں، تو نے مجھے پیدا کیا اور میں تیرا بندہ ہوں، اور میں حسبِ استطاعت تیرے عہد اور وعدے پر قائم ہوں، میں اپنے کیے کی برائی سے تیری پناہ چاہتا ہوں۔',
    en: 'O Allah, You are my Lord, there is no god but You. You created me and I am Your servant, and I hold to Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done.',
    ref: 'Sahih al-Bukhari'
  },
  {
    cat: 'Forgiveness', title: 'Short Seeking of Forgiveness',
    ar: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    ur: 'اے میرے رب! مجھے بخش دے اور میری توبہ قبول فرما، بیشک تو بہت توبہ قبول کرنے والا، رحم فرمانے والا ہے۔',
    en: 'My Lord, forgive me and accept my repentance, for indeed You are the Ever-Accepting of repentance, the Most Merciful.',
    ref: 'Sunan Abi Dawud, At-Tirmidhi'
  },
  {
    cat: 'Sleep', title: 'Before Sleeping',
    ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    ur: 'اے اللہ! تیرے ہی نام کے ساتھ میں مرتا ہوں اور جیتا ہوں۔',
    en: 'In Your name, O Allah, I die and I live.',
    ref: 'Sahih al-Bukhari'
  },
  {
    cat: 'Distress & Protection', title: 'For Ease in Difficulty',
    ar: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
    ur: 'اے اللہ! کوئی چیز آسان نہیں مگر جسے تو آسان کر دے، اور تو جب چاہے مشکل کو بھی آسان بنا دیتا ہے۔',
    en: 'O Allah, nothing is easy except what You make easy, and You make the difficult easy if You wish.',
    ref: 'Ibn Hibban'
  }
];

const DUA_CATS = ['All', ...new Set(DUAS.map(d => d.cat))];

let activeCat = 'All';

function renderDuas() {
  const list = activeCat === 'All' ? DUAS : DUAS.filter(d => d.cat === activeCat);
  $('#duaList').innerHTML = list.map((d, i) => `
    <div class="card dua-card">
      <div class="title">
        <span>${esc(d.title)}</span>
        <button class="copy-btn" data-i="${DUAS.indexOf(d)}">Copy</button>
      </div>
      <div class="ar">${d.ar}</div>
      <div class="ur">${d.ur}</div>
      <div class="en">${esc(d.en)}</div>
      <div class="ref">${esc(d.ref)}</div>
    </div>`).join('');
}

function renderCats() {
  $('#duaCats').innerHTML = DUA_CATS.map(c =>
    `<button class="${c === activeCat ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`
  ).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderCats();
  renderDuas();

  $('#duaCats').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    activeCat = btn.dataset.c;
    renderCats();
    renderDuas();
  });

  $('#duaList').addEventListener('click', e => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const d = DUAS[Number(btn.dataset.i)];
    const text = `${d.ar}\n\n${d.ur}\n\n${d.en}\n(${d.ref})`;
    navigator.clipboard.writeText(text).then(() => {
      const old = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = old; }, 1400);
    }).catch(() => {});
  });
});
