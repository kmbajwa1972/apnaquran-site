import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const edition = path.join(process.cwd(), 'tafseer-library', 'as-saadi-urdu');
const source = path.join(edition, 'source');
const original = path.join(edition, 'original-source');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const originalManifest = JSON.parse(await fs.readFile(path.join(original, 'SOURCE-MANIFEST.json'), 'utf8'));
if (originalManifest.file_count !== 114 || !Array.isArray(originalManifest.files) || originalManifest.files.length !== 114) {
  throw new Error('Original backup manifest must contain exactly 114 files.');
}
const rows = [], manifestFiles = [];
let originalRecords = 0, uniquePassages = 0, duplicateRecords = 0, uniqueTextAyahPairs = 0;

for (let surah = 1; surah <= 114; surah++) {
  const name = surah + '.json';
  const meta = originalManifest.files.find(f => f.file === name);
  if (!meta) throw new Error('Original manifest missing ' + name);
  const backupBytes = await fs.readFile(path.join(original, name));
  if (backupBytes.length !== meta.bytes || sha256(backupBytes) !== meta.sha256) {
    throw new Error('Untouched original backup checksum/size mismatch: ' + name);
  }
  const raw = JSON.parse(backupBytes.toString('utf8'));
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Unexpected JSON structure: ' + name);

  const groups = new Map();
  const originalPairs = new Set();
  for (const row of raw) {
    if (!row || Number(row.surah) !== surah || !Number.isInteger(Number(row.ayah)) ||
        Number(row.ayah) < 1 || typeof row.text !== 'string' || row.text.length === 0) {
      throw new Error('Invalid source row in Surah ' + surah);
    }
    const ayah = Number(row.ayah);
    const pairKey = JSON.stringify([row.text, ayah]);
    originalPairs.add(pairKey);
    if (!groups.has(row.text)) groups.set(row.text, { surah, ayah, ayahs: [], text: row.text });
    const entry = groups.get(row.text);
    if (!entry.ayahs.includes(ayah)) entry.ayahs.push(ayah);
  }

  const entries = [...groups.values()];
  const cleanedPairs = new Set(entries.flatMap(e => e.ayahs.map(a => JSON.stringify([e.text, a]))));
  if (cleanedPairs.size !== originalPairs.size || [...originalPairs].some(k => !cleanedPairs.has(k))) {
    throw new Error('Exact Urdu text/Ayah mapping changed in Surah ' + surah);
  }
  const cleanBytes = Buffer.from(JSON.stringify({ schema_version: 1, surah, entries }, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(source, name), cleanBytes);

  const removed = raw.length - entries.reduce((n, e) => n + e.ayahs.length, 0);
  originalRecords += raw.length;
  uniquePassages += entries.length;
  duplicateRecords += removed;
  uniqueTextAyahPairs += cleanedPairs.size;
  rows.push({ surah, original: raw.length, uniquePassages: entries.length, duplicateRowsConsolidated: removed, textAyahPairs: cleanedPairs.size });
  manifestFiles.push({
    surah, filename: name, original_bytes: backupBytes.length, original_sha256: sha256(backupBytes),
    cleaned_bytes: cleanBytes.length, cleaned_sha256: sha256(cleanBytes),
    original_records: raw.length, unique_commentary_passages: entries.length,
    duplicate_rows_consolidated: removed, unique_text_ayah_pairs: cleanedPairs.size
  });
}

const cleanManifest = {
  edition: 'As-Saadi Urdu',
  schema_version: 1,
  upstream_repository: originalManifest.upstream_repository,
  upstream_path: originalManifest.upstream_path,
  pinned_commit: originalManifest.pinned_commit,
  upstream_tree_sha: originalManifest.upstream_tree_sha,
  canonical_directory: 'tafseer-library/as-saadi-urdu/source/',
  original_backup_directory: 'tafseer-library/as-saadi-urdu/original-source/',
  method: 'Group only exact, complete Urdu commentary text matches. Preserve every text string byte-for-byte at the Unicode string level and retain every distinct original Ayah reference in the ayahs array. No trimming, rewriting, normalization, translation, or Quran text modification.',
  file_count: 114,
  original_records: originalRecords,
  unique_commentary_passages: uniquePassages,
  repeated_rows_consolidated: duplicateRecords,
  unique_text_ayah_pairs_preserved: uniqueTextAyahPairs,
  files: manifestFiles
};
await fs.writeFile(path.join(source, 'SOURCE-MANIFEST.json'), JSON.stringify(cleanManifest, null, 2) + '\n', 'utf8');

const table = [
  '| Surah | Original rows | Unique passages | Repeated rows consolidated | Text/Ayah pairs preserved |',
  '|---:|---:|---:|---:|---:|',
  ...rows.map(r => '| ' + r.surah + ' | ' + r.original + ' | ' + r.uniquePassages + ' | ' + r.duplicateRowsConsolidated + ' | ' + r.textAyahPairs + ' |')
].join('\n');
const report = [
  '# As-Saadi Urdu — canonical source audit', '',
  '- Surahs verified: **' + rows.length + '**',
  '- Original source rows: **' + originalRecords.toLocaleString('en-US') + '**',
  '- Unique commentary passages: **' + uniquePassages.toLocaleString('en-US') + '**',
  '- Repeated rows consolidated: **' + duplicateRecords.toLocaleString('en-US') + '**',
  '- Unique text/Ayah associations preserved: **' + uniqueTextAyahPairs.toLocaleString('en-US') + '**',
  '- All 114 original JSON files were checksum-verified against original-source/SOURCE-MANIFEST.json.',
  '- Urdu and Arabic content strings were not edited; only exact repeated text was grouped.',
  '',
  'Every distinct original (exact text, Ayah) association is retained. A passage repeated across different Ayahs appears once with all its Ayah references in ayahs[].',
  '',
  '## Per-Surah results', '', table, ''
].join('\n');
await fs.writeFile(path.join(edition, 'AUDIT-REPORT.md'), report, 'utf8');

const readme = [
  '# As-Saadi — Urdu', '',
  '## Canonical source — cleaned in place', '',
  'The active source is stored in source/ as 114 numbered JSON files. Exact duplicate commentary passages are grouped once, with every distinct original Ayah reference retained in ayahs[].',
  '',
  '- Original rows: **' + originalRecords.toLocaleString('en-US') + '**',
  '- Unique commentary passages: **' + uniquePassages.toLocaleString('en-US') + '**',
  '- Repeated rows consolidated: **' + duplicateRecords.toLocaleString('en-US') + '**',
  '- Text/Ayah associations preserved: **' + uniqueTextAyahPairs.toLocaleString('en-US') + '**',
  '',
  'No Urdu or Arabic text is rewritten, normalized, trimmed, translated, or removed. Only exact repeated text is consolidated.',
  '',
  '## Untouched original backup', '',
  'The 114 original upstream JSON files, README, and provenance manifest are preserved byte-for-byte in original-source/. Do not edit this backup.',
  '',
  '- Upstream repository: ' + originalManifest.upstream_repository,
  '- Pinned upstream commit: ' + originalManifest.pinned_commit,
  '- Upstream path: ' + originalManifest.upstream_path,
  '',
  '## Verification', '',
  '- AUDIT-REPORT.md contains per-Surah counts.',
  '- source/SOURCE-MANIFEST.json contains original and cleaned SHA-256 checksums.',
  '- original-source/SOURCE-MANIFEST.json remains the untouched upstream manifest.',
  '- All changes remain on feature/tafseer-library-complete; nothing is merged into main.'
].join('\n') + '\n';
await fs.writeFile(path.join(edition, 'README.md'), readme, 'utf8');
await fs.writeFile(path.join(source, 'README.md'),
  '# Canonical cleaned source — As-Saadi Urdu\n\nThis directory contains the active cleaned files 1.json through 114.json. Exact duplicate commentary passages are grouped once with all distinct original Ayah references retained in ayahs[]. No Urdu or Arabic wording is changed. See SOURCE-MANIFEST.json for checksums and ../AUDIT-REPORT.md for the complete per-Surah audit. Untouched upstream originals are in ../original-source/.\n',
  'utf8');
await fs.rm(path.join(edition, 'cleaned'), { recursive: true, force: true });

console.log(JSON.stringify({
  surahs: rows.length, originalRecords, uniqueCommentaryPassages: uniquePassages,
  repeatedRowsConsolidated: duplicateRecords, uniqueTextAyahPairsPreserved: uniqueTextAyahPairs,
  originalsVerified: 114, sourceFilesCleanedInPlace: 114
}, null, 2));
