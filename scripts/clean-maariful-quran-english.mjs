import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const edition = path.join(process.cwd(), 'tafseer-library', 'maariful-quran-english');
const source = path.join(edition, 'source');
const original = path.join(edition, 'original-source');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const sourceManifestBytes = await fs.readFile(path.join(source, 'SOURCE-MANIFEST.json'));
const upstream = JSON.parse(sourceManifestBytes.toString('utf8'));
if (upstream.file_count !== 114 || !Array.isArray(upstream.files) || upstream.files.length !== 114) {
  throw new Error('Source manifest must describe exactly 114 original Surah files.');
}

// First run: preserve the original source files and manifest byte-for-byte.
// Later runs: verify the backup and always rebuild from that immutable backup.
await fs.mkdir(original, { recursive: true });
const backupManifestPath = path.join(original, 'SOURCE-MANIFEST.json');
let backupExists = true;
try { await fs.access(backupManifestPath); } catch { backupExists = false; }

if (!backupExists) {
  for (let surah = 1; surah <= 114; surah++) {
    const name = surah + '.json';
    const meta = upstream.files.find(f => f.file === name);
    if (!meta) throw new Error('Original manifest missing ' + name);
    const bytes = await fs.readFile(path.join(source, name));
    if (bytes.length !== meta.bytes || sha256(bytes) !== meta.sha256) {
      throw new Error('Source does not match its original manifest; refusing to create backup: ' + name);
    }
    await fs.writeFile(path.join(original, name), bytes);
  }
  await fs.writeFile(backupManifestPath, sourceManifestBytes);
  await fs.writeFile(path.join(original, 'README.md'),
    '# Untouched original source — Ma\'ariful Quran English\n\nThese 114 JSON files and SOURCE-MANIFEST.json are an exact byte-for-byte copy of the imported upstream snapshot. Do not edit these files.\n');
}

const originalManifestBytes = await fs.readFile(backupManifestPath);
const originalManifest = JSON.parse(originalManifestBytes.toString('utf8'));
if (originalManifest.file_count !== 114 || originalManifest.pinned_commit !== upstream.pinned_commit) {
  throw new Error('Original backup manifest does not match the expected upstream snapshot.');
}

const reportRows = [], manifestFiles = [];
let originalRecords = 0, uniquePassages = 0, duplicateRows = 0, preservedPairs = 0;

for (let surah = 1; surah <= 114; surah++) {
  const name = surah + '.json';
  const meta = originalManifest.files.find(f => f.file === name);
  if (!meta) throw new Error('Backup manifest missing ' + name);
  const backupBytes = await fs.readFile(path.join(original, name));
  if (backupBytes.length !== meta.bytes || sha256(backupBytes) !== meta.sha256) {
    throw new Error('Original backup checksum/size mismatch: ' + name);
  }
  const raw = JSON.parse(backupBytes.toString('utf8'));
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Unexpected/empty JSON array: ' + name);

  const groups = new Map();
  const originalPairs = new Set();
  for (const row of raw) {
    if (!row || Number(row.surah) !== surah || !Number.isInteger(Number(row.ayah)) ||
        Number(row.ayah) < 1 || typeof row.text !== 'string' || row.text.length === 0) {
      throw new Error('Invalid source row in Surah ' + surah);
    }
    const ayah = Number(row.ayah);
    originalPairs.add(JSON.stringify([row.text, ayah]));
    if (!groups.has(row.text)) groups.set(row.text, { surah, ayah, ayahs: [], text: row.text });
    const entry = groups.get(row.text);
    if (!entry.ayahs.includes(ayah)) entry.ayahs.push(ayah);
  }

  const entries = [...groups.values()];
  for (const entry of entries) entry.ayahs.sort((a, b) => a - b);
  const cleanedPairs = new Set(entries.flatMap(e => e.ayahs.map(a => JSON.stringify([e.text, a]))));
  if (cleanedPairs.size !== originalPairs.size || [...originalPairs].some(k => !cleanedPairs.has(k))) {
    throw new Error('Exact text/Ayah associations changed in Surah ' + surah);
  }

  const cleanBytes = Buffer.from(JSON.stringify({ schema_version: 1, surah, entries }, null, 2) + '\\n', 'utf8');
  await fs.writeFile(path.join(source, name), cleanBytes);

  const removed = raw.length - entries.length;
  originalRecords += raw.length;
  uniquePassages += entries.length;
  duplicateRows += removed;
  preservedPairs += cleanedPairs.size;
  reportRows.push({ surah, original: raw.length, unique: entries.length, duplicates: removed, pairs: cleanedPairs.size });
  manifestFiles.push({
    surah, filename: name, original_bytes: backupBytes.length, original_sha256: sha256(backupBytes),
    cleaned_bytes: cleanBytes.length, cleaned_sha256: sha256(cleanBytes),
    original_records: raw.length, unique_commentary_passages: entries.length,
    duplicate_rows_consolidated: removed, unique_text_ayah_pairs: cleanedPairs.size
  });
}

