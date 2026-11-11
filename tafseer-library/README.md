# ApnaQuran Tafseer Library

Each Tafseer edition has its own independent directory so it can be updated, audited, and versioned separately.

## Edition directories

- `ibn-kathir-english/` — English Ibn Kathir
- `ibn-kathir-urdu/` — Urdu Ibn Kathir
- `as-saadi-urdu/` — Urdu As-Saadi
- `maariful-quran-english/` — English Ma'ariful Quran
- `maariful-quran-urdu/` — Ma'ariful Quran Urdu (additional edition directory)

The four editions currently being staged for the library have their complete original source snapshots in their respective `source/` directories: 114 numbered Surah JSON files each, from `1.json` through `114.json`.

## Directory convention

Each edition keeps:
- `source/` — immutable original upstream snapshot, with source provenance and checksums
- `cleaned/` — separately maintained audited/corrected edition, where prepared
- `README.md` — edition status, source details, and update instructions

Never edit files inside `source/`. Future upstream updates should be imported as a new, separately recorded snapshot and compared before any cleaned edition is changed.

All work in this library branch is kept separate from `main` until the four editions have been checked and explicitly approved for integration.
