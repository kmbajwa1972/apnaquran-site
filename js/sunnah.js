(() => {
  const $ = id => document.getElementById(id);
  const collection=$('collectionSelect'), language=$('languageSelect'), search=$('hadithSearch');
  const results=$('sunnahResults'), status=$('sunnahStatus'), prev=$('prevHadith'), next=$('nextHadith'), label=$('pageLabel');
  const names={bukhari:'Sahih al-Bukhari',muslim:'Sahih Muslim',abudawud:'Sunan Abu Dawud',tirmidhi:"Jami' at-Tirmidhi",nasai:"Sunan an-Nasa'i",ibnmajah:'Sunan Ibn Majah'};
  let entries=[], filtered=[], start=0, arabicByNumber=new Map(), loadToken=0;
  const PAGE=20;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function fetchJson(url){const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
  async function fetchEdition(code){
    const base='https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/'+code;
    try{return await fetchJson(base+'.min.json');}
    catch{return await fetchJson(base+'.json');}
  }
  function textOf(h){return h?.text||h?.hadith||h?.body||'';}
  function idOf(h,i){return h?.hadithnumber??h?.hadithNumber??h?.number??i+1;}
  function render(){
    const slice=filtered.slice(start,start+PAGE);
    results.innerHTML=slice.map((h,i)=>{
      const absoluteIndex=start+i, n=idOf(h,absoluteIndex), txt=textOf(h);
      const book=h.reference?.book??h.book??'';
      const ref=h.reference?.hadith??h.reference?.hadithnumber??n;
      const grades=h.grades;
      const gradesText=Array.isArray(grades)?grades.map(g=>[g.name||g.scholar||g.grade,g.grade||g.status].filter(Boolean).join(': ')).filter(Boolean).join(' · '):'';
      const pairedArabic=language.value==='urd'?arabicByNumber.get(String(n)):'';
      const arabicBlock=language.value==='urd'
        ? '<div class="hadith-language-label" lang="en">Arabic original</div><div class="hadith-text hadith-arabic" lang="ar" dir="rtl">'+(pairedArabic?esc(textOf(pairedArabic)):'Arabic text is not available for this Hadith in the selected source edition.')+'</div>'
        : '';
      const urduBlock=language.value==='urd'
        ? '<div class="hadith-language-label" lang="en">اردو ترجمہ</div><div class="hadith-text hadith-urdu" lang="ur" dir="rtl">'+esc(txt)+'</div>'
        : '<div class="hadith-text '+(language.value==='ara'?'hadith-arabic':'')+'" lang="'+(language.value==='ara'?'ar':'en')+'" dir="'+(language.value==='ara'?'rtl':'ltr')+'">'+esc(txt)+'</div>';
      return '<article class="card hadith-card"><div class="hadith-meta"><span>'+esc(names[collection.value])+' · Hadith '+esc(n)+'</span><span>'+esc(book?'Book '+book:'Reference '+ref)+'</span></div>'+arabicBlock+urduBlock+(gradesText?'<div class="hadith-gradings">Grading notes: '+esc(gradesText)+'</div>':'')+'</article>';
    }).join('')||'<div class="card hadith-card">No Hadith entries found for this search.</div>';
    prev.disabled=start===0;next.disabled=start+PAGE>=filtered.length;
    label.textContent=filtered.length?((start+1)+'–'+Math.min(start+PAGE,filtered.length)+' of '+filtered.length):'No results';
  }
  function applySearch(){
    const q=search.value.trim().toLocaleLowerCase();
    filtered=!q?entries:entries.filter((h,i)=>{
      const n=String(idOf(h,i));
      const arabic=language.value==='urd'?textOf(arabicByNumber.get(n)):'';
      return String(textOf(h)).toLocaleLowerCase().includes(q)||n.includes(q)||String(arabic).toLocaleLowerCase().includes(q);
    });
    start=0;render();
  }
  async function load(){
    const token=++loadToken;
    const selectedLanguage=language.value, selectedCollection=collection.value;
    status.textContent='Loading '+names[selectedCollection]+'…';results.innerHTML='';label.textContent='Loading…';
    try{
      const data=await fetchEdition(selectedLanguage+'-'+selectedCollection);
      let arabicData=null;
      if(selectedLanguage==='urd') arabicData=await fetchEdition('ara-'+selectedCollection);
      if(token!==loadToken)return;
      entries=Array.isArray(data.hadiths)?data.hadiths:Array.isArray(data)?data:[];
      arabicByNumber=new Map();
      if(arabicData&&Array.isArray(arabicData.hadiths)){
        arabicData.hadiths.forEach((h,i)=>arabicByNumber.set(String(idOf(h,i)),h));
      }
      filtered=entries;start=0;search.value='';
      if(!entries.length)throw new Error('This edition returned no Hadith entries.');
      const languageLabel=selectedLanguage==='urd'?'Arabic original + Urdu translation':language.options[language.selectedIndex].text;
      status.textContent=names[selectedCollection]+' · '+languageLabel+' · '+entries.length.toLocaleString()+' Hadith entries';
      render();
    }catch(e){
      if(token!==loadToken)return;
      status.textContent='Could not load this edition. Please check your connection and try again.';
      results.innerHTML='<div class="sunnah-error">'+esc(e.message)+'</div>';label.textContent='Not loaded';
    }
  }
  $('loadCollection').addEventListener('click',load);
  collection.addEventListener('change',()=>{entries=[];filtered=[];arabicByNumber.clear();results.innerHTML='';status.textContent='Choose a language and load '+names[collection.value]+'.';label.textContent='No collection loaded';prev.disabled=next.disabled=true;});
  language.addEventListener('change',()=>{entries=[];filtered=[];arabicByNumber.clear();results.innerHTML='';status.textContent='Load '+names[collection.value]+' in '+(language.value==='urd'?'Arabic + Urdu':language.options[language.selectedIndex].text)+'.';label.textContent='No collection loaded';prev.disabled=next.disabled=true;});
  search.addEventListener('input',applySearch);
  prev.addEventListener('click',()=>{start=Math.max(0,start-PAGE);render();window.scrollTo({top:results.offsetTop-90,behavior:'smooth'});});
  next.addEventListener('click',()=>{start=Math.min(Math.max(0,filtered.length-PAGE),start+PAGE);render();window.scrollTo({top:results.offsetTop-90,behavior:'smooth'});});
})();