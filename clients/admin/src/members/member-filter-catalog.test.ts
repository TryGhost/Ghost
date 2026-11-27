import { buildMemberFields, canReadMemberFilter } from './member-filter-catalog';
import { describe, expect, it } from 'vitest';
import { parseMemberFilter, serializeMemberFilters } from './member-filter-query';
import type { MemberFields } from './member-filter-catalog';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';
import { ALL_FIELD_FIXTURES, type AnyFieldFixture } from '@tryghost/metafield-types/test/fixtures';
import { keysOf, matchShape } from '@tryghost/metafield-types/structure';
import { SHAPES } from '@tryghost/metafield-types/shapes';
import { LEAF_FILTER, type LeafFilterType } from './custom-fields/filter-fields';

const SOURCES = {
  newsletters: [
    { slug: 'weekly', name: 'Weekly' },
    { slug: 'daily', name: 'Daily' },
  ],
  customFields: [
    {
      namespace: CUSTOM_NAMESPACE,
      key: KeySchema.parse('company'),
      name: 'Company',
      type: 'short_text' as const,
    },
    {
      namespace: CUSTOM_NAMESPACE,
      key: KeySchema.parse('shipping_address'),
      name: 'Shipping address',
      type: 'address' as const,
    },
  ],
};

const resolved = buildMemberFields(SOURCES);
const pending = buildMemberFields();

function roundTrip(fields: MemberFields, nql: string) {
  return serializeMemberFilters(parseMemberFilter(nql, 'UTC', fields), 'UTC', fields);
}

describe("a site's own definitions add precision, not correctness", () => {
  it('reads every newsletter as itself, whichever entry is tried first', () => {
    for (const slug of ['weekly', 'daily']) {
      const nql = `(newsletters.slug:${slug}+email_disabled:0)`;

      expect(roundTrip(resolved, nql)).toBe(nql);
    }
  });

  it('reads a newsletter the site no longer has', () => {
    const nql = '(newsletters.slug:retired+email_disabled:0)';

    expect(roundTrip(resolved, nql)).toBe(nql);
  });

  it('keeps a clause naming a custom field that no longer exists', () => {
    const nql = "(metafields.identity:'custom.deleted'+metafields.value:~'x')";

    expect(roundTrip(resolved, nql)).toBe(nql);
  });

  it('reads every shape before the definitions arrive, losing nothing', () => {
    for (const nql of [
      '(newsletters.slug:daily+email_disabled:0)',
      "(metafields.identity:'custom.company'+metafields.value:'Ghost')",
      "metafields.identity:'custom.company'",
    ]) {
      expect(roundTrip(pending, nql)).toBe(nql);
    }
  });

  it('gives a known custom field its own entry, and an unknown one the shared entry', () => {
    expect(resolved['metafields.custom.company']).toBeDefined();
    expect(pending['metafields.custom.company']).toBeUndefined();
    expect(pending['metafields.:namespace.:key']).toBeDefined();
  });
});

