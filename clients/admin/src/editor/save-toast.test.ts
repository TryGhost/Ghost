import { describe, expect, it } from 'vitest';
import {
  describeRevertToast,
  describeSaveToast,
  utcOffsetLabel,
  type SaveToast,
  type SaveToastInput,
} from './save-toast';

const BASE: SaveToastInput = {
  displayName: 'post',
  previousStatus: 'draft',
  status: 'draft',
  url: 'https://site.test/hello/',
  previewUrl: 'https://site.test/p/uuid/',
  publishedAt: null,
  timezone: 'Etc/UTC',
  emailOnly: false,
  recipients: null,
};

function descriptionText(toast: SaveToast | null): string {
  return (toast?.description ?? []).map(({ text }) => text).join('');
}

function strongRuns(toast: SaveToast | null): string[] {
  return (toast?.description ?? []).filter(({ strong }) => strong).map(({ text }) => text);
}

describe('describeSaveToast', () => {
  it('reports an updated published post with a link to it', () => {
    expect(
      describeSaveToast({ ...BASE, previousStatus: 'published', status: 'published' }),
    ).toEqual({
      title: 'Post updated',
      action: { label: 'View on site', href: 'https://site.test/hello/' },
    });
  });

  it('reports an updated sent post without a link', () => {
    expect(describeSaveToast({ ...BASE, previousStatus: 'sent', status: 'sent' })).toEqual({
      title: 'Post updated',
      action: undefined,
    });
  });

  it('reports a saved draft', () => {
    expect(describeSaveToast(BASE)).toEqual({ title: 'Post saved', action: undefined });
  });

  it('names a page as a page', () => {
    expect(describeSaveToast({ ...BASE, displayName: 'page' })?.title).toBe('Page saved');
    expect(
      describeSaveToast({
        ...BASE,
        displayName: 'page',
        previousStatus: 'published',
        status: 'published',
      })?.title,
    ).toBe('Page updated');
  });

  it('reports a transition by its new state', () => {
    expect(describeSaveToast({ ...BASE, status: 'published' })?.title).toBe('Post published');
    expect(
      describeSaveToast({ ...BASE, previousStatus: 'published', status: 'draft' })?.title,
    ).toBe('Post saved');
  });

  it('shows nothing for a transition it has no copy for', () => {
    expect(describeSaveToast({ ...BASE, previousStatus: 'sent', status: 'published' })).toBeNull();
  });

  it('describes a scheduled post with its time in the site timezone and a preview link', () => {
    const toast = describeSaveToast({
      ...BASE,
      previousStatus: 'scheduled',
      status: 'scheduled',
      publishedAt: '2030-02-01T10:00:00.000Z',
      timezone: 'Europe/Berlin',
    });

    expect(toast?.title).toBe('Post scheduled');
    expect(descriptionText(toast)).toBe('Will be published on 1 Feb 2030 at 11:00 (UTC+1)');
    expect(strongRuns(toast)).toEqual(['1 Feb 2030', '11:00']);
    expect(toast?.action).toEqual({ label: 'Show preview', href: 'https://site.test/p/uuid/' });
  });

  it('names who a scheduled newsletter will reach', () => {
    const input = {
      ...BASE,
      displayName: 'page' as const,
      previousStatus: 'scheduled' as const,
      status: 'scheduled' as const,
      publishedAt: '2030-02-01T10:00:00.000Z',
      recipients: '20 members',
    };

    expect(describeSaveToast(input)?.title).toBe('Page scheduled');
    expect(descriptionText(describeSaveToast(input))).toBe(
      'Will be published and delivered to 20 members on 1 Feb 2030 at 10:00 (UTC)',
    );
    expect(strongRuns(describeSaveToast(input))).toEqual(['20 members', '1 Feb 2030', '10:00']);
    expect(descriptionText(describeSaveToast({ ...input, emailOnly: true }))).toBe(
      'Will be sent to 20 members on 1 Feb 2030 at 10:00 (UTC)',
    );
  });
});

describe('utcOffsetLabel', () => {
  const WINTER = '2030-01-15T12:00:00.000Z';

  it('reads a zero offset as UTC alone', () => {
    expect(utcOffsetLabel(WINTER, 'Etc/UTC')).toBe('(UTC)');
    expect(utcOffsetLabel(WINTER, 'Europe/London')).toBe('(UTC)');
  });

  it('drops the padding and the zero minutes of a whole-hour offset', () => {
    expect(utcOffsetLabel(WINTER, 'Europe/Berlin')).toBe('(UTC+1)');
    expect(utcOffsetLabel(WINTER, 'Australia/Brisbane')).toBe('(UTC+10)');
    expect(utcOffsetLabel(WINTER, 'America/New_York')).toBe('(UTC-5)');
  });

  it('keeps the minutes of a part-hour offset', () => {
    expect(utcOffsetLabel(WINTER, 'Asia/Kolkata')).toBe('(UTC+5:30)');
    expect(utcOffsetLabel(WINTER, 'America/St_Johns')).toBe('(UTC-3:30)');
  });

  it('uses the offset in force at the scheduled time', () => {
    expect(utcOffsetLabel('2030-07-15T12:00:00.000Z', 'Europe/London')).toBe('(UTC+1)');
  });
});

describe('describeRevertToast', () => {
  it('names the post type', () => {
    expect(describeRevertToast('post').title).toBe('Post reverted to a draft.');
    expect(describeRevertToast('page').title).toBe('Page reverted to a draft.');
  });
});
