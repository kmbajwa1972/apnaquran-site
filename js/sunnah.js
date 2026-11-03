(() => {
  const $ = id => document.getElementById(id);
  const collection=$('collectionSelect'), language=$('languageSelect'), search=$('hadithSearch');
  const results=$('sunnahResults'), status=$('sunnahStatus'), prev=$('prevHadith'), next=$('nextHadith'), label=$('pageLabel');
  const names={bukhari:'Sahih al-Bukhari',muslim:'Sahih Muslim',abudawud:'Sunan Abu Dawud',tirmidhi:"Jami' at-Tirmidhi",nasai:"Sunan an-Nasa'i",ibnmajah:'Sunan Ibn Majah'};
  let entries=[], filtered=[], start=0, edition=null, loadToken=0;
  const PAGE=20;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function fetchJson(url){const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
  function textOf(h){return h.text||h.hadith||h.body||'';}
  function idOf(h,i){return h.hadithnumber??h.hadithNumber??h.number??i+1;}
  function render(){
    const slice=filtered.slice(start,start+PAGE);
    results.innerHTML=slice.map((h,i)=>{
      const n=idOf(h,start+i), txt=textOf(h);
      const book=h.reference?.book??h.book??'';
      const ref=h.reference?.hadith??h.reference?.hadithnumber??n;
      const grade=h.grades;
      const grades=Array.isArray(grade)?grade.map(g=>[g.name||g.scholar||g.grade,g.grade||g.status].filter(Boolean).join(': ')).filter(Boolean).join(' · '):'';
      return '<article class="card hadith-card"><div class="hadith-meta"><span>'+esc(names[collection.value])+' · Hadith '+esc(n)+'</span><span>'+esc(book?'Book '+book:'Reference '+ref)+'</span></div><div class="hadith-text" lang="'+(language.value==='ara'?'ar':language.value==='urd'?'ur':'en')+'" dir="'+(language.value==='ara'||language.value==='urd'?'rtl':'ltr')+'">'+esc(txt)+'</div>'+(grades?'<div class="hadith-gradings">Grading notes: '+esc(grades)+'</div>':'')+'</article>';
    }).join('')||'<div class="card hadith-card">No Hadith entries found for this search.</div>';
    prev.disabled=start===0;next.disabled=start+PAGE>=filtered.length;
    label.textContent=filtered.length?((start+1)+'–'+Math.min(start+PAGE,filtered.length)+' of '+filtered.length):'No results';
  }
  function applySearch(){const q=search.value.trim().toLocaleLowerCase();filtered=!q?entries:entries.filter(h=>String(textOf(h)).toLocaleLowerCase().includes(q)||String(idOf(h,0)).includes(q));start=0;render();}
  async function load(){
    const token=++loadToken;status.textContent='Loading '+names[collection.value]+'…';results.innerHTML='';label.textContent='Loading…';
    const code=language.value+'-'+collection.value;
    const base='https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/'+code+'.min.json';
    try{
      let data;
      try{data=await fetchJson(base);}catch{data=await fetchJson(base.replace('.min.json','.json'));}
      if(token!==loadToken)return;
      edition=data.metadata||data.meta||{};
      entries=Array.isArray(data.hadiths)?data.hadiths:Array.isArray(data)?data:[];
      filtered=entries;start=0;search.value='';
      if(!entries.length)throw new Error('This edition returned no Hadith entries.');
      status.textContent=names[collection.value]+' · '+language.options[language.selectedIndex].text+' · '+entries.length.toLocaleString()+' Hadith entries';
      render();
    }catch(e){if(token!==loadToken)return;status.textContent='Could not load this edition. Please check your connection and try again.';results.innerHTML='<div class="sunnah-error">'+esc(e.message)+'</div>';label.textContent='Not loaded';}
  }
  $('loadCollection').addEventListener('click',load);
  collection.addEventListener('change',()=>{entries=[];filtered=[];results.innerHTML='';status.textContent='Choose a language and load '+names[collection.value]+'.';label.textContent='No collection loaded';prev.disabled=next.disabled=true;});
  language.addEventListener('change',()=>{entries=[];filtered=[];results.innerHTML='';status.textContent='Load '+names[collection.value]+' in '+language.options[language.selectedIndex].text+'.';label.textContent='No collection loaded';prev.disabled=next.disabled=true;});
  search.addEventListener('input',applySearch);
  prev.addEventListener('click',()=>{start=Math.max(0,start-PAGE);render();window.scrollTo({top:results.offsetTop-90,behavior:'smooth'});});
  next.addEventListener('click',()=>{start=Math.min(Math.max(0,filtered.length-PAGE),start+PAGE);render();window.scrollTo({top:results.offsetTop-90,behavior:'smooth'});});
})();