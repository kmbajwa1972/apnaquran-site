# English Tafseer Ibn Kathir

## Canonical source files — cleaned in place

The active edition is stored directly in `source/`. The 114 numbered files in that directory have been cleaned in place by consolidating only exact duplicate commentary text. These are the files used by ApnaQuran.

- Surah files: `source/1.json` through `source/114.json`
- Original records: **6,236**
- Clean source records: **1,903**
- Exact repeated records consolidated: **4,333**
- Ayah references preserved: **6,236**

Each retained commentary passage includes an `ayahs` array containing every original Ayah reference associated with that exact text. The original wording, including Arabic within commentary, is preserved unchanged.

## Untouched original backup

The exact upstream source snapshot is preserved separately in `original-source/`, including its original manifest and original Git blob checksums. This backup is for provenance and restoration; it is not the active source used by the app.

- Source repository: https://github.com/spa5k/tafsir_api
- Pinned source commit: `eb82bb6294efe30ad5c135c03b1864afaa70e855`
- Original upstream edition: `en-tafisr-ibn-kathir`

## Audit and integrity

- `AUDIT-REPORT.md` — full per-Surah comparison and results
- `source/manifest.json` — checksums of the cleaned canonical source files and original file checksums
- `original-source/manifest.json` — original upstream checksums
- `scripts/audit-ibn-kathir-english.mjs` — verifies every cleaned record and Ayah mapping against the untouched original

The audit fails if any original passage, Ayah reference, or checksum is missing or changed.

## App and branch status

ApnaQuran loads English Ibn Kathir from `tafseer-library/ibn-kathir-english/source/`. All changes remain on `feature/tafseer-library-complete`; nothing has been merged into `main`.
