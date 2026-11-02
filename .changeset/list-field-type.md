---
"@tryghost/metafield-types": minor
---

Added settings to field definitions, for what a field is set up with beyond its name.

- A field now carries `settings` beside its `type`. `SettingsOf<T>` is what a type is set up with, which is `null` for every type so far. `TypedSettings` pairs a type with its settings. `TypedSettingsInputSchema` checks a write's type and settings against the rules, and `TypedSettingsSchema` reads them back by shape alone, so a rule tightened later never hides a field set up under the old one.
