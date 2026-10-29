import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import {
  FIELD_STRUCTURES,
  FIELD_TYPE_IDS,
  MAX_LONG_TEXT_BYTES,
  editableAnswers,
  isMetafieldChangeSource,
  isFieldType,
  isRecordValue,
  matchField,
  matchShape,
  partsOf,
  valueSchemaFor,
  type Address,
  TypedSettingsInputSchema,
  TypedSettingsSchema,
  type FieldType,
  type FieldTypeOfShape,
  type TypedSettings,
} from '../src/index.ts';

// This asserts only the catalog's *contract* — which field types exist, and which of
// them have parts. The behavioural outcomes (per-type value validation, the composite
// address round-tripping, part 422s) are proven end-to-end through the member
// metafields HTTP API integration tests, which exercise this catalog together with
// the backend storage and the wire format.
describe('metafield-types catalog', function () {
  // Integrations depend on a published version of this package and talk to sites on
  // other Ghost versions, so a type that has shipped keeps its parts and what each holds
  // for good: an integration with a newer package would otherwise send a part an older
  // site refuses. New structure is a new type. Add a type here once it has shipped.
  it('never changes a type once it has shipped', function () {
    const line = { leaf: 'text', size: 'line' };
    const shipped = {
      short_text: { shape: 'scalar', leaf: line },
      long_text: { shape: 'scalar', leaf: { leaf: 'text', size: 'long' } },
      address: {
        shape: 'record',
        parts: {
          line1: line,
          line2: line,
          city: line,
          state: line,
          postal_code: { leaf: 'text', size: 'code' },
          country: { leaf: 'choice', from: 'countries' },
        },
      },
    };

    for (const [type, structure] of Object.entries(shipped)) {
      assert.ok(isFieldType(type), `${type} still exists`);
      assert.deepEqual(FIELD_STRUCTURES[type], structure, `${type} keeps its structure`);
    }
  });

  it('answers for each type by the shape it declares', function () {
    const layout = (type: FieldType) =>
      matchShape(type, {
        scalar: ({ leaf }) => `one ${leaf.leaf} value`,
        record: ({ parts }) => `parts ${Object.keys(parts).join(', ')}`,
        set: () => 'options picked from the field',
      });

    assert.equal(layout('long_text'), 'one text value');
    assert.equal(layout('address'), 'parts line1, line2, city, state, postal_code, country');
  });

  // The settings each type takes are listed per type, so this notices one added to the catalog
  // without them.
  // A type missing from the settings a field is written or read with can't be written or read
  // back, which fails to compile here: the unions are listed by hand.
  const readBack = (field: TypedSettings): z.output<typeof TypedSettingsSchema> => field;
  const writtenBack = (field: TypedSettings): z.output<typeof TypedSettingsInputSchema> => field;

  it('says what a field of every type is set up with', function () {
    for (const type of FIELD_TYPE_IDS) {
      const settings = matchShape(type, {
        scalar: () => null,
        record: () => null,
        set: () => ({ options: ['Yes', 'No'], multiple: false }),
      });
      const read = TypedSettingsSchema.safeParse({ type, settings });
      assert.equal(read.success && readBack(read.data).type, type);
      const write = TypedSettingsInputSchema.safeParse({ type, settings });
      assert.equal(write.success && writtenBack(write.data).type, type);
    }
  });

  it('knows its own types, and nothing else as one', function () {
    assert.equal(isFieldType('address'), true);
    for (const value of ['a_type_from_the_future', 'constructor', 'toString', 42, null]) {
      assert.equal(isFieldType(value), false, String(value));
    }
  });

  it('refuses to answer for a type it has never heard of, naming it', function () {
    // A plain JavaScript caller can pass any string as a type, including a name every object has.
    for (const type of ['a_type_from_the_future', 'constructor']) {
      assert.throws(
        // @ts-expect-error a type this build doesn't know
        () => matchShape(type, { scalar: () => 1, record: () => 2, set: () => 3 }),
        new RegExp(`Unknown field type: ${type}`),
      );
    }
  });

  it('refuses a rule for a type it has never heard of, naming it', function () {
    for (const type of ['a_type_from_the_future', 'constructor']) {
      assert.throws(
        // @ts-expect-error a type this build doesn't know
        () => valueSchemaFor({ type }),
        new RegExp(`Unknown field type: ${type}`),
      );
    }
  });

  it('tells a record value by its layout, so a list or nothing is not one', function () {
    assert.equal(isRecordValue({ city: 'London' }), true);
    assert.equal(isRecordValue(['London']), false);
    assert.equal(isRecordValue(null), false);
    assert.equal(isRecordValue('London'), false);
  });

  it('names each part in declaration order, and none for a type without parts', function () {
    assert.deepEqual(partsOf('address'), [
      'line1',
      'line2',
      'city',
      'state',
      'postal_code',
      'country',
    ]);
    assert.equal(partsOf('short_text'), null);
  });

  it('names no parts for a list, whose options are its field’s own', function () {
    assert.equal(partsOf('list'), null);
  });

  it('refuses to answer for a field of a type it has never heard of, naming it', function () {
    // A plain JavaScript caller can pass any string as a type.
    const unknown = { type: 'a_type_from_the_future', settings: null };
    const handlers = { scalar: () => 1, record: () => 2, set: () => 3 };
    assert.throws(
      // @ts-expect-error a type this build doesn't know
      () => matchField(unknown, handlers),
      /Unknown field type: a_type_from_the_future/,
    );
  });

  it('reads a type it has never heard of as having no parts', function () {
    // A plain JavaScript caller can pass any string as a type.
    // @ts-expect-error a type this build doesn't know
    assert.equal(partsOf('a_type_from_the_future'), null);
  });

  describe('text is trimmed, whatever type it belongs to', function () {
    // Trimming decides whether a value is stored at all: a value that trims to
    // nothing is a clear. Two text types disagreeing about that would mean the same
    // keystrokes emptying one field and filling another.
    it('trims every text type alike', function () {
      for (const type of ['short_text', 'long_text'] as const) {
        const padded = valueSchemaFor({ type, settings: null }).safeParse('  Ghosts  ');
        assert.equal(padded.success && padded.data, 'Ghosts', type);

        const blank = valueSchemaFor({ type, settings: null }).safeParse('   ');
        assert.equal(blank.success && blank.data, '', type);
      }
    });

    it('measures a bound against the value rather than its padding', function () {
      assert.equal(
        valueSchemaFor({ type: 'short_text', settings: null }).safeParse(`  ${'x'.repeat(255)}  `)
          .success,
        true,
      );
      assert.equal(
        valueSchemaFor({ type: 'short_text', settings: null }).safeParse('x'.repeat(256)).success,
        false,
      );
    });
  });

  // The one piece of real logic in here, and the one an end-to-end test can't
  // pin precisely: the bound is counted in bytes, because the column it routes
  // to is sized in bytes. A character-based bound would accept a multibyte
  // value that the column can't hold.
  describe('long_text is bounded in bytes, not characters', function () {
    const parse = (value: string) =>
      valueSchemaFor({ type: 'long_text', settings: null }).safeParse(value).success;

    it('accepts a value of exactly the limit', function () {
      assert.equal(parse('a'.repeat(MAX_LONG_TEXT_BYTES)), true);
    });

    it('rejects a value one byte over the limit', function () {
      assert.equal(parse('a'.repeat(MAX_LONG_TEXT_BYTES + 1)), false);
    });

    it('rejects a multibyte value that fits the limit only when counted as characters', function () {
      // 21,846 three-byte characters: far under the limit by character
      // count, three bytes over it by byte count.
      const value = '€'.repeat(21846);
      assert.equal(value.length < MAX_LONG_TEXT_BYTES, true);
      assert.equal(parse(value), false);
    });

    it('accepts a multibyte value that reaches the limit exactly', function () {
      assert.equal(parse('€'.repeat(21845)), true);
    });
  });

  // The rule that replaced per-part requiredness. An end-to-end test can't
  // pin it: the CSV and admin paths both strip blank parts before a value
  // reaches the catalog, so neither ever presents the empty case this rejects.
  describe('an address must name at least one part', function () {
    const parse = (value: unknown) =>
      valueSchemaFor({ type: 'address', settings: null }).safeParse(value).success;

    it('accepts a partial address', function () {
      // There is no postal code in Hong Kong and no city in an Irish
      // townland address; both would have failed the old required set.
      assert.equal(
        parse({ line1: 'Flat 3, 8 Wan Chai Road', city: 'Hong Kong', country: 'HK' }),
        true,
      );
      assert.equal(parse({ line1: 'Cloonlara', state: 'Co. Clare', country: 'IE' }), true);
    });

    // A recipient's name is not part of an address. A parcel needs both, which is a
    // fact about posting parcels rather than about either type, so a site that collects
    // a name keeps it in a field of its own.
    it('is not where a recipient name lives', function () {
      assert.equal(parse({ name: 'Bex Jones' }), false);
    });

    // The compiler has to agree with the parser about which parts exist. The schema is
    // mapped over the parts declared in `../src/structure`, and that key mapping is lost
    // through `Object.fromEntries` unless restated: without the restatement an address
    // admits any part at all, and only the parser objects.
    it('is typed to the parts it parses', function () {
      const declared: Address = { line1: 'Cloonlara', country: 'IE' };
      // @ts-expect-error -- the same part the parser refuses just above
      const undeclared: Address = { name: 'Bex Jones' };

      assert.equal(parse(declared), true);
      assert.equal(parse(undeclared), false);
    });

    it('rejects an address that names nothing', function () {
      assert.equal(parse({}), false);
      // A key present but explicitly undefined names nothing either: undefined is
      // how a value says it has no opinion about a part.
      assert.equal(parse({ line1: undefined }), false);
      assert.equal(parse({ line1: undefined, country: undefined }), false);
    });

    it('accepts an address that names parts as empty, which is how they are cleared', function () {
      assert.equal(parse({ line1: '', city: '' }), true);
    });

    it('lets a part whose rule is a format be emptied too', function () {
      // Empty is a statement about the write, not about the part, so every
      // part takes it alike. A bound admits the empty string on its own; a
      // pattern does not, which would leave a country the one part of an address
      // that could be set but never removed.
      assert.equal(parse({ line1: '62 Ghost Lane', city: 'Dublin', country: '' }), true);
      assert.equal(parse({ country: '' }), true);

      // Emptying it is still the only thing that gets in for free.
      assert.equal(parse({ country: 'DEU' }), false);
    });

    it('normalises the case of a country code, so one country is one value', function () {
      const countryOf = (written: string) => {
        const parsed = valueSchemaFor({ type: 'address', settings: null }).safeParse({
          country: written,
        });
        if (!parsed.success || !isRecordValue(parsed.data)) {
          return undefined;
        }
        const { country } = parsed.data;
        return country;
      };
      assert.equal(countryOf('gb'), 'GB');

      // Whichever way it arrives, it is stored the same way, so a filter for one
      // form cannot miss members holding another.
      for (const written of ['GB', 'gb', 'Gb', ' gB ']) {
        assert.equal(countryOf(written), 'GB', `expected ${JSON.stringify(written)} to normalise`);
      }
    });

    it('accepts any well-formed country code, without ruling on which countries exist', function () {
      // XK is not an ISO-assigned code, and it is what Kosovo is written as. Ghost
      // stores it rather than refusing a member's own country.
      for (const code of ['XK', 'TW', 'PS', 'EH']) {
        assert.equal(
          valueSchemaFor({ type: 'address', settings: null }).safeParse({ country: code }).success,
          true,
          code,
        );
      }
    });

    it('takes two ASCII letters as a country code and nothing else', function () {
      const parseCountry = (country: string) =>
        valueSchemaFor({ type: 'address', settings: null }).safeParse({ country });

      // Uppercasing is not length-preserving, so a rule counting the characters of
      // the result is wrong both ways: one character can become two, and two can
      // become three. Checking the shape of the input is what settles it.
      assert.equal(parseCountry('ß').success, false, 'ß uppercases to SS');
      assert.equal(parseCountry('aß').success, false, 'aß uppercases to ASS');
      assert.equal(parseCountry('ﬁ').success, false, 'the fi ligature uppercases to FI');

      // A bare length check let these through; a country code has letters in it.
      assert.equal(parseCountry('12').success, false);
      assert.equal(parseCountry('!!').success, false);
    });

    it('trims a part, so its bound measures the value and not the padding', function () {
      const result = valueSchemaFor({ type: 'address', settings: null }).safeParse({
        line1: '  1 Main St  ',
        country: ' GB ',
      });
      assert.equal(result.success, true);
      assert.deepEqual(result.data, { line1: '1 Main St', country: 'GB' });

      // A value that reaches the limit exactly still fits once its padding is gone.
      assert.equal(
        valueSchemaFor({ type: 'address', settings: null }).safeParse({
          line1: `  ${'x'.repeat(255)}  `,
        }).success,
        true,
      );
    });

    it('refuses a part it does not recognise, rather than dropping it', function () {
      // The parts of a type are declared in one place, so a name that is not one of
      // them is a mistake worth saying out loud. Dropping it silently would store a
      // value missing whatever the typo was meant to fill in.
      assert.equal(parse({ line1: '62 Ghost Lane', citty: 'Dublin' }), false);
      assert.equal(parse({ line1: '62 Ghost Lane', city: 'Dublin' }), true);
    });

    it('bounds each part by what that part is, not by the record holding it', function () {
      // A postal code is its own kind of thing rather than a short text that happens
      // to be in an address: no country writes one longer than this, and a street
      // address needs the room a postal code does not.
      assert.equal(parse({ postal_code: 'x'.repeat(32) }), true);
      assert.equal(parse({ postal_code: 'x'.repeat(33) }), false);
      assert.equal(parse({ line1: 'x'.repeat(255) }), true);
      assert.equal(parse({ line1: 'x'.repeat(256) }), false);
    });

    it('reads a part of nothing but whitespace as empty, so it clears', function () {
      // Trimming happens per part above, so whitespace has already become the empty
      // string by the time the rule runs — and empty is an instruction, not a value.
      const result = valueSchemaFor({ type: 'address', settings: null }).safeParse({
        line1: '   ',
        city: '\t',
      });
      assert.equal(result.success, true);
      assert.deepEqual(result.data, { line1: '', city: '' });
    });
  });

  describe('a list', function () {
    it('edits only the answers its field offers, in its order', function () {
      const settings = { options: ['Dog', 'Cat', 'Fish'], multiple: true };
      assert.deepEqual(editableAnswers(settings, ['Fish', 'Dolphin', 'Dog']), ['Dog', 'Fish']);
    });

    it('edits no answer of a field taking one that holds several', function () {
      const settings = { options: ['Dog', 'Cat'], multiple: false };
      assert.deepEqual(editableAnswers(settings, ['Dog', 'Cat']), []);
      assert.deepEqual(editableAnswers(settings, ['Cat']), ['Cat']);
    });

    const animals = (multiple: boolean): TypedSettings => ({
      type: 'list',
      settings: { options: ['Dog', 'Café'], multiple },
    });

    it('takes the options its field offers, each once', function () {
      assert.deepEqual(valueSchemaFor(animals(true)).parse(['Café', 'Dog', 'Dog']), [
        'Café',
        'Dog',
      ]);
      assert.deepEqual(valueSchemaFor(animals(false)).parse(['Dog']), ['Dog']);
    });

    it('matches an option whatever its padding or how its accents are encoded', function () {
      assert.deepEqual(valueSchemaFor(animals(true)).parse([' Cafe\u0301 ']), ['Café']);
    });

    it('keeps a list option as written, apart from its padding', function () {
      const typed = TypedSettingsInputSchema.parse({
        type: 'list',
        settings: { options: [' Film & TV ', 'cafe\u0301'], multiple: true },
      });
      assert.deepEqual(typed.settings, { options: ['Film & TV', 'café'], multiple: true });
    });

    // Only a write is held to the rules, so a list set up under a looser one still reads.
    it('reads back settings a write would now refuse', function () {
      const settings = { options: ['Only one'], multiple: false };
      assert.deepEqual(TypedSettingsSchema.parse({ type: 'list', settings }).settings, settings);
      assert.equal(TypedSettingsInputSchema.safeParse({ type: 'list', settings }).success, false);
    });

    it('writes its settings back as they were read', function () {
      const settings = { options: ['Yes', 'No'], multiple: false };
      assert.deepEqual(z.encode(TypedSettingsInputSchema, { type: 'list', settings }), {
        type: 'list',
        settings,
      });
    });
  });

  describe('what a broken rule says', function () {
    const reasonFor = (
      type: FieldTypeOfShape<'scalar' | 'record'>,
      value: unknown,
    ): string | null => {
      const result = valueSchemaFor({ type, settings: null }).safeParse(value);
      return result.success ? null : (result.error.issues[0]?.message ?? null);
    };

    it('states what each rule expects', function () {
      assert.equal(reasonFor('short_text', 'x'.repeat(256)), 'Use 255 characters or fewer.');
      assert.equal(
        reasonFor('long_text', 'x'.repeat(MAX_LONG_TEXT_BYTES + 1)),
        'This text is too long to save. Shorten it a little.',
      );
      assert.equal(
        reasonFor('address', { line1: 'x'.repeat(256) }),
        'Use 255 characters or fewer.',
      );
      assert.equal(
        reasonFor('address', { postal_code: 'x'.repeat(33) }),
        'Use 32 characters or fewer.',
      );
      assert.equal(
        reasonFor('address', { country: 'IRL' }),
        'Enter a 2-letter country code, like US.',
      );
      assert.equal(reasonFor('address', {}), 'Enter at least one part of the address.');
      assert.equal(reasonFor('short_text', 42), 'Enter text.');
      assert.equal(reasonFor('address', { city: 42 }), 'Enter text.');
    });

    it('says the same thing however one rule was broken', function () {
      const expected = 'Enter a 2-letter country code, like US.';
      for (const country of ['IRL', '12', 'D', 'ÜÜ']) {
        assert.equal(reasonFor('address', { country }), expected, country);
      }
    });

    it('holds a sentence for every rule a value can break', function () {
      // Notices a rule added without wording, which falls back to zod's phrasing.
      const brokenValues: Array<[FieldTypeOfShape<'scalar' | 'record'>, unknown]> = [
        ['short_text', 'x'.repeat(256)],
        ['short_text', 42],
        ['long_text', 'x'.repeat(MAX_LONG_TEXT_BYTES + 1)],
        ['address', {}],
        ['address', { city: 42 }],
        ...Object.keys(FIELD_STRUCTURES.address.parts).map(
          (part): [FieldTypeOfShape<'record'>, unknown] => ['address', { [part]: 'x'.repeat(256) }],
        ),
      ];
      const list: TypedSettings = {
        type: 'list',
        settings: { options: ['Dog', 'Cat'], multiple: false },
      };
      const brokenLists: unknown[] = ['Dog', [42], ['Dolphin'], ['Dog', 'Cat']];
      const brokenSettings: Array<[FieldType, unknown]> = [
        ['list', undefined],
        ['list', { options: ['Dog', 'Cat'] }],
        ['list', { options: ['Dog'], multiple: true }],
        ['list', { options: ['Dog', 'Dog'], multiple: true }],
        ['list', { options: ['Dog', '  '], multiple: true }],
        ['list', { options: ['Dog', 'Cat | Mouse'], multiple: true }],
        ['list', { options: ['Dog', 'x'.repeat(256)], multiple: true }],
        ['list', { options: Array.from({ length: 101 }, (_, n) => `${n}`), multiple: true }],
        ['short_text', { options: ['Dog', 'Cat'], multiple: true }],
      ];

      const reasons: Array<[string, string | null]> = [
        ...brokenValues.map(([type, value]): [string, string | null] => [
          `${type} ${JSON.stringify(value)}`,
          reasonFor(type, value),
        ]),
        ...brokenLists.map((value): [string, string | null] => {
          const result = valueSchemaFor(list).safeParse(value);
          return [
            `list ${JSON.stringify(value)}`,
            result.success ? null : (result.error.issues[0]?.message ?? null),
          ];
        }),
        ...brokenSettings.map(([type, settings]): [string, string | null] => {
          const result = TypedSettingsInputSchema.safeParse({ type, settings });
          return [
            `${type} settings ${JSON.stringify(settings)}`,
            result.success ? null : (result.error.issues[0]?.message ?? null),
          ];
        }),
      ];

      for (const [what, reason] of reasons) {
        assert.ok(reason, `${what} should be rejected`);
        assert.doesNotMatch(reason, /Too big|Too small|Invalid input|expected /, what);
        // A whole sentence: a screen shows it unedited.
        assert.match(reason, /^[A-Z].*\.$/, what);
      }
    });
  });

  // A client built before a place existed must still render an entry from a newer server,
  // so it asks whether it knows a place rather than assuming it does.
  describe('which places a change can be made from', function () {
    it('knows the places this build names, and no others', function () {
      assert.equal(isMetafieldChangeSource('portal'), true);
      assert.equal(isMetafieldChangeSource('somewhere_new'), false);
    });
  });
});
