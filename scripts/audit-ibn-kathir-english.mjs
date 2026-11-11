import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const editionRoot = path.join(root, 'tafseer-library', 'ibn-kathir-english');
const sourceRoot = path.join(editionRoot, 'source');
const cleanedRoot = path.join(editionRoot, 'cleaned');
const sourceManifest = JSON.parse(await fs.readFile(path.join(sourceRoot, 'manifest.json'), 'utf8'));

if (sourceManifest.file_count !== 114 || !Array.isArray(sourceManifest.files) || sourceManifest.files.length !== 114) {
  throw new Error('Expected exactly 114 source manifest entries.');
}
await fs.mkdir(cleanedRoot, { recursive: true });

const reportRows = [];
const cleanedFiles = [];
let totalRecords = 0;
let totalUnique = 0;
let totalDuplicates = 0;
let totalAyahCoverage = 0;

for (const sourceFile of sourceManifest.files) {
  const surah = Number(sourceFile.surah);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('Invalid Surah number: ' + sourceFile.filename);

  const raw = await fs.readFile(path.join(sourceRoot, sourceFile.filename));
  const actualBlobSha = createHash('sha1')
    .update(Buffer.concat([Buffer.from('blob ' + raw.length + '\0'), raw]))
    .digest('hex');
  if (actualBlobSha !== sourceFile.git_blob_sha) throw new Error('Immutable source checksum mismatch for Surah ' + surah + '.');

  const records = JSON.parse(raw.toString('utf8'));
  if (!Array.isArray(records) || records.length === 0) throw new Error('Surah ' + surah + ' is not a non-empty JSON record array.');

  const ayahSet = new Set();
  const groups = new Map();
  for (const [index, record] of records.entries()) {
    if (!record || typeof record.text !== 'string' || record.text.length === 0) {
      throw new Error('Missing commentary text in Surah ' + surah + ', record ' + (index + 1) + '.');
    }
    const ayah = Number(record.ayah);
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > records.length) {
      throw new Error('Invalid Ayah reference in Surah ' + surah + ', record ' + (index + 1) + '.');
    }
    if (record.surah !== undefined && Number(record.surah) !== surah) {
      throw new Error('Surah metadata mismatch in Surah ' + surah + ', record ' + (index + 1) + '.');
    }
    ayahSet.add(ayah);
    let group = groups.get(record.text);
    if (!group) {
      group = { text: record.text, ayahs: [] };
      groups.set(record.text, group);
    }
    if (!group.ayahs.includes(ayah)) group.ayahs.push(ayah);
  }

  const missingAyahs = [];
  for (let ayah = 1; ayah <= records.length; ayah++) if (!ayahSet.has(ayah)) missingAyahs.push(ayah);
  if (missingAyahs.length) throw new Error('Missing Ayah references in Surah ' + surah + ': ' + missingAyahs.join(', '));

  const entries = [...groups.values()].map(group => ({ text: group.text, ayahs: group.ayahs.sort((a, b) => a - b) }));
  const duplicateCount = records.length - entries.length;
  const cleanedDocument = {
    schema_version: 1,
    edition: 'Tafsir Ibn Kathir — English',
    surah,
    source_repository: sourceManifest.source_repository,
    source_commit: sourceManifest.source_commit,
    source_file: sourceFile.filename,
    source_git_blob_sha: actualBlobSha,
    original_record_count: records.length,
    unique_commentary_count: entries.length,
    duplicate_record_count: duplicateCount,
    ayah_coverage_count: ayahSet.size,
    entries
  };

  const cleanedText = JSON.stringify(cleanedDocument, null, 2) + '\n';
  const cleanedSha256 = createHash('sha256').update(cleanedText, 'utf8').digest('hex');
  await fs.writeFile(path.join(cleanedRoot, surah + '.json'), cleanedText, 'utf8');

  reportRows.push({ surah, records: records.length, unique: entries.length, duplicates: duplicateCount, ayahCoverage: ayahSet.size });
  cleanedFiles.push({
    surah, filename: surah + '.json', source_filename: sourceFile.filename,
    source_git_blob_sha: actualBlobSha, cleaned_sha256: cleanedSha256,
    source_record_count: records.length, unique_commentary_count: entries.length,
    duplicate_record_count: duplicateCount, ayah_coverage_count: ayahSet.size
  });
  totalRecords += records.length;
  totalUnique += entries.length;
  totalDuplicates += duplicateCount;
  totalAyahCoverage += ayahSet.size;
}

