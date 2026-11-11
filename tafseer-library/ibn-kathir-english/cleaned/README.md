# Cleaned English Tafsir Ibn Kathir

This directory contains the separately generated, audited edition. The original files in ../source/ remain immutable.

- Source: https://github.com/spa5k/tafsir_api
- Pinned source commit: eb82bb6294efe30ad5c135c03b1864afaa70e855
- Surahs: 114
- Original records: 6236
- Unique commentary passages: 1903
- Repeated records consolidated: 4333

## Record format

Each numbered JSON file contains an entries array. Each entry contains the exact original text and an ayahs array preserving every distinct Ayah reference from the source records.

## Integrity

The generation process verifies every original source file against its recorded Git blob SHA-1 before writing cleaned output. See manifest.json and AUDIT-REPORT.md for per-Surah details and SHA-256 checksums.

Never edit the source snapshot. Re-run the audit script to regenerate this directory.
