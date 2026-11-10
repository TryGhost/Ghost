---
"@tryghost/metafield-types": minor
---

Added a way to build a new field type behind a Labs flag. `FIELD_TYPE_FLAGS` lists the types still in development with the Labs flag each is behind, and a type with no flag there is released. `isCreatableType(type, isFlagOn)` says whether a field of a type can be created given which flags are on. Every type is released today.
