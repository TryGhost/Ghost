# Add a field type

How to add a member custom field type to Ghost, and what the compiler checks along the way.
This is for contributors to the Ghost monorepo; the package README covers using the package.
What a type is made of is explained in
[How a field type is built](../explanation/how-a-field-type-is-built.md).

## A type made of existing blocks

1. In [`src/structure.ts`](../../src/structure.ts), add the type's id to `FIELD_TYPE_IDS`
   and what it is composed of to `FIELD_STRUCTURES`. What a field of it is set up with
   follows from its shape.
2. In Admin's [`fieldTypePresentation`](../../../../apps/admin-x-framework/src/api/member-custom-fields.ts),
   give it a name and an icon. A record also gives a label for each part and says which
   parts take a full row of the form.
3. A record also takes a message for a write that names none of its parts, in
   `RECORD_EMPTY` in [`src/index.ts`](../../src/index.ts), and a label for each part and the
   rows they are drawn in, in Portal's
   [`RECORD_FORMS`](../../../../apps/portal/src/components/common/member-custom-fields.tsx).
   Portal's labels are translated like any other string.
4. Add its id to the `type` column's list in Ghost's
   [`schema.js`](../../../../ghost/core/server/data/schema/schema.js), which can't import this
   package. A unit test fails until you do.

The compiler fails until each of the first three is there. The rest follows from the
blocks: the value's rule, storage, CSV import and export, filters, Admin's editor and
one-line value, and Portal's inputs, change detection and error placement.

A record can also name parts that read as one run in Admin's one-line value, such as a
state and its postal code, in `fusedParts`. Without one, each part reads on its own.

A type that needs a building block Ghost doesn't have yet starts with
[Add a building block](add-a-building-block.md).
