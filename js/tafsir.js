(() => {
  const surah=document.getElementById('surahNumber'), ayah=document.getElementById('ayahNumber');
  function open(resource){const s=Math.min(114,Math.max(1,Number(surah.value)||1));const a=Math.min(286,Math.max(1,Number(ayah.value)||1));window.open('https://quran.com/'+s+':'+a+'/tafsirs/'+resource,'_blank','noopener');}
  document.getElementById('openIbn').addEventListener('click',()=>open(169));
  document.getElementById('openMaarif').addEventListener('click',()=>open(168));
  document.getElementById('openIbnUrdu').addEventListener('click',()=>{const s=Math.min(114,Math.max(1,Number(surah.value)||1));const a=Math.max(1,Number(ayah.value)||1);window.open('https://quran.com/ur/'+s+':'+a+'/tafsirs/tafseer-ibn-e-kaseer-urdu','_blank','noopener');});
})();