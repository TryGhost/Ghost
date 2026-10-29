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

Everything that checks, stores, exports, edits, filters or draws a value is written once
per building block, so a type composed from blocks that already exist needs only its own
entries.

## A type made of existing blocks

1. In [`src/structure.ts`](../src/structure.ts), add the type's id to `FIELD_TYPE_IDS`
   and what it is composed of to `FIELD_STRUCTURES`.
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
- **A shape**, such as a set of choices: `ValueOf`, for the value a type of it holds, and
  every `matchShape` call, which are its rule, Ghost's reads and writes, CSV columns and
  cells, Admin's control, editor, one-line value, filters and import mapping, and Portal's
  inputs, change detection and error placement.

The compiler won't ask about storage or about Ghost's filters. Every leaf is stored as
text in `value_text`, under the path of its part, and `ValueOf` gives every leaf a string,
so a leaf that should hold, store or compare as a number or a date needs those changed by
hand. Ghost's filters compare stored text, and a filter on a whole field's value compares
the row at its root, so a shape whose value is stored as several rows needs its filters
written by hand too.

## A type set up per field

No type is set up per field yet. The first, a list whose options belong to the field
rather than to its type, needs somewhere in the definition to keep them. Its value is a
list of choices, a new shape, so the compiler leads it through everything above.

What the compiler won't do is hand it the field's options. Each entry point that checks,
shows or edits a value already takes the field: `valueSchemaFor(field)`,
`formatMemberCustomFieldValue(field, value)`, Admin's editor and filter, and Portal's
inputs. Below them, the leaf helpers and the maps of lists (`LIST_RULES`,
`memberCustomFieldChoiceLists` and `LIST_OPTIONS`) see only a leaf, so the field's
options have to be passed down from the entry point by hand. Rules are also built once per
type in `RULES`, which a rule built from a field's options can't be.
