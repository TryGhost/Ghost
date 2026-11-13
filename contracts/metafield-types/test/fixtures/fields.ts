/**
 * Fields of every type, with values a member could hold for each, for checking that every layer
 * agrees with the domain about every type: the shape laws in this package, and the laws of each
 * translator of a shape into another domain's terms (the storage translator, the CSV translator,
 * the form translators) where that translator lives. Keyed by type, so a type added to the catalog
 * fails to compile here until it has fixtures, and every law test then runs against it without
 * being touched.
 *
 * Test support rather than part of what a field is: exported to other packages' tests as
 * `@tryghost/metafield-types/test/fixtures`, and kept out of the published package.
 */
import {
  FIELD_TYPE_FLAGS,
  FIELD_TYPE_IDS,
  type FieldType,
  type TypedSettings,
  type ValueOf,
} from '../../src/structure.js';

export interface FieldFixture<T extends FieldType> {
  readonly field: Extract<TypedSettings, { type: T }>;
  /** Values the field's rule accepts as they are, each in the order the field reads it back. */
  readonly values: readonly ValueOf<T>[];
}

/** A fixture of any type. */
export type AnyFieldFixture = { [T in FieldType]: FieldFixture<T> }[FieldType];

/**
 * At least one fixture per type, and one per way a type's settings change what a field holds: a
 * list taking one answer reads and edits differently from one taking several.
 */
export const FIELD_FIXTURES: {
  readonly [T in FieldType]: readonly [FieldFixture<T>, ...FieldFixture<T>[]];
} = {
  short_text: [{ field: { type: 'short_text' }, values: ['Bex', 'Rebecca'] }],
  long_text: [{ field: { type: 'long_text' }, values: ['A first note', 'A second, longer note'] }],
  list: [
    {
      field: { type: 'list', settings: { options: ['Film', 'Travel', 'Cooking'], multiple: true } },
      values: [['Film'], ['Travel', 'Cooking'], ['Film', 'Cooking']],
    },
    {
      field: { type: 'list', settings: { options: ['Dog', 'Cat'], multiple: false } },
      values: [['Dog'], ['Cat']],
    },
  ],
  address: [
    {
      field: { type: 'address' },
      values: [
        { line1: '1 High St', city: 'London' },
        { city: 'Dublin', country: 'IE' },
        { line1: '1 High St', city: 'London', postal_code: 'N1 1AA', country: 'GB' },
      ],
    },
  ],
  phone: [{ field: { type: 'phone' }, values: ['+442079460000', '+14155550100'] }],
};

/** Every fixture, as a list to run a law over. */
export const ALL_FIELD_FIXTURES: readonly AnyFieldFixture[] =
  Object.values<readonly AnyFieldFixture[]>(FIELD_FIXTURES).flat();

/**
 * Each type still in development, with the Labs flag it is behind and a field of it, for checking
 * that everywhere a field is created holds the type back until its flag is on. Empty while every
 * type is released, and filled by a type being added behind a flag.
 */
export const FIELDS_IN_DEVELOPMENT: readonly { field: TypedSettings; flag: string }[] =
  FIELD_TYPE_IDS.flatMap((type) => {
    const flag = FIELD_TYPE_FLAGS[type];
    return flag === undefined ? [] : [{ field: FIELD_FIXTURES[type][0].field, flag }];
  });
