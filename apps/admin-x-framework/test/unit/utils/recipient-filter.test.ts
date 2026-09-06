import { describe, expect, it } from 'vitest';
import {
  EVERYONE_RECIPIENT_FILTER,
  FREE_SEGMENT,
  PAID_SEGMENT,
  buildRecipientFilter,
  getFullRecipientFilter,
  getNewsletterRecipientFilter,
  getRecipientType,
  normalizeRecipientFilter,
  parseRecipientFilter,
} from '../../../src/utils/recipient-filter';

describe('recipient-filter', () => {
  describe('normalizeRecipientFilter', () => {
    it('expands legacy all and none sentinels', () => {
      expect(normalizeRecipientFilter('all')).toBe(EVERYONE_RECIPIENT_FILTER);
      expect(normalizeRecipientFilter('none')).toBeNull();
    });

    it('preserves real filters and normalizes empty values', () => {
      expect(normalizeRecipientFilter('label:vip')).toBe('label:vip');
      expect(normalizeRecipientFilter(null)).toBeNull();
      expect(normalizeRecipientFilter(undefined)).toBeNull();
    });
  });

  describe('parseRecipientFilter', () => {
    it('returns empty segments for null, undefined and empty filters', () => {
      for (const filter of [null, undefined, '']) {
        expect(parseRecipientFilter(filter)).toEqual({
          free: false,
          paid: false,
          base: [],
          specific: [],
        });
      }
    });

    it('parses the base segments into checkbox state', () => {
      expect(parseRecipientFilter(FREE_SEGMENT)).toEqual({
        free: true,
        paid: false,
        base: [FREE_SEGMENT],
        specific: [],
      });

      expect(parseRecipientFilter(PAID_SEGMENT)).toEqual({
        free: false,
        paid: true,
        base: [PAID_SEGMENT],
        specific: [],
      });

      expect(parseRecipientFilter(EVERYONE_RECIPIENT_FILTER)).toEqual({
        free: true,
        paid: true,
        base: [FREE_SEGMENT, PAID_SEGMENT],
        specific: [],
      });
    });

    it('splits base and specific segments preserving order', () => {
      expect(
        parseRecipientFilter('label:vip,status:free,tier:gold,status:-free,label:beta'),
      ).toEqual({
        free: true,
        paid: true,
        base: [FREE_SEGMENT, PAID_SEGMENT],
        specific: ['label:vip', 'tier:gold', 'label:beta'],
      });
    });

    it('drops blank segments and deduplicates', () => {
      expect(parseRecipientFilter('label:vip,,  ,status:free,label:vip,status:free')).toEqual({
        free: true,
        paid: false,
        base: [FREE_SEGMENT],
        specific: ['label:vip'],
      });
    });

    it('classifies padded base segments as base without checking the checkbox, like Ember', () => {
      // gh-members-recipient-select trims for base classification but tests
      // checkbox state against the raw segment.
      expect(parseRecipientFilter(' status:free,label:vip')).toEqual({
        free: false,
        paid: false,
        base: [' status:free'],
        specific: ['label:vip'],
      });
    });
  });

  describe('buildRecipientFilter', () => {
    it('round-trips every recipient type', () => {
      const filters = [
        FREE_SEGMENT,
        PAID_SEGMENT,
        EVERYONE_RECIPIENT_FILTER,
        'label:vip',
        'tier:gold',
        'status:free,label:vip,tier:gold',
        'status:free,status:-free,label:vip,label:beta,tier:gold,tier:silver',
        ' status:free,label:vip',
      ];

      for (const filter of filters) {
        expect(buildRecipientFilter(parseRecipientFilter(filter))).toBe(filter);
      }
    });

    it('rebuilds with base segments first, like the Ember select', () => {
      expect(buildRecipientFilter(parseRecipientFilter('label:vip,status:free'))).toBe(
        'status:free,label:vip',
      );
    });

    it('returns null for an empty selection', () => {
      expect(buildRecipientFilter({ base: [], specific: [] })).toBeNull();
      expect(buildRecipientFilter(parseRecipientFilter(null))).toBeNull();
    });

    it('drops the paid segment when paid is unavailable', () => {
      expect(
        buildRecipientFilter(parseRecipientFilter(EVERYONE_RECIPIENT_FILTER), {
          paidAvailable: false,
        }),
      ).toBe(FREE_SEGMENT);

      expect(
        buildRecipientFilter(parseRecipientFilter(PAID_SEGMENT), { paidAvailable: false }),
      ).toBeNull();
    });
  });

  describe('getRecipientType', () => {
    it('classifies each filter shape', () => {
      expect(getRecipientType(null)).toBe('none');
      expect(getRecipientType(undefined)).toBe('none');
      expect(getRecipientType('')).toBe('none');
      expect(getRecipientType(FREE_SEGMENT)).toBe('free');
      expect(getRecipientType(PAID_SEGMENT)).toBe('paid');
      expect(getRecipientType(EVERYONE_RECIPIENT_FILTER)).toBe('all');
      expect(getRecipientType('label:vip')).toBe('specific');
      expect(getRecipientType('label:vip,tier:gold')).toBe('specific');
      expect(getRecipientType('status:free,label:vip')).toBe('specific');
      expect(getRecipientType('status:-free,tier:gold')).toBe('specific');
    });

    it('classifies both base segments as all even alongside specific segments', () => {
      // Substring semantics from the Ember publish flow.
      expect(getRecipientType('status:free,status:-free,label:vip')).toBe('all');
      expect(getRecipientType('label:vip,status:free,status:-free')).toBe('all');
    });
  });

  describe('getNewsletterRecipientFilter', () => {
    it('scopes to newsletter subscribers with email enabled', () => {
      expect(getNewsletterRecipientFilter({ slug: 'weekly' })).toBe(
        'newsletters.slug:weekly+email_disabled:0',
      );
    });

    it('adds the paid segment for paid-visibility newsletters', () => {
      expect(getNewsletterRecipientFilter({ slug: 'weekly', visibility: 'paid' })).toBe(
        'newsletters.slug:weekly+email_disabled:0+status:-free',
      );
      expect(getNewsletterRecipientFilter({ slug: 'weekly', visibility: 'members' })).toBe(
        'newsletters.slug:weekly+email_disabled:0',
      );
    });
  });

  describe('getFullRecipientFilter', () => {
    const newsletterFilter = 'newsletters.slug:weekly+email_disabled:0';

    it('returns the newsletter filter alone when there is no recipient filter', () => {
      expect(getFullRecipientFilter(newsletterFilter, null)).toBe(newsletterFilter);
      expect(getFullRecipientFilter(newsletterFilter, undefined)).toBe(newsletterFilter);
      expect(getFullRecipientFilter(newsletterFilter, '')).toBe(newsletterFilter);
    });

    it('ANDs the recipient filter onto the newsletter filter', () => {
      expect(getFullRecipientFilter(newsletterFilter, EVERYONE_RECIPIENT_FILTER)).toBe(
        'newsletters.slug:weekly+email_disabled:0+(status:free,status:-free)',
      );
      expect(getFullRecipientFilter(newsletterFilter, 'label:vip,tier:gold')).toBe(
        'newsletters.slug:weekly+email_disabled:0+(label:vip,tier:gold)',
      );
    });
  });
});
