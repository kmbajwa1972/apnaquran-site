# Ma'ariful Quran — English

## Canonical source — cleaned in place

The active source is in source/ as 114 numbered JSON files. Exact duplicate commentary passages are grouped once, with all distinct original Ayah references retained in ayahs[].

- Original rows: **6,236**
- Unique commentary passages: **3,060**
- Repeated rows consolidated: **3,176**
- Text/Ayah associations preserved: **6,236**

No commentary wording is rewritten, normalized, trimmed, translated, or paraphrased.

## Untouched original backup

The 114 original upstream JSON files and provenance manifest are preserved byte-for-byte in original-source/. Do not edit this backup.

- Upstream repository: https://github.com/spa5k/tafsir_api
- Pinned upstream commit: eb82bb6294efe30ad5c135c03b1864afaa70e855
- Upstream path: tafsir/en-tafsir-maarif-ul-quran/

## Verification

- AUDIT-REPORT.md contains per-Surah counts.
- source/SOURCE-MANIFEST.json contains original and cleaned SHA-256 checksums.
- original-source/SOURCE-MANIFEST.json remains the untouched upstream manifest.
- All changes remain on feature/tafseer-library-complete; nothing is merged into main.
