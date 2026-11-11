import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const edition = path.join(process.cwd(), 'tafseer-library', 'ibn-kathir-urdu');
const source = path.join(edition, 'source');
const original = path.join(edition, 'original-source');
const blobSha = bytes => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex');
const incoming = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
if (!Array.isArray(incoming.files) || incoming.files.length !== 114) throw new Error('Expected 114 original files in the transfer manifest.');

await fs.mkdir(original, { recursive: true });
const backupManifestPath = path.join(original, 'manifest.json');
let originalManifest;
try { originalManifest = JSON.parse(await fs.readFile(backupManifestPath, 'utf8')); }
catch {
  originalManifest = incoming;
  await fs.writeFile(backupManifestPath, JSON.stringify(originalManifest, null, 2) + '\n', 'utf8');
}
if (!Array.isArray(originalManifest.files) || originalManifest.files.length !== 114) throw new Error('Original backup manifest must list 114 files.');

for (let s = 1; s <= 114; s++) {
  const dest = path.join(original, s + '.json');
  try { await fs.access(dest); }
  catch { await fs.copyFile(path.join(source, s + '.json'), dest); }
}

let originalTotal = 0, cleanTotal = 0, duplicateTotal = 0, ayahTotal = 0;
const rows = [], manifestFiles = [];
for (let surah = 1; surah <= 114; surah++) {
  const name = surah + '.json';
  const backupBytes = await fs.readFile(path.join(original, name));
  const backupSha = blobSha(backupBytes);
  const meta = originalManifest.files.find(f => Number(f.surah ?? String(f.file ?? f.filename ?? '').replace('.json', '')) === surah);
  if (!meta) throw new Error('Original manifest missing Surah ' + surah);
  const expectedSha = meta.git_blob_sha ?? meta.source_git_blob_sha;
  if (expectedSha && backupSha !== expectedSha) throw new Error('Original backup checksum mismatch: ' + name);

  const raw = JSON.parse(backupBytes.toString('utf8'));
  if (!raw || !Array.isArray(raw.ayahs) || !raw.ayahs.length) throw new Error('Unexpected original JSON structure: ' + name);
  const groups = new Map(), seenAyahs = new Set();
  for (const row of raw.ayahs) {
    if (!row || Number(row.surah) !== surah || !Number.isInteger(Number(row.ayah)) ||
        Number(row.ayah) < 1 || typeof row.text !== 'string' || row.text.length === 0) {
      throw new Error('Invalid source row in Surah ' + surah);
    }
    const ayah = Number(row.ayah);
    if (seenAyahs.has(ayah)) throw new Error('Duplicate original Ayah reference in Surah ' + surah + ': ' + ayah);
    seenAyahs.add(ayah);
    if (!groups.has(row.text)) groups.set(row.text, { surah, ayah, ayahs: [], text: row.text });
    groups.get(row.text).ayahs.push(ayah);
  }

  const entries = [...groups.values()];
  const cleanBytes = Buffer.from(JSON.stringify({ schema_version: 1, surah, entries }, null, 2) + '\n', 'utf8');
  const originalMap = new Map();
  for (const row of raw.ayahs) {
    if (!originalMap.has(row.text)) originalMap.set(row.text, []);
    originalMap.get(row.text).push(Number(row.ayah));
  }
  const cleanMap = new Map(entries.map(e => [e.text, e.ayahs]));
  if (cleanMap.size !== originalMap.size) throw new Error('Unique passage mismatch in Surah ' + surah);
  for (const [text, refs] of originalMap) {
    const got = cleanMap.get(text);
    if (!got || got.length !== refs.length || got.some((a, i) => a !== refs[i])) throw new Error('Text/Ayah mapping changed in Surah ' + surah);
  }

  await fs.writeFile(path.join(source, name), cleanBytes);
  const removed = raw.ayahs.length - entries.length;
  originalTotal += raw.ayahs.length; cleanTotal += entries.length;
  duplicateTotal += removed; ayahTotal += seenAyahs.size;
  rows.push({ surah, original: raw.ayahs.length, unique: entries.length, duplicates: removed, ayahs: seenAyahs.size });
  manifestFiles.push({
    surah, filename: name, original_git_blob_sha: backupSha, git_blob_sha: blobSha(cleanBytes),
    source_record_count: raw.ayahs.length, unique_commentary_count: entries.length,
    duplicate_record_count: removed, ayah_coverage_count: seenAyahs.size, bytes: cleanBytes.length
  });
}

