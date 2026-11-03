## 0.3.0

### Minor Changes

- Changed the catalog to describe each field type as a composition of building blocks, and to derive each type's rule from them.

  - `FIELD_STRUCTURES` replaces `FIELD_PARTS`. A type is one leaf, `{ shape: 'scalar', leaf }`, or a record of named leaves, `{ shape: 'record', parts }`.
  - A leaf is text of a size, `text(size)` with `TEXT_SIZES`, or a choice from a list, `choice(from)` with `LIST_SOURCES`. `country` is the choice from the list of countries.
  - A part's type is now its leaf, so `PART_TYPE_IDS`, `PartType` and `partTypesOf` are removed. An address's postal code is `text('code')`, its country is `country`, and its other parts are `text('line')`.
  - `FIELD_KINDS` and `FieldKind` are removed. A scalar's leaf says what it holds.
  - `matchShape(type, { scalar, record })` and `matchLeaf(leaf, { text, choice })` call the handler for a type's shape or a leaf's kind, so a caller has to say what it does with every one. `matchShape` throws for a type the package doesn't know, so check a type from the wire with `isFieldType` first.
  - `isRecordValue` tells whether a value is laid out as a record of parts.
  - `StructureOf`, `ShapeOf`, `FieldTypeOfShape` and `PartsOf` name what a type is composed of, and `ValueOf` names the value it holds.
  - `partsOf` names a record's parts as plain strings. Read one type's parts by name from `FIELD_STRUCTURES[type].parts`, whose keys are typed.
  - `valueSchemaFor(field)` is the rule a value of one field must satisfy, derived from its type's composition. It replaces `FIELD_TYPES`, `FieldTypeDefinition`, `PART_TYPES` and `AddressValue`, which are removed. `FieldValue` and `Address` stay.

- Added helpers for editing a list field's answers.

  - `inOptionOrder(settings, held)` is the answers among `held` that a list offers, in its order, and `editableAnswers(settings, held)` is what a form editing a list's answers starts from: none while a field taking one holds several.

- Added the list field type, whose field offers options of its own and takes one or several of them.

  - `list` is `{ shape: 'set' }`: a value is the text of each option picked, as `string[]`, even when the field takes one. `matchShape` handlers take a `set` branch.
  - A field now carries `settings` beside its `type`. `SettingsOf<T>` is what a type is set up with: `SetSettings` (`options`, in the order shown, and `multiple`) for a list, and nothing for every other type, so a field of another type has no settings. `TypedSettings` pairs a type with its settings. `withTypedSettings(base, settings)` builds what a field holds beside its type with that pair, a variant per shape, from how each shape's settings are held: `WRITTEN_SETTINGS` checks them against the rules, and `READ_SETTINGS` reads them back by `SetSettingsShape` alone, so a rule tightened later never hides a field set up under the old one. `TypedSettingsInputSchema` and `TypedSettingsSchema` are the pair on its own, and `MetafieldDefinitionSchema` is built the same way. `typesOfShape(shape)` lists the types of a shape.
  - `MetafieldDefinitionSchema` reads `settings`, and `MetafieldDefinition` is typed by them, so a list definition always has its options.
  - `valueSchemaFor(field)` takes the field's type and settings. A list's rule accepts only the options its field offers, and at most one when it takes one.
  - `matchField(field, handlers)` calls a handler for the field's shape with the field narrowed, settings included.
  - `optionText` is how an option's text is matched: trimmed, with accents encoded one way. `MIN_OPTIONS`, `MAX_OPTIONS` and `OPTION_SEPARATOR` are a list's limits and the character joining options in one CSV cell, which no option may contain.

- Added `SHAPE_SETTINGS`, each field shape's settings in one place: the shape a read is checked against, the rules a write is checked against on top of that shape, and the defaults a field starts with. `WRITTEN_SETTINGS` and `READ_SETTINGS` are now taken from it, and `SetSettingsSchema` is now built on `SetSettingsShape`.

- Added `refusedProperty(path)`, which names where a refusal points within what was sent by its path, with parts and positions joined by dots, such as `settings.options.2` for a field's third option. Ghost reports a custom field refusal's `property` this way, and a form can file the problems it finds under the same keys.

- Added the shape of a field definition as the Admin and Members APIs return it.

  - `MetafieldDefinitionSchema` reads a definition (namespace, key, name, type, status, member access and dates) and `MetafieldDefinition` is the type it produces. Ghost writes every definition through it.
  - `FIELD_STATUSES`, `FieldStatusSchema`, `FIELD_STATUS` and `FieldStatus` name whether a field is active or archived.

### Patch Changes

- Pointed the README at a guide for Ghost contributors adding a field type.

- Updated dependencies

- Updated dependencies

- Updated dependencies
