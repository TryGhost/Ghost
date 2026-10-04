import { describe, expect, it } from 'vitest';
import {
  FEATURED_OPTIONS,
  ORDER_OPTIONS,
  VISIBILITY_OPTIONS,
  getOrderLabel,
  getTypeOptions,
} from './post-filter-fields';
import { getStatusesForType } from './post-query-params';

describe('getTypeOptions', () => {
  // Featured is its own field: it is a flag, not a status.
  it('offers posts the four statuses', () => {
    expect(getTypeOptions('posts').map((option) => option.value)).toEqual([
      'draft',
      'published',
      'sent',
      'scheduled',
    ]);
  });

  // Pages are never emailed.
  it('drops "email only" for pages', () => {
    expect(getTypeOptions('pages').map((option) => option.value)).toEqual([
      'draft',
      'published',
      'scheduled',
    ]);
  });

  it('labels the options for the resource', () => {
    expect(getTypeOptions('posts')[0].label).toBe('Draft posts');
    expect(getTypeOptions('pages')[0].label).toBe('Draft pages');
  });

  // If these drift apart, a filter the UI offers would resolve to the wrong
  // statuses - or to all of them, silently.
  it('only offers types the query layer understands', () => {
    const known = ['draft', 'published', 'sent', 'scheduled'];

    getTypeOptions('posts').forEach((option) => {
      expect(known).toContain(option.value);
      expect(getStatusesForType(option.value)).toEqual([option.value]);
    });
  });
});

describe('FEATURED_OPTIONS', () => {
  it('carries the values the query layer sends as featured:true/false', () => {
    expect(FEATURED_OPTIONS.map((option) => option.value)).toEqual(['true', 'false']);
  });
});

describe('VISIBILITY_OPTIONS', () => {
  it('carries the paid+tiers value as a single opaque string', () => {
    expect(VISIBILITY_OPTIONS.map((option) => option.value)).toEqual([
      'public',
      'members',
      '[paid,tiers]',
    ]);
  });
});

describe('getOrderLabel', () => {
  // "Newest first" is the absence of an order param, not a value.
  it('names the default when no order is set', () => {
    expect(getOrderLabel(null)).toBe('Newest first');
    expect(getOrderLabel(undefined)).toBe('Newest first');
  });

  it('names the known orders', () => {
    expect(getOrderLabel('published_at asc')).toBe('Oldest first');
    expect(getOrderLabel('updated_at desc')).toBe('Recently updated');
  });

  it('shows an unrecognised order rather than hiding it', () => {
    expect(getOrderLabel('title asc')).toBe('title asc');
  });

  it('has an entry for every non-default order', () => {
    expect(ORDER_OPTIONS).toHaveLength(2);
  });
});
