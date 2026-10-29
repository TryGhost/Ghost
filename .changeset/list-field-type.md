---
"@tryghost/metafield-types": minor
---

Added the list field type, whose field offers options of its own and takes one or several of them.

- `list` is `{ shape: 'set' }`: a value is the text of each option picked, as `string[]`, even when the field takes one. `matchShape` handlers take a `set` branch.
- A field now carries `settings` beside its `type`. `SettingsOf<T>` is what a type is set up with: `SetSettings` (`options`, in the order shown, and `multiple`) for a list, and `null` for every other type. `TypedSettings` pairs a type with its settings. `TypedSettingsInputSchema` checks a write's type and settings against the rules, and `TypedSettingsSchema` reads them back by shape alone, so a rule tightened later never hides a field set up under the old one.
- `MetafieldDefinitionSchema` reads `settings`, and `MetafieldDefinition` is typed by them, so a list definition always has its options.
- `valueSchemaFor(field)` takes the field's type and settings. A list's rule accepts only the options its field offers, and at most one when it takes one.
- `matchField(field, handlers)` calls a handler for the field's shape with the field narrowed, settings included.
- `inOptionOrder(settings, held)` is the answers among `held` that a list offers, in its order, and `editableAnswers(settings, held)` is what a form editing a list's answers starts from: none while a field taking one holds several.
- `optionText` is how an option's text is matched: trimmed, with accents encoded one way. `MIN_OPTIONS`, `MAX_OPTIONS` and `OPTION_SEPARATOR` are a list's limits and the character joining options in one CSV cell, which no option may contain.
