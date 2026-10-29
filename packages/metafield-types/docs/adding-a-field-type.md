# Add a field type

What adding a member custom field type to Ghost takes, and what the compiler checks along
the way. This is for contributors to the Ghost monorepo; the package README covers using
the package.

## What a type is made of

Every type is composed from a few building blocks in
[`src/structure.ts`](../src/structure.ts):

- A **leaf** is one value, stored as one string: text of a size (`text('line')`,
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

## A type made of existing blocks

1. In [`src/structure.ts`](../src/structure.ts), add the type's id to `FIELD_TYPE_IDS`
   and what it is composed of to `FIELD_STRUCTURES`. In [`src/index.ts`](../src/index.ts),
   add what a field of it is set up with to `TYPED_SETTINGS`, and add that entry to
   `TypedSettingsSchema`. A unit test fails until the second is there.
2. In Admin's [`fieldTypePresentation`](../../../apps/admin-x-framework/src/api/member-custom-fields.ts),
   give it a name and an icon. A record also gives a label for each part and says which
   parts take a full row of the form.
3. A record also takes a message for a write that names none of its parts, in
   `RECORD_EMPTY` in [`src/index.ts`](../src/index.ts), and a label for each part and the
   rows they are drawn in, in Portal's
   [`RECORD_FORMS`](../../../apps/portal/src/components/common/member-custom-fields.tsx).
   Portal's labels are translated like any other string.
4. Add its id to the `type` column's list in Ghost's
   [`schema.js`](../../../ghost/core/server/data/schema/schema.js), which can't import this
   package. A unit test fails until you do.

The compiler fails until each of the first three is there. The rest follows from the
blocks: the value's rule, storage, CSV import and export, filters, Admin's editor and
one-line value, and Portal's inputs, change detection and error placement.

A record can also name parts that read as one run in Admin's one-line value, such as a
state and its postal code, in `fusedParts`. Without one, each part reads on its own.

## A new building block

Adding a block leads the compiler to everything written per block of its kind.

- **A text size**, in `TEXT_SIZES`: its bound and message in `TEXT_RULES`, and which
  control it is typed into in Admin's `TEXT_CONTROL` and Portal's `TEXT_INPUT`.
- **A list**, in `LIST_SOURCES`: which keys it accepts in `LIST_RULES`, how Admin offers
  it and names a key in `memberCustomFieldChoiceLists`, and how Portal offers it in
  `LIST_OPTIONS`.
- **A kind of leaf**, such as a number or a date: every `matchLeaf` call and every map
  keyed by leaf kind, which are the leaf's rule, Admin's control, one-line value, filter
  type and filter picker, and Portal's input.
- **A shape**, such as the set a list is: `ValueOf`, for the value a type of it holds,
  `SettingsOf`, for what a field of it is set up with, and every `matchShape` and
  `matchField` call, which are its rule, Ghost's row layout (how its rows are read, and
  where a filter finds its whole value), CSV columns and cells, Admin's control, editor,
  one-line value, filters and import mapping, and Portal's inputs, change detection and
  error placement. A value laid out unlike a string, a record or a list of strings also
  fails to compile where Ghost writes its rows.

The compiler won't ask about how a leaf is stored or compared. Every leaf is stored as
text in `value_text`, under the path of its part, and `ValueOf` gives every leaf a string,
so a leaf that should hold, store or compare as a number or a date needs those changed by
hand. Ghost's filters compare stored text.

## A type set up per field

A list's options belong to the field rather than its type, so a field carries `settings`
beside its `type`, and the two are one value, `TypedSettings`. `SettingsOf` says what a
field of each shape is set up with: `SetSettings` for a set, and `null` for anything else,
so a field can't carry settings its type doesn't take. The definitions API takes them on
create and edit, checked by `TypedSettingsSchema`, and Ghost stores them as JSON in the
field's `settings` column.

Everything that checks, shows or edits a value takes the whole field, so a set's handler
in `matchField` gets its settings: `valueSchemaFor(field)` builds a set's rule from its
options, and Admin's editor and filter offer them. A rule that depends on nothing but the
type is built once per type; a set's is built once per field's settings.

A set keeps one row per option picked, under the SHA-256 of the option's text, so the same
text is always the same row and a filter naming an option's text finds it by the table's
key. An option is named by its text alone: removing one leaves members' answers as they
are, and offering the same text again makes it that option again.