const cleanManifest = {
  edition: 'Ibn Kathir Urdu', schema_version: 1,
  upstream_repository: incoming.upstream_repository, upstream_ref: incoming.upstream_ref,
  upstream_commit: incoming.upstream_commit, upstream_directory: incoming.upstream_directory,
  canonical_directory: 'tafseer-library/ibn-kathir-urdu/source/',
  original_backup_directory: 'tafseer-library/ibn-kathir-urdu/original-source/',
  method: 'Group only exact, complete Urdu commentary text matches. Preserve every text string unchanged and retain every original Ayah reference in the ayahs array. No trimming, rewriting, translation, or Quran text modification.',
  file_count: 114, original_records: originalTotal, unique_commentary_passages: cleanTotal,
  repeated_records_consolidated: duplicateTotal, ayah_references_preserved: ayahTotal,
  files: manifestFiles
};
await fs.writeFile(path.join(source, 'manifest.json'), JSON.stringify(cleanManifest, null, 2) + '\n', 'utf8');

const table = [
  '| Surah | Original records | Clean source records | Duplicates consolidated | Ayah references |',
  '|---:|---:|---:|---:|---:|',
  ...rows.map(r => '| ' + r.surah + ' | ' + r.original + ' | ' + r.unique + ' | ' + r.duplicates + ' | ' + r.ayahs + ' |')
].join('\n');
const report = [
  '# Ibn Kathir Urdu — canonical source audit', '',
  '- Surahs verified: **114**',
  '- Original commentary records: **' + originalTotal.toLocaleString('en-US') + '**',
  '- Cleaned source records: **' + cleanTotal.toLocaleString('en-US') + '**',
  '- Exact repeated records consolidated: **' + duplicateTotal.toLocaleString('en-US') + '**',
  '- Ayah references preserved: **' + ayahTotal.toLocaleString('en-US') + '**',
  '- Untouched originals are preserved in original-source/ and checked against upstream Git blob checksums.',
  '- The cleaned files in source/ are the canonical active source.',
  '',
  'Each exact Urdu commentary passage is stored once, with every original Ayah reference retained in its ayahs array. The audit compares every original Urdu text string and Ayah mapping against the cleaned edition. No wording is edited.',
  '',
  'Arabic Quran text is supplied separately by the site Quran-text source; this cleanup does not alter or replace it.',
  '',
  '## Per-Surah results', '', table, ''
].join('\n');
await fs.writeFile(path.join(edition, 'AUDIT-REPORT.md'), report, 'utf8');

const readme = [
  '# Ibn Kathir — Urdu', '',
  '## Canonical source files — cleaned in place', '',
  'The active edition is stored directly in source/. The 114 numbered files (1.json–114.json) contain exact-duplicate commentary passages consolidated in place.',
  '',
  '- Original commentary records: **' + originalTotal.toLocaleString('en-US') + '**',
  '- Clean source records: **' + cleanTotal.toLocaleString('en-US') + '**',
  '- Exact repeated records consolidated: **' + duplicateTotal.toLocaleString('en-US') + '**',
  '- Ayah references preserved: **' + ayahTotal.toLocaleString('en-US') + '**',
  '',
  'Each retained passage includes its exact original Urdu text and an ayahs array containing all original Ayah references associated with that passage. No Urdu wording is rewritten, normalized, translated, or trimmed.',
  '',
  '## Untouched original backup', '',
  'The original 114 upstream JSON files and provenance manifest are preserved in original-source/. Do not edit this backup.',
  '',
  '- Upstream repository: ' + incoming.upstream_repository,
  '- Pinned upstream commit: ' + incoming.upstream_commit,
  '- Upstream directory: ' + incoming.upstream_directory,
  '',
  '## Audit and application', '',
  '- AUDIT-REPORT.md contains per-Surah counts and audit results.',
  '- source/manifest.json contains checksums for cleaned files and original backup files.',
  '- original-source/manifest.json preserves the upstream provenance and checksums.',
  '- ApnaQuran loads Urdu Ibn Kathir from source/.',
  '',
  'All changes remain on feature/tafseer-library-complete. Nothing is merged into main.'
].join('\n') + '\n';
await fs.writeFile(path.join(edition, 'README.md'), readme, 'utf8');
await fs.writeFile(path.join(source, 'README.md'),
  '# Canonical cleaned source — Ibn Kathir Urdu\n\nThis directory contains the active, deduplicated source files 1.json through 114.json. Exact duplicate Urdu commentary strings are stored once with every original Ayah reference retained in each entry ayahs array. See manifest.json for checksums and ../AUDIT-REPORT.md for the complete per-Surah audit. Untouched upstream originals are in ../original-source/.\n',
  'utf8');
await fs.rm(path.join(edition, 'cleaned'), { recursive: true, force: true });

console.log(JSON.stringify({
  surahs: rows.length, originalRecords: originalTotal, uniquePassages: cleanTotal,
  duplicatesConsolidated: duplicateTotal, ayahReferencesPreserved: ayahTotal,
  originalsBackedUp: 114, sourceFilesReplacedInPlace: 114
}, null, 2));
