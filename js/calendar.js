(() => {
  const grid=document.getElementById('calendarGrid'), title=document.getElementById('monthTitle'), hijriTitle=document.getElementById('hijriMonthTitle');
  const today=new Date(); let shown=new Date(today.getFullYear(),today.getMonth(),1);
  const fmt=(date,opts,locale='en-US-u-ca-islamic-umalqura')=>new Intl.DateTimeFormat(locale,opts).format(date);
  function hijriParts(date){
    let parts=fmt(date,{day:'numeric',month:'long',year:'numeric'}).split(' ');
    return {day:fmt(date,{day:'numeric'}),month:fmt(date,{month:'long'}),year:fmt(date,{year:'numeric'})};
  }
  function render(){
    const year=shown.getFullYear(), month=shown.getMonth(), first=new Date(year,month,1), count=new Date(year,month+1,0).getDate();
    title.textContent=fmt(first,{month:'long',year:'numeric'},'en-US');
    const hp=hijriParts(new Date(year,month,15)); hijriTitle.textContent='Hijri date on the 15th: '+hp.month+' '+hp.year+' AH';
    grid.innerHTML='';
    for(let i=0;i<first.getDay();i++){const blank=document.createElement('div');blank.className='calendar-day empty';blank.setAttribute('aria-hidden','true');grid.append(blank);}
    for(let day=1;day<=count;day++){
      const date=new Date(year,month,day), h=hijriParts(date), cell=document.createElement('div');
      cell.className='calendar-day'+(date.toDateString()===today.toDateString()?' today':'');
      cell.innerHTML='<span class="greg">'+day+'</span><span class="hijri">'+h.day+' '+h.month+'</span><span class="month-mini">'+h.year+' AH</span>';
      cell.setAttribute('aria-label',fmt(date,{dateStyle:'full'},'en-US')+'; Hijri '+h.day+' '+h.month+' '+h.year);
      grid.append(cell);
    }
    document.getElementById('todayLabel').textContent='Today: '+fmt(today,{dateStyle:'medium'},'en-US')+' / '+fmt(today,{day:'numeric',month:'long',year:'numeric'});
  }
  document.getElementById('prevMonth').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);render();});
  document.getElementById('nextMonth').addEventListener('click',()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);render();});
  render();
})();