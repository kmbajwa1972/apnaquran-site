# Ibn Kathir — Urdu

## Canonical source files — cleaned in place

The active edition is stored directly in source/. The 114 numbered files (1.json–114.json) contain exact-duplicate commentary passages consolidated in place.

- Original commentary records: **6,236**
- Clean source records: **1,947**
- Exact repeated records consolidated: **4,289**
- Ayah references preserved: **6,236**

Each retained passage includes its exact original Urdu text and an ayahs array containing all original Ayah references associated with that passage. No Urdu wording is rewritten, normalized, translated, or trimmed.

## Untouched original backup

The original 114 upstream JSON files and provenance manifest are preserved in original-source/. Do not edit this backup.

- Upstream repository: https://github.com/spa5k/tafsir_api
- Pinned upstream commit: eb82bb6294efe30ad5c135c03b1864afaa70e855
- Upstream directory: tafsir/ur-tafseer-ibn-e-kaseer/

## Audit and application

- AUDIT-REPORT.md contains per-Surah counts and audit results.
- source/manifest.json contains checksums for cleaned files and original backup files.
- original-source/manifest.json preserves the upstream provenance and checksums.
- ApnaQuran loads Urdu Ibn Kathir from source/.

All changes remain on feature/tafseer-library-complete. Nothing is merged into main.
