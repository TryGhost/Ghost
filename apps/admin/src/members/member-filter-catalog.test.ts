import { buildMemberFields, canReadMemberFilter } from './member-filter-catalog';
import { describe, expect, it } from 'vitest';
import { parseMemberFilter, serializeMemberFilters } from './member-filter-query';
import type { MemberFields } from './member-filter-catalog';

const SOURCES = {
  newsletters: [
    { slug: 'weekly', name: 'Weekly' },
    { slug: 'daily', name: 'Daily' },
  ],
  customFields: [
    { key: 'company', name: 'Company', type: 'short_text' as const },
    { key: 'shipping_address', name: 'Shipping address', type: 'address' as const },
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
    const nql = "(metafields.key:'custom.deleted'+metafields.value:~'x')";

    expect(roundTrip(resolved, nql)).toBe(nql);
  });

  it('reads every shape before the definitions arrive, losing nothing', () => {
    for (const nql of [
      '(newsletters.slug:daily+email_disabled:0)',
      "(metafields.key:'custom.company'+metafields.value:'Ghost')",
      "metafields.key:'custom.company'",
    ]) {
      expect(roundTrip(pending, nql)).toBe(nql);
    }
  });

  it('gives a known custom field its own entry, and an unknown one the shared entry', () => {
    expect(resolved['metafields.custom.company']).toBeDefined();
    expect(pending['metafields.custom.company']).toBeUndefined();
    expect(pending['metafields.custom.:key']).toBeDefined();
  });
});

describe('waiting protects precision, not the clauses', () => {
  const customFieldFilter = "(metafields.key:'custom.company'+metafields.value:'Ghost')";

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
    // Someone searching their members for the literal text "metafields." or
    // "newsletters.slug" is not asking about custom fields or newsletters, and waiting for
    // those to load would leave the filter unreadable until something else resolved them.
    expect(canReadMemberFilter("name:~'metafields.'", { customFields: undefined })).toBe(true);
    expect(canReadMemberFilter("name:~'newsletters.slug'", { newsletters: undefined })).toBe(true);
  });

  it('still waits when the source is named as a clause key, wherever it sits', () => {
    expect(
      canReadMemberFilter("metafields.key:'custom.company'", { customFields: undefined }),
    ).toBe(false);
    expect(
      canReadMemberFilter("(status:paid+metafields.key:'custom.company')", {
        customFields: undefined,
      }),
    ).toBe(false);
    expect(
      canReadMemberFilter("status:paid,metafields.key:'custom.company'", {
        customFields: undefined,
      }),
    ).toBe(false);
    expect(
      canReadMemberFilter("metafields.key:-'custom.company'", { customFields: undefined }),
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
