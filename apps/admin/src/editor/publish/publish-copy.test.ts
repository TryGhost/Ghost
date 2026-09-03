import { describe, expect, it } from 'vitest';
import {
  confirmButtonText,
  confirmPublishType,
  confirmRunningText,
  recipientsConfirmLabel,
  recipientsRowLabel,
  siteCalendarDay,
} from '@/editor/publish/publish-copy';

const UTC = 'Etc/UTC';

describe('recipientsRowLabel', () => {
  it('prefixes "All" only for a plural or unknown count', () => {
    expect(recipientsRowLabel({ recipientType: 'all', count: 1234 })).toBe('All 1,234 subscribers');
    expect(recipientsRowLabel({ recipientType: 'all', count: 1 })).toBe('1 subscriber');
    expect(recipientsRowLabel({ recipientType: 'all', count: null })).toBe('All subscribers');
  });

  it('names the segment for every other recipient type', () => {
    expect(recipientsRowLabel({ recipientType: 'free', count: 12 })).toBe('12 free subscribers');
    expect(recipientsRowLabel({ recipientType: 'paid', count: 3 })).toBe('3 paid subscribers');
    expect(recipientsRowLabel({ recipientType: 'specific', count: 2 })).toBe(
      '2 specific subscribers',
    );
  });

  it('capitalizes the segment when the count is unknown', () => {
    expect(recipientsRowLabel({ recipientType: 'free', count: null })).toBe('Free subscribers');
  });

  it('appends the newsletter name when one is given', () => {
    expect(recipientsRowLabel({ recipientType: 'all', count: 5, newsletterName: 'Weekly' })).toBe(
      'All 5 subscribers of Weekly',
    );
  });
});

describe('recipientsConfirmLabel', () => {
  it('always prefixes "all", unlike the collapsed row', () => {
    expect(recipientsConfirmLabel({ recipientType: 'all', count: 1 })).toBe('all 1 subscriber');
    expect(recipientsConfirmLabel({ recipientType: 'paid', count: 40 })).toBe(
      '40 paid subscribers',
    );
  });
});

describe('confirm button copy', () => {
  it('names the post type for a publish-only confirm', () => {
    expect(
      confirmButtonText({
        publishType: 'publish',
        isScheduled: false,
        scheduledAt: '2026-09-02T10:00:00.000Z',
        displayName: 'page',
        timezone: UTC,
      }),
    ).toBe('Publish page, right now');
  });

  it('appends the scheduled date instead of "right now"', () => {
    expect(
      confirmButtonText({
        publishType: 'publish+send',
        isScheduled: true,
        scheduledAt: '2026-09-02T10:00:00.000Z',
        displayName: 'post',
        timezone: UTC,
      }),
    ).toBe('Publish & send, on September 2nd');
  });

  it('keeps the underlying idle copy but takes the schedule running copy', () => {
    expect(confirmRunningText('send', false)).toBe('Sending');
    expect(confirmRunningText('publish+send', false)).toBe('Publishing & sending');
    expect(confirmRunningText('send', true)).toBe('Scheduling');
  });
});

describe('siteCalendarDay', () => {
  // 20:00 UTC on the 3rd is already 08:00 on the 4th in Auckland, so an
  // implementation handing the picker the instant lands a day early.
  it('carries the site-timezone day in the local fields a date picker reads', () => {
    const day = siteCalendarDay('2026-09-03T20:00:00.000Z', 'Pacific/Auckland');

    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 8, 4]);
  });

  it('keeps a day that both zones agree on', () => {
    const day = siteCalendarDay('2026-09-03T12:00:00.000Z', 'Etc/UTC');

    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 8, 3]);
  });
});

describe('confirmPublishType', () => {
  it('derives the type from the captured intent', () => {
    expect(confirmPublishType({ willPublish: true, willEmail: true, willOnlyEmail: false })).toBe(
      'publish+send',
    );
    expect(confirmPublishType({ willPublish: false, willEmail: true, willOnlyEmail: true })).toBe(
      'send',
    );
    expect(confirmPublishType({ willPublish: true, willEmail: false, willOnlyEmail: false })).toBe(
      'publish',
    );
  });
});
