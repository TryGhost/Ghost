# How a field type is built

## What a type is made of

Every type is composed from a few building blocks in
[`src/structure.ts`](../../src/structure.ts):

- A **leaf** is one value, stored as one string: text of a format (`text('line')`,
  `text('code')`, `text('long')`), or a choice from a list (`choice('countries')`).
  `country` is that choice, named so a type can reuse it.
- A **scalar** type is one leaf. Short text is `text('line')`.
- A **record** type is a set of named leaves, its parts. An address is six parts, five of
  them text and one a `country`.
- A **set** type is some of the options its field offers, each named by its text. A list
  is one. Its options, and whether a member picks one or several, are the field's
  settings rather than the type's.

Everything that checks, stores, exports, edits, filters or draws a value is written once
per building block, so a type composed from blocks that already exist needs only its own
entries.

## A type set up per field

A list's options belong to the field rather than its type, so a field carries `settings`
beside its `type`, and the two are one value, `TypedSettings`. `SettingsOf` says what a
field of each shape is set up with: `SetSettings` for a set, and nothing for anything else,
so a field of another shape has no settings and a write that gives it some is refused. The
definitions API checks them against the rules on create and edit, with
`TypedSettingsInputSchema`, and reads them back for their shape alone, with
`TypedSettingsSchema`. `withTypedSettings` pairs a type with its settings beside what else a
field holds, such as a definition's name or a row's columns, so Ghost's table reads a set's
settings as JSON from the field's `settings` column, and null as none for any other shape.

Everything that checks, shows or edits a value takes the whole field, so a set's handler
in `matchField` gets its settings: `valueSchemaFor(field)` builds a set's rule from its
options, and Admin's editor and filter offer them. A rule that depends on nothing but the type
is built once per type; a set's is built from its field whenever it is asked for.

A set keeps one row per option picked, under the SHA-256 of the option's text, so the same
text is always the same row and a filter naming an option's text finds it by the table's
key. An option is named by its text alone: removing one leaves members' answers as they
are, and offering the same text again makes it that option again.
