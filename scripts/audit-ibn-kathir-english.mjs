import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=process.cwd(), edition=path.join(root,'tafseer-library','ibn-kathir-english');
const source=path.join(edition,'source'), original=path.join(edition,'original-source');
const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
const originalManifest=JSON.parse(await fs.readFile(path.join(original,'manifest.json'),'utf8'));
const blobSha=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
if(manifest.file_count!==114||manifest.files?.length!==114||originalManifest.file_count!==114||originalManifest.files?.length!==114)throw new Error('Both manifests must list 114 Surahs.');
let beforeTotal=0,afterTotal=0,removedTotal=0,ayahTotal=0;
const rows=[];
for(let surah=1;surah<=114;surah++){
 const name=surah+'.json',sm=manifest.files.find(x=>Number(x.surah)===surah),om=originalManifest.files.find(x=>Number(x.surah)===surah);
 if(!sm||!om)throw new Error('Missing manifest entry for Surah '+surah);
 const sb=await fs.readFile(path.join(source,name)),ob=await fs.readFile(path.join(original,name));
 if(blobSha(sb)!==sm.git_blob_sha)throw new Error('Clean source checksum mismatch: '+name);
 if(blobSha(ob)!==om.git_blob_sha||blobSha(ob)!==sm.original_git_blob_sha)throw new Error('Original backup checksum mismatch: '+name);
 const doc=JSON.parse(sb.toString('utf8')),orig=JSON.parse(ob.toString('utf8')),entries=Array.isArray(doc)?doc:doc.entries;
 if(!Array.isArray(entries)||!Array.isArray(orig)||!entries.length||!orig.length)throw new Error('Invalid JSON arrays: '+name);
 const origMap=new Map(),origAyahs=new Set();
 for(const row of orig){
  if(!row||typeof row.text!=='string'||!row.text.length)throw new Error('Invalid original text: '+name);
  const a=Number(row.ayah);if(!Number.isInteger(a)||a<1||a>orig.length)throw new Error('Invalid original Ayah: '+name);
  origAyahs.add(a);if(!origMap.has(row.text))origMap.set(row.text,new Set());origMap.get(row.text).add(a);
 }
 const cleanMap=new Map(),cleanAyahs=new Set();
 for(const e of entries){
  if(!e||typeof e.text!=='string'||!e.text.length||cleanMap.has(e.text))throw new Error('Empty or duplicate cleaned text: '+name);
  const refs=Array.isArray(e.ayahs)?e.ayahs.map(Number):[Number(e.ayah)];
  if(!refs.length||refs.some(a=>!Number.isInteger(a)||a<1||a>orig.length)||new Set(refs).size!==refs.length)throw new Error('Invalid grouped Ayahs: '+name);
  cleanMap.set(e.text,new Set(refs));for(const a of refs)cleanAyahs.add(a);
 }
 if(cleanMap.size!==origMap.size)throw new Error('Unique text count mismatch: '+name);
 for(const [text,refs] of origMap){const got=cleanMap.get(text);if(!got||got.size!==refs.size||[...refs].some(a=>!got.has(a)))throw new Error('Text/Ayah mapping mismatch: '+name);}
 for(let a=1;a<=orig.length;a++)if(!origAyahs.has(a)||!cleanAyahs.has(a))throw new Error('Missing Ayah '+a+' in '+name);
 beforeTotal+=orig.length;afterTotal+=entries.length;removedTotal+=orig.length-entries.length;ayahTotal+=cleanAyahs.size;
 rows.push({surah,before:orig.length,after:entries.length,removed:orig.length-entries.length,ayahs:cleanAyahs.size});
}
if(beforeTotal!==6236||afterTotal!==1903||removedTotal!==4333||ayahTotal!==6236)throw new Error('Audit totals mismatch: '+JSON.stringify({beforeTotal,afterTotal,removedTotal,ayahTotal}));
const table=['| Surah | Original records | Clean source records | Duplicates consolidated | Ayah references |','|---:|---:|---:|---:|---:|',...rows.map(r=>'| '+r.surah+' | '+r.before+' | '+r.after+' | '+r.removed+' | '+r.ayahs+' |')].join('\n');
const report=['# English Ibn Kathir — canonical source audit','','- Surahs verified: **114**','- Original commentary records: **6,236**','- Cleaned source records: **1,903**','- Exact repeated records consolidated: **4,333**','- Ayah references preserved: **6,236**','- Untouched upstream originals are checksum-verified in original-source/.','- Active cleaned files are checksum-verified in source/.','','Every cleaned passage and Ayah reference is compared against the untouched original backup. The audit fails on any missing, changed, or duplicated passage or reference.','','## Per-Surah results','',table,''].join('\n');
await fs.writeFile(path.join(edition,'AUDIT-REPORT.md'),report,'utf8');
console.log('Verified all 114 cleaned source files against their untouched originals.');
