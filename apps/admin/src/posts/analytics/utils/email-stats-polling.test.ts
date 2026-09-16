import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEmailStatsRefetchInterval } from '@/posts/analytics/utils/email-stats-polling';

describe('getEmailStatsRefetchInterval', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps polling when the browser clock is behind the send timestamp', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-16T12:00:00Z'));
    expect(getEmailStatsRefetchInterval('2026-09-16T12:00:10Z')).toBe(5000);
  });

  it('slows polling at the one-hour boundary', () => {
    const sentAt = '2026-09-16T12:00:00Z';
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(Date.parse(sentAt) + 3600000 - 1);
    expect(getEmailStatsRefetchInterval(sentAt)).toBe(5000);
    now.mockReturnValue(Date.parse(sentAt) + 3600000);
    expect(getEmailStatsRefetchInterval(sentAt)).toBe(30000);
  });

  it('does not poll without a valid send timestamp', () => {
    expect(getEmailStatsRefetchInterval()).toBe(false);
    expect(getEmailStatsRefetchInterval(null)).toBe(false);
    expect(getEmailStatsRefetchInterval('invalid')).toBe(false);
  });
});
