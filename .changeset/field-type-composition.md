---
"@tryghost/metafield-types": minor
---

Changed the catalog to describe each field type as a composition of building blocks, and to derive each type's rule from them.

- `FIELD_STRUCTURES` replaces `FIELD_PARTS`. A type is one leaf, `{ shape: 'scalar', leaf }`, or a record of named leaves, `{ shape: 'record', parts }`.
- A leaf is text of a size, `text(size)` with `TEXT_SIZES`, or a choice from a list, `choice(from)` with `LIST_SOURCES`. `country` is the choice from the list of countries.
- A part's type is now its leaf, so `PART_TYPE_IDS`, `PartType` and `partTypesOf` are removed. An address's postal code is `text('code')`, its country is `country`, and its other parts are `text('line')`.
- `FIELD_KINDS` and `FieldKind` are removed. A scalar's leaf says what it holds.
- `matchShape(type, { scalar, record })` and `matchLeaf(leaf, { text, choice })` call the handler for a type's shape or a leaf's kind, so a caller has to say what it does with every one. `matchShape` throws for a type the package doesn't know, so check a type from the wire with `isFieldType` first.
- `isRecordValue` tells whether a value is laid out as a record of parts.
- `StructureOf`, `ShapeOf`, `FieldTypeOfShape` and `PartsOf` name what a type is composed of, and `ValueOf` names the value it holds.
- `partsOf` names a record's parts as plain strings. Read one type's parts by name from `FIELD_STRUCTURES[type].parts`, whose keys are typed.
- `valueSchemaFor(field)` is the rule a value of one field must satisfy, derived from its type's composition. It replaces `FIELD_TYPES`, `FieldTypeDefinition`, `PART_TYPES` and `AddressValue`, which are removed. `FieldValue` and `Address` stay.
