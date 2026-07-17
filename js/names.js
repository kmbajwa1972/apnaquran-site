/* ============================================================
   AL-QURAN — 99 Names of Allah (Asma-ul-Husna)
   ============================================================ */

const NAMES99 = [
  ['اَلرَّحْمَٰن','Ar-Rahman','The Most Merciful','نہایت رحم کرنے والا'],
  ['اَلرَّحِيم','Ar-Raheem','The Most Compassionate','بہت رحم فرمانے والا'],
  ['اَلْمَلِك','Al-Malik','The King, the Sovereign','بادشاہِ حقیقی'],
  ['اَلْقُدُّوس','Al-Quddus','The Most Sacred, Free of flaw','ہر عیب سے پاک'],
  ['اَلسَّلَام','As-Salam','The Source of Peace','سلامتی دینے والا'],
  ['اَلْمُؤْمِن','Al-Mu\'min','The Giver of Faith and Safety','امن دینے والا'],
  ['اَلْمُهَيْمِن','Al-Muhaymin','The Guardian, the Overseer','نگہبان'],
  ['اَلْعَزِيز','Al-Aziz','The Almighty, the Honoured','غالب، عزت والا'],
  ['اَلْجَبَّار','Al-Jabbar','The Compeller, the Restorer','زبردست، اصلاح کرنے والا'],
  ['اَلْمُتَكَبِّر','Al-Mutakabbir','The Supreme in Greatness','بڑائی والا'],
  ['اَلْخَالِق','Al-Khaliq','The Creator','پیدا کرنے والا'],
  ['اَلْبَارِئ','Al-Bari\'','The Maker, the Evolver','بغیر نمونے کے بنانے والا'],
  ['اَلْمُصَوِّر','Al-Musawwir','The Fashioner of Forms','صورت بنانے والا'],
  ['اَلْغَفَّار','Al-Ghaffar','The Ever-Forgiving','بار بار بخشنے والا'],
  ['اَلْقَهَّار','Al-Qahhar','The All-Subduer','ہر چیز پر غالب'],
  ['اَلْوَهَّاب','Al-Wahhab','The Bestower of Gifts','بے حساب عطا کرنے والا'],
  ['اَلرَّزَّاق','Ar-Razzaq','The Provider of Sustenance','رزق دینے والا'],
  ['اَلْفَتَّاح','Al-Fattah','The Opener, the Judge','فیصلہ کرنے والا، کھولنے والا'],
  ['اَلْعَلِيم','Al-\'Alim','The All-Knowing','سب کچھ جاننے والا'],
  ['اَلْقَابِض','Al-Qabid','The Withholder, the Constrictor','روزی تنگ کرنے والا'],
  ['اَلْبَاسِط','Al-Basit','The Extender, the Expander','روزی کشادہ کرنے والا'],
  ['اَلْخَافِض','Al-Khafid','The Abaser','پست کرنے والا'],
  ['اَلرَّافِع','Ar-Rafi\'','The Exalter','بلند کرنے والا'],
  ['اَلْمُعِزّ','Al-Mu\'izz','The Giver of Honour','عزت دینے والا'],
  ['اَلْمُذِلّ','Al-Mudhill','The Giver of Dishonour','ذلت دینے والا'],
  ['اَلسَّمِيع','As-Sami\'','The All-Hearing','سب کچھ سننے والا'],
  ['اَلْبَصِير','Al-Basir','The All-Seeing','سب کچھ دیکھنے والا'],
  ['اَلْحَكَم','Al-Hakam','The Judge, the Arbitrator','فیصلہ کرنے والا'],
  ['اَلْعَدْل','Al-\'Adl','The Utterly Just','انصاف کرنے والا'],
  ['اَللَّطِيف','Al-Latif','The Subtle, the Most Gentle','باریک بین، مہربان'],
  ['اَلْخَبِير','Al-Khabir','The All-Aware','ہر بات سے باخبر'],
  ['اَلْحَلِيم','Al-Halim','The Most Forbearing','بردبار'],
  ['اَلْعَظِيم','Al-\'Azim','The Magnificent, the Supreme','عظمت والا'],
  ['اَلْغَفُور','Al-Ghafur','The Great Forgiver','بہت بخشنے والا'],
  ['اَلشَّكُور','Ash-Shakur','The Most Appreciative','قدر دان'],
  ['اَلْعَلِيّ','Al-\'Aliyy','The Most High','بلند و برتر'],
  ['اَلْكَبِير','Al-Kabir','The Most Great','سب سے بڑا'],
  ['اَلْحَفِيظ','Al-Hafiz','The Preserver, the Protector','حفاظت کرنے والا'],
  ['اَلْمُقِيت','Al-Muqit','The Sustainer, the Nourisher','روزی رساں'],
  ['اَلْحسِيب','Al-Hasib','The Reckoner','حساب لینے والا'],
  ['اَلْجَلِيل','Al-Jalil','The Majestic','جلال والا'],
  ['اَلْكَرِيم','Al-Karim','The Most Generous, the Noble','بہت کرم کرنے والا'],
  ['اَلرَّقِيب','Ar-Raqib','The Watchful','نگہبان، دیکھنے والا'],
  ['اَلْمُجِيب','Al-Mujib','The Responsive, the Answerer','دعائیں قبول کرنے والا'],
  ['اَلْوَاسِع','Al-Wasi\'','The All-Encompassing, the Boundless','وسعت والا'],
  ['اَلْحَكِيم','Al-Hakim','The Perfectly Wise','حکمت والا'],
  ['اَلْوَدُود','Al-Wadud','The Most Loving','محبت کرنے والا'],
  ['اَلْمَجِيد','Al-Majid','The Glorious, the Most Honourable','بزرگی والا'],
  ['اَلْبَاعِث','Al-Ba\'ith','The Resurrector, the Infuser of New Life','دوبارہ زندہ کرنے والا'],
  ['اَلشَّهِيد','Ash-Shahid','The All-Observing Witness','ہر چیز کا گواہ'],
  ['اَلْحَقّ','Al-Haqq','The Absolute Truth','حق، سچائی'],
  ['اَلْوَكِيل','Al-Wakil','The Trustee, the Disposer of Affairs','کارساز'],
  ['اَلْقَوِيّ','Al-Qawiyy','The All-Strong','زبردست قوت والا'],
  ['اَلْمَتِين','Al-Matin','The Firm, the Steadfast','مضبوط، پائیدار'],
  ['اَلْوَلِيّ','Al-Waliyy','The Protecting Friend','دوست، مددگار'],
  ['اَلْحَمِيد','Al-Hamid','The Praiseworthy','ہر تعریف کے لائق'],
  ['اَلْمُحْصِي','Al-Muhsi','The All-Enumerating','سب کچھ گننے والا'],
  ['اَلْمُبْدِئ','Al-Mubdi\'','The Originator','پہلی بار پیدا کرنے والا'],
  ['اَلْمُعِيد','Al-Mu\'id','The Restorer, who Brings Back','دوبارہ پیدا کرنے والا'],
  ['اَلْمُحْيِي','Al-Muhyi','The Giver of Life','زندگی دینے والا'],
  ['اَلْمُمِيت','Al-Mumit','The Bringer of Death','موت دینے والا'],
  ['اَلْحَيّ','Al-Hayy','The Ever-Living','ہمیشہ زندہ رہنے والا'],
  ['اَلْقَيُّوم','Al-Qayyum','The Self-Subsisting, Sustainer of All','قائم رکھنے والا'],
  ['اَلْوَاجِد','Al-Wajid','The Perceiver, the Finder','پانے والا'],
  ['اَلْمَاجِد','Al-Majid','The Illustrious, the Noble','بزرگی والا'],
  ['اَلْوَاحِد','Al-Wahid','The One, the Unique','اکیلا، یکتا'],
  ['اَلصَّمَد','As-Samad','The Eternal, the Self-Sufficient','بے نیاز'],
  ['اَلْقَادِر','Al-Qadir','The All-Powerful','قدرت والا'],
  ['اَلْمُقْتَدِر','Al-Muqtadir','The Creator of All Power','ہر قدرت پر غالب'],
  ['اَلْمُقَدِّم','Al-Muqaddim','The Expediter, who Brings Forward','آگے کرنے والا'],
  ['اَلْمُؤَخِّر','Al-Mu\'akhkhir','The Delayer, who Puts Far Away','پیچھے کرنے والا'],
  ['اَلْأَوَّل','Al-Awwal','The First','سب سے پہلے'],
  ['اَلْآخِر','Al-Akhir','The Last','سب سے آخر'],
  ['اَلظَّاهِر','Az-Zahir','The Manifest, the Evident','ظاہر ہونے والا'],
  ['اَلْبَاطِن','Al-Batin','The Hidden, the All-Encompassing','پوشیدہ'],
  ['اَلْوَالِي','Al-Wali','The Governor, the Sole Ruler','حاکم، تصرف کرنے والا'],
  ['اَلْمُتَعَالِي','Al-Muta\'ali','The Self-Exalted','بلند و برتر'],
  ['اَلْبَرّ','Al-Barr','The Source of All Goodness','بھلائی کرنے والا'],
  ['اَلتَّوَّاب','At-Tawwab','The Ever-Accepting of Repentance','توبہ قبول کرنے والا'],
  ['اَلْمُنْتَقِم','Al-Muntaqim','The Avenger','بدلہ لینے والا'],
  ['اَلْعَفُوّ','Al-\'Afuww','The Pardoner','معاف کرنے والا'],
  ['اَلرَّؤُوف','Ar-Ra\'uf','The Most Kind','بہت مہربان'],
  ['مَالِكُ الْمُلْك','Malik-ul-Mulk','Owner of All Sovereignty','ملک کا مالک'],
  ['ذُو الْجَلَالِ وَالْإِكْرَام','Dhul-Jalali-wal-Ikram','Lord of Majesty and Generosity','جلال اور کرم والا'],
  ['اَلْمُقْسِط','Al-Muqsit','The Equitable, the Requiter','انصاف والا'],
  ['اَلْجَامِع','Al-Jami\'','The Gatherer, the Uniter','جمع کرنے والا'],
  ['اَلْغَنِيّ','Al-Ghaniyy','The Self-Sufficient, the Wealthy','بے نیاز، غنی'],
  ['اَلْمُغْنِي','Al-Mughni','The Enricher','بے نیاز کرنے والا'],
  ['اَلْمَانِع','Al-Mani\'','The Preventer of Harm','روکنے والا'],
  ['اَلضَّارّ','Ad-Darr','The Bringer of Adversity (by His wisdom)','نقصان پہنچانے والا'],
  ['اَلنَّافِع','An-Nafi\'','The Bringer of Benefit','نفع دینے والا'],
  ['اَلنُّور','An-Nur','The Light','نور، روشنی'],
  ['اَلْهَادِي','Al-Hadi','The Guide','ہدایت دینے والا'],
  ['اَلْبَدِيع','Al-Badi\'','The Incomparable Originator','انوکھی چیزیں بنانے والا'],
  ['اَلْبَاقِي','Al-Baqi','The Everlasting','ہمیشہ باقی رہنے والا'],
  ['اَلْوَارِث','Al-Warith','The Ultimate Inheritor','سب کا وارث'],
  ['اَلرَّشِيد','Ar-Rashid','The Guide to the Right Path','راہ دکھانے والا'],
  ['اَلصَّبُور','As-Sabur','The Most Patient','بہت صبر کرنے والا'],
  ['اَلْأَحَد','Al-Ahad','The One and Only','یکتا، اکیلا']
];

