---
"@tryghost/metafield-types": minor
---

Added `SHAPE_SETTINGS`, each field shape's settings in one place: the shape a read is checked against, the rules a write is checked against on top of that shape, and the defaults a field starts with. `WRITTEN_SETTINGS` and `READ_SETTINGS` are now taken from it, and `SetSettingsSchema` is now built on `SetSettingsShape`.