const cleanManifest = {
  edition: "Ma'ariful Quran English",
  schema_version: 1,
  upstream_repository: originalManifest.upstream_repository,
  upstream_path: originalManifest.upstream_path,
  pinned_commit: originalManifest.pinned_commit,
  upstream_directory_tree_sha: originalManifest.upstream_directory_tree_sha,
  canonical_directory: 'tafseer-library/maariful-quran-english/source/',
  original_backup_directory: 'tafseer-library/maariful-quran-english/original-source/',
  method: 'Group only exact, complete commentary text matches. Preserve each text string exactly and retain every distinct original Ayah reference in ayahs[]. No trimming, normalization, rewriting, paraphrasing, translation, or Quran text modification.',
  file_count: 114,
  original_records: originalRecords,
  unique_commentary_passages: uniquePassages,
  repeated_rows_consolidated: duplicateRows,
  unique_text_ayah_pairs_preserved: preservedPairs,
  files: manifestFiles
};
await fs.writeFile(path.join(source, 'SOURCE-MANIFEST.json'), JSON.stringify(cleanManifest, null, 2) + '\\n');

const table = [
  '| Surah | Original rows | Unique passages | Repeated rows consolidated | Text/Ayah pairs preserved |',
  '|---:|---:|---:|---:|---:|',
  ...reportRows.map(r => '| ' + r.surah + ' | ' + r.original + ' | ' + r.unique + ' | ' + r.duplicates + ' | ' + r.pairs + ' |')
].join('\\n');
const report = [
  "# Ma'ariful Quran English — canonical source audit", '',
  '- Surahs verified: **' + reportRows.length + '**',
  '- Original source rows: **' + originalRecords.toLocaleString('en-US') + '**',
  '- Unique commentary passages: **' + uniquePassages.toLocaleString('en-US') + '**',
  '- Repeated rows consolidated: **' + duplicateRows.toLocaleString('en-US') + '**',
  '- Unique text/Ayah associations preserved: **' + preservedPairs.toLocaleString('en-US') + '**',
  '- All original files were checksum-verified against original-source/SOURCE-MANIFEST.json.',
  '- Commentary text strings were not edited; only exact repeated passages were grouped.',
  '',
  'Every distinct original (exact text, Ayah) association remains represented. A passage repeated across different Ayahs appears once with all Ayah references in ayahs[].',
  '', '## Per-Surah results', '', table, ''
].join('\\n');
await fs.writeFile(path.join(edition, 'AUDIT-REPORT.md'), report);

await fs.writeFile(path.join(edition, 'README.md'), [
  "# Ma'ariful Quran — English", '',
  '## Canonical source — cleaned in place', '',
  'The active source is in source/ as 114 numbered JSON files. Exact duplicate commentary passages are grouped once, with all distinct original Ayah references retained in ayahs[].',
  '',
  '- Original rows: **' + originalRecords.toLocaleString('en-US') + '**',
  '- Unique commentary passages: **' + uniquePassages.toLocaleString('en-US') + '**',
  '- Repeated rows consolidated: **' + duplicateRows.toLocaleString('en-US') + '**',
  '- Text/Ayah associations preserved: **' + preservedPairs.toLocaleString('en-US') + '**',
  '',
  'No commentary wording is rewritten, normalized, trimmed, translated, or paraphrased.',
  '',
  '## Untouched original backup', '',
  'The 114 original upstream JSON files and provenance manifest are preserved byte-for-byte in original-source/. Do not edit this backup.',
  '',
  '- Upstream repository: ' + originalManifest.upstream_repository,
  '- Pinned upstream commit: ' + originalManifest.pinned_commit,
  '- Upstream path: ' + originalManifest.upstream_path,
  '',
  '## Verification',
  '',
  '- AUDIT-REPORT.md contains per-Surah counts.',
  '- source/SOURCE-MANIFEST.json contains original and cleaned SHA-256 checksums.',
  '- original-source/SOURCE-MANIFEST.json remains the untouched upstream manifest.',
  '- All changes remain on feature/tafseer-library-complete; nothing is merged into main.'
].join('\\n') + '\\n');

await fs.writeFile(path.join(source, 'README.md'),
  "# Canonical cleaned source — Ma'ariful Quran English\\n\\nThis directory contains the active cleaned files 1.json through 114.json. Exact duplicate commentary passages are grouped once with all distinct original Ayah references retained in ayahs[]. No commentary wording is changed. See SOURCE-MANIFEST.json for checksums and ../AUDIT-REPORT.md for the complete per-Surah audit. Untouched upstream originals are in ../original-source/.\\n");

console.log(JSON.stringify({
  surahs: reportRows.length, originalRecords, uniqueCommentaryPassages: uniquePassages,
  repeatedRowsConsolidated: duplicateRows, uniqueTextAyahPairsPreserved: preservedPairs,
  originalsVerified: 114, sourceFilesCleanedInPlace: 114
}, null, 2));