if (reportRows.length !== 114 || totalRecords !== 6236 || totalUnique !== 1903 || totalDuplicates !== 4333) {
  throw new Error('Audit totals differ from reviewed snapshot: files=' + reportRows.length +
    ', records=' + totalRecords + ', unique=' + totalUnique + ', duplicates=' + totalDuplicates);
}

const cleanedManifest = {
  title: 'Audited and deduplicated English Tafsir Ibn Kathir',
  schema_version: 1,
  source_repository: sourceManifest.source_repository,
  source_commit: sourceManifest.source_commit,
  method: 'Group records only when complete text strings are exactly identical. Preserve original text and every distinct Ayah reference. No trimming, rewriting, translation, or Arabic text modification.',
  source_files_verified_by_git_blob_sha: reportRows.length,
  surahs: 114,
  original_records: totalRecords,
  unique_commentary_passages: totalUnique,
  repeated_records_consolidated: totalDuplicates,
  ayah_references_covered: totalAyahCoverage,
  files: cleanedFiles
};
await fs.writeFile(path.join(cleanedRoot, 'manifest.json'), JSON.stringify(cleanedManifest, null, 2) + '\n', 'utf8');

const table = [
  '| Surah | Source records | Unique passages | Repeated records consolidated | Ayah references covered |',
  '|---:|---:|---:|---:|---:|',
  ...reportRows.map(row => '| ' + row.surah + ' | ' + row.records + ' | ' + row.unique + ' | ' + row.duplicates + ' | ' + row.ayahCoverage + ' |')
].join('\n');
const report = [
  '# English Ibn Kathir — full source audit', '',
  '## Verified totals', '',
  '- Surahs inspected: **114**',
  '- Original source records: **' + totalRecords.toLocaleString('en-US') + '**',
  '- Unique commentary passages: **' + totalUnique.toLocaleString('en-US') + '**',
  '- Repeated records consolidated: **' + totalDuplicates.toLocaleString('en-US') + '**',
  '- Ayah references covered: **' + totalAyahCoverage.toLocaleString('en-US') + '**',
  '- Original source files: all 114 Git blob checksums matched the pinned source manifest.', '',
  '## Cleaning method', '',
  'Only records with completely identical text strings are grouped. Each resulting entry keeps the exact original text and an ayahs array containing every distinct original Ayah reference. No commentary wording is rewritten, no Arabic inside commentary is changed, and no source file is edited.',
  '',
  'The audit fails rather than generating output if a source checksum differs, a record is malformed, a Surah reference is wrong, or any Ayah reference is missing.',
  '', '## Per-Surah results', '', table, ''
].join('\n');
await fs.writeFile(path.join(cleanedRoot, 'AUDIT-REPORT.md'), report, 'utf8');

const readme = [
  '# Cleaned English Tafsir Ibn Kathir', '',
  'This directory contains the separately generated, audited edition. The original files in ../source/ remain immutable.', '',
  '- Source: ' + sourceManifest.source_repository,
  '- Pinned source commit: ' + sourceManifest.source_commit,
  '- Surahs: 114',
  '- Original records: ' + totalRecords,
  '- Unique commentary passages: ' + totalUnique,
  '- Repeated records consolidated: ' + totalDuplicates, '',
  '## Record format', '',
  'Each numbered JSON file contains an entries array. Each entry contains the exact original text and an ayahs array preserving every distinct Ayah reference from the source records.', '',
  '## Integrity', '',
  'The generation process verifies every original source file against its recorded Git blob SHA-1 before writing cleaned output. See manifest.json and AUDIT-REPORT.md for per-Surah details and SHA-256 checksums.', '',
  'Never edit the source snapshot. Re-run the audit script to regenerate this directory.'
].join('\n');
await fs.writeFile(path.join(cleanedRoot, 'README.md'), readme + '\n', 'utf8');

console.log('Audit completed: 114 Surahs, ' + totalRecords + ' records, ' + totalUnique + ' unique passages, ' + totalDuplicates + ' repeated records consolidated.');