function renderNames() {
  const grid = $('#namesGrid');
  const html = NAMES99.map((n, i) => `
    <div class="card name-card" data-i="${i}">
      <div class="n">${i + 1}</div>
      <div class="ar">${n[0]}</div>
      <div class="translit">${esc(n[1])}</div>
      <div class="meaning-en">${esc(n[2])}</div>
    </div>`).join('');
  grid.innerHTML = html;
  grid.addEventListener('click', e => {
    const card = e.target.closest('.name-card');
    if (card) openModal(Number(card.dataset.i));
  });
}

function openModal(i) {
  const n = NAMES99[i];
  const modal = $('#nameModal');
  modal.querySelector('.n').textContent = i + 1;
  modal.querySelector('.ar').textContent = n[0];
  modal.querySelector('.translit').textContent = n[1];
  modal.querySelector('.meaning-en').textContent = n[2];
  modal.querySelector('.meaning-ur').textContent = n[3];
  modal.classList.add('open');
}
function closeModal() { $('#nameModal').classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  renderNames();
  $('#nameModal .backdrop').addEventListener('click', closeModal);
  $('#nameModal .close').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  const search = $('#nameSearch');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    $$('.name-card').forEach(card => {
      const i = Number(card.dataset.i);
      const n = NAMES99[i];
      const hit = !q || n[1].toLowerCase().includes(q) || n[2].toLowerCase().includes(q);
      card.style.display = hit ? '' : 'none';
    });
  });
});
