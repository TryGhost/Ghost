---
"@tryghost/metafield-types": minor
---

Changed how a write clears a value, and described each field shape's rules once, in the package.

- `null` is the only way a write clears. A write of `''` to a text field, `[]` to a list, or `''` to a part of an address is refused by `valueSchemaFor` with a message saying to send `null`. A part of an address named as `null` is cleared; before, `null` for a part was refused.
- A value never holds nothing: a field holding nothing has no value, rather than an empty one. `ValueOf<T>` and `FieldValue` no longer admit `null` or `''` parts, and a write has its own type, `WriteOf<T>` and `FieldWrite`, which does.
- `./shapes` is a new entry point, zod-free like `./structure`. `SHAPES` holds each shape's rules (`parse`, `same`, `apply`, `diff`), `LEAVES` each kind of leaf's (its JSON kind, `read`, `fromText`), and `FIELD_READING` how a field reads a held value (`held`, `editable`). `shaped(field)` and `shapedType(type)` pair a field or type with its shape, so a table keyed by shape can be indexed with it without a cast. `heldValue`, `editableValue`, `valueFromText`, `textOfValue`, `heldTextOf`, `formTextOf`, `formShows` and `formWrite` read a held value and work out the write a form makes.
- `accept(shaped(field), raw)` checks a write against the field's strict rule and returns an `Accepted` value branded with its shape, so code that stores a value can require one that passed the rule.
- `keysOf(value)` lists an object's keys typed as its type's keys. `LeafValues`, `LeafValue`, `LeafKind` and `WriteOf` are exported from `./structure`.
