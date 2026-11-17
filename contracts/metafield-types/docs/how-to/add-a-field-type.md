# Add a field type

How to add a member custom field type to Ghost, and what the compiler checks along the way.
This is for contributors to the Ghost monorepo; the package README covers using the package.
What a type is made of is explained in
[How a field type is built](../explanation/how-a-field-type-is-built.md).

A new type is built behind a Labs flag that is off on every customer's site, so it can be
merged a piece at a time and nobody can create a field of it until it is released.
[Why a new field type starts behind a flag](../explanation/why-a-new-field-type-starts-behind-a-flag.md)
explains why.

## A type made of existing blocks

1. In [`src/structure.ts`](../../src/structure.ts), add the type's id to `FIELD_TYPE_IDS`,
   what it is composed of to `FIELD_STRUCTURES`, and the Labs flag it is developed behind to
   `FIELD_TYPE_FLAGS`, as in `number: 'customFieldTypeNumber'`. What a field of it is set up
   with follows from its shape.
2. Register the flag as a private feature: add it to `PRIVATE_FEATURES` in Ghost's
   [`labs.js`](../../../../ghost/core/shared/labs.js), and give it a toggle in Admin's
   [`private-features.tsx`](../../../../apps/admin/src/settings/advanced/labs/private-features.tsx).
3. In Admin's [`fieldTypePresentation`](../../../../apps/admin-x-framework/src/api/member-custom-fields.ts),
   give it a name and an icon. A record also gives a label for each part and says which
   parts take a full row of the form.
4. A record also takes a message for a write that names none of its parts, in
   `RECORD_EMPTY` in [`src/index.ts`](../../src/index.ts), and a label for each part and the
   rows they are drawn in, in Portal's
   [`RECORD_FORMS`](../../../../apps/portal/src/components/common/member-custom-fields.tsx).
   Portal's labels are translated like any other string.
5. Add its id to the `type` column's list in Ghost's
   [`schema.js`](../../../../ghost/core/server/data/schema/schema.js), which can't import this
   package. A unit test fails until you do.
6. Add a field of it, with values a member could hold, to `FIELD_FIXTURES` in
   [`test/fixtures/fields.ts`](../../test/fixtures/fields.ts).

The compiler fails until steps 3, 4 and 6 are done. Nothing fails without step 1's flag: a type
with no flag is released, and reaches every site with the next release. Every surface's tests
then run over the new type, and the tests over `FIELDS_IN_DEVELOPMENT` check that Ghost's API, Settings and
the members import hold it back until its flag is on. If the flag isn't registered, Ghost's
API tests that create a field of every type fail, because test setup switches on only
registered flags.

The rest follows from the blocks: the value's rule, storage, CSV import and export, filters,
Admin's editor and one-line value, and Portal's inputs, change detection and error placement.
None of it needs a flag of its own. While the flag is off, no field of the type can be
created, so nothing else about it ever runs for a customer.

A record can also name parts that read as one run in Admin's one-line value, such as a
state and its postal code, in `fusedParts`. Without one, each part reads on its own.

A type that needs a building block Ghost doesn't have yet starts with
[Add a building block](add-a-building-block.md).

## Try it out

Switch the flag on for your own site:

- in Admin, under Settings, Labs, Private features, which shows when Ghost's config sets
  `enableDeveloperExperiments: true`;
- or in Ghost's config, with `"labs": { "customFieldTypeNumber": true }`.

A `?labs=customFieldTypeNumber` override in Admin's address only shows the type in Admin.
Ghost still refuses to create a field of it, because Ghost reads the flag from its own
settings and config.

When the type is finished, [release it](release-a-field-type.md).
