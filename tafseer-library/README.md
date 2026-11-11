# ApnaQuran Tafseer Library

Each Tafseer edition has its own independent directory so it can be updated, audited, and versioned separately.

## Editions

- `ibn-kathir-english/` — English Ibn Kathir
- `ibn-kathir-urdu/` — Urdu Ibn Kathir
- `maariful-quran-urdu/` — Ma'ariful Quran Urdu
- `as-saadi-urdu/` — As-Saadi Urdu

## Directory convention

Each edition keeps:
- `source/` — immutable original upstream snapshot, with source provenance and checksums
- `cleaned/` — separately maintained audited/corrected edition
- `README.md` — edition status, source details, and update instructions

Never edit files inside `source/`. Future upstream updates should be imported as a new, separately recorded snapshot and compared before any cleaned edition is changed.
