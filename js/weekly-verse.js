/* Weekly Verse Publisher — local-first manual publishing prototype.
   Quran text is fetched from the same API/edition configuration as the homepage.
   This module does not modify the homepage or talking assistant. */
(function(){
'use strict';
const STORE_KEY='aq_weekly_publisher_v1';
const GROUP_KEY='aq_weekly_publisher_groups_v1';
const LOG_KEY='aq_weekly_publisher_log_v1';
const TEST_GROUP={name:'Test group',url:'https://www.facebook.com/groups/1562114467374982'};
const $=s=>document.querySelector(s);
const mondayKey=(date=new Date())=>{const d=new Date(date);d.setHours(0,0,0,0);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
let currentAyah=null;
let weekly=read(STORE_KEY,null);
let groups=read(GROUP_KEY,[TEST_GROUP]);
let log=read(LOG_KEY,[]);
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dailyAyahNumber(){const d=new Date();const start=new Date(d.getFullYear(),0,0);const dayOfYear=Math.floor((d-start)/864e5);return(dayOfYear%6236)+1}
async function fetchAyah(){
 const settings=Object.assign({urdu:'ur.jalandhry',english:'en.sahih'},read('aq_settings',{}));
 const n=dailyAyahNumber();
 const response=await fetch('https://api.alquran.cloud/v1/ayah/'+n+'/editions/quran-uthmani,'+encodeURIComponent(settings.urdu)+','+encodeURIComponent(settings.english));
 if(!response.ok)throw new Error('Quran source returned HTTP '+response.status);
 const json=await response.json();if(json.code!==200||!Array.isArray(json.data)||json.data.length<3)throw new Error('Quran source response was incomplete');
 const [ar,ur,en]=json.data;
 currentAyah={arabic:ar.text,urdu:ur.text,english:en.text,surah:ar.surah.englishName,surahNumber:ar.surah.number,ayahNumber:ar.numberInSurah,urduEdition:settings.urdu,englishEdition:settings.english,sourceAyahNumber:n};
 renderVerse(currentAyah);
}
function renderVerse(v){
 $('#versePreview').innerHTML='<div class="v-ar" lang="ar" dir="rtl">'+escapeHtml(v.arabic)+'</div><div class="v-ur" lang="ur" dir="rtl">'+escapeHtml(v.urdu)+'</div><div class="v-en">'+escapeHtml(v.english)+'</div><div class="v-ref">'+escapeHtml(v.surah)+' ('+v.surahNumber+':'+v.ayahNumber+')</div>';
}
function activeWeekly(){return weekly&&weekly.weekKey===mondayKey()}
function postText(){
 const v=activeWeekly()?weekly.verse:currentAyah;if(!v)return '';
 const intro=$('#postIntro').value.trim();
 const link=$('#postLink').value.trim()||'https://apnaquran.com/';
 return (intro?intro+'\n\n':'')+v.arabic+'\n\n'+v.urdu+'\n\n'+v.english+'\n\n— '+v.surah+' ('+v.surahNumber+':'+v.ayahNumber+')\n\nRead the Quran on ApnaQuran: '+link;
}
function renderStatus(){
 const active=activeWeekly();
 $('#weekStatus').textContent=active?'Saved for week beginning '+weekly.weekKey+' · snapshot unchanged':'No saved post for the current week yet.';
 if(active){renderVerse(weekly.verse);$('#postIntro').value=weekly.intro||'';$('#postLink').value=weekly.link||'https://apnaquran.com/'}
 renderLog();
}
function renderLog(){
 const host=$('#logList');
 if(!log.length){host.innerHTML='<p class="muted">No attempts logged yet.</p>';return}
 host.innerHTML=log.slice().reverse().map(item=>'<div class="log-item"><div><strong>'+escapeHtml(item.groupName)+'</strong><br><small>'+escapeHtml(item.date)+' · '+escapeHtml(item.surahRef||'Weekly verse')+'</small></div><div><strong>'+escapeHtml(item.status)+'</strong><br><small>'+escapeHtml(item.url)+'</small></div></div>').join('');
}
function saveGroup(){
 const name=$('#groupName').value.trim()||'Facebook Group';const url=$('#groupUrl').value.trim();
 try{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='www.facebook.com'||!parsed.pathname.includes('/groups/'))throw new Error()}
 catch{$('#groupStatus').textContent='Please enter a valid Facebook Group URL.';return}
 groups=[{name,url}];write(GROUP_KEY,groups);$('#groupStatus').textContent='Saved one test group in this browser.';
}
function saveWeek(){
 if(!currentAyah){$('#copyStatus').textContent='The verse is not loaded yet.';return}
 weekly={weekKey:mondayKey(),savedAt:new Date().toISOString(),verse:currentAyah,intro:$('#postIntro').value.trim(),link:$('#postLink').value.trim()||'https://apnaquran.com/'};
 write(STORE_KEY,weekly);renderStatus();$('#copyStatus').textContent='Saved. This verse snapshot will remain the weekly post until the next week is saved.';
}
async function copyPost(){
 if(!activeWeekly()){saveWeek();if(!activeWeekly())return}
 try{await navigator.clipboard.writeText(postText());$('#copyStatus').textContent='Weekly post copied. Open the group and paste it into Facebook.'}
 catch{$('#copyStatus').textContent='Clipboard access was blocked. Select and copy the post text from the preview or try a secure browser context.'}
}
function openGroup(){
 const group=groups[0]||TEST_GROUP;const url=group.url||TEST_GROUP.url;
 window.open(url,'_blank','noopener,noreferrer');
}
function markPosted(){
 if(!activeWeekly()){ $('#groupStatus').textContent='Save this week’s verse first.';return}
 const group=groups[0]||TEST_GROUP;
 log.push({date:new Date().toLocaleString(),groupName:group.name,url:group.url,status:'Marked posted manually',surahRef:weekly.verse.surah+' '+weekly.verse.surahNumber+':'+weekly.verse.ayahNumber,weekKey:weekly.weekKey});
 write(LOG_KEY,log);renderLog();$('#groupStatus').textContent='Logged as manually posted. This is your confirmation; the dashboard cannot verify Facebook publishing automatically.';
}
$('#generateBtn').addEventListener('click',async()=>{try{await fetchAyah();$('#copyStatus').textContent='Loaded today’s verse from the Quran source. Save it to make it this week’s post.'}catch(e){$('#versePreview').innerHTML='<p class="muted">Could not load the verse: '+escapeHtml(e.message)+'. Please try again.</p>'}});
$('#saveWeekBtn').addEventListener('click',saveWeek);
$('#copyBtn').addEventListener('click',copyPost);
$('#saveGroupBtn').addEventListener('click',saveGroup);
$('#openGroupBtn').addEventListener('click',openGroup);
$('#markPostedBtn').addEventListener('click',markPosted);
(async function init(){
 const savedGroups=read(GROUP_KEY,null);if(!savedGroups){write(GROUP_KEY,groups)}else{groups=savedGroups}
 const g=groups[0]||TEST_GROUP;$('#groupName').value=g.name;$('#groupUrl').value=g.url;
 renderStatus();
 try{await fetchAyah();if(activeWeekly())renderStatus()}catch(e){$('#versePreview').innerHTML='<p class="muted">Could not load today’s verse. Check your connection and try Generate / refresh.</p>'}
})();
})();