import { describe, expect, it } from 'vitest';
import { parseMemberFilter } from './member-filter-query';
import type { FilterPredicate } from '@/shared/filters';

function stripIds(predicates: FilterPredicate[]) {
  return predicates.map((predicate) => ({
    field: predicate.field,
    operator: predicate.operator,
    values: predicate.values,
  }));
}

describe('newsletter subscription filters', () => {
  it('reads newsletter subscription state from the slug clause polarity', () => {
    expect(
      stripIds(parseMemberFilter('(newsletters.slug:-weekly,email_disabled:1)', 'UTC')),
    ).toEqual([{ field: 'newsletters.weekly', operator: 'is', values: ['unsubscribed'] }]);

    expect(
      stripIds(parseMemberFilter('(newsletters.slug:weekly+email_disabled:0)', 'UTC')),
    ).toEqual([{ field: 'newsletters.weekly', operator: 'is', values: ['subscribed'] }]);
  });

  it('leaves a newsletter pair unread when its parts are arranged to mean something else', () => {
    // Being on the list *or* having bounced is a wider set of members than being on the
    // list and not having bounced, so these are not the filter they resemble. Reading them
    // as one would answer with a different set of members and then save that back.
    for (const filter of [
      '(newsletters.slug:weekly,email_disabled:1)',
      '(newsletters.slug:-weekly+email_disabled:0)',
      '(newsletters.slug:weekly+email_disabled:1)',
    ]) {
      expect(stripIds(parseMemberFilter(filter, 'UTC'))).not.toContainEqual(
        expect.objectContaining({ field: 'newsletters.weekly' }),
      );
    }
  });
});