describe('waiting protects precision, not the clauses', () => {
  const customFieldFilter = "(metafields.identity:'custom.company'+metafields.value:'Ghost')";

  it('waits while a source the filter names is in flight', () => {
    expect(canReadMemberFilter(customFieldFilter, { customFields: undefined })).toBe(false);
  });

  it('does not wait once that source has resolved, even to nothing', () => {
    expect(canReadMemberFilter(customFieldFilter, { customFields: [] })).toBe(true);
  });

  it('never waits for a filter naming no dynamic clause', () => {
    expect(canReadMemberFilter('status:paid', {})).toBe(true);
    expect(canReadMemberFilter(undefined, {})).toBe(true);
  });

  it('does not wait for sources a quoted value only happens to mention', () => {
    expect(canReadMemberFilter("name:~'metafields.'", { customFields: undefined })).toBe(true);
    expect(canReadMemberFilter("name:~'newsletters.slug'", { newsletters: undefined })).toBe(true);
  });

  it('still waits when the source is named as a clause key, wherever it sits', () => {
    expect(
      canReadMemberFilter("metafields.identity:'custom.company'", { customFields: undefined }),
    ).toBe(false);
    expect(
      canReadMemberFilter("(status:paid+metafields.identity:'custom.company')", {
        customFields: undefined,
      }),
    ).toBe(false);
    expect(
      canReadMemberFilter("status:paid,metafields.identity:'custom.company'", {
        customFields: undefined,
      }),
    ).toBe(false);
    expect(
      canReadMemberFilter("metafields.identity:-'custom.company'", { customFields: undefined }),
    ).toBe(false);
  });

  it('waits for newsletters the same way', () => {
    const nql = '(newsletters.slug:weekly+email_disabled:0)';

    expect(canReadMemberFilter(nql, { newsletters: undefined })).toBe(false);
    expect(canReadMemberFilter(nql, { newsletters: [] })).toBe(true);
  });

  it('parses the filter it is waiting on anyway', () => {
    const parsed = parseMemberFilter(customFieldFilter, 'UTC', pending);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].field).toBe('metafields.custom.company');
  });
});

/** The operator a filter is written with to find a member holding a value, per filter type. */
const NAMING: { readonly [T in LeafFilterType]: string } = { text: 'is', set: 'is-any' };

/**
 * One held leaf value as a filter names it: which filter type its leaf uses, the values the filter
 * is written with (as the filter's inputs hold them) and the values it reads back as. For a scalar
 * or a record's part the values start with the part's name, empty for a scalar; for a list they
 * are the option alone.
 */
type HeldLeaf = { filter: LeafFilterType; written: string[]; read: unknown[] };

function heldLeaves({ field }: AnyFieldFixture, value: unknown): HeldLeaf[] {
  return matchShape<HeldLeaf[]>(field.type, {
    scalar: ({ leaf }, type) => {
      const held = SHAPES.scalar.parse(type, value);
      return held === undefined
        ? []
        : [{ filter: LEAF_FILTER[leaf.leaf], written: ['', String(held)], read: ['', held] }];
    },
    record: ({ parts }, type) => {
      const held = SHAPES.record.parse(type, value) ?? {};
      return keysOf(held).flatMap((part) => {
        const partValue = held[part];
        return partValue === undefined
          ? []
          : [
              {
                filter: LEAF_FILTER[parts[part].leaf],
                written: [part, String(partValue)],
                read: [part, partValue],
              },
            ];
      });
    },
    set: (_structure, type) =>
      (SHAPES.set.parse(type, value) ?? []).map((option) => ({
        filter: 'set',
        written: [option],
        read: [option],
      })),
  });
}

// Every field type, over the fixtures it declares: each value a member can hold is one Admin's
// filters can name, writing it from the text its input holds and reading it back as that value.
describe.each(
  ALL_FIELD_FIXTURES.map((fixture): [string, AnyFieldFixture] => [fixture.field.type, fixture]),
)('a %s custom field filter', (_type, fixture) => {
  const fields = buildMemberFields({
    customFields: [
      {
        namespace: CUSTOM_NAMESPACE,
        key: KeySchema.parse('sampled'),
        name: 'Sample',
        type: fixture.field.type,
      },
    ],
  });
  const field = 'metafields.custom.sampled';

  it('writes each held value as NQL and reads it back as that value', () => {
    for (const value of fixture.values) {
      const leaves = heldLeaves(fixture, value);
      // A value the parser rejects would otherwise pass with nothing asserted.
      expect(leaves.length, JSON.stringify(value)).toBeGreaterThan(0);
      for (const leaf of leaves) {
        const operator = NAMING[leaf.filter];
        const nql = serializeMemberFilters(
          [{ id: 'x', field, operator, values: leaf.written }],
          'UTC',
          fields,
        );
        expect(
          parseMemberFilter(nql, 'UTC', fields).map((predicate) => ({
            operator: predicate.operator,
            values: predicate.values,
          })),
          nql,
        ).toEqual([{ operator, values: leaf.read }]);
      }
    }
  });
});
