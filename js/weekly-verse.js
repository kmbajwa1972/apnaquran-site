/* Weekly Verse Publisher — local-first manual publishing prototype.
   Uses the Quran API and edition preferences used by the homepage.
   Does not modify the homepage or talking assistant. */
(function(){
'use strict';
const STORE_KEY='aq_weekly_publisher_v1', GROUP_KEY='aq_weekly_publisher_groups_v1', LOG_KEY='aq_weekly_publisher_log_v1', MODE_KEY='aq_weekly_publisher_mode_v1';
const TEST_GROUP={name:'Test group',url:'https://www.facebook.com/groups/1562114467374982'};
const $=s=>document.querySelector(s);
const mondayKey=(date=new Date())=>{const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{$('#groupStatus').textContent='Browser storage is unavailable or full. Your changes were not saved.';return false}};
let currentAyah=null, weekly=read(STORE_KEY,null), groups=read(GROUP_KEY,[TEST_GROUP]), log=read(LOG_KEY,[]), mode=read(MODE_KEY,'daily');
if(mode!=='all-today')mode='daily';
if(!Array.isArray(groups))groups=[TEST_GROUP]; if(!Array.isArray(log))log=[];
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dailyAyahNumber(){const d=new Date(),start=new Date(d.getFullYear(),0,0);return(Math.floor((d-start)/864e5)%6236)+1}
async function fetchAyah(){
 const settings=Object.assign({urdu:'ur.jalandhry',english:'en.sahih'},read('aq_settings',{}));
 const n=dailyAyahNumber(),response=await fetch('https://api.alquran.cloud/v1/ayah/'+n+'/editions/quran-uthmani,'+encodeURIComponent(settings.urdu)+','+encodeURIComponent(settings.english));
 if(!response.ok)throw new Error('Quran source returned HTTP '+response.status);
 const json=await response.json();if(json.code!==200||!Array.isArray(json.data)||json.data.length<3)throw new Error('Quran source response was incomplete');
 const [ar,ur,en]=json.data;
 currentAyah={arabic:ar.text,urdu:ur.text,english:en.text,surah:ar.surah.englishName,surahNumber:ar.surah.number,ayahNumber:ar.numberInSurah,urduEdition:settings.urdu,englishEdition:settings.english,sourceAyahNumber:n};
 renderVerse(currentAyah);
}
function renderVerse(v){$('#versePreview').innerHTML='<div class="v-ar" lang="ar" dir="rtl">'+escapeHtml(v.arabic)+'</div><div class="v-ur" lang="ur" dir="rtl">'+escapeHtml(v.urdu)+'</div><div class="v-en">'+escapeHtml(v.english)+'</div><div class="v-ref">'+escapeHtml(v.surah)+' ('+v.surahNumber+':'+v.ayahNumber+')</div>'}
function activeWeekly(){return weekly&&weekly.weekKey===mondayKey()}
function postText(){const v=activeWeekly()?weekly.verse:currentAyah;if(!v)return '';const intro=$('#postIntro').value.trim(),link=$('#postLink').value.trim()||'https://apnaquran.com/';return(intro?intro+'\n\n':'')+v.arabic+'\n\n'+v.urdu+'\n\n'+v.english+'\n\n— '+v.surah+' ('+v.surahNumber+':'+v.ayahNumber+')\n\nRead the Quran on ApnaQuran: '+link}
function dayIndex(){return Math.floor((Date.now()-new Date(mondayKey()+'T00:00:00').getTime())/864e5)}
function suggestedIndex(){
 if(!groups.length)return 0;
 if(mode==='all-today'){
   const today=new Date().toLocaleDateString();
   const done=new Set(log.filter(item=>item.weekKey===mondayKey()&&item.dayKey===today).map(item=>item.groupUrl||item.url));
   const next=groups.findIndex(g=>!done.has(g.url));
   return next>=0?next:0;
 }
 return dayIndex()%groups.length
}
function selectedGroup(){const id=$('#todayGroup').value;return groups.find(g=>g.id===id)||groups[suggestedIndex()]||TEST_GROUP}
function renderGroups(){
 const list=$('#groupList'),select=$('#todayGroup'),previous=select.value;
 list.innerHTML=groups.length?groups.map(g=>'<div class="group-item"><div><strong>'+escapeHtml(g.name)+'</strong><br><small>'+escapeHtml(g.url)+'</small></div><button class="btn remove-group" type="button" data-id="'+escapeHtml(g.id)+'" aria-label="Remove '+escapeHtml(g.name)+'">Remove</button></div>').join(''):'<p class="muted">No groups saved yet. Add a group above.</p>';
 select.innerHTML=groups.map(g=>'<option value="'+escapeHtml(g.id)+'">'+escapeHtml(g.name)+'</option>').join('');
 if(groups.length)select.value=(groups.some(g=>g.id===previous)?previous:groups[suggestedIndex()].id);
 if($('#publishingMode'))$('#publishingMode').value=mode;
 if($('#modeStatus'))$('#modeStatus').textContent=mode==='all-today'?'All groups today: after each manual post, mark it below and the next uncompleted group will be selected.':'Daily rotation: one suggested group per day, rotating through your saved list.';
 list.querySelectorAll('.remove-group').forEach(btn=>btn.addEventListener('click',()=>{groups=groups.filter(g=>g.id!==btn.dataset.id);write(GROUP_KEY,groups);renderGroups();$('#groupStatus').textContent='Group removed from this browser.'}));
}
function renderStatus(){const active=activeWeekly();$('#weekStatus').textContent=active?'Saved for week beginning '+weekly.weekKey+' · snapshot unchanged':'No saved post for the current week yet.';if(active){renderVerse(weekly.verse);$('#postIntro').value=weekly.intro||'';$('#postLink').value=weekly.link||'https://apnaquran.com/'}renderLog();renderGroups()}
function renderLog(){const host=$('#logList');if(!log.length){host.innerHTML='<p class="muted">No attempts logged yet.</p>';return}host.innerHTML=log.slice(-100).reverse().map(item=>'<div class="log-item"><div><strong>'+escapeHtml(item.groupName)+'</strong><br><small>'+escapeHtml(item.date)+' · '+escapeHtml(item.surahRef||'Weekly verse')+'</small></div><div><strong>'+escapeHtml(item.status)+'</strong><br><small>'+escapeHtml(item.url)+'</small></div></div>').join('')}
function saveGroup(){
 const name=$('#groupName').value.trim()||'Facebook Group',url=$('#groupUrl').value.trim();
 try{const parsed=new URL(url);if(parsed.protocol!=='https:'||!/(^|\.)facebook\.com$/i.test(parsed.hostname)||!parsed.pathname.includes('/groups/'))throw new Error()}
 catch{$('#groupStatus').textContent='Please enter a valid Facebook Group URL.';return}
 const existing=groups.find(g=>g.url===url);if(existing){existing.name=name}else{groups.push({id:'g'+Date.now().toString(36),name,url})}
 if(!write(GROUP_KEY,groups))return;renderGroups();$('#groupStatus').textContent=mode==='all-today'?'Group saved in this browser. You can work through all groups today.':'Group saved in this browser. Suggested groups rotate daily.';$('#groupName').value='';$('#groupUrl').value='';
}
function saveWeek(){if(!currentAyah){$('#copyStatus').textContent='The verse is not loaded yet.';return}weekly={weekKey:mondayKey(),savedAt:new Date().toISOString(),verse:currentAyah,intro:$('#postIntro').value.trim(),link:$('#postLink').value.trim()||'https://apnaquran.com/'};if(!write(STORE_KEY,weekly))return;renderStatus();$('#copyStatus').textContent='Saved. This verse snapshot remains the weekly post until you save a new one next week.'}
async function copyPost(){if(!activeWeekly()){saveWeek();if(!activeWeekly())return}try{await navigator.clipboard.writeText(postText());$('#copyStatus').textContent='Weekly post copied. Open the selected group and paste it into Facebook.'}catch{$('#copyStatus').textContent='Clipboard access was blocked. Try using the site over HTTPS, then copy again.'}}
function openGroup(){const g=selectedGroup();if(!g){$('#groupStatus').textContent='Add a Facebook group first.';return}window.open(g.url,'_blank','noopener,noreferrer')}
function markPosted(){if(!activeWeekly()){$('#groupStatus').textContent='Save this week’s verse first.';return}const g=selectedGroup();if(!g){$('#groupStatus').textContent='Add a Facebook group first.';return}
 const today=new Date().toLocaleDateString();
 if(log.some(item=>item.weekKey===weekly.weekKey&&(item.dayKey===today||(!item.dayKey&&item.date&&item.date.startsWith(today)))&&(item.groupUrl||item.url)===g.url)){$('#groupStatus').textContent='This group is already marked for today. Select another group or check the log.';return}
 log.push({date:new Date().toLocaleString(),dayKey:today,groupName:g.name,url:g.url,groupUrl:g.url,status:'Marked posted manually',surahRef:weekly.verse.surah+' '+weekly.verse.surahNumber+':'+weekly.verse.ayahNumber,weekKey:weekly.weekKey});if(log.length>100)log=log.slice(-100);if(!write(LOG_KEY,log))return;renderLog();$('#groupStatus').textContent='Logged as manually posted. This is your confirmation; Facebook publishing is not automatically verified.'}
$('#generateBtn').addEventListener('click',async()=>{try{await fetchAyah();$('#copyStatus').textContent='Loaded today’s verse from the Quran source. Save it to make it this week’s post.'}catch(e){$('#versePreview').innerHTML='<p class="muted">Could not load the verse: '+escapeHtml(e.message)+'. Please try again.</p>'}});
$('#publishingMode').addEventListener('change',()=>{mode=$('#publishingMode').value==='all-today'?'all-today':'daily';write(MODE_KEY,mode);renderGroups();$('#groupStatus').textContent=mode==='all-today'?'All-groups mode selected. Post manually to each group, then mark each one.':'Daily rotation mode selected.';});
$('#saveWeekBtn').addEventListener('click',saveWeek);$('#copyBtn').addEventListener('click',copyPost);$('#saveGroupBtn').addEventListener('click',saveGroup);$('#clearGroupFormBtn').addEventListener('click',()=>{$('#groupName').value='';$('#groupUrl').value=''});$('#openGroupBtn').addEventListener('click',openGroup);$('#markPostedBtn').addEventListener('click',markPosted);
(async function init(){if(!groups.length)groups=[TEST_GROUP];if(!groups.some(g=>g.id))groups=groups.map((g,i)=>({...g,id:'g'+i}));write(GROUP_KEY,groups);renderStatus();try{await fetchAyah();if(activeWeekly())renderStatus()}catch(e){$('#versePreview').innerHTML='<p class="muted">Could not load today’s verse. Check your connection and try Generate / refresh.</p>'}})();
})();