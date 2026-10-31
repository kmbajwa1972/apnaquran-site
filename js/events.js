(() => {
  const list=document.getElementById('eventsList');
  const names={1:{10:'Day of Ashura'},3:{12:'Mawlid an-Nabi (observance varies)'},7:{10:'Day of Ashura? '},8:{15:'Mid-Sha‘ban (observance varies)'},9:{1:'First day of Ramadan',17:'Battle of Badr (traditional date)',21:'Last ten nights of Ramadan begin (approx.)'},10:{1:'Eid al-Fitr'},12:{9:'Day of Arafah',10:'Eid al-Adha'}};
  const events=[
    {m:1,d:1,name:'Islamic New Year',note:'Beginning of Muharram'},
    {m:1,d:10,name:'Day of Ashura',note:'10 Muharram'},
    {m:3,d:12,name:'Mawlid an-Nabi',note:'12 Rabi al-Awwal; observance differs among communities'},
    {m:7,d:27,name:'Isra and Mi‘raj',note:'27 Rajab; commonly commemorated by some communities'},
    {m:8,d:15,name:'Mid-Sha‘ban',note:'15 Sha‘ban; observance and practices vary'},
    {m:9,d:1,name:'First day of Ramadan',note:'Subject to local moon sighting'},
    {m:9,d:17,name:'Battle of Badr',note:'17 Ramadan, traditional date'},
    {m:9,d:21,name:'Last ten nights of Ramadan',note:'Seek Laylat al-Qadr throughout these nights'},
    {m:10,d:1,name:'Eid al-Fitr',note:'Subject to local moon sighting'},
    {m:12,d:9,name:'Day of Arafah',note:'9 Dhul-Hijjah'},
    {m:12,d:10,name:'Eid al-Adha',note:'10 Dhul-Hijjah; subject to local moon sighting'}
  ];
  function hijri(date){const p=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'}).formatToParts(date);const o={};p.forEach(x=>o[x.type]=x.value);return {d:+o.day,m:+o.month,y:+o.year};}
  const start=new Date();start.setHours(0,0,0,0);const found=[];
  for(let i=0;i<390;i++){const date=new Date(start);date.setDate(start.getDate()+i);const h=hijri(date);for(const e of events){if(h.m===e.m&&h.d===e.d)found.push({...e,date:new Date(date),hy:h.y});}}
  found.sort((a,b)=>a.date-b.date);
  if(!found.length){list.innerHTML='<p class="empty">Could not calculate upcoming dates in this browser.</p>';return;}
  list.innerHTML=found.map(e=>'<article class="event-item card"><div class="event-date"><b>'+e.date.getDate()+'</b><small>'+e.date.toLocaleString('en',{month:'short'})+'</small></div><div class="event-info"><h2>'+e.name+'</h2><p class="event-hijri">'+e.d+' / '+e.m+' / '+e.hy+' AH</p><p>'+e.note+'</p><p>'+e.date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})+'</p></div></article>').join('');
})();