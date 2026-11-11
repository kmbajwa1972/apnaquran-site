# English Tafseer Ibn Kathir

## Original source snapshot

The original English Ibn Kathir Surah files are preserved unchanged in `source/`.

- Source repository: https://github.com/spa5k/tafsir_api
- Pinned source commit: `eb82bb6294efe30ad5c135c03b1864afaa70e855`
- Source directory: `tafsir/en-tafisr-ibn-kathir/`
- Original files: 114 (Surah files `1.json` through `114.json`)
- Checksums and per-file provenance: `source/manifest.json`

## Audit completed

The full audit verified all 114 original source files against their recorded Git blob SHA-1 checksums.

- Original commentary records: **6,236**
- Unique exact commentary passages: **1,903**
- Repeated records consolidated: **4,333**
- Ayah references preserved and covered: **6,236**

Surah 1 has no exact repeated commentary. Surahs 2–114 contain repeated passages.

## Cleaned edition

The audited edition is in `cleaned/`. Exact duplicate text records are consolidated into one entry, while every distinct original Ayah reference is retained in that entry's `ayahs` array. Original commentary text is not rewritten, normalized, or translated. Arabic text inside the commentary is preserved exactly.

See:
- `cleaned/AUDIT-REPORT.md` — per-Surah audit results
- `cleaned/manifest.json` — source and cleaned-file checksums
- `cleaned/README.md` — cleaned data format and integrity rules

## App integration status

The working branch updates the English Ibn Kathir app edition to load the cleaned local files. The app continues to display the complete Arabic Surah before the commentary. These changes remain on `feature/tafseer-library-complete`; nothing has been merged into `main`.

## Preservation rules

Treat `source/` as an immutable reference snapshot. Never edit, deduplicate, normalize, or repair these original files. Regenerate the cleaned edition with `scripts/audit-ibn-kathir-english.mjs` after any approved source refresh.
