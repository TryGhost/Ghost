---
"@tryghost/metafield-types": minor
---

Added the list field type, whose field offers options of its own and takes one or several of them.

- `list` is `{ shape: 'set' }`: a value is the text of each option picked, as `string[]`, even when the field takes one. `matchShape` handlers take a `set` branch.
- A field now carries `settings` beside its `type`. `SettingsOf<T>` is what a type is set up with: `SetSettings` (`options`, in the order shown, and `multiple`) for a list, and nothing for every other type, so a field of another type has no settings. `TypedSettings` pairs a type with its settings. `withTypedSettings(base, settings)` builds what a field holds beside its type with that pair, a variant per shape, from how each shape's settings are held: `WRITTEN_SETTINGS` checks them against the rules, and `READ_SETTINGS` reads them back by `SetSettingsShape` alone, so a rule tightened later never hides a field set up under the old one. `TypedSettingsInputSchema` and `TypedSettingsSchema` are the pair on its own, and `MetafieldDefinitionSchema` is built the same way. `typesOfShape(shape)` lists the types of a shape.
- `MetafieldDefinitionSchema` reads `settings`, and `MetafieldDefinition` is typed by them, so a list definition always has its options.
- `valueSchemaFor(field)` takes the field's type and settings. A list's rule accepts only the options its field offers, and at most one when it takes one.
- `matchField(field, handlers)` calls a handler for the field's shape with the field narrowed, settings included.
- `optionText` is how an option's text is matched: trimmed, with accents encoded one way. `MIN_OPTIONS`, `MAX_OPTIONS` and `OPTION_SEPARATOR` are a list's limits and the character joining options in one CSV cell, which no option may contain.
